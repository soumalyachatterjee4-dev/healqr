import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import {
  Building2, Mail, MapPin, ArrowLeft, Plus, Pencil, Trash2,
  Crown, Copy, X, ChevronRight, Hash
} from 'lucide-react';
import { db, auth } from '../lib/firebase/config';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
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
        if (!has001) {
          const mainLoc: BranchLocation = {
            id: '001',
            name: data.name || data.clinicName || '',
            landmark: data.address || data.landmark || '',
            email: data.email || '',
            clinicCode: data.clinicCode || '',
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
            email: data.email || l.email,
            clinicCode: data.clinicCode || l.clinicCode,
          } : l);
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
    // Reuse parent clinic code base for branch code
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
            pinCode: branchPinCode.trim() || l.pinCode,
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
                    onClick={() => copyCode(clinicData.clinicCode || '')}
                    className="text-white font-mono text-sm flex items-center gap-1 hover:text-emerald-400 transition-colors"
                  >
                    <Hash className="w-3 h-3 text-emerald-400" />
                    {clinicData.clinicCode || '—'}
                    <Copy className="w-3 h-3 ml-1 text-zinc-500" />
                  </button>
                </div>
              </div>

            </div>
          )}

          {/* Master Access Button */}
          <div className="bg-zinc-900 border border-amber-500/30 rounded-xl p-4 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-amber-400 flex items-center gap-2">
                <Crown className="w-4 h-4" />
                Master Access
              </h3>
              <p className="text-xs text-zinc-500 mt-1">Owner-only cross-branch analytics</p>
            </div>
            <Button
              onClick={() => onMenuChange?.('master-access')}
              className="bg-amber-600 hover:bg-amber-700 text-white gap-1"
              size="sm"
            >
              Open
              <ChevronRight className="w-4 h-4" />
            </Button>
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
                          <Label className="text-xs text-zinc-400">Pincode</Label>
                          <Input value={branchPinCode} onChange={e => setBranchPinCode(e.target.value)}
                            className="bg-zinc-900 border-zinc-700 text-white h-10 mt-1" maxLength={6} />
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
    </div>
  );
}
