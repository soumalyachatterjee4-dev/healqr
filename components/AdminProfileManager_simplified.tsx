import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader } from './ui/card';
import { Input } from './ui/input';
import { 
  Shield, 
  Camera, 
  Save, 
  Edit2
} from 'lucide-react';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../lib/firebase';

// Admin Profile Interface
interface AdminProfile {
  id: string;
  image: string | null;
  name: string;
  dob: string;
  email: string;
  gender: string;
  qualification: string;
  role: 'super_admin';
  status: 'active';
}

export default function AdminProfileManager() {
  const [superAdmin, setSuperAdmin] = useState<AdminProfile | null>(null);
  const [isFirstTimeLogin, setIsFirstTimeLogin] = useState(true);
  const [isEditingSuperAdmin, setIsEditingSuperAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  // Form State
  const [superAdminForm, setSuperAdminForm] = useState({
    name: '',
    email: '',
    dob: '',
    gender: '',
    qualification: '',
    image: null as string | null
  });

  // Load super admin profile on mount
  useEffect(() => {
    loadSuperAdmin();
  }, []);

  const loadSuperAdmin = async () => {
    try {
      const docRef = doc(db, 'adminProfiles', 'super_admin');
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const data = docSnap.data() as AdminProfile;
        setSuperAdmin(data);
        setIsFirstTimeLogin(false);
        setSuperAdminForm({
          name: data.name,
          email: data.email,
          dob: data.dob,
          gender: data.gender,
          qualification: data.qualification || '',
          image: data.image
        });
      } else {
        // First time - show setup form
        setIsFirstTimeLogin(true);
        setIsEditingSuperAdmin(true);
      }
    } catch (error) {
      console.error('Error loading super admin:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      // Upload to Firebase Storage
      const storageRef = ref(storage, `admin_profiles/super_admin_${Date.now()}.jpg`);
      await uploadBytes(storageRef, file);
      const imageUrl = await getDownloadURL(storageRef);
      
      setSuperAdminForm({ ...superAdminForm, image: imageUrl });
    } catch (error) {
      console.error('Error uploading image:', error);
      alert('Failed to upload image');
    }
  };

  const handleSaveSuperAdmin = async () => {
    if (!superAdminForm.name || !superAdminForm.email || !superAdminForm.dob || !superAdminForm.gender) {
      alert('Please fill in all required fields');
      return;
    }

    try {
      const profileData: AdminProfile = {
        id: 'super_admin',
        name: superAdminForm.name,
        email: superAdminForm.email,
        dob: superAdminForm.dob,
        gender: superAdminForm.gender,
        qualification: superAdminForm.qualification,
        image: superAdminForm.image,
        role: 'super_admin',
        status: 'active'
      };

      const docRef = doc(db, 'adminProfiles', 'super_admin');
      
      if (isFirstTimeLogin) {
        await setDoc(docRef, profileData);
        setIsFirstTimeLogin(false);
      } else {
        await updateDoc(docRef, profileData as any);
      }

      setSuperAdmin(profileData);
      setIsEditingSuperAdmin(false);
      alert('Profile saved successfully!');
    } catch (error) {
      console.error('Error saving super admin profile:', error);
      alert('Failed to save profile');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 p-6">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Shield className="w-8 h-8 text-emerald-500" />
            <h1 className="text-3xl font-bold text-white">Admin Profile Manager</h1>
          </div>
          <p className="text-gray-400">
            Manage your administrator profile and account settings
          </p>
        </div>

        {/* Super Admin Profile Card */}
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Shield className="w-6 h-6 text-emerald-500" />
                <div>
                  <h2 className="text-xl text-white">
                    {isFirstTimeLogin ? 'Welcome! Set Up Your Profile' : 'Super Admin Profile'}
                  </h2>
                  <p className="text-sm text-gray-400 mt-1">
                    {isFirstTimeLogin 
                      ? 'Create your administrator profile to get started' 
                      : 'Your administrator account details'}
                  </p>
                </div>
              </div>
              {!isFirstTimeLogin && !isEditingSuperAdmin && (
                <Button
                  onClick={() => setIsEditingSuperAdmin(true)}
                  variant="outline"
                  className="border-emerald-500 text-emerald-400 hover:bg-emerald-500/10"
                >
                  <Edit2 className="w-4 h-4 mr-2" />
                  Edit Profile
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-6">
            {superAdmin && !isEditingSuperAdmin ? (
              // Display Mode
              <div className="flex items-start gap-6">
                {superAdmin.image ? (
                  <img
                    src={superAdmin.image}
                    alt={superAdmin.name}
                    className="w-24 h-24 rounded-full object-cover border-4 border-emerald-500"
                  />
                ) : (
                  <div className="w-24 h-24 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center">
                    <span className="text-2xl text-white">{superAdmin.name.charAt(0)}</span>
                  </div>
                )}
                <div className="flex-1 grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-400">Name</p>
                    <p className="text-white">{superAdmin.name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400">Email</p>
                    <p className="text-white">{superAdmin.email}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400">Date of Birth</p>
                    <p className="text-white">{superAdmin.dob}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400">Gender</p>
                    <p className="text-white capitalize">{superAdmin.gender}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400">Qualification</p>
                    <p className="text-white">{superAdmin.qualification || 'N/A'}</p>
                  </div>
                </div>
              </div>
            ) : (
              // Edit Mode
              <div className="space-y-6">
                <div className="flex flex-col items-center gap-4">
                  <div className="relative">
                    {superAdminForm.image ? (
                      <img
                        src={superAdminForm.image}
                        alt="Profile"
                        className="w-32 h-32 rounded-full object-cover border-4 border-emerald-500"
                      />
                    ) : (
                      <div className="w-32 h-32 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center">
                        <Camera className="w-12 h-12 text-white" />
                      </div>
                    )}
                    <label className="absolute bottom-0 right-0 bg-emerald-500 hover:bg-emerald-600 text-white p-2 rounded-full cursor-pointer transition-colors">
                      <Camera className="w-5 h-5" />
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">Full Name *</label>
                    <Input
                      value={superAdminForm.name}
                      onChange={(e) => setSuperAdminForm({ ...superAdminForm, name: e.target.value })}
                      className="bg-zinc-800 border-zinc-700 text-white"
                      placeholder="Enter your full name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">Gender *</label>
                    <select
                      value={superAdminForm.gender}
                      onChange={(e) => setSuperAdminForm({ ...superAdminForm, gender: e.target.value })}
                      className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-md px-3 py-2"
                    >
                      <option value="">Select Gender</option>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">Email *</label>
                    <Input
                      type="email"
                      value={superAdminForm.email}
                      onChange={(e) => setSuperAdminForm({ ...superAdminForm, email: e.target.value })}
                      className="bg-zinc-800 border-zinc-700 text-white"
                      placeholder="admin@healqr.com"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">Date of Birth *</label>
                    <Input
                      type="date"
                      value={superAdminForm.dob}
                      onChange={(e) => setSuperAdminForm({ ...superAdminForm, dob: e.target.value })}
                      className="bg-zinc-800 border-zinc-700 text-white"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm text-gray-400 mb-2">Qualification</label>
                    <Input
                      value={superAdminForm.qualification}
                      onChange={(e) => setSuperAdminForm({ ...superAdminForm, qualification: e.target.value })}
                      className="bg-zinc-800 border-zinc-700 text-white"
                      placeholder="Your qualifications (optional)"
                    />
                  </div>
                </div>

                <div className="flex gap-3">
                  <Button
                    onClick={handleSaveSuperAdmin}
                    className="flex-1 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    {isFirstTimeLogin ? 'Create Profile' : 'Save Changes'}
                  </Button>
                  {!isFirstTimeLogin && (
                    <Button
                      onClick={() => setIsEditingSuperAdmin(false)}
                      variant="outline"
                      className="border-zinc-700 text-gray-400 hover:bg-zinc-800"
                    >
                      Cancel
                    </Button>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

