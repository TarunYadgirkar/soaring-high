"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { addBusinessDays, localDate } from "@/lib/rules/dates";
import { appendEvent, claim, now, resetDemo, setNow, tripIds } from "@/lib/store/claims";

// Demo app with no login: every action re-checks the escalation rules on the
// server, so a crafted POST can't skip a step or dispute a pending refund.
const TripId = z.string().refine((id) => tripIds().includes(id), "Unknown trip");

const ApproveInput = z.object({
  tripId: TripId,
  kind: z.enum(["alert_traveler", "request_refund", "file_dot_complaint"]),
});

export async function approve(formData: FormData): Promise<void> {
  const { tripId, kind } = ApproveInput.parse({ tripId: formData.get("tripId"), kind: formData.get("kind") });
  const c = claim(tripId);
  const action = c?.actions.find((a) => a.kind === kind);
  if (!action?.allowed) throw new Error(`Not allowed: ${action?.reason ?? kind}`);
  const at = now();
  appendEvent(
    tripId,
    kind === "alert_traveler"
      ? { type: "traveler_alerted", at }
      : kind === "request_refund"
        ? { type: "refund_requested", at }
        : { type: "dot_complaint_filed", at },
  );
  revalidatePath("/", "layout");
}

const ReplyInput = z.object({
  tripId: TripId,
  outcome: z.enum(["received", "refused"]),
});

export async function recordReply(formData: FormData): Promise<void> {
  const { tripId, outcome } = ReplyInput.parse({ tripId: formData.get("tripId"), outcome: formData.get("outcome") });
  const c = claim(tripId);
  if (!c || !["refund_pending", "refund_overdue", "dot_filed", "disputed"].includes(c.stage)) {
    throw new Error("Record a reply only after the refund was requested");
  }
  const at = now();
  appendEvent(
    tripId,
    outcome === "received"
      ? { type: "refund_received", at, amount_cents: c.decision.amount_cents ?? 0 }
      : { type: "refund_refused", at, note: "Payee declined the refund" },
  );
  revalidatePath("/", "layout");
}

const Days = z.coerce.number().int().min(1).max(30);

export async function advanceClock(formData: FormData): Promise<void> {
  const days = Days.parse(formData.get("days"));
  const next = addBusinessDays(localDate(now()), days);
  setNow(`${next}T19:00:00Z`);
  revalidatePath("/", "layout");
}

export async function reset(): Promise<void> {
  resetDemo();
  revalidatePath("/", "layout");
}
