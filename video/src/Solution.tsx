import { CheckCircle, Circle } from "@phosphor-icons/react";
import { useCurrentFrame } from "remotion";
import { Panel, Reveal } from "./Panel";
import { Body, Headline, Label } from "./Type";
import { at, color, font } from "./theme";

type ClaimRow = { key: string; value: string; from: number };

const CLAIM: ClaimRow[] = [
  { key: "Rule", value: "14 CFR 260.6, full refund owed", from: 66.82 },
  { key: "Proof", value: "Flight-status record", from: 71.18 },
  { key: "Check", value: "Finance can verify every dollar", from: 72.54 },
];

export function ClaimCard() {
  return (
    <Panel from={at(63.56)} to={at(74.2)} width={610}>
      <Label>Rules engine decides</Label>
      <Reveal from={at(64.74)}>
        <Headline>Not the AI.</Headline>
      </Reveal>
      {CLAIM.map((row) => (
        <Reveal key={row.key} from={at(row.from)}>
          <div style={{ display: "flex", gap: 16, alignItems: "baseline" }}>
            <div style={{ width: 92, fontFamily: font.mono, fontWeight: 700, fontSize: 20, color: color.inkMuted }}>
              {row.key.toUpperCase()}
            </div>
            <Body style={{ flex: 1 }}>{row.value}</Body>
          </div>
        </Reveal>
      ))}
    </Panel>
  );
}

const STEPS = [
  { text: "Tell the traveler to hold the credit", from: 78.26 },
  { text: "Request the refund to the company card", from: 79.82 },
  { text: "If refused, a DOT complaint", from: 83.34 },
  { text: "Then a card dispute", from: 86.26 },
];

function Step({ n, text, from }: { n: number; text: string; from: number }) {
  return (
    <Reveal from={at(from)}>
      <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: 999,
            background: color.amber,
            color: color.board,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: font.mono,
            fontWeight: 700,
            fontSize: 22,
          }}
        >
          {n}
        </div>
        <Body style={{ fontSize: 28 }}>{text}</Body>
      </div>
    </Reveal>
  );
}

function ApprovalGate() {
  const isApproved = useCurrentFrame() >= at(89.94);
  const Glyph = isApproved ? CheckCircle : Circle;
  return (
    <Reveal from={at(87.84)}>
      <div style={{ display: "flex", gap: 14, alignItems: "center", padding: "12px 16px", borderRadius: 14, background: color.flap }}>
        <Glyph size={34} weight="fill" color={isApproved ? color.green : color.inkMuted} />
        <Body style={{ fontSize: 26 }}>{isApproved ? "Admin approved, sending" : "Waiting for admin approval"}</Body>
      </div>
    </Reveal>
  );
}

export function Escalation() {
  return (
    <Panel from={at(74.48)} to={at(90.9)} width={610} top={240}>
      <Label>When a flight is disrupted</Label>
      {STEPS.map((s, i) => (
        <Step key={s.text} n={i + 1} text={s.text} from={s.from} />
      ))}
      <ApprovalGate />
    </Panel>
  );
}

export function Closer() {
  return (
    <Panel from={at(91.0)} to={at(99.3)} width={620}>
      <Headline style={{ color: color.inkMuted, fontSize: 40 }}>Ramp catches the hotel price drop after you book.</Headline>
      <Reveal from={at(94.56)}>
        <Headline style={{ fontSize: 40 }}>
          Soaring High catches the <span style={{ color: color.amber }}>airfare refund</span> after the airline cancels.
        </Headline>
      </Reveal>
    </Panel>
  );
}
