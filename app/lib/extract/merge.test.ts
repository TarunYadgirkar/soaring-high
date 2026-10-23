import { describe, expect, it } from "vitest";
import { AS_OF, buildTrip } from "../../data/seed/build";
import { CASES } from "../../data/seed/cases";
import { decide } from "../rules/engine";
import type { Segment, TripFacts } from "../types";
import { compareFacts, mergeExtraction } from "./merge";
import type { ExtractedSegment, ExtractedTrip } from "./schema";

const toExtracted = (s: Segment): ExtractedSegment => ({
  flight_number: s.flight_number,
  origin: s.origin,
  destination: s.destination,
  departure_local: s.departure.slice(0, 16),
  arrival_local: s.arrival.slice(0, 16),
  cabin: s.cabin,
});

// What a perfect extraction of the seeded emails would return.
function perfect(f: TripFacts): ExtractedTrip {
  return {
    record_locator: f.record_locator,
    original_itinerary: f.original.map(toExtracted),
    change: f.change && {
      email_id: f.change.email_id,
      kind: f.change.kind,
      initiated_by: f.change.initiated_by,
      new_itinerary: f.change.new_itinerary?.map(toExtracted) ?? null,
      alternative_offered: f.change.alternative_offered,
      credit_offered: f.change.credit_offered,
      credit_issued: f.change.credit_issued,
    },
    traveler_action_in_email:
      f.response.source === "email" && f.response.action !== "none" && f.response.action !== "rejected" && f.response.action !== "booked_other_carrier"
        ? f.response.action
        : null,
  };
}

describe("mergeExtraction", () => {
  it("a perfect extraction reproduces every gold fact and decision", () => {
    for (const spec of CASES) {
      const trip = buildTrip(spec);
      const merged = mergeExtraction(trip, perfect(trip.facts));
      if ("error" in merged) throw new Error(`${spec.id}: ${merged.error}`);
      const misses = compareFacts(trip.facts, merged.trip.facts).filter((c) => !c.ok);
      expect(misses, spec.id).toEqual([]);
      const gold = decide(trip, { asOf: AS_OF });
      const got = decide(merged.trip, { asOf: AS_OF });
      expect([got.verdict, got.basis], spec.id).toEqual([gold.verdict, gold.basis]);
    }
  });

  it("reports an unknown change email instead of guessing", () => {
    const trip = buildTrip(CASES[0]);
    const ex = perfect(trip.facts);
    const bad = { ...ex, change: ex.change && { ...ex.change, email_id: "em-missing" } };
    expect(mergeExtraction(trip, bad)).toEqual({ error: "change email em-missing not in the trip" });
  });
});
