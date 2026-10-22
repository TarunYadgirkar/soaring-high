import { useCurrentFrame } from "remotion";
import raw from "./words.json";
import { FPS, TITLE_S, color, font, shadow } from "./theme";

type Word = { w: string; s: number; e: number };

const FIXES: Record<string, string> = { CLAW: "Claude", car: "card", sets: "cites", finances: "finance" };
const CAPTIONS_FROM = 17.0;
const MAX_WORDS = 6;
const GAP_BREAK = 0.5;

const words: Word[] = (raw as Word[])
  .filter((x) => x.s >= CAPTIONS_FROM)
  .map((x) => ({ ...x, w: FIXES[x.w] ?? x.w }));

const endsPhrase = (cur: Word[], next?: Word) => {
  const last = cur[cur.length - 1];
  if (!next || cur.length >= MAX_WORDS) return true;
  if (next.s - last.e > GAP_BREAK) return true;
  return /[.,?]$/.test(last.w) && cur.length >= 3;
};

const phrases: Word[][] = words.reduce<Word[][]>((acc, word, i) => {
  const cur = acc[acc.length - 1];
  const open = cur && !endsPhrase(cur, word);
  return open ? [...acc.slice(0, -1), [...cur, word]] : [...acc, [word]];
}, []);

export function Captions() {
  const t = useCurrentFrame() / FPS - TITLE_S;
  const phrase = phrases.find((p, i) => t >= p[0].s && t < (phrases[i + 1]?.[0].s ?? p[p.length - 1].e + 0.4));
  if (!phrase) return null;
  return (
    <div style={{ position: "absolute", bottom: 64, left: 0, right: 0, display: "flex", justifyContent: "center" }}>
      <div
        style={{
          maxWidth: 1040,
          padding: "14px 26px",
          borderRadius: 14,
          background: `${color.board}D9`,
          boxShadow: shadow,
          fontFamily: font.display,
          fontWeight: 600,
          fontSize: 44,
          lineHeight: 1.2,
          textAlign: "center",
          color: color.ink,
        }}
      >
        {phrase.map((x, i) => (
          <span key={i} style={{ color: t >= x.s ? (t < x.e + 0.08 ? color.amber : color.ink) : color.inkMuted }}>
            {x.w}{" "}
          </span>
        ))}
      </div>
    </div>
  );
}
