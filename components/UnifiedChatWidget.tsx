/**
 * UnifiedChatWidget — Universal floating chat for ALL portals
 * Combines AI Assistant (Gemini) + Manual Support (Firestore) in one button.
 * Works for: Doctor, Clinic, Branch, Assistant, Pharma, Advertiser
 *
 * Props:
 *   entityType   — 'doctor' | 'clinic' | 'pharma' | 'advertiser'
 *   entityId     — Firestore document ID (userId, companyId, etc.)
 *   entityName   — Display name for support messages
 *   userRole     — AI chat role ('doctor' | 'clinic' | 'admin' | 'visitor')
 *   collectionName — Firestore root collection ('doctors', 'clinics', 'pharmaCompanies', 'advertisers')
 */

import { useState, useRef, useEffect } from 'react';
import { X, Send, Bot, User, MessageSquare, Sparkles, Shield, RotateCcw, Loader2, Headphones, Star } from 'lucide-react';
import { db } from '../lib/firebase/config';
import { collection, addDoc, serverTimestamp, query, orderBy, onSnapshot, doc, updateDoc, getDocs, where } from 'firebase/firestore';
import { sendChatMessage, getQuickReplies, resetChatHistory, type ChatMessage, type UserRole } from '../services/aiChatBotService';

interface UnifiedChatWidgetProps {
  entityType: 'doctor' | 'clinic' | 'pharma' | 'advertiser';
  entityId: string;
  entityName: string;
  userRole?: UserRole;
  collectionName: string; // e.g. 'doctors', 'clinics', 'pharmaCompanies', 'advertisers'
}

interface SupportMessage {
  id: string;
  message: string;
  sender: 'user' | 'admin';
  senderName: string;
  createdAt: any;
  read: boolean;
}

type ChatTab = 'ai' | 'support';

const SUPPORT_KEYWORDS = [
  'talk to human', 'talk to admin', 'contact support', 'speak to someone',
  'human support', 'real person', 'manual support', 'connect support',
  'complaint', 'billing', 'payment', 'refund', 'bug', 'error',
  'not working', 'broken', 'issue with', 'problem with',
  'territory request', 'add territory', 'remove territory',
  'account issue', 'login issue', "can't access",
];

function needsHumanSupport(text: string): boolean {
  const lower = text.toLowerCase();
  return SUPPORT_KEYWORDS.some(kw => lower.includes(kw));
}

const ENTITY_COLORS: Record<string, { button: string; header: string; accent: string; bubble: string }> = {
  doctor: { button: 'from-emerald-600 to-emerald-700', header: 'from-emerald-600 to-emerald-700', accent: 'text-emerald-400', bubble: 'bg-emerald-600' },
  clinic: { button: 'from-purple-600 to-purple-700', header: 'from-purple-600 to-purple-700', accent: 'text-purple-400', bubble: 'bg-purple-600' },
  pharma: { button: 'from-blue-600 to-blue-700', header: 'from-blue-600 to-blue-700', accent: 'text-blue-400', bubble: 'bg-blue-600' },
  advertiser: { button: 'from-amber-600 to-amber-700', header: 'from-amber-600 to-amber-700', accent: 'text-amber-400', bubble: 'bg-amber-600' },
};

// Map entity sender field name to match existing pharma pattern
function getSenderType(entityType: string): string {
  if (entityType === 'pharma') return 'pharma';
  return 'user';
}

