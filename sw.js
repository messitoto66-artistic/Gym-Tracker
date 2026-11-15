// sw.js — Service Worker pour exécution 100% Hors-Ligne sur iPhone (V4.1)
const CACHE_NAME = 'Gym-Tracker-v4.1';
const ASSETS = [
    './',
    './index.html',
    './style.css',
    './programData.js',
    './app.js',
    './manifest.json',
    './icon.svg'
];

// Installation : mise en cache des fichiers de l'application
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
    );
    self.skipWaiting();
});

// Activation : nettoyage des anciens caches si tu changes de version
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(keys => Promise.all(
            keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
        ))
    );
    self.clients.claim();
});

// Stratégie "Network First, fallback to Cache" :
// Si tu as de la 4G, il prend la dernière version sur GitHub. Si tu es en sous-sol sans réseau, il ouvre le cache instantanément !
self.addEventListener('fetch', event => {
    if (event.request.url.includes('api.github.com')) return; // Ne jamais cacher les appels API de sauvegarde
    event.respondWith(
        fetch(event.request)
            .then(response => {
                const clone = response.clone();
                caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
                return response;
            })
            .catch(() => caches.match(event.request))
    );
});
