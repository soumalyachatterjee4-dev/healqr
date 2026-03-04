import { useState, useEffect } from 'react';
import { db } from '../lib/firebase/config';
import { storage } from '../lib/firebase/config';
import {
  doc,
  getDoc,
  updateDoc,
  collection,
  addDoc,
  serverTimestamp,
  arrayUnion,
  arrayRemove
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { toast } from 'sonner';
import { getAllStates } from '../utils/pincodeMapping';
import { Button } from './ui/button';
import { Globe, Plus, Trash2, Loader2, Upload, X } from 'lucide-react';

const ALL_SPECIALTIES = [
  "Clinic",
  "General Physician",
  "Cardiologist",
  "Dermatologist",
  "Gynecologist",
  "Pediatrician",
  "Orthopedist",
  "Neurologist",
  "Psychiatrist",
  "Dentist",
  "ENT Specialist",
  "Ophthalmologist",
  "Urologist",
  "Gastroenterologist",
  "Pulmonologist",
  "Endocrinologist",
  "Rheumatologist",
  "Nephrologist",
  "Oncologist",
  "Surgeon",
  "Physiotherapist",
  "Ayurveda",
  "Homeopathy",
];

interface PharmaProfileManagerProps {
  companyId: string;
}

interface ChangeRequest {
  id: string;
  companyId: string;
  companyName?: string;
  type: 'territory' | 'specialty';
  action: 'add' | 'remove';
  items: string[];
  status: 'pending' | 'approved' | 'rejected';
  createdAt: any;
}

export default function PharmaProfileManager({ companyId }: PharmaProfileManagerProps) {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [contactPerson, setContactPerson] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [savingContact, setSavingContact] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  // territory change state
  const [territoryAdd, setTerritoryAdd] = useState<string[]>([]);
  const [territoryRemove, setTerritoryRemove] = useState<string[]>([]);
  const [specialtyAdd, setSpecialtyAdd] = useState<string[]>([]);
  const [specialtyRemove, setSpecialtyRemove] = useState<string[]>([]);
  const [postingRequest, setPostingRequest] = useState(false);

  const allStates = getAllStates();

  useEffect(() => {
    loadProfile();
  }, [companyId]);

  const loadProfile = async () => {
    if (!companyId || !db) return;
    setLoading(true);
    try {
      const docRef = doc(db, 'pharmaCompanies', companyId);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        const data = snap.data();
        setProfile(data);
        setContactPerson(data.contactPerson || '');
        setContactPhone(data.contactPhone || '');
      }
    } catch (err) {
      console.error('Failed to load profile', err);
    } finally {
      setLoading(false);
    }
  };

  const handleContactSave = async () => {
    if (!db || !companyId) return;
    setSavingContact(true);
    try {
      await updateDoc(doc(db, 'pharmaCompanies', companyId), {
        contactPerson,
        contactPhone,
        updatedAt: serverTimestamp(),
      });
      toast.success('Contact information updated');
    } catch (err) {
      console.error(err);
      toast.error('Failed to save contact info');
    } finally {
      setSavingContact(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !db || !storage || !companyId) return;
    
    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size should be less than 5MB');
      return;
    }

    setUploadingImage(true);
    try {
      const imageRef = ref(storage, `pharmaCompanies/${companyId}/logo`);
      const snapshot = await uploadBytes(imageRef, file);
      const downloadURL = await getDownloadURL(snapshot.ref);
      
      await updateDoc(doc(db, 'pharmaCompanies', companyId), {
        logoUrl: downloadURL,
        updatedAt: serverTimestamp(),
      });
      
      // Update profile with new image
      setProfile((prev: any) => ({ ...prev, logoUrl: downloadURL }));
      toast.success('Company logo updated');
    } catch (err) {
      console.error(err);
      toast.error('Failed to upload image');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleRemoveImage = async () => {
    if (!db || !companyId) return;
    setUploadingImage(true);
    try {
      await updateDoc(doc(db, 'pharmaCompanies', companyId), {
        logoUrl: null,
        updatedAt: serverTimestamp(),
      });
      setProfile((prev: any) => ({ ...prev, logoUrl: null }));
      toast.success('Logo removed');
    } catch (err) {
      console.error(err);
      toast.error('Failed to remove logo');
    } finally {
      setUploadingImage(false);
    }
  };

  const submitChangeRequest = async (
    type: 'territory' | 'specialty',
    action: 'add' | 'remove',
    items: string[]
  ) => {
    if (!db || !companyId || items.length === 0) return;
    setPostingRequest(true);
    try {
      await addDoc(collection(db, 'pharmaChangeRequests'), {
        companyId,
        companyName: profile?.companyName || '',
        type,
        action,
        items,
        status: 'pending',
        createdAt: serverTimestamp(),
      });
      toast.success('Change request submitted');
      // clear selections
      if (type === 'territory') {
        setTerritoryAdd([]);
        setTerritoryRemove([]);
      } else {
        setSpecialtyAdd([]);
        setSpecialtyRemove([]);
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to submit request');
    } finally {
      setPostingRequest(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin w-8 h-8 text-blue-500" />
      </div>
    );
  }

  if (!profile) {
    return <p className="p-4">Profile not found.</p>;
  }

  const availableAddStates = allStates.filter((s) => !profile.territoryStates?.includes(s));
  const availableRemoveStates = profile.territoryStates || [];
  const availableAddSpecialties = ALL_SPECIALTIES.filter(
    (s) => !profile.specialties?.includes(s)
  );
  const availableRemoveSpecialties = profile.specialties || [];

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <h2 className="text-2xl font-bold">Company Profile</h2>

      {/* Company Logo Section */}
      <div className="bg-zinc-900 rounded-xl p-6">
        <h3 className="font-semibold mb-4">Company Logo</h3>
        <div className="flex items-center gap-6">
          {/* Logo Preview */}
          <div className="w-32 h-32 bg-zinc-800 rounded-lg border border-zinc-700 flex items-center justify-center overflow-hidden">
            {profile?.logoUrl ? (
              <img
                src={profile.logoUrl}
                alt="Company Logo"
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-gray-500 text-sm text-center px-4">No logo uploaded</span>
            )}
          </div>
          
          {/* Upload Controls */}
          <div className="flex-1 space-y-3">
            <label className="block">
              <div className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed w-fit">
                <Upload className="w-4 h-4" />
                <span>{uploadingImage ? 'Uploading...' : 'Upload Logo'}</span>
              </div>
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                disabled={uploadingImage}
                className="hidden"
              />
            </label>
            {profile?.logoUrl && (
              <button
                onClick={handleRemoveImage}
                disabled={uploadingImage}
                className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed w-fit"
              >
                <X className="w-4 h-4" />
                <span>Remove Logo</span>
              </button>
            )}
            <p className="text-xs text-gray-400">JPG, PNG (Max 5MB)</p>
          </div>
        </div>
      </div>

      {/* Locked information section */}
      <div className="bg-zinc-900 rounded-xl p-6 space-y-4">
        <h3 className="font-semibold">Registration Details (locked)</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-gray-400">Company Name</p>
            <p className="font-medium">{profile.companyName}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400">Contact Email</p>
            <p className="font-medium">{profile.contactEmail}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400">GST Number</p>
            <p className="font-medium">{profile.gstNumber || '—'}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400">Division/Branch</p>
            <p className="font-medium">{profile.division || '—'}</p>
          </div>
          <div className="sm:col-span-2">
            <p className="text-xs text-gray-400">Address</p>
            <p className="font-medium">{profile.address || '—'}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400">Registered Office Pincode</p>
            <p className="font-medium">{profile.registeredOfficePincode}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400">Registered Office State</p>
            <p className="font-medium">{profile.registeredOfficeState}</p>
          </div>
        </div>
      </div>

      {/* Contact editable */}
      <div className="bg-zinc-900 rounded-xl p-6 space-y-4">
        <h3 className="font-semibold">Contact Person</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-gray-400">Name</label>
            <input
              value={contactPerson}
              onChange={(e) => setContactPerson(e.target.value)}
              className="w-full bg-zinc-800 rounded-lg p-2 text-white"
            />
          </div>
          <div>
            <label className="text-xs text-gray-400">Mobile Number</label>
            <input
              value={contactPhone}
              onChange={(e) => setContactPhone(e.target.value)}
              className="w-full bg-zinc-800 rounded-lg p-2 text-white"
            />
          </div>
        </div>
        <Button disabled={savingContact} onClick={handleContactSave} className="mt-2">
          {savingContact ? <Loader2 className="animate-spin w-4 h-4 mr-2" /> : null} Save
        </Button>
      </div>

      {/* Territory section */}
      <div className="bg-zinc-900 rounded-xl p-6 space-y-4">
        <h3 className="font-semibold flex items-center gap-2">
          <Globe className="w-5 h-5" /> Territory Coverage
        </h3>
        <p className="text-sm text-gray-400">
          {profile.territoryType === 'all_india'
            ? 'All India (pan India)'
            : (profile.territoryStates || []).join(', ')}
        </p>
        {/* Add states */}
        {profile.territoryType === 'all_india' && (
          <p className="text-xs text-gray-400 italic">
            You already have pan India coverage; no additional states can be added.
          </p>
        )}
        {availableAddStates.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs text-gray-400">Add states (click to select then Request addition)</p>
            <div className="flex flex-wrap gap-2">
              {availableAddStates.map((s) => (
                <button
                  key={s}
                  className={`px-2 py-1 rounded-full text-sm border ${territoryAdd.includes(s)
                    ? 'bg-blue-600 border-blue-600 text-white'
                    : 'border-blue-400 text-blue-300'
                  }`}
                  onClick={() => {
                    setTerritoryAdd((prev) =>
                      prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]
                    );
                  }}
                >{s}</button>
              ))}
            </div>
            <Button disabled={territoryAdd.length === 0 || postingRequest} onClick={() => submitChangeRequest('territory', 'add', territoryAdd)}>
              Request addition
            </Button>
          </div>
        )}

        {/* Remove states */}
        {availableRemoveStates.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs text-gray-400">Remove states</p>
            <div className="flex flex-wrap gap-2">
              {availableRemoveStates.map((s) => (
                <button
                  key={s}
                  className={`px-2 py-1 rounded-full text-sm border ${territoryRemove.includes(s)
                    ? 'bg-red-600 border-red-600 text-white'
                    : 'border-red-400 text-red-300'
                  }`}
                  onClick={() => {
                    setTerritoryRemove((prev) =>
                      prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]
                    );
                  }}
                >{s}</button>
              ))}
            </div>
            <Button disabled={territoryRemove.length === 0 || postingRequest} variant="outline" onClick={() => submitChangeRequest('territory', 'remove', territoryRemove)}>
              Request removal
            </Button>
          </div>
        )}
      </div>

      {/* Specialties section */}
      <div className="bg-zinc-900 rounded-xl p-6 space-y-4">
        <h3 className="font-semibold">Specialties Covered</h3>
        <p className="text-sm text-gray-400">{(profile.specialties || []).join(', ') || 'None'}</p>
        {/* Add specialties */}
        {availableAddSpecialties.length === 0 && (
          <p className="text-xs text-gray-400 italic">
            All available specialties are already covered.
          </p>
        )}
        {availableAddSpecialties.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs text-gray-400">Add specialties (click to select then Request addition)</p>
            <div className="flex flex-wrap gap-2">
              {availableAddSpecialties.map((s) => (
                <button
                  key={s}
                  className={`px-2 py-1 rounded-full text-sm border ${specialtyAdd.includes(s)
                    ? 'bg-blue-600 border-blue-600 text-white'
                    : 'border-blue-400 text-blue-300'
                  }`}
                  onClick={() => {
                    setSpecialtyAdd((prev) =>
                      prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]
                    );
                  }}
                >{s}</button>
              ))}
            </div>
            <Button disabled={specialtyAdd.length === 0 || postingRequest} onClick={() => submitChangeRequest('specialty', 'add', specialtyAdd)}>
              Request addition
            </Button>
          </div>
        )}
        {/* Remove specialties */}
        {availableRemoveSpecialties.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs text-gray-400">Remove specialties</p>
            <div className="flex flex-wrap gap-2">
              {availableRemoveSpecialties.map((s) => (
                <button
                  key={s}
                  className={`px-2 py-1 rounded-full text-sm border ${specialtyRemove.includes(s)
                    ? 'bg-red-600 border-red-600 text-white'
                    : 'border-red-400 text-red-300'
                  }`}
                  onClick={() => {
                    setSpecialtyRemove((prev) =>
                      prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]
                    );
                  }}
                >{s}</button>
              ))}
            </div>
            <Button disabled={specialtyRemove.length === 0 || postingRequest} variant="outline" onClick={() => submitChangeRequest('specialty', 'remove', specialtyRemove)}>
              Request removal
            </Button>
          </div>
        )}
      </div>

    </div>
  );
}
