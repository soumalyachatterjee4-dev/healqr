/**
 * Firebase Configuration
 *
 * This file contains the Firebase project configuration.
 * Safe for frontend preview - will not crash if Firebase unavailable.
 */

import { initializeApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth, setPersistence, browserLocalPersistence } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getStorage, FirebaseStorage } from 'firebase/storage';
import { getFunctions, Functions } from 'firebase/functions';

// Firebase configuration interface
interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
  measurementId?: string;
}

// 🎯 PRODUCTION MODE: TeamHealQR - Pan India Free Version
// Firebase fully configured and ready
const PROTOTYPE_MODE = false;

// Firebase configuration for TeamHealQR (Pan-India Free Version)
const firebaseConfig: FirebaseConfig = {
  apiKey: 'AIzaSyB1AVXeao1bqTah8cD1bGAiAQMbZ5nw0WI',
  authDomain: 'teamhealqr.firebaseapp.com',
  projectId: 'teamhealqr',
  storageBucket: 'teamhealqr.firebasestorage.app',
  messagingSenderId: '739121123030',
  appId: '1:739121123030:web:37ed6fd7c052277b604377',
  measurementId: 'G-6ZZ5HNE1H4',
};

// Initialize Firebase
let app = null as unknown as FirebaseApp;
let auth = null as unknown as Auth;
let db = null as unknown as Firestore;
let storage = null as unknown as FirebaseStorage;
let functions = null as unknown as Functions;

// Firebase configuration status
const isFirebaseConfigured = !PROTOTYPE_MODE;

if (isFirebaseConfigured) {
  try {
    // Initialize Firebase app
    app = initializeApp(firebaseConfig);

    // Initialize Firebase services
    auth = getAuth(app);
    db = getFirestore(app);
    storage = getStorage(app);
    functions = getFunctions(app);

    // Enable auth persistence - CRITICAL for PWA
    // Force LOCAL persistence to survive page reloads
    if (auth) {
      setPersistence(auth, browserLocalPersistence)
        .then(() => {
        })
        .catch((error) => {
          console.warn('⚠️ Could not set auth persistence:', error);
        });
    }

  } catch (error: any) {
    // Silent fallback to DEMO MODE
    console.warn('⚠️ Firebase initialization failed, running in DEMO MODE');
  }
} else {
  // 🚧 Waiting for Firebase credentials
  // Add your TeamHealQR Firebase config above to enable backend services
}

// Export Firebase services (may be null in prototype mode)
// Expose VAPID key for Web Push (FCM)
// Reads from Vite env: VITE_FIREBASE_VAPID_KEY
export const FCM_VAPID_KEY: string | undefined = (import.meta as any)?.env?.VITE_FIREBASE_VAPID_KEY;

// Export prototype mode flag for components to check
export const IS_PROTOTYPE_MODE = PROTOTYPE_MODE;

export { app, auth, db, storage, functions };
