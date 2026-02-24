'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import PhotoPile from './PhotoPile';

// Fallback placeholder photos if no archival photos exist yet
const PLACEHOLDER_PHOTOS = [
  'https://picsum.photos/seed/mc1/400/300',
  'https://picsum.photos/seed/mc2/300/400',
  'https://picsum.photos/seed/mc3/400/400',
  'https://picsum.photos/seed/mc4/350/280',
  'https://picsum.photos/seed/mc5/280/350',
  'https://picsum.photos/seed/mc6/400/300',
  'https://picsum.photos/seed/mc7/300/400',
  'https://picsum.photos/seed/mc8/350/350',
];

interface SyncProgress {
  step: 'segment_efforts' | 'activities' | 'greatest_hits' | 'complete';
  current_segment?: string;
  current_segment_name?: string;
  segments_complete: number;
  segments_total: number;
  efforts_found: number;
  best_time_display?: string;
  best_date?: string;
  most_recent_date?: string;
  activities_found?: number;
  activities_page?: number;
  activities_pages_total?: number;
  total_distance?: string;
  total_elevation?: string;
  total_hours?: string;
  first_ride?: string;
  last_ride?: string;
  message?: string;
}

interface UserData {
  id: string;
  name: string;
  first_name: string;
  sync_status: 'pending' | 'syncing' | 'complete' | 'error';
  sync_progress: SyncProgress | null;
}

interface SyncSequenceProps {
  user: UserData | null;
  onComplete: () => void;
}

