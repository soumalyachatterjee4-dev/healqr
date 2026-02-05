/**
 * FCM System Status Checker
 * Shows registered tokens and allows testing
 */

import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { AlertCircle, CheckCircle, Send, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

export function FCMSystemStatus() {
  const [tokens, setTokens] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [testPhone, setTestPhone] = useState('');
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    loadTokens();
  }, []);

  const loadTokens = async () => {
    try {
      setLoading(true);
      const { db } = await import('../lib/firebase/config');
      const { collection, getDocs } = await import('firebase/firestore');
      
      if (!db) return;
      
      const snapshot = await getDocs(collection(db, 'patientFCMTokens'));
      const tokenList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      setTokens(tokenList);
    } catch (error) {
      console.error('Error loading tokens:', error);
      toast.error('Failed to load FCM tokens');
    } finally {
      setLoading(false);
    }
  };

  const testNotification = async (phone: string) => {
    setTesting(true);
    try {
      const response = await fetch(
        'https://us-central1-healqr-27726.cloudfunctions.net/sendInstantNotification',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            patientPhone: phone,
            title: '🎉 Test Notification',
            body: 'This is a test notification from HealQR FCM system!',
            data: { type: 'test', timestamp: new Date().toISOString() },
          }),
        }
      );

      const result = await response.json();
      
      if (result.success) {
        toast.success('✅ Notification sent successfully!');
      } else {
        toast.error('❌ ' + (result.error || 'Failed to send'));
      }
    } catch (error) {
      console.error('Test failed:', error);
      toast.error('❌ Network error');
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="bg-gray-900 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center justify-between">
            <span>FCM System Status</span>
            <Button
              onClick={loadTokens}
              variant="ghost"
              size="sm"
              disabled={loading}
              className="text-emerald-400"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* System Status */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
              <div className="text-gray-400 text-sm mb-1">Registered Tokens</div>
              <div className="text-2xl font-bold text-white">{tokens.length}</div>
            </div>
            <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
              <div className="text-gray-400 text-sm mb-1">Active Tokens</div>
              <div className="text-2xl font-bold text-emerald-400">
                {tokens.filter(t => t.isActive).length}
              </div>
            </div>
            <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
              <div className="text-gray-400 text-sm mb-1">Inactive Tokens</div>
              <div className="text-2xl font-bold text-red-400">
                {tokens.filter(t => !t.isActive).length}
              </div>
            </div>
          </div>

          {/* Token List */}
          <div className="space-y-3">
            <h3 className="text-white font-semibold">Registered Patients</h3>
            {loading ? (
              <div className="text-gray-400 text-center py-8">Loading...</div>
            ) : tokens.length === 0 ? (
              <div className="bg-yellow-500/10 border border-yellow-500 rounded-lg p-6 text-center">
                <AlertCircle className="w-12 h-12 text-yellow-400 mx-auto mb-3" />
                <p className="text-yellow-400 font-semibold mb-2">No FCM Tokens Registered</p>
                <p className="text-gray-400 text-sm">
                  Patients need to book with consent checkbox checked and allow notification permission
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {tokens.map((token) => (
                  <div
                    key={token.id}
                    className="bg-gray-800 border border-gray-700 rounded-lg p-4 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      {token.isActive ? (
                        <CheckCircle className="w-5 h-5 text-emerald-400" />
                      ) : (
                        <AlertCircle className="w-5 h-5 text-red-400" />
                      )}
                      <div>
                        <div className="text-white font-medium">{token.patientPhone}</div>
                        <div className="text-gray-400 text-sm">
                          {token.deviceType} • {token.isActive ? 'Active' : 'Inactive'}
                        </div>
                      </div>
                    </div>
                    <Button
                      onClick={() => testNotification(token.patientPhone)}
                      disabled={testing || !token.isActive}
                      size="sm"
                      className="bg-emerald-600 hover:bg-emerald-700"
                    >
                      <Send className="w-4 h-4 mr-2" />
                      Test
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Instructions */}
          <div className="bg-blue-500/10 border border-blue-500 rounded-lg p-4">
            <h4 className="text-blue-400 font-semibold mb-2">📱 How to Register FCM Token:</h4>
            <ol className="text-gray-300 text-sm space-y-1 list-decimal list-inside">
              <li>Patient opens booking page (scan QR)</li>
              <li>Patient checks "I accept notifications" checkbox</li>
              <li>Patient completes booking</li>
              <li>Browser asks permission → Patient clicks "Allow"</li>
              <li>FCM token registered automatically</li>
              <li>Press Eye icon → Instant notification! 🔔</li>
            </ol>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
