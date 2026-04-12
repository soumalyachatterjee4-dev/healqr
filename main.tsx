import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import './custom-scrollbar.css'
import ErrorBoundary from './components/ErrorBoundary'
import { initErrorMonitoring } from './lib/errorMonitoring'

// ============================================
// ERROR MONITORING INITIALIZATION
// ============================================
initErrorMonitoring();

// ============================================
// SERVICE WORKER REGISTRATION
// ============================================
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    // Register FCM service worker
    navigator.serviceWorker.register('/firebase-messaging-sw.js')
      .then((registration) => {
      })
      .catch((err) => {
        console.error('❌ FCM Service Worker registration failed:', err);
      });

    // Register offline caching service worker
    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        console.log('✅ Offline SW registered');
      })
      .catch((err) => {
        console.error('❌ Offline SW registration failed:', err);
      });
  });
}

// Global error handler for unhandled promise rejections
// Suppress AbortError from Firebase when components unmount quickly
window.addEventListener('unhandledrejection', (event) => {
  if (event.reason?.name === 'AbortError' || event.reason?.code === 'ERR_CANCELED') {
    event.preventDefault(); // Prevent error from appearing in console
    return;
  }

  const reasonMessage = event.reason?.message || String(event.reason || '');
  if (shouldAttemptRecovery(reasonMessage)) {
    event.preventDefault();
    attemptRecovery();
  }
});

// Global error handler for stale chunks returning HTML
window.addEventListener('error', (event) => {
  const message = (event as ErrorEvent).message || (event as ErrorEvent).error?.message || '';
  if (shouldAttemptRecovery(message)) {
    event.preventDefault();
    attemptRecovery();
  }
});

const shouldAttemptRecovery = (message: string): boolean => {
  return (
    message.includes("Unexpected token '<'") ||
    message.includes('ChunkLoadError') ||
    message.includes('Loading chunk') ||
    message.includes('Failed to fetch dynamically imported module')
  );
};

const attemptRecovery = () => {
  const reloadKey = 'healqr_forced_reload_v2';
  if (sessionStorage.getItem(reloadKey)) {
    return;
  }
  sessionStorage.setItem(reloadKey, '1');

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations()
      .then((registrations) => Promise.all(registrations.map((reg) => reg.unregister())))
      .catch(() => undefined);
  }

  if ('caches' in window) {
    caches.keys()
      .then((keys) => Promise.all(keys.map((key) => caches.delete(key))))
      .catch(() => undefined);
  }

  const url = new URL(window.location.href);
  url.searchParams.set('v', Date.now().toString());
  window.location.replace(url.toString());
};

// REACT APP INITIALIZATION
// ============================================

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
)
