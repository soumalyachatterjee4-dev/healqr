import { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Bell, Send, Users, UserCheck, Clock, CheckCircle } from 'lucide-react';

interface NotificationHistory {
  id: number;
  subject: string;
  message: string;
  recipients: string;
  recipientCount: number;
  sentDate: string;
  status: 'sent' | 'scheduled' | 'failed';
}

export default function AdminSendNotifications() {
  const [formData, setFormData] = useState({
    subject: '',
    messageEnglish: '',
    messageHindi: '',
    messageBengali: '',
    recipientType: 'all',
    scheduleDate: '',
    scheduleTime: ''
  });

  const [history, setHistory] = useState<NotificationHistory[]>([
    {
      id: 1,
      subject: 'Platform Maintenance Notice',
      message: 'The platform will undergo maintenance on Nov 5...',
      recipients: 'All Doctors',
      recipientCount: 147,
      sentDate: '2025-11-01 10:00 AM',
      status: 'sent'
    },
    {
      id: 2,
      subject: 'New Feature Launch: Video Library',
      message: 'We are excited to announce the launch of our new Video Library...',
      recipients: 'Active Doctors',
      recipientCount: 132,
      sentDate: '2025-10-28 02:30 PM',
      status: 'sent'
    },
    {
      id: 3,
      subject: 'Subscription Renewal Reminder',
      message: 'Your subscription is expiring soon. Renew now to continue...',
      recipients: 'Expiring Subscriptions',
      recipientCount: 12,
      sentDate: '2025-10-25 09:00 AM',
      status: 'sent'
    }
  ]);

  const handleSend = () => {
    if (!formData.subject || !formData.messageEnglish) {
      alert('Please fill in at least subject and English message');
      return;
    }

    const newNotification: NotificationHistory = {
      id: Date.now(),
      subject: formData.subject,
      message: formData.messageEnglish,
      recipients: getRecipientLabel(formData.recipientType),
      recipientCount: getRecipientCount(formData.recipientType),
      sentDate: formData.scheduleDate && formData.scheduleTime 
        ? `${formData.scheduleDate} ${formData.scheduleTime}`
        : new Date().toLocaleString(),
      status: formData.scheduleDate ? 'scheduled' : 'sent'
    };

    setHistory([newNotification, ...history]);
    
    // Reset form
    setFormData({
      subject: '',
      messageEnglish: '',
      messageHindi: '',
      messageBengali: '',
      recipientType: 'all',
      scheduleDate: '',
      scheduleTime: ''
    });

    alert(formData.scheduleDate ? 'Notification scheduled successfully!' : 'Notification sent successfully!');
  };

  const getRecipientLabel = (type: string) => {
    switch (type) {
      case 'all': return 'All Doctors';
      case 'active': return 'Active Doctors';
      case 'inactive': return 'Inactive Doctors';
      case 'expiring': return 'Expiring Subscriptions';
      case 'basic': return 'Basic Plan Doctors';
      case 'standard': return 'Standard Plan Doctors';
      case 'pro': return 'Pro Plan Doctors';
      case 'enterprise': return 'Enterprise Plan Doctors';
      default: return 'All Doctors';
    }
  };

  const getRecipientCount = (type: string) => {
    // Mock counts - would be fetched from backend
    const counts: Record<string, number> = {
      all: 147,
      active: 132,
      inactive: 15,
      expiring: 12,
      basic: 45,
      standard: 60,
      pro: 30,
      enterprise: 12
    };
    return counts[type] || 0;
  };

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="p-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl mb-2">Send Notifications</h1>
          <p className="text-gray-400">Broadcast notifications to doctors on the platform</p>
        </div>

        {/* Compose Notification */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-8 mb-8">
          <h2 className="text-xl mb-6 flex items-center gap-2">
            <Bell className="w-6 h-6 text-emerald-500" />
            Compose Notification
          </h2>

          <div className="space-y-6">
            {/* Recipients */}
            <div>
              <label className="block text-sm text-gray-400 mb-2">Select Recipients</label>
              <select
                value={formData.recipientType}
                onChange={(e) => setFormData({ ...formData, recipientType: e.target.value })}
                className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-white"
              >
                <option value="all">All Doctors ({getRecipientCount('all')})</option>
                <option value="active">Active Doctors ({getRecipientCount('active')})</option>
                <option value="inactive">Inactive Doctors ({getRecipientCount('inactive')})</option>
                <option value="expiring">Expiring Subscriptions ({getRecipientCount('expiring')})</option>
                <option value="basic">Basic Plan Doctors ({getRecipientCount('basic')})</option>
                <option value="standard">Standard Plan Doctors ({getRecipientCount('standard')})</option>
                <option value="pro">Pro Plan Doctors ({getRecipientCount('pro')})</option>
                <option value="enterprise">Enterprise Plan Doctors ({getRecipientCount('enterprise')})</option>
              </select>
              <p className="text-xs text-gray-500 mt-2">
                This notification will be sent to <strong className="text-emerald-500">{getRecipientCount(formData.recipientType)}</strong> doctors
              </p>
            </div>

            {/* Subject */}
            <div>
              <label className="block text-sm text-gray-400 mb-2">Subject / Title</label>
              <Input
                placeholder="Enter notification subject..."
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                className="bg-zinc-800 border-zinc-700"
              />
            </div>

            {/* Message - English */}
            <div>
              <label className="block text-sm text-gray-400 mb-2">Message (English) *</label>
              <Textarea
                placeholder="Enter notification message in English..."
                value={formData.messageEnglish}
                onChange={(e) => setFormData({ ...formData, messageEnglish: e.target.value })}
                rows={4}
                className="bg-zinc-800 border-zinc-700"
              />
            </div>

            {/* Message - Hindi */}
            <div>
              <label className="block text-sm text-gray-400 mb-2">Message (Hindi) - Optional</label>
              <Textarea
                placeholder="हिंदी में अधिसूचना संदेश दर्ज करें..."
                value={formData.messageHindi}
                onChange={(e) => setFormData({ ...formData, messageHindi: e.target.value })}
                rows={4}
                className="bg-zinc-800 border-zinc-700"
              />
            </div>

            {/* Message - Bengali */}
            <div>
              <label className="block text-sm text-gray-400 mb-2">Message (Bengali) - Optional</label>
              <Textarea
                placeholder="বাংলায় বিজ্ঞপ্তি বার্তা লিখুন..."
                value={formData.messageBengali}
                onChange={(e) => setFormData({ ...formData, messageBengali: e.target.value })}
                rows={4}
                className="bg-zinc-800 border-zinc-700"
              />
            </div>

            {/* Schedule (Optional) */}
            <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-4">
              <label className="block text-sm text-gray-400 mb-3">Schedule for Later (Optional)</label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Input
                    type="date"
                    value={formData.scheduleDate}
                    onChange={(e) => setFormData({ ...formData, scheduleDate: e.target.value })}
                    className="bg-zinc-900 border-zinc-700"
                  />
                </div>
                <div>
                  <Input
                    type="time"
                    value={formData.scheduleTime}
                    onChange={(e) => setFormData({ ...formData, scheduleTime: e.target.value })}
                    className="bg-zinc-900 border-zinc-700"
                  />
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Leave empty to send immediately
              </p>
            </div>

            {/* Send Button */}
            <Button
              onClick={handleSend}
              className="w-full bg-emerald-500 hover:bg-emerald-600 text-white py-6 text-lg"
            >
              <Send className="w-6 h-6 mr-3" />
              {formData.scheduleDate ? 'Schedule Notification' : 'Send Notification Now'}
            </Button>
          </div>
        </div>

        {/* Notification History */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
          <h3 className="text-xl mb-6">Notification History</h3>

          {/* Date Range Filter for History */}
          <div className="mb-6 bg-zinc-800 border border-zinc-700 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <Clock className="w-4 h-4 text-emerald-500" />
              <h4 className="text-sm text-white">Filter by Date Range</h4>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs text-gray-400 mb-1">From Date</label>
                <input
                  type="date"
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">To Date</label>
                <input
                  type="date"
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div className="flex items-end">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full border-zinc-700 text-gray-400 hover:bg-zinc-800"
                >
                  Clear Filter
                </Button>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            {history.map(notification => (
              <div key={notification.id} className="bg-zinc-800 border border-zinc-700 rounded-lg p-6">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h4 className="text-lg text-white mb-2">{notification.subject}</h4>
                    <p className="text-sm text-gray-400 line-clamp-2 mb-3">{notification.message}</p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs ml-4 flex-shrink-0 ${
                    notification.status === 'sent' ? 'bg-emerald-500/10 text-emerald-500' :
                    notification.status === 'scheduled' ? 'bg-blue-500/10 text-blue-500' :
                    'bg-red-500/10 text-red-500'
                  }`}>
                    {notification.status === 'sent' && <CheckCircle className="w-3 h-3 inline mr-1" />}
                    {notification.status === 'scheduled' && <Clock className="w-3 h-3 inline mr-1" />}
                    {notification.status.charAt(0).toUpperCase() + notification.status.slice(1)}
                  </span>
                </div>

                <div className="flex items-center gap-6 text-sm text-gray-500">
                  <span className="flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    {notification.recipients}
                  </span>
                  <span className="flex items-center gap-2">
                    <UserCheck className="w-4 h-4" />
                    {notification.recipientCount} recipients
                  </span>
                  <span className="flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    {notification.sentDate}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
