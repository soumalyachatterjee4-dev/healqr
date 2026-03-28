import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import {
  Building2, Mail, MapPin, ArrowLeft, Plus, Pencil, Trash2,
  Crown, Copy, X, ChevronRight, Hash, Lock, Send, Check, Pencil as PencilIcon
} from 'lucide-react';
import { db, auth } from '../lib/firebase/config';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { sendSignInLinkToEmail } from 'firebase/auth';
import { toast } from 'sonner';
import { generateClinicLocationCode } from '../utils/idGenerator';
import ClinicSidebar from './ClinicSidebar';

interface BranchLocation {
  id: string;
  name: string;
  landmark: string;
  pinCode?: string;
  email?: string;
  clinicCode?: string;
}

interface LocationManagerProps {
  onMenuChange?: (menu: string) => void;
  onLogout?: () => void | Promise<void>;
}

export default function LocationManagerCreator({ onMenuChange, onLogout }: LocationManagerProps) {
  const [clinicData, setClinicData] = useState<any>(null);
  const [locations, setLocations] = useState<BranchLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Create branch form
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingBranch, setEditingBranch] = useState<BranchLocation | null>(null);
  const [branchName, setBranchName] = useState('');
  const [branchLandmark, setBranchLandmark] = useState('');
  const [branchPinCode, setBranchPinCode] = useState('');
  const [branchEmail, setBranchEmail] = useState('');

  // Delete confirmation
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Master Access Magic Link
  const [showMasterModal, setShowMasterModal] = useState(false);
  const [masterEmailInput, setMasterEmailInput] = useState('');
  const [masterError, setMasterError] = useState('');
  const [masterSending, setMasterSending] = useState(false);
  const [masterLinkSent, setMasterLinkSent] = useState(false);
  const [editingMasterEmail, setEditingMasterEmail] = useState(false);
  const [newMasterEmail, setNewMasterEmail] = useState('');
  const [savingMasterEmail, setSavingMasterEmail] = useState(false);

  // Sidebar
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const clinicId = auth?.currentUser?.uid || '';

  useEffect(() => {
    loadClinicData();
  }, [clinicId]);

  const loadClinicData = async () => {
    if (!clinicId) return;
    try {
      const clinicRef = doc(db, 'clinics', clinicId);
      const snap = await getDoc(clinicRef);
      if (snap.exists()) {
        const data = { id: snap.id, ...snap.data() } as any;
        setClinicData(data);
        let locs: BranchLocation[] = data.locations || [];

        // Auto-seed main branch (001) from clinic signup data if missing
        const has001 = locs.some(l => l.id === '001');
        // Ensure main clinic code includes 001 branch segment
        const mainClinicCode = data.clinicCode
          ? generateClinicLocationCode(data.clinicCode, '001')
          : '';
        if (!has001) {
          const mainLoc: BranchLocation = {
            id: '001',
            name: data.name || data.clinicName || '',
            landmark: data.address || data.landmark || '',
            pinCode: data.pinCode || '',
            email: data.email || '',
            clinicCode: mainClinicCode,
          };
          locs = [mainLoc, ...locs];
          // Persist so it's saved for future loads
          await updateDoc(clinicRef, { locations: locs, updatedAt: serverTimestamp() });
        } else {
          // Keep 001 in sync with clinic data
          locs = locs.map(l => l.id === '001' ? {
            ...l,
            name: data.name || data.clinicName || l.name,
            landmark: data.address || data.landmark || l.landmark,
            pinCode: data.pinCode || l.pinCode,
            email: data.email || l.email,
            clinicCode: mainClinicCode || l.clinicCode,
          } : l);
        }

        // Auto-fix branch codes: regenerate using parent clinicCode (universal rule)
        let needsPersist = false;
        locs = locs.map(l => {
          if (l.id !== '001' && data.clinicCode) {
            const correctCode = generateClinicLocationCode(data.clinicCode, l.id);
            if (l.clinicCode !== correctCode) {
              needsPersist = true;
              return { ...l, clinicCode: correctCode };
            }
          }
          return l;
        });
        // Also check if main branch code needs update
        const main001 = locs.find(l => l.id === '001');
        if (main001 && mainClinicCode && main001.clinicCode !== mainClinicCode) {
          needsPersist = true;
        }
        if (needsPersist) {
          await updateDoc(clinicRef, { locations: locs, updatedAt: serverTimestamp() });
        }

        setLocations(locs);
      }
    } catch (err) {
      console.error('Error loading clinic data:', err);
      toast.error('Failed to load clinic data');
    } finally {
      setLoading(false);
    }
  };

  const subBranches = locations.filter(l => l.id !== '001');

  const saveLocations = async (updatedLocations: BranchLocation[]) => {
    setSaving(true);
    try {
      const clinicRef = doc(db, 'clinics', clinicId);
      // Build flat email array for Firestore querying (branch login detection)
      const locationEmails = updatedLocations
        .filter(l => l.email)
        .map(l => l.email!.toLowerCase());
      await updateDoc(clinicRef, {
        locations: updatedLocations,
        locationEmails,
        updatedAt: serverTimestamp(),
      });
      setLocations(updatedLocations);
      toast.success('Locations updated');
    } catch (err) {
      console.error('Error saving locations:', err);
      toast.error('Failed to save locations');
    } finally {
      setSaving(false);
    }
  };

  const handleCreateBranch = async () => {
    if (!branchName.trim() || !branchLandmark.trim() || !branchPinCode.trim() || !branchEmail.trim()) {
      toast.error('All fields are required');
      return;
    }
    if (!/^\d{6}$/.test(branchPinCode)) {
      toast.error('Pincode must be 6 digits');
      return;
    }
    if (!branchEmail.includes('@')) {
      toast.error('Enter a valid email');
      return;
    }

    // Find max existing branch ID and increment (skip 001 which is main)
    const existingIds = locations.map(l => parseInt(l.id) || 0);
    const maxId = Math.max(...existingIds, 1); // at least 1 so next starts at 002
    const nextId = (maxId + 1).toString().padStart(3, '0');
    // Reuse parent clinic code base for branch code (always uses parent pincode)
    const branchClinicCode = clinicData?.clinicCode
      ? generateClinicLocationCode(clinicData.clinicCode, nextId)
      : '';

    const newBranch: BranchLocation = {
      id: nextId,
      name: branchName.trim(),
      landmark: branchLandmark.trim(),
      pinCode: branchPinCode.trim(),
      email: branchEmail.trim().toLowerCase(),
      clinicCode: branchClinicCode,
    };

    await saveLocations([...locations, newBranch]);
    resetForm();
    toast.success(`Branch "${newBranch.name}" created with code ${branchClinicCode}`);
  };

  const handleEditBranch = async () => {
    if (!editingBranch) return;
    if (!branchName.trim() || !branchLandmark.trim()) {
      toast.error('Name and Landmark are required');
      return;
    }

    const updated = locations.map(l =>
      l.id === editingBranch.id
        ? {
            ...l,
            name: branchName.trim(),
            landmark: branchLandmark.trim(),
            email: branchEmail.trim().toLowerCase() || l.email,
          }
        : l
    );
    await saveLocations(updated);
    resetForm();
  };

  const handleDeleteBranch = async (branchId: string) => {
    if (branchId === '001' || branchId === locations[0]?.id) {
      toast.error('Cannot delete main branch');
      return;
    }
    const updated = locations.filter(l => l.id !== branchId);
    await saveLocations(updated);
    setDeletingId(null);
    toast.success('Branch deleted');
  };

  // Master Access Magic Link handlers
  const handleMasterAccessClick = () => {
    const storedEmail = clinicData?.masterAccessEmail;
    if (!storedEmail) {
      // No email set — show setup modal
      setEditingMasterEmail(true);
      setNewMasterEmail('');
      setMasterError('');
      setShowMasterModal(true);
    } else {
      // Email exists — show send link modal
      setEditingMasterEmail(false);
      setMasterLinkSent(false);
      setMasterSending(false);
      setMasterError('');
      setShowMasterModal(true);
    }
  };

  const handleSetMasterEmail = async () => {
    if (!newMasterEmail.trim() || !newMasterEmail.includes('@')) {
      setMasterError('Enter a valid email address');
      return;
    }
    setSavingMasterEmail(true);
    try {
      const clinicRef = doc(db, 'clinics', clinicId);
      await updateDoc(clinicRef, { masterAccessEmail: newMasterEmail.trim().toLowerCase() });
      setClinicData((prev: any) => ({ ...prev, masterAccessEmail: newMasterEmail.trim().toLowerCase() }));
      setEditingMasterEmail(false);
      setMasterError('');
      toast.success('Master Access email saved');
    } catch {
      setMasterError('Failed to save email');
    } finally {
      setSavingMasterEmail(false);
    }
  };

  const handleSendMasterLink = async () => {
    setMasterSending(true);
    setMasterError('');
    try {
      if (!auth) throw new Error('Firebase not configured');
      const email = clinicData?.masterAccessEmail;
      if (!email) throw new Error('No master email set');

      const actionCodeSettings = {
        url: `${window.location.origin}/master-access-login?clinicId=${clinicId}`,
        handleCodeInApp: true,
      };
      await sendSignInLinkToEmail(auth, email, actionCodeSettings);
      setMasterLinkSent(true);
      toast.success('Verification link sent!');
    } catch (err: any) {
      console.error('Error sending master link:', err);
      setMasterError('Failed to send email. Try again.');
    } finally {
      setMasterSending(false);
    }
  };

  const resetForm = () => {
    setShowCreateForm(false);
    setEditingBranch(null);
    setBranchName('');
    setBranchLandmark('');
    setBranchPinCode('');
    setBranchEmail('');
  };

  const startEdit = (branch: BranchLocation) => {
    setEditingBranch(branch);
    setBranchName(branch.name);
    setBranchLandmark(branch.landmark || '');
    setBranchPinCode(branch.pinCode || '');
    setBranchEmail(branch.email || '');
    setShowCreateForm(false);
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success('Clinic code copied');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-black">
      {/* Sidebar */}
      <ClinicSidebar
        activeMenu="location-manager"
        onMenuChange={(menu) => onMenuChange?.(menu)}
        onLogout={onLogout || (() => {})}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Main Content */}
      <div className="flex-1 lg:ml-64 min-h-screen">
        {/* Top Bar */}
        <div className="sticky top-0 z-30 bg-black/80 backdrop-blur border-b border-zinc-800 px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden text-white"
          >
            <Building2 className="w-6 h-6" />
          </button>
          <button
            onClick={() => onMenuChange?.('dashboard')}
            className="flex items-center gap-1 text-zinc-400 hover:text-white transition-colors text-sm"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="ml-auto text-lg font-semibold text-white flex items-center gap-2">
            <Building2 className="w-5 h-5 text-emerald-500" />
            Location Manager
          </div>
        </div>

        <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-6">

          {/* Main Branch Card — always from clinic doc */}
          {clinicData && (
            <div className="bg-zinc-900 border border-emerald-500/30 rounded-xl p-6">
              <div className="flex items-center gap-2 mb-4">
                <Crown className="w-5 h-5 text-amber-400" />
                <h2 className="text-lg font-bold text-white">Main Branch</h2>
                <span className="ml-auto text-xs bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full">
                  #001
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-zinc-500 mb-1">Clinic Name</p>
                  <p className="text-white font-medium">{clinicData.name || clinicData.clinicName || '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-zinc-500 mb-1">Location / Landmark</p>
                  <p className="text-white font-medium flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-emerald-400" />
                    {clinicData.address || clinicData.landmark || '—'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-zinc-500 mb-1">Login Email</p>
                  <p className="text-white font-medium flex items-center gap-1">
                    <Mail className="w-3 h-3 text-blue-400" />
                    {clinicData.email || '—'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-zinc-500 mb-1">Clinic Code</p>
                  <button
                    onClick={() => {
                      const mainLoc = locations.find(l => l.id === '001');
                      copyCode(mainLoc?.clinicCode || clinicData.clinicCode || '');
                    }}
                    className="text-white font-mono text-sm flex items-center gap-1 hover:text-emerald-400 transition-colors"
                  >
                    <Hash className="w-3 h-3 text-emerald-400" />
                    {locations.find(l => l.id === '001')?.clinicCode || clinicData.clinicCode || '—'}
                    <Copy className="w-3 h-3 ml-1 text-zinc-500" />
                  </button>
                </div>
              </div>

            </div>
          )}

          {/* Master Access Card */}
          <div className="bg-amber-600 rounded-xl p-4 shadow-lg space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-500/50 rounded-lg">
                  <Crown className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Master Access</h3>
                  <p className="text-xs text-amber-100/80 mt-0.5">Owner-only cross-branch analytics</p>
                </div>
              </div>
              <Button
                onClick={handleMasterAccessClick}
                className="bg-amber-800 hover:bg-amber-900 text-white gap-1 border border-amber-500/50"
                size="sm"
              >
                <Lock className="w-3.5 h-3.5" />
                Open
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
            {clinicData?.masterAccessEmail && (
              <div className="flex items-center gap-1.5 text-xs text-amber-100/70">
                <Mail className="w-3 h-3" />
                Link sent to: {clinicData.masterAccessEmail}
              </div>
            )}
          </div>

          {/* Branch Locations List */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-white">Branch Locations</h2>
              <Button
                onClick={() => { resetForm(); setShowCreateForm(true); }}
                className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1"
                size="sm"
              >
                <Plus className="w-4 h-4" />
                Create Branch
              </Button>
            </div>

            {subBranches.length === 0 && !showCreateForm && (
              <div className="text-center py-8 text-zinc-500">
                <Building2 className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p>No branch locations yet.</p>
                <p className="text-sm mt-1">Create your first branch to expand your clinic.</p>
              </div>
            )}

            {/* Branch cards */}
            <div className="space-y-3">
              {subBranches.map((branch) => (
                <div
                  key={branch.id}
                  className="bg-black border border-zinc-800 rounded-lg p-4"
                >
                  {/* Delete confirmation overlay */}
                  {deletingId === branch.id ? (
                    <div className="flex items-center justify-between">
                      <p className="text-red-400 text-sm">Delete "{branch.name}"?</p>
                      <div className="flex gap-2">
                        <Button size="sm" variant="destructive" onClick={() => handleDeleteBranch(branch.id)} disabled={saving}>
                          Confirm
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => setDeletingId(null)}>
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : editingBranch?.id === branch.id ? (
                    /* Inline edit form */
                    <div className="space-y-3">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-sm font-bold text-white">Edit Branch #{branch.id}</h3>
                        <button onClick={resetForm} className="text-zinc-400 hover:text-white">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <Label className="text-xs text-zinc-400">Branch Name</Label>
                          <Input value={branchName} onChange={e => setBranchName(e.target.value)}
                            className="bg-zinc-900 border-zinc-700 text-white h-10 mt-1" />
                        </div>
                        <div>
                          <Label className="text-xs text-zinc-400">Landmark</Label>
                          <Input value={branchLandmark} onChange={e => setBranchLandmark(e.target.value)}
                            className="bg-zinc-900 border-zinc-700 text-white h-10 mt-1" />
                        </div>
                        <div>
                          <Label className="text-xs text-zinc-400">Location Pincode</Label>
                          <Input value={branchPinCode} disabled
                            className="bg-zinc-900 border-zinc-700 text-gray-500 h-10 mt-1 cursor-not-allowed" maxLength={6} />
                        </div>
                        <div>
                          <Label className="text-xs text-zinc-400">Login Email</Label>
                          <Input value={branchEmail} onChange={e => setBranchEmail(e.target.value)}
                            className="bg-zinc-900 border-zinc-700 text-white h-10 mt-1" type="email" />
                        </div>
                      </div>
                      <div className="flex gap-2 pt-2">
                        <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={handleEditBranch} disabled={saving}>
                          {saving ? 'Saving...' : 'Save Changes'}
                        </Button>
                        <Button size="sm" variant="outline" onClick={resetForm}>Cancel</Button>
                      </div>
                    </div>
                  ) : (
                    /* Normal branch card */
                    <div className="flex flex-col md:flex-row md:items-center gap-3">
                      <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-3">
                        <div>
                          <p className="text-xs text-zinc-500">Name</p>
                          <p className="text-sm text-white font-medium">{branch.name}</p>
                        </div>
                        <div>
                          <p className="text-xs text-zinc-500">Landmark</p>
                          <p className="text-sm text-white flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-emerald-400" />
                            {branch.landmark || '—'}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-zinc-500">Email</p>
                          <p className="text-sm text-white truncate">{branch.email || '—'}</p>
                        </div>
                        <div>
                          <p className="text-xs text-zinc-500">Location Pincode</p>
                          <p className="text-sm text-white font-mono">{branch.pinCode || '—'}</p>
                        </div>
                        <div>
                          <p className="text-xs text-zinc-500">Code</p>
                          <button
                            onClick={() => copyCode(branch.clinicCode || '')}
                            className="text-sm text-white font-mono flex items-center gap-1 hover:text-emerald-400"
                          >
                            {branch.clinicCode || '—'}
                            <Copy className="w-3 h-3 text-zinc-500" />
                          </button>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => startEdit(branch)}
                          className="p-2 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-blue-400 transition-colors"
                          title="Edit"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setDeletingId(branch.id)}
                          className="p-2 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-red-400 transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Create Branch Form */}
            {showCreateForm && (
              <div className="mt-4 bg-black border border-emerald-500/30 rounded-lg p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Plus className="w-4 h-4 text-emerald-400" />
                    Create New Branch
                  </h3>
                  <button onClick={resetForm} className="text-zinc-400 hover:text-white">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs text-zinc-400">Branch Name *</Label>
                    <Input
                      value={branchName}
                      onChange={e => setBranchName(e.target.value)}
                      placeholder="e.g. Howrah Branch"
                      className="bg-zinc-900 border-zinc-700 text-white h-10 mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-zinc-400">Location / Landmark *</Label>
                    <Input
                      value={branchLandmark}
                      onChange={e => setBranchLandmark(e.target.value)}
                      placeholder="e.g. Baksara Bazar, Howrah"
                      className="bg-zinc-900 border-zinc-700 text-white h-10 mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-zinc-400">Location Pincode *</Label>
                    <Input
                      value={branchPinCode}
                      onChange={e => setBranchPinCode(e.target.value)}
                      placeholder="e.g. 711101"
                      className="bg-zinc-900 border-zinc-700 text-white h-10 mt-1"
                      maxLength={6}
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-zinc-400">Login Email *</Label>
                    <Input
                      value={branchEmail}
                      onChange={e => setBranchEmail(e.target.value)}
                      placeholder="branch-manager@email.com"
                      className="bg-zinc-900 border-zinc-700 text-white h-10 mt-1"
                      type="email"
                    />
                    <p className="text-xs text-zinc-600 mt-1">This email will receive a magic link to login</p>
                  </div>
                </div>
                <div className="flex gap-2 mt-4">
                  <Button
                    className="bg-emerald-600 hover:bg-emerald-700 gap-1"
                    onClick={handleCreateBranch}
                    disabled={saving}
                  >
                    {saving ? 'Creating...' : 'Create Branch'}
                  </Button>
                  <Button variant="outline" onClick={resetForm}>Cancel</Button>
                </div>
              </div>
            )}
          </div>

        </div>
      </div>

      {/* Master Access Magic Link Modal */}
      {showMasterModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-sm overflow-hidden">
            <div className="p-6 border-b border-zinc-800 bg-amber-600/10">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-xl bg-amber-500/20">
                    <Lock className="w-6 h-6 text-amber-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">
                      {editingMasterEmail ? (clinicData?.masterAccessEmail ? 'Update Email' : 'Set Owner Email') : masterLinkSent ? 'Check Your Email' : 'Master Access'}
                    </h3>
                    <p className="text-xs text-gray-400">
                      {editingMasterEmail ? 'Set the email for the clinic owner' : masterLinkSent ? 'Open the link from your email' : 'Send a secure link to your email'}
                    </p>
                  </div>
                </div>
                <button onClick={() => setShowMasterModal(false)} className="text-zinc-400 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="p-6 space-y-4">
              {editingMasterEmail ? (
                <>
                  <div>
                    <label className="text-xs text-zinc-400 mb-1 block">Owner Email Address</label>
                    <Input
                      type="email"
                      value={newMasterEmail}
                      onChange={(e) => { setNewMasterEmail(e.target.value); setMasterError(''); }}
                      placeholder="owner@email.com"
                      className="bg-zinc-800 border-zinc-700 text-white"
                      autoFocus
                      onKeyDown={(e) => { if (e.key === 'Enter') handleSetMasterEmail(); }}
                    />
                    <p className="text-xs text-zinc-500 mt-1">A magic link will be sent to this email to open Master Access</p>
                  </div>
                  {masterError && <p className="text-red-400 text-xs">{masterError}</p>}
                  <div className="flex gap-3">
                    <button
                      onClick={() => {
                        if (clinicData?.masterAccessEmail) { setEditingMasterEmail(false); }
                        else { setShowMasterModal(false); }
                      }}
                      className="flex-1 px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-gray-300 rounded-xl text-sm font-medium transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSetMasterEmail}
                      disabled={!newMasterEmail.includes('@') || savingMasterEmail}
                      className="flex-1 px-4 py-2.5 bg-amber-600 hover:bg-amber-500 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl text-sm font-bold transition-colors"
                    >
                      {savingMasterEmail ? 'Saving...' : 'Save Email'}
                    </button>
                  </div>
                </>
              ) : masterLinkSent ? (
                <>
                  <div className="text-center space-y-3">
                    <div className="p-4 rounded-full bg-emerald-500/20 w-fit mx-auto">
                      <Mail className="w-8 h-8 text-emerald-400" />
                    </div>
                    <p className="text-sm text-zinc-300">
                      Link sent to <span className="text-amber-400 font-medium">{clinicData?.masterAccessEmail}</span>
                    </p>
                    <p className="text-xs text-zinc-500">Open the email and click the link to access Master Analytics. It works in any browser or device.</p>
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={() => setShowMasterModal(false)}
                      className="flex-1 px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-gray-300 rounded-xl text-sm font-medium transition-colors"
                    >
                      Close
                    </button>
                    <button
                      onClick={() => { setMasterLinkSent(false); }}
                      className="flex-1 px-4 py-2.5 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-sm font-bold transition-colors"
                    >
                      Resend
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="text-center space-y-3">
                    <p className="text-sm text-zinc-300">
                      A secure magic link will be sent to:
                    </p>
                    <p className="text-amber-400 font-medium">{clinicData?.masterAccessEmail}</p>
                    <p className="text-xs text-zinc-500">Click the link in your email to open Master Access analytics. Works on any device.</p>
                  </div>
                  {masterError && <p className="text-red-400 text-xs text-center">{masterError}</p>}
                  <div className="flex gap-3">
                    <button
                      onClick={() => setShowMasterModal(false)}
                      className="flex-1 px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-gray-300 rounded-xl text-sm font-medium transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSendMasterLink}
                      disabled={masterSending}
                      className="flex-1 px-4 py-2.5 bg-amber-600 hover:bg-amber-500 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl text-sm font-bold transition-colors flex items-center justify-center gap-2"
                    >
                      {masterSending ? 'Sending...' : <><Send className="w-4 h-4" /> Send Link</>}
                    </button>
                  </div>
                  <button
                    onClick={() => { setEditingMasterEmail(true); setNewMasterEmail(clinicData?.masterAccessEmail || ''); }}
                    className="text-xs text-zinc-500 hover:text-amber-400 text-center w-full transition-colors"
                  >
                    Change email address
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
