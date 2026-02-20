'use client';

import { motion } from 'framer-motion';

interface Segment {
  id: string;
  name: string;
  category: string;
  visible: boolean;
}

interface SegmentSelectorProps {
  segments: Segment[];
  activeSegment: string;
  onSelect: (id: string) => void;
}

export default function SegmentSelector({ segments, activeSegment, onSelect }: SegmentSelectorProps) {
  const visibleSegments = segments.filter(s => s.visible);

  return (
    <div className="flex items-center gap-1">
      {visibleSegments.map((segment) => {
        const isActive = segment.id === activeSegment;

        return (
          <motion.button
            key={segment.id}
            onClick={() => onSelect(segment.id)}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className={`
              relative px-2 py-1 font-broadcast text-[1.2vh] uppercase tracking-wide
              transition-all duration-150
              ${isActive
                ? 'bg-gradient-to-b from-yellow-400 to-yellow-600 text-black'
                : 'bg-white/10 text-white/70 hover:bg-white/20 hover:text-white'
              }
            `}
            style={{
              textShadow: isActive ? 'none' : '1px 1px 0 rgba(0,0,0,0.5)',
            }}
          >
            {segment.name}

            {isActive && (
              <motion.div
                layoutId="activeTab"
                className="absolute -bottom-[2px] left-0 right-0 h-[2px] bg-yellow-400"
              />
            )}
          </motion.button>
        );
      })}
    </div>
  );
}
