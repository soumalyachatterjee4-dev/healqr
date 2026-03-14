import { useState, useEffect } from 'react';
import { ArrowLeft, Users, Mail, CheckCircle, XCircle, Eye, Edit, Trash } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Checkbox } from './ui/checkbox';
import { toast } from 'sonner';
import { auth, db } from '../lib/firebase/config';
import { collection, addDoc, getDocs, query, where, updateDoc, doc, serverTimestamp, deleteDoc } from 'firebase/firestore';
import { onAuthStateChanged, User } from 'firebase/auth';
import DashboardSidebar from './DashboardSidebar';

interface AssistantData {
  id: string;
  assistantName: string;
  assistantEmail: string;
  isActive: boolean;
  allowedPages: string[];
  createdAt: Date;
  lastLoginAt?: Date;
  accessToken?: string;
  accessPin?: string;
}

interface AssistantAccessManagerProps {
  doctorName: string;
  email: string;
  onLogout: () => void;
  onMenuChange: (page: string) => void;
  activeAddOns: string[];
}

// All available pages for access control (Dashboard is always accessible - not in this list)
const AVAILABLE_PAGES = [
  { id: 'profile', label: 'Profile Manager', icon: '👤' },
  { id: 'qr', label: 'QR Manager', icon: '📱' },
  { id: 'schedule', label: 'Schedule Manager', icon: '📅' },
  { id: 'todays-schedule', label: "Today's Schedule", icon: '🗓️' },
  { id: 'advance-booking', label: 'Advance Booking', icon: '📆' },
  { id: 'analytics', label: 'Analytics', icon: '📈' },
  { id: 'reports', label: 'Reports', icon: '📄' },
  { id: 'social-kit', label: 'Social Kit & Offers', icon: '📢' },
  { id: 'monthly-planner', label: 'Monthly Planner', icon: '🗓️' },
  { id: 'preview', label: 'Preview Centre', icon: '👁️' },
  { id: 'lab-referral-tracking', label: 'Lab Referral Tracking', icon: '🔬' },
  { id: 'personalized-templates', label: 'Personalized Templates', icon: '📝' },
  { id: 'video-consultation', label: 'Video Consultation', icon: '🎥' },
  { id: 'ai-rx-reader', label: 'AI RX Reader', icon: '🤖' },
  { id: 'ai-diet-chart', label: 'AI Diet Chart', icon: '🍎' },
  { id: 'emergency-button', label: 'Emergency Button', icon: '🚨' }
];

// Page ID migration map (old -> new)
const PAGE_ID_MIGRATION: Record<string, string> = {
  'profile-manager': 'profile',
  'qr-manager': 'qr',
  'schedule-manager': 'schedule',
  'preview-center': 'preview',
  'personalized-template': 'personalized-templates',
};

// Helper function to migrate old page IDs to new ones
const migratePageIds = (pageIds: string[]): string[] => {
  return pageIds.map(id => PAGE_ID_MIGRATION[id] || id);
};

