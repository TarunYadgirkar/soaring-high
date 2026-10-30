import { airport } from "../../lib/airports";
import type {
  AirlineEmail,
  Cabin,
  Change,
  ClauseId,
  FlightStatus,
  RampTransaction,
  ResponseAction,
  Segment,
  Trip,
  TravelerResponse,
  Verdict,
} from "../../lib/types";
import { HOUR, MIN, human, isoAt, localMs } from "../../lib/time";

export const AS_OF = "2026-10-22T19:00:00Z";

export type SegSpec = {
  fn: string;
  from: string;
  to: string;
  dep: string;
  mins: number;
  cabin?: Cabin;
};

export type EventSpec =
  | { kind: "on_time"; arriveDeltaMin: number }
  | { kind: "delay"; lateMin: number; noticeHoursBefore: number }
  | { kind: "diverted"; to: string; lateMin: number }
  | {
      kind: "cancel";
      noticeHoursBefore: number;
      alternative?: { fn: string; shiftMin: number };
      credit: boolean;
      creditIssued?: boolean;
    }
  | {
      kind: "schedule_change";
      noticeHoursBefore: number;
      depShiftMin?: number;
      arrShiftMin?: number;
      newFrom?: string;
      newTo?: string;
      newFn?: string;
      connectVia?: { firstFn: string; fn: string; via: string; firstMins: number; layoverMins: number; secondMins: number };
      cabin?: Cabin;
      credit?: boolean;
    }
  | { kind: "renumber"; noticeHoursBefore: number; newFn: string; shiftMin: number }
  | { kind: "voluntary"; noticeHoursBefore: number; what: "changed" | "cancelled" };

export type Seller = "carrier" | "Expedia" | "Priceline";

export type Category =
  | "cancelled"
  | "significant_change"
  | "near_miss_threshold"
  | "voluntary"
  | "renumbered"
  | "flew_or_accepted"
  | "credit"
  | "ticket_agent"
  | "live_alert"
  | "on_time"
  | "coverage"
  | "already_refunded"
  | "missing_data";

export type CaseSpec = {
  id: string;
  title: string;
  category: Category;
  traveler: string;
  seller: Seller;
  fare: number;
  ancillaries?: { label: string; amount: number }[];
  serviceFee?: number;
  seg: SegSpec;
  event: EventSpec;
  response: ResponseAction;
  otherCarrier?: { code: string; amount: number };
  refundPosted?: number;
  noStatus?: boolean;
  label: { verdict: Verdict; basis: ClauseId | null };
  why: string;
};

export type Label = CaseSpec["label"] & { why: string; title: string; category: Category };
export type SeedTrip = Trip & { label: Label };

const CARRIERS: Record<string, { name: string; domain: string; style: 0 | 1 | 2 }> = {
  UA: { name: "United Airlines", domain: "united.com", style: 0 },
  DL: { name: "Delta Air Lines", domain: "delta.com", style: 1 },
  AA: { name: "American Airlines", domain: "aa.com", style: 2 },
  WN: { name: "Southwest Airlines", domain: "southwest.com", style: 1 },
  B6: { name: "JetBlue Airways", domain: "jetblue.com", style: 2 },
  AS: { name: "Alaska Airlines", domain: "alaskaair.com", style: 0 },
  AF: { name: "Air France", domain: "airfrance.com", style: 0 },
  BA: { name: "British Airways", domain: "ba.com", style: 1 },
  LH: { name: "Lufthansa", domain: "lufthansa.com", style: 2 },
  JL: { name: "Japan Airlines", domain: "jal.com", style: 0 },
  AC: { name: "Air Canada", domain: "aircanada.com", style: 1 },
};

const SELLERS: Record<Exclude<Seller, "carrier">, { domain: string }> = {
  Expedia: { domain: "expedia.com" },
  Priceline: { domain: "priceline.com" },
};

const TRAVELERS: Record<string, { email: string; card: string; last4: string }> = {};

