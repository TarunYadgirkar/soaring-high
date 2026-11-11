import Link from "next/link";
import { claims, type Claim } from "@/lib/store/claims";
import { ruleLabel, shortDate, stageLabel, stageTone, toneClass, usd, whatHappened } from "./_components/format";

const VIEWS = {
  action: { label: "To approve", test: (c: Claim) => c.actions.some((a) => a.allowed) },
  live: { label: "Live", test: (c: Claim) => c.decision.verdict === "hold_credit_alert" },
  progress: {
    label: "In progress",
    test: (c: Claim) => ["refund_pending", "refund_overdue", "refund_refused", "dot_filed", "dispute_ready", "alerted", "recovered"].includes(c.stage),
  },
  ramp: { label: "Ramp sandbox", test: (c: Claim) => c.trip.source === "ramp_sandbox" },
  all: { label: "All", test: () => true },
} as const;
type View = keyof typeof VIEWS;

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

export default async function ClaimsPage({ searchParams }: PageProps<"/">) {
  const { view: raw } = await searchParams;
  const view: View = typeof raw === "string" && raw in VIEWS ? (raw as View) : "action";
  const all = claims();
  const owed = all.filter((c) => c.decision.verdict === "refund_owed" && c.stage !== "recovered");
  const live = all.filter((c) => c.decision.verdict === "hold_credit_alert");
  const sum = (list: Claim[]) => list.reduce((s, c) => s + (c.decision.amount_cents ?? 0), 0);
  const rows = all.filter(VIEWS[view].test).sort((a, b) => (b.decision.amount_cents ?? 0) - (a.decision.amount_cents ?? 0));

  return (
    <div className="space-y-16">
      <section className="flex flex-wrap items-end justify-between gap-x-16 gap-y-8">
        <h1>
          <span className="figure block text-7xl text-owed sm:text-8xl">{usd(sum(owed))}</span>
          <span className="mt-4 block text-ink-soft">owed to company cards on {plural(owed.length, "trip", "trips")}</span>
        </h1>
        <p className="text-right">
          <span className="figure block text-4xl">{usd(sum(live))}</span>
          <span className="mt-2 block text-sm text-ink-soft">at stake in {plural(live.length, "live alert", "live alerts")}</span>
        </p>
      </section>

      <section className="space-y-4">
        <nav aria-label="Filter claims" className="flex flex-wrap gap-x-7 gap-y-2 text-sm">
          {(Object.keys(VIEWS) as View[]).map((v) => (
            <Link
              key={v}
              href={v === "action" ? "/" : `/?view=${v}`}
              aria-current={v === view ? "page" : undefined}
              className={v === view ? "text-ink underline decoration-owed decoration-2 underline-offset-8" : "text-ink-soft hover:text-ink"}
            >
              {VIEWS[v].label} <span className="font-mono text-xs text-ink-soft">{all.filter(VIEWS[v].test).length}</span>
            </Link>
          ))}
        </nav>

        {rows.length === 0 ? (
          <p className="py-16 text-ink-soft">
            Nothing here. <Link href="/?view=all" className="underline hover:text-ink">See all trips</Link>.
          </p>
        ) : (
          <table className="w-full border-collapse">
            <caption className="sr-only">{VIEWS[view].label}</caption>
            <thead className="sr-only">
              <tr>
                <th>Route</th>
                <th>What happened</th>
                <th>Amount</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((c) => (
                <BoardRow key={c.trip.id} c={c} />
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}

function BoardRow({ c }: { c: Claim }) {
  const segs = c.trip.facts.original;
  const first = segs[0];
  const last = segs[segs.length - 1];
  const isOwed = c.decision.verdict === "refund_owed" || c.decision.verdict === "hold_credit_alert";
  return (
    <tr className="border-t border-grid align-baseline hover:bg-card">
      <td className="py-4 pr-6">
        <Link href={`/claims/${c.trip.id}`} className="block">
          <span className="font-sign text-2xl">
            {first.origin} <span aria-hidden className="text-ink-soft">→</span>
            <span className="sr-only">to</span> {last.destination}
          </span>
          <span className="mt-1 block font-mono text-xs text-ink-soft">
            {first.flight_number} · {shortDate(first.departure)} · {c.trip.traveler}
          </span>
        </Link>
      </td>
      <td className="hidden max-w-sm py-4 pr-6 text-sm md:table-cell">
        {whatHappened(c.decision)}
        <span className="mt-1 block font-mono text-xs text-ink-soft">{ruleLabel(c.decision.basis)}</span>
      </td>
      <td className={`figure py-4 pr-8 text-right text-2xl ${isOwed ? "text-owed" : "text-ink-soft"}`}>{isOwed ? usd(c.decision.amount_cents) : "none"}</td>
      <td className="w-44 py-4 text-sm">
        <span className={`whitespace-nowrap ${toneClass[stageTone(c.stage)]}`}>{stageLabel(c.stage, c.decision.verdict)}</span>
      </td>
    </tr>
  );
}
