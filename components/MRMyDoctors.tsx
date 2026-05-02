import { useState } from 'react';
import { Search, Phone, MapPin, Calendar, Stethoscope, Briefcase, CheckCircle2, Clock, Loader2, Users, ClipboardList, Send } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { toast } from 'sonner';
import { db } from '../lib/firebase/config';
import { collection, query, where, getDocs, addDoc, serverTimestamp, limit } from 'firebase/firestore';

interface MRMyDoctorsProps {
  mrId: string;
  mrData: any;
  mrLinks: any[];
  setMrLinks: (links: any) => void;
  onOpenVisitModal: (link: any) => void;
  onOpenPatientModal: (link: any) => void;
}

export default function MRMyDoctors({ mrId, mrData, mrLinks, setMrLinks, onOpenVisitModal, onOpenPatientModal }: MRMyDoctorsProps) {
  const [activeTab, setActiveTab] = useState<'my-doctors' | 'search'>('my-doctors');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchType, setSearchType] = useState<'name' | 'pincode'>('pincode');
  const [doctors, setDoctors] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [sendingRequest, setSendingRequest] = useState<string | null>(null);

  const approved = mrLinks.filter(l => l.status === 'approved');
  const pending = mrLinks.filter(l => l.status === 'pending');

  const handleSearch = async () => {
    if (!searchQuery.trim() || !db) return;
    setLoading(true);
    try {
      const term = searchQuery.trim();
      const termLower = term.toLowerCase();
      let results: any[] = [];

      if (searchType === 'pincode') {
        const pinFields = ['pincode', 'pinCode', 'residentialPincode', 'residentialPinCode', 'postalCode', 'zip'];
        for (const field of pinFields) {
          if (results.length > 0) break;
          try {
            const q = query(collection(db, 'doctors'), where(field, '==', term), limit(50));
            const snap = await getDocs(q);
            results = snap.docs.map(d => ({ id: d.id, ...d.data() }));
          } catch { /* field may not exist in index, ignore */ }
        }
      }

      if (results.length === 0) {
        const qAll = query(collection(db, 'doctors'), limit(300));
        const snap = await getDocs(qAll);
        const all = snap.docs.map(d => ({ id: d.id, ...d.data() }));

        if (searchType === 'pincode') {
          results = all.filter((d: any) => {
            const vals = [d.pincode, d.pinCode, d.residentialPincode, d.residentialPinCode, d.postalCode, d.zip, d.address, d.city, d.location];
            return vals.some(v => v && String(v).toLowerCase().includes(termLower));
          });
        } else {
          results = all.filter((d: any) =>
            String(d.name || '').toLowerCase().includes(termLower)
          );
        }
      }

      setDoctors(results);
    } catch (err) {
      console.error('Search error:', err);
      toast.error('Search failed');
    } finally {
      setLoading(false);
    }
  };

  const sendRequest = async (doctorId: string, doctorName: string, doctorSpecialty?: string) => {
    if (!mrId || !mrData || !db) return;
    const existing = mrLinks.find(l => l.doctorId === doctorId);
    if (existing) { toast.info(existing.status === 'approved' ? 'Already approved' : 'Request already sent'); return; }
    setSendingRequest(doctorId);
    try {
      const docRef = await addDoc(collection(db, 'mrDoctorLinks'), { 
        mrId, 
        mrName: mrData.name, 
        mrPhone: mrData.phone, 
        mrCompany: mrData.company, 
        mrDivision: mrData.division, 
        doctorId, 
        doctorName, 
        doctorSpecialty: doctorSpecialty || '', 
        status: 'pending', 
        createdAt: serverTimestamp() 
      });
      setMrLinks((prev: any[]) => [...prev, { id: docRef.id, mrId, doctorId, doctorName, doctorSpecialty: doctorSpecialty || '', status: 'pending' }]);
      toast.success('Request sent');
    } catch { toast.error('Failed to send'); }
    finally { setSendingRequest(null); }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      {/* Overview Card */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-blue-500/20 rounded-full flex items-center justify-center"><Briefcase className="w-6 h-6 text-blue-400" /></div>
          <div className="flex-1">
            <h2 className="font-semibold text-white">{mrData?.name}</h2>
            <p className="text-xs text-gray-400">{mrData?.company} &middot; {mrData?.division}</p>
            <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
              <span className="flex items-center gap-1"><Phone className="w-3 h-3" /> {mrData?.phone}</span>
              <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {approved.length} Doctors</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 pb-2">
        <button onClick={() => setActiveTab('my-doctors')} className={`px-4 py-2 rounded-lg text-sm font-medium ${activeTab === 'my-doctors' ? 'bg-blue-600 text-white' : 'bg-zinc-900 text-gray-400'}`}>My Doctors ({approved.length})</button>
        <button onClick={() => setActiveTab('search')} className={`px-4 py-2 rounded-lg text-sm font-medium ${activeTab === 'search' ? 'bg-blue-600 text-white' : 'bg-zinc-900 text-gray-400'}`}>Search Doctors</button>
      </div>

      {/* Pending Requests */}
      {pending.length > 0 && activeTab === 'my-doctors' && (
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4">
          <h3 className="text-sm font-medium text-yellow-400 mb-2 flex items-center gap-2"><Clock className="w-4 h-4" /> Pending ({pending.length})</h3>
          <div className="space-y-2">
            {pending.map(link => (
              <div key={link.id} className="flex items-center justify-between bg-zinc-900/50 rounded-lg p-3">
                <div><p className="text-sm font-medium text-white">Dr. {link.doctorName}</p><p className="text-xs text-gray-500">{link.doctorSpecialty}</p></div>
                <span className="text-xs text-yellow-400 bg-yellow-500/10 px-2 py-1 rounded">Awaiting approval</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Approved Doctors */}
      {activeTab === 'my-doctors' && (
        <div className="space-y-3">
          {approved.length === 0 ? (
            <div className="text-center py-12 bg-zinc-900 border border-zinc-800 rounded-xl">
              <Stethoscope className="w-12 h-12 text-gray-600 mx-auto mb-3" />
              <p className="text-gray-400">No approved doctors yet</p>
            </div>
          ) : approved.map(link => (
            <div key={link.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-emerald-500/20 rounded-full flex items-center justify-center"><Stethoscope className="w-5 h-5 text-emerald-400" /></div>
                  <div><h3 className="font-medium text-sm text-white">Dr. {link.doctorName}</h3><p className="text-xs text-gray-400">{link.doctorSpecialty || 'Doctor'}</p>{link.frequency && <span className="text-xs text-blue-400">Visit: {link.frequency}</span>}</div>
                </div>
                <CheckCircle2 className="w-5 h-5 text-emerald-500" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button 
                  onClick={() => onOpenVisitModal(link)}
                  className="bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-lg text-sm font-medium flex items-center justify-center gap-2"
                >
                  <Calendar className="w-4 h-4" />Professional Visit
                </button>
                <button 
                  onClick={() => {
                    const params = new URLSearchParams({
                      doctorId: link.doctorId,
                      mrId: mrId,
                      mrName: mrData.name || '',
                      mrCompany: mrData.company || '',
                      mrDivision: mrData.division || '',
                      mrPhone: mrData.phone || '',
                      booking_source: 'mr_referral'
                    });
                    window.location.href = `/?${params.toString()}`;
                  }}
                  className="bg-zinc-800 hover:bg-zinc-700 text-white py-2.5 rounded-lg text-sm font-medium flex items-center justify-center gap-2"
                >
                  <ClipboardList className="w-4 h-4" />Book for Patient
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Search Doctors */}
      {activeTab === 'search' && (
        <div className="space-y-3">
          <div className="flex gap-2">
            <button onClick={() => { setSearchType('pincode'); setDoctors([]); }} className={`px-3 py-1.5 rounded-lg text-xs font-medium ${searchType === 'pincode' ? 'bg-blue-600 text-white' : 'bg-zinc-900 text-gray-400'}`}>By Pincode</button>
            <button onClick={() => { setSearchType('name'); setDoctors([]); }} className={`px-3 py-1.5 rounded-lg text-xs font-medium ${searchType === 'name' ? 'bg-blue-600 text-white' : 'bg-zinc-900 text-gray-400'}`}>By Name</button>
          </div>
          <div className="flex gap-2">
            <div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" /><Input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder={searchType === 'pincode' ? 'Enter pincode' : 'Enter doctor name'} className="pl-10 bg-zinc-800 border-zinc-700 text-white" onKeyDown={e => e.key === 'Enter' && handleSearch()} /></div>
            <Button onClick={handleSearch} disabled={loading} className="bg-blue-600 hover:bg-blue-700">{loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4 text-white" />}</Button>
          </div>
          <div className="space-y-3">
            {doctors.map(doctor => {
              const existing = mrLinks.find(l => l.doctorId === doctor.id);
              const spec = doctor.specialization || doctor.specialties?.[0] || 'Doctor';
              return (
                <div key={doctor.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-zinc-800 rounded-full flex items-center justify-center"><Stethoscope className="w-5 h-5 text-gray-400" /></div>
                      <div>
                        <h3 className="font-medium text-sm text-white">Dr. {doctor.name}</h3>
                        <p className="text-xs text-gray-400">{spec}</p>
                        {doctor.address && <p className="text-xs text-gray-500 flex items-center gap-1"><MapPin className="w-3 h-3" />{doctor.address}</p>}
                        {doctor.pincode && <p className="text-xs text-gray-500">Pin: {doctor.pincode}</p>}
                      </div>
                    </div>
                    {existing ? (
                      <span className={`text-xs px-2 py-1 rounded-full ${existing.status === 'approved' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-yellow-500/10 text-yellow-400'}`}>{existing.status === 'approved' ? 'Approved' : 'Pending'}</span>
                    ) : (
                      <Button size="sm" onClick={() => sendRequest(doctor.id, doctor.name, spec)} disabled={sendingRequest === doctor.id} className="bg-blue-600 hover:bg-blue-700 text-xs text-white">
                        {sendingRequest === doctor.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <><Send className="w-3 h-3 mr-1" />Request</>}
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          {doctors.length === 0 && !loading && searchQuery && <p className="text-center text-gray-500 py-8">No doctors found</p>}
        </div>
      )}
    </div>
  );
}
