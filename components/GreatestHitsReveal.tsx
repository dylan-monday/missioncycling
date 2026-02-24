'use client';

import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface GreatestHit {
  id: string;
  title: string;
  stat_value: string;
  description: string;
  category: string;
}

interface GreatestHitsRevealProps {
  hits: GreatestHit[];
  onComplete: () => void;
  onUserInteraction?: () => void; // Called on first user click (for starting music)
}

export default function GreatestHitsReveal({ hits, onComplete, onUserInteraction }: GreatestHitsRevealProps) {
  const [phase, setPhase] = useState<'title' | 'cards' | 'fadeout'>('title');
  const [currentHitIndex, setCurrentHitIndex] = useState(0);
  const hasCompletedRef = useRef(false);
  const hasInteractedRef = useRef(false);

  const handleSkip = () => {
    // Trigger user interaction callback (for music)
    if (!hasInteractedRef.current && onUserInteraction) {
      hasInteractedRef.current = true;
      onUserInteraction();
    }
    // Skip to broadcast
    if (!hasCompletedRef.current) {
      hasCompletedRef.current = true;
      onComplete();
    }
  };

  const displayHits = hits.slice(0, 5); // Max 5 hits

  console.log('[GreatestHitsReveal] Rendering with', displayHits.length, 'hits, phase:', phase, 'index:', currentHitIndex);

  // Sequence: title (2.5s) → cards (4.5s each) → fadeout (1s) → complete
  useEffect(() => {
    if (hasCompletedRef.current) return;

    // If no hits, skip to broadcast after brief pause
    if (displayHits.length === 0) {
      console.log('[GreatestHitsReveal] No hits, skipping...');
      const timer = setTimeout(() => {
        if (!hasCompletedRef.current) {
          hasCompletedRef.current = true;
          onComplete();
        }
      }, 500);
      return () => clearTimeout(timer);
    }

    if (phase === 'title') {
      // Show title for 2.5 seconds
      const timer = setTimeout(() => {
        console.log('[GreatestHitsReveal] Title done, showing cards');
        setPhase('cards');
      }, 2500);
      return () => clearTimeout(timer);
    }

    if (phase === 'cards') {
      if (currentHitIndex >= displayHits.length) {
        // All cards shown, transition to fadeout
        console.log('[GreatestHitsReveal] All cards shown, fading out');
        setPhase('fadeout');
        return;
      }

      // Show current card for 4.5 seconds
      console.log('[GreatestHitsReveal] Showing card', currentHitIndex + 1, 'of', displayHits.length);
      const timer = setTimeout(() => {
        setCurrentHitIndex(prev => prev + 1);
      }, 4500);
      return () => clearTimeout(timer);
    }

    if (phase === 'fadeout') {
      // Fade out for 1 second, then complete
      console.log('[GreatestHitsReveal] Fadeout phase, completing in 1s');
      const timer = setTimeout(() => {
        if (!hasCompletedRef.current) {
          hasCompletedRef.current = true;
          console.log('[GreatestHitsReveal] Calling onComplete');
          onComplete();
        }
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [phase, currentHitIndex, displayHits.length, onComplete]);

  const currentHit = displayHits[currentHitIndex];

  // Don't render anything if we've completed
  if (hasCompletedRef.current) {
    return null;
  }

  return (
    <motion.div
      className="fixed inset-0 bg-black flex items-center justify-center"
      animate={{
        opacity: phase === 'fadeout' ? 0 : 1,
      }}
      transition={{ duration: 1 }}
    >
      <AnimatePresence mode="wait">
        {/* Title phase */}
        {phase === 'title' && displayHits.length > 0 && (
          <motion.h1
            key="title"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.1 }}
            transition={{ duration: 0.6 }}
            className="text-white text-4xl tracking-widest"
            style={{ fontFamily: 'tablet-gothic, sans-serif' }}
          >
            YOUR GREATEST HITS
          </motion.h1>
        )}

        {/* Card phase */}
        {phase === 'cards' && currentHit && (
          <motion.div
            key={currentHit.id}
            initial={{ opacity: 0, scale: 0.8, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{
              duration: 0.5,
              ease: [0.22, 1, 0.36, 1],
            }}
            className="text-center px-8 max-w-xl"
          >
            {/* Title */}
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.4 }}
              className="text-3xl text-white tracking-wide mb-4"
              style={{ fontFamily: 'tablet-gothic, sans-serif' }}
            >
              {currentHit.title}
            </motion.h2>

            {/* Stat value - big and prominent */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              className="text-6xl text-[#BAE0F7] font-bold mb-4"
              style={{ fontFamily: 'tablet-gothic, sans-serif' }}
            >
              {currentHit.stat_value}
            </motion.div>

            {/* Description */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4, duration: 0.4 }}
              className="text-white/70 text-lg"
            >
              {currentHit.description}
            </motion.p>

            {/* Card counter with skip */}
            {displayHits.length > 1 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="absolute bottom-12 left-1/2 -translate-x-1/2 flex items-center gap-4 text-sm"
              >
                <span className="text-white/30">
                  {currentHitIndex + 1} of {displayHits.length}
                </span>
                <button
                  onClick={handleSkip}
                  className="text-white/50 hover:text-white/80 transition-colors tracking-wide"
                  style={{ fontFamily: 'tablet-gothic, sans-serif' }}
                >
                  [skip]
                </button>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
