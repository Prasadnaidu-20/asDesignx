// Customer uploads: validation, safe SVG handling, downscaling and print-resolution checks.

export const MAX_UPLOAD_MB = 10
export const MIN_PRINT_DPI = 150
export const PRINT_DPI = 300
// Bigger bitmaps than this add nothing at 300 DPI on our largest print area, but cost memory.
const MAX_EDIT_PX = 4000

const TYPES = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/svg+xml': 'svg',
}

export class UploadError extends Error {}

function kindOf(file) {
  if (TYPES[file.type]) return TYPES[file.type]
  const ext = file.name.split('.').pop()?.toLowerCase()
  return { png: 'png', jpg: 'jpg', jpeg: 'jpg', svg: 'svg' }[ext]
}

const readAs = (file, method) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = () => reject(new UploadError('Couldn’t read that file. Please try again.'))
    reader[method](file)
  })

export const loadImageElement = (src) =>
  new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous' // keeps the canvas exportable when images come from a CDN
    img.onload = () => resolve(img)
    img.onerror = () => reject(new UploadError('That image couldn’t be loaded. It may be damaged.'))
    img.src = src
  })

// Strip anything that could run code or pull external resources (which would taint the canvas).
function sanitizeSvg(text) {
  const doc = new DOMParser().parseFromString(text, 'image/svg+xml')
  const svg = doc.documentElement
  if (!svg || svg.nodeName.toLowerCase() !== 'svg' || doc.querySelector('parsererror')) {
    throw new UploadError('That SVG file isn’t valid.')
  }
  doc.querySelectorAll('script, foreignObject, iframe, object, embed').forEach((n) => n.remove())
  doc.querySelectorAll('*').forEach((el) => {
    for (const attr of [...el.attributes]) {
      const name = attr.name.toLowerCase()
      const value = attr.value.trim().toLowerCase()
      if (name.startsWith('on')) el.removeAttribute(attr.name)
      else if (
        (name === 'href' || name === 'xlink:href') &&
        !value.startsWith('#') &&
        !value.startsWith('data:image/')
      ) {
        el.removeAttribute(attr.name)
      }
    }
  })
  svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg')
  // Without an explicit size, browsers rasterise SVG images at 300×150.
  const vb = svg
    .getAttribute('viewBox')
    ?.split(/[\s,]+/)
    .map(Number)
  if (!svg.getAttribute('width') || !svg.getAttribute('height') || /%/.test(svg.getAttribute('width'))) {
    const [w, h] = vb?.length === 4 ? [vb[2], vb[3]] : [1000, 1000]
    const scale = 2000 / Math.max(w, h)
    svg.setAttribute('width', Math.round(w * scale))
    svg.setAttribute('height', Math.round(h * scale))
  }
  return svgToDataUrl(new XMLSerializer().serializeToString(svg))
}

export const svgToDataUrl = (markup) => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(markup)}`

async function downscale(img, dataUrl) {
  const longest = Math.max(img.naturalWidth, img.naturalHeight)
  if (longest <= MAX_EDIT_PX) return dataUrl
  const k = MAX_EDIT_PX / longest
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(img.naturalWidth * k)
  canvas.height = Math.round(img.naturalHeight * k)
  canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height)
  return canvas.toDataURL('image/png')
}

/** Validate an uploaded file and return { src, vector } ready for the canvas. */
export async function prepareUpload(file) {
  const kind = kindOf(file)
  if (!kind) throw new UploadError('Please upload a PNG, JPG or SVG image.')
  if (file.size > MAX_UPLOAD_MB * 1024 * 1024) {
    throw new UploadError(`That file is ${(file.size / 1024 / 1024).toFixed(1)} MB — the limit is ${MAX_UPLOAD_MB} MB.`)
  }
  if (kind === 'svg') {
    const src = sanitizeSvg(await readAs(file, 'readAsText'))
    await loadImageElement(src) // make sure it actually renders
    return { src, vector: true }
  }
  const dataUrl = await readAs(file, 'readAsDataURL')
  const img = await loadImageElement(dataUrl)
  return { src: await downscale(img, dataUrl), vector: false }
}

/**
 * Print resolution of a bitmap at its placed size. `obj` is in template pixels; the template
 * maps printArea.width pixels to printSizeInches.w inches.
 */
export function effectiveDpi(obj, template) {
  if (obj.type?.toLowerCase() !== 'image' || obj.vector) return null
  const inches = (obj.getScaledWidth() / template.printArea.width) * template.printSizeInches.w
  return inches > 0 ? Math.round(obj.width / inches) : null
}
