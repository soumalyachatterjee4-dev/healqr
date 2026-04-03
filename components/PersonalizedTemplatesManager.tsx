import { useState, useRef, useEffect } from 'react';
import { 
  Upload, 
  Plus, 
  Eye, 
  Trash2,
  X,
  FileImage,
  Calendar,
  Info,
  Sparkles,
  Heart,
  AlertTriangle,
  Video,
  Link,
  ExternalLink,
  Save
} from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { Card } from './ui/card';
import DashboardSidebar from './DashboardSidebar';
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

interface PersonalizedTemplatesManagerProps {
  onLogout: () => void;
  onMenuChange: (menu: string) => void;
  activeAddOns?: string[];
}

export default function PersonalizedTemplatesManager({ 
  onLogout, 
  onMenuChange,
  activeAddOns = []
}: PersonalizedTemplatesManagerProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'health-tip' | 'festival-wish' | 'patient-video'>('health-tip');
  const [templates, setTemplates] = useState<Template[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [showAcknowledgement, setShowAcknowledgement] = useState(false);
  const [acknowledgedSession, setAcknowledgedSession] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [videoUrl, setVideoUrl] = useState('');
  const [savedVideoUrl, setSavedVideoUrl] = useState('');
  const [savingVideo, setSavingVideo] = useState(false);

  // Load templates from Firestore
  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      const userId = localStorage.getItem('userId');
      if (!userId) return;

      const { db } = await import('../lib/firebase/config');
      const { doc, getDoc } = await import('firebase/firestore');

      const doctorRef = doc(db, 'doctors', userId);
      const doctorSnap = await getDoc(doctorRef);

      if (doctorSnap.exists()) {
        const data = doctorSnap.data();
        const storedTemplates = data.personalizedTemplates || [];
        setTemplates(storedTemplates);
        if (data.patientFeedbackVideoUrl) {
          setVideoUrl(data.patientFeedbackVideoUrl);
          setSavedVideoUrl(data.patientFeedbackVideoUrl);
        }
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
      const userId = localStorage.getItem('userId');
      if (!userId) {
        toast.error('Please login to upload templates');
        return;
      }

      // Check Firebase Auth State
      const { auth } = await import('../lib/firebase/config');
      if (!auth || !auth.currentUser) {
        console.error('Firebase Auth not ready');
        toast.error('Authentication session expired. Please logout and login again.');
        setIsUploading(false);
        return;
      }

      if (auth.currentUser.uid !== userId) {
        console.error('Auth mismatch', { local: userId, auth: auth.currentUser.uid });
        toast.error('Session mismatch. Please logout and login again.');
        setIsUploading(false);
        return;
      }

      // Upload to Firebase Storage
      const { storage } = await import('../lib/firebase/config');
      const { ref, uploadBytes, getDownloadURL } = await import('firebase/storage');
      
      const timestamp = Date.now();
      const fileName = `personalized-templates/${userId}/${activeTab}/${timestamp}_${file.name}`;
      const storageRef = ref(storage, fileName);
      
      await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(storageRef);

      // Create new template object
      const newTemplate: Template = {
        id: `${activeTab}-${timestamp}`,
        name: file.name,
        imageUrl: downloadURL,
        category: activeTab,
        isActive: true,
        uploadDate: new Date().toISOString(),
        fileSize: file.size
      };

      // Check how many templates exist for this category
      const categoryTemplates = templates.filter(t => t.category === activeTab);
      
      let updatedTemplates: Template[];
      if (categoryTemplates.length >= 1) {
        toast.error(`Maximum 1 image allowed per category`);
        setIsUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
        return;
      }
      
      // Add new template (allow up to 1 per category)
      updatedTemplates = [...templates, newTemplate];
      toast.success(`${activeTab === 'health-tip' ? 'Health Tip' : 'Festival Wish'} uploaded! (${categoryTemplates.length + 1}/1)`);

      setTemplates(updatedTemplates);

      // Save to Firestore
      const { db } = await import('../lib/firebase/config');
      const { doc, updateDoc } = await import('firebase/firestore');
      
      const doctorRef = doc(db, 'doctors', userId);
      await updateDoc(doctorRef, {
        personalizedTemplates: updatedTemplates,
        updatedAt: new Date().toISOString()
      });

      // Trigger refresh event for mini-website
      window.dispatchEvent(new CustomEvent('template-refresh'));

    } catch (error: any) {
      console.error('Error uploading template:', error);
      
      // Show specific error message
      if (error.code === 'storage/unauthorized') {
        toast.error('Permission denied. Please logout and login again.');
      } else if (error.code === 'storage/canceled') {
        toast.error('Upload canceled');
      } else {
        toast.error(`Failed to upload: ${error.message || 'Unknown error'}`);
      }
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
      const userId = localStorage.getItem('userId');
      if (!userId) return;

      const updatedTemplates = templates.filter(t => t.id !== templateId);
      setTemplates(updatedTemplates);

      // Save to Firestore
      const { db } = await import('../lib/firebase/config');
      const { doc, updateDoc } = await import('firebase/firestore');
      
      const doctorRef = doc(db, 'doctors', userId);
      await updateDoc(doctorRef, {
        personalizedTemplates: updatedTemplates,
        updatedAt: new Date().toISOString()
      });

      toast.success('Template deleted');

      // Trigger refresh event
      window.dispatchEvent(new CustomEvent('template-refresh'));

    } catch (error) {
      console.error('Error deleting template:', error);
      toast.error('Failed to delete template');
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0f1a] text-white">
      <DashboardSidebar
        activeMenu="personalized-templates"
        onMenuChange={onMenuChange}
        onLogout={onLogout}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        activeAddOns={activeAddOns}
      />

      <div className="lg:ml-64">
        {/* Header */}
        <header className="bg-zinc-950 border-b border-zinc-900 p-4 lg:p-6">
          <div className="flex items-center gap-4 mb-4">
            <Button
              onClick={() => onMenuChange('dashboard')}
              variant="outline"
              size="sm"
              className="border-zinc-700 text-gray-300 hover:bg-zinc-800"
            >
              <X className="w-4 h-4 mr-2" />
              Back
            </Button>
            <Button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden bg-emerald-500 hover:bg-emerald-600 ml-auto"
            >
              Menu
            </Button>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white mb-1">Personalized Templates</h1>
            <p className="text-gray-400 text-sm">Upload custom health tips and festival wishes for your patients</p>
          </div>
        </header>

        <div className="p-4 lg:p-6 max-w-6xl mx-auto">
          {/* Info Banner */}
          <Card className="bg-blue-500/10 border-blue-500/30 mb-6 p-4">
            <div className="flex items-start gap-3">
              <Info className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" />
              <div className="space-y-1">
                <p className="text-blue-100 text-sm font-medium">
                  Display Limit: 1 template per category (2 total)
                </p>
                <p className="text-blue-200/80 text-xs">
                  Upload up to <strong>1 Health Tip</strong> and <strong>1 Festival Wish</strong>. Both will be displayed on your mini-website. This is for display only, not a marketplace.
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
                  ? 'border-emerald-500 text-emerald-400'
                  : 'border-transparent text-gray-400 hover:text-gray-300'
              }`}
            >
              <Sparkles className="w-4 h-4" />
              Health Tip
              {templates.filter(t => t.category === 'health-tip').length > 0 && (
                <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
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
                <Badge className="bg-pink-500/20 text-pink-400 border-pink-500/30">
                  {templates.filter(t => t.category === 'festival-wish').length}
                </Badge>
              )}
            </button>
            <button
              onClick={() => setActiveTab('patient-video')}
              className={`flex items-center gap-2 px-6 py-3 font-medium transition-all border-b-2 ${
                activeTab === 'patient-video'
                  ? 'border-blue-500 text-blue-400'
                  : 'border-transparent text-gray-400 hover:text-gray-300'
              }`}
            >
              <Video className="w-4 h-4" />
              Patient Video
              {savedVideoUrl && (
                <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">
                  1
                </Badge>
              )}
            </button>
          </div>

          {/* Patient Video URL Section */}
          {activeTab === 'patient-video' && (
            <>
              <Card className="bg-blue-500/10 border-blue-500/30 mb-6 p-4">
                <div className="flex items-start gap-3">
                  <Video className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" />
                  <div className="space-y-1">
                    <p className="text-blue-100 text-sm font-medium">
                      Patient Feedback Video Link
                    </p>
                    <p className="text-blue-200/80 text-xs">
                      Upload your patient feedback video to <strong>Facebook, Instagram, or YouTube</strong> and paste the link here. Patients visiting your mini-website can watch the video and come back to book an appointment.
                    </p>
                  </div>
                </div>
              </Card>

              <Card className="bg-zinc-900/50 border-zinc-800 p-6 mb-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-white">Video Link</h3>
                    <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">
                      Social Media
                    </Badge>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-gray-300 text-sm">Paste your video URL</Label>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Link className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
                        <Input
                          type="url"
                          placeholder="https://www.facebook.com/watch/... or https://youtu.be/..."
                          value={videoUrl}
                          onChange={(e) => setVideoUrl(e.target.value)}
                          className="bg-zinc-800 border-zinc-700 text-white pl-10 placeholder:text-gray-500"
                        />
                      </div>
                    </div>
                    <p className="text-xs text-gray-500">Supported: Facebook, Instagram, YouTube links</p>
                  </div>

                  <div className="flex gap-3">
                    <Button
                      onClick={async () => {
                        if (!videoUrl.trim()) {
                          toast.error('Please paste a video URL');
                          return;
                        }
                        // Basic URL validation
                        try {
                          new URL(videoUrl.trim());
                        } catch {
                          toast.error('Please enter a valid URL');
                          return;
                        }
                        setSavingVideo(true);
                        try {
                          const userId = localStorage.getItem('userId');
                          if (!userId) return;
                          const { db } = await import('../lib/firebase/config');
                          const { doc, updateDoc } = await import('firebase/firestore');
                          const doctorRef = doc(db, 'doctors', userId);
                          await updateDoc(doctorRef, {
                            patientFeedbackVideoUrl: videoUrl.trim(),
                            updatedAt: new Date().toISOString()
                          });
                          setSavedVideoUrl(videoUrl.trim());
                          toast.success('Video link saved! It will appear on your mini-website.');
                          window.dispatchEvent(new CustomEvent('template-refresh'));
                        } catch (error) {
                          console.error('Error saving video URL:', error);
                          toast.error('Failed to save video link');
                        } finally {
                          setSavingVideo(false);
                        }
                      }}
                      disabled={savingVideo || !videoUrl.trim()}
                      className="bg-blue-500 hover:bg-blue-600 text-white"
                    >
                      {savingVideo ? 'Saving...' : (
                        <>
                          <Save className="w-4 h-4 mr-2" />
                          Save Link
                        </>
                      )}
                    </Button>
                    {savedVideoUrl && (
                      <Button
                        onClick={async () => {
                          setSavingVideo(true);
                          try {
                            const userId = localStorage.getItem('userId');
                            if (!userId) return;
                            const { db } = await import('../lib/firebase/config');
                            const { doc, updateDoc } = await import('firebase/firestore');
                            const doctorRef = doc(db, 'doctors', userId);
                            await updateDoc(doctorRef, {
                              patientFeedbackVideoUrl: '',
                              updatedAt: new Date().toISOString()
                            });
                            setVideoUrl('');
                            setSavedVideoUrl('');
                            toast.success('Video link removed');
                            window.dispatchEvent(new CustomEvent('template-refresh'));
                          } catch (error) {
                            console.error('Error removing video URL:', error);
                            toast.error('Failed to remove video link');
                          } finally {
                            setSavingVideo(false);
                          }
                        }}
                        disabled={savingVideo}
                        variant="outline"
                        className="border-red-500/30 text-red-400 hover:bg-red-500/10"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Remove
                      </Button>
                    )}
                  </div>

                  {/* Current Saved Link Preview */}
                  {savedVideoUrl && (
                    <div className="bg-zinc-800/50 rounded-lg p-4 border border-blue-500/20">
                      <div className="flex items-center gap-2 mb-2">
                        <Video className="w-4 h-4 text-blue-400" />
                        <p className="text-sm text-gray-300 font-medium">Currently Active</p>
                      </div>
                      <a
                        href={savedVideoUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-400 text-sm hover:underline break-all flex items-center gap-1"
                      >
                        {savedVideoUrl}
                        <ExternalLink className="w-3 h-3 flex-shrink-0" />
                      </a>
                    </div>
                  )}
                </div>
              </Card>
            </>
          )}

          {/* Upload Section */}
          {activeTab !== 'patient-video' && (
          <Card className="bg-zinc-900/50 border-zinc-800 p-6 mb-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-white">
                  {activeTab === 'health-tip' ? 'Health Tip Template' : 'Festival Wish Template'}
                </h3>
                <Badge className={activeTab === 'health-tip' 
                  ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                  : 'bg-pink-500/20 text-pink-400 border-pink-500/30'
                }>
                  {activeTab === 'health-tip' ? 'Health' : 'Festival'}
                </Badge>
              </div>

              <div className="border-2 border-dashed border-zinc-700 rounded-lg p-8 text-center hover:border-emerald-500/50 transition-colors">
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
                    ? 'bg-emerald-500 hover:bg-emerald-600'
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

              {/* Uploaded Templates Grid (up to 2) */}
              {templates.filter(t => t.category === activeTab).length > 0 && (
                <div className="bg-zinc-800/50 rounded-lg p-4 border border-zinc-700">
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-sm text-gray-400">
                      Uploaded Templates ({templates.filter(t => t.category === activeTab).length}/2)
                    </p>
                    <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
                      {templates.filter(t => t.category === activeTab).length} Active
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {templates
                      .filter(t => t.category === activeTab)
                      .sort((a, b) => new Date(b.uploadDate).getTime() - new Date(a.uploadDate).getTime())
                      .map((template) => (
                        <div key={template.id} className="bg-zinc-900 rounded-lg overflow-hidden border border-zinc-700">
                          <div className="aspect-square relative group">
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

          )}

          {/* Template History */}
          {activeTab !== 'patient-video' && (
          <Card className="bg-zinc-900/50 border-zinc-800 p-6">
            <h3 className="text-lg font-semibold text-white mb-4">
              Template History ({templates.filter(t => t.category === activeTab).length})
            </h3>
            {templates.filter(t => t.category === activeTab).length === 0 ? (
              <div className="text-center py-8">
                <Calendar className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                <p className="text-gray-400">No templates uploaded yet</p>
                <p className="text-sm text-gray-500 mt-1">Upload your first template above</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {templates
                  .filter(t => t.category === activeTab)
                  .sort((a, b) => new Date(b.uploadDate).getTime() - new Date(a.uploadDate).getTime())
                  .map((template) => (
                    <div
                      key={template.id}
                      className={`bg-zinc-800/50 rounded-lg p-3 border ${
                        template.isActive 
                          ? 'border-emerald-500/30 ring-1 ring-emerald-500/20' 
                          : 'border-zinc-700'
                      }`}
                    >
                      <div className="relative mb-2">
                        <img
                          src={template.imageUrl}
                          alt={template.name}
                          className="w-full h-32 object-cover rounded border border-zinc-700"
                        />
                        {template.isActive && (
                          <Badge className="absolute top-2 right-2 bg-emerald-500/90 text-white border-0">
                            Active
                          </Badge>
                        )}
                      </div>
                      <p className="text-white text-sm font-medium truncate mb-1">{template.name}</p>
                      <p className="text-xs text-gray-400">
                        {new Date(template.uploadDate).toLocaleDateString()}
                      </p>
                    </div>
                  ))}
              </div>
            )}
          </Card>
          )}
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
                <h2 className="text-xl font-bold text-white mb-2">Important Notice - Drug License Compliance</h2>
                <div className="space-y-3 text-gray-300 text-sm">
                  <p className="font-semibold text-white">
                    ⚠️ NO MEDICINE OR DRUG-RELATED CONTENT ALLOWED
                  </p>
                  <p>
                    This feature is for <strong>display purposes only</strong> and is NOT a marketplace. You may upload:
                  </p>
                  <ul className="list-disc list-inside space-y-1 ml-2">
                    <li>General health tips and wellness advice</li>
                    <li>Festival greetings and wishes</li>
                    <li>Clinic announcements and updates</li>
                    <li>Health awareness messages</li>
                  </ul>
                  <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 mt-4">
                    <p className="text-red-400 font-medium mb-2">❌ STRICTLY PROHIBITED:</p>
                    <ul className="list-disc list-inside space-y-1 text-red-300 text-sm">
                      <li>Medicine names, brands, or pharmaceutical products</li>
                      <li>Drug advertisements or promotions</li>
                      <li>Prescription medication information</li>
                      <li>Any content requiring a drug license</li>
                    </ul>
                  </div>
                  <p className="text-yellow-400 text-xs mt-4">
                    By proceeding, you acknowledge that you understand these restrictions and agree to upload only compliant content. Violation may result in account suspension.
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
                className="bg-emerald-500 hover:bg-emerald-600 text-white"
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

