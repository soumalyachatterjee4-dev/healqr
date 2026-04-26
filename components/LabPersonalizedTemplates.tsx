import { useEffect, useRef, useState } from 'react';
import { db, storage, auth } from '../lib/firebase/config';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { toast } from 'sonner';
import {
  Sparkles, Heart, Megaphone, Upload, Trash2, Eye, X, Loader2, Info, Calendar,
  MapPin, Clock, Phone, Plus, Save, ImageIcon, ToggleLeft, ToggleRight, FlaskConical,
} from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';

interface LabPersonalizedTemplatesProps {
  labId: string;
}

type TabKey = 'health-tip' | 'festival-wish' | 'camp';

interface Template {
  id: string;
  name: string;
  imageUrl: string;
  category: 'health-tip' | 'festival-wish';
  isActive: boolean;
  uploadDate: string;
  fileSize?: number;
}

interface Camp {
  id: string;
  title: string;
  description?: string;
  bannerUrl?: string;
  date: string;
  startTime?: string;
  endTime?: string;
  location: string;
  pincode?: string;
  services?: string[];
  contactPhone?: string;
  isActive: boolean;
  createdAt: string;
}

const MAX_TEMPLATE_BYTES = 5 * 1024 * 1024;

export default function LabPersonalizedTemplates({ labId }: LabPersonalizedTemplatesProps) {
  const [tab, setTab] = useState<TabKey>('health-tip');
  const [templates, setTemplates] = useState<Template[]>([]);
  const [camps, setCamps] = useState<Camp[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [savingCamp, setSavingCamp] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [editingCampId, setEditingCampId] = useState<string | null>(null);
  const [campTitle, setCampTitle] = useState('');
  const [campDesc, setCampDesc] = useState('');
  const [campDate, setCampDate] = useState('');
  const [campStart, setCampStart] = useState('');
  const [campEnd, setCampEnd] = useState('');
  const [campLocation, setCampLocation] = useState('');
  const [campPincode, setCampPincode] = useState('');
  const [campServices, setCampServices] = useState('');
  const [campContact, setCampContact] = useState('');
  const [campBannerFile, setCampBannerFile] = useState<File | null>(null);
  const [campBannerPreview, setCampBannerPreview] = useState<string>('');
  const [existingBannerUrl, setExistingBannerUrl] = useState<string>('');

  useEffect(() => {
    if (!labId) return;
    (async () => {
      try {
        const snap = await getDoc(doc(db, 'labs', labId));
        if (snap.exists()) {
          const data: any = snap.data();
          setTemplates(Array.isArray(data.personalizedTemplates) ? data.personalizedTemplates : []);
          setCamps(Array.isArray(data.healthCamps) ? data.healthCamps : []);
        }
      } finally { setLoading(false); }
    })();
  }, [labId]);

  const persistTemplates = async (next: Template[]) => {
    setTemplates(next);
    await updateDoc(doc(db, 'labs', labId), {
      personalizedTemplates: next, updatedAt: new Date().toISOString(),
    });
    window.dispatchEvent(new CustomEvent('lab-template-refresh'));
  };

  const persistCamps = async (next: Camp[]) => {
    setCamps(next);
    await updateDoc(doc(db, 'labs', labId), {
      healthCamps: next, updatedAt: new Date().toISOString(),
    });
    window.dispatchEvent(new CustomEvent('lab-template-refresh'));
  };

  const handleTemplateUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { toast.error('Please upload an image'); return; }
    if (file.size > MAX_TEMPLATE_BYTES) { toast.error('Image must be under 5 MB'); return; }
    if (!auth?.currentUser || auth.currentUser.uid !== labId) {
      toast.error('Session expired — please re-login'); return;
    }
    if (tab === 'camp') return;

    const cat = tab as 'health-tip' | 'festival-wish';
    if (templates.filter(t => t.category === cat).length >= 1) {
      toast.error('Maximum 1 image allowed per category');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setUploading(true);
    try {
      const ts = Date.now();
      const path = `lab-templates/${labId}/${cat}/${ts}_${file.name}`;
      const sref = ref(storage, path);
      await uploadBytes(sref, file);
      const url = await getDownloadURL(sref);
      const tpl: Template = {
        id: `${cat}-${ts}`, name: file.name, imageUrl: url, category: cat,
        isActive: true, uploadDate: new Date().toISOString(), fileSize: file.size,
      };
      await persistTemplates([...templates, tpl]);
      toast.success(`${cat === 'health-tip' ? 'Health Tip' : 'Festival Wish'} uploaded`);
    } catch (err: any) {
      console.error(err);
      toast.error(err?.code === 'storage/unauthorized' ? 'Permission denied — re-login' : `Upload failed: ${err?.message || ''}`);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const deleteTemplate = async (tpl: Template) => {
    if (!confirm(`Delete this ${tpl.category === 'health-tip' ? 'Health Tip' : 'Festival Wish'}?`)) return;
    try {
      try { await deleteObject(ref(storage, tpl.imageUrl)); } catch {}
      await persistTemplates(templates.filter(t => t.id !== tpl.id));
      toast.success('Deleted');
    } catch (err: any) { toast.error(err?.message || 'Delete failed'); }
  };

  const toggleTemplate = async (tpl: Template) => {
    await persistTemplates(templates.map(t => t.id === tpl.id ? { ...t, isActive: !t.isActive } : t));
  };

  const resetCampForm = () => {
    setEditingCampId(null);
    setCampTitle(''); setCampDesc(''); setCampDate(''); setCampStart(''); setCampEnd('');
    setCampLocation(''); setCampPincode(''); setCampServices(''); setCampContact('');
    setCampBannerFile(null); setCampBannerPreview(''); setExistingBannerUrl('');
  };

  const openCampForEdit = (c: Camp) => {
    setEditingCampId(c.id);
    setCampTitle(c.title); setCampDesc(c.description || '');
    setCampDate(c.date); setCampStart(c.startTime || ''); setCampEnd(c.endTime || '');
    setCampLocation(c.location); setCampPincode(c.pincode || '');
    setCampServices((c.services || []).join(', '));
    setCampContact(c.contactPhone || '');
    setExistingBannerUrl(c.bannerUrl || '');
    setCampBannerFile(null); setCampBannerPreview('');
  };

  const onCampBannerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!f.type.startsWith('image/')) { toast.error('Image only'); return; }
    if (f.size > MAX_TEMPLATE_BYTES) { toast.error('Banner must be under 5 MB'); return; }
    setCampBannerFile(f);
    const fr = new FileReader();
    fr.onload = () => setCampBannerPreview(String(fr.result || ''));
    fr.readAsDataURL(f);
  };

  const saveCamp = async () => {
    if (!campTitle.trim() || !campDate || !campLocation.trim()) {
      toast.error('Title, date and location are required');
      return;
    }
    setSavingCamp(true);
    try {
      let bannerUrl = existingBannerUrl;
      if (campBannerFile) {
        const path = `lab-templates/${labId}/camp/${Date.now()}_${campBannerFile.name}`;
        const sref = ref(storage, path);
        await uploadBytes(sref, campBannerFile);
        bannerUrl = await getDownloadURL(sref);
      }
      const payload: Camp = {
        id: editingCampId || `camp-${Date.now()}`,
        title: campTitle.trim(),
        description: campDesc.trim() || undefined,
        bannerUrl: bannerUrl || undefined,
        date: campDate,
        startTime: campStart || undefined,
        endTime: campEnd || undefined,
        location: campLocation.trim(),
        pincode: campPincode.trim() || undefined,
        services: campServices.split(',').map(s => s.trim()).filter(Boolean),
        contactPhone: campContact.trim() || undefined,
        isActive: true,
        createdAt: editingCampId ? (camps.find(c => c.id === editingCampId)?.createdAt || new Date().toISOString()) : new Date().toISOString(),
      };
      const next = editingCampId
        ? camps.map(c => c.id === editingCampId ? payload : c)
        : [payload, ...camps];
      await persistCamps(next);
      toast.success(editingCampId ? 'Camp updated' : 'Camp announced!');
      resetCampForm();
    } catch (err: any) { toast.error(err?.message || 'Save failed'); }
    finally { setSavingCamp(false); }
  };

  const deleteCamp = async (c: Camp) => {
    if (!confirm(`Delete camp "${c.title}"?`)) return;
    try {
      if (c.bannerUrl) { try { await deleteObject(ref(storage, c.bannerUrl)); } catch {} }
      await persistCamps(camps.filter(x => x.id !== c.id));
      toast.success('Camp deleted');
      if (editingCampId === c.id) resetCampForm();
    } catch (err: any) { toast.error(err?.message || 'Delete failed'); }
  };

  const toggleCamp = async (c: Camp) => {
    await persistCamps(camps.map(x => x.id === c.id ? { ...x, isActive: !x.isActive } : x));
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64 text-gray-400"><Loader2 className="w-6 h-6 animate-spin mr-2" /> Loading templates…</div>;
  }

  const currentTpls = tab !== 'camp' ? templates.filter(t => t.category === tab) : [];
  const upcomingCamps = camps.filter(c => c.date >= new Date().toISOString().slice(0, 10)).sort((a, b) => a.date.localeCompare(b.date));
  const pastCamps = camps.filter(c => c.date < new Date().toISOString().slice(0, 10)).sort((a, b) => b.date.localeCompare(a.date));

  const tipExamples = [
    'Why fasting 8h matters before lipid profile',
    'Hydration tips before blood collection',
    'Why the first urine sample of the day matters',
  ];

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-orange-600/20 to-amber-600/20 border border-orange-500/30 rounded-xl p-5 flex items-start gap-4">
        <FlaskConical className="w-10 h-10 text-orange-400 flex-shrink-0" />
        <div>
          <h3 className="text-white font-semibold">Personalized Templates</h3>
          <p className="text-gray-400 text-sm">
            Add a health/test-prep tip, festival wish, or announce a free-screening camp. Visible on your lab's mini-website.
          </p>
        </div>
      </div>

      <div className="bg-blue-500/5 border border-blue-500/20 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
          <div className="text-blue-200/90 text-xs leading-relaxed">
            <strong>Tip:</strong> Use Health Tip for test-prep posters (e.g., {tipExamples[0]}). Past-dated camps auto-archive.
          </div>
        </div>
      </div>

      <div className="flex gap-1 border-b border-zinc-800 overflow-x-auto">
        <TabBtn active={tab === 'health-tip'} onClick={() => setTab('health-tip')} icon={Sparkles} color="emerald" count={templates.filter(t => t.category === 'health-tip').length}>
          Health / Test-Prep Tip
        </TabBtn>
        <TabBtn active={tab === 'festival-wish'} onClick={() => setTab('festival-wish')} icon={Heart} color="pink" count={templates.filter(t => t.category === 'festival-wish').length}>
          Festival Wish
        </TabBtn>
        <TabBtn active={tab === 'camp'} onClick={() => setTab('camp')} icon={Megaphone} color="orange" count={camps.length}>
          Screening Camp
        </TabBtn>
      </div>

      {tab !== 'camp' && (
        <div className="space-y-4">
          {currentTpls.length === 0 ? (
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="w-full bg-zinc-900 border-2 border-dashed border-zinc-700 hover:border-emerald-500/50 rounded-xl p-10 transition-colors flex flex-col items-center justify-center gap-3"
            >
              {uploading ? (
                <><Loader2 className="w-10 h-10 text-emerald-400 animate-spin" /><p className="text-gray-300 text-sm">Uploading…</p></>
              ) : (
                <>
                  <Upload className="w-10 h-10 text-gray-400" />
                  <div className="text-center">
                    <p className="text-white font-medium">Click to upload {tab === 'health-tip' ? 'a health / test-prep tip' : 'a festival wish'}</p>
                    <p className="text-gray-500 text-xs mt-1">PNG / JPG up to 5MB · 1 image max</p>
                  </div>
                </>
              )}
            </button>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {currentTpls.map(t => (
                <div key={t.id} className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
                  <div className="aspect-[4/3] bg-zinc-800 relative">
                    <img src={t.imageUrl} alt={t.name} className="w-full h-full object-cover" />
                    {!t.isActive && <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-white text-sm font-medium">HIDDEN</div>}
                  </div>
                  <div className="p-3 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-white text-sm truncate">{t.name}</p>
                      <p className="text-gray-500 text-xs">{new Date(t.uploadDate).toLocaleDateString()}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button onClick={() => setPreview(t.imageUrl)} className="text-blue-400 hover:bg-blue-500/10 p-1.5 rounded"><Eye className="w-4 h-4" /></button>
                      <button onClick={() => toggleTemplate(t)} className={`p-1.5 rounded ${t.isActive ? 'text-emerald-400 hover:bg-emerald-500/10' : 'text-gray-500 hover:bg-zinc-800'}`}>
                        {t.isActive ? <ToggleRight className="w-5 h-5" /> : <ToggleLeft className="w-5 h-5" />}
                      </button>
                      <button onClick={() => deleteTemplate(t)} className="text-red-400 hover:bg-red-500/10 p-1.5 rounded"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleTemplateUpload} />
        </div>
      )}

      {tab === 'camp' && (
        <div className="space-y-6">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-white font-semibold flex items-center gap-2">
                <Megaphone className="w-4 h-4 text-orange-400" />
                {editingCampId ? 'Edit Camp' : 'Announce a Screening Camp'}
              </h4>
              {editingCampId && <Button size="sm" variant="ghost" onClick={resetCampForm} className="text-gray-400">Cancel edit</Button>}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Input value={campTitle} onChange={e => setCampTitle(e.target.value)} placeholder="Title (e.g., Free Diabetes & Lipid Screening Camp)" className="bg-black border-zinc-800 text-white md:col-span-2" />
              <textarea value={campDesc} onChange={e => setCampDesc(e.target.value)} placeholder="Short description (optional)"
                className="bg-black border border-zinc-800 rounded-md p-2 text-white text-sm md:col-span-2 resize-y min-h-[80px]" />
              <div>
                <label className="text-gray-500 text-xs block mb-1 flex items-center gap-1"><Calendar className="w-3 h-3" /> Date</label>
                <Input type="date" value={campDate} onChange={e => setCampDate(e.target.value)} className="bg-black border-zinc-800 text-white" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-gray-500 text-xs block mb-1 flex items-center gap-1"><Clock className="w-3 h-3" /> Start</label>
                  <Input type="time" value={campStart} onChange={e => setCampStart(e.target.value)} className="bg-black border-zinc-800 text-white" />
                </div>
                <div>
                  <label className="text-gray-500 text-xs block mb-1">End</label>
                  <Input type="time" value={campEnd} onChange={e => setCampEnd(e.target.value)} className="bg-black border-zinc-800 text-white" />
                </div>
              </div>
              <div className="md:col-span-2">
                <label className="text-gray-500 text-xs block mb-1 flex items-center gap-1"><MapPin className="w-3 h-3" /> Location</label>
                <Input value={campLocation} onChange={e => setCampLocation(e.target.value)} placeholder="Address / venue" className="bg-black border-zinc-800 text-white" />
              </div>
              <Input value={campPincode} onChange={e => setCampPincode(e.target.value)} placeholder="Pincode" className="bg-black border-zinc-800 text-white" />
              <Input value={campContact} onChange={e => setCampContact(e.target.value)} placeholder="Contact phone" className="bg-black border-zinc-800 text-white" />
              <Input value={campServices} onChange={e => setCampServices(e.target.value)} placeholder="Free / discounted tests (comma-separated, e.g., HbA1c, Lipid Profile, BP)" className="bg-black border-zinc-800 text-white md:col-span-2" />
            </div>

            <div>
              <label className="text-gray-500 text-xs block mb-2 flex items-center gap-1"><ImageIcon className="w-3 h-3" /> Banner image (optional)</label>
              <div className="flex items-start gap-3">
                {(campBannerPreview || existingBannerUrl) && (
                  <img src={campBannerPreview || existingBannerUrl} alt="" className="w-32 h-20 object-cover rounded-md border border-zinc-700" />
                )}
                <label className="cursor-pointer bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-md px-3 py-2 text-sm text-white inline-flex items-center gap-2">
                  <Upload className="w-4 h-4" /> {campBannerPreview || existingBannerUrl ? 'Replace' : 'Upload'}
                  <input type="file" accept="image/*" className="hidden" onChange={onCampBannerChange} />
                </label>
                {(campBannerPreview || existingBannerUrl) && (
                  <Button size="sm" variant="ghost" onClick={() => { setCampBannerFile(null); setCampBannerPreview(''); setExistingBannerUrl(''); }} className="text-red-400">Remove</Button>
                )}
              </div>
            </div>

            <Button onClick={saveCamp} disabled={savingCamp} className="bg-orange-600 hover:bg-orange-700">
              {savingCamp ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : (editingCampId ? <Save className="w-4 h-4 mr-2" /> : <Plus className="w-4 h-4 mr-2" />)}
              {editingCampId ? 'Update Camp' : 'Announce Camp'}
            </Button>
          </div>

          <CampList title="Upcoming Camps" camps={upcomingCamps} onEdit={openCampForEdit} onDelete={deleteCamp} onToggle={toggleCamp} onPreview={(u: string) => setPreview(u)} emptyMsg="No upcoming camps. Announce one above." />
          {pastCamps.length > 0 && (
            <CampList title="Past Camps (archive)" camps={pastCamps} onEdit={openCampForEdit} onDelete={deleteCamp} onToggle={toggleCamp} onPreview={(u: string) => setPreview(u)} emptyMsg="" muted />
          )}
        </div>
      )}

      {preview && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={() => setPreview(null)}>
          <button onClick={() => setPreview(null)} className="absolute top-4 right-4 bg-zinc-900 rounded-full p-2 text-white"><X className="w-5 h-5" /></button>
          <img src={preview} alt="" className="max-w-full max-h-full object-contain rounded-lg" />
        </div>
      )}
    </div>
  );
}

function TabBtn({ active, onClick, icon: Icon, color, count, children }: any) {
  const colorMap: Record<string, string> = {
    emerald: 'border-emerald-500 text-emerald-400',
    pink: 'border-pink-500 text-pink-400',
    orange: 'border-orange-500 text-orange-400',
  };
  return (
    <button onClick={onClick} className={`flex items-center gap-2 px-4 md:px-5 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${active ? colorMap[color] : 'border-transparent text-gray-400 hover:text-white'}`}>
      <Icon className="w-4 h-4" />
      {children}
      {count > 0 && <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-${color}-500/20`}>{count}</span>}
    </button>
  );
}

function CampList({ title, camps, onEdit, onDelete, onToggle, onPreview, emptyMsg, muted }: any) {
  return (
    <div>
      <h4 className={`font-semibold text-sm mb-2 ${muted ? 'text-gray-500' : 'text-white'}`}>{title}</h4>
      {camps.length === 0 ? (
        emptyMsg ? <p className="text-gray-500 text-sm">{emptyMsg}</p> : null
      ) : (
        <div className="space-y-2">
          {camps.map((c: Camp) => (
            <div key={c.id} className={`bg-zinc-900 border rounded-xl p-4 ${c.isActive ? 'border-zinc-800' : 'border-zinc-800/50 opacity-60'}`}>
              <div className="flex gap-3">
                {c.bannerUrl && (
                  <button onClick={() => onPreview(c.bannerUrl)} className="flex-shrink-0">
                    <img src={c.bannerUrl} alt="" className="w-20 h-20 object-cover rounded-md" />
                  </button>
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-white font-medium">{c.title}</p>
                  <p className="text-gray-500 text-xs flex items-center gap-1 mt-0.5"><Calendar className="w-3 h-3" /> {c.date} {c.startTime && `· ${c.startTime}${c.endTime ? `–${c.endTime}` : ''}`}</p>
                  <p className="text-gray-500 text-xs flex items-center gap-1 mt-0.5"><MapPin className="w-3 h-3" /> {c.location}{c.pincode && ` · ${c.pincode}`}</p>
                  {c.contactPhone && <p className="text-gray-500 text-xs flex items-center gap-1 mt-0.5"><Phone className="w-3 h-3" /> {c.contactPhone}</p>}
                  {c.services && c.services.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {c.services.map((s, i) => <span key={i} className="text-[10px] bg-orange-500/15 text-orange-300 px-2 py-0.5 rounded-full">{s}</span>)}
                    </div>
                  )}
                  {c.description && <p className="text-gray-400 text-xs mt-2 line-clamp-2">{c.description}</p>}
                </div>
                <div className="flex flex-col gap-1">
                  <button onClick={() => onToggle(c)} className={`p-1.5 rounded ${c.isActive ? 'text-emerald-400' : 'text-gray-500'} hover:bg-zinc-800`}>
                    {c.isActive ? <ToggleRight className="w-5 h-5" /> : <ToggleLeft className="w-5 h-5" />}
                  </button>
                  <button onClick={() => onEdit(c)} className="text-blue-400 hover:bg-blue-500/10 p-1.5 rounded"><Eye className="w-4 h-4" /></button>
                  <button onClick={() => onDelete(c)} className="text-red-400 hover:bg-red-500/10 p-1.5 rounded"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
