const CACHE_NAME = 'amor-v4'
const IMG_CACHE = 'amor-images-v2'
const MAX_IMG_CACHE = 200

const STATIC_ASSETS = [
  '/',
  '/offline.html',
  '/images/amor-icon.svg',
  '/images/amor-logo.png',
]

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      cache.addAll(STATIC_ASSETS).catch(() => { })
    )
  )
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  const keep = new Set([CACHE_NAME, IMG_CACHE])
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => !keep.has(k)).map((k) => caches.delete(k)))
    )
  )
  self.clients.claim()
})

// LRU cache trimming for images
async function trimCache(cacheName, maxItems) {
  const cache = await caches.open(cacheName)
  const keys = await cache.keys()
  if (keys.length > maxItems) {
    const deleteCount = keys.length - maxItems
    await Promise.all(keys.slice(0, deleteCount).map((key) => cache.delete(key)))
  }
}

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return

  const url = new URL(event.request.url)

  // Skip API and auth routes
  if (url.pathname.startsWith('/api') || url.pathname.startsWith('/auth')) return

  const isSupabaseImage = url.hostname.endsWith('.supabase.co')
    && url.pathname.includes('/storage/')
  const isNextImage = url.pathname.startsWith('/_next/image')
  const isLocalImage = url.pathname.startsWith('/images/')

  // Image caching with cache-first and LRU limit
  if (isSupabaseImage || isNextImage || isLocalImage) {
    event.respondWith(
      caches.open(IMG_CACHE).then(async (cache) => {
        const cached = await cache.match(event.request)
        if (cached) return cached

        try {
          const response = await fetch(event.request)
          if (response.ok) {
            cache.put(event.request, response.clone())
            // Trim cache in background
            trimCache(IMG_CACHE, MAX_IMG_CACHE)
          }
          return response
        } catch {
          return cached || new Response('', { status: 408 })
        }
      })
    )
    return
  }

  // Skip external requests
  if (url.origin !== self.location.origin) return

  // Network-first for same-origin with offline fallback
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response.ok) {
          const clone = response.clone()
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone))
        }
        return response
      })
      .catch(async () => {
        const cached = await caches.match(event.request)
        if (cached) return cached
        // Serve offline page for navigation requests
        if (event.request.mode === 'navigate') {
          return caches.match('/offline.html')
        }
        return new Response('', { status: 408 })
      })
  )
})
