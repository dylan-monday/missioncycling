'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface Photo {
  id: number;
  src: string;
  x: number;        // final x position (% of viewport)
  y: number;        // final y position (% of viewport)
  rotation: number; // final rotation (-30 to 30 degrees)
  scale: number;    // 0.6 to 1.2
  startX: number;   // starting x (off-screen)
  startY: number;   // starting y (off-screen)
  startRotation: number; // starting rotation (more extreme)
  zIndex: number;
}

interface PhotoPileProps {
  photos: string[];           // array of photo URLs
  interval?: number;          // ms between new photos (default 4000)
  overlayOpacity?: number;    // darkness of overlay (default 0.85)
}

export default function PhotoPile({
  photos,
  interval = 4000,
  overlayOpacity = 0.85,
}: PhotoPileProps) {
  const [droppedPhotos, setDroppedPhotos] = useState<Photo[]>([]);
  const [photoIndex, setPhotoIndex] = useState(0);
  const [idCounter, setIdCounter] = useState(0);

  const dropNewPhoto = useCallback(() => {
    if (photos.length === 0) return;

    // Pick next photo (cycle through)
    const src = photos[photoIndex % photos.length];
    setPhotoIndex(prev => prev + 1);

    // Random final position (-20% to 120% so some are partially off-screen)
    const x = Math.random() * 140 - 20;
    const y = Math.random() * 140 - 20;
    const rotation = (Math.random() - 0.5) * 60; // -30 to +30 degrees
    const scale = 0.6 + Math.random() * 0.6; // 0.6 to 1.2

    // Random starting position (off one of the edges)
    const edge = Math.floor(Math.random() * 4);
    let startX: number, startY: number;
    switch (edge) {
      case 0: // top
        startX = Math.random() * 100;
        startY = -30;
        break;
      case 1: // right
        startX = 130;
        startY = Math.random() * 100;
        break;
      case 2: // bottom
        startX = Math.random() * 100;
        startY = 130;
        break;
      default: // left
        startX = -30;
        startY = Math.random() * 100;
        break;
    }

    const startRotation = rotation + (Math.random() - 0.5) * 180; // more spin at start

    const newPhoto: Photo = {
      id: idCounter,
      src,
      x,
      y,
      rotation,
      scale,
      startX,
      startY,
      startRotation,
      zIndex: idCounter,
    };

    setIdCounter(prev => prev + 1);
    setDroppedPhotos(prev => [...prev, newPhoto]);
  }, [photos, photoIndex, idCounter]);

  // Drop photos on interval
  useEffect(() => {
    // Drop first photo immediately
    const initialTimer = setTimeout(dropNewPhoto, 500);

    // Then continue on interval
    const intervalTimer = setInterval(dropNewPhoto, interval);

    return () => {
      clearTimeout(initialTimer);
      clearInterval(intervalTimer);
    };
  }, [dropNewPhoto, interval]);

  return (
    <div className="absolute inset-0 overflow-hidden">
      {/* Photo pile layer */}
      <div className="absolute inset-0">
        <AnimatePresence>
          {droppedPhotos.map((photo) => (
            <motion.div
              key={photo.id}
              className="absolute"
              style={{
                zIndex: photo.zIndex,
                // Photo container - larger size
                width: `${26 * photo.scale}vw`,
                maxWidth: '400px',
                minWidth: '150px',
              }}
              initial={{
                left: `${photo.startX}%`,
                top: `${photo.startY}%`,
                rotate: photo.startRotation,
                scale: 0.5,
                opacity: 0,
              }}
              animate={{
                left: `${photo.x}%`,
                top: `${photo.y}%`,
                rotate: photo.rotation,
                scale: 1,
                opacity: 1,
              }}
              transition={{
                type: 'spring',
                stiffness: 30,
                damping: 20,
                mass: 2,
                duration: 2,
              }}
            >
              {/* Photo with shadow and white border */}
              <div
                className="bg-white p-1 shadow-2xl"
                style={{
                  boxShadow: '0 10px 30px rgba(0,0,0,0.5), 0 5px 15px rgba(0,0,0,0.3)',
                }}
              >
                <img
                  src={photo.src}
                  alt=""
                  className="w-full h-auto block"
                  style={{
                    aspectRatio: 'auto',
                  }}
                />
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Dark overlay to obscure photos */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ backgroundColor: `rgba(0, 0, 0, ${overlayOpacity})` }}
      />
    </div>
  );
}
