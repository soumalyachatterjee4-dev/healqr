import { useState, useEffect, useRef } from 'react';
import { Search, LogOut, QrCode, Clock, Users, User, Download, Share2, CalendarDays, UserPlus, IndianRupee } from 'lucide-react';
import HealthTipBanner from './HealthTipBanner';
import QRCode from 'react-qr-code';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card, CardContent } from './ui/card';
import { toast } from 'sonner';
import { db } from '../lib/firebase/config';
import {
  collection, query, where, getDocs, doc, getDoc, orderBy, Timestamp
} from 'firebase/firestore';
import healqrLogo from '../assets/healqr.logo.png';

interface ReferrerDashboardProps {
  referrerId: string;
  referrerPhone: string;
  onLogout: () => void;
  onRegisterRedirect?: () => void;
}

interface DoctorResult {
  id: string;
  name: string;
  specialty: string;
  phone: string;
  address: string;
  city: string;
  profileSlug?: string;
  useDrPrefix?: boolean;
}

interface ReferralRecord {
  id: string;
  doctorName: string;
  doctorSpecialty: string;
  patientName: string;
  patientPhone: string;
  createdAt: any;
  status: string;
  seenAt?: any;
  referrerPayment?: {
    amount: number;
    date: string;
    note: string;
    paidAt: any;
  };
}

