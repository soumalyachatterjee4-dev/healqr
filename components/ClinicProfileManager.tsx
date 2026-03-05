import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Label } from './ui/label';
import { Checkbox } from './ui/checkbox';
import {
  Mail,
  Calendar,
  QrCode,
  User,
  MapPin,
  Upload,
  Save,
  Menu,
  Languages,
  Building2,
  Plus,
  X,
  Globe,
  Stethoscope,
  Zap
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { ImageWithFallback } from './figma/ImageWithFallback';
import ClinicSidebar from './ClinicSidebar';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle
} from './ui/alert-dialog';
import { auth, storage } from '../lib/firebase/config';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { getStateFromPincode } from '../utils/pincodeMapping';

interface ClinicProfileManagerProps {
  onMenuChange?: (menu: string) => void;
  onLogout?: () => void;
}

// Available service options for clinic
const CLINIC_SERVICES = [
  'ECG', 'Physiotherapy', 'Echo', 'X-Ray', 'Lab Tests',
  'Pharmacy', 'Ultrasound', 'CT Scan', 'MRI', 'Dialysis',
  'Blood Bank', 'Ambulance', 'Emergency Care', 'ICU'
];

const AVAILABLE_LANGUAGES = [
  { value: 'english', label: 'English', native: 'English' },
  { value: 'hindi', label: 'Hindi', native: 'हिंदी' },
  { value: 'bengali', label: 'Bengali', native: 'বাংলা' },
  { value: 'marathi', label: 'Marathi', native: 'मराठी' },
  { value: 'tamil', label: 'Tamil', native: 'தமிழ்' },
  { value: 'telugu', label: 'Telugu', native: 'తెలుగు' },
  { value: 'gujarati', label: 'Gujarati', native: 'ગુજરાતી' },
  { value: 'kannada', label: 'Kannada', native: 'ಕನ್ನಡ' },
  { value: 'malayalam', label: 'Malayalam', native: 'മലയാളം' },
  { value: 'punjabi', label: 'Punjabi', native: 'ਪੰਜਾਬੀ' },
  { value: 'assamese', label: 'Assamese', native: 'অসমীয়া' }
];

