import { useState, useEffect, useRef } from 'react';
import { MessageSquare, Send, Clock, CheckCircle2, Building2, Loader2 } from 'lucide-react';
import { db } from '../lib/firebase/config';
import { collection, getDocs, addDoc, serverTimestamp, query, orderBy, onSnapshot, doc, updateDoc } from 'firebase/firestore';

interface PharmaSupportProps {
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

export default function PharmaSupport({ companyId, companyName }: PharmaSupportProps) {
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

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
      setMessages(msgs);
      setLoading(false);

      // Mark admin messages as read
      snapshot.docs.forEach(d => {
        const data = d.data();
        if (data.sender === 'admin' && !data.read) {
          updateDoc(doc(db!, 'pharmaCompanies', companyId, 'supportMessages', d.id), { read: true }).catch(() => {});
        }
      });
    }, (error) => {
      console.error('Error listening to messages:', error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [companyId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    const text = newMessage.trim();
    if (!text || !companyId || !db) return;
    setSending(true);

    try {
      const messagesRef = collection(db, 'pharmaCompanies', companyId, 'supportMessages');
      await addDoc(messagesRef, {
        message: text,
        sender: 'pharma',
        senderName: companyName || 'Pharma Company',
        createdAt: serverTimestamp(),
        read: false,
      });
      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
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

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto h-[calc(100vh-4rem)] flex flex-col">
      <div className="mb-4">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-blue-400" />
          Support
        </h2>
        <p className="text-sm text-gray-400 mt-1">Chat with HealQR admin team</p>
      </div>

      {/* Messages Area */}
      <div className="flex-1 bg-zinc-900 rounded-xl border border-zinc-800 flex flex-col min-h-0">
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <MessageSquare className="w-12 h-12 text-gray-600 mb-3" />
              <h3 className="text-gray-400 font-medium">No messages yet</h3>
              <p className="text-sm text-gray-500 mt-1">Start a conversation with our admin team</p>
            </div>
          ) : (
            messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.sender === 'pharma' ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`max-w-[75%] rounded-xl px-4 py-2.5 ${
                  msg.sender === 'pharma'
                    ? 'bg-blue-600 text-white'
                    : 'bg-zinc-800 text-white'
                }`}>
                  {msg.sender === 'admin' && (
                    <p className="text-xs text-emerald-400 font-medium mb-1">
                      {msg.senderName || 'HealQR Admin'}
                    </p>
                  )}
                  <p className="text-sm whitespace-pre-wrap break-words">{msg.message}</p>
                  <p className={`text-xs mt-1 ${
                    msg.sender === 'pharma' ? 'text-blue-200' : 'text-gray-500'
                  }`}>
                    {formatDate(msg.createdAt)}
                  </p>
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="border-t border-zinc-800 p-3">
          <div className="flex items-end gap-2">
            <textarea
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type your message..."
              rows={1}
              className="flex-1 px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none max-h-32"
              style={{ minHeight: '42px' }}
            />
            <button
              onClick={handleSend}
              disabled={!newMessage.trim() || sending}
              className="p-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors shrink-0"
            >
              {sending ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-2">Press Enter to send, Shift+Enter for new line</p>
        </div>
      </div>
    </div>
  );
}
