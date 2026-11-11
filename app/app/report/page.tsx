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
  const totalCredits = credits.reduce((s, c) => s + c.amountCents, 0);
  const owing = payees.filter((p) => p.owedCents > 0).length;
  const largest = Math.max(1, ...payees.map((p) => p.owedCents + p.liveCents));

  return (
    <div className="space-y-20">
      <section className="flex flex-wrap items-end justify-between gap-x-16 gap-y-8">
        <h1>
          <span className="figure block text-7xl text-owed sm:text-8xl">{usd(totalOwed)}</span>
          <span className="mt-4 block text-ink-soft">owed by {owing} airlines and booking sites</span>
        </h1>
        <p className="text-right">
          <span className="figure block text-4xl text-stamp">{usd(totalCredits)}</span>
          <span className="mt-2 block text-sm text-ink-soft">already lost to accepted credits</span>
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-sm text-ink-soft">Who owes what</h2>
        <table className="w-full border-collapse">
          <thead className="sr-only">
            <tr>
              <th>Payee</th>
              <th>Share of open money</th>
              <th>Owed</th>
              <th>Most common cause</th>
              <th>Past deadline</th>
            </tr>
          </thead>
          <tbody>
            {payees.map((p) => (
              <PayeeLine key={p.name} p={p} largest={largest} />
            ))}
          </tbody>
        </table>
        <p className="flex gap-6 font-mono text-xs text-ink-soft">
          <span className="before:mr-2 before:inline-block before:h-2 before:w-2 before:bg-owed before:content-['']">owed now</span>
          <span className="before:mr-2 before:inline-block before:h-2 before:w-2 before:bg-ink before:content-['']">live alert</span>
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-sm text-ink-soft">Credits travelers already accepted</h2>
        <p className="max-w-xl font-sign text-2xl leading-snug">The refund rule no longer applies to these. The cash sits in each traveler&apos;s own airline account.</p>
        <table className="w-full border-collapse">
          <thead className="sr-only">
            <tr>
              <th>Traveler</th>
              <th>Trip</th>
              <th>Ticket paid by company</th>
            </tr>
          </thead>
          <tbody>
            {credits.map((c) => (
              <tr key={c.tripId} className="border-t border-grid align-baseline">
                <td className="py-4 pr-6">
                  {c.traveler}
                  <span className="mt-1 block font-mono text-xs text-ink-soft">{c.airline}</span>
                </td>
                <td className="py-4 pr-6 text-sm">
                  <Link href={`/claims/${c.tripId}`} className="underline decoration-grid underline-offset-4 hover:decoration-ink">
                    {c.route}, {shortDate(c.date)}
                  </Link>
                </td>
                <td className="figure py-4 text-right text-2xl text-stamp">{usd(c.amountCents)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}

function PayeeLine({ p, largest }: { p: PayeeRow; largest: number }) {
  const pct = (cents: number) => `${(cents / largest) * 100}%`;
  const trips = p.owedTrips + p.liveTrips;
  return (
    <tr className="border-t border-grid align-baseline">
      <td className="w-56 py-4 pr-6">
        {p.name}
        <span className="mt-1 block font-mono text-xs text-ink-soft">
          {trips} {trips === 1 ? "trip" : "trips"} · {p.topCause ? CAUSE[p.topCause].toLowerCase() : "no cause recorded"}
        </span>
      </td>
      <td className="py-4 pr-6 align-middle">
        <div className="flex h-2" role="img" aria-label={`${usd(p.owedCents)} owed, ${usd(p.liveCents)} in live alerts`}>
          <div className="bg-owed" style={{ width: pct(p.owedCents) }} />
          <div className="bg-ink" style={{ width: pct(p.liveCents) }} />
        </div>
      </td>
      <td className="figure w-40 py-4 text-right text-2xl">{usd(p.owedCents + p.liveCents)}</td>
      <td className="w-32 py-4 pl-8 text-sm">{p.overdueTrips > 0 && <span className="whitespace-nowrap text-stamp">{p.overdueTrips} overdue</span>}</td>
    </tr>
  );
}
