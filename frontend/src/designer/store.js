// Minimal IndexedDB key/value store. Shirt designs hold images and 300 DPI print files that
// would overflow localStorage, so drafts and cart exports live here instead.
const DB_NAME = 'designhub'
const STORE = 'designs'

let dbPromise

function open() {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, 1)
      req.onupgradeneeded = () => req.result.createObjectStore(STORE)
      req.onsuccess = () => resolve(req.result)
      req.onerror = () => reject(req.error)
    })
    dbPromise.catch(() => {
      dbPromise = undefined
    })
  }
  return dbPromise
}

async function run(mode, fn) {
  const db = await open()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, mode)
    const req = fn(tx.objectStore(STORE))
    tx.oncomplete = () => resolve(req.result)
    tx.onerror = () => reject(tx.error)
    tx.onabort = () => reject(tx.error)
  })
}

export const idbGet = (key) => run('readonly', (s) => s.get(key)).catch(() => undefined)
export const idbSet = (key, value) => run('readwrite', (s) => s.put(value, key))
export const idbDel = (key) => run('readwrite', (s) => s.delete(key)).catch(() => undefined)

export const draftKey = (productId) => `design-draft-${productId}`
export const cartDesignKey = (productId) => `cart-design-${productId}`

/**
 * Keep an export's files in IndexedDB until checkout and return the small, JSON-safe summary
 * that goes on the cart line (previews are ~360px WebP data URLs).
 */
export async function saveCartDesign(productId, exported) {
  const key = cartDesignKey(productId)
  const files = Object.fromEntries(
    Object.entries(exported.views).map(([view, v]) => [view, { mockup: v.mockup, print: v.print }]),
  )
  await idbSet(key, { files, json: exported.json })
  return {
    key,
    views: Object.keys(exported.views),
    previews: Object.fromEntries(Object.entries(exported.views).map(([view, v]) => [view, v.preview])),
    customizationId: null, // set once uploaded at checkout
  }
}

/** Upload a cart line's stored design; returns the FormData for POST /customizations. */
export async function cartDesignForm(productId, design) {
  const stored = await idbGet(design.key)
  if (!stored) return null
  const form = new FormData()
  form.append('product_id', String(productId))
  form.append('design', stored.json, 'design.json')
  for (const [view, f] of Object.entries(stored.files)) {
    const ext = f.mockup.type === 'image/webp' ? 'webp' : 'png'
    form.append(`${view}_mockup`, f.mockup, `${view}-mockup.${ext}`)
    form.append(`${view}_print`, f.print, `${view}-print.png`)
  }
  return form
}
