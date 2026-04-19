import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Label } from './ui/label';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import {
  Mail,
  MapPin,
  Upload,
  Save,
  Lock,
  QrCode,
  Microscope,
  Phone,
  Globe,
  Clock,
  Building2,
  Plus,
  X,
  Image,
  FileText,
  Loader2,
} from 'lucide-react';
import { auth, storage } from '../lib/firebase/config';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { toast } from 'sonner';

interface LabProfileManagerProps {
  labData?: any;
  onProfileUpdate?: () => void;
}

export default function LabProfileManager({ labData, onProfileUpdate }: LabProfileManagerProps) {
  // Locked fields (from signup — read-only)
  const lockedName = labData?.name || '';
  const lockedEmail = labData?.email || '';
  const lockedAddress = labData?.address || '';
  const lockedPinCode = labData?.pinCode || '';
  const lockedState = labData?.state || '';
  const lockedQrNumber = labData?.qrNumber || '';
  const lockedLabCode = labData?.labCode || '';

  // Editable fields
  const [description, setDescription] = useState('');
  const [phone, setPhone] = useState('');
  const [website, setWebsite] = useState('');
  const [timings, setTimings] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [heroImage, setHeroImage] = useState('');
  const [accreditations, setAccreditations] = useState<string[]>([]);
  const [newAccreditation, setNewAccreditation] = useState('');
  const [services, setServices] = useState<string[]>([]);
  const [newService, setNewService] = useState('');
  const [emergencyPhone, setEmergencyPhone] = useState('');
  const [emergencyButtonActive, setEmergencyButtonActive] = useState(false);
  const [googleReviewLink, setGoogleReviewLink] = useState('');

  // Locations/Branches
  const [locations, setLocations] = useState<Array<{ id: string; name: string; landmark: string; address?: string }>>([]);

  const [saving, setSaving] = useState(false);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [isUploadingHero, setIsUploadingHero] = useState(false);

  const labId = auth?.currentUser?.uid || localStorage.getItem('userId') || '';

  useEffect(() => {
    loadProfile();
  }, [labData]);

  const loadProfile = () => {
    if (!labData) return;
    setDescription(labData.description || labData.bio || '');
    setPhone(labData.phone || '');
    setWebsite(labData.website || '');
    setTimings(labData.timings || labData.workingHours || '');
    setLogoUrl(labData.logoUrl || '');
    setHeroImage(labData.heroImage || labData.profileImage || '');
    setAccreditations(labData.accreditations || []);
    setServices(labData.services || labData.testCategories || []);
    setEmergencyPhone(labData.emergencyPhone || '');
    setEmergencyButtonActive(labData.emergencyButtonActive || false);
    setGoogleReviewLink(labData.googleReviewLink || '');
    setLocations(labData.locations || [{ id: '001', name: lockedName, landmark: '' }]);
  };

  const handleImageUpload = async (file: File, type: 'logo' | 'hero') => {
    if (!labId || !storage) {
      toast.error('Upload failed: not authenticated');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be under 5MB');
      return;
    }

    const setUploading = type === 'logo' ? setIsUploadingLogo : setIsUploadingHero;
    setUploading(true);

    try {
      const path = `labs/${labId}/${type}_${Date.now()}.${file.name.split('.').pop()}`;
      const storageRef = ref(storage, path);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      if (type === 'logo') setLogoUrl(url);
      else setHeroImage(url);
      toast.success(`${type === 'logo' ? 'Logo' : 'Cover image'} uploaded`);
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const addAccreditation = () => {
    const val = newAccreditation.trim();
    if (val && !accreditations.includes(val)) {
      setAccreditations([...accreditations, val]);
      setNewAccreditation('');
    }
  };

  const removeAccreditation = (index: number) => {
    setAccreditations(accreditations.filter((_, i) => i !== index));
  };

  const addService = () => {
    const val = newService.trim();
    if (val && !services.includes(val)) {
      setServices([...services, val]);
      setNewService('');
    }
  };

  const removeService = (index: number) => {
    setServices(services.filter((_, i) => i !== index));
  };

  const addBranch = () => {
    const newId = String(locations.length + 1).padStart(3, '0');
    setLocations([...locations, { id: newId, name: '', landmark: '' }]);
  };

  const updateBranch = (index: number, field: string, value: string) => {
    const updated = [...locations];
    updated[index] = { ...updated[index], [field]: value };
    setLocations(updated);
  };

  const removeBranch = (index: number) => {
    if (locations.length <= 1) {
      toast.error('At least one branch is required');
      return;
    }
    setLocations(locations.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    if (!labId) {
      toast.error('Not authenticated');
      return;
    }

    setSaving(true);
    try {
      const { db } = await import('../lib/firebase/config');
      if (!db) throw new Error('Database not available');
      const { doc, updateDoc, serverTimestamp } = await import('firebase/firestore');

      await updateDoc(doc(db, 'labs', labId), {
        description,
        phone,
        website,
        timings,
        logoUrl,
        heroImage,
        accreditations,
        services,
        emergencyPhone,
        emergencyButtonActive,
        googleReviewLink,
        locations,
        profileUpdatedAt: serverTimestamp(),
      });

      toast.success('Profile updated successfully!');
      if (onProfileUpdate) onProfileUpdate();
    } catch (error) {
      console.error('Error saving profile:', error);
      toast.error('Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white">Profile Manager</h2>
        <Button
          onClick={handleSave}
          disabled={saving}
          className="bg-purple-600 hover:bg-purple-700 text-white"
        >
          {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
          Save Changes
        </Button>
      </div>

      {/* ═══════════════ LOCKED FIELDS (Signup Data) ═══════════════ */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Lock className="w-5 h-5 text-amber-500" />
            <CardTitle className="text-white text-lg">Registration Details</CardTitle>
            <span className="text-xs text-amber-500/80 bg-amber-500/10 px-2 py-0.5 rounded-full">Read Only</span>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-gray-400 text-xs flex items-center gap-1"><Lock className="w-3 h-3" /> Lab Name</Label>
              <Input value={lockedName} disabled className="bg-zinc-800/50 border-zinc-700 text-gray-400 cursor-not-allowed mt-1" />
            </div>
            <div>
              <Label className="text-gray-400 text-xs flex items-center gap-1"><Mail className="w-3 h-3" /> Email</Label>
              <Input value={lockedEmail} disabled className="bg-zinc-800/50 border-zinc-700 text-gray-400 cursor-not-allowed mt-1" />
            </div>
            <div>
              <Label className="text-gray-400 text-xs flex items-center gap-1"><MapPin className="w-3 h-3" /> Address</Label>
              <Input value={lockedAddress} disabled className="bg-zinc-800/50 border-zinc-700 text-gray-400 cursor-not-allowed mt-1" />
            </div>
            <div>
              <Label className="text-gray-400 text-xs flex items-center gap-1"><MapPin className="w-3 h-3" /> Pincode / State</Label>
              <Input value={`${lockedPinCode} / ${lockedState}`} disabled className="bg-zinc-800/50 border-zinc-700 text-gray-400 cursor-not-allowed mt-1" />
            </div>
            <div>
              <Label className="text-gray-400 text-xs flex items-center gap-1"><QrCode className="w-3 h-3" /> QR Number</Label>
              <Input value={lockedQrNumber} disabled className="bg-zinc-800/50 border-zinc-700 text-purple-400 font-mono cursor-not-allowed mt-1" />
            </div>
            <div>
              <Label className="text-gray-400 text-xs flex items-center gap-1"><Microscope className="w-3 h-3" /> Lab Code</Label>
              <Input value={lockedLabCode} disabled className="bg-zinc-800/50 border-zinc-700 text-purple-400 font-mono cursor-not-allowed mt-1" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ═══════════════ IMAGES ═══════════════ */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Image className="w-5 h-5 text-purple-500" />
            <CardTitle className="text-white text-lg">Lab Images</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Logo */}
            <div>
              <Label className="text-gray-300 text-sm mb-2 block">Logo / Profile Image</Label>
              <div className="flex items-center gap-4">
                <div className="w-24 h-24 rounded-xl bg-zinc-800 border border-zinc-700 flex items-center justify-center overflow-hidden">
                  {logoUrl ? (
                    <img src={logoUrl} alt="Logo" className="w-full h-full object-cover" />
                  ) : (
                    <Microscope className="w-8 h-8 text-gray-600" />
                  )}
                </div>
                <label className="cursor-pointer">
                  <div className="flex items-center gap-2 bg-zinc-800 hover:bg-zinc-700 text-white px-4 py-2 rounded-lg text-sm transition-colors">
                    {isUploadingLogo ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                    Upload Logo
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => e.target.files?.[0] && handleImageUpload(e.target.files[0], 'logo')}
                    disabled={isUploadingLogo}
                  />
                </label>
              </div>
            </div>

            {/* Hero/Cover Image */}
            <div>
              <Label className="text-gray-300 text-sm mb-2 block">Cover Image (Mini Website)</Label>
              <div className="flex items-center gap-4">
                <div className="w-24 h-24 rounded-xl bg-zinc-800 border border-zinc-700 flex items-center justify-center overflow-hidden">
                  {heroImage ? (
                    <img src={heroImage} alt="Cover" className="w-full h-full object-cover" />
                  ) : (
                    <Image className="w-8 h-8 text-gray-600" />
                  )}
                </div>
                <label className="cursor-pointer">
                  <div className="flex items-center gap-2 bg-zinc-800 hover:bg-zinc-700 text-white px-4 py-2 rounded-lg text-sm transition-colors">
                    {isUploadingHero ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                    Upload Cover
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => e.target.files?.[0] && handleImageUpload(e.target.files[0], 'hero')}
                    disabled={isUploadingHero}
                  />
                </label>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ═══════════════ ABOUT & CONTACT ═══════════════ */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-purple-500" />
            <CardTitle className="text-white text-lg">About & Contact</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="text-gray-300 text-sm">About / Description</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Tell patients about your lab, specializations, equipment, certifications..."
              className="bg-zinc-800 border-zinc-700 text-white mt-1 min-h-[100px]"
              maxLength={500}
            />
            <p className="text-xs text-gray-500 mt-1">{description.length}/500</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-gray-300 text-sm flex items-center gap-1"><Phone className="w-3 h-3" /> Phone</Label>
              <Input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 9876543210"
                className="bg-zinc-800 border-zinc-700 text-white mt-1"
              />
            </div>
            <div>
              <Label className="text-gray-300 text-sm flex items-center gap-1"><Globe className="w-3 h-3" /> Website</Label>
              <Input
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                placeholder="https://www.yourlab.com"
                className="bg-zinc-800 border-zinc-700 text-white mt-1"
              />
            </div>
            <div>
              <Label className="text-gray-300 text-sm flex items-center gap-1"><Clock className="w-3 h-3" /> Working Hours</Label>
              <Input
                value={timings}
                onChange={(e) => setTimings(e.target.value)}
                placeholder="Mon-Sat: 7 AM - 8 PM"
                className="bg-zinc-800 border-zinc-700 text-white mt-1"
              />
            </div>
            <div>
              <Label className="text-gray-300 text-sm flex items-center gap-1"><Globe className="w-3 h-3" /> Google Review Link</Label>
              <Input
                value={googleReviewLink}
                onChange={(e) => setGoogleReviewLink(e.target.value)}
                placeholder="https://g.co/kgs/..."
                className="bg-zinc-800 border-zinc-700 text-white mt-1"
              />
            </div>
          </div>

          {/* Emergency */}
          <div className="border-t border-zinc-800 pt-4">
            <div className="flex items-center gap-3 mb-3">
              <Label className="text-gray-300 text-sm">Emergency Contact</Label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={emergencyButtonActive}
                  onChange={(e) => setEmergencyButtonActive(e.target.checked)}
                  className="w-4 h-4 rounded border-zinc-700 bg-zinc-800 text-purple-500 focus:ring-purple-500"
                />
                <span className="text-xs text-gray-400">Show emergency button on mini-website</span>
              </label>
            </div>
            <Input
              value={emergencyPhone}
              onChange={(e) => setEmergencyPhone(e.target.value)}
              placeholder="Emergency phone number"
              className="bg-zinc-800 border-zinc-700 text-white max-w-sm"
            />
          </div>
        </CardContent>
      </Card>

      {/* ═══════════════ ACCREDITATIONS ═══════════════ */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Microscope className="w-5 h-5 text-purple-500" />
            <CardTitle className="text-white text-lg">Accreditations & Certifications</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {accreditations.map((acc, i) => (
              <div key={i} className="flex items-center gap-1.5 bg-purple-500/10 border border-purple-500/20 rounded-full px-3 py-1.5">
                <span className="text-purple-300 text-sm">{acc}</span>
                <button onClick={() => removeAccreditation(i)} className="text-purple-400 hover:text-red-400 transition-colors">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <Input
              value={newAccreditation}
              onChange={(e) => setNewAccreditation(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addAccreditation()}
              placeholder="e.g., NABL, ISO 15189, CAP"
              className="bg-zinc-800 border-zinc-700 text-white max-w-sm"
            />
            <Button onClick={addAccreditation} variant="outline" size="sm" className="border-zinc-700 text-purple-400 hover:bg-purple-500/10">
              <Plus className="w-4 h-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ═══════════════ SERVICES ═══════════════ */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Microscope className="w-5 h-5 text-purple-500" />
            <CardTitle className="text-white text-lg">Service Categories</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-gray-500">Add categories like "Blood Tests", "Pathology", "Radiology", "Health Packages" etc.</p>
          <div className="flex flex-wrap gap-2">
            {services.map((service, i) => (
              <div key={i} className="flex items-center gap-1.5 bg-purple-500/10 border border-purple-500/20 rounded-full px-3 py-1.5">
                <span className="text-purple-300 text-sm">{service}</span>
                <button onClick={() => removeService(i)} className="text-purple-400 hover:text-red-400 transition-colors">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <Input
              value={newService}
              onChange={(e) => setNewService(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addService()}
              placeholder="e.g., Blood Tests, Pathology, Radiology"
              className="bg-zinc-800 border-zinc-700 text-white max-w-sm"
            />
            <Button onClick={addService} variant="outline" size="sm" className="border-zinc-700 text-purple-400 hover:bg-purple-500/10">
              <Plus className="w-4 h-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ═══════════════ BRANCHES ═══════════════ */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Building2 className="w-5 h-5 text-purple-500" />
              <CardTitle className="text-white text-lg">Branches / Locations</CardTitle>
            </div>
            <Button onClick={addBranch} variant="outline" size="sm" className="border-zinc-700 text-purple-400 hover:bg-purple-500/10">
              <Plus className="w-4 h-4 mr-1" />
              Add Branch
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {locations.map((branch, i) => (
            <div key={i} className="bg-zinc-800/50 border border-zinc-700 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-purple-400 font-medium">Branch #{i + 1}</span>
                {locations.length > 1 && (
                  <button onClick={() => removeBranch(i)} className="text-gray-500 hover:text-red-400 transition-colors">
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <Label className="text-gray-400 text-xs">Branch Name</Label>
                  <Input
                    value={branch.name}
                    onChange={(e) => updateBranch(i, 'name', e.target.value)}
                    placeholder="e.g., Main Lab, City Branch"
                    className="bg-zinc-800 border-zinc-700 text-white mt-1"
                  />
                </div>
                <div>
                  <Label className="text-gray-400 text-xs">Landmark / Address</Label>
                  <Input
                    value={branch.landmark}
                    onChange={(e) => updateBranch(i, 'landmark', e.target.value)}
                    placeholder="e.g., Near City Hospital"
                    className="bg-zinc-800 border-zinc-700 text-white mt-1"
                  />
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Bottom Save Button */}
      <div className="flex justify-end pb-8">
        <Button
          onClick={handleSave}
          disabled={saving}
          className="bg-purple-600 hover:bg-purple-700 text-white px-8"
        >
          {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
          Save Changes
        </Button>
      </div>
    </div>
  );
}
