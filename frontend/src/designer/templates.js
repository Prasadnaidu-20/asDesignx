// Every shirt the live designer can show. Add a shirt by adding entries here — no logic changes.
//
// Coordinates are in the template's own pixel space (TEMPLATE_SIZE). All images of a template
// must share that size so the layers line up:
//   baseImage       the shirt photo (JPG/WebP/PNG/SVG)
//   shadingImage    drawn on top with 'multiply': white = no change, greys = folds/shadows
//   highlightImage  optional, drawn with 'screen': black/transparent = no change, light = sheen
//   printArea       where the customer's design can go, in template pixels
//   printSizeInches the physical size of that area, used for the 300 DPI print file and DPI warnings
//
// Dark shirts: multiply can only darken, so on a black shirt full-strength shading drags the
// design towards black too. Lower `shadingOpacity` (≈0.35) on dark colours and let the
// screen-blended highlight bring the fabric texture back without dimming the print.
//
// Images are loaded with crossOrigin="anonymous": if they move to a CDN or R2 bucket, that
// host must send Access-Control-Allow-Origin or the canvas can't be exported.

export const TEMPLATE_SIZE = { width: 1000, height: 1200 }

const M = '/mockups'

const VIEW_DEFAULTS = {
  front: {
    printArea: { x: 330, y: 300, width: 340, height: 433 },
    printSizeInches: { w: 11, h: 14 },
  },
  back: {
    printArea: { x: 320, y: 250, width: 360, height: 450 },
    printSizeInches: { w: 12, h: 15 },
  },
}

const COLOURS = [
  { colour: 'white', name: 'White', colourHex: '#f2f2ef', shadingOpacity: 0.9, highlightOpacity: 0.15 },
  { colour: 'black', name: 'Black', colourHex: '#1d1d21', shadingOpacity: 0.35, highlightOpacity: 0.45 },
  { colour: 'navy', name: 'Navy', colourHex: '#1e2a47', shadingOpacity: 0.4, highlightOpacity: 0.4 },
  { colour: 'red', name: 'Red', colourHex: '#b0232c', shadingOpacity: 0.6, highlightOpacity: 0.3 },
]

export const TEMPLATES = COLOURS.flatMap((c) =>
  ['front', 'back'].map((view) => ({
    id: `tee-${c.colour}-${view}`,
    name: `${c.name} tee (${view})`,
    colour: c.colour,
    colourName: c.name,
    colourHex: c.colourHex,
    view,
    baseImage: `${M}/tshirt-${view}-${c.colour}.svg`,
    shadingImage: `${M}/tshirt-${view}-shading.svg`,
    highlightImage: `${M}/tshirt-${view}-highlight.svg`,
    shadingOpacity: c.shadingOpacity,
    highlightOpacity: c.highlightOpacity,
    ...VIEW_DEFAULTS[view],
  })),
)

export const VIEWS = ['front', 'back']

export const findTemplate = (colour, view) =>
  TEMPLATES.find((t) => t.colour === colour && t.view === view) ?? TEMPLATES.find((t) => t.view === view)

// One swatch per colour, in config order.
export const colours = () =>
  TEMPLATES.filter((t, i, all) => all.findIndex((o) => o.colour === t.colour) === i).map((t) => ({
    colour: t.colour,
    name: t.colourName,
    hex: t.colourHex,
  }))

export const DEFAULT_COLOUR = TEMPLATES[0].colour
