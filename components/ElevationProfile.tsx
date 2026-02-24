'use client';

import { motion } from 'framer-motion';

interface ElevationProfileProps {
  segmentId: string; // segment identifier for profile shape
  distance: number; // in miles
  elevation: number; // gain in feet
  grade: number; // average grade %
  category: string; // "Cat 3", "HC", etc.
  isVisible: boolean;
}

// Custom elevation profile paths traced from Strava screenshots
// Coordinate system: X 40-390 (350 units), Y 30-230 (200 units)
const SEGMENT_PROFILES: Record<string, { path: string; fill: string }> = {
  // Hawk Hill: Gentle start, steeper mid-section, slight easing near top
  'hawk-hill': {
    path: 'M 40 230 Q 80 226 110 218 T 160 193 T 210 145 T 260 95 T 310 55 T 360 38 T 390 30',
    fill: 'M 40 230 Q 80 226 110 218 T 160 193 T 210 145 T 260 95 T 310 55 T 360 38 T 390 30 L 390 230 L 40 230 Z',
  },
  // Radio Road: Sharp steep initial climb, then more gradual upper section
  'radio-road': {
    path: 'M 40 230 Q 55 212 70 165 T 100 105 T 150 68 T 210 48 T 280 38 T 350 33 T 390 30',
    fill: 'M 40 230 Q 55 212 70 165 T 100 105 T 150 68 T 210 48 T 280 38 T 350 33 T 390 30 L 390 230 L 40 230 Z',
  },
  // Old La Honda: Steady consistent climb with minor undulations
  'old-la-honda': {
    path: 'M 40 230 Q 70 219 100 200 T 150 160 T 200 120 T 250 85 T 300 55 T 350 38 T 390 30',
    fill: 'M 40 230 Q 70 219 100 200 T 150 160 T 200 120 T 250 85 T 300 55 T 350 38 T 390 30 L 390 230 L 40 230 Z',
  },
  // Hwy 1 from Muir Beach: Climb, plateau in middle, then steeper at end
  'hwy1-muir-beach': {
    path: 'M 40 230 Q 70 205 100 160 T 150 112 T 200 90 T 250 82 T 300 70 T 350 45 T 390 30',
    fill: 'M 40 230 Q 70 205 100 160 T 150 112 T 200 90 T 250 82 T 300 70 T 350 45 T 390 30 L 390 230 L 40 230 Z',
  },
  // Alpe d'Huez: Classic long steady HC climb
  'alpe-dhuez': {
    path: 'M 40 230 Q 70 219 100 205 T 150 175 T 200 140 T 250 105 T 300 70 T 350 45 T 390 30',
    fill: 'M 40 230 Q 70 219 100 205 T 150 175 T 200 140 T 250 105 T 300 70 T 350 45 T 390 30 L 390 230 L 40 230 Z',
  },
  // Four Corners: Stepped climb with small plateaus
  'four-corners': {
    path: 'M 40 230 Q 60 223 80 208 T 120 180 T 170 145 T 220 115 T 270 82 T 320 55 T 370 38 T 390 30',
    fill: 'M 40 230 Q 60 223 80 208 T 120 180 T 170 145 T 220 115 T 270 82 T 320 55 T 370 38 T 390 30 L 390 230 L 40 230 Z',
  },
  // BoFax Climb: Steady consistent Cat 2 climb
  'bofax-climb': {
    path: 'M 40 230 Q 70 215 100 195 T 150 155 T 200 118 T 250 82 T 300 52 T 350 38 T 390 30',
    fill: 'M 40 230 Q 70 215 100 195 T 150 155 T 200 118 T 250 82 T 300 52 T 350 38 T 390 30 L 390 230 L 40 230 Z',
  },
  // Bourg d'Oisans: Flat start, big climb mid-section, then gradual rise
  'bourg-doisans': {
    path: 'M 40 230 Q 70 226 100 222 T 150 212 T 190 165 T 230 90 T 280 55 T 330 42 T 390 30',
    fill: 'M 40 230 Q 70 226 100 222 T 150 212 T 190 165 T 230 90 T 280 55 T 330 42 T 390 30 L 390 230 L 40 230 Z',
  },
};

export default function ElevationProfile({
  segmentId,
  distance,
  elevation,
  grade,
  category,
  isVisible,
}: ElevationProfileProps) {
  // Get the profile for this segment, fallback to a default
  const profile = SEGMENT_PROFILES[segmentId] || SEGMENT_PROFILES['hawk-hill'];

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
      {/* SVG Profile - 2x taller for dramatic effect */}
      <div className="elevation-svg-container">
        <svg viewBox="0 0 400 300" className="elevation-svg">
          {/* Gradient definition */}
          <defs>
            <linearGradient id={`elevationFill-${segmentId}`} x1="0%" y1="0%" x2="0%" y2="100%">
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
            d={profile.fill}
            fill={`url(#elevationFill-${segmentId})`}
            initial={{ opacity: 0 }}
            animate={{ opacity: isVisible ? 1 : 0 }}
            transition={{ delay: 1.5, duration: 0.5 }}
          />

          {/* Main elevation line (animated) */}
          <motion.path
            className="elevation-path"
            d={profile.path}
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
