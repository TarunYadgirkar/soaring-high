import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { decide } from "../rules/engine";
import { BookingsResponse, matchCharge, segmentsFrom, toRampTransaction, TransactionsResponse, tripFromBooking } from "./join";

const fixture = JSON.parse(readFileSync(join(import.meta.dirname, "fixtures/sandbox.json"), "utf8"));
const { flights } = BookingsResponse.parse(fixture);
const charges = TransactionsResponse.parse({ transactions: fixture.transactions }).transactions.map(toRampTransaction);
const booking = (fn: string) => {
  const b = flights.find((f) => f.flight_number === fn);
  if (!b) throw new Error(fn);
  return b;
};

describe("joining Ramp sandbox bookings to card charges", () => {
  it("matches AC 1521 to the Air Canada charge whose memo names Toronto", () => {
    const m = matchCharge(booking("AC 1521"), charges);
    expect(m?.charge.amount).toBe("$435.56");
    expect(m?.why.join(" ")).toMatch(/toronto/);
  });

  it("does not treat a $10 wifi charge as the JetBlue ticket", () => {
    expect(matchCharge(booking("B6 2153"), charges)).toBeNull();
  });

  it("does not guess when the only same-airline charge has no route in its memo", () => {
    expect(matchCharge(booking("AA 6020"), charges)).toBeNull();
  });

  it("builds segments from slices and asks for flight data before claiming anything", () => {
    const b = booking("AC 1521");
    expect(segmentsFrom(b)[0]).toMatchObject({ flight_number: "AC 1521", origin: "LGA", destination: "YYZ", cabin: "economy" });
    const m = matchCharge(b, charges);
    if (!m) throw new Error("no match");
    const d = decide(tripFromBooking(b, m), { asOf: "2026-10-29T19:00:00Z" });
    expect(d.verdict).toBe("needs_info");
    expect(d.reason).toMatch(/No flight-status record for AC 1521/);
  });
});