export default function SyncSequence({ user, onComplete }: SyncSequenceProps) {
  const [progress, setProgress] = useState<SyncProgress | null>(null);
  const [currentMessage, setCurrentMessage] = useState('Connecting to Strava...');
  const [subMessage, setSubMessage] = useState<string | null>(null);
  const [totalEfforts, setTotalEfforts] = useState(0);
  const [totalActivities, setTotalActivities] = useState(0);
  const [displayedEfforts, setDisplayedEfforts] = useState(0);
  const [displayedActivities, setDisplayedActivities] = useState(0);
  const [archivalPhotos, setArchivalPhotos] = useState<string[]>(PLACEHOLDER_PHOTOS);

  const audioRef = useRef<HTMLAudioElement>(null);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  const isCompleteRef = useRef(false);
  const lastSegmentRef = useRef<string | null>(null);

  // Fetch archival photos from directory
  useEffect(() => {
    fetch('/api/archival-photos')
      .then(res => res.json())
      .then(data => {
        if (data.photos && data.photos.length > 0) {
          setArchivalPhotos(data.photos);
        }
      })
      .catch(() => {
        // Keep placeholder photos on error
      });
  }, []);

  // Animate counters
  useEffect(() => {
    if (displayedEfforts < totalEfforts) {
      const timer = setTimeout(() => {
        setDisplayedEfforts(prev => Math.min(prev + Math.ceil((totalEfforts - prev) / 5), totalEfforts));
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [displayedEfforts, totalEfforts]);

  useEffect(() => {
    if (displayedActivities < totalActivities) {
      const timer = setTimeout(() => {
        setDisplayedActivities(prev => Math.min(prev + Math.ceil((totalActivities - prev) / 5), totalActivities));
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [displayedActivities, totalActivities]);

  // Start ambient audio
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = 0.15;
      audioRef.current.loop = true;
      audioRef.current.play().catch(() => {});
    }

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, []);

  // Poll for sync progress
  useEffect(() => {
    const pollSync = async () => {
      try {
        const response = await fetch('/api/user/me');
        if (!response.ok) return;

        const userData = await response.json();

        if (userData.sync_status === 'complete' && !isCompleteRef.current) {
          isCompleteRef.current = true;

          if (pollingRef.current) {
            clearInterval(pollingRef.current);
          }

          // Fade out audio
          if (audioRef.current) {
            const fadeOut = setInterval(() => {
              if (audioRef.current && audioRef.current.volume > 0.01) {
                audioRef.current.volume = Math.max(0, audioRef.current.volume - 0.02);
              } else {
                clearInterval(fadeOut);
                if (audioRef.current) audioRef.current.pause();
              }
            }, 100);
          }

          setCurrentMessage('Sync complete');
          setSubMessage(null);

          setTimeout(() => {
            onComplete();
          }, 1500);
          return;
        }

        if (userData.sync_progress) {
          const sp = userData.sync_progress;
          setProgress(sp);

          // Update messages based on step
          if (sp.step === 'segment_efforts') {
            const isNewSegment = sp.current_segment !== lastSegmentRef.current;

            if (sp.current_segment_name && isNewSegment) {
              lastSegmentRef.current = sp.current_segment || null;
              setCurrentMessage(`Scanning ${sp.current_segment_name}...`);
              setSubMessage(null);

              // Only add efforts when we first see results for this segment
              if (sp.efforts_found > 0) {
                setTotalEfforts(prev => prev + sp.efforts_found);
              }
            }

            // Always update the sub-message with current segment info
            if (sp.efforts_found > 0) {
              const parts = [`${sp.efforts_found} attempts`];
              if (sp.best_time_display) {
                parts.push(`Best: ${sp.best_time_display}`);
                if (sp.best_date) {
                  parts[parts.length - 1] += ` (${sp.best_date})`;
                }
              }
              if (sp.most_recent_date && sp.most_recent_date !== sp.best_date) {
                parts.push(`Last: ${sp.most_recent_date}`);
              }
              setSubMessage(parts.join(' • '));
            }
          } else if (sp.step === 'activities') {
            setTotalActivities(sp.activities_found || 0);
            setCurrentMessage('Searching ride history...');
            // Build detailed activity message
            const parts = [];
            if (sp.activities_found) {
              parts.push(`${sp.activities_found.toLocaleString()} rides`);
            }
            if (sp.total_distance) {
              parts.push(`${sp.total_distance} mi`);
            }
            if (sp.total_elevation) {
              parts.push(`${sp.total_elevation} ft`);
            }
            setSubMessage(parts.join(' • ') || 'Searching...');
          } else if (sp.step === 'greatest_hits') {
            setCurrentMessage('Generating your greatest hits...');
            setSubMessage(null);
          }
        }
      } catch (error) {
        console.error('[SyncSequence] Polling error:', error);
      }
    };

    pollSync();
    pollingRef.current = setInterval(pollSync, 1500);

    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
    };
  }, [onComplete]);

  const progressPercent = progress
    ? progress.step === 'activities' || progress.step === 'greatest_hits'
      ? 100
      : (progress.segments_complete / progress.segments_total) * 100
    : 0;

  return (
    <div className="fixed inset-0 bg-black flex flex-col items-center justify-center overflow-hidden">
      {/* Ambient sync audio */}
      <audio ref={audioRef} src="/segment_audio/sync soundtrack 3.mp3" preload="auto" />

      {/* Archival photos piling up in background (z-0) */}
      <div className="absolute inset-0 z-0">
        <PhotoPile
          photos={archivalPhotos}
          interval={6000}
          overlayOpacity={0.88}
        />
      </div>

      {/* Main content - card with subtle border */}
      <div className="relative z-10 flex flex-col items-center max-w-xl px-12 py-10 bg-black/80 border border-white/10">

        {/* Current message */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentMessage}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.4 }}
            className="text-center mb-8"
          >
            <h2
              className="text-white text-3xl mb-2"
              style={{ fontFamily: 'tablet-gothic, sans-serif' }}
            >
              {currentMessage}
            </h2>
            {subMessage && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-[#BAE0F7] text-lg"
                style={{ fontFamily: 'tablet-gothic, sans-serif' }}
              >
                {subMessage}
              </motion.p>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Progress bar */}
        <div className="w-80 mb-10">
          <div className="h-1 bg-white/10 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-[#BAE0F7]"
              initial={{ width: 0 }}
              animate={{ width: `${progressPercent}%` }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
            />
          </div>
          {progress && progress.segments_total > 0 && (
            <p
              className="text-white/40 text-xs mt-2 text-center"
              style={{ fontFamily: 'tablet-gothic, sans-serif' }}
            >
              {progress.step === 'segment_efforts'
                ? `Segment ${progress.segments_complete + 1} of ${progress.segments_total}`
                : progress.step === 'activities'
                  ? 'Processing activities...'
                  : 'Finalizing...'}
            </p>
          )}
        </div>

        {/* Live stats */}
        <div className="flex gap-16">
          {displayedEfforts > 0 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center"
            >
              <motion.div
                className="text-4xl text-white font-bold"
                style={{ fontFamily: 'tablet-gothic, sans-serif' }}
              >
                {displayedEfforts}
              </motion.div>
              <div className="text-white/50 text-sm mt-1" style={{ fontFamily: 'tablet-gothic, sans-serif' }}>segment efforts</div>
            </motion.div>
          )}

          {displayedActivities > 0 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center"
            >
              <motion.div
                className="text-4xl text-white font-bold"
                style={{ fontFamily: 'tablet-gothic, sans-serif' }}
              >
                {displayedActivities.toLocaleString()}
              </motion.div>
              <div className="text-white/50 text-sm mt-1" style={{ fontFamily: 'tablet-gothic, sans-serif' }}>rides found</div>
            </motion.div>
          )}
        </div>

        {/* Stats row: distance, hours, elevation */}
        {progress?.total_distance && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-8 flex gap-8 justify-center"
          >
            <div className="text-center">
              <div
                className="text-2xl text-[#BAE0F7]"
                style={{ fontFamily: 'tablet-gothic, sans-serif' }}
              >
                {progress.total_distance}
              </div>
              <div className="text-white/40 text-xs" style={{ fontFamily: 'tablet-gothic, sans-serif' }}>miles</div>
            </div>
            {progress.total_hours && (
              <div className="text-center">
                <div
                  className="text-2xl text-[#BAE0F7]"
                  style={{ fontFamily: 'tablet-gothic, sans-serif' }}
                >
                  {progress.total_hours}
                </div>
                <div className="text-white/40 text-xs" style={{ fontFamily: 'tablet-gothic, sans-serif' }}>hours</div>
              </div>
            )}
            {progress.total_elevation && (
              <div className="text-center">
                <div
                  className="text-2xl text-[#BAE0F7]"
                  style={{ fontFamily: 'tablet-gothic, sans-serif' }}
                >
                  {progress.total_elevation}
                </div>
                <div className="text-white/40 text-xs" style={{ fontFamily: 'tablet-gothic, sans-serif' }}>ft climbed</div>
              </div>
            )}
          </motion.div>
        )}

        {/* Date range */}
        {progress?.first_ride && progress?.last_ride && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-4 text-white/40 text-sm"
            style={{ fontFamily: 'tablet-gothic, sans-serif' }}
          >
            {progress.first_ride} → {progress.last_ride}
          </motion.div>
        )}
      </div>

      {/* Scanning line animation */}
      <motion.div
        className="absolute left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#BAE0F7]/30 to-transparent"
        animate={{
          top: ['0%', '100%'],
        }}
        transition={{
          duration: 4,
          repeat: Infinity,
          ease: 'linear',
        }}
      />

      {/* Corner accents */}
      <div className="absolute top-8 left-8 w-8 h-8 border-l border-t border-white/10" />
      <div className="absolute top-8 right-8 w-8 h-8 border-r border-t border-white/10" />
      <div className="absolute bottom-8 left-8 w-8 h-8 border-l border-b border-white/10" />
      <div className="absolute bottom-8 right-8 w-8 h-8 border-r border-b border-white/10" />
    </div>
  );
}
