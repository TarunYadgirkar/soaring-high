import "server-only";
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { AS_OF, type SeedTrip } from "../../data/seed/build";
import { actions, stage, type Action, type ClaimEvent, type ClaimStage } from "../escalation/escalation";
import { decide } from "../rules/engine";
import type { Decision, Trip } from "../types";

const ROOT = process.cwd();
const DATA = join(ROOT, ".data");
const EVENTS = join(DATA, "events.json");
const CLOCK = join(DATA, "clock.json");

export type Claim = {
  trip: Trip;
  title: string;
  decision: Decision;
  events: ClaimEvent[];
  stage: ClaimStage;
  actions: Action[];
};

function readJson<T>(path: string, fallback: T): T {
  return existsSync(path) ? (JSON.parse(readFileSync(path, "utf8")) as T) : fallback;
}

function writeJson(path: string, value: unknown): void {
  mkdirSync(DATA, { recursive: true });
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
}

let tripsCache: SeedTrip[] | null = null;
function seedTrips(): SeedTrip[] {
  tripsCache ??= JSON.parse(readFileSync(join(ROOT, "data/seed/trips.json"), "utf8")) as SeedTrip[];
  return tripsCache;
}

// The demo clock starts at the seed's "as of" time and can be moved forward to
// show a refund request going overdue.
export function now(): string {
  return readJson<{ now: string }>(CLOCK, { now: AS_OF }).now;
}

export function setNow(iso: string): void {
  writeJson(CLOCK, { now: iso });
}

function allEvents(): Record<string, ClaimEvent[]> {
  return readJson<Record<string, ClaimEvent[]>>(EVENTS, {});
}

export function appendEvent(tripId: string, event: ClaimEvent): void {
  const all = allEvents();
  writeJson(EVENTS, { ...all, [tripId]: [...(all[tripId] ?? []), event] });
}

export function resetDemo(): void {
  writeJson(EVENTS, {});
  writeJson(CLOCK, { now: AS_OF });
}

// Trips joined from the Ramp sandbox by `pnpm ramp:sync`; absent until it has run.
function rampTrips(): Trip[] {
  return readJson<Trip[]>(join(DATA, "ramp-trips.json"), []);
}

export function tripIds(): string[] {
  return [...seedTrips().map((t) => t.id), ...rampTrips().map((t) => t.id)];
}

export function claims(): Claim[] {
  const asOf = now();
  const events = allEvents();
  const build = (trip: Trip, title: string): Claim => {
    const decision = decide(trip, { asOf });
    const ev = events[trip.id] ?? [];
    return { trip, title, decision, events: ev, stage: stage(decision, ev, asOf), actions: actions(decision, ev, asOf) };
  };
  return [
    ...seedTrips().map(({ label, ...trip }) => build({ ...trip, source: "seed" }, label.title)),
    ...rampTrips().map((trip) => build(trip, trip.title ?? trip.id)),
  ];
}

export function claim(id: string): Claim | undefined {
  return claims().find((c) => c.trip.id === id);
}

export type EvalSummary = {
  trips: number;
  precision: number | null;
  recall: number | null;
  verdict_accuracy: number;
  basis_accuracy: number;
  confusion: { tp: number; fp: number; fn: number; tn: number };
  by_category: Record<string, { n: number; correct: number }>;
  note: string;
  facts: string;
};

export function evalResults(): { gold: EvalSummary | null; e2e: EvalSummary[] } {
  const dir = join(ROOT, "data/eval");
  const gold = readJson<EvalSummary | null>(join(dir, "latest.json"), null);
  const e2e = readdirSync(dir)
    .filter((f) => f.startsWith("e2e-") && f.endsWith(".json"))
    .sort()
    .map((f) => readJson<EvalSummary | null>(join(dir, f), null))
    .filter((x): x is EvalSummary => x !== null);
  return { gold, e2e };
}
