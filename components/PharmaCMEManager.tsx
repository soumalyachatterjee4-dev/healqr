import { useState, useEffect, useMemo } from 'react';
import { BookOpen, Plus, Power, Trash2, Search, Users, FileText, Video, Link, X, Loader2, Eye, EyeOff, ExternalLink } from 'lucide-react';
import { db } from '../lib/firebase/config';
import { collection, getDocs, addDoc, deleteDoc, doc, updateDoc, serverTimestamp, query, orderBy, getDoc } from 'firebase/firestore';
import { getSpecialtyDisplayName } from '../utils/medicalSpecialties';

interface PharmaCMEManagerProps {
  companyId: string;
}

interface CMEContent {
  id: string;
  title: string;
  description: string;
  type: 'pdf' | 'video' | 'link' | 'article';
  url: string;
  specialty: string;
  territory: string;
  createdAt: any;
  isActive: boolean;
}

interface DoctorActivation {
  doctorId: string;
  doctorName: string;
  specialty: string;
  cmeEnabled: boolean;
}

export default function PharmaCMEManager({ companyId }: PharmaCMEManagerProps) {
  const [loading, setLoading] = useState(true);
  const [contents, setContents] = useState<CMEContent[]>([]);
  const [activations, setActivations] = useState<DoctorActivation[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'content' | 'doctors'>('content');
  const [search, setSearch] = useState('');
  const [uploading, setUploading] = useState(false);

  // Add form
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newType, setNewType] = useState<CMEContent['type']>('pdf');
  const [newUrl, setNewUrl] = useState('');
  const [newSpecialty, setNewSpecialty] = useState('');
  const [newTerritory, setNewTerritory] = useState('');
  const [companyTerritories, setCompanyTerritories] = useState<string[]>([]);
  const [territorySpecialties, setTerritorySpecialties] = useState<Record<string, string[]>>({});

  useEffect(() => {
    loadData();
  }, [companyId]);

  // Load company profile territories + specialties
  useEffect(() => {
    const loadCompanyProfile = async () => {
      if (!companyId || !db) return;
      try {
        const companyDoc = await getDoc(doc(db, 'pharmaCompanies', companyId));
        if (companyDoc.exists()) {
          const data = companyDoc.data();
          setCompanyTerritories(data.territoryStates || []);
          setTerritorySpecialties(data.territorySpecialties || data.profile?.territorySpecialties || {});
        }
      } catch (err) {
        console.error('Error loading company profile:', err);
      }
    };
    loadCompanyProfile();
  }, [companyId]);

  const loadData = async () => {
    if (!companyId || !db) return;
    setLoading(true);
    try {
      // Load CME content
      const contentSnap = await getDocs(query(
        collection(db, 'pharmaCompanies', companyId, 'cmeContent'),
        orderBy('createdAt', 'desc')
      ));
      setContents(contentSnap.docs.map(d => ({
        id: d.id,
        title: d.data().title || '',
        description: d.data().description || '',
        type: d.data().type || 'article',
        url: d.data().url || '',
        specialty: d.data().specialty || 'All',
        territory: d.data().territory || 'All',
        createdAt: d.data().createdAt,
        isActive: d.data().isActive !== false,
      })));

      // Load doctors + activation flags
      const doctorSnap = await getDocs(collection(db, 'pharmaCompanies', companyId, 'distributedDoctors'));
      setActivations(doctorSnap.docs.map(d => ({
        doctorId: d.id,
        doctorName: d.data().doctorName || 'Unknown',
        specialty: d.data().specialty || 'General',
        cmeEnabled: d.data().cmeEnabled === true,
      })));
    } catch (err) {
      console.error('Error loading CME data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddContent = async () => {
    if (!newTitle.trim() || !newUrl.trim() || !db) return;
    setUploading(true);
    try {
      await addDoc(collection(db, 'pharmaCompanies', companyId, 'cmeContent'), {
        title: newTitle.trim(),
        description: newDesc.trim(),
        type: newType,
        url: newUrl.trim(),
        territory: newTerritory || 'All',
        specialty: newSpecialty || 'All',
        createdAt: serverTimestamp(),
        isActive: true,
      });
      resetForm();
      setShowAddModal(false);
      await loadData();
    } catch (err) {
      console.error('Error adding CME content:', err);
    } finally {
      setUploading(false);
    }
  };

  const resetForm = () => {
    setNewTitle(''); setNewDesc(''); setNewType('pdf'); setNewUrl(''); setNewSpecialty(''); setNewTerritory('');
  };

  const toggleContentActive = async (id: string, current: boolean) => {
    if (!db) return;
    try {
      await updateDoc(doc(db, 'pharmaCompanies', companyId, 'cmeContent', id), { isActive: !current });
      setContents(prev => prev.map(c => c.id === id ? { ...c, isActive: !current } : c));
    } catch (err) {
      console.error('Error toggling content:', err);
    }
  };

  const deleteContent = async (id: string) => {
    if (!db || !confirm('Delete this content?')) return;
    try {
      await deleteDoc(doc(db, 'pharmaCompanies', companyId, 'cmeContent', id));
      setContents(prev => prev.filter(c => c.id !== id));
    } catch (err) {
      console.error('Error deleting content:', err);
    }
  };

  const toggleDoctorCME = async (doctorId: string, current: boolean) => {
    if (!db) return;
    try {
      await updateDoc(doc(db, 'pharmaCompanies', companyId, 'distributedDoctors', doctorId), { cmeEnabled: !current });
      setActivations(prev => prev.map(d => d.doctorId === doctorId ? { ...d, cmeEnabled: !current } : d));
    } catch (err) {
      console.error('Error toggling doctor CME:', err);
    }
  };

  const enableAllDoctors = async () => {
    if (!db) return;
    try {
      await Promise.all(
        activations.filter(d => !d.cmeEnabled).map(d =>
          updateDoc(doc(db!, 'pharmaCompanies', companyId, 'distributedDoctors', d.doctorId), { cmeEnabled: true })
        )
      );
      setActivations(prev => prev.map(d => ({ ...d, cmeEnabled: true })));
    } catch (err) {
      console.error('Error enabling all:', err);
    }
  };

  const typeConfig: Record<string, { icon: any; color: string }> = {
    pdf: { icon: FileText, color: 'text-red-400' },
    video: { icon: Video, color: 'text-purple-400' },
    link: { icon: Link, color: 'text-blue-400' },
    article: { icon: BookOpen, color: 'text-emerald-400' },
  };

  const filteredDoctors = search.trim()
    ? activations.filter(d => d.doctorName.toLowerCase().includes(search.toLowerCase()) || d.specialty.toLowerCase().includes(search.toLowerCase()))
    : activations;

  const enabledCount = activations.filter(d => d.cmeEnabled).length;

  const specialtyOptions = useMemo(() => {
    const specSet = new Set<string>();
    if (newTerritory && territorySpecialties[newTerritory]) {
      territorySpecialties[newTerritory].forEach(s => specSet.add(s));
    } else {
      // All territories — merge all specialties
      Object.values(territorySpecialties).forEach(arr => arr.forEach(s => specSet.add(s)));
    }
    specSet.add('Clinic');
    return [...specSet]
      .map(s => ({ value: s, label: getSpecialtyDisplayName(s) }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [newTerritory, territorySpecialties]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-emerald-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-emerald-400" />
            CME / Educational Content
          </h2>
          <p className="text-sm text-gray-400 mt-1">Share educational materials with your distributed doctors</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('content')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'content' ? 'bg-emerald-600 text-white' : 'bg-zinc-800 text-gray-400 hover:bg-zinc-700'
            }`}
          >
            Content ({contents.length})
          </button>
          <button
            onClick={() => setActiveTab('doctors')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'doctors' ? 'bg-emerald-600 text-white' : 'bg-zinc-800 text-gray-400 hover:bg-zinc-700'
            }`}
          >
            Doctors ({enabledCount}/{activations.length})
          </button>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-zinc-900 rounded-xl p-4 border border-zinc-800 text-center">
          <p className="text-2xl font-bold text-emerald-400">{contents.length}</p>
          <p className="text-xs text-gray-500 mt-1">Content Items</p>
        </div>
        <div className="bg-zinc-900 rounded-xl p-4 border border-zinc-800 text-center">
          <p className="text-2xl font-bold text-blue-400">{contents.filter(c => c.isActive).length}</p>
          <p className="text-xs text-gray-500 mt-1">Active</p>
        </div>
        <div className="bg-zinc-900 rounded-xl p-4 border border-zinc-800 text-center">
          <p className="text-2xl font-bold text-purple-400">{enabledCount}</p>
          <p className="text-xs text-gray-500 mt-1">Doctors Enabled</p>
        </div>
        <div className="bg-zinc-900 rounded-xl p-4 border border-zinc-800 text-center">
          <p className="text-2xl font-bold text-amber-400">{activations.length - enabledCount}</p>
          <p className="text-xs text-gray-500 mt-1">Not Enabled</p>
        </div>
      </div>

      {activeTab === 'content' ? (
        <>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium flex items-center gap-2 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Content
          </button>

          <div className="bg-zinc-900 rounded-xl border border-zinc-800">
            <div className="divide-y divide-zinc-800">
              {contents.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  <BookOpen className="w-8 h-8 mx-auto mb-3 text-gray-600" />
                  <p>No content added yet</p>
                  <p className="text-xs mt-1">Share Google Drive links, articles & resources with doctors</p>
                </div>
              ) : (
                contents.map(c => {
                  const tc = typeConfig[c.type] || typeConfig.article;
                  const TypeIcon = tc.icon;
                  return (
                    <div key={c.id} className={`px-4 py-3 flex items-center gap-4 ${!c.isActive ? 'opacity-50' : ''}`}>
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 bg-zinc-800`}>
                        <TypeIcon className={`w-5 h-5 ${tc.color}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{c.title}</p>
                        <p className="text-xs text-gray-500 truncate">{c.description || 'No description'}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs px-1.5 py-0.5 bg-zinc-800 rounded text-gray-400 uppercase">{c.type}</span>
                          {c.territory && c.territory !== 'All' && (
                            <span className="text-xs text-emerald-500">{c.territory}</span>
                          )}
                          <span className="text-xs text-gray-600">{c.specialty}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => toggleContentActive(c.id, c.isActive)}
                          className={`p-2 rounded-lg transition-colors ${c.isActive ? 'text-emerald-400 hover:bg-emerald-500/10' : 'text-gray-500 hover:bg-zinc-800'}`}
                          title={c.isActive ? 'Deactivate' : 'Activate'}
                        >
                          {c.isActive ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                        </button>
                        <button
                          onClick={() => deleteContent(c.id)}
                          className="p-2 rounded-lg text-red-400 hover:bg-red-500/10 transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </>
      ) : (
        <>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                type="text"
                placeholder="Search doctors..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-zinc-900 border border-zinc-800 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <button
              onClick={enableAllDoctors}
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium flex items-center gap-2 transition-colors"
            >
              <Power className="w-4 h-4" />
              Enable All
            </button>
          </div>

          <div className="bg-zinc-900 rounded-xl border border-zinc-800">
            <div className="divide-y divide-zinc-800 max-h-[600px] overflow-y-auto">
              {filteredDoctors.length === 0 ? (
                <div className="p-8 text-center text-gray-500">No doctors found</div>
              ) : (
                filteredDoctors.map(d => (
                  <div key={d.doctorId} className="px-4 py-3 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">{d.doctorName}</p>
                      <p className="text-xs text-gray-500">{d.specialty}</p>
                    </div>
                    <button
                      onClick={() => toggleDoctorCME(d.doctorId, d.cmeEnabled)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 ${
                        d.cmeEnabled
                          ? 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20'
                          : 'bg-zinc-800 text-gray-500 hover:bg-zinc-700'
                      }`}
                    >
                      <Power className="w-3.5 h-3.5" />
                      {d.cmeEnabled ? 'Enabled' : 'Disabled'}
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}

      {/* Add Content Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 rounded-2xl border border-zinc-800 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
              <h3 className="font-semibold">Add CME Content</h3>
              <button onClick={() => { setShowAddModal(false); resetForm(); }} className="p-1 hover:bg-zinc-800 rounded-lg">
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="text-sm text-gray-400 mb-1 block">Title *</label>
                <input
                  value={newTitle}
                  onChange={e => setNewTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-white"
                  placeholder="e.g. Diabetes Management Guidelines 2025"
                />
              </div>
              <div>
                <label className="text-sm text-gray-400 mb-1 block">Description</label>
                <textarea
                  value={newDesc}
                  onChange={e => setNewDesc(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-white resize-none"
                  placeholder="Brief description of the content"
                />
              </div>
              <div>
                <label className="text-sm text-gray-400 mb-1 block">Content Type</label>
                <select
                  value={newType}
                  onChange={e => setNewType(e.target.value as CMEContent['type'])}
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-white"
                >
                  <option value="pdf">PDF (Google Drive Link)</option>
                  <option value="video">Video (Google Drive Link)</option>
                  <option value="link">External Link</option>
                  <option value="article">Article Link</option>
                </select>
              </div>
              <div>
                <label className="text-sm text-gray-400 mb-1 block">Territory</label>
                <select
                  value={newTerritory}
                  onChange={e => { setNewTerritory(e.target.value); setNewSpecialty(''); }}
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-white"
                >
                  <option value="">All Territories</option>
                  {companyTerritories.map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm text-gray-400 mb-1 block">Specialty</label>
                <select
                  value={newSpecialty}
                  onChange={e => setNewSpecialty(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-white"
                >
                  <option value="">All Specialties</option>
                  {specialtyOptions.map(s => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  {specialtyOptions.length > 0
                    ? `${specialtyOptions.length} specialties available`
                    : 'No specialties assigned yet'}
                </p>
              </div>
              <div>
                <label className="text-sm text-gray-400 mb-1 block">Google Drive / URL *</label>
                <div className="flex items-center gap-2">
                  <ExternalLink className="w-4 h-4 text-blue-400 flex-shrink-0" />
                  <input
                    value={newUrl}
                    onChange={e => setNewUrl(e.target.value)}
                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-white"
                    placeholder={newType === 'pdf' || newType === 'video' ? 'https://drive.google.com/file/d/...' : 'https://...'}
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {newType === 'pdf' || newType === 'video' 
                    ? 'Paste your Google Drive sharing link. Make sure the file is set to "Anyone with the link can view".' 
                    : 'Paste the full URL to the content.'}
                </p>
              </div>
            </div>
            <div className="p-4 border-t border-zinc-800 flex justify-end gap-2">
              <button
                onClick={() => { setShowAddModal(false); resetForm(); }}
                className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAddContent}
                disabled={!newTitle.trim() || !newUrl.trim() || uploading}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium disabled:opacity-50 flex items-center gap-2"
              >
                {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                {uploading ? 'Saving...' : 'Add Content'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
