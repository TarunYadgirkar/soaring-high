import { AbsoluteFill, OffthreadVideo, Sequence, staticFile } from "remotion";
import { EndCard, LowerThirds, TitleCard } from "./Bookends";
import { Captions } from "./Captions";
import { CreditOffer, DepartureBoard, Forfeit, RuleCard } from "./Problem";
import { Closer, ClaimCard, Escalation } from "./Solution";
import { Sources } from "./Sources";
import { BASE_S, FPS, TITLE_S, color } from "./theme";

export function Pitch() {
  return (
    <AbsoluteFill style={{ background: color.board }}>
      <Sequence from={TITLE_S * FPS} durationInFrames={BASE_S * FPS}>
        <OffthreadVideo src={staticFile("base.mp4")} />
      </Sequence>
      <LowerThirds />
      <DepartureBoard />
      <RuleCard />
      <CreditOffer />
      <Forfeit />
      <Sources />
      <ClaimCard />
      <Escalation />
      <Closer />
      <Captions />
      <TitleCard />
      <EndCard />
    </AbsoluteFill>
  );
}
