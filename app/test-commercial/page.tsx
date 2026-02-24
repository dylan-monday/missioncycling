'use client';

import { useState, useRef, useEffect } from 'react';
import CommercialBreak from '@/components/CommercialBreak';

const AUDIO_TRACKS = [
  '/victory-circuit.mp3',
  '/triomphe-en-vhs.mp3',
  '/stadium-flash-86.mp3',
];

export default function TestCommercialPage() {
  const [showBreak, setShowBreak] = useState(false);
  const [shownSponsors, setShownSponsors] = useState<Set<string>>(new Set());
  const [musicStarted, setMusicStarted] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Start background music on first interaction
  const startMusic = () => {
    if (!audioRef.current) {
      const track = AUDIO_TRACKS[Math.floor(Math.random() * AUDIO_TRACKS.length)];
      console.log('[TestPage] Starting music:', track);
      const audio = new Audio(track);
      audio.volume = 0.25;
      audio.loop = true;
      audioRef.current = audio;
    }
    audioRef.current.play()
      .then(() => console.log('[TestPage] Music playing'))
      .catch(e => console.error('[TestPage] Music failed:', e));
    setMusicStarted(true);
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: '#111',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '20px'
    }}>
      {/* Background video to simulate real environment */}
      <video
        autoPlay
        muted
        loop
        playsInline
        style={{
          position: 'fixed',
          inset: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          zIndex: 0,
        }}
      >
        <source src="/video/mc broadcast 01.mp4" type="video/mp4" />
      </video>

      {!showBreak && (
        <div style={{ position: 'relative', zIndex: 10, textAlign: 'center' }}>
          <h1 style={{ color: 'white', marginBottom: '20px', fontFamily: 'system-ui' }}>
            Commercial Break Test
          </h1>
          <button
            onClick={() => {
              if (!musicStarted) startMusic();
              setShowBreak(true);
            }}
            style={{
              padding: '16px 32px',
              fontSize: '18px',
              background: '#BAE0F7',
              color: '#111',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: 600,
            }}
          >
            Play Commercial Break
          </button>
          <p style={{ color: 'rgba(255,255,255,0.5)', marginTop: '16px', fontSize: '14px' }}>
            Shown sponsors: {shownSponsors.size} / 19
          </p>
        </div>
      )}

      {showBreak && (
        <CommercialBreak
          onComplete={() => {
            setShowBreak(false);
            console.log('Commercial break complete!');
          }}
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
          backgroundVolume={0.25}
          backgroundDuckVolume={0.06}
        />
      )}
    </div>
  );
}
