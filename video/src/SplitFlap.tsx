import { random, useCurrentFrame } from "remotion";
import { color, font } from "./theme";

const GLYPHS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789+";
const STAGGER = 2;
const SPIN = 9;

type Props = {
  text: string;
  start: number;
  size?: number;
  ink?: string;
};

const glyphAt = (text: string, i: number, frame: number, start: number) => {
  const begin = start + i * STAGGER;
  if (frame < begin) return " ";
  if (frame >= begin + SPIN || text[i] === " ") return text[i];
  return GLYPHS[Math.floor(random(`${text}-${i}-${frame}`) * GLYPHS.length)];
};

export function SplitFlap({ text, start, size = 44, ink = color.ink }: Props) {
  const frame = useCurrentFrame();
  return (
    <div style={{ display: "flex", gap: size * 0.08 }}>
      {text.split("").map((_, i) => {
        const settled = frame >= start + i * STAGGER + SPIN;
        return (
          <div
            key={i}
            style={{
              width: size * 0.72,
              height: size * 1.25,
              borderRadius: size * 0.1,
              background: `linear-gradient(${color.flap} 49%, ${color.seam} 49%, ${color.seam} 51%, ${color.flap} 51%)`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontFamily: font.mono,
              fontWeight: 700,
              fontSize: size,
              color: settled ? ink : color.ink,
              lineHeight: 1,
            }}
          >
            {glyphAt(text, i, frame, start)}
          </div>
        );
      })}
    </div>
  );
}
