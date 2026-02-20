'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import LeaderboardCard from '@/components/LeaderboardCard';
import Ticker from '@/components/Ticker';
import SplashScreen from '@/components/SplashScreen';
import segmentsData from '@/data/segments.json';

const LEADERBOARD_ANIMATION = 8000; // Time for leaderboard to fully appear
const VIEWING_DURATION = 30000; // 30 seconds viewing the complete leaderboard
const SEGMENT_DURATION = LEADERBOARD_ANIMATION + VIEWING_DURATION; // Total time per segment
const CLOSE_DURATION = 600; // Card close animation
const INITIAL_DELAY = 800; // Wait for background to appear before opening card

const AUDIO_TRACKS = [
  '/victory-circuit.mp3',
  '/triomphe-en-vhs.mp3',
  '/stadium-flash-86.mp3',
];

const SEGMENT_VIDEOS: Record<string, string> = {
  'hawk-hill': '/video/mc broadcast 01.mp4',
  'radio-road': '/video/mc broadcast 02.mp4',
  'old-la-honda': '/video/mc broadcast 03.mp4',
  'hwy1-muir-beach': '/video/mc broadcast 04.mp4',
  'alpe-dhuez': '/video/mc broadcast 05.mp4',
  'four-corners': '/video/mc broadcast 01.mp4',
  'bofax-climb': '/video/mc broadcast 02.mp4',
  'bourg-doisans': '/video/mc broadcast 05.mp4',
};

