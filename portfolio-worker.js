const VERSION = "97baba0d9ddd0e74";
const CORE = ["/","/work/","/about/","/contact/","/privacy/","/404.html","/offline/","/unavailable/","/theme-init.js","/site.webmanifest","/favicon.svg","/favicon-32.png","/apple-touch-icon.png","/icons/icon-192.png","/icons/icon-512.png","/icons/icon-maskable-512.png","/astro-assets/DeveloperHero.astro_astro_type_script_index_0_lang.DwOpts8A.js","/astro-assets/MediaFrame.PBfV8_tm.css","/astro-assets/SiteLayout.B76EBQ8M.css","/astro-assets/SiteLayout.astro_astro_type_script_index_1_lang.ByX3ZjN_.js","/astro-assets/ThemeToggle.astro_astro_type_script_index_0_lang.DRoge5m5.js","/astro-assets/index.DrnMgEb0.css","/astro-assets/poppins-latin-400-normal.cpxAROuN.woff2","/astro-assets/poppins-latin-500-normal.C8OXljZJ.woff2","/astro-assets/poppins-latin-600-normal.zEkxB9Mr.woff2","/astro-assets/index.C0lPSUEH.css","/astro-assets/site-motion.B-N98PzR.js","/astro-assets/poppins-latin-400-normal.BOb3E3N0.woff","/astro-assets/poppins-latin-500-normal.DGXqpDMm.woff","/astro-assets/poppins-latin-600-normal.BJdTmd5m.woff"];
const prefix = 'iliuta-portfolio-';
const shell = prefix + 'shell-' + VERSION;
const visited = prefix + 'visited-' + VERSION;
const media = prefix + 'media-' + VERSION;

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(shell).then((cache) =>
    cache.addAll(CORE.map((path) => new Request(path, { cache: 'reload' }))),
  ));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(Promise.all([
    caches.keys().then((keys) => Promise.all(keys
      .filter((key) => key.startsWith(prefix) && key !== shell && key !== visited && key !== media)
      .map((key) => caches.delete(key)))),
    self.clients.claim(),
  ]));
});

async function store(cache, key, response, limit) {
  try {
    await cache.put(key, response);
    const keys = await cache.keys();
    await Promise.all(keys.slice(0, Math.max(keys.length - limit, 0)).map((old) => cache.delete(old)));
  } catch {
    // Quota or storage restrictions must not break navigation.
  }
}

async function fallback(path, status, plainText) {
  const page = await caches.match(path, { cacheName: shell });
  if (!page) return new Response(plainText, { status });
  return new Response(page.body, { status, headers: page.headers });
}

function documentKey(pathname) {
  return !pathname.endsWith('/') && !pathname.split('/').pop().includes('.')
    ? pathname + '/'
    : pathname;
}

async function navigate(request, pathname, event) {
  // Query parameters only affect client-side state. Directory routes use one cache entry.
  const key = documentKey(pathname);
  const cache = await caches.open(visited);
  const cached = await cache.match(key) ?? await caches.match(key, { cacheName: shell });
  const refresh = fetch(request, { cache: 'no-cache', signal: AbortSignal.timeout(2500) }).then(async (response) => {
    if (response.ok && response.headers.get('content-type')?.includes('text/html')) {
      const saved = response.clone();
      event.waitUntil(store(cache, key, saved, 64));
    }
    if (response.status === 404) {
      event.waitUntil(cache.delete(key));
      return fallback('/404.html', 404, 'Page not found');
    }
    if (response.status >= 500) return fallback('/unavailable/', 503, 'Temporarily unavailable');
    return response;
  }).catch(() => cached ?? fallback('/offline/', 503, 'You are offline'));
  return refresh;
}

async function asset(request, event) {
  const cached = await caches.match(request, { cacheName: shell });
  if (cached) return cached;
  const cache = await caches.open(media);
  const saved = await cache.match(request);
  if (saved) return saved;
  const response = await fetch(request);
  if (response.ok && response.status !== 206) event.waitUntil(store(cache, request, response.clone(), 64));
  return response;
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin || request.method !== 'GET' || request.headers.has('range')) return;

  if (request.mode === 'navigate') {
    event.respondWith(navigate(request, url.pathname, event));
  } else if (['image', 'font', 'script', 'style'].includes(request.destination)) {
    event.respondWith(asset(request, event));
  }
});


self.addEventListener('message', (event) => {
  if (event.data !== 'cache-first-project-visit' || !event.source?.url) return;
  const url = new URL(event.source.url);
  if (url.origin !== self.location.origin || !/^\/work\/(?:archive\/)?[a-z0-9-]+\/?$/.test(url.pathname)) return;

  event.waitUntil((async () => {
    const response = await fetch(url, { cache: 'no-cache', redirect: 'error', signal: AbortSignal.timeout(2500) });
    if (response.ok && response.headers.get('content-type')?.includes('text/html')) {
      await store(await caches.open(visited), documentKey(url.pathname), response, 64);
    }
  })().catch(() => {
    // The next online navigation can populate the cache if this request fails.
  }));
});
