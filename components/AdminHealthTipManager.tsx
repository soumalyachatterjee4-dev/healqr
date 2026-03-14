import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { 
  Heart, 
  Upload, 
  Trash2, 
  Edit, 
  Save, 
  X, 
  Plus,
  Eye,
  EyeOff,
  Sparkles,
  CheckCircle2
} from 'lucide-react';
import { toast } from 'sonner';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase/config';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../lib/firebase/config';

interface HealthTipTemplate {
  id: number;
  name: string;
  description: string;
  category: 'health-tip';
  imageUrl: string;
  placements: string[]; // ['patient-login', 'patient-dashboard', 'patient-otp']
  isPublished: boolean;
  uploadDate: string;
  uploadedBy: string;
}

const PLACEMENT_OPTIONS = [
  { value: 'patient-login', label: 'Patient Login Page', icon: '🔐' },
  { value: 'patient-otp', label: 'OTP Verification Page', icon: '🔢' },
  { value: 'patient-dashboard', label: 'Patient Dashboard', icon: '📊' },
  { value: 'patient-history', label: 'Patient History', icon: '📜' },
  { value: 'patient-chat', label: 'Patient Chat', icon: '💬' },
  { value: 'patient-live-status', label: 'Patient Live Status', icon: '🔴' },
  { value: 'patient-notifications', label: 'Patient Notifications', icon: '🔔' },
  { value: 'landing-patient-modal', label: 'Landing Page Modal', icon: '🏠' }
];

export default function AdminHealthTipManager() {
  const [healthTips, setHealthTips] = useState<HealthTipTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [uploadingNew, setUploadingNew] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    placements: [] as string[],
    isPublished: true
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');

  useEffect(() => {
    loadHealthTips();
  }, []);

  const loadHealthTips = async () => {
    setLoading(true);
    try {
      const adminRef = doc(db, 'adminProfiles', 'super_admin');
      const adminSnap = await getDoc(adminRef);

      if (adminSnap.exists()) {
        const data = adminSnap.data();
        const allTemplates = data.globalTemplates || [];
        const healthTipTemplates = allTemplates.filter(
          (t: any) => t.category === 'health-tip'
        );
        setHealthTips(healthTipTemplates);
        console.log('✅ Loaded', healthTipTemplates.length, 'health tips');
      }
    } catch (error) {
      console.error('Error loading health tips:', error);
      toast.error('Failed to load health tips');
    } finally {
      setLoading(false);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Image size should be less than 5MB');
        return;
      }
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const togglePlacement = (placement: string) => {
    setFormData(prev => ({
      ...prev,
      placements: prev.placements.includes(placement)
        ? prev.placements.filter(p => p !== placement)
        : [...prev.placements, placement]
    }));
  };

  const handleSaveHealthTip = async () => {
    if (!formData.name.trim()) {
      toast.error('Please enter a name for the health tip');
      return;
    }

    if (!formData.description.trim()) {
      toast.error('Please enter a description');
      return;
    }

    if (formData.placements.length === 0) {
      toast.error('Please select at least one placement location');
      return;
    }

    if (!imageFile && !imagePreview) {
      toast.error('Please upload an image');
      return;
    }

    setLoading(true);

    try {
      let imageUrl = imagePreview;

      // Upload image if new file selected
      if (imageFile) {
        const timestamp = Date.now();
        const fileName = `health-tips/${timestamp}_${imageFile.name}`;
        const storageRef = ref(storage, fileName);
        
        await uploadBytes(storageRef, imageFile);
        imageUrl = await getDownloadURL(storageRef);
      }

      // Get current templates
      const adminRef = doc(db, 'adminProfiles', 'super_admin');
      const adminSnap = await getDoc(adminRef);
      
      if (!adminSnap.exists()) {
        throw new Error('Admin profile not found');
      }

      const data = adminSnap.data();
      let allTemplates = data.globalTemplates || [];

      if (editingId !== null) {
        // Update existing
        allTemplates = allTemplates.map((t: any) =>
          t.id === editingId
            ? {
                ...t,
                name: formData.name,
                description: formData.description,
                placements: formData.placements,
                isPublished: formData.isPublished,
                imageUrl
              }
            : t
        );
        toast.success('Health tip updated successfully!');
      } else {
        // Add new
        const newId = Math.max(0, ...allTemplates.map((t: any) => t.id)) + 1;
        const newTip: HealthTipTemplate = {
          id: newId,
          name: formData.name,
          description: formData.description,
          category: 'health-tip',
          imageUrl,
          placements: formData.placements,
          isPublished: formData.isPublished,
          uploadDate: new Date().toISOString(),
          uploadedBy: 'admin'
        };
        allTemplates.push(newTip);
        toast.success('Health tip created successfully!');
      }

      // Save to Firestore
      await updateDoc(adminRef, {
        globalTemplates: allTemplates
      });

      // Refresh list
      await loadHealthTips();

      // Reset form
      resetForm();

      // Trigger template refresh event
      window.dispatchEvent(new Event('template-refresh'));

    } catch (error) {
      console.error('Error saving health tip:', error);
      toast.error('Failed to save health tip');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (tip: HealthTipTemplate) => {
    setEditingId(tip.id);
    setFormData({
      name: tip.name,
      description: tip.description,
      placements: tip.placements,
      isPublished: tip.isPublished
    });
    setImagePreview(tip.imageUrl);
    setImageFile(null);
    setUploadingNew(false);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this health tip?')) {
      return;
    }

    setLoading(true);
    try {
      const adminRef = doc(db, 'adminProfiles', 'super_admin');
      const adminSnap = await getDoc(adminRef);
      
      if (adminSnap.exists()) {
        const data = adminSnap.data();
        const allTemplates = data.globalTemplates || [];
        const updatedTemplates = allTemplates.filter((t: any) => t.id !== id);

        await updateDoc(adminRef, {
          globalTemplates: updatedTemplates
        });

        toast.success('Health tip deleted successfully!');
        await loadHealthTips();

        // Trigger template refresh event
        window.dispatchEvent(new Event('template-refresh'));
      }
    } catch (error) {
      console.error('Error deleting health tip:', error);
      toast.error('Failed to delete health tip');
    } finally {
      setLoading(false);
    }
  };

  const togglePublishStatus = async (tip: HealthTipTemplate) => {
    setLoading(true);
    try {
      const adminRef = doc(db, 'adminProfiles', 'super_admin');
      const adminSnap = await getDoc(adminRef);
      
      if (adminSnap.exists()) {
        const data = adminSnap.data();
        const allTemplates = data.globalTemplates || [];
        const updatedTemplates = allTemplates.map((t: any) =>
          t.id === tip.id ? { ...t, isPublished: !t.isPublished } : t
        );

        await updateDoc(adminRef, {
          globalTemplates: updatedTemplates
        });

        toast.success(`Health tip ${!tip.isPublished ? 'published' : 'unpublished'}!`);
        await loadHealthTips();

        // Trigger template refresh event
        window.dispatchEvent(new Event('template-refresh'));
      }
    } catch (error) {
      console.error('Error toggling publish status:', error);
      toast.error('Failed to update publish status');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      placements: [],
      isPublished: true
    });
    setImageFile(null);
    setImagePreview('');
    setEditingId(null);
    setUploadingNew(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 bg-pink-500/10 rounded-xl flex items-center justify-center">
            <Heart className="h-6 w-6 text-pink-500" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white">Health Tip Manager</h2>
            <p className="text-sm text-gray-400">
              Create and manage health tips displayed across patient pages
            </p>
          </div>
        </div>

        {!uploadingNew && editingId === null && (
          <Button
            onClick={() => setUploadingNew(true)}
            className="bg-pink-600 hover:bg-pink-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            Create New Health Tip
          </Button>
        )}
      </div>

      {/* Create/Edit Form */}
      {(uploadingNew || editingId !== null) && (
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-white flex items-center justify-between">
              <span>{editingId !== null ? 'Edit Health Tip' : 'Create New Health Tip'}</span>
              <Button
                onClick={resetForm}
                variant="ghost"
                size="sm"
                className="text-gray-400 hover:text-white"
              >
                <X className="h-4 w-4" />
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Name/Title
              </label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Stay Hydrated"
                className="bg-zinc-800 border-zinc-700 text-white"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Brief description of the health tip..."
                rows={3}
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-md text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-pink-500"
              />
            </div>

            {/* Placement Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-3">
                Display Locations
              </label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {PLACEMENT_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => togglePlacement(option.value)}
                    className={`p-4 rounded-lg border-2 transition-all ${
                      formData.placements.includes(option.value)
                        ? 'border-pink-500 bg-pink-500/10'
                        : 'border-zinc-700 bg-zinc-800 hover:border-zinc-600'
                    }`}
                  >
                    <div className="text-2xl mb-2">{option.icon}</div>
                    <div className="text-sm font-medium text-white">{option.label}</div>
                    {formData.placements.includes(option.value) && (
                      <CheckCircle2 className="h-4 w-4 text-pink-500 mt-2 mx-auto" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Image Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Health Tip Image
              </label>
              <div className="space-y-4">
                <Input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="bg-zinc-800 border-zinc-700 text-white file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-pink-500 file:text-white hover:file:bg-pink-600"
                />
                {imagePreview && (
                  <div className="relative inline-block">
                    <img
                      src={imagePreview}
                      alt="Preview"
                      className="max-w-md h-auto rounded-lg border border-zinc-700"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Published Toggle */}
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="isPublished"
                checked={formData.isPublished}
                onChange={(e) => setFormData({ ...formData, isPublished: e.target.checked })}
                className="h-4 w-4 rounded border-zinc-700 text-pink-600 focus:ring-pink-500"
              />
              <label htmlFor="isPublished" className="text-sm text-gray-300">
                Publish immediately (users will see this health tip)
              </label>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <Button
                onClick={handleSaveHealthTip}
                disabled={loading}
                className="flex-1 bg-pink-600 hover:bg-pink-700"
              >
                <Save className="h-4 w-4 mr-2" />
                {editingId !== null ? 'Update Health Tip' : 'Create Health Tip'}
              </Button>
              <Button
                onClick={resetForm}
                variant="outline"
                className="border-zinc-700 text-gray-300 hover:bg-zinc-800"
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Health Tips List */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {loading && healthTips.length === 0 ? (
          <div className="col-span-full text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-500 mx-auto mb-4"></div>
            <p className="text-gray-400">Loading health tips...</p>
          </div>
        ) : healthTips.length === 0 ? (
          <div className="col-span-full text-center py-12">
            <Sparkles className="h-12 w-12 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400">No health tips created yet</p>
            <p className="text-sm text-gray-500 mt-2">Click "Create New Health Tip" to get started</p>
          </div>
        ) : (
          healthTips.map((tip) => (
            <Card key={tip.id} className="bg-zinc-900 border-zinc-800 overflow-hidden">
              <div className="relative">
                <img
                  src={tip.imageUrl}
                  alt={tip.name}
                  className="w-full h-48 object-cover"
                />
                <Badge
                  className={`absolute top-2 right-2 ${
                    tip.isPublished ? 'bg-green-600' : 'bg-gray-600'
                  }`}
                >
                  {tip.isPublished ? 'Published' : 'Draft'}
                </Badge>
              </div>
              
              <CardContent className="p-4 space-y-3">
                <div>
                  <h3 className="text-lg font-bold text-white">{tip.name}</h3>
                  <p className="text-sm text-gray-400 mt-1">{tip.description}</p>
                </div>

                {/* Placements */}
                <div className="flex flex-wrap gap-2">
                  {tip.placements.map((placement) => {
                    const option = PLACEMENT_OPTIONS.find(o => o.value === placement);
                    return (
                      <Badge key={placement} variant="outline" className="border-pink-500/50 text-pink-400">
                        {option?.icon} {option?.label}
                      </Badge>
                    );
                  })}
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-2">
                  <Button
                    onClick={() => togglePublishStatus(tip)}
                    size="sm"
                    variant="outline"
                    className="flex-1 border-zinc-700 text-gray-300 hover:bg-zinc-800"
                  >
                    {tip.isPublished ? (
                      <>
                        <EyeOff className="h-4 w-4 mr-1" />
                        Unpublish
                      </>
                    ) : (
                      <>
                        <Eye className="h-4 w-4 mr-1" />
                        Publish
                      </>
                    )}
                  </Button>
                  <Button
                    onClick={() => handleEdit(tip)}
                    size="sm"
                    variant="outline"
                    className="border-zinc-700 text-gray-300 hover:bg-zinc-800"
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    onClick={() => handleDelete(tip.id)}
                    size="sm"
                    variant="outline"
                    className="border-zinc-700 text-red-400 hover:bg-red-500/10"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>

                <div className="text-xs text-gray-500">
                  Created: {new Date(tip.uploadDate).toLocaleDateString()}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}

