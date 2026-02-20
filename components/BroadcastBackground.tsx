'use client';

interface BroadcastBackgroundProps {
  backgroundImage?: string;
}

export default function BroadcastBackground({ backgroundImage = '/hawkhill.jpg' }: BroadcastBackgroundProps) {
  return (
    <div className="absolute inset-0 -z-10 overflow-hidden">
      {/* Background image */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: `url(${backgroundImage})`,
        }}
      />

      {/* Dark gradient overlay for readability */}
      <div
        className="absolute inset-0"
        style={{
          background: `linear-gradient(
            to right,
            rgba(0, 0, 0, 0.85) 0%,
            rgba(0, 0, 0, 0.7) 30%,
            rgba(0, 0, 0, 0.4) 60%,
            rgba(0, 0, 0, 0.3) 100%
          )`,
        }}
      />

      {/* Warm broadcast color wash */}
      <div
        className="absolute inset-0 opacity-30"
        style={{
          background: `linear-gradient(
            135deg,
            rgba(204, 41, 54, 0.4) 0%,
            transparent 40%,
            transparent 60%,
            rgba(26, 58, 92, 0.3) 100%
          )`,
        }}
      />

      {/* CRT vignette */}
      <div
        className="absolute inset-0"
        style={{
          background: `radial-gradient(
            ellipse at center,
            transparent 0%,
            transparent 50%,
            rgba(0, 0, 0, 0.6) 100%
          )`,
        }}
      />
    </div>
  );
}
