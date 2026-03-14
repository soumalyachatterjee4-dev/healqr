import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Bell, BellOff, Send, Check, X } from 'lucide-react';
import { requestNotificationPermission, hasNotificationPermission, onForegroundMessage } from '../services/fcm.service';
import { auth } from '../lib/firebase/config';
import { getFunctions, httpsCallable } from 'firebase/functions';

export default function FCMTestPanel() {
  const [hasPermission, setHasPermission] = useState(false);
  const [fcmToken, setFcmToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [testUserId, setTestUserId] = useState('');
  const [patientPhone, setPatientPhone] = useState('');

  useEffect(() => {
    const initFCM = async () => {
      const permissionGranted = hasNotificationPermission();
      setHasPermission(permissionGranted);
      
      // Auto-initialize FCM if permission already granted
      if (permissionGranted && auth && auth.currentUser && !fcmToken) {
        setLoading(true);
        try {
          const token = await requestNotificationPermission(auth.currentUser.uid, 'doctor');
          if (token) {
            setFcmToken(token);
            setMessage('✅ FCM initialized! Token saved to Firestore.');
          }
        } catch (error: any) {
          console.error('Auto-init FCM error:', error);
          setMessage(`⚠️ Auto-init failed: ${error.message}`);
        } finally {
          setLoading(false);
        }
      }
    };
    
    initFCM();
    
    // Listen for foreground messages
    const unsubscribe = onForegroundMessage((payload) => {
      console.log('📨 FCM FOREGROUND MESSAGE RECEIVED:', payload);
      setMessage(`📨 Foreground notification received: ${payload.notification?.title}`);
      
      // Show notification using service worker registration (works on all platforms)
      if (Notification.permission === 'granted' && 'serviceWorker' in navigator) {
        console.log('🔔 Showing notification via service worker');
        navigator.serviceWorker.ready.then((registration) => {
          registration.showNotification(payload.notification?.title || 'HealQR', {
            body: payload.notification?.body || '',
            icon: '/icon-192.png',
            badge: '/icon-192.png',
            requireInteraction: false,
            tag: 'healqr-fcm-foreground',
            data: {
              url: '/',
            },
          }).catch((error) => {
            console.error('❌ Error showing notification:', error);
          });
        });
      }
    });

    return () => unsubscribe();
  }, []);

  const handleRequestPermission = async () => {
    setLoading(true);
    setMessage('');
    
    try {
      const user = auth?.currentUser;
      if (!user) {
        setMessage('❌ You must be logged in');
        setLoading(false);
        return;
      }

      const token = await requestNotificationPermission(user.uid, 'doctor');
      
      if (token) {
        setFcmToken(token);
        setHasPermission(true);
        setMessage('✅ Notification permission granted! Token saved.');
      } else {
        setMessage('❌ Failed to get FCM token. Check console for details.');
      }
    } catch (error: any) {
      setMessage(`❌ Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSendTestNotification = async () => {
    setLoading(true);
    setMessage('');

    try {
      const user = auth?.currentUser;
      if (!user) {
        setMessage('❌ You must be logged in');
        setLoading(false);
        return;
      }

      // Choose target: patient phone (if provided) → custom userId → self
      let targetUserId: string | null = null;
      if (patientPhone) {
        const clean = patientPhone.replace(/\D/g, '').replace(/^91/, '').slice(-10);
        if (clean.length === 10) targetUserId = `patient_${clean}`;
      }
      if (!targetUserId && testUserId) {
        const numeric = testUserId.replace(/\D/g, '');
        if (testUserId.startsWith('patient_')) {
          targetUserId = testUserId;
        } else if (numeric.length >= 10) {
          targetUserId = `patient_${numeric.slice(-10)}`;
        } else {
          targetUserId = testUserId; // fallback as entered
        }
      }
      if (!targetUserId) targetUserId = user.uid;

      const functions = getFunctions();
      const sendNotification = httpsCallable(functions, 'sendFCMNotification');

      const result = await sendNotification({
        userId: targetUserId,
        title: '🎉 Test Notification',
        body: 'This is a test notification from HealQR FCM system!',
        data: {
          url: 'https://teamhealqr.web.app',
          type: 'test',
        },
      });

      const response: any = result.data;

      if (response.success) {
        setMessage(`✅ Test notification sent to ${targetUserId}`);
      } else {
        setMessage(`❌ Failed: ${response.error}`);
      }
    } catch (error: any) {
      setMessage(`❌ Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSendThanksNotification = async () => {
    setLoading(true);
    setMessage('');
    try {
      const functions = getFunctions();
      const sendNotification = httpsCallable(functions, 'sendFCMNotification');

      const cleanPhone = patientPhone.replace(/\D/g, '').replace(/^91/, '').slice(-10);
      if (!cleanPhone) {
        setMessage('❌ Enter a valid 10-digit phone number');
        setLoading(false);
        return;
      }
      const userId = `patient_${cleanPhone}`;

      const result = await sendNotification({
        userId,
        title: '✅ Consultation Completed',
        body: 'Thank you for visiting! Please share your experience.',
        data: {
          type: 'consultation_completed',
          phone: cleanPhone,
          url: 'https://teamhealqr.web.app',
        },
      });

      const response: any = result.data;
      if (response.success) {
        setMessage(`✅ Sent to ${userId}`);
      } else {
        setMessage(`❌ Failed: ${response.error}`);
      }
    } catch (error: any) {
      setMessage(`❌ Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-[#1a1f2e] border border-gray-700 rounded-2xl p-6">
      <div className="flex items-center gap-3 mb-6">
        <Bell className="w-6 h-6 text-emerald-400" />
        <h3 className="text-xl font-bold text-white">FCM Notification Test Panel</h3>
      </div>

      {/* Permission Status */}
      <div className="mb-6">
        <div className={`flex items-center gap-2 p-4 rounded-lg ${hasPermission ? 'bg-emerald-500/10 border border-emerald-500/30' : 'bg-red-500/10 border border-red-500/30'}`}>
          {hasPermission ? (
            <>
              <Check className="w-5 h-5 text-emerald-400" />
              <span className="text-emerald-400 font-medium">Notification Permission Granted</span>
            </>
          ) : (
            <>
              <X className="w-5 h-5 text-red-400" />
              <span className="text-red-400 font-medium">Notification Permission Required</span>
            </>
          )}
        </div>
      </div>

      {/* FCM Token Display */}
      {fcmToken && (
        <div className="mb-6">
          <label className="block text-sm text-gray-400 mb-2">FCM Token:</label>
          <div className="bg-[#0a0f1a] p-3 rounded-lg border border-gray-700">
            <code className="text-xs text-emerald-400 break-all">{fcmToken}</code>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="space-y-4">
        {!hasPermission && (
          <Button
            onClick={handleRequestPermission}
            disabled={loading}
            className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-medium py-3"
          >
            {loading ? (
              <>
                <div className="animate-spin mr-2 h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                Requesting Permission...
              </>
            ) : (
              <>
                <Bell className="w-4 h-4 mr-2" />
                Request Notification Permission
              </>
            )}
          </Button>
        )}

        {hasPermission && (
          <>
            {/* Refresh Token Button */}
            <Button
              onClick={handleRequestPermission}
              disabled={loading}
              className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-medium py-2 text-sm"
            >
              {loading ? (
                <>
                  <div className="animate-spin mr-2 h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                  Refreshing...
                </>
              ) : (
                <>
                  <Bell className="w-4 h-4 mr-2" />
                  Refresh FCM Token
                </>
              )}
            </Button>

            <div>
              <label className="block text-sm text-gray-400 mb-2">Target User ID (leave empty for self):</label>
              <input
                type="text"
                value={testUserId}
                onChange={(e) => setTestUserId(e.target.value)}
                placeholder="Enter user ID or leave empty"
                className="w-full bg-[#0a0f1a] border border-gray-700 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:border-emerald-500 focus:outline-none"
              />
            </div>

            <div className="mt-4">
              <label className="block text-sm text-gray-400 mb-2">Patient Phone (for thanks notification):</label>
              <input
                type="tel"
                value={patientPhone}
                onChange={(e) => setPatientPhone(e.target.value)}
                placeholder="10-digit phone (with/without +91)"
                className="w-full bg-[#0a0f1a] border border-gray-700 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:border-emerald-500 focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Button
                onClick={() => {
                  // Test browser notification using service worker (mobile-compatible)
                  if ('serviceWorker' in navigator) {
                    navigator.serviceWorker.ready.then((registration) => {
                      registration.showNotification('🧪 Browser Test', {
                        body: 'This is a direct browser notification test',
                        icon: '/icon-192.png',
                        badge: '/icon-192.png',
                        requireInteraction: false
                      });
                      setMessage('✅ Browser notification triggered (check if it appears)');
                    }).catch((error) => {
                      setMessage(`❌ Failed: ${error.message}`);
                    });
                  } else {
                    setMessage('❌ Service Worker not supported');
                  }
                }}
                className="bg-purple-500 hover:bg-purple-600 text-white font-medium py-3"
              >
                <Bell className="w-4 h-4 mr-2" />
                Browser Test
              </Button>

              <Button
                onClick={handleSendTestNotification}
                disabled={loading}
                className="bg-blue-500 hover:bg-blue-600 text-white font-medium py-3"
              >
                {loading ? (
                  <>
                    <div className="animate-spin mr-2 h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    FCM Test
                  </>
                )}
              </Button>

              <Button
                onClick={handleSendThanksNotification}
                disabled={loading}
                className="bg-emerald-500 hover:bg-emerald-600 text-white font-medium py-3"
              >
                {loading ? (
                  <>
                    <div className="animate-spin mr-2 h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Send Thanks
                  </>
                )}
              </Button>
            </div>
          </>
        )}
      </div>

      {/* Status Message */}
      {message && (
        <div className={`mt-4 p-4 rounded-lg ${message.includes('✅') ? 'bg-emerald-500/10 border border-emerald-500/30' : 'bg-red-500/10 border border-red-500/30'}`}>
          <p className={`text-sm ${message.includes('✅') ? 'text-emerald-400' : 'text-red-400'}`}>
            {message}
          </p>
        </div>
      )}

      {/* Instructions */}
      <div className="mt-6 p-4 bg-purple-500/10 border border-purple-500/30 rounded-lg">
        <h4 className="text-purple-400 font-medium mb-2">📋 Testing Instructions:</h4>
        <ol className="text-sm text-gray-400 space-y-1 list-decimal list-inside">
          <li><strong className="text-emerald-400">Browser Test:</strong> Tests if browser notifications work (should appear immediately)</li>
          <li><strong className="text-blue-400">FCM Test:</strong> After clicking, <strong className="text-yellow-400">minimize this tab or switch to another tab</strong></li>
          <li>Wait 2-3 seconds - notification should appear when tab is in background</li>
          <li>If in foreground, check console for "📨 Notification received" message</li>
          <li>Background notifications work best when tab is minimized/hidden</li>
        </ol>
      </div>
    </div>
  );
}

