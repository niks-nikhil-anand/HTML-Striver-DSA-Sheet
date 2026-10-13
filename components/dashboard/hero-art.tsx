// Decorative hero artwork: a lone developer on a ledge above a glowing city.
// Pure SVG driven by CSS variables (--art-*), so one component serves both themes:
// deep-space neon in dark mode, an airy luminous dawn in light mode. No images, no JS.

const FAR = [
  [0, 210, 40], [42, 170, 34], [78, 195, 46], [126, 150, 30], [158, 185, 40], [200, 160, 36], [238, 205, 44],
  [284, 140, 32], [318, 180, 42], [362, 155, 30], [394, 200, 46], [442, 165, 34], [478, 190, 40], [520, 145, 30],
  [552, 175, 44], [598, 150, 36], [636, 195, 42], [680, 160, 34], [716, 185, 40], [758, 170, 42],
] as const;

const MID = [
  [10, 250, 50], [64, 220, 38], [104, 262, 56], [164, 232, 44], [212, 270, 50], [266, 215, 40], [310, 255, 54],
  [368, 225, 42], [414, 268, 52], [470, 238, 46], [520, 262, 50], [574, 228, 40], [618, 258, 54], [676, 235, 44], [724, 266, 60],
] as const;

const STARS = [
  [60, 40], [140, 90], [230, 30], [320, 70], [410, 25], [500, 60], [590, 35], [660, 95], [740, 45], [770, 120],
  [180, 140], [455, 110], [705, 150], [90, 150], [545, 140],
] as const;

export function HeroArt({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 800 400"
      preserveAspectRatio="xMaxYMax slice"
      aria-hidden
      focusable="false"
      className={className}
    >
      <defs>
        <linearGradient id="hero-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" style={{ stopColor: "var(--art-sky-top)" }} />
          <stop offset="1" style={{ stopColor: "var(--art-sky-bottom)" }} />
        </linearGradient>
        <radialGradient id="hero-orb-glow">
          <stop offset="0" style={{ stopColor: "var(--art-orb)", stopOpacity: 0.55 }} />
          <stop offset="1" style={{ stopColor: "var(--art-orb)", stopOpacity: 0 }} />
        </radialGradient>
      </defs>

      <rect width="800" height="400" fill="url(#hero-sky)" />

      {STARS.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={i % 3 === 0 ? 1.6 : 1} style={{ fill: "var(--art-star)", animationDelay: `${(i % 5) * 0.8}s` }} className="twinkle" />
      ))}

      {/* planet + ring */}
      <circle cx="610" cy="120" r="120" fill="url(#hero-orb-glow)" />
      <circle cx="610" cy="120" r="46" style={{ fill: "var(--art-orb)" }} opacity="0.92" />
      <ellipse cx="610" cy="124" rx="86" ry="14" fill="none" style={{ stroke: "var(--art-orb)" }} strokeWidth="2" opacity="0.55" transform="rotate(-14 610 124)" />

      {/* skyline layers */}
      {FAR.map(([x, y, w], i) => (
        <rect key={`f${i}`} x={x} y={y} width={w} height={400 - y} style={{ fill: "var(--art-far)" }} />
      ))}
      {MID.map(([x, y, w], i) => (
        <g key={`m${i}`}>
          <rect x={x} y={y} width={w} height={400 - y} style={{ fill: "var(--art-mid)" }} />
          {Array.from({ length: Math.floor(w / 12) }).map((_, c) =>
            Array.from({ length: 4 }).map((__, r) =>
              (i + c + r) % 3 === 0 ? (
                <rect key={`${c}-${r}`} x={x + 6 + c * 11} y={y + 10 + r * 16} width="4" height="5" rx="1" style={{ fill: "var(--art-window)" }} opacity="0.85" />
              ) : null,
            ),
          )}
        </g>
      ))}

      {/* foreground ledge */}
      <path d="M430 400 L430 338 Q470 322 540 326 L800 318 L800 400 Z" style={{ fill: "var(--art-near)" }} />
      <rect x="430" y="322" width="370" height="3" style={{ fill: "var(--art-window)" }} opacity="0.5" />

      {/* lone developer: seated, back to us, laptop glowing */}
      <g style={{ fill: "var(--art-figure)" }}>
        <circle cx="600" cy="278" r="9" />
        <path d="M588 292 Q600 284 612 292 L616 322 L584 322 Z" />
        <path d="M584 322 L560 322 L560 328 L612 328 L616 322 Z" />
        <path d="M612 304 L632 314 L628 318 L610 312 Z" />
      </g>
      <rect x="626" y="308" width="22" height="14" rx="2" style={{ fill: "var(--art-figure)" }} />
      <rect x="629" y="310" width="16" height="9" rx="1" style={{ fill: "var(--art-window)" }} opacity="0.9" />
    </svg>
  );
}
