import { useState, useEffect } from 'react';
import { FileText, Upload, Trash2, Image, Eye, Clock, CheckCircle2, AlertCircle, Plus } from 'lucide-react';
import { db, storage } from '../lib/firebase/config';
import { collection, getDocs, addDoc, deleteDoc, doc, getDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { getLocationFromPincode } from '../utils/pincodeMapping';

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
  targetStates: string[];
  targetSpecialties: string[];
  targetDoctorIds: string[];
  targetClinicIds: string[];
  targetDoctorNames: string[];
  targetClinicNames: string[];
}

interface TargetEntity {
  id: string;
  name: string;
  type: 'doctor' | 'clinic';
  specialty: string;
  state: string;
  pincode: string;
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

  // Cascading filter state
  const [allEntities, setAllEntities] = useState<TargetEntity[]>([]);
  const [companyStates, setCompanyStates] = useState<string[]>([]);
  const [selectedStates, setSelectedStates] = useState<string[]>([]);
  const [availableSpecialties, setAvailableSpecialties] = useState<string[]>([]);
  const [selectedSpecialties, setSelectedSpecialties] = useState<string[]>([]);
  const [filteredEntities, setFilteredEntities] = useState<TargetEntity[]>([]);
  const [selectedEntityIds, setSelectedEntityIds] = useState<string[]>([]);
  const [selectAll, setSelectAll] = useState(false);
  const [loadingEntities, setLoadingEntities] = useState(false);
  const [showDisclaimer, setShowDisclaimer] = useState(false);

  useEffect(() => {
    loadTemplates();
    loadEntities();
  }, [companyId]);

  // Update available specialties when selected states change
  useEffect(() => {
    if (selectedStates.length === 0) {
      setAvailableSpecialties([]);
      setSelectedSpecialties([]);
      setFilteredEntities([]);
      setSelectedEntityIds([]);
      return;
    }
    const specs = new Set<string>();
    allEntities.filter(e => selectedStates.includes(e.state)).forEach(e => specs.add(e.specialty));
    setAvailableSpecialties(Array.from(specs).sort());
    // Reset downstream
    setSelectedSpecialties([]);
    setFilteredEntities([]);
    setSelectedEntityIds([]);
    setSelectAll(false);
  }, [selectedStates, allEntities]);

  // Update filtered entities when specialties change
  useEffect(() => {
    if (selectedSpecialties.length === 0) {
      setFilteredEntities([]);
      setSelectedEntityIds([]);
      setSelectAll(false);
      return;
    }
    const filtered = allEntities.filter(e =>
      selectedStates.includes(e.state) && selectedSpecialties.includes(e.specialty)
    );
    setFilteredEntities(filtered);
    setSelectedEntityIds([]);
    setSelectAll(false);
  }, [selectedSpecialties, selectedStates, allEntities]);

