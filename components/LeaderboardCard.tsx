'use client';

import { motion } from 'framer-motion';
import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import ElevationProfile from './ElevationProfile';

// Segment audio mapping - two versions per segment, pick randomly
const SEGMENT_AUDIO: Record<string, string[]> = {
  'hawk-hill': ['/segment_audio/hawk hill 01.mp3', '/segment_audio/hawk hill 02.mp3'],
  'radio-road': ['/segment_audio/radio road 01.mp3', '/segment_audio/radio road 02.mp3'],
  'old-la-honda': ['/segment_audio/old la honda 01.mp3', '/segment_audio/old la honda 02.mp3'],
  'hwy1-muir-beach': ['/segment_audio/highway one.mp3', '/segment_audio/highway one 02.mp3'],
  'alpe-dhuez': ["/segment_audio/alpe d'huez 01.mp3", "/segment_audio/alpe d'huez 02.mp3"],
  'four-corners': ['/segment_audio/four corners 01.mp3', '/segment_audio/four corners 02.mp3'],
  'bofax-climb': ['/segment_audio/Bofax 01.mp3', '/segment_audio/Bofax 02.mp3'],
  'bourg-doisans': ["/segment_audio/bourg d'oisans 01.mp3", "/segment_audio/bourg d'oisans 02.mp3"],
};

interface LeaderboardEntry {
  rank: number;
  name: string | null;
  rider_name?: string | null;
  date: string | null;
  time: string;
  time_display?: string;
  speed: string | null;
  claimed: boolean;
  status?: 'ghost' | 'claimed' | 'verified';
  profile_pic?: string | null;
}

interface Segment {
  id: string;
  name: string;
  strava_id: number;
  location: string;
  distance: { km: number; mi: number };
  elevation: { gain_m?: number; gain_ft: number };
  grade: number;
  category: string;
  clubMembers: number;
  clubBestTime?: string;
  mission_cycling_leaderboard: LeaderboardEntry[];
}

interface LeaderboardCardProps {
  segment: Segment;
  isOpen?: boolean;
  audioEnabled?: boolean;
}

function parseTimeToSeconds(time: string): number {
  if (!time || time === '—') return 0;
  const parts = time.split(':').map(Number);
  if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  } else if (parts.length === 2) {
    return parts[0] * 60 + parts[1];
  }
  return 0;
}

function formatGap(leaderTime: string, entryTime: string): string {
  const leaderSeconds = parseTimeToSeconds(leaderTime);
  const entrySeconds = parseTimeToSeconds(entryTime);
  const gap = entrySeconds - leaderSeconds;
  if (gap <= 0) return '';
  const minutes = Math.floor(gap / 60);
  const seconds = gap % 60;
  if (minutes > 0) {
    return `+${minutes}:${seconds.toString().padStart(2, '0')}`;
  }
  return `+:${seconds.toString().padStart(2, '0')}`;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: '2-digit' });
}

function getJerseyForRank(rank: number, claimed: boolean): string | null {
  if (!claimed) return null;
  switch (rank) {
    case 1: return '/mission_black.blue_shirts_60x60.png';
    case 2: return '/mission_white_shirts_60x60.png';
    case 3: return '/mission_green_shirts_60x60.png';
    default: return '/mission_black_shirts_60x60.png';
  }
}

