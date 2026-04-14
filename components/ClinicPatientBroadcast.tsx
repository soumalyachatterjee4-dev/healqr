import { useState, useEffect, useMemo } from 'react';
import {
  Menu, Megaphone, Send, Search, Users, Check, X,
  MessageSquare, Bell, Calendar, Filter,
  ChevronDown, ChevronUp, Clock, AlertCircle
} from 'lucide-react';
import ClinicSidebar from './ClinicSidebar';
import { db, auth } from '../lib/firebase/config';
import {
  collection, query, where, getDocs, doc, getDoc, addDoc,
  serverTimestamp, orderBy, limit
} from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { toast } from 'sonner';

interface ClinicPatientBroadcastProps {
  onMenuChange?: (menu: string) => void;
  onLogout?: () => void | Promise<void>;
  activeAddOns?: string[];
}

interface PatientContact {
  id: string;
  name: string;
  phone: string;
  lastVisit: string;
  doctorName: string;
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
    title: '💡 Health Tip',
    message: 'Dear Patient, here is a health tip for you: [Your health tip here]. Stay healthy! - [Clinic Name]'
  },
  'camp': {
    title: '🏥 Free Health Camp',
    message: 'We are organizing a FREE health camp on [Date] at [Location]. Services: [Services]. Register now! Limited spots. - [Clinic Name]'
  },
  'announcement': {
    title: '📢 Important Announcement',
    message: 'Dear Patient, please note: [Your announcement]. For queries call [Phone]. - [Clinic Name]'
  },
  'festival': {
    title: '🎉 Festival Greetings',
    message: 'Wishing you and your family a very Happy [Festival Name]! May you be blessed with good health always. - [Clinic Name]'
  },
  'custom': { title: '', message: '' }
};

