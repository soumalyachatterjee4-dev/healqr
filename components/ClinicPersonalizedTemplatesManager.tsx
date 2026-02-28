import { useState, useRef, useEffect } from 'react';
import {
  Upload,
  Eye,
  Trash2,
  X,
  FileImage,
  Info,
  Sparkles,
  Heart,
  AlertTriangle,
  ArrowLeft
} from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Card } from './ui/card';
import ClinicSidebar from './ClinicSidebar';
import { toast } from 'sonner';

interface Template {
  id: string;
  name: string;
  imageUrl: string;
  imageFile?: File;
  category: 'health-tip' | 'festival-wish';
  isActive: boolean;
  uploadDate: string;
  fileSize: number;
}

interface ClinicPersonalizedTemplatesManagerProps {
  clinicId?: string;
  onLogout: () => void;
  onMenuChange: (menu: string) => void;
  activeAddOns?: string[];
  isSidebarCollapsed?: boolean;
  setIsSidebarCollapsed?: (collapsed: boolean) => void;
}

export default function ClinicPersonalizedTemplatesManager({
  clinicId,
  onLogout,
  onMenuChange,
  activeAddOns = [],
  isSidebarCollapsed = false,
  setIsSidebarCollapsed
}: ClinicPersonalizedTemplatesManagerProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'health-tip' | 'festival-wish'>('health-tip');
  const [templates, setTemplates] = useState<Template[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [showAcknowledgement, setShowAcknowledgement] = useState(false);
  const [acknowledgedSession, setAcknowledgedSession] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load templates from Firestore
  useEffect(() => {
    if (clinicId) {
      loadTemplates();
    }
  }, [clinicId]);

  const loadTemplates = async () => {
    try {
      if (!clinicId) return;

      const { db } = await import('../lib/firebase/config');
      if (!db) return;
      const { doc, getDoc } = await import('firebase/firestore');

      const clinicRef = doc(db, 'clinics', clinicId);
      const clinicSnap = await getDoc(clinicRef);

      if (clinicSnap.exists()) {
        const data = clinicSnap.data();
        const storedTemplates = data.personalizedTemplates || [];
        setTemplates(storedTemplates);
      }
    } catch (error) {
      console.error('Error loading templates:', error);
    }
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size must be less than 5MB');
      return;
    }

    setIsUploading(true);

    try {
      if (!clinicId) {
        toast.error('Clinic ID not found');
        setIsUploading(false);
        return;
      }

      // Helper for image compression
      const compressImage = (file: File): Promise<Blob> => {
        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.readAsDataURL(file);
          reader.onload = (event) => {
            const img = new Image();
            img.src = event.target?.result as string;
            img.onload = () => {
              const canvas = document.createElement('canvas');
              const MAX_WIDTH = 1200;
              const MAX_HEIGHT = 1200;
              let width = img.width;
              let height = img.height;

              if (width > height) {
                if (width > MAX_WIDTH) {
                  height *= MAX_WIDTH / width;
                  width = MAX_WIDTH;
                }
              } else {
                if (height > MAX_HEIGHT) {
                  width *= MAX_HEIGHT / height;
                  height = MAX_HEIGHT;
                }
              }

              canvas.width = width;
              canvas.height = height;
              const ctx = canvas.getContext('2d');
              ctx?.drawImage(img, 0, 0, width, height);

              canvas.toBlob(
                (blob) => {
                  if (blob) resolve(blob);
                  else reject(new Error('Canvas to Blob failed'));
                },
                'image/jpeg',
                0.8
              );
            };
            img.onerror = (err) => reject(err);
          };
          reader.onerror = (err) => reject(err);
        });
      };

      // Compress image before upload
      const compressedBlob = await compressImage(file);
      const uploadFile = new File([compressedBlob], file.name, { type: 'image/jpeg' });

      // Check Firebase Auth State
      const { auth } = await import('../lib/firebase/config');
      if (!auth || !auth.currentUser) {
        console.error('Firebase Auth not ready');
        toast.error('Authentication session expired. Please logout and login again.');
        setIsUploading(false);
        return;
      }

      // Upload to Firebase Storage
      const { storage } = await import('../lib/firebase/config');
      if (!storage) throw new Error('Storage not initialized');
      const { ref, uploadBytes, getDownloadURL } = await import('firebase/storage');

      const timestamp = Date.now();
      const fileName = `clinic-personalized-templates/${clinicId}/${activeTab}/${timestamp}_${file.name.split('.')[0]}.jpg`;
      const storageRef = ref(storage, fileName);

      await uploadBytes(storageRef, uploadFile);
      const downloadURL = await getDownloadURL(storageRef);

      // Create new template object
      const newTemplate: Template = {
        id: `${activeTab}-${timestamp}`,
        name: file.name,
        imageUrl: downloadURL,
        category: activeTab,
        isActive: true,
        uploadDate: new Date().toISOString(),
        fileSize: uploadFile.size
      };

      // Check how many templates exist for this category
      const categoryTemplates = templates.filter(t => t.category === activeTab);

      if (categoryTemplates.length >= 1) {
        toast.error(`Maximum 1 image allowed per category`);
        setIsUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
        return;
      }

      // Add new template
      const updatedTemplates = [...templates, newTemplate];
      toast.success(`${activeTab === 'health-tip' ? 'Health Tip' : 'Festival Wish'} uploaded!`);

      setTemplates(updatedTemplates);

      // Save to Firestore
      const { db } = await import('../lib/firebase/config');
      if (!db) throw new Error('Database not initialized');
      const { doc, updateDoc } = await import('firebase/firestore');

      const clinicRef = doc(db, 'clinics', clinicId);
      await updateDoc(clinicRef, {
        personalizedTemplates: updatedTemplates,
        updatedAt: new Date().toISOString()
      });

    } catch (error: any) {
      console.error('Error uploading template:', error);
      toast.error(`Failed to upload: ${error.message || 'Unknown error'}`);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDelete = async (templateId: string) => {
    if (!confirm('Are you sure you want to delete this template?')) return;

    try {
      if (!clinicId) return;

      const updatedTemplates = templates.filter(t => t.id !== templateId);
      setTemplates(updatedTemplates);

      // Save to Firestore
      const { db } = await import('../lib/firebase/config');
      if (!db) throw new Error('Database not initialized');
      const { doc, updateDoc } = await import('firebase/firestore');

      const clinicRef = doc(db, 'clinics', clinicId);
      await updateDoc(clinicRef, {
        personalizedTemplates: updatedTemplates,
        updatedAt: new Date().toISOString()
      });

      toast.success('Template deleted');

    } catch (error) {
      console.error('Error deleting template:', error);
      toast.error('Failed to delete template');
    }
  };

  const isCollapsed = isSidebarCollapsed;

  return (
    <div className="min-h-screen bg-[#0a0f1a] text-white flex flex-col lg:flex-row">
      <ClinicSidebar
        activeMenu="templates"
        onMenuChange={onMenuChange}
        onLogout={onLogout}
        isOpen={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed && setIsSidebarCollapsed(!isCollapsed)}
        activeAddOns={activeAddOns}
      />

      <div className={`flex-1 transition-all duration-300 ${isSidebarCollapsed ? 'lg:ml-20' : 'lg:ml-64'} min-h-screen flex flex-col`}>
        {/* Header */}
        <header className="bg-zinc-950 border-b border-zinc-900 p-4 lg:p-6 sticky top-0 z-10">
          <div className="flex items-center gap-4 mb-4">
             <button
              onClick={() => onMenuChange('dashboard')}
              className="p-2 hover:bg-zinc-800 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <Button
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden bg-blue-500 hover:bg-blue-600 ml-auto"
            >
              Menu
            </Button>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white mb-1">Clinic Personalized Templates</h1>
            <p className="text-gray-400 text-sm">Upload custom health tips and festival wishes for your patients</p>
          </div>
        </header>

        <div className="p-4 lg:p-6 max-w-6xl mx-auto w-full flex-1 overflow-y-auto">
          {/* Info Banner */}
          <Card className="bg-blue-500/10 border-blue-500/30 mb-6 p-4">
            <div className="flex items-start gap-3">
              <Info className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" />
              <div className="space-y-1">
                <p className="text-blue-100 text-sm font-medium">
                  Display Limit: 1 template per category (2 total)
                </p>
                <p className="text-blue-200/80 text-xs">
                  Upload up to <strong>1 Health Tip</strong> and <strong>1 Festival Wish</strong>. Both will be displayed on your clinic's landing page.
                </p>
              </div>
            </div>
          </Card>

          {/* Tabs */}
          <div className="flex gap-2 mb-6 border-b border-zinc-800">
            <button
              onClick={() => setActiveTab('health-tip')}
              className={`flex items-center gap-2 px-6 py-3 font-medium transition-all border-b-2 ${
                activeTab === 'health-tip'
                  ? 'border-blue-500 text-blue-400'
                  : 'border-transparent text-gray-400 hover:text-gray-300'
              }`}
            >
              <Sparkles className="w-4 h-4" />
              Health Tip
              {templates.filter(t => t.category === 'health-tip').length > 0 && (
                <Badge className="ml-2 bg-blue-500/20 text-blue-400 border-blue-500/30">
                  {templates.filter(t => t.category === 'health-tip').length}
                </Badge>
              )}
            </button>
            <button
              onClick={() => setActiveTab('festival-wish')}
              className={`flex items-center gap-2 px-6 py-3 font-medium transition-all border-b-2 ${
                activeTab === 'festival-wish'
                  ? 'border-pink-500 text-pink-400'
                  : 'border-transparent text-gray-400 hover:text-gray-300'
              }`}
            >
              <Heart className="w-4 h-4" />
              Festival Wish
              {templates.filter(t => t.category === 'festival-wish').length > 0 && (
                <Badge className="ml-2 bg-pink-500/20 text-pink-400 border-pink-500/30">
                  {templates.filter(t => t.category === 'festival-wish').length}
                </Badge>
              )}
            </button>
          </div>

          {/* Upload Section */}
          <Card className="bg-zinc-900/50 border-zinc-800 p-6 mb-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-white">
                  {activeTab === 'health-tip' ? 'Health Tip Template' : 'Festival Wish Template'}
                </h3>
                <Badge className={activeTab === 'health-tip'
                  ? 'bg-blue-500/20 text-blue-400 border-blue-500/30'
                  : 'bg-pink-500/20 text-pink-400 border-pink-500/30'
                }>
                  {activeTab === 'health-tip' ? 'Health' : 'Festival'}
                </Badge>
              </div>

              <div className="border-2 border-dashed border-zinc-700 rounded-lg p-8 text-center hover:border-blue-500/50 transition-colors">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="hidden"
                  disabled={isUploading}
                />

                <FileImage className="w-12 h-12 text-gray-500 mx-auto mb-3" />
                <p className="text-gray-400 mb-2">
                  {isUploading ? 'Uploading...' : 'Click to upload or drag and drop'}
                </p>
                <p className="text-xs text-gray-500 mb-4">PNG, JPG, JPEG (max 5MB)</p>
                <Button
                  onClick={() => {
                    if (!acknowledgedSession) {
                      setShowAcknowledgement(true);
                    } else {
                      fileInputRef.current?.click();
                    }
                  }}
                  disabled={isUploading}
                  className={activeTab === 'health-tip'
                    ? 'bg-blue-500 hover:bg-blue-600'
                    : 'bg-pink-500 hover:bg-pink-600'
                  }
                >
                  {isUploading ? (
                    'Uploading...'
                  ) : (
                    <>
                      <Upload className="w-4 h-4 mr-2" />
                      Upload {activeTab === 'health-tip' ? 'Health Tip' : 'Festival Wish'}
                    </>
                  )}
                </Button>
              </div>

              {/* Uploaded Templates Grid */}
              {templates.filter(t => t.category === activeTab).length > 0 && (
                <div className="bg-zinc-800/50 rounded-lg p-4 border border-zinc-700">
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-sm text-gray-400">
                      Active Template
                    </p>
                    <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">
                      Active
                    </Badge>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    {templates
                      .filter(t => t.category === activeTab)
                      .map((template) => (
                        <div key={template.id} className="bg-zinc-900 rounded-lg overflow-hidden border border-zinc-700">
                          <div className="aspect-video relative group">
                            <img
                              src={template.imageUrl}
                              alt={template.name}
                              className="w-full h-full object-cover"
                            />
                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setPreviewImage(template.imageUrl)}
                                className="bg-zinc-800 border-zinc-700 text-gray-300 hover:bg-zinc-700"
                              >
                                <Eye className="w-3 h-3" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleDelete(template.id)}
                                className="bg-red-500/20 border-red-500/30 text-red-400 hover:bg-red-500/30"
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </div>
                          </div>
                          <div className="p-2">
                            <p className="text-xs text-gray-400 truncate">{template.name}</p>
                            <p className="text-xs text-gray-500">
                              {(template.fileSize / 1024).toFixed(0)} KB
                            </p>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>

      {/* Preview Modal */}
      {previewImage && (
        <div
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
          onClick={() => setPreviewImage(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh]">
            <button
              onClick={() => setPreviewImage(null)}
              className="absolute -top-12 right-0 text-white hover:text-gray-300"
            >
              <X className="w-8 h-8" />
            </button>
            <img
              src={previewImage}
              alt="Preview"
              className="max-w-full max-h-[85vh] object-contain rounded-lg"
            />
          </div>
        </div>
      )}

      {/* Acknowledgement Modal */}
      {showAcknowledgement && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start gap-4 mb-6">
              <div className="p-3 bg-red-500/10 rounded-lg flex-shrink-0">
                <AlertTriangle className="w-8 h-8 text-red-500" />
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-bold text-white mb-2">Important Notice - Compliance</h2>
                <div className="space-y-3 text-gray-300 text-sm">
                  <p className="font-semibold text-white">
                    âš ï¸ NO MEDICINE OR DRUG-RELATED CONTENT ALLOWED
                  </p>
                  <p>
                    This feature is for <strong>display purposes only</strong> and is NOT a marketplace. You may upload:
                  </p>
                  <ul className="list-disc list-inside space-y-1 ml-2">
                    <li>General health tips and wellness advice</li>
                    <li>Festival greetings and wishes</li>
                    <li>Clinic announcements and updates</li>
                  </ul>
                  <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 mt-4">
                    <p className="text-red-400 font-medium mb-2">âŒ STRICTLY PROHIBITED:</p>
                    <ul className="list-disc list-inside space-y-1 text-red-300 text-sm">
                      <li>Medicine names, brands, or pharmaceutical products</li>
                      <li>Drug advertisements or promotions</li>
                      <li>Any content requiring a drug license</li>
                    </ul>
                  </div>
                  <p className="text-yellow-400 text-xs mt-4">
                    By proceeding, you acknowledge that you understand these restrictions and agree to upload only compliant content.
                  </p>
                </div>
              </div>
            </div>
            <div className="flex gap-3 justify-end">
              <Button
                onClick={() => setShowAcknowledgement(false)}
                variant="outline"
                className="border-zinc-700 text-gray-300 hover:bg-zinc-800"
              >
                Cancel
              </Button>
              <Button
                onClick={() => {
                  setAcknowledgedSession(true);
                  setShowAcknowledgement(false);
                  setTimeout(() => fileInputRef.current?.click(), 100);
                }}
                className="bg-blue-500 hover:bg-blue-600 text-white"
              >
                I Understand & Agree
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
