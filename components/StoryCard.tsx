'use client';

import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  CircleDot,
  Flag,
  Navigation,
  Sun,
} from 'lucide-react';
import { NavigationRoute, NavStep } from '@/lib/navigation';

interface StoryCardProps {
  route: NavigationRoute;
  step: NavStep;
  isActive: boolean;
  onSwipeLeft: () => void;
  onSwipeRight: () => void;
}

export default function StoryCard({ route, step, isActive, onSwipeLeft, onSwipeRight }: StoryCardProps) {
  const actionLabel = getActionLabel(step.action_icon);
  const remainingDistance = getRemainingDistanceText(route, step);

  return (
    <motion.div
      className="absolute inset-0 h-full w-full overflow-hidden bg-[#0b1f17] text-white"
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: isActive ? 1 : 0, x: 0 }}
      exit={{ opacity: 0, x: -40 }}
      transition={{ duration: 0.3 }}
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={1}
      onDragEnd={(e, { offset, velocity }) => {
        const swipe = swipePower(offset.x, velocity.x);
        if (swipe < -swipeConfidenceThreshold) {
          onSwipeLeft();
        } else if (swipe > swipeConfidenceThreshold) {
          onSwipeRight();
        }
      }}
    >
      <CuePhotoFallback step={step} />
      <CueLabels step={step} />
      <SolarGuide step={step} />
      <div className="absolute inset-0 bg-gradient-to-b from-black/5 via-transparent to-black/82" />
      <div className="absolute left-[33%] top-[31%] z-20 -translate-x-1/2">
        <motion.div
          className="flex items-center gap-2 rounded-full bg-white/94 px-3.5 py-2 text-[#00B14F] shadow-lg ring-1 ring-black/5"
          animate={getArrowAnimation(step.action_icon)}
          transition={{ duration: 0.9, repeat: Infinity, repeatType: "mirror", ease: "easeInOut" }}
        >
          {renderActionIcon(step.action_icon, "h-5 w-5")}
          <div>
            <div className="text-[9px] font-black uppercase leading-none text-[#5b6f66]">Next</div>
            <div className="text-sm font-black leading-tight">{actionLabel}</div>
          </div>
        </motion.div>
      </div>

      <div className="absolute inset-x-0 bottom-0 z-20 min-h-[32%] px-5 pb-5 pt-9 text-white [text-shadow:0_2px_16px_rgba(0,0,0,0.88)]">
        <div className="mb-3 flex items-center gap-2.5">
          <div className="grid h-9 w-9 place-items-center rounded-full bg-[#00B14F] text-white shadow-md">
            {renderActionIcon(step.action_icon, "h-5 w-5")}
          </div>
          <div>
            <div className="text-sm font-black">{remainingDistance}</div>
            <div className="flex items-center gap-1 text-xs font-semibold opacity-90">
              <Navigation className="h-3.5 w-3.5" />
              {step.eta_remaining} remaining
            </div>
          </div>
        </div>
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-bold uppercase opacity-90">{step.landmark.category}</span>
          <span className="text-[11px] font-bold opacity-90">{step.landmark.name}</span>
        </div>
        <h1 className="w-full max-w-4xl overflow-hidden text-ellipsis whitespace-nowrap text-[13px] font-black leading-tight [text-shadow:0_2px_4px_rgba(0,0,0,0.98),0_0_18px_rgba(0,0,0,0.95)] sm:text-base md:text-lg">
          {step.instruction}
        </h1>
      </div>
    </motion.div>
  );
}

function CuePhotoFallback({ step }: { step: NavStep }) {
  return (
    <div
      className="absolute inset-0 overflow-hidden bg-[#0b1f17] bg-cover bg-center"
      style={{ backgroundImage: `url(${step.landmark.image_url})` }}
    >
      <div className="absolute inset-0 bg-gradient-to-b from-black/15 via-black/10 to-black/55" />
    </div>
  );
}

function CueLabels({ step }: { step: NavStep }) {
  const scene = getScene(step);

  return (
    <>
      <div className="pointer-events-none absolute inset-0 z-20">
        {scene.labels.map((label) => (
          <div
            key={label.text}
            className={`absolute max-w-[11rem] rounded-md bg-[#0b1f17]/92 px-3 py-2 text-xs font-black uppercase leading-tight tracking-normal text-white shadow-xl ring-2 ring-white/80 backdrop-blur-sm ${label.className}`}
          >
            {label.text}
          </div>
        ))}
      </div>
      <div className="absolute bottom-[42%] right-5 z-30 max-w-[12rem] text-right">
        <div className="mb-1 inline-flex rounded-full bg-white/88 px-2.5 py-1 text-[10px] font-black uppercase text-[#5b6f66] shadow-sm">
          {scene.sideLabel}
        </div>
        <div className="rounded-full bg-white/86 px-3 py-1.5 text-sm font-black leading-tight text-[#0b1f17] shadow-sm backdrop-blur">
          {scene.visualTarget}
        </div>
      </div>
    </>
  );
}

