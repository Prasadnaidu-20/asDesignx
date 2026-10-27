// Products have no image field yet, so each design gets generated artwork that is
// stable for its id: the same product always renders the same picture.

const PALETTES = [
  ['#7c3aed', '#ec4899', '#f59e0b'],
  ['#4f46e5', '#06b6d4', '#a855f7'],
  ['#9333ea', '#f43f5e', '#fb923c'],
  ['#2563eb', '#8b5cf6', '#22d3ee'],
  ['#c026d3', '#6366f1', '#14b8a6'],
  ['#7c3aed', '#0ea5e9', '#f472b6'],
]

function rng(seed) {
  let s = seed * 9301 + 49297
  return () => {
    s = (s * 9301 + 49297) % 233280
    return s / 233280
  }
}

export default function DesignArt({ id = 1, name = '' }) {
  const rand = rng(Number(id) + name.length * 7)
  const [a, b, c] = PALETTES[Number(id) % PALETTES.length]
  const variant = Number(id) % 3
  const gid = `g-${id}`
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('')

  const blobs = Array.from({ length: 4 }, () => ({
    cx: 40 + rand() * 320,
    cy: 30 + rand() * 240,
    r: 50 + rand() * 90,
  }))

  return (
    <div className="design-art">
      <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        <defs>
          <linearGradient id={`${gid}-bg`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#0d0620" />
            <stop offset="1" stopColor="#1a0b33" />
          </linearGradient>
          <linearGradient id={`${gid}-fg`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor={a} />
            <stop offset="0.6" stopColor={b} />
            <stop offset="1" stopColor={c} />
          </linearGradient>
          <filter id={`${gid}-blur`}>
            <feGaussianBlur stdDeviation="28" />
          </filter>
        </defs>

        <rect width="400" height="300" fill={`url(#${gid}-bg)`} />
        <g filter={`url(#${gid}-blur)`} opacity="0.75">
          {blobs.map((bl, i) => (
            <circle key={i} cx={bl.cx} cy={bl.cy} r={bl.r} fill={[a, b, c][i % 3]} />
          ))}
        </g>

        {variant === 0 && (
          <g fill="none" stroke={`url(#${gid}-fg)`} strokeWidth="2" opacity="0.9">
            {Array.from({ length: 7 }, (_, i) => (
              <circle key={i} cx="200" cy="150" r={20 + i * 18} opacity={1 - i * 0.12} />
            ))}
          </g>
        )}
        {variant === 1 && (
          <g fill={`url(#${gid}-fg)`} opacity="0.92">
            <rect x="120" y="70" width="160" height="160" rx="36" transform="rotate(12 200 150)" />
            <rect x="150" y="100" width="100" height="100" rx="24" fill="#0d0620" opacity="0.55" />
          </g>
        )}
        {variant === 2 && (
          <g fill="none" stroke={`url(#${gid}-fg)`} strokeWidth="3" opacity="0.9">
            {Array.from({ length: 6 }, (_, i) => (
              <path key={i} d={`M -20 ${90 + i * 22} Q 100 ${40 + i * 22} 200 ${110 + i * 22} T 420 ${80 + i * 22}`} />
            ))}
          </g>
        )}

        {initials && (
          <text
            x="200"
            y="160"
            textAnchor="middle"
            dominantBaseline="middle"
            fontFamily="Poppins, sans-serif"
            fontWeight="800"
            fontSize="64"
            fill="white"
            opacity="0.92"
          >
            {initials}
          </text>
        )}
      </svg>
    </div>
  )
}
