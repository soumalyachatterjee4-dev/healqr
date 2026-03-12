import { useState, useEffect } from 'react';
import { FlaskConical, Search, Calendar, DollarSign, TrendingUp, FileText, Edit2, Save, X, Phone, ArrowLeft, Info, User } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card } from './ui/card';
import { toast } from 'sonner';
import ClinicSidebar from './ClinicSidebar';

interface ClinicLabReferralManagerProps {
  clinicName?: string;
  clinicId?: string;
  onLogout?: () => void;
  onMenuChange?: (menu: string) => void;
  activeAddOns?: string[];
  isSidebarCollapsed?: boolean;
  setIsSidebarCollapsed?: (collapsed: boolean) => void;
}

interface Referral {
  id: string;
  bookingId: string;
  patientName: string;
  patientPhone: string;
  doctorName: string;
  doctorId: string;
  consultationDate: string;
  testsPrescribed: string;
  referredLab: string;
  referralAmount: string;
  receivedDate: string;
  isManuallyUpdated: boolean;
  timestamp: number; // For sorting and 90-day cleanup
}

export default function ClinicLabReferralManager({
  clinicId,
  onLogout,
  onMenuChange,
  activeAddOns = [],
  isSidebarCollapsed = false,
  setIsSidebarCollapsed
}: ClinicLabReferralManagerProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    testsPrescribed: '',
    referredLab: '',
    referralAmount: '',
    receivedDate: ''
  });

  const STORAGE_KEY = `healqr_clinic_lab_referrals_${clinicId || 'default'}`;
  const NINETY_DAYS_MS = 90 * 24 * 60 * 60 * 1000;

  // Load referrals from localStorage and auto-cleanup old entries
  useEffect(() => {
    loadReferralsFromStorage();
    cleanupOldEntries();
  }, [clinicId]);

  // Load today's completed consultations from Firestore
  useEffect(() => {
    if (clinicId) {
      loadConsultations();
    }
  }, [clinicId]);

  // Load consultations when date filter changes
  useEffect(() => {
    if (dateFilter && clinicId) {
      loadConsultations(new Date(dateFilter));
    }
  }, [dateFilter, clinicId]);

  const loadReferralsFromStorage = () => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed: Referral[] = JSON.parse(stored);
        setReferrals(parsed);
      } else {
        setReferrals([]);
      }
      setLoading(false);
    } catch (error) {
      console.error('Error loading from localStorage:', error);
      setLoading(false);
    }
  };

  const saveReferralsToStorage = (updatedReferrals: Referral[]) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedReferrals));
      setReferrals(updatedReferrals);
    } catch (error) {
      console.error('Error saving to localStorage:', error);
      toast.error('Failed to save data');
    }
  };

  const cleanupOldEntries = () => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) return;

      const parsed: Referral[] = JSON.parse(stored);
      const now = Date.now();

      // Filter out entries older than 90 days
      const cleaned = parsed.filter(ref => {
        const age = now - ref.timestamp;
        return age < NINETY_DAYS_MS;
      });

      // Save back if any were removed
      if (cleaned.length !== parsed.length) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(cleaned));
        console.log(`🗑️ Cleaned ${parsed.length - cleaned.length} old entries (>90 days)`);
      }
    } catch (error) {
      console.error('Error cleaning up old entries:', error);
    }
  };

  const loadConsultations = async (targetDate: Date = new Date()) => {
    if (!clinicId) return;

    try {
      setLoading(true);
      const { db } = await import('../lib/firebase/config');
      if (!db) throw new Error('Database not initialized');
      const { collection, query, where, getDocs } = await import('firebase/firestore');
      const { decrypt } = await import('../utils/encryptionService');

      // Use provided date or default to today (Local Time)
      const queryDate = targetDate;

      // Query all bookings for this clinic that are marked as seen
      const bookingsRef = collection(db, 'bookings');
      const q = query(
        bookingsRef,
        where('clinicId', '==', clinicId),
        where('isMarkedSeen', '==', true)
      );

      console.log('🔍 Fetching Clinic consultations:', clinicId, 'Date:', queryDate.toLocaleDateString());
      const snapshot = await getDocs(q);
      console.log('📄 Total seen bookings found for clinic:', snapshot.size);

      const existingReferrals = [...referrals];
      let newCount = 0;

      // Filter consultations for the target date in memory
      snapshot.forEach((doc) => {
        const data = doc.data();
        const bookingId = doc.id;

        // Check if this booking is from the target date (using Local Time)
        let isTargetDate = false;
        let bookingDate: Date | null = null;

        if (data.date) {
          if (typeof data.date === 'string') {
            bookingDate = new Date(data.date);
          } else if (data.date.toDate) {
            bookingDate = data.date.toDate();
          }
        } else if (data.markedSeenAt) {
          if (typeof data.markedSeenAt === 'string') {
            bookingDate = new Date(data.markedSeenAt);
          } else if (data.markedSeenAt.toDate) {
            bookingDate = data.markedSeenAt.toDate();
          }
        }

        if (bookingDate) {
          isTargetDate = bookingDate.getDate() === queryDate.getDate() &&
                         bookingDate.getMonth() === queryDate.getMonth() &&
                         bookingDate.getFullYear() === queryDate.getFullYear();
        }

        if (!isTargetDate) return;

        // Check if already exists in local storage
        const exists = existingReferrals.some(ref => ref.bookingId === bookingId);

        if (!exists) {
          // Decrypt sensitive fields if needed
          let patientName = data.patientName || data.name || 'Unknown Patient';
          let patientPhone = data.phone || data.whatsappNumber || '';

          if (patientName === 'Unknown Patient' && data.patientName_encrypted) {
            try {
              patientName = decrypt(data.patientName_encrypted);
            } catch (e) {
              console.warn('Failed to decrypt patient name', e);
            }
          }

          if (!patientPhone && data.whatsappNumber_encrypted) {
            try {
              patientPhone = decrypt(data.whatsappNumber_encrypted);
            } catch (e) {
              console.warn('Failed to decrypt phone', e);
            }
          }

          const newReferral: Referral = {
            id: bookingId,
            bookingId: bookingId,
            patientName: patientName,
            patientPhone: patientPhone,
            doctorName: data.doctorName || 'Unknown Doctor',
            doctorId: data.doctorId || '',
            consultationDate: data.date ? (typeof data.date === 'string' ? new Date(data.date).toLocaleDateString('en-IN') : new Date(data.date.toDate()).toLocaleDateString('en-IN')) : new Date().toLocaleDateString('en-IN'),
            testsPrescribed: '',
            referredLab: '',
            referralAmount: '',
            receivedDate: '',
            isManuallyUpdated: false,
            timestamp: data.date ? (typeof data.date === 'string' ? new Date(data.date).getTime() : data.date.toDate().getTime()) : Date.now()
          };
          existingReferrals.push(newReferral);
          newCount++;
        }
      });

      if (newCount > 0) {
        saveReferralsToStorage(existingReferrals);
        toast.success(`${newCount} consultations loaded for ${queryDate.toLocaleDateString()}`);
      }

      setLoading(false);
    } catch (error) {
      console.error('Error loading consultations:', error);
      toast.error('Failed to load consultations');
      setLoading(false);
    }
  };

  const handleEdit = (referral: Referral) => {
    setEditingId(referral.id);
    setEditForm({
      testsPrescribed: referral.testsPrescribed,
      referredLab: referral.referredLab,
      referralAmount: referral.referralAmount,
      receivedDate: referral.receivedDate
    });
  };

  const handleSave = (referralId: string) => {
    try {
      const updated = referrals.map(ref =>
        ref.id === referralId
          ? {
              ...ref,
              ...editForm,
              isManuallyUpdated: true
            }
          : ref
      );

      saveReferralsToStorage(updated);
      setEditingId(null);
      toast.success('Lab referral details updated');
    } catch (error) {
      console.error('Error updating referral:', error);
      toast.error('Failed to update referral details');
    }
  };

  const handleCancel = () => {
    setEditingId(null);
    setEditForm({
      testsPrescribed: '',
      referredLab: '',
      referralAmount: '',
      receivedDate: ''
    });
  };

  // Calculate statistics
  const totalReferrals = referrals.length;
  const completedReferrals = referrals.filter(ref => ref.isManuallyUpdated).length;
  const totalAmount = referrals
    .filter(ref => ref.referralAmount)
    .reduce((sum, ref) => sum + (parseFloat(ref.referralAmount) || 0), 0);

  // Filter referrals by search and date
  const filteredReferrals = referrals.filter(ref => {
    const matchesSearch = !searchQuery ||
      ref.patientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ref.patientPhone.includes(searchQuery) ||
      ref.doctorName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ref.referredLab.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ref.testsPrescribed.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesDate = !dateFilter || ref.consultationDate === new Date(dateFilter).toLocaleDateString('en-IN');

    return matchesSearch && matchesDate;
  }).sort((a, b) => b.timestamp - a.timestamp);

  return (
    <div className="min-h-screen bg-black text-white flex flex-col lg:flex-row">
      {/* Sidebar */}
      <ClinicSidebar
        activeMenu="lab-referral"
        onMenuChange={onMenuChange || (() => {})}
        onLogout={onLogout || (() => {})}
        isOpen={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed && setIsSidebarCollapsed(!isSidebarCollapsed)}
        activeAddOns={activeAddOns}
      />

      {/* Main Content */}
      <div className={`flex-1 transition-all duration-300 ${isSidebarCollapsed ? 'lg:ml-20' : 'lg:ml-64'} flex flex-col min-h-screen`}>
        {/* Header */}
        <header className="bg-zinc-900 border-b border-zinc-800 p-4 sticky top-0 z-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {onMenuChange && (
                <button
                  onClick={() => onMenuChange('dashboard')}
                  className="p-2 hover:bg-zinc-800 rounded-lg transition-colors"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
              )}
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-500/10 rounded-lg">
                  <FlaskConical className="w-6 h-6 text-purple-500" />
                </div>
                <div>
                  <h1 className="text-xl font-semibold">Clinic Lab Referral Tracking</h1>
                  <p className="text-sm text-gray-400">Track referrals across all clinic doctors</p>
                </div>
              </div>
            </div>
            <Button
              onClick={() => {
                const targetDate = dateFilter ? new Date(dateFilter) : new Date();
                loadConsultations(targetDate);
              }}
              disabled={loading}
              className="bg-purple-500 hover:bg-purple-600 text-white"
            >
              {loading ? 'Loading...' : 'Refresh'}
            </Button>
          </div>
        </header>

        {/* Main Content Area */}
        <div className="flex-1 p-6 overflow-y-auto w-full max-w-7xl mx-auto space-y-6">
          {/* Important Rules Note Box */}
          <Card className="bg-gradient-to-r from-blue-900/30 to-purple-900/30 border-blue-500/50 p-4">
            <div className="flex items-start gap-3">
              <Info className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
              <div className="space-y-2 text-sm">
                <h3 className="text-blue-300 font-semibold">📋 Clinic Lab Referral Tracking Rules:</h3>
                <ul className="space-y-1 text-gray-300">
                  <li>• <strong>Unified Tracking:</strong> Automatically fetches completed consultations from ALL doctors in this clinic</li>
                  <li>• <strong>Auto-Populate:</strong> Patient details and Doctor name are filled automatically when a consultation is marked as "Seen"</li>
                  <li>• <strong>Manual Tracking:</strong> Add tests, lab names, and commission amounts to track your revenue share</li>
                  <li>• <strong>Privacy:</strong> Data is stored locally in your browser and cleaned up every 90 days</li>
                </ul>
              </div>
            </div>
          </Card>

          {/* Statistics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="bg-zinc-900 border-zinc-800 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm mb-1">Total Consultations</p>
                  <p className="text-white text-2xl font-bold">{totalReferrals}</p>
                </div>
                <div className="p-3 bg-blue-500/10 rounded-lg">
                  <FileText className="w-6 h-6 text-blue-500" />
                </div>
              </div>
            </Card>

            <Card className="bg-zinc-900 border-zinc-800 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm mb-1">Referrals Tracked</p>
                  <p className="text-white text-2xl font-bold">{completedReferrals}</p>
                </div>
                <div className="p-3 bg-blue-500/10 rounded-lg">
                  <TrendingUp className="w-6 h-6 text-blue-500" />
                </div>
              </div>
            </Card>

            <Card className="bg-zinc-900 border-zinc-800 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm mb-1">Total Amount</p>
                  <p className="text-white text-2xl font-bold">₹{totalAmount.toLocaleString()}</p>
                </div>
                <div className="p-3 bg-yellow-500/10 rounded-lg">
                  <DollarSign className="w-6 h-6 text-yellow-500" />
                </div>
              </div>
            </Card>
          </div>

          {/* Search & Filters */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                type="text"
                placeholder="Search by patient, doctor, lab, or test..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-zinc-900 border-zinc-800 text-white"
              />
            </div>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                max={new Date().toISOString().split('T')[0]}
                className="pl-10 bg-zinc-900 border-zinc-800 text-white"
              />
            </div>
          </div>

          {/* Table */}
          <Card className="bg-zinc-900 border-zinc-800 overflow-hidden">
            <div className="p-4 border-b border-zinc-800 bg-zinc-900/50 flex flex-col md:flex-row md:items-center justify-between gap-2">
              <h3 className="text-white font-medium flex items-center gap-2">
                <Calendar className="w-4 h-4 text-purple-500" />
                {dateFilter ? (
                  <>Consultations for: <span className="text-purple-400">{new Date(dateFilter).toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span></>
                ) : (
                  <>Today's Consultations: <span className="text-purple-400">{new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span></>
                )}
              </h3>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-800">
                    <th className="text-left p-4 text-gray-400 font-medium">Patient Details</th>
                    <th className="text-left p-4 text-gray-400 font-medium">Doctor</th>
                    <th className="text-left p-4 text-gray-400 font-medium">Tests Prescribed</th>
                    <th className="text-left p-4 text-gray-400 font-medium">Referred Lab</th>
                    <th className="text-left p-4 text-gray-400 font-medium">Amount</th>
                    <th className="text-left p-4 text-gray-400 font-medium">Received</th>
                    <th className="text-left p-4 text-gray-400 font-medium">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/50">
                  {loading ? (
                    <tr>
                      <td colSpan={7} className="text-center p-12 text-gray-500">Loading consultations...</td>
                    </tr>
                  ) : filteredReferrals.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center p-12 text-gray-500">
                        {searchQuery || dateFilter ? 'No matching referrals found' : 'No seen consultations found for this period'}
                      </td>
                    </tr>
                  ) : (
                    filteredReferrals.map((referral) => (
                      <tr key={referral.id} className="hover:bg-zinc-800/30 transition-colors">
                        <td className="p-4">
                          <div className="font-semibold text-white">{referral.patientName}</div>
                          <div className="text-gray-400 flex items-center gap-1.5 mt-0.5">
                            <Phone className="w-3 h-3" />
                            {referral.patientPhone}
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-2 text-blue-400">
                            <User className="w-3.5 h-3.5" />
                            Dr. {referral.doctorName}
                          </div>
                        </td>
                        <td className="p-4">
                          {editingId === referral.id ? (
                            <Input
                              value={editForm.testsPrescribed}
                              onChange={(e) => setEditForm({ ...editForm, testsPrescribed: e.target.value })}
                              placeholder="e.g., CBC, LFT"
                              className="bg-zinc-800 border-zinc-700 h-9"
                            />
                          ) : (
                            <span className="text-gray-300">{referral.testsPrescribed || '-'}</span>
                          )}
                        </td>
                        <td className="p-4">
                          {editingId === referral.id ? (
                            <Input
                              value={editForm.referredLab}
                              onChange={(e) => setEditForm({ ...editForm, referredLab: e.target.value })}
                              placeholder="Lab name"
                              className="bg-zinc-800 border-zinc-700 h-9"
                            />
                          ) : (
                            <span className="text-gray-300">{referral.referredLab || '-'}</span>
                          )}
                        </td>
                        <td className="p-4">
                          {editingId === referral.id ? (
                            <Input
                              value={editForm.referralAmount}
                              onChange={(e) => setEditForm({ ...editForm, referralAmount: e.target.value })}
                              placeholder="₹"
                              type="number"
                              className="bg-zinc-800 border-zinc-700 h-9 w-24"
                            />
                          ) : (
                            <span className="text-white font-medium">{referral.referralAmount ? `₹${referral.referralAmount}` : '-'}</span>
                          )}
                        </td>
                        <td className="p-4">
                          {editingId === referral.id ? (
                            <Input
                              value={editForm.receivedDate}
                              onChange={(e) => setEditForm({ ...editForm, receivedDate: e.target.value })}
                              type="date"
                              className="bg-zinc-800 border-zinc-700 h-9"
                            />
                          ) : (
                            <span className="text-gray-300">{referral.receivedDate || '-'}</span>
                          )}
                        </td>
                        <td className="p-4 text-right">
                          {editingId === referral.id ? (
                            <div className="flex items-center gap-2">
                              <Button onClick={() => handleSave(referral.id)} size="sm" className="bg-blue-600 hover:bg-blue-700">
                                <Save className="w-4 h-4" />
                              </Button>
                              <Button onClick={handleCancel} size="sm" variant="ghost" className="text-gray-400 hover:text-white">
                                <X className="w-4 h-4" />
                              </Button>
                            </div>
                          ) : (
                            <Button onClick={() => handleEdit(referral)} size="sm" variant="outline" className="border-zinc-700 hover:bg-zinc-800">
                              <Edit2 className="w-4 h-4" />
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