export default function Home() {
  const [showSplash, setShowSplash] = useState(true);
  const [activeSegmentIndex, setActiveSegmentIndex] = useState(0);
  const [isCardOpen, setIsCardOpen] = useState(false); // Start closed
  const [displayedSegmentIndex, setDisplayedSegmentIndex] = useState(0);
  const [musicEnabled, setMusicEnabled] = useState(true);
  const [currentTrack, setCurrentTrack] = useState(() =>
    Math.floor(Math.random() * AUDIO_TRACKS.length)
  );
  const audioRef = useRef<HTMLAudioElement>(null);
  const audioStartedRef = useRef(false);

  // Pick a different random track
  const pickNextTrack = useCallback(() => {
    setCurrentTrack(prev => {
      let next;
      do {
        next = Math.floor(Math.random() * AUDIO_TRACKS.length);
      } while (next === prev && AUDIO_TRACKS.length > 1);
      return next;
    });
  }, []);

  // When track ends, play a different one
  const handleTrackEnd = useCallback(() => {
    pickNextTrack();
  }, [pickNextTrack]);

  // Auto-play when track changes (if music was playing)
  useEffect(() => {
    if (audioRef.current && audioStartedRef.current && musicEnabled) {
      audioRef.current.volume = 0.11;
      audioRef.current.play().catch(() => {});
    }
  }, [currentTrack, musicEnabled]);

  const visibleSegments = segmentsData.segments.filter(s => s.visible);
  const activeSegment = visibleSegments[displayedSegmentIndex];

  // Handle splash screen click - starts everything
  const handleSplashClick = useCallback(() => {
    setShowSplash(false);

    // Start audio
    if (audioRef.current) {
      audioRef.current.volume = 0.11;
      audioRef.current.play().catch(() => {});
      audioStartedRef.current = true;
      setMusicEnabled(true);
    }

    // Open card after a brief delay
    setTimeout(() => setIsCardOpen(true), INITIAL_DELAY);
  }, []);

  // Toggle music with 'M' key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'm' || e.key === 'M') {
        if (audioRef.current) {
          if (audioRef.current.paused) {
            audioRef.current.volume = 0.11;
            audioRef.current.play().catch(() => {});
            audioStartedRef.current = true;
            setMusicEnabled(true);
          } else {
            audioRef.current.pause();
            setMusicEnabled(false);
          }
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const nextSegment = useCallback(() => {
    // Close the card first
    setIsCardOpen(false);

    // After close animation, update segment and reopen immediately
    setTimeout(() => {
      setDisplayedSegmentIndex((prev) => (prev + 1) % visibleSegments.length);
      setIsCardOpen(true);
    }, CLOSE_DURATION);
  }, [visibleSegments.length]);

  const prevSegment = useCallback(() => {
    setIsCardOpen(false);

    setTimeout(() => {
      setDisplayedSegmentIndex((prev) => (prev - 1 + visibleSegments.length) % visibleSegments.length);
      setIsCardOpen(true);
    }, CLOSE_DURATION);
  }, [visibleSegments.length]);

  // Timer restarts after each segment change to ensure full viewing time
  // Only runs after splash is dismissed
  useEffect(() => {
    if (showSplash) return;
    const timer = setTimeout(nextSegment, SEGMENT_DURATION);
    return () => clearTimeout(timer);
  }, [nextSegment, displayedSegmentIndex, showSplash]);

  return (
    <>
      {/* Splash Screen */}
      <AnimatePresence>
        {showSplash && <SplashScreen onStart={handleSplashClick} />}
      </AnimatePresence>

      {/* Background Video */}
      <div className="background">
        <AnimatePresence>
          <motion.video
            key={activeSegment?.id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8, ease: 'easeInOut' }}
            className="background-video"
            autoPlay
            muted
            loop
            playsInline
          >
            <source
              src={activeSegment ? SEGMENT_VIDEOS[activeSegment.id] : '/video/mc broadcast 01.mp4'}
              type="video/mp4"
            />
          </motion.video>
        </AnimatePresence>
      </div>

      {/* Main Container */}
      <div className="main-container">
        {/* Main Card with Frame Edges */}
        <motion.div
          className="card"
          initial={{ width: 0 }}
          animate={{ width: isCardOpen ? 1024 : 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        >
          {/* Left Frame Edge */}
          <motion.div
            className="frame-edge left"
            onClick={prevSegment}
            animate={{ left: isCardOpen ? '-25px' : '-60px' }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          >
            <Image src="/frame edge.png" alt="" width={60} height={515} />
          </motion.div>

          {/* Right Frame Edge */}
          <motion.div
            className="frame-edge right"
            onClick={nextSegment}
            animate={{ right: isCardOpen ? '-25px' : '-60px' }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          >
            <Image src="/frame edge.png" alt="" width={60} height={515} />
          </motion.div>

          {/* Left Panel */}
          <motion.div
            className="card-left"
            initial={{ opacity: 0 }}
            animate={{ opacity: isCardOpen ? 1 : 0 }}
            transition={{ duration: 0.3, delay: isCardOpen ? 0.4 : 0 }}
          >
            <div className="card-left-inner">
              <div className="logo">
                <Image src="/mc_logo.svg" alt="Mission Cycling" width={120} height={120} className="object-contain" />
              </div>
              <h1 className="segment-name">{activeSegment?.name}</h1>
              <div className="segment-stats">
                <div className="stat-row">
                  <span className="stat-label">Distance:</span>
                  <span className="stat-value">{activeSegment?.distance.mi}m</span>
                </div>
                <div className="stat-row">
                  <span className="stat-label">Elev. Gain:</span>
                  <span className="stat-value">{activeSegment?.elevation.gain_ft}ft</span>
                </div>
                <div className="stat-row">
                  <span className="stat-label">Avg Grade:</span>
                  <span className="stat-value">{activeSegment?.grade}%</span>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Right Panel - Leaderboard */}
          <motion.div
            className="card-right"
            initial={{ opacity: 0 }}
            animate={{ opacity: isCardOpen ? 1 : 0 }}
            transition={{ duration: 0.3, delay: isCardOpen ? 0.4 : 0 }}
          >
            {activeSegment && (
              <LeaderboardCard key={activeSegment.id} segment={activeSegment} isOpen={isCardOpen} />
            )}
          </motion.div>
        </motion.div>
      </div>

      {/* Ticker */}
      <Ticker />

      {/* Background Music */}
      <audio
        ref={audioRef}
        src={AUDIO_TRACKS[currentTrack]}
        onEnded={handleTrackEnd}
        preload="auto"
      />
    </>
  );
}
