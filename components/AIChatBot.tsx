/**
 * HealQR PM Assistant Widget — Intelligent floating assistant
 * Role-aware: adapts for patients, doctors, clinic admins, and visitors
 * Powered by Cloud Function → Gemini 2.5 Flash (server-side)
 */

import { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, RotateCcw, Bot, User, Shield, Sparkles } from 'lucide-react';
import { sendChatMessage, getQuickReplies, resetChatHistory, type ChatMessage, type UserRole } from '../services/aiChatBotService';

interface AIChatBotProps {
  language?: string;
  userRole?: UserRole;
}

const ROLE_LABELS: Record<UserRole, string> = {
  patient: 'Patient',
  doctor: 'Doctor',
  clinic: 'Clinic Admin',
  admin: 'Admin',
  visitor: 'Guest',
};

const ROLE_COLORS: Record<UserRole, string> = {
  patient: 'bg-blue-500/20 text-blue-400',
  doctor: 'bg-green-500/20 text-green-400',
  clinic: 'bg-purple-500/20 text-purple-400',
  admin: 'bg-red-500/20 text-red-400',
  visitor: 'bg-gray-500/20 text-gray-400',
};

export default function AIChatBot({ language = 'english', userRole = 'visitor' }: AIChatBotProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      role: 'bot',
      text: getWelcomeMessage(userRole),
      timestamp: new Date(),
    }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || isTyping) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      text,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    try {
      const response = await sendChatMessage(text, language, userRole);
      const botMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'bot',
        text: response,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, botMsg]);
    } catch {
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'bot',
        text: 'Sorry, I\'m having trouble connecting. Please try again.',
        timestamp: new Date(),
      }]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleQuickReply = (text: string) => {
    setInput(text);
    setTimeout(() => handleSend(), 100);
  };

  const handleReset = () => {
    resetChatHistory();
    setMessages([{
      id: Date.now().toString(),
      role: 'bot',
      text: 'New conversation started! How can I help you?',
      timestamp: new Date(),
    }]);
  };

  const quickReplies = getQuickReplies(userRole);

  return (
    <>
      {/* Floating Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          style={{ position: 'fixed', bottom: '24px', right: '4px', zIndex: 99999 }}
          className="w-12 h-12 bg-gradient-to-br from-orange-500 to-orange-600 rounded-full shadow-lg flex items-center justify-center hover:scale-110 transition-transform group"
          aria-label="Open PM Assistant"
        >
          <Sparkles className="w-6 h-6 text-white" />
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white" />
          {/* Tooltip */}
          <span className="absolute right-16 bg-gray-900 text-white text-xs px-3 py-1.5 rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
            HealQR PM Assistant
          </span>
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div
          style={{ position: 'fixed', bottom: '16px', right: '16px', zIndex: 99999 }}
          className="w-[340px] sm:w-[380px] h-[520px] bg-[#0f1419] border border-gray-700 rounded-2xl shadow-2xl flex flex-col overflow-hidden"
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-orange-500 to-orange-600 px-4 py-3 flex items-center gap-3">
            <div className="w-9 h-9 bg-white/20 rounded-full flex items-center justify-center">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-white font-semibold text-sm">HealQR PM Assistant</div>
              <div className="flex items-center gap-2">
                <span className="text-white/70 text-xs">Project Manager</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${ROLE_COLORS[userRole]}`}>
                  {ROLE_LABELS[userRole]}
                </span>
              </div>
            </div>
            <button
              onClick={handleReset}
              className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
              title="New conversation"
            >
              <RotateCcw className="w-4 h-4 text-white/80" />
            </button>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
            >
              <X className="w-4 h-4 text-white" />
            </button>
          </div>

          {/* Security badge */}
          <div className="px-3 py-1.5 bg-gray-900/50 border-b border-gray-800 flex items-center gap-1.5">
            <Shield className="w-3 h-3 text-green-500" />
            <span className="text-[10px] text-gray-500">Secure • No medical advice • No data sharing</span>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar">
            {messages.map((msg) => (
              <div key={msg.id} className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {msg.role === 'bot' && (
                  <div className="w-7 h-7 bg-orange-500/20 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                    <Bot className="w-4 h-4 text-orange-400" />
                  </div>
                )}
                <div className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-orange-500 text-white rounded-br-md'
                    : 'bg-gray-800 text-gray-200 rounded-bl-md'
                }`}>
                  {msg.text}
                </div>
                {msg.role === 'user' && (
                  <div className="w-7 h-7 bg-blue-500/20 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                    <User className="w-4 h-4 text-blue-400" />
                  </div>
                )}
              </div>
            ))}

            {isTyping && (
              <div className="flex gap-2 items-start">
                <div className="w-7 h-7 bg-orange-500/20 rounded-full flex items-center justify-center flex-shrink-0">
                  <Bot className="w-4 h-4 text-orange-400" />
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
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Replies (only show if few messages) */}
          {messages.length <= 2 && (
            <div className="px-3 pb-2 flex flex-wrap gap-1.5">
              {quickReplies.map((text, i) => (
                <button
                  key={i}
                  onClick={() => handleQuickReply(text)}
                  className="text-xs bg-gray-800 hover:bg-gray-700 text-orange-400 border border-gray-700 rounded-full px-3 py-1.5 transition-colors"
                >
                  {text}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <div className="p-3 border-t border-gray-700">
            <div className="flex gap-2">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder="Ask me anything about HealQR..."
                className="flex-1 bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-orange-500 transition-colors"
                disabled={isTyping}
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || isTyping}
                className="w-10 h-10 bg-orange-500 hover:bg-orange-600 disabled:bg-gray-700 disabled:text-gray-500 rounded-xl flex items-center justify-center transition-colors"
              >
                <Send className="w-4 h-4 text-white" />
              </button>
            </div>
            <div className="text-center mt-1.5">
              <span className="text-[10px] text-gray-600">HealQR PM Assistant • Powered by AI</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function getWelcomeMessage(role: UserRole): string {
  switch (role) {
    case 'doctor':
      return 'Hi Doctor! I\'m your HealQR PM Assistant. I can help with prescription writing, schedule management, patient features, and more. How can I help?';
    case 'clinic':
      return 'Welcome! I\'m the HealQR PM Assistant. I can help with clinic management, doctor setup, and administrative features. What do you need?';
    case 'admin':
      return 'Hello Admin! I\'m the HealQR PM Assistant. I can check platform health, report metrics, and help with system management. What would you like to know?';
    default:
      return 'Hi! I\'m the HealQR PM Assistant. I can help you book appointments, find doctors, navigate the platform, and answer any questions. How can I help?';
  }
}

