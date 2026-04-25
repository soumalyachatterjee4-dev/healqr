import { useState, useEffect, useMemo } from 'react';
import {
  Megaphone, Send, Search, Users, Check, MessageSquare, Bell, Clock, AlertCircle, Filter,
} from 'lucide-react';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { db } from '../lib/firebase/config';
import {
  collection, query, where, getDocs, addDoc, serverTimestamp, orderBy, limit,
} from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { toast } from 'sonner';

interface LabPatientBroadcastProps {
  labId: string;
  labName?: string;
}

interface PatientContact {
  phone: string;
  name: string;
  lastVisit: string;
  branchName: string;
  selected: boolean;
  hasFCM: boolean;
  userId?: string;
}

interface BroadcastLog {
  id: string;
  title: string;
  message: string;
  type: 'fcm' | 'whatsapp' | 'both';
  recipientCount: number;
  successCount: number;
  failCount: number;
  date: string;
}

type BroadcastType = 'health-tip' | 'camp' | 'offer' | 'announcement' | 'festival' | 'custom';

const TEMPLATES: Record<BroadcastType, { title: string; message: string }> = {
  'health-tip': {
    title: '🩺 Health Tip from [Lab]',
    message: 'Dear Patient, here is a health tip: [Your tip]. Regular check-ups keep you healthy. — [Lab]',
  },
  'camp': {
    title: '🏥 Free Health Check-up Camp',
    message: 'Free health check-up camp on [Date] at [Location]. Tests included: [List]. Book your slot now! — [Lab]',
  },
  'offer': {
    title: '💸 Special Test Package',
    message: 'Limited-time offer: [Package Name] at ₹[Price]. Valid till [Date]. Book on our app or call us. — [Lab]',
  },
  'announcement': {
    title: '📢 Important Announcement',
    message: 'Dear Patient, please note: [Your announcement]. For queries call [Phone]. — [Lab]',
  },
  'festival': {
    title: '🎉 Festival Greetings',
    message: 'Wishing you and your family a very Happy [Festival]! May good health be with you always. — [Lab]',
  },
  'custom': { title: '', message: '' },
};

