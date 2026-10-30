import Link from "next/link";
import { notFound } from "next/navigation";
import { approve, recordReply } from "@/app/actions";
import { airport } from "@/lib/airports";
import { disputeEvidence, dotComplaint, refundRequest, travelerAlert, type Draft } from "@/lib/escalation/drafts";
import type { Action, ActionKind, ClaimEvent } from "@/lib/escalation/escalation";
import { requestDueBy } from "@/lib/escalation/escalation";
import { claim, type Claim } from "@/lib/store/claims";
import type { Citation, Proof } from "@/lib/types";
import { ruleLabel, shortDate, stageLabel, stageTone, toneClass, usd } from "../../_components/format";

const time = (iso: string, code: string) =>
  new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: airport(code).tz });

export default async function ClaimPage({ params }: PageProps<"/claims/[id]">) {
  const { id } = await params;
  const c = claim(id);
  if (!c) notFound();
  return (
    <div className="space-y-10">
      <Link href="/" className="text-sm text-ink-soft hover:text-ink">
        Back to claims
      </Link>
      <BoardingPass c={c} />
      <div className="grid gap-10 lg:grid-cols-[1fr_380px]">
        <div className="space-y-10">
          <Why c={c} />
          <Evidence proof={c.decision.proof} />
          {c.trip.join_reasons && (
            <section className="space-y-2">
              <h2 className="text-lg font-semibold">How this trip was joined</h2>
              <p className="max-w-[68ch] text-sm text-ink-soft">
                Ramp&apos;s sandbox charges carry no trip link, so the booking was matched to the card charge by airline, date and memo.
              </p>
              <ul className="list-disc space-y-1 pl-5 text-sm">
                {c.trip.join_reasons.map((r) => (
                  <li key={r}>{r}</li>
                ))}
              </ul>
            </section>
          )}
        </div>
        <Escalation c={c} />
      </div>
    </div>
  );
}

