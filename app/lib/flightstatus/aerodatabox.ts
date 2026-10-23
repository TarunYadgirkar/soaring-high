import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { z } from "zod";
import type { FlightStatus, FlightStatusState } from "../types";

// AeroDataBox via RapidAPI, Basic plan: 400 units a month, 2 units per lookup.
// Terms: non-commercial, visible "AeroDataBox" credit, store responses at most 7 days.
const HOST = "aerodatabox.p.rapidapi.com";
const RETENTION_MS = 7 * 24 * 3_600_000;
export const MONTHLY_LOOKUP_CAP = 190;

const Time = z.object({ utc: z.string(), local: z.string() }).partial();
const Movement = z.object({
  airport: z.object({ iata: z.string().optional() }).passthrough(),
  scheduledTime: Time.optional(),
  revisedTime: Time.optional(),
});
const Flight = z.object({
  number: z.string(),
  status: z.string(),
  departure: Movement,
  arrival: Movement,
});
export const FlightsResponse = z.array(Flight);
type Flight = z.infer<typeof Flight>;

const IN_AIR = new Set(["Departed", "EnRoute", "Approaching"]);

// AeroDataBox local times look like "2026-09-14 08:05-07:00"; ours are "2026-09-14T08:05:00-07:00".
export function toIso(local: string | undefined): string | null {
  if (!local) return null;
  const m = /^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2})(?::(\d{2}))?([+-]\d{2}:\d{2}|Z)$/.exec(local.trim());
  if (!m) throw new Error(`Unexpected AeroDataBox time ${local}`);
  return `${m[1]}T${m[2]}:${m[3] ?? "00"}${m[4] === "Z" ? "+00:00" : m[4]}`;
}

function state(status: string): FlightStatusState | null {
  if (status === "Canceled") return "cancelled";
  // CanceledUncertain is not proof of a cancellation; treat it as no record.
  if (status === "CanceledUncertain" || status === "Unknown") return null;
  if (status === "Arrived") return "landed";
  if (status === "Diverted") return "diverted";
  if (status === "Delayed") return "delayed";
  if (IN_AIR.has(status)) return "active";
  return "scheduled";
}

export function mapFlight(flights: Flight[], flightNumber: string, date: string, origin: string): FlightStatus | null {
  const f = flights.find((x) => x.departure.airport.iata === origin) ?? (flights.length === 1 ? flights[0] : undefined);
  if (!f) return null;
  const st = state(f.status);
  const schedDep = toIso(f.departure.scheduledTime?.local);
  const schedArr = toIso(f.arrival.scheduledTime?.local);
  if (!st || !schedDep || !schedArr) return null;
  const departed = st === "landed" || st === "diverted" || st === "active";
  const revDep = toIso(f.departure.revisedTime?.local);
  const revArr = toIso(f.arrival.revisedTime?.local);
  return {
    id: `adb-${flightNumber.replace(" ", "")}-${date}`,
    flight_number: flightNumber,
    date,
    origin: f.departure.airport.iata ?? origin,
    destination: f.arrival.airport.iata ?? "",
    status: st,
    scheduled_departure: schedDep,
    scheduled_arrival: schedArr,
    estimated_departure: departed ? null : revDep,
    estimated_arrival: st === "landed" || st === "diverted" ? null : revArr,
    actual_departure: departed ? revDep : null,
    actual_arrival: st === "landed" || st === "diverted" ? revArr : null,
    // The docs don't say whether a diversion changes arrival.airport, so don't claim one.
    actual_destination: null,
    provider: "aerodatabox",
  };
}

type CacheEntry = { fetched_at: string; body: unknown };

export class AeroDataBox {
  constructor(
    private readonly apiKey: string,
    private readonly cacheDir: string,
  ) {
    mkdirSync(cacheDir, { recursive: true });
  }

  private usagePath(): string {
    return join(this.cacheDir, `usage-${new Date().toISOString().slice(0, 7)}.json`);
  }

  lookupsThisMonth(): number {
    const p = this.usagePath();
    return existsSync(p) ? (JSON.parse(readFileSync(p, "utf8")) as { lookups: number }).lookups : 0;
  }

  async status(flightNumber: string, date: string, origin: string): Promise<FlightStatus | null> {
    const key = `${flightNumber.replace(" ", "")}-${date}`;
    const path = join(this.cacheDir, `${key}.json`);
    if (existsSync(path)) {
      const cached = JSON.parse(readFileSync(path, "utf8")) as CacheEntry;
      if (Date.now() - Date.parse(cached.fetched_at) < RETENTION_MS) {
        return mapFlight(FlightsResponse.parse(cached.body), flightNumber, date, origin);
      }
    }
    if (this.lookupsThisMonth() >= MONTHLY_LOOKUP_CAP) {
      throw new Error(`AeroDataBox monthly cap of ${MONTHLY_LOOKUP_CAP} lookups reached`);
    }
    const res = await fetch(`https://${HOST}/flights/number/${encodeURIComponent(flightNumber.replace(" ", ""))}/${date}`, {
      headers: { "X-RapidAPI-Key": this.apiKey, "X-RapidAPI-Host": HOST },
    });
    writeFileSync(this.usagePath(), JSON.stringify({ lookups: this.lookupsThisMonth() + 1 }));
    if (res.status === 204 || res.status === 404) return null;
    if (!res.ok) throw new Error(`AeroDataBox ${res.status} for ${flightNumber} ${date}: ${await res.text()}`);
    const body: unknown = await res.json();
    writeFileSync(path, JSON.stringify({ fetched_at: new Date().toISOString(), body } satisfies CacheEntry));
    return mapFlight(FlightsResponse.parse(body), flightNumber, date, origin);
  }
}
