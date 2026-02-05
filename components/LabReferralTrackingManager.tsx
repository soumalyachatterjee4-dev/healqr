import { useState, useEffect } from 'react';
import { FlaskConical, Plus, Search, Calendar, DollarSign, TrendingUp, FileText, Edit2, Save, X, Phone, ArrowLeft, Info } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { toast } from 'sonner';
import DashboardSidebar from './DashboardSidebar';

interface LabReferralTrackingManagerProps {
  doctorName?: string;
  email?: string;
  onLogout?: () => void;
  onMenuChange?: (menu: string) => void;
  activeAddOns?: string[];
}

interface Referral {
  id: string;
  bookingId: string;
  patientName: string;
  patientPhone: string;
  consultationDate: string;
  testsPrescribed: string;
  referredLab: string;
  referralAmount: string;
  receivedDate: string;
  isManuallyUpdated: boolean;
  timestamp: number; // For sorting and 90-day cleanup
}

export default function LabReferralTrackingManager({
  doctorName,
  email,
  onLogout,
  onMenuChange,
  activeAddOns = []
}: LabReferralTrackingManagerProps = {}) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
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

  const STORAGE_KEY = 'healqr_lab_referrals';
  const NINETY_DAYS_MS = 90 * 24 * 60 * 60 * 1000;

  // Load referrals from localStorage and auto-cleanup old entries
  useEffect(() => {
    loadReferralsFromStorage();
    cleanupOldEntries();
  }, []);

  // Load today's completed consultations from Firestore
  useEffect(() => {
    loadConsultations();
  }, []);

  // Load consultations when date filter changes
  useEffect(() => {
    if (dateFilter) {
      loadConsultations(new Date(dateFilter));
    }
  }, [dateFilter]);

  const loadReferralsFromStorage = () => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed: Referral[] = JSON.parse(stored);
        setReferrals(parsed);
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
    try {
      const userId = localStorage.getItem('userId');
      if (!userId) {
        console.log('No user ID found');
        setLoading(false);
        return;
      }

      const { db } = await import('../lib/firebase/config');
      const { collection, query, where, getDocs } = await import('firebase/firestore');
      const { decrypt } = await import('../utils/encryptionService');
      const doctorId = userId;

      // Use provided date or default to today (Local Time)
      const queryDate = targetDate;
      
      // Query all bookings for this doctor that are marked as seen
      // Note: We fetch all 'seen' bookings and filter by date in memory because
      // Firestore doesn't easily support "date part only" queries on timestamps without a specific field
      const bookingsRef = collection(db, 'bookings');
      const q = query(
        bookingsRef,
        where('doctorId', '==', doctorId),
        where('isMarkedSeen', '==', true)
      );

      console.log('🔍 Fetching consultations for Doctor:', doctorId, 'Date:', queryDate.toLocaleDateString());
      const snapshot = await getDocs(q);
      console.log('📄 Total seen bookings found:', snapshot.size);

      const existingReferrals = [...referrals];
      let newCount = 0;

      // Filter consultations for the target date in memory
      snapshot.forEach((doc) => {
        const data = doc.data();
        const bookingId = doc.id;

        // Check if this booking is from the target date (using Local Time)
        let isTargetDate = false;
        let bookingDate: Date | null = null;

        // Try to get date from 'date' field or 'markedSeenAt'
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

        // Check if already exists in localStorage
        const exists = existingReferrals.some(ref => ref.bookingId === bookingId);
        
        if (!exists) {
          // Decrypt sensitive fields if needed
          let patientName = data.patientName || data.name || 'Unknown Patient';
          let patientPhone = data.phone || data.whatsappNumber || '';

          // If plain fields are missing, try encrypted fields
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
      } else {
        console.log('No new consultations found for date:', queryDate.toLocaleDateString());
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
      // Update in localStorage
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
    // Search filter
    const matchesSearch = !searchQuery || 
      ref.patientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ref.patientPhone.includes(searchQuery) ||
      ref.referredLab.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ref.testsPrescribed.toLowerCase().includes(searchQuery.toLowerCase());

    // Date filter (search within last 90 days)
    const matchesDate = !dateFilter || ref.consultationDate === new Date(dateFilter).toLocaleDateString('en-IN');

    return matchesSearch && matchesDate;
  }).sort((a, b) => b.timestamp - a.timestamp); // Show newest first

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Sidebar */}
      <DashboardSidebar
        activeMenu="lab-referral-tracking"
        onMenuChange={onMenuChange || (() => {})}
        onLogout={onLogout}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        activeAddOns={activeAddOns}
      />

      {/* Main Content */}
      <div className="lg:ml-64 flex flex-col min-h-screen">
        {/* Header */}
        <header className="bg-zinc-900 border-b border-zinc-800 p-4">
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
                  <h1 className="text-xl font-semibold">Lab Referral Tracking</h1>
                  <p className="text-sm text-gray-400">Manage your lab referrals and commissions</p>
                </div>
              </div>
            </div>
            <Button
              onClick={() => { 
                const targetDate = dateFilter ? new Date(dateFilter) : new Date();
                loadConsultations(targetDate); 
                loadReferralsFromStorage(); 
              }}
              disabled={loading}
              className="bg-purple-500 hover:bg-purple-600 text-white"
            >
              {loading ? 'Loading...' : 'Refresh'}
            </Button>
          </div>
        </header>

        {/* Main Content Area */}
        <div className="flex-1 p-6 overflow-y-auto">{renderContent()}</div>
      </div>
    </div>
  );

  function renderContent() {
    return (
      <div className="space-y-6 max-w-7xl mx-auto">
        {/* Important Rules Note Box */}
        <Card className="bg-gradient-to-r from-blue-900/30 to-purple-900/30 border-blue-500/50 p-4">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
            <div className="space-y-2 text-sm">
              <h3 className="text-blue-300 font-semibold">📋 Lab Referral Tracking Rules:</h3>
              <ul className="space-y-1 text-gray-300">
                <li>• <strong>Auto-Fetch:</strong> Date, Patient Name, Mobile Number auto-populated when consultation marked as "Seen"</li>
                <li>• <strong>Manual Entry:</strong> Tests Prescribed, Referred Lab, Referral Amount, Received Date - filled by doctor</li>
                <li>• <strong>Today's View:</strong> By default, only today's completed consultations are displayed</li>
                <li>• <strong>Date Search:</strong> Search within last 90 days using date filter</li>
                <li>• <strong>Storage:</strong> All data stored locally in browser (localStorage)</li>
                <li>• <strong>Auto-Cleanup:</strong> Entries older than 90 days are automatically removed</li>
              </ul>
            </div>
          </div>
        </Card>

        {/* Statistics Cards */}
        <div className="grid md:grid-cols-3 gap-4">
          <Card className="bg-zinc-900 border-zinc-800 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm mb-1">Total Consultations</p>
                <p className="text-white text-2xl">{totalReferrals}</p>
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
                <p className="text-white text-2xl">{completedReferrals}</p>
              </div>
              <div className="p-3 bg-green-500/10 rounded-lg">
                <TrendingUp className="w-6 h-6 text-green-500" />
              </div>
            </div>
          </Card>

          <Card className="bg-zinc-900 border-zinc-800 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm mb-1">Total Amount</p>
                <p className="text-white text-2xl">₹{totalAmount.toLocaleString()}</p>
              </div>
              <div className="p-3 bg-yellow-500/10 rounded-lg">
                <DollarSign className="w-6 h-6 text-yellow-500" />
              </div>
            </div>
          </Card>
        </div>

        {/* Search */}
        <div className="grid md:grid-cols-2 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <Input
              type="text"
              placeholder="Search by patient, lab, or test name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-zinc-900 border-zinc-800 text-white"
            />
          </div>
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <Input
              type="date"
              placeholder="Filter by date (last 90 days)"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              max={new Date().toISOString().split('T')[0]}
              min={new Date(Date.now() - NINETY_DAYS_MS).toISOString().split('T')[0]}
              className="pl-10 bg-zinc-900 border-zinc-800 text-white"
            />
          </div>
        </div>

        {/* Referrals Table */}
        <Card className="bg-zinc-900 border-zinc-800 overflow-hidden">
          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto">
            <div className="p-4 border-b border-zinc-800 bg-zinc-900/50">
              <h3 className="text-white font-medium flex items-center gap-2">
                <Calendar className="w-4 h-4 text-purple-500" />
                {dateFilter ? (
                  <>
                    Consultations for: <span className="text-purple-400">{new Date(dateFilter).toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
                  </>
                ) : (
                  <>
                    Today's Consultations: <span className="text-purple-400">{new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
                  </>
                )}
              </h3>
            </div>
            <table className="w-full">
              <thead>
                <tr className="border-b border-zinc-800">
                  <th className="text-left p-4 text-gray-400 text-sm">Patient Name</th>
                  <th className="text-left p-4 text-gray-400 text-sm">Mobile No</th>
                  <th className="text-left p-4 text-gray-400 text-sm">Tests Prescribed</th>
                  <th className="text-left p-4 text-gray-400 text-sm">Referred Lab</th>
                  <th className="text-left p-4 text-gray-400 text-sm">Referral Amt</th>
                  <th className="text-left p-4 text-gray-400 text-sm">Received Date</th>
                  <th className="text-left p-4 text-gray-400 text-sm">Action</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={7} className="text-center p-8 text-gray-400">
                      Loading consultations...
                    </td>
                  </tr>
                ) : filteredReferrals.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center p-8 text-gray-400">
                      {searchQuery || dateFilter ? 'No referrals found matching your filters' : 'No completed consultations yet. Mark a consultation as "Seen" to add it here.'}
                    </td>
                  </tr>
                ) : (
                  filteredReferrals.map((referral) => (
                    <tr key={referral.id} className="border-b border-zinc-800 hover:bg-zinc-800/50 transition-colors">
                      <td className="p-4 text-white">{referral.patientName}</td>
                      <td className="p-4 text-gray-300">
                        <div className="flex items-center gap-2">
                          <Phone className="w-4 h-4" />
                          {referral.patientPhone}
                        </div>
                      </td>
                      <td className="p-4">
                        {editingId === referral.id ? (
                          <Input
                            value={editForm.testsPrescribed}
                            onChange={(e) => setEditForm({ ...editForm, testsPrescribed: e.target.value })}
                            placeholder="e.g., CBC, LFT, Blood Sugar"
                            className="bg-zinc-800 border-zinc-700 text-white text-sm"
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
                            className="bg-zinc-800 border-zinc-700 text-white text-sm"
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
                            placeholder="₹ Amount"
                            className="bg-zinc-800 border-zinc-700 text-white text-sm"
                            type="number"
                          />
                        ) : (
                          <span className="text-white">{referral.referralAmount ? `₹${referral.referralAmount}` : '-'}</span>
                        )}
                      </td>
                      <td className="p-4">
                        {editingId === referral.id ? (
                          <Input
                            value={editForm.receivedDate}
                            onChange={(e) => setEditForm({ ...editForm, receivedDate: e.target.value })}
                            type="date"
                            className="bg-zinc-800 border-zinc-700 text-white text-sm"
                          />
                        ) : (
                          <span className="text-gray-300">{referral.receivedDate || '-'}</span>
                        )}
                      </td>
                      <td className="p-4">
                        {editingId === referral.id ? (
                          <div className="flex items-center gap-2">
                            <Button
                              onClick={() => handleSave(referral.id)}
                              size="sm"
                              className="bg-green-600 hover:bg-green-700 text-white"
                            >
                              <Save className="w-4 h-4" />
                            </Button>
                            <Button
                              onClick={handleCancel}
                              size="sm"
                              variant="outline"
                              className="border-zinc-700"
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        ) : (
                          <Button
                            onClick={() => handleEdit(referral)}
                            size="sm"
                            variant="outline"
                            className="border-zinc-700"
                          >
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

          {/* Mobile Card View */}
          <div className="md:hidden divide-y divide-zinc-800">
            {loading ? (
              <div className="text-center p-8 text-gray-400">
                Loading consultations...
              </div>
            ) : filteredReferrals.length === 0 ? (
              <div className="text-center p-8 text-gray-400">
                {searchQuery || dateFilter ? 'No referrals found matching your filters' : 'No completed consultations yet. Mark a consultation as "Seen" to add it here.'}
              </div>
            ) : (
              filteredReferrals.map((referral) => (
                <div key={referral.id} className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <h3 className="text-white font-medium">{referral.patientName}</h3>
                      <p className="text-sm text-gray-400 flex items-center gap-1 mt-1">
                        <Phone className="w-3 h-3" />
                        {referral.patientPhone}
                      </p>
                    </div>
                    <Badge className="bg-blue-500/10 text-blue-500 border-blue-500/20">
                      {referral.consultationDate}
                    </Badge>
                  </div>

                  {editingId === referral.id ? (
                    <div className="space-y-3">
                      <div>
                        <label className="text-gray-400 text-xs mb-1 block">Tests Prescribed</label>
                        <Input
                          value={editForm.testsPrescribed}
                          onChange={(e) => setEditForm({ ...editForm, testsPrescribed: e.target.value })}
                          placeholder="e.g., CBC, LFT"
                          className="bg-zinc-800 border-zinc-700 text-white text-sm"
                        />
                      </div>
                      <div>
                        <label className="text-gray-400 text-xs mb-1 block">Referred Lab</label>
                        <Input
                          value={editForm.referredLab}
                          onChange={(e) => setEditForm({ ...editForm, referredLab: e.target.value })}
                          placeholder="Lab name"
                          className="bg-zinc-800 border-zinc-700 text-white text-sm"
                        />
                      </div>
                      <div>
                        <label className="text-gray-400 text-xs mb-1 block">Referral Amount</label>
                        <Input
                          value={editForm.referralAmount}
                          onChange={(e) => setEditForm({ ...editForm, referralAmount: e.target.value })}
                          placeholder="₹ Amount"
                          className="bg-zinc-800 border-zinc-700 text-white text-sm"
                          type="number"
                        />
                      </div>
                      <div>
                        <label className="text-gray-400 text-xs mb-1 block">Received Date</label>
                        <Input
                          value={editForm.receivedDate}
                          onChange={(e) => setEditForm({ ...editForm, receivedDate: e.target.value })}
                          type="date"
                          className="bg-zinc-800 border-zinc-700 text-white text-sm"
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button
                          onClick={() => handleSave(referral.id)}
                          className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                        >
                          <Save className="w-4 h-4 mr-2" />
                          Save
                        </Button>
                        <Button
                          onClick={handleCancel}
                          variant="outline"
                          className="border-zinc-700"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center justify-between">
                          <span className="text-gray-400">Tests:</span>
                          <span className="text-gray-300">{referral.testsPrescribed || '-'}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-gray-400">Lab:</span>
                          <span className="text-gray-300">{referral.referredLab || '-'}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-gray-400">Amount:</span>
                          <span className="text-white">{referral.referralAmount ? `₹${referral.referralAmount}` : '-'}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-gray-400">Received:</span>
                          <span className="text-gray-300">{referral.receivedDate || '-'}</span>
                        </div>
                      </div>
                      <Button
                        onClick={() => handleEdit(referral)}
                        size="sm"
                        variant="outline"
                        className="w-full border-zinc-700"
                      >
                        <Edit2 className="w-4 h-4 mr-2" />
                        Edit Details
                      </Button>
                    </>
                  )}
                </div>
              ))
            )}
          </div>
        </Card>

        {/* Info Card - Removed since rules are now in top note box */}
      </div>
    );
  }
}