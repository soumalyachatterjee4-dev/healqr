import { useEffect, useMemo, useState } from 'react';
import { db } from '../lib/firebase/config';
import {
  addDoc, collection, getDocs, onSnapshot, orderBy, query, serverTimestamp, where,
} from 'firebase/firestore';
import { toast } from 'sonner';
import { Megaphone, Send, Users, Loader2, MessageCircle, History } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';

interface ParamedicalBroadcastProps {
  paraId: string;
  paraName?: string;
}

interface BroadcastLog {
  id: string;
  message: string;
  audienceLabel: string;
  recipientCount: number;
  createdAt?: any;
}

const TEMPLATES = [
  { id: 'health', label: 'Health Tip', text: (n: string) => `Hi ${n || 'there'}, this is a quick health tip from your HealQR professional: stay hydrated and take short walks every hour. — ${'%PARA%'}` },
  { id: 'follow-up', label: 'Follow-up', text: (n: string) => `Hi ${n || 'there'}, just checking in on your recovery. Reply if you'd like to book a follow-up visit. — ${'%PARA%'}` },
  { id: 'offer', label: 'Festive Offer', text: (n: string) => `Hi ${n || 'there'}, enjoy 10% off on your next home-care session this week. Book via HealQR. — ${'%PARA%'}` },
  { id: 'camp', label: 'Health Camp', text: (n: string) => `Hi ${n || 'there'}, free health check-up camp this Sunday near you. Book your slot via HealQR. — ${'%PARA%'}` },
];

