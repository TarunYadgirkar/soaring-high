import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { AS_OF, type SeedTrip } from "../data/seed/build";
import { report, row, score } from "../lib/eval/score";
import { decide } from "../lib/rules/engine";

const trips: SeedTrip[] = JSON.parse(readFileSync(join(import.meta.dirname, "../data/seed/trips.json"), "utf8"));

const rows = trips.map(({ label, ...trip }) => row(trip.id, label, decide(trip, { asOf: AS_OF })));
const s = score(rows);
console.log(
  report(
    `Soaring High rules engine eval: ${s.trips} seeded trips, as of ${AS_OF}`,
    "Seeded, author-labeled cases. Gold trip facts. Positive = refund_owed or hold_credit_alert.",
    s,
  ),
);

const evalDir = join(import.meta.dirname, "../data/eval");
mkdirSync(evalDir, { recursive: true });
writeFileSync(
  join(evalDir, "latest.json"),
  `${JSON.stringify({ dataset: "seed", facts: "gold", note: "Seeded, author-labeled cases. Not real-world accuracy.", as_of: AS_OF, ...s }, null, 2)}\n`,
);

if (s.rows.some((r) => !r.verdict_match || !r.basis_match)) process.exit(1);