function carrierOf(fn: string): { code: string; name: string; domain: string; style: 0 | 1 | 2 } {
  const code = fn.split(" ")[0];
  const c = CARRIERS[code];
  if (!c) throw new Error(`Unknown carrier ${code}`);
  return { code, ...c };
}

function hash(s: string): number {
  let h = 2166136261;
  for (const ch of s) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return h >>> 0;
}

function travelerInfo(name: string): { email: string; card: string; last4: string } {
  const existing = TRAVELERS[name];
  if (existing) return existing;
  const slug = name.toLowerCase().replace(/[^a-z]+/g, ".");
  const info = {
    email: `${slug}@northwind-labs.com`,
    card: `card-${slug}`,
    last4: String(1000 + (hash(name) % 9000)),
  };
  TRAVELERS[name] = info;
  return info;
}

function locator(id: string): string {
  const letters = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  let h = hash(`pnr-${id}`);
  let out = "";
  for (let i = 0; i < 6; i++) {
    out += letters[h % letters.length];
    h = Math.floor(h / letters.length) || hash(`${id}-${i}`);
  }
  return out;
}

function money(n: number): string {
  return n.toFixed(2);
}

// Ramp's display format for transaction amounts, e.g. "$1,446.13" or "-$259.49".
function rampAmount(n: number): string {
  const abs = Math.abs(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return `${n < 0 ? "-" : ""}$${abs}`;
}

function segment(fn: string, from: string, to: string, depMs: number, mins: number, cabin: Cabin): Segment {
  return {
    flight_number: fn,
    origin: from,
    destination: to,
    departure: isoAt(depMs, from),
    arrival: isoAt(depMs + mins * MIN, to),
    cabin,
  };
}

function status(
  seg: Segment,
  state: FlightStatus["status"],
  opts: { depMs?: number; arrMs?: number; divertedTo?: string; future?: boolean } = {},
): FlightStatus {
  const est = opts.future && state !== "cancelled";
  const actual = !opts.future && state !== "cancelled";
  return {
    id: `fs-${seg.flight_number.replace(" ", "")}-${seg.departure.slice(0, 10)}`,
    flight_number: seg.flight_number,
    date: seg.departure.slice(0, 10),
    origin: seg.origin,
    destination: seg.destination,
    status: state,
    scheduled_departure: seg.departure,
    scheduled_arrival: seg.arrival,
    estimated_departure: est && opts.depMs !== undefined ? isoAt(opts.depMs, seg.origin) : null,
    estimated_arrival: est && opts.arrMs !== undefined ? isoAt(opts.arrMs, opts.divertedTo ?? seg.destination) : null,
    actual_departure: actual && opts.depMs !== undefined ? isoAt(opts.depMs, seg.origin) : null,
    actual_arrival: actual && opts.arrMs !== undefined ? isoAt(opts.arrMs, opts.divertedTo ?? seg.destination) : null,
    actual_destination: opts.divertedTo ?? null,
    provider: "seed",
  };
}

function itineraryLines(segs: Segment[]): string {
  return segs
    .map(
      (s) =>
        `  ${s.flight_number}  ${s.origin} (${airport(s.origin).city}) ${human(s.departure, s.origin)}  ->  ${s.destination} (${airport(s.destination).city}) ${human(s.arrival, s.destination)}  ${s.cabin.replace("_", " ")}`,
    )
    .join("\n");
}

const REFUND_NOTICE =
  "You may choose a refund to your original form of payment instead of accepting this travel credit or the new flight. Travel credits are valid for 5 years from issue.";

type Ctx = {
  spec: CaseSpec;
  traveler: { email: string; card: string; last4: string };
  carrier: ReturnType<typeof carrierOf>;
  pnr: string;
  emails: AirlineEmail[];
};

function addEmail(ctx: Ctx, kind: string, fromDomain: string, fromName: string, subject: string, receivedMs: number, body: string): string {
  const id = `em-${ctx.spec.id}-${kind}`;
  ctx.emails.push({
    id,
    from: `${fromName} <notifications@${fromDomain}>`,
    to: ctx.traveler.email,
    subject,
    received_at: new Date(receivedMs).toISOString(),
    body,
  });
  return id;
}

function changeEmail(ctx: Ctx, original: Segment[], heading: string, details: string, newSegs: Segment[] | null, credit: boolean, receivedMs: number): string {
  const { carrier, pnr, spec } = ctx;
  const first = spec.traveler.split(" ")[0];
  const newPart = newSegs ? `\nYour new itinerary:\n${itineraryLines(newSegs)}\n` : "";
  const creditPart = credit ? `\n${REFUND_NOTICE}\n` : "";
  const bodies = [
    `Dear ${spec.traveler},\n\n${heading}\n\nConfirmation number: ${pnr}\n\nOriginal itinerary:\n${itineraryLines(original)}\n\n${details}\n${newPart}${creditPart}\nWe apologize for the inconvenience.\n${carrier.name} Customer Care`,
    `Hi ${first}, ${heading.toLowerCase()}\nConf# ${pnr}\n\nWAS:\n${itineraryLines(original)}\n${details}${newPart ? `\nNOW:\n${itineraryLines(newSegs ?? [])}\n` : "\n"}${creditPart}\nManage your trip in the app.\n\n-- Earn 2x miles on your next booking. Terms apply. --`,
    `${carrier.name.toUpperCase()} TRIP UPDATE\nRecord locator ${pnr} | Passenger ${spec.traveler.toUpperCase()}\n\n${heading}\n${details}\n\nFlights booked:\n${itineraryLines(original)}\n${newPart}${creditPart}\nThis is an automated message. Do not reply.`,
  ];
  return addEmail(ctx, "change", carrier.domain, carrier.name, `${heading.split(".")[0]} | ${pnr}`, receivedMs, bodies[carrier.style]);
}

export function buildTrip(spec: CaseSpec): SeedTrip {
  const carrier = carrierOf(spec.seg.fn);
  const traveler = travelerInfo(spec.traveler);
  const pnr = locator(spec.id);
  const ctx: Ctx = { spec, traveler, carrier, pnr, emails: [] };
  const cabin = spec.seg.cabin ?? "economy";
  const depMs = localMs(spec.seg.dep, spec.seg.from);
  const original = [segment(spec.seg.fn, spec.seg.from, spec.seg.to, depMs, spec.seg.mins, cabin)];
  const arrMs = depMs + spec.seg.mins * MIN;
  const purchaseMs = depMs - 21 * 24 * HOUR - 5 * HOUR;
  const future = depMs > Date.parse(AS_OF);
  const dest = airport(spec.seg.to).city;

  const sellerName = spec.seller === "carrier" ? carrier.name : spec.seller;
  const sellerDomain = spec.seller === "carrier" ? carrier.domain : SELLERS[spec.seller].domain;
  const card = {
    card_uuid: traveler.card,
    display_name: `${spec.traveler} travel card`,
    last_four: traveler.last4,
    card_state: "ACTIVE" as const,
    is_physical_card: false,
  };
  const charges: RampTransaction[] = [];
  const addCharge = (suffix: string, amount: number, merchant: string, category: string, atMs: number): string => {
    const id = `tx-${spec.id}-${suffix}`;
    charges.push({
      transaction_uuid: id,
      amount: rampAmount(amount),
      merchant_name: merchant,
      merchant_category: category,
      state: "CLEARED",
      transaction_time: new Date(atMs).toISOString(),
      spent_by_user: spec.traveler,
      card,
      trip_uuid: `trip-${spec.id}`,
      trip_name: `${dest} trip`,
    });
    return id;
  };
  const sellerCategory = spec.seller === "carrier" ? "Airlines" : "Travel Misc";
  const ticketId = addCharge("ticket", spec.fare, sellerName, sellerCategory, purchaseMs);
  const ancillaryIds = (spec.ancillaries ?? []).map((a, i) =>
    addCharge(`anc${i + 1}`, a.amount, carrier.name, "Airlines", purchaseMs + (i + 1) * 3 * HOUR),
  );
  const serviceFeeIds = spec.serviceFee ? [addCharge("fee", spec.serviceFee, sellerName, sellerCategory, purchaseMs + MIN)] : [];

  const ancillaryText = (spec.ancillaries ?? []).map((a) => `  ${a.label}: $${money(a.amount)}`).join("\n");
  addEmail(
    ctx,
    "purchase",
    sellerDomain,
    sellerName,
    `Your trip confirmation: ${spec.seg.from} to ${spec.seg.to} | ${pnr}`,
    purchaseMs + 2 * MIN,
    `Thanks for booking with ${sellerName}, ${spec.traveler}.\n\nConfirmation: ${pnr}${spec.seller === "carrier" ? "" : ` (airline confirmation ${locator(`${spec.id}-air`)})`}\nTicket type: Main fare, nonrefundable\n\n${itineraryLines(original)}\n\nAirfare and taxes: $${money(spec.fare)}${ancillaryText ? `\n${ancillaryText}` : ""}${spec.serviceFee ? `\n  Booking service fee (non-refundable): $${money(spec.serviceFee)}` : ""}\nCharged to card ending ${traveler.last4}.`,
  );

  const statuses: FlightStatus[] = [];
  let change: Change | null = null;
  let deliveredDepMs = depMs;
  const ev = spec.event;

  switch (ev.kind) {
    case "on_time": {
      statuses.push(status(original[0], "landed", { depMs: depMs + Math.max(0, ev.arriveDeltaMin) * MIN, arrMs: arrMs + ev.arriveDeltaMin * MIN }));
      break;
    }
    case "delay": {
      const late = ev.lateMin * MIN;
      deliveredDepMs = depMs + late;
      statuses.push(status(original[0], future ? "delayed" : "landed", { depMs: depMs + late, arrMs: arrMs + late, future }));
      const noticeMs = depMs - ev.noticeHoursBefore * HOUR;
      const emailId = changeEmail(
        ctx,
        original,
        `Your flight ${spec.seg.fn} is delayed.`,
        `New estimated departure: ${human(isoAt(depMs + late, spec.seg.from), spec.seg.from)}. New estimated arrival: ${human(isoAt(arrMs + late, spec.seg.to), spec.seg.to)}.`,
        null,
        false,
        noticeMs,
      );
      change = { kind: "delay", initiated_by: "carrier", notified_at: new Date(noticeMs).toISOString(), email_id: emailId, new_itinerary: null, alternative_offered: false, credit_offered: false, credit_issued: false };
      break;
    }
    case "diverted": {
      statuses.push(status(original[0], "diverted", { depMs, arrMs: arrMs + ev.lateMin * MIN, divertedTo: ev.to }));
      break;
    }
    case "cancel": {
      statuses.push(status(original[0], "cancelled"));
      const noticeMs = depMs - ev.noticeHoursBefore * HOUR;
      let newSegs: Segment[] | null = null;
      if (ev.alternative) {
        const altDep = depMs + ev.alternative.shiftMin * MIN;
        deliveredDepMs = altDep;
        newSegs = [segment(ev.alternative.fn, spec.seg.from, spec.seg.to, altDep, spec.seg.mins, cabin)];
        const altFuture = altDep > Date.parse(AS_OF);
        statuses.push(status(newSegs[0], altFuture ? "scheduled" : "landed", { depMs: altDep, arrMs: altDep + spec.seg.mins * MIN, future: altFuture }));
      }
      const details = ev.alternative
        ? "We have rebooked you on the flight below."
        : ev.credit
          ? "We were unable to find an alternative flight. A travel credit for the full value of your ticket is available."
          : "We were unable to rebook you on another flight.";
      const issued = ev.creditIssued ? "\nA travel credit for the full ticket value has been added to your account." : "";
      const emailId = changeEmail(ctx, original, `Your flight ${spec.seg.fn} has been cancelled.`, `${details}${issued}`, newSegs, ev.credit, noticeMs);
      change = {
        kind: "cancellation",
        initiated_by: "carrier",
        notified_at: new Date(noticeMs).toISOString(),
        email_id: emailId,
        new_itinerary: newSegs,
        alternative_offered: Boolean(ev.alternative),
        credit_offered: ev.credit,
        credit_issued: Boolean(ev.creditIssued),
      };
      break;
    }
    case "schedule_change": {
      const noticeMs = depMs - ev.noticeHoursBefore * HOUR;
      const newDep = depMs + (ev.depShiftMin ?? 0) * MIN;
      const newArr = arrMs + (ev.arrShiftMin ?? 0) * MIN;
      const from = ev.newFrom ?? spec.seg.from;
      const to = ev.newTo ?? spec.seg.to;
      const newCabin = ev.cabin ?? cabin;
      deliveredDepMs = newDep;
      const sameRoute = !ev.connectVia && from === spec.seg.from && to === spec.seg.to;
      if (!sameRoute && !ev.newFn && !ev.connectVia) throw new Error(`${spec.id}: route change needs newFn`);
      let newSegs: Segment[];
      if (ev.connectVia) {
        const c = ev.connectVia;
        const leg1 = segment(c.firstFn, from, c.via, newDep, c.firstMins, newCabin);
        const leg2Dep = newDep + (c.firstMins + c.layoverMins) * MIN;
        const leg2 = segment(c.fn, c.via, to, leg2Dep, c.secondMins, newCabin);
        newSegs = [leg1, leg2];
      } else {
        newSegs = [segment(ev.newFn ?? spec.seg.fn, from, to, newDep, (newArr - newDep) / MIN, newCabin)];
      }
      const changeFuture = newDep > Date.parse(AS_OF);
      if (sameRoute) {
        statuses.push({
          ...status(original[0], changeFuture ? "scheduled" : "landed", { depMs: newDep, arrMs: newArr, future: changeFuture }),
          scheduled_departure: newSegs[0].departure,
          scheduled_arrival: newSegs[0].arrival,
        });
      } else {
        statuses.push(status(original[0], "cancelled"));
        for (const s of newSegs) {
          const sDep = Date.parse(s.departure);
          statuses.push(status(s, changeFuture ? "scheduled" : "landed", { depMs: sDep, arrMs: Date.parse(s.arrival), future: changeFuture }));
        }
      }
      const emailId = changeEmail(ctx, original, "We've made a change to your itinerary.", "Due to a schedule change, your flights have been updated.", newSegs, Boolean(ev.credit), noticeMs);
      change = {
        kind: "schedule_change",
        initiated_by: "carrier",
        notified_at: new Date(noticeMs).toISOString(),
        email_id: emailId,
        new_itinerary: newSegs,
        alternative_offered: true,
        credit_offered: Boolean(ev.credit),
        credit_issued: false,
      };
      break;
    }
    case "renumber": {
      const noticeMs = depMs - ev.noticeHoursBefore * HOUR;
      const newDep = depMs + ev.shiftMin * MIN;
      const newSegs = [segment(ev.newFn, spec.seg.from, spec.seg.to, newDep, spec.seg.mins, cabin)];
      deliveredDepMs = newDep;
      statuses.push(status(original[0], "cancelled"));
      statuses.push(status(newSegs[0], "landed", { depMs: newDep, arrMs: newDep + spec.seg.mins * MIN }));
      const emailId = changeEmail(ctx, original, `Your flight number has changed to ${ev.newFn}.`, "Your flight now operates under a new flight number.", newSegs, false, noticeMs);
      change = {
        kind: "renumbering",
        initiated_by: "carrier",
        notified_at: new Date(noticeMs).toISOString(),
        email_id: emailId,
        new_itinerary: newSegs,
        alternative_offered: true,
        credit_offered: false,
        credit_issued: false,
      };
      break;
    }
    case "voluntary": {
      const noticeMs = depMs - ev.noticeHoursBefore * HOUR;
      statuses.push(status(original[0], "landed", { depMs, arrMs: arrMs + 4 * MIN }));
      const body =
        ev.what === "changed"
          ? `Hi ${spec.traveler}, you changed your trip ${pnr}. Your original flight ${spec.seg.fn} has been replaced with your new selection for the following week. A change fee does not apply to this fare; any fare difference was charged to your card.`
          : `Hi ${spec.traveler}, you cancelled your trip ${pnr}. The value of your ticket, $${money(spec.fare)}, is available as a travel credit for future travel.`;
      const emailId = addEmail(ctx, "change", carrier.domain, carrier.name, `Trip ${ev.what === "changed" ? "change" : "cancellation"} confirmation | ${pnr}`, noticeMs, body);
      change = {
        kind: "voluntary",
        initiated_by: "traveler",
        notified_at: new Date(noticeMs).toISOString(),
        email_id: emailId,
        new_itinerary: null,
        alternative_offered: false,
        credit_offered: ev.what === "cancelled",
        credit_issued: ev.what === "cancelled",
      };
      break;
    }
  }

  const noticeMs = change ? Date.parse(change.notified_at) : depMs;
  const response = responseFor(ctx, spec, noticeMs, deliveredDepMs, addCharge);

  if (spec.refundPosted) {
    addCharge("refund", -spec.refundPosted, sellerName, sellerCategory, Math.max(noticeMs, depMs) + 5 * 24 * HOUR);
  }

  const trip: Trip = {
    id: spec.id,
    traveler: spec.traveler,
    charges,
    emails: ctx.emails,
    flight_status: spec.noStatus ? [] : statuses,
    facts: {
      record_locator: pnr,
      ticket_charge_id: ticketId,
      ancillary_charge_ids: ancillaryIds,
      service_fee_charge_ids: serviceFeeIds,
      original,
      change,
      response,
    },
  };
  return { ...trip, label: { ...spec.label, why: spec.why, title: spec.title, category: spec.category } };
}

function responseFor(
  ctx: Ctx,
  spec: CaseSpec,
  noticeMs: number,
  deliveredDepMs: number,
  addCharge: (suffix: string, amount: number, merchant: string, category: string, atMs: number) => string,
): TravelerResponse {
  const { carrier, pnr } = ctx;
  const at = noticeMs + 3 * HOUR;
  switch (spec.response) {
    case "none":
      return { action: "none", at: null, source: "none", ref: null };
    case "flew": {
      const id = addEmail(ctx, "flown", carrier.domain, carrier.name, `How was your flight to ${airport(spec.seg.to).city}?`, deliveredDepMs + spec.seg.mins * MIN + 2 * HOUR, `Thanks for flying with us on trip ${pnr}, ${spec.traveler}. Tell us about your experience.`);
      return { action: "flew", at: new Date(deliveredDepMs).toISOString(), source: "email", ref: id };
    }
    case "accepted_rebooking": {
      const id = addEmail(ctx, "accept", carrier.domain, carrier.name, `You're confirmed on your new flight | ${pnr}`, at, `Thanks, ${spec.traveler}. You accepted the new itinerary for trip ${pnr}. Your boarding pass will be available 24 hours before departure.`);
      return { action: "accepted_rebooking", at: new Date(at).toISOString(), source: "email", ref: id };
    }
    case "accepted_credit": {
      const domain = spec.seller === "carrier" ? carrier.domain : SELLERS[spec.seller].domain;
      const name = spec.seller === "carrier" ? carrier.name : spec.seller;
      const id = addEmail(ctx, "credit", domain, name, `Your travel credit is ready | ${pnr}`, at, `${spec.traveler}, you chose a travel credit of $${money(spec.fare)} instead of a refund for trip ${pnr}. Credit expires 5 years from today.`);
      return { action: "accepted_credit", at: new Date(at).toISOString(), source: "email", ref: id };
    }
    case "rejected":
      return { action: "rejected", at: new Date(at).toISOString(), source: "traveler_reply", ref: `reply-${spec.id}` };
    case "booked_other_carrier": {
      if (!spec.otherCarrier) throw new Error(`${spec.id}: booked_other_carrier needs otherCarrier`);
      const other = carrierOf(`${spec.otherCarrier.code} 1`);
      const id = addCharge("other", spec.otherCarrier.amount, other.name, "Airlines", noticeMs + 2 * HOUR);
      return { action: "booked_other_carrier", at: new Date(noticeMs + 2 * HOUR).toISOString(), source: "card", ref: id };
    }
  }
}
