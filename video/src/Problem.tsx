import { interpolate, useCurrentFrame } from "remotion";
import { Panel, Reveal } from "./Panel";
import { SplitFlap } from "./SplitFlap";
import { Body, Headline, Label } from "./Type";
import { at, color, font } from "./theme";

export function DepartureBoard() {
  return (
    <Panel from={at(17.24)} to={at(22.45)} width={600}>
      <Label>Departures</Label>
      <SplitFlap text="SFO-JFK  CANCELLED" start={at(18.7)} size={32} ink={color.red} />
      <SplitFlap text="ORD-LAX  DELAYED 3H+" start={at(21.26)} size={32} ink={color.amber} />
    </Panel>
  );
}

export function RuleCard() {
  return (
    <Panel from={at(22.5)} to={at(26.0)}>
      <Label>14 CFR Part 260</Label>
      <Headline>
        Full cash refund
        <Reveal from={at(25.3)} style={{ color: color.amber }}>
          to the card that paid.
        </Reveal>
      </Headline>
    </Panel>
  );
}

function AcceptButton() {
  const frame = useCurrentFrame();
  const tap = at(32.04);
  const press = interpolate(frame, [tap, tap + 4, tap + 9], [1, 0.9, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const isAccepted = frame >= tap + 5;
  return (
    <div
      style={{
        transform: `scale(${press})`,
        padding: "16px 26px",
        borderRadius: 999,
        background: color.amber,
        color: color.board,
        fontFamily: font.display,
        fontWeight: 800,
        fontSize: 28,
      }}
    >
      {isAccepted ? "Credit accepted" : "Accept credit"}
    </div>
  );
}

export function CreditOffer() {
  return (
    <Panel from={at(26.84)} to={at(33.1)}>
      <Label style={{ color: color.inkMuted }}>Airline notice</Label>
      <Body>Your flight was cancelled. Take a travel credit instead?</Body>
      <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
        <AcceptButton />
        <Body style={{ fontSize: 24, color: color.inkMuted }}>Request refund</Body>
      </div>
    </Panel>
  );
}

function StruckLine({ from }: { from: number }) {
  const frame = useCurrentFrame();
  const width = interpolate(frame, [from, from + 14], [0, 100], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <div style={{ position: "relative", display: "inline-block" }}>
      <Headline>Company cash refund</Headline>
      <div style={{ position: "absolute", left: 0, top: "52%", height: 6, borderRadius: 3, width: `${width}%`, background: color.red }} />
    </div>
  );
}

export function Forfeit() {
  return (
    <Panel from={at(33.2)} to={at(40.9)}>
      <Reveal from={at(34.5)}>
        <Label style={{ color: color.red }}>Forfeited with one tap</Label>
      </Reveal>
      <StruckLine from={at(34.04)} />
      <Reveal from={at(36.98)}>
        <Body>
          The credit sits in the employee's <span style={{ color: color.amber }}>personal airline account</span>.
        </Body>
      </Reveal>
      <Reveal from={at(39.32)}>
        <Body style={{ color: color.inkMuted }}>Finance can't use it.</Body>
      </Reveal>
    </Panel>
  );
}

export function useLineGrow(from: number, frames: number): number {
  const frame = useCurrentFrame();
  return interpolate(frame, [from, from + frames], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
}
