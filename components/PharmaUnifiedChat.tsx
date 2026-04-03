/**
 * PharmaUnifiedChat — Single floating chat button combining AI Assistant + Manual Support
 * - Default: AI Assistant tab (Gemini-powered)
 * - Support: Manual chat with admin team (Firestore)
 * - AI detects support-need and offers handoff
 */

import { useState, useRef, useEffect } from 'react';
import { X, Send, Bot, User, MessageSquare, Sparkles, Shield, RotateCcw, Loader2, Headphones } from 'lucide-react';
import { db } from '../lib/firebase/config';
import { collection, addDoc, serverTimestamp, query, orderBy, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { sendChatMessage, getQuickReplies, resetChatHistory, type ChatMessage } from '../services/aiChatBotService';

interface PharmaUnifiedChatProps {
  companyId: string;
  companyName: string;
}

interface SupportMessage {
  id: string;
  message: string;
  sender: 'pharma' | 'admin';
  senderName: string;
  createdAt: any;
  read: boolean;
}

type ChatTab = 'ai' | 'support';

// Keywords that indicate user needs human support
const SUPPORT_KEYWORDS = [
  'talk to human', 'talk to admin', 'contact support', 'speak to someone',
  'human support', 'real person', 'manual support', 'connect support',
  'complaint', 'billing', 'payment', 'refund', 'bug', 'error',
  'not working', 'broken', 'issue with', 'problem with',
  'territory request', 'add territory', 'remove territory',
  'account issue', 'login issue', 'can\'t access',
];

function needsHumanSupport(text: string): boolean {
  const lower = text.toLowerCase();
  return SUPPORT_KEYWORDS.some(kw => lower.includes(kw));
}

export default function PharmaUnifiedChat({ companyId, companyName }: PharmaUnifiedChatProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<ChatTab>('ai');

  // AI Chat state
  const [aiMessages, setAiMessages] = useState<ChatMessage[]>([
    { id: '1', role: 'bot', text: `Hi! I'm the HealQR AI Assistant for ${companyName || 'your company'}. I can help with dashboard navigation, features, analytics, and more. Need human support? Just ask!`, timestamp: new Date() }
  ]);
  const [aiInput, setAiInput] = useState('');
  const [aiTyping, setAiTyping] = useState(false);

  // Support Chat state
  const [supportMessages, setSupportMessages] = useState<SupportMessage[]>([]);
  const [supportInput, setSupportInput] = useState('');
  const [supportLoading, setSupportLoading] = useState(true);
  const [supportSending, setSupportSending] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

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

  // Focus input when tab switches
  useEffect(() => {
    if (!isOpen) return;
    if (activeTab === 'ai') aiInputRef.current?.focus();
    else supportInputRef.current?.focus();
  }, [isOpen, activeTab]);

  // Listen to support messages
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
      setSupportMessages(msgs);
      setSupportLoading(false);

      const unread = msgs.filter(m => m.sender === 'admin' && !m.read).length;
      setUnreadCount(unread);

      // Mark as read if support tab is open
      if (isOpen && activeTab === 'support') {
        snapshot.docs.forEach(d => {
          const data = d.data();
          if (data.sender === 'admin' && !data.read) {
            updateDoc(doc(db!, 'pharmaCompanies', companyId, 'supportMessages', d.id), { read: true }).catch(() => {});
          }
        });
      }
    }, () => setSupportLoading(false));

    return () => unsubscribe();
  }, [companyId, isOpen, activeTab]);

  // Mark messages read when switching to support tab
  useEffect(() => {
    if (isOpen && activeTab === 'support' && companyId && db) {
      supportMessages.forEach(msg => {
        if (msg.sender === 'admin' && !msg.read) {
          updateDoc(doc(db!, 'pharmaCompanies', companyId, 'supportMessages', msg.id), { read: true }).catch(() => {});
        }
      });
    }
  }, [isOpen, activeTab]);

  // --- AI Chat handlers ---
  const handleAiSend = async () => {
    const text = aiInput.trim();
    if (!text || aiTyping) return;

    const userMsg: ChatMessage = { id: Date.now().toString(), role: 'user', text, timestamp: new Date() };
    setAiMessages(prev => [...prev, userMsg]);
    setAiInput('');
    setAiTyping(true);

    // Check if user needs human support
    if (needsHumanSupport(text)) {
      const handoffMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'bot',
        text: '🔄 It sounds like you need to speak with our support team. Let me connect you!',
        timestamp: new Date(),
      };
      setAiMessages(prev => [...prev, handoffMsg]);
      setAiTyping(false);
      // Auto-switch to support tab after a brief delay
      setTimeout(() => setActiveTab('support'), 1200);
      return;
    }

    try {
      const response = await sendChatMessage(text, 'english', 'visitor');

      const botMsg: ChatMessage = { id: (Date.now() + 1).toString(), role: 'bot', text: response, timestamp: new Date() };
      setAiMessages(prev => [...prev, botMsg]);
    } catch {
      setAiMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(), role: 'bot',
        text: 'Sorry, I\'m having trouble connecting. Try again or switch to Support for help.',
        timestamp: new Date(),
      }]);
    } finally {
      setAiTyping(false);
    }
  };

  const handleAiReset = () => {
    resetChatHistory();
    setAiMessages([{
      id: Date.now().toString(), role: 'bot',
      text: 'New conversation started! How can I help?',
      timestamp: new Date(),
    }]);
  };

  // --- Support Chat handlers ---
  const handleSupportSend = async () => {
    const text = supportInput.trim();
    if (!text || !companyId || !db) return;
    setSupportSending(true);
    try {
      await addDoc(collection(db, 'pharmaCompanies', companyId, 'supportMessages'), {
        message: text,
        sender: 'pharma',
        senderName: companyName || 'Pharma Company',
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
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSupportSend();
    }
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

  const quickReplies = getQuickReplies('visitor');

  return (
    <>
      {/* Floating Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-gradient-to-br from-blue-600 to-blue-700 rounded-full shadow-2xl flex items-center justify-center hover:scale-110 transition-transform group"
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
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-4 py-3 flex items-center gap-3 shrink-0">
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
                  ? 'text-blue-400 border-b-2 border-blue-400 bg-blue-500/5'
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
                      <div className="w-7 h-7 bg-blue-500/20 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                        <Bot className="w-4 h-4 text-blue-400" />
                      </div>
                    )}
                    <div className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                      msg.role === 'user'
                        ? 'bg-blue-600 text-white rounded-br-md'
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
                    <div className="w-7 h-7 bg-blue-500/20 rounded-full flex items-center justify-center flex-shrink-0">
                      <Bot className="w-4 h-4 text-blue-400" />
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
                      className="text-xs bg-gray-800 hover:bg-gray-700 text-blue-400 border border-gray-700 rounded-full px-3 py-1.5 transition-colors"
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
                    className="w-10 h-10 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:text-gray-500 rounded-xl flex items-center justify-center transition-colors"
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
                    <div key={msg.id} className={`flex ${msg.sender === 'pharma' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[80%] rounded-xl px-3 py-2 ${
                        msg.sender === 'pharma'
                          ? 'bg-emerald-600 text-white rounded-br-sm'
                          : 'bg-zinc-800 text-white rounded-bl-sm'
                      }`}>
                        {msg.sender === 'admin' && (
                          <p className="text-[10px] text-emerald-400 font-medium mb-0.5">{msg.senderName || 'HealQR Admin'}</p>
                        )}
                        <p className="text-sm whitespace-pre-wrap break-words leading-relaxed">{msg.message}</p>
                        <p className={`text-[10px] mt-1 ${msg.sender === 'pharma' ? 'text-emerald-200' : 'text-gray-500'}`}>
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
