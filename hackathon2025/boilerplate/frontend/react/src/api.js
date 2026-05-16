// All requests go through the Vite proxy at /api/* (configured in vite.config.js).
const BASE = '/api'

async function jsonFetch(url, opts = {}) {
  const res = await fetch(BASE + url, {
    headers: { 'Content-Type': 'application/json', ...(opts.headers || {}) },
    ...opts,
  })
  if (!res.ok) {
    let detail
    try { detail = (await res.json()).detail } catch {}
    throw new Error(detail || `Request failed: ${res.status}`)
  }
  return res.json()
}

export const api = {
  health: () => jsonFetch('/health'),
  categories: () => jsonFetch('/categories'),
  products: ({ category, search, sort } = {}) => {
    const q = new URLSearchParams()
    if (category && category !== 'all') q.set('category', category)
    if (search) q.set('search', search)
    if (sort) q.set('sort', sort)
    const qs = q.toString()
    return jsonFetch('/products' + (qs ? `?${qs}` : ''))
  },
  product: (id) => jsonFetch(`/products/${id}`),
  createOrder: (payload) =>
    jsonFetch('/orders', { method: 'POST', body: JSON.stringify(payload) }),
}
