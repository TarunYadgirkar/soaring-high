import { formatUsd } from "../rules/engine";
import type { ClauseId, Decision, Verdict } from "../types";

export const POSITIVE: Verdict[] = ["refund_owed", "hold_credit_alert"];
const isPositive = (v: Verdict) => POSITIVE.includes(v);

export type Expected = { verdict: Verdict; basis: ClauseId | null; title: string; category: string };

export type Row = {
  trip_id: string;
  title: string;
  category: string;
  expected: { verdict: Verdict; basis: ClauseId | null };
  got: { verdict: Verdict; basis: ClauseId | null; amount_cents: number | null };
  verdict_match: boolean;
  basis_match: boolean;
};

export function row(tripId: string, expected: Expected, d: Pick<Decision, "verdict" | "basis" | "amount_cents">): Row {
  return {
    trip_id: tripId,
    title: expected.title,
    category: expected.category,
    expected: { verdict: expected.verdict, basis: expected.basis },
    got: { verdict: d.verdict, basis: d.basis, amount_cents: d.amount_cents },
    verdict_match: d.verdict === expected.verdict,
    basis_match: d.basis === expected.basis,
  };
}

export type Score = {
  trips: number;
  confusion: { tp: number; fp: number; fn: number; tn: number };
  precision: number | null;
  recall: number | null;
  f1: number | null;
  verdict_accuracy: number;
  basis_accuracy: number;
  sample_owed_cents: number;
  sample_alert_cents: number;
  by_category: Record<string, { n: number; correct: number }>;
  rows: Row[];
};

export function score(rows: Row[]): Score {
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
  const byCategory: Record<string, { n: number; correct: number }> = {};
  for (const r of rows) {
    const c = byCategory[r.category] ?? { n: 0, correct: 0 };
    byCategory[r.category] = { n: c.n + 1, correct: c.correct + (r.verdict_match && r.basis_match ? 1 : 0) };
  }
  const sum = (v: Verdict) => rows.filter((r) => r.got.verdict === v).reduce((s, r) => s + (r.got.amount_cents ?? 0), 0);
  return {
    trips: rows.length,
    confusion: { tp, fp, fn, tn },
    precision,
    recall,
    f1,
    verdict_accuracy: rows.filter((r) => r.verdict_match).length / rows.length,
    basis_accuracy: rows.filter((r) => r.basis_match).length / rows.length,
    sample_owed_cents: sum("refund_owed"),
    sample_alert_cents: sum("hold_credit_alert"),
    by_category: byCategory,
    rows,
  };
}

const pct = (x: number | null) => (x === null ? "n/a" : `${(x * 100).toFixed(1)}%`);

export function report(title: string, note: string, s: Score): string {
  const { tp, fp, fn, tn } = s.confusion;
  const lines = [
    title,
    note,
    "",
    `Precision ${pct(s.precision)}   Recall ${pct(s.recall)}   F1 ${pct(s.f1)}`,
    `Verdict accuracy ${pct(s.verdict_accuracy)}   Cited-clause match ${pct(s.basis_accuracy)}`,
    "",
    "Confusion matrix      predicted +   predicted -",
    `  labeled +           ${String(tp).padStart(11)}   ${String(fn).padStart(11)}`,
    `  labeled -           ${String(fp).padStart(11)}   ${String(tn).padStart(11)}`,
    "",
    "By category (verdict and clause both correct)",
    ...Object.entries(s.by_category)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([cat, c]) => `  ${cat.padEnd(22)} ${c.correct}/${c.n}`),
    "",
    `Sample-data totals: ${formatUsd(s.sample_owed_cents)} owed now, ${formatUsd(s.sample_alert_cents)} at stake in live alerts.`,
  ];
  const misses = s.rows.filter((r) => !r.verdict_match || !r.basis_match);
  if (misses.length > 0) {
    lines.push("", "Mismatches:");
    for (const m of misses) {
      lines.push(`  ${m.trip_id} ${m.title}: expected ${m.expected.verdict} ${m.expected.basis ?? "-"}, got ${m.got.verdict} ${m.got.basis ?? "-"}`);
    }
  }
  return lines.join("\n");
}
