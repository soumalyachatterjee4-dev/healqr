// @ts-nocheck
// Capacitor/iOS push helper (safe to import; no-ops on web)
import { Capacitor } from '@capacitor/core';
import { setDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db } from './lib/firebase/config';

/** Check if running inside a native Capacitor shell */
export const isNativeApp = () => Capacitor.isNativePlatform();

/**
 * Register for APNs/FCM token on iOS/Android native shell and save to existing fcmTokens collection.
 * Call this after you know the userId (doctor or patient).
 */
export async function registerNativePush(userId: string, userType: 'doctor' | 'patient') {
  if (!isNativeApp()) {
    return null;
  }

  // Lazy-load plugins to avoid bundling for web builds
  const { PushNotifications } = await import('@capacitor/push-notifications');
  const { FirebaseMessaging } = await import('@capacitor-firebase/messaging');

  // Permission
  const permStatus = await PushNotifications.requestPermissions();
  if (permStatus.receive !== 'granted') {
    throw new Error('Notification permission not granted');
  }

  // Register with APNs/FCM
  await PushNotifications.register();

  // Get FCM token (APNs-backed on iOS)
  const tokenResult = await FirebaseMessaging.getToken();
  const token = tokenResult.token;

  // Save into existing collection used by backend
  if (!db) throw new Error('Firestore not initialized');

  await setDoc(doc(db, 'fcmTokens', userId), {
    userId,
    token,
    userType,
    platform: Capacitor.getPlatform(),
    updatedAt: serverTimestamp(),
    createdAt: serverTimestamp(),
  }, { merge: true });

  return token;
}
