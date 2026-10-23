import { isUS } from "../airports";
import type {
  Cabin,
  Citation,
  ClauseId,
  Decision,
  FlightStatus,
  Payee,
  Proof,
  RampTransaction,
  Segment,
  Trigger,
  Trip,
  Verdict,
} from "../types";
import { cite, RENUMBER_DISCRETION_ENDS } from "./clauses";
import { addBusinessDays, formatDuration, hoursBetween, localDate } from "./dates";

export type EngineOptions = {
  asOf: string;
};

const DOMESTIC_THRESHOLD_MIN = 180;
const INTERNATIONAL_THRESHOLD_MIN = 360;

const CABIN_RANK: Record<Cabin, number> = {
  economy: 0,
  premium_economy: 1,
  business: 2,
  first: 3,
};

const CARRIER_CATEGORY = "Airlines";
const TICKET_AGENT_CATEGORY = "Travel Agencies and Tour Operators";

export function toCents(amount: string): number {
  const value = Number(amount);
  if (!Number.isFinite(value)) throw new Error(`Bad amount ${amount}`);
  return Math.round(value * 100);
}

export function formatUsd(cents: number): string {
  const sign = cents < 0 ? "-" : "";
  const abs = Math.abs(cents);
  return `${sign}$${Math.floor(abs / 100).toLocaleString("en-US")}.${String(abs % 100).padStart(2, "0")}`;
}

function minutesBetween(fromIso: string, toIso: string): number {
  return Math.round(hoursBetween(fromIso, toIso) * 60);
}

function findStatus(trip: Trip, seg: Segment): FlightStatus | undefined {
  return trip.flight_status.find(
    (s) => s.flight_number === seg.flight_number && s.date === localDate(seg.departure),
  );
}

function charge(trip: Trip, id: string): RampTransaction {
  const found = trip.charges.find((c) => c.transaction_uuid === id);
  if (!found) throw new Error(`Trip ${trip.id} has no charge ${id}`);
  return found;
}

function payeeFor(ticket: RampTransaction): Payee {
  if (ticket.merchant_category === CARRIER_CATEGORY) {
    return { kind: "carrier", name: ticket.merchant_name, clause: "260.6(a)(1)" };
  }
  if (ticket.merchant_category === TICKET_AGENT_CATEGORY) {
    return { kind: "ticket_agent", name: ticket.merchant_name, clause: "399.80(l)" };
  }
  return { kind: "unknown", name: ticket.merchant_name, clause: null };
}

// The itinerary the carrier actually scheduled or flew, built from flight-status
// data when there is no new itinerary in the airline's email. An in-flight
// diversion is not a scheduled airport change under 260.2, so the destination stays.
type Delivered = {
  segments: Segment[];
  source: "email" | "flight_status";
};

function deliveredFromStatus(original: Segment[], statuses: FlightStatus[]): Segment[] {
  return original.map((seg, i) => {
    const s = statuses[i];
    return {
      ...seg,
      departure: s.actual_departure ?? s.estimated_departure ?? seg.departure,
      arrival: s.actual_arrival ?? s.estimated_arrival ?? seg.arrival,
    };
  });
}

function lowestCabin(segments: Segment[]): number {
  return Math.min(...segments.map((s) => CABIN_RANK[s.cabin]));
}

export function significantChanges(
  original: Segment[],
  delivered: Segment[],
  international: boolean,
): Trigger[] {
  const threshold = international ? INTERNATIONAL_THRESHOLD_MIN : DOMESTIC_THRESHOLD_MIN;
  const scope = international ? "international" : "domestic";
  const first = original[0];
  const last = original[original.length - 1];
  const newFirst = delivered[0];
  const newLast = delivered[delivered.length - 1];
  const triggers: Trigger[] = [];
  const clause: ClauseId = "260.2/significant-change";

  const earlyMin = minutesBetween(newFirst.departure, first.departure);
  if (earlyMin >= threshold) {
    triggers.push({
      kind: "depart_early",
      clause,
      detail: `Departs ${formatDuration(earlyMin / 60)} earlier than originally scheduled (${scope} threshold ${threshold / 60}h).`,
    });
  }
  const lateMin = minutesBetween(last.arrival, newLast.arrival);
  if (lateMin >= threshold) {
    triggers.push({
      kind: "arrive_late",
      clause,
      detail: `Arrives ${formatDuration(lateMin / 60)} after the original scheduled arrival (${scope} threshold ${threshold / 60}h).`,
    });
  }
  if (newFirst.origin !== first.origin || newLast.destination !== last.destination) {
    triggers.push({
      kind: "airport_change",
      clause,
      detail: `Airports changed from ${first.origin} to ${last.destination} to ${newFirst.origin} to ${newLast.destination}.`,
    });
  }
  if (delivered.length > original.length) {
    triggers.push({
      kind: "more_connections",
      clause,
      detail: `Connections increased from ${original.length - 1} to ${delivered.length - 1}.`,
    });
  }
  if (lowestCabin(delivered) < lowestCabin(original)) {
    triggers.push({
      kind: "downgrade",
      clause,
      detail: `Downgraded from ${original[0].cabin.replace("_", " ")} to ${delivered.find((s) => CABIN_RANK[s.cabin] === lowestCabin(delivered))?.cabin.replace("_", " ")}.`,
    });
  }
  return triggers;
}

