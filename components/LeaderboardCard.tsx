'use client';

import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import Image from 'next/image';
import ElevationProfile from './ElevationProfile';

interface LeaderboardEntry {
  rank: number;
  name: string | null;
  date: string | null;
  time: string;
  speed: string | null;
  claimed: boolean;
}

interface Segment {
  id: string;
  name: string;
  strava_id: number;
  location: string;
  distance: { km: number; mi: number };
  elevation: { gain_m: number; gain_ft: number };
  grade: number;
  category: string;
  clubMembers: number;
  clubBestTime: string;
  mission_cycling_leaderboard: LeaderboardEntry[];
}

interface LeaderboardCardProps {
  segment: Segment;
  isOpen?: boolean;
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

export default function LeaderboardCard({ segment, isOpen = true }: LeaderboardCardProps) {
  const [phase, setPhase] = useState<'preview' | 'hero' | 'full'>('preview');
  const [visibleRows, setVisibleRows] = useState(0);
  const [previewStarted, setPreviewStarted] = useState(false);
  const [leaderboardStarted, setLeaderboardStarted] = useState(false);
  const leaderTime = segment.mission_cycling_leaderboard[0]?.time;

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

    // Wait for card to open before starting preview
    const previewTimer = setTimeout(() => {
      setPreviewStarted(true);
    }, 600);

    // Transition from preview to hero phase
    // Set leaderboardStarted BEFORE phase change so rows are ready
    const preLeaderboardTimer = setTimeout(() => {
      setLeaderboardStarted(true);
    }, 6400); // Start rows animating slightly before phase change

    const heroTimer = setTimeout(() => {
      setPhase('hero');
    }, 6600); // 0.6s card open + 6s preview

    // Transition from hero to full phase
    const fullTimer = setTimeout(() => {
      setPhase('full');
      // Pause to let top 3 settle, then reveal rows 4-10
      setTimeout(() => {
        for (let i = 4; i <= 10; i++) {
          setTimeout(() => setVisibleRows(i), (i - 4) * 200);
        }
      }, 800);
    }, 12000); // hero phase lasts ~5.4s

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
          const jerseyPath = getJerseyForRank(entry.rank, entry.claimed);
          const gap = entry.rank > 1 && entry.claimed ? formatGap(leaderTime, entry.time) : '';
          const isTopThree = entry.rank <= 3;

          // Determine if this row should be visible
          // Only show after leaderboard animation has started (after preview phase)
          const shouldShow = leaderboardStarted && (isTopThree || (!isHero && visibleRows >= entry.rank));

          // Animation delay for top 3 slam-in (relative to animationStarted)
          const slamDelay = isTopThree ? 0.2 + (index * 0.8) : 0;

          return (
            <motion.div
              key={entry.rank}
              className="leaderboard-row"
              initial={{ x: -500, opacity: 0 }}
              animate={{
                x: shouldShow ? 0 : -500,
                opacity: shouldShow ? 1 : 0,
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
                // Dynamic grid and font size for hero vs full state
                gridTemplateColumns: isHero ? '72px 40px 1fr auto auto auto' : '36px 24px 1fr auto auto auto',
                fontSize: isHero && isTopThree ? '28px' : '20px',
                transition: 'font-size 0.5s ease, grid-template-columns 0.5s ease'
              }}
            >
              {/* Jersey */}
              <div
                className={`row-jersey ${!jerseyPath ? 'empty' : ''}`}
                style={{
                  perspective: '500px',
                  width: isHero && isTopThree ? '72px' : '36px',
                  height: isHero && isTopThree ? '72px' : '36px',
                  transition: 'width 0.5s ease, height 0.5s ease'
                }}
              >
                {jerseyPath && isTopThree ? (
                  <motion.div
                    animate={{ rotateY: 360 }}
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
                className={`row-name ${!entry.claimed ? 'unclaimed' : ''}`}
                style={{
                  fontSize: isHero && isTopThree ? '28px' : '20px',
                  transition: 'font-size 0.5s ease'
                }}
              >
                {entry.claimed ? entry.name : '[ Unclaimed ]'}
              </span>

              {/* Time */}
              <span
                className="row-time"
                style={{
                  fontSize: isHero && isTopThree ? '28px' : '20px',
                  transition: 'font-size 0.5s ease'
                }}
              >
                {entry.time}
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
                {entry.claimed ? formatDate(entry.date) : ''}
              </motion.span>
            </motion.div>
          );
        })}
      </motion.div>
    </div>
  );
}
