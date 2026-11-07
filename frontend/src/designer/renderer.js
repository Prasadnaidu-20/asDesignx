// Fabric.js scene building and the interactive editor.
//
// Layers, bottom to top: base shirt → customer design (clipped to the print area) →
// shading ('multiply') → optional highlight ('screen'). Overlays are neither selectable nor
// evented, so clicks fall through to the design underneath.
//
// Design objects are saved in *print space*: origin at the print area's top-left corner,
// 1000 units = the print area's width. That keeps saved designs independent of screen size,
// template image size and shirt colour.
import { Canvas, FabricImage, FabricObject, IText, Rect, util } from 'fabric'
import { effectiveDpi, loadImageElement } from './assets'
import { DEFAULT_FONT, ensureFonts, fontWeight } from './fonts'
import { TEMPLATE_SIZE } from './templates'

export const PRINT_UNITS = 1000
const DESIGN_PROPS = ['role', 'bind', 'vector']
FabricObject.customProperties = DESIGN_PROPS

export const printSpaceHeight = (template) => (PRINT_UNITS * template.printArea.height) / template.printArea.width

// Map a print-space object onto a target rectangle ({ x, y, width }) — the print area on the
// mockup, or the whole print-file canvas.
function mapObject(json, rect, from = PRINT_UNITS) {
  const k = rect.width / from
  return {
    ...json,
    left: rect.x + json.left * k,
    top: rect.y + json.top * k,
    scaleX: (json.scaleX ?? 1) * k,
    scaleY: (json.scaleY ?? 1) * k,
  }
}

const bindText = (json, binding) =>
  json.bind && binding?.[json.bind] != null ? { ...json, text: binding[json.bind] } : json

/** Turn print-space JSON into live Fabric objects placed in `rect`. Fonts are loaded first. */
export async function enlivenDesign(objects = [], rect, binding) {
  await ensureFonts(objects.filter((o) => o.fontFamily).map((o) => o.fontFamily))
  const mapped = objects.map((o) => mapObject(bindText(o, binding), rect))
  return util.enlivenObjects(mapped)
}

/** Load the template's image layers (base, shading, highlight) sized to TEMPLATE_SIZE. */
export async function loadLayers(template) {
  const layer = async (src, extra) => {
    if (!src) return null
    let el
    try {
      el = await loadImageElement(src)
    } catch {
      throw new Error(`Couldn’t load the ${template.name} image. Please refresh and try again.`)
    }
    return new FabricImage(el, {
      originX: 'left',
      originY: 'top',
      left: 0,
      top: 0,
      scaleX: TEMPLATE_SIZE.width / el.naturalWidth,
      scaleY: TEMPLATE_SIZE.height / el.naturalHeight,
      selectable: false,
      evented: false,
      hoverCursor: 'default',
      role: 'layer',
      ...extra,
    })
  }
  const [base, shading, highlight] = await Promise.all([
    layer(template.baseImage),
    layer(template.shadingImage, { globalCompositeOperation: 'multiply', opacity: template.shadingOpacity ?? 1 }),
    layer(template.highlightImage, { globalCompositeOperation: 'screen', opacity: template.highlightOpacity ?? 1 }),
  ])
  return { base, shading, highlight }
}

const printRect = (template) => ({ x: template.printArea.x, y: template.printArea.y, width: template.printArea.width })

/** Serialise a live design object back to print space. */
function serializeObject(obj, template) {
  const json = obj.toObject(DESIGN_PROPS)
  delete json.clipPath
  const pa = template.printArea
  return mapObject(
    { ...json, left: json.left - pa.x, top: json.top - pa.y },
    { x: 0, y: 0, width: PRINT_UNITS },
    pa.width,
  )
}

