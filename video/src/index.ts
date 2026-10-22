import { createElement } from "react";
import { Composition, registerRoot } from "remotion";
import { Pitch } from "./Pitch";
import { FPS, TOTAL_FRAMES } from "./theme";

function Root() {
  return createElement(Composition, {
    id: "Pitch",
    component: Pitch,
    durationInFrames: TOTAL_FRAMES,
    fps: FPS,
    width: 1920,
    height: 1080,
  });
}

registerRoot(Root);
