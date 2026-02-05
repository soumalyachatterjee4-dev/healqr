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
    navigator.serviceWorker.register('/firebase-messaging-sw.js')
      .then((registration) => {
        console.log('✅ Service Worker registered with scope:', registration.scope);
      })
      .catch((err) => {
        console.error('❌ Service Worker registration failed:', err);
      });
  });
}

// Global error handler for unhandled promise rejections
// Suppress AbortError from Firebase when components unmount quickly
window.addEventListener('unhandledrejection', (event) => {
  if (event.reason?.name === 'AbortError' || event.reason?.code === 'ERR_CANCELED') {
    event.preventDefault(); // Prevent error from appearing in console
  }
});

// REACT APP INITIALIZATION
// ============================================

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
)