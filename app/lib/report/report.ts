import { toCents } from "../rules/engine";
import type { Decision, Trip, TriggerKind } from "../types";

export type ReportInput = { trip: Trip; decision: Decision; stage: string };

export type PayeeRow = {
  name: string;
  kind: "carrier" | "ticket_agent" | "unknown";
  owedCents: number;
  owedTrips: number;
  liveCents: number;
  liveTrips: number;
  overdueTrips: number;
  topCause: TriggerKind | null;
};

export type CreditRow = {
  tripId: string;
  traveler: string;
  airline: string;
  route: string;
  date: string;
  amountCents: number;
};

const OVERDUE_STAGES = new Set(["refund_overdue", "refund_refused", "dot_filed", "dispute_ready"]);

function topCause(counts: Map<TriggerKind, number>): TriggerKind | null {
  const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]);
  return sorted[0]?.[0] ?? null;
}

// Who owes the company money, largest first. Recovered claims no longer count as owed.
export function payeeRows(claims: ReportInput[]): PayeeRow[] {
  const groups = new Map<string, ReportInput[]>();
  for (const c of claims) {
    const isOpen = c.decision.verdict === "hold_credit_alert" || (c.decision.verdict === "refund_owed" && c.stage !== "recovered");
    if (!isOpen || !c.decision.payee) continue;
    groups.set(c.decision.payee.name, [...(groups.get(c.decision.payee.name) ?? []), c]);
  }
  return [...groups.entries()]
    .map(([name, list]) => {
      const owed = list.filter((c) => c.decision.verdict === "refund_owed");
      const live = list.filter((c) => c.decision.verdict === "hold_credit_alert");
      const sum = (xs: ReportInput[]) => xs.reduce((s, c) => s + (c.decision.amount_cents ?? 0), 0);
      const causes = new Map<TriggerKind, number>();
      for (const t of list.flatMap((c) => c.decision.triggers)) causes.set(t.kind, (causes.get(t.kind) ?? 0) + 1);
      return {
        name,
        kind: list[0].decision.payee?.kind ?? "unknown",
        owedCents: sum(owed),
        owedTrips: owed.length,
        liveCents: sum(live),
        liveTrips: live.length,
        overdueTrips: list.filter((c) => OVERDUE_STAGES.has(c.stage)).length,
        topCause: topCause(causes),
      };
    })
    .sort((a, b) => b.owedCents + b.liveCents - (a.owedCents + a.liveCents));
}

// Trips where the traveler already took the airline's credit. The refund rule no longer applies,
// so this is company cash now sitting in a traveler's personal airline account.
export function creditRows(claims: ReportInput[]): CreditRow[] {
  return claims
    .filter((c) => c.trip.facts.response.action === "accepted_credit")
    .map((c) => {
      const ticket = c.trip.charges.find((ch) => ch.transaction_uuid === c.trip.facts.ticket_charge_id);
      const segs = c.trip.facts.original;
      return {
        tripId: c.trip.id,
        traveler: c.trip.traveler,
        airline: ticket?.merchant_name ?? "Unknown",
        route: `${segs[0].origin} to ${segs[segs.length - 1].destination}`,
        date: segs[0].departure,
        amountCents: ticket ? toCents(ticket.amount) : 0,
      };
    })
    .sort((a, b) => b.amountCents - a.amountCents);
}
