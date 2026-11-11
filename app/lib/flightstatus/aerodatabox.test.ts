import { describe, expect, it } from "vitest";
import { FlightsResponse, mapFlight, toIso } from "./aerodatabox";

// Shape follows the AeroDataBox RapidAPI OpenAPI spec (FlightContract); values are made up.
const arrived = [
  {
    number: "UA 1182",
    status: "Arrived",
    departure: {
      airport: { iata: "SFO", name: "San Francisco" },
      scheduledTime: { utc: "2026-09-14 15:05Z", local: "2026-09-14 08:05-07:00" },
      revisedTime: { utc: "2026-09-14 18:10Z", local: "2026-09-14 11:10-07:00" },
    },
    arrival: {
      airport: { iata: "ORD", name: "Chicago O'Hare" },
      scheduledTime: { utc: "2026-09-14 19:15Z", local: "2026-09-14 14:15-05:00" },
      revisedTime: { utc: "2026-09-14 22:20Z", local: "2026-09-14 17:20-05:00" },
    },
  },
];

describe("AeroDataBox mapping", () => {
  it("parses local times with offsets", () => {
    expect(toIso("2026-09-14 08:05-07:00")).toBe("2026-09-14T08:05:00-07:00");
    expect(toIso("2026-09-14T08:05:30+01:00")).toBe("2026-09-14T08:05:30+01:00");
    expect(toIso(undefined)).toBeNull();
  });

  it("maps an arrived flight to actual times", () => {
    const s = mapFlight(FlightsResponse.parse(arrived), "UA 1182", "2026-09-14", "SFO");
    expect(s).toMatchObject({
      status: "landed",
      scheduled_arrival: "2026-09-14T14:15:00-05:00",
      actual_arrival: "2026-09-14T17:20:00-05:00",
      estimated_arrival: null,
      provider: "aerodatabox",
    });
  });

  it("maps Canceled to cancelled and treats CanceledUncertain as no proof", () => {
    const cancelled = [{ ...arrived[0], status: "Canceled" }];
    expect(mapFlight(FlightsResponse.parse(cancelled), "UA 1182", "2026-09-14", "SFO")?.status).toBe("cancelled");
    const uncertain = [{ ...arrived[0], status: "CanceledUncertain" }];
    expect(mapFlight(FlightsResponse.parse(uncertain), "UA 1182", "2026-09-14", "SFO")).toBeNull();
  });

  it("picks the leg that departs from the segment's origin", () => {
    const twoLegs = [{ ...arrived[0], departure: { ...arrived[0].departure, airport: { iata: "DEN" } } }, arrived[0]];
    expect(mapFlight(FlightsResponse.parse(twoLegs), "UA 1182", "2026-09-14", "SFO")?.origin).toBe("SFO");
  });

  it("picks the departure on the requested date when an overnight flight returns two days", () => {
    const dayBefore = {
      ...arrived[0],
      departure: {
        ...arrived[0].departure,
        scheduledTime: { utc: "2026-09-13 15:05Z", local: "2026-09-13 08:05-07:00" },
      },
    };
    const s = mapFlight(FlightsResponse.parse([dayBefore, arrived[0]]), "UA 1182", "2026-09-14", "SFO");
    expect(s?.scheduled_departure).toBe("2026-09-14T08:05:00-07:00");
  });

  it("keeps an upcoming delayed flight's revised times as estimates", () => {
    const delayed = [{ ...arrived[0], status: "Delayed" }];
    const s = mapFlight(FlightsResponse.parse(delayed), "UA 1182", "2026-09-14", "SFO");
    expect(s).toMatchObject({ status: "delayed", estimated_departure: "2026-09-14T11:10:00-07:00", actual_departure: null });
  });
});
