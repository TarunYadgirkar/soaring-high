import type { CSSProperties, ReactNode } from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { STAGE_X, color, shadow } from "./theme";

const EXIT_FRAMES = 8;

export function useEnter(from: number): number {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return spring({ frame: frame - from, fps, config: { damping: 18, stiffness: 160 } });
}

type PanelProps = {
  from: number;
  to: number;
  top?: number;
  width?: number;
  children: ReactNode;
};

// A board-colored card that springs in at `from` and fades out before `to`.
export function Panel({ from, to, top = 270, width = 580, children }: PanelProps) {
  const frame = useCurrentFrame();
  const enter = useEnter(from);
  if (frame < from || frame > to) return null;
  const exit = interpolate(frame, [to - EXIT_FRAMES, to], [1, 0], { extrapolateLeft: "clamp" });
  return (
    <div
      style={{
        position: "absolute",
        top,
        left: STAGE_X - width / 2,
        width,
        padding: 28,
        borderRadius: 20,
        background: `${color.board}F2`,
        boxShadow: shadow,
        opacity: enter * exit,
        transform: `translateY(${(1 - enter) * 30}px) scale(${0.94 + enter * 0.06})`,
        display: "flex",
        flexDirection: "column",
        gap: 18,
      }}
    >
      {children}
    </div>
  );
}

type RevealProps = { from: number; children: ReactNode; style?: CSSProperties };

export function Reveal({ from, children, style }: RevealProps) {
  const enter = useEnter(from);
  return (
    <div style={{ opacity: enter, transform: `translateX(${(1 - enter) * -16}px)`, ...style }}>{children}</div>
  );
}
