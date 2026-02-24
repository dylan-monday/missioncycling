'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';

// =============================================================================
// Sponsor Configuration
// =============================================================================

interface Sponsor {
  id: string;
  logo: string;      // Path to logo PNG
  audio: string;     // Path to audio read MP3
}

const SPONSORS: Sponsor[] = [
  { id: 'amnesia', logo: '/sponsors/amnesia.png', audio: '/sponsors/_audio/amnesia.mp3' },
  { id: 'anchor-brewing', logo: '/sponsors/anchor brewing.png', audio: '/sponsors/_audio/anchor brewing.mp3' },
  { id: 'aquarius-records', logo: '/sponsors/aquarius records.png', audio: '/sponsors/_audio/aquarius records.mp3' },
  { id: 'bi-rite-market', logo: '/sponsors/bi rite market.png', audio: '/sponsors/_audio/birite market.mp3' },
  { id: 'coffee-bar', logo: '/sponsors/coffee bar.png', audio: '/sponsors/_audio/coffee bar.mp3' },
  { id: 'delfina', logo: '/sponsors/delfina.png', audio: '/sponsors/_audio/delfina.mp3' },
  { id: 'delfina-pizzeria', logo: '/sponsors/delfina pizzeria.png', audio: '/sponsors/_audio/delfina pizzeria.mp3' },
  { id: 'flour-and-water', logo: '/sponsors/flour and water.png', audio: '/sponsors/_audio/flour and water.mp3' },
  { id: 'live-fit', logo: '/sponsors/live fit.png', audio: '/sponsors/_audio/live fit.mp3' },
  { id: 'paxton-gate', logo: '/sponsors/paxton gate.png', audio: '/sponsors/_audio/paxton gate.mp3' },
  { id: 'range', logo: '/sponsors/range.png', audio: '/sponsors/_audio/range.mp3' },
  { id: 'ritual-coffee', logo: '/sponsors/ritual coffee roasters.png', audio: '/sponsors/_audio/ritual coffee roasters.mp3' },
  { id: 'self-edge', logo: '/sponsors/self edge.png', audio: '/sponsors/_audio/self edge.mp3' },
  { id: 'tartine', logo: '/sponsors/tartine bakery.png', audio: '/sponsors/_audio/tartine bakery.mp3' },
  { id: 'the-500-club', logo: '/sponsors/the 500 club.png', audio: '/sponsors/_audio/the 500 club.mp3' },
  { id: 'monks-kettle', logo: '/sponsors/the monks kettle.png', audio: '/sponsors/_audio/the monks kettle.mp3' },
  { id: 'unionmade', logo: '/sponsors/union made.png', audio: '/sponsors/_audio/unionmade.mp3' },
  { id: 'weird-fish', logo: '/sponsors/weird fish.png', audio: '/sponsors/_audio/weird fish.mp3' },
  { id: 'woodhouse', logo: '/sponsors/woodhouse fish company.png', audio: '/sponsors/_audio/woodhouse fish company.mp3' },
];

const INTRO_CLIPS = [
  '/sponsors/_audio/Mission cycling.mp3',
  '/sponsors/_audio/The Mission Cycling Club of San Francisco.mp3',
];

const SPONSORED_BY_CLIP = '/sponsors/_audio/sponsored by.mp3';

const AND_CLIPS = [
  '/sponsors/_audio/and 01.mp3',
  '/sponsors/_audio/and 02.mp3',
  '/sponsors/_audio/and 03.mp3',
];

// =============================================================================
// Animation Variants
// =============================================================================

const easeOut = [0.16, 1, 0.3, 1] as const;

// Card wrapper just handles scale
const cardWrapperVariants = {
  hidden: {
    scale: 0.85,
  },
  visible: {
    scale: 1,
    transition: {
      duration: 0.7,
      ease: [0.16, 1, 0.3, 1] // ease out expo
    }
  },
  exit: {
    scale: 0.85,
    transition: {
      duration: 0.5,
      ease: [0.4, 0, 1, 1] // ease in
    }
  }
};

// Content fades in/out
const cardContentVariants = {
  hidden: {
    opacity: 0,
  },
  visible: {
    opacity: 1,
    transition: {
      duration: 0.5,
      ease: [0.16, 1, 0.3, 1]
    }
  },
  exit: {
    opacity: 0,
    transition: {
      duration: 0.4,
      ease: [0.4, 0, 1, 1]
    }
  }
};

const logoVariants = {
  hidden: { opacity: 0, scale: 0.9 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.8, ease: easeOut }
  },
  exit: {
    opacity: 0,
    transition: { duration: 0.8, ease: easeOut }
  }
};

const sponsoredByVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: 0.6 }
  },
  slideUp: {
    y: '-120%',
    transition: { duration: 0.8, ease: easeOut }
  },
  exit: {
    opacity: 0,
    transition: { duration: 0.6 }
  }
};

// =============================================================================
// Component
// =============================================================================

type Phase = 'intro' | 'sponsored-by' | 'sponsors' | 'outro';

interface CommercialBreakProps {
  onComplete: () => void;
  sponsorCount?: number;
  autoPlay?: boolean;
  volume?: number;
  shownSponsors?: Set<string>;
  onSponsorsShown?: (ids: string[]) => void;
  backgroundAudioRef?: React.RefObject<HTMLAudioElement | null>;
  backgroundVolume?: number; // Normal background volume (default 0.11)
  backgroundDuckVolume?: number; // Ducked volume during voiceover (default 0.03)
  audioEnabled?: boolean;
}

export default function CommercialBreak({
  onComplete,
  sponsorCount = 3,
  autoPlay = true,
  volume = 0.20,
  shownSponsors = new Set(),
  onSponsorsShown,
  backgroundAudioRef,
  backgroundVolume = 0.11,
  backgroundDuckVolume = 0.03,
  audioEnabled = true,
}: CommercialBreakProps) {
  const [phase, setPhase] = useState<Phase>('intro');
  const [showMcLogo, setShowMcLogo] = useState(false);
  const [showSponsoredBy, setShowSponsoredBy] = useState(false);
  const [sponsoredBySlideUp, setSponsoredBySlideUp] = useState(false);
  const [currentSponsorIndex, setCurrentSponsorIndex] = useState(-1);
  const [selectedSponsors, setSelectedSponsors] = useState<Sponsor[]>([]);
  const [isComplete, setIsComplete] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const hasInitialized = useRef(false);
  const onSponsorsShownRef = useRef(onSponsorsShown);

  // Keep ref updated
  useEffect(() => {
    onSponsorsShownRef.current = onSponsorsShown;
  }, [onSponsorsShown]);

  // Select random sponsors on mount (only once)
  useEffect(() => {
    if (hasInitialized.current) return;
    hasInitialized.current = true;

    const availableSponsors = SPONSORS.filter(s => !shownSponsors.has(s.id));
    const pool = availableSponsors.length >= sponsorCount
      ? availableSponsors
      : SPONSORS; // Reset if we've shown all

    const shuffled = [...pool].sort(() => Math.random() - 0.5);
    const selected = shuffled.slice(0, sponsorCount);
    setSelectedSponsors(selected);

    if (onSponsorsShownRef.current) {
      onSponsorsShownRef.current(selected.map(s => s.id));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Cleanup
  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  // Simple delay helper
  const delay = (ms: number): Promise<void> => {
    return new Promise(resolve => {
      timeoutRef.current = setTimeout(resolve, ms);
    });
  };

  // Duck background music
  const duckBackground = useCallback(() => {
    if (backgroundAudioRef?.current) {
      backgroundAudioRef.current.volume = backgroundDuckVolume;
    }
  }, [backgroundAudioRef, backgroundDuckVolume]);

  // Restore background music
  const restoreBackground = useCallback(() => {
    if (backgroundAudioRef?.current) {
      backgroundAudioRef.current.volume = backgroundVolume;
    }
  }, [backgroundAudioRef, backgroundVolume]);

  // Play audio helper
  const playAudio = useCallback((src: string): Promise<number> => {
    return new Promise((resolve) => {
      // If audio disabled, return default duration without playing
      if (!audioEnabled) {
        resolve(2);
        return;
      }

      if (audioRef.current) {
        audioRef.current.pause();
      }

      // Duck background music while voiceover plays
      duckBackground();

      const audio = new Audio(src);
      audio.volume = volume;
      audioRef.current = audio;

      // Timeout fallback in case audio never loads
      const timeoutId = setTimeout(() => {
        console.warn('[CommercialBreak] Audio load timeout:', src);
        resolve(2);
      }, 5000);

      let resolved = false;
      const handleLoaded = () => {
        if (resolved) return;
        resolved = true;
        clearTimeout(timeoutId);
        console.log('[CommercialBreak] Audio loaded:', src, 'duration:', audio.duration);
        audio.play().catch(e => console.error('[CommercialBreak] Play error:', e));
        resolve(audio.duration);
      };

      audio.addEventListener('loadedmetadata', handleLoaded);
      audio.addEventListener('canplaythrough', handleLoaded);

      audio.addEventListener('error', (e) => {
        if (resolved) return;
        resolved = true;
        clearTimeout(timeoutId);
        console.error('[CommercialBreak] Audio failed to load:', src, e);
        resolve(2); // Fallback duration
      });

      // Start loading
      audio.load();
    });
  }, [volume, duckBackground, audioEnabled]);

  // Start sequence on mount
  useEffect(() => {
    if (!autoPlay || selectedSponsors.length === 0) return;

    let cancelled = false;

    const runSequence = async () => {
      console.log('[CommercialBreak] Starting sequence with', selectedSponsors.length, 'sponsors');

      // Phase 1: Intro with MC logo
      setPhase('intro');

      // Wait 500ms then show MC logo
      await delay(500);
      if (cancelled) return;
      console.log('[CommercialBreak] Showing MC logo');

      setShowMcLogo(true);
      const introClip = INTRO_CLIPS[Math.floor(Math.random() * INTRO_CLIPS.length)];
      console.log('[CommercialBreak] Playing intro:', introClip);

      let introDuration: number;
      try {
        introDuration = await playAudio(introClip);
        console.log('[CommercialBreak] Intro duration:', introDuration);
      } catch (e) {
        console.error('[CommercialBreak] Audio error:', e);
        introDuration = 2;
      }

      // Hold for audio duration + 0.5s
      await delay((introDuration + 0.5) * 1000);
      if (cancelled) return;

      // Fade out MC logo
      console.log('[CommercialBreak] Fading out MC logo');
      setShowMcLogo(false);
      await delay(800);
      if (cancelled) return;

      // Phase 2: Show "sponsored by"
      console.log('[CommercialBreak] Showing sponsored by');
      setPhase('sponsored-by');
      setShowSponsoredBy(true);

      let sponsoredByDuration: number;
      try {
        sponsoredByDuration = await playAudio(SPONSORED_BY_CLIP);
      } catch (e) {
        console.error('[CommercialBreak] Sponsored by audio error:', e);
        sponsoredByDuration = 1;
      }

      // Hold for audio + 0.3s
      await delay((sponsoredByDuration + 0.3) * 1000);
      if (cancelled) return;

      // Slide "sponsored by" up and start sponsors
      console.log('[CommercialBreak] Starting sponsors phase');
      setSponsoredBySlideUp(true);
      setPhase('sponsors');
      setCurrentSponsorIndex(0);
    };

    runSequence();

    return () => {
      cancelled = true;
    };
  }, [autoPlay, selectedSponsors, playAudio]);

  // Handle sponsor transitions
  useEffect(() => {
    if (phase !== 'sponsors' || currentSponsorIndex < 0) return;

    let cancelled = false;

    const handleSponsorPhase = async () => {
      if (currentSponsorIndex >= selectedSponsors.length) {
        // All sponsors shown, close the window
        setShowSponsoredBy(false);

        // Restore background music
        restoreBackground();

        // Quick fade out
        await delay(400);
        if (cancelled) return;
        setIsComplete(true);
        onComplete();
        return;
      }

      const sponsor = selectedSponsors[currentSponsorIndex];
      const isLastSponsor = currentSponsorIndex === selectedSponsors.length - 1;

      // If this is the last sponsor, play "and" first
      if (isLastSponsor && selectedSponsors.length > 1) {
        const andClip = AND_CLIPS[Math.floor(Math.random() * AND_CLIPS.length)];
        const andDuration = await playAudio(andClip);
        // Tight transition - start sponsor just as "and" finishes
        await delay(andDuration * 1000);
        if (cancelled) return;
      }

      // Play sponsor audio and hold for duration + 2s
      const duration = await playAudio(sponsor.audio);
      const holdTime = (duration + 2) * 1000;

      await delay(holdTime);
      if (cancelled) return;
      setCurrentSponsorIndex(prev => prev + 1);
    };

    handleSponsorPhase();

    return () => {
      cancelled = true;
    };
  }, [phase, currentSponsorIndex, selectedSponsors, playAudio, onComplete, restoreBackground]);

  if (isComplete) return null;

  return (
    <AnimatePresence>
      {/* Wrapper handles scale animation */}
      <motion.div
        className="commercial-break-overlay"
        variants={cardWrapperVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
      >
        {/* Frosted Glass Card - blur is always visible */}
        <div className="commercial-card">
          {/* Content fades in/out */}
          <motion.div
            className="commercial-card-content"
            variants={cardContentVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
          >
            {/* Corner Accents */}
            <div className="corner-accents">
              {[0, 1, 2, 3].map((i) => (
                <motion.div
                  key={i}
                  className={`corner corner-${i}`}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 + i * 0.08, duration: 0.4 }}
                />
              ))}
            </div>

            {/* Top/Bottom Edge Lines */}
            <div className="edge-line edge-top" />
            <div className="edge-line edge-bottom" />

          {/* MC Logo (Intro Phase) */}
          <AnimatePresence>
            {showMcLogo && (
              <motion.div
                className="mc-logo-container"
                variants={logoVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
              >
                <Image
                  src="/mc_logo.svg"
                  alt="Mission Cycling"
                  width={160}
                  height={160}
                  className="mc-logo"
                />
              </motion.div>
            )}
          </AnimatePresence>

          {/* "Sponsored By" Text */}
          <AnimatePresence>
            {showSponsoredBy && (
              <motion.div
                className="sponsored-by"
                variants={sponsoredByVariants}
                initial="hidden"
                animate={sponsoredBySlideUp ? 'slideUp' : 'visible'}
                exit="exit"
              >
                SPONSORED BY
              </motion.div>
            )}
          </AnimatePresence>

          {/* Sponsor Logos */}
          <AnimatePresence mode="wait">
            {phase === 'sponsors' && currentSponsorIndex >= 0 && currentSponsorIndex < selectedSponsors.length && (
              <motion.div
                key={selectedSponsors[currentSponsorIndex].id}
                className="sponsor-logo-container"
                variants={logoVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
              >
                <img
                  src={selectedSponsors[currentSponsorIndex].logo}
                  alt="Sponsor"
                  className="sponsor-logo"
                />
              </motion.div>
            )}
          </AnimatePresence>

          </motion.div>
        </div>

        <style jsx global>{`
          .commercial-break-overlay {
            position: fixed;
            inset: 0;
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 100;
            pointer-events: none;
          }

          .commercial-card {
            position: relative;
            width: 72vw;
            max-width: 940px;
            aspect-ratio: 16 / 9;
            background: rgba(255, 255, 255, 0.06);
            backdrop-filter: blur(12px) saturate(1.3) brightness(1.02);
            -webkit-backdrop-filter: blur(12px) saturate(1.3) brightness(1.02);
            border: 1px solid rgba(255, 255, 255, 0.15);
            border-radius: 12px;
            overflow: hidden;
            will-change: transform;
            transform-origin: center center;
          }

          .commercial-card-content {
            position: absolute;
            inset: 0;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
          }

          /* Edge Lines */
          .edge-line {
            position: absolute;
            left: 10%;
            right: 10%;
            height: 1px;
            background: linear-gradient(
              90deg,
              transparent 0%,
              rgba(255, 255, 255, 0.3) 20%,
              rgba(255, 255, 255, 0.3) 80%,
              transparent 100%
            );
          }
          .edge-top { top: 0; }
          .edge-bottom { bottom: 0; }

          /* Corner Accents */
          .corner-accents {
            position: absolute;
            inset: 12px;
            pointer-events: none;
          }
          .corner {
            position: absolute;
            width: 18px;
            height: 18px;
            border-color: rgba(255, 255, 255, 0.2);
            border-style: solid;
            border-width: 0;
          }
          .corner-0 { top: 0; left: 0; border-top-width: 1px; border-left-width: 1px; }
          .corner-1 { top: 0; right: 0; border-top-width: 1px; border-right-width: 1px; }
          .corner-2 { bottom: 0; right: 0; border-bottom-width: 1px; border-right-width: 1px; }
          .corner-3 { bottom: 0; left: 0; border-bottom-width: 1px; border-left-width: 1px; }

          /* MC Logo */
          .mc-logo-container {
            position: absolute;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          .mc-logo {
            width: 160px;
            height: 160px;
            object-fit: contain;
          }

          /* Sponsored By Text */
          .sponsored-by {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            color: rgba(255, 255, 255, 0.4);
            font-size: clamp(9px, 1.2vw, 14px);
            letter-spacing: 0.4em;
            text-transform: uppercase;
            font-weight: 500;
          }

          /* Sponsor Logo */
          .sponsor-logo-container {
            position: absolute;
            inset: 0;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 8% 18%; /* less top/bottom, more left/right */
          }
          .sponsor-logo {
            max-width: 100%;
            max-height: 100%;
            object-fit: contain;
            filter: drop-shadow(0 2px 20px rgba(0, 0, 0, 0.3));
          }
        `}</style>
      </motion.div>
    </AnimatePresence>
  );
}
