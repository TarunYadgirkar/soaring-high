import { describe, expect, it } from "vitest";
import { AS_OF, buildTrip, type CaseSpec } from "../../data/seed/build";
import { CASES } from "../../data/seed/cases";
import type { Segment } from "../types";
import { addBusinessDays, federalHolidays } from "./dates";
import { decide, significantChanges } from "./engine";

function seg(over: Partial<Segment> = {}): Segment {
  return {
    flight_number: "UA 1",
    origin: "SFO",
    destination: "ORD",
    departure: "2026-09-14T08:00:00-07:00",
    arrival: "2026-09-14T14:00:00-05:00",
    cabin: "economy",
    ...over,
  };
}

function lateBy(minutes: number, base: Segment = seg()): Segment {
  return { ...base, arrival: new Date(Date.parse(base.arrival) + minutes * 60_000).toISOString() };
}

const kinds = (s: Segment[], d: Segment[], intl = false) => significantChanges(s, d, intl).map((t) => t.kind);

describe("significant change thresholds (260.2)", () => {
  it("domestic: 2h59m late is not significant, 3h00m is", () => {
    expect(kinds([seg()], [lateBy(179)])).toEqual([]);
    expect(kinds([seg()], [lateBy(180)])).toEqual(["arrive_late"]);
  });

  it("international: 5h59m late is not significant, 6h00m is", () => {
    const intl = seg({ destination: "LHR", arrival: "2026-09-15T06:00:00+01:00" });
    expect(kinds([intl], [lateBy(359, intl)], true)).toEqual([]);
    expect(kinds([intl], [lateBy(360, intl)], true)).toEqual(["arrive_late"]);
  });

  it("departing 3h earlier is significant", () => {
    const early = seg({ departure: "2026-09-14T05:00:00-07:00" });
    expect(kinds([seg()], [early])).toEqual(["depart_early"]);
  });

  it("detects airport change, added connection and downgrade", () => {
    expect(kinds([seg()], [seg({ origin: "OAK" })])).toEqual(["airport_change"]);
    expect(kinds([seg()], [seg({ destination: "DEN" }), seg({ origin: "DEN" })])).toEqual(["more_connections"]);
    expect(kinds([seg({ cabin: "business" })], [seg({ cabin: "economy" })])).toEqual(["downgrade"]);
  });
});

describe("business days", () => {
  it("knows observed federal holidays", () => {
    expect(federalHolidays(2026)).toContain("2026-07-03");
    expect(federalHolidays(2026)).toContain("2026-11-26");
    expect(federalHolidays(2027)).toContain("2027-06-18");
    expect(federalHolidays(2027)).toContain("2027-07-05");
    expect(federalHolidays(2027)).toContain("2027-12-31");
  });

  it("skips weekends and Thanksgiving", () => {
    expect(addBusinessDays("2026-11-20", 7)).toBe("2026-12-02");
  });
});

const renumbered = (dep: string, shiftMin: number): CaseSpec => ({
  id: "X01",
  title: "renumbered",
  category: "renumbered",
  traveler: "Test Traveler",
  seller: "carrier",
  fare: 200,
  seg: { fn: "AA 1543", from: "DFW", to: "ORD", dep, mins: 140 },
  event: { kind: "renumber", noticeHoursBefore: 240, newFn: "AA 2297", shiftMin },
  response: "rejected",
  label: { verdict: "excluded", basis: "91-FR-41556" },
  why: "",
});

describe("renumbered flights (91 FR 41556)", () => {
  it("excludes a renumbered flight with no significant change before July 7, 2027", () => {
    const d = decide(buildTrip(renumbered("2027-07-06 10:10", 25)), { asOf: "2027-08-01T00:00:00Z" });
    expect(d.verdict).toBe("excluded");
    expect(d.basis).toBe("91-FR-41556");
  });

  it("treats it as a cancelled flight from July 7, 2027", () => {
    const d = decide(buildTrip(renumbered("2027-07-07 10:10", 25)), { asOf: "2027-08-01T00:00:00Z" });
    expect(d.verdict).toBe("refund_owed");
    expect(d.triggers.map((t) => t.kind)).toContain("cancelled");
  });

  it("does not exclude a renumbering that is also a significant change", () => {
    const d = decide(buildTrip(renumbered("2026-09-17 10:10", 200)), { asOf: AS_OF });
    expect(d.verdict).toBe("refund_owed");
    expect(d.triggers.map((t) => t.kind)).toEqual(expect.arrayContaining(["cancelled", "arrive_late"]));
  });
});

describe("decisions over the seeded trips", () => {
  const trips = CASES.map(buildTrip);
  const decisions = trips.map((t) => decide(t, { asOf: AS_OF }));

  it("every refund or alert cites its basis and has flight-status proof", () => {
    for (const d of decisions.filter((x) => x.verdict === "refund_owed" || x.verdict === "hold_credit_alert")) {
      expect(d.basis, d.trip_id).not.toBeNull();
      expect(d.citations.map((c) => c.clause), d.trip_id).toContain(d.basis);
      expect(d.proof.some((p) => p.source === "flight_status"), d.trip_id).toBe(true);
      expect(d.amount_cents, d.trip_id).toBeGreaterThan(0);
    }
  });

  it("carrier refunds are due 7 business days after they became due", () => {
    const t01 = decisions.find((d) => d.trip_id === "T01");
    expect(t01?.refund_due_by).toBe("2026-09-23");
    expect(t01?.overdue).toBe(true);
  });

  it("refund amount includes ancillary fees and nets out refunds already posted", () => {
    expect(decisions.find((d) => d.trip_id === "T01")?.amount_cents).toBe(45130);
    expect(decisions.find((d) => d.trip_id === "T24")?.amount_cents).toBe(8400);
  });

  it("does not mutate the trip", () => {
    const trip = buildTrip(CASES[0]);
    const before = JSON.stringify(trip);
    decide(trip, { asOf: AS_OF });
    expect(JSON.stringify(trip)).toBe(before);
  });
});
