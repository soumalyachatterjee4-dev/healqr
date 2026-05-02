import { useState, useEffect } from 'react';
import { User, Phone, Mail, Building2, Briefcase, Camera, Loader2, AlertTriangle, Save } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { toast } from 'sonner';
import { db, storage } from '../lib/firebase/config';
import { doc, getDoc, updateDoc, collection, query, where, getDocs, writeBatch } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useRef } from 'react';

interface MRData { name: string; email: string; phone: string; company: string; division: string; photoUrl?: string; }

export default function MRProfile({ mrId }: { mrId: string }) {
  const [mrData, setMrData] = useState<MRData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [formData, setFormData] = useState<MRData>({
    name: '', email: '', phone: '', company: '', division: ''
  });

  useEffect(() => {
    if (!mrId || !db) return;
    const fetchProfile = async () => {
      try {
        const docRef = await getDoc(doc(db, 'medicalReps', mrId));
        if (docRef.exists()) {
          const data = docRef.data() as MRData;
          setMrData(data);
          setFormData(data);
        }
      } catch (err) {
        console.error('Failed to load profile:', err);
        toast.error('Failed to load profile');
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [mrId]);

  const compressImage = (file: File, maxWidth = 800, maxHeight = 800, quality = 0.7): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > maxWidth) {
              height *= maxWidth / width;
              width = maxWidth;
            }
          } else {
            if (height > maxHeight) {
              width *= maxHeight / height;
              height = maxHeight;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);

          canvas.toBlob((blob) => {
            if (blob) resolve(blob);
            else reject(new Error('Canvas to Blob conversion failed'));
          }, 'image/jpeg', quality);
        };
        img.onerror = (err) => reject(err);
      };
      reader.onerror = (err) => reject(err);
    });
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !mrId) return;

    setUploadingImage(true);
    try {
      // Compress image before upload
      const compressedBlob = await compressImage(file);
      const storageRef = ref(storage, `mr_profiles/${mrId}_${Date.now()}.jpg`);
      await uploadBytes(storageRef, compressedBlob);
      const url = await getDownloadURL(storageRef);
      setFormData(prev => ({ ...prev, photoUrl: url }));
      
      // Auto-save image URL to Firestore
      await updateDoc(doc(db, 'medicalReps', mrId), { photoUrl: url });
      if (mrData) {
        setMrData({ ...mrData, photoUrl: url });
      }
      toast.success('Profile photo updated (compressed) successfully');
    } catch (err) {
      console.error('Failed to upload image:', err);
      toast.error('Failed to upload image');
    } finally {
      setUploadingImage(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSave = async () => {
    if (!mrId || !db || !mrData) return;
    
    // Validate
    if (!formData.name || !formData.phone || !formData.company) {
      toast.error('Name, Phone, and Company are required');
      return;
    }

    setSaving(true);
    try {
      const isCompanyChanged = formData.company !== mrData.company || formData.division !== mrData.division;

      if (isCompanyChanged) {
        const confirmChange = window.confirm(
          "WARNING: You are changing your Company or Division. This will reset ALL your approved doctor connections back to 'Pending'. You will need their approval again to book visits. Continue?"
        );
        if (!confirmChange) {
          setSaving(false);
          return;
        }
      }

      // Update MR Profile
      const mrRef = doc(db, 'medicalReps', mrId);
      await updateDoc(mrRef, { ...formData });

      // If company changed, reset all links
      if (isCompanyChanged) {
        const q = query(collection(db, 'mrDoctorLinks'), where('mrId', '==', mrId));
        const snap = await getDocs(q);
        
        const batch = writeBatch(db);
        snap.docs.forEach(docSnap => {
          batch.update(docSnap.ref, {
            mrCompany: formData.company,
            mrDivision: formData.division,
            mrName: formData.name, // in case name also changed
            mrPhone: formData.phone,
            status: 'pending' // Reset status
          });
        });
        await batch.commit();
        toast.success('Profile updated and connections reset to pending');
      } else {
        toast.success('Profile updated successfully');
      }

      setMrData(formData);
    } catch (err) {
      console.error('Failed to save profile:', err);
      toast.error('Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  const isCompanyChanged = mrData && (formData.company !== mrData.company || formData.division !== mrData.division);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
        <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
          <User className="w-6 h-6 text-blue-400" />
          Personal Details
        </h2>
        
        <div className="space-y-4">
          <div className="flex items-center gap-4 mb-6">
            <label 
              htmlFor="mr-profile-upload"
              className="w-20 h-20 bg-zinc-800 rounded-full flex items-center justify-center border border-zinc-700 relative group overflow-hidden cursor-pointer"
            >
              {formData.photoUrl ? (
                <img src={formData.photoUrl} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <User className="w-10 h-10 text-gray-500" />
              )}
              <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                {uploadingImage ? (
                  <Loader2 className="w-6 h-6 text-white animate-spin" />
                ) : (
                  <>
                    <Camera className="w-6 h-6 text-white mb-1" />
                    <span className="text-[10px] font-bold text-white">CHANGE</span>
                  </>
                )}
              </div>
            </label>
            <input 
              id="mr-profile-upload"
              type="file" 
              ref={fileInputRef}
              onChange={handleImageUpload}
              accept="image/jpeg, image/png, image/gif"
              className="hidden" 
            />
            <div>
              <h3 className="text-sm font-medium text-white">Profile Photo</h3>
              <p className="text-xs text-gray-400">JPG, PNG or GIF. Max size 2MB.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-gray-300 text-sm">Full Name</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <Input name="name" value={formData.name} onChange={handleChange} className="pl-10 bg-zinc-800 border-zinc-700 text-white" />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-gray-300 text-sm">Phone Number</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <Input name="phone" value={formData.phone} onChange={handleChange} className="pl-10 bg-zinc-800 border-zinc-700 text-white" />
              </div>
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label className="text-gray-300 text-sm">Email Address</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <Input name="email" value={formData.email} onChange={handleChange} className="pl-10 bg-zinc-800 border-zinc-700 text-white" />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
        <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
          <Building2 className="w-6 h-6 text-blue-400" />
          Company Details
        </h2>

        {isCompanyChanged && (
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4 mb-6 flex gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />
            <div>
              <h4 className="text-amber-500 text-sm font-semibold mb-1">Approval Reset Warning</h4>
              <p className="text-amber-500/80 text-xs leading-relaxed">
                Changing your company or division will reset all your currently approved doctor connections back to <strong>Pending</strong>. You will need to wait for doctors to approve your new company affiliation before you can book visits again.
              </p>
            </div>
          </div>
        )}
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-gray-300 text-sm">Company Name</Label>
            <div className="relative">
              <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <Input name="company" value={formData.company} onChange={handleChange} className="pl-10 bg-zinc-800 border-zinc-700 text-white" />
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-gray-300 text-sm">Division (Optional)</Label>
            <div className="relative">
              <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <Input name="division" value={formData.division} onChange={handleChange} className="pl-10 bg-zinc-800 border-zinc-700 text-white" />
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end pt-4">
        <Button onClick={handleSave} disabled={saving} className="bg-blue-600 hover:bg-blue-700 text-white px-8">
          {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
          {isCompanyChanged ? 'Save & Reset Approvals' : 'Save Changes'}
        </Button>
      </div>
    </div>
  );
}
