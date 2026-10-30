import { airport } from "../airports";
import { localDate } from "../rules/dates";
import { formatUsd } from "../rules/engine";
import type { Decision, Trip } from "../types";

export type Draft = {
  kind: "traveler_alert" | "refund_request" | "dot_complaint" | "dispute_evidence";
  channel: string;
  subject: string;
  body: string;
};

const route = (t: Trip) => {
  const segs = t.facts.original;
  const first = segs[0];
  const last = segs[segs.length - 1];
  return `${first.flight_number}, ${airport(first.origin).city} (${first.origin}) to ${airport(last.destination).city} (${last.destination}) on ${localDate(first.departure)}`;
};

const citations = (d: Decision) => d.citations.map((c) => `- ${c.label}: "${c.excerpt}" (${c.url})`).join("\n");
const proof = (d: Decision) => d.proof.map((p) => `- ${p.source} ${p.ref}: ${p.field} = ${p.value}. ${p.note}`).join("\n");

function whatChanged(d: Decision): string {
  const cancelled = d.triggers.some((x) => x.kind === "cancelled");
  const dur = (detail: string) => /(\d+h\d{2}m)/.exec(detail)?.[1] ?? "";
  const subject = cancelled ? "the replacement" : "now";
  const parts = d.triggers.map((x) => {
    switch (x.kind) {
      case "cancelled":
        return "was cancelled";
      case "depart_early":
        return `${subject} departs ${dur(x.detail)} earlier`;
      case "arrive_late":
        return `${subject} arrives ${dur(x.detail)} later`;
      case "airport_change":
        return `${subject} uses a different airport`;
      case "more_connections":
        return `${subject} adds a connection`;
      case "downgrade":
        return cancelled ? "the replacement is in a lower cabin" : "is now in a lower cabin";
    }
  });
  return parts.join(", and ");
}

export function travelerAlert(t: Trip, d: Decision): Draft {
  const first = t.traveler.split(" ")[0];
  return {
    kind: "traveler_alert",
    channel: "Slack DM and email to the traveler",
    subject: `Don't accept the travel credit for ${t.facts.original[0].flight_number}`,
    body: [
      `Hi ${first}, your flight ${route(t)}, ${whatChanged(d)}.`,
      "",
      `Under DOT rules the company card is owed a full cash refund of ${d.amount_cents !== null ? formatUsd(d.amount_cents) : "the fare"} if you turn down the change and the credit. Accepting the credit gives that refund up.`,
      "",
      "If you can still make the trip work, fly it. If not:",
      "1. Don't accept the travel credit or voucher.",
      "2. Reply here with \"skip\" and we'll request the refund to the card for you.",
      "",
      `Rule: ${d.citations[0]?.label ?? "14 CFR 260.6"}. Finance is copied; nothing is sent to the airline without admin approval.`,
    ].join("\n"),
  };
}

export function refundRequest(t: Trip, d: Decision): Draft {
  const payee = d.payee?.name ?? "the airline";
  const ticket = t.charges.find((c) => c.transaction_uuid === t.facts.ticket_charge_id);
  return {
    kind: "refund_request",
    channel: `${payee} official refund request form (or its customer refunds email)`,
    subject: `Refund request, confirmation ${t.facts.record_locator}, ${t.traveler}`,
    body: [
      `To ${payee},`,
      "",
      `We request a full refund of ${d.amount_cents !== null ? formatUsd(d.amount_cents) : "the fare"} for confirmation ${t.facts.record_locator} (${t.traveler}), ${route(t)}, to the original form of payment: the company card ending ${ticket?.card?.last_four ?? "on file"}.`,
      "",
      `Basis: ${d.reason}`,
      "",
      "The rules that apply:",
      citations(d),
      "",
      "Evidence:",
      proof(d),
      "",
      d.payee?.kind === "ticket_agent"
        ? "As the merchant of record, please process the refund within 7 business days of receiving the carrier's confirmation, as 14 CFR 399.80(l) requires."
        : `Please issue the refund within 7 business days${d.refund_due_by ? ` (by ${d.refund_due_by})` : ""}, as the 14 CFR 260.2 definition of a prompt refund requires for card purchases, without a processing fee (14 CFR 260.10).`,
      "",
      "We have not accepted a travel credit or voucher for this ticket.",
    ].join("\n"),
  };
}

export function dotComplaint(t: Trip, d: Decision, requestedAt: string, outcome: string): Draft {
  return {
    kind: "dot_complaint",
    channel: "US DOT air travel service complaint form (secure.dot.gov/air-travel-complaint)",
    subject: `Refund not provided, confirmation ${t.facts.record_locator}`,
    body: [
      `Airline or ticket agent: ${d.payee?.name ?? "unknown"}`,
      `Flight: ${route(t)}`,
      `Confirmation: ${t.facts.record_locator}. Passenger: ${t.traveler}. Paid by company card.`,
      `Amount owed: ${d.amount_cents !== null ? formatUsd(d.amount_cents) : "full fare"}`,
      "",
      `What happened: ${d.triggers.map((x) => x.detail).join(" ")} ${d.reason}`,
      `We requested the refund on ${localDate(requestedAt)}. ${outcome}`,
      "",
      "Rules:",
      citations(d),
      "",
      "Evidence:",
      proof(d),
      "",
      "Resolution sought: a full refund to the original form of payment.",
    ].join("\n"),
  };
}

export function disputeEvidence(t: Trip, d: Decision, requestedAt: string, dotFiledAt: string): Draft {
  return {
    kind: "dispute_evidence",
    channel: "Card dispute, filed with the card issuer (Ramp for Ramp cards). The demo prepares this package; it does not file it.",
    subject: `Service not provided: ${route(t)}`,
    body: [
      `The merchant did not provide the flight and has not refunded ${d.amount_cents !== null ? formatUsd(d.amount_cents) : "the fare"} owed under federal rules.`,
      `Refund requested ${localDate(requestedAt)}; DOT complaint filed ${localDate(dotFiledAt)}. No credit or voucher was accepted.`,
      "",
      citations(d),
      "",
      proof(d),
    ].join("\n"),
  };
}
