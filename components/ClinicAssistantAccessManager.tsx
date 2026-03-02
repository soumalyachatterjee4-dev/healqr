import { useState, useEffect } from 'react';
import { ArrowLeft, Users, Mail, CheckCircle, XCircle, Eye, Edit, Trash, Copy } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Checkbox } from './ui/checkbox';
import { toast } from 'sonner';
import { auth, db } from '../lib/firebase/config';
import { collection, addDoc, getDocs, query, where, updateDoc, doc, serverTimestamp, deleteDoc } from 'firebase/firestore';
import { onAuthStateChanged, User } from 'firebase/auth';
import ClinicSidebar from './ClinicSidebar';

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
  isClinic?: boolean;
}

interface ClinicAssistantAccessManagerProps {
  clinicName: string;
  email: string;
  onLogout: () => void;
  onMenuChange: (page: string) => void;
  activeAddOns: string[];
}

// All available pages for access control (Dashboard is always accessible)
const AVAILABLE_PAGES = [
  { id: 'doctors', label: 'Manage Doctors', icon: 'ðŸ‘¥' },
  { id: 'profile', label: 'Clinic Profile', icon: 'ðŸ¢' },
  { id: 'qr-manager', label: 'QR Manager', icon: 'ðŸ“±' },
  { id: 'schedule-manager', label: 'Schedule Manager', icon: 'ðŸ“…' },
  { id: 'todays-schedule', label: "Today's Schedule", icon: 'ðŸ—“ï¸' },
  { id: 'advance-booking', label: 'Advance Booking', icon: 'ðŸ“†' },
  { id: 'analytics', label: 'Analytics', icon: 'ðŸ“ˆ' },
  { id: 'reports', label: 'Reports', icon: 'ðŸ“„' },
  { id: 'social-kit', label: 'Social Kit & Offers', icon: 'ðŸ“£' },
  { id: 'monthly-planner', label: 'Monthly Planner', icon: 'ðŸ—“ï¸' },
  { id: 'preview', label: 'Preview Centre', icon: 'ðŸ‘ï¸' },
  { id: 'lab-referral', label: 'Lab Referral Tracking', icon: 'ðŸ”¬' },
  { id: 'templates', label: 'Personalized Templates', icon: 'ðŸ“' },
  { id: 'ai-diet-chart', label: 'AI Diet Chart', icon: 'ðŸŽ' },
  { id: 'ai-rx-reader', label: 'AI RX Reader', icon: 'ðŸ¤–' },
  { id: 'video-consultation', label: 'Video Consultation', icon: 'ðŸŽ¥' },
  { id: 'emergency', label: 'Emergency Button', icon: 'ðŸš¨' },
];

