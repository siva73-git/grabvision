'use client';

import { motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, ArrowUp, CircleDot, Flag, Navigation } from 'lucide-react';
import { NavStep } from '@/lib/navigation';

interface StoryCardProps {
  step: NavStep;
  isActive: boolean;
  onSwipeLeft: () => void;
  onSwipeRight: () => void;
}

export default function StoryCard({ step, isActive, onSwipeLeft, onSwipeRight }: StoryCardProps) {
  return (
    <motion.div
      className="absolute inset-0 flex h-full w-full flex-col bg-white text-[#0b1f17]"
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
      <div className="relative min-h-0 flex-1 bg-[#e7f6ef]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img 
          src={step.landmark.image_url || 'https://images.unsplash.com/photo-1518005020951-eccb494ad742?q=80&w=1400&auto=format&fit=crop'} 
          alt={step.landmark.name}
          className="h-full w-full object-cover"
          onError={(e) => { e.currentTarget.src = 'https://images.unsplash.com/photo-1518005020951-eccb494ad742?q=80&w=1400&auto=format&fit=crop'; }}
        />
        <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-black/75 to-transparent" />
        <div className="absolute bottom-4 left-4 right-4 text-white">
          <div className="mb-2 inline-flex rounded-full bg-[#00B14F] px-3 py-1 text-xs font-bold uppercase">
            {step.landmark.provider}
          </div>
          <div className="text-sm font-semibold opacity-90">{step.landmark.category}</div>
          <div className="text-3xl font-black leading-tight">{step.landmark.name}</div>
        </div>
      </div>

      <div className="flex min-h-[245px] flex-col justify-center bg-white p-6 pb-8">
        <div className="mb-5 flex items-center gap-3 text-[#00B14F]">
          <div className="grid h-12 w-12 place-items-center rounded-full bg-[#e4f8ed]">
            {renderActionIcon(step.action_icon)}
          </div>
          <div>
            <div className="text-lg font-black text-[#0b1f17]">{step.distance_text}</div>
            <div className="flex items-center gap-1 text-sm font-semibold text-[#5b6f66]">
              <Navigation className="h-4 w-4" />
              {step.eta_remaining} remaining
            </div>
          </div>
        </div>
        <h1 className="text-3xl font-black leading-tight text-[#0b1f17] sm:text-4xl">
          {step.instruction}
        </h1>
      </div>
    </motion.div>
  );
}

const swipeConfidenceThreshold = 10000;
const swipePower = (offset: number, velocity: number) => {
  return Math.abs(offset) * velocity;
};

function renderActionIcon(action: NavStep["action_icon"]) {
  switch (action) {
    case "turn-left":
      return <ArrowLeft className="h-6 w-6" />;
    case "turn-right":
      return <ArrowRight className="h-6 w-6" />;
    case "arrive":
      return <Flag className="h-6 w-6" />;
    case "depart":
      return <CircleDot className="h-6 w-6" />;
    default:
      return <ArrowUp className="h-6 w-6" />;
  }
}
