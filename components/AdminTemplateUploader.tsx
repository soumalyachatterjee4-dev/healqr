import { useState, useRef, useEffect } from 'react';
import {
  Upload,
  Plus,
  Eye,
  Edit,
  Trash2,
  Copy,
  X,
  FileImage,
  Calendar,
  CheckCircle2,
  Info,
  Download
} from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Badge } from './ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Checkbox } from './ui/checkbox';

interface Template {
  id: number;
  name: string;
  description: string;
  category: 'dashboard-promo' | 'health-tip' | 'birthday-card';
  imageUrl: string;
  imageFile?: File;
  placements?: string[]; // For health tips
  isPublished: boolean;
  uploadDate: string;
  dimensions: string;
}

interface FormData {
  name: string;
  description: string;
  category: 'dashboard-promo' | 'health-tip' | 'birthday-card';
  imageFile: File | null;
  imageUrl: string;
  placements: string[];
}

const PLACEMENT_OPTIONS = [
  // Booking Flow Pages
  { id: 'booking-language', label: 'Language Selection Page' },
  { id: 'booking-mini-website', label: 'Mini Website Page' },
  { id: 'booking-select-date', label: 'Date Selection Page' },
  { id: 'booking-select-chamber', label: 'Chamber Selection Page' },
  { id: 'booking-patient-details', label: 'Patient Details Form' },
  { id: 'booking-confirmation', label: 'Booking Confirmation Page' },
  { id: 'booking-location', label: 'Branch Selection Page' },
  // Notification Templates (21 total)
  { id: 'notif-appointment-reminder', label: 'Appointment Reminder' },
  { id: 'notif-consultation-completed', label: 'Consultation Completed' },
  { id: 'notif-rx-updated', label: 'Prescription Updated (Regen)' },
  { id: 'notif-slot-released', label: 'Appointment Slot Released' },
  { id: 'notif-admin-alert', label: 'Admin Alert' },
  { id: 'notif-follow-up', label: 'Follow-Up Reminder' },
  { id: 'notif-appointment-cancelled', label: 'Appointment Cancelled' },
  { id: 'notif-appointment-restored', label: 'Appointment Restored' },
  { id: 'notif-birthday', label: 'Birthday Card' },
  { id: 'notif-chat-request', label: 'Chat Request' },
  { id: 'notif-chat-link', label: 'Chat Link' },
  { id: 'notif-video-consultation', label: 'Video Consultation' },
  { id: 'notif-video-link', label: 'Video Consultation Link' },
  { id: 'notif-rx-download', label: 'RX Download' },
  { id: 'notif-ai-rx-analysis', label: 'AI RX Analysis' },
  { id: 'notif-ai-rx-patient', label: 'AI RX Patient' },
  { id: 'notif-plan-change', label: 'Scheduled Plan Change' },
  { id: 'notif-renewal-reminder', label: 'Subscription Renewal Reminder' },
  // Walk-in Flow
  { id: 'walkin-visit-verification', label: 'Walk In Visit Verification' },
  { id: 'walkin-visit-complete', label: 'Walkin Visit Complete' },
  // Patient-Facing Pages
  { id: 'landing-patient-modal', label: 'Landing Patient Modal' },
  { id: 'patient-search', label: 'Patient Search' },
  { id: 'patient-chat', label: 'Patient Chat' },
  // Patient Dashboard Pages
  { id: 'patient-login', label: 'Patient Login' },
  { id: 'patient-otp', label: 'Patient OTP Verification' },
  { id: 'patient-dashboard', label: 'Patient Dashboard' },
  { id: 'patient-health-card', label: 'Patient Health Card' },
  { id: 'patient-history', label: 'Patient History' },
  { id: 'patient-notifications', label: 'Patient Notifications' },
  { id: 'patient-live-status', label: 'Patient Live Status' },
  { id: 'patient-search-dashboard', label: 'Patient Search - Dashboard' },
];

