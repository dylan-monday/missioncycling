'use client';

export default function ScanLines() {
  return (
    <>
      {/* Moving scan line - bright bar that sweeps down */}
      <div className="pointer-events-none absolute inset-0 z-50 overflow-hidden">
        <div
          className="absolute left-0 right-0 h-[8px] animate-scan-line"
          style={{
            background: `linear-gradient(
              180deg,
              transparent 0%,
              rgba(255, 255, 255, 0.04) 20%,
              rgba(255, 255, 255, 0.08) 50%,
              rgba(255, 255, 255, 0.04) 80%,
              transparent 100%
            )`,
          }}
        />
      </div>

      {/* CRT flicker - random brightness variation */}
      <div
        className="pointer-events-none absolute inset-0 z-40 animate-flicker"
        style={{
          background: 'rgba(0, 0, 0, 0.02)',
        }}
      />

      {/* Phosphor persistence / ghosting effect */}
      <div
        className="pointer-events-none absolute inset-0 z-30"
        style={{
          background: 'radial-gradient(ellipse at 50% 50%, rgba(100, 200, 255, 0.01) 0%, transparent 70%)',
          mixBlendMode: 'screen',
        }}
      />
    </>
  );
}
