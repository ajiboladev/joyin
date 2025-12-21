// JOYIN Service Worker - Simple Version
const CACHE_NAME = 'joyin-v1';

self.addEventListener('install', (event) => {
  console.log('Service Worker installing...');
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('Service Worker activated');
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  // Let all requests go through normally
  event.respondWith(fetch(event.request));
});