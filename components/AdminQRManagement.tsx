import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { 
  QrCode, 
  Search,
  TrendingUp,
  Calendar,
  User,
  Mail,
  MapPin,
  Clock,
  Activity,
  RefreshCw,
  ArrowLeft
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { db } from '../lib/firebase/config';
import { 
  collection, 
  getDocs, 
  query, 
  where
} from 'firebase/firestore';

interface QRData {
  qrNumber: string;
  status: 'available' | 'linked';
  linkedEmail: string | null;
  linkedAt: any;
  createdAt: any;
  monthlyScans: number;
  monthlyBookings: number;
  lastResetDate: string;
}

interface DoctorData {
  name: string;
  email: string;
  dob: string;
  pinCode: string;
  signupDate: string;
  qrNumber: string;
  monthlyScans: number;
  monthlyBookings: number;
}

interface AdminQRManagementProps {
  onBack: () => void;
}

export default function AdminQRManagement({ onBack }: AdminQRManagementProps) {
  const [searchQR, setSearchQR] = useState('');
  const [searchResult, setSearchResult] = useState<DoctorData | null>(null);
  const [searching, setSearching] = useState(false);
  const [stats, setStats] = useState({
    totalSearches: 0,
    activeQRs: 0,
    totalScans: 0
  });

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    if (!db) return;

    try {
      const qrCollection = collection(db, 'qrPool');
      const snapshot = await getDocs(qrCollection);
      
      let activeCount = 0;
      let totalScansCount = 0;

      snapshot.forEach(doc => {
        const data = doc.data();
        if (data.linkedEmail) activeCount++;
        totalScansCount += data.monthlyScans || 0;
      });

      setStats({
        totalSearches: snapshot.size,
        activeQRs: activeCount,
        totalScans: totalScansCount
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const searchQRCode = async () => {
    if (!searchQR.trim()) {
      toast.error('Enter QR number');
      return;
    }

    if (!db) {
      toast.error('Firebase not configured');
      return;
    }

    setSearching(true);
    setSearchResult(null);

    try {
      const qrNumber = searchQR.toUpperCase().trim();
      
      // Search in universal qrPool collection
      const qrCollection = collection(db, 'qrPool');
      const qrQuery = query(qrCollection, where('qrNumber', '==', qrNumber));
      const qrSnapshot = await getDocs(qrQuery);

      if (qrSnapshot.empty) {
        toast.error('QR code not found');
        return;
      }

      const qrData = qrSnapshot.docs[0].data() as QRData;

      if (qrData.status === 'available') {
        toast.info('QR code not linked yet');
        return;
      }

      // Get doctor data
      const doctorsCollection = collection(db, 'doctors');
      const doctorQuery = query(doctorsCollection, where('qrNumber', '==', qrNumber));
      const doctorSnapshot = await getDocs(doctorQuery);

      if (doctorSnapshot.empty) {
        toast.error('Doctor data not found');
        return;
      }

      const doctorData = doctorSnapshot.docs[0].data();
      
      // Check if monthly reset needed (auto-reset on 1st of month)
      const currentMonth = new Date().toISOString().slice(0, 7);
      const lastReset = qrData.lastResetDate || '';
      
      let monthlyScans = qrData.monthlyScans || 0;
      let monthlyBookings = qrData.monthlyBookings || 0;
      
      if (lastReset !== currentMonth) {
        // Month changed, data will show as 0 (auto-reset concept)
        monthlyScans = 0;
        monthlyBookings = 0;
      }

      setSearchResult({
        name: doctorData.name || 'N/A',
        email: qrData.linkedEmail || doctorData.email || 'N/A',
        dob: doctorData.dob || 'N/A',
        pinCode: doctorData.pinCode || 'N/A',
        signupDate: qrData.linkedAt 
          ? new Date(qrData.linkedAt.toDate()).toLocaleDateString() 
          : 'N/A',
        qrNumber: qrNumber,
        monthlyScans,
        monthlyBookings
      });

      toast.success('QR data loaded');

    } catch (error) {
      console.error('Error searching QR:', error);
      toast.error('Search failed');
    } finally {
      setSearching(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0f1a] text-white p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              onClick={onBack}
              className="border-zinc-700 text-gray-300 hover:bg-zinc-800"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <div>
              <h1 className="text-3xl font-bold">QR Usage Tracking & History</h1>
              <p className="text-gray-400">Search and track QR performance analytics</p>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="bg-zinc-900 border-zinc-800 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm mb-1">Total QR Codes</p>
                <p className="text-3xl font-bold">{stats.totalSearches}</p>
              </div>
              <QrCode className="w-12 h-12 text-emerald-500" />
            </div>
          </Card>

          <Card className="bg-zinc-900 border-zinc-800 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm mb-1">Active QRs</p>
                <p className="text-3xl font-bold text-blue-400">{stats.activeQRs}</p>
              </div>
              <Activity className="w-12 h-12 text-blue-400" />
            </div>
          </Card>

          <Card className="bg-zinc-900 border-zinc-800 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm mb-1">Total Scans</p>
                <p className="text-3xl font-bold text-emerald-400">{stats.totalScans}</p>
              </div>
              <TrendingUp className="w-12 h-12 text-emerald-400" />
            </div>
          </Card>
        </div>

        {/* Search & Track Section */}
        <Card className="bg-zinc-900 border-zinc-800 p-8">
          <h2 className="text-2xl font-bold mb-6 text-white">Search QR & View Analytics</h2>

          <div className="flex gap-4 mb-8">
            <div className="flex-1">
              <Input
                type="text"
                value={searchQR}
                onChange={(e) => setSearchQR(e.target.value.toUpperCase())}
                placeholder="Enter QR Number (e.g., HQR0001)"
                className="bg-zinc-950 border-zinc-800 text-white placeholder:text-gray-500 h-12 font-mono"
                onKeyPress={(e) => e.key === 'Enter' && searchQRCode()}
              />
            </div>
            <Button
              onClick={searchQRCode}
              disabled={searching}
              className="bg-emerald-500 hover:bg-emerald-600 text-white h-12 px-8"
            >
              {searching ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Searching...
                </>
              ) : (
                <>
                  <Search className="w-4 h-4 mr-2" />
                  Track QR
                </>
              )}
            </Button>
          </div>

            {searchResult && (
              <div className="space-y-6">
                {/* Doctor Info */}
                <Card className="bg-zinc-800 border-zinc-700 p-6">
                  <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                    <User className="w-5 h-5 text-emerald-400" />
                    Doctor Information
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="flex items-start gap-3">
                      <User className="w-5 h-5 text-gray-400 mt-1" />
                      <div>
                        <p className="text-gray-400 text-sm">Name</p>
                        <p className="text-white font-medium">{searchResult.name}</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <Mail className="w-5 h-5 text-gray-400 mt-1" />
                      <div>
                        <p className="text-gray-400 text-sm">Email</p>
                        <p className="text-white font-medium">{searchResult.email}</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <Calendar className="w-5 h-5 text-gray-400 mt-1" />
                      <div>
                        <p className="text-gray-400 text-sm">Date of Birth</p>
                        <p className="text-white font-medium">{searchResult.dob}</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <MapPin className="w-5 h-5 text-gray-400 mt-1" />
                      <div>
                        <p className="text-gray-400 text-sm">PIN Code</p>
                        <p className="text-white font-medium">{searchResult.pinCode}</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <Clock className="w-5 h-5 text-gray-400 mt-1" />
                      <div>
                        <p className="text-gray-400 text-sm">Signup Date</p>
                        <p className="text-white font-medium">{searchResult.signupDate}</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <QrCode className="w-5 h-5 text-emerald-400 mt-1" />
                      <div>
                        <p className="text-gray-400 text-sm">QR Number</p>
                        <p className="text-emerald-400 font-mono font-bold">
                          {searchResult.qrNumber}
                        </p>
                      </div>
                    </div>
                  </div>
                </Card>

                {/* Monthly Analytics */}
                <Card className="bg-zinc-800 border-zinc-700 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-bold flex items-center gap-2">
                      <TrendingUp className="w-5 h-5 text-blue-400" />
                      Monthly Analytics
                    </h3>
                    <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">
                      {new Date().toLocaleString('default', { month: 'long', year: 'numeric' })}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-zinc-900 rounded-lg p-6 border border-zinc-700">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-gray-400 text-sm mb-1">Total Scans</p>
                          <p className="text-4xl font-bold text-blue-400">
                            {searchResult.monthlyScans}
                          </p>
                          <p className="text-gray-500 text-xs mt-2">
                            Resets on 1st of every month
                          </p>
                        </div>
                        <Activity className="w-12 h-12 text-blue-400 opacity-20" />
                      </div>
                    </div>

                    <div className="bg-zinc-900 rounded-lg p-6 border border-zinc-700">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-gray-400 text-sm mb-1">Total Bookings</p>
                          <p className="text-4xl font-bold text-emerald-400">
                            {searchResult.monthlyBookings}
                          </p>
                          <p className="text-gray-500 text-xs mt-2">
                            Resets on 1st of every month
                          </p>
                        </div>
                        <Calendar className="w-12 h-12 text-emerald-400 opacity-20" />
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 bg-amber-500/10 border border-amber-500/30 rounded-lg p-4">
                    <p className="text-amber-400 text-sm">
                      <strong>Auto-Reset:</strong> All monthly statistics automatically reset to 0 
                      on the 1st of each month at 00:00 for fresh tracking.
                    </p>
                  </div>
                </Card>
              </div>
            )}

          {!searchResult && !searching && (
            <div className="text-center py-12">
              <Search className="w-16 h-16 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400">Search for a QR code to view analytics</p>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