function arrivalDelayNote(original: Segment[], delivered: Segment[]): string {
  const late = minutesBetween(original[original.length - 1].arrival, delivered[delivered.length - 1].arrival);
  return late >= 0 ? `${formatDuration(late / 60)} late` : `${formatDuration(late / 60)} early`;
}

function dedupe(citations: Citation[]): Citation[] {
  const seen = new Set<ClauseId>();
  return citations.filter((c) => (seen.has(c.clause) ? false : (seen.add(c.clause), true)));
}

type Outcome = {
  verdict: Verdict;
  basis: ClauseId | null;
  reason: string;
  triggerDate?: string;
};

export function decide(trip: Trip, opts: EngineOptions): Decision {
  const f = trip.facts;
  const original = f.original;
  const ticket = charge(trip, f.ticket_charge_id);
  const payee = payeeFor(ticket);
  const proof: Proof[] = [];
  const triggers: Trigger[] = [];
  const extraCitations: ClauseId[] = [];

  proof.push({
    source: "card",
    ref: ticket.transaction_uuid,
    field: "amount",
    value: formatUsd(toCents(ticket.amount)),
    note: `${ticket.merchant_name} (${ticket.merchant_category}) on card ending ${ticket.card.last_four}, ${localDate(ticket.transaction_time)}.`,
  });

  const done = (p: Outcome, amountCents: number | null = null): Decision => {
    const owed = p.verdict === "refund_owed";
    const dueBy =
      owed && payee.kind === "carrier" && p.triggerDate
        ? addBusinessDays(localDate(p.triggerDate), 7)
        : null;
    const citationIds: ClauseId[] = [
      ...(p.basis ? [p.basis] : []),
      ...triggers.map((t) => t.clause),
      ...extraCitations,
      ...(owed && payee.clause ? [payee.clause] : []),
      ...(owed ? (["260.2/prompt-refund", "260.10"] as ClauseId[]) : []),
    ];
    return {
      trip_id: trip.id,
      verdict: p.verdict,
      basis: p.basis,
      reason: p.reason,
      triggers,
      citations: dedupe(citationIds.map(cite)),
      proof,
      payee: owed || p.verdict === "hold_credit_alert" ? payee : null,
      amount_cents: amountCents,
      refund_due_by: dueBy,
      overdue: dueBy !== null && localDate(opts.asOf) > dueBy,
    };
  };

  const covered = original.some((s) => isUS(s.origin) || isUS(s.destination));
  if (!covered) {
    return done({
      verdict: "not_owed",
      basis: "260.2/covered-flight",
      reason: `${original[0].origin} to ${original[original.length - 1].destination} does not fly to, from or within the United States, so Part 260 does not apply.`,
    });
  }
  const international = original.some((s) => !isUS(s.origin) || !isUS(s.destination));

  const change = f.change;
  if (change) {
    proof.push({
      source: "email",
      ref: change.email_id,
      field: "change.kind",
      value: change.kind,
      note: `Airline notice received ${change.notified_at}.`,
    });
  }

  if (change?.initiated_by === "traveler") {
    return done({
      verdict: "not_owed",
      basis: "260.2/significant-change",
      reason: "The traveler changed or cancelled the trip. Part 260 covers delays and changes made by the carrier.",
    });
  }

  const statuses = original.map((seg) => findStatus(trip, seg));
  const missing = original.filter((_, i) => !statuses[i]);
  if (missing.length > 0) {
    return done({
      verdict: "needs_info",
      basis: null,
      reason: `No flight-status record for ${missing.map((s) => `${s.flight_number} on ${localDate(s.departure)}`).join(", ")}, so the disruption can't be proven independently.`,
    });
  }
  const known = statuses as FlightStatus[];

  const cancelledIdx = known.findIndex((s) => s.status === "cancelled");
  const cancelled = cancelledIdx >= 0;
  const delivered: Delivered = change?.new_itinerary
    ? { segments: change.new_itinerary, source: "email" }
    : { segments: deliveredFromStatus(original, known), source: "flight_status" };

  if (cancelled) {
    const s = known[cancelledIdx];
    proof.push({
      source: "flight_status",
      ref: s.id,
      field: "status",
      value: "cancelled",
      note: `${s.flight_number} ${s.origin} to ${s.destination} scheduled ${s.scheduled_departure} was not operated.`,
    });
  } else {
    const last = known[known.length - 1];
    proof.push({
      source: "flight_status",
      ref: last.id,
      field: last.actual_arrival ? "actual_arrival" : last.estimated_arrival ? "estimated_arrival" : "scheduled_arrival",
      value: last.actual_arrival ?? last.estimated_arrival ?? last.scheduled_arrival,
      note: `${last.flight_number} status ${last.status}; ${arrivalDelayNote(original, deliveredFromStatus(original, known))} against the original schedule${last.actual_destination ? `, landed at ${last.actual_destination}` : ""}.`,
    });
  }

  const changes = significantChanges(original, delivered.segments, international);

  if (cancelled && change?.kind === "renumbering" && changes.length === 0) {
    const flightDate = localDate(original[cancelledIdx].departure);
    if (flightDate < RENUMBER_DISCRETION_ENDS) {
      const replacement = delivered.segments[cancelledIdx];
      const replacementStatus = trip.flight_status.find(
        (s) => s.flight_number === replacement.flight_number && s.date === localDate(replacement.departure),
      );
      if (replacementStatus) {
        proof.push({
          source: "flight_status",
          ref: replacementStatus.id,
          field: "status",
          value: replacementStatus.status,
          note: `Replacement ${replacementStatus.flight_number} operated ${replacementStatus.origin} to ${replacementStatus.destination}; ${arrivalDelayNote(original, delivered.segments)}.`,
        });
      }
      extraCitations.push("260.2/cancelled-flight");
      return done({
        verdict: "excluded",
        basis: "91-FR-41556",
        reason: `${original[cancelledIdx].flight_number} was renumbered to ${replacement.flight_number} with no significant change. DOT is not enforcing refunds for renumbered flights until ${RENUMBER_DISCRETION_ENDS}.`,
      });
    }
  }

  if (cancelled) {
    triggers.push({
      kind: "cancelled",
      clause: "260.2/cancelled-flight",
      detail: `${original[cancelledIdx].flight_number} on ${localDate(original[cancelledIdx].departure)} was not operated.`,
    });
  }
  triggers.push(...changes);

  if (triggers.length === 0) {
    return done({
      verdict: "not_owed",
      basis: "260.2/significant-change",
      reason: `No cancellation or significant change: arrived ${arrivalDelayNote(original, delivered.segments)}, under the ${international ? "6h international" : "3h domestic"} threshold, same airports, connections and cabin.`,
    });
  }

  const r = f.response;
  if (r.action !== "none") {
    proof.push({
      source: "traveler",
      ref: r.ref ?? "none",
      field: "response.action",
      value: r.action,
      note: `Recorded from ${r.source}${r.at ? ` at ${r.at}` : ""}.`,
    });
  }

  if (r.action === "accepted_credit") {
    return done({
      verdict: "not_owed",
      basis: payee.kind === "ticket_agent" ? "399.80(l)" : "260.6(a)(1)(ii)",
      reason: "The traveler affirmatively accepted a credit instead of the refund, which gives up the cash refund.",
    });
  }
  if (r.action === "flew" || r.action === "accepted_rebooking") {
    return done({
      verdict: "not_owed",
      basis: "260.6(a)(1)(i)",
      reason:
        r.action === "flew"
          ? "The traveler flew the changed or rebooked flight, which accepts it."
          : "The traveler accepted the rebooking.",
    });
  }

  const paidIds = [f.ticket_charge_id, ...f.ancillary_charge_ids];
  const paidCents = paidIds.reduce((sum, id) => sum + toCents(charge(trip, id).amount), 0);
  const refunds = trip.charges.filter((c) => toCents(c.amount) < 0);
  const refundedCents = -refunds.reduce((sum, c) => sum + toCents(c.amount), 0);
  for (const id of f.ancillary_charge_ids) {
    const c = charge(trip, id);
    proof.push({ source: "card", ref: id, field: "amount", value: formatUsd(toCents(c.amount)), note: `Ancillary fee, ${c.merchant_name}.` });
  }
  for (const c of refunds) {
    proof.push({ source: "card", ref: c.transaction_uuid, field: "amount", value: formatUsd(toCents(c.amount)), note: `Refund already posted to card, ${localDate(c.transaction_time)}.` });
  }
  for (const id of f.service_fee_charge_ids) {
    const c = charge(trip, id);
    proof.push({ source: "card", ref: id, field: "amount", value: formatUsd(toCents(c.amount)), note: "Booking-site service fee; the seller may keep it under 399.80(l) if disclosed." });
  }
  const owedCents = paidCents - refundedCents;

  const alternative = Boolean(change?.new_itinerary) || Boolean(change?.alternative_offered) || !cancelled;
  const altDeparture = delivered.segments[0].departure;
  const deadline = alternative ? altDeparture : original[0].departure;
  const asOfMs = Date.parse(opts.asOf);

  let outcome: Outcome;
  // Buying another airline's ticket is not a rejection the carrier heard about,
  // so it falls under the no-response paragraphs once the deadline passes.
  const otherCarrier = r.action === "booked_other_carrier" ? " The traveler bought a ticket on another airline instead." : "";
  if (r.action === "rejected") {
    outcome = {
      verdict: "refund_owed",
      basis: "260.6(a)(2)(ii)",
      reason: "The traveler rejected the changed flight and the credit. The full fare is owed.",
      triggerDate: r.at ?? opts.asOf,
    };
  } else if (Date.parse(deadline) > asOfMs) {
    extraCitations.push("260.6(c)", "260.7");
    return done(
      {
        verdict: "hold_credit_alert",
        basis: "260.6(a)(1)",
        reason: `Disruption qualifies and the traveler hasn't responded. Tell them not to accept the credit: rejecting the ${alternative ? "changed flight" : "offer"} before ${deadline} makes the full fare refundable to the card.`,
      },
      owedCents,
    );
  } else if (change?.credit_issued) {
    outcome = {
      verdict: "refund_owed",
      basis: "260.7",
      reason: "The airline issued a credit, but the traveler never affirmatively accepted it, so it doesn't replace the refund.",
      triggerDate: deadline,
    };
  } else if (alternative) {
    outcome = {
      verdict: "refund_owed",
      basis: "260.6(a)(2)(iii)(A)",
      reason: `The traveler never responded to the changed or alternative flight, and it departed without them.${otherCarrier}`,
      triggerDate: deadline,
    };
  } else if (change?.credit_offered) {
    outcome = {
      verdict: "refund_owed",
      basis: "260.6(a)(2)(iii)(B)",
      reason: "The flight was cancelled and the traveler didn't respond to the credit offer by the scheduled departure.",
      triggerDate: deadline,
    };
  } else {
    outcome = {
      verdict: "refund_owed",
      basis: "260.6(a)(2)(i)",
      reason: "The flight was cancelled and no alternative flight or credit was offered.",
      triggerDate: change?.notified_at ?? original[0].departure,
    };
  }

  if (owedCents <= 0) {
    return done({
      verdict: "not_owed",
      basis: "260.10",
      reason: `Refund owed and already posted to the card (${formatUsd(refundedCents)}).`,
    });
  }

  if (payee.kind === "ticket_agent") {
    extraCitations.push(outcome.basis as ClauseId);
    outcome = {
      ...outcome,
      basis: "399.80(l)",
      reason: `${outcome.reason} ${payee.name} sold the ticket, so it owes the refund on request.`,
    };
  }
  if (refundedCents > 0) {
    outcome = { ...outcome, reason: `${outcome.reason} ${formatUsd(refundedCents)} already refunded; ${formatUsd(owedCents)} still owed.` };
  }
  return done(outcome, owedCents);
}
