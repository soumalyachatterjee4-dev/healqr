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
  Plus,
  X,
  Upload,
  Save,
  Clock,
  Menu,
  Languages,
  Globe,
  Zap,
  Stethoscope,
  Star
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { ImageWithFallback } from './figma/ImageWithFallback';
import DashboardSidebar from './DashboardSidebar';
import { MEDICAL_SPECIALTIES, getSpecialtyLabel } from '../utils/medicalSpecialties';
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

interface ProfileManagerProps {
  onMenuChange?: (menu: string) => void;
  onLogout?: () => void;
  profileData?: {
    image: string | null;
    name: string;
    degrees: string[];
    specialties: string[];
    language?: 'english' | 'hindi' | 'bengali';
    linkedClinicCodes?: string[];
    linkedClinics?: Array<{clinicId: string; clinicCode: string; name: string}>;
    landmark?: string;
  };
  onProfileUpdate?: (data: {
    image: string | null;
    name: string;
    degrees: string[];
    specialties: string[];
    language?: 'english' | 'hindi' | 'bengali' | 'marathi' | 'tamil' | 'telugu' | 'gujarati' | 'kannada' | 'malayalam' | 'punjabi' | 'assamese';
  }) => void;
  activeAddOns?: string[];
  email?: string;
  dob?: string;
  qrNumber?: string;
  residentialPinCode?: string;
  companyName?: string;
  division?: string;
  qrType?: string;
}

