'use client';

import { motion } from 'framer-motion';

interface ElevationProfileProps {
  distance: number; // in miles
  elevation: number; // gain in feet
  grade: number; // average grade %
  category: string; // "Cat 3", "HC", etc.
  isVisible: boolean;
}

export default function ElevationProfile({
  distance,
  elevation,
  grade,
  category,
  isVisible,
}: ElevationProfileProps) {
  // Generate distance markers based on segment length
  const distanceMarkers = [];
  const markerInterval = distance <= 2 ? 0.5 : distance <= 5 ? 1 : 2;
  for (let i = 0; i <= distance; i += markerInterval) {
    distanceMarkers.push(i.toFixed(1));
  }
  if (parseFloat(distanceMarkers[distanceMarkers.length - 1]) < distance) {
    distanceMarkers.push(distance.toFixed(1));
  }

  // Generate elevation markers (3-4 markers)
  const elevMarkers = [];
  const maxElev = Math.ceil(elevation / 200) * 200 + 200;
  const elevInterval = maxElev <= 600 ? 200 : maxElev <= 1500 ? 500 : 1000;
  for (let i = 0; i <= maxElev; i += elevInterval) {
    elevMarkers.push(i);
  }

  return (
    <motion.div
      className="elevation-profile"
      initial={{ opacity: 0 }}
      animate={{ opacity: isVisible ? 1 : 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
    >
      {/* SVG Profile - 2.5x taller for dramatic effect */}
      <div className="elevation-svg-container">
        <svg viewBox="0 0 400 300" className="elevation-svg">
          {/* Gradient definition */}
          <defs>
            <linearGradient id="elevationFill" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="rgba(186, 224, 247, 0.35)" />
              <stop offset="100%" stopColor="rgba(186, 224, 247, 0.05)" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          <g className="elevation-grid">
            {/* Horizontal grid lines - 5 lines spanning taller area */}
            {[0, 1, 2, 3, 4].map((i) => (
              <line
                key={`h-${i}`}
                x1="40"
                y1={30 + i * 50}
                x2="390"
                y2={30 + i * 50}
                stroke="rgba(255,255,255,0.1)"
                strokeWidth="1"
              />
            ))}
            {/* Vertical grid lines */}
            {distanceMarkers.map((_, i) => (
              <line
                key={`v-${i}`}
                x1={40 + (i * 350) / (distanceMarkers.length - 1)}
                y1="30"
                x2={40 + (i * 350) / (distanceMarkers.length - 1)}
                y2="230"
                stroke="rgba(255,255,255,0.1)"
                strokeWidth="1"
              />
            ))}
          </g>

          {/* Y-axis labels (elevation) */}
          <g className="elevation-labels">
            {elevMarkers.slice(0, 5).reverse().map((elev, i) => (
              <text
                key={`elev-${elev}`}
                x="35"
                y={35 + i * 50}
                textAnchor="end"
                className="elevation-label"
              >
                {elev}ft
              </text>
            ))}
          </g>

          {/* X-axis labels (distance) */}
          <g className="distance-labels">
            {distanceMarkers.map((dist, i) => (
              <text
                key={`dist-${dist}`}
                x={40 + (i * 350) / (distanceMarkers.length - 1)}
                y="260"
                textAnchor="middle"
                className="distance-label"
              >
                {dist}mi
              </text>
            ))}
          </g>

          {/* Filled area under the path */}
          <motion.path
            className="elevation-fill"
            d="M 40 230 Q 80 226 110 209 T 180 156 T 250 93 T 320 51 T 390 40 L 390 230 L 40 230 Z"
            fill="url(#elevationFill)"
            initial={{ opacity: 0 }}
            animate={{ opacity: isVisible ? 1 : 0 }}
            transition={{ delay: 1.5, duration: 0.5 }}
          />

          {/* Main elevation line (animated) */}
          <motion.path
            className="elevation-path"
            d="M 40 230 Q 80 226 110 209 T 180 156 T 250 93 T 320 51 T 390 40"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: isVisible ? 1 : 0 }}
            transition={{ duration: 2, ease: "easeOut" }}
          />
        </svg>
      </div>

      {/* Stats Grid */}
      <div className="elevation-stats">
        <motion.div
          className="elevation-stat"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: isVisible ? 1 : 0, y: isVisible ? 0 : 10 }}
          transition={{ delay: 2.2, duration: 0.3 }}
        >
          <span className="stat-value">{distance.toFixed(2)}mi</span>
          <span className="stat-label">Distance</span>
        </motion.div>

        <motion.div
          className="elevation-stat"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: isVisible ? 1 : 0, y: isVisible ? 0 : 10 }}
          transition={{ delay: 2.4, duration: 0.3 }}
        >
          <span className="stat-value">{elevation.toLocaleString()}ft</span>
          <span className="stat-label">Elevation</span>
        </motion.div>

        <motion.div
          className="elevation-stat"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: isVisible ? 1 : 0, y: isVisible ? 0 : 10 }}
          transition={{ delay: 2.6, duration: 0.3 }}
        >
          <span className="stat-value">{grade}%</span>
          <span className="stat-label">Avg Grade</span>
        </motion.div>

        <motion.div
          className="elevation-stat"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: isVisible ? 1 : 0, y: isVisible ? 0 : 10 }}
          transition={{ delay: 2.8, duration: 0.3 }}
        >
          <span className="stat-value">{category.replace('Cat ', '')}</span>
          <span className="stat-label">Category</span>
        </motion.div>
      </div>
    </motion.div>
  );
}