function SolarGuide({ step }: { step: NavStep }) {
  const [now, setNow] = useState(() => new Date());
  const solarPosition = useMemo(() => getSolarGuidePosition(step, now), [now, step]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  if (solarPosition.isNight) return null;

  return (
    <div
      className="pointer-events-none absolute z-30 grid h-8 w-8 place-items-center rounded-full bg-amber-300/92 text-[#4b3510] shadow-[0_0_22px_rgba(251,191,36,0.55)] ring-2 ring-white/80"
      style={{
        left: `${solarPosition.x}%`,
        top: `${solarPosition.y}%`,
        transform: "translate(-50%, -50%)",
      }}
      aria-label={solarPosition.label}
      title={solarPosition.label}
    >
      <Sun className="h-[18px] w-[18px]" />
    </div>
  );
}

const swipeConfidenceThreshold = 10000;
const swipePower = (offset: number, velocity: number) => {
  return Math.abs(offset) * velocity;
};

function renderActionIcon(action: NavStep["action_icon"], className: string) {
  switch (action) {
    case "turn-left":
      return <ArrowLeft className={className} />;
    case "turn-right":
      return <ArrowRight className={className} />;
    case "arrive":
      return <Flag className={className} />;
    case "depart":
      return <CircleDot className={className} />;
    default:
      return <ArrowUp className={className} />;
  }
}

function getActionLabel(action: NavStep["action_icon"]) {
  switch (action) {
    case "turn-left":
      return "Turn left";
    case "turn-right":
      return "Turn right";
    case "arrive":
      return "Arrive";
    case "depart":
      return "Start";
    default:
      return "Go straight";
  }
}

function getArrowAnimation(action: NavStep["action_icon"]) {
  switch (action) {
    case "turn-left":
      return { x: [-8, 0], rotate: [-4, 0] };
    case "turn-right":
      return { x: [8, 0], rotate: [4, 0] };
    case "arrive":
      return { scale: [1, 1.06] };
    default:
      return { y: [-8, 0] };
  }
}

function getRemainingDistanceText(route: NavigationRoute, step: NavStep) {
  const currentIndex = route.steps.findIndex((candidate) => candidate.step_index === step.step_index);
  if (currentIndex < 0) return step.distance_text;

  const meters = route.steps
    .slice(currentIndex)
    .reduce((total, candidate) => total + distanceTextToMeters(candidate.distance_text), 0);

  return formatRemainingDistance(meters || distanceTextToMeters(step.distance_text));
}

function distanceTextToMeters(distanceText: string) {
  const value = Number(distanceText.replace(/[^0-9.]/g, ""));
  if (!Number.isFinite(value)) return 0;

  return distanceText.toLowerCase().includes("km") ? value * 1000 : value;
}

function formatRemainingDistance(meters: number) {
  if (meters >= 1000) return `${(meters / 1000).toFixed(1)}km`;
  return `${Math.max(10, Math.round(meters / 10) * 10)}m`;
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
  const x = clamp(50 + side * (isBehind ? 42 : 34), 9, 91);
  const y = clamp(
    isBehind ? 30 - altitudeFactor * 6 : 28 - altitudeFactor * 18,
    8,
    33,
  );

  return {
    x,
    y,
    isNight: sun.altitude < -6,
    label: `Approximate sun position: ${sun.label}`,
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
  const timezoneOffsetMinutes = -date.getTimezoneOffset();
  const trueSolarTime = positiveModulo(
    hour * 60 + equationOfTime + 4 * lng - timezoneOffsetMinutes,
    1440,
  );
  const hourAngle = ((trueSolarTime / 4 - 180) * Math.PI) / 180;
  const latRadians = (lat * Math.PI) / 180;
  const altitudeRadians = Math.asin(
    Math.sin(latRadians) * Math.sin(declination) +
      Math.cos(latRadians) * Math.cos(declination) * Math.cos(hourAngle),
  );
  const azimuthRadians = Math.atan2(
    Math.sin(hourAngle),
    Math.cos(hourAngle) * Math.sin(latRadians) - Math.tan(declination) * Math.cos(latRadians),
  );
  const azimuth = normalizeDegrees((azimuthRadians * 180) / Math.PI + 180);
  const altitude = (altitudeRadians * 180) / Math.PI;

  return {
    azimuth,
    altitude,
    label: cardinalLabel(azimuth),
  };
}

function getDayOfYear(date: Date) {
  const start = new Date(date.getFullYear(), 0, 0);
  return Math.floor((date.getTime() - start.getTime()) / 86_400_000);
}

function normalizeDegrees(value: number) {
  return positiveModulo(value + 180, 360) - 180;
}

function positiveModulo(value: number, divisor: number) {
  return ((value % divisor) + divisor) % divisor;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function cardinalLabel(azimuth: number) {
  const labels = ["north", "northeast", "east", "southeast", "south", "southwest", "west", "northwest"];
  return labels[Math.round(azimuth / 45) % labels.length];
}

function getScene(step: NavStep) {
  const text = `${step.instruction} ${step.landmark.name} ${step.landmark.category}`.toLowerCase();

  if (text.includes("furama")) {
    return {
      background: "bg-[radial-gradient(circle_at_30%_20%,#eafff2_0,#d7f4e6_32%,#6b8178_100%)]",
      labels: [
        { text: "Furama", className: "right-[19%] top-[24%]" },
        { text: "Eu Tong Sen St", className: "left-[28%] top-[52%]" },
      ],
      sideLabel: "Start point",
      visualTarget: "Face the main road",
    };
  }

  if (text.includes("people's park") || text.includes("new bridge")) {
    return {
      background: "bg-[radial-gradient(circle_at_35%_18%,#effff6_0,#ccebdd_35%,#40564e_100%)]",
      labels: [
        { text: "People's Park", className: "left-[9%] top-[24%]" },
        { text: "New Bridge Rd", className: "left-[42%] top-[52%]" },
      ],
      sideLabel: "Frontage",
      visualTarget: "Walk along the mall frontage",
    };
  }

  if (text.includes("mrt") || text.includes("pagoda")) {
    return {
      background: "bg-[radial-gradient(circle_at_50%_18%,#ffffff_0,#e2f3ea_30%,#52695f_100%)]",
      labels: [
        { text: "Chinatown MRT", className: "left-[9%] top-[24%]" },
        { text: "Pagoda St", className: "left-[43%] top-[50%]" },
      ],
      sideLabel: "Street entry",
      visualTarget: "Angle onto Pagoda Street",
    };
  }

  if (text.includes("trengganu")) {
    return {
      background: "bg-[radial-gradient(circle_at_48%_16%,#f8fff9_0,#d6ece0_34%,#45574f_100%)]",
      labels: [
        { text: "Trengganu St", className: "left-[8%] top-[25%]" },
        { text: "Food Street", className: "left-[43%] top-[50%]" },
      ],
      sideLabel: "Turn point",
      visualTarget: "Turn into the food street",
    };
  }

  if (text.includes("ann siang")) {
    return {
      background: "bg-[radial-gradient(circle_at_48%_16%,#fff8e4_0,#e9f5df_32%,#43574c_100%)]",
      labels: [
        { text: "Ann Siang", className: "left-[10%] top-[28%]" },
        { text: "Maxwell", className: "left-[45%] top-[50%]" },
      ],
      sideLabel: "Hill turn",
      visualTarget: "Descend toward Maxwell",
    };
  }

  if (text.includes("kadayanallur")) {
    return {
      background: "bg-[radial-gradient(circle_at_48%_16%,#effff6_0,#d6efe3_35%,#4d6259_100%)]",
      labels: [
        { text: "Kadayanallur St", className: "left-[8%] top-[28%]" },
        { text: "Food Centre", className: "right-[14%] top-[40%]" },
      ],
      sideLabel: "Final corner",
      visualTarget: "Turn toward the frontage",
    };
  }

  if (text.includes("maxwell") || text.includes("hawker")) {
    return {
      background: "bg-[radial-gradient(circle_at_48%_16%,#fff8e4_0,#e9f5df_32%,#43574c_100%)]",
      labels: [
        { text: "Maxwell", className: "left-[8%] top-[27%]" },
        { text: "Food Centre", className: "right-[16%] top-[31%]" },
      ],
      sideLabel: "Destination",
      visualTarget: "Look for the hawker centre roofline",
    };
  }

  if (text.includes("cpf") || text.includes("frontage") || text.includes("tower")) {
    return {
      background: "bg-[radial-gradient(circle_at_50%_20%,#effff6_0,#d6efe3_35%,#4d6259_100%)]",
      labels: [
        { text: "CPF Maxwell", className: "left-[8%] top-[26%]" },
        { text: "Final corner", className: "right-[12%] top-[43%]" },
      ],
      sideLabel: "Street view",
      visualTarget: step.landmark.name,
    };
  }

  return {
    background: "bg-[radial-gradient(circle_at_48%_16%,#f8fff9_0,#d6ece0_34%,#45574f_100%)]",
    labels: [{ text: step.landmark.name, className: "left-[8%] top-[28%]" }],
    sideLabel: step.landmark.category,
    visualTarget: step.instruction,
  };
}
