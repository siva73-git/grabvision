import React from 'react';
import {
  AbsoluteFill,
  Img,
  interpolate,
  Sequence,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import {
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  ChevronDown,
  CircleDot,
  Flag,
  Map,
  RefreshCw,
  Sun,
} from 'lucide-react';
import { DEMO_ROUTE, NavStep, NavigationRoute } from '../lib/navigation';

export const FPS = 30;

const QUESTION_FRAMES = 72;
const INTRO_FRAMES = QUESTION_FRAMES * 4;
const SHOW_ALL_FRAMES = 90;
const FAST_STEP_FRAMES = 30;
const FAST_WALK_FRAMES = DEMO_ROUTE.steps.length * FAST_STEP_FRAMES;
const FAST_BACK_FRAMES = (DEMO_ROUTE.steps.length - 1) * 8 + 20;
const COLLAPSE_FRAMES = 45;
const SLOW_STEP_FRAMES = 75;
const SLOW_WALK_FRAMES = DEMO_ROUTE.steps.length * SLOW_STEP_FRAMES;
const CLOSE_FRAMES = 105;
const ROADMAP_FRAMES = 210;

const SHOW_ALL_START = INTRO_FRAMES;
const FAST_WALK_START = SHOW_ALL_START + SHOW_ALL_FRAMES;
const FAST_BACK_START = FAST_WALK_START + FAST_WALK_FRAMES;
const COLLAPSE_START = FAST_BACK_START + FAST_BACK_FRAMES;
const SLOW_WALK_START = COLLAPSE_START + COLLAPSE_FRAMES;
const CLOSE_START = SLOW_WALK_START + SLOW_WALK_FRAMES;
const ROADMAP_START = CLOSE_START + CLOSE_FRAMES;

export const DIRECTION_BUDDY_DURATION = ROADMAP_START + ROADMAP_FRAMES;

const QUESTIONS = [
  'Ever been stressed on how you finish the final part of your journey?',
  'GPS not working due to tall buildings or heavy machinery?',
  'Compass being twitchy on your phone?',
  'Too shy to ask someone?',
];

const demoDate = new Date('2026-04-24T15:00:00+08:00');

type FeatureCallout = {
  text: string;
  tone: 'solar' | 'direction';
  opacity: number;
};

export function DirectionBuddyDemo() {
  return (
    <AbsoluteFill style={styles.stage}>
      <IntroQuestions />
      <Sequence from={SHOW_ALL_START} durationInFrames={CLOSE_START - SHOW_ALL_START}>
        <AppDemo />
      </Sequence>
      <Sequence from={CLOSE_START} durationInFrames={CLOSE_FRAMES}>
        <ClosingCard />
      </Sequence>
      <Sequence from={ROADMAP_START} durationInFrames={ROADMAP_FRAMES}>
        <RoadmapCard />
      </Sequence>
      <BrandBug />
    </AbsoluteFill>
  );
}

function IntroQuestions() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <Sequence durationInFrames={INTRO_FRAMES}>
      <AbsoluteFill style={styles.intro}>
        <div style={styles.introHalo} />
        <div style={styles.introEyebrow}>Direction Buddy</div>
        {QUESTIONS.map((question, index) => {
          const localFrame = frame - index * QUESTION_FRAMES;
          const opacity = interpolate(
            localFrame,
            [0, 10, QUESTION_FRAMES - 12, QUESTION_FRAMES],
            [0, 1, 1, 0],
            { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' },
          );
          const y = interpolate(localFrame, [0, 14], [34, 0], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
          });
          const scale = spring({
            frame: Math.max(0, localFrame),
            fps,
            config: { damping: 22, stiffness: 140 },
          });

          return (
            <div
              key={question}
              style={{
                ...styles.questionCard,
                opacity,
                transform: `translateY(${y}px) scale(${0.96 + scale * 0.04})`,
              }}
            >
              {question}
            </div>
          );
        })}
      </AbsoluteFill>
    </Sequence>
  );
}

