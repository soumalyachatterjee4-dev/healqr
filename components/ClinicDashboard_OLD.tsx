import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from './ui/dialog';
import { 
  Building2, 
  MapPin, 
  Users, 
  LogOut, 
  Settings, 
  QrCode,
  Plus,
  Search,
  Menu,
  Bell,
  BarChart3,
  User,
  Lock,
  Star,
  Share2,
  Copy,
  Mail
} from 'lucide-react';
import { auth, db } from '../lib/firebase/config';
import { signOut } from 'firebase/auth';
import { doc, getDoc, collection, query, where, getDocs, updateDoc, addDoc, serverTimestamp } from 'firebase/firestore';
import { toast } from 'sonner';
import ClinicSidebar from './ClinicSidebar';
import ClinicProfileManager from './ClinicProfileManager';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';

interface ClinicData {
  id?: string;
  name: string;
  email: string;
  address: string;
  pinCode: string;
  qrNumber: string;
  clinicCode?: string;
  phone?: string;
  logoUrl?: string;
  isDemo?: boolean;
  centralizedReviews?: boolean;
}

interface Doctor {
  id: string;
  name: string;
  specialities?: string[];
  email: string;
  phone?: string;
  profileImage?: string;
  bookingsCount?: number;
}

export default function ClinicDashboard() {
  const [clinicData, setClinicData] = useState<ClinicData | null>(null);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeMenu, setActiveMenu] = useState('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [shareMenuOpen, setShareMenuOpen] = useState(false);
  
  // Add Doctor State
  const [isAddDoctorOpen, setIsAddDoctorOpen] = useState(false);
  const [newDoctorName, setNewDoctorName] = useState('');
  const [newDoctorEmail, setNewDoctorEmail] = useState('');
  const [newDoctorSpeciality, setNewDoctorSpeciality] = useState('');
  const [addingDoctor, setAddingDoctor] = useState(false);

  useEffect(() => {
    fetchClinicData();
  }, []);

  const fetchClinicData = async () => {
    try {
      const user = auth.currentUser;
      if (!user) return;

      // 1. Fetch Clinic Profile
      const clinicDoc = await getDoc(doc(db, 'clinics', user.uid));
      if (clinicDoc.exists()) {
        const data = clinicDoc.data() as ClinicData;
        setClinicData({ ...data, id: clinicDoc.id });

        // 2. Fetch Linked Doctors
        const doctorsRef = collection(db, 'doctors');
        const q = query(doctorsRef, where('clinicId', '==', user.uid));
        const snapshot = await getDocs(q);
        const doctorsList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Doctor[];
        setDoctors(doctorsList);
      }
    } catch (error) {
      console.error("Error fetching clinic data:", error);
      toast.error("Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      window.location.href = '/';
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const handleCentralizedReviewsToggle = async (checked: boolean) => {
    try {
      if (!clinicData?.id) return;

      const clinicRef = doc(db, 'clinics', clinicData.id);
      await updateDoc(clinicRef, {
        centralizedReviews: checked
      });

      setClinicData(prev => prev ? { ...prev, centralizedReviews: checked } : null);
      
      toast.success(`Centralized reviews ${checked ? 'enabled' : 'disabled'}`, {
        description: checked 
          ? "Patient reviews will now be managed by the Clinic." 
          : "Doctors will send their own review requests automatically."
      });
    } catch (error) {
      console.error("Error updating settings:", error);
      toast.error("Failed to update settings");
    }
  };

  const handleAddDoctor = async () => {
    if (!newDoctorName || !newDoctorEmail) {
      toast.error("Name and Email are required");
      return;
    }

    setAddingDoctor(true);
    try {
      const user = auth.currentUser;
      if (!user) return;

      // Create a new doctor document
      // In a real app, this might send an invite or create a placeholder
      // For this demo, we'll create a document in 'doctors' collection
      
      // Note: In a real scenario, we'd want to use Auth to create the user, 
      // but we can't do that from the client side while logged in as another user.
      // So we'll create a "placeholder" doctor document.
      
      const newDoctorData = {
        name: newDoctorName,
        email: newDoctorEmail,
        specialities: newDoctorSpeciality ? [newDoctorSpeciality] : [],
        clinicId: user.uid,
        createdAt: serverTimestamp(),
        status: 'pending_invite', // Or 'active' if we just want to show them
        bookingsCount: 0
      };

      const docRef = await addDoc(collection(db, 'doctors'), newDoctorData);
      
      setDoctors([...doctors, { id: docRef.id, ...newDoctorData } as Doctor]);
      setIsAddDoctorOpen(false);
      setNewDoctorName('');
      setNewDoctorEmail('');
      setNewDoctorSpeciality('');
      toast.success("Doctor added successfully");

    } catch (error) {
      console.error("Error adding doctor:", error);
      toast.error("Failed to add doctor");
    } finally {
      setAddingDoctor(false);
    }
  };

  // Mock Analytics Data for Demo
  const analyticsData = {
    totalScans: 1240,
    totalBookings: doctors.reduce((acc, doc) => acc + (doc.bookingsCount || 0), 0) + 156, // Mock base + actual
    qrBookings: 89,
    walkinBookings: 45,
    dropOuts: 12,
    cancelled: 3
  };

  const practiceOverviewData = [
    { name: 'Total Scans', value: analyticsData.totalScans, fill: '#60A5FA' }, // Blue
    { name: 'Total Bookings', value: analyticsData.totalBookings, fill: '#3B82F6' }, // Darker Blue
    { name: 'QR Bookings', value: analyticsData.qrBookings, fill: '#8B5CF6' }, // Purple
    { name: 'Walk-in Bookings', value: analyticsData.walkinBookings, fill: '#F59E0B' }, // Amber
    { name: 'Drop Outs', value: analyticsData.dropOuts, fill: '#EF4444' }, // Red
    { name: 'Cancelled', value: analyticsData.cancelled, fill: '#DC2626' }, // Dark Red
  ];

  if (loading) {
    return <div className="min-h-screen bg-black text-white flex items-center justify-center">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-black text-white flex flex-col lg:flex-row">
      {/* Sidebar */}
      <ClinicSidebar 
        activeMenu={activeMenu}
        onMenuChange={(menu) => {
          setActiveMenu(menu);
          setMobileMenuOpen(false);
        }}
        onLogout={handleLogout}
        isOpen={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
      />

      {/* Main Content */}
      <div className="flex-1 lg:ml-64 flex flex-col min-h-screen">
        {/* Top Header */}
        <header className="bg-black border-b border-zinc-900 px-4 md:px-8 py-4 flex items-center justify-between sticky top-0 z-50">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden w-10 h-10 bg-zinc-900 hover:bg-zinc-800 rounded-lg flex items-center justify-center transition-colors"
            >
              <Menu className="w-5 h-5 text-blue-500" />
            </button>
            <h2 className="text-lg md:text-xl font-semibold">Clinic Dashboard</h2>
          </div>
          
          <div className="flex items-center gap-2 md:gap-3">
             {/* Share Button */}
             <Popover open={shareMenuOpen} onOpenChange={setShareMenuOpen}>
              <PopoverTrigger asChild>
                <button className="w-9 h-9 md:w-10 md:h-10 bg-zinc-900 hover:bg-zinc-800 rounded-lg flex items-center justify-center transition-colors">
                  <Share2 className="w-4 h-4 md:w-5 md:h-5 text-gray-400" />
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-72 p-4 bg-zinc-900 border-zinc-800" align="end">
                <div className="space-y-3">
                  <h3 className="text-white mb-1">Share Clinic Link</h3>
                  <div className="flex items-center gap-2 bg-zinc-950 rounded px-3 py-2">
                    <span className="text-gray-400 text-sm flex-1 truncate">https://healqr.com/clinic/{auth.currentUser?.uid}</span>
                    <button className="text-blue-500 hover:text-blue-400">
                      <Copy className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </PopoverContent>
            </Popover>

            {/* Notification Button */}
            <button className="w-9 h-9 md:w-10 md:h-10 bg-zinc-900 hover:bg-zinc-800 rounded-lg flex items-center justify-center transition-colors">
              <Bell className="w-4 h-4 md:w-5 md:h-5 text-gray-400" />
            </button>

            {/* Profile Button */}
            <div className="w-9 h-9 md:w-10 md:h-10 bg-blue-500 rounded-full flex items-center justify-center overflow-hidden">
              <Building2 className="w-5 h-5 text-white" />
            </div>
          </div>
        </header>

        {/* Scrollable Content */}
        <main className="flex-1 overflow-y-auto">
          {/* Render ClinicProfileManager if profile menu is active */}
          {activeMenu === 'profile' ? (
            <ClinicProfileManager onBack={() => setActiveMenu('dashboard')} />
          ) : (
          <div className="p-4 md:p-8">
            {/* Welcome Section */}
            <div className="mb-6 md:mb-8">
              <h1 className="text-2xl md:text-3xl mb-4">
                Welcome Back, {clinicData?.name || 'Clinic Admin'}!
              </h1>
              
              {/* Admin QR Code Display */}
              {clinicData?.qrNumber && (
                <div className="mb-4 p-4 bg-zinc-900/50 border border-zinc-800 rounded-lg inline-block mr-4">
                  <div className="flex items-center gap-3">
                    <QrCode className="w-5 h-5 text-blue-500" />
                    <div>
                      <p className="text-xs text-gray-400 mb-1">Admin QR (Activation)</p>
                      <p className="text-lg font-mono font-semibold text-blue-400">{clinicData.qrNumber}</p>
                    </div>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(clinicData.qrNumber || '');
                        toast.success('QR code copied to clipboard');
                      }}
                      className="ml-2 p-2 hover:bg-zinc-800 rounded-lg transition-colors"
                      title="Copy QR code"
                    >
                      <Copy className="w-4 h-4 text-gray-400" />
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">Single-use registration code</p>
                </div>
              )}

              {/* Clinic System Code Display */}
              {clinicData?.clinicCode && (
                <div className="mb-4 p-4 bg-zinc-900/50 border border-green-800/50 rounded-lg inline-block">
                  <div className="flex items-center gap-3">
                    <Building2 className="w-5 h-5 text-green-500" />
                    <div>
                      <p className="text-xs text-gray-400 mb-1">Clinic System Code</p>
                      <p className="text-lg font-mono font-semibold text-green-400">{clinicData.clinicCode}</p>
                    </div>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(clinicData.clinicCode || '');
                        toast.success('Clinic code copied to clipboard');
                      }}
                      className="ml-2 p-2 hover:bg-zinc-800 rounded-lg transition-colors"
                      title="Copy clinic code"
                    >
                      <Copy className="w-4 h-4 text-gray-400" />
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">Share this code with doctors to link them</p>
                </div>
              )}
              
              <div className="flex items-center gap-4 mb-4">
                <div className="flex items-center gap-2">
                  <Star className="w-5 h-5 fill-yellow-500 text-yellow-500" />
                  <span className="ml-2">4.9/5</span>
                  <span className="text-blue-500 text-sm cursor-pointer hover:underline">
                    (Clinic Rating)
                  </span>
                </div>
              </div>

              <div className="flex gap-3 flex-wrap">
                <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                  <Lock className="w-4 h-4 mr-2" />
                  Data is encrypted
                </Button>
              </div>
            </div>

            {/* Main Content Grid */}
            <div className="max-w-4xl mx-auto space-y-6 md:space-y-8">
              {/* Blue Card - Total Doctors/Bookings */}
              <div style={{ background: 'linear-gradient(to bottom right, rgb(59, 130, 246), rgb(29, 78, 216))' }} className="text-white rounded-xl p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Badge className="bg-white/20 text-white border-0 hover:bg-white/30">
                    Premium
                  </Badge>
                  <Badge className="bg-blue-800 text-white border-0 hover:bg-blue-900">
                    Active
                  </Badge>
                </div>
                <div className="mb-4">
                  <div className="text-2xl md:text-3xl mb-1">
                    {doctors.length} Active Doctors
                  </div>
                  <div className="text-sm mb-2">Total Bookings: {analyticsData.totalBookings}</div>
                </div>
              </div>

              {/* Practice Overview Chart */}
              <Card className="bg-zinc-900 border-zinc-800">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-blue-500" />
                    <CardTitle className="text-white text-xl">Clinic Overview</CardTitle>
                  </div>
                  <p className="text-sm text-gray-400 mt-2">
                    Track performance metrics across all doctors.
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="bg-black rounded-xl p-6">
                    <div className="space-y-6">
                      {practiceOverviewData.map((item, index) => {
                        const maxValue = Math.max(...practiceOverviewData.map(d => d.value), 1);
                        const percentage = (item.value / maxValue) * 100;
                        
                        return (
                          <div key={index} className="space-y-2">
                            <div className="flex justify-between items-center">
                              <span className="text-white font-semibold text-sm">{item.name}</span>
                              <span className="text-white font-bold text-lg">{item.value}</span>
                            </div>
                            <div className="relative h-8 bg-zinc-900 rounded-lg overflow-hidden">
                              <div 
                                className="absolute top-0 left-0 h-full rounded-lg transition-all duration-1000 ease-out"
                                style={{
                                  width: `${percentage}%`,
                                  backgroundColor: item.fill,
                                  boxShadow: `0 0 20px ${item.fill}80`,
                                }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Doctors List Section */}
              <Card className="bg-zinc-900 border-zinc-800">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Users className="w-5 h-5 text-blue-500" />
                      <CardTitle className="text-white">Doctors List</CardTitle>
                    </div>
                    <Dialog open={isAddDoctorOpen} onOpenChange={setIsAddDoctorOpen}>
                      <DialogTrigger asChild>
                        <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                          <Plus className="w-4 h-4 mr-2" />
                          Add Doctor
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="bg-zinc-900 border-zinc-800 text-white">
                        <DialogHeader>
                          <DialogTitle>Add New Doctor</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                          <div className="space-y-2">
                            <Label>Doctor Name</Label>
                            <Input 
                              value={newDoctorName}
                              onChange={(e) => setNewDoctorName(e.target.value)}
                              placeholder="Dr. John Doe"
                              className="bg-black border-zinc-800"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Email Address</Label>
                            <Input 
                              value={newDoctorEmail}
                              onChange={(e) => setNewDoctorEmail(e.target.value)}
                              placeholder="doctor@example.com"
                              className="bg-black border-zinc-800"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Speciality</Label>
                            <Input 
                              value={newDoctorSpeciality}
                              onChange={(e) => setNewDoctorSpeciality(e.target.value)}
                              placeholder="e.g. Cardiologist"
                              className="bg-black border-zinc-800"
                            />
                          </div>
                        </div>
                        <DialogFooter>
                          <Button 
                            variant="outline" 
                            onClick={() => setIsAddDoctorOpen(false)}
                            className="border-zinc-800 text-white hover:bg-zinc-800"
                          >
                            Cancel
                          </Button>
                          <Button 
                            onClick={handleAddDoctor}
                            disabled={addingDoctor}
                            className="bg-blue-600 hover:bg-blue-700 text-white"
                          >
                            {addingDoctor ? 'Adding...' : 'Add Doctor'}
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {doctors.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        No doctors added yet. Click "Add Doctor" to get started.
                      </div>
                    ) : (
                      doctors.map((doctor) => (
                        <div key={doctor.id} className="flex items-center justify-between p-4 bg-black rounded-lg border border-zinc-800">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-zinc-800 rounded-full flex items-center justify-center">
                              <User className="w-5 h-5 text-gray-400" />
                            </div>
                            <div>
                              <h3 className="font-medium text-white">{doctor.name}</h3>
                              <p className="text-sm text-gray-400">{doctor.specialities?.[0] || 'General Physician'}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-medium text-white">{doctor.bookingsCount || 0} Bookings</div>
                            <div className="text-xs text-blue-500">Active</div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>

            </div>
          </div>
          )}
        </main>
      </div>
    </div>
  );
}
