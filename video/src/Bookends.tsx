import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { useEnter } from "./Panel";
import { SplitFlap } from "./SplitFlap";
import { Body, Label } from "./Type";
import { BASE_S, FPS, TITLE_S, at, color, font, shadow } from "./theme";

const FADE = 10;

export function TitleCard() {
  const frame = useCurrentFrame();
  const end = TITLE_S * FPS;
  const opacity = interpolate(frame, [end - FADE, end], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  if (frame >= end) return null;
  return (
    <AbsoluteFill style={{ background: color.board, opacity, alignItems: "center", justifyContent: "center", gap: 36 }}>
      <SplitFlap text="SOARING HIGH" start={4} size={104} ink={color.amber} />
      <Label style={{ color: color.inkMuted, fontSize: 26 }}>BBS × Ramp Hackathon · Round 1</Label>
    </AbsoluteFill>
  );
}

export function EndCard() {
  const start = at(BASE_S);
  const enter = useEnter(start);
  if (useCurrentFrame() < start) return null;
  return (
    <AbsoluteFill style={{ background: color.board, opacity: enter, alignItems: "center", justifyContent: "center", gap: 34 }}>
      <SplitFlap text="SOARING HIGH" start={start + 4} size={96} ink={color.amber} />
      <Body style={{ fontSize: 40 }}>Airline refunds your company card is owed, found and proven.</Body>
      <Label style={{ color: color.inkMuted, fontSize: 24 }}>Team Soaring · UC Berkeley</Label>
    </AbsoluteFill>
  );
}

type Person = { name: string; role: string; from: number; to: number; side: "left" | "right" };

const PEOPLE: Person[] = [
  { name: "Tarun Yadgirkar", role: "SLICE Lab, ML compilers", from: 0.2, to: 4.6, side: "left" },
  { name: "Dhruv Sharma", role: "Stanford computational neuroscience lab", from: 5.0, to: 10.9, side: "right" },
  { name: "Aadi Jariwala", role: "Business, founder of an education startup", from: 11.4, to: 16.7, side: "left" },
];

function LowerThird({ person }: { person: Person }) {
  const frame = useCurrentFrame();
  const from = at(person.from);
  const to = at(person.to);
  const enter = useEnter(from);
  if (frame < from || frame > to) return null;
  const exit = interpolate(frame, [to - 8, to], [1, 0], { extrapolateLeft: "clamp" });
  const offset = (1 - enter) * 40 * (person.side === "left" ? -1 : 1);
  return (
    <div
      style={{
        position: "absolute",
        bottom: 80,
        [person.side]: 90,
        padding: "18px 26px",
        borderRadius: 16,
        background: `${color.board}F2`,
        boxShadow: shadow,
        opacity: enter * exit,
        transform: `translateX(${offset}px)`,
        display: "flex",
        flexDirection: "column",
        gap: 6,
      }}
    >
      <div style={{ fontFamily: font.display, fontWeight: 800, fontSize: 44, color: color.ink }}>{person.name}</div>
      <Label style={{ fontSize: 20, color: color.amber, letterSpacing: "0.08em" }}>{person.role}</Label>
    </div>
  );
}

export function LowerThirds() {
  return (
    <>
      {PEOPLE.map((p) => (
        <LowerThird key={p.name} person={p} />
      ))}
    </>
  );
}
