import { describe, expect, it } from "vitest";
import { AS_OF, buildTrip } from "../../data/seed/build";
import { CASES } from "../../data/seed/cases";
import { decide } from "../rules/engine";
import { actions, stage, type ClaimEvent } from "./escalation";

const decisionFor = (id: string) => {
  const spec = CASES.find((c) => c.id === id);
  if (!spec) throw new Error(id);
  return decide(buildTrip(spec), { asOf: AS_OF });
};
const allowed = (id: string, events: ClaimEvent[], asOf = AS_OF) =>
  actions(decisionFor(id), events, asOf).filter((a) => a.allowed).map((a) => a.kind);

describe("escalation order", () => {
  const requested: ClaimEvent = { type: "refund_requested", at: "2026-10-22T19:00:00Z" };

  it("starts with the refund request", () => {
    expect(allowed("T01", [])).toEqual(["request_refund"]);
  });

  it("never allows a dispute while the refund request is pending", () => {
    expect(stage(decisionFor("T01"), [requested], "2026-10-30T12:00:00Z")).toBe("refund_pending");
    expect(allowed("T01", [requested], "2026-10-30T12:00:00Z")).toEqual([]);
    const dispute = actions(decisionFor("T01"), [requested], "2026-10-30T12:00:00Z").find((a) => a.kind === "open_dispute");
    expect(dispute?.reason).toMatch(/pending until Nov 2/);
  });

  it("allows the DOT complaint once the request is overdue, then the dispute", () => {
    expect(allowed("T01", [requested], "2026-11-03T12:00:00Z")).toEqual(["file_dot_complaint"]);
    const filed: ClaimEvent = { type: "dot_complaint_filed", at: "2026-11-03T12:00:00Z" };
    expect(allowed("T01", [requested, filed], "2026-11-03T12:00:00Z")).toEqual(["open_dispute"]);
  });

  it("allows the DOT complaint right away when the payee refuses", () => {
    const refused: ClaimEvent = { type: "refund_refused", at: "2026-10-24T12:00:00Z", note: "Airline says credit only" };
    expect(allowed("T01", [requested, refused], "2026-10-24T13:00:00Z")).toEqual(["file_dot_complaint"]);
  });

  it("closes the claim when the refund arrives", () => {
    const received: ClaimEvent = { type: "refund_received", at: "2026-10-28T12:00:00Z", amount_cents: 45130 };
    expect(stage(decisionFor("T01"), [requested, received], "2026-11-10T12:00:00Z")).toBe("recovered");
    expect(allowed("T01", [requested, received], "2026-11-10T12:00:00Z")).toEqual([]);
  });

  it("offers only the traveler alert for a live disruption", () => {
    expect(allowed("T21", [])).toEqual(["alert_traveler"]);
    expect(allowed("T21", [{ type: "traveler_alerted", at: AS_OF }])).toEqual([]);
  });

  it("offers nothing for trips with no refund owed", () => {
    expect(allowed("T32", [])).toEqual([]);
  });
});