export default function ClinicProfileManager({ onMenuChange, onLogout }: ClinicProfileManagerProps) {
  // Non-editable fields (from registration)
  const [email, setEmail] = useState('');
  const [pinCode, setPinCode] = useState('');
  const [qrNumber, setQrNumber] = useState('');
  const [clinicCode, setClinicCode] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [division, setDivision] = useState('');
  const [qrType, setQrType] = useState('');

  // Editable required field
  const [name, setName] = useState('');
  const [landmark, setLandmark] = useState('');

  // Optional fields
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [establishmentDate, setEstablishmentDate] = useState('');
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>([]);
  const [bio, setBio] = useState('');
  const [serviceBadges, setServiceBadges] = useState<string[]>([]);
  const [registrationNumber, setRegistrationNumber] = useState('');
  const [showRegistrationOnRx, setShowRegistrationOnRx] = useState(false);
  const [footerLine1, setFooterLine1] = useState('');
  const [footerLine2, setFooterLine2] = useState('');
  const [watermarkLogo, setWatermarkLogo] = useState<string | null>(null);
  const [isUploadingWatermark, setIsUploadingWatermark] = useState(false);

  // UI states
  const [loading, setLoading] = useState(true);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [showSaveConfirmation, setShowSaveConfirmation] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Temporary input for adding service
  const [newServiceBadge, setNewServiceBadge] = useState('');

  useEffect(() => {
    fetchProfileData();
  }, []);

  const fetchProfileData = async () => {
    try {
      const user = auth?.currentUser;
      if (!user) {
        console.log('No authenticated user');
        setLoading(false);
        return;
      }

      const { db } = await import('../lib/firebase/config');
      if (!db) return;

      const { doc, getDoc } = await import('firebase/firestore');
      const clinicDocRef = doc(db, 'clinics', user.uid);
      const clinicDoc = await getDoc(clinicDocRef);

      if (clinicDoc.exists()) {
        const data = clinicDoc.data();
        console.log('✅ Loaded clinic profile:', data);

        // Non-editable fields
        setEmail(data.email || user.email || '');
        setPinCode(data.pinCode || '');
        setLandmark(data.landmark || '');
        setQrNumber(data.qrNumber || '');
        setClinicCode(data.clinicCode || '');
        setCompanyName(data.companyName || '');
        setDivision(data.division || '');
        setQrType(data.qrType || (data.qrNumber ? 'preprinted' : ''));

        // Editable required field
        setName(data.name || '');

        // Optional fields
        setProfileImage(data.profileImage || null);
        setEstablishmentDate(data.establishmentDate || '');
        setSelectedLanguages(data.languages || []);
        setBio(data.bio || '');
        setServiceBadges(data.serviceBadges || []);
        if (data.registrationNumber) setRegistrationNumber(data.registrationNumber);
        if (data.showRegistrationOnRx !== undefined) setShowRegistrationOnRx(data.showRegistrationOnRx);
        if (data.footerLine1) setFooterLine1(data.footerLine1);
        if (data.footerLine2) setFooterLine2(data.footerLine2);
        if (data.watermarkLogo) setWatermarkLogo(data.watermarkLogo);
      } else {
        console.log('ℹ️ No clinic profile found');
      }
    } catch (error) {
      console.error('❌ Error loading profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      const file = e.target.files?.[0];
      if (!file) return;

      console.log('📤 Starting upload for:', file.name, `(${(file.size / 1024).toFixed(1)}KB)`);

      if (!auth?.currentUser) {
        alert('Please login again before uploading an image.');
        return;
      }

      if (!storage) {
        alert('Upload failed: storage service unavailable.');
        return;
      }

      setIsUploadingImage(true);

      // Compress image before uploading
      console.log('🔄 Compressing image...');
      const compressedFile = await compressImage(file);
      console.log('✅ Compression complete');

      const filePath = `clinicProfileImages/${auth.currentUser.uid}/${Date.now()}_${file.name}`;
      console.log('☁️ Uploading to Storage:', filePath);
      const storageRef = ref(storage, filePath);
      await uploadBytes(storageRef, compressedFile);
      console.log('✅ Upload complete');

      const downloadURL = await getDownloadURL(storageRef);
      console.log('✅ Download URL obtained:', downloadURL);
      setProfileImage(downloadURL);
      alert('Image uploaded successfully!');
    } catch (error: any) {
      console.error('❌ Upload error:', error);
      const errorMsg = error?.message || error?.code || 'Unknown error';
      alert(`Failed to upload image: ${errorMsg}`);
    } finally {
      setIsUploadingImage(false);
    }
  };

  const compressImage = (file: File): Promise<File> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('Canvas context unavailable'));
            return;
          }

          // Target dimensions: max 800x800 while maintaining aspect ratio
          const MAX_WIDTH = 800;
          const MAX_HEIGHT = 800;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height = Math.round((height * MAX_WIDTH) / width);
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width = Math.round((width * MAX_HEIGHT) / height);
              height = MAX_HEIGHT;
            }
          }

          canvas.width = width;
          canvas.height = height;
          ctx.drawImage(img, 0, 0, width, height);

          // Convert to blob with quality reduction
          canvas.toBlob(
            (blob) => {
              if (!blob) {
                reject(new Error('Image compression failed'));
                return;
              }
              const compressedFile = new File([blob], file.name, {
                type: 'image/jpeg',
                lastModified: Date.now(),
              });
              console.log(`📦 Compressed: ${(file.size / 1024).toFixed(1)}KB → ${(compressedFile.size / 1024).toFixed(1)}KB`);
              resolve(compressedFile);
            },
            'image/jpeg',
            0.85 // 85% quality
          );
        };
        img.onerror = () => reject(new Error('Failed to load image'));
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
    });
  };

  const toggleLanguage = (langValue: string) => {
    if (selectedLanguages.includes(langValue)) {
      setSelectedLanguages(selectedLanguages.filter(l => l !== langValue));
    } else {
      setSelectedLanguages([...selectedLanguages, langValue]);
    }
  };

  const handleWatermarkUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      const file = e.target.files?.[0];
      if (!file) return;
      if (!auth?.currentUser || !storage) {
        alert('Please login again before uploading.');
        return;
      }
      setIsUploadingWatermark(true);
      const compressedFile = await compressImage(file);
      const filePath = `watermarkLogos/${auth.currentUser.uid}/${Date.now()}_${file.name}`;
      const storageRef = ref(storage, filePath);
      await uploadBytes(storageRef, compressedFile);
      const downloadURL = await getDownloadURL(storageRef);
      setWatermarkLogo(downloadURL);
      alert('Watermark logo uploaded successfully!');
    } catch (error: any) {
      console.error('❌ Watermark upload error:', error);
      alert(`Failed to upload watermark: ${error?.message || 'Unknown error'}`);
    } finally {
      setIsUploadingWatermark(false);
    }
  };

  const addServiceBadge = () => {
    if (newServiceBadge && serviceBadges.length < 4 && !serviceBadges.includes(newServiceBadge)) {
      setServiceBadges([...serviceBadges, newServiceBadge]);
      setNewServiceBadge('');
    }
  };

  const removeServiceBadge = (index: number) => {
    setServiceBadges(serviceBadges.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    try {
      const user = auth?.currentUser;
      if (!user) {
        alert('Please login to update profile');
        return;
      }

      if (!name.trim()) {
        alert('Clinic name is required');
        return;
      }

      const { db } = await import('../lib/firebase/config');
      if (!db) {
        alert('Database connection error');
        return;
      }
      const { doc, updateDoc } = await import('firebase/firestore');

      const clinicDocRef = doc(db, 'clinics', user.uid);
      await updateDoc(clinicDocRef, {
        name: name.trim(),
        landmark: landmark.trim(),
        profileImage,
        establishmentDate,
        languages: selectedLanguages,
        bio,
        serviceBadges,
        registrationNumber,
        showRegistrationOnRx,
        footerLine1,
        footerLine2,
        watermarkLogo
      });

      setShowSaveConfirmation(true);
      setTimeout(() => setShowSaveConfirmation(false), 2000);
    } catch (error) {
      console.error('❌ Error updating profile:', error);
      alert('Failed to update profile');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-zinc-950">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400">Loading clinic profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-zinc-950 overflow-hidden">
      {/* Sidebar */}
      <ClinicSidebar
        onMenuChange={onMenuChange || (() => {})}
        onLogout={onLogout || (() => {})}
        activeMenu="Clinic Profile"
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto lg:ml-64">
        {/* Mobile Menu Button */}
        <div className="lg:hidden fixed top-4 left-4 z-50">
          <Button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="bg-zinc-900 hover:bg-zinc-800 p-3"
          >
            <Menu className="w-6 h-6" />
          </Button>
        </div>

        <div className="max-w-5xl mx-auto p-8 pt-20 lg:pt-8">
          <h1 className="text-3xl font-bold mb-8 text-white">Clinic Profile</h1>

          {/* Success Alert */}
          <AlertDialog open={showSaveConfirmation}>
            <AlertDialogContent className="bg-zinc-900 border-zinc-800">
              <AlertDialogHeader>
                <AlertDialogTitle className="text-emerald-500">✓ Profile Updated</AlertDialogTitle>
                <AlertDialogDescription className="text-gray-400">
                  Your clinic profile has been updated successfully!
                </AlertDialogDescription>
              </AlertDialogHeader>
            </AlertDialogContent>
          </AlertDialog>

          {/* Image Upload Section */}
          <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-8 mb-6">
            <h2 className="mb-6 text-white">Profile Image</h2>
            <p className="text-gray-400 text-sm mb-6">Optional - Upload your clinic logo or image</p>

            <div className="flex items-center gap-6">
              <div>
                {profileImage ? (
                  <ImageWithFallback
                    src={profileImage}
                    alt="Clinic Logo"
                    className="w-32 h-32 rounded-full object-cover border-2 border-blue-500"
                  />
                ) : (
                  <div className="w-32 h-32 rounded-full bg-zinc-800 border-2 border-zinc-700 flex items-center justify-center">
                    <Building2 className="w-12 h-12 text-zinc-600" />
                  </div>
                )}
              </div>

              <div>
                <Label htmlFor="image-upload" className="cursor-pointer">
                  <div className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-lg inline-flex items-center gap-2 transition-colors">
                    <Upload className="w-5 h-5" />
                    {isUploadingImage ? 'Uploading...' : 'Upload Image'}
                  </div>
                </Label>
                <Input
                  id="image-upload"
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                  disabled={isUploadingImage}
                />
                <p className="text-gray-400 text-sm mt-2">
                  Optional - Auto-compressed to 800x800 JPEG (85% quality)
                </p>
              </div>
            </div>
          </div>

          {/* Non-Editable Fields */}
          <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-8 mb-6">
            <h2 className="mb-6 text-white">Registration Details</h2>
            <p className="text-gray-400 text-sm mb-6">These fields cannot be edited</p>

            <div className="space-y-4">
              {/* Email */}
              <div>
                <Label className="mb-2 block text-gray-300">Email Address</Label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                  <Input
                    type="email"
                    value={email}
                    disabled
                    className="pl-12 bg-zinc-950 border-zinc-800 text-gray-500 h-12 rounded-lg cursor-not-allowed"
                  />
                </div>
              </div>

              {/* Clinic Pin Code */}
              <div>
                <Label className="mb-2 block text-gray-300">Clinic Pin Code</Label>
                <div className="relative">
                  <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                  <Input
                    type="text"
                    value={pinCode}
                    disabled
                    className="pl-12 bg-zinc-950 border-zinc-800 text-gray-500 h-12 rounded-lg cursor-not-allowed"
                  />
                </div>
              </div>

              {/* State (Locked — auto-derived from pincode) */}
              {pinCode && getStateFromPincode(pinCode) !== 'Unknown' && (
                <div>
                  <Label className="mb-2 block text-gray-300">State <span className="text-xs text-gray-600 font-normal">(Locked)</span></Label>
                  <div className="relative">
                    <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                    <Input
                      type="text"
                      value={getStateFromPincode(pinCode)}
                      disabled
                      className="pl-12 bg-zinc-950 border-zinc-800 text-gray-500 h-12 rounded-lg cursor-not-allowed"
                    />
                  </div>
                </div>
              )}

              {/* Landmark (Read-Only) */}
              <div>
                <Label className="mb-2 block text-gray-300">Clinic Landmark</Label>
                <div className="relative">
                  <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                  <Input
                    type="text"
                    value={landmark}
                    disabled
                    className="pl-12 bg-zinc-950 border-zinc-800 text-gray-500 h-12 rounded-lg cursor-not-allowed"
                  />
                </div>
              </div>

              {/* QR Used */}
              {qrNumber && (
                <div>
                  <Label className="mb-2 block text-gray-300 flex items-center gap-2">
                    QR Used (Admin Generated)
                    {qrType && (
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 text-xs font-semibold uppercase tracking-wider">
                        ({qrType})
                      </span>
                    )}
                  </Label>
                  <div className="relative">
                    <QrCode className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                    <Input
                      type="text"
                      value={qrNumber}
                      disabled
                      className="pl-12 bg-zinc-950 border-zinc-800 text-gray-500 h-12 rounded-lg cursor-not-allowed font-mono"
                    />
                  </div>
                </div>
              )}

              {/* Clinic Code */}
              {clinicCode && (
                <div>
                  <Label className="mb-2 block text-gray-300">Clinic Code (System Generated)</Label>
                  <div className="relative">
                    <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                    <Input
                      type="text"
                      value={clinicCode}
                      disabled
                      className="pl-12 bg-zinc-950 border-zinc-800 text-gray-500 h-12 rounded-lg cursor-not-allowed font-mono"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Editable Required Field */}
          <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-8 mb-6">
            <h2 className="mb-6 text-white">Basic Information</h2>
            <p className="text-gray-400 text-sm mb-6">Required field - cannot be left empty</p>

            <div className="space-y-4">

              {/* Clinic Name */}
              <div>
                <Label className="mb-2 block text-gray-300">
                  Clinic Name <span className="text-red-500">*</span>
                </Label>
                <div className="relative">
                  <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <Input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter clinic name"
                    className="pl-12 bg-black border-zinc-800 text-white h-12 rounded-lg focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Landmark Field (Editable) */}
              <div className="mt-4">
                <Label className="mb-2 block text-gray-300">
                  Update Clinic Landmark <span className="text-gray-500 font-normal ml-1">(helps patient find exact location)</span>
                </Label>
                <div className="relative">
                  <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <Input
                    type="text"
                    value={landmark}
                    onChange={(e) => setLandmark(e.target.value)}
                    placeholder="e.g., Near City Hospital"
                    className="pl-12 bg-black border-zinc-800 text-white h-12 rounded-lg focus:border-blue-500"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Optional Fields */}
          <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-8 mb-6">
            <h2 className="mb-6 text-white">Additional Information</h2>
            <p className="text-gray-400 text-sm mb-6">Optional fields</p>

            <div className="space-y-6">
              {/* Establishment Date */}
              <div>
                <Label className="mb-2 block text-gray-300">Establishment Date</Label>
                <div className="relative">
                  <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <Input
                    type="date"
                    value={establishmentDate}
                    onChange={(e) => setEstablishmentDate(e.target.value)}
                    className="pl-12 bg-black border-zinc-800 text-white h-12 rounded-lg focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Languages */}
              <div>
                <Label className="mb-2 block text-gray-300">Languages Spoken at Clinic</Label>
                <p className="text-sm text-gray-400 mb-3">
                  Select all languages your staff can communicate in (max 11)
                </p>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {AVAILABLE_LANGUAGES.map((lang) => (
                    <div
                      key={lang.value}
                      className={`
                        flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all
                        ${selectedLanguages.includes(lang.value)
                          ? 'bg-blue-500/20 border-blue-500/50 text-blue-400'
                          : 'bg-zinc-800 border-zinc-700 text-gray-400 hover:border-zinc-600'
                        }
                      `}
                      onClick={() => toggleLanguage(lang.value)}
                    >
                      <Checkbox
                        checked={selectedLanguages.includes(lang.value)}
                        onCheckedChange={() => toggleLanguage(lang.value)}
                        className="pointer-events-none"
                      />
                      <div className="flex-1">
                        <div className="text-sm font-medium">{lang.label}</div>
                        <div className="text-xs opacity-75">{lang.native}</div>
                      </div>
                    </div>
                  ))}
                </div>

                {selectedLanguages.length > 0 && (
                  <div className="mt-4 p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                    <div className="flex items-center gap-2 text-blue-400 text-sm">
                      <Languages className="w-4 h-4" />
                      <span>Selected: {selectedLanguages.length} language{selectedLanguages.length !== 1 ? 's' : ''}</span>
                    </div>
                  </div>
                )}

                {/* Company Name */}
                {companyName && (
                  <div>
                    <Label className="mb-2 block text-gray-300">Company Name</Label>
                    <div className="relative">
                      <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                      <Input
                        type="text"
                        value={companyName}
                        disabled
                        className="pl-12 bg-zinc-950 border-zinc-800 text-gray-500 h-12 rounded-lg cursor-not-allowed"
                      />
                    </div>
                  </div>
                )}

                {/* Division */}
                {division && (
                  <div>
                    <Label className="mb-2 block text-gray-300">Division</Label>
                    <div className="relative">
                      <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                      <Input
                        type="text"
                        value={division}
                        disabled
                        className="pl-12 bg-zinc-950 border-zinc-800 text-gray-500 h-12 rounded-lg cursor-not-allowed"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Bio for Miniwebsite */}
              <div>
                <Label className="mb-2 block text-gray-300">About Clinic (Bio)</Label>
                <p className="text-sm text-gray-400 mb-3">
                  This will be displayed on your clinic's miniwebsite for patients to read
                </p>
                <Textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Write about your clinic, services, specialities, history..."
                  className="bg-black border-zinc-800 text-white rounded-lg focus:border-blue-500 min-h-[150px]"
                  maxLength={500}
                />
                <p className="text-xs text-gray-500 mt-2">
                  {bio.length}/500 characters
                </p>
              </div>

              {/* Service Badges */}
              <div>
                <Label className="mb-2 block text-gray-300">Service Badges (Max 4)</Label>
                <p className="text-sm text-gray-400 mb-3">
                  Highlight key services available at your clinic (e.g., ECG, Physiotherapy, Echo, X-Ray)
                </p>

                {/* Display existing service badges */}
                <div className="flex flex-wrap gap-2 mb-3">
                  {serviceBadges.map((service, index) => (
                    <div
                      key={index}
                      className="bg-blue-500/20 border border-blue-500/30 text-blue-400 px-4 py-2 rounded-lg flex items-center gap-2"
                    >
                      <Stethoscope className="w-4 h-4" />
                      <span>{service}</span>
                      <button
                        onClick={() => removeServiceBadge(index)}
                        className="hover:text-blue-300"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>

                {/* Add new service badge */}
                {serviceBadges.length < 4 && (
                  <div className="flex gap-2">
                    <Select
                      value={newServiceBadge}
                      onValueChange={(val) => setNewServiceBadge(val)}
                    >
                      <SelectTrigger className="bg-black border-zinc-800 text-white h-12 rounded-lg focus:border-blue-500 w-full">
                        <SelectValue placeholder="Select a service" />
                      </SelectTrigger>
                      <SelectContent className="bg-zinc-900 border-zinc-800 text-white max-h-[300px]">
                        {CLINIC_SERVICES.filter(s => !serviceBadges.includes(s)).map((service) => (
                          <SelectItem key={service} value={service}>{service}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      onClick={addServiceBadge}
                      disabled={!newServiceBadge || serviceBadges.length >= 4}
                      className="bg-blue-500 hover:bg-blue-600 h-12 px-4"
                    >
                      <Plus className="w-5 h-5" />
                    </Button>
                  </div>
                )}

                {serviceBadges.length >= 4 && (
                  <p className="text-xs text-amber-500 mt-2">
                    Maximum 4 service badges reached. Remove one to add another.
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Registration Number & Footer Lines */}
          <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-8 mb-6">
            <h2 className="mb-6 text-white">Legal & Footer Information</h2>
            <p className="text-gray-400 text-sm mb-6">Registration details and custom footer lines for PDFs</p>

            <div className="space-y-6">
              {/* Registration Number */}
              <div>
                <Label className="mb-2 block text-gray-300">Clinic Registration Number (Optional)</Label>
                <div className="relative mb-4">
                  <Zap className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <Input
                    type="text"
                    value={registrationNumber}
                    onChange={(e) => setRegistrationNumber(e.target.value)}
                    placeholder="Enter your Clinic Registration Number"
                    className="pl-12 bg-black border-zinc-800 text-white h-12 rounded-lg focus:border-blue-500"
                  />
                </div>
                <div className="flex items-start gap-3 p-4 bg-zinc-800/50 rounded-lg border border-zinc-700">
                  <Checkbox
                    id="showClinicRegistrationOnRx"
                    checked={showRegistrationOnRx}
                    onCheckedChange={(checked) => setShowRegistrationOnRx(checked as boolean)}
                    className="mt-0.5"
                  />
                  <div className="flex-1">
                    <label
                      htmlFor="showClinicRegistrationOnRx"
                      className="text-sm text-white cursor-pointer block mb-1"
                    >
                      Show Registration Number on Digital RX
                    </label>
                    <p className="text-xs text-gray-400">
                      When enabled, your clinic registration number will be printed on generated prescriptions for legal compliance.
                    </p>
                  </div>
                </div>
              </div>

              {/* Custom Footer Lines */}
              <div>
                <Label className="mb-2 block text-gray-300">Custom RX Footer Lines (Optional)</Label>
                <p className="text-xs text-gray-400 mb-3">
                  Add up to 2 custom lines that will appear in the footer of Digital RX and Diet Chart PDFs. Use for emergency hospital contact, medico-legal cautions, disclaimers, etc.
                </p>
                <div className="space-y-3">
                  <div className="relative">
                    <Input
                      type="text"
                      value={footerLine1}
                      onChange={(e) => setFooterLine1(e.target.value)}
                      placeholder="e.g. In Emergency Contact: XYZ Hospital, Ph: 1234567890"
                      className="bg-black border-zinc-800 text-white h-12 rounded-lg focus:border-blue-500"
                      maxLength={120}
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-500">{footerLine1.length}/120</span>
                  </div>
                  <div className="relative">
                    <Input
                      type="text"
                      value={footerLine2}
                      onChange={(e) => setFooterLine2(e.target.value)}
                      placeholder="e.g. Medico-Legal Notice: This prescription is valid for 30 days only"
                      className="bg-black border-zinc-800 text-white h-12 rounded-lg focus:border-blue-500"
                      maxLength={120}
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-500">{footerLine2.length}/120</span>
                  </div>
                </div>
              </div>
            </div>

              {/* Watermark Logo for Digital RX */}
              <div>
                <Label className="mb-2 block text-gray-300">RX Watermark Logo (Optional)</Label>
                <p className="text-xs text-gray-400 mb-3">
                  Upload your clinic logo/emblem to appear as a faint watermark in the center of Digital RX PDFs. Recommended: PNG with transparent background, 200x200px.
                </p>
                <div className="flex items-center gap-4">
                  {watermarkLogo ? (
                    <div className="relative">
                      <img src={watermarkLogo} alt="Watermark" className="w-20 h-20 object-contain rounded-lg border border-zinc-700 bg-zinc-800 p-1" />
                      <button
                        onClick={() => setWatermarkLogo(null)}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs hover:bg-red-600"
                      >
                        ×
                      </button>
                    </div>
                  ) : (
                    <div className="w-20 h-20 rounded-lg border border-dashed border-zinc-700 flex items-center justify-center text-gray-500 text-xs">
                      No logo
                    </div>
                  )}
                  <div className="flex-1">
                    <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-lg text-sm text-white transition-colors">
                      {isUploadingWatermark ? 'Uploading...' : 'Upload Watermark Logo'}
                      <input
                        type="file"
                        className="hidden"
                        accept="image/*"
                        onChange={handleWatermarkUpload}
                        disabled={isUploadingWatermark}
                      />
                    </label>
                    <p className="text-[10px] text-gray-500 mt-1">PNG/JPG, max ~200KB recommended</p>
                  </div>
                </div>
              </div>
          </div>

          {/* Save Button */}
          <div className="flex justify-end mb-8">
            <Button
              onClick={handleSave}
              disabled={!name.trim()}
              className="bg-blue-500 hover:bg-blue-600 text-white px-8 py-6 text-lg rounded-lg flex items-center gap-2"
            >
              <Save className="w-5 h-5" />
              Save Changes
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