export default function AdminTemplateUploader() {
  // Start with empty templates - will load from Firestore in useEffect
  const [templates, setTemplates] = useState<Template[]>([]);

  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [previewTemplate, setPreviewTemplate] = useState<Template | null>(null);
  const [activeTab, setActiveTab] = useState<'dashboard-promo' | 'health-tip' | 'birthday-card'>('dashboard-promo');

  const [formData, setFormData] = useState<FormData>({
    name: '',
    description: '',
    category: 'dashboard-promo',
    imageFile: null,
    imageUrl: '',
    placements: []
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessingImage, setIsProcessingImage] = useState(false);

  // Load templates from Firestore FIRST, then localStorage as fallback
  useEffect(() => {
    const loadTemplates = async () => {
      try {
        const { db } = await import('../lib/firebase/config');
        const { doc, getDoc } = await import('firebase/firestore');

        const adminRef = doc(db, 'adminProfiles', 'super_admin');
        const adminSnap = await getDoc(adminRef);

        if (adminSnap.exists()) {
          const data = adminSnap.data();
          if (data.globalTemplates && Array.isArray(data.globalTemplates)) {
            setTemplates(data.globalTemplates);
            // Sync to localStorage
            localStorage.setItem('healqr_global_templates', JSON.stringify(data.globalTemplates));
            return;
          }
        }
      } catch (error) {
        // Fallback to localStorage
      }

      // Fallback to localStorage
      const saved = localStorage.getItem('healqr_global_templates');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          setTemplates(parsed);
        } catch (error) {
          setTemplates([]);
        }
      } else {
        setTemplates([]);
      }
    };

    loadTemplates();
  }, []);

  // Convert File to base64 Data URL with aggressive compression for Firestore 1MB limit
  const fileToDataURL = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          // Create canvas for compression
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');

          if (!ctx) {
            reject(new Error('Could not get canvas context'));
            return;
          }

          // Calculate resize dimensions if image is too large
          let targetWidth = img.width;
          let targetHeight = img.height;
          const maxDimension = 1920; // Max width or height

          if (img.width > maxDimension || img.height > maxDimension) {
            if (img.width > img.height) {
              targetWidth = maxDimension;
              targetHeight = (img.height / img.width) * maxDimension;
            } else {
              targetHeight = maxDimension;
              targetWidth = (img.width / img.height) * maxDimension;
            }
          }

          // Set canvas size to target dimensions
          canvas.width = targetWidth;
          canvas.height = targetHeight;

          // Draw image on canvas with resize
          ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

          // Compress image - start with quality 0.7 for better compression
          let quality = 0.7;
          let compressedDataUrl = canvas.toDataURL('image/jpeg', quality);

          // Calculate size in bytes (base64 string length * 0.75)
          let sizeInBytes = (compressedDataUrl.length * 0.75);

          // Target: 750KB to leave buffer under 1MB Firestore limit
          const targetSize = 750000; // 750KB
          const minQuality = 0.2; // Minimum quality threshold

          // If still too large, reduce quality aggressively
          while (sizeInBytes > targetSize && quality > minQuality) {
            quality -= 0.05; // Smaller steps for finer control
            compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
            sizeInBytes = (compressedDataUrl.length * 0.75);
          }

          const originalSizeKB = (file.size / 1024).toFixed(0);
          const compressedSizeKB = (sizeInBytes / 1024).toFixed(0);
          const compressionRatio = ((1 - sizeInBytes / file.size) * 100).toFixed(1);

          resolve(compressedDataUrl);
        };
        img.onerror = reject;
        img.src = e.target?.result as string;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const getDimensionsForCategory = (category: string): string => {
    switch (category) {
      case 'dashboard-promo':
        return '1200 × 630px (Facebook Post)';
      case 'health-tip':
        return '1050 × 600px (Business Card)';
      case 'birthday-card':
        return '1200 × 630px (Greeting Card)';
      default:
        return '';
    }
  };

  const getCategoryLabel = (category: string): string => {
    switch (category) {
      case 'dashboard-promo':
        return 'Dashboard Promo';
      case 'health-tip':
        return 'Health Tip';
      case 'birthday-card':
        return 'Birthday Card';
      default:
        return category;
    }
  };

  const getCategoryColor = (category: string): string => {
    switch (category) {
      case 'dashboard-promo':
        return 'bg-blue-500/20 text-blue-400';
      case 'health-tip':
        return 'bg-green-500/20 text-green-400';
      case 'birthday-card':
        return 'bg-purple-500/20 text-purple-400';
      default:
        return 'bg-gray-500/20 text-gray-400';
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      const fileSizeMB = file.size / (1024 * 1024);

      if (fileSizeMB > 10) {
        alert('⚠️ Image too large! Please use an image smaller than 10MB.');
        return;
      }

      setIsProcessingImage(true);
      fileToDataURL(file)
        .then(dataUrl => {
          const compressedSizeKB = (dataUrl.length * 0.75) / 1024;
          const compressedSizeMB = compressedSizeKB / 1024;

          // Firestore document limit is 1MB (1,048,576 bytes)
          if (compressedSizeKB > 1000) {
            alert(`⚠️ Image still too large after compression (${compressedSizeKB.toFixed(0)}KB). Firestore limit is 1MB. Please use a smaller image.`);
            setIsProcessingImage(false);
            return;
          }

          setFormData(prev => ({
            ...prev,
            imageFile: file,
            imageUrl: dataUrl
          }));
          setIsProcessingImage(false);
        })
        .catch(error => {
          alert('Error loading image. Please try again.');
          setIsProcessingImage(false);
        });
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      const fileSizeMB = file.size / (1024 * 1024);

      if (fileSizeMB > 10) {
        alert('⚠️ Image too large! Please use an image smaller than 10MB.');
        return;
      }

      setIsProcessingImage(true);
      fileToDataURL(file)
        .then(dataUrl => {
          const compressedSizeKB = (dataUrl.length * 0.75) / 1024;
          const compressedSizeMB = compressedSizeKB / 1024;

          // Firestore document limit is 1MB (1,048,576 bytes)
          if (compressedSizeKB > 1000) {
            alert(`⚠️ Image still too large after compression (${compressedSizeKB.toFixed(0)}KB). Firestore limit is 1MB. Please use a smaller image.`);
            setIsProcessingImage(false);
            return;
          }

          setFormData(prev => ({
            ...prev,
            imageFile: file,
            imageUrl: dataUrl
          }));
          setIsProcessingImage(false);
        })
        .catch(error => {
          alert('Error loading image. Please try again.');
          setIsProcessingImage(false);
        });
    }
  };

  const handlePlacementToggle = (placementId: string) => {
    setFormData(prev => ({
      ...prev,
      placements: prev.placements.includes(placementId)
        ? prev.placements.filter(p => p !== placementId)
        : [...prev.placements, placementId]
    }));
  };

  const handleSelectAllPlacements = () => {
    if (formData.placements.length === PLACEMENT_OPTIONS.length) {
      setFormData({ ...formData, placements: [] });
    } else {
      setFormData({ ...formData, placements: PLACEMENT_OPTIONS.map(p => p.id) });
    }
  };

  const handleAdd = async () => {
    if (!formData.name || !formData.imageFile) {
      alert('Please provide template name and image');
      return;
    }

    if (formData.category === 'health-tip' && formData.placements.length === 0) {
      alert('Please select at least one placement for health tip');
      return;
    }
    const newTemplate: Template = {
      id: Date.now(),
      name: formData.name,
      description: formData.description,
      category: formData.category,
      imageUrl: formData.imageUrl,
      placements: formData.placements,
      isPublished: false,
      uploadDate: new Date().toISOString().split('T')[0],
      dimensions: getDimensionsForCategory(formData.category)
    };

    const updatedTemplates = [newTemplate, ...templates];

    setTemplates(updatedTemplates);

    // Clean templates - remove any undefined or File objects
    const templatesToSave = updatedTemplates.map(t => {
      const { imageFile, ...cleanTemplate } = t as any;
      return cleanTemplate;
    });

    try {
      const { db } = await import('../lib/firebase/config');
      const { doc, updateDoc, setDoc } = await import('firebase/firestore');

      const adminRef = doc(db, 'adminProfiles', 'super_admin');
      await setDoc(adminRef, { globalTemplates: templatesToSave }, { merge: true });

      alert(`✅ Template "${formData.name}" uploaded successfully!`);

      // Trigger refresh in all components
      window.dispatchEvent(new CustomEvent('template-refresh'));
    } catch (error) {
      console.error('❌ Error saving template:', error);
      alert(`❌ Error saving template!\n\nError: ${error}\n\nPlease refresh the page and try again.`);
      return;
    }

    resetForm();
    setIsAdding(false);
  };

  const handleEdit = (id: number) => {
    const template = templates.find(t => t.id === id);
    if (template) {
      setFormData({
        name: template.name,
        description: template.description,
        category: template.category,
        imageFile: template.imageFile || null,
        imageUrl: template.imageUrl,
        placements: template.placements || []
      });
      setEditingId(id);
      setIsAdding(true);
    }
  };

  const handleUpdate = async () => {
    const updatedTemplates = templates.map(t =>
      t.id === editingId
        ? {
            ...t,
            name: formData.name,
            description: formData.description,
            category: formData.category,
            imageUrl: formData.imageUrl,
            placements: formData.placements,
            dimensions: getDimensionsForCategory(formData.category)
          }
        : t
    );
    setTemplates(updatedTemplates);

    // Clean templates - remove any undefined or File objects
    const templatesToSave = updatedTemplates.map(t => {
      const { imageFile, ...cleanTemplate } = t as any;
      return cleanTemplate;
    });
    try {
      const { db } = await import('../lib/firebase/config');
      const { doc, updateDoc } = await import('firebase/firestore');

      const adminRef = doc(db, 'adminProfiles', 'super_admin');
      await updateDoc(adminRef, { globalTemplates: templatesToSave });
    } catch (error) {
      // Error updating template
    }

    resetForm();
    setEditingId(null);
    setIsAdding(false);
  };

  const handleDelete = async (id: number) => {
    if (confirm('Are you sure you want to delete this template?')) {
      const updatedTemplates = templates.filter(t => t.id !== id);
      setTemplates(updatedTemplates);

      // Clean templates - remove any undefined or File objects
      const templatesToSave = updatedTemplates.map(t => {
        const { imageFile, ...cleanTemplate } = t as any;
        return cleanTemplate;
      });
      try {
        const { db } = await import('../lib/firebase/config');
        const { doc, updateDoc } = await import('firebase/firestore');

        const adminRef = doc(db, 'adminProfiles', 'super_admin');
        await updateDoc(adminRef, { globalTemplates: templatesToSave });
      } catch (error) {
        // Error deleting template
      }
    }
  };

  const handleDuplicate = async (id: number) => {
    const template = templates.find(t => t.id === id);
    if (template) {
      const duplicated: Template = {
        ...template,
        id: Date.now(),
        name: `${template.name} (Copy)`,
        isPublished: false,
        uploadDate: new Date().toISOString().split('T')[0]
      };
      const updatedTemplates = [duplicated, ...templates];
      setTemplates(updatedTemplates);

      // Clean templates - remove any undefined or File objects
      const templatesToSave = updatedTemplates.map(t => {
        const { imageFile, ...cleanTemplate } = t as any;
        return cleanTemplate;
      });
      try {
        const { db } = await import('../lib/firebase/config');
        const { doc, updateDoc } = await import('firebase/firestore');

        const adminRef = doc(db, 'adminProfiles', 'super_admin');
        await updateDoc(adminRef, { globalTemplates: templatesToSave });
      } catch (error) {
        // Error duplicating template
      }
    }
  };

  const handleTogglePublish = async (id: number) => {
    const updatedTemplates = templates.map(t =>
      t.id === id ? { ...t, isPublished: !t.isPublished } : t
    );
    setTemplates(updatedTemplates);

    // Clean templates - remove any undefined or File objects
    const templatesToSave = updatedTemplates.map(t => {
      const { imageFile, ...cleanTemplate } = t as any;
      return cleanTemplate;
    });
    try {
      const { db } = await import('../lib/firebase/config');
      const { doc, updateDoc } = await import('firebase/firestore');

      const adminRef = doc(db, 'adminProfiles', 'super_admin');
      await updateDoc(adminRef, { globalTemplates: templatesToSave });

      // Trigger refresh in all components
      window.dispatchEvent(new CustomEvent('template-refresh'));
    } catch (error) {
      // Error updating publish state
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      category: 'dashboard-promo',
      imageFile: null,
      imageUrl: '',
      placements: []
    });
    setEditingId(null);
  };

  const filteredTemplates = templates.filter(t => t.category === activeTab);

  return (
    <div className="min-h-screen bg-black text-white p-3 sm:p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6 md:mb-8">
          <h1 className="text-2xl sm:text-3xl md:text-4xl mb-2 md:mb-3">Template Uploader</h1>
          <p className="text-gray-400 text-xs sm:text-sm md:text-base mb-4 md:mb-6">
            Create and manage promotional templates, health tips, and birthday cards
          </p>

          {/* Template Variables Info */}
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3 md:p-4 mb-4 md:mb-6">
            <div className="flex items-start gap-2 md:gap-3">
              <Info className="w-4 h-4 md:w-5 md:h-5 text-blue-400 mt-0.5 flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-blue-400 text-xs sm:text-sm break-words">
                  <strong>Template Variables:</strong> Use {'{doctor_name}'}, {'{patient_name}'}, {'{date}'}, {'{time}'}, {'{chamber}'} to dynamically insert data into templates.
                </p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          {!isAdding && (
            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                onClick={() => {
                  setIsAdding(true);
                  setFormData({ ...formData, category: activeTab });
                }}
                className="bg-emerald-500 hover:bg-emerald-600 h-10 md:h-12 text-sm md:text-base w-full sm:w-auto"
              >
                <Plus className="w-4 h-4 md:w-5 md:h-5 mr-2" />
                Create New Template
              </Button>

              {templates.length > 0 && (
                <Button
                  onClick={async () => {
                    try {
                      const { auth, db } = await import('../lib/firebase/config');
                      const { doc, updateDoc } = await import('firebase/firestore');

                      let user = auth.currentUser;
                      if (!user) {
                        await new Promise(resolve => setTimeout(resolve, 1000));
                        user = auth.currentUser;
                      }

                      if (user) {
                        // Clean templates - remove ALL undefined values
                        const cleanTemplates = templates.map(t => {
                          const clean: any = {
                            id: t.id,
                            name: t.name,
                            description: t.description,
                            category: t.category,
                            imageUrl: t.imageUrl,
                            isPublished: t.isPublished,
                            uploadDate: t.uploadDate,
                            dimensions: t.dimensions
                          };

                          if (t.placements && t.placements.length > 0) {
                            clean.placements = t.placements;
                          }

                          return clean;
                        });

                        await updateDoc(doc(db, 'adminProfiles', 'super_admin'), {
                          globalTemplates: cleanTemplates
                        });
                        alert(`✅ Synced ${templates.length} template(s) to cloud!`);
                      } else {
                        alert('⚠️ Please refresh the page and try again.');
                      }
                    } catch (error) {
                      alert(`❌ Sync failed: ${error}\n\nPlease refresh and try again.`);
                      // Sync error
                    }
                  }}
                  className="bg-blue-500 hover:bg-blue-600 h-10 md:h-12 text-sm md:text-base w-full sm:w-auto"
                >
                  <CheckCircle2 className="w-4 h-4 md:w-5 md:h-5 mr-2" />
                  Force Sync to Cloud
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Upload Form */}
        {isAdding && (
          <Card className="bg-zinc-900 border-zinc-800 mb-6 md:mb-8">
            <CardHeader className="border-b border-zinc-800 p-4 md:p-6">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg md:text-xl">
                  {editingId ? 'Edit Template' : 'Create New Template'}
                </CardTitle>
                <button
                  onClick={() => {
                    resetForm();
                    setIsAdding(false);
                  }}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <X className="w-4 h-4 md:w-5 md:h-5" />
                </button>
              </div>
            </CardHeader>
            <CardContent className="p-4 md:p-6">
              <div className="space-y-4 md:space-y-6">
                {/* Template Category */}
                <div>
                  <Label className="text-sm mb-3 block text-white">Template Category *</Label>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, category: 'dashboard-promo', placements: [] })}
                      className={`p-4 rounded-lg border-2 transition-all text-left ${
                        formData.category === 'dashboard-promo'
                          ? 'border-blue-500 bg-blue-500/20'
                          : 'border-zinc-700 hover:border-zinc-600 bg-zinc-950'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <FileImage className="w-5 h-5 text-blue-400 flex-shrink-0" />
                        <h3 className="font-medium text-base text-white">Dashboard Promo</h3>
                      </div>
                      <p className="text-xs text-gray-300 mb-1">1200 × 630px (Facebook Post)</p>
                      <p className="text-xs text-gray-400">Promotional display on doctor dashboard</p>
                    </button>

                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, category: 'health-tip' })}
                      className={`p-4 rounded-lg border-2 transition-all text-left ${
                        formData.category === 'health-tip'
                          ? 'border-green-500 bg-green-500/20'
                          : 'border-zinc-700 hover:border-zinc-600 bg-zinc-950'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <FileImage className="w-5 h-5 text-green-400 flex-shrink-0" />
                        <h3 className="font-medium text-base text-white">Health Tip</h3>
                      </div>
                      <p className="text-xs text-gray-300 mb-1">1050 × 600px (Business Card)</p>
                      <p className="text-xs text-gray-400">Shown across booking flow & notifications</p>
                    </button>

                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, category: 'birthday-card', placements: [] })}
                      className={`p-4 rounded-lg border-2 transition-all text-left ${
                        formData.category === 'birthday-card'
                          ? 'border-purple-500 bg-purple-500/20'
                          : 'border-zinc-700 hover:border-zinc-600 bg-zinc-950'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <Calendar className="w-5 h-5 text-purple-400 flex-shrink-0" />
                        <h3 className="font-medium text-base text-white">Birthday Card</h3>
                      </div>
                      <p className="text-xs text-gray-300 mb-1">1200 × 630px (Greeting Card)</p>
                      <p className="text-xs text-gray-400">Featured for 24h on doctor's birthday</p>
                    </button>
                  </div>
                </div>

                {/* Template Name */}
                <div>
                  <Label htmlFor="name" className="text-sm mb-2 block text-white">
                    Template Name *
                  </Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., Summer Health Tips, Diwali Greetings"
                    className="bg-zinc-950 border-zinc-700 h-12 text-white placeholder:text-gray-500"
                  />
                </div>

                {/* Description */}
                <div>
                  <Label htmlFor="description" className="text-sm mb-2 block text-white">
                    Description (Optional)
                  </Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Brief description of this template..."
                    className="bg-zinc-950 border-zinc-700 min-h-[80px] text-white placeholder:text-gray-500"
                  />
                </div>

                {/* Placement Selection (Only for Health Tips) */}
                {formData.category === 'health-tip' && (
                  <div>
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
                      <Label className="text-sm text-white">Display Placements *</Label>
                      <Button
                        type="button"
                        onClick={handleSelectAllPlacements}
                        variant="outline"
                        size="sm"
                        className="border-zinc-700 h-9 text-sm w-full sm:w-auto hover:bg-zinc-800"
                      >
                        {formData.placements.length === PLACEMENT_OPTIONS.length ? 'Deselect All' : 'Select All'}
                      </Button>
                    </div>
                    <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-4 max-h-[300px] overflow-y-auto">
                      <div className="space-y-2">
                        {PLACEMENT_OPTIONS.map((option) => (
                          <div
                            key={option.id}
                            className="flex items-center gap-3 p-3 rounded-lg hover:bg-zinc-800/50 transition-colors"
                          >
                            <Checkbox
                              id={option.id}
                              checked={formData.placements.includes(option.id)}
                              onCheckedChange={() => handlePlacementToggle(option.id)}
                              className="border-zinc-600 flex-shrink-0"
                            />
                            <label
                              htmlFor={option.id}
                              className="flex-1 text-sm text-white cursor-pointer select-none"
                            >
                              {option.label}
                            </label>
                          </div>
                        ))}
                      </div>
                    </div>
                    {formData.placements.length > 0 && (
                      <p className="text-sm text-emerald-400 mt-2 font-medium">
                        ✓ Selected {formData.placements.length} placement{formData.placements.length > 1 ? 's' : ''}
                      </p>
                    )}
                  </div>
                )}

                {/* Image Upload */}
                <div>
                  <Label className="text-sm mb-3 block text-white">
                    Upload Image * <span className="text-gray-400">({getDimensionsForCategory(formData.category)})</span>
                  </Label>

                  {/* Drag & Drop Area */}
                  <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all ${
                      isDragging
                        ? 'border-emerald-500 bg-emerald-500/10'
                        : 'border-zinc-700 hover:border-zinc-600 bg-zinc-950'
                    }`}
                  >
                    {formData.imageUrl ? (
                      <div className="space-y-4">
                        <img
                          src={formData.imageUrl}
                          alt="Preview"
                          className="max-h-64 mx-auto rounded-lg"
                        />
                        <p className="text-sm text-emerald-400 font-medium">
                          ✓ Image uploaded - Click to change
                        </p>
                      </div>
                    ) : (
                      <>
                        <Upload className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                        <p className="text-base text-white mb-2">
                          Drag & drop image here, or click to browse
                        </p>
                        <p className="text-sm text-gray-400">
                          Recommended: {getDimensionsForCategory(formData.category)}
                        </p>
                      </>
                    )}
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-3 pt-4">
                  <Button
                    type="button"
                    onClick={editingId ? handleUpdate : handleAdd}
                    className="flex-1 bg-emerald-500 hover:bg-emerald-600 h-12 text-base"
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    {editingId ? 'Update Template' : 'Upload Template'}
                  </Button>
                  <Button
                    type="button"
                    onClick={() => {
                      resetForm();
                      setIsAdding(false);
                    }}
                    variant="outline"
                    className="flex-1 border-zinc-700 h-12 text-base hover:bg-zinc-800"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Templates Tabs */}
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)} className="w-full">
          <TabsList className="grid w-full grid-cols-3 bg-zinc-900 mb-6 h-auto p-1">
            <TabsTrigger
              value="dashboard-promo"
              className="flex items-center justify-center gap-2 py-3 text-sm data-[state=active]:bg-blue-500/20 data-[state=active]:text-blue-400 data-[state=active]:border-b-2 data-[state=active]:border-blue-500"
            >
              <FileImage className="w-4 h-4" />
              <span className="hidden sm:inline">Dashboard Promo</span>
              <span className="sm:hidden">Promo</span>
              <Badge className="bg-blue-500/30 text-blue-300 text-xs ml-1">
                {templates.filter(t => t.category === 'dashboard-promo').length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger
              value="health-tip"
              className="flex items-center justify-center gap-2 py-3 text-sm data-[state=active]:bg-green-500/20 data-[state=active]:text-green-400 data-[state=active]:border-b-2 data-[state=active]:border-green-500"
            >
              <FileImage className="w-4 h-4" />
              <span className="hidden sm:inline">Health Tip</span>
              <span className="sm:hidden">Health</span>
              <Badge className="bg-green-500/30 text-green-300 text-xs ml-1">
                {templates.filter(t => t.category === 'health-tip').length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger
              value="birthday-card"
              className="flex items-center justify-center gap-2 py-3 text-sm data-[state=active]:bg-purple-500/20 data-[state=active]:text-purple-400 data-[state=active]:border-b-2 data-[state=active]:border-purple-500"
            >
              <Calendar className="w-4 h-4" />
              <span className="hidden sm:inline">Birthday Card</span>
              <span className="sm:hidden">Birthday</span>
              <Badge className="bg-purple-500/30 text-purple-300 text-xs ml-1">
                {templates.filter(t => t.category === 'birthday-card').length}
              </Badge>
            </TabsTrigger>
          </TabsList>

          {/* Tab Content */}
          {(['dashboard-promo', 'health-tip', 'birthday-card'] as const).map((tab) => (
            <TabsContent key={tab} value={tab} className="mt-0">
              <div className="grid grid-cols-1 gap-4">
                {filteredTemplates.map((template) => (
                  <Card key={template.id} className="bg-zinc-900 border-zinc-800 hover:border-zinc-700 transition-all">
                    <CardContent className="p-3 md:p-4">
                      <div className="flex flex-col md:flex-row gap-3 md:gap-4">
                        {/* Template Image */}
                        <div className="w-full md:w-40 lg:w-48 h-28 md:h-32 flex-shrink-0">
                          <img
                            src={template.imageUrl}
                            alt={template.name}
                            className="w-full h-full object-cover rounded-lg"
                          />
                        </div>

                        {/* Template Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between mb-2">
                            <div className="min-w-0 flex-1">
                              <h3 className="text-lg text-white mb-2 truncate">{template.name}</h3>
                              <div className="flex items-center gap-2 mb-2 flex-wrap">
                                <Badge className={`${getCategoryColor(template.category)} text-xs`}>
                                  {getCategoryLabel(template.category)}
                                </Badge>
                                <Badge className={`${template.isPublished ? 'bg-emerald-500/20 text-emerald-400' : 'bg-gray-500/20 text-gray-400'} text-xs`}>
                                  {template.isPublished ? 'Active' : 'Inactive'}
                                </Badge>
                              </div>
                            </div>
                          </div>

                          {template.description && (
                            <p className="text-sm text-gray-300 mb-2 line-clamp-2">{template.description}</p>
                          )}

                          <div className="flex flex-wrap items-center gap-2 text-xs text-gray-400 mb-3">
                            <span className="whitespace-nowrap">Created: {new Date(template.uploadDate).toLocaleDateString()}</span>
                            <span className="hidden sm:inline">•</span>
                            <span className="whitespace-nowrap">{template.dimensions}</span>
                            {template.placements && template.placements.length > 0 && (
                              <>
                                <span className="hidden sm:inline">•</span>
                                <span className="whitespace-nowrap">{template.placements.length} placement{template.placements.length > 1 ? 's' : ''}</span>
                              </>
                            )}
                          </div>

                          {/* Placements List (for Health Tips) */}
                          {template.category === 'health-tip' && template.placements && template.placements.length > 0 && (
                            <div className="mb-3">
                              <p className="text-xs text-gray-400 mb-2">Display Locations:</p>
                              <div className="flex flex-wrap gap-1.5">
                                {template.placements.slice(0, 3).map((placementId) => {
                                  const placement = PLACEMENT_OPTIONS.find(p => p.id === placementId);
                                  return (
                                    <Badge key={placementId} variant="outline" className="text-xs border-zinc-700 text-gray-300">
                                      {placement?.label}
                                    </Badge>
                                  );
                                })}
                                {template.placements.length > 3 && (
                                  <Badge variant="outline" className="text-xs border-zinc-700 text-gray-300">
                                    +{template.placements.length - 3} more
                                  </Badge>
                                )}
                              </div>
                            </div>
                          )}

                          {/* Actions */}
                          <div className="flex flex-wrap gap-2">
                            <Button
                              onClick={() => setPreviewTemplate(template)}
                              size="sm"
                              variant="outline"
                              className="border-zinc-700 h-9 text-sm hover:bg-zinc-800"
                            >
                              <Eye className="w-4 h-4 mr-1" />
                              <span className="hidden sm:inline">Preview</span>
                            </Button>
                            <Button
                              onClick={() => handleEdit(template.id)}
                              size="sm"
                              variant="outline"
                              className="border-zinc-700 h-9 text-sm hover:bg-zinc-800"
                            >
                              <Edit className="w-4 h-4 mr-1" />
                              <span className="hidden sm:inline">Edit</span>
                            </Button>
                            <Button
                              onClick={() => handleDuplicate(template.id)}
                              size="sm"
                              variant="outline"
                              className="border-zinc-700 h-9 text-sm hover:bg-zinc-800"
                            >
                              <Copy className="w-4 h-4 mr-1" />
                              <span className="hidden sm:inline">Duplicate</span>
                            </Button>
                            <Button
                              onClick={() => handleTogglePublish(template.id)}
                              size="sm"
                              className={`h-9 text-sm ${
                                template.isPublished
                                  ? 'bg-yellow-500 hover:bg-yellow-600 text-white'
                                  : 'bg-emerald-500 hover:bg-emerald-600 text-white'
                              }`}
                            >
                              {template.isPublished ? 'Deactivate' : 'Activate'}
                            </Button>
                            <Button
                              onClick={() => handleDelete(template.id)}
                              size="sm"
                              variant="outline"
                              className="border-red-700 text-red-400 hover:bg-red-900/20 h-9"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}

                {/* Empty State */}
                {filteredTemplates.length === 0 && (
                  <div className="text-center py-12 md:py-16 px-4">
                    <FileImage className="w-12 h-12 md:w-16 md:h-16 mx-auto text-gray-600 mb-3 md:mb-4" />
                    <h3 className="text-lg md:text-xl text-gray-400 mb-2">No templates yet</h3>
                    <p className="text-sm md:text-base text-gray-500">
                      Click "Create New Template" to upload your first {getCategoryLabel(activeTab).toLowerCase()}
                    </p>
                  </div>
                )}
              </div>
            </TabsContent>
          ))}
        </Tabs>

        {/* Preview Modal */}
        {previewTemplate && (
          <div className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center p-3 md:p-4">
            <div className="w-full max-w-4xl max-h-[95vh] overflow-y-auto">
              <div className="flex items-start justify-between mb-3 md:mb-4 gap-2">
                <div className="min-w-0 flex-1">
                  <h2 className="text-lg md:text-xl lg:text-2xl mb-1 break-words">{previewTemplate.name}</h2>
                  <p className="text-xs md:text-sm text-gray-400">
                    {getCategoryLabel(previewTemplate.category)} • {previewTemplate.dimensions}
                  </p>
                </div>
                <button
                  onClick={() => setPreviewTemplate(null)}
                  className="w-8 h-8 md:w-10 md:h-10 bg-zinc-900 hover:bg-zinc-800 rounded-lg flex items-center justify-center transition-colors flex-shrink-0"
                >
                  <X className="w-4 h-4 md:w-5 md:h-5" />
                </button>
              </div>

              <div className="bg-zinc-900 rounded-lg p-3 md:p-4 mb-3 md:mb-4">
                <img
                  src={previewTemplate.imageUrl}
                  alt={previewTemplate.name}
                  className="w-full max-h-[50vh] md:max-h-[70vh] object-contain rounded-lg"
                />
              </div>

              {previewTemplate.description && (
                <p className="text-sm md:text-base text-gray-400 mb-3 md:mb-4 break-words">{previewTemplate.description}</p>
              )}

              {previewTemplate.placements && previewTemplate.placements.length > 0 && (
                <div className="mb-3 md:mb-4">
                  <h3 className="text-xs md:text-sm mb-2">Display Locations ({previewTemplate.placements.length}):</h3>
                  <div className="flex flex-wrap gap-1.5 md:gap-2">
                    {previewTemplate.placements.map((placementId) => {
                      const placement = PLACEMENT_OPTIONS.find(p => p.id === placementId);
                      return (
                        <Badge key={placementId} variant="outline" className="border-zinc-700 text-xs">
                          <CheckCircle2 className="w-3 h-3 mr-1 text-emerald-500 flex-shrink-0" />
                          <span className="break-words">{placement?.label}</span>
                        </Badge>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="flex flex-wrap items-center gap-2 md:gap-3 text-xs md:text-sm text-gray-500">
                <span className="whitespace-nowrap">Uploaded: {new Date(previewTemplate.uploadDate).toLocaleDateString()}</span>
                <span className="hidden sm:inline">•</span>
                <Badge className={`${previewTemplate.isPublished ? 'bg-emerald-500/20 text-emerald-400' : 'bg-gray-500/20 text-gray-400'} text-xs`}>
                  {previewTemplate.isPublished ? 'Active' : 'Inactive'}
                </Badge>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

