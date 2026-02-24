'use client';

import { motion, type Transition } from 'framer-motion';
import Image from 'next/image';

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

interface LeaderboardRowProps {
  entry: LeaderboardEntry;
  index: number;
  leaderTime?: string;
  animationPhase: 'title' | 'top3-big' | 'top3-shrink' | 'rest';
  isTopThreeSlot: boolean;
}

interface AnimationConfig {
  initial: { x?: number; opacity?: number; scale?: number };
  animate: { x?: number; opacity?: number; scale?: number };
  transition: Transition;
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
  return `+${seconds}s`;
}

function getJerseyForRank(rank: number): string {
  switch (rank) {
    case 1:
      return '/jersey_white.png';
    case 2:
      return '/jersey_green.png';
    case 3:
      return '/jersey_black_blue.png';
    default:
      return '/jersey_black.png';
  }
}

export default function LeaderboardRow({
  entry,
  index,
  leaderTime,
  animationPhase,
  isTopThreeSlot,
}: LeaderboardRowProps) {
  const isLeader = entry.rank === 1;
  const isTopThree = entry.rank <= 3;
  const status = entry.status || (entry.claimed ? 'verified' : 'ghost');
  const isGhost = status === 'ghost';
  const isClaimed = status === 'claimed';
  const isVerified = status === 'verified';
  const isUnclaimed = isGhost && !entry.name && !entry.rider_name;
  const displayName = entry.name || entry.rider_name;
  const displayTime = entry.time_display || entry.time;
  const gap = leaderTime && entry.rank > 1 && !isGhost ? formatGap(leaderTime, displayTime) : '';

  // Opacity based on status
  const rowOpacity = isGhost ? 'opacity-50' : isClaimed ? 'opacity-70' : '';

  // Determine animation based on phase and position
  const getAnimationProps = (): AnimationConfig => {
    if (isTopThreeSlot) {
      // TOP 3 ANIMATION
      if (animationPhase === 'top3-big') {
        return {
          initial: { x: -500, opacity: 0, scale: 1.3 },
          animate: { x: 0, opacity: 1, scale: 1.25 },
          transition: {
            delay: index * 0.5,
            duration: 0.6,
            ease: [0.22, 1.3, 0.36, 1],
          },
        };
      } else if (animationPhase === 'top3-shrink' || animationPhase === 'rest') {
        return {
          initial: { scale: 1.25 },
          animate: { scale: 1 },
          transition: {
            duration: 0.4,
            ease: 'easeOut',
          },
        };
      }
    }
    // REST OF LEADERBOARD (4-10) or default
    return {
      initial: { x: -400, opacity: 0, scale: 1.05 },
      animate: { x: 0, opacity: 1, scale: 1 },
      transition: {
        delay: index * 0.12,
        duration: 0.35,
        ease: [0.22, 1.2, 0.36, 1],
      },
    };
  };

  const animProps = getAnimationProps();

  // Dynamic height - top 3 are bigger during 'top3-big' phase
  const rowHeight = isTopThreeSlot && animationPhase === 'top3-big' ? 'h-[11%]' : 'h-[7.5%]';

  return (
    <motion.div
      layout
      {...animProps}
      className={`
        relative flex items-center ${rowHeight} px-2 origin-left ${rowOpacity}
        ${isLeader && !isGhost ? 'bg-gradient-to-r from-yellow-500/95 to-yellow-600/90' : ''}
        ${isLeader && isGhost ? 'bg-gradient-to-r from-yellow-500/50 to-yellow-600/40' : ''}
        ${!isLeader && isTopThree && !isGhost ? 'bg-gradient-to-r from-white/15 to-transparent' : ''}
        ${!isLeader && isTopThree && isGhost ? 'bg-gradient-to-r from-white/8 to-transparent' : ''}
        ${!isTopThree && isVerified ? 'bg-gradient-to-r from-white/5 to-transparent' : ''}
        ${!isTopThree && isGhost ? 'bg-gradient-to-r from-black/30 to-transparent' : ''}
        border-l-[3px]
        ${isLeader && !isGhost ? 'border-yellow-300' : ''}
        ${isLeader && isGhost ? 'border-yellow-300/50' : ''}
        ${!isLeader && isTopThree && !isGhost ? 'border-white/50' : ''}
        ${!isLeader && isTopThree && isGhost ? 'border-white/25' : ''}
        ${!isTopThree && isVerified ? 'border-white/20' : ''}
        ${!isTopThree && !isVerified ? 'border-white/10' : ''}
      `}
    >
      {/* Rank */}
      <div
        className={`w-[6%] font-broadcast text-[1.8vh] text-center
          ${isLeader && !isGhost ? 'text-black' : ''}
          ${isLeader && isGhost ? 'text-black/50' : ''}
          ${!isLeader && isGhost ? 'text-white/30' : ''}
          ${!isLeader && !isGhost ? 'text-white' : ''}
        `}
        style={{ textShadow: isLeader ? 'none' : '1px 1px 0 rgba(0,0,0,0.8)' }}
      >
        {entry.rank}
      </div>

      {/* Profile pic (verified) or Jersey icon */}
      <div className="w-[32px] h-[32px] flex items-center justify-center mx-1">
        {isVerified && entry.profile_pic ? (
          <Image
            src={entry.profile_pic}
            alt=""
            width={28}
            height={28}
            className="rounded-full object-cover border border-white/30"
          />
        ) : !isGhost ? (
          <Image
            src={getJerseyForRank(entry.rank)}
            alt=""
            width={32}
            height={32}
            className="object-contain"
            style={{
              filter: isLeader
                ? 'drop-shadow(0 1px 2px rgba(0,0,0,0.3))'
                : 'drop-shadow(0 1px 3px rgba(0,0,0,0.5))',
            }}
          />
        ) : (
          <div className="w-[28px] h-[28px] rounded-full bg-white/10 border border-white/20" />
        )}
      </div>

      {/* Name + Verified Badge */}
      <div className="flex-1 min-w-0 px-2 flex items-center gap-1">
        {isUnclaimed ? (
          <span
            className="text-[1.6vh] text-white/25 tracking-wide"
            style={{
              fontFamily: 'Impact, Haettenschweiler, "Arial Narrow Bold", sans-serif',
              fontStyle: 'italic',
            }}
          >
            [ UNCLAIMED ]
          </span>
        ) : (
          <>
            <span
              className={`tracking-wide truncate uppercase
                ${isLeader && !isGhost ? 'text-black' : ''}
                ${isLeader && isGhost ? 'text-black/60' : ''}
                ${!isLeader && isGhost ? 'text-white/50' : ''}
                ${!isLeader && !isGhost ? 'text-white' : ''}
                ${isTopThreeSlot && animationPhase === 'top3-big' ? 'text-[2.2vh]' : 'text-[1.8vh]'}
              `}
              style={{
                fontFamily: 'Impact, Haettenschweiler, "Arial Narrow Bold", sans-serif',
                fontStyle: 'italic',
                fontWeight: 'bold',
                textShadow: isLeader
                  ? '1px 1px 0 rgba(255,255,255,0.3)'
                  : isGhost
                  ? '1px 1px 0 rgba(0,0,0,0.5)'
                  : `
                    2px 2px 0 #000,
                    -2px -2px 0 #000,
                    2px -2px 0 #000,
                    -2px 2px 0 #000,
                    2px 0 0 #000,
                    -2px 0 0 #000,
                    0 2px 0 #000,
                    0 -2px 0 #000
                  `,
              }}
            >
              {displayName}
            </span>
            {/* Strava verified checkmark */}
            {isVerified && (
              <svg
                className="w-[1.4vh] h-[1.4vh] flex-shrink-0"
                viewBox="0 0 24 24"
                fill="#FC4C02"
              >
                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
              </svg>
            )}
          </>
        )}
      </div>

      {/* Time */}
      <div
        className={`font-broadcast tabular-nums w-[18%] text-right
          ${isLeader && !isGhost ? 'text-black' : ''}
          ${isLeader && isGhost ? 'text-black/60' : ''}
          ${!isLeader && isUnclaimed ? 'text-white/15' : ''}
          ${!isLeader && isGhost && !isUnclaimed ? 'text-white/50' : ''}
          ${!isLeader && !isGhost && !isUnclaimed ? 'text-white' : ''}
          ${isTopThreeSlot && animationPhase === 'top3-big' ? 'text-[2.4vh]' : 'text-[2vh]'}
        `}
        style={{ textShadow: isLeader ? 'none' : isGhost ? '1px 1px 0 rgba(0,0,0,0.5)' : '2px 2px 0 rgba(0,0,0,0.9)' }}
      >
        {displayTime}
      </div>

      {/* Gap */}
      {gap && (
        <div
          className="font-mono text-[1.4vh] text-yellow-400/90 w-[12%] text-right pr-1"
          style={{ textShadow: '1px 1px 0 rgba(0,0,0,0.9)' }}
        >
          {gap}
        </div>
      )}
      {!gap && isVerified && entry.rank > 1 && <div className="w-[12%]" />}

      {/* Leader badge */}
      {isLeader && isVerified && (
        <motion.div
          initial={{ scale: 0, x: 20 }}
          animate={{ scale: 1, x: 0 }}
          transition={{ delay: 0.4, duration: 0.3, type: 'spring' }}
          className="absolute -right-1 top-1/2 -translate-y-1/2 bg-red-600 text-white font-broadcast text-[1.2vh] px-2 py-0.5"
          style={{ textShadow: '1px 1px 0 rgba(0,0,0,0.5)' }}
        >
          LEADER
        </motion.div>
      )}
    </motion.div>
  );
}
