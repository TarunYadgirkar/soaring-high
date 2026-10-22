import { loadFont as loadArchivo } from "@remotion/google-fonts/Archivo";
import { loadFont as loadMono } from "@remotion/google-fonts/JetBrainsMono";

const archivo = loadArchivo("normal", { weights: ["600", "800"], subsets: ["latin"] });
const mono = loadMono("normal", { weights: ["700"], subsets: ["latin"] });

export const font = {
  display: archivo.fontFamily,
  mono: mono.fontFamily,
};

export const color = {
  board: "#111316",
  flap: "#1C1F24",
  seam: "#0A0B0D",
  ink: "#F4F1E8",
  inkMuted: "#A9A69C",
  amber: "#FFC226",
  red: "#E0483E",
  green: "#3DBE7A",
};

export const shadow = "0 18px 50px rgba(0,0,0,0.45), 0 2px 6px rgba(0,0,0,0.3)";

export const FPS = 30;
export const TITLE_S = 2;
export const BASE_S = 99.5;
export const END_S = 3;
export const TOTAL_FRAMES = Math.round((TITLE_S + BASE_S + END_S) * FPS);

// Times in the script are seconds into base.mp4; the title card sits in front of it.
export const at = (baseSeconds: number) => Math.round((baseSeconds + TITLE_S) * FPS);

// Center of the empty whiteboard between the two speakers.
export const STAGE_X = 1018;