export default function ClinicAssistantAccessManager({
  clinicName,
  email,
  onLogout,
  onMenuChange,
  activeAddOns
}: ClinicAssistantAccessManagerProps) {
  console.log('ðŸ›¡ï¸ ClinicAssistantAccessManager: Component Initializing...');
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
      console.log('ðŸ” Auth state changed:', user?.uid || 'No user');
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
    const clinicId = currentUser?.uid || localStorage.getItem('userId');

    if (!clinicId || !db) {
      console.log('Cannot load assistants - no clinicId or db');
      return;
    }

    console.log('ðŸ“‹ Loading assistants for clinicId:', clinicId);

    try {
      const assistantsRef = collection(db, 'assistants');
      const q = query(assistantsRef, where('doctorId', '==', clinicId)); // Note: Using doctorId field for owner UID consistency
      const snapshot = await getDocs(q);

      const assistants = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          assistantName: data.assistantName,
          assistantEmail: data.assistantEmail,
          createdAt: data.createdAt?.toDate() || new Date(),
          isActive: data.isActive ?? true,
          allowedPages: data.allowedPages || [],
          lastLoginAt: data.lastLoginAt?.toDate(),
          accessToken: data.accessToken,
          accessPin: data.accessPin,
          isClinic: data.isClinic,
        };
      });

      const active = assistants.filter(a => a.isActive);
      setActiveAssistants(active);
    } catch (error) {
      console.error('Error loading assistants:', error);
    }
  };

  const togglePageSelection = (pageId: string) => {
    setSelectedPages(prev =>
      prev.includes(pageId)
        ? prev.filter(id => id !== pageId)
        : [...prev, pageId]
    );
  };

  const selectAllPages = () => {
    setSelectedPages(AVAILABLE_PAGES.map(page => page.id));
  };

  const deselectAllPages = () => {
    setSelectedPages([]);
  };

  const createAssistant = async () => {
    if (!assistantName.trim()) {
      toast.error('Assistant name required');
      return;
    }

    if (!assistantEmail.trim() || !assistantEmail.includes('@')) {
      toast.error('Valid email required');
      return;
    }

    if (selectedPages.length === 0) {
      toast.error('Page access required!', {
        description: 'Please select at least ONE page.'
      });
      return;
    }

    const clinicId = currentUser?.uid || localStorage.getItem('userId');
    if (!clinicId || !db) {
      toast.error('Database not initialized or not authenticated');
      return;
    }

    setLoading(true);

    try {
      // Check if email already exists
      const assistantsRef = collection(db, 'assistants');
      const emailQuery = query(assistantsRef, where('assistantEmail', '==', assistantEmail.trim().toLowerCase()));
      const existingSnap = await getDocs(emailQuery);

      if (!existingSnap.empty) {
        const existing = existingSnap.docs[0].data();
        if (existing.doctorId === clinicId) {
          toast.error('This assistant already exists');
          setLoading(false);
          return;
        }
      }

      const accessToken = `ast_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
      const accessPin = Math.floor(100000 + Math.random() * 900000).toString();

      const pagesWithDashboard = selectedPages.includes('dashboard')
        ? selectedPages
        : ['dashboard', ...selectedPages];

      await addDoc(collection(db, 'assistants'), {
        doctorId: clinicId, // We use doctorId to store the owner's UID for consistency
        doctorName: clinicName,
        doctorEmail: email,
        assistantName: assistantName.trim(),
        assistantEmail: assistantEmail.trim().toLowerCase(),
        allowedPages: pagesWithDashboard,
        isActive: true,
        accessToken: accessToken,
        accessPin: accessPin,
        isClinic: true, // IMPORTANT: Mark as clinic assistant
        createdAt: serverTimestamp(),
      });

      const baseUrl = window.location.origin;
      const accessLink = `${baseUrl}/assistant-login?token=${accessToken}`;

      setGeneratedLink(accessLink);
      setGeneratedPin(accessPin);
      setShowLinkModal(true);

      setAssistantName('');
      setAssistantEmail('');
      setSelectedPages([]);
      loadAssistants();
    } catch (error) {
      console.error('Error creating assistant:', error);
      toast.error('Failed to add assistant');
    } finally {
      setLoading(false);
    }
  };

  const deleteAssistant = async (assistantId: string, assistantName: string) => {
    if (!db || !currentUser) return;

    if (!window.confirm(`Permanently delete "${assistantName}"?`)) return;

    try {
      await deleteDoc(doc(db, 'assistants', assistantId));
      toast.success('Assistant deleted permanently');
      loadAssistants();
    } catch (error) {
      console.error('Error deleting assistant:', error);
      toast.error('Failed to delete assistant');
    }
  };

  const openEditModal = (assistant: AssistantData) => {
    setEditingAssistant(assistant);
    setEditSelectedPages(assistant.allowedPages);
  };

  const saveEditedPages = async () => {
    if (!db || !editingAssistant) return;

    try {
      await updateDoc(doc(db, 'assistants', editingAssistant.id), {
        allowedPages: editSelectedPages,
      });

      toast.success('Page access updated');
      setEditingAssistant(null);
      loadAssistants();
    } catch (error) {
      console.error('Error updating pages:', error);
      toast.error('Failed to update page access');
    }
  };

  const deactivateAssistant = async (assistantId: string) => {
    if (!db || !currentUser) return;

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

  return (
    <div className="min-h-screen bg-black text-white">
      <ClinicSidebar
        activeMenu="assistant"
        onMenuChange={onMenuChange}
        onLogout={onLogout}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        activeAddOns={activeAddOns}
      />

      <div className="lg:ml-64 flex flex-col min-h-screen">
        <header className="bg-zinc-900 border-b border-zinc-800 p-4 sticky top-0 z-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => onMenuChange('dashboard')}
                className="p-2 hover:bg-zinc-800 rounded-lg transition-colors"
                title="Back to Dashboard"
              >
                <ArrowLeft className="w-5 h-5 text-blue-500" />
              </button>
              <div>
                <h1 className="text-xl font-semibold">Clinic Assistant Access</h1>
                <p className="text-sm text-gray-400">Manage multiple assistants for your clinic</p>
              </div>
            </div>
            <div className="bg-blue-500/10 border border-blue-500/30 px-3 py-1.5 rounded-lg">
              <span className="text-blue-500 text-sm font-medium">
                {activeAssistants.length} Active Assistants
              </span>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-4xl mx-auto space-y-6">
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <Users className="w-5 h-5 text-blue-500 mt-0.5" />
                <div>
                  <h3 className="font-medium text-blue-500">Clinic Access Guidelines</h3>
                  <ul className="text-sm text-gray-300 mt-2 space-y-1">
                    <li>â€¢ Create <strong>unlimited</strong> assistants for your clinic</li>
                    <li>â€¢ Each assistant gets a unique secure link and 6-digit PIN</li>
                    <li>â€¢ Share both link and PIN via WhatsApp or Email</li>
                    <li>â€¢ Control exactly which pages each assistant can access</li>
                    <li>â€¢ <strong>Dashboard</strong> access is included by default</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="bg-zinc-900 rounded-lg border border-zinc-800 p-6 space-y-6">
              <h2 className="text-lg font-semibold">Assistant Details</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Assistant Name *</Label>
                  <Input
                    id="name"
                    value={assistantName}
                    onChange={(e) => setAssistantName(e.target.value)}
                    placeholder="Full name of assistant"
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
                    placeholder="assistant@clinic.com"
                    className="bg-zinc-800 border-zinc-700"
                  />
                </div>
              </div>
            </div>

            <div className="bg-zinc-900 rounded-lg border border-zinc-800 p-6 space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">Page Access Control</h2>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={selectAllPages} className="text-xs">
                    Select All
                  </Button>
                  <Button variant="outline" size="sm" onClick={deselectAllPages} className="text-xs">
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
                        ? 'bg-blue-500/10 border-blue-500/30'
                        : 'bg-zinc-800 border-zinc-700 hover:border-zinc-600'
                    }`}
                    onClick={() => togglePageSelection(page.id)}
                  >
                    <Checkbox checked={selectedPages.includes(page.id)} onCheckedChange={(e) => { /* handled by parent div onClick */ }} className="pointer-events-none" />
                    <span className="text-xl">{page.icon}</span>
                    <span className="text-sm font-medium">{page.label}</span>
                  </div>
                ))}
              </div>
            </div>

            <Button
              onClick={createAssistant}
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 h-12 text-lg"
            >
              {loading ? 'Processing...' : 'Verify & Add Assistant'}
            </Button>

            {activeAssistants.length > 0 && (
              <div className="bg-zinc-900 rounded-lg border border-zinc-800 p-6 space-y-4">
                <h2 className="text-lg font-semibold">Current Clinic Assistants</h2>
                <div className="grid grid-cols-1 gap-4">
                  {activeAssistants.map((assistant) => (
                    <div key={assistant.id} className="bg-zinc-800 border border-zinc-700 rounded-xl p-4 space-y-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-bold text-lg">{assistant.assistantName}</h3>
                          <p className="text-sm text-gray-400">{assistant.assistantEmail}</p>
                        </div>
                        <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">Active</Badge>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div className="flex items-center gap-2 text-xs text-gray-300">
                          <Eye size={12} className="text-blue-500" />
                          {assistant.allowedPages.length} Pages Accessible
                        </div>
                        {assistant.lastLoginAt && (
                          <div className="flex items-center gap-2 text-xs text-gray-300">
                            <Mail size={12} className="text-blue-500" />
                            Active Since: {assistant.lastLoginAt.toLocaleDateString()}
                          </div>
                        )}
                      </div>

                      {/* Login Link & PIN */}
                      {assistant.accessToken && (
                        <div className="bg-zinc-900/80 border border-zinc-700 rounded-lg p-3 space-y-2">
                          <div className="flex items-center justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <p className="text-[10px] text-gray-500 uppercase tracking-wider">Login Link</p>
                              <p className="text-xs text-gray-300 truncate">{`${window.location.origin}/assistant-login?token=${assistant.accessToken}`}</p>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="shrink-0 h-7 px-2 text-xs text-blue-400 hover:text-blue-300"
                              onClick={() => {
                                navigator.clipboard.writeText(`${window.location.origin}/assistant-login?token=${assistant.accessToken}`);
                                toast.success('Link copied!');
                              }}
                            >
                              <Copy size={12} className="mr-1" /> Copy
                            </Button>
                          </div>
                          {assistant.accessPin && (
                            <div className="flex items-center justify-between gap-2">
                              <div>
                                <p className="text-[10px] text-gray-500 uppercase tracking-wider">Secure PIN</p>
                                <p className="text-sm font-mono font-bold text-emerald-400 tracking-widest">{assistant.accessPin}</p>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="shrink-0 h-7 px-2 text-xs text-blue-400 hover:text-blue-300"
                                onClick={() => {
                                  navigator.clipboard.writeText(assistant.accessPin!);
                                  toast.success('PIN copied!');
                                }}
                              >
                                <Copy size={12} className="mr-1" /> Copy
                              </Button>
                            </div>
                          )}
                        </div>
                      )}

                      <div className="flex flex-wrap gap-2">
                        <Button
                          onClick={() => openEditModal(assistant)}
                          variant="outline"
                          size="sm"
                          className="flex-1 bg-zinc-900 border-zinc-700 hover:bg-zinc-800"
                        >
                          <Edit size={14} className="mr-2" /> Edit Permissions
                        </Button>
                        <Button
                          onClick={() => deactivateAssistant(assistant.id)}
                          variant="outline"
                          size="sm"
                          className="flex-1 bg-zinc-900 border-zinc-700 hover:bg-zinc-800 text-orange-400"
                        >
                          <XCircle size={14} className="mr-2" /> Deactivate
                        </Button>
                        <Button
                          onClick={() => deleteAssistant(assistant.id, assistant.assistantName)}
                          variant="destructive"
                          size="sm"
                        >
                          <Trash size={14} />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modals for Edit and New Link - Reusing logic but styling for clinic */}
      {editingAssistant && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
          <div className="bg-zinc-900 rounded-2xl border border-zinc-800 max-w-2xl w-full max-h-[85vh] overflow-y-auto">
            <div className="p-6 space-y-6">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
                <h2 className="text-xl font-bold">Edit Assistant Permissions</h2>
                <button onClick={() => setEditingAssistant(null)} className="p-2 hover:bg-zinc-800 rounded-full transition-colors">
                  <XCircle className="w-6 h-6 text-gray-500" />
                </button>
              </div>
              <p className="text-sm text-gray-400">Updating access for <strong>{editingAssistant.assistantName}</strong></p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {AVAILABLE_PAGES.map((page) => (
                  <div
                    key={page.id}
                    className={`flex items-center gap-3 p-3 rounded-lg border transition-colors cursor-pointer ${
                      editSelectedPages.includes(page.id)
                        ? 'bg-blue-500/10 border-blue-500/30'
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
                    <Checkbox checked={editSelectedPages.includes(page.id)} onCheckedChange={() => {}} className="pointer-events-none" />
                    <span className="text-xl">{page.icon}</span>
                    <span className="text-sm font-medium">{page.label}</span>
                  </div>
                ))}
              </div>

              <div className="flex gap-4 pt-4 border-t border-zinc-800">
                <Button onClick={() => setEditingAssistant(null)} variant="outline" className="flex-1">Cancel</Button>
                <Button onClick={saveEditedPages} className="flex-1 bg-blue-600 hover:bg-blue-700">Update Access</Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showLinkModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-zinc-900 rounded-2xl max-w-2xl w-full border border-zinc-800 overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
             <div className="bg-blue-500 p-6 flex flex-col items-center text-center text-white">
                <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mb-4">
                  <CheckCircle size={40} />
                </div>
                <h3 className="text-2xl font-bold">Access Link Generated!</h3>
                <p className="text-blue-50/80 mt-1">Successfully added to your clinic roster</p>
             </div>

             <div className="p-8 space-y-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-gray-400">Shareable Login Link</Label>
                    <div className="flex gap-2">
                       <input value={generatedLink} readOnly className="flex-1 bg-zinc-950 border-zinc-800 rounded-lg px-4 py-3 text-sm font-mono text-blue-400" />
                       <Button onClick={() => { navigator.clipboard.writeText(generatedLink); toast.success('Link copied!'); }} className="bg-zinc-800 hover:bg-zinc-700">Copy</Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-gray-400">6-Digit Secure PIN</Label>
                    <div className="flex gap-2">
                       <input value={generatedPin} readOnly className="flex-1 bg-zinc-950 border-zinc-800 rounded-lg px-4 py-3 text-3xl font-bold tracking-widest text-center text-blue-400" />
                       <Button onClick={() => { navigator.clipboard.writeText(generatedPin); toast.success('PIN copied!'); }} className="bg-zinc-800 hover:bg-zinc-700">Copy</Button>
                    </div>
                  </div>
                </div>

                <div className="bg-zinc-950 rounded-xl p-4 border border-zinc-800 space-y-3">
                   <p className="text-sm font-bold text-gray-300">Next Steps:</p>
                   <p className="text-xs text-gray-400">1. Share the link and PIN with the assistant.<br/>2. They will enter the PIN to gain dashboard access.<br/>3. You can manage or revoke access anytime from here.</p>
                   <Button
                    onClick={() => {
                      const text = `Clinic: ${clinicName}\nLogin Link: ${generatedLink}\nAccess PIN: ${generatedPin}`;
                      navigator.clipboard.writeText(text);
                      toast.success('Formatted details copied!');
                    }}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                   >
                     ðŸ“‹ Copy All for WhatsApp
                   </Button>
                </div>

                <Button onClick={() => setShowLinkModal(false)} className="w-full bg-blue-600 hover:bg-blue-700 h-14 text-lg">Close</Button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Internal Badge component if needed
function Badge({ children, className }: { children: React.ReactNode, className?: string }) {
  return (
    <span className={`px-2 py-1 rounded text-xs font-semibold ${className}`}>
      {children}
    </span>
  );
}