export default function ClinicPatientBroadcast({ onMenuChange = () => {}, onLogout, activeAddOns = [] }: ClinicPatientBroadcastProps) {
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
  const [filterDoctor, setFilterDoctor] = useState('all');
  const [clinicInfo, setClinicInfo] = useState({ name: '', phone: '' });
  const [sendProgress, setSendProgress] = useState({ total: 0, sent: 0, failed: 0 });

  const isLocationManager = localStorage.getItem('healqr_is_location_manager') === 'true';
  const isAssistant = localStorage.getItem('healqr_is_assistant') === 'true';
  const clinicId = isLocationManager
    ? localStorage.getItem('healqr_parent_clinic_id') || auth?.currentUser?.uid || ''
    : isAssistant
    ? localStorage.getItem('healqr_assistant_doctor_id') || auth?.currentUser?.uid || ''
    : auth?.currentUser?.uid || '';

  useEffect(() => {
    if (clinicId) { loadPatients(); loadLogs(); loadClinic(); }
  }, [clinicId]);

  const loadClinic = async () => {
    try {
      const snap = await getDoc(doc(db, 'clinics', clinicId));
      if (snap.exists()) {
        const d = snap.data();
        setClinicInfo({ name: d.name || d.clinicName || '', phone: d.phone || d.mobile || '' });
      }
    } catch {}
  };

  const loadPatients = async () => {
    setLoading(true);
    try {
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
      const dateStr = sixMonthsAgo.toISOString().split('T')[0];

      const q = query(
        collection(db, 'bookings'),
        where('clinicId', '==', clinicId),
        where('appointmentDate', '>=', dateStr),
        orderBy('appointmentDate', 'desc')
      );
      const snap = await getDocs(q);

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
            doctorName: data.doctorName || 'Doctor',
            selected: false,
            hasFCM: false,
            userId: data.patientId || data.userId || '',
          });
        }
      });

      const list = Array.from(phoneMap.values());

      // Check FCM tokens
      const phoneList = list.map(p => p.phone).filter(Boolean);
      if (phoneList.length > 0) {
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
      const q = query(collection(db, `clinics/${clinicId}/broadcastLogs`), orderBy('date', 'desc'), limit(20));
      const snap = await getDocs(q);
      setLogs(snap.docs.map(d => ({ id: d.id, ...d.data() } as BroadcastLog)));
    } catch {}
  };

  const handleTemplateChange = (type: BroadcastType) => {
    setBroadcastType(type);
    const tpl = TEMPLATES[type];
    setTitle(tpl.title.replace('[Clinic Name]', clinicInfo.name));
    setMessage(tpl.message.replace(/\[Clinic Name\]/g, clinicInfo.name).replace(/\[Phone\]/g, clinicInfo.phone));
  };

  const filtered = useMemo(() => {
    let list = patients;
    if (searchTerm) list = list.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()) || p.phone.includes(searchTerm));
    if (filterDoctor !== 'all') list = list.filter(p => p.doctorName === filterDoctor);
    return list;
  }, [patients, searchTerm, filterDoctor]);

  const doctors = useMemo(() => [...new Set(patients.map(p => p.doctorName).filter(c => c && c.trim()))], [patients]);
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
            data: { type: 'broadcast', broadcastType, clinicId }
          });
          successCount++;
        } catch {
          failCount++;
        }
        setSendProgress(p => ({ ...p, sent: p.sent + 1 }));
      }
    }

    if (sendVia === 'whatsapp' || sendVia === 'both') {
      const whatsappMsg = encodeURIComponent(`${title.trim()}\n\n${message.trim()}`);
      for (const patient of selected) {
        if (patient.phone) {
          const phoneNum = patient.phone.replace(/\D/g, '');
          const fullPhone = phoneNum.startsWith('91') ? phoneNum : `91${phoneNum}`;
          window.open(`https://wa.me/${fullPhone}?text=${whatsappMsg}`, '_blank', 'noopener,noreferrer');
          successCount++;
          await new Promise(r => setTimeout(r, 300));
        }
      }
    }

    try {
      await addDoc(collection(db, `clinics/${clinicId}/broadcastLogs`), {
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
    <div className="min-h-screen bg-zinc-950 text-white overflow-x-hidden">
      <ClinicSidebar
        activeMenu="patient-broadcast"
        onMenuChange={onMenuChange}
        onLogout={onLogout || (() => {})}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        activeAddOns={activeAddOns}
      />

      <div className="transition-all duration-300 lg:ml-64">
        {/* HEADER */}
        <header className="sticky top-0 z-20 px-4 lg:px-8 py-3 flex items-center gap-3 bg-zinc-950/80 backdrop-blur-sm border-b border-zinc-800">
          <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-blue-500">
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-3 flex-1">
            <div className="p-2 rounded-xl bg-blue-500/20">
              <Megaphone className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white">Patient Broadcast</h1>
              <p className="text-xs text-zinc-500">Send health tips, camp alerts & announcements</p>
            </div>
          </div>
          <button onClick={() => setShowLogs(!showLogs)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition ${showLogs ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' : 'bg-zinc-900 text-zinc-400 hover:bg-zinc-800 border border-zinc-800'}`}>
            <Clock className="w-3.5 h-3.5" /> History
          </button>
        </header>

        <div className="px-4 lg:px-8 py-6 max-w-7xl mx-auto space-y-5">
          {/* STATS */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: 'Total Patients', value: patients.length, icon: Users, color: 'text-blue-400' },
              { label: 'Selected', value: selectedCount, icon: Check, color: 'text-emerald-400' },
              { label: 'FCM Eligible', value: fcmEligible, icon: Bell, color: 'text-violet-400' },
              { label: 'Broadcasts Sent', value: logs.length, icon: Send, color: 'text-amber-400' },
            ].map((s, i) => (
              <div key={i} className="bg-zinc-900 border border-zinc-800 rounded-xl p-3">
                <div className="flex items-center gap-2 mb-1">
                  <s.icon className={`w-4 h-4 ${s.color}`} />
                  <span className="text-[10px] text-zinc-400 uppercase tracking-wider">{s.label}</span>
                </div>
                <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
            {/* LEFT: Composer */}
            <div className="lg:col-span-2 space-y-3">
              <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4 space-y-3">
                <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-blue-400" /> Compose Message
                </h3>

                <div>
                  <label className="text-xs text-zinc-400 mb-1.5 block">Template</label>
                  <div className="flex flex-wrap gap-1.5">
                    {([
                      { key: 'health-tip', label: '💡 Health Tip' },
                      { key: 'camp', label: '🏥 Camp' },
                      { key: 'announcement', label: '📢 Announce' },
                      { key: 'festival', label: '🎉 Festival' },
                      { key: 'custom', label: '✏️ Custom' },
                    ] as { key: BroadcastType; label: string }[]).map(t => (
                      <button key={t.key} onClick={() => handleTemplateChange(t.key)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${broadcastType === t.key ? 'bg-blue-600 text-white' : 'bg-zinc-800 text-zinc-400 hover:text-white'}`}>
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-xs text-zinc-400 mb-1 block">Title *</label>
                  <input value={title} onChange={e => setTitle(e.target.value)}
                    className="w-full px-3 py-2 bg-black/50 border border-zinc-800 rounded-xl text-white text-sm focus:outline-none focus:border-blue-500"
                    placeholder="Notification title" />
                </div>

                <div>
                  <label className="text-xs text-zinc-400 mb-1 block">Message *</label>
                  <textarea value={message} onChange={e => setMessage(e.target.value)} rows={4}
                    className="w-full px-3 py-2 bg-black/50 border border-zinc-800 rounded-xl text-white text-sm focus:outline-none focus:border-blue-500 resize-none"
                    placeholder="Type your message..." />
                  <p className="text-[10px] text-zinc-600 mt-0.5">{message.length}/500 chars</p>
                </div>

                <div>
                  <label className="text-xs text-zinc-400 mb-1.5 block">Send Via</label>
                  <div className="flex gap-1 bg-zinc-800 rounded-xl p-0.5">
                    {([
                      { key: 'both' as const, label: 'FCM + WA', icon: '📲' },
                      { key: 'fcm' as const, label: 'FCM', icon: '🔔' },
                      { key: 'whatsapp' as const, label: 'WhatsApp', icon: '💬' },
                    ]).map(opt => (
                      <button key={opt.key} onClick={() => setSendVia(opt.key)}
                        className={`flex-1 px-2 py-1.5 rounded-lg text-xs font-medium transition ${sendVia === opt.key ? 'bg-blue-600 text-white' : 'text-zinc-400 hover:text-white'}`}>
                        {opt.icon} {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {sendVia !== 'fcm' && (
                  <p className="text-[10px] text-amber-400/80 flex items-start gap-1">
                    <AlertCircle className="w-3 h-3 shrink-0 mt-0.5" />
                    WhatsApp opens individual chats from {clinicInfo.phone || 'clinic phone'}.
                  </p>
                )}

                <button onClick={handleSend} disabled={sending || selectedCount === 0}
                  className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm transition disabled:opacity-40 flex items-center justify-center gap-2">
                  {sending ? (
                    <><span className="animate-spin rounded-full h-4 w-4 border-2 border-white/30 border-t-white" /> Sending {sendProgress.sent}/{sendProgress.total}...</>
                  ) : (
                    <><Send className="w-4 h-4" /> Send to {selectedCount} Patient{selectedCount !== 1 ? 's' : ''}</>
                  )}
                </button>
              </div>
            </div>

            {/* RIGHT: Patient List */}
            <div className="lg:col-span-3">
              <div className="rounded-xl border border-zinc-800 bg-zinc-900 overflow-hidden flex flex-col" style={{ maxHeight: '520px' }}>
                <div className="px-3 py-2 border-b border-zinc-800 flex flex-wrap items-center gap-2 shrink-0">
                  <div className="relative flex-1 min-w-[140px]">
                    <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-500" />
                    <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                      placeholder="Search..."
                      className="w-full pl-8 pr-2 py-1.5 bg-black/50 border border-zinc-800 rounded-lg text-white text-xs placeholder-zinc-600 focus:outline-none" />
                  </div>
                  {doctors.length > 1 && (
                    <select value={filterDoctor} onChange={e => setFilterDoctor(e.target.value)}
                      style={{ colorScheme: 'dark' }}
                      className="px-2 py-1.5 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-xs focus:outline-none">
                      <option value="all">All Doctors</option>
                      {doctors.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  )}
                  <button onClick={toggleSelectAll}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition ${selectAll ? 'bg-blue-600 text-white' : 'bg-zinc-800 text-zinc-400 hover:text-white'}`}>
                    {selectAll ? '✓ Deselect' : 'Select All'}
                  </button>
                  <span className="text-[10px] text-zinc-500">{filtered.length} patients • {selectedCount} selected</span>
                </div>

                {loading ? (
                  <div className="flex flex-col items-center justify-center py-12">
                    <div className="animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full mb-2" />
                    <p className="text-zinc-500 text-xs">Loading patients...</p>
                  </div>
                ) : filtered.length === 0 ? (
                  <div className="text-center py-12">
                    <Users className="w-8 h-8 mx-auto text-zinc-700 mb-2" />
                    <p className="text-zinc-400 text-sm">No patients found</p>
                  </div>
                ) : (
                  <div className="flex-1 overflow-y-auto">
                    <table className="w-full text-xs">
                      <thead className="sticky top-0 bg-zinc-900">
                        <tr className="text-zinc-500 text-left">
                          <th className="pl-3 pr-1 py-2 w-8"></th>
                          <th className="px-2 py-2">Patient</th>
                          <th className="px-2 py-2 hidden md:table-cell">Phone</th>
                          <th className="px-2 py-2 hidden lg:table-cell">Doctor</th>
                          <th className="px-2 py-2 hidden lg:table-cell">Last Visit</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-800/50">
                        {filtered.map(p => (
                          <tr key={p.phone} onClick={() => toggleSelect(p.phone)}
                            className={`cursor-pointer transition hover:bg-zinc-800/50 ${p.selected ? 'bg-blue-500/10' : ''}`}>
                            <td className="pl-3 pr-1 py-1.5">
                              <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition ${p.selected ? 'bg-blue-500 border-blue-500' : 'border-zinc-600'}`}>
                                {p.selected && <Check className="w-2.5 h-2.5 text-white" />}
                              </div>
                            </td>
                            <td className="px-2 py-1.5">
                              <span className="text-white font-medium">{p.name}</span>
                              {p.hasFCM && <Bell className="w-2.5 h-2.5 text-blue-400 inline ml-1" />}
                              <span className="md:hidden text-zinc-500 block text-[10px]">{p.phone}</span>
                            </td>
                            <td className="px-2 py-1.5 text-zinc-400 hidden md:table-cell">{p.phone}</td>
                            <td className="px-2 py-1.5 text-zinc-500 hidden lg:table-cell truncate max-w-[120px]">{p.doctorName}</td>
                            <td className="px-2 py-1.5 text-zinc-600 hidden lg:table-cell">{p.lastVisit}</td>
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
            <div className="rounded-xl border border-zinc-800 bg-zinc-900 overflow-hidden">
              <div className="px-4 py-3 border-b border-zinc-800 flex items-center gap-2">
                <Clock className="w-4 h-4 text-blue-400" />
                <h3 className="text-sm font-semibold text-white">Broadcast History</h3>
              </div>
              <div className="divide-y divide-zinc-800/50">
                {logs.map(log => (
                  <div key={log.id} className="px-4 py-3 flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-blue-500/10">
                      {log.type === 'fcm' ? <Bell className="w-4 h-4 text-blue-400" /> :
                       log.type === 'whatsapp' ? <MessageSquare className="w-4 h-4 text-green-400" /> :
                       <Megaphone className="w-4 h-4 text-amber-400" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white font-medium truncate">{log.title}</p>
                      <p className="text-xs text-zinc-500 truncate">{log.message}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs text-zinc-300">{log.recipientCount} sent</p>
                      <p className="text-[10px] text-zinc-600">{new Date(log.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
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
}
