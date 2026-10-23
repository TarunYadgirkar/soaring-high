import { addBusinessDays, localDate } from "../rules/dates";
import type { Decision } from "../types";

export type ClaimEvent =
  | { type: "traveler_alerted"; at: string }
  | { type: "refund_requested"; at: string }
  | { type: "refund_received"; at: string; amount_cents: number }
  | { type: "refund_refused"; at: string; note: string }
  | { type: "dot_complaint_filed"; at: string }
  | { type: "dispute_opened"; at: string; dispute_id: string };

export type ActionKind = "alert_traveler" | "request_refund" | "file_dot_complaint" | "open_dispute";

export type Action = {
  kind: ActionKind;
  allowed: boolean;
  reason: string;
};

export type ClaimStage =
  | "watching"
  | "alert_ready"
  | "alerted"
  | "ready_to_request"
  | "refund_pending"
  | "refund_overdue"
  | "refund_refused"
  | "dot_filed"
  | "disputed"
  | "recovered"
  | "closed";

// Business days the payee has to pay after a request, per 260.2 "Prompt refund"
// (carrier) and 399.80(l) (ticket agent), both 7 business days for card purchases.
const RESPONSE_BUSINESS_DAYS = 7;

const last = <T extends ClaimEvent["type"]>(events: ClaimEvent[], type: T) =>
  [...events].reverse().find((e): e is Extract<ClaimEvent, { type: T }> => e.type === type);

export function requestDueBy(events: ClaimEvent[]): string | null {
  const req = last(events, "refund_requested");
  return req ? addBusinessDays(localDate(req.at), RESPONSE_BUSINESS_DAYS) : null;
}

export function stage(decision: Decision, events: ClaimEvent[], asOf: string): ClaimStage {
  if (decision.verdict === "hold_credit_alert") return last(events, "traveler_alerted") ? "alerted" : "alert_ready";
  if (decision.verdict !== "refund_owed") return decision.verdict === "needs_info" ? "watching" : "closed";
  if (last(events, "refund_received")) return "recovered";
  if (last(events, "dispute_opened")) return "disputed";
  if (last(events, "dot_complaint_filed")) return "dot_filed";
  if (last(events, "refund_refused")) return "refund_refused";
  const due = requestDueBy(events);
  if (due) return localDate(asOf) > due ? "refund_overdue" : "refund_pending";
  return "ready_to_request";
}

// Escalation order is fixed: refund request, then DOT complaint, then card dispute.
// A dispute is never prepared while a refund request is still within its window,
// so the company can't recover twice.
export function actions(decision: Decision, events: ClaimEvent[], asOf: string): Action[] {
  const s = stage(decision, events, asOf);
  const due = requestDueBy(events);
  const unresolved = s === "refund_overdue" || s === "refund_refused";
  return [
    {
      kind: "alert_traveler",
      allowed: s === "alert_ready",
      reason:
        s === "alert_ready"
          ? "Disruption qualifies and the traveler hasn't chosen yet."
          : s === "alerted"
            ? "Traveler already alerted."
            : "Only for live disruptions the traveler hasn't responded to.",
    },
    {
      kind: "request_refund",
      allowed: s === "ready_to_request",
      reason: s === "ready_to_request" ? "Refund owed and not yet requested." : due ? `Requested; payee has until ${due}.` : "No refund owed.",
    },
    {
      kind: "file_dot_complaint",
      allowed: unresolved,
      reason: unresolved
        ? s === "refund_refused"
          ? "The payee refused the refund."
          : `No refund by ${due}.`
        : s === "refund_pending"
          ? `Wait: refund request pending until ${due}.`
          : s === "dot_filed" || s === "disputed"
            ? "DOT complaint already filed."
            : "Request the refund first.",
    },
    {
      kind: "open_dispute",
      allowed: s === "dot_filed",
      reason:
        s === "dot_filed"
          ? "Refund request and DOT complaint went unanswered."
          : s === "refund_pending"
            ? `Blocked: a refund request is pending until ${due}. Disputing now could recover the money twice.`
            : s === "disputed"
              ? "Dispute already opened."
              : s === "recovered"
                ? "Refund received."
                : "File the DOT complaint first.",
    },
  ];
}
