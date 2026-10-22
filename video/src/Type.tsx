import type { CSSProperties, ReactNode } from "react";
import { color, font } from "./theme";

type TextProps = { children: ReactNode; style?: CSSProperties };

export function Label({ children, style }: TextProps) {
  return (
    <div
      style={{
        fontFamily: font.mono,
        fontWeight: 700,
        fontSize: 22,
        letterSpacing: "0.14em",
        textTransform: "uppercase",
        color: color.amber,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

export function Headline({ children, style }: TextProps) {
  return (
    <div
      style={{
        fontFamily: font.display,
        fontWeight: 800,
        fontSize: 46,
        lineHeight: 1.08,
        color: color.ink,
        textWrap: "balance",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

export function Body({ children, style }: TextProps) {
  return (
    <div style={{ fontFamily: font.display, fontWeight: 600, fontSize: 30, lineHeight: 1.25, color: color.ink, ...style }}>
      {children}
    </div>
  );
}
