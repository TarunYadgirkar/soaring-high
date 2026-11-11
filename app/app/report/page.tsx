import Link from "next/link";
import { creditRows, payeeRows, type PayeeRow } from "@/lib/report/report";
import { claims } from "@/lib/store/claims";
import type { TriggerKind } from "@/lib/types";
import { shortDate, usd } from "../_components/format";

const CAUSE: Record<TriggerKind, string> = {
  cancelled: "Cancellations",
  arrive_late: "Late arrivals",
  depart_early: "Early departures",
  airport_change: "Airport changes",
  more_connections: "Added connections",
  downgrade: "Downgrades",
};

export default function ReportPage() {
  const all = claims();
  const payees = payeeRows(all);
  const credits = creditRows(all);
  const totalOwed = payees.reduce((s, p) => s + p.owedCents, 0);
  const totalLive = payees.reduce((s, p) => s + p.liveCents, 0);
  const totalCredits = credits.reduce((s, c) => s + c.amountCents, 0);
  const largest = Math.max(1, ...payees.map((p) => p.owedCents + p.liveCents));

  return (
    <div className="space-y-12">
      <section className="flex flex-wrap items-end gap-x-12 gap-y-4">
        <h1 className="max-w-xl text-2xl font-semibold leading-snug">
          {payees.filter((p) => p.owedCents > 0).length} airlines and booking sites owe the company {usd(totalOwed)}.
        </h1>
        <dl className="flex flex-wrap gap-10">
          <Stat label="Owed now" value={usd(totalOwed)} />
          <Stat label="At stake in live alerts" value={usd(totalLive)} />
          <Stat label="Already lost to credits" value={usd(totalCredits)} />
        </dl>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Who owes what</h2>
        <div className="overflow-x-auto">
          <table className="w-full border-separate border-spacing-y-2">
            <thead className="text-left text-xs text-ink-soft">
              <tr>
                <th className="px-4 font-medium">Payee</th>
                <th className="w-2/5 px-4 font-medium">Share of open money</th>
                <th className="px-4 text-right font-medium">Owed</th>
                <th className="px-4 text-right font-medium">Live</th>
                <th className="hidden px-4 font-medium md:table-cell">Most common cause</th>
                <th className="px-4 font-medium">Past deadline</th>
              </tr>
            </thead>
            <tbody>
              {payees.map((p) => (
                <PayeeLine key={p.name} p={p} largest={largest} />
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-3">
        <div className="max-w-[68ch] space-y-2">
          <h2 className="text-lg font-semibold">Credits travelers already accepted</h2>
          <p className="text-sm leading-relaxed text-ink-soft">
            Once a traveler accepts the airline&apos;s credit, the refund rule stops applying. The company paid for these {credits.length} tickets, and the
            credit now sits in each traveler&apos;s own airline account. Finance can ask the traveler to use it on their next work trip.
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full border-separate border-spacing-y-2">
            <thead className="text-left text-xs text-ink-soft">
              <tr>
                <th className="px-4 font-medium">Traveler</th>
                <th className="px-4 font-medium">Bought from</th>
                <th className="px-4 font-medium">Trip</th>
                <th className="px-4 text-right font-medium">Ticket paid by company</th>
              </tr>
            </thead>
            <tbody>
              {credits.map((c) => (
                <tr key={c.tripId} className="bg-card shadow-[0_1px_0_var(--grid)]">
                  <td className="rounded-l-md px-4 py-3 text-sm">{c.traveler}</td>
                  <td className="px-4 py-3 text-sm">{c.airline}</td>
                  <td className="px-4 py-3 text-sm">
                    <Link href={`/claims/${c.tripId}`} className="underline hover:text-ink">
                      {c.route}, {shortDate(c.date)}
                    </Link>
                  </td>
                  <td className="rounded-r-md px-4 py-3 text-right font-sign text-xl font-semibold tabular-nums">{usd(c.amountCents)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-sm text-ink-soft">{label}</dt>
      <dd className="font-sign text-4xl font-semibold tabular-nums">{value}</dd>
    </div>
  );
}

function PayeeLine({ p, largest }: { p: PayeeRow; largest: number }) {
  const pct = (cents: number) => `${(cents / largest) * 100}%`;
  return (
    <tr className="bg-card shadow-[0_1px_0_var(--grid)]">
      <td className="rounded-l-md px-4 py-3">
        <span className="font-semibold">{p.name}</span>
        <span className="block text-xs text-ink-soft">
          {p.kind === "ticket_agent" ? "Booking site" : "Airline"}, {p.owedTrips + p.liveTrips} {p.owedTrips + p.liveTrips === 1 ? "trip" : "trips"}
        </span>
      </td>
      <td className="px-4 py-3">
        <div className="flex h-3 overflow-hidden rounded-sm bg-paper" role="img" aria-label={`${usd(p.owedCents)} owed, ${usd(p.liveCents)} in live alerts`}>
          <div className="bg-owed" style={{ width: pct(p.owedCents) }} />
          <div className="bg-ink" style={{ width: pct(p.liveCents) }} />
        </div>
      </td>
      <td className="px-4 py-3 text-right font-sign text-xl font-semibold tabular-nums">{usd(p.owedCents)}</td>
      <td className="px-4 py-3 text-right font-sign text-xl tabular-nums text-ink-soft">{p.liveCents ? usd(p.liveCents) : "none"}</td>
      <td className="hidden px-4 py-3 text-sm md:table-cell">{p.topCause ? CAUSE[p.topCause] : "None recorded"}</td>
      <td className="rounded-r-md px-4 py-3 text-sm">
        {p.overdueTrips > 0 ? (
          <span className="inline-block whitespace-nowrap rounded-full bg-white px-2.5 py-1 text-xs font-medium text-stamp ring-1 ring-stamp">
            {p.overdueTrips} overdue
          </span>
        ) : (
          <span className="text-ink-soft">None</span>
        )}
      </td>
    </tr>
  );
}
