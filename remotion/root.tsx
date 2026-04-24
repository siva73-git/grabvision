import { Composition } from 'remotion';
import { DirectionBuddyDemo, DIRECTION_BUDDY_DURATION, FPS } from './DirectionBuddyDemo';

export function RemotionRoot() {
  return (
    <Composition
      id="direction-buddy-demo"
      component={DirectionBuddyDemo}
      durationInFrames={DIRECTION_BUDDY_DURATION}
      fps={FPS}
      width={1080}
      height={1920}
    />
  );
}
