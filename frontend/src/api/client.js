const BASE = '/api/v1'
const TOKEN_KEY = 'auth_token'

export const tokenStore = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (t) => localStorage.setItem(TOKEN_KEY, t),
  clear: () => localStorage.removeItem(TOKEN_KEY),
}

export class ApiError extends Error {
  constructor(message, status) {
    super(message)
    this.status = status
  }
}

// FastAPI returns `detail` as a string for our own errors, or as a list for 422 validation errors.
function readDetail(body, status) {
  const detail = body?.detail
  if (typeof detail === 'string') return detail
  if (Array.isArray(detail) && detail.length) {
    return detail
      .map((d) => {
        const field = d.loc?.filter((p) => p !== 'body').join('.')
        return field ? `${field}: ${d.msg}` : d.msg
      })
      .join('; ')
  }
  return `Request failed (${status})`
}

let onUnauthorized = () => {}
export const setUnauthorizedHandler = (fn) => {
  onUnauthorized = fn
}

async function request(path, { method = 'GET', body, form, multipart, auth = true, raw = false } = {}) {
  const headers = {}
  let payload

  if (multipart) {
    // Let the browser set the multipart Content-Type (it includes the boundary).
    payload = multipart
  } else if (form) {
    headers['Content-Type'] = 'application/x-www-form-urlencoded'
    payload = new URLSearchParams(form)
  } else if (body !== undefined) {
    headers['Content-Type'] = 'application/json'
    payload = JSON.stringify(body)
  }

  const token = tokenStore.get()
  if (auth && token) headers.Authorization = `Bearer ${token}`

  const res = await fetch(`${BASE}${path}`, { method, headers, body: payload })

  if (res.status === 204) return null
  if (raw && res.ok) return res.blob()
  const data = await res.json().catch(() => null)

  if (!res.ok) {
    // An expired/invalid token on an authenticated call means the session is over.
    if (res.status === 401 && auth && token) onUnauthorized()
    throw new ApiError(readDetail(data, res.status), res.status)
  }
  return data
}

export const api = {
  register: (data) => request('/auth/register', { method: 'POST', body: data, auth: false }),
  login: (email, password) =>
    request('/auth/login', { method: 'POST', form: { username: email, password }, auth: false }),
  me: () => request('/auth/me'),

  listProducts: (skip = 0, limit = 100) => request(`/products?skip=${skip}&limit=${limit}`, { auth: false }),
  getProduct: (id) => request(`/products/${id}`, { auth: false }),
  createProduct: (data) => request('/products', { method: 'POST', body: data }),
  updateProduct: (id, data) => request(`/products/${id}`, { method: 'PATCH', body: data }),
  deleteProduct: (id) => request(`/products/${id}`, { method: 'DELETE' }),

  placeOrder: (items) => request('/orders', { method: 'POST', body: { items } }),
  listOrders: () => request('/orders?limit=100'),

  listMyDesigns: () => request('/my-designs?limit=100'),
  uploadMyDesign: ({ image, name, number }) => {
    const data = new FormData()
    data.append('image', image)
    data.append('name', name)
    data.append('number', number)
    return request('/my-designs', { method: 'POST', multipart: data })
  },
  // Images sit behind auth, so <img> can't load them directly; fetch as a blob instead.
  getMyDesignImage: (id) => request(`/my-designs/${id}/image`, { raw: true }),
  deleteMyDesign: (id) => request(`/my-designs/${id}`, { method: 'DELETE' }),
}

export const formatPrice = (value) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(Number(value))
