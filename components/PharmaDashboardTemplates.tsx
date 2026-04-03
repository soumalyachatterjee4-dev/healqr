import { useState, useEffect } from 'react';
import { FileText, Upload, Trash2, Image, Eye, Clock, CheckCircle2, AlertCircle, Plus } from 'lucide-react';
import { db, storage } from '../lib/firebase/config';
import { collection, getDocs, addDoc, deleteDoc, doc, getDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { getLocationFromPincode } from '../utils/pincodeMapping';
import { getSpecialtyDisplayName } from '../utils/medicalSpecialties';

interface PharmaDashboardTemplatesProps {
  companyId: string;
}

interface PromoTemplate {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  storagePath: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: any;
  territory: string;
  specialty: string;
}

export default function PharmaDashboardTemplates({ companyId }: PharmaDashboardTemplatesProps) {
  const [templates, setTemplates] = useState<PromoTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [viewingImage, setViewingImage] = useState<string | null>(null);

  // Territory → Specialty cascade (same as CME)
  const [companyTerritories, setCompanyTerritories] = useState<string[]>([]);
  const [territorySpecialtiesMap, setTerritorySpecialtiesMap] = useState<Record<string, string[]>>({});
  const [selectedTerritory, setSelectedTerritory] = useState('');
  const [selectedSpecialty, setSelectedSpecialty] = useState('');
  const [showDisclaimer, setShowDisclaimer] = useState(false);

  useEffect(() => {
    loadTemplates();
    loadCompanyProfile();
  }, [companyId]);

  const loadCompanyProfile = async () => {
    if (!companyId || !db) return;
    try {
      const companyDoc = await getDoc(doc(db, 'pharmaCompanies', companyId));
      if (companyDoc.exists()) {
        const data = companyDoc.data();
        setCompanyTerritories(data.territoryStates || []);
        setTerritorySpecialtiesMap(data.territorySpecialties || data.profile?.territorySpecialties || {});
      }
    } catch (err) {
      console.error('Error loading company profile:', err);
    }
  };

  const specialtyOptions = (() => {
    const specSet = new Set<string>();
    if (selectedTerritory && territorySpecialtiesMap[selectedTerritory]) {
      territorySpecialtiesMap[selectedTerritory].forEach(s => specSet.add(s));
    } else {
      // All territories — merge all specialties
      Object.values(territorySpecialtiesMap).forEach(arr => arr.forEach(s => specSet.add(s)));
    }
    specSet.add('Clinic');
    return [...specSet]
      .map(s => ({ value: s, label: getSpecialtyDisplayName(s) }))
      .sort((a, b) => a.label.localeCompare(b.label));
  })();

  const loadTemplates = async () => {
    if (!companyId || !db) return;
    setLoading(true);

    try {
      const templatesRef = collection(db, 'pharmaCompanies', companyId, 'promoTemplates');
      const snap = await getDocs(templatesRef);

      const items: PromoTemplate[] = snap.docs.map(d => ({
        id: d.id,
        title: d.data().title || '',
        description: d.data().description || '',
        imageUrl: d.data().imageUrl || '',
        storagePath: d.data().storagePath || '',
        status: d.data().status || 'pending',
        createdAt: d.data().createdAt,
        territory: d.data().territory || 'All',
        specialty: d.data().specialty || 'All',
      }));

      items.sort((a, b) => {
        const dateA = a.createdAt?.toDate?.() || new Date(0);
        const dateB = b.createdAt?.toDate?.() || new Date(0);
        return dateB.getTime() - dateA.getTime();
      });

      setTemplates(items);
    } catch (error) {
      console.error('Error loading templates:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      alert('File must be under 5MB');
      return;
    }

    setSelectedFile(file);
    const reader = new FileReader();
    reader.onload = () => setPreviewUrl(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleUploadClick = () => {
    if (!selectedFile || !title.trim() || !companyId || !db || !storage) return;
    if (templates.length >= 2) {
      alert('Maximum 2 templates allowed at a time. Please delete an existing template first.');
      return;
    }
    setShowDisclaimer(true);
  };

  const handleUpload = async () => {
    if (!selectedFile || !title.trim() || !companyId || !db || !storage) return;
    setShowDisclaimer(false);
    setUploading(true);

    try {
      // Upload image
      const fileName = `${Date.now()}_${selectedFile.name}`;
      const storagePath = `pharmaCompanies/${companyId}/promos/${fileName}`;
      const storageRef = ref(storage, storagePath);
      await uploadBytes(storageRef, selectedFile);
      const imageUrl = await getDownloadURL(storageRef);

      // Save to Firestore with territory + specialty
      const templatesRef = collection(db, 'pharmaCompanies', companyId, 'promoTemplates');
      await addDoc(templatesRef, {
        title: title.trim(),
        description: description.trim(),
        imageUrl,
        storagePath,
        status: 'approved',
        createdAt: serverTimestamp(),
        territory: selectedTerritory || 'All',
        specialty: selectedSpecialty || 'All',
        companyId,
      });

      // Reset form
      setTitle('');
      setDescription('');
      setSelectedFile(null);
      setPreviewUrl(null);
      setSelectedTerritory('');
      setSelectedSpecialty('');
      setShowUpload(false);

      await loadTemplates();
    } catch (error) {
      console.error('Error uploading template:', error);
      alert('Failed to upload template');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (template: PromoTemplate) => {
    if (!confirm('Delete this template?')) return;
    if (!db) return;

    try {
      // Delete from storage
      if (template.storagePath && storage) {
        try {
          const storageRef = ref(storage, template.storagePath);
          await deleteObject(storageRef);
        } catch (e) {
          console.warn('Storage delete failed:', e);
        }
      }

      // Delete from Firestore
      await deleteDoc(doc(db, 'pharmaCompanies', companyId, 'promoTemplates', template.id));
      setTemplates(prev => prev.filter(t => t.id !== template.id));
    } catch (error) {
      console.error('Error deleting template:', error);
    }
  };

  const StatusBadge = ({ status }: { status: string }) => {
    const config = {
      pending: { icon: Clock, label: 'Pending Review', color: 'bg-amber-500/20 text-amber-400' },
      approved: { icon: CheckCircle2, label: 'Live', color: 'bg-emerald-500/20 text-emerald-400' },
      rejected: { icon: AlertCircle, label: 'Rejected', color: 'bg-red-500/20 text-red-400' },
    }[status] || { icon: Clock, label: status, color: 'bg-gray-500/20 text-gray-400' };

    const Icon = config.icon;
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs ${config.color}`}>
        <Icon className="w-3 h-3" />
        {config.label}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-400" />
            Dashboard Templates
          </h2>
          <p className="text-sm text-gray-400 mt-1">
            Upload promotional banners for your distributed doctors' dashboards
          </p>
        </div>
        <button
          onClick={() => setShowUpload(!showUpload)}
          disabled={templates.length >= 2 && !showUpload}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors text-sm"
          title={templates.length >= 2 ? 'Maximum 2 templates allowed' : ''}
        >
          <Plus className="w-4 h-4" />
          {templates.length >= 2 ? 'Limit Reached (2/2)' : 'Upload Template'}
        </button>
      </div>

      {/* Upload Form */}
      {showUpload && (
        <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6 space-y-4">
          <h3 className="font-semibold">Upload New Promo Template</h3>

          <div>
            <label className="block text-sm text-gray-400 mb-1">Title *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={100}
              placeholder="e.g., New Product Launch Banner"
              className="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={300}
              rows={2}
              placeholder="Brief description of this promo..."
              className="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          {/* Territory → Specialty Selection (same as CME) */}
          <div className="space-y-4 border border-zinc-700 rounded-lg p-4">
            <h4 className="text-sm font-medium text-gray-300">Target Selection</h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Territory Dropdown */}
              <div>
                <label className="block text-sm text-gray-400 mb-1">Territory</label>
                <select
                  value={selectedTerritory}
                  onChange={(e) => { setSelectedTerritory(e.target.value); setSelectedSpecialty(''); }}
                  className="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Territories</option>
                  {companyTerritories.map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>

              {/* Specialty Dropdown */}
              <div>
                <label className="block text-sm text-gray-400 mb-1">Specialty</label>
                <select
                  value={selectedSpecialty}
                  onChange={(e) => setSelectedSpecialty(e.target.value)}
                  className="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Specialties</option>
                  {specialtyOptions.map(s => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <p className="text-xs text-gray-500">
              Leave as "All" to show this template to all your distributed doctors/clinics.
              Select territory + specialty to target specific groups.
            </p>
          </div>

          {/* Image Upload */}
          <div>
            <label className="block text-sm text-gray-400 mb-2">Banner Image * (max 5MB, recommended 728×90 or 320×100)</label>
            {previewUrl ? (
              <div className="relative">
                <img src={previewUrl} alt="Preview" className="max-h-40 rounded-lg border border-zinc-700" />
                <button
                  onClick={() => { setSelectedFile(null); setPreviewUrl(null); }}
                  className="absolute top-2 right-2 p-1 bg-red-500 rounded-full"
                >
                  <Trash2 className="w-3 h-3 text-white" />
                </button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center h-32 border-2 border-dashed border-zinc-700 rounded-xl cursor-pointer hover:border-blue-500 transition-colors">
                <Upload className="w-8 h-8 text-gray-500 mb-2" />
                <span className="text-sm text-gray-500">Click to select image</span>
                <input type="file" accept="image/*" onChange={handleFileSelect} className="hidden" />
              </label>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              onClick={() => { setShowUpload(false); setTitle(''); setDescription(''); setSelectedFile(null); setPreviewUrl(null); setSelectedTerritory(''); setSelectedSpecialty(''); }}
              className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-sm transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleUploadClick}
              disabled={uploading || !selectedFile || !title.trim()}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-sm transition-colors flex items-center gap-2"
            >
              {uploading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  Upload
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Template Grid */}
      {templates.length === 0 ? (
        <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-12 text-center">
          <Image className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-400 mb-2">No Templates Yet</h3>
          <p className="text-sm text-gray-500 mb-4">Upload promotional banners to display on your distributed doctors' dashboards.</p>
          <button
            onClick={() => setShowUpload(true)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm transition-colors"
          >
            Upload First Template
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map(template => (
            <div key={template.id} className="bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden">
              {/* Image */}
              <div
                className="h-40 bg-zinc-800 cursor-pointer relative group"
                onClick={() => setViewingImage(template.imageUrl)}
              >
                {template.imageUrl ? (
                  <>
                    <img src={template.imageUrl} alt={template.title} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <Eye className="w-8 h-8 text-white" />
                    </div>
                  </>
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Image className="w-12 h-12 text-gray-600" />
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="p-4">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h4 className="font-medium text-sm line-clamp-1">{template.title}</h4>
                  <StatusBadge status={template.status} />
                </div>
                {template.description && (
                  <p className="text-xs text-gray-500 mb-2 line-clamp-2">{template.description}</p>
                )}
                <div className="flex flex-wrap gap-1 mb-3">
                  {template.territory && (
                    <span className="text-xs px-2 py-0.5 bg-blue-500/20 text-blue-400 rounded-full">
                      {template.territory}
                    </span>
                  )}
                  {template.specialty && (
                    <span className="text-xs px-2 py-0.5 bg-emerald-500/20 text-emerald-400 rounded-full">
                      {getSpecialtyDisplayName(template.specialty)}
                    </span>
                  )}
                  {!template.territory && !template.specialty && (
                    <span className="text-xs px-2 py-0.5 bg-zinc-800 text-gray-400 rounded-full">All Targets</span>
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">
                    {template.createdAt?.toDate?.()?.toLocaleDateString?.() || ''}
                  </span>
                  <button
                    onClick={() => handleDelete(template)}
                    className="p-1.5 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Image Lightbox */}
      {viewingImage && (
        <div
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
          onClick={() => setViewingImage(null)}
        >
          <img src={viewingImage} alt="Template" className="max-w-full max-h-full rounded-lg" />
        </div>
      )}

      {/* Info */}
      <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4">
        <p className="text-sm text-blue-400">
          <strong>Note:</strong> Uploaded templates go live immediately on targeted doctor/clinic dashboards.
          All legal, social, and content responsibility lies solely on the uploading pharma company.
        </p>
      </div>

      {/* Legal Disclaimer Modal */}
      {showDisclaimer && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={() => setShowDisclaimer(false)}>
          <div className="bg-zinc-900 border border-zinc-700 rounded-2xl max-w-md w-full p-6 space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-amber-500/20 rounded-full flex items-center justify-center">
                <AlertCircle className="w-5 h-5 text-amber-400" />
              </div>
              <h3 className="text-lg font-semibold text-white">Acknowledgement Required</h3>
            </div>
            <div className="space-y-3 text-sm text-gray-300">
              <p>By uploading this promotional content, you acknowledge and agree that:</p>
              <ul className="list-disc pl-5 space-y-2">
                <li>All <strong className="text-white">legal, social, and content responsibility</strong> for this promotional material lies solely on your pharma company.</li>
                <li><strong className="text-white">www.healqr.com</strong> is a doctor booking platform only and bears no responsibility for the content, claims, or impact of your promotional material.</li>
                <li>Your company is fully responsible for ensuring compliance with all applicable regulations, advertising standards, and ethical guidelines.</li>
              </ul>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setShowDisclaimer(false)}
                className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-sm transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleUpload}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm transition-colors flex items-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4" />
                I Agree & Upload
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

