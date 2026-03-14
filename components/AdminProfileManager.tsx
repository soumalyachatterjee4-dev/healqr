import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader } from './ui/card';
import { Input } from './ui/input';
import { 
  Shield, 
  Camera, 
  Save, 
  Edit2,
  Lock,
  Mail,
  AlertCircle
} from 'lucide-react';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { db, storage } from '../lib/firebase/config';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

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
  const [isChangingEmail, setIsChangingEmail] = useState(false);

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

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      alert('Image size must be less than 10MB');
      return;
    }

    try {
      // Upload to Firebase Storage
      const storageRef = ref(storage, `admin_profiles/super_admin_${Date.now()}.jpg`);
      await uploadBytes(storageRef, file);
      const imageUrl = await getDownloadURL(storageRef);
      
      setSuperAdminForm({ ...superAdminForm, image: imageUrl });
    } catch (error: any) {
      console.error('Error uploading image:', error);
      alert(`Failed to upload image: ${error.message || 'Unknown error'}`);
    }
  };

  const handleSaveSuperAdmin = async () => {
    if (!superAdminForm.name || !superAdminForm.email || !superAdminForm.dob || !superAdminForm.gender) {
      alert('Please fill in all required fields');
      return;
    }

    // Check if email is being changed
    const emailChanged = superAdmin && superAdmin.email !== superAdminForm.email;

    if (emailChanged) {
      const confirmChange = window.confirm(
        `⚠️ SECURITY WARNING ⚠️\n\n` +
        `You are changing your login email from:\n` +
        `${superAdmin?.email}\n\n` +
        `To:\n${superAdminForm.email}\n\n` +
        `After saving:\n` +
        `1. You will be logged out immediately\n` +
        `2. You must login again with the NEW email\n` +
        `3. A magic link will be sent to: ${superAdminForm.email}\n\n` +
        `Make sure you have access to this email!\n\n` +
        `Continue with email change?`
      );

      if (!confirmChange) {
        return;
      }
    }

    try {
      const profileData: AdminProfile = {
        id: 'super_admin',
        name: superAdminForm.name,
        email: superAdminForm.email,
        dob: superAdminForm.dob,
        gender: superAdminForm.gender,
        qualification: superAdminForm.qualification || '',
        image: superAdminForm.image || null, // Convert undefined to null
        role: 'super_admin',
        status: 'active'
      };

      const docRef = doc(db, 'adminProfiles', 'super_admin');
      
      if (isFirstTimeLogin) {
        await setDoc(docRef, profileData);
        setIsFirstTimeLogin(false);
      } else {
        // Filter out undefined values for updateDoc
        const updateData: any = {};
        Object.entries(profileData).forEach(([key, value]) => {
          if (value !== undefined) {
            updateData[key] = value;
          }
        });
        await updateDoc(docRef, updateData);
      }

      setSuperAdmin(profileData);
      setIsEditingSuperAdmin(false);

      if (emailChanged) {
        alert(
          `✅ Login email changed successfully!\n\n` +
          `New login email: ${superAdminForm.email}\n\n` +
          `You will now be logged out.\n` +
          `Please login again with your new email.`
        );
        
        // Log out after 2 seconds
        setTimeout(() => {
          localStorage.removeItem('healqr_admin_email_for_signin');
          window.location.href = '/';
        }, 2000);
      } else {
        alert('Profile saved successfully!');
      }
    } catch (error: any) {
      console.error('Error saving super admin profile:', error);
      alert(`Failed to save profile: ${error.message || 'Unknown error'}`);
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
                    <span className="text-2xl text-white">{superAdmin.name?.charAt(0) || 'A'}</span>
                  </div>
                )}
                <div className="flex-1 grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-400">Name</p>
                    <p className="text-white">{superAdmin.name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400">Email (Login Credential)</p>
                    <p className="text-white flex items-center gap-2">
                      {superAdmin.email}
                      <span className="text-xs text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded">Protected</span>
                    </p>
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
                    <label className="block text-sm text-gray-400 mb-2">
                      Email * (Login Credential)
                      <span className="text-xs text-yellow-500 ml-2">⚠️ Changing this will require fresh login</span>
                    </label>
                    <Input
                      type="email"
                      value={superAdminForm.email}
                      onChange={(e) => {
                        setSuperAdminForm({ ...superAdminForm, email: e.target.value });
                        setIsChangingEmail(true);
                      }}
                      className="bg-zinc-800 border-zinc-700 text-white"
                      placeholder="admin@healqr.com"
                    />
                    {isChangingEmail && superAdmin && superAdminForm.email !== superAdmin.email && (
                      <div className="mt-2 p-3 bg-yellow-900/20 border border-yellow-700/30 rounded-lg">
                        <p className="text-xs text-yellow-400 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" />
                          You will be logged out and must login with the new email
                        </p>
                      </div>
                    )}
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

        {/* Security Information Card */}
        {!isFirstTimeLogin && (
          <Card className="bg-blue-900/20 border-blue-700/30 mt-6">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Lock className="w-5 h-5 text-blue-400" />
                <h3 className="text-lg text-blue-400 font-semibold">2-Layer Security Protection</h3>
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="flex items-start gap-3">
                <div className="bg-blue-500/20 p-2 rounded-lg">
                  <Mail className="w-5 h-5 text-blue-400" />
                </div>
                <div className="flex-1">
                  <h4 className="text-white font-medium mb-1">Layer 1: Changeable Login Email (Like PIN)</h4>
                  <p className="text-sm text-gray-400">
                    Your current login email is <span className="text-blue-400 font-mono">{superAdmin?.email}</span>. 
                    You can change this email anytime for better security. After changing, you'll be logged out 
                    and must login again with the new email.
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="bg-emerald-500/20 p-2 rounded-lg">
                  <Shield className="w-5 h-5 text-emerald-400" />
                </div>
                <div className="flex-1">
                  <h4 className="text-white font-medium mb-1">Layer 2: Passwordless Authentication</h4>
                  <p className="text-sm text-gray-400">
                    Login via secure email magic link sent to your registered email. No password to remember or steal. 
                    Each login link is unique and expires after use.
                  </p>
                </div>
              </div>

              <div className="bg-emerald-900/20 border border-emerald-700/30 rounded-lg p-4 mt-4">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-emerald-400 font-medium mb-1">How to Change Login Email</h4>
                    <ul className="text-sm text-gray-300 space-y-1 mt-2">
                      <li>1. Click "Edit Profile" button above</li>
                      <li>2. Change the email field to your new email address</li>
                      <li>3. Click "Save Changes" - you'll get a confirmation</li>
                      <li>4. You'll be automatically logged out</li>
                      <li>5. Login again using the new email address</li>
                    </ul>
                    <p className="text-xs text-emerald-400 mt-3">
                      💡 Tip: Change your login email periodically for enhanced security!
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

