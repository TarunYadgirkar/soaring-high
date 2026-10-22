import { AirplaneTilt, CreditCard, EnvelopeSimple } from "@phosphor-icons/react";
import type { Icon } from "@phosphor-icons/react";
import { useCurrentFrame } from "remotion";
import { Panel, Reveal, useEnter } from "./Panel";
import { useLineGrow } from "./Problem";
import { Body, Label } from "./Type";
import { at, color, font } from "./theme";

type Source = { icon: Icon; name: string; via: string; shows: number; joins: number };

const SOURCES: Source[] = [
  { icon: CreditCard, name: "Ramp charge", via: "Ramp API", shows: 44.5, joins: 57.36 },
  { icon: EnvelopeSimple, name: "Airline email", via: "read by Claude", shows: 45.78, joins: 58.6 },
  { icon: AirplaneTilt, name: "Flight record", via: "flight-status data", shows: 48.28, joins: 60.78 },
];

const CONNECT = 54.5;

function SourceRow({ source }: { source: Source }) {
  const Glyph = source.icon;
  const joined = useEnter(at(source.joins));
  return (
    <Reveal from={at(source.shows)}>
      <div style={{ display: "flex", alignItems: "center", gap: 16, padding: "12px 16px", borderRadius: 14, background: color.flap }}>
        <Glyph size={36} weight="bold" color={color.amber} />
        <Body style={{ flex: 1 }}>{source.name}</Body>
        <div style={{ opacity: joined, fontFamily: font.mono, fontWeight: 700, fontSize: 18, color: color.green }}>
          {source.via}
        </div>
      </div>
    </Reveal>
  );
}

function Status() {
  const frame = useCurrentFrame();
  const isConnected = frame >= at(CONNECT);
  const grow = useLineGrow(at(CONNECT), 18);
  if (!isConnected) {
    return (
      <Reveal from={at(50.0)}>
        <Body style={{ color: color.red }}>Nobody connects them.</Body>
      </Reveal>
    );
  }
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
      <div style={{ height: 6, borderRadius: 3, width: 120 * grow, background: color.amber }} />
      <Body style={{ color: color.amber, opacity: grow }}>Soaring High joins all three</Body>
    </div>
  );
}

export function Sources() {
  return (
    <Panel from={at(41.1)} to={at(63.4)} width={610}>
      <Label>The proof lives in three places</Label>
      {SOURCES.map((s) => (
        <SourceRow key={s.name} source={s} />
      ))}
      <Status />
    </Panel>
  );
}
