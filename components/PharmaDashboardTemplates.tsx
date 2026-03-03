import { useState, useEffect } from 'react';
import { FileText, Upload, Trash2, Image, Eye, Clock, CheckCircle2, AlertCircle, Plus } from 'lucide-react';
import { db, storage } from '../lib/firebase/config';
import { collection, getDocs, addDoc, deleteDoc, doc, serverTimestamp, query, where, orderBy } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';

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
  targetSpecialties: string[];
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
  const [selectedSpecialties, setSelectedSpecialties] = useState<string[]>([]);
  const [viewingImage, setViewingImage] = useState<string | null>(null);

  const specialties = [
    'General Physician', 'Cardiologist', 'Dermatologist', 'Orthopedic',
    'Pediatrician', 'Gynecologist', 'ENT', 'Ophthalmologist',
    'Neurologist', 'Psychiatrist', 'Dentist', 'All Specialties'
  ];

  useEffect(() => {
    loadTemplates();
  }, [companyId]);

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
        targetSpecialties: d.data().targetSpecialties || [],
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

  const handleUpload = async () => {
    if (!selectedFile || !title.trim() || !companyId || !db || !storage) return;
    setUploading(true);

    try {
      // Upload image
      const fileName = `${Date.now()}_${selectedFile.name}`;
      const storagePath = `pharma/${companyId}/promos/${fileName}`;
      const storageRef = ref(storage, storagePath);
      await uploadBytes(storageRef, selectedFile);
      const imageUrl = await getDownloadURL(storageRef);

      // Save to Firestore
      const templatesRef = collection(db, 'pharmaCompanies', companyId, 'promoTemplates');
      await addDoc(templatesRef, {
        title: title.trim(),
        description: description.trim(),
        imageUrl,
        storagePath,
        status: 'pending',
        createdAt: serverTimestamp(),
        targetSpecialties: selectedSpecialties.length > 0 ? selectedSpecialties : ['All Specialties'],
        companyId,
      });

      // Reset form
      setTitle('');
      setDescription('');
      setSelectedFile(null);
      setPreviewUrl(null);
      setSelectedSpecialties([]);
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

  const toggleSpecialty = (spec: string) => {
    if (spec === 'All Specialties') {
      setSelectedSpecialties(['All Specialties']);
      return;
    }
    setSelectedSpecialties(prev => {
      const filtered = prev.filter(s => s !== 'All Specialties');
      if (filtered.includes(spec)) {
        return filtered.filter(s => s !== spec);
      }
      return [...filtered, spec];
    });
  };

  const StatusBadge = ({ status }: { status: string }) => {
    const config = {
      pending: { icon: Clock, label: 'Pending Review', color: 'bg-amber-500/20 text-amber-400' },
      approved: { icon: CheckCircle2, label: 'Approved', color: 'bg-emerald-500/20 text-emerald-400' },
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
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors text-sm"
        >
          <Plus className="w-4 h-4" />
          Upload Template
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

          {/* Target Specialties */}
          <div>
            <label className="block text-sm text-gray-400 mb-2">Target Specialties</label>
            <div className="flex flex-wrap gap-2">
              {specialties.map(spec => (
                <button
                  key={spec}
                  onClick={() => toggleSpecialty(spec)}
                  className={`px-3 py-1.5 rounded-full text-xs transition-colors ${
                    selectedSpecialties.includes(spec)
                      ? 'bg-blue-600 text-white'
                      : 'bg-zinc-800 text-gray-400 hover:bg-zinc-700'
                  }`}
                >
                  {spec}
                </button>
              ))}
            </div>
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
              onClick={() => { setShowUpload(false); setTitle(''); setDescription(''); setSelectedFile(null); setPreviewUrl(null); setSelectedSpecialties([]); }}
              className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-sm transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleUpload}
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
                  {template.targetSpecialties.slice(0, 3).map(spec => (
                    <span key={spec} className="text-xs px-2 py-0.5 bg-zinc-800 text-gray-400 rounded-full">
                      {spec}
                    </span>
                  ))}
                  {template.targetSpecialties.length > 3 && (
                    <span className="text-xs px-2 py-0.5 bg-zinc-800 text-gray-400 rounded-full">
                      +{template.targetSpecialties.length - 3}
                    </span>
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
          <strong>Note:</strong> All templates require admin approval before appearing on doctor dashboards.
          Approved templates appear as "Dashboard Promo" cards.
        </p>
      </div>
    </div>
  );
}