function AppDemo() {
  const frame = useCurrentFrame();
  const globalFrame = frame + SHOW_ALL_START;
  const stepIndex = getStepIndex(globalFrame);
  const collapsed = globalFrame >= COLLAPSE_START;
  const transition = getTapSide(globalFrame, stepIndex);
  const featureCallout = getFeatureCallout(globalFrame);

  return (
    <AbsoluteFill style={styles.appScene}>
      <div style={styles.phoneShadow} />
      <div style={styles.phone}>
        <PhoneHeader />
        <RouteInputs />
        <SectionShell
          compact={collapsed}
          title="Overhead map"
          right={<CompassGroup compact={collapsed} />}
          startHeight={collapsed ? 92 : 350}
        >
          {!collapsed && <OverviewMap route={DEMO_ROUTE} activeIndex={stepIndex} />}
        </SectionShell>
        <JourneySection
          route={DEMO_ROUTE}
          stepIndex={stepIndex}
          expanded={collapsed}
          tapSide={transition}
          featureCallout={featureCallout}
        />
        <SectionShell
          compact={collapsed}
          title="Destination"
          right={<ChevronDown size={18} />}
          startHeight={collapsed ? 74 : 210}
        >
          {!collapsed && <DestinationPanel route={DEMO_ROUTE} />}
        </SectionShell>
      </div>
    </AbsoluteFill>
  );
}

function PhoneHeader() {
  return (
    <div style={styles.phoneHeader}>
      <div>
        <div style={styles.productName}>Direction Buddy</div>
        <div style={styles.productSubtitle}>Walk by landmarks, not guesswork</div>
      </div>
      <div style={styles.headerIcon}>
        <RefreshCw size={18} />
      </div>
    </div>
  );
}

function RouteInputs() {
  return (
    <div style={styles.routeInputs}>
      <div style={styles.routeField}>
        <span style={styles.dotStart} />
        <span>{DEMO_ROUTE.origin.label}</span>
      </div>
      <div style={styles.routeField}>
        <span style={styles.dotEnd} />
        <span>{DEMO_ROUTE.destination.label}</span>
      </div>
    </div>
  );
}

function SectionShell({
  children,
  compact,
  title,
  right,
  startHeight,
}: {
  children: React.ReactNode;
  compact: boolean;
  title: string;
  right: React.ReactNode;
  startHeight: number;
}) {
  return (
    <div
      style={{
        ...styles.section,
        height: startHeight,
        padding: compact ? 14 : 16,
      }}
    >
      <div style={styles.sectionHeader}>
        <div style={styles.sectionTitle}>{title}</div>
        <div style={styles.sectionRight}>{right}</div>
      </div>
      {children}
    </div>
  );
}

function CompassGroup({ compact }: { compact: boolean }) {
  return (
    <div style={styles.compassGroup}>
      <span style={styles.compassN}>N</span>
      <Map size={compact ? 16 : 18} />
      <ChevronDown size={18} />
    </div>
  );
}

function OverviewMap({ route, activeIndex }: { route: NavigationRoute; activeIndex: number }) {
  const projection = getProjection(route.route_geometry, 600, 238);
  const points = route.route_geometry.map(([lng, lat]) => projection.project(lng, lat));
  const activeStep = route.steps[activeIndex];
  const activePoint = projection.project(activeStep.coordinate.lng, activeStep.coordinate.lat);

  return (
    <div style={styles.mapCanvas}>
      <div style={styles.mapGrid} />
      <svg viewBox="0 0 600 238" style={styles.mapSvg}>
        <path d={makeStreetPath(points, -34)} fill="none" stroke="#d7eee2" strokeWidth="20" strokeLinecap="round" />
        <path d={makeStreetPath(points, 24)} fill="none" stroke="#e8f7ef" strokeWidth="16" strokeLinecap="round" />
        <path d={makePath(points)} fill="none" stroke="#0057ff" strokeWidth="13" strokeLinecap="round" strokeLinejoin="round" />
        <path d={makePath(points)} fill="none" stroke="white" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" opacity="0.72" />
        {route.steps.map((step) => {
          const point = projection.project(step.coordinate.lng, step.coordinate.lat);
          const active = step.step_index === activeStep.step_index;
          return (
            <circle
              key={step.step_index}
              cx={point.x}
              cy={point.y}
              r={active ? 10 : 6}
              fill={active ? '#00B14F' : '#ffffff'}
              stroke={active ? '#ffffff' : '#00B14F'}
              strokeWidth="4"
            />
          );
        })}
        <g transform={`translate(${activePoint.x} ${activePoint.y}) rotate(${activeStep.target_bearing})`}>
          <path d="M 0 -28 L 13 13 L 0 6 L -13 13 Z" fill="#00B14F" stroke="white" strokeWidth="4" />
        </g>
      </svg>
      <div style={styles.mapSummary}>{route.summary.distance_text} · {route.summary.duration_text}</div>
      <div style={styles.mapBrand}>Direction Buddy</div>
    </div>
  );
}