export default function UnifiedChatWidget({ entityType, entityId, entityName, userRole = 'visitor', collectionName }: UnifiedChatWidgetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<ChatTab>('ai');
  const colors = ENTITY_COLORS[entityType] || ENTITY_COLORS.doctor;
  const senderType = getSenderType(entityType);

  // AI Chat state
  const [aiMessages, setAiMessages] = useState<ChatMessage[]>([
    { id: '1', role: 'bot', text: `Hi! I'm the HealQR AI Assistant. I can help with dashboard navigation, features, analytics, and more. Need human support? Just ask!`, timestamp: new Date() }
  ]);
  const [aiInput, setAiInput] = useState('');
  const [aiTyping, setAiTyping] = useState(false);

  // Support Chat state
  const [supportMessages, setSupportMessages] = useState<SupportMessage[]>([]);
  const [supportInput, setSupportInput] = useState('');
  const [supportLoading, setSupportLoading] = useState(true);
  const [supportSending, setSupportSending] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  // Rating state
  const [userRating, setUserRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [ratingComment, setRatingComment] = useState('');
  const [ratingSubmitted, setRatingSubmitted] = useState(false);
  const [ratingLoading, setRatingLoading] = useState(false);
  const [existingRating, setExistingRating] = useState<number | null>(null);
  const [showRatingForm, setShowRatingForm] = useState(false);

  const aiEndRef = useRef<HTMLDivElement>(null);
  const supportEndRef = useRef<HTMLDivElement>(null);
  const aiInputRef = useRef<HTMLInputElement>(null);
  const supportInputRef = useRef<HTMLTextAreaElement>(null);

  // Scroll to bottom
  useEffect(() => {
    if (activeTab === 'ai') aiEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [aiMessages, activeTab]);

  useEffect(() => {
    if (activeTab === 'support') supportEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [supportMessages, activeTab]);

  // Focus input
  useEffect(() => {
    if (!isOpen) return;
    if (activeTab === 'ai') aiInputRef.current?.focus();
    else supportInputRef.current?.focus();
  }, [isOpen, activeTab]);

  // Listen to support messages — uses {collectionName}/{entityId}/supportMessages
  useEffect(() => {
    if (!entityId || !db) return;
    const messagesRef = collection(db, collectionName, entityId, 'supportMessages');
    const q = query(messagesRef, orderBy('createdAt', 'asc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs: SupportMessage[] = snapshot.docs.map(d => ({
        id: d.id,
        message: d.data().message || '',
        sender: d.data().sender === 'admin' ? 'admin' : 'user',
        senderName: d.data().senderName || '',
        createdAt: d.data().createdAt,
        read: d.data().read ?? true,
      }));
      setSupportMessages(msgs);
      setSupportLoading(false);

      const unread = msgs.filter(m => m.sender === 'admin' && !m.read).length;
      setUnreadCount(unread);

      if (isOpen && activeTab === 'support') {
        snapshot.docs.forEach(d => {
          const data = d.data();
          if (data.sender === 'admin' && !data.read) {
            updateDoc(doc(db!, collectionName, entityId, 'supportMessages', d.id), { read: true }).catch(() => {});
          }
        });
      }
    }, () => setSupportLoading(false));

    return () => unsubscribe();
  }, [entityId, collectionName, isOpen, activeTab]);

  // Mark read on tab switch
  useEffect(() => {
    if (isOpen && activeTab === 'support' && entityId && db) {
      supportMessages.forEach(msg => {
        if (msg.sender === 'admin' && !msg.read) {
          updateDoc(doc(db!, collectionName, entityId, 'supportMessages', msg.id), { read: true }).catch(() => {});
        }
      });
    }
  }, [isOpen, activeTab]);

  // --- AI Chat ---
  const handleAiSend = async () => {
    const text = aiInput.trim();
    if (!text || aiTyping) return;

    const userMsg: ChatMessage = { id: Date.now().toString(), role: 'user', text, timestamp: new Date() };
    setAiMessages(prev => [...prev, userMsg]);
    setAiInput('');
    setAiTyping(true);

    if (needsHumanSupport(text)) {
      setAiMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(), role: 'bot',
        text: '🔄 It sounds like you need to speak with our support team. Let me connect you!',
        timestamp: new Date(),
      }]);
      setAiTyping(false);
      setTimeout(() => setActiveTab('support'), 1200);
      return;
    }

    try {
      const response = await sendChatMessage(text, 'english', userRole);
      setAiMessages(prev => [...prev, { id: (Date.now() + 1).toString(), role: 'bot', text: response, timestamp: new Date() }]);
    } catch {
      setAiMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(), role: 'bot',
        text: 'Sorry, I\'m having trouble connecting. Try again or switch to Support.',
        timestamp: new Date(),
      }]);
    } finally {
      setAiTyping(false);
    }
  };

  const handleAiReset = () => {
    resetChatHistory();
    setAiMessages([{ id: Date.now().toString(), role: 'bot', text: 'New conversation started! How can I help?', timestamp: new Date() }]);
  };

  // --- Support Chat ---
  const handleSupportSend = async () => {
    const text = supportInput.trim();
    if (!text || !entityId || !db) return;
    setSupportSending(true);
    try {
      await addDoc(collection(db, collectionName, entityId, 'supportMessages'), {
        message: text,
        sender: senderType,
        senderName: entityName || 'User',
        entityType,
        createdAt: serverTimestamp(),
        read: false,
      });
      setSupportInput('');
    } catch (error) {
      console.error('Error sending support message:', error);
    } finally {
      setSupportSending(false);
    }
  };

  const handleSupportKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSupportSend(); }
  };

  // --- Rating Logic ---
  // Check if this entity already submitted a support rating
  useEffect(() => {
    if (!entityId || !db) return;
    const checkRating = async () => {
      try {
        const q = query(
          collection(db, 'reviews'),
          where('entityId', '==', entityId),
          where('type', '==', 'support')
        );
        const snap = await getDocs(q);
        if (!snap.empty) {
          const data = snap.docs[0].data();
          setExistingRating(data.rating || 0);
          setRatingSubmitted(true);
        }
      } catch (err) {
        console.error('Error checking existing rating:', err);
      }
    };
    checkRating();
  }, [entityId]);

  const handleStarClick = (starIndex: number, e: React.MouseEvent<HTMLButtonElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const isLeftHalf = clickX < rect.width / 2;
    const rating = isLeftHalf ? starIndex - 0.5 : starIndex;
    setUserRating(rating);
  };

  const handleStarHover = (starIndex: number, e: React.MouseEvent<HTMLButtonElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const hoverX = e.clientX - rect.left;
    const isLeftHalf = hoverX < rect.width / 2;
    setHoveredRating(isLeftHalf ? starIndex - 0.5 : starIndex);
  };

  const handleRatingSubmit = async () => {
    if (userRating === 0 || !entityId || !db) return;
    setRatingLoading(true);
    try {
      await addDoc(collection(db, 'reviews'), {
        type: 'support',
        entityType,
        entityId,
        entityName: entityName || 'Unknown',
        doctorName: entityName || 'Unknown', // backward compat for admin stats
        doctorId: entityId,
        rating: userRating,
        comment: ratingComment.trim() || (userRating >= 4.5 ? 'Excellent service!' : userRating >= 3.5 ? 'Great service!' : 'Good service'),
        createdAt: serverTimestamp(),
        uploadedToLanding: false,
      });
      setExistingRating(userRating);
      setRatingSubmitted(true);
      setShowRatingForm(false);
    } catch (err) {
      console.error('Error submitting rating:', err);
    } finally {
      setRatingLoading(false);
    }
  };

  const renderStarRating = (value: number, size: string = 'w-6 h-6') => {
    return [1, 2, 3, 4, 5].map((star) => {
      const filled = value >= star;
      const halfFilled = value >= star - 0.5 && value < star;
      return (
        <span key={star} className="relative inline-block">
          <Star className={`${size} text-gray-600`} />
          {filled && <Star className={`${size} fill-yellow-400 text-yellow-400 absolute inset-0`} />}
          {halfFilled && (
            <span className="absolute inset-0 overflow-hidden" style={{ width: '50%' }}>
              <Star className={`${size} fill-yellow-400 text-yellow-400`} />
            </span>
          )}
        </span>
      );
    });
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  const quickReplies = getQuickReplies(userRole);

  return (
    <>
      {/* Floating Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className={`fixed bottom-6 right-6 z-50 w-14 h-14 bg-gradient-to-br ${colors.button} rounded-full shadow-2xl flex items-center justify-center hover:scale-110 transition-transform group`}
        >
          <MessageSquare className="w-6 h-6 text-white" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center animate-pulse">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
          <span className="absolute right-16 bg-gray-900 text-white text-xs px-3 py-1.5 rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-lg">
            Chat & Support
          </span>
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 z-50 w-[370px] max-w-[calc(100vw-2rem)] h-[540px] bg-[#0f1419] border border-gray-700 rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-4">

          {/* Header */}
          <div className={`bg-gradient-to-r ${colors.header} px-4 py-3 flex items-center gap-3 shrink-0`}>
            <div className="w-9 h-9 bg-white/20 rounded-full flex items-center justify-center">
              {activeTab === 'ai' ? <Bot className="w-5 h-5 text-white" /> : <Headphones className="w-5 h-5 text-white" />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-white font-semibold text-sm">
                {activeTab === 'ai' ? 'AI Assistant' : 'Support Team'}
              </div>
              <div className="text-white/60 text-xs">
                {activeTab === 'ai' ? 'Powered by AI • Ask anything' : 'Chat with HealQR admin'}
              </div>
            </div>
            {activeTab === 'ai' && (
              <button onClick={handleAiReset} className="p-1.5 hover:bg-white/20 rounded-lg transition-colors" title="New conversation">
                <RotateCcw className="w-4 h-4 text-white/80" />
              </button>
            )}
            <button onClick={() => setIsOpen(false)} className="p-1.5 hover:bg-white/20 rounded-lg transition-colors">
              <X className="w-4 h-4 text-white" />
            </button>
          </div>

          {/* Tab Switcher */}
          <div className="flex border-b border-gray-800 shrink-0">
            <button
              onClick={() => setActiveTab('ai')}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-xs font-medium transition-colors ${
                activeTab === 'ai'
                  ? `${colors.accent} border-b-2 border-current bg-white/5`
                  : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              AI Assistant
            </button>
            <button
              onClick={() => setActiveTab('support')}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-xs font-medium transition-colors relative ${
                activeTab === 'support'
                  ? 'text-emerald-400 border-b-2 border-emerald-400 bg-emerald-500/5'
                  : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              <Headphones className="w-3.5 h-3.5" />
              Support
              {unreadCount > 0 && activeTab !== 'support' && (
                <span className="w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                  {unreadCount}
                </span>
              )}
            </button>
          </div>

          {/* Security Badge */}
          <div className="px-3 py-1.5 bg-gray-900/50 border-b border-gray-800 flex items-center gap-1.5 shrink-0">
            <Shield className="w-3 h-3 text-green-500" />
            <span className="text-[10px] text-gray-500">Secure • No medical advice • No data sharing</span>
          </div>

          {/* ===== AI Tab ===== */}
          {activeTab === 'ai' && (
            <>
              <div className="flex-1 overflow-y-auto p-3 space-y-3 min-h-0 custom-scrollbar">
                {aiMessages.map((msg) => (
                  <div key={msg.id} className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    {msg.role === 'bot' && (
                      <div className={`w-7 h-7 ${colors.accent.replace('text-', 'bg-').replace('400', '500/20')} rounded-full flex items-center justify-center flex-shrink-0 mt-1`}>
                        <Bot className={`w-4 h-4 ${colors.accent}`} />
                      </div>
                    )}
                    <div className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                      msg.role === 'user'
                        ? `${colors.bubble} text-white rounded-br-md`
                        : 'bg-gray-800 text-gray-200 rounded-bl-md'
                    }`}>
                      {msg.text}
                    </div>
                    {msg.role === 'user' && (
                      <div className="w-7 h-7 bg-orange-500/20 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                        <User className="w-4 h-4 text-orange-400" />
                      </div>
                    )}
                  </div>
                ))}

                {aiTyping && (
                  <div className="flex gap-2 items-start">
                    <div className={`w-7 h-7 ${colors.accent.replace('text-', 'bg-').replace('400', '500/20')} rounded-full flex items-center justify-center flex-shrink-0`}>
                      <Bot className={`w-4 h-4 ${colors.accent}`} />
                    </div>
                    <div className="bg-gray-800 rounded-2xl rounded-bl-md px-4 py-3">
                      <div className="flex gap-1">
                        <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                        <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                        <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                    </div>
                  </div>
                )}
                <div ref={aiEndRef} />
              </div>

              {/* Quick Replies */}
              {aiMessages.length <= 2 && (
                <div className="px-3 pb-2 flex flex-wrap gap-1.5 shrink-0">
                  {quickReplies.slice(0, 4).map((text, i) => (
                    <button
                      key={i}
                      onClick={() => { setAiInput(text); setTimeout(() => handleAiSend(), 100); }}
                      className={`text-xs bg-gray-800 hover:bg-gray-700 ${colors.accent} border border-gray-700 rounded-full px-3 py-1.5 transition-colors`}
                    >
                      {text}
                    </button>
                  ))}
                  <button
                    onClick={() => setActiveTab('support')}
                    className="text-xs bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-full px-3 py-1.5 transition-colors"
                  >
                    Talk to Support
                  </button>
                </div>
              )}

              {/* AI Input */}
              <div className="p-3 border-t border-gray-700 shrink-0">
                <div className="flex gap-2">
                  <input
                    ref={aiInputRef}
                    type="text"
                    value={aiInput}
                    onChange={(e) => setAiInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAiSend()}
                    placeholder="Ask me anything..."
                    className="flex-1 bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors"
                    disabled={aiTyping}
                  />
                  <button
                    onClick={handleAiSend}
                    disabled={!aiInput.trim() || aiTyping}
                    className={`w-10 h-10 ${colors.bubble} hover:opacity-90 disabled:bg-gray-700 disabled:text-gray-500 rounded-xl flex items-center justify-center transition-colors`}
                  >
                    <Send className="w-4 h-4 text-white" />
                  </button>
                </div>
              </div>
            </>
          )}

          {/* ===== Support Tab ===== */}
          {activeTab === 'support' && (
            <>
              {/* Rating Card — fixed above scroll area */}
              <div className="px-3 pt-3 pb-0 shrink-0">
                <div className="bg-gradient-to-r from-zinc-800/80 to-zinc-900/80 rounded-xl border border-zinc-700/50 overflow-hidden">
                  {ratingSubmitted ? (
                    <div className="px-3 py-2.5 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                        <span className="text-xs text-gray-300">Your rating: <span className="text-yellow-400 font-medium">{existingRating}</span>/5</span>
                      </div>
                      <span className="text-[10px] text-emerald-400">Thank you!</span>
                    </div>
                  ) : !showRatingForm ? (
                    <button
                      onClick={() => setShowRatingForm(true)}
                      className="w-full px-3 py-2.5 flex items-center justify-between hover:bg-zinc-700/30 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <Star className="w-4 h-4 text-yellow-400" />
                        <span className="text-xs text-gray-300">Rate our service</span>
                      </div>
                      <span className="text-[10px] text-emerald-400">Tap to rate →</span>
                    </button>
                  ) : (
                    <div className="p-3 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-medium text-white">How's our service?</p>
                        <button onClick={() => setShowRatingForm(false)} className="text-gray-500 hover:text-gray-300">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Half-star selector */}
                      <div className="flex items-center justify-center gap-1">
                        {[1, 2, 3, 4, 5].map((star) => {
                          const displayValue = hoveredRating || userRating;
                          const filled = displayValue >= star;
                          const halfFilled = displayValue >= star - 0.5 && displayValue < star;
                          return (
                            <button
                              key={star}
                              onClick={(e) => handleStarClick(star, e)}
                              onMouseMove={(e) => handleStarHover(star, e)}
                              onMouseLeave={() => setHoveredRating(0)}
                              className="relative transition-transform hover:scale-110 focus:outline-none"
                            >
                              <Star className="w-7 h-7 text-gray-600" />
                              {filled && <Star className="w-7 h-7 fill-yellow-400 text-yellow-400 absolute inset-0" />}
                              {halfFilled && (
                                <span className="absolute inset-0 overflow-hidden" style={{ width: '50%' }}>
                                  <Star className="w-7 h-7 fill-yellow-400 text-yellow-400" />
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                      {userRating > 0 && (
                        <p className="text-center text-yellow-400 text-[11px] font-medium">
                          {userRating} / 5 {userRating >= 4.5 ? '— Excellent!' : userRating >= 3.5 ? '— Great!' : userRating >= 2.5 ? '— Good' : userRating >= 1.5 ? '— Fair' : '— Poor'}
                        </p>
                      )}

                      {/* Optional comment */}
                      <input
                        type="text"
                        value={ratingComment}
                        onChange={(e) => setRatingComment(e.target.value)}
                        placeholder="Say something nice (optional)..."
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-yellow-500/50"
                      />

                      <button
                        onClick={handleRatingSubmit}
                        disabled={userRating === 0 || ratingLoading}
                        className="w-full bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-600 hover:to-amber-600 disabled:opacity-40 disabled:cursor-not-allowed text-black text-sm font-bold py-2 rounded-lg transition-all flex items-center justify-center gap-2 shadow-lg shadow-yellow-500/20"
                      >
                        {ratingLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Star className="w-4 h-4 fill-black" />}
                        {ratingLoading ? 'Submitting...' : 'Submit Rating'}
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-3 space-y-3 min-h-0 custom-scrollbar">
                {supportLoading ? (
                  <div className="flex items-center justify-center h-full">
                    <Loader2 className="w-5 h-5 text-emerald-500 animate-spin" />
                  </div>
                ) : supportMessages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center px-4">
                    <div className="w-12 h-12 rounded-full bg-zinc-800 flex items-center justify-center mb-3">
                      <Headphones className="w-6 h-6 text-gray-600" />
                    </div>
                    <p className="text-gray-400 text-sm font-medium">No messages yet</p>
                    <p className="text-gray-600 text-xs mt-1">Send a message to reach the HealQR support team</p>
                  </div>
                ) : (
                  supportMessages.map((msg) => (
                    <div key={msg.id} className={`flex ${msg.sender !== 'admin' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[80%] rounded-xl px-3 py-2 ${
                        msg.sender !== 'admin'
                          ? `${colors.bubble} text-white rounded-br-sm`
                          : 'bg-zinc-800 text-white rounded-bl-sm'
                      }`}>
                        {msg.sender === 'admin' && (
                          <p className="text-[10px] text-emerald-400 font-medium mb-0.5">{msg.senderName || 'HealQR Admin'}</p>
                        )}
                        <p className="text-sm whitespace-pre-wrap break-words leading-relaxed">{msg.message}</p>
                        <p className={`text-[10px] mt-1 ${msg.sender !== 'admin' ? 'text-white/60' : 'text-gray-500'}`}>
                          {formatDate(msg.createdAt)}
                        </p>
                      </div>
                    </div>
                  ))
                )}
                <div ref={supportEndRef} />
              </div>

              {/* Support Input */}
              <div className="border-t border-gray-700 p-3 shrink-0">
                <div className="flex items-end gap-2">
                  <textarea
                    ref={supportInputRef}
                    value={supportInput}
                    onChange={(e) => setSupportInput(e.target.value)}
                    onKeyDown={handleSupportKeyDown}
                    placeholder="Type a message to support..."
                    rows={1}
                    className="flex-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 resize-none max-h-24"
                    style={{ minHeight: '38px' }}
                  />
                  <button
                    onClick={handleSupportSend}
                    disabled={!supportInput.trim() || supportSending}
                    className="p-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors shrink-0"
                  >
                    {supportSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
}
