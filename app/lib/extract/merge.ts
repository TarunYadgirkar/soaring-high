import { isoAt, localMs } from "../time";
import type { Segment, Trip, TripFacts, TravelerResponse } from "../types";
import type { ExtractedSegment, ExtractedTrip } from "./schema";

function toSegment(s: ExtractedSegment): Segment {
  const dep = localMs(s.departure_local.replace("T", " "), s.origin);
  const arr = localMs(s.arrival_local.replace("T", " "), s.destination);
  return {
    flight_number: s.flight_number.trim().replace(/\s+/g, " "),
    origin: s.origin,
    destination: s.destination,
    departure: isoAt(dep, s.origin),
    arrival: isoAt(arr, s.destination),
    cabin: s.cabin,
  };
}

// Replaces the email-derived facts on a trip with Claude's extraction. Card-derived
// facts (charge ids) and responses that came from outside the inbox (a traveler's
// reply, a second card charge) stay as joined.
export function mergeExtraction(trip: Trip, ex: ExtractedTrip): { trip: Trip } | { error: string } {
  try {
    const gold = trip.facts;
    const emailTime = (id: string): string => {
      const email = trip.emails.find((e) => e.id === id);
      if (!email) throw new Error(`change email ${id} not in the trip`);
      return email.received_at;
    };
    const change: TripFacts["change"] = ex.change
      ? {
          kind: ex.change.kind,
          initiated_by: ex.change.initiated_by,
          notified_at: emailTime(ex.change.email_id),
          email_id: ex.change.email_id,
          // A delay notice's estimated times are not a new booking; flight-status data is the proof.
          new_itinerary: ex.change.kind !== "delay" && ex.change.new_itinerary ? ex.change.new_itinerary.map(toSegment) : null,
          alternative_offered: ex.change.alternative_offered,
          credit_offered: ex.change.credit_offered,
          credit_issued: ex.change.credit_issued,
        }
      : null;
    const outsideInbox = gold.response.source === "traveler_reply" || gold.response.source === "card";
    const response: TravelerResponse = outsideInbox
      ? gold.response
      : ex.traveler_action_in_email
        ? { action: ex.traveler_action_in_email, at: null, source: "email", ref: null }
        : { action: "none", at: null, source: "none", ref: null };
    if (ex.original_itinerary.length === 0) throw new Error("no original itinerary extracted");
    return {
      trip: {
        ...trip,
        facts: {
          ...gold,
          record_locator: ex.record_locator ?? "",
          original: ex.original_itinerary.map(toSegment),
          change,
          response,
        },
      },
    };
  } catch (err: unknown) {
    return { error: err instanceof Error ? err.message : String(err) };
  }
}

const segKey = (s: Segment) => `${s.flight_number}|${s.origin}|${s.destination}|${s.departure}|${s.arrival}|${s.cabin}`;
const itinKey = (segs: Segment[] | null) => (segs ? segs.map(segKey).join(";") : "null");

export type FieldCheck = { field: string; ok: boolean; gold: string; got: string };

export function compareFacts(gold: TripFacts, got: TripFacts): FieldCheck[] {
  const pairs: [string, string, string][] = [
    ["record_locator", gold.record_locator, got.record_locator],
    ["original", itinKey(gold.original), itinKey(got.original)],
    ["change.kind", gold.change?.kind ?? "none", got.change?.kind ?? "none"],
    ["change.initiated_by", gold.change?.initiated_by ?? "-", got.change?.initiated_by ?? "-"],
    ["change.new_itinerary", itinKey(gold.change?.new_itinerary ?? null), itinKey(got.change?.new_itinerary ?? null)],
    ["change.alternative_offered", String(gold.change?.alternative_offered ?? "-"), String(got.change?.alternative_offered ?? "-")],
    ["change.credit_offered", String(gold.change?.credit_offered ?? "-"), String(got.change?.credit_offered ?? "-")],
    ["change.credit_issued", String(gold.change?.credit_issued ?? "-"), String(got.change?.credit_issued ?? "-")],
    ["response.action", gold.response.action, got.response.action],
  ];
  return pairs.map(([field, g, o]) => ({ field, ok: g === o, gold: g, got: o }));
}
