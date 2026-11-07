// Fonts offered for names/numbers. They're loaded from Google Fonts in index.html; canvas text
// silently falls back to a default font if drawn before the font file arrives, so always await
// ensureFont() before creating or re-styling text.
export const FONTS = [
  { family: 'Bebas Neue', weight: 400 },
  { family: 'Oswald', weight: 700 },
  { family: 'Anton', weight: 400 },
  { family: 'Poppins', weight: 800 },
  { family: 'Roboto Slab', weight: 700 },
  { family: 'Permanent Marker', weight: 400 },
]

export const DEFAULT_FONT = FONTS[0]

export const fontWeight = (family) => FONTS.find((f) => f.family === family)?.weight ?? 400

const loaded = new Map()

export function ensureFont(family) {
  if (!family || typeof document === 'undefined' || !document.fonts) return Promise.resolve()
  if (!loaded.has(family)) {
    const p = document.fonts
      .load(`${fontWeight(family)} 48px "${family}"`)
      .catch(() => [])
      .then(() => undefined)
    loaded.set(family, p)
  }
  return loaded.get(family)
}

export const ensureFonts = (families) => Promise.all([...new Set(families)].map(ensureFont))