export default function ReferrerDashboard({ referrerId, referrerPhone, onLogout, onRegisterRedirect }: ReferrerDashboardProps) {
  const [activeTab, setActiveTab] = useState<'refer' | 'history'>('refer');
  const [searchTerm, setSearchTerm] = useState('');
  const [searching, setSearching] = useState(false);
  const [doctorResults, setDoctorResults] = useState<DoctorResult[]>([]);
  const [selectedDoctor, setSelectedDoctor] = useState<DoctorResult | null>(null);
  const [referralHistory, setReferralHistory] = useState<ReferralRecord[]>([]);
  const [filteredHistory, setFilteredHistory] = useState<ReferralRecord[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [referrerName, setReferrerName] = useState('');
  const [referrerRole, setReferrerRole] = useState('');
  const [totalReferrals, setTotalReferrals] = useState(0);

  // Date filter
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // QR state
  const [showQR, setShowQR] = useState(false);
  const qrRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setReferrerName(localStorage.getItem('referrer_name') || '');
    setReferrerRole(localStorage.getItem('referrer_role') || '');
    loadHistory();
    loadStats();
  }, []);

  // Apply date filter when dates or history changes
  useEffect(() => {
    if (!dateFrom && !dateTo) {
      setFilteredHistory(referralHistory);
      return;
    }
    const from = dateFrom ? new Date(dateFrom) : null;
    const to = dateTo ? new Date(dateTo + 'T23:59:59') : null;
    setFilteredHistory(referralHistory.filter(r => {
      if (!r.createdAt?.toDate) return true;
      const d = r.createdAt.toDate();
      if (from && d < from) return false;
      if (to && d > to) return false;
      return true;
    }));
  }, [dateFrom, dateTo, referralHistory]);

  const loadStats = async () => {
    if (!referrerId || !db) return;
    try {
      const refDoc = await getDoc(doc(db, 'referrers', referrerId));
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
        collection(db, 'referrers', referrerId, 'referralHistory'),
        orderBy('createdAt', 'desc')
      );
      const snap = await getDocs(q);
      const records = snap.docs.map(d => ({ id: d.id, ...d.data() })) as ReferralRecord[];
      setReferralHistory(records);
      setFilteredHistory(records);
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
    if (!db) return;
    setSearching(true);
    setDoctorResults([]);
    setSelectedDoctor(null);
    setShowQR(false);
    try {
      const q = query(collection(db, 'doctors'));
      const snap = await getDocs(q);
      const term = searchTerm.trim().toLowerCase();
      const results: DoctorResult[] = [];

      snap.docs.forEach(d => {
        const data = d.data();
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
            profileSlug: data.profileSlug || '',
            useDrPrefix: data.useDrPrefix !== false,
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

  const selectDoctor = (doctor: DoctorResult) => {
    setSelectedDoctor(doctor);
    setShowQR(true);
  };

  const getReferralUrl = () => {
    if (!selectedDoctor) return '';
    const baseUrl = window.location.origin;
    // Use profile slug if available, otherwise fallback to doctorId
    if (selectedDoctor.profileSlug) {
      return `${baseUrl}/dr/${selectedDoctor.profileSlug}?refBy=${referrerId}`;
    }
    return `${baseUrl}/?doctorId=${selectedDoctor.id}&refBy=${referrerId}`;
  };

  const getRegistrationQRUrl = () => {
    return `${window.location.origin}/?page=referrer-register`;
  };

  const downloadQR = () => {
    if (!qrRef.current) return;
    const svg = qrRef.current.querySelector('svg');
    if (!svg) return;

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const svgData = new XMLSerializer().serializeToString(svg);
    const img = new Image();
    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);

    img.onload = () => {
      canvas.width = 1024; // Higher resolution for download
      canvas.height = 1024;
      if (ctx) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, 1024, 1024);
        ctx.drawImage(img, 0, 0, 1024, 1024);
        
        // Draw logo in the center
        const logoImg = new Image();
        logoImg.onload = () => {
          const logoSize = 160;
          const x = (1024 - logoSize) / 2;
          const y = (1024 - logoSize) / 2;
          
          // Background circle for logo
          ctx.beginPath();
          ctx.arc(512, 512, 90, 0, Math.PI * 2);
          ctx.fillStyle = '#ffffff';
          ctx.fill();
          
          ctx.drawImage(logoImg, x, y, logoSize, logoSize);
          
          // Add "Powered by HEALQR.COM" branding at the bottom
          ctx.fillStyle = '#6b7280';
          ctx.font = 'bold 24px system-ui, sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('Powered by', 512, 920);
          
          ctx.fillStyle = '#10b981';
          ctx.font = 'bold 32px system-ui, sans-serif';
          ctx.fillText('HEALQR.COM', 512, 965);
          
          const link = document.createElement('a');
          link.download = `Referral-QR-Dr-${selectedDoctor?.name || 'Doctor'}.png`;
          link.href = canvas.toDataURL('image/png');
          link.click();
        };
        logoImg.src = '/icon-192.png';
      }
      URL.revokeObjectURL(url);
    };
    img.src = url;
  };

  const shareViaWhatsApp = () => {
    if (!selectedDoctor) return;
    const link = getReferralUrl();
    const message = `Book an appointment with Dr. ${selectedDoctor.name}${selectedDoctor.specialty ? ` (${selectedDoctor.specialty})` : ''} on HealQR:\n${link}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
  };

  const handleLogout = () => {
    localStorage.removeItem('referrer_id');
    localStorage.removeItem('referrer_phone');
    localStorage.removeItem('referrer_name');
    localStorage.removeItem('referrer_role');
    localStorage.removeItem('referrer_organization');
    localStorage.removeItem('referrer_session_expiry');
    onLogout();
  };

  const statusBadge = (status: string) => {
    const map: Record<string, { bg: string; text: string; label: string }> = {
      booked: { bg: 'bg-blue-500/20', text: 'text-blue-400', label: 'Booked' },
      visited: { bg: 'bg-amber-500/20', text: 'text-amber-400', label: 'Visited' },
      seen: { bg: 'bg-emerald-500/20', text: 'text-emerald-400', label: 'Complete' },
      completed: { bg: 'bg-emerald-500/20', text: 'text-emerald-400', label: 'Complete' },
      cancelled: { bg: 'bg-red-500/20', text: 'text-red-400', label: 'Cancel' },
    };
    const s = map[status] || map.booked;
    return <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${s.bg} ${s.text}`}>{s.label}</span>;
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      {/* Header */}
      <div className="border-b border-zinc-800 bg-[#0a0a0a]/80 backdrop-blur-sm sticky top-0 z-40">
        <div className="px-4 lg:px-8 py-4 flex items-center justify-between max-w-4xl mx-auto">
          <div className="flex items-center gap-3">
            <img src={healqrLogo} alt="HealQR" className="h-8 w-auto" />
            <div>
              <h1 className="text-lg font-bold text-white">Referrer Dashboard</h1>
              <p className="text-gray-400 text-xs">{referrerName} • Referrer</p>
            </div>
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
            <QrCode className="w-4 h-4 inline mr-1.5" /> Create Referral QR
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

        {/* Referrer Registration QR link */}
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center">
                <UserPlus className="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <p className="text-white text-sm font-medium">Invite Others to Join</p>
                <p className="text-gray-500 text-[10px]">Share the referrer registration link</p>
              </div>
            </div>
            <Button
              size="sm"
              onClick={() => {
                const url = getRegistrationQRUrl();
                navigator.clipboard.writeText(url).then(() => toast.success('Registration link copied!'));
              }}
              className="bg-purple-600 hover:bg-purple-700 text-white text-xs"
            >
              <Share2 className="w-3 h-3 mr-1" /> Copy Link
            </Button>
          </CardContent>
        </Card>

        {/* Health Tip Card */}
        <HealthTipBanner />

        {activeTab === 'refer' && (
          <>
            {/* Search */}
            <Card className="bg-zinc-900 border-zinc-800">
              <CardContent className="p-5">
                <p className="text-white font-medium text-sm mb-3">Search Doctor by Name, Specialty or City</p>
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
                    <Search className="w-4 h-4 mr-1" /> {searching ? '...' : 'Search'}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Search Results */}
            {doctorResults.length > 0 && (
              <div className="space-y-2">
                <p className="text-gray-400 text-xs">{doctorResults.length} doctor{doctorResults.length !== 1 ? 's' : ''} found — tap to generate referral QR</p>
                {doctorResults.map(dr => (
                  <Card
                    key={dr.id}
                    className={`border cursor-pointer transition-colors ${
                      selectedDoctor?.id === dr.id
                        ? 'bg-emerald-950/30 border-emerald-800/50'
                        : 'bg-zinc-900 border-zinc-800 hover:border-zinc-700'
                    }`}
                    onClick={() => selectDoctor(dr)}
                  >
                    <CardContent className="p-4 flex items-center gap-3">
                      <div className="w-10 h-10 bg-emerald-500/20 rounded-full flex items-center justify-center flex-shrink-0">
                        <User className="w-5 h-5 text-emerald-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white font-medium text-sm">Dr. {dr.name}</p>
                        <p className="text-gray-400 text-xs">{dr.specialty}</p>
                        {dr.city && <p className="text-gray-500 text-[10px]">{dr.city}</p>}
                      </div>
                      <QrCode className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {/* QR Code Display */}
            {showQR && selectedDoctor && (
              <Card className="bg-emerald-950/20 border-emerald-800/50">
                <CardContent className="p-5 space-y-4">
                  <div className="text-center">
                    <p className="text-emerald-400 font-medium text-sm mb-1">
                      Referral QR for Dr. {selectedDoctor.name}
                    </p>
                    <p className="text-gray-400 text-xs">
                      Patient scans this QR → Books appointment → You get credit
                    </p>
                  </div>

                  {/* QR Code */}
                  <div ref={qrRef} className="flex justify-center relative">
                    <div className="bg-white p-4 rounded-xl relative shadow-lg">
                      <QRCode value={getReferralUrl()} size={220} level="H" />
                      {/* Logo overlay */}
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="bg-white p-1.5 rounded-full shadow-md border border-gray-100">
                          <img src="/icon-192.png" alt="Logo" className="w-10 h-10 object-contain" />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Powered by Branding */}
                  <div className="text-center pt-2">
                    <p className="text-gray-500 text-[10px] font-medium uppercase tracking-widest">Powered by</p>
                    <p className="text-emerald-500 text-xs font-bold tracking-tight">HEALQR.COM</p>
                  </div>

                  {/* Referrer info badge */}
                  <div className="text-center">
                    <p className="text-gray-500 text-[10px]">
                      Referrer: {referrerName} ({referrerRole}) • Dr. {selectedDoctor.name} ({selectedDoctor.specialty})
                    </p>
                  </div>

                  {/* URL display */}
                  <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-3">
                    <p className="text-white text-xs break-all font-mono">{getReferralUrl()}</p>
                  </div>

                  {/* Action buttons */}
                  <div className="grid grid-cols-3 gap-2">
                    <Button onClick={downloadQR} className="bg-zinc-800 hover:bg-zinc-700 text-white h-10 text-xs">
                      <Download className="w-4 h-4 mr-1" /> Download
                    </Button>
                    <Button
                      onClick={() => {
                        navigator.clipboard.writeText(getReferralUrl());
                        toast.success('Link copied!');
                      }}
                      className="bg-zinc-800 hover:bg-zinc-700 text-white h-10 text-xs"
                    >
                      <Share2 className="w-4 h-4 mr-1" /> Copy Link
                    </Button>
                    <Button onClick={shareViaWhatsApp} className="bg-green-600 hover:bg-green-700 text-white h-10 text-xs">
                      <Share2 className="w-4 h-4 mr-1" /> WhatsApp
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Empty state */}
            {doctorResults.length === 0 && !searching && !showQR && (
              <div className="text-center py-10">
                <Search className="w-10 h-10 text-zinc-700 mx-auto mb-3" />
                <p className="text-gray-500 text-sm">Search for a doctor to generate a referral QR code</p>
                <p className="text-gray-600 text-xs mt-1">Patients who book via your QR will be tracked as your referral</p>
              </div>
            )}
          </>
        )}

        {activeTab === 'history' && (
          <>
            {/* Date Filter */}
            <Card className="bg-zinc-900 border-zinc-800">
              <CardContent className="p-4">
                <div className="flex items-center gap-3 flex-wrap">
                  <CalendarDays className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <Input
                      type="date"
                      value={dateFrom}
                      onChange={e => setDateFrom(e.target.value)}
                      className="bg-zinc-800 border-zinc-700 text-white text-xs h-9 flex-1"
                    />
                    <span className="text-gray-500 text-xs">to</span>
                    <Input
                      type="date"
                      value={dateTo}
                      onChange={e => setDateTo(e.target.value)}
                      className="bg-zinc-800 border-zinc-700 text-white text-xs h-9 flex-1"
                    />
                  </div>
                  {(dateFrom || dateTo) && (
                    <button
                      onClick={() => { setDateFrom(''); setDateTo(''); }}
                      className="text-gray-500 text-xs hover:text-white"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </CardContent>
            </Card>

            {loadingHistory ? (
              <div className="text-center py-12 text-gray-500">Loading...</div>
            ) : filteredHistory.length === 0 ? (
              <div className="text-center py-12">
                <Clock className="w-10 h-10 text-zinc-700 mx-auto mb-3" />
                <p className="text-gray-500 text-sm">No referrals found</p>
                <p className="text-gray-600 text-xs mt-1">When patients book via your QR, they'll appear here</p>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-gray-500 text-xs">{filteredHistory.length} referral{filteredHistory.length !== 1 ? 's' : ''}</p>
                {filteredHistory.map(r => (
                  <Card key={r.id} className="bg-zinc-900 border-zinc-800">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-white text-sm font-medium">{r.patientName}</p>
                          <p className="text-gray-400 text-xs">→ Dr. {r.doctorName} {r.doctorSpecialty ? `(${r.doctorSpecialty})` : ''}</p>
                        </div>
                        <div className="text-right">
                          {statusBadge(r.status)}
                          {r.createdAt?.toDate && (
                            <p className="text-gray-600 text-[10px] mt-1">{r.createdAt.toDate().toLocaleDateString('en-IN')}</p>
                          )}
                        </div>
                      </div>
                      {r.seenAt?.toDate && (
                        <p className="text-emerald-400/70 text-[10px] mt-1">
                          ✓ Consultation done on {r.seenAt.toDate().toLocaleDateString('en-IN')}
                        </p>
                      )}
                      {r.referrerPayment && (
                        <div className="flex items-center gap-2 mt-1 pt-1 border-t border-zinc-800">
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold flex items-center gap-1">
                            <IndianRupee className="w-3 h-3" /> {r.referrerPayment.amount} Received
                          </span>
                          {r.referrerPayment.date && (
                            <span className="text-[10px] text-gray-500">on {r.referrerPayment.date}</span>
                          )}
                          {r.referrerPayment.note && (
                            <span className="text-[10px] text-gray-600">• {r.referrerPayment.note}</span>
                          )}
                        </div>
                      )}
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
