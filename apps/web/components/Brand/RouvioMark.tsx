'use client'

/**
 * Rouvio — Gem Peak mark
 * A precision-faceted 4-face crystal: deep cobalt shadow · luminous lit face · mint reflected light.
 * Usage: <RouvioMark size={32} /> or <RouvioLockup size={32} />
 */

interface MarkProps {
  size?: number
  className?: string
}

export function RouvioMark({ size = 40, className }: MarkProps) {
  // Outer vertices (kite/diamond, wider than tall):
  //   North apex  → (32, 5)
  //   East        → (60, 28)
  //   South nadir → (32, 67)
  //   West        → (4, 28)
  // Inner center  → (32, 23) — raised above midpoint for gem/mountain proportion

  const h = Math.round(size * (70 / 64))   // maintain viewBox aspect ratio

  return (
    <svg
      width={size}
      height={h}
      viewBox="0 0 64 70"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <defs>
        {/* ── Outer glow / aura ── */}
        <filter id="rm-outer" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="4.5" result="blur" />
          <feFlood floodColor="#00C9A7" floodOpacity="0.28" result="col" />
          <feComposite in="col" in2="blur" operator="in" result="glow" />
          <feMerge>
            <feMergeNode in="glow" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        {/* ── Apex bloom — mint radial ── */}
        <radialGradient id="rm-apex-bloom" cx="50%" cy="50%" r="50%">
          <stop offset="0%"   stopColor="#00C9A7" stopOpacity="0.75" />
          <stop offset="55%"  stopColor="#00C9A7" stopOpacity="0.2"  />
          <stop offset="100%" stopColor="#00C9A7" stopOpacity="0"    />
        </radialGradient>

        {/* ── Subsurface scatter — gives depth/translucency ── */}
        <radialGradient id="rm-scatter" cx="65%" cy="18%" r="70%" gradientUnits="objectBoundingBox">
          <stop offset="0%"   stopColor="#7AB8FF" stopOpacity="0.3"  />
          <stop offset="55%"  stopColor="#2A5CB0" stopOpacity="0.08" />
          <stop offset="100%" stopColor="#000"    stopOpacity="0"    />
        </radialGradient>

        {/* ── Face gradients ── */}

        {/* NW — shadow face (dark cobalt → near-black) */}
        <linearGradient id="rm-nw" x1="32" y1="5" x2="4" y2="28" gradientUnits="userSpaceOnUse">
          <stop offset="0%"   stopColor="#1C3A6A" />
          <stop offset="100%" stopColor="#060D1C" />
        </linearGradient>

        {/* NE — primary lit face (near-white → cobalt) */}
        <linearGradient id="rm-ne" x1="60" y1="5" x2="32" y2="23" gradientUnits="userSpaceOnUse">
          <stop offset="0%"   stopColor="#D2EBFF" />
          <stop offset="28%"  stopColor="#4E88DC" />
          <stop offset="100%" stopColor="#1C408A" />
        </linearGradient>

        {/* SW — deep abyss (near-black) */}
        <linearGradient id="rm-sw" x1="32" y1="23" x2="4" y2="67" gradientUnits="userSpaceOnUse">
          <stop offset="0%"   stopColor="#0A1526" />
          <stop offset="100%" stopColor="#020407" />
        </linearGradient>

        {/* SE — mint reflected light (bright mint → deep teal) */}
        <linearGradient id="rm-se" x1="60" y1="23" x2="32" y2="67" gradientUnits="userSpaceOnUse">
          <stop offset="0%"   stopColor="#00C9A7" />
          <stop offset="42%"  stopColor="#007060" />
          <stop offset="100%" stopColor="#002B22" />
        </linearGradient>

        {/* ── Rim highlight gradient (N→E edge) ── */}
        <linearGradient id="rm-rim" x1="32" y1="5" x2="60" y2="28" gradientUnits="userSpaceOnUse">
          <stop offset="0%"   stopColor="white" stopOpacity="0.95" />
          <stop offset="70%"  stopColor="white" stopOpacity="0.35" />
          <stop offset="100%" stopColor="white" stopOpacity="0.05" />
        </linearGradient>

        {/* ── Belt / seam line (orange accent) ── */}
        <linearGradient id="rm-belt" x1="4" y1="28" x2="60" y2="28" gradientUnits="userSpaceOnUse">
          <stop offset="0%"   stopColor="#FF8C42" stopOpacity="0.1"  />
          <stop offset="40%"  stopColor="#FF8C42" stopOpacity="0.85" />
          <stop offset="60%"  stopColor="#FF8C42" stopOpacity="0.85" />
          <stop offset="100%" stopColor="#FF8C42" stopOpacity="0.1"  />
        </linearGradient>
      </defs>

      {/* ── Apex bloom (mint aura above peak) ── */}
      <ellipse cx="32" cy="10" rx="16" ry="13" fill="url(#rm-apex-bloom)" />

      {/* ── Four gem faces ── */}
      <polygon points="32,5 4,28 32,23"  fill="url(#rm-nw)" />
      <polygon points="32,5 32,23 60,28" fill="url(#rm-ne)" />
      <polygon points="32,23 4,28 32,67" fill="url(#rm-sw)" />
      <polygon points="32,23 32,67 60,28" fill="url(#rm-se)" />

      {/* ── Subsurface scatter overlay (depth/translucency) ── */}
      <polygon points="32,5 4,28 32,23"  fill="url(#rm-scatter)" opacity="0.55" />
      <polygon points="32,5 32,23 60,28" fill="url(#rm-scatter)" opacity="0.9"  />

      {/* ── Belt seam — V-line W→inner→E in orange ── */}
      {/* Goes W(4,28) → inner(32,23) → E(60,28): a slight dip upward in the center */}
      <polyline
        points="4,28 32,23 60,28"
        stroke="url(#rm-belt)"
        strokeWidth="0.85"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />

      {/* ── Lit ridge line — N apex to E (the primary lit edge) ── */}
      <line x1="32" y1="5" x2="60" y2="28" stroke="url(#rm-rim)" strokeWidth="1.3" />

      {/* ── Left edge (faint) ── */}
      <line x1="32" y1="5" x2="4" y2="28" stroke="white" strokeWidth="0.5" opacity="0.1" />

      {/* ── Inner center jewel point ── */}
      <circle cx="32" cy="23" r="3"   fill="white" opacity="0.09" />
      <circle cx="32" cy="23" r="1.2" fill="white" opacity="0.28" />

      {/* ── Apex jewel — mint tip ── */}
      <circle cx="32" cy="5" r="4.5" fill="#00C9A7" opacity="0.92" />
      <circle cx="32" cy="5" r="2"   fill="white"   opacity="0.97" />

      {/* ── Nadir accent (very subtle mint dot at bottom pin point) ── */}
      <circle cx="32" cy="67" r="1.8" fill="#00C9A7" opacity="0.35" />
    </svg>
  )
}

/** Horizontal lockup: mark + wordmark */
export function RouvioLockup({ size = 36, dark = false }: { size?: number; dark?: boolean }) {
  const wordColor = dark ? '#0F1F3D' : 'white'
  const subColor  = dark ? 'rgba(15,31,61,0.45)' : 'rgba(255,255,255,0.38)'

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: Math.round(size * 0.28) }}>
      <RouvioMark size={size} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 1, lineHeight: 1 }}>
        <span
          style={{
            fontFamily: 'Outfit, sans-serif',
            fontWeight: 700,
            fontSize: Math.round(size * 0.55),
            color: wordColor,
            letterSpacing: '-0.3px',
          }}
        >
          rouvio
        </span>
        <span
          style={{
            fontFamily: 'DM Sans, sans-serif',
            fontWeight: 400,
            fontSize: Math.round(size * 0.24),
            color: subColor,
            letterSpacing: '1.5px',
            textTransform: 'uppercase',
          }}
        >
          entdecke die route
        </span>
      </div>
    </div>
  )
}
