import { useState, useEffect } from 'react';
import { Heart, Plus, Upload, Trash2, Eye, Image, Clock, CheckCircle2, AlertCircle, Loader2, X } from 'lucide-react';
import { db, storage, auth } from '../lib/firebase/config';
import { collection, getDocs, addDoc, deleteDoc, doc, serverTimestamp, query, where, orderBy } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';

interface HealthTip {
  id: string;
  title: string;
  content: string;
  imageUrl: string;
  storagePath: string;
  status: 'pending' | 'approved' | 'rejected';
  category: string;
  createdAt: any;
}

const CATEGORIES = [
  'General Health', 'Nutrition', 'Exercise', 'Mental Health',
  'Preventive Care', 'Seasonal Health', 'Women\'s Health',
  'Children\'s Health', 'Dental Care', 'Eye Care',
];

export default function AdvertiserHealthTips() {
  const [tips, setTips] = useState<HealthTip[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState('General Health');
  const [viewingImage, setViewingImage] = useState<string | null>(null);

  const advertiserId = auth?.currentUser?.uid || 'demo-advertiser';

  useEffect(() => {
    loadTips();
  }, []);

  const loadTips = async () => {
    if (!db) return;
    setLoading(true);

    try {
      const tipsRef = collection(db, 'advertiserHealthTips');
      const q = query(tipsRef, where('advertiserId', '==', advertiserId));
      const snap = await getDocs(q);

      const items: HealthTip[] = snap.docs.map(d => ({
        id: d.id,
        title: d.data().title || '',
        content: d.data().content || '',
        imageUrl: d.data().imageUrl || '',
        storagePath: d.data().storagePath || '',
        status: d.data().status || 'pending',
        category: d.data().category || 'General Health',
        createdAt: d.data().createdAt,
      }));

      items.sort((a, b) => {
        const dateA = a.createdAt?.toDate?.() || new Date(0);
        const dateB = b.createdAt?.toDate?.() || new Date(0);
        return dateB.getTime() - dateA.getTime();
      });

      setTips(items);
    } catch (error) {
      console.error('Error loading health tips:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { alert('Please select an image'); return; }
    if (file.size > 5 * 1024 * 1024) { alert('Max 5MB'); return; }

    setSelectedFile(file);
    const reader = new FileReader();
    reader.onload = () => setPreviewUrl(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleUpload = async () => {
    if (!title.trim() || !content.trim() || !db) return;
    setUploading(true);

    try {
      let imageUrl = '';
      let storagePath = '';

      if (selectedFile && storage) {
        const fileName = `${Date.now()}_${selectedFile.name}`;
        storagePath = `advertisers/${advertiserId}/health-tips/${fileName}`;
        const storageRef = ref(storage, storagePath);
        await uploadBytes(storageRef, selectedFile);
        imageUrl = await getDownloadURL(storageRef);
      }

      await addDoc(collection(db, 'advertiserHealthTips'), {
        title: title.trim(),
        content: content.trim(),
        imageUrl,
        storagePath,
        category,
        status: 'pending',
        advertiserId,
        createdAt: serverTimestamp(),
      });

      setTitle('');
      setContent('');
      setSelectedFile(null);
      setPreviewUrl(null);
      setCategory('General Health');
      setShowForm(false);
      await loadTips();
    } catch (error) {
      console.error('Error uploading health tip:', error);
      alert('Failed to upload');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (tip: HealthTip) => {
    if (!confirm('Delete this health tip?')) return;
    if (!db) return;

    try {
      if (tip.storagePath && storage) {
        try {
          await deleteObject(ref(storage, tip.storagePath));
        } catch (e) { /* ignore */ }
      }
      await deleteDoc(doc(db, 'advertiserHealthTips', tip.id));
      setTips(prev => prev.filter(t => t.id !== tip.id));
    } catch (error) {
      console.error('Error deleting tip:', error);
    }
  };

  const StatusBadge = ({ status }: { status: string }) => {
    const config: Record<string, { icon: any; label: string; color: string }> = {
      pending: { icon: Clock, label: 'Pending', color: 'bg-amber-500/20 text-amber-400' },
      approved: { icon: CheckCircle2, label: 'Approved', color: 'bg-emerald-500/20 text-emerald-400' },
      rejected: { icon: AlertCircle, label: 'Rejected', color: 'bg-red-500/20 text-red-400' },
    };
    const { icon: Icon, label, color } = config[status] || config.pending;
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs ${color}`}>
        <Icon className="w-3 h-3" /> {label}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-emerald-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Heart className="w-5 h-5 text-red-400" />
            Health Tip Templates
          </h2>
          <p className="text-sm text-gray-400 mt-1">
            Create health tip cards that appear in patient notifications. All tips require admin approval.
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors text-sm"
        >
          <Plus className="w-4 h-4" />
          Create Health Tip
        </button>
      </div>

      {/* Create Form */}
      {showForm && (
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6 space-y-4">
          <h3 className="font-semibold">New Health Tip</h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Title *</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={80}
                placeholder="e.g., Stay Hydrated This Summer"
                className="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">Content * (max 300 chars)</label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              maxLength={300}
              rows={3}
              placeholder="Write a useful health tip..."
              className="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
            />
            <p className="text-xs text-gray-500 mt-1">{content.length}/300</p>
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-2">Image (optional, max 5MB)</label>
            {previewUrl ? (
              <div className="relative inline-block">
                <img src={previewUrl} alt="Preview" className="max-h-32 rounded-lg border border-zinc-700" />
                <button
                  onClick={() => { setSelectedFile(null); setPreviewUrl(null); }}
                  className="absolute top-1 right-1 p-1 bg-red-500 rounded-full"
                >
                  <X className="w-3 h-3 text-white" />
                </button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center h-24 border-2 border-dashed border-zinc-700 rounded-xl cursor-pointer hover:border-emerald-500 transition-colors">
                <Upload className="w-6 h-6 text-gray-500 mb-1" />
                <span className="text-xs text-gray-500">Click to upload</span>
                <input type="file" accept="image/*" onChange={handleFileSelect} className="hidden" />
              </label>
            )}
          </div>

          <div className="flex justify-end gap-3">
            <button onClick={() => { setShowForm(false); setTitle(''); setContent(''); setSelectedFile(null); setPreviewUrl(null); }}
              className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-sm transition-colors">
              Cancel
            </button>
            <button
              onClick={handleUpload}
              disabled={uploading || !title.trim() || !content.trim()}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 rounded-lg text-sm transition-colors flex items-center gap-2"
            >
              {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Heart className="w-4 h-4" />}
              Submit for Review
            </button>
          </div>
        </div>
      )}

      {/* Tips Grid */}
      {tips.length === 0 ? (
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-12 text-center">
          <Heart className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg text-gray-400 mb-2">No Health Tips Yet</h3>
          <p className="text-sm text-gray-500 mb-4">Create health tip cards that show in patient notifications with your branding.</p>
          <button onClick={() => setShowForm(true)}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 rounded-lg text-sm transition-colors">
            Create First Tip
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {tips.map(tip => (
            <div key={tip.id} className="bg-zinc-900/50 border border-zinc-800 rounded-xl overflow-hidden">
              {tip.imageUrl && (
                <div
                  className="h-36 bg-zinc-800 cursor-pointer relative group"
                  onClick={() => setViewingImage(tip.imageUrl)}
                >
                  <img src={tip.imageUrl} alt={tip.title} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Eye className="w-6 h-6 text-white" />
                  </div>
                </div>
              )}
              <div className="p-4">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h4 className="font-medium text-sm line-clamp-1">{tip.title}</h4>
                  <StatusBadge status={tip.status} />
                </div>
                <p className="text-xs text-gray-400 mb-2 line-clamp-3">{tip.content}</p>
                <div className="flex items-center justify-between">
                  <span className="text-xs px-2 py-0.5 bg-zinc-800 text-gray-400 rounded-full">{tip.category}</span>
                  <button onClick={() => handleDelete(tip)} className="p-1.5 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Lightbox */}
      {viewingImage && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={() => setViewingImage(null)}>
          <img src={viewingImage} alt="Health Tip" className="max-w-full max-h-full rounded-lg" />
        </div>
      )}

      {/* Info */}
      <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4">
        <p className="text-sm text-emerald-400">
          <strong>How it works:</strong> Approved health tips appear as branded cards in patient notifications
          and health sections. Your company name appears as the sponsor.
        </p>
      </div>
    </div>
  );
}

