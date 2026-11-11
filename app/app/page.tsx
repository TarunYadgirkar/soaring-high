import Link from "next/link";
import { claims, type Claim } from "@/lib/store/claims";
import { ruleLabel, shortDate, stageLabel, stageTone, toneClass, usd, whatHappened } from "./_components/format";

const VIEWS = {
  action: { label: "Needs approval", test: (c: Claim) => c.actions.some((a) => a.allowed) },
  live: { label: "Live disruptions", test: (c: Claim) => c.decision.verdict === "hold_credit_alert" },
  progress: {
    label: "In progress",
    test: (c: Claim) => ["refund_pending", "refund_overdue", "refund_refused", "dot_filed", "dispute_ready", "alerted", "recovered"].includes(c.stage),
  },
  ramp: { label: "Ramp sandbox", test: (c: Claim) => c.trip.source === "ramp_sandbox" },
  all: { label: "All trips", test: () => true },
} as const;
type View = keyof typeof VIEWS;

export default async function ClaimsPage({ searchParams }: PageProps<"/">) {
  const { view: raw } = await searchParams;
  const view: View = typeof raw === "string" && raw in VIEWS ? (raw as View) : "action";
  const all = claims();
  const owed = all.filter((c) => c.decision.verdict === "refund_owed" && c.stage !== "recovered");
  const live = all.filter((c) => c.decision.verdict === "hold_credit_alert");
  const sum = (list: Claim[]) => list.reduce((s, c) => s + (c.decision.amount_cents ?? 0), 0);
  const rows = all.filter(VIEWS[view].test).sort((a, b) => (b.decision.amount_cents ?? 0) - (a.decision.amount_cents ?? 0));

  return (
    <div className="space-y-6">
      <section className="flex flex-wrap items-end gap-x-12 gap-y-4">
        <h1 className="max-w-xl text-2xl font-semibold leading-snug">
          {owed.length} {owed.length === 1 ? "trip owes" : "trips owe"} a cash refund to the company card. {live.length}{" "}
          {live.length === 1 ? "disruption is" : "disruptions are"} live right now.
        </h1>
        <dl className="flex gap-10">
          <div>
            <dt className="text-sm text-ink-soft">Owed now</dt>
            <dd className="font-sign text-4xl font-semibold tracking-tight tabular-nums">{usd(sum(owed))}</dd>
          </div>
          <div>
            <dt className="text-sm text-ink-soft">At stake in live alerts</dt>
            <dd className="font-sign text-4xl font-semibold tracking-tight tabular-nums">{usd(sum(live))}</dd>
          </div>
        </dl>
      </section>

      <nav aria-label="Filter claims" className="flex flex-wrap gap-1">
        {(Object.keys(VIEWS) as View[]).map((v) => (
          <Link
            key={v}
            href={v === "action" ? "/" : `/?view=${v}`}
            aria-current={v === view ? "page" : undefined}
            className={`rounded-md px-3 py-1.5 text-sm ${v === view ? "bg-ink text-white" : "text-ink-soft hover:text-ink"}`}
          >
            {VIEWS[v].label} <span className="opacity-70">{all.filter(VIEWS[v].test).length}</span>
          </Link>
        ))}
      </nav>

      {rows.length === 0 ? (
        <p className="py-16 text-center text-ink-soft">
          Nothing here. <Link href="/?view=all" className="underline">See all trips</Link>.
        </p>
      ) : (
        <table className="w-full border-collapse">
          <caption className="sr-only">{VIEWS[view].label}</caption>
          <thead className="border-b border-grid text-left text-xs text-ink-soft">
            <tr>
              <th className="px-4 pb-2 font-medium">Route</th>
              <th className="hidden px-4 font-medium md:table-cell">Traveler</th>
              <th className="hidden px-4 font-medium lg:table-cell">What happened</th>
              <th className="hidden px-4 font-medium sm:table-cell">Rule</th>
              <th className="px-4 text-right font-medium">Amount</th>
              <th className="px-4 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((c) => (
              <BoardRow key={c.trip.id} c={c} />
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

function BoardRow({ c }: { c: Claim }) {
  const segs = c.trip.facts.original;
  const first = segs[0];
  const last = segs[segs.length - 1];
  const href = `/claims/${c.trip.id}`;
  const isOwed = c.decision.verdict === "refund_owed" || c.decision.verdict === "hold_credit_alert";
  return (
    <tr className="border-b border-grid hover:bg-paper">
      <td className="px-4 py-3">
        <Link href={href} className="block focus-visible:outline-offset-4">
          <span className="text-base font-semibold">
            {first.origin} <span aria-hidden className="text-ink-soft">›</span>
            <span className="sr-only">to</span> {last.destination}
          </span>
          <span className="block font-mono text-xs text-ink-soft">
            {first.flight_number}, {shortDate(first.departure)}
          </span>
        </Link>
      </td>
      <td className="hidden px-4 py-3 text-sm md:table-cell">
        {c.trip.traveler}
        {c.trip.source === "ramp_sandbox" && <span className="block text-xs text-ink-soft">From Ramp sandbox</span>}
      </td>
      <td className="hidden max-w-xs px-4 py-3 text-sm lg:table-cell">{whatHappened(c.decision)}</td>
      <td className="hidden px-4 py-3 text-sm sm:table-cell">{ruleLabel(c.decision.basis)}</td>
      <td className="px-4 py-3 text-right">
        <span className={`text-base font-semibold tabular-nums ${isOwed ? "rounded bg-owed-soft px-1.5" : "text-ink-soft"}`}>
          {isOwed ? usd(c.decision.amount_cents) : "none"}
        </span>
      </td>
      <td className="px-4 py-3">
        <span className={`inline-block whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium ${toneClass[stageTone(c.stage)]}`}>
          {stageLabel(c.stage, c.decision.verdict)}
        </span>
      </td>
    </tr>
  );
}
