// Bump this when you deploy new files
const CACHE = 'secops-lite-v5';
const ASSETS = [
  './',
  './index.html',
  './style.css?v=4',
  './app.js?v=4'
  // Optional: cache PDF for offline
  // './docs/PIPEDA_Quick_Check_David_Ok_v1.1.pdf'
];

self.addEventListener('install', e=>{
  e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)));
});

self.addEventListener('activate', e=>{
  e.waitUntil(
    caches.keys().then(keys=>Promise.all(keys.map(k=>k!==CACHE && caches.delete(k))))
      .then(()=>self.clients.claim())
  );
});

self.addEventListener('fetch', e=>{
  e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request)));
});
