'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import LeaderboardCard from '@/components/LeaderboardCard';
import Ticker from '@/components/Ticker';
import SplashScreen from '@/components/SplashScreen';
import CommercialBreak from '@/components/CommercialBreak';
import SyncSequence from '@/components/SyncSequence';
import GreatestHitsReveal from '@/components/GreatestHitsReveal';
import segmentsData from '@/data/segments.json';

// =============================================================================
// Constants
// =============================================================================

const LEADERBOARD_ANIMATION = 8000;
const VIEWING_DURATION = 30000;
const SEGMENT_DURATION = LEADERBOARD_ANIMATION + VIEWING_DURATION;
const CLOSE_DURATION = 600;
const INITIAL_DELAY = 800;
const COMMERCIAL_INTERVAL = 3;

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

// =============================================================================
// Types
// =============================================================================

type AppState =
  | 'loading'         // Initial load, checking session
  | 'splash'          // Showing splash screen (no session)
  | 'authenticating'  // Redirecting to/from Strava
  | 'welcome'         // Showing welcome with profile pic
  | 'syncing'         // Sync sequence playing
  | 'greatest_hits'   // Greatest hits reveal
  | 'broadcast_intro' // Brief intro before broadcast
  | 'broadcast';      // Main broadcast loop

interface UserData {
  id: string;
  name: string;
  first_name: string;
  last_name: string;
  profile_pic: string | null;
  city: string | null;
  state: string | null;
  sync_status: 'pending' | 'syncing' | 'complete' | 'error';
  sync_progress: SyncProgress | null;
}

interface SyncProgress {
  step: 'segment_efforts' | 'activities' | 'greatest_hits' | 'complete';
  current_segment?: string;
  current_segment_name?: string;
  segments_complete: number;
  segments_total: number;
  efforts_found: number;
  best_time_display?: string;
  activities_found?: number;
  total_distance?: string;
  first_ride?: string;
  last_ride?: string;
  message?: string;
}

interface GreatestHit {
  id: string;
  title: string;
  stat_value: string;
  description: string;
  category: string;
}

interface SegmentData {
  id: string;
  name: string;
  strava_id: number;
  location: string;
  distance: { km: number; mi: number };
  elevation: { gain_ft: number; gain_m?: number };
  grade: number;
  category: string;
  clubMembers: number;
  clubBestTime?: string;
  visible: boolean;
  mission_cycling_leaderboard: {
    rank: number;
    name: string | null;
    rider_name?: string | null;
    date: string | null;
    time: string;
    time_display?: string;
    speed: string | null;
    power: string | null;
    claimed: boolean;
    status?: 'ghost' | 'claimed' | 'verified';
    profile_pic?: string | null;
  }[];
}

// =============================================================================
// Component
// =============================================================================

