import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { buildTrip } from "../data/seed/build";
import { CASES } from "../data/seed/cases";

const ids = new Set<string>();
for (const c of CASES) {
  if (ids.has(c.id)) throw new Error(`Duplicate case id ${c.id}`);
  ids.add(c.id);
}

const trips = [...CASES].sort((a, b) => a.id.localeCompare(b.id)).map(buildTrip);
const out = join(import.meta.dirname, "../data/seed/trips.json");
writeFileSync(out, `${JSON.stringify(trips, null, 2)}\n`);

const positives = trips.filter((t) => t.label.verdict === "refund_owed" || t.label.verdict === "hold_credit_alert").length;
console.log(`Wrote ${trips.length} trips (${positives} positive, ${trips.length - positives} negative) to data/seed/trips.json`);
