/* CatatKu service worker — menyimpan tampilan aplikasi agar terbuka cepat & tetap bisa dibuka saat offline.
 * Data keuangan TIDAK disimpan di sini; data selalu diambil dari Google Sheets. */
var CACHE = 'catatku-v4';
var SHELL = ['./', './index.html', './config.js', './manifest.json', './icon-180.png', './icon-192.png', './icon-512.png'];

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(SHELL); }).then(function () { return self.skipWaiting(); }));
});

self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;                       // panggilan data (POST) tidak pernah di-cache
  var url = new URL(req.url);
  if (url.hostname.indexOf('script.google') >= 0) return; // jangan sentuh Apps Script

  var sameOrigin = url.origin === self.location.origin;
  var isAsset = sameOrigin || /cdnjs\.cloudflare\.com|fonts\.(googleapis|gstatic)\.com/.test(url.hostname);
  if (!isAsset) return;

  // Ambil versi terbaru dari internet, pakai cache kalau offline.
  e.respondWith(
    fetch(req).then(function (res) {
      if (res && (res.ok || res.type === 'opaque')) {
        var copy = res.clone();
        caches.open(CACHE).then(function (c) { c.put(req, copy); });
      }
      return res;
    }).catch(function () {
      return caches.match(req).then(function (hit) { return hit || caches.match('./index.html'); });
    })
  );
});
