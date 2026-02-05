/**
 * FCM Test Notification Component
 * Allows immediate testing of FCM notifications
 */

import { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Send } from 'lucide-react';
import { toast } from 'sonner';

export function FCMTestNotification() {
  const [phone, setPhone] = useState('');
  const [title, setTitle] = useState('🎉 Test Notification');
  const [message, setMessage] = useState('This is a test notification from HealQR!');
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    if (!phone.trim()) {
      toast.error('Please enter a phone number');
      return;
    }

    setSending(true);
    try {
      const response = await fetch(
        'https://us-central1-healqr-27726.cloudfunctions.net/sendInstantNotification',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            patientPhone: phone.startsWith('+91') ? phone : `+91${phone}`,
            title,
            body: message,
            data: {
              type: 'test',
              timestamp: new Date().toISOString(),
            },
          }),
        }
      );

      const result = await response.json();

      if (result.success) {
        toast.success('✅ Notification sent!', {
          description: 'Check your phone for the FCM notification',
        });
      } else {
        toast.error('❌ Failed to send', {
          description: result.error || 'No FCM token registered for this number',
        });
      }
    } catch (error) {
      console.error('Error sending test notification:', error);
      toast.error('❌ Network error', {
        description: 'Could not reach the server',
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="bg-gray-900/50 backdrop-blur-sm border border-gray-700 rounded-xl p-6 space-y-4">
      <div className="flex items-center gap-3 mb-4">
        <div className="bg-emerald-500/10 p-2 rounded-lg">
          <Send className="w-5 h-5 text-emerald-400" />
        </div>
        <div>
          <h3 className="text-white font-semibold">Test FCM Notification</h3>
          <p className="text-gray-400 text-sm">Send instant push notification</p>
        </div>
      </div>

      <div className="space-y-3">
        <div>
          <label className="text-gray-300 text-sm mb-1 block">Phone Number</label>
          <Input
            type="text"
            placeholder="+919876543210 or 9876543210"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="bg-gray-800 border-gray-700 text-white"
          />
        </div>

        <div>
          <label className="text-gray-300 text-sm mb-1 block">Title</label>
          <Input
            type="text"
            placeholder="Notification title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="bg-gray-800 border-gray-700 text-white"
          />
        </div>

        <div>
          <label className="text-gray-300 text-sm mb-1 block">Message</label>
          <textarea
            placeholder="Notification message body"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg p-3 text-white min-h-[80px] resize-none focus:outline-none focus:border-emerald-500"
          />
        </div>

        <Button
          onClick={handleSend}
          disabled={sending}
          className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
        >
          {sending ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
              Sending...
            </>
          ) : (
            <>
              <Send className="w-4 h-4 mr-2" />
              Send Test Notification
            </>
          )}
        </Button>

        <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-3 text-xs text-gray-400">
          <p className="font-semibold text-gray-300 mb-1">📱 Testing Steps:</p>
          <ol className="list-decimal list-inside space-y-1">
            <li>Patient must register FCM token first (book with consent)</li>
            <li>Enter patient's phone number above</li>
            <li>Click "Send Test Notification"</li>
            <li>Notification appears instantly on patient's device</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
