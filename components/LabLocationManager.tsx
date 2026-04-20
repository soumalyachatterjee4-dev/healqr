import { useState, useEffect } from 'react';
import {
  Building2, Mail, MapPin, Plus, Pencil, Trash2,
  Crown, Copy, X, Hash, Lock, Send, Check,
} from 'lucide-react';
import { db, auth } from '../lib/firebase/config';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { sendSignInLinkToEmail } from 'firebase/auth';
import { toast } from 'sonner';

interface BranchLocation {
  id: string;
  name: string;
  landmark: string;
  pinCode?: string;
  email?: string;
  labCode?: string;
}

function generateLabLocationCode(labCode: string, locationId: string | number): string {
  if (!labCode) return labCode;
  const branchNum = String(locationId).trim().padStart(3, '0');
  if (!branchNum) return labCode;

  const match = labCode.match(/^HQR-(\d{6})-(\d{4})-LAB$/);
  if (match) {
    return `HQR-${match[1]}-${match[2]}-${branchNum}-LAB`;
  }

  if (labCode.endsWith('-LAB')) {
    return labCode.replace(/-LAB$/, `-${branchNum}-LAB`);
  }
  return `${labCode}-${branchNum}`;
}

export default function LabLocationManager() {
  const [labData, setLabData] = useState<any>(null);
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

  // Master Access
  const [showMasterModal, setShowMasterModal] = useState(false);
  const [masterSending, setMasterSending] = useState(false);
  const [masterLinkSent, setMasterLinkSent] = useState(false);
  const [masterError, setMasterError] = useState('');
  const [editingMasterEmail, setEditingMasterEmail] = useState(false);
  const [newMasterEmail, setNewMasterEmail] = useState('');
  const [savingMasterEmail, setSavingMasterEmail] = useState(false);

  const labId = auth?.currentUser?.uid || '';

  useEffect(() => {
    loadLabData();
  }, [labId]);

  const loadLabData = async () => {
    if (!labId) return;
    try {
      const labRef = doc(db, 'labs', labId);
      const snap = await getDoc(labRef);
      if (snap.exists()) {
        const data = { id: snap.id, ...snap.data() } as any;
        setLabData(data);
        let locs: BranchLocation[] = data.locations || [];

        const mainLabCode = data.labCode ? generateLabLocationCode(data.labCode, '001') : '';

        // Auto-seed main branch
        const has001 = locs.some((l) => l.id === '001');
        if (!has001) {
          const mainLoc: BranchLocation = {
            id: '001',
            name: data.name || '',
            landmark: data.address || '',
            pinCode: data.pinCode || '',
            email: data.email || '',
            labCode: mainLabCode,
          };
          locs = [mainLoc, ...locs];
          await updateDoc(labRef, { locations: locs, updatedAt: serverTimestamp() });
        } else {
          locs = locs.map((l) =>
            l.id === '001'
              ? {
                  ...l,
                  name: data.name || l.name,
                  landmark: data.address || l.landmark,
                  pinCode: data.pinCode || l.pinCode,
                  email: data.email || l.email,
                  labCode: mainLabCode || l.labCode,
                }
              : l
          );
        }

        // Auto-fix branch codes
        let needsPersist = false;
        locs = locs.map((l) => {
          if (l.id !== '001' && data.labCode) {
            const correctCode = generateLabLocationCode(data.labCode, l.id);
            if (l.labCode !== correctCode) {
              needsPersist = true;
              return { ...l, labCode: correctCode };
            }
          }
          return l;
        });
        const main001 = locs.find((l) => l.id === '001');
        if (main001 && mainLabCode && main001.labCode !== mainLabCode) needsPersist = true;

        if (needsPersist) {
          await updateDoc(labRef, { locations: locs, updatedAt: serverTimestamp() });
        }

        setLocations(locs);
      }
    } catch (err) {
      console.error('Error loading lab data:', err);
      toast.error('Failed to load lab data');
    } finally {
      setLoading(false);
    }
  };

  const subBranches = locations.filter((l) => l.id !== '001');

  const saveLocations = async (updatedLocations: BranchLocation[]) => {
    setSaving(true);
    try {
      const labRef = doc(db, 'labs', labId);
      const locationEmails = updatedLocations.filter((l) => l.email).map((l) => l.email!.toLowerCase());
      await updateDoc(labRef, {
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

    const existingIds = locations.map((l) => parseInt(l.id) || 0);
    const maxId = Math.max(...existingIds, 1);
    const nextId = (maxId + 1).toString().padStart(3, '0');
    const branchLabCode = labData?.labCode ? generateLabLocationCode(labData.labCode, nextId) : '';

    const newBranch: BranchLocation = {
      id: nextId,
      name: branchName.trim(),
      landmark: branchLandmark.trim(),
      pinCode: branchPinCode.trim(),
      email: branchEmail.trim().toLowerCase(),
      labCode: branchLabCode,
    };

    await saveLocations([...locations, newBranch]);
    resetForm();
    toast.success(`Branch "${newBranch.name}" created with code ${branchLabCode}`);
  };

  const handleEditBranch = async () => {
    if (!editingBranch) return;
    if (!branchName.trim() || !branchLandmark.trim()) {
      toast.error('Name and Landmark are required');
      return;
    }

    const updated = locations.map((l) =>
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
    if (branchId === '001') {
      toast.error('Cannot delete main branch');
      return;
    }
    const updated = locations.filter((l) => l.id !== branchId);
    await saveLocations(updated);
    setDeletingId(null);
    toast.success('Branch deleted');
  };

  const handleMasterAccessClick = () => {
    const storedEmail = labData?.masterAccessEmail;
    if (!storedEmail) {
      setEditingMasterEmail(true);
      setNewMasterEmail('');
      setMasterError('');
      setShowMasterModal(true);
    } else {
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
      const labRef = doc(db, 'labs', labId);
      await updateDoc(labRef, { masterAccessEmail: newMasterEmail.trim().toLowerCase() });
      setLabData((prev: any) => ({ ...prev, masterAccessEmail: newMasterEmail.trim().toLowerCase() }));
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
      const email = labData?.masterAccessEmail;
      if (!email) throw new Error('No master email set');

      const actionCodeSettings = {
        url: `${window.location.origin}/master-access-login?labId=${labId}`,
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
    toast.success('Lab code copied');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-10 h-10 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Main Branch Card */}
      {labData && (
        <div className="bg-zinc-900 border border-purple-500/30 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <Crown className="w-5 h-5 text-amber-400" />
            <h2 className="text-lg font-bold text-white">Main Branch</h2>
            <span className="ml-auto text-xs bg-purple-500/20 text-purple-400 px-2 py-0.5 rounded-full">
              #001
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-zinc-500 mb-1">Lab Name</p>
              <p className="text-white font-medium">{labData.name || '—'}</p>
            </div>
            <div>
              <p className="text-xs text-zinc-500 mb-1">Location / Landmark</p>
              <p className="text-white font-medium flex items-center gap-1">
                <MapPin className="w-3 h-3 text-purple-400" />
                {labData.address || '—'}
              </p>
            </div>
            <div>
              <p className="text-xs text-zinc-500 mb-1">Login Email</p>
              <p className="text-white font-medium flex items-center gap-1">
                <Mail className="w-3 h-3 text-blue-400" />
                {labData.email || '—'}
              </p>
            </div>
            <div>
              <p className="text-xs text-zinc-500 mb-1">Lab Code</p>
              <button
                onClick={() => {
                  const mainLoc = locations.find((l) => l.id === '001');
                  copyCode(mainLoc?.labCode || labData.labCode || '');
                }}
                className="text-white font-mono text-sm flex items-center gap-1 hover:text-purple-400 transition-colors"
              >
                <Hash className="w-3 h-3 text-purple-400" />
                {locations.find((l) => l.id === '001')?.labCode || labData.labCode || '—'}
                <Copy className="w-3 h-3 ml-1 text-zinc-500" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Master Access Card */}
      <div className="bg-gradient-to-r from-purple-900/40 to-purple-600/20 border border-purple-500/30 rounded-xl p-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Crown className="w-6 h-6 text-purple-400" />
          <div>
            <h3 className="text-white font-bold text-sm">Master Access</h3>
            <p className="text-zinc-400 text-xs">Owner-only cross-branch analytics</p>
            {labData?.masterAccessEmail && (
              <p className="text-zinc-500 text-xs mt-0.5 flex items-center gap-1">
                <Mail className="w-3 h-3" /> Link sent to: {labData.masterAccessEmail}
              </p>
            )}
          </div>
        </div>
        <button
          onClick={handleMasterAccessClick}
          className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm rounded-lg font-medium transition-colors"
        >
          <Lock className="w-4 h-4" /> Open
        </button>
      </div>

      {/* Branch Locations */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-white font-bold text-lg">Branch Locations</h2>
          <button
            onClick={() => {
              resetForm();
              setShowCreateForm(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm rounded-lg font-medium transition-colors"
          >
            <Plus className="w-4 h-4" /> Create Branch
          </button>
        </div>

        {/* Create / Edit Form */}
        {(showCreateForm || editingBranch) && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 mb-4 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-white font-semibold text-sm">
                {editingBranch ? `Edit Branch #${editingBranch.id}` : 'New Branch'}
              </h3>
              <button onClick={resetForm} className="text-zinc-500 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-zinc-500 mb-1 block">Branch Name</label>
                <input
                  value={branchName}
                  onChange={(e) => setBranchName(e.target.value)}
                  placeholder="e.g. City Center Branch"
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-500"
                />
              </div>
              <div>
                <label className="text-xs text-zinc-500 mb-1 block">Landmark / Address</label>
                <input
                  value={branchLandmark}
                  onChange={(e) => setBranchLandmark(e.target.value)}
                  placeholder="e.g. Near City Mall"
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-500"
                />
              </div>
              <div>
                <label className="text-xs text-zinc-500 mb-1 block">Location Pincode</label>
                <input
                  value={branchPinCode}
                  onChange={(e) => setBranchPinCode(e.target.value)}
                  placeholder="6-digit pincode"
                  maxLength={6}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-500"
                />
              </div>
              <div>
                <label className="text-xs text-zinc-500 mb-1 block">Branch Login Email</label>
                <input
                  value={branchEmail}
                  onChange={(e) => setBranchEmail(e.target.value)}
                  placeholder="branch@lab.com"
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-500"
                />
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={editingBranch ? handleEditBranch : handleCreateBranch}
                disabled={saving}
                className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm rounded-lg font-medium transition-colors disabled:opacity-50"
              >
                {saving ? 'Saving...' : editingBranch ? 'Save Changes' : 'Create Branch'}
              </button>
              <button onClick={resetForm} className="px-5 py-2 bg-zinc-800 text-zinc-400 text-sm rounded-lg hover:text-white transition-colors">
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Branch List */}
        {subBranches.length === 0 && !showCreateForm ? (
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-10 text-center">
            <Building2 className="w-10 h-10 text-purple-500/30 mx-auto mb-3" />
            <p className="text-zinc-500 text-sm">No sub-branches yet. Click "Create Branch" to add one.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {subBranches.map((branch) => (
              <div key={branch.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
                <div className="flex items-start justify-between">
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 flex-1">
                    <div>
                      <p className="text-xs text-zinc-500 mb-0.5">Name</p>
                      <p className="text-white font-medium text-sm">{branch.name}</p>
                    </div>
                    <div>
                      <p className="text-xs text-zinc-500 mb-0.5">Landmark</p>
                      <p className="text-white text-sm flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-purple-400 shrink-0" />
                        {branch.landmark || '—'}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-zinc-500 mb-0.5">Email</p>
                      <p className="text-white text-sm truncate">{branch.email || '—'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-zinc-500 mb-0.5">Location Pincode</p>
                      <p className="text-white text-sm">{branch.pinCode || '—'}</p>
                    </div>
                    <div className="sm:col-span-2">
                      <p className="text-xs text-zinc-500 mb-0.5">Code</p>
                      <button
                        onClick={() => copyCode(branch.labCode || '')}
                        className="text-purple-400 font-mono text-xs flex items-center gap-1 hover:text-purple-300"
                      >
                        {branch.labCode || '—'}
                        <Copy className="w-3 h-3 text-zinc-500" />
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 ml-4 shrink-0">
                    <button
                      onClick={() => startEdit(branch)}
                      className="w-8 h-8 bg-zinc-800 hover:bg-zinc-700 rounded-lg flex items-center justify-center text-zinc-400 hover:text-white transition-colors"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    {deletingId === branch.id ? (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleDeleteBranch(branch.id)}
                          className="w-8 h-8 bg-red-600 hover:bg-red-700 rounded-lg flex items-center justify-center text-white transition-colors"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setDeletingId(null)}
                          className="w-8 h-8 bg-zinc-800 hover:bg-zinc-700 rounded-lg flex items-center justify-center text-zinc-400 hover:text-white transition-colors"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setDeletingId(branch.id)}
                        className="w-8 h-8 bg-zinc-800 hover:bg-red-600/20 rounded-lg flex items-center justify-center text-zinc-400 hover:text-red-400 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Master Access Modal */}
      {showMasterModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={() => setShowMasterModal(false)}>
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 max-w-md w-full space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="text-white font-bold text-lg flex items-center gap-2">
                <Lock className="w-5 h-5 text-purple-400" /> Master Access
              </h3>
              <button onClick={() => setShowMasterModal(false)} className="text-zinc-500 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {editingMasterEmail ? (
              <div className="space-y-3">
                <p className="text-zinc-400 text-sm">Set the owner email for Master Access login</p>
                <input
                  value={newMasterEmail}
                  onChange={(e) => setNewMasterEmail(e.target.value)}
                  placeholder="owner@email.com"
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-500"
                />
                {masterError && <p className="text-red-400 text-xs">{masterError}</p>}
                <button
                  onClick={handleSetMasterEmail}
                  disabled={savingMasterEmail}
                  className="w-full px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm rounded-lg font-medium transition-colors disabled:opacity-50"
                >
                  {savingMasterEmail ? 'Saving...' : 'Save Email'}
                </button>
              </div>
            ) : masterLinkSent ? (
              <div className="text-center py-4">
                <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Check className="w-6 h-6 text-green-400" />
                </div>
                <p className="text-white font-medium">Verification link sent!</p>
                <p className="text-zinc-400 text-xs mt-1">Check inbox of {labData?.masterAccessEmail}</p>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-zinc-400 text-sm">
                  Send a magic link to <span className="text-purple-400 font-medium">{labData?.masterAccessEmail}</span>
                </p>
                {masterError && <p className="text-red-400 text-xs">{masterError}</p>}
                <div className="flex gap-2">
                  <button
                    onClick={handleSendMasterLink}
                    disabled={masterSending}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm rounded-lg font-medium transition-colors disabled:opacity-50"
                  >
                    <Send className="w-4 h-4" /> {masterSending ? 'Sending...' : 'Send Link'}
                  </button>
                  <button
                    onClick={() => { setEditingMasterEmail(true); setNewMasterEmail(labData?.masterAccessEmail || ''); }}
                    className="px-4 py-2 bg-zinc-800 text-zinc-400 text-sm rounded-lg hover:text-white transition-colors"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