  const loadEntities = async () => {
    if (!companyId || !db) return;
    setLoadingEntities(true);
    try {
      const entities: TargetEntity[] = [];

      // Load distributed doctors
      const doctorsSnap = await getDocs(collection(db, 'pharmaCompanies', companyId, 'distributedDoctors'));
      doctorsSnap.forEach(d => {
        const data = d.data();
        const loc = getLocationFromPincode(data.pincode || '');
        entities.push({
          id: data.doctorId || d.id,
          name: data.doctorName || 'Unknown Doctor',
          type: 'doctor',
          specialty: data.specialty || 'General',
          state: loc.state,
          pincode: data.pincode || '',
        });
      });

      // Load distributed clinics
      const clinicsSnap = await getDocs(collection(db, 'pharmaCompanies', companyId, 'distributedClinics'));
      clinicsSnap.forEach(d => {
        const data = d.data();
        const loc = getLocationFromPincode(data.pincode || '');
        entities.push({
          id: data.clinicId || d.id,
          name: data.clinicName || 'Unknown Clinic',
          type: 'clinic',
          specialty: 'Clinic',
          state: loc.state,
          pincode: data.pincode || '',
        });
      });

      // Also check doctors & clinics collections by companyName (trimmed, case-insensitive)
      const companyDoc = await getDoc(doc(db, 'pharmaCompanies', companyId));
      const companyName = companyDoc.exists() ? companyDoc.data().companyName : '';
      if (companyName) {
        const lcName = companyName.toLowerCase().trim();
        const existingDoctorIds = new Set(entities.filter(e => e.type === 'doctor').map(e => e.id));

        const allDoctorsSnap = await getDocs(collection(db, 'doctors'));
        allDoctorsSnap.forEach(d => {
          if (existingDoctorIds.has(d.id)) return;
          const data = d.data();
          const cn = data.companyName;
          if (!cn || cn.toLowerCase().trim() !== lcName) return;
          const loc = getLocationFromPincode(data.pinCode || '');
          entities.push({
            id: d.id,
            name: data.name || 'Unknown Doctor',
            type: 'doctor',
            specialty: Array.isArray(data.specialties) ? data.specialties.join(', ') : (data.specialty || 'General'),
            state: loc.state,
            pincode: data.pinCode || '',
          });
        });

        const existingClinicIds = new Set(entities.filter(e => e.type === 'clinic').map(e => e.id));
        const allClinicsSnap = await getDocs(collection(db, 'clinics'));
        allClinicsSnap.forEach(d => {
          if (existingClinicIds.has(d.id)) return;
          const data = d.data();
          const cn = data.companyName;
          if (!cn || cn.toLowerCase().trim() !== lcName) return;
          const loc = getLocationFromPincode(data.pinCode || '');
          entities.push({
            id: d.id,
            name: data.name || 'Unknown Clinic',
            type: 'clinic',
            specialty: 'Clinic',
            state: loc.state,
            pincode: data.pinCode || '',
          });
        });
      }

      setAllEntities(entities);
      const stateSet = new Set(entities.map(e => e.state).filter(Boolean));
      setCompanyStates(Array.from(stateSet).sort());
    } catch (err) {
      console.error('Error loading entities:', err);
    } finally {
      setLoadingEntities(false);
    }
  };

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
        targetStates: d.data().targetStates || [],
        targetDoctorIds: d.data().targetDoctorIds || [],
        targetClinicIds: d.data().targetClinicIds || [],
        targetDoctorNames: d.data().targetDoctorNames || [],
        targetClinicNames: d.data().targetClinicNames || [],
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
    if (selectedEntityIds.length === 0) {
      alert('Please select at least one doctor or clinic to target');
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

      const targetDoctors = filteredEntities.filter(e => e.type === 'doctor' && selectedEntityIds.includes(e.id));
      const targetClinics = filteredEntities.filter(e => e.type === 'clinic' && selectedEntityIds.includes(e.id));

      // Save to Firestore
      const templatesRef = collection(db, 'pharmaCompanies', companyId, 'promoTemplates');
      await addDoc(templatesRef, {
        title: title.trim(),
        description: description.trim(),
        imageUrl,
        storagePath,
        status: 'approved',
        createdAt: serverTimestamp(),
        targetStates: selectedStates,
        targetSpecialties: selectedSpecialties,
        targetDoctorIds: targetDoctors.map(d => d.id),
        targetClinicIds: targetClinics.map(c => c.id),
        targetDoctorNames: targetDoctors.map(d => d.name),
        targetClinicNames: targetClinics.map(c => c.name),
        companyId,
      });

      // Reset form
      setTitle('');
      setDescription('');
      setSelectedFile(null);
      setPreviewUrl(null);
      setSelectedStates([]);
      setSelectedSpecialties([]);
      setSelectedEntityIds([]);
      setSelectAll(false);
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

          {/* Cascading Target Selection: State → Specialty → Doctor/Clinic */}
          <div className="space-y-4 border border-zinc-700 rounded-lg p-4">
            <h4 className="text-sm font-medium text-gray-300">Target Selection</h4>

            {loadingEntities ? (
              <div className="flex items-center gap-2 text-sm text-gray-400">
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-500 border-t-transparent" />
                Loading doctors & clinics...
              </div>
            ) : companyStates.length === 0 ? (
              <p className="text-sm text-gray-500">No distributed doctors or clinics found. Add them from My Doctors / My Clinics first.</p>
            ) : (
              <>
                {/* Step 1: Select States */}
                <div>
                  <label className="block text-sm text-gray-400 mb-2">1. Select State(s)</label>
                  <div className="flex flex-wrap gap-2">
                    {companyStates.map(state => (
                      <button
                        key={state}
                        onClick={() => setSelectedStates(prev =>
                          prev.includes(state) ? prev.filter(s => s !== state) : [...prev, state]
                        )}
                        className={`px-3 py-1.5 rounded-full text-xs transition-colors ${
                          selectedStates.includes(state)
                            ? 'bg-blue-600 text-white'
                            : 'bg-zinc-800 text-gray-400 hover:bg-zinc-700'
                        }`}
                      >
                        {state}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Step 2: Select Specialties */}
                {selectedStates.length > 0 && availableSpecialties.length > 0 && (
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">2. Select Specialty</label>
                    <div className="flex flex-wrap gap-2">
                      {availableSpecialties.map(spec => (
                        <button
                          key={spec}
                          onClick={() => setSelectedSpecialties(prev =>
                            prev.includes(spec) ? prev.filter(s => s !== spec) : [...prev, spec]
                          )}
                          className={`px-3 py-1.5 rounded-full text-xs transition-colors ${
                            selectedSpecialties.includes(spec)
                              ? 'bg-emerald-600 text-white'
                              : 'bg-zinc-800 text-gray-400 hover:bg-zinc-700'
                          }`}
                        >
                          {spec}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Step 3: Select Doctors / Clinics */}
                {selectedSpecialties.length > 0 && filteredEntities.length > 0 && (
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">3. Select Doctor(s) / Clinic(s)</label>
                    <label className="flex items-center gap-2 mb-2 cursor-pointer text-sm text-gray-300">
                      <input
                        type="checkbox"
                        checked={selectAll}
                        onChange={(e) => {
                          setSelectAll(e.target.checked);
                          setSelectedEntityIds(e.target.checked ? filteredEntities.map(en => en.id) : []);
                        }}
                        className="rounded border-zinc-600 bg-zinc-800"
                      />
                      Select All ({filteredEntities.length})
                    </label>
                    <div className="max-h-48 overflow-y-auto space-y-1 border border-zinc-700 rounded-lg p-2">
                      {filteredEntities.map(entity => (
                        <label key={entity.id} className="flex items-center gap-2 px-2 py-1.5 hover:bg-zinc-800 rounded cursor-pointer">
                          <input
                            type="checkbox"
                            checked={selectedEntityIds.includes(entity.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                const next = [...selectedEntityIds, entity.id];
                                setSelectedEntityIds(next);
                                setSelectAll(next.length === filteredEntities.length);
                              } else {
                                setSelectedEntityIds(prev => prev.filter(id => id !== entity.id));
                                setSelectAll(false);
                              }
                            }}
                            className="rounded border-zinc-600 bg-zinc-800"
                          />
                          <span className="text-sm text-gray-300">{entity.name}</span>
                          <span className={`text-xs px-1.5 py-0.5 rounded-full ${entity.type === 'doctor' ? 'bg-blue-500/20 text-blue-400' : 'bg-purple-500/20 text-purple-400'}`}>
                            {entity.type === 'doctor' ? 'Dr' : 'Clinic'}
                          </span>
                          <span className="text-xs text-gray-500 ml-auto">{entity.state}</span>
                        </label>
                      ))}
                    </div>
                    {selectedEntityIds.length > 0 && (
                      <p className="text-xs text-emerald-400 mt-1">{selectedEntityIds.length} selected</p>
                    )}
                  </div>
                )}
              </>
            )}
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
              onClick={() => { setShowUpload(false); setTitle(''); setDescription(''); setSelectedFile(null); setPreviewUrl(null); setSelectedStates([]); setSelectedSpecialties([]); setSelectedEntityIds([]); setSelectAll(false); }}
              className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-sm transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleUploadClick}
              disabled={uploading || !selectedFile || !title.trim() || selectedEntityIds.length === 0}
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
                  {(template.targetStates || []).map(state => (
                    <span key={state} className="text-xs px-2 py-0.5 bg-blue-500/20 text-blue-400 rounded-full">
                      {state}
                    </span>
                  ))}
                  {(template.targetDoctorNames || []).slice(0, 2).map(name => (
                    <span key={name} className="text-xs px-2 py-0.5 bg-zinc-800 text-gray-400 rounded-full">
                      {name}
                    </span>
                  ))}
                  {(template.targetClinicNames || []).slice(0, 2).map(name => (
                    <span key={name} className="text-xs px-2 py-0.5 bg-purple-500/20 text-purple-400 rounded-full">
                      {name}
                    </span>
                  ))}
                  {((template.targetDoctorNames?.length || 0) + (template.targetClinicNames?.length || 0)) > 4 && (
                    <span className="text-xs px-2 py-0.5 bg-zinc-800 text-gray-400 rounded-full">
                      +{(template.targetDoctorNames?.length || 0) + (template.targetClinicNames?.length || 0) - 4} more
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

