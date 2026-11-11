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
    <div className="space-y-20">
      <section>
        <h1>
          <span className="figure block text-7xl sm:text-8xl">{pct(gold.precision)}</span>
          <span className="mt-4 block text-ink-soft">precision on {gold.trips} labeled trips, near misses included</span>
        </h1>
        <p className="mt-6 max-w-xl text-sm text-ink-soft">We wrote and labeled these trips ourselves. A second reviewer re-labeled them without seeing the engine.</p>
      </section>
      <Result title="Rules engine on the seeded records" s={gold} />
      {e2e.map((s) => (
        <Result key={s.facts} title={`End to end: Claude reads the emails, then the engine decides (${s.facts})`} s={s} />
      ))}
      {e2e.length === 0 && (
        <p className="text-sm text-ink-soft">
          End-to-end results appear after <code>pnpm extract</code> and <code>pnpm eval:e2e</code>.
        </p>
      )}
    </div>
  );
}

function Result({ title, s }: { title: string; s: EvalSummary }) {
  const { tp, fp, fn, tn } = s.confusion;
  const stats = [
    ["Precision", pct(s.precision)],
    ["Recall", pct(s.recall)],
    ["Right clause cited", pct(s.basis_accuracy)],
  ];
  return (
    <section className="space-y-8 border-t border-grid pt-8">
      <h2 className="text-sm text-ink-soft">{title}</h2>
      <dl className="flex flex-wrap gap-x-16 gap-y-6">
        {stats.map(([label, value]) => (
          <div key={label}>
            <dd className="figure text-5xl">{value}</dd>
            <dt className="mt-2 text-sm text-ink-soft">{label}</dt>
          </div>
        ))}
      </dl>
      <div className="flex flex-wrap gap-x-20 gap-y-10">
        <table className="text-sm">
          <caption className="pb-3 text-left text-ink-soft">Label against prediction</caption>
          <thead>
            <tr className="meta">
              <th />
              <th className="px-5 py-1 font-normal">flagged</th>
              <th className="px-5 py-1 font-normal">not flagged</th>
            </tr>
          </thead>
          <tbody className="figure text-3xl">
            <tr>
              <th className="meta pr-4 text-left font-normal">owed</th>
              <td className="bg-owed-soft px-5 py-3 text-center text-owed">{tp}</td>
              <td className="px-5 py-3 text-center text-ink-soft">{fn}</td>
            </tr>
            <tr>
              <th className="meta pr-4 text-left font-normal">not owed</th>
              <td className="px-5 py-3 text-center text-ink-soft">{fp}</td>
              <td className="bg-card px-5 py-3 text-center">{tn}</td>
            </tr>
          </tbody>
        </table>
        <table className="text-sm">
          <caption className="pb-3 text-left text-ink-soft">Correct by case type</caption>
          <tbody>
            {Object.entries(s.by_category)
              .sort(([a], [b]) => (CATEGORY[a] ?? a).localeCompare(CATEGORY[b] ?? b))
              .map(([cat, c]) => (
                <tr key={cat} className="border-t border-grid">
                  <td className="py-1.5 pr-10">{CATEGORY[cat] ?? cat}</td>
                  <td className={`py-1.5 text-right tabular-nums ${c.correct === c.n ? "text-ink-soft" : "text-stamp"}`}>
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
