import { useState, useEffect } from 'react';
import { X, CheckCircle, User, Mail, MessageSquare, Calendar, Star } from 'lucide-react';
import { Button } from './ui/button';
import { toast } from 'sonner';

interface SupportRequest {
  id: string;
  type: 'doctor' | 'landing';
  // Doctor requests
  doctorName?: string;
  doctorCode?: string;
  // Landing page requests
  name?: string;
  email?: string;
  // Common fields
  message: string;
  rating: number | null;
  status: 'unread' | 'read' | 'resolved';
  createdAt: any;
  resolvedAt: any;
}

interface AdminNotificationPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onNotificationRead?: () => void;
}

export default function AdminNotificationPanel({ isOpen, onClose, onNotificationRead }: AdminNotificationPanelProps) {
  const [requests, setRequests] = useState<SupportRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unread' | 'doctor' | 'landing'>('unread');

  // Load support requests from Firestore
  useEffect(() => {
    if (isOpen) {
      loadRequests();
    }
  }, [isOpen, filter]);

  const loadRequests = async () => {
    try {
      setLoading(true);
      const { db } = await import('../lib/firebase/config');
      const { collection, getDocs } = await import('firebase/firestore');
      
      const supportRequestsRef = collection(db, 'supportRequests');
      const snapshot = await getDocs(supportRequestsRef);
      
      let loadedRequests: SupportRequest[] = snapshot.docs.map(doc => ({
        id: doc.id,
        type: doc.data().type,
        doctorName: doc.data().doctorName,
        doctorCode: doc.data().doctorCode,
        name: doc.data().name,
        email: doc.data().email,
        message: doc.data().message,
        rating: doc.data().rating,
        status: doc.data().status,
        createdAt: doc.data().createdAt,
        resolvedAt: doc.data().resolvedAt,
      }));
      
      console.log('📊 Total documents from Firestore:', snapshot.docs.length);
      console.log('📊 Request types:', loadedRequests.map(r => `${r.type} (${r.status})`));
      console.log('📊 Doctor requests:', loadedRequests.filter(r => r.type === 'doctor').length);
      console.log('📊 Landing requests:', loadedRequests.filter(r => r.type === 'landing').length);
      
      // Apply filters in memory (no composite indexes needed)
      if (filter === 'unread') {
        loadedRequests = loadedRequests.filter(req => req.status === 'unread');
      } else if (filter === 'doctor') {
        loadedRequests = loadedRequests.filter(req => req.type === 'doctor');
      } else if (filter === 'landing') {
        loadedRequests = loadedRequests.filter(req => req.type === 'landing');
      }
      
      console.log('📊 After filter "' + filter + '":', loadedRequests.length, 'requests');
      
      // Sort by createdAt descending (newest first)
      loadedRequests.sort((a, b) => {
        const aTime = a.createdAt?.toMillis?.() || 0;
        const bTime = b.createdAt?.toMillis?.() || 0;
        return bTime - aTime;
      });
      
      setRequests(loadedRequests);
      console.log('✅ Loaded support requests:', loadedRequests.length, 'Filter:', filter);
    } catch (error) {
      console.error('❌ Error loading support requests:', error);
      toast.error('Failed to load notifications');
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (requestId: string) => {
    try {
      const { db } = await import('../lib/firebase/config');
      const { doc, updateDoc } = await import('firebase/firestore');
      
      await updateDoc(doc(db, 'supportRequests', requestId), {
        status: 'read',
      });
      
      // Update local state
      setRequests(prev => prev.map(req => 
        req.id === requestId ? { ...req, status: 'read' as const } : req
      ));
      
      if (onNotificationRead) {
        onNotificationRead();
      }
      
      toast.success('Marked as read');
    } catch (error) {
      console.error('❌ Error marking as read:', error);
      toast.error('Failed to update status');
    }
  };

  const markAsResolved = async (requestId: string) => {
    try {
      const { db } = await import('../lib/firebase/config');
      const { doc, updateDoc, serverTimestamp } = await import('firebase/firestore');
      
      await updateDoc(doc(db, 'supportRequests', requestId), {
        status: 'resolved',
        resolvedAt: serverTimestamp(),
      });
      
      // Update local state
      setRequests(prev => prev.map(req => 
        req.id === requestId ? { ...req, status: 'resolved' as const, resolvedAt: new Date() } : req
      ));
      
      if (onNotificationRead) {
        onNotificationRead();
      }
      
      toast.success('Marked as resolved');
    } catch (error) {
      console.error('❌ Error marking as resolved:', error);
      toast.error('Failed to update status');
    }
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'Just now';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const renderStars = (rating: number) => {
    if (!rating) return null;
    return (
      <div className="flex items-center gap-1">
        {[...Array(5)].map((_, i) => (
          <Star
            key={i}
            className={`w-3 h-3 ${
              i < Math.floor(rating)
                ? 'fill-yellow-400 text-yellow-400'
                : 'text-gray-600'
            }`}
          />
        ))}
      </div>
    );
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 bg-black/50 z-50" onClick={onClose} />

      {/* Panel */}
      <div className="fixed right-0 top-0 h-full w-full md:w-[500px] bg-zinc-950 z-50 shadow-xl overflow-y-auto border-l border-zinc-800">
        {/* Header */}
        <div className="sticky top-0 bg-zinc-950 border-b border-zinc-800 p-4 z-10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-white text-xl font-semibold">Support Requests</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors p-2 hover:bg-zinc-900 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          
          {/* Filter Buttons */}
          <div className="flex gap-2 overflow-x-auto pb-2">
            <button
              onClick={() => setFilter('unread')}
              className={`px-3 py-1.5 rounded-lg text-sm whitespace-nowrap transition-colors ${
                filter === 'unread'
                  ? 'bg-emerald-500 text-white'
                  : 'bg-zinc-900 text-gray-400 hover:bg-zinc-800'
              }`}
            >
              Unread
            </button>
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-1.5 rounded-lg text-sm whitespace-nowrap transition-colors ${
                filter === 'all'
                  ? 'bg-emerald-500 text-white'
                  : 'bg-zinc-900 text-gray-400 hover:bg-zinc-800'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilter('doctor')}
              className={`px-3 py-1.5 rounded-lg text-sm whitespace-nowrap transition-colors ${
                filter === 'doctor'
                  ? 'bg-emerald-500 text-white'
                  : 'bg-zinc-900 text-gray-400 hover:bg-zinc-800'
              }`}
            >
              Doctors
            </button>
            <button
              onClick={() => setFilter('landing')}
              className={`px-3 py-1.5 rounded-lg text-sm whitespace-nowrap transition-colors ${
                filter === 'landing'
                  ? 'bg-emerald-500 text-white'
                  : 'bg-zinc-900 text-gray-400 hover:bg-zinc-800'
              }`}
            >
              Landing Page
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 space-y-3">
          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-gray-400 mt-4">Loading requests...</p>
            </div>
          ) : requests.length === 0 ? (
            <div className="text-center py-12">
              <MessageSquare className="w-12 h-12 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400">No support requests found</p>
            </div>
          ) : (
            requests.map((request) => (
              <div
                key={request.id}
                className={`bg-zinc-900 border rounded-lg p-4 ${
                  request.status === 'unread'
                    ? 'border-emerald-500/50'
                    : request.status === 'resolved'
                    ? 'border-zinc-700 opacity-60'
                    : 'border-zinc-800'
                }`}
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-start gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                      request.type === 'doctor' ? 'bg-blue-500/20' : 'bg-purple-500/20'
                    }`}>
                      {request.type === 'doctor' ? (
                        <User className="w-5 h-5 text-blue-400" />
                      ) : (
                        <Mail className="w-5 h-5 text-purple-400" />
                      )}
                    </div>
                    <div className="flex-1">
                      <h3 className="text-white font-medium text-sm">
                        {request.type === 'doctor' 
                          ? request.doctorName 
                          : request.name}
                      </h3>
                      <p className="text-gray-400 text-xs mt-0.5">
                        {request.type === 'doctor' 
                          ? `Code: ${request.doctorCode}` 
                          : request.email}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex flex-col items-end gap-1">
                    <span className="text-xs text-gray-500">{formatDate(request.createdAt)}</span>
                    {request.status === 'unread' && (
                      <span className="bg-emerald-500 text-white text-xs px-2 py-0.5 rounded-full">
                        New
                      </span>
                    )}
                    {request.status === 'resolved' && (
                      <span className="bg-gray-700 text-gray-400 text-xs px-2 py-0.5 rounded-full">
                        Resolved
                      </span>
                    )}
                  </div>
                </div>

                {/* Message */}
                <p className="text-gray-300 text-sm mb-3 leading-relaxed">
                  {request.message}
                </p>

                {/* Rating */}
                {request.rating && (
                  <div className="mb-3">
                    {renderStars(request.rating)}
                  </div>
                )}

                {/* Actions */}
                {request.status !== 'resolved' && (
                  <div className="flex gap-2 pt-3 border-t border-zinc-800">
                    {request.status === 'unread' && (
                      <Button
                        onClick={() => markAsRead(request.id)}
                        size="sm"
                        variant="outline"
                        className="flex-1 text-xs border-zinc-700 hover:bg-zinc-800"
                      >
                        Mark as Read
                      </Button>
                    )}
                    <Button
                      onClick={() => markAsResolved(request.id)}
                      size="sm"
                      className="flex-1 text-xs bg-emerald-500 hover:bg-emerald-600"
                    >
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Resolve
                    </Button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
}