/** Keep an object fully inside the print area: shrink if too big, then nudge back in. */
function constrain(obj, pa) {
  obj.setCoords()
  let box = obj.getBoundingRect()
  if (box.width > pa.width || box.height > pa.height) {
    const f = Math.min(pa.width / box.width, pa.height / box.height)
    obj.set({ scaleX: obj.scaleX * f, scaleY: obj.scaleY * f })
    obj.setCoords()
    box = obj.getBoundingRect()
  }
  let dx = 0
  let dy = 0
  if (box.left < pa.x) dx = pa.x - box.left
  else if (box.left + box.width > pa.x + pa.width) dx = pa.x + pa.width - (box.left + box.width)
  if (box.top < pa.y) dy = pa.y - box.top
  else if (box.top + box.height > pa.y + pa.height) dy = pa.y + pa.height - (box.top + box.height)
  if (dx || dy) {
    obj.set({ left: obj.left + dx, top: obj.top + dy })
    obj.setCoords()
  }
}

const SELECTION_STYLE = {
  borderColor: '#a855f7',
  cornerColor: '#ffffff',
  cornerStrokeColor: '#7c3aed',
  cornerStyle: 'circle',
  transparentCorners: false,
  cornerSize: 14,
  touchCornerSize: 34,
  borderScaleFactor: 2,
  padding: 4,
}

export const describe = (obj, template) =>
  obj
    ? {
        kind: obj.type?.toLowerCase() === 'image' ? 'image' : 'text',
        text: obj.text,
        bind: obj.bind ?? null,
        fontFamily: obj.fontFamily,
        fill: typeof obj.fill === 'string' ? obj.fill : '#ffffff',
        fontSize: obj.fontSize,
        dpi: effectiveDpi(obj, template),
      }
    : null

/**
 * Interactive editor around a Fabric canvas. The React component owns the design state and
 * history; this class only renders it and reports changes.
 */
export class DesignEditor {
  constructor(el, { onChange, onSelection, onTransform }) {
    this.canvas = new Canvas(el, {
      width: TEMPLATE_SIZE.width,
      height: TEMPLATE_SIZE.height,
      preserveObjectStacking: true,
      selection: false, // one element at a time keeps touch editing simple
      renderOnAddRemove: false,
      allowTouchScrolling: true,
      enableRetinaScaling: true,
    })
    this.template = null
    this.layers = null
    this.binding = null
    this.loadToken = 0
    this.silent = false
    this.callbacks = { onChange, onSelection, onTransform }

    const c = this.canvas
    const transforming = (e) => {
      if (!this.template) return
      constrain(e.target, this.template.printArea)
      onTransform?.(describe(e.target, this.template))
    }
    c.on('object:moving', transforming)
    c.on('object:scaling', transforming)
    c.on('object:rotating', transforming)
    c.on('object:modified', () => this.changed())
    c.on('text:changed', () => this.changed())
    c.on('selection:created', () => this.selected())
    c.on('selection:updated', () => this.selected())
    c.on('selection:cleared', () => this.selected())
  }

  selected() {
    this.callbacks.onSelection?.(describe(this.canvas.getActiveObject(), this.template))
  }

  changed() {
    if (this.silent) return
    this.selected()
    this.callbacks.onChange?.(this.serialize())
  }

  designObjects() {
    return this.canvas.getObjects().filter((o) => o.role !== 'layer')
  }

  serialize() {
    return this.template ? this.designObjects().map((o) => serializeObject(o, this.template)) : []
  }

  /** Lowest print resolution among bitmaps on this side (null when there are none). */
  minDpi() {
    const values = this.designObjects()
      .map((o) => effectiveDpi(o, this.template))
      .filter((v) => v != null)
    return values.length ? Math.min(...values) : null
  }

  prepare(obj) {
    const pa = this.template.printArea
    obj.set({
      ...SELECTION_STYLE,
      clipPath: new Rect({
        left: pa.x,
        top: pa.y,
        width: pa.width,
        height: pa.height,
        originX: 'left',
        originY: 'top',
        absolutePositioned: true,
      }),
    })
    if (obj.bind) obj.set({ editable: false })
    obj.setControlsVisibility({ mt: false, mb: false, ml: false, mr: false }) // keep proportions
    return obj
  }

