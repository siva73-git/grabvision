'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronUp, LocateFixed, MapPinned, Play, RefreshCw, Route, Search, Utensils } from 'lucide-react';
import RouteMap from '@/components/RouteMap';
import StoryCard from '@/components/StoryCard';
import { DEMO_DESTINATION, DEMO_ORIGIN, DEMO_ROUTE, NavigationRoute } from '@/lib/navigation';

export default function Home() {
  const [route, setRoute] = useState<NavigationRoute>(DEMO_ROUTE);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [origin, setOrigin] = useState(DEMO_ORIGIN.label);
  const [destination, setDestination] = useState(DEMO_DESTINATION.label);
  const [isLoading, setIsLoading] = useState(false);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [isOverviewCollapsed, setIsOverviewCollapsed] = useState(false);
  const [isCueCollapsed, setIsCueCollapsed] = useState(false);
  const [isDestinationCollapsed, setIsDestinationCollapsed] = useState(false);
  const currentStep = route.steps[currentIndex] ?? route.steps[0];
  const progress = useMemo(
    () => Math.round(((currentIndex + 1) / route.steps.length) * 100),
    [currentIndex, route.steps.length],
  );
  const isDefaultDemoRoute =
    origin.trim().toLowerCase() === DEMO_ORIGIN.label.toLowerCase() &&
    destination.trim().toLowerCase() === DEMO_DESTINATION.label.toLowerCase();

  const triggerHaptic = useCallback(() => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(50);
    }
  }, []);

  const loadNavigation = useCallback(async (forceDemo = false) => {
    setIsLoading(true);
    try {
      const useDemoRoute =
        forceDemo ||
        (origin.trim().toLowerCase() === DEMO_ORIGIN.label.toLowerCase() &&
          destination.trim().toLowerCase() === DEMO_DESTINATION.label.toLowerCase());
      const response = await fetch('/api/navigation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          demo: useDemoRoute,
          origin: { label: origin, coordinate: DEMO_ORIGIN.coordinate },
          destination: { label: destination, coordinate: DEMO_DESTINATION.coordinate },
        }),
      });
      const data = (await response.json()) as NavigationRoute;
      setRoute(data);
      setCurrentIndex(0);
      setIsPreviewing(false);
    } finally {
      setIsLoading(false);
    }
  }, [destination, origin]);

  useEffect(() => {
    if (!isPreviewing) return;

    const interval = window.setInterval(() => {
      setCurrentIndex((index) => {
        if (index >= route.steps.length - 1) {
          window.clearInterval(interval);
          window.setTimeout(() => setIsPreviewing(false), 800);
          return index;
        }
        triggerHaptic();
        return index + 1;
      });
    }, Math.max(2200, Math.floor(15000 / route.steps.length)));

    return () => window.clearInterval(interval);
  }, [isPreviewing, route.steps.length, triggerHaptic]);

  const handleNext = () => {
    if (currentIndex < route.steps.length - 1) {
      triggerHaptic();
      setCurrentIndex((prev) => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      triggerHaptic();
      setCurrentIndex((prev) => prev - 1);
    }
  };

  // Allow tapping on the sides to advance/go back as a fallback for dragging
  const handleScreenTap = (e: React.MouseEvent) => {
    const clickX = e.clientX;
    const screenWidth = window.innerWidth;
    if (clickX < screenWidth * 0.3) {
      handlePrev();
    } else if (clickX > screenWidth * 0.7) {
      handleNext();
    }
  };

  return (
    <main className="fixed inset-0 overflow-hidden bg-[#f5f7f4] text-[#0b1f17]">
      <section className="flex h-full flex-col">
        <div className="z-30 border-b border-black/5 bg-white px-4 pb-3 pt-[calc(env(safe-area-inset-top)+1rem)] shadow-sm">
          <div className="mx-auto flex max-w-5xl items-center justify-between gap-3">
            <div>
              <div className="text-xs font-black uppercase text-[#00B14F]">GrabVision</div>
              <div className="text-xl font-black">Direction Buddy</div>
            </div>
            <button
              type="button"
              className="grid h-11 w-11 place-items-center rounded-full bg-[#00B14F] text-white shadow-sm"
              onClick={() => loadNavigation(isDefaultDemoRoute)}
              aria-label="Refresh route"
            >
              <RefreshCw className={`h-5 w-5 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          <div className="mx-auto mt-3 grid max-w-5xl gap-2 sm:grid-cols-[1fr_1fr_auto]">
            <label className="flex items-center gap-2 rounded-lg bg-[#f1f5f2] px-3 py-2">
              <LocateFixed className="h-4 w-4 text-[#00B14F]" />
              <input
                value={origin}
                onChange={(event) => setOrigin(event.target.value)}
                className="min-w-0 flex-1 bg-transparent text-sm font-semibold outline-none"
                aria-label="Origin"
              />
            </label>
            <label className="flex items-center gap-2 rounded-lg bg-[#f1f5f2] px-3 py-2">
              <Search className="h-4 w-4 text-[#00B14F]" />
              <input
                value={destination}
                onChange={(event) => setDestination(event.target.value)}
                className="min-w-0 flex-1 bg-transparent text-sm font-semibold outline-none"
                aria-label="Destination"
              />
            </label>
            <button
              type="button"
              onClick={() => loadNavigation(isDefaultDemoRoute)}
              className="rounded-lg bg-[#0b1f17] px-4 py-2 text-sm font-black text-white"
            >
              Route
            </button>
          </div>
        </div>

        <section className={`relative min-h-0 border-b border-black/5 bg-white ${isOverviewCollapsed ? 'px-4 py-2' : 'h-[30%] min-h-[210px]'}`}>
          {isOverviewCollapsed ? (
            <CollapsedSection
              icon={<MapPinned className="h-5 w-5 shrink-0 text-[#00B14F]" />}
              eyebrow="Section 1 collapsed"
              title={`2D route overview · ${route.summary.distance_text}`}
              onExpand={() => setIsOverviewCollapsed(false)}
            />
          ) : (
            <RouteMap
              route={route}
              currentStep={currentStep}
              previewing={isPreviewing}
              onCollapse={() => setIsOverviewCollapsed(true)}
            />
          )}

          {!isOverviewCollapsed && (
            <>
            <div className="absolute bottom-0 left-0 z-30 min-w-40 rounded-tr-xl bg-white/95 px-5 py-3 shadow-lg backdrop-blur">
              <div className="text-lg font-black">{route.summary.distance_text} · {route.summary.duration_text}</div>
            </div>
            <button
              type="button"
              className="absolute bottom-0 right-0 z-30 flex min-w-52 items-center justify-end gap-2 rounded-tl-xl bg-[#00B14F] px-4 py-3 text-sm font-black text-white shadow-lg"
              onClick={() => {
                setCurrentIndex(0);
                setIsPreviewing(true);
              }}
              aria-label="Preview journey"
            >
              <span>Direction Buddy</span>
              <span className="grid h-8 w-8 place-items-center rounded-full bg-white/18">
                <Play className="h-4 w-4 fill-current" />
              </span>
            </button>
          </>
          )}
        </section>

        <section className={`relative min-h-0 border-b border-black/5 bg-white ${isCueCollapsed ? 'px-4 py-2' : 'flex-1 touch-none select-none'}`} onClick={isCueCollapsed ? undefined : handleScreenTap}>
          {isCueCollapsed ? (
            <CollapsedSection
              icon={<Route className="h-5 w-5 shrink-0 text-[#00B14F]" />}
              eyebrow="Section 2 collapsed"
              title={`Cue steering · step ${currentIndex + 1} of ${route.steps.length}`}
              onExpand={() => setIsCueCollapsed(false)}
            />
          ) : (
            <>
          <div className="absolute left-0 right-0 top-0 z-20 flex gap-1 px-3 pt-3 pointer-events-none">
            {route.steps.map((_, idx) => (
              <div key={idx} className="h-1 flex-1 overflow-hidden rounded-full bg-black/10">
                <div 
                  className={`h-full bg-[#00B14F] transition-all duration-300 ${idx <= currentIndex ? 'w-full' : 'w-0'}`} 
                />
              </div>
            ))}
          </div>

          <div className="absolute right-4 top-6 z-20 rounded-full bg-white/90 px-3 py-1 text-xs font-black text-[#0b1f17] shadow">
            {progress}%
          </div>

          <SectionChrome
            icon={<Route className="h-4 w-4" />}
            title="Journey based steering"
            subtitle={`${currentStep.distance_text} to next cue`}
            onCollapse={() => setIsCueCollapsed(true)}
            emphasis
            compact
          />

          <AnimatePresence mode="popLayout" initial={false}>
            <StoryCard 
              key={currentStep.step_index}
              route={route}
              step={currentStep} 
              isActive={true}
              onSwipeLeft={handleNext}
              onSwipeRight={handlePrev}
            />
          </AnimatePresence>
            </>
          )}
        </section>

        <section className={`relative overflow-hidden bg-white ${isDestinationCollapsed ? 'px-4 py-2 pb-[calc(env(safe-area-inset-bottom)+0.5rem)]' : 'h-[18%] min-h-[118px] pb-[env(safe-area-inset-bottom)]'}`}>
          {isDestinationCollapsed ? (
            <CollapsedSection
              icon={<Utensils className="h-5 w-5 shrink-0 text-[#00B14F]" />}
              eyebrow="Section 3 collapsed"
              title={route.destination.label}
              onExpand={() => setIsDestinationCollapsed(false)}
            />
          ) : (
            <div className="relative h-full">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={route.steps.at(-1)?.landmark.image_url ?? '/demo-images/food-street.jpg'}
                alt={route.destination.label}
                className="h-full w-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-black/75 via-black/35 to-transparent" />
              <div className="absolute left-4 top-3 max-w-[72%] text-white">
                <div className="mb-1 inline-flex items-center gap-1 rounded-full bg-[#00B14F] px-2 py-1 text-[11px] font-black uppercase">
                  Destination
                </div>
                <div className="text-lg font-black leading-tight">{route.destination.label}</div>
                <div className="text-xs font-semibold opacity-90">Recognize the hawker centre roofline and Kadayanallur Street entrance.</div>
              </div>
              <button
                type="button"
                onClick={() => setIsDestinationCollapsed(true)}
                className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full bg-white/95 text-[#0b1f17] shadow-sm"
                aria-label="Collapse destination section"
              >
                <ChevronUp className="h-5 w-5" />
              </button>
            </div>
          )}
        </section>
      </section>
    </main>
  );
}