function BoardingPass({ c }: { c: Claim }) {
  const segs = c.trip.facts.original;
  const first = segs[0];
  const last = segs[segs.length - 1];
  const d = c.decision;
  const isOwed = d.verdict === "refund_owed" || d.verdict === "hold_credit_alert";
  return (
    <section aria-label="Trip" className="flex flex-col overflow-hidden rounded-xl bg-card shadow-[0_1px_0_var(--grid),0_12px_32px_-20px_rgba(19,35,63,0.35)] md:flex-row">
      <div className="flex-1 space-y-5 p-6 md:p-8">
        <div className="flex items-center justify-between gap-4 text-sm text-ink-soft">
          <span>
            {c.trip.traveler}, {c.trip.source === "ramp_sandbox" ? `Ramp sandbox booking ${c.trip.facts.record_locator.slice(0, 8)}` : `confirmation ${c.trip.facts.record_locator}`}
          </span>
          <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${toneClass[stageTone(c.stage)]}`}>{stageLabel(c.stage, d.verdict)}</span>
        </div>
        <div className="flex items-end gap-6">
          <div>
            <p className="font-sign text-7xl font-bold leading-none tracking-wide">{first.origin}</p>
            <p className="mt-1 text-sm text-ink-soft">
              {airport(first.origin).city}, {time(first.departure, first.origin)}
            </p>
          </div>
          <svg aria-hidden viewBox="0 0 24 24" className="mb-7 h-7 w-7 shrink-0 fill-ink-soft">
            <path d="M21 16v-2l-8-5V3.5a1.5 1.5 0 0 0-3 0V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5z" transform="rotate(90 12 12)" />
          </svg>
          <div>
            <p className="font-sign text-7xl font-bold leading-none tracking-wide">{last.destination}</p>
            <p className="mt-1 text-sm text-ink-soft">
              {airport(last.destination).city}, {time(last.arrival, last.destination)}
            </p>
          </div>
        </div>
        <dl className="grid grid-cols-3 gap-4 border-t border-dashed border-grid pt-4 text-sm">
          <div>
            <dt className="text-ink-soft">Flight</dt>
            <dd className="font-sign text-xl font-semibold">{segs.map((s) => s.flight_number).join(", ")}</dd>
          </div>
          <div>
            <dt className="text-ink-soft">Date</dt>
            <dd className="font-sign text-xl font-semibold">{shortDate(first.departure)}</dd>
          </div>
          <div>
            <dt className="text-ink-soft">Cabin</dt>
            <dd className="font-sign text-xl font-semibold capitalize">{first.cabin.replace("_", " ")}</dd>
          </div>
        </dl>
      </div>
      <div aria-hidden className="perforation hidden w-6 bg-card md:block" />
      <div className={`stub-in flex flex-col justify-between gap-4 p-6 md:w-72 md:p-8 ${isOwed ? "bg-owed" : "bg-paper"}`}>
        <div>
          <p className="text-sm">{d.verdict === "hold_credit_alert" ? "Refundable if the traveler declines" : isOwed ? `Owed to the card by ${d.payee?.name}` : "Refund"}</p>
          <p className="font-sign text-5xl font-bold">{isOwed ? usd(d.amount_cents) : d.verdict === "needs_info" ? "Not proven yet" : "Not owed"}</p>
        </div>
        <div className="text-sm">
          <p>{ruleLabel(d.basis)}</p>
          {d.refund_due_by && <p>Due by {shortDate(d.refund_due_by)}{d.overdue ? ", overdue" : ""}</p>}
          {d.payee?.kind === "ticket_agent" && <p>Seller refunds on request</p>}
        </div>
      </div>
    </section>
  );
}

function Quote({ cite }: { cite: Citation }) {
  return (
    <figure className="max-w-[68ch] border-l-2 border-ink pl-4">
      <blockquote className="font-law text-[1.05rem] leading-relaxed">“{cite.excerpt}”</blockquote>
      <figcaption className="mt-1 text-sm text-ink-soft">
        <a href={cite.url} target="_blank" rel="noopener noreferrer" className="underline hover:text-ink">
          {cite.label}
        </a>
      </figcaption>
    </figure>
  );
}

function Why({ c }: { c: Claim }) {
  const d = c.decision;
  const basis = d.citations.find((x) => x.clause === d.basis);
  const others = d.citations.filter((x) => x.clause !== d.basis);
  return (
    <section className="space-y-4">
      <h2 className="text-lg font-semibold">Why</h2>
      <p className="max-w-[68ch] leading-relaxed">{d.reason}</p>
      {d.triggers.length > 0 && (
        <ul className="max-w-[68ch] list-disc space-y-1 pl-5 text-sm text-ink-soft">
          {d.triggers.map((t) => (
            <li key={t.kind}>{t.detail}</li>
          ))}
        </ul>
      )}
      {basis && <Quote cite={basis} />}
      {others.length > 0 && (
        <details className="max-w-[68ch] text-sm">
          <summary className="cursor-pointer text-ink-soft hover:text-ink">Other rules cited ({others.length})</summary>
          <div className="mt-4 space-y-4">
            {others.map((cite) => (
              <Quote key={cite.clause} cite={cite} />
            ))}
          </div>
        </details>
      )}
    </section>
  );
}

const SOURCE_LABEL: Record<Proof["source"], string> = {
  card: "Ramp card",
  email: "Airline email",
  flight_status: "Flight status",
  traveler: "Traveler",
};

function Evidence({ proof }: { proof: Proof[] }) {
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold">Evidence</h2>
      <table className="w-full text-sm">
        <thead className="text-left text-xs text-ink-soft">
          <tr>
            <th className="py-2 pr-4 font-medium">Source</th>
            <th className="py-2 pr-4 font-medium">Record</th>
            <th className="py-2 font-medium">Shows</th>
          </tr>
        </thead>
        <tbody>
          {proof.map((p) => (
            <tr key={`${p.ref}-${p.field}`} className="border-t border-grid align-top">
              <td className="py-2.5 pr-4 font-medium whitespace-nowrap">{SOURCE_LABEL[p.source]}</td>
              <td className="py-2.5 pr-4 text-ink-soft">
                {p.field} = <span className="text-ink">{p.value}</span>
                <span className="block text-xs">{p.ref}</span>
              </td>
              <td className="py-2.5">{p.note}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

const STEP_TITLE: Record<ActionKind, string> = {
  alert_traveler: "Alert the traveler",
  request_refund: "Request the refund",
  file_dot_complaint: "File a DOT complaint",
  open_dispute: "Open a card dispute",
};

const STEP_BUTTON: Record<ActionKind, string> = {
  alert_traveler: "Approve and send alert",
  request_refund: "Approve and send request",
  file_dot_complaint: "Approve and file complaint",
  open_dispute: "Approve and open dispute",
};

function draftFor(c: Claim, kind: ActionKind): Draft {
  const requested = [...c.events].reverse().find((e) => e.type === "refund_requested");
  const refused = c.events.some((e) => e.type === "refund_refused");
  const filed = [...c.events].reverse().find((e) => e.type === "dot_complaint_filed");
  const due = requestDueBy(c.events);
  switch (kind) {
    case "alert_traveler":
      return travelerAlert(c.trip, c.decision);
    case "request_refund":
      return refundRequest(c.trip, c.decision);
    case "file_dot_complaint":
      return dotComplaint(c.trip, c.decision, requested?.at ?? c.decision.refund_due_by ?? "", refused ? "The payee refused." : `No refund by ${due}.`);
    case "open_dispute":
      return disputeEvidence(c.trip, c.decision, requested?.at ?? "", filed?.at ?? "");
  }
}

function Escalation({ c }: { c: Claim }) {
  const steps: Action[] =
    c.decision.verdict === "hold_credit_alert"
      ? c.actions.filter((a) => a.kind === "alert_traveler")
      : c.decision.verdict === "refund_owed"
        ? c.actions.filter((a) => a.kind !== "alert_traveler")
        : [];
  const done = new Set(c.events.map((e) => e.type));
  const doneFor: Record<ActionKind, ClaimEvent["type"]> = {
    alert_traveler: "traveler_alerted",
    request_refund: "refund_requested",
    file_dot_complaint: "dot_complaint_filed",
    open_dispute: "dispute_opened",
  };
  const canRecordReply = ["refund_pending", "refund_overdue", "dot_filed", "disputed"].includes(c.stage);

  if (steps.length === 0) {
    return (
      <aside className="space-y-3 lg:border-l lg:border-grid lg:pl-8">
        <h2 className="text-lg font-semibold">Next step</h2>
        <p className="text-sm text-ink-soft">
          {c.decision.verdict === "needs_info"
            ? "Find an independent flight-status record before claiming anything."
            : "Nothing to recover on this trip."}
        </p>
      </aside>
    );
  }

  return (
    <aside className="space-y-5 lg:border-l lg:border-grid lg:pl-8">
      <h2 className="text-lg font-semibold">{steps.length > 1 ? "Getting the cash back" : "Before the traveler decides"}</h2>
      <ol className="space-y-5">
        {steps.map((a, i) => {
          const isDone = done.has(doneFor[a.kind]);
          const draft = draftFor(c, a.kind);
          const disputeBlocked = a.kind === "open_dispute" && a.allowed;
          return (
            <li key={a.kind} className="relative pl-9">
              <span
                aria-hidden
                className={`absolute left-0 top-0 flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ${isDone ? "bg-cleared text-white" : a.allowed ? "bg-owed text-ink" : "bg-paper text-ink-soft ring-1 ring-grid"}`}
              >
                {isDone ? "✓" : i + 1}
              </span>
              <h3 className="font-medium">{STEP_TITLE[a.kind]}</h3>
              <p className={`text-sm ${!a.allowed && !isDone && a.reason.startsWith("Blocked") ? "text-stamp" : "text-ink-soft"}`}>{a.reason}</p>
              {(a.allowed || isDone) && (
                <details className="mt-2 rounded-md bg-card p-3 text-sm shadow-[0_0_0_1px_var(--grid)]">
                  <summary className="cursor-pointer font-medium">{isDone ? "What was sent" : "Read the draft"}</summary>
                  <p className="mt-2 text-xs text-ink-soft">{draft.channel}</p>
                  <p className="mt-1 font-medium">{draft.subject}</p>
                  <pre className="mt-2 whitespace-pre-wrap font-sans text-[0.8rem] leading-relaxed">{draft.body}</pre>
                </details>
              )}
              {a.allowed && !disputeBlocked && (
                <form action={approve} className="mt-3">
                  <input type="hidden" name="tripId" value={c.trip.id} />
                  <input type="hidden" name="kind" value={a.kind} />
                  <button className="rounded-md bg-ink px-4 py-2 text-sm font-medium text-white hover:bg-ink/90">{STEP_BUTTON[a.kind]}</button>
                </form>
              )}
              {disputeBlocked && (
                <p className="mt-3 text-sm text-ink-soft">Stripe Issuing test mode isn&apos;t connected yet. Add a test key to open the dispute.</p>
              )}
            </li>
          );
        })}
      </ol>
      {canRecordReply && (
        <div className="space-y-2 border-t border-grid pt-4">
          <p className="text-sm font-medium">Record the payee&apos;s reply</p>
          <div className="flex gap-2">
            {(["received", "refused"] as const).map((outcome) => (
              <form key={outcome} action={recordReply}>
                <input type="hidden" name="tripId" value={c.trip.id} />
                <input type="hidden" name="outcome" value={outcome} />
                <button className="rounded-md px-3 py-1.5 text-sm ring-1 ring-grid hover:ring-ink">
                  {outcome === "received" ? "Refund received" : "Refund refused"}
                </button>
              </form>
            ))}
          </div>
        </div>
      )}
      {c.events.length > 0 && (
        <div className="space-y-1 border-t border-grid pt-4 text-sm text-ink-soft">
          <p className="font-medium text-ink">History</p>
          {c.events.map((e, i) => (
            <p key={`${e.type}-${i}`}>
              {shortDate(e.at)}: {e.type.replaceAll("_", " ")}
            </p>
          ))}
        </div>
      )}
    </aside>
  );
}