  /** Show `objects` (print-space JSON) on `template`. Later calls win over slower earlier ones. */
  async load(template, objects) {
    const token = ++this.loadToken
    const [layers, design] = await Promise.all([
      this.template?.id === template.id && this.layers ? this.layers : loadLayers(template),
      enlivenDesign(objects, printRect(template), this.binding),
    ])
    if (token !== this.loadToken || !this.canvas) return false
    this.silent = true
    this.template = template
    this.layers = layers
    this.canvas.discardActiveObject()
    this.canvas.remove(...this.canvas.getObjects())
    const stack = [layers.base, ...design.map((o) => this.prepare(o)), layers.shading, layers.highlight].filter(Boolean)
    this.canvas.add(...stack)
    this.silent = false
    this.canvas.requestRenderAll()
    this.selected()
    return true
  }

  insert(obj) {
    const top = this.layers.shading ?? this.layers.highlight
    const index = top ? this.canvas.getObjects().indexOf(top) : this.canvas.getObjects().length
    this.prepare(obj)
    this.canvas.insertAt(index, obj)
    constrain(obj, this.template.printArea)
    this.canvas.setActiveObject(obj)
    this.canvas.requestRenderAll()
    this.changed()
  }

  async addImage({ src, vector }) {
    const el = await loadImageElement(src)
    const pa = this.template.printArea
    const scale = Math.min((pa.width * 0.8) / el.naturalWidth, (pa.height * 0.8) / el.naturalHeight)
    this.insert(
      new FabricImage(el, {
        left: pa.x + pa.width / 2,
        top: pa.y + pa.height / 2,
        originX: 'center',
        originY: 'center',
        scaleX: scale,
        scaleY: scale,
        vector,
      }),
    )
  }

  async addText({ text, fontFamily = DEFAULT_FONT.family, fill = '#ffffff', bind = null }) {
    await ensureFonts([fontFamily])
    const pa = this.template.printArea
    const value = bind && this.binding?.[bind] != null ? this.binding[bind] : text
    this.insert(
      new IText(value, {
        left: pa.x + pa.width / 2,
        top: pa.y + pa.height * 0.3,
        originX: 'center',
        originY: 'center',
        fontFamily,
        fontWeight: fontWeight(fontFamily),
        fontSize: 72,
        textAlign: 'center',
        fill,
        bind,
      }),
    )
  }

  /** Restyle / retext the selected element. */
  async updateActive(props) {
    const obj = this.canvas.getActiveObject()
    if (!obj) return
    if (props.fontFamily) {
      await ensureFonts([props.fontFamily])
      props = { ...props, fontWeight: fontWeight(props.fontFamily) }
    }
    if (obj.bind) delete props.text
    obj.set(props)
    obj.initDimensions?.()
    constrain(obj, this.template.printArea)
    this.canvas.requestRenderAll()
    this.changed()
  }

  deleteActive() {
    const obj = this.canvas.getActiveObject()
    if (!obj || obj.isEditing) return false
    this.canvas.remove(obj)
    this.canvas.discardActiveObject()
    this.canvas.requestRenderAll()
    this.changed()
    return true
  }

  /** Keep name/number text in sync with the jersey table without recording history. */
  setBinding(binding) {
    this.binding = binding
    let touched = false
    for (const obj of this.designObjects()) {
      if (obj.bind && binding[obj.bind] != null && obj.text !== binding[obj.bind]) {
        obj.set({ text: binding[obj.bind] })
        obj.initDimensions?.()
        constrain(obj, this.template.printArea)
        touched = true
      }
    }
    if (touched) this.canvas.requestRenderAll()
    return touched
  }

  resize(width) {
    if (!width) return
    const zoom = width / TEMPLATE_SIZE.width
    this.canvas.setDimensions({ width, height: Math.round(TEMPLATE_SIZE.height * zoom) })
    this.canvas.setZoom(zoom)
    this.canvas.requestRenderAll()
  }

  dispose() {
    this.loadToken += 1
    const c = this.canvas
    this.canvas = null
    return c.dispose()
  }
}