export default function AssistantAccessManager({
  doctorName,
  email,
  onLogout,
  onMenuChange,
  activeAddOns
}: AssistantAccessManagerProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeAssistants, setActiveAssistants] = useState<AssistantData[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);

  // Form state
  const [assistantName, setAssistantName] = useState('');
  const [assistantEmail, setAssistantEmail] = useState('');
  const [selectedPages, setSelectedPages] = useState<string[]>([]);

  const [editingAssistant, setEditingAssistant] = useState<AssistantData | null>(null);
  const [editSelectedPages, setEditSelectedPages] = useState<string[]>([]);

  // Modal for showing link + PIN after creation
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [generatedLink, setGeneratedLink] = useState('');
  const [generatedPin, setGeneratedPin] = useState('');

  // Wait for auth state to be ready
  useEffect(() => {
    if (!auth) return;

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      console.log('🔐 Auth state changed:', user?.uid || 'No user');
      setCurrentUser(user);
      setAuthReady(true);
    });

    return () => unsubscribe();
  }, []);

  // Load existing assistants when auth is ready
  useEffect(() => {
    if (authReady) {
      loadAssistants();
    }
  }, [authReady]);

  const loadAssistants = async () => {
    // Get doctor ID from currentUser state or localStorage
    const doctorId = currentUser?.uid || localStorage.getItem('userId');

    if (!doctorId || !db) {
      console.log('Cannot load assistants - no doctorId or db');
      return;
    }

    console.log('📋 Loading assistants for doctorId:', doctorId);

    try {
      const assistantsRef = collection(db, 'assistants');
      const q = query(assistantsRef, where('doctorId', '==', doctorId));
      const snapshot = await getDocs(q);

      const assistants = snapshot.docs.map(doc => {
        const data = doc.data();
        const rawAllowedPages = data.allowedPages || [];
        const migratedPages = migratePageIds(rawAllowedPages);

        return {
          id: doc.id,
          assistantName: data.assistantName,
          assistantEmail: data.assistantEmail,
          createdAt: data.createdAt?.toDate() || new Date(),
          isActive: data.isActive ?? true,
          allowedPages: migratedPages, // Use migrated page IDs
          lastLoginAt: data.lastLoginAt?.toDate(),
          accessToken: data.accessToken,
          accessPin: data.accessPin,
        };
      });

      const active = assistants.filter(a => a.isActive);

      setActiveAssistants(active);
    } catch (error) {
      console.error('Error loading assistants:', error);
    }
  };

  // Handle page selection toggle
  const togglePageSelection = (pageId: string) => {
    setSelectedPages(prev =>
      prev.includes(pageId)
        ? prev.filter(id => id !== pageId)
        : [...prev, pageId]
    );
  };

  // Select all pages
  const selectAllPages = () => {
    setSelectedPages(AVAILABLE_PAGES.map(page => page.id));
  };

  // Deselect all pages
  const deselectAllPages = () => {
    setSelectedPages([]);
  };

  // Create assistant access
  const createAssistant = async () => {
    console.log('🔵 createAssistant called');
    console.log('assistantName:', assistantName);
    console.log('assistantEmail:', assistantEmail);
    console.log('selectedPages:', selectedPages);
    console.log('activeAssistants.length:', activeAssistants.length);

    if (!assistantName.trim()) {
      console.log('❌ Name validation failed');
      toast.error('Assistant name required', {
        description: 'Please enter the assistant\'s full name'
      });
      return;
    }

    if (!assistantEmail.trim() || !assistantEmail.includes('@')) {
      console.log('❌ Email validation failed');
      toast.error('Valid email required', {
        description: 'Please enter a valid email address'
      });
      return;
    }

    if (selectedPages.length === 0) {
      console.log('❌ Page selection validation failed');
      toast.error('Page access required!', {
        description: 'Please select at least ONE page. Dashboard is always accessible.'
      });
      return;
    }

    if (activeAssistants.length >= 2) {
      console.log('❌ Max assistants reached');
      toast.error('Maximum 2 active assistants allowed', {
        description: 'Please deactivate an existing assistant first'
      });
      return;
    }

    if (!auth?.currentUser || !db) {
      console.log('❌ Auth or DB not available');
      console.log('auth:', auth);
      console.log('auth.currentUser:', auth?.currentUser);
      console.log('db:', db);

      // Try to get userId from localStorage as fallback
      const userId = localStorage.getItem('userId');
      console.log('userId from localStorage:', userId);

      if (!db) {
        toast.error('Database not initialized', {
          description: 'Please refresh the page'
        });
        return;
      }

      if (!auth?.currentUser && !userId) {
        toast.error('Not authenticated', {
          description: 'Please login again'
        });
        return;
      }
    }

    console.log('✅ All validations passed, creating assistant...');
    setLoading(true);

    try {
      console.log('🔍 Checking if email already exists...');

      // Get doctor ID from currentUser state or localStorage
      const doctorId = currentUser?.uid || localStorage.getItem('userId');

      if (!doctorId) {
        toast.error('Not authenticated', {
          description: 'Please refresh and login again'
        });
        setLoading(false);
        return;
      }

      console.log('Using doctorId:', doctorId);

      // Check if email already exists
      const assistantsRef = collection(db, 'assistants');
      const emailQuery = query(assistantsRef, where('assistantEmail', '==', assistantEmail.trim().toLowerCase()));
      const existingSnap = await getDocs(emailQuery);

      if (!existingSnap.empty) {
        console.log('⚠️ Email already exists');
        const existing = existingSnap.docs[0].data();
        if (existing.doctorId === doctorId) {
          toast.error('This assistant already exists', {
            description: 'This email is already registered as your assistant'
          });
          setLoading(false);
          return;
        }
      }

      console.log('✅ Email available, creating record...');

      // Generate unique access token and 6-digit PIN
      const accessToken = `ast_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
      const accessPin = Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit PIN

      // Always include dashboard in allowed pages (avoid duplicates)
      const pagesWithDashboard = selectedPages.includes('dashboard')
        ? selectedPages
        : ['dashboard', ...selectedPages];

      // Create assistant record with token and PIN
      await addDoc(collection(db, 'assistants'), {
        doctorId: doctorId,
        doctorName,
        doctorEmail: email,
        assistantName: assistantName.trim(),
        assistantEmail: assistantEmail.trim().toLowerCase(),
        allowedPages: pagesWithDashboard,
        isActive: true,
        accessToken: accessToken,
        accessPin: accessPin,
        createdAt: serverTimestamp(),
      });

      console.log('✅ Assistant created successfully!');

      // Generate the access link
      const baseUrl = window.location.origin;
      const accessLink = `${baseUrl}/assistant-login?token=${accessToken}`;

      // Show modal with link and PIN
      setGeneratedLink(accessLink);
      setGeneratedPin(accessPin);
      setShowLinkModal(true);

      // Reset form
      setAssistantName('');
      setAssistantEmail('');
      setSelectedPages([]);

      // Reload assistants
      loadAssistants();
    } catch (error) {
      console.error('Error creating assistant:', error);
      toast.error('Failed to add assistant');
    } finally {
      setLoading(false);
    }
  };

  // Delete assistant permanently
  const deleteAssistant = async (assistantId: string, assistantName: string) => {
    if (!db || !currentUser) {
      toast.error('Not authenticated', {
        description: 'Please refresh and try again'
      });
      return;
    }

    const confirmed = window.confirm(
      `Permanently delete "${assistantName}"?\n\nThis action cannot be undone. The assistant will need to be added again to regain access.`
    );

    if (!confirmed) return;

    console.log('🗑️ Deleting assistant:', assistantId, 'as user:', currentUser.uid);

    try {
      await deleteDoc(doc(db, 'assistants', assistantId));
      toast.success('Assistant deleted permanently');
      loadAssistants();
    } catch (error: any) {
      console.error('Error deleting assistant:', error);
      toast.error('Failed to delete assistant', {
        description: error.message || 'Please try again'
      });
    }
  };

  // Edit assistant pages
  const openEditModal = (assistant: AssistantData) => {
    setEditingAssistant(assistant);
    setEditSelectedPages(assistant.allowedPages);
  };

  const saveEditedPages = async () => {
    if (!db || !editingAssistant) return;

    try {
      // Ensure page IDs are in new format before saving
      const pagesToSave = editSelectedPages.filter(pageId =>
        AVAILABLE_PAGES.some(p => p.id === pageId) || pageId === 'dashboard'
      );

      await updateDoc(doc(db, 'assistants', editingAssistant.id), {
        allowedPages: pagesToSave,
      });

      toast.success('Page access updated');
      setEditingAssistant(null);
      loadAssistants();
    } catch (error) {
      console.error('Error updating pages:', error);
      toast.error('Failed to update page access');
    }
  };

  // Deactivate assistant
  const deactivateAssistant = async (assistantId: string) => {
    if (!db || !currentUser) {
      toast.error('Not authenticated');
      return;
    }

    try {
      await updateDoc(doc(db, 'assistants', assistantId), {
        isActive: false,
        deactivatedAt: serverTimestamp(),
      });

      toast.success('Assistant deactivated');
      loadAssistants();
    } catch (error) {
      console.error('Error deactivating assistant:', error);
      toast.error('Failed to deactivate assistant');
    }
  };

  // Reactivate assistant removed as it was unused in UI

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Sidebar */}
      <DashboardSidebar
        activeMenu="assistant-access"
        onMenuChange={onMenuChange}
        onLogout={onLogout}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        activeAddOns={activeAddOns}
      />

      {/* Main Content */}
      <div className="lg:ml-64 flex flex-col min-h-screen">
        {/* Header */}
        <header className="bg-zinc-900 border-b border-zinc-800 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => onMenuChange('dashboard')}
                className="p-2 hover:bg-zinc-800 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-xl font-semibold">Assistant Access Manager</h1>
                <p className="text-sm text-gray-400">
                  Share dashboard access with your assistants
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="bg-emerald-500/10 border border-emerald-500/30 px-3 py-1.5 rounded-lg">
                <span className="text-emerald-500 text-sm font-medium">
                  {activeAssistants.length}/2 Active
                </span>
              </div>
            </div>
          </div>
        </header>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-4xl mx-auto space-y-6">
              {/* Info Banner */}
              <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <Users className="w-5 h-5 text-blue-500 mt-0.5" />
                  <div>
                    <h3 className="font-medium text-blue-500">Assistant Access Guidelines</h3>
                    <ul className="text-sm text-gray-300 mt-2 space-y-1">
                      <li>• Maximum 2 active assistants at a time</li>
                      <li>• Click <strong>Verify & Add</strong> to generate reusable link and PIN</li>
                      <li>• System generates a unique access link and PIN for each assistant</li>
                      <li>• Share both link and PIN with your assistant</li>
                      <li>• Assistant clicks link and verifies with PIN to access dashboard</li>
                      <li>• <strong>Dashboard is always accessible</strong> with the same link and PIN</li>
                      <li>• Use <strong>Edit</strong> to change page access anytime</li>
                      <li>• Use <strong>Delete</strong> (bin) to permanently remove</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Assistant Details Form */}
              <div className="bg-zinc-900 rounded-lg border border-zinc-800 p-6 space-y-6">
                <h2 className="text-lg font-semibold">Assistant Details</h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Assistant Name *</Label>
                    <Input
                      id="name"
                      value={assistantName}
                      onChange={(e) => setAssistantName(e.target.value)}
                      placeholder="Enter assistant name"
                      className="bg-zinc-800 border-zinc-700"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">Assistant Email *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={assistantEmail}
                      onChange={(e) => setAssistantEmail(e.target.value)}
                      placeholder="assistant@example.com"
                      className="bg-zinc-800 border-zinc-700"
                    />
                  </div>
                </div>

                <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
                  <div className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-blue-500 mt-0.5" />
                    <p className="text-sm text-blue-500">
                      Email will be stored for verification. Assistant can then login through main login page.
                    </p>
                  </div>
                </div>
              </div>

              {/* Page Access Control */}
              <div className="bg-zinc-900 rounded-lg border border-zinc-800 p-4 sm:p-6 space-y-4 sm:space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-semibold">Page Access Control</h2>
                    <p className="text-sm text-gray-400 mt-1">Dashboard is always accessible</p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={selectAllPages}
                      className="text-xs"
                    >
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Select All
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={deselectAllPages}
                      className="text-xs"
                    >
                      <XCircle className="w-3 h-3 mr-1" />
                      Clear All
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {AVAILABLE_PAGES.map((page) => (
                    <div
                      key={page.id}
                      className={`flex items-center gap-3 p-3 rounded-lg border transition-colors cursor-pointer ${
                        selectedPages.includes(page.id)
                          ? 'bg-emerald-500/10 border-emerald-500/30'
                          : 'bg-zinc-800 border-zinc-700 hover:border-zinc-600'
                      }`}
                      onClick={() => togglePageSelection(page.id)}
                    >
                      <Checkbox
                        checked={selectedPages.includes(page.id)}
                        onCheckedChange={() => togglePageSelection(page.id)}
                      />
                      <span className="text-xl">{page.icon}</span>
                      <span className="text-sm font-medium">{page.label}</span>
                    </div>
                  ))}
                </div>

                <div className="text-sm text-gray-400">
                  Selected: <span className="text-emerald-500 font-medium">{selectedPages.length}</span> / {AVAILABLE_PAGES.length} pages (+ Dashboard)
                </div>
              </div>

              {/* Create Button */}
              <Button
                onClick={createAssistant}
                disabled={loading || activeAssistants.length >= 2}
                className="w-full bg-emerald-600 hover:bg-emerald-700"
                size="lg"
              >
                {loading ? (
                  'Verifying...'
                ) : (
                  <>
                    <CheckCircle className="w-5 h-5 mr-2" />
                    Verify & Add Assistant
                  </>
                )}
              </Button>

              {/* Active Assistants */}
              {activeAssistants.length > 0 && (
                <div className="bg-zinc-900 rounded-lg border border-zinc-800 p-6 space-y-4">
                  <h2 className="text-lg font-semibold">Active Assistants</h2>
                  {activeAssistants.map((assistant) => (
                    <div
                      key={assistant.id}
                      className="bg-zinc-800 rounded-lg border border-zinc-700 p-4 space-y-3 overflow-hidden"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-medium">{assistant.assistantName}</h3>
                          <p className="text-sm text-gray-400">{assistant.assistantEmail}</p>
                        </div>
                        <span className="bg-emerald-500/10 border border-emerald-500/30 px-2 py-1 rounded text-xs text-emerald-500">
                          Active
                        </span>
                      </div>

                      <div className="flex items-center gap-2 text-xs text-gray-400">
                        <Eye className="w-4 h-4" />
                        Access to {assistant.allowedPages.length} pages
                      </div>

                      {assistant.lastLoginAt && (
                        <div className="flex items-center gap-2 text-xs text-gray-400">
                          <Mail className="w-4 h-4" />
                          Last login: {assistant.lastLoginAt.toLocaleDateString()}
                        </div>
                      )}

                      {/* Link + PIN Credentials */}
                      {assistant.accessToken && assistant.accessPin && (
                        <div className="bg-zinc-900 border border-zinc-700 rounded p-3 space-y-3">
                          <p className="text-xs font-semibold text-blue-400">🔗 Access Credentials</p>

                          {/* Link - Full width with copy button */}
                          <div className="space-y-1">
                            <span className="text-xs text-gray-500">Link:</span>
                            <div className="flex items-center gap-2">
                              <code className="flex-1 text-xs bg-zinc-800 px-2 py-2 rounded text-blue-400 break-all overflow-hidden min-w-0">
                                {window.location.origin}/assistant/{assistant.accessToken}
                              </code>
                              <button
                                onClick={() => {
                                  navigator.clipboard.writeText(`${window.location.origin}/assistant/${assistant.accessToken}`);
                                  toast.success('Link copied!');
                                }}
                                className="p-2 bg-zinc-800 hover:bg-zinc-700 rounded text-blue-400"
                                title="Copy link"
                              >
                                📋
                              </button>
                            </div>
                          </div>

                          {/* PIN - Full width with copy button */}
                          <div className="space-y-1">
                            <span className="text-xs text-gray-500">PIN:</span>
                            <div className="flex items-center gap-2">
                              <code className="flex-1 text-base bg-zinc-800 px-3 py-2 rounded text-emerald-400 font-bold tracking-wider text-center">
                                {assistant.accessPin}
                              </code>
                              <button
                                onClick={() => {
                                  navigator.clipboard.writeText(assistant.accessPin!);
                                  toast.success('PIN copied!');
                                }}
                                className="p-2 bg-zinc-800 hover:bg-zinc-700 rounded text-emerald-400"
                                title="Copy PIN"
                              >
                                📋
                              </button>
                            </div>
                          </div>

                          {/* Quick copy both */}
                          <button
                            onClick={() => {
                              const text = `Login Link: ${window.location.origin}/assistant/${assistant.accessToken}\nPIN: ${assistant.accessPin}`;
                              navigator.clipboard.writeText(text);
                              toast.success('Link + PIN copied!');
                            }}
                            className="w-full text-xs bg-blue-600 hover:bg-blue-700 text-white py-2 rounded"
                          >
                            📋 Copy Both (for WhatsApp)
                          </button>
                        </div>
                      )}

                      <div className="flex flex-wrap gap-2">
                        <Button
                          onClick={() => openEditModal(assistant)}
                          className="flex-1 min-w-[120px] bg-blue-600 hover:bg-blue-700"
                          size="sm"
                        >
                          <Edit className="w-4 h-4 mr-1" />
                          Edit Pages
                        </Button>
                        <Button
                          onClick={() => deactivateAssistant(assistant.id)}
                          className="flex-1 min-w-[120px] bg-orange-600 hover:bg-orange-700"
                          size="sm"
                        >
                          <XCircle className="w-4 h-4 mr-1" />
                          Deactivate
                        </Button>
                        <Button
                          onClick={() => deleteAssistant(assistant.id, assistant.assistantName)}
                          variant="destructive"
                          size="sm"
                          className="shrink-0"
                        >
                          <Trash className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

      {/* Edit Pages Modal */}
      {editingAssistant && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
          <div className="bg-zinc-900 rounded-lg border border-zinc-800 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold">Edit Page Access</h2>
                  <p className="text-sm text-gray-400 mt-1">
                    {editingAssistant.assistantName} ({editingAssistant.assistantEmail})
                  </p>
                </div>
                <button
                  onClick={() => setEditingAssistant(null)}
                  className="p-2 hover:bg-zinc-800 rounded-lg transition-colors"
                >
                  <XCircle className="w-5 h-5" />
                </button>
              </div>

              <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
                <p className="text-sm text-blue-500">
                  Dashboard is always accessible. Select additional pages below.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {AVAILABLE_PAGES.map((page) => (
                  <div
                    key={page.id}
                    className={`flex items-center gap-3 p-3 rounded-lg border transition-colors cursor-pointer ${
                      editSelectedPages.includes(page.id)
                        ? 'bg-emerald-500/10 border-emerald-500/30'
                        : 'bg-zinc-800 border-zinc-700 hover:border-zinc-600'
                    }`}
                    onClick={() => {
                      setEditSelectedPages(prev =>
                        prev.includes(page.id)
                          ? prev.filter(p => p !== page.id)
                          : [...prev, page.id]
                      );
                    }}
                  >
                    <Checkbox
                      checked={editSelectedPages.includes(page.id)}
                      onCheckedChange={() => {
                        setEditSelectedPages(prev =>
                          prev.includes(page.id)
                            ? prev.filter(p => p !== page.id)
                            : [...prev, page.id]
                        );
                      }}
                    />
                    <span className="text-xl">{page.icon}</span>
                    <span className="text-sm font-medium">{page.label}</span>
                  </div>
                ))}
              </div>

              <div className="flex gap-3">
                <Button
                  onClick={() => setEditingAssistant(null)}
                  variant="outline"
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={saveEditedPages}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Save Changes
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Link + PIN Modal */}
      {showLinkModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-zinc-800">
            <div className="p-6 space-y-6">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-2xl font-semibold text-emerald-500 flex items-center gap-2">
                    <CheckCircle className="w-6 h-6" />
                    Assistant Access Created!
                  </h3>
                  <p className="text-gray-400 mt-1">
                    Share the link and PIN with your assistant via WhatsApp
                  </p>
                </div>
                <button
                  onClick={() => setShowLinkModal(false)}
                  className="p-2 hover:bg-zinc-800 rounded-lg transition-colors"
                >
                  <XCircle className="w-5 h-5" />
                </button>
              </div>

              {/* Access Link */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300">Access Link</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={generatedLink}
                    readOnly
                    className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 text-sm font-mono"
                  />
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(generatedLink);
                      toast.success('Link copied!');
                    }}
                    className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-sm font-medium"
                  >
                    Copy Link
                  </button>
                </div>
              </div>

              {/* 6-Digit PIN */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300">6-Digit PIN</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={generatedPin}
                    readOnly
                    className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 text-2xl font-bold tracking-wider text-center"
                  />
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(generatedPin);
                      toast.success('PIN copied!');
                    }}
                    className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-sm font-medium"
                  >
                    Copy PIN
                  </button>
                </div>
              </div>

              {/* Instructions */}
              <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 space-y-2">
                <p className="text-sm font-medium text-blue-400">📱 How to share:</p>
                <ol className="text-sm text-gray-300 space-y-1 ml-4 list-decimal">
                  <li>Copy both the link and PIN above</li>
                  <li>Send to your assistant via WhatsApp or SMS</li>
                  <li>Assistant opens the link and enters the PIN</li>
                  <li>They can reuse the same link + PIN to login anytime</li>
                </ol>
              </div>

              {/* Warning */}
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4">
                <p className="text-sm text-amber-400">
                  ⚠️ <strong>Important:</strong> If the PIN is lost, you'll need to deactivate this assistant and create a new access.
                </p>
              </div>

              <Button
                onClick={() => setShowLinkModal(false)}
                className="w-full bg-emerald-600 hover:bg-emerald-700"
              >
                Done
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

