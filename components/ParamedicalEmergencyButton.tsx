import { useEffect, useState } from 'react';
import { db } from '../lib/firebase/config';
import {
  addDoc, collection, deleteDoc, doc, onSnapshot, orderBy, query, serverTimestamp, updateDoc,
} from 'firebase/firestore';
import { toast } from 'sonner';
import {
  AlertTriangle, Phone, Trash2, Plus, MapPin, Loader2, Shield, MessageCircle, Send,
} from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';

interface ParamedicalEmergencyButtonProps {
  paraId: string;
  paraName?: string;
}

interface Contact {
  id: string;
  name: string;
  phone: string;
  relation?: string;
  primary?: boolean;
}

interface SOSLog {
  id: string;
  type: 'sos' | 'safe-arrived' | 'safe-departed';
  message?: string;
  location?: { lat: number; lng: number; accuracy?: number };
  createdAt?: any;
}

export default function ParamedicalEmergencyButton({ paraId, paraName }: ParamedicalEmergencyButtonProps) {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [logs, setLogs] = useState<SOSLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newRelation, setNewRelation] = useState('');
  const [sending, setSending] = useState(false);

  const colContacts = `paramedicals/${paraId}/emergencyContacts`;
  const colLogs = `paramedicals/${paraId}/sosLogs`;

  useEffect(() => {
    if (!paraId) { setLoading(false); return; }
    const unsubC = onSnapshot(collection(db, colContacts), (snap) => {
      setContacts(snap.docs.map(d => ({ id: d.id, ...(d.data() as any) })));
      setLoading(false);
    });
    const unsubL = onSnapshot(query(collection(db, colLogs), orderBy('createdAt', 'desc')), (snap) => {
      setLogs(snap.docs.map(d => ({ id: d.id, ...(d.data() as any) })).slice(0, 30));
    }, () => {});
    return () => { unsubC(); unsubL(); };
  }, [paraId]);

  const addContact = async () => {
    if (!newName.trim() || !newPhone.trim()) {
      toast.error('Name and phone required');
      return;
    }
    try {
      await addDoc(collection(db, colContacts), {
        name: newName.trim(),
        phone: newPhone.replace(/\D/g, '').slice(-10),
        relation: newRelation.trim(),
        primary: contacts.length === 0,
        createdAt: serverTimestamp(),
      });
      setNewName(''); setNewPhone(''); setNewRelation('');
      toast.success('Contact added');
    } catch (e: any) { toast.error(e?.message); }
  };

  const removeContact = async (id: string) => {
    if (!confirm('Remove this emergency contact?')) return;
    try {
      await deleteDoc(doc(db, colContacts, id));
    } catch (e: any) { toast.error(e?.message); }
  };

  const setPrimary = async (id: string) => {
    try {
      await Promise.all(contacts.map(c => updateDoc(doc(db, colContacts, c.id), { primary: c.id === id })));
      toast.success('Primary contact updated');
    } catch (e: any) { toast.error(e?.message); }
  };

  const triggerSOS = async () => {
    if (contacts.length === 0) {
      toast.error('Add at least one emergency contact first');
      return;
    }
    if (!confirm('Trigger emergency SOS? Your location will be shared with all your contacts via WhatsApp.')) return;
    setSending(true);
    try {
      const location = await new Promise<{ lat: number; lng: number; accuracy?: number } | null>((resolve) => {
        if (!navigator.geolocation) return resolve(null);
        navigator.geolocation.getCurrentPosition(
          (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy }),
          () => resolve(null),
          { enableHighAccuracy: true, timeout: 8000 }
        );
      });

      const locUrl = location ? `https://maps.google.com/?q=${location.lat},${location.lng}` : '';
      const msg = `🚨 EMERGENCY SOS from ${paraName || 'HealQR Professional'} 🚨\n\nI need help. Please reach me or call.${locUrl ? `\n\nMy location: ${locUrl}` : ''}\n\n— Sent via HealQR`;

      contacts.forEach((c, idx) => {
        const url = `https://wa.me/91${c.phone}?text=${encodeURIComponent(msg)}`;
        if (idx === 0) window.open(url, '_blank');
        else setTimeout(() => window.open(url, '_blank'), idx * 600);
      });

      await addDoc(collection(db, colLogs), {
        type: 'sos',
        message: msg,
        location,
        createdAt: serverTimestamp(),
      });
      toast.success(`SOS sent to ${contacts.length} contact${contacts.length === 1 ? '' : 's'}`);
    } catch (e: any) {
      toast.error(e?.message || 'Failed');
    } finally {
      setSending(false);
    }
  };

  const checkIn = async (type: 'safe-arrived' | 'safe-departed') => {
    try {
      const location = await new Promise<{ lat: number; lng: number } | null>((resolve) => {
        if (!navigator.geolocation) return resolve(null);
        navigator.geolocation.getCurrentPosition(
          (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
          () => resolve(null),
          { timeout: 5000 }
        );
      });
      const label = type === 'safe-arrived' ? 'Reached patient location safely' : 'Visit complete, heading back';
      const locUrl = location ? `https://maps.google.com/?q=${location.lat},${location.lng}` : '';
      const msg = `✅ ${paraName || 'HealQR Professional'}: ${label}.${locUrl ? `\nLocation: ${locUrl}` : ''}\n— Sent via HealQR`;
      const primary = contacts.find(c => c.primary) || contacts[0];
      if (primary) {
        window.open(`https://wa.me/91${primary.phone}?text=${encodeURIComponent(msg)}`, '_blank');
      }
      await addDoc(collection(db, colLogs), { type, message: msg, location, createdAt: serverTimestamp() });
      toast.success('Check-in sent');
    } catch (e: any) { toast.error(e?.message); }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64 text-gray-400"><Loader2 className="w-6 h-6 animate-spin mr-2" /> Loading…</div>;
  }

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-red-600/20 to-orange-600/20 border border-red-500/30 rounded-xl p-5 flex items-center gap-4">
        <Shield className="w-10 h-10 text-red-400" />
        <div>
          <h3 className="text-white font-semibold">Emergency / Safety Center</h3>
          <p className="text-gray-400 text-sm">For your safety while at patient locations. Set trusted contacts and use SOS or safe-arrival check-ins.</p>
        </div>
      </div>

      {/* SOS button */}
      <div className="bg-red-500/5 border-2 border-red-500/40 rounded-xl p-6 text-center">
        <button
          onClick={triggerSOS}
          disabled={sending}
          className="w-32 h-32 mx-auto rounded-full bg-red-600 hover:bg-red-700 active:scale-95 transition-all flex items-center justify-center shadow-2xl shadow-red-500/40 disabled:opacity-50"
        >
          {sending ? <Loader2 className="w-12 h-12 text-white animate-spin" /> : <AlertTriangle className="w-12 h-12 text-white" />}
        </button>
        <p className="text-red-400 font-bold mt-4">EMERGENCY SOS</p>
        <p className="text-gray-400 text-xs mt-1">Press to share live location with all your contacts via WhatsApp</p>
        <div className="flex justify-center gap-2 mt-4">
          <Button size="sm" variant="outline" className="border-emerald-700 text-emerald-300" onClick={() => checkIn('safe-arrived')}>
            <MapPin className="w-3.5 h-3.5 mr-1" /> Safe Arrived
          </Button>
          <Button size="sm" variant="outline" className="border-blue-700 text-blue-300" onClick={() => checkIn('safe-departed')}>
            <Send className="w-3.5 h-3.5 mr-1" /> Visit Done
          </Button>
        </div>
      </div>

      {/* Contacts */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
        <h4 className="text-white font-semibold mb-3">Trusted Contacts</h4>
        {contacts.length === 0 ? (
          <p className="text-gray-500 text-sm">No contacts yet. Add at least one trusted contact who can respond if you need help.</p>
        ) : (
          <div className="space-y-2 mb-4">
            {contacts.map(c => (
              <div key={c.id} className="flex items-center justify-between bg-zinc-800/40 rounded-lg p-3">
                <div className="min-w-0 flex-1">
                  <p className="text-white text-sm font-medium">
                    {c.name}
                    {c.primary && <span className="ml-2 text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full">PRIMARY</span>}
                  </p>
                  <p className="text-gray-500 text-xs">{c.phone} {c.relation && `· ${c.relation}`}</p>
                </div>
                <div className="flex gap-1">
                  {!c.primary && (
                    <Button size="sm" variant="ghost" className="text-emerald-400 hover:bg-emerald-500/10" onClick={() => setPrimary(c.id)}>
                      Make primary
                    </Button>
                  )}
                  <Button size="sm" variant="ghost" className="text-blue-400" onClick={() => window.open(`tel:${c.phone}`)}>
                    <Phone className="w-4 h-4" />
                  </Button>
                  <Button size="sm" variant="ghost" className="text-red-400" onClick={() => removeContact(c.id)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          <Input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Name" className="bg-black border-zinc-800 text-white" />
          <Input value={newPhone} onChange={e => setNewPhone(e.target.value)} placeholder="Phone (10 digits)" className="bg-black border-zinc-800 text-white" />
          <Input value={newRelation} onChange={e => setNewRelation(e.target.value)} placeholder="Relation (optional)" className="bg-black border-zinc-800 text-white" />
        </div>
        <Button onClick={addContact} className="bg-teal-600 hover:bg-teal-700 mt-3">
          <Plus className="w-4 h-4 mr-1" /> Add Contact
        </Button>
      </div>

      {/* Logs */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
        <h4 className="text-white font-semibold mb-3">Activity Log</h4>
        {logs.length === 0 ? (
          <p className="text-gray-500 text-sm">No activity yet.</p>
        ) : (
          <div className="space-y-2 max-h-72 overflow-y-auto">
            {logs.map(l => {
              const ts = l.createdAt?.toDate ? l.createdAt.toDate() : null;
              return (
                <div key={l.id} className="bg-zinc-800/40 rounded-lg p-2 text-sm">
                  <div className="flex items-center gap-2 mb-1">
                    {l.type === 'sos' ? <AlertTriangle className="w-4 h-4 text-red-400" /> : <MessageCircle className="w-4 h-4 text-emerald-400" />}
                    <span className={l.type === 'sos' ? 'text-red-400 font-medium' : 'text-emerald-400 font-medium'}>
                      {l.type === 'sos' ? 'SOS Triggered' : l.type === 'safe-arrived' ? 'Safe Arrival' : 'Visit Departed'}
                    </span>
                    {ts && <span className="text-gray-500 text-xs ml-auto">{ts.toLocaleString('en-IN')}</span>}
                  </div>
                  {l.location && (
                    <a href={`https://maps.google.com/?q=${l.location.lat},${l.location.lng}`} target="_blank" rel="noreferrer" className="text-blue-400 text-xs hover:underline">
                      {l.location.lat.toFixed(5)}, {l.location.lng.toFixed(5)}
                    </a>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
