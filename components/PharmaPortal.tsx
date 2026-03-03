import { useState, useEffect, useRef } from 'react';
import { Menu, Bell, Share2, Video, User, MessageSquare, X, Send, Loader2 } from 'lucide-react';
import PharmaSidebar from './PharmaSidebar';
import PharmaDashboard from './PharmaDashboard';
import PharmaMyDoctors from './PharmaMyDoctors';
import PharmaAnalytics from './PharmaAnalytics';
import PharmaDashboardTemplates from './PharmaDashboardTemplates';
import VideoLibrary from './VideoLibrary';
import { db } from '../lib/firebase/config';
import { collection, addDoc, serverTimestamp, query, orderBy, onSnapshot, doc, updateDoc } from 'firebase/firestore';

interface PharmaPortalProps {
  onLogout: () => void;
}

interface SupportMessage {
  id: string;
  message: string;
  sender: 'pharma' | 'admin';
  senderName: string;
  createdAt: any;
  read: boolean;
}

export default function PharmaPortal({ onLogout }: PharmaPortalProps) {
  const [currentPage, setCurrentPage] = useState<
    'dashboard' | 'my-doctors' | 'analytics' | 'templates' | 'video-library'
  >('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<SupportMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [chatLoading, setChatLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const companyId = localStorage.getItem('healqr_pharma_company_id') || '';
  const companyName = localStorage.getItem('healqr_pharma_company_name') || '';
  const companyEmail = localStorage.getItem('healqr_pharma_email') || '';

  const pageTitles: Record<string, string> = {
    dashboard: 'Dashboard',
    'my-doctors': 'My Doctors',
    analytics: 'Analytics',
    templates: 'Dashboard Templates',
    'video-library': 'Video Library',
  };

  // Redirect if not authenticated
  useEffect(() => {
    const isAuth = localStorage.getItem('healqr_pharma_authenticated');
    if (isAuth !== 'true') {
      window.location.href = '/?page=pharma-login';
    }
  }, []);

  // Listen to support messages for floating chat + unread count
  useEffect(() => {
    if (!companyId || !db) return;
    const messagesRef = collection(db, 'pharmaCompanies', companyId, 'supportMessages');
    const q = query(messagesRef, orderBy('createdAt', 'asc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs: SupportMessage[] = snapshot.docs.map(d => ({
        id: d.id,
        message: d.data().message || '',
        sender: d.data().sender || 'admin',
        senderName: d.data().senderName || '',
        createdAt: d.data().createdAt,
        read: d.data().read ?? true,
      }));
      setChatMessages(msgs);
      setChatLoading(false);

      // Count unread admin messages
      const unread = msgs.filter(m => m.sender === 'admin' && !m.read).length;
      setUnreadCount(unread);

      // If chat is open, mark admin messages as read
      if (isChatOpen) {
        snapshot.docs.forEach(d => {
          const data = d.data();
          if (data.sender === 'admin' && !data.read) {
            updateDoc(doc(db!, 'pharmaCompanies', companyId, 'supportMessages', d.id), { read: true }).catch(() => {});
          }
        });
      }
    }, () => setChatLoading(false));

    return () => unsubscribe();
  }, [companyId, isChatOpen]);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (isChatOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages, isChatOpen]);

  // Mark messages as read when chat opens
  useEffect(() => {
    if (isChatOpen && companyId && db) {
      chatMessages.forEach(msg => {
        if (msg.sender === 'admin' && !msg.read) {
          updateDoc(doc(db!, 'pharmaCompanies', companyId, 'supportMessages', msg.id), { read: true }).catch(() => {});
        }
      });
    }
  }, [isChatOpen]);

  const handleLogout = () => {
    localStorage.removeItem('healqr_pharma_authenticated');
    localStorage.removeItem('healqr_pharma_company_id');
    localStorage.removeItem('healqr_pharma_company_name');
    localStorage.removeItem('healqr_pharma_email');
    onLogout();
  };

  const handleSendMessage = async () => {
    const text = newMessage.trim();
    if (!text || !companyId || !db) return;
    setSending(true);
    try {
      await addDoc(collection(db, 'pharmaCompanies', companyId, 'supportMessages'), {
        message: text,
        sender: 'pharma',
        senderName: companyName || 'Pharma Company',
        createdAt: serverTimestamp(),
        read: false,
      });
      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setSending(false);
    }
  };

  const handleChatKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return '';
    const date = timestamp.toDate?.() || new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' }) + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const handleShare = async () => {
    const shareData = {
      title: 'healQR Distributors',
      text: `Check out ${companyName} on HealQR Distributors Portal`,
      url: window.location.href,
    };
    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(window.location.href);
        alert('Link copied to clipboard!');
      }
    } catch (err) {
      // User cancelled share
    }
  };

  // Navbar icon button component  
  const NavIconBtn = ({ icon: Icon, label, onClick, badge, active }: {
    icon: any; label: string; onClick: () => void; badge?: number; active?: boolean;
  }) => (
    <button
      onClick={onClick}
      title={label}
      className={`relative p-2.5 rounded-xl border transition-all duration-200 ${
        active
          ? 'bg-blue-500/20 border-blue-500/50 text-blue-400'
          : 'bg-zinc-900 border-zinc-800 text-gray-400 hover:bg-zinc-800 hover:text-white hover:border-zinc-700'
      }`}
    >
      <Icon className="w-5 h-5" />
      {badge && badge > 0 ? (
        <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
          {badge > 9 ? '9+' : badge}
        </span>
      ) : null}
    </button>
  );

  return (
    <div className="flex h-screen bg-black text-white">
      {/* Sidebar */}
      <PharmaSidebar
        currentPage={currentPage}
        onNavigate={(page) => setCurrentPage(page as any)}
        onLogout={handleLogout}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        companyName={companyName}
      />

      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-black border-b border-zinc-900 flex items-center gap-3 px-4 z-30">
        <button
          onClick={() => setIsSidebarOpen(true)}
          className="p-2 hover:bg-zinc-900 rounded-lg transition-colors"
        >
          <Menu className="w-6 h-6 text-blue-400" />
        </button>
        <h1 className="text-lg flex-1 font-semibold">{pageTitles[currentPage]}</h1>
        <div className="flex items-center gap-2">
          <NavIconBtn icon={Share2} label="Share" onClick={handleShare} />
          <NavIconBtn icon={Video} label="Video Library" onClick={() => setCurrentPage('video-library')} active={currentPage === 'video-library'} />
          <NavIconBtn icon={Bell} label="Notifications" onClick={() => setShowNotifications(!showNotifications)} badge={unreadCount} active={showNotifications} />
          <NavIconBtn icon={User} label="Profile" onClick={() => setShowProfileMenu(!showProfileMenu)} active={showProfileMenu} />
        </div>
      </div>

      {/* Desktop Header */}
      <div className="hidden lg:flex fixed top-0 right-0 left-64 h-16 bg-black border-b border-zinc-900 items-center justify-between px-6 z-30">
        <h1 className="text-lg font-semibold">{pageTitles[currentPage]}</h1>
        <div className="flex items-center gap-3">
          <NavIconBtn icon={Share2} label="Share" onClick={handleShare} />
          <NavIconBtn icon={Video} label="Video Library" onClick={() => setCurrentPage('video-library')} active={currentPage === 'video-library'} />
          <NavIconBtn icon={Bell} label="Notifications" onClick={() => setShowNotifications(!showNotifications)} badge={unreadCount} active={showNotifications} />
          <NavIconBtn icon={User} label="Profile" onClick={() => setShowProfileMenu(!showProfileMenu)} active={showProfileMenu} />
        </div>
      </div>

      {/* Notification dropdown */}
      {showNotifications && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setShowNotifications(false)} />
          <div className="fixed top-16 right-20 lg:right-24 w-80 bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl z-50 overflow-hidden">
            <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
              <h3 className="font-semibold text-sm">Notifications</h3>
              {unreadCount > 0 && <span className="text-xs bg-red-500/20 text-red-400 px-2 py-0.5 rounded-full">{unreadCount} new</span>}
            </div>
            <div className="max-h-64 overflow-y-auto">
              {unreadCount === 0 ? (
                <div className="p-6 text-center text-gray-500 text-sm">No new notifications</div>
              ) : (
                chatMessages.filter(m => m.sender === 'admin' && !m.read).slice(-5).map(msg => (
                  <div key={msg.id} className="p-3 border-b border-zinc-800/50 hover:bg-zinc-800/50 cursor-pointer" onClick={() => { setShowNotifications(false); setIsChatOpen(true); }}>
                    <p className="text-xs text-blue-400 font-medium">Support Reply</p>
                    <p className="text-sm text-gray-300 line-clamp-2 mt-0.5">{msg.message}</p>
                    <p className="text-xs text-gray-500 mt-1">{formatDate(msg.createdAt)}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}

      {/* Profile dropdown */}
      {showProfileMenu && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setShowProfileMenu(false)} />
          <div className="fixed top-16 right-4 lg:right-6 w-72 bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl z-50 overflow-hidden">
            <div className="p-4 border-b border-zinc-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-500/20 border border-blue-500/40 flex items-center justify-center">
                  <User className="w-5 h-5 text-blue-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">{companyName}</p>
                  <p className="text-xs text-gray-400 truncate">{companyEmail}</p>
                </div>
              </div>
            </div>
            <div className="p-2">
              <button onClick={() => { setShowProfileMenu(false); setCurrentPage('dashboard'); }} className="w-full text-left px-3 py-2.5 text-sm text-gray-300 hover:bg-zinc-800 rounded-lg transition-colors">Dashboard</button>
              <button onClick={() => { setShowProfileMenu(false); setCurrentPage('templates'); }} className="w-full text-left px-3 py-2.5 text-sm text-gray-300 hover:bg-zinc-800 rounded-lg transition-colors">Dashboard Templates</button>
              <div className="border-t border-zinc-800 my-1" />
              <button onClick={handleLogout} className="w-full text-left px-3 py-2.5 text-sm text-red-400 hover:bg-red-950/30 rounded-lg transition-colors">Logout</button>
            </div>
          </div>
        </>
      )}

      {/* Main Content */}
      <div className="flex-1 lg:ml-64 pt-16">
        {currentPage === 'dashboard' && (
          <PharmaDashboard companyId={companyId} companyName={companyName} />
        )}
        {currentPage === 'my-doctors' && (
          <PharmaMyDoctors companyId={companyId} />
        )}
        {currentPage === 'analytics' && (
          <PharmaAnalytics companyId={companyId} />
        )}
        {currentPage === 'templates' && (
          <PharmaDashboardTemplates companyId={companyId} />
        )}
        {currentPage === 'video-library' && (
          <VideoLibrary onBack={() => setCurrentPage('dashboard')} source="dashboard" />
        )}
      </div>

      {/* Floating Support Chat Button */}
      <button
        onClick={() => setIsChatOpen(!isChatOpen)}
        className={`fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full shadow-2xl flex items-center justify-center transition-all duration-300 ${
          isChatOpen
            ? 'bg-zinc-800 hover:bg-zinc-700 rotate-0'
            : 'bg-blue-600 hover:bg-blue-700 hover:scale-110'
        }`}
      >
        {isChatOpen ? (
          <X className="w-6 h-6 text-white" />
        ) : (
          <>
            <MessageSquare className="w-6 h-6 text-white" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center animate-pulse">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </>
        )}
      </button>

      {/* Floating Chat Window */}
      {isChatOpen && (
        <div className="fixed bottom-24 right-6 z-50 w-[360px] max-w-[calc(100vw-3rem)] h-[480px] bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-4">
          {/* Chat Header */}
          <div className="px-4 py-3 border-b border-zinc-800 bg-zinc-950 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-blue-500/20 border border-blue-500/40 flex items-center justify-center">
                <MessageSquare className="w-4 h-4 text-blue-400" />
              </div>
              <div>
                <h3 className="text-sm font-semibold">Support</h3>
                <p className="text-xs text-gray-500">Chat with admin team</p>
              </div>
            </div>
            <button onClick={() => setIsChatOpen(false)} className="p-1.5 hover:bg-zinc-800 rounded-lg transition-colors">
              <X className="w-4 h-4 text-gray-400" />
            </button>
          </div>

          {/* Chat Messages */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3 min-h-0">
            {chatLoading ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
              </div>
            ) : chatMessages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center px-4">
                <div className="w-12 h-12 rounded-full bg-zinc-800 flex items-center justify-center mb-3">
                  <MessageSquare className="w-6 h-6 text-gray-600" />
                </div>
                <p className="text-gray-400 text-sm font-medium">No messages yet</p>
                <p className="text-gray-600 text-xs mt-1">Send a message to start the conversation</p>
              </div>
            ) : (
              chatMessages.map((msg) => (
                <div key={msg.id} className={`flex ${msg.sender === 'pharma' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] rounded-xl px-3 py-2 ${
                    msg.sender === 'pharma'
                      ? 'bg-blue-600 text-white rounded-br-sm'
                      : 'bg-zinc-800 text-white rounded-bl-sm'
                  }`}>
                    {msg.sender === 'admin' && (
                      <p className="text-[10px] text-emerald-400 font-medium mb-0.5">{msg.senderName || 'HealQR Admin'}</p>
                    )}
                    <p className="text-sm whitespace-pre-wrap break-words leading-relaxed">{msg.message}</p>
                    <p className={`text-[10px] mt-1 ${msg.sender === 'pharma' ? 'text-blue-200' : 'text-gray-500'}`}>
                      {formatDate(msg.createdAt)}
                    </p>
                  </div>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Chat Input */}
          <div className="border-t border-zinc-800 p-3 bg-zinc-950 shrink-0">
            <div className="flex items-end gap-2">
              <textarea
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={handleChatKeyDown}
                placeholder="Type a message..."
                rows={1}
                className="flex-1 px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none max-h-24"
                style={{ minHeight: '38px' }}
              />
              <button
                onClick={handleSendMessage}
                disabled={!newMessage.trim() || sending}
                className="p-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors shrink-0"
              >
                {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
