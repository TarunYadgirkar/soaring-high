import { evalResults, type EvalSummary } from "@/lib/store/claims";

const pct = (x: number | null) => (x === null ? "n/a" : `${(x * 100).toFixed(1)}%`);
const CATEGORY: Record<string, string> = {
  already_refunded: "Already refunded",
  cancelled: "Cancelled",
  coverage: "Outside the US",
  credit: "Credits",
  flew_or_accepted: "Flew or accepted",
  live_alert: "Live alerts",
  missing_data: "Missing flight data",
  near_miss_threshold: "Near misses",
  on_time: "On time",
  renumbered: "Renumbered",
  significant_change: "Significant changes",
  ticket_agent: "Booking sites",
  voluntary: "Traveler's own change",
};

export default function EvalPage() {
  const { gold, e2e } = evalResults();
  if (!gold) {
    return <p className="text-ink-soft">No eval results yet. Run <code>pnpm eval</code> in app/.</p>;
  }
  return (
    <div className="space-y-10">
      <section className="max-w-[68ch] space-y-3">
        <h1 className="text-2xl font-semibold">How often the rules engine gets it right</h1>
        <p className="leading-relaxed text-ink-soft">
          {gold.trips} seeded trips, each labeled from the regulation text before the engine was written and checked by a second reviewer who never saw the
          engine. These are test cases we wrote, including near misses, so the numbers show the engine matches the rule as we read it. They are not a
          measurement on real company travel.
        </p>
      </section>
      <Result title="Rules engine on the seeded trip records" s={gold} />
      {e2e.map((s) => (
        <Result key={s.facts} title={`End to end: Claude reads the emails, then the engine decides (${s.facts})`} s={s} />
      ))}
      {e2e.length === 0 && (
        <p className="max-w-[68ch] text-sm text-ink-soft">
          End-to-end results appear here after <code>pnpm extract</code> and <code>pnpm eval:e2e</code> run with an Anthropic API key.
        </p>
      )}
    </div>
  );
}

function Result({ title, s }: { title: string; s: EvalSummary }) {
  const { tp, fp, fn, tn } = s.confusion;
  return (
    <section className="space-y-5">
      <h2 className="text-lg font-semibold">{title}</h2>
      <dl className="flex flex-wrap gap-x-12 gap-y-4">
        {[
          ["Precision", pct(s.precision), "of flagged trips were really owed"],
          ["Recall", pct(s.recall), "of owed trips were flagged"],
          ["Cited the right clause", pct(s.basis_accuracy), "of all trips"],
        ].map(([label, value, hint]) => (
          <div key={label}>
            <dt className="text-sm text-ink-soft">{label}</dt>
            <dd className="font-sign text-4xl font-semibold">{value}</dd>
            <dd className="text-xs text-ink-soft">{hint}</dd>
          </div>
        ))}
      </dl>
      <div className="flex flex-wrap gap-12">
        <table className="text-sm">
          <caption className="pb-2 text-left text-ink-soft">Trips by label and prediction</caption>
          <thead>
            <tr className="text-ink-soft">
              <th />
              <th className="px-4 py-1 font-medium">Flagged</th>
              <th className="px-4 py-1 font-medium">Not flagged</th>
            </tr>
          </thead>
          <tbody className="font-sign text-2xl">
            <tr>
              <th className="pr-4 text-left font-sans text-sm font-medium text-ink-soft">Owed</th>
              <td className="bg-owed-soft px-4 py-2 text-center">{tp}</td>
              <td className="px-4 py-2 text-center ring-1 ring-grid">{fn}</td>
            </tr>
            <tr>
              <th className="pr-4 text-left font-sans text-sm font-medium text-ink-soft">Not owed</th>
              <td className="px-4 py-2 text-center ring-1 ring-grid">{fp}</td>
              <td className="px-4 py-2 text-center">{tn}</td>
            </tr>
          </tbody>
        </table>
        <table className="text-sm">
          <caption className="pb-2 text-left text-ink-soft">Correct by case type</caption>
          <tbody>
            {Object.entries(s.by_category)
              .sort(([a], [b]) => (CATEGORY[a] ?? a).localeCompare(CATEGORY[b] ?? b))
              .map(([cat, c]) => (
                <tr key={cat} className="border-t border-grid">
                  <td className="py-1.5 pr-8">{CATEGORY[cat] ?? cat}</td>
                  <td className="py-1.5 text-right tabular-nums">
                    {c.correct}/{c.n}
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
