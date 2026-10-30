import { z } from "zod";
import type { Cabin, RampTransaction, Segment, Trip } from "../types";

// Shapes of the Ramp MCP responses we rely on, validated at the boundary.
const Slice = z.object({
  flight_number: z.string(),
  airline: z.string().nullish(),
  departure_airport: z.string(),
  arrival_airport: z.string(),
  departure_time: z.string(),
  arrival_time: z.string(),
  cabin_class: z.string().nullish(),
  is_refundable: z.boolean().nullish(),
  fare_name: z.string().nullish(),
});

export const RampFlightBooking = z.object({
  flight_booking_id: z.string(),
  display_name: z.string().nullish(),
  flight_number: z.string(),
  airline: z.string(),
  departure_airport: z.string(),
  arrival_airport: z.string(),
  departure_time: z.string(),
  arrival_time: z.string(),
  cabin_class: z.string().nullish(),
  status: z.string().nullish(),
  trip_name: z.string().nullish(),
  booked_at: z.string().nullish(),
  slices: z.array(Slice).nullish(),
});
export type RampFlightBooking = z.infer<typeof RampFlightBooking>;

export const BookingsResponse = z.object({ flights: z.array(RampFlightBooking).default([]) }).passthrough();

export const RampTransactionSchema = z
  .object({
    transaction_uuid: z.string(),
    amount: z.string(),
    merchant_name: z.string().nullish().transform((v) => v ?? ""),
    merchant_category: z.string().nullish().transform((v) => v ?? ""),
    state: z.string(),
    transaction_time: z.string(),
    spent_by_user: z.string().nullish().transform((v) => v ?? "Unknown"),
    card: z.unknown().nullish(),
    reason_or_justification: z.string().nullish(),
    trip_uuid: z.string().nullish(),
    trip_name: z.string().nullish(),
  })
  .passthrough();

export const TransactionsResponse = z.object({
  transactions: z.array(RampTransactionSchema),
  next_page_cursor: z.string().nullish(),
  total_count: z.number().nullish(),
});

export function toRampTransaction(t: z.infer<typeof RampTransactionSchema>): RampTransaction {
  return {
    transaction_uuid: t.transaction_uuid,
    amount: t.amount,
    merchant_name: t.merchant_name,
    merchant_category: t.merchant_category,
    state: t.state === "PENDING" ? "PENDING" : "CLEARED",
    transaction_time: t.transaction_time,
    spent_by_user: t.spent_by_user,
    card: null,
    reason_or_justification: t.reason_or_justification ?? null,
    trip_uuid: t.trip_uuid ?? null,
    trip_name: t.trip_name ?? null,
  };
}

const CABINS: Record<string, Cabin> = {
  economy: "economy",
  premium_economy: "premium_economy",
  "premium economy": "premium_economy",
  business: "business",
  first: "first",
};

const cabin = (raw: string | null | undefined): Cabin => CABINS[(raw ?? "economy").toLowerCase()] ?? "economy";

export function segmentsFrom(b: RampFlightBooking): Segment[] {
  const slices = b.slices && b.slices.length > 0 ? b.slices : [b];
  return slices.map((s) => ({
    flight_number: s.flight_number,
    origin: s.departure_airport,
    destination: s.arrival_airport,
    departure: s.departure_time,
    arrival: s.arrival_time,
    cabin: cabin(s.cabin_class),
  }));
}

export const isRefundableFare = (b: RampFlightBooking): boolean => (b.slices ?? []).some((s) => s.is_refundable === true);

const norm = (s: string) => s.toLowerCase().replace(/[^a-z]/g, "");
const DAY = 86_400_000;

export type Match = { charge: RampTransaction; score: number; why: string[] };

// Ramp's sandbox charges carry no trip link, so a booking is matched to an airline
// charge by airline name, date (booked up to departure day) and the memo's route.
export function matchCharge(b: RampFlightBooking, charges: RampTransaction[]): Match | null {
  const segs = segmentsFrom(b);
  const origin = segs[0].origin;
  const dest = segs[segs.length - 1].destination;
  const departure = Date.parse(segs[0].departure);
  // Tickets are usually bought weeks ahead; the sandbox's booked_at can even fall after departure.
  const from = Math.min(Date.parse(b.booked_at ?? segs[0].departure), departure) - 60 * DAY;
  const to = departure + DAY;
  const city = (b.display_name ?? "").replace(/^.*flight to /i, "").toLowerCase();
  const scored = charges
    .filter((c) => c.merchant_category === "Airlines" && norm(c.merchant_name) === norm(b.airline))
    .filter((c) => {
      const t = Date.parse(c.transaction_time);
      return t >= from && t <= to;
    })
    .map((c) => {
      const memo = (c.reason_or_justification ?? "").toLowerCase();
      const why = [`${c.merchant_name} charge on ${c.transaction_time.slice(0, 10)}`];
      let score = 1;
      if (memo.includes(origin.toLowerCase()) && memo.includes(dest.toLowerCase())) {
        score += 3;
        why.push(`memo names ${origin}-${dest}`);
      } else if (city && memo.includes(city)) {
        score += 2;
        why.push(`memo names ${city}`);
      }
      if (/\bflight\b/.test(memo)) {
        score += 1;
        why.push("memo says flight");
      }
      return { charge: c, score, why };
    })
    .sort((a, b2) => b2.score - a.score);
  // A same-airline charge alone could be wifi or a bag; require the memo to agree.
  return scored[0] && scored[0].score >= 3 ? scored[0] : null;
}

export function tripFromBooking(b: RampFlightBooking, m: Match): Trip {
  return {
    id: `R-${b.flight_booking_id.slice(0, 8)}`,
    source: "ramp_sandbox",
    title: `${b.display_name ?? `${b.flight_number} booking`} (Ramp sandbox)`,
    join_reasons: [`Ramp booking ${b.flight_number} ${b.departure_airport} to ${b.arrival_airport}`, ...m.why],
    traveler: m.charge.spent_by_user,
    charges: [m.charge],
    emails: [],
    flight_status: [],
    facts: {
      record_locator: b.flight_booking_id,
      ticket_charge_id: m.charge.transaction_uuid,
      ancillary_charge_ids: [],
      service_fee_charge_ids: [],
      original: segmentsFrom(b),
      change: null,
      response: { action: "none", at: null, source: "none", ref: null },
    },
  };
}
