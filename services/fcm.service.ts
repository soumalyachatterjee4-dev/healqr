/**
 * FCM (Firebase Cloud Messaging) Service
 * Handles push notification initialization and token management
 */

import { getMessaging, getToken, onMessage, deleteToken, Messaging } from 'firebase/messaging';
import { doc, setDoc, serverTimestamp, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase/config';

// VAPID key from Firebase Console
const VAPID_KEY = 'BFDQKXlh6jRnmtr73-nLfSPVfoE7e_edEGgM9dG-mKVUWUWN6hp49vQEAuHDyXaGPkFuguoztw07vScoD-tHE90';

let messaging: Messaging | null = null;

/**
 * Initialize FCM messaging
 */
export const initializeFCM = async (): Promise<boolean> => {
  try {
    // Check if browser supports notifications
    if (!('Notification' in window)) {
      console.warn('❌ This browser does not support notifications');
      return false;
    }

    // Check if service worker is supported
    if (!('serviceWorker' in navigator)) {
      console.warn('❌ This browser does not support service workers');
      return false;
    }

    // Import Firebase app
    const { app } = await import('../lib/firebase/config');
    if (!app) {
      console.error('❌ Firebase app not initialized');
      return false;
    }

    // Initialize messaging
    messaging = getMessaging(app);
    
    return true;
  } catch (error) {
    console.error('❌ Error initializing FCM:', error);
    return false;
  }
};

/**
 * Request notification permission and get FCM token
 */
export const requestNotificationPermission = async (
  userId: string,
  userType: 'doctor' | 'patient'
): Promise<string | null> => {
  try {
    
    // Initialize FCM if not already done
    if (!messaging) {
      const initialized = await initializeFCM();
      if (!initialized) {
        console.error('❌ [FCM] Failed to initialize');
        return null;
      }
    }

    // Request permission
    const permission = await Notification.requestPermission();

    if (permission !== 'granted') {
      console.warn('⚠️ [FCM] Notification permission denied');
      return null;
    }

    // Register service worker
    const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');

    // Wait for service worker to be ready
    await navigator.serviceWorker.ready;

    // FORCE CLEANUP: Delete any existing token first to resolve 401 errors
    try {
      await deleteToken(messaging!);
    } catch (e) {
      // Ignore errors here, just trying to clean up
    }

    // Get FCM token - Try minimal config first (most reliable for auto-configuration)
    let token = '';
    
    try {
      token = await getToken(messaging!, {
        serviceWorkerRegistration: registration
      });
    } catch (e: any) {
      console.warn(`⚠️ [FCM] Auto-config failed (${e.code}). Trying VAPID...`);
      
      // Only try VAPID if auto-config fails and we have a key
      if (VAPID_KEY) {
        try {
          token = await getToken(messaging!, {
            vapidKey: VAPID_KEY,
            serviceWorkerRegistration: registration
          });
        } catch (e2) {
          console.error('❌ [FCM] All token attempts failed:', e2);
          throw e2;
        }
      } else {
        throw e;
      }
    }

    if (token) {
      
      // Save token to Firestore
      await saveFCMToken(userId, token, userType);
      
      return token;
    } else {
      console.warn('⚠️ [FCM] No token received from Firebase');
      return null;
    }
  } catch (error: any) {
    console.error('❌ [FCM] Error getting token:', error);
    
    // Provide helpful error messages
    if (error.code === 'messaging/permission-blocked') {
      console.error('🚫 [FCM] Permission blocked. User must enable it in browser settings.');
    } else if (error.code === 'messaging/unsupported-browser') {
      console.error('🚫 [FCM] This browser does not support FCM.');
    } else if (error.message?.includes('VAPID')) {
      console.error('🚫 [FCM] VAPID key issue:', error.message);
    } else if (error.message?.includes('registration')) {
      console.error('🚫 [FCM] Service worker registration issue:', error.message);
    }
    
    return null;
  }
};


/**
 * Save FCM token to Firestore
 */
const saveFCMToken = async (
  userId: string,
  token: string,
  userType: 'doctor' | 'patient'
): Promise<void> => {
  try {
    if (!db) {
      console.error('❌ Firestore not initialized');
      return;
    }

    const tokenRef = doc(db, 'fcmTokens', userId);
    
    await setDoc(tokenRef, {
      userId,
      token,
      userType,
      platform: 'web',
      browser: navigator.userAgent,
      updatedAt: serverTimestamp(),
      createdAt: serverTimestamp()
    }, { merge: true });

  } catch (error) {
    console.error('❌ Error saving FCM token:', error);
  }
};

/**
 * Listen for foreground messages
 */
export const onForegroundMessage = (callback: (payload: any) => void): (() => void) => {
  // Try to get messaging instance if not already initialized
  if (!messaging) {
    try {
      // We need to access the app instance. Since we can't import it dynamically 
      // in a sync function easily without promises, we'll try to get it from the 
      // global scope or assume it's initialized if this is called from App.tsx
      // However, for safety, let's try to get it if we can.
      
      // NOTE: This relies on App.tsx having initialized Firebase already.
      // If messaging is null, we can't set up the listener synchronously.
      // We will return a no-op and log a warning, BUT we will also try to 
      // initialize it asynchronously and set up the listener if possible (though we can't return the unsub).
      
      // BETTER APPROACH: The caller should ensure FCM is initialized.
      // But to be helpful, let's try to grab it if the app is ready.
      
      console.warn('⚠️ FCM not initialized in onForegroundMessage. Attempting to initialize...');
      
      // We can't await here. 
      // So we'll return a no-op. The fix is in App.tsx to call initializeFCM() first.
      return () => {};
    } catch (e) {
      console.error(e);
      return () => {};
    }
  }

  return onMessage(messaging, (payload) => {
    callback(payload);
  });
};

/**
 * Ensure FCM is initialized (helper for App.tsx)
 */
export const ensureFCMInitialized = async () => {
  if (!messaging) {
    await initializeFCM();
  }
  return messaging;
};

/**
 * Get current FCM token for a user
 */
export const getCurrentToken = async (userId: string): Promise<string | null> => {
  try {
    if (!db) return null;

    const tokenRef = doc(db, 'fcmTokens', userId);
    const tokenDoc = await getDoc(tokenRef);

    if (tokenDoc.exists()) {
      return tokenDoc.data().token || null;
    }

    return null;
  } catch (error) {
    console.error('❌ Error getting current token:', error);
    return null;
  }
};

/**
 * Check if user has granted notification permission
 */
export const hasNotificationPermission = (): boolean => {
  if (!('Notification' in window)) return false;
  return Notification.permission === 'granted';
};
