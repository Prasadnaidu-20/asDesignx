// Off-screen exports, built from the saved design state (not the live canvas), so every side
// can be exported whichever one is on screen.
import { Rect, StaticCanvas } from 'fabric'
import { PRINT_DPI } from './assets'
import { PRINT_UNITS, enlivenDesign, loadLayers, printSpaceHeight } from './renderer'
import { TEMPLATE_SIZE, VIEWS, findTemplate } from './templates'

export const DESIGN_VERSION = 1
const MOCKUP_WIDTH = 1200
const PREVIEW_WIDTH = 360
// iOS Safari refuses canvases above ~16.7 MP, so print files are capped just below that.
const MAX_CANVAS_PIXELS = 16_000_000

function staticCanvas(width, height) {
  const el = document.createElement('canvas')
  return new StaticCanvas(el, { width, height, enableRetinaScaling: false, renderOnAddRemove: false })
}

async function toBlob(canvas, options) {
  const blob = await canvas.toBlob(options)
  if (!blob) throw new Error('Your browser couldn’t create the image. Try a smaller design.')
  return blob
}

// WebP where the browser can encode it, PNG otherwise (e.g. older Safari returns PNG for WebP).
async function webpOrPng(canvas, multiplier) {
  const webp = await canvas.toBlob({ format: 'webp', quality: 0.9, multiplier })
  return webp?.type === 'image/webp' ? webp : toBlob(canvas, { format: 'png', multiplier })
}

/** Shirt mockup for one side: base + design + shading/highlight. */
async function renderMockup(template, objects, binding) {
  const canvas = staticCanvas(TEMPLATE_SIZE.width, TEMPLATE_SIZE.height)
  try {
    const pa = template.printArea
    const [layers, design] = await Promise.all([
      loadLayers(template),
      enlivenDesign(objects, { x: pa.x, y: pa.y, width: pa.width }, binding),
    ])
    const clip = () =>
      new Rect({
        left: pa.x,
        top: pa.y,
        width: pa.width,
        height: pa.height,
        originX: 'left',
        originY: 'top',
        absolutePositioned: true,
      })
    design.forEach((o) => o.set({ clipPath: clip() }))
    canvas.add(...[layers.base, ...design, layers.shading, layers.highlight].filter(Boolean))
    const mockup = await webpOrPng(canvas, MOCKUP_WIDTH / TEMPLATE_SIZE.width)
    const preview = canvas.toDataURL({ format: 'webp', quality: 0.8, multiplier: PREVIEW_WIDTH / TEMPLATE_SIZE.width })
    return { mockup, preview }
  } finally {
    canvas.dispose()
  }
}

/** Print-area size in pixels at 300 DPI, scaled down only if the browser couldn't hold it. */
export function printSize(template) {
  let w = template.printSizeInches.w * PRINT_DPI
  let h = template.printSizeInches.h * PRINT_DPI
  const f = Math.min(1, Math.sqrt(MAX_CANVAS_PIXELS / (w * h)))
  w = Math.floor(w * f)
  h = Math.floor(h * f)
  return { width: w, height: h, dpi: Math.round(PRINT_DPI * f) }
}

/** Design-only print file: transparent PNG, no shirt or shading. */
async function renderPrint(template, objects, binding) {
  const size = printSize(template)
  const canvas = staticCanvas(size.width, size.height)
  try {
    // Print space keeps the print area's aspect ratio, so width alone fixes the mapping.
    const design = await enlivenDesign(objects, { x: 0, y: 0, width: size.width }, binding)
    canvas.add(...design)
    return { blob: await toBlob(canvas, { format: 'png' }), dpi: size.dpi }
  } finally {
    canvas.dispose()
  }
}

/**
 * Export every side that has a design.
 * Returns { views: { front: { mockup, print, preview, dpi } }, json: Blob, design } or null when empty.
 */
export async function exportDesign(state, { productId, binding }) {
  const views = {}
  for (const view of VIEWS) {
    const objects = state.views[view] ?? []
    if (!objects.length) continue
    const template = findTemplate(state.colour, view)
    const [{ mockup, preview }, print] = await Promise.all([
      renderMockup(template, objects, binding),
      renderPrint(template, objects, binding),
    ])
    views[view] = { mockup, preview, print: print.blob, dpi: print.dpi, template: template.id }
  }
  if (!Object.keys(views).length) return null

  const design = {
    version: DESIGN_VERSION,
    productId,
    colour: state.colour,
    printUnits: PRINT_UNITS,
    // Bound text is saved with the value it had at export time.
    views: Object.fromEntries(
      VIEWS.map((v) => [
        v,
        {
          template: findTemplate(state.colour, v).id,
          height: printSpaceHeight(findTemplate(state.colour, v)),
          objects: (state.views[v] ?? []).map((o) =>
            o.bind && binding?.[o.bind] != null ? { ...o, text: binding[o.bind] } : o,
          ),
        },
      ]),
    ),
  }
  return { views, json: new Blob([JSON.stringify(design)], { type: 'application/json' }), design }
}
