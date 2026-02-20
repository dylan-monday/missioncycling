'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';
import LeaderboardRow from './LeaderboardRow';

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

interface LeaderboardProps {
  segment: Segment;
}

export default function Leaderboard({ segment }: LeaderboardProps) {
  const leaderTime = segment.mission_cycling_leaderboard[0]?.time;
  const [animationPhase, setAnimationPhase] = useState<'title' | 'top3-big' | 'top3-shrink' | 'rest'>('title');

  // Animation sequence timing
  useEffect(() => {
    setAnimationPhase('title');

    // After title animation (1.2s), show top 3 big
    const timer1 = setTimeout(() => setAnimationPhase('top3-big'), 1200);

    // After top 3 appear big (1.8s for all 3 + pause), shrink them
    const timer2 = setTimeout(() => setAnimationPhase('top3-shrink'), 3500);

    // After shrink animation (0.5s), show the rest
    const timer3 = setTimeout(() => setAnimationPhase('rest'), 4200);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
    };
  }, [segment.id]);

  const topThree = segment.mission_cycling_leaderboard.slice(0, 3);
  const theRest = segment.mission_cycling_leaderboard.slice(3, 10);

  return (
    <div className="h-full flex flex-col">
      {/* Segment Title Bar - DRAMATIC ENTRANCE */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="relative h-[12%] flex items-center overflow-hidden"
      >
        {/* Background bar slams in from left */}
        <motion.div
          initial={{ x: '-100%', scaleX: 1.2 }}
          animate={{ x: 0, scaleX: 1 }}
          transition={{
            duration: 0.5,
            ease: [0.22, 1.2, 0.36, 1],
          }}
          className="absolute inset-0 bg-gradient-to-r from-red-700 via-red-600 to-red-700/80"
          style={{
            boxShadow: '0 4px 20px rgba(0,0,0,0.6), inset 0 2px 0 rgba(255,255,255,0.2)',
          }}
        />

        {/* Corner accents flash in */}
        <motion.div
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.4, duration: 0.2 }}
          className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-yellow-400"
        />
        <motion.div
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.45, duration: 0.2 }}
          className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-yellow-400"
        />
        <motion.div
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.5, duration: 0.2 }}
          className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-yellow-400"
        />
        <motion.div
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.55, duration: 0.2 }}
          className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-yellow-400"
        />

        {/* Title text SLAMS in with scale and glow */}
        <motion.h2
          initial={{
            x: -200,
            opacity: 0,
            scale: 1.5,
            filter: 'blur(10px)',
          }}
          animate={{
            x: 0,
            opacity: 1,
            scale: 1,
            filter: 'blur(0px)',
          }}
          transition={{
            delay: 0.15,
            duration: 0.6,
            ease: [0.22, 1.3, 0.36, 1],
          }}
          className="relative z-10 font-broadcast text-[3.5vh] text-yellow-400 uppercase tracking-wider flex-1 px-4"
          style={{
            textShadow: `
              4px 4px 0 #000,
              -2px -2px 0 #000,
              2px -2px 0 #000,
              -2px 2px 0 #000,
              0 0 30px rgba(255, 215, 0, 0.5),
              0 0 60px rgba(255, 215, 0, 0.3)
            `,
          }}
        >
          {segment.name}
        </motion.h2>

        {/* Stats slide in from right after title */}
        <motion.div
          initial={{ x: 100, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{
            delay: 0.6,
            duration: 0.4,
            ease: 'easeOut',
          }}
          className="relative z-10 flex items-center gap-4 text-[1.4vh] font-mono pr-4"
        >
          <span className="text-white/80">
            <span className="text-yellow-400">{segment.distance.mi}</span> mi
          </span>
          <span className="text-white/80">
            <span className="text-yellow-400">{segment.elevation.gain_ft}</span> ft
          </span>
          <span className="text-white/80">
            <span className="text-yellow-400">{segment.grade}%</span>
          </span>
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.8, duration: 0.3, type: 'spring' }}
            className={`font-bold px-2 py-0.5 ${
              segment.category === 'HC' ? 'bg-red-600 text-white' :
              segment.category === 'Cat 3' ? 'bg-orange-500 text-white' :
              'bg-green-600 text-white'
            }`}
          >
            {segment.category}
          </motion.span>
        </motion.div>
      </motion.div>

      {/* Leaderboard rows container */}
      <div className="flex-1 flex flex-col justify-start pt-2 overflow-hidden">
        {/* TOP 3 - Special treatment */}
        <AnimatePresence>
          {(animationPhase === 'top3-big' || animationPhase === 'top3-shrink' || animationPhase === 'rest') && (
            <>
              {topThree.map((entry, index) => (
                <LeaderboardRow
                  key={`${segment.id}-${entry.rank}`}
                  entry={entry}
                  index={index}
                  leaderTime={leaderTime}
                  animationPhase={animationPhase}
                  isTopThreeSlot={true}
                />
              ))}
            </>
          )}
        </AnimatePresence>

        {/* REST OF LEADERBOARD (4-10) */}
        <AnimatePresence>
          {animationPhase === 'rest' && (
            <>
              {theRest.map((entry, index) => (
                <LeaderboardRow
                  key={`${segment.id}-${entry.rank}`}
                  entry={entry}
                  index={index}
                  leaderTime={leaderTime}
                  animationPhase={animationPhase}
                  isTopThreeSlot={false}
                />
              ))}
            </>
          )}
        </AnimatePresence>
      </div>

      {/* Club record bar - fades in last */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: animationPhase === 'rest' ? 1 : 0, y: animationPhase === 'rest' ? 0 : 20 }}
        transition={{ delay: animationPhase === 'rest' ? 1.5 : 0, duration: 0.5 }}
        className="h-[5%] flex items-center justify-center bg-black/40"
      >
        <span className="text-yellow-400/70 font-mono text-[1.2vh] tracking-[0.2em]">
          CLUB RECORD: {segment.clubBestTime} &bull; {segment.clubMembers} MEMBERS
        </span>
      </motion.div>
    </div>
  );
}