export default function LeaderboardCard({ segment, isOpen = true, audioEnabled = true }: LeaderboardCardProps) {
  const [phase, setPhase] = useState<'preview' | 'hero' | 'full'>('preview');
  const [visibleRows, setVisibleRows] = useState(0);
  const [previewStarted, setPreviewStarted] = useState(false);
  const [leaderboardStarted, setLeaderboardStarted] = useState(false);
  const leaderTime = segment.mission_cycling_leaderboard[0]?.time;
  const segmentAudioRef = useRef<HTMLAudioElement | null>(null);

  // Play segment name audio when card opens (if audio enabled)
  useEffect(() => {
    if (!isOpen || !audioEnabled) {
      if (segmentAudioRef.current) {
        segmentAudioRef.current.pause();
        segmentAudioRef.current = null;
      }
      return;
    }

    const audioFiles = SEGMENT_AUDIO[segment.id];
    if (!audioFiles || audioFiles.length === 0) return;

    const audioSrc = audioFiles[Math.floor(Math.random() * audioFiles.length)];

    const playTimer = setTimeout(() => {
      const audio = new Audio(audioSrc);
      audio.volume = 0.25;
      segmentAudioRef.current = audio;
      audio.play().catch(console.error);
    }, 400);

    return () => {
      clearTimeout(playTimer);
      if (segmentAudioRef.current) {
        segmentAudioRef.current.pause();
        segmentAudioRef.current = null;
      }
    };
  }, [isOpen, segment.id, audioEnabled]);

  useEffect(() => {
    if (!isOpen) {
      setPhase('preview');
      setVisibleRows(0);
      setPreviewStarted(false);
      setLeaderboardStarted(false);
      return;
    }

    setPhase('preview');
    setVisibleRows(0);
    setPreviewStarted(false);
    setLeaderboardStarted(false);

    // Timeline:
    // 0-0.6s: Card opens
    // 0.6s: Preview phase starts (elevation profile draws in 2s)
    // 2.6s: Stats animate in (0.6s)
    // 3.2s-6.6s: Hold preview for ~3.4s more
    // 6.6s: Transition to hero phase
    // 6.8s: First place slams in
    // 7.6s: Second place slams in
    // 8.4s: Third place slams in
    // 12s: Top 3 shrink into full leaderboard
    // 12.8s+: Rows 4-10 appear sequentially

    const previewTimer = setTimeout(() => {
      setPreviewStarted(true);
    }, 600);

    const preLeaderboardTimer = setTimeout(() => {
      setLeaderboardStarted(true);
    }, 6400);

    const heroTimer = setTimeout(() => {
      setPhase('hero');
    }, 6600);

    const fullTimer = setTimeout(() => {
      setPhase('full');
      setTimeout(() => {
        for (let i = 4; i <= 10; i++) {
          setTimeout(() => setVisibleRows(i), (i - 4) * 200);
        }
      }, 800);
    }, 12000);

    return () => {
      clearTimeout(previewTimer);
      clearTimeout(preLeaderboardTimer);
      clearTimeout(heroTimer);
      clearTimeout(fullTimer);
    };
  }, [segment.id, isOpen]);

  const allRows = segment.mission_cycling_leaderboard.slice(0, 10);
  const isPreview = phase === 'preview';
  const isHero = phase === 'hero';

  // Only render top 3 during hero, all 10 during full
  const rowsToRender = isHero ? allRows.slice(0, 3) : allRows;

  return (
    <div className="leaderboard" style={{ position: 'relative' }}>
      {/* Elevation Preview - crossfades with leaderboard */}
      <motion.div
        className="flex flex-col flex-1"
        style={{ position: 'absolute', inset: 0 }}
        initial={{ opacity: 0 }}
        animate={{ opacity: isPreview ? 1 : 0 }}
        transition={{ duration: 0.5, ease: 'easeInOut' }}
      >
        <ElevationProfile
          segmentId={segment.id}
          distance={segment.distance.mi}
          elevation={segment.elevation.gain_ft}
          grade={segment.grade}
          category={segment.category}
          isVisible={previewStarted}
        />
      </motion.div>

      {/* Leaderboard - crossfades with preview */}
      <motion.div
        className="flex flex-col flex-1"
        style={{ position: 'absolute', inset: 0 }}
        initial={{ opacity: 0 }}
        animate={{
          opacity: isPreview ? 0 : 1,
          gap: isHero ? '16px' : '0px',
          justifyContent: isHero ? 'center' : 'space-evenly'
        }}
        transition={{ duration: 0.5, ease: 'easeInOut' }}
      >
        {rowsToRender.map((entry, index) => {
          // Handle both old format (claimed) and new format (status)
          const status = entry.status || (entry.claimed ? 'verified' : 'ghost');
          const isGhost = status === 'ghost';
          const isVerified = status === 'verified';
          const displayName = entry.name || entry.rider_name;
          const displayTime = entry.time_display || entry.time;

          // Show jersey for any entry with a name (ghosts just get faded)
          const hasName = !!displayName;
          const jerseyPath = getJerseyForRank(entry.rank, hasName);
          const gap = entry.rank > 1 && !isGhost ? formatGap(leaderTime, displayTime) : '';
          const isTopThree = entry.rank <= 3;

          // Ghost rows are faded
          const rowOpacity = isGhost ? 0.5 : 1;

          const shouldShow = leaderboardStarted && (isTopThree || (!isHero && visibleRows >= entry.rank));
          const slamDelay = isTopThree ? 0.2 + (index * 0.8) : 0;

          return (
            <motion.div
              key={entry.rank}
              className="leaderboard-row"
              initial={{ x: -500, opacity: 0 }}
              animate={{
                x: shouldShow ? 0 : -500,
                opacity: shouldShow ? rowOpacity : 0,
                scale: 1
              }}
              transition={{
                x: {
                  delay: isTopThree ? slamDelay : 0,
                  duration: 0.5,
                  ease: [0.16, 1, 0.3, 1]
                },
                opacity: {
                  delay: isTopThree ? slamDelay : 0,
                  duration: 0.3
                }
              }}
              style={{
                gridTemplateColumns: isHero ? '72px 40px 1fr auto auto auto' : '36px 24px 1fr auto auto auto',
                fontSize: isHero && isTopThree ? '28px' : '20px',
                transition: 'font-size 0.5s ease, grid-template-columns 0.5s ease'
              }}
            >
              {/* Jersey or Profile Pic */}
              <div
                className={`row-jersey ${!jerseyPath ? 'empty' : ''}`}
                style={{
                  perspective: '500px',
                  width: isHero && isTopThree ? '72px' : '36px',
                  height: isHero && isTopThree ? '72px' : '36px',
                  transition: 'width 0.5s ease, height 0.5s ease',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {isVerified && entry.profile_pic ? (
                  // Verified user with profile pic
                  <Image
                    src={entry.profile_pic}
                    alt=""
                    width={isHero && isTopThree ? 56 : 28}
                    height={isHero && isTopThree ? 56 : 28}
                    className="rounded-full object-cover"
                    style={{
                      border: '2px solid rgba(255,255,255,0.3)',
                      width: isHero && isTopThree ? '56px' : '28px',
                      height: isHero && isTopThree ? '56px' : '28px',
                      transition: 'width 0.5s ease, height 0.5s ease',
                    }}
                  />
                ) : jerseyPath && isTopThree ? (
                  <motion.div
                    initial={{ rotateY: (entry.rank - 1) * 120 }}
                    animate={{ rotateY: (entry.rank - 1) * 120 + 360 }}
                    transition={{
                      duration: 12,
                      ease: 'linear',
                      repeat: Infinity
                    }}
                    style={{ transformStyle: 'preserve-3d' }}
                  >
                    <Image
                      src={jerseyPath}
                      alt=""
                      width={isHero ? 64 : 32}
                      height={isHero ? 64 : 32}
                      className="object-contain"
                      style={{
                        width: isHero && isTopThree ? '64px' : '32px',
                        height: isHero && isTopThree ? '64px' : '32px',
                        transition: 'width 0.5s ease, height 0.5s ease'
                      }}
                    />
                  </motion.div>
                ) : jerseyPath ? (
                  <Image
                    src={jerseyPath}
                    alt=""
                    width={32}
                    height={32}
                    className="object-contain"
                  />
                ) : !hasName ? (
                  // Unclaimed placeholder (no name at all)
                  <div
                    className="rounded-full"
                    style={{
                      width: isHero && isTopThree ? '56px' : '28px',
                      height: isHero && isTopThree ? '56px' : '28px',
                      background: 'rgba(255,255,255,0.1)',
                      border: '1px solid rgba(255,255,255,0.2)',
                      transition: 'width 0.5s ease, height 0.5s ease',
                    }}
                  />
                ) : null}
              </div>

              {/* Rank */}
              <span
                className="row-rank"
                style={{
                  fontSize: isHero && isTopThree ? '28px' : '20px',
                  transition: 'font-size 0.5s ease'
                }}
              >
                {entry.rank}
              </span>

              {/* Name */}
              <span
                className={`row-name ${isGhost ? 'unclaimed' : ''}`}
                style={{
                  fontSize: isHero && isTopThree ? '28px' : '20px',
                  transition: 'font-size 0.5s ease',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                {displayName || '[ Unclaimed ]'}
                {isVerified && (
                  <svg
                    className="flex-shrink-0"
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="#FC4C02"
                  >
                    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                  </svg>
                )}
              </span>

              {/* Time */}
              <span
                className="row-time"
                style={{
                  fontSize: isHero && isTopThree ? '28px' : '20px',
                  transition: 'font-size 0.5s ease'
                }}
              >
                {displayTime}
              </span>

              {/* Gap - only show in full state */}
              <motion.span
                className="row-gap"
                animate={{ opacity: isHero ? 0 : 1 }}
                transition={{ duration: 0.3 }}
              >
                {gap}
              </motion.span>

              {/* Date - only show in full state */}
              <motion.span
                className="row-date"
                animate={{ opacity: isHero ? 0 : 1 }}
                transition={{ duration: 0.3 }}
              >
                {!isGhost ? formatDate(entry.date) : ''}
              </motion.span>
            </motion.div>
          );
        })}
      </motion.div>
    </div>
  );
}
