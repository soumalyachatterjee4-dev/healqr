import { useState, useEffect, useMemo } from 'react';
import {
  Menu, Megaphone, Send, Search, Users, Check, X,
  MessageSquare, Bell, Calendar, Filter,
  ChevronDown, ChevronUp, Clock, AlertCircle
} from 'lucide-react';
import DashboardSidebar from './DashboardSidebar';
import { db } from '../lib/firebase/config';
import {
  collection, query, where, getDocs, doc, getDoc, addDoc,
  serverTimestamp, orderBy, limit
} from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { toast } from 'sonner';

interface PatientBroadcastProps {
  onMenuChange?: (menu: string) => void;
  onLogout?: () => void | Promise<void>;
  activeAddOns?: string[];
}

interface PatientContact {
  id: string;
  name: string;
  phone: string;
  lastVisit: string;
  chamberName: string;
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

type BroadcastType = 'health-tip' | 'camp' | 'announcement' | 'festival' | 'custom';

const TEMPLATES: Record<BroadcastType, { title: string; message: string }> = {
  'health-tip': {
    title: '💡 Health Tip from Dr.',
    message: 'Dear Patient, here is a health tip for you: [Your health tip here]. Stay healthy! - Dr. [Name]'
  },
  'camp': {
    title: '🏥 Free Health Camp',
    message: 'We are organizing a FREE health camp on [Date] at [Location]. Services: [Services]. Register now! Limited spots. - Dr. [Name]'
  },
  'announcement': {
    title: '📢 Important Announcement',
    message: 'Dear Patient, please note: [Your announcement]. For queries call [Phone]. - Dr. [Name]'
  },
  'festival': {
    title: '🎉 Festival Greetings',
    message: 'Wishing you and your family a very Happy [Festival Name]! May you be blessed with good health always. - Dr. [Name]'
  },
  'custom': { title: '', message: '' }
};

const PatientBroadcast = ({ onMenuChange, onLogout, activeAddOns }: PatientBroadcastProps) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [patients, setPatients] = useState<PatientContact[]>([]);
  const [logs, setLogs] = useState<BroadcastLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectAll, setSelectAll] = useState(false);
  const [broadcastType, setBroadcastType] = useState<BroadcastType>('health-tip');
  const [title, setTitle] = useState(TEMPLATES['health-tip'].title);
  const [message, setMessage] = useState(TEMPLATES['health-tip'].message);
  const [sendVia, setSendVia] = useState<'fcm' | 'whatsapp' | 'both'>('both');
  const [showLogs, setShowLogs] = useState(false);
  const [filterChamber, setFilterChamber] = useState('all');
  const [doctorInfo, setDoctorInfo] = useState({ name: '', phone: '' });
  const [sendProgress, setSendProgress] = useState({ total: 0, sent: 0, failed: 0 });

  const userId = localStorage.getItem('userId') || '';

  useEffect(() => {
    if (userId) { loadPatients(); loadLogs(); loadDoctor(); }
  }, [userId]);

  const loadDoctor = async () => {
    try {
      const snap = await getDoc(doc(db, 'doctors', userId));
      if (snap.exists()) {
        const d = snap.data();
        setDoctorInfo({ name: d.name || '', phone: d.phone || d.whatsappNumber || '' });
      }
    } catch {}
  };

  const loadPatients = async () => {
    setLoading(true);
    try {
      // Get all bookings for this doctor (last 6 months)
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
      const dateStr = sixMonthsAgo.toISOString().split('T')[0];

      const q = query(
        collection(db, 'bookings'),
        where('doctorId', '==', userId),
        where('appointmentDate', '>=', dateStr),
        orderBy('appointmentDate', 'desc')
      );
      const snap = await getDocs(q);

      // Deduplicate by phone
      const phoneMap = new Map<string, PatientContact>();
      snap.docs.forEach(d => {
        const data = d.data();
        const phone = data.patientPhone || data.phone || '';
        if (!phone || data.status === 'cancelled') return;
        if (!phoneMap.has(phone)) {
          phoneMap.set(phone, {
            id: d.id,
            name: data.patientName || 'Unknown',
            phone,
            lastVisit: data.appointmentDate || '',
            chamberName: data.chamberName || data.clinicName || '',
            selected: false,
            hasFCM: false,
            userId: data.patientId || data.userId || '',
          });
        }
      });

      const list = Array.from(phoneMap.values());

      // Check which patients have FCM tokens
      const phoneList = list.map(p => p.phone).filter(Boolean);
      if (phoneList.length > 0) {
        // Check in batches of 10 (Firestore 'in' limit)
        for (let i = 0; i < phoneList.length; i += 10) {
          const batch = phoneList.slice(i, i + 10);
          try {
            const tq = query(collection(db, 'patientFCMTokens'), where('__name__', 'in', batch));
            const tsnap = await getDocs(tq);
            tsnap.docs.forEach(td => {
              const p = list.find(pt => pt.phone === td.id);
              if (p) p.hasFCM = true;
            });
          } catch {}
        }
        // Also check by userId
        const userIds = list.map(p => p.userId).filter(Boolean);
        for (let i = 0; i < userIds.length; i += 10) {
          const batch = userIds.slice(i, i + 10);
          try {
            const tq = query(collection(db, 'fcmTokens'), where('__name__', 'in', batch));
            const tsnap = await getDocs(tq);
            tsnap.docs.forEach(td => {
              const p = list.find(pt => pt.userId === td.id);
              if (p) p.hasFCM = true;
            });
          } catch {}
        }
      }

      list.sort((a, b) => a.name.localeCompare(b.name));
      setPatients(list);
    } catch (err) {
      console.error('Error loading patients:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadLogs = async () => {
    try {
      const q = query(collection(db, `doctors/${userId}/broadcastLogs`), orderBy('date', 'desc'), limit(20));
      const snap = await getDocs(q);
      setLogs(snap.docs.map(d => ({ id: d.id, ...d.data() } as BroadcastLog)));
    } catch {}
  };

  const handleTemplateChange = (type: BroadcastType) => {
    setBroadcastType(type);
    const tpl = TEMPLATES[type];
    setTitle(tpl.title.replace('[Name]', doctorInfo.name));
    setMessage(tpl.message.replace(/\[Name\]/g, doctorInfo.name).replace(/\[Phone\]/g, doctorInfo.phone));
  };

  const filtered = useMemo(() => {
    let list = patients;
    if (searchTerm) list = list.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()) || p.phone.includes(searchTerm));
    if (filterChamber !== 'all') list = list.filter(p => p.chamberName === filterChamber);
    return list;
  }, [patients, searchTerm, filterChamber]);

  const chambers = useMemo(() => [...new Set(patients.map(p => p.chamberName).filter(c => c && c.trim()))], [patients]);
  const selectedCount = patients.filter(p => p.selected).length;
  const fcmEligible = patients.filter(p => p.selected && p.hasFCM).length;

  const toggleSelect = (phone: string) => {
    setPatients(prev => prev.map(p => p.phone === phone ? { ...p, selected: !p.selected } : p));
  };

  const toggleSelectAll = () => {
    const newVal = !selectAll;
    setSelectAll(newVal);
    const filteredPhones = new Set(filtered.map(p => p.phone));
    setPatients(prev => prev.map(p => filteredPhones.has(p.phone) ? { ...p, selected: newVal } : p));
  };

  const handleSend = async () => {
    if (!title.trim() || !message.trim()) { toast.error('Title and message are required'); return; }
    const selected = patients.filter(p => p.selected);
    if (selected.length === 0) { toast.error('Select at least one patient'); return; }
    if (!confirm(`Send broadcast to ${selected.length} patients via ${sendVia.toUpperCase()}?`)) return;

    setSending(true);
    let successCount = 0;
    let failCount = 0;
    setSendProgress({ total: selected.length, sent: 0, failed: 0 });

    // Send FCM push notifications
    if (sendVia === 'fcm' || sendVia === 'both') {
      const fcmPatients = selected.filter(p => p.hasFCM);
      const functions = getFunctions();
      const sendFCM = httpsCallable(functions, 'sendFCMNotification');

      for (const patient of fcmPatients) {
        try {
          const targetId = patient.userId || patient.phone;
          await sendFCM({
            userId: targetId,
            title: title.trim(),
            body: message.trim(),
            data: { type: 'broadcast', broadcastType, doctorId: userId }
          });
          successCount++;
        } catch {
          failCount++;
        }
        setSendProgress(p => ({ ...p, sent: p.sent + 1 }));
      }
    }

    // Open WhatsApp for each patient (sequential)
    if (sendVia === 'whatsapp' || sendVia === 'both') {
      const whatsappMsg = encodeURIComponent(`${title.trim()}\n\n${message.trim()}`);
      for (const patient of selected) {
        if (patient.phone) {
          const phoneNum = patient.phone.replace(/\D/g, '');
          const fullPhone = phoneNum.startsWith('91') ? phoneNum : `91${phoneNum}`;
          window.open(`https://wa.me/${fullPhone}?text=${whatsappMsg}`, '_blank');
          successCount++;
          // Small delay between opens
          await new Promise(r => setTimeout(r, 300));
        }
      }
    }

    // Save log
    try {
      await addDoc(collection(db, `doctors/${userId}/broadcastLogs`), {
        title: title.trim(),
        message: message.trim(),
        type: sendVia,
        broadcastType,
        recipientCount: selected.length,
        successCount,
        failCount,
        date: new Date().toISOString(),
        createdAt: serverTimestamp(),
      });
    } catch {}

    toast.success(`Broadcast sent to ${successCount} patients`);
    setSending(false);
    setSendProgress({ total: 0, sent: 0, failed: 0 });
    loadLogs();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <DashboardSidebar
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
        onMenuChange={m => { setSidebarOpen(false); onMenuChange?.(m); }}
        onLogout={onLogout || (() => {})}
        currentPage="patient-broadcast"
        activeAddOns={activeAddOns}
      />

      <div className="lg:ml-64">
        {/* HEADER */}
        <header className="sticky top-0 z-20 px-4 py-3 flex items-center gap-3 bg-slate-900 border-b border-white/5">
          <button onClick={() => setSidebarOpen(true)} className="md:hidden p-2 rounded-lg bg-white/5 text-white">
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-3 flex-1">
            <div className="p-2 rounded-xl bg-gradient-to-br from-violet-500/20 to-purple-500/20">
              <Megaphone className="w-5 h-5 text-violet-400" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white">Patient Broadcast</h1>
              <p className="text-xs text-slate-400">Send health tips, camp alerts & announcements</p>
            </div>
          </div>
          <button onClick={() => setShowLogs(!showLogs)}
            className="flex items-center gap-1.5 px-3 py-2 bg-white/5 text-slate-300 rounded-xl text-xs hover:bg-white/10 transition">
            <Clock className="w-3.5 h-3.5" /> History
          </button>
        </header>

        <div className="p-4 space-y-4">
          {/* STATS */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: 'Total Patients', value: patients.length, icon: Users, color: 'from-blue-500/20 to-cyan-500/20', text: 'text-blue-400' },
              { label: 'Selected', value: selectedCount, icon: Check, color: 'from-emerald-500/20 to-green-500/20', text: 'text-emerald-400' },
              { label: 'FCM Eligible', value: fcmEligible, icon: Bell, color: 'from-violet-500/20 to-purple-500/20', text: 'text-violet-400' },
              { label: 'Broadcasts Sent', value: logs.length, icon: Send, color: 'from-amber-500/20 to-orange-500/20', text: 'text-amber-400' },
            ].map((s, i) => (
              <div key={i} className={`rounded-xl bg-gradient-to-br ${s.color} border border-white/5 p-3`}>
                <div className="flex items-center gap-2 mb-1">
                  <s.icon className={`w-4 h-4 ${s.text}`} />
                  <span className="text-xs text-slate-400">{s.label}</span>
                </div>
                <p className={`text-xl font-bold ${s.text}`}>{s.value}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
            {/* LEFT: Message Composer (2 cols) */}
            <div className="lg:col-span-2 space-y-3">
              <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4 space-y-3">
                <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-violet-400" /> Compose Message
                </h3>

                {/* Template Type */}
                <div>
                  <label className="text-xs text-slate-400 mb-1.5 block">Template</label>
                  <div className="flex flex-wrap gap-1.5">
                    {([
                      { key: 'health-tip', label: '💡 Health Tip' },
                      { key: 'camp', label: '🏥 Camp' },
                      { key: 'announcement', label: '📢 Announce' },
                      { key: 'festival', label: '🎉 Festival' },
                      { key: 'custom', label: '✏️ Custom' },
                    ] as { key: BroadcastType; label: string }[]).map(t => (
                      <button key={t.key} onClick={() => handleTemplateChange(t.key)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${broadcastType === t.key ? 'bg-violet-500 text-white' : 'bg-white/5 text-slate-400 hover:text-white'}`}>
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Title */}
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">Title *</label>
                  <input value={title} onChange={e => setTitle(e.target.value)}
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-violet-500/50"
                    placeholder="Notification title" />
                </div>

                {/* Message */}
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">Message *</label>
                  <textarea value={message} onChange={e => setMessage(e.target.value)} rows={4}
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-violet-500/50 resize-none"
                    placeholder="Type your message..." />
                  <p className="text-[10px] text-slate-600 mt-0.5">{message.length}/500 chars</p>
                </div>

                {/* Send Via */}
                <div>
                  <label className="text-xs text-slate-400 mb-1.5 block">Send Via</label>
                  <div className="flex gap-1 bg-white/5 rounded-xl p-0.5">
                    {([
                      { key: 'both' as const, label: 'FCM + WA', icon: '📲' },
                      { key: 'fcm' as const, label: 'FCM', icon: '🔔' },
                      { key: 'whatsapp' as const, label: 'WhatsApp', icon: '💬' },
                    ]).map(opt => (
                      <button key={opt.key} onClick={() => setSendVia(opt.key)}
                        className={`flex-1 px-2 py-1.5 rounded-lg text-xs font-medium transition ${sendVia === opt.key ? 'bg-violet-500 text-white' : 'text-slate-400 hover:text-white'}`}>
                        {opt.icon} {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {sendVia !== 'fcm' && (
                  <p className="text-[10px] text-amber-400/80 flex items-start gap-1">
                    <AlertCircle className="w-3 h-3 shrink-0 mt-0.5" />
                    WhatsApp opens individual chats from {doctorInfo.phone || 'clinic phone'}.
                  </p>
                )}

                {/* SEND BUTTON */}
                <button onClick={handleSend} disabled={sending || selectedCount === 0}
                  className="w-full py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 text-white font-semibold text-sm hover:opacity-90 transition disabled:opacity-40 flex items-center justify-center gap-2">
                  {sending ? (
                    <><span className="animate-spin rounded-full h-4 w-4 border-2 border-white/30 border-t-white" /> Sending {sendProgress.sent}/{sendProgress.total}...</>
                  ) : (
                    <><Send className="w-4 h-4" /> Send to {selectedCount} Patient{selectedCount !== 1 ? 's' : ''}</>
                  )}
                </button>
              </div>
            </div>

            {/* RIGHT: Patient List (3 cols) */}
            <div className="lg:col-span-3">
              <div className="rounded-xl border border-white/5 bg-slate-900/50 overflow-hidden flex flex-col" style={{ maxHeight: '520px' }}>
                {/* Filter bar */}
                <div className="px-3 py-2 border-b border-white/5 flex flex-wrap items-center gap-2 shrink-0 bg-slate-900">
                  <div className="relative flex-1 min-w-[140px]">
                    <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                      placeholder="Search..."
                      className="w-full pl-8 pr-2 py-1.5 bg-white/5 border border-white/10 rounded-lg text-white text-xs placeholder-slate-500 focus:outline-none" />
                  </div>
                  {chambers.length > 1 && (
                    <select value={filterChamber} onChange={e => setFilterChamber(e.target.value)}
                      style={{ colorScheme: 'dark' }}
                      className="px-2 py-1.5 bg-slate-800 border border-white/10 rounded-lg text-white text-xs focus:outline-none">
                      <option value="all">All Chambers</option>
                      {chambers.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  )}
                  <button onClick={toggleSelectAll}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition ${selectAll ? 'bg-violet-500 text-white' : 'bg-white/5 text-slate-400 hover:text-white'}`}>
                    {selectAll ? '✓ Deselect' : 'Select All'}
                  </button>
                  <span className="text-[10px] text-slate-500">{filtered.length} patients • {selectedCount} selected</span>
                </div>

                {/* Compact patient table */}
                {loading ? (
                  <div className="text-center py-8 text-slate-400 text-sm">Loading patients...</div>
                ) : filtered.length === 0 ? (
                  <div className="text-center py-8">
                    <Users className="w-8 h-8 mx-auto text-slate-600 mb-2" />
                    <p className="text-slate-400 text-sm">No patients found</p>
                  </div>
                ) : (
                  <div className="flex-1 overflow-y-auto">
                    <table className="w-full text-xs">
                      <thead className="sticky top-0 bg-slate-900">
                        <tr className="text-slate-500 text-left">
                          <th className="pl-3 pr-1 py-2 w-8"></th>
                          <th className="px-2 py-2">Patient</th>
                          <th className="px-2 py-2 hidden md:table-cell">Phone</th>
                          <th className="px-2 py-2 hidden lg:table-cell">Chamber</th>
                          <th className="px-2 py-2 hidden lg:table-cell">Last Visit</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {filtered.map(p => (
                          <tr key={p.phone} onClick={() => toggleSelect(p.phone)}
                            className={`cursor-pointer transition hover:bg-white/5 ${p.selected ? 'bg-violet-500/10' : ''}`}>
                            <td className="pl-3 pr-1 py-1.5">
                              <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition ${p.selected ? 'bg-violet-500 border-violet-500' : 'border-white/20'}`}>
                                {p.selected && <Check className="w-2.5 h-2.5 text-white" />}
                              </div>
                            </td>
                            <td className="px-2 py-1.5">
                              <span className="text-white font-medium">{p.name}</span>
                              {p.hasFCM && <Bell className="w-2.5 h-2.5 text-violet-400 inline ml-1" />}
                              <span className="md:hidden text-slate-500 block text-[10px]">{p.phone}</span>
                            </td>
                            <td className="px-2 py-1.5 text-slate-400 hidden md:table-cell">{p.phone}</td>
                            <td className="px-2 py-1.5 text-slate-500 hidden lg:table-cell truncate max-w-[120px]">{p.chamberName || '-'}</td>
                            <td className="px-2 py-1.5 text-slate-600 hidden lg:table-cell">{p.lastVisit}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* BROADCAST HISTORY */}
          {showLogs && logs.length > 0 && (
            <div className="rounded-xl border border-white/5 bg-white/[0.02] overflow-hidden">
              <div className="px-4 py-3 border-b border-white/5 flex items-center gap-2">
                <Clock className="w-4 h-4 text-slate-400" />
                <h3 className="text-sm font-semibold text-white">Broadcast History</h3>
              </div>
              <div className="divide-y divide-white/5">
                {logs.map(log => (
                  <div key={log.id} className="px-4 py-3 flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-violet-500/10">
                      {log.type === 'fcm' ? <Bell className="w-4 h-4 text-violet-400" /> :
                       log.type === 'whatsapp' ? <MessageSquare className="w-4 h-4 text-green-400" /> :
                       <Megaphone className="w-4 h-4 text-amber-400" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white font-medium truncate">{log.title}</p>
                      <p className="text-xs text-slate-500 truncate">{log.message}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs text-slate-300">{log.recipientCount} sent</p>
                      <p className="text-[10px] text-slate-500">{new Date(log.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PatientBroadcast;
