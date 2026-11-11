import type { ClaimStage } from "@/lib/escalation/escalation";
import { formatUsd } from "@/lib/rules/engine";
import type { ClauseId, Decision, Verdict } from "@/lib/types";

export const usd = (cents: number | null): string => (cents === null ? "" : formatUsd(cents));

export function ruleLabel(clause: ClauseId | null): string {
  if (!clause) return "No proof yet";
  if (clause === "91-FR-41556") return "91 FR 41556";
  if (clause.startsWith("260.2/")) return "§260.2";
  return `§${clause}`;
}

export function stageLabel(stage: ClaimStage, verdict: Verdict): string {
  const labels: Record<ClaimStage, string> = {
    watching: "Needs flight data",
    alert_ready: "Alert traveler",
    alerted: "Traveler alerted",
    ready_to_request: "Ready to request",
    refund_pending: "Waiting on payee",
    refund_overdue: "Refund overdue",
    refund_refused: "Refund refused",
    dot_filed: "DOT complaint filed",
    dispute_ready: "Dispute package ready",
    recovered: "Recovered",
    closed: verdict === "excluded" ? "Excluded by DOT notice" : "No refund owed",
  };
  return labels[stage];
}

export type Tone = "owed" | "stamp" | "cleared" | "muted" | "ink";

export function stageTone(stage: ClaimStage): Tone {
  if (stage === "alert_ready" || stage === "ready_to_request") return "owed";
  if (stage === "refund_overdue" || stage === "refund_refused" || stage === "dispute_ready") return "stamp";
  if (stage === "recovered") return "cleared";
  if (stage === "closed" || stage === "watching") return "muted";
  return "ink";
}

const DOT = "before:mr-2 before:inline-block before:h-1.5 before:w-1.5 before:rounded-full before:bg-current before:align-middle before:content-['']";

export const toneClass: Record<Tone, string> = {
  owed: `text-owed ${DOT}`,
  stamp: `text-stamp ${DOT}`,
  cleared: `text-cleared ${DOT}`,
  muted: "text-ink-soft",
  ink: `text-ink ${DOT}`,
};

export function shortDate(iso: string): string {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
}

const DURATION = /(\d+h\d{2}m)/;

// One-line summary of what the engine found, built from its triggers.
export function whatHappened(d: Decision): string {
  if (d.triggers.length === 0) return d.reason.split(". ")[0].replace(/\.$/, "");
  return d.triggers
    .map((t) => {
      const dur = DURATION.exec(t.detail)?.[1] ?? "";
      switch (t.kind) {
        case "cancelled":
          return "Cancelled";
        case "arrive_late":
          return `arrives ${dur} late`;
        case "depart_early":
          return `departs ${dur} early`;
        case "airport_change":
          return "airport changed";
        case "more_connections":
          return "connection added";
        case "downgrade":
          return "downgraded";
      }
    })
    .join(", ")
    .replace(/^./, (ch) => ch.toUpperCase());
}
