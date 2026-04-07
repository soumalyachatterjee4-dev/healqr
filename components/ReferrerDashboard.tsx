import { useState, useEffect } from 'react';
import { Search, Share2, Copy, Clock, Users, LogOut, ExternalLink, CheckCircle, User } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card, CardContent } from './ui/card';
import { toast } from 'sonner';
import { db } from '../lib/firebase/config';
import {
  collection, query, where, getDocs, doc, getDoc, addDoc, Timestamp, orderBy, updateDoc, increment
} from 'firebase/firestore';

interface ReferrerDashboardProps {
  referrerId: string;
  referrerPhone: string;
  onLogout: () => void;
}

interface DoctorResult {
  id: string;
  name: string;
  specialty: string;
  phone: string;
  address: string;
  city: string;
}

interface ReferralRecord {
  id: string;
  doctorName: string;
  doctorSpecialty: string;
  patientName: string;
  patientPhone: string;
  createdAt: any;
  status: string;
}

export default function ReferrerDashboard({ referrerId, referrerPhone, onLogout }: ReferrerDashboardProps) {
  const [activeTab, setActiveTab] = useState<'refer' | 'history'>('refer');
  const [searchTerm, setSearchTerm] = useState('');
  const [searching, setSearching] = useState(false);
  const [doctorResults, setDoctorResults] = useState<DoctorResult[]>([]);
  const [selectedDoctor, setSelectedDoctor] = useState<DoctorResult | null>(null);
  const [referralHistory, setReferralHistory] = useState<ReferralRecord[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [referrerName, setReferrerName] = useState('');
  const [referrerRole, setReferrerRole] = useState('');
  const [totalReferrals, setTotalReferrals] = useState(0);

  // Sharing state
  const [generatedLink, setGeneratedLink] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);

  useEffect(() => {
    setReferrerName(localStorage.getItem('referrer_name') || '');
    setReferrerRole(localStorage.getItem('referrer_role') || '');
    loadHistory();
    loadStats();
  }, []);

  const loadStats = async () => {
    if (!referrerId || !db) return;
    try {
      const refDoc = await getDoc(doc(db!, 'referrers', referrerId));
      if (refDoc.exists()) {
        setTotalReferrals(refDoc.data().totalReferrals || 0);
      }
    } catch {}
  };

  const loadHistory = async () => {
    if (!referrerId || !db) return;
    setLoadingHistory(true);
    try {
      const q = query(
        collection(db!, 'referrers', referrerId, 'referralHistory'),
        orderBy('createdAt', 'desc')
      );
      const snap = await getDocs(q);
      setReferralHistory(snap.docs.map(d => ({ id: d.id, ...d.data() })) as ReferralRecord[]);
    } catch (err) {
      console.error('History load error:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  const searchDoctors = async () => {
    if (!searchTerm.trim() || searchTerm.trim().length < 2) {
      toast.error('Enter at least 2 characters to search');
      return;
    }
    setSearching(true);
    setDoctorResults([]);
    setSelectedDoctor(null);
    setGeneratedLink('');
    try {
      const q = query(collection(db!, 'doctors'));
      const snap = await getDocs(q);
      const term = searchTerm.trim().toLowerCase();
      const results: DoctorResult[] = [];

      snap.docs.forEach(d => {
        const data = d.data();
        if (data.referralAcceptingActive === false) return; // Doctor opted out
        const name = (data.name || '').toLowerCase();
        const specialty = (data.specialty || data.specialities?.[0] || '').toLowerCase();
        const city = (data.city || '').toLowerCase();

        if (name.includes(term) || specialty.includes(term) || city.includes(term)) {
          results.push({
            id: d.id,
            name: data.name || 'Unknown Doctor',
            specialty: data.specialty || data.specialities?.[0] || '',
            phone: data.phone || '',
            address: data.address || '',
            city: data.city || '',
          });
        }
      });

      setDoctorResults(results.slice(0, 20));
      if (results.length === 0) toast('No doctors found matching your search');
    } catch (err) {
      console.error('Search error:', err);
      toast.error('Search failed');
    } finally {
      setSearching(false);
    }
  };

  const generateBookingLink = (doctor: DoctorResult) => {
    setSelectedDoctor(doctor);
    const baseUrl = window.location.origin;
    const link = `${baseUrl}/?doctorId=${doctor.id}&refBy=${referrerId}`;
    setGeneratedLink(link);
    setCopiedLink(false);
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(generatedLink);
      setCopiedLink(true);
      toast.success('Link copied! Share with the patient.');
      setTimeout(() => setCopiedLink(false), 3000);
    } catch {
      toast.error('Copy failed — please copy manually');
    }
  };

  const shareViaWhatsApp = () => {
    if (!selectedDoctor) return;
    const message = `Book an appointment with ${selectedDoctor.name}${selectedDoctor.specialty ? ` (${selectedDoctor.specialty})` : ''} on HealQR:\n${generatedLink}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
  };

  const handleLogout = () => {
    localStorage.removeItem('referrer_id');
    localStorage.removeItem('referrer_phone');
    localStorage.removeItem('referrer_name');
    localStorage.removeItem('referrer_role');
    localStorage.removeItem('referrer_session_expiry');
    onLogout();
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      {/* Header */}
      <div className="border-b border-zinc-800 bg-[#0a0a0a]/80 backdrop-blur-sm sticky top-0 z-40">
        <div className="px-4 lg:px-8 py-4 flex items-center justify-between max-w-4xl mx-auto">
          <div>
            <h1 className="text-lg font-bold text-white">Referrer Dashboard</h1>
            <p className="text-gray-400 text-xs">{referrerName} • {referrerRole}</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-emerald-400 text-lg font-bold">{totalReferrals}</p>
              <p className="text-gray-500 text-[10px]">Referrals</p>
            </div>
            <button onClick={handleLogout} className="p-2 hover:bg-zinc-800 rounded-lg">
              <LogOut className="w-5 h-5 text-gray-400" />
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="max-w-4xl mx-auto px-4 lg:px-8">
        <div className="flex border-b border-zinc-800 mt-2">
          <button
            onClick={() => setActiveTab('refer')}
            className={`pb-3 px-4 text-sm font-medium transition-colors relative ${activeTab === 'refer' ? 'text-emerald-400' : 'text-gray-400 hover:text-gray-300'}`}
          >
            <Share2 className="w-4 h-4 inline mr-1.5" /> Refer Patient
            {activeTab === 'refer' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-500 rounded-t-full" />}
          </button>
          <button
            onClick={() => { setActiveTab('history'); loadHistory(); }}
            className={`pb-3 px-4 text-sm font-medium transition-colors relative ${activeTab === 'history' ? 'text-emerald-400' : 'text-gray-400 hover:text-gray-300'}`}
          >
            <Clock className="w-4 h-4 inline mr-1.5" /> My Referrals
            {activeTab === 'history' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-500 rounded-t-full" />}
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 lg:px-8 py-6 space-y-6">
        {activeTab === 'refer' && (
          <>
            {/* Search */}
            <Card className="bg-zinc-900 border-zinc-800">
              <CardContent className="p-5">
                <p className="text-white font-medium text-sm mb-3">Search Doctor by Name or Specialty</p>
                <div className="flex gap-2">
                  <Input
                    placeholder="e.g., Sharma, Cardiologist, ENT..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && searchDoctors()}
                    className="bg-zinc-800 border-zinc-700 text-white flex-1"
                  />
                  <Button
                    onClick={searchDoctors}
                    disabled={searching}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white"
                  >
                    <Search className="w-4 h-4 mr-1" /> {searching ? 'Searching...' : 'Search'}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Search Results */}
            {doctorResults.length > 0 && (
              <div className="space-y-2">
                <p className="text-gray-400 text-xs">{doctorResults.length} doctor{doctorResults.length !== 1 ? 's' : ''} found</p>
                {doctorResults.map(doc => (
                  <Card
                    key={doc.id}
                    className={`border cursor-pointer transition-colors ${
                      selectedDoctor?.id === doc.id
                        ? 'bg-emerald-950/30 border-emerald-800/50'
                        : 'bg-zinc-900 border-zinc-800 hover:border-zinc-700'
                    }`}
                    onClick={() => generateBookingLink(doc)}
                  >
                    <CardContent className="p-4 flex items-center gap-3">
                      <div className="w-10 h-10 bg-emerald-500/20 rounded-full flex items-center justify-center flex-shrink-0">
                        <User className="w-5 h-5 text-emerald-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white font-medium text-sm">{doc.name}</p>
                        <p className="text-gray-400 text-xs">{doc.specialty}</p>
                        {doc.city && <p className="text-gray-500 text-[10px]">{doc.city}</p>}
                      </div>
                      <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-8">
                        <Share2 className="w-3 h-3 mr-1" /> Create Link
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {/* Generated Link */}
            {generatedLink && selectedDoctor && (
              <Card className="bg-emerald-950/20 border-emerald-800/50">
                <CardContent className="p-5 space-y-4">
                  <div>
                    <p className="text-emerald-400 font-medium text-sm mb-1">
                      Booking Link for Dr. {selectedDoctor.name}
                    </p>
                    <p className="text-gray-400 text-xs">Share this link with the patient. When they book, your name will appear on the doctor's dashboard.</p>
                  </div>

                  <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-3 flex items-center gap-2">
                    <p className="text-white text-xs flex-1 break-all font-mono">{generatedLink}</p>
                    <button
                      onClick={copyLink}
                      className={`p-2 rounded-lg flex-shrink-0 transition-colors ${copiedLink ? 'bg-emerald-500/20 text-emerald-400' : 'bg-zinc-800 text-gray-400 hover:text-white'}`}
                    >
                      {copiedLink ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>

                  <div className="flex gap-2">
                    <Button onClick={copyLink} className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-white h-10">
                      <Copy className="w-4 h-4 mr-1.5" /> {copiedLink ? 'Copied!' : 'Copy Link'}
                    </Button>
                    <Button onClick={shareViaWhatsApp} className="flex-1 bg-green-600 hover:bg-green-700 text-white h-10">
                      <ExternalLink className="w-4 h-4 mr-1.5" /> Share on WhatsApp
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* No results hint */}
            {doctorResults.length === 0 && !searching && (
              <div className="text-center py-10">
                <Search className="w-10 h-10 text-zinc-700 mx-auto mb-3" />
                <p className="text-gray-500 text-sm">Search for a doctor to generate a booking link</p>
                <p className="text-gray-600 text-xs mt-1">Patients who book via your link will be tracked as your referral</p>
              </div>
            )}
          </>
        )}

        {activeTab === 'history' && (
          <>
            {loadingHistory ? (
              <div className="text-center py-12 text-gray-500">Loading...</div>
            ) : referralHistory.length === 0 ? (
              <div className="text-center py-12">
                <Clock className="w-10 h-10 text-zinc-700 mx-auto mb-3" />
                <p className="text-gray-500 text-sm">No referrals yet</p>
                <p className="text-gray-600 text-xs mt-1">When patients book via your links, they'll appear here</p>
              </div>
            ) : (
              <div className="space-y-2">
                {referralHistory.map(r => (
                  <Card key={r.id} className="bg-zinc-900 border-zinc-800">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-white text-sm font-medium">{r.patientName}</p>
                          <p className="text-gray-400 text-xs">→ Dr. {r.doctorName} {r.doctorSpecialty ? `(${r.doctorSpecialty})` : ''}</p>
                        </div>
                        <div className="text-right">
                          <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                            r.status === 'booked' ? 'bg-emerald-500/20 text-emerald-400' :
                            r.status === 'completed' ? 'bg-blue-500/20 text-blue-400' :
                            'bg-zinc-800 text-gray-400'
                          }`}>
                            {r.status === 'booked' ? 'Booked' : r.status === 'completed' ? 'Visited' : r.status}
                          </span>
                          {r.createdAt?.toDate && (
                            <p className="text-gray-600 text-[10px] mt-1">{r.createdAt.toDate().toLocaleDateString('en-IN')}</p>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
