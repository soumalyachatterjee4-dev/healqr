import { useState, useRef } from 'react';
import { Upload, X, Image as ImageIcon, Link as LinkIcon, Save, Trash2 } from 'lucide-react';
import { collection, addDoc, serverTimestamp, query, where, getDocs, updateDoc, doc, deleteDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../lib/firebase/config';
import { toast } from 'sonner';

export default function AdminPromoManager() {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImageFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleUpload = async () => {
    if (!imageFile && !previewUrl) {
      toast.error('Please select an image');
      return;
    }

    setLoading(true);
    try {
      let imageUrl = previewUrl;

      // Upload image if new file selected
      if (imageFile) {
        const storageRef = ref(storage, `promos/${Date.now()}_${imageFile.name}`);
        await uploadBytes(storageRef, imageFile);
        imageUrl = await getDownloadURL(storageRef);
      }

      // Deactivate old promos
      const q = query(collection(db, 'advertiserPromos'), where('isActive', '==', true));
      const snapshot = await getDocs(q);
      const updates = snapshot.docs.map(doc => updateDoc(doc.ref, { isActive: false }));
      await Promise.all(updates);

      // Create new promo
      await addDoc(collection(db, 'advertiserPromos'), {
        title,
        description,
        linkUrl,
        imageUrl,
        isActive: true,
        createdAt: serverTimestamp(),
        createdBy: 'admin' // You might want to use actual user ID
      });

      toast.success('Promo updated successfully');
      
      // Reset form
      setTitle('');
      setDescription('');
      setLinkUrl('');
      setImageFile(null);
      setPreviewUrl(null);
      
    } catch (error) {
      console.error('Error uploading promo:', error);
      toast.error('Failed to upload promo');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold text-white mb-6">Advertiser Dashboard Promo</h2>
      
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 space-y-6">
        {/* Image Upload */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-zinc-400">Promo Banner Image</label>
          <div 
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center cursor-pointer transition-colors ${
              previewUrl ? 'border-emerald-500/50 bg-emerald-500/5' : 'border-zinc-700 hover:border-zinc-500 hover:bg-zinc-800/50'
            }`}
          >
            {previewUrl ? (
              <div className="relative w-full aspect-video max-h-[300px]">
                <img src={previewUrl} alt="Preview" className="w-full h-full object-contain rounded-lg" />
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    setImageFile(null);
                    setPreviewUrl(null);
                  }}
                  className="absolute top-2 right-2 p-1 bg-black/50 hover:bg-red-500 text-white rounded-full transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <>
                <div className="w-12 h-12 bg-zinc-800 rounded-full flex items-center justify-center mb-4">
                  <Upload className="w-6 h-6 text-zinc-400" />
                </div>
                <p className="text-zinc-300 font-medium">Click to upload banner</p>
                <p className="text-zinc-500 text-sm mt-1">Recommended size: 1200x400px</p>
              </>
            )}
            <input 
              ref={fileInputRef}
              type="file" 
              accept="image/*" 
              className="hidden" 
              onChange={handleFileSelect}
            />
          </div>
        </div>

        {/* Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-400">Title (Optional)</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Special Monsoon Offer!"
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-emerald-500"
            />
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-400">Link URL (Optional)</label>
            <div className="relative">
              <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <input
                type="url"
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                placeholder="https://..."
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg pl-10 pr-4 py-2 text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-zinc-400">Description (Optional)</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Brief details about the promotion..."
            rows={3}
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-emerald-500 resize-none"
          />
        </div>

        <div className="pt-4 border-t border-zinc-800 flex justify-end">
          <button
            onClick={handleUpload}
            disabled={loading || (!imageFile && !previewUrl)}
            className="flex items-center gap-2 px-6 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <Save className="w-4 h-4" />
                Publish Promo
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}