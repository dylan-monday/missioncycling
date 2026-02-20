'use client';

import { motion } from 'framer-motion';
import Image from 'next/image';

interface SplashScreenProps {
  onStart: () => void;
}

export default function SplashScreen({ onStart }: SplashScreenProps) {
  return (
    <motion.div
      className="splash-screen"
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.6, ease: 'easeInOut' }}
      onClick={onStart}
    >
      <div className="splash-content">
        <motion.div
          className="splash-logo"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
          <Image
            src="/mc_logo.svg"
            alt="Mission Cycling"
            width={180}
            height={180}
            className="object-contain"
          />
        </motion.div>

        <motion.p
          className="splash-tagline"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.6 }}
        >
          PREMIUM SUFFERING SINCE 2008
        </motion.p>

        <motion.p
          className="splash-cta"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 1.0 }}
        >
          Click to begin
        </motion.p>
      </div>
    </motion.div>
  );
}