export default function LabPatientBroadcast({ labId, labName }: LabPatientBroadcastProps) {
  const [patients, setPatients] = useState<PatientContact[]>([]);
  const [logs, setLogs] = useState<BroadcastLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [search, setSearch] = useState('');
  const [filterBranch, setFilterBranch] = useState<string>('all');
  const [broadcastType, setBroadcastType] = useState<BroadcastType>('health-tip');
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [sendVia, setSendVia] = useState<'fcm' | 'whatsapp' | 'both'>('both');
  const [showLogs, setShowLogs] = useState(false);
  const [progress, setProgress] = useState({ total: 0, sent: 0 });

  useEffect(() => {
    const t = TEMPLATES[broadcastType];
    setTitle(t.title.replace('[Lab]', labName || 'Lab'));
    setMessage(t.message.replace(/\[Lab\]/g, labName || 'our lab'));
  }, [broadcastType, labName]);

  useEffect(() => {
    if (!labId) { setLoading(false); return; }
    loadPatients();
    loadLogs();
  }, [labId]);

  const loadPatients = async () => {
    setLoading(true);
    try {
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
      const since = sixMonthsAgo.toISOString().split('T')[0];

      const snap = await getDocs(query(collection(db, 'labBookings'), where('labId', '==', labId)));

      const phoneMap = new Map<string, PatientContact>();
      snap.docs.forEach(d => {
        const data: any = d.data();
        const phoneRaw = data.patientPhone || '';
        const phone = String(phoneRaw).replace(/\D/g, '').slice(-10);
        if (!phone) return;
        const bDate = data.bookingDate || '';
        if (bDate < since) return;
        if (data.isCancelled || data.status === 'cancelled') return;

        const cur = phoneMap.get(phone);
        if (!cur || (bDate > cur.lastVisit)) {
          phoneMap.set(phone, {
            phone,
            name: data.patientName || cur?.name || 'Unknown',
            lastVisit: bDate || cur?.lastVisit || '',
            branchName: data.branchName || cur?.branchName || '',
            selected: cur?.selected || false,
            hasFCM: cur?.hasFCM || false,
            userId: data.patientId || data.userId || cur?.userId || '',
          });
        }
      });

      const list = Array.from(phoneMap.values());
      // Detect FCM token presence (best-effort)
      const phones = list.map(p => p.phone).filter(Boolean);
      for (let i = 0; i < phones.length; i += 10) {
        const batch = phones.slice(i, i + 10);
        try {
          const tq = query(collection(db, 'patientFCMTokens'), where('__name__', 'in', batch));
          const tsnap = await getDocs(tq);
          tsnap.docs.forEach(td => {
            const p = list.find(pt => pt.phone === td.id);
            if (p) p.hasFCM = true;
          });
        } catch {}
      }
      list.sort((a, b) => a.name.localeCompare(b.name));
      setPatients(list);
    } catch (err) {
      console.error('[LabPatientBroadcast] loadPatients:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadLogs = async () => {
    try {
      const snap = await getDocs(query(
        collection(db, `labs/${labId}/broadcastLogs`),
        orderBy('date', 'desc'),
        limit(20),
      ));
      setLogs(snap.docs.map(d => ({ id: d.id, ...(d.data() as any) })));
    } catch {
      try {
        const snap = await getDocs(collection(db, `labs/${labId}/broadcastLogs`));
        const rows = snap.docs.map(d => ({ id: d.id, ...(d.data() as any) })) as BroadcastLog[];
        rows.sort((a, b) => (a.date < b.date ? 1 : -1));
        setLogs(rows.slice(0, 20));
      } catch {}
    }
  };

  const branches = useMemo(() => {
    const s = new Set<string>();
    patients.forEach(p => { if (p.branchName) s.add(p.branchName); });
    return Array.from(s);
  }, [patients]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return patients.filter(p => {
      if (q && !`${p.name} ${p.phone}`.toLowerCase().includes(q)) return false;
      if (filterBranch !== 'all' && p.branchName !== filterBranch) return false;
      return true;
    });
  }, [patients, search, filterBranch]);

  const selectedCount = patients.filter(p => p.selected).length;
  const fcmEligible = patients.filter(p => p.selected && p.hasFCM).length;
  const allFilteredSelected = filtered.length > 0 && filtered.every(p => p.selected);

  const togglePatient = (phone: string) => {
    setPatients(prev => prev.map(p => p.phone === phone ? { ...p, selected: !p.selected } : p));
  };

  const toggleAll = () => {
    const visible = new Set(filtered.map(p => p.phone));
    const next = !allFilteredSelected;
    setPatients(prev => prev.map(p => visible.has(p.phone) ? { ...p, selected: next } : p));
  };

  const handleSend = async () => {
    if (!title.trim() || !message.trim()) { toast.error('Title and message are required'); return; }
    const selected = patients.filter(p => p.selected);
    if (selected.length === 0) { toast.error('Select at least one patient'); return; }
    if (!confirm(`Send broadcast to ${selected.length} patients via ${sendVia.toUpperCase()}?`)) return;

    setSending(true);
    let success = 0;
    let failed = 0;
    setProgress({ total: selected.length, sent: 0 });

    if (sendVia === 'fcm' || sendVia === 'both') {
      const fns = getFunctions();
      const sendFCM = httpsCallable(fns, 'sendFCMNotification');
      const fcmTargets = selected.filter(p => p.hasFCM);
      for (const p of fcmTargets) {
        try {
          await sendFCM({
            userId: p.userId || p.phone,
            title: title.trim(),
            body: message.trim(),
            data: { type: 'broadcast', source: 'lab', labId, broadcastType },
          });
          success++;
        } catch {
          failed++;
        }
        setProgress(pr => ({ ...pr, sent: pr.sent + 1 }));
      }
    }

    if (sendVia === 'whatsapp' || sendVia === 'both') {
      const text = encodeURIComponent(`${title.trim()}\n\n${message.trim()}`);
      for (const p of selected) {
        if (!p.phone) continue;
        const num = p.phone.startsWith('91') ? p.phone : `91${p.phone}`;
        window.open(`https://wa.me/${num}?text=${text}`, '_blank');
        success++;
        await new Promise(r => setTimeout(r, 300));
      }
    }

    try {
      await addDoc(collection(db, `labs/${labId}/broadcastLogs`), {
        title: title.trim(),
        message: message.trim(),
        type: sendVia,
        broadcastType,
        recipientCount: selected.length,
        successCount: success,
        failCount: failed,
        date: new Date().toISOString(),
        createdAt: serverTimestamp(),
      });
    } catch {}

    toast.success(`Broadcast queued — ${success} sent, ${failed} failed`);
    setSending(false);
    setProgress({ total: 0, sent: 0 });
    loadLogs();
  };

  return (
    <div className="space-y-6">
      <Card className="bg-zinc-900 border-zinc-800">
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h2 className="text-white text-2xl font-bold flex items-center gap-2">
                <Megaphone className="w-6 h-6 text-violet-500" /> Patient Broadcast
              </h2>
              <p className="text-gray-400 text-sm mt-1">Health tips, camps, offers &amp; announcements</p>
            </div>
            <Button variant="outline" className="border-zinc-700 text-gray-300" onClick={() => setShowLogs(s => !s)}>
              <Clock className="w-4 h-4 mr-1" /> History ({logs.length})
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Patients', value: patients.length, icon: Users, color: 'text-blue-400' },
          { label: 'Selected', value: selectedCount, icon: Check, color: 'text-emerald-400' },
          { label: 'FCM Eligible', value: fcmEligible, icon: Bell, color: 'text-violet-400' },
          { label: 'Broadcasts Sent', value: logs.length, icon: Send, color: 'text-amber-400' },
        ].map((k, i) => (
          <Card key={i} className="bg-zinc-900 border-zinc-800">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{k.label}</span>
                <div className={`p-2 rounded-lg bg-zinc-950 ${k.color}`}><k.icon className="w-4 h-4" /></div>
              </div>
              <div className="text-2xl font-bold text-white">{loading ? '…' : k.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Composer */}
        <Card className="bg-zinc-900 border-zinc-800 lg:col-span-2">
          <CardContent className="pt-6 space-y-4">
            <h3 className="text-white text-base font-bold flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-violet-500" /> Compose Message
            </h3>

            <div>
              <label className="text-[11px] text-gray-400 uppercase tracking-wider font-semibold mb-1.5 block">Template</label>
              <div className="flex flex-wrap gap-1.5">
                {([
                  { key: 'health-tip', label: '🩺 Health Tip' },
                  { key: 'camp', label: '🏥 Camp' },
                  { key: 'offer', label: '💸 Offer' },
                  { key: 'announcement', label: '📢 Announce' },
                  { key: 'festival', label: '🎉 Festival' },
                  { key: 'custom', label: '✏️ Custom' },
                ] as { key: BroadcastType; label: string }[]).map(t => (
                  <button key={t.key} onClick={() => setBroadcastType(t.key)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${broadcastType === t.key ? 'bg-violet-500 text-white' : 'bg-zinc-950 text-gray-400 border border-zinc-800 hover:text-white'}`}>
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-[11px] text-gray-400 uppercase tracking-wider font-semibold">Title</label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} className="bg-zinc-950 border-zinc-800 text-white mt-1" />
            </div>

            <div>
              <label className="text-[11px] text-gray-400 uppercase tracking-wider font-semibold">Message</label>
              <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={5}
                className="w-full bg-zinc-950 border border-zinc-800 text-white rounded px-3 py-2 mt-1 text-sm resize-none" />
              <p className="text-[10px] text-gray-500 mt-0.5">{message.length}/500</p>
            </div>

            <div>
              <label className="text-[11px] text-gray-400 uppercase tracking-wider font-semibold mb-1.5 block">Send Via</label>
              <div className="flex gap-1 bg-zinc-950 rounded-lg p-0.5 border border-zinc-800">
                {([
                  { key: 'both', label: '📲 Both' },
                  { key: 'fcm', label: '🔔 FCM' },
                  { key: 'whatsapp', label: '💬 WhatsApp' },
                ] as const).map(opt => (
                  <button key={opt.key} onClick={() => setSendVia(opt.key)}
                    className={`flex-1 px-2 py-1.5 rounded-md text-xs font-medium transition ${sendVia === opt.key ? 'bg-violet-500 text-white' : 'text-gray-400 hover:text-white'}`}>
                    {opt.label}
                  </button>
                ))}
              </div>
              {sendVia !== 'fcm' && (
                <p className="text-[11px] text-amber-400/80 flex items-start gap-1 mt-2">
                  <AlertCircle className="w-3 h-3 shrink-0 mt-0.5" />
                  WhatsApp opens individual chats from your number.
                </p>
              )}
            </div>

            <Button onClick={handleSend} disabled={sending || selectedCount === 0}
              className="w-full bg-violet-600 hover:bg-violet-700 text-white">
              {sending ? `Sending ${progress.sent}/${progress.total}…` : (
                <><Send className="w-4 h-4 mr-1" /> Send to {selectedCount} Patient{selectedCount !== 1 ? 's' : ''}</>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Patient list */}
        <Card className="bg-zinc-900 border-zinc-800 lg:col-span-3">
          <CardContent className="pt-6 space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative flex-1 min-w-[180px]">
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-500" />
                <Input value={search} onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search patient or phone"
                  className="pl-9 bg-zinc-950 border-zinc-800 text-white" />
              </div>
              {branches.length > 1 && (
                <select value={filterBranch} onChange={(e) => setFilterBranch(e.target.value)}
                  className="bg-zinc-950 border border-zinc-800 text-white text-xs rounded px-2 py-2">
                  <option value="all">All Branches</option>
                  {branches.map(b => <option key={b} value={b}>{b}</option>)}
                </select>
              )}
              <Button size="sm" variant="outline" className="border-zinc-700 text-gray-300" onClick={toggleAll}>
                {allFilteredSelected ? 'Deselect Visible' : 'Select Visible'}
              </Button>
              <span className="text-[11px] text-gray-500">{filtered.length} shown · {selectedCount} selected</span>
            </div>

            <div className="max-h-[460px] overflow-y-auto border border-zinc-800 rounded-lg">
              {loading ? (
                <div className="text-gray-500 text-sm py-10 text-center">Loading…</div>
              ) : filtered.length === 0 ? (
                <div className="text-gray-500 text-sm py-10 text-center">No patients match.</div>
              ) : (
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-zinc-900">
                    <tr className="text-left text-[10px] text-gray-400 uppercase tracking-wider border-b border-zinc-800">
                      <th className="py-2 pl-3 w-8"></th>
                      <th className="py-2 px-2">Patient</th>
                      <th className="py-2 px-2">Phone</th>
                      <th className="py-2 px-2 hidden md:table-cell">Branch</th>
                      <th className="py-2 px-2 hidden md:table-cell">Last Visit</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(p => (
                      <tr key={p.phone} onClick={() => togglePatient(p.phone)}
                        className={`cursor-pointer hover:bg-zinc-800/40 border-b border-zinc-800/60 last:border-0 ${p.selected ? 'bg-violet-500/10' : ''}`}>
                        <td className="py-2 pl-3">
                          <div className={`w-4 h-4 rounded border-2 flex items-center justify-center ${p.selected ? 'bg-violet-500 border-violet-500' : 'border-zinc-700'}`}>
                            {p.selected && <Check className="w-3 h-3 text-white" />}
                          </div>
                        </td>
                        <td className="py-2 px-2 text-white font-medium">
                          {p.name}
                          {p.hasFCM && <Bell className="w-3 h-3 text-violet-400 inline ml-1" />}
                        </td>
                        <td className="py-2 px-2 text-gray-400">{p.phone}</td>
                        <td className="py-2 px-2 text-gray-500 hidden md:table-cell">{p.branchName || '—'}</td>
                        <td className="py-2 px-2 text-gray-500 hidden md:table-cell">{p.lastVisit}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* History */}
      {showLogs && (
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="pt-6">
            <h3 className="text-white text-base font-bold flex items-center gap-2 mb-3">
              <Clock className="w-4 h-4 text-violet-500" /> Broadcast History
            </h3>
            {logs.length === 0 ? (
              <div className="text-gray-500 text-sm py-6 text-center">No broadcasts yet.</div>
            ) : (
              <div className="divide-y divide-zinc-800">
                {logs.map(l => (
                  <div key={l.id} className="py-3 flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-violet-500/10">
                      {l.type === 'fcm' ? <Bell className="w-4 h-4 text-violet-400" /> :
                        l.type === 'whatsapp' ? <MessageSquare className="w-4 h-4 text-green-400" /> :
                          <Megaphone className="w-4 h-4 text-amber-400" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-medium truncate">{l.title}</p>
                      <p className="text-gray-500 text-xs truncate">{l.message}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-gray-300 text-xs">{l.recipientCount} sent</p>
                      <p className="text-gray-500 text-[10px]">{new Date(l.date).toLocaleDateString('en-IN')}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
