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
  Sparkles,
  Zap,
  Share2,
  Download,
  Building2,
  Stethoscope,
  ChevronRight
} from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { ScrollArea } from './ui/scroll-area';
import { DoctorNotification } from '../services/doctorNotificationService';

interface NotificationCenterProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: DoctorNotification[];
  onMarkRead: (id: string) => void;
  onMarkAllRead: () => void;
  onDelete: (id: string) => void;
  onOpenNewRxViewer?: (data: any) => void; // Handler to open NEW RX viewer
  healthTip?: {
    id: number;
    name: string;
    description: string;
    imageUrl: string;
    category: string;
  } | null;
  doctorName?: string;
  onGeneratePatientList?: (notificationId: string, metadata: any) => void;
}

export default function NotificationCenter({
  isOpen,
  onClose,
  notifications = [],
  onMarkRead,
  onMarkAllRead,
  onDelete,
  onOpenNewRxViewer,
  healthTip,
  doctorName,
  onGeneratePatientList
}: NotificationCenterProps) {

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
      case 'alert':
        return 'bg-amber-500/20 text-amber-400';
      default:
        return 'bg-gray-500/20 text-gray-400';
    }
  };

  const formatTimestamp = (date: Date) => {
    if (!date) return '';
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;

    return date.toLocaleDateString();
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
      <div className="fixed right-0 top-0 h-full w-full sm:w-[480px] bg-zinc-950 border-l border-zinc-800 z-50 flex flex-col animate-in slide-in-from-right duration-200">
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
              onClick={onMarkAllRead}
              variant="ghost"
              className="text-emerald-500 hover:text-emerald-400 text-sm p-0 h-auto"
            >
              Mark all as read
            </Button>
          </div>
        )}

        {/* Notifications List */}
        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
          <div className="space-y-4">

            {/* 🌟 HEALTH TIP CARD (Dynamic) */}
            {healthTip ? (
              <div className="relative overflow-hidden rounded-xl bg-zinc-900 border border-zinc-800 shadow-lg group">
                {/* Image */}
                <div className="relative aspect-video w-full overflow-hidden">
                  <img
                    src={healthTip.imageUrl}
                    alt={healthTip.name}
                    className="object-cover w-full h-full transform transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent"></div>

                  <div className="absolute bottom-0 left-0 p-4 w-full">
                    <div className="flex items-center justify-between mb-1">
                      <Badge className="bg-emerald-500/90 hover:bg-emerald-500 text-white border-0 backdrop-blur-sm text-[10px] px-1.5 h-5">
                        HEALTH TIP
                      </Badge>
                      <Zap className="w-4 h-4 text-yellow-300 fill-yellow-300" />
                    </div>
                    <h3 className="text-lg font-bold text-white leading-tight drop-shadow-md">
                      {healthTip.name}
                    </h3>
                  </div>
                </div>

                <div className="p-4 pt-3 bg-zinc-900/50">
                  <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-widest mb-2">
                    Professional Insights
                  </h4>
                  <p className="text-gray-300 text-sm leading-relaxed">
                    {healthTip.description || "Stay ahead in your practice with HealQR's curated medical insights and professional management tips designed specifically for modern healthcare providers."}
                  </p>
                </div>
              </div>
            ) : (
              // Fallback Static Card (Boost Your Energy) if no dynamic tip loaded
              <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-teal-500 to-emerald-600 p-6 text-white shadow-lg">
                {/* Background Decoration */}
                <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-white/10 rounded-full blur-xl"></div>
                <div className="absolute bottom-0 left-0 -mb-4 -ml-4 w-20 h-20 bg-black/10 rounded-full blur-xl"></div>

                <div className="relative z-10">
                  <div className="flex items-start justify-between mb-4">
                    <Badge className="bg-white/20 hover:bg-white/30 text-white border-0 backdrop-blur-sm">
                      HEALTH TIP
                    </Badge>
                    <Zap className="w-5 h-5 text-yellow-300 fill-yellow-300" />
                  </div>

                  <h3 className="text-2xl font-bold leading-tight mb-2 drop-shadow-sm">
                    HOW TO <br/>
                    <span className="text-yellow-300">BOOST</span> YOUR <br/>
                    ENERGY
                  </h3>

                  <p className="text-emerald-50 text-sm mb-4 opacity-90 font-medium">
                    Simple daily habits to recharge naturally.
                  </p>


                  <div className="absolute bottom-2 right-3 text-[10px] opacity-60">
                    @HealQR Tips
                  </div>
                </div>
              </div>
            )}

            {/* Notification Items */}
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Bell className="w-12 h-12 text-zinc-700 mb-3" />
                <p className="text-gray-400 mb-1">No new notifications</p>
                <p className="text-gray-600 text-sm">You're all caught up!</p>
              </div>
            ) : (
              <div className="space-y-3">
              {notifications.map((notification) => {
                const isExpiredAlert = notification.category === 'alert' && notification.title === 'Chamber Session Ended';

                return (
                  <div
                    key={notification.id}
                    className={`relative group bg-zinc-900 border ${
                      notification.read ? 'border-zinc-800' : 'border-emerald-500/30'
                    } rounded-xl p-0 overflow-hidden hover:bg-zinc-900/80 transition-all cursor-pointer shadow-lg shadow-black/20`}
                    onClick={() => onMarkRead(notification.id!)}
                  >
                    {!notification.read && (
                      <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.5)] z-10" />
                    )}

                    <div className="p-4">
                      {isExpiredAlert ? (
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className="bg-emerald-500/10 p-1.5 rounded-lg">
                                <Stethoscope className="w-4 h-4 text-emerald-500" />
                              </div>
                              <span className="text-[10px] font-bold tracking-wider text-emerald-400 uppercase">System Notification</span>
                            </div>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onDelete(notification.id!);
                              }}
                              className="text-gray-600 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>

                          <div className="space-y-1">
                            <h4 className="text-white font-semibold">Hello {doctorName || 'Dr. Sumanta'}, 👋</h4>
                            <p className="text-gray-400 text-sm leading-relaxed">
                              Due to your scheduled time ending at <span className="text-emerald-400 font-medium">{notification.metadata?.clinicName || 'Clinic'}</span>, your QR for direct booking has been temporarily blocked to avoid patient overflow.
                            </p>
                          </div>

                          <div className="bg-zinc-800/50 rounded-lg p-3 border border-zinc-700/50 space-y-2">
                            <div className="flex justify-between items-center text-xs">
                              <span className="text-gray-500">Chamber:</span>
                              <span className="text-gray-200 font-medium">{notification.metadata?.clinicName}</span>
                            </div>
                            <div className="flex justify-between items-start text-xs">
                              <span className="text-gray-500">Address:</span>
                              <span className="text-gray-300 font-medium text-right max-w-[150px]">{notification.metadata?.chamberAddress}</span>
                            </div>
                            <div className="flex justify-between items-center text-xs">
                              <span className="text-gray-500">Status:</span>
                              <Badge className="bg-amber-500/20 text-amber-500 border-0 h-4 text-[9px] px-1.5 font-bold">LOCKED FOR BOOKING</Badge>
                            </div>
                          </div>

                          <div className="pt-1">
                            <Button
              size="sm"
              className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold h-9 shadow-lg shadow-emerald-500/10"
              onClick={(e) => {
                e.stopPropagation();
                if (onGeneratePatientList) {
                  onGeneratePatientList(notification.id!, notification.metadata);
                }
              }}
            >
              GENERATE PATIENT LIST
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-start gap-4">
                          <div className="flex-shrink-0 mt-0.5 bg-zinc-800/50 p-2 rounded-lg border border-zinc-700/50">
                            {getIcon(notification.category)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2 mb-1">
                              <h3 className={`font-semibold text-sm ${notification.read ? 'text-gray-300' : 'text-white'}`}>
                                {notification.title}
                              </h3>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onDelete(notification.id!);
                                }}
                                className="text-gray-600 hover:text-red-400 transition-colors p-1 opacity-0 group-hover:opacity-100"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                            <p className="text-gray-400 text-sm mb-3 leading-relaxed">
                              {notification.message}
                            </p>

                            {notification.actionUrl && (
                              <div className="mb-3">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-8 text-xs border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 px-4"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    window.open(notification.actionUrl, '_blank');
                                  }}
                                >
                                  Interact
                                </Button>
                              </div>
                            )}

                            <div className="flex items-center gap-3">
                              <Badge className={`text-[9px] px-1.5 py-0 font-bold uppercase ${getTypeColor(notification.type)} border-0`}>
                                {notification.type}
                              </Badge>
                              <span className="text-gray-600 text-[10px] font-medium flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {formatTimestamp(notification.timestamp)}
                              </span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

