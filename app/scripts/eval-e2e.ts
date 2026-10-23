import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { parseArgs } from "node:util";
import { AS_OF, type SeedTrip } from "../data/seed/build";
import { report, row, score } from "../lib/eval/score";
import { DEFAULT_MODEL, type ExtractionResult } from "../lib/extract/extract";
import { compareFacts, mergeExtraction } from "../lib/extract/merge";
import { decide } from "../lib/rules/engine";

const APP = join(import.meta.dirname, "..");
const { values } = parseArgs({ options: { model: { type: "string", default: DEFAULT_MODEL } } });
const model = values.model;
const cacheDir = join(APP, "data/extract", model);

const trips: SeedTrip[] = JSON.parse(readFileSync(join(APP, "data/seed/trips.json"), "utf8"));
const missing: string[] = [];
const mergeErrors: string[] = [];
const fieldTotals = new Map<string, { n: number; ok: number }>();
const fieldMisses: string[] = [];
let costUsd = 0;

const rows = trips.flatMap(({ label, ...trip }) => {
  const path = join(cacheDir, `${trip.id}.json`);
  if (!existsSync(path)) {
    missing.push(trip.id);
    return [];
  }
  const result: ExtractionResult = JSON.parse(readFileSync(path, "utf8"));
  costUsd += result.cost_usd;
  const merged = mergeExtraction(trip, result.extracted);
  if ("error" in merged) {
    mergeErrors.push(`${trip.id}: ${merged.error}`);
    return [row(trip.id, label, { verdict: "needs_info", basis: null, amount_cents: null })];
  }
  for (const c of compareFacts(trip.facts, merged.trip.facts)) {
    const t = fieldTotals.get(c.field) ?? { n: 0, ok: 0 };
    fieldTotals.set(c.field, { n: t.n + 1, ok: t.ok + (c.ok ? 1 : 0) });
    if (!c.ok) fieldMisses.push(`  ${trip.id} ${c.field}: gold ${c.gold} | got ${c.got}`);
  }
  return [row(trip.id, label, decide(merged.trip, { asOf: AS_OF }))];
});

if (rows.length === 0) {
  console.error(`No extractions cached for ${model}. Run \`pnpm extract --model ${model}\` first.`);
  process.exit(1);
}

const s = score(rows);
const lines = [
  report(
    `Soaring High end-to-end eval: ${s.trips} seeded trips, facts extracted from email by ${model}, as of ${AS_OF}`,
    "Seeded, author-labeled cases. Claude reads the emails; the rules engine decides. Positive = refund_owed or hold_credit_alert.",
    s,
  ),
  "",
  "Extraction accuracy by field (against the seeded gold facts)",
  ...[...fieldTotals.entries()].map(([f, t]) => `  ${f.padEnd(28)} ${t.ok}/${t.n}`),
  `Extraction cost for these trips: $${costUsd.toFixed(4)}`,
];
if (missing.length > 0) lines.push(`Not extracted yet (excluded from scores): ${missing.join(", ")}`);
if (mergeErrors.length > 0) lines.push("", "Could not use extraction (scored as needs_info):", ...mergeErrors.map((e) => `  ${e}`));
if (fieldMisses.length > 0) lines.push("", "Field mismatches:", ...fieldMisses);
console.log(lines.join("\n"));

const evalDir = join(APP, "data/eval");
mkdirSync(evalDir, { recursive: true });
writeFileSync(
  join(evalDir, `e2e-${model}.json`),
  `${JSON.stringify(
    {
      dataset: "seed",
      facts: `extracted by ${model}`,
      note: "Seeded, author-labeled cases. Not real-world accuracy.",
      as_of: AS_OF,
      extraction_cost_usd: costUsd,
      field_accuracy: Object.fromEntries(fieldTotals),
      missing,
      merge_errors: mergeErrors,
      ...s,
    },
    null,
    2,
  )}\n`,
);
