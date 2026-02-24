'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import Image from 'next/image';

interface SplashScreenProps {
  onStravaAuth?: () => void;
  isAuthenticating?: boolean;
  onStart?: () => void; // Legacy prop for ungated mode
}

export default function SplashScreen({ onStravaAuth, isAuthenticating, onStart }: SplashScreenProps) {
  const [isMobile, setIsMobile] = useState(false);
  const isGatedMode = process.env.NEXT_PUBLIC_GATE_MODE === 'gated';

  useEffect(() => {
    // Check viewport width on mount and resize
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Mobile block message
  if (isMobile && isGatedMode) {
    return (
      <motion.div
        className="splash-screen"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6 }}
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
              width={140}
              height={140}
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

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 1.0 }}
            className="text-center px-8 mt-8"
          >
            <p className="text-white/70 text-base leading-relaxed">
              This experience is built for desktop.
            </p>
            <p className="text-white/50 text-sm mt-3">
              Grab a laptop, turn up the sound, and come back.
            </p>
          </motion.div>
        </div>
      </motion.div>
    );
  }

  // Gated mode with Strava button
  if (isGatedMode && onStravaAuth) {
    return (
      <motion.div
        className="splash-screen"
        initial={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.6, ease: 'easeInOut' }}
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
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.9 }}
            className="text-white/50 text-sm mt-2 mb-8"
          >
            A broadcast experience. Best on desktop with audio.
          </motion.p>

          <motion.button
            onClick={onStravaAuth}
            disabled={isAuthenticating}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 1.2 }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="strava-auth-button"
            style={{
              backgroundColor: '#FC4C02',
              color: 'white',
              padding: '14px 32px',
              borderRadius: '6px',
              fontSize: '15px',
              fontWeight: 600,
              border: 'none',
              cursor: isAuthenticating ? 'wait' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              opacity: isAuthenticating ? 0.7 : 1,
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.169" />
            </svg>
            {isAuthenticating ? 'Connecting...' : 'Connect with Strava'}
          </motion.button>
        </div>
      </motion.div>
    );
  }

  // Ungated mode (click to start)
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