export default function ParamedicalBroadcast({ paraId, paraName }: ParamedicalBroadcastProps) {
  const [bookings, setBookings] = useState<any[]>([]);
  const [logs, setLogs] = useState<BroadcastLog[]>([]);
  const [audience, setAudience] = useState<'all' | 'recent' | 'inactive'>('all');
  const [message, setMessage] = useState(TEMPLATES[0].text('').replace('%PARA%', ''));
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!paraId) { setLoading(false); return; }
    (async () => {
      try {
        const snap = await getDocs(query(collection(db, 'paramedicalBookings'), where('paramedicalId', '==', paraId)));
        setBookings(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    })();
    const unsubL = onSnapshot(
      query(collection(db, `paramedicals/${paraId}/broadcastLogs`), orderBy('createdAt', 'desc')),
      (snap) => setLogs(snap.docs.map(d => ({ id: d.id, ...d.data() } as BroadcastLog))),
      () => {}
    );
    return () => unsubL();
  }, [paraId]);

  const audienceList = useMemo(() => {
    const map = new Map<string, { phone: string; name: string; lastVisit: string }>();
    bookings.forEach((b: any) => {
      const phone = (b.patientPhone || '').replace(/\D/g, '').slice(-10);
      if (!phone) return;
      if (!map.has(phone)) map.set(phone, { phone, name: b.patientName || 'Patient', lastVisit: b.appointmentDate || '' });
      else {
        const e = map.get(phone)!;
        if ((b.appointmentDate || '') > e.lastVisit) e.lastVisit = b.appointmentDate || '';
      }
    });
    const all = Array.from(map.values());
    if (audience === 'all') return all;
    const today = new Date();
    if (audience === 'recent') {
      return all.filter(p => {
        if (!p.lastVisit) return false;
        return Math.floor((today.getTime() - new Date(p.lastVisit).getTime()) / 86400000) <= 30;
      });
    }
    // inactive
    return all.filter(p => {
      if (!p.lastVisit) return true;
      return Math.floor((today.getTime() - new Date(p.lastVisit).getTime()) / 86400000) > 60;
    });
  }, [bookings, audience]);

  const useTemplate = (id: string) => {
    const t = TEMPLATES.find(x => x.id === id);
    if (!t) return;
    setMessage(t.text('NAME').replace('%PARA%', paraName || 'Your professional'));
  };

  const broadcast = async () => {
    if (!message.trim()) { toast.error('Message empty'); return; }
    if (audienceList.length === 0) { toast.error('No recipients in this audience'); return; }
    if (!confirm(`Open WhatsApp for ${audienceList.length} recipients? They will be opened one by one.`)) return;
    setSending(true);
    try {
      // Open WhatsApp in batches (browsers will throttle/popup-block beyond first)
      audienceList.forEach((p, idx) => {
        const personalMsg = message.replace(/NAME/g, p.name?.split(' ')[0] || 'there');
        const url = `https://wa.me/91${p.phone}?text=${encodeURIComponent(personalMsg)}`;
        if (idx === 0) window.open(url, '_blank');
        else setTimeout(() => window.open(url, '_blank'), idx * 600);
      });
      await addDoc(collection(db, `paramedicals/${paraId}/broadcastLogs`), {
        message,
        audienceLabel: audience,
        recipientCount: audienceList.length,
        createdAt: serverTimestamp(),
      });
      toast.success(`Broadcasting to ${audienceList.length} patients`);
    } catch (e: any) {
      toast.error(e?.message || 'Failed');
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64 text-gray-400"><Loader2 className="w-6 h-6 animate-spin mr-2" /> Loading…</div>;
  }

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-purple-600/20 to-teal-600/20 border border-purple-500/30 rounded-xl p-5 flex items-center gap-4">
        <Megaphone className="w-10 h-10 text-purple-400" />
        <div>
          <h3 className="text-white font-semibold">Patient Broadcast</h3>
          <p className="text-gray-400 text-sm">Send WhatsApp messages to your patients with personalised templates.</p>
        </div>
      </div>

      {/* Templates */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
        <p className="text-gray-400 text-xs mb-2">QUICK TEMPLATES</p>
        <div className="flex flex-wrap gap-2">
          {TEMPLATES.map(t => (
            <Button key={t.id} variant="outline" size="sm" className="border-zinc-700 text-white hover:bg-zinc-800" onClick={() => useTemplate(t.id)}>
              {t.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Audience */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-gray-400 text-xs">AUDIENCE</p>
          <p className="text-emerald-400 text-sm flex items-center gap-1"><Users className="w-4 h-4" /> {audienceList.length} recipient{audienceList.length === 1 ? '' : 's'}</p>
        </div>
        <div className="flex gap-2">
          {(['all', 'recent', 'inactive'] as const).map(a => (
            <button key={a} onClick={() => setAudience(a)} className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${audience === a ? 'bg-teal-600 text-white' : 'bg-zinc-800 text-gray-400 hover:text-white'}`}>
              {a === 'all' ? 'All Patients' : a === 'recent' ? 'Recent (30d)' : 'Inactive (60+d)'}
            </button>
          ))}
        </div>

        <textarea
          value={message}
          onChange={e => setMessage(e.target.value)}
          rows={5}
          placeholder="Type your message. Use NAME to personalise."
          className="w-full bg-black border border-zinc-800 rounded-lg p-3 text-white text-sm resize-y focus:border-teal-500 focus:outline-none"
        />
        <p className="text-gray-500 text-xs">Tip: <code className="text-teal-400">NAME</code> will be replaced with each patient's first name.</p>

        <Button onClick={broadcast} disabled={sending || audienceList.length === 0} className="bg-emerald-600 hover:bg-emerald-700 w-full md:w-auto">
          {sending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />}
          Broadcast via WhatsApp
        </Button>
      </div>

      {/* History */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
        <p className="text-gray-400 text-xs mb-3 flex items-center gap-2"><History className="w-4 h-4" /> RECENT BROADCASTS</p>
        {logs.length === 0 ? (
          <p className="text-gray-500 text-sm">No broadcasts sent yet.</p>
        ) : (
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {logs.map(l => (
              <div key={l.id} className="bg-zinc-800/40 rounded-lg p-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-emerald-400 text-xs flex items-center gap-1"><MessageCircle className="w-3 h-3" /> {l.recipientCount} sent</span>
                  <span className="text-gray-500 text-xs">{l.audienceLabel}</span>
                </div>
                <p className="text-gray-300 text-sm line-clamp-2">{l.message}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
