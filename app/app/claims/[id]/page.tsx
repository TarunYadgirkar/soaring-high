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
    <div className="space-y-16">
      <TripHeader c={c} />
      <div className="grid gap-x-16 gap-y-14 lg:grid-cols-[1fr_360px]">
        <div className="space-y-14">
          <Why c={c} />
          <Evidence proof={c.decision.proof} />
          {c.trip.join_reasons && (
            <section className="space-y-3">
              <h2 className="text-sm text-ink-soft">Joined from Ramp by</h2>
              <ul className="space-y-1 text-sm">
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

function TripHeader({ c }: { c: Claim }) {
  const segs = c.trip.facts.original;
  const first = segs[0];
  const last = segs[segs.length - 1];
  const d = c.decision;
  const isOwed = d.verdict === "refund_owed" || d.verdict === "hold_credit_alert";
  const amount = isOwed ? usd(d.amount_cents) : d.verdict === "needs_info" ? "Not proven" : "Not owed";
  const owedLine = d.verdict === "hold_credit_alert" ? "refundable if the traveler declines the credit" : isOwed ? `owed to the card by ${d.payee?.name}` : "";
  const facts = [
    ["Flight", segs.map((s) => s.flight_number).join(", ")],
    ["Departs", `${first.origin}, ${shortDate(first.departure)} at ${time(first.departure, first.origin)}`],
    ["Arrives", `${last.destination} at ${time(last.arrival, last.destination)}`],
    ["Traveler", c.trip.traveler],
  ];
  const due = d.refund_due_by ? `Due ${shortDate(d.refund_due_by)}${d.overdue ? ", overdue" : ""}` : null;
  return (
    <section aria-label="Trip" className="space-y-8">
      <Link href="/" className="meta hover:text-ink">
        ← Claims
      </Link>
      <div className="flex flex-wrap items-end justify-between gap-x-16 gap-y-8">
        <div>
          <h1 className="font-sign text-5xl font-medium leading-tight sm:text-6xl">
            {airport(first.origin).city} <span aria-hidden className="text-ink-soft">→</span>
            <span className="sr-only">to</span> {airport(last.destination).city}
          </h1>
          <dl className="mt-6 flex flex-wrap gap-x-10 gap-y-3 text-sm">
            {facts.map(([label, value]) => (
              <div key={label}>
                <dt className="meta">{label}</dt>
                <dd className="mt-0.5">{value}</dd>
              </div>
            ))}
          </dl>
        </div>
        <div className="text-right">
          <p className={`figure text-6xl sm:text-7xl ${isOwed ? "text-owed" : "text-ink-soft"}`}>{amount}</p>
          {owedLine && <p className="mt-3 text-sm text-ink-soft">{owedLine}</p>}
          <p className="code mt-1">{ruleLabel(d.basis)}</p>
          {due && <p className={`mt-1 text-sm ${d.overdue ? "text-stamp" : "text-ink-soft"}`}>{due}</p>}
          {d.payee?.kind === "ticket_agent" && <p className="meta mt-1">The seller refunds on request.</p>}
        </div>
      </div>
      <p className={`text-sm ${toneClass[stageTone(c.stage)]}`}>{stageLabel(c.stage, d.verdict)}</p>
    </section>
  );
}

function Quote({ cite }: { cite: Citation }) {
  return (
    <figure className="max-w-2xl">
      <blockquote className="rounded-lg bg-card p-6 text-lg leading-relaxed">“{cite.excerpt}”</blockquote>
      <figcaption className="code mt-3">
        <a href={cite.url} target="_blank" rel="noopener noreferrer" className="underline underline-offset-4 hover:text-ink">
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
    <section className="space-y-5">
      <h2 className="text-sm text-ink-soft">Why</h2>
      <p className="max-w-2xl leading-relaxed">{d.reason}</p>
      {basis && <Quote cite={basis} />}
      {others.length > 0 && (
        <details className="max-w-2xl text-sm">
          <summary className="meta cursor-pointer hover:text-ink">{others.length} more rules cited</summary>
          <div className="mt-6 space-y-8">
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
      <h2 className="text-sm text-ink-soft">Evidence</h2>
      <table className="w-full text-sm">
        <thead className="sr-only">
          <tr>
            <th>Source</th>
            <th>Shows</th>
            <th>Record</th>
          </tr>
        </thead>
        <tbody>
          {proof.map((p) => (
            <tr key={`${p.ref}-${p.field}`} className="border-t border-grid align-baseline">
              <td className="w-32 py-3 pr-6 whitespace-nowrap">{SOURCE_LABEL[p.source]}</td>
              <td className="py-3 pr-6">
                {p.note}
                <span className="code mt-1 block">
                  {p.field} = {p.value}
                </span>
              </td>
              <td className="code hidden py-3 text-right sm:table-cell">{p.ref}</td>
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
  prepare_dispute: "Prepare the card dispute",
};

const STEP_BUTTON: Record<ActionKind, string> = {
  alert_traveler: "Approve and send alert",
  request_refund: "Approve and send request",
  file_dot_complaint: "Approve and file complaint",
  prepare_dispute: "Approve dispute package",
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
    case "prepare_dispute":
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
    prepare_dispute: "dispute_prepared",
  };
  const canRecordReply = ["refund_pending", "refund_overdue", "dot_filed", "dispute_ready"].includes(c.stage);

  if (steps.length === 0) {
    return (
      <aside className="space-y-3">
        <h2 className="text-sm text-ink-soft">Next step</h2>
        <p className="text-sm">
          {c.decision.verdict === "needs_info"
            ? "Find an independent flight-status record before claiming anything."
            : "Nothing to recover on this trip."}
        </p>
      </aside>
    );
  }

  return (
    <aside className="space-y-6">
      <h2 className="text-sm text-ink-soft">{steps.length > 1 ? "Getting the cash back" : "Before the traveler decides"}</h2>
      <ol className="space-y-7">
        {steps.map((a, i) => {
          const isDone = done.has(doneFor[a.kind]);
          const draft = draftFor(c, a.kind);
          return (
            <li key={a.kind} className="relative pl-9">
              <span
                aria-hidden
                className={`absolute left-0 top-0 flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium ${isDone ? "bg-cleared text-paper" : a.allowed ? "bg-ink text-paper" : "bg-card text-ink-soft"}`}
              >
                {isDone ? "✓" : i + 1}
              </span>
              <h3 className={a.allowed || isDone ? "" : "text-ink-soft"}>{STEP_TITLE[a.kind]}</h3>
              <p className={`text-sm ${!a.allowed && !isDone && a.reason.startsWith("Blocked") ? "text-stamp" : "text-ink-soft"}`}>{a.reason}</p>
              {(a.allowed || isDone) && (
                <details className="mt-3 text-sm">
                  <summary className="meta cursor-pointer hover:text-ink">{isDone ? (a.kind === "prepare_dispute" ? "The dispute package" : "What was sent") : "Read the draft"}</summary>
                  <p className="meta mt-3">{draft.channel}</p>
                  <p className="mt-1 font-medium">{draft.subject}</p>
                  <pre className="mt-2 whitespace-pre-wrap rounded-md bg-card p-4 font-sans text-[0.8rem] leading-relaxed">{draft.body}</pre>
                </details>
              )}
              {a.allowed && (
                <form action={approve} className="mt-3">
                  <input type="hidden" name="tripId" value={c.trip.id} />
                  <input type="hidden" name="kind" value={a.kind} />
                  <button className="rounded-md bg-ink px-4 py-2 text-sm font-medium text-paper hover:bg-ink/85">{STEP_BUTTON[a.kind]}</button>
                </form>
              )}
            </li>
          );
        })}
      </ol>
      {canRecordReply && (
        <div className="space-y-2 border-t border-grid pt-4">
          <p className="text-sm text-ink-soft">Record the payee&apos;s reply</p>
          <div className="flex gap-2">
            {(["received", "refused"] as const).map((outcome) => (
              <form key={outcome} action={recordReply}>
                <input type="hidden" name="tripId" value={c.trip.id} />
                <input type="hidden" name="outcome" value={outcome} />
                <button className="rounded-md bg-card px-3 py-1.5 text-sm hover:bg-grid">
                  {outcome === "received" ? "Refund received" : "Refund refused"}
                </button>
              </form>
            ))}
          </div>
        </div>
      )}
      {c.events.length > 0 && (
        <div className="meta space-y-1 border-t border-grid pt-4">
          <p>History</p>
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
