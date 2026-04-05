import { useState, useEffect, useRef } from 'react';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase/config';
import { MessageSquare, Send, ArrowLeft, Loader2, User, Building2, Pill, BarChart2, Search, Circle } from 'lucide-react';

interface Conversation {
  entityId: string;
  entityName: string;
  entityType: 'doctor' | 'clinic' | 'pharma' | 'advertiser';
  collectionName: string;
  lastMessage: string;
  lastMessageAt: any;
  unreadCount: number;
}

interface SupportMessage {
  id: string;
  message: string;
  sender: string;
  senderName: string;
  createdAt: any;
  read: boolean;
}

const ENTITY_CONFIGS = [
  { type: 'doctor' as const, collectionName: 'doctors', label: 'Doctors', icon: User, color: 'emerald' },
  { type: 'clinic' as const, collectionName: 'clinics', label: 'Clinics', icon: Building2, color: 'purple' },
  { type: 'pharma' as const, collectionName: 'pharmaCompanies', label: 'Pharma', icon: Pill, color: 'blue' },
  { type: 'advertiser' as const, collectionName: 'advertisers', label: 'Advertisers', icon: BarChart2, color: 'amber' },
];

export default function AdminSupportChat() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);
  const [filterType, setFilterType] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Load all conversations from all entity collections
  useEffect(() => {
    loadConversations();
  }, []);

  const loadConversations = async () => {
    setLoading(true);
    const allConversations: Conversation[] = [];

    for (const config of ENTITY_CONFIGS) {
      try {
        const entitiesSnap = await getDocs(collection(db, config.collectionName));
        for (const entityDoc of entitiesSnap.docs) {
          try {
            const msgRef = collection(db, config.collectionName, entityDoc.id, 'supportMessages');
            const msgQuery = query(msgRef, orderBy('createdAt', 'desc'));
            const msgSnap = await getDocs(msgQuery);

            if (!msgSnap.empty) {
              const lastMsg = msgSnap.docs[0].data();
              const unread = msgSnap.docs.filter(d => !d.data().read && d.data().sender !== 'admin').length;
              const entityData = entityDoc.data();
              const name = entityData.name || entityData.clinicName || entityData.companyName || entityData.businessName || entityDoc.id;

              allConversations.push({
                entityId: entityDoc.id,
                entityName: name,
                entityType: config.type,
                collectionName: config.collectionName,
                lastMessage: lastMsg.message || '',
                lastMessageAt: lastMsg.createdAt,
                unreadCount: unread,
              });
            }
          } catch {
            // Skip entities with no supportMessages or permission errors
          }
        }
      } catch (err) {
        console.error(`Error loading ${config.type} conversations:`, err);
      }
    }

    // Sort by last message time (newest first)
    allConversations.sort((a, b) => {
      const aTime = a.lastMessageAt?.toDate?.()?.getTime() || 0;
      const bTime = b.lastMessageAt?.toDate?.()?.getTime() || 0;
      return bTime - aTime;
    });

    setConversations(allConversations);
    setLoading(false);
  };

  // Listen to messages when a conversation is selected
  useEffect(() => {
    if (!selectedConversation) return;
    setMessagesLoading(true);

    const msgRef = collection(db, selectedConversation.collectionName, selectedConversation.entityId, 'supportMessages');
    const q = query(msgRef, orderBy('createdAt', 'asc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs: SupportMessage[] = snapshot.docs.map(d => ({
        id: d.id,
        message: d.data().message || '',
        sender: d.data().sender || 'user',
        senderName: d.data().senderName || 'User',
        createdAt: d.data().createdAt,
        read: d.data().read || false,
      }));
      setMessages(msgs);
      setMessagesLoading(false);

      // Mark unread messages as read
      snapshot.docs.forEach(d => {
        if (!d.data().read && d.data().sender !== 'admin') {
          updateDoc(doc(db, selectedConversation.collectionName, selectedConversation.entityId, 'supportMessages', d.id), { read: true }).catch(() => {});
        }
      });
    });

    return () => unsubscribe();
  }, [selectedConversation]);

  const handleSendReply = async () => {
    if (!replyText.trim() || !selectedConversation || sending) return;
    setSending(true);
    try {
      await addDoc(
        collection(db, selectedConversation.collectionName, selectedConversation.entityId, 'supportMessages'),
        {
          message: replyText.trim(),
          sender: 'admin',
          senderName: 'HealQR Admin',
          entityType: selectedConversation.entityType,
          createdAt: serverTimestamp(),
          read: false,
        }
      );
      setReplyText('');
    } catch (err) {
      console.error('Error sending reply:', err);
    } finally {
      setSending(false);
    }
  };

  const formatTime = (ts: any) => {
    if (!ts?.toDate) return '';
    const date = ts.toDate();
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    if (diff < 604800000) return `${Math.floor(diff / 86400000)}d ago`;
    return date.toLocaleDateString();
  };

  const formatMessageTime = (ts: any) => {
    if (!ts?.toDate) return '';
    const date = ts.toDate();
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' · ' + date.toLocaleDateString();
  };

  const getEntityIcon = (type: string) => {
    const config = ENTITY_CONFIGS.find(c => c.type === type);
    if (!config) return User;
    return config.icon;
  };

  const getEntityColor = (type: string) => {
    switch (type) {
      case 'doctor': return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
      case 'clinic': return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
      case 'pharma': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'advertiser': return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  const getBubbleColor = (type: string) => {
    switch (type) {
      case 'doctor': return 'bg-emerald-600';
      case 'clinic': return 'bg-purple-600';
      case 'pharma': return 'bg-blue-600';
      case 'advertiser': return 'bg-amber-600';
      default: return 'bg-gray-600';
    }
  };

  const filteredConversations = conversations.filter(c => {
    if (filterType !== 'all' && c.entityType !== filterType) return false;
    if (searchQuery && !c.entityName.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  // Conversation List View
  if (!selectedConversation) {
    return (
      <div className="flex-1 overflow-hidden bg-black">
        <div className="h-full flex flex-col max-w-5xl mx-auto p-4 md:p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <MessageSquare className="w-6 h-6 text-emerald-400" />
              <h1 className="text-xl font-bold text-white">Support Chat Inbox</h1>
              <span className="text-sm text-gray-500">({conversations.length} conversations)</span>
            </div>
            <button
              onClick={loadConversations}
              className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm rounded-lg transition-colors"
            >
              Refresh
            </button>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-2 mb-4">
            {[
              { id: 'all', label: 'All' },
              { id: 'doctor', label: 'Doctors' },
              { id: 'clinic', label: 'Clinics' },
              { id: 'pharma', label: 'Pharma' },
              { id: 'advertiser', label: 'Advertisers' },
            ].map(f => (
              <button
                key={f.id}
                onClick={() => setFilterType(f.id)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  filterType === f.id
                    ? 'bg-emerald-500 text-white'
                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                }`}
              >
                {f.label}
              </button>
            ))}
            <div className="flex-1 min-w-[200px] relative ml-2">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name..."
                className="w-full bg-gray-800 border border-gray-700 rounded-lg pl-9 pr-3 py-1.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* Conversation List */}
          <div className="flex-1 overflow-y-auto space-y-2">
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="w-6 h-6 text-emerald-500 animate-spin" />
                <span className="text-gray-400 ml-3">Loading conversations...</span>
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="text-center py-20">
                <MessageSquare className="w-12 h-12 text-gray-700 mx-auto mb-3" />
                <p className="text-gray-400">No support conversations yet</p>
              </div>
            ) : (
              filteredConversations.map((conv) => {
                const Icon = getEntityIcon(conv.entityType);
                return (
                  <button
                    key={`${conv.collectionName}-${conv.entityId}`}
                    onClick={() => setSelectedConversation(conv)}
                    className="w-full text-left bg-gray-900 hover:bg-gray-800 border border-gray-800 hover:border-gray-700 rounded-xl p-4 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      {/* Avatar */}
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${getEntityColor(conv.entityType)}`}>
                        <Icon className="w-5 h-5" />
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-white font-medium text-sm truncate">{conv.entityName}</p>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-full border ${getEntityColor(conv.entityType)}`}>
                            {conv.entityType}
                          </span>
                        </div>
                        <p className="text-gray-500 text-xs truncate mt-0.5">{conv.lastMessage}</p>
                      </div>

                      {/* Meta */}
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <span className="text-[10px] text-gray-600">{formatTime(conv.lastMessageAt)}</span>
                        {conv.unreadCount > 0 && (
                          <span className="w-5 h-5 bg-emerald-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                            {conv.unreadCount}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      </div>
    );
  }

  // Chat View
  return (
    <div className="flex-1 overflow-hidden bg-black">
      <div className="h-full flex flex-col max-w-4xl mx-auto">
        {/* Chat Header */}
        <div className="flex items-center gap-3 px-4 md:px-6 py-4 border-b border-gray-800 shrink-0">
          <button
            onClick={() => { setSelectedConversation(null); setMessages([]); loadConversations(); }}
            className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-400" />
          </button>
          <div className={`w-9 h-9 rounded-full flex items-center justify-center ${getEntityColor(selectedConversation.entityType)}`}>
            {(() => { const Icon = getEntityIcon(selectedConversation.entityType); return <Icon className="w-4 h-4" />; })()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white font-semibold text-sm truncate">{selectedConversation.entityName}</p>
            <p className="text-gray-500 text-xs capitalize">{selectedConversation.entityType} • {selectedConversation.entityId.slice(0, 12)}...</p>
          </div>
          <div className="flex items-center gap-1.5">
            <Circle className="w-2 h-2 fill-emerald-500 text-emerald-500" />
            <span className="text-[10px] text-gray-500">Live</span>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 md:px-6 space-y-3">
          {messagesLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-5 h-5 text-emerald-500 animate-spin" />
            </div>
          ) : messages.length === 0 ? (
            <p className="text-center text-gray-600 py-20">No messages in this conversation</p>
          ) : (
            messages.map((msg) => (
              <div key={msg.id} className={`flex ${msg.sender === 'admin' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[70%] rounded-xl px-3.5 py-2.5 overflow-hidden ${
                  msg.sender === 'admin'
                    ? 'bg-emerald-600 text-white rounded-br-sm'
                    : `${getBubbleColor(selectedConversation.entityType)} text-white rounded-bl-sm`
                }`}>
                  {msg.sender !== 'admin' && (
                    <p className="text-[10px] text-white/60 font-medium mb-0.5 truncate">{msg.senderName}</p>
                  )}
                  {msg.sender === 'admin' && (
                    <p className="text-[10px] text-white/60 font-medium mb-0.5">You (Admin)</p>
                  )}
                  <p className="text-sm whitespace-pre-wrap break-words leading-relaxed overflow-hidden">{msg.message}</p>
                  <p className="text-[10px] text-white/40 mt-1">{formatMessageTime(msg.createdAt)}</p>
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Reply Input */}
        <div className="border-t border-gray-800 p-4 md:px-6 shrink-0">
          <div className="flex items-end gap-2">
            <textarea
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendReply(); } }}
              placeholder="Type your reply..."
              rows={1}
              className="flex-1 px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 resize-none max-h-28"
              style={{ minHeight: '42px' }}
            />
            <button
              onClick={handleSendReply}
              disabled={!replyText.trim() || sending}
              className="p-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl transition-colors shrink-0"
            >
              {sending ? <Loader2 className="w-5 h-5 animate-spin text-white" /> : <Send className="w-5 h-5 text-white" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
