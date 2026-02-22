const CACHE_NAME = 'amor-v3'
const IMG_CACHE = 'amor-images-v1'

const STATIC_ASSETS = [
  '/',
  '/images/amor-icon.svg',
  '/images/amor-logo.png',
]

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      cache.addAll(STATIC_ASSETS).catch(() => {})
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

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return

  const url = new URL(event.request.url)

  if (url.pathname.startsWith('/api') || url.pathname.startsWith('/auth')) return

  const isSupabaseImage = url.hostname.endsWith('.supabase.co')
    && url.pathname.includes('/storage/')
  const isNextImage = url.pathname.startsWith('/_next/image')
  const isLocalImage = url.pathname.startsWith('/images/')

  if (isSupabaseImage || isNextImage || isLocalImage) {
    event.respondWith(
      caches.open(IMG_CACHE).then(async (cache) => {
        const cached = await cache.match(event.request)
        if (cached) return cached

        try {
          const response = await fetch(event.request)
          if (response.ok) cache.put(event.request, response.clone())
          return response
        } catch {
          return cached || new Response('', { status: 408 })
        }
      })
    )
    return
  }

  if (url.origin !== self.location.origin) return

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response.ok) {
          const clone = response.clone()
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone))
        }
        return response
      })
      .catch(() => caches.match(event.request))
  )
})
