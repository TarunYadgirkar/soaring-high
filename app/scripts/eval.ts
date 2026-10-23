import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { AS_OF, type SeedTrip } from "../data/seed/build";
import { decide, formatUsd } from "../lib/rules/engine";
import type { Verdict } from "../lib/types";

const POSITIVE: Verdict[] = ["refund_owed", "hold_credit_alert"];
const isPositive = (v: Verdict) => POSITIVE.includes(v);

const trips: SeedTrip[] = JSON.parse(readFileSync(join(import.meta.dirname, "../data/seed/trips.json"), "utf8"));

const rows = trips.map(({ label, ...trip }) => {
  const d = decide(trip, { asOf: AS_OF });
  return {
    trip_id: trip.id,
    title: label.title,
    category: label.category,
    expected: { verdict: label.verdict, basis: label.basis },
    got: { verdict: d.verdict, basis: d.basis, amount_cents: d.amount_cents },
    verdict_match: d.verdict === label.verdict,
    basis_match: d.basis === label.basis,
  };
});

let tp = 0, fp = 0, fn = 0, tn = 0;
for (const r of rows) {
  const want = isPositive(r.expected.verdict);
  const got = isPositive(r.got.verdict);
  if (want && got) tp++;
  else if (!want && got) fp++;
  else if (want && !got) fn++;
  else tn++;
}
const ratio = (num: number, den: number) => (den === 0 ? null : num / den);
const precision = ratio(tp, tp + fp);
const recall = ratio(tp, tp + fn);
const f1 = precision !== null && recall !== null && precision + recall > 0 ? (2 * precision * recall) / (precision + recall) : null;
const verdictAccuracy = rows.filter((r) => r.verdict_match).length / rows.length;
const basisAccuracy = rows.filter((r) => r.basis_match).length / rows.length;

const byCategory = new Map<string, { n: number; correct: number }>();
for (const r of rows) {
  const c = byCategory.get(r.category) ?? { n: 0, correct: 0 };
  byCategory.set(r.category, { n: c.n + 1, correct: c.correct + (r.verdict_match && r.basis_match ? 1 : 0) });
}

const owedCents = rows.filter((r) => r.got.verdict === "refund_owed").reduce((s, r) => s + (r.got.amount_cents ?? 0), 0);
const alertCents = rows.filter((r) => r.got.verdict === "hold_credit_alert").reduce((s, r) => s + (r.got.amount_cents ?? 0), 0);

const pct = (x: number | null) => (x === null ? "n/a" : `${(x * 100).toFixed(1)}%`);
const out = [
  `Soaring High rules engine eval: ${rows.length} seeded trips, as of ${AS_OF}`,
  "Seeded, author-labeled cases. Positive = refund_owed or hold_credit_alert.",
  "",
  `Precision ${pct(precision)}   Recall ${pct(recall)}   F1 ${pct(f1)}`,
  `Verdict accuracy ${pct(verdictAccuracy)}   Cited-clause match ${pct(basisAccuracy)}`,
  "",
  "Confusion matrix      predicted +   predicted -",
  `  labeled +           ${String(tp).padStart(11)}   ${String(fn).padStart(11)}`,
  `  labeled -           ${String(fp).padStart(11)}   ${String(tn).padStart(11)}`,
  "",
  "By category (verdict and clause both correct)",
  ...[...byCategory.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([cat, c]) => `  ${cat.padEnd(22)} ${c.correct}/${c.n}`),
  "",
  `Sample-data totals: ${formatUsd(owedCents)} owed now, ${formatUsd(alertCents)} at stake in live alerts.`,
];

const misses = rows.filter((r) => !r.verdict_match || !r.basis_match);
if (misses.length > 0) {
  out.push("", "Mismatches:");
  for (const m of misses) {
    out.push(`  ${m.trip_id} ${m.title}: expected ${m.expected.verdict} ${m.expected.basis ?? "-"}, got ${m.got.verdict} ${m.got.basis ?? "-"}`);
  }
}
console.log(out.join("\n"));

const evalDir = join(import.meta.dirname, "../data/eval");
mkdirSync(evalDir, { recursive: true });
writeFileSync(
  join(evalDir, "latest.json"),
  `${JSON.stringify(
    {
      dataset: "seed",
      note: "Seeded, author-labeled cases. Not real-world accuracy.",
      as_of: AS_OF,
      trips: rows.length,
      confusion: { tp, fp, fn, tn },
      precision,
      recall,
      f1,
      verdict_accuracy: verdictAccuracy,
      basis_accuracy: basisAccuracy,
      sample_owed_cents: owedCents,
      sample_alert_cents: alertCents,
      by_category: Object.fromEntries(byCategory),
      rows,
    },
    null,
    2,
  )}\n`,
);

if (misses.length > 0) process.exit(1);
