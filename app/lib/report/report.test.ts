import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { AS_OF, type SeedTrip } from "../../data/seed/build";
import { decide } from "../rules/engine";
import { creditRows, payeeRows, type ReportInput } from "./report";

const trips = JSON.parse(readFileSync(join(__dirname, "../../data/seed/trips.json"), "utf8")) as SeedTrip[];
const claims: ReportInput[] = trips.map((t) => {
  const decision = decide(t, { asOf: AS_OF });
  return { trip: t, decision, stage: "ready_to_request" };
});

describe("recovery report", () => {
  it("adds up to the same owed total as the claims board", () => {
    const owed = claims.filter((c) => c.decision.verdict === "refund_owed").reduce((s, c) => s + (c.decision.amount_cents ?? 0), 0);
    expect(payeeRows(claims).reduce((s, p) => s + p.owedCents, 0)).toBe(owed);
  });

  it("sorts payees by open money and drops recovered claims", () => {
    const rows = payeeRows(claims);
    expect(rows[0].owedCents + rows[0].liveCents).toBeGreaterThanOrEqual(rows[1].owedCents + rows[1].liveCents);
    expect(payeeRows(claims.map((c) => ({ ...c, stage: "recovered" }))).every((p) => p.owedTrips === 0)).toBe(true);
  });

  it("lists only trips where the traveler accepted a credit", () => {
    const rows = creditRows(claims);
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.every((r) => r.amountCents > 0)).toBe(true);
  });
});