export default function ProfileManager({ onMenuChange, onLogout, profileData, onProfileUpdate, activeAddOns = [], email = '', dob = '', qrNumber = '', residentialPinCode = '', doctorCode = '', companyName = '', division = '', qrType = '' }: ProfileManagerProps & { doctorCode?: string; companyName?: string; division?: string; qrType?: string }) {
  // Debug logging
  useEffect(() => {
  }, [email, profileData, dob, qrNumber, residentialPinCode]);

  // Sync state with props when they change (e.g. after async fetch in parent)
  useEffect(() => {
    if (residentialPinCode) {
      setResidentialPincodeState(residentialPinCode);
    }
  }, [residentialPinCode]);

  useEffect(() => {
    if (profileData) {
      if (profileData.name) setName(profileData.name);
      if (profileData.image) setProfileImage(profileData.image);
      // Don't sync language from props - it's loaded directly from Firestore to avoid race conditions
      // if (profileData.language) setPreferredLanguage(profileData.language);
      if (profileData.degrees) setDegrees(profileData.degrees);
      if (profileData.specialties) setSpecialties(profileData.specialties);
    }
  }, [profileData]);

  // Load profile from Firestore on mount
  useEffect(() => {
    loadProfileFromFirestore();
  }, []);

  const loadProfileFromFirestore = async () => {
    try {
      const user = auth?.currentUser;
      if (!user) {
        return;
      }

      const { db } = await import('../lib/firebase/config');
      if (!db) return;

      const { doc, getDoc } = await import('firebase/firestore');
      const doctorDocRef = doc(db, 'doctors', user.uid);
      const doctorDoc = await getDoc(doctorDocRef);

      if (doctorDoc.exists()) {
        const data = doctorDoc.data();

        // Set all fields from Firestore
        if (data.name) setName(data.name);
        if (data.pinCode) setResidentialPincodeState(data.pinCode);
        if (data.landmark) setLandmark(data.landmark);
        if (data.registrationNumber) setRegistrationNumber(data.registrationNumber);
        if (data.showRegistrationOnRx !== undefined) setShowRegistrationOnRx(data.showRegistrationOnRx);
        if (data.footerLine1) setFooterLine1(data.footerLine1);
        if (data.footerLine2) setFooterLine2(data.footerLine2);
        if (data.watermarkLogo) setWatermarkLogo(data.watermarkLogo);
        if (data.preferredLanguage) setPreferredLanguage(data.preferredLanguage);
        if (data.degrees) setDegrees(data.degrees);
        if (data.specialties) setSpecialties(data.specialties);
        if (data.specialities) setSpecialties(data.specialities);
        if (data.useDrPrefix !== undefined) setUseDrPrefix(data.useDrPrefix);
        if (data.practisingPincodes) setPractisingPincodes(data.practisingPincodes);
        if (data.experience) setExperience(data.experience);
        if (data.bio) setBio(data.bio);
        if (data.profileImage) setProfileImage(data.profileImage);
        if (data.clinicServices) setClinicServices(data.clinicServices);
        if (data.clinicServicesLabel) setClinicServicesLabel(data.clinicServicesLabel);
        if (data.googleReviewLink) setGoogleReviewLink(data.googleReviewLink);
      } else {
      }
    } catch (error) {
      console.error('❌ Error loading profile from Firestore:', error);
    }
  };

  // Non-editable fields (from registration) - now received as props
  // These fields are read-only and come from the signup process

  // Editable required fields
  const [name, setName] = useState(profileData?.name || '');
  const [residentialPincodeState, setResidentialPincodeState] = useState(residentialPinCode);
  const [landmark, setLandmark] = useState(profileData?.landmark || '');

  // Optional fields
  const [profileImage, setProfileImage] = useState<string | null>(profileData?.image || null);
  const [registrationNumber, setRegistrationNumber] = useState('');
  const [showRegistrationOnRx, setShowRegistrationOnRx] = useState(false);
  const [footerLine1, setFooterLine1] = useState('');
  const [footerLine2, setFooterLine2] = useState('');
  const [watermarkLogo, setWatermarkLogo] = useState<string | null>(null);
  const [isUploadingWatermark, setIsUploadingWatermark] = useState(false);
  const [preferredLanguage, setPreferredLanguage] = useState<'english' | 'hindi' | 'bengali' | 'marathi' | 'tamil' | 'telugu' | 'gujarati' | 'kannada' | 'malayalam' | 'punjabi' | 'assamese'>(profileData?.language || 'english');
  const [degrees, setDegrees] = useState<string[]>(profileData?.degrees || []);
  const [specialties, setSpecialties] = useState<string[]>(profileData?.specialties || []);
  const [useDrPrefix, setUseDrPrefix] = useState(true);
  const [practisingPincodes, setPractisingPincodes] = useState<string[]>([]);
  const [experience, setExperience] = useState('');
  const [bio, setBio] = useState('');
  const [clinicServices, setClinicServices] = useState<string[]>([]);
  const [clinicServicesLabel, setClinicServicesLabel] = useState('Done Here');
  const [googleReviewLink, setGoogleReviewLink] = useState('');

  // Clinic linking (Legacy - kept if needed for other logic, but section removed)
  const [linkedClinicCodes] = useState<string[]>(profileData?.linkedClinicCodes || []);
  const [linkedClinics] = useState<Array<{clinicId: string; clinicCode: string; name: string}>>(profileData?.linkedClinics || []);

  // Temporary inputs for adding new items
  const [newDegree, setNewDegree] = useState('');
  const [newSpeciality, setNewSpeciality] = useState('');
  const [newPincode, setNewPincode] = useState('');
  const [newService, setNewService] = useState('');

  // Confirmation dialog state
  const [showSaveConfirmation, setShowSaveConfirmation] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  // Sidebar state for mobile
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      const file = e.target.files?.[0];
      if (!file) return;


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
      const compressedFile = await compressImage(file);

      const filePath = `doctorProfileImages/${auth.currentUser.uid}/${Date.now()}_${file.name}`;
      const storageRef = ref(storage, filePath);
      await uploadBytes(storageRef, compressedFile);

      const downloadURL = await getDownloadURL(storageRef);
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

  const addDegree = () => {
    if (newDegree.trim()) {
      setDegrees([...degrees, newDegree.trim()]);
      setNewDegree('');
    }
  };

  const removeDegree = (index: number) => {
    setDegrees(degrees.filter((_, i) => i !== index));
  };

  const addSpeciality = () => {
    if (newSpeciality.trim()) {
      setSpecialties([...specialties, newSpeciality.trim()]);
      setNewSpeciality('');
    }
  };

  const removeSpecialty = (index: number) => {
    setSpecialties(specialties.filter((_, i) => i !== index));
  };

  const addPincode = () => {
    if (newPincode.trim()) {
      setPractisingPincodes([...practisingPincodes, newPincode.trim()]);
      setNewPincode('');
    }
  };

  const removePincode = (index: number) => {
    setPractisingPincodes(practisingPincodes.filter((_, i) => i !== index));
  };

  const addService = () => {
    if (newService.trim() && clinicServices.length < 4) {
      setClinicServices([...clinicServices, newService.trim()]);
      setNewService('');
    }
  };

  const removeService = (index: number) => {
    setClinicServices(clinicServices.filter((_, i) => i !== index));
  };



  const handleSaveChanges = async () => {
    // Validation
    if (!name.trim() || !residentialPincodeState.trim()) {
      alert('Name and Residential Pincode are required fields');
      return;
    }

    try {
      const user = auth?.currentUser;
      if (!user) {
        alert('You must be logged in to save profile');
        return;
      }

      const { db } = await import('../lib/firebase/config');
      if (!db) return;

      const { doc, setDoc, serverTimestamp } = await import('firebase/firestore');
      const doctorDocRef = doc(db, 'doctors', user.uid);

      // Save all profile data to Firestore
      await setDoc(
        doctorDocRef,
        {
          name,
          pinCode: residentialPincodeState,
          landmark,
          profileImage,
          registrationNumber,
          showRegistrationOnRx,
          footerLine1,
          footerLine2,
          watermarkLogo,
          preferredLanguage,
          degrees,
          specialties: specialties, // Normalized to 'specialties' (US)
          specialities: specialties, // Keep legacy field for backward compatibility
          practisingPincodes,
          experience,
          bio,
          useDrPrefix,
          clinicServices,
          clinicServicesLabel,
          googleReviewLink,
          linkedClinicCodes,
          linkedClinics,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );


      // Update shared profile data (for App.tsx state)
      if (onProfileUpdate) {
        onProfileUpdate({
          image: profileImage,
          name,
          degrees,
          specialties,
          language: preferredLanguage,
        });
      }

      // Show confirmation dialog
      setShowSaveConfirmation(true);

      // Auto-close after 2 seconds
      setTimeout(() => {
        setShowSaveConfirmation(false);
      }, 2000);
    } catch (error) {
      console.error('❌ Error saving profile:', error);
      alert('Failed to save profile. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-black text-white flex">
      {/* Sidebar */}
      <DashboardSidebar
        activeMenu="profile"
        onMenuChange={onMenuChange || (() => {})}
        onLogout={onLogout}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        activeAddOns={activeAddOns}
      />

      {/* Main Content */}
      <div className="flex-1 lg:ml-64">
        {/* Header */}
        <div className="border-b border-zinc-800 px-6 py-4 flex items-center gap-4">
          {/* Hamburger Menu for Mobile */}
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden text-white hover:text-emerald-500 transition-colors"
          >
            <Menu className="w-6 h-6" />
          </button>
          <h1>Profile Manager</h1>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="max-w-4xl mx-auto">
            {/* Profile Image Upload */}
            <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-8 mb-6">
              <h2 className="mb-6">Profile Picture</h2>

              <div className="flex items-center gap-6">
                <div className="relative">
                  {profileImage ? (
                    <ImageWithFallback
                      src={profileImage}
                      alt="Profile"
                      className="w-32 h-32 rounded-full object-cover border-2 border-emerald-500"
                    />
                  ) : (
                    <div className="w-32 h-32 rounded-full bg-zinc-800 border-2 border-zinc-700 flex items-center justify-center">
                      <User className="w-12 h-12 text-zinc-600" />
                    </div>
                  )}
                </div>

                <div>
                  <Label htmlFor="image-upload" className="cursor-pointer">
                    <div className="bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-3 rounded-lg inline-flex items-center gap-2 transition-colors">
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
                  />
                  <p className="text-gray-400 text-sm mt-2">
                    Optional - Auto-compressed to 800x800 JPEG (85% quality)
                  </p>
                </div>
              </div>
            </div>

            {/* Non-Editable Fields */}
            <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-8 mb-6">
              <h2 className="mb-6">Registration Details</h2>
              <p className="text-gray-400 text-sm mb-6">These fields cannot be edited</p>

              <div className="space-y-4">
                {/* Email */}
                <div>
                  <Label className="mb-2 block">Email Address</Label>
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

                {/* DOB */}
                <div>
                  <Label className="mb-2 block">Date of Birth</Label>
                  <div className="relative">
                    <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                    <Input
                      type="date"
                      value={dob}
                      disabled
                      className="pl-12 bg-zinc-950 border-zinc-800 text-gray-500 h-12 rounded-lg cursor-not-allowed"
                    />
                  </div>
                </div>

                {/* Doctor Code */}
                {doctorCode && (
                  <div>
                    <Label className="mb-2 block">Doctor Code</Label>
                    <div className="relative">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                      <Input
                        type="text"
                        value={doctorCode}
                        disabled
                        className="pl-12 bg-zinc-950 border-zinc-800 text-gray-500 h-12 rounded-lg cursor-not-allowed"
                      />
                    </div>
                  </div>
                )}

                {/* Residential Pin Code */}
                <div>
                  <Label className="mb-2 block">Residential Pin Code</Label>
                  <div className="relative">
                    <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                    <Input
                      type="text"
                      value={residentialPincodeState}
                      disabled
                      className="pl-12 bg-zinc-950 border-zinc-800 text-gray-500 h-12 rounded-lg cursor-not-allowed"
                    />
                  </div>
                </div>

                {/* State (Locked — auto-derived from pincode) */}
                {residentialPincodeState && getStateFromPincode(residentialPincodeState) !== 'Unknown' && (
                  <div>
                    <Label className="mb-2 block">State <span className="text-xs text-gray-600 font-normal">(Locked)</span></Label>
                    <div className="relative">
                      <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                      <Input
                        type="text"
                        value={getStateFromPincode(residentialPincodeState)}
                        disabled
                        className="pl-12 bg-zinc-950 border-zinc-800 text-gray-500 h-12 rounded-lg cursor-not-allowed"
                      />
                    </div>
                  </div>
                )}

                {/* Landmark (Read-Only) */}
                <div>
                  <Label className="mb-2 block">Clinic Landmark</Label>
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

                {/* QR Number */}
                {qrNumber && (
                  <div>
                    <Label className="mb-2 block flex items-center gap-2">
                      QR NUMBER (Linked)
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

                {/* Company Name */}
                <div>
                  <Label className="mb-2 block">Company Name</Label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                    <Input
                      type="text"
                      value={companyName || '—'}
                      disabled
                      className="pl-12 bg-zinc-950 border-zinc-800 text-gray-500 h-12 rounded-lg cursor-not-allowed"
                    />
                  </div>
                </div>

                {/* Division */}
                <div>
                  <Label className="mb-2 block">Division</Label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                    <Input
                      type="text"
                      value={division || '—'}
                      disabled
                      className="pl-12 bg-zinc-950 border-zinc-800 text-gray-500 h-12 rounded-lg cursor-not-allowed"
                    />
                  </div>
                </div>

                {/* Primary Specialty (Read-Only) */}
                <div>
                  <Label className="mb-2 block">Medical Specialty (Primary)</Label>
                  <p className="text-xs text-gray-500 mb-2">Selected during registration</p>
                  <div className="relative">
                    <Stethoscope className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-emerald-500/50" />
                    <Input
                      type="text"
                      value={getSpecialtyLabel(specialties[0]) || ''}
                      disabled
                      className="pl-12 bg-zinc-950 border-zinc-800 text-emerald-500/70 font-medium h-12 rounded-lg cursor-not-allowed"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Editable Required Fields */}
            <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-8 mb-6">
              <h2 className="mb-6">Basic Information</h2>
              <p className="text-gray-400 text-sm mb-6">Required fields - cannot be left empty</p>

              <div className="space-y-4">
                {/* Name */}
                <div>
                  <Label className="mb-2 block">
                    Full Name <span className="text-red-500">*</span>
                  </Label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <Input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Enter your full name"
                      className="pl-12 bg-black border-zinc-800 text-white h-12 rounded-lg focus:border-emerald-500"
                    />
                  </div>
                </div>

                {/* Editable Landmark */}
                <div className="mt-4">
                  <Label className="mb-2 block">
                    Update Clinic Landmark <span className="text-gray-500 font-normal ml-1">(helps patient find exact location)</span>
                  </Label>
                  <div className="relative">
                    <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <Input
                      type="text"
                      value={landmark}
                      onChange={(e) => setLandmark(e.target.value)}
                      placeholder="e.g., Near City Hospital"
                      className="pl-12 bg-black border-zinc-800 text-white h-12 rounded-lg focus:border-emerald-500"
                    />
                  </div>
                </div>

                  {/* Dr. Prefix Checkbox */}
                  <div className="mt-4 flex items-start gap-3 p-4 bg-zinc-800/50 rounded-lg border border-zinc-700">
                    <Checkbox
                      id="useDrPrefix"
                      checked={useDrPrefix}
                      onCheckedChange={(checked) => setUseDrPrefix(checked as boolean)}
                      className="mt-0.5"
                    />
                    <div className="flex-1">
                      <label
                        htmlFor="useDrPrefix"
                        className="text-sm text-white cursor-pointer block mb-1"
                      >
                        Display "Dr." prefix before my name
                      </label>
                      <p className="text-xs text-gray-400">
                        Uncheck this if you are a non-MBBS practitioner who cannot use the "Dr." title according to rural practice regulations. This affects your dashboard welcome message and mini website display.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

            {/* Reputation Management */}
            <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-8 mb-6">
              <h2 className="mb-6 flex items-center gap-2">
                <Star className="w-5 h-5 text-yellow-500" />
                Reputation Management
              </h2>
              <p className="text-gray-400 text-sm mb-6">Boost your online presence automatically</p>

              <div className="space-y-4">
                <div>
                  <Label className="mb-2 block">Google Maps Review Link</Label>
                  <p className="text-xs text-gray-500 mb-2">
                    Paste your "Get More Reviews" link from Google Business Profile.
                    Patients giving 4-5 stars will be redirected here.
                  </p>
                  <div className="relative">
                    <Globe className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <Input
                      type="url"
                      value={googleReviewLink}
                      onChange={(e) => setGoogleReviewLink(e.target.value)}
                      placeholder="e.g. https://g.page/r/CbX..."
                      className="pl-12 bg-black border-zinc-800 text-white h-12 rounded-lg focus:border-emerald-500"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Optional Fields */}
            <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-8 mb-6">
              <h2 className="mb-6">Additional Information</h2>
              <p className="text-gray-400 text-sm mb-6">Optional fields</p>

              <div className="space-y-6">
                {/* Registration Number */}
                <div>
                  <Label className="mb-2 block">Registration Number (Optional)</Label>
                  <div className="relative mb-4">
                    <Zap className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <Input
                      type="text"
                      value={registrationNumber}
                      onChange={(e) => setRegistrationNumber(e.target.value)}
                      placeholder="Enter your Medical Registration Number"
                      className="pl-12 bg-black border-zinc-800 text-white h-12 rounded-lg focus:border-emerald-500"
                    />
                  </div>
                  <div className="flex items-start gap-3 p-4 bg-zinc-800/50 rounded-lg border border-zinc-700">
                    <Checkbox
                      id="showRegistrationOnRx"
                      checked={showRegistrationOnRx}
                      onCheckedChange={(checked) => setShowRegistrationOnRx(checked as boolean)}
                      className="mt-0.5"
                    />
                    <div className="flex-1">
                      <label
                        htmlFor="showRegistrationOnRx"
                        className="text-sm text-white cursor-pointer block mb-1"
                      >
                        Show Registration Number on Digital RX
                      </label>
                      <p className="text-xs text-gray-400">
                        When enabled, your registration number will be printed on generated prescriptions for legal compliance.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Custom Footer Lines for RX/Diet Chart PDFs */}
                <div>
                  <Label className="mb-2 block">Custom RX Footer Lines (Optional)</Label>
                  <p className="text-xs text-gray-400 mb-3">
                    Add up to 2 custom lines that will appear in the footer of your Digital RX and Diet Chart PDFs. Use for emergency hospital contact, medico-legal cautions, disclaimers, etc.
                  </p>
                  <div className="space-y-3">
                    <div className="relative">
                      <Input
                        type="text"
                        value={footerLine1}
                        onChange={(e) => setFooterLine1(e.target.value)}
                        placeholder="e.g. In Emergency Contact: XYZ Hospital, Ph: 1234567890"
                        className="bg-black border-zinc-800 text-white h-12 rounded-lg focus:border-emerald-500"
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
                        className="bg-black border-zinc-800 text-white h-12 rounded-lg focus:border-emerald-500"
                        maxLength={120}
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-500">{footerLine2.length}/120</span>
                    </div>
                  </div>
                </div>

                {/* Watermark Logo for Digital RX */}
                <div>
                  <Label className="mb-2 block">RX Watermark Logo (Optional)</Label>
                  <p className="text-xs text-gray-400 mb-3">
                    Upload your logo/emblem to appear as a faint watermark in the center of Digital RX PDFs. Recommended: PNG with transparent background, 200x200px or similar.
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

                {/* Preferred Language */}
                <div>
                  <Label className="mb-2 block">Preferred Language</Label>
                  <p className="text-sm text-gray-400 mb-3">
                    Select your preferred language for dashboard and patient data display
                  </p>
                  <div className="relative">
                    <Languages className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <Select value={preferredLanguage} onValueChange={(value: 'english' | 'hindi' | 'bengali' | 'marathi' | 'tamil' | 'telugu' | 'gujarati' | 'kannada' | 'malayalam' | 'punjabi' | 'assamese') => setPreferredLanguage(value)}>
                      <SelectTrigger className="pl-12 bg-black border-zinc-800 text-white h-12 rounded-lg focus:border-emerald-500">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-zinc-900 border-zinc-800 text-white max-h-[300px]">
                        <SelectItem value="english">English</SelectItem>
                        <SelectItem value="hindi">हिंदी (Hindi)</SelectItem>
                        <SelectItem value="bengali">বাংলা (Bengali)</SelectItem>
                        <SelectItem value="marathi">मराठी (Marathi)</SelectItem>
                        <SelectItem value="tamil">தமிழ் (Tamil)</SelectItem>
                        <SelectItem value="telugu">తెలుగు (Telugu)</SelectItem>
                        <SelectItem value="gujarati">ગુજરાતી (Gujarati)</SelectItem>
                        <SelectItem value="kannada">ಕನ್ನಡ (Kannada)</SelectItem>
                        <SelectItem value="malayalam">മലയാളം (Malayalam)</SelectItem>
                        <SelectItem value="punjabi">ਪੰਜਾਬੀ (Punjabi)</SelectItem>
                        <SelectItem value="assamese">অসমীয়া (Assamese)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="mt-4 bg-gradient-to-r from-emerald-500/20 to-blue-500/20 border-2 border-emerald-500/50 rounded-xl p-5 shadow-lg">
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-emerald-500 rounded-lg animate-pulse">
                        <Languages className="w-5 h-5 text-white" />
                      </div>
                      <div className="flex-1">
                        <h4 className="text-white font-semibold flex items-center gap-2 mb-1">
                          Real-Time Translation Active
                          <span className="px-2 py-0.5 bg-emerald-500 text-white text-xs rounded-full animate-pulse">
                            LIVE
                          </span>
                        </h4>
                        <p className="text-emerald-300 text-sm leading-relaxed mb-3">
                          Patient data will be automatically translated from their selected language to <strong className="text-white">{
                            {
                              english: 'English',
                              hindi: 'हिंदी',
                              bengali: 'বাংলা',
                              marathi: 'मराठी',
                              tamil: 'தமிழ்',
                              telugu: 'తెలుగు',
                              gujarati: 'ગુજરાતી',
                              kannada: 'ಕನ್ನಡ',
                              malayalam: 'മലയാളം',
                              punjabi: 'ਪੰਜਾਬੀ',
                              assamese: 'অসমীয়া'
                            }[preferredLanguage]
                          }</strong> across all dashboard pages.
                        </p>
                        <div className="flex flex-wrap items-center gap-2 text-xs text-gray-300 mb-2">
                          <div className="flex items-center gap-1 bg-black/30 px-2 py-1 rounded">
                            <Globe className="w-3 h-3" />
                            <span>11 Languages Supported</span>
                          </div>
                          <div className="flex items-center gap-1 bg-black/30 px-2 py-1 rounded">
                            <Zap className="w-3 h-3" />
                            <span>Instant Translation</span>
                          </div>
                        </div>
                        <p className="text-xs text-gray-400 italic">
                          Need another language? Contact admin to add parliamentary languages.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Degrees */}
                <div>
                  <Label className="mb-2 block">Degree(s)</Label>

                  {/* Display existing degrees */}
                  <div className="flex flex-wrap gap-2 mb-3">
                    {degrees.map((degree, index) => (
                      <div
                        key={index}
                        className="bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 px-4 py-2 rounded-lg flex items-center gap-2"
                      >
                        <span>{degree}</span>
                        <button
                          onClick={() => removeDegree(index)}
                          className="hover:text-emerald-300"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* Add new degree */}
                  <div className="flex gap-2">
                    <Input
                      type="text"
                      value={newDegree}
                      onChange={(e) => setNewDegree(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && addDegree()}
                      placeholder="Add degree (e.g., MBBS, MD)"
                      className="bg-black border-zinc-800 text-white h-12 rounded-lg focus:border-emerald-500"
                    />
                    <Button
                      onClick={addDegree}
                      className="bg-emerald-500 hover:bg-emerald-600 h-12 px-4"
                    >
                      <Plus className="w-5 h-5" />
                    </Button>
                  </div>
                </div>

                {/* Specialities (Additional) */}
                <div>
                  <Label className="mb-2 block">Additional Specialties (Optional)</Label>
                  <p className="text-sm text-gray-400 mb-3">Add more specialties to your profile</p>

                  {/* Display existing specialities (Skipping the first one which is primary) */}
                  <div className="flex flex-wrap gap-2 mb-3">
                    {specialties.slice(1).map((speciality, index) => (
                      <div
                        key={index}
                        className="bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 px-4 py-2 rounded-lg flex items-center gap-2"
                      >
                        <span>{getSpecialtyLabel(speciality)}</span>
                        <button
                          onClick={() => removeSpecialty(index + 1)} // Adjusted index to account for primary
                          className="hover:text-emerald-300"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* Add new speciality */}
                  <div className="flex gap-2">
                    <Select value={newSpeciality} onValueChange={setNewSpeciality}>
                      <SelectTrigger className="bg-black border-zinc-800 text-white h-12 rounded-lg focus:border-emerald-500">
                        <SelectValue placeholder="Select specialty to add" />
                      </SelectTrigger>
                      <SelectContent className="bg-zinc-900 border-zinc-800 text-white max-h-[300px]">
                        {MEDICAL_SPECIALTIES.map(spec => (
                          <SelectItem key={spec.id} value={spec.id}>{spec.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      onClick={addSpeciality}
                      className="bg-emerald-500 hover:bg-emerald-600 h-12 px-4 whitespace-nowrap"
                    >
                      <Plus className="w-5 h-5 mr-2" />
                      Add
                    </Button>
                  </div>
                </div>

                {/* Practising Pin Codes */}
                <div>
                  <Label className="mb-2 block">Practising Pin Code(s)</Label>

                  {/* Display existing pincodes */}
                  <div className="flex flex-wrap gap-2 mb-3">
                    {practisingPincodes.map((pincode, index) => (
                      <div
                        key={index}
                        className="bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 px-4 py-2 rounded-lg flex items-center gap-2"
                      >
                        <span>{pincode}</span>
                        <button
                          onClick={() => removePincode(index)}
                          className="hover:text-emerald-300"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* Add new pincode */}
                  <div className="flex gap-2">
                    <Input
                      type="text"
                      value={newPincode}
                      onChange={(e) => setNewPincode(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && addPincode()}
                      placeholder="Add practising pin code"
                      className="bg-black border-zinc-800 text-white h-12 rounded-lg focus:border-emerald-500"
                    />
                    <Button
                      onClick={addPincode}
                      className="bg-emerald-500 hover:bg-emerald-600 h-12 px-4"
                    >
                      <Plus className="w-5 h-5" />
                    </Button>
                  </div>
                </div>


                {/* Experience */}
                <div>
                  <Label className="mb-2 block">Experience</Label>
                  <div className="relative">
                    <Clock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <Input
                      type="text"
                      value={experience}
                      onChange={(e) => setExperience(e.target.value)}
                      placeholder="e.g., 10 years"
                      className="pl-12 bg-black border-zinc-800 text-white h-12 rounded-lg focus:border-emerald-500"
                    />
                  </div>
                </div>

                {/* Clinic Services/Facilities */}
                <div>
                  <Label className="mb-2 block">Clinic Services/Facilities (Max 4)</Label>
                  <p className="text-xs text-gray-400 mb-3">
                    Add services available at your clinic (e.g., ECG, ECHO, Pathology, Physiotherapy)
                  </p>

                  {/* Custom Label for Services */}
                  <div className="mb-3">
                    <Label className="mb-2 block text-sm">Service Status Text</Label>
                    <Input
                      value={clinicServicesLabel}
                      onChange={(e) => setClinicServicesLabel(e.target.value)}
                      placeholder="e.g., Done Here, Service Available, Available Here"
                      className="bg-black border-zinc-800 text-white h-10 rounded-lg focus:border-emerald-500"
                      maxLength={50}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      This text will appear once below all service badges
                    </p>
                  </div>

                  {/* Add new service */}
                  <div className="flex gap-2 mb-3">
                    <Input
                      value={newService}
                      onChange={(e) => setNewService(e.target.value)}
                      placeholder="e.g., ECG Done Here"
                      className="flex-1 bg-black border-zinc-800 text-white h-10 rounded-lg focus:border-emerald-500"
                      disabled={clinicServices.length >= 4}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          addService();
                        }
                      }}
                    />
                    <Button
                      type="button"
                      onClick={addService}
                      disabled={!newService.trim() || clinicServices.length >= 4}
                      className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 h-10 rounded-lg"
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>

                  {/* Display added services */}
                  {clinicServices.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {clinicServices.map((service, index) => (
                        <div
                          key={index}
                          className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-3 py-1.5 rounded-full text-sm flex items-center gap-2"
                        >
                          <span>{service}</span>
                          <button
                            onClick={() => removeService(index)}
                            className="hover:bg-white/20 rounded-full p-0.5"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  {clinicServices.length >= 4 && (
                    <p className="text-xs text-yellow-400 mt-2">
                      Maximum 4 services reached
                    </p>
                  )}
                </div>

                {/* Bio */}
                <div>
                  <Label className="mb-2 block">Bio</Label>
                  <Textarea
                    value={bio}
                    onChange={(e) => {
                      const newValue = e.target.value.slice(0, 500);
                      setBio(newValue);
                    }}
                    onPaste={(e) => {
                      e.preventDefault();
                      const pastedText = e.clipboardData.getData('text');
                      const currentValue = bio;
                      const start = (e.target as HTMLTextAreaElement).selectionStart;
                      const end = (e.target as HTMLTextAreaElement).selectionEnd;
                      const newValue = (currentValue.substring(0, start) + pastedText + currentValue.substring(end)).slice(0, 500);
                      setBio(newValue);
                    }}
                    placeholder="Write a brief bio about yourself and your practice..."
                    className="bg-black border-zinc-800 text-white rounded-lg focus:border-emerald-500 min-h-[120px] resize-none"
                  />
                  <div className="text-right mt-2">
                    <span className={`text-sm ${bio.length >= 500 ? 'text-red-500' : 'text-gray-400'}`}>
                      {bio.length}/500 characters
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Website Preview Info */}
            <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-6 mb-6">
              <h3 className="text-emerald-400 mb-2">Mini Website Fields</h3>
              <p className="text-gray-300 text-sm">
                The following fields will be displayed on your doctor mini website: <span className="text-white">Image, Name, Degree(s), Speciality(s), Experience, and Bio</span>
              </p>
            </div>

            {/* Save Button */}
            <Button
              onClick={handleSaveChanges}
              className="w-full bg-emerald-500 hover:bg-emerald-600 text-white h-14 rounded-lg flex items-center justify-center gap-2"
            >
              <Save className="w-5 h-5" />
              Save Changes
            </Button>
          </div>
        </div>
      </div>

      {/* Save Confirmation Dialog */}
      <AlertDialog open={showSaveConfirmation} onOpenChange={setShowSaveConfirmation}>
        <AlertDialogContent className="bg-zinc-900 border-zinc-800 text-white">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-emerald-400 flex items-center gap-2">
              <Save className="w-5 h-5" />
              Changes Saved Successfully
            </AlertDialogTitle>
            <AlertDialogDescription className="text-gray-300">
              Your profile has been updated successfully. All changes have been saved.
            </AlertDialogDescription>
          </AlertDialogHeader>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

