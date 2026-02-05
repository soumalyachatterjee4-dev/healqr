// Firebase Cloud Messaging Service Worker
// Handles background notifications and notification clicks

// Import Firebase scripts
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

// Firebase configuration
const firebaseConfig = {
  apiKey: 'AIzaSyB1AVXeao1bqTah8cD1bGAiAQMbZ5nw0WI',
  authDomain: 'teamhealqr.firebaseapp.com',
  projectId: 'teamhealqr',
  storageBucket: 'teamhealqr.firebasestorage.app',
  messagingSenderId: '739121123030',
  appId: '1:739121123030:web:37ed6fd7c052277b604377',
  measurementId: 'G-6ZZ5HNE1H4',
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// IMMEDIATE UPDATE: Force reset of SW helper logic
self.addEventListener('install', (event) => {
  console.log('🔧 [SW v1.0.7] Installing new version...');
  self.skipWaiting(); // FORCE IMMEDIATE ACTIVATION of new SW
});

self.addEventListener('activate', (event) => {
  console.log('🔧 [SW v1.0.7] Activated and claiming clients...');
  event.waitUntil(clients.claim()); // IMMEDIATELY CONTROL all pages
});

const messaging = firebase.messaging();

// DEBUG: Log configuration to verify update
console.log('🔧 [SW] Service Worker v1.0.7 Loaded - Forced Update');
console.log('🔧 [SW] Configured Project ID:', firebaseConfig.projectId);
console.log('🔧 [SW] Configured API Key:', firebaseConfig.apiKey);
console.log('🔧 [SW] Configured Sender ID:', firebaseConfig.messagingSenderId);

// Handle background messages
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message:', payload);

  const notificationTitle = payload.notification?.title || 'New Notification';
  const notificationOptions = {
    body: payload.notification?.body || '',
    icon: payload.notification?.icon || '/icon-192.png',
    badge: '/icon-192.png',
    data: payload.data,
    requireInteraction: true,
    actions: [
      { action: 'view', title: 'View' },
      { action: 'close', title: 'Close' }
    ]
  };

  return self.registration.showNotification(notificationTitle, notificationOptions);
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('[firebase-messaging-sw.js] Notification clicked:', event);
  
  event.notification.close();

  const notificationData = event.notification.data || {};
  const action = event.action;

  // If user clicked "close" or closed the notification, do nothing
  if (action === 'close') {
    return;
  }

  // Determine the URL to open based on notification data
  // Priority 1: Use the URL from notification data (sent by server)
  let urlToOpen = notificationData.url || '/';
  
  // Priority 2: Special handling for AI RX
  if (!notificationData.url && notificationData.type === 'ai_rx_prescription') {
    urlToOpen = `/patient/rx/${notificationData.notificationId}`;
  } 
  
  // Priority 3: Fallback to generic notifications page
  else if (!notificationData.url && notificationData.notificationId) {
    urlToOpen = `/notifications/${notificationData.notificationId}`;
  }
  
  console.log('[SW] Opening URL:', urlToOpen, 'from data:', notificationData);

  // Open or focus the app with the correct URL
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Check if app is already open
        for (const client of clientList) {
          if (client.url.includes(self.registration.scope) && 'focus' in client) {
            // Navigate to the notification page
            client.postMessage({
              type: 'NOTIFICATION_CLICKED',
              url: urlToOpen,
              data: notificationData
            });
            return client.focus();
          }
        }
        
        // If no client is open, open a new window
        if (clients.openWindow) {
          // Check if URL is already absolute, otherwise make it absolute
          const fullUrl = urlToOpen.startsWith('http') 
            ? urlToOpen 
            : new URL(urlToOpen, self.registration.scope).href;
          console.log('[SW] Opening new window with URL:', fullUrl);
          return clients.openWindow(fullUrl);
        }
      })
  );
});

// Handle service worker activation
self.addEventListener('activate', (event) => {
  console.log('[firebase-messaging-sw.js] Service worker activated');
  event.waitUntil(clients.claim());
});

console.log('[firebase-messaging-sw.js] Service worker loaded');