function JourneySection({
  route,
  stepIndex,
  expanded,
  tapSide,
  featureCallout,
}: {
  route: NavigationRoute;
  stepIndex: number;
  expanded: boolean;
  tapSide: 'left' | 'right' | null;
  featureCallout: FeatureCallout | null;
}) {
  const step = route.steps[stepIndex];
  const height = expanded ? 1166 : 765;

  return (
    <div style={{ ...styles.journeySection, height }}>
      <div style={styles.journeyHeader}>
        <div style={styles.sectionTitle}>Journey based steering</div>
        <div style={styles.stepPill}>{step.step_index}/{route.steps.length}</div>
      </div>
      <CueVisual
        route={route}
        step={step}
        stepIndex={stepIndex}
        expanded={expanded}
        featureCallout={featureCallout}
      />
      {tapSide && <TapPulse side={tapSide} />}
    </div>
  );
}

function CueVisual({
  route,
  step,
  stepIndex,
  expanded,
  featureCallout,
}: {
  route: NavigationRoute;
  step: NavStep;
  stepIndex: number;
  expanded: boolean;
  featureCallout: FeatureCallout | null;
}) {
  const frame = useCurrentFrame();
  const actionLabel = getActionLabel(step.action_icon);
  const remainingDistance = getRemainingDistance(route, stepIndex);
  const solarPosition = getSolarGuidePosition(step, demoDate);
  const bob = Math.sin(frame / 8) * 6;

  return (
    <div style={styles.cueFrame}>
      <Img
        src={staticFile(step.landmark.image_url.replace(/^\//, ''))}
        style={{
          ...styles.cueImage,
          transform: `scale(${expanded ? 1.035 : 1.02})`,
        }}
      />
      <div style={styles.cueShade} />
      <div
        style={{
          ...styles.solarGuide,
          left: `${solarPosition.x}%`,
          top: `${solarPosition.y}%`,
        }}
      >
        <Sun size={24} />
      </div>
      <div style={styles.sceneTag}>{step.landmark.name}</div>
      {featureCallout && (
        <div
          style={{
            ...styles.featureCallout,
            ...(featureCallout.tone === 'solar' ? styles.featureCalloutSolar : styles.featureCalloutDirection),
            opacity: featureCallout.opacity,
          }}
        >
          <div style={styles.featureCalloutIcon}>
            {featureCallout.tone === 'solar' ? <Sun size={22} /> : renderActionIcon(step.action_icon, 22)}
          </div>
          <div style={styles.featureCalloutText}>{featureCallout.text}</div>
        </div>
      )}
      <div
        style={{
          ...styles.actionBubble,
          transform: `translate(-50%, calc(-50% + ${bob}px))`,
        }}
      >
        {renderActionIcon(step.action_icon, 28)}
        <div>
          <div style={styles.nextText}>Next</div>
          <div style={styles.actionText}>{actionLabel}</div>
        </div>
      </div>
      <button type="button" style={styles.leftNav}>
        <ArrowLeft size={20} />
      </button>
      <button type="button" style={styles.rightNav}>
        <ArrowRight size={20} />
      </button>
      <div style={styles.instructionBlock}>
        <div style={styles.instructionMeta}>
          <span>{remainingDistance}</span>
          <span>{step.eta_remaining} remaining</span>
        </div>
        <div style={styles.instructionLine}>{step.instruction}</div>
      </div>
    </div>
  );
}

function DestinationPanel({ route }: { route: NavigationRoute }) {
  const finalStep = route.steps[route.steps.length - 1];

  return (
    <div style={styles.destinationPanel}>
      <Img src={staticFile(finalStep.landmark.image_url.replace(/^\//, ''))} style={styles.destinationImage} />
      <div style={styles.destinationText}>
        <Flag size={18} />
        <span>{route.destination.label}</span>
      </div>
    </div>
  );
}

function TapPulse({ side }: { side: 'left' | 'right' }) {
  const frame = useCurrentFrame();
  const local = frame % 30;
  const opacity = interpolate(local, [0, 8, 18], [0, 1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const scale = interpolate(local, [0, 18], [0.72, 1.6], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <div
      style={{
        ...styles.tapPulse,
        left: side === 'left' ? 94 : undefined,
        right: side === 'right' ? 94 : undefined,
        opacity,
        transform: `scale(${scale})`,
      }}
    />
  );
}

function ClosingCard() {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [0, 20, CLOSE_FRAMES - 24, CLOSE_FRAMES], [0, 1, 1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const y = interpolate(frame, [0, 24], [34, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill style={styles.close}>
      <div style={{ ...styles.closeText, opacity, transform: `translateY(${y}px)` }}>
        Never get lost again
      </div>
    </AbsoluteFill>
  );
}

function RoadmapCard() {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [0, 20, ROADMAP_FRAMES - 24, ROADMAP_FRAMES], [0, 1, 1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const y = interpolate(frame, [0, 24], [34, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill style={styles.roadmap}>
      <div style={{ ...styles.roadmapPanel, opacity, transform: `translateY(${y}px)` }}>
        <div style={styles.roadmapEyebrow}>Upcoming Enhancements:</div>
        <div style={styles.roadmapItem}>
          <span style={styles.roadmapNumber}>1)</span>
          <span>Fully animated journey - preview your travel without taking a single step</span>
        </div>
        <div style={styles.roadmapItem}>
          <span style={styles.roadmapNumber}>2)</span>
          <span>
            Side views. Main travel panel will have option of side panels showing you what will be to the left and
            to the right
          </span>
        </div>
      </div>
    </AbsoluteFill>
  );
}

function BrandBug() {
  return (
    <div style={styles.brandBug}>
      <span style={styles.brandDot} />
      Direction Buddy
    </div>
  );
}

function getStepIndex(frame: number) {
  if (frame < FAST_WALK_START) return 0;

  if (frame < FAST_BACK_START) {
    return Math.min(DEMO_ROUTE.steps.length - 1, Math.floor((frame - FAST_WALK_START) / FAST_STEP_FRAMES));
  }

  if (frame < COLLAPSE_START) {
    const local = frame - FAST_BACK_START;
    return Math.max(0, DEMO_ROUTE.steps.length - 1 - Math.floor(local / 8));
  }

  if (frame < SLOW_WALK_START) return 0;

  return Math.min(DEMO_ROUTE.steps.length - 1, Math.floor((frame - SLOW_WALK_START) / SLOW_STEP_FRAMES));
}

function getTapSide(frame: number, stepIndex: number): 'left' | 'right' | null {
  if (frame >= FAST_WALK_START && frame < FAST_BACK_START && frame % FAST_STEP_FRAMES < 12 && stepIndex > 0) {
    return 'right';
  }

  if (frame >= FAST_BACK_START && frame < COLLAPSE_START && frame % 8 < 5 && stepIndex < DEMO_ROUTE.steps.length - 1) {
    return 'left';
  }

  if (frame >= SLOW_WALK_START && frame < CLOSE_START && (frame - SLOW_WALK_START) % SLOW_STEP_FRAMES < 14 && stepIndex > 0) {
    return 'right';
  }

  return null;
}

function getFeatureCallout(frame: number): FeatureCallout | null {
  if (frame < SLOW_WALK_START || frame >= CLOSE_START) return null;

  const local = frame - SLOW_WALK_START;
  const solarStart = 0;
  const solarEnd = SLOW_STEP_FRAMES * 4;
  const directionStart = solarEnd + 24;
  const directionEnd = directionStart + SLOW_STEP_FRAMES * 4;

  if (local >= solarStart && local < solarEnd) {
    return {
      text: 'Solar position changes to reflect where sun should be based on time of day and direction of travel',
      tone: 'solar',
      opacity: calloutOpacity(local - solarStart, solarEnd - solarStart),
    };
  }

  if (local >= directionStart && local < directionEnd) {
    return {
      text: 'Direction cues are animated to help prompt user on direction to follow',
      tone: 'direction',
      opacity: calloutOpacity(local - directionStart, directionEnd - directionStart),
    };
  }

  return null;
}

function calloutOpacity(local: number, duration: number) {
  return interpolate(local, [0, 14, duration - 14, duration], [0, 1, 1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
}

function renderActionIcon(action: NavStep['action_icon'], size: number) {
  switch (action) {
    case 'turn-left':
      return <ArrowLeft size={size} />;
    case 'turn-right':
      return <ArrowRight size={size} />;
    case 'arrive':
      return <Flag size={size} />;
    case 'depart':
      return <CircleDot size={size} />;
    default:
      return <ArrowUp size={size} />;
  }
}

function getActionLabel(action: NavStep['action_icon']) {
  switch (action) {
    case 'turn-left':
      return 'Turn left';
    case 'turn-right':
      return 'Turn right';
    case 'arrive':
      return 'Arrive';
    case 'depart':
      return 'Start';
    default:
      return 'Go straight';
  }
}

function getRemainingDistance(route: NavigationRoute, stepIndex: number) {
  const meters = route.steps
    .slice(stepIndex)
    .reduce((total, step) => total + distanceTextToMeters(step.distance_text), 0);

  if (meters >= 1000) return `${(meters / 1000).toFixed(1)}km`;
  return `${Math.max(10, Math.round(meters / 10) * 10)}m`;
}

function distanceTextToMeters(distanceText: string) {
  const value = Number(distanceText.replace(/[^0-9.]/g, ''));
  if (!Number.isFinite(value)) return 0;

  return distanceText.toLowerCase().includes('km') ? value * 1000 : value;
}

function getProjection(coordinates: [number, number][], width: number, height: number) {
  const projected = coordinates.map(([lng, lat]) => ({
    x: lngToX(lng),
    y: latToY(lat),
  }));
  const xs = projected.map((point) => point.x);
  const ys = projected.map((point) => point.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const padding = 34;
  const scale = Math.min((width - padding * 2) / (maxX - minX), (height - padding * 2) / (maxY - minY));
  const routeWidth = (maxX - minX) * scale;
  const routeHeight = (maxY - minY) * scale;
  const offsetX = (width - routeWidth) / 2;
  const offsetY = (height - routeHeight) / 2;

  return {
    project(lng: number, lat: number) {
      return {
        x: offsetX + (lngToX(lng) - minX) * scale,
        y: offsetY + (latToY(lat) - minY) * scale,
      };
    },
  };
}

function lngToX(lng: number) {
  return (lng + 180) / 360;
}

function latToY(lat: number) {
  const radians = (lat * Math.PI) / 180;
  return (1 - Math.log(Math.tan(radians) + 1 / Math.cos(radians)) / Math.PI) / 2;
}

function makePath(points: { x: number; y: number }[]) {
  return points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x.toFixed(1)} ${point.y.toFixed(1)}`).join(' ');
}

function makeStreetPath(points: { x: number; y: number }[], offset: number) {
  return points
    .map((point, index) => `${index === 0 ? 'M' : 'L'} ${(point.x + offset).toFixed(1)} ${(point.y + offset / 2).toFixed(1)}`)
    .join(' ');
}

function getSolarGuidePosition(step: NavStep, date: Date) {
  const coordinate = step.landmark.coordinate ?? step.coordinate;
  const sun = getApproximateSolarPosition(date, coordinate.lat, coordinate.lng);
  const relativeBearing = normalizeDegrees(sun.azimuth - step.target_bearing);
  const relativeRadians = (relativeBearing * Math.PI) / 180;
  const side = Math.sin(relativeRadians);
  const ahead = Math.cos(relativeRadians);
  const isBehind = ahead < -0.28;
  const altitudeFactor = clamp((sun.altitude + 6) / 78, 0, 1);

  return {
    x: clamp(50 + side * (isBehind ? 42 : 34), 9, 91),
    y: clamp(isBehind ? 30 - altitudeFactor * 6 : 28 - altitudeFactor * 18, 8, 33),
  };
}

function getApproximateSolarPosition(date: Date, lat: number, lng: number) {
  const dayOfYear = getDayOfYear(date);
  const hour = date.getHours() + date.getMinutes() / 60 + date.getSeconds() / 3600;
  const gamma = (2 * Math.PI / 365) * (dayOfYear - 1 + (hour - 12) / 24);
  const equationOfTime =
    229.18 *
    (0.000075 +
      0.001868 * Math.cos(gamma) -
      0.032077 * Math.sin(gamma) -
      0.014615 * Math.cos(2 * gamma) -
      0.040849 * Math.sin(2 * gamma));
  const declination =
    0.006918 -
    0.399912 * Math.cos(gamma) +
    0.070257 * Math.sin(gamma) -
    0.006758 * Math.cos(2 * gamma) +
    0.000907 * Math.sin(2 * gamma) -
    0.002697 * Math.cos(3 * gamma) +
    0.00148 * Math.sin(3 * gamma);
  const timeOffset = equationOfTime + 4 * lng;
  const trueSolarTime = (hour * 60 + timeOffset + 1440) % 1440;
  const hourAngle = ((trueSolarTime / 4 - 180) * Math.PI) / 180;
  const latitudeRadians = (lat * Math.PI) / 180;
  const altitudeRadians = Math.asin(
    Math.sin(latitudeRadians) * Math.sin(declination) +
      Math.cos(latitudeRadians) * Math.cos(declination) * Math.cos(hourAngle),
  );
  const azimuthRadians = Math.atan2(
    Math.sin(hourAngle),
    Math.cos(hourAngle) * Math.sin(latitudeRadians) - Math.tan(declination) * Math.cos(latitudeRadians),
  );
  const azimuth = normalizeDegrees((azimuthRadians * 180) / Math.PI + 180);

  return {
    altitude: (altitudeRadians * 180) / Math.PI,
    azimuth,
  };
}

function getDayOfYear(date: Date) {
  const start = new Date(date.getFullYear(), 0, 0);
  return Math.floor((date.getTime() - start.getTime()) / 86_400_000);
}

function normalizeDegrees(value: number) {
  return ((value % 360) + 360) % 360;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

const fontStack = "'Sanomat Grab', 'Sanomat Grab Web', 'Grab Community', Inter, Arial, sans-serif";

const styles: Record<string, React.CSSProperties> = {
  stage: {
    background: '#07130d',
    color: '#ffffff',
    fontFamily: fontStack,
    overflow: 'hidden',
  },
  intro: {
    alignItems: 'center',
    background: 'radial-gradient(circle at 50% 20%, #0a5f31 0%, #07130d 52%, #020604 100%)',
    justifyContent: 'center',
  },
  introHalo: {
    position: 'absolute',
    width: 680,
    height: 680,
    borderRadius: 680,
    background: 'rgba(0, 177, 79, 0.16)',
    filter: 'blur(70px)',
    top: 250,
  },
  introEyebrow: {
    position: 'absolute',
    top: 360,
    color: '#00B14F',
    fontSize: 34,
    fontWeight: 900,
    letterSpacing: 0,
    textTransform: 'uppercase',
  },
  questionCard: {
    position: 'absolute',
    width: 830,
    color: '#ffffff',
    fontSize: 76,
    fontWeight: 950,
    lineHeight: 1.04,
    textAlign: 'center',
    textShadow: '0 10px 40px rgba(0,0,0,0.55)',
  },
  appScene: {
    alignItems: 'center',
    background: 'linear-gradient(180deg, #062017 0%, #0a3f25 48%, #03110b 100%)',
    justifyContent: 'center',
  },
  phoneShadow: {
    position: 'absolute',
    width: 840,
    height: 1740,
    borderRadius: 96,
    background: 'rgba(0,0,0,0.42)',
    filter: 'blur(34px)',
    transform: 'translateY(28px)',
  },
  phone: {
    width: 780,
    height: 1688,
    borderRadius: 84,
    background: '#f5f8f4',
    boxShadow: '0 0 0 18px #101815, 0 0 0 22px rgba(255,255,255,0.08)',
    color: '#0b1f17',
    overflow: 'hidden',
    padding: '42px 24px 24px',
  },
  phoneHeader: {
    alignItems: 'center',
    display: 'flex',
    justifyContent: 'space-between',
    padding: '0 18px 16px',
  },
  productName: {
    color: '#00B14F',
    fontSize: 36,
    fontWeight: 950,
    lineHeight: 1,
  },
  productSubtitle: {
    color: '#49645a',
    fontSize: 18,
    fontWeight: 750,
    marginTop: 8,
  },
  headerIcon: {
    alignItems: 'center',
    background: '#ffffff',
    borderRadius: 24,
    boxShadow: '0 6px 18px rgba(13, 42, 29, 0.12)',
    display: 'flex',
    height: 48,
    justifyContent: 'center',
    width: 48,
  },
  routeInputs: {
    background: '#ffffff',
    borderRadius: 24,
    boxShadow: '0 6px 18px rgba(13, 42, 29, 0.08)',
    display: 'grid',
    gap: 4,
    marginBottom: 14,
    padding: 16,
  },
  routeField: {
    alignItems: 'center',
    color: '#173428',
    display: 'flex',
    fontSize: 22,
    fontWeight: 850,
    gap: 12,
    minHeight: 38,
  },
  dotStart: {
    background: '#00B14F',
    borderRadius: 14,
    height: 14,
    width: 14,
  },
  dotEnd: {
    background: '#111111',
    borderRadius: 14,
    height: 14,
    width: 14,
  },
  section: {
    background: '#ffffff',
    borderRadius: 24,
    boxShadow: '0 8px 22px rgba(13, 42, 29, 0.08)',
    marginBottom: 14,
    overflow: 'hidden',
  },
  sectionHeader: {
    alignItems: 'center',
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionTitle: {
    color: '#0b1f17',
    fontSize: 22,
    fontWeight: 950,
    lineHeight: 1,
  },
  sectionRight: {
    alignItems: 'center',
    background: '#eef8f2',
    borderRadius: 999,
    color: '#0b1f17',
    display: 'flex',
    fontSize: 16,
    fontWeight: 900,
    gap: 8,
    padding: '9px 12px',
  },
  compassGroup: {
    alignItems: 'center',
    display: 'flex',
    gap: 8,
  },
  compassN: {
    color: '#00B14F',
    fontWeight: 950,
  },
  mapCanvas: {
    background: '#dff4e8',
    borderRadius: 20,
    height: 272,
    overflow: 'hidden',
    position: 'relative',
  },
  mapGrid: {
    position: 'absolute',
    inset: 0,
    backgroundImage:
      'linear-gradient(90deg, rgba(0,177,79,0.12) 1px, transparent 1px), linear-gradient(rgba(0,177,79,0.12) 1px, transparent 1px)',
    backgroundSize: '54px 54px',
  },
  mapSvg: {
    height: '100%',
    left: 0,
    position: 'absolute',
    top: 0,
    width: '100%',
  },
  mapSummary: {
    background: 'rgba(255,255,255,0.92)',
    borderRadius: '0 18px 0 0',
    bottom: 0,
    color: '#0b1f17',
    fontSize: 18,
    fontWeight: 950,
    left: 0,
    minWidth: 158,
    padding: '13px 18px',
    position: 'absolute',
  },
  mapBrand: {
    background: '#00B14F',
    borderRadius: '18px 0 0 0',
    bottom: 0,
    color: '#ffffff',
    fontSize: 17,
    fontWeight: 950,
    minWidth: 184,
    padding: '13px 18px',
    position: 'absolute',
    right: 0,
    textAlign: 'right',
  },
  journeySection: {
    background: '#ffffff',
    borderRadius: 24,
    boxShadow: '0 8px 22px rgba(13, 42, 29, 0.08)',
    marginBottom: 14,
    overflow: 'hidden',
    padding: 16,
  },
  journeyHeader: {
    alignItems: 'center',
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  stepPill: {
    background: '#eef8f2',
    borderRadius: 999,
    color: '#00B14F',
    fontSize: 18,
    fontWeight: 950,
    padding: '8px 12px',
  },
  cueFrame: {
    background: '#07130d',
    borderRadius: 22,
    height: 'calc(100% - 44px)',
    overflow: 'hidden',
    position: 'relative',
  },
  cueImage: {
    height: '100%',
    objectFit: 'cover',
    width: '100%',
  },
  cueShade: {
    position: 'absolute',
    inset: 0,
    background: 'linear-gradient(180deg, rgba(0,0,0,0.08) 0%, rgba(0,0,0,0.04) 46%, rgba(0,0,0,0.82) 100%)',
  },
  solarGuide: {
    alignItems: 'center',
    background: 'rgba(253, 186, 64, 0.95)',
    border: '3px solid rgba(255,255,255,0.86)',
    borderRadius: 999,
    boxShadow: '0 0 28px rgba(251,191,36,0.7)',
    color: '#4b3510',
    display: 'flex',
    height: 44,
    justifyContent: 'center',
    position: 'absolute',
    transform: 'translate(-50%, -50%)',
    width: 44,
  },
  sceneTag: {
    background: 'rgba(7,19,13,0.74)',
    borderRadius: 999,
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 900,
    left: 18,
    maxWidth: 360,
    overflow: 'hidden',
    padding: '10px 14px',
    position: 'absolute',
    textOverflow: 'ellipsis',
    top: 18,
    whiteSpace: 'nowrap',
  },
  featureCallout: {
    alignItems: 'flex-start',
    border: '2px solid rgba(255,255,255,0.62)',
    borderRadius: 18,
    boxShadow: '0 14px 34px rgba(0,0,0,0.34)',
    color: '#ffffff',
    display: 'flex',
    gap: 12,
    maxWidth: 500,
    padding: '15px 16px',
    position: 'absolute',
    right: 18,
    top: 72,
  },
  featureCalloutSolar: {
    background: 'linear-gradient(135deg, rgba(96, 64, 8, 0.86), rgba(9, 31, 23, 0.82))',
  },
  featureCalloutDirection: {
    background: 'linear-gradient(135deg, rgba(0, 104, 48, 0.9), rgba(9, 31, 23, 0.82))',
  },
  featureCalloutIcon: {
    alignItems: 'center',
    background: 'rgba(255,255,255,0.95)',
    borderRadius: 999,
    color: '#00B14F',
    display: 'flex',
    flex: '0 0 auto',
    height: 38,
    justifyContent: 'center',
    width: 38,
  },
  featureCalloutText: {
    fontSize: 20,
    fontWeight: 900,
    lineHeight: 1.16,
    textShadow: '0 2px 8px rgba(0,0,0,0.56)',
  },
  actionBubble: {
    alignItems: 'center',
    background: 'rgba(255,255,255,0.94)',
    borderRadius: 999,
    boxShadow: '0 12px 30px rgba(0,0,0,0.24)',
    color: '#00B14F',
    display: 'flex',
    gap: 12,
    left: '33%',
    padding: '13px 18px',
    position: 'absolute',
    top: '31%',
  },
  nextText: {
    color: '#66756d',
    fontSize: 12,
    fontWeight: 950,
    lineHeight: 1,
    textTransform: 'uppercase',
  },
  actionText: {
    color: '#00B14F',
    fontSize: 22,
    fontWeight: 950,
    lineHeight: 1.05,
  },
  leftNav: {
    alignItems: 'center',
    background: 'rgba(255,255,255,0.9)',
    border: 0,
    borderRadius: 999,
    color: '#0b1f17',
    display: 'flex',
    height: 52,
    justifyContent: 'center',
    left: 18,
    position: 'absolute',
    top: '50%',
    width: 52,
  },
  rightNav: {
    alignItems: 'center',
    background: 'rgba(255,255,255,0.9)',
    border: 0,
    borderRadius: 999,
    color: '#0b1f17',
    display: 'flex',
    height: 52,
    justifyContent: 'center',
    position: 'absolute',
    right: 18,
    top: '50%',
    width: 52,
  },
  instructionBlock: {
    bottom: 0,
    color: '#ffffff',
    left: 0,
    padding: '38px 24px 24px',
    position: 'absolute',
    right: 0,
    textShadow: '0 3px 10px rgba(0,0,0,0.98), 0 0 22px rgba(0,0,0,0.88)',
  },
  instructionMeta: {
    display: 'flex',
    fontSize: 20,
    fontWeight: 950,
    gap: 18,
    marginBottom: 10,
  },
  instructionLine: {
    fontSize: 25,
    fontWeight: 950,
    lineHeight: 1.04,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  destinationPanel: {
    borderRadius: 20,
    height: 142,
    overflow: 'hidden',
    position: 'relative',
  },
  destinationImage: {
    height: '100%',
    objectFit: 'cover',
    width: '100%',
  },
  destinationText: {
    alignItems: 'center',
    background: 'rgba(0,0,0,0.68)',
    borderRadius: 999,
    bottom: 14,
    color: '#ffffff',
    display: 'flex',
    fontSize: 20,
    fontWeight: 950,
    gap: 10,
    left: 14,
    padding: '10px 14px',
    position: 'absolute',
  },
  tapPulse: {
    background: 'rgba(255,255,255,0.44)',
    border: '5px solid rgba(0,177,79,0.88)',
    borderRadius: 999,
    height: 86,
    position: 'absolute',
    top: '50%',
    width: 86,
  },
  close: {
    alignItems: 'center',
    background: 'radial-gradient(circle at 50% 35%, #00B14F 0%, #06351e 48%, #020604 100%)',
    justifyContent: 'center',
  },
  closeText: {
    color: '#ffffff',
    fontSize: 98,
    fontWeight: 950,
    lineHeight: 1.02,
    textAlign: 'center',
    textShadow: '0 10px 44px rgba(0,0,0,0.46)',
    width: 820,
  },
  roadmap: {
    alignItems: 'center',
    background: 'linear-gradient(180deg, #03110b 0%, #06351e 42%, #00B14F 140%)',
    justifyContent: 'center',
  },
  roadmapPanel: {
    background: 'rgba(255,255,255,0.94)',
    border: '3px solid rgba(255,255,255,0.72)',
    borderRadius: 42,
    boxShadow: '0 24px 70px rgba(0,0,0,0.34)',
    color: '#0b1f17',
    padding: '52px 56px',
    width: 860,
  },
  roadmapEyebrow: {
    color: '#00B14F',
    fontSize: 50,
    fontWeight: 950,
    lineHeight: 1.02,
    marginBottom: 34,
  },
  roadmapItem: {
    alignItems: 'flex-start',
    display: 'flex',
    fontSize: 38,
    fontWeight: 900,
    gap: 18,
    lineHeight: 1.18,
    marginTop: 26,
  },
  roadmapNumber: {
    color: '#00B14F',
    flex: '0 0 auto',
    fontWeight: 950,
  },
  brandBug: {
    alignItems: 'center',
    background: 'rgba(0,0,0,0.32)',
    borderRadius: 999,
    bottom: 42,
    color: 'rgba(255,255,255,0.82)',
    display: 'flex',
    fontSize: 20,
    fontWeight: 850,
    gap: 10,
    left: 42,
    padding: '12px 18px',
    position: 'absolute',
  },
  brandDot: {
    background: '#00B14F',
    borderRadius: 999,
    height: 14,
    width: 14,
  },
};
