import { useState } from 'react';
import { 
  Bell, 
  X, 
  AlertCircle, 
  CheckCircle2, 
  Info, 
  UserPlus, 
  Calendar,
  MessageSquare,
  TrendingUp,
  Star,
  AlertTriangle,
  Clock,
  XCircle,
  FileText,
  Sparkles
} from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { ScrollArea } from './ui/scroll-area';

interface Notification {
  id: string;
  type: 'admin' | 'patient' | 'system';
  category: 'info' | 'success' | 'warning' | 'error' | 'appointment' | 'review' | 'alert' | 'prescription';
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  actionUrl?: string;
  actionData?: any; // For NEW RX data
}

interface NotificationCenterProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenNewRxViewer?: (data: any) => void; // Handler to open NEW RX viewer
}

export default function NotificationCenter({ isOpen, onClose, onOpenNewRxViewer }: NotificationCenterProps) {
  // 🧹 DEMO DATA CLEANED - Empty by default
  // Real notifications will be populated from:
  // 1. Admin notifications (system alerts, feature announcements)
  // 2. Patient notifications (bookings, reviews, cancellations)
  // 3. System notifications (payments, plan changes)
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const unreadCount = notifications.filter(n => !n.read).length;

  const getIcon = (category: string) => {
    switch (category) {
      case 'success':
        return <CheckCircle2 className="w-5 h-5 text-emerald-500" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-amber-500" />;
      case 'error':
        return <XCircle className="w-5 h-5 text-red-500" />;
      case 'appointment':
        return <Calendar className="w-5 h-5 text-blue-500" />;
      case 'review':
        return <Star className="w-5 h-5 text-yellow-500" />;
      case 'alert':
        return <AlertCircle className="w-5 h-5 text-orange-500" />;
      case 'prescription':
        return (
          <div className="relative">
            <FileText className="w-5 h-5 text-purple-500" />
            <Sparkles className="w-3 h-3 text-pink-500 absolute -top-1 -right-1" />
          </div>
        );
      default:
        return <Info className="w-5 h-5 text-gray-400" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'admin':
        return 'bg-purple-500/20 text-purple-400';
      case 'patient':
        return 'bg-blue-500/20 text-blue-400';
      case 'system':
        return 'bg-emerald-500/20 text-emerald-400';
      default:
        return 'bg-gray-500/20 text-gray-400';
    }
  };

  const formatTimestamp = (date: Date) => {
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
    
    return date.toLocaleDateString();
  };

  const markAsRead = (id: string) => {
    setNotifications(notifications.map(n => 
      n.id === id ? { ...n, read: true } : n
    ));
  };

  const markAllAsRead = () => {
    setNotifications(notifications.map(n => ({ ...n, read: true })));
  };

  const deleteNotification = (id: string) => {
    setNotifications(notifications.filter(n => n.id !== id));
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 z-40"
        onClick={onClose}
      />

      {/* Notification Panel */}
      <div className="fixed right-0 top-0 h-full w-full sm:w-[480px] bg-zinc-950 border-l border-zinc-800 z-50 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-zinc-800">
          <div className="flex items-center gap-3">
            <Bell className="w-6 h-6 text-emerald-500" />
            <h2 className="text-xl">Notifications</h2>
            {unreadCount > 0 && (
              <Badge className="bg-emerald-500 text-white px-2 py-0.5 text-xs">
                {unreadCount}
              </Badge>
            )}
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 bg-zinc-900 hover:bg-zinc-800 rounded-lg flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Actions */}
        {unreadCount > 0 && (
          <div className="px-6 py-3 border-b border-zinc-800">
            <Button
              onClick={markAllAsRead}
              variant="ghost"
              className="text-emerald-500 hover:text-emerald-400 text-sm p-0 h-auto"
            >
              Mark all as read
            </Button>
          </div>
        )}

        {/* Notifications List */}
        <ScrollArea className="flex-1 p-6">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-center">
              <Bell className="w-16 h-16 text-gray-600 mb-4" />
              <p className="text-gray-400 text-lg mb-2">No notifications</p>
              <p className="text-gray-500 text-sm">You're all caught up!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`bg-zinc-900/50 border ${
                    notification.read ? 'border-zinc-800' : 'border-emerald-500/30 bg-emerald-500/5'
                  } rounded-lg p-4 hover:bg-zinc-900 transition-colors cursor-pointer`}
                  onClick={() => markAsRead(notification.id)}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 mt-0.5">
                      {getIcon(notification.category)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <h3 className="text-white font-medium text-sm">{notification.title}</h3>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteNotification(notification.id);
                          }}
                          className="text-gray-500 hover:text-gray-400 transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                      <p className="text-gray-400 text-sm mb-2 leading-relaxed">
                        {notification.message}
                      </p>
                      <div className="flex items-center gap-2">
                        <Badge className={`text-xs px-2 py-0.5 ${getTypeColor(notification.type)}`}>
                          {notification.type === 'admin' ? 'Admin' : notification.type === 'patient' ? 'Patient' : 'System'}
                        </Badge>
                        <span className="text-gray-500 text-xs flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatTimestamp(notification.timestamp)}
                        </span>
                        {!notification.read && (
                          <div className="ml-auto w-2 h-2 bg-emerald-500 rounded-full" />
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        {/* Footer */}
        <div className="p-6 border-t border-zinc-800">
          <Button
            variant="outline"
            className="w-full"
            onClick={() => {
              // Navigate to full notifications page
              console.log('View all notifications');
            }}
          >
            View All Notifications
          </Button>
        </div>
      </div>
    </>
  );
}
