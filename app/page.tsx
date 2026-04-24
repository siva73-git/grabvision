'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { LocateFixed, Play, RefreshCw, Search } from 'lucide-react';
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
  const currentStep = route.steps[currentIndex] ?? route.steps[0];
  const progress = useMemo(
    () => Math.round(((currentIndex + 1) / route.steps.length) * 100),
    [currentIndex, route.steps.length],
  );

  const triggerHaptic = useCallback(() => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(50);
    }
  }, []);

  const loadNavigation = useCallback(async (demo = false) => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/navigation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          demo,
          origin: { label: origin, coordinate: DEMO_ORIGIN.coordinate },
          destination: { label: destination, coordinate: DEMO_DESTINATION.coordinate },
        }),
      });
      const data = (await response.json()) as NavigationRoute;
      setRoute(data);
      setCurrentIndex(0);
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
      <section className="grid h-full grid-rows-[auto_minmax(0,38%)_minmax(0,1fr)]">
        <div className="z-30 border-b border-black/5 bg-white px-4 pb-3 pt-[calc(env(safe-area-inset-top)+1rem)] shadow-sm">
          <div className="mx-auto flex max-w-5xl items-center justify-between gap-3">
            <div>
              <div className="text-xs font-black uppercase text-[#00B14F]">GrabVision</div>
              <div className="text-xl font-black">Walk by what you see</div>
            </div>
            <button
              type="button"
              className="grid h-11 w-11 place-items-center rounded-full bg-[#00B14F] text-white shadow-sm"
              onClick={() => loadNavigation(false)}
              aria-label="Refresh live route"
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
              onClick={() => loadNavigation(false)}
              className="rounded-lg bg-[#0b1f17] px-4 py-2 text-sm font-black text-white"
            >
              Route
            </button>
          </div>
        </div>

        <div className="relative min-h-0">
          <RouteMap route={route} currentStep={currentStep} previewing={isPreviewing} />
          <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between rounded-lg bg-white/95 px-4 py-3 shadow-lg backdrop-blur">
            <div>
              <div className="text-xs font-bold uppercase text-[#5b6f66]">{route.summary.confidence_text}</div>
              <div className="text-lg font-black">{route.summary.distance_text} · {route.summary.duration_text}</div>
            </div>
            <button
              type="button"
              className="grid h-11 w-11 place-items-center rounded-full bg-[#00B14F] text-white"
              onClick={() => {
                setCurrentIndex(0);
                setIsPreviewing(true);
              }}
              aria-label="Preview journey"
            >
              <Play className="h-5 w-5 fill-current" />
            </button>
          </div>
        </div>

        <div className="relative min-h-0 touch-none select-none pb-[env(safe-area-inset-bottom)]" onClick={handleScreenTap}>
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

          <AnimatePresence mode="popLayout" initial={false}>
            <StoryCard 
              key={currentStep.step_index}
              step={currentStep} 
              isActive={true}
              onSwipeLeft={handleNext}
              onSwipeRight={handlePrev}
            />
          </AnimatePresence>
        </div>
      </section>
    </main>
  );
}