function CollapsedSection({
  icon,
  eyebrow,
  title,
  onExpand,
}: {
  icon: React.ReactNode;
  eyebrow: string;
  title: string;
  onExpand: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onExpand}
      className="mx-auto flex w-full max-w-5xl items-center justify-between rounded-lg bg-[#e8f5ee] px-4 py-3 text-left"
    >
      <span className="flex min-w-0 items-center gap-3">
        {icon}
        <span className="min-w-0">
          <span className="block text-xs font-black uppercase text-[#5b6f66]">{eyebrow}</span>
          <span className="block truncate text-sm font-black">{title}</span>
        </span>
      </span>
      <ChevronDown className="h-5 w-5 shrink-0" />
    </button>
  );
}

function SectionChrome({
  icon,
  title,
  subtitle,
  onCollapse,
  emphasis = false,
  compact = false,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  onCollapse: () => void;
  emphasis?: boolean;
  compact?: boolean;
}) {
  const frameClass = compact
    ? "absolute right-3 top-3 z-30 flex w-fit max-w-[min(21rem,calc(100%-1.5rem))] items-start justify-between gap-3 rounded-lg px-3 py-2 text-[#0b1f17] shadow-sm backdrop-blur"
    : "absolute left-3 right-3 top-3 z-30 flex items-start justify-between gap-3 rounded-lg px-3 py-2 text-[#0b1f17] shadow-sm backdrop-blur";

  return (
    <div className={`${frameClass} ${emphasis ? 'bg-[#e8f5ee]/95 ring-2 ring-[#00B14F]/20' : 'bg-white/95'}`}>
      <div className="flex min-w-0 items-start gap-2">
        <div className="mt-0.5 text-[#00B14F]">{icon}</div>
        <div className="min-w-0">
          <div className="truncate text-sm font-black">{title}</div>
          <div className="truncate text-xs font-semibold text-[#5b6f66]">{subtitle}</div>
        </div>
      </div>
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          onCollapse();
        }}
        className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#f1f5f2]"
        aria-label={`Collapse ${title}`}
      >
        <ChevronUp className="h-4 w-4" />
      </button>
    </div>
  );
}
