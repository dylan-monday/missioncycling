'use client';

import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import Image from 'next/image';

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
  const [phase, setPhase] = useState<'hero' | 'full'>('hero');
  const [visibleRows, setVisibleRows] = useState(0);
  const leaderTime = segment.mission_cycling_leaderboard[0]?.time;

  useEffect(() => {
    if (!isOpen) {
      setPhase('hero');
      setVisibleRows(0);
      return;
    }

    setPhase('hero');
    setVisibleRows(0);

    // Timeline:
    // 0-0.6s: Card opens
    // 0.8s: First place slams in
    // 1.6s: Second place slams in
    // 2.4s: Third place slams in
    // 5.5s: Top 3 shrink into full leaderboard
    // 6.3s+: Rows 4-10 appear sequentially (after 800ms pause)

    const fullTimer = setTimeout(() => {
      setPhase('full');
      // Pause to let top 3 settle, then reveal rows 4-10
      setTimeout(() => {
        for (let i = 4; i <= 10; i++) {
          setTimeout(() => setVisibleRows(i), (i - 4) * 200);
        }
      }, 800);
    }, 5500);

    return () => {
      clearTimeout(fullTimer);
    };
  }, [segment.id, isOpen]);

  const allRows = segment.mission_cycling_leaderboard.slice(0, 10);
  const isHero = phase === 'hero';

  // Only render top 3 during hero, all 10 during full
  const rowsToRender = isHero ? allRows.slice(0, 3) : allRows;

  return (
    <div className="leaderboard">
      <motion.div
        className="flex flex-col flex-1"
        animate={{
          gap: isHero ? '16px' : '0px',
          justifyContent: isHero ? 'center' : 'space-evenly'
        }}
        transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
      >
        {rowsToRender.map((entry, index) => {
          const jerseyPath = getJerseyForRank(entry.rank, entry.claimed);
          const gap = entry.rank > 1 && entry.claimed ? formatGap(leaderTime, entry.time) : '';
          const isTopThree = entry.rank <= 3;

          // Determine if this row should be visible
          const shouldShow = isTopThree || (!isHero && visibleRows >= entry.rank);

          // Animation delay for top 3 slam-in
          const slamDelay = isTopThree ? 0.8 + (index * 0.8) : 0;

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