export default function Home() {
  // App state
  const [appState, setAppState] = useState<AppState>('loading');
  const [user, setUser] = useState<UserData | null>(null);
  const [greatestHits, setGreatestHits] = useState<GreatestHit[]>([]);

  // Broadcast state
  const [isCardOpen, setIsCardOpen] = useState(false);
  const [displayedSegmentIndex, setDisplayedSegmentIndex] = useState(0);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [currentTrack, setCurrentTrack] = useState(() =>
    Math.floor(Math.random() * AUDIO_TRACKS.length)
  );
  const [showCommercial, setShowCommercial] = useState(false);
  const [shownSponsors, setShownSponsors] = useState<Set<string>>(new Set());
  const [segments, setSegments] = useState<SegmentData[]>([]);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [segmentsSinceCommercial, setSegmentsSinceCommercial] = useState(0);

  const audioRef = useRef<HTMLAudioElement>(null);
  const audioStartedRef = useRef(false);

  // =============================================================================
  // Session Check on Mount
  // =============================================================================

  useEffect(() => {
    async function checkSession() {
      // Check for skip mode (?skip goes straight to broadcast)
      const urlParams = new URLSearchParams(window.location.search);
      const skipMode = urlParams.has('skip');

      try {
        const response = await fetch('/api/user/me');
        if (response.ok) {
          const userData = await response.json();
          setUser(userData);

          // Skip mode: go straight to broadcast (bypasses everything)
          if (skipMode) {
            console.log('[Home] Skip mode: going straight to broadcast');
            setAppState('broadcast');
            return;
          }

          // Check if sync is in progress
          if (userData.sync_status === 'syncing') {
            // Resume sync in progress
            console.log('[Home] Resuming sync in progress');
            setAppState('syncing');
            return;
          }

          // User exists - always show splash first, then check their status
          // Splash will show "Welcome back" for returning users
          console.log('[Home] User found, showing splash');
          setAppState('splash');
        } else {
          // No valid session, show splash for new user
          setAppState('splash');
        }
      } catch (error) {
        console.error('[Home] Session check failed:', error);
        setAppState('splash');
      }
    }

    checkSession();
  }, []);

  // =============================================================================
  // Fetch Segments
  // =============================================================================

  useEffect(() => {
    async function fetchSegments() {
      try {
        const response = await fetch('/api/segments');
        const data = await response.json();
        if (data.segments && data.segments.length > 0) {
          setSegments(data.segments);
          console.log(`[Home] Loaded ${data.segments.length} segments from ${data.source}`);
        } else {
          setSegments(segmentsData.segments.filter(s => s.visible) as SegmentData[]);
        }
      } catch (error) {
        console.error('[Home] Failed to fetch segments:', error);
        setSegments(segmentsData.segments.filter(s => s.visible) as SegmentData[]);
      }
      setDataLoaded(true);
    }

    if (appState === 'broadcast') {
      fetchSegments();
    }
  }, [appState]);

  // =============================================================================
  // State Transitions
  // =============================================================================

  // Welcome → Syncing (after 3 seconds)
  useEffect(() => {
    if (appState === 'welcome') {
      const timer = setTimeout(() => {
        // Start the sync
        fetch('/api/sync', { method: 'POST' }).catch(console.error);
        setAppState('syncing');
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [appState]);

  // Handle sync completion
  const handleSyncComplete = useCallback(async () => {
    // Fetch greatest hits
    try {
      const response = await fetch('/api/greatest-hits/me');
      if (response.ok) {
        const hits = await response.json();
        setGreatestHits(hits);
      }
    } catch (error) {
      console.error('[Home] Failed to fetch greatest hits:', error);
    }
    setAppState('greatest_hits');
  }, []);

  // Start music (called on user interaction)
  const startMusic = useCallback(() => {
    if (audioRef.current && audioRef.current.paused && audioEnabled) {
      audioRef.current.volume = 0.11;
      audioRef.current.play().catch(() => {
        console.log('[Home] Autoplay blocked');
      });
      audioStartedRef.current = true;
    }
  }, [audioEnabled]);

  // Handle greatest hits complete
  const handleGreatestHitsComplete = useCallback(() => {
    setAppState('broadcast_intro');
  }, []);

  // Handle broadcast intro button click
  const handleStartBroadcast = useCallback(() => {
    setAppState('broadcast');
    startMusic();
    setTimeout(() => setIsCardOpen(true), INITIAL_DELAY);
  }, [startMusic]);

  // Handle user interaction during greatest hits (for starting music)
  const handleGreatestHitsInteraction = useCallback(() => {
    startMusic();
  }, [startMusic]);

  // Try to start music on any click if not already playing
  const handleBroadcastClick = useCallback(() => {
    startMusic();
  }, [startMusic]);

  // Handle Strava auth click from splash
  const handleStravaAuth = useCallback(() => {
    setAppState('authenticating');
    window.location.href = '/api/auth/strava';
  }, []);

  // Handle continue click from splash (returning synced users)
  const handleContinue = useCallback(async () => {
    // Fetch greatest hits for returning user
    try {
      const response = await fetch('/api/greatest-hits/me');
      if (response.ok) {
        const hits = await response.json();
        setGreatestHits(hits);
      }
    } catch (error) {
      console.error('[Home] Failed to fetch greatest hits:', error);
    }
    setAppState('greatest_hits');
  }, []);

  // =============================================================================
  // Broadcast Logic (unchanged from before)
  // =============================================================================

  const pickNextTrack = useCallback(() => {
    setCurrentTrack(prev => {
      let next;
      do {
        next = Math.floor(Math.random() * AUDIO_TRACKS.length);
      } while (next === prev && AUDIO_TRACKS.length > 1);
      return next;
    });
  }, []);

  const handleTrackEnd = useCallback(() => {
    pickNextTrack();
  }, [pickNextTrack]);

  useEffect(() => {
    if (audioRef.current && audioStartedRef.current && audioEnabled && appState === 'broadcast') {
      audioRef.current.volume = 0.11;
      audioRef.current.play().catch(() => {});
    }
  }, [currentTrack, audioEnabled, appState]);

  const visibleSegments = segments;
  const activeSegment = visibleSegments[displayedSegmentIndex];

  // Toggle all audio (music + voiceover) with 'M' key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'm' || e.key === 'M') {
        setAudioEnabled(prev => {
          const newState = !prev;
          if (audioRef.current) {
            if (newState) {
              audioRef.current.volume = 0.11;
              audioRef.current.play().catch(() => {});
              audioStartedRef.current = true;
            } else {
              audioRef.current.pause();
            }
          }
          return newState;
        });
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const nextSegment = useCallback(() => {
    setIsCardOpen(false);

    setTimeout(() => {
      const newCount = segmentsSinceCommercial + 1;
      if (newCount >= COMMERCIAL_INTERVAL) {
        setSegmentsSinceCommercial(0);
        setShowCommercial(true);
      } else {
        setSegmentsSinceCommercial(newCount);
        setDisplayedSegmentIndex((prev) => (prev + 1) % visibleSegments.length);
        setTimeout(() => setIsCardOpen(true), 200);
      }
    }, CLOSE_DURATION);
  }, [segmentsSinceCommercial, visibleSegments.length]);

  const handleCommercialComplete = useCallback(() => {
    setShowCommercial(false);
    setDisplayedSegmentIndex((prev) => (prev + 1) % visibleSegments.length);
    setTimeout(() => setIsCardOpen(true), 200);
  }, [visibleSegments.length]);

  const prevSegment = useCallback(() => {
    if (showCommercial) return;
    setIsCardOpen(false);

    setTimeout(() => {
      setDisplayedSegmentIndex((prev) => (prev - 1 + visibleSegments.length) % visibleSegments.length);
      setIsCardOpen(true);
    }, CLOSE_DURATION);
  }, [visibleSegments.length, showCommercial]);

  // Auto-advance timer
  useEffect(() => {
    if (appState !== 'broadcast' || showCommercial || !dataLoaded) return;
    const timer = setTimeout(nextSegment, SEGMENT_DURATION);
    return () => clearTimeout(timer);
  }, [nextSegment, displayedSegmentIndex, appState, showCommercial, dataLoaded]);

  // =============================================================================
  // Render
  // =============================================================================

  // Loading state
  if (appState === 'loading') {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center">
        <div className="text-white/50 text-sm">Loading...</div>
      </div>
    );
  }

  // Splash screen (gated mode)
  if (appState === 'splash' || appState === 'authenticating') {
    const isReturningUser = !!(user && user.sync_status === 'complete');
    return (
      <SplashScreen
        onStravaAuth={handleStravaAuth}
        isAuthenticating={appState === 'authenticating'}
        onContinue={handleContinue}
        userName={user?.first_name || null}
        isReturningUser={isReturningUser}
      />
    );
  }

  // Welcome screen
  if (appState === 'welcome' && user) {
    return (
      <div className="fixed inset-0 bg-black flex flex-col items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8 }}
          className="flex flex-col items-center"
        >
          {user.profile_pic && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3, duration: 0.6 }}
            >
              <Image
                src={user.profile_pic}
                alt=""
                width={120}
                height={120}
                className="rounded-full border-2 border-white/20"
              />
            </motion.div>
          )}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8, duration: 0.6 }}
            className="text-white text-3xl mt-6"
            style={{ fontFamily: 'tablet-gothic, sans-serif' }}
          >
            Welcome back, {user.first_name}.
          </motion.h1>
          {(user.city || user.state) && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.2, duration: 0.6 }}
              className="text-white/60 text-lg mt-2"
            >
              {[user.city, user.state].filter(Boolean).join(', ')}
            </motion.p>
          )}
        </motion.div>
      </div>
    );
  }

  // Sync sequence
  if (appState === 'syncing') {
    return <SyncSequence user={user} onComplete={handleSyncComplete} />;
  }

  // Greatest hits reveal
  if (appState === 'greatest_hits') {
    return <GreatestHitsReveal hits={greatestHits} onComplete={handleGreatestHitsComplete} onUserInteraction={handleGreatestHitsInteraction} />;
  }

  // Broadcast intro - button to start (ensures audio can play)
  if (appState === 'broadcast_intro') {
    return (
      <div className="fixed inset-0 bg-black flex flex-col items-center justify-center overflow-hidden">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6 }}
          className="text-center"
        >
          <button
            onClick={handleStartBroadcast}
            className="group cursor-pointer bg-transparent border-2 border-[#BAE0F7] text-[#BAE0F7] px-12 py-6 hover:bg-[#BAE0F7] hover:text-black transition-all duration-300 flex flex-col items-center"
            style={{ fontFamily: 'tablet-gothic, sans-serif' }}
          >
            <span className="text-3xl uppercase tracking-widest">Wake Up and Climb</span>
            <span className="text-sm uppercase tracking-wider mt-2 opacity-60">Let&apos;s Begin</span>
          </button>
        </motion.div>
      </div>
    );
  }

  // Main broadcast
  return (
    <div onClick={handleBroadcastClick}>
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
            animate={{
              left: isCardOpen && !showCommercial ? '-25px' : '-60px',
              opacity: showCommercial ? 0 : 1,
            }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            style={{ pointerEvents: showCommercial ? 'none' : 'auto' }}
          >
            <Image src="/frame edge.png" alt="" width={60} height={515} />
          </motion.div>

          {/* Right Frame Edge */}
          <motion.div
            className="frame-edge right"
            onClick={nextSegment}
            animate={{
              right: isCardOpen && !showCommercial ? '-25px' : '-60px',
              opacity: showCommercial ? 0 : 1,
            }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            style={{ pointerEvents: showCommercial ? 'none' : 'auto' }}
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
                <Image src="/mc_logo_with_type.png" alt="Mission Cycling" width={150} height={200} className="object-contain" />
              </div>
              <div className="card-left-bottom">
                <h1 className="segment-name">{activeSegment?.name}</h1>
                <div className="segment-stats">
                  <div className="stat-row">
                    <span className="stat-label">Distance:</span>
                    <span className="stat-value">{activeSegment?.distance.mi}m</span>
                  </div>
                  <div className="stat-row">
                    <span className="stat-label">Elev. Gain:</span>
                    <span className="stat-value">{activeSegment?.elevation.gain_ft.toLocaleString()}ft</span>
                  </div>
                  <div className="stat-row">
                    <span className="stat-label">Avg Grade:</span>
                    <span className="stat-value">{activeSegment?.grade}%</span>
                  </div>
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
              <LeaderboardCard key={activeSegment.id} segment={activeSegment} isOpen={isCardOpen} audioEnabled={audioEnabled} />
            )}
          </motion.div>
        </motion.div>
      </div>

      {/* Commercial Break */}
      {showCommercial && (
        <CommercialBreak
          onComplete={handleCommercialComplete}
          sponsorCount={3}
          volume={0.5}
          shownSponsors={shownSponsors}
          onSponsorsShown={(ids) => {
            setShownSponsors(prev => {
              const next = new Set(prev);
              ids.forEach(id => next.add(id));
              return next;
            });
          }}
          backgroundAudioRef={audioRef}
          backgroundVolume={0.11}
          backgroundDuckVolume={0.03}
          audioEnabled={audioEnabled}
        />
      )}

      {/* Ticker */}
      <Ticker />

      {/* Background Music */}
      <audio
        ref={audioRef}
        src={AUDIO_TRACKS[currentTrack]}
        onEnded={handleTrackEnd}
        preload="auto"
      />
    </div>
  );
}
