import { useState, useRef } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Plus, Video, Edit2, Trash2, Play, Upload, X, Film, FileVideo, Link2 } from 'lucide-react';

interface VideoContent {
  id: number;
  title: string;
  description: string;
  category: 'tutorial' | 'testimonial' | 'patient-feedback';
  videoUrl: string;
  videoFile?: File | null;
  thumbnailUrl: string;
  thumbnailFile?: File | null;
  duration: string;
  uploadDate: string;
  views: number;
  isPublished: boolean;
}

export default function AdminVideoUploader() {
  // Load videos from localStorage on mount
  const [videos, setVideos] = useState<VideoContent[]>(() => {
    const saved = localStorage.getItem('healqr_videos');
    if (saved) {
      return JSON.parse(saved);
    }
    return [];
  });

  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [previewVideo, setPreviewVideo] = useState<VideoContent | null>(null);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'tutorial' as VideoContent['category'],
    videoUrl: '',
    thumbnailUrl: '',
    duration: '',
    videoFile: null as File | null,
    thumbnailFile: null as File | null,
    uploadType: 'file' as 'file' | 'url'
  });

  const videoInputRef = useRef<HTMLInputElement>(null);
  const thumbnailInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleAdd = () => {
    if (!formData.title) return;
    if (formData.uploadType === 'file' && !formData.videoFile) return;
    if (formData.uploadType === 'url' && !formData.videoUrl) return;

    // In real implementation, videoFile and thumbnailFile would be uploaded to storage
    // and URLs would be returned. For now, we'll create object URLs for preview
    const videoUrl = formData.uploadType === 'file' && formData.videoFile
      ? URL.createObjectURL(formData.videoFile)
      : formData.videoUrl;

    const thumbnailUrl = formData.thumbnailFile
      ? URL.createObjectURL(formData.thumbnailFile)
      : formData.thumbnailUrl || 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=400';

    const newVideo: VideoContent = {
      id: Date.now(),
      title: formData.title,
      description: formData.description,
      category: formData.category,
      videoUrl,
      videoFile: formData.videoFile,
      thumbnailUrl,
      thumbnailFile: formData.thumbnailFile,
      duration: formData.duration,
      uploadDate: new Date().toISOString().split('T')[0],
      views: 0,
      isPublished: false
    };

    const updatedVideos = [newVideo, ...videos];
    setVideos(updatedVideos);
    localStorage.setItem('healqr_videos', JSON.stringify(updatedVideos));
    resetForm();
    setIsAdding(false);
  };

  const handleEdit = (id: number) => {
    const video = videos.find(v => v.id === id);
    if (video) {
      setFormData({
        title: video.title,
        description: video.description,
        category: video.category,
        videoUrl: video.videoUrl,
        thumbnailUrl: video.thumbnailUrl,
        duration: video.duration,
        videoFile: video.videoFile || null,
        thumbnailFile: video.thumbnailFile || null,
        uploadType: video.videoFile ? 'file' : 'url'
      });
      setEditingId(id);
    }
  };

  const handleUpdate = () => {
    const updatedVideos = videos.map(v => 
      v.id === editingId 
        ? { ...v, ...formData }
        : v
    );
    setVideos(updatedVideos);
    localStorage.setItem('healqr_videos', JSON.stringify(updatedVideos));
    resetForm();
    setEditingId(null);
  };

  const handleDelete = (id: number) => {
    if (confirm('Are you sure you want to delete this video?')) {
      const updatedVideos = videos.filter(v => v.id !== id);
      setVideos(updatedVideos);
      localStorage.setItem('healqr_videos', JSON.stringify(updatedVideos));
    }
  };

  const handleTogglePublish = (id: number) => {
    const updatedVideos = videos.map(v => 
      v.id === id ? { ...v, isPublished: !v.isPublished } : v
    );
    setVideos(updatedVideos);
    localStorage.setItem('healqr_videos', JSON.stringify(updatedVideos));
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      category: 'tutorial',
      videoUrl: '',
      thumbnailUrl: '',
      duration: '',
      videoFile: null,
      thumbnailFile: null,
      uploadType: 'file'
    });
  };

  const handleVideoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFormData({ ...formData, videoFile: file });
    }
  };

  const handleThumbnailFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFormData({ ...formData, thumbnailFile: file });
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('video/')) {
      setFormData({ ...formData, videoFile: file });
    }
  };

  return (
    <div className="flex-1 overflow-y-auto overflow-x-hidden bg-black">
      <div className="p-3 md:p-8 w-full max-w-full">
        {/* Header */}
        <div className="mb-4 md:mb-8">
          <h1 className="text-xl md:text-3xl mb-1 md:mb-2 text-white">Video Uploader</h1>
          <p className="text-xs md:text-base text-gray-400">Upload videos for doctors</p>
        </div>

        {/* Stats */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '16px', width: '100%' }} className="md:grid md:grid-cols-3 md:gap-3 md:mb-8">
          <div style={{ width: '100%' }} className="bg-zinc-900 border border-zinc-800 rounded-lg p-3">
            <p className="text-xs text-gray-400 mb-1">Total Videos</p>
            <p className="text-2xl text-white">{videos.length}</p>
          </div>
          <div style={{ width: '100%' }} className="bg-zinc-900 border border-emerald-700/30 rounded-lg p-3">
            <p className="text-xs text-emerald-300 mb-1">Published</p>
            <p className="text-2xl text-emerald-500">{videos.filter(v => v.isPublished).length}</p>
          </div>
          <div style={{ width: '100%' }} className="bg-zinc-900 border border-blue-700/30 rounded-lg p-3">
            <p className="text-xs text-blue-300 mb-1">Total Views</p>
            <p className="text-2xl text-blue-500">{videos.reduce((sum, v) => sum + v.views, 0)}</p>
          </div>
        </div>

        {/* Upload Button */}
        <div className="mb-4 w-full">
          <Button
            onClick={() => setIsAdding(true)}
            className="bg-emerald-500 hover:bg-emerald-600 w-full text-sm md:text-base h-10 md:h-12"
          >
            <Plus className="w-4 h-4 mr-2" />
            Upload New Video
          </Button>
        </div>

        {/* Add/Edit Form */}
        {(isAdding || editingId) && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 md:p-6 mb-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg">{editingId ? 'Edit Video' : 'Upload New Video'}</h3>
              <button
                onClick={() => {
                  setIsAdding(false);
                  setEditingId(null);
                  resetForm();
                }}
                className="text-gray-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              {/* Upload Type Selector */}
              <div className="flex gap-2 p-1 bg-zinc-800 rounded-lg">
                <button
                  onClick={() => setFormData({ ...formData, uploadType: 'file' })}
                  className={`flex-1 px-4 py-3 rounded-md transition-all ${
                    formData.uploadType === 'file'
                      ? 'bg-emerald-500 text-white'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  <FileVideo className="w-5 h-5 mx-auto mb-1" />
                  <span className="text-sm">Upload File</span>
                </button>
                <button
                  onClick={() => setFormData({ ...formData, uploadType: 'url' })}
                  className={`flex-1 px-4 py-3 rounded-md transition-all ${
                    formData.uploadType === 'url'
                      ? 'bg-emerald-500 text-white'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  <Link2 className="w-5 h-5 mx-auto mb-1" />
                  <span className="text-sm">YouTube URL</span>
                </button>
              </div>

              {/* Video Upload/URL Input */}
              {formData.uploadType === 'file' ? (
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Video File *</label>
                  <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() => videoInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
                      isDragging
                        ? 'border-emerald-500 bg-emerald-500/10'
                        : formData.videoFile
                        ? 'border-emerald-500 bg-emerald-500/5'
                        : 'border-zinc-700 hover:border-emerald-500/50'
                    }`}
                  >
                    <input
                      ref={videoInputRef}
                      type="file"
                      accept="video/*"
                      onChange={handleVideoFileChange}
                      className="hidden"
                    />
                    {formData.videoFile ? (
                      <div>
                        <Film className="w-12 h-12 mx-auto mb-3 text-emerald-500" />
                        <p className="text-white mb-1">{formData.videoFile.name}</p>
                        <p className="text-xs text-gray-400">
                          {(formData.videoFile.size / (1024 * 1024)).toFixed(2)} MB
                        </p>
                        <p className="text-xs text-emerald-500 mt-2">Click to change file</p>
                      </div>
                    ) : (
                      <div>
                        <Upload className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                        <p className="text-white mb-1">Drag & drop video file here</p>
                        <p className="text-sm text-gray-400">or click to browse</p>
                        <p className="text-xs text-gray-500 mt-2">
                          Supports: MP4, MOV, AVI, WebM (Max 500MB)
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div>
                  <label className="block text-sm text-gray-400 mb-2">YouTube Embed URL *</label>
                  <Input
                    placeholder="https://www.youtube.com/embed/..."
                    value={formData.videoUrl}
                    onChange={(e) => setFormData({ ...formData, videoUrl: e.target.value })}
                    className="bg-zinc-800 border-zinc-700 h-12"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Use YouTube embed format (not regular watch URL)
                  </p>
                </div>
              )}

              {/* Title and Category */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Video Title *</label>
                  <Input
                    placeholder="e.g., How to Book Appointment"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="bg-zinc-800 border-zinc-700 h-12"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Category *</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value as VideoContent['category'] })}
                    className="w-full h-12 px-4 bg-zinc-800 border border-zinc-700 rounded-lg text-white"
                  >
                    <option value="tutorial">📚 Tutorials</option>
                    <option value="testimonial">⭐ Testimonials</option>
                    <option value="patient-feedback">💬 Patient Feedback</option>
                  </select>
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm text-gray-400 mb-2">Description</label>
                <Textarea
                  placeholder="Brief description of the video content..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className="bg-zinc-800 border-zinc-700"
                />
              </div>

              {/* Duration and Thumbnail */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Duration</label>
                  <Input
                    placeholder="e.g., 5:30"
                    value={formData.duration}
                    onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                    className="bg-zinc-800 border-zinc-700 h-12"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Thumbnail</label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Image URL (optional)"
                      value={formData.thumbnailUrl}
                      onChange={(e) => setFormData({ ...formData, thumbnailUrl: e.target.value })}
                      className="bg-zinc-800 border-zinc-700 h-12"
                    />
                    <Button
                      type="button"
                      onClick={() => thumbnailInputRef.current?.click()}
                      variant="outline"
                      className="border-zinc-700 h-12 px-4"
                    >
                      <Upload className="w-4 h-4" />
                    </Button>
                    <input
                      ref={thumbnailInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleThumbnailFileChange}
                      className="hidden"
                    />
                  </div>
                  {formData.thumbnailFile && (
                    <p className="text-xs text-emerald-500 mt-1">
                      ✓ {formData.thumbnailFile.name}
                    </p>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 pt-4">
                <Button
                  onClick={editingId ? handleUpdate : handleAdd}
                  className="flex-1 bg-emerald-500 hover:bg-emerald-600 h-12"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  {editingId ? 'Update' : 'Upload'} Video
                </Button>
                <Button
                  onClick={() => {
                    setIsAdding(false);
                    setEditingId(null);
                    resetForm();
                  }}
                  variant="outline"
                  className="flex-1 sm:flex-none border-zinc-700 h-12"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Category Filter Tabs */}
        {!isAdding && !editingId && (
          <div className="mb-6">
            <div className="flex gap-2 overflow-x-auto pb-2">
              <button className="px-4 py-2 bg-emerald-500 text-white rounded-lg whitespace-nowrap">
                All Videos ({videos.length})
              </button>
              <button className="px-4 py-2 bg-zinc-800 text-gray-400 hover:text-white rounded-lg whitespace-nowrap">
                📚 Tutorials ({videos.filter(v => v.category === 'tutorial').length})
              </button>
              <button className="px-4 py-2 bg-zinc-800 text-gray-400 hover:text-white rounded-lg whitespace-nowrap">
                ⭐ Testimonials ({videos.filter(v => v.category === 'testimonial').length})
              </button>
              <button className="px-4 py-2 bg-zinc-800 text-gray-400 hover:text-white rounded-lg whitespace-nowrap">
                💬 Patient Feedback ({videos.filter(v => v.category === 'patient-feedback').length})
              </button>
            </div>
          </div>
        )}

        {/* Videos Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          {videos.map(video => (
            <div key={video.id} className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden hover:border-emerald-500/30 transition-colors">
              <div className="relative">
                <img 
                  src={video.thumbnailUrl} 
                  alt={video.title}
                  className="w-full h-48 object-cover"
                />
                {video.duration && (
                  <div className="absolute bottom-2 right-2 bg-black/80 px-2 py-1 rounded text-xs text-white">
                    {video.duration}
                  </div>
                )}
                <div className="absolute top-2 left-2">
                  <span className="px-2 py-1 bg-black/80 rounded text-xs text-white">
                    {video.category === 'tutorial' && '📚 Tutorial'}
                    {video.category === 'testimonial' && '⭐ Testimonial'}
                    {video.category === 'patient-feedback' && '💬 Feedback'}
                  </span>
                </div>
                <button
                  onClick={() => setPreviewVideo(video)}
                  className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 hover:opacity-100 active:opacity-100 transition-opacity"
                >
                  <Play className="w-16 h-16 text-white" />
                </button>
              </div>
              
              <div className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="text-white line-clamp-2 flex-1">{video.title}</h3>
                  <span className={`px-2 py-1 rounded-full text-xs ml-2 flex-shrink-0 ${
                    video.isPublished 
                      ? 'bg-emerald-500/10 text-emerald-500' 
                      : 'bg-gray-500/10 text-gray-500'
                  }`}>
                    {video.isPublished ? 'Published' : 'Draft'}
                  </span>
                </div>
                
                <p className="text-sm text-gray-400 line-clamp-2 mb-3">{video.description}</p>
                
                <div className="flex items-center justify-between text-xs text-gray-500 mb-4">
                  <span>{video.views} views</span>
                  <span>{video.uploadDate}</span>
                </div>

                <div className="flex gap-2">
                  <Button
                    onClick={() => handleEdit(video.id)}
                    variant="outline"
                    size="sm"
                    className="flex-1 border-zinc-700 h-10"
                  >
                    <Edit2 className="w-3 h-3 md:mr-1" />
                    <span className="hidden md:inline">Edit</span>
                  </Button>
                  <Button
                    onClick={() => handleTogglePublish(video.id)}
                    size="sm"
                    className={`flex-1 h-10 ${
                      video.isPublished 
                        ? 'bg-yellow-500 hover:bg-yellow-600' 
                        : 'bg-emerald-500 hover:bg-emerald-600'
                    }`}
                  >
                    {video.isPublished ? 'Unpublish' : 'Publish'}
                  </Button>
                  <Button
                    onClick={() => handleDelete(video.id)}
                    variant="outline"
                    size="sm"
                    className="border-red-700 text-red-500 hover:bg-red-900/20 h-10 px-3"
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Empty State */}
        {videos.length === 0 && (
          <div className="text-center py-16">
            <Video className="w-16 h-16 mx-auto text-gray-600 mb-4" />
            <h3 className="text-xl text-gray-400 mb-2">No videos uploaded yet</h3>
            <p className="text-gray-500">
              Click the "Upload New Video" button above to add your first tutorial, testimonial, or patient feedback video
            </p>
          </div>
        )}

        {/* Preview Modal */}
        {previewVideo && (
          <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4">
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-4xl w-full p-8">
              <h2 className="text-2xl text-emerald-500 mb-6">{previewVideo.title}</h2>
              
              <div className="aspect-video bg-black rounded-lg overflow-hidden mb-6">
                <iframe
                  src={previewVideo.videoUrl}
                  className="w-full h-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>

              <p className="text-gray-400 mb-4">{previewVideo.description}</p>
              
              <div className="flex items-center gap-4 text-sm text-gray-500 mb-6">
                <span>Category: {previewVideo.category}</span>
                <span>•</span>
                <span>{previewVideo.views} views</span>
                <span>•</span>
                <span>Uploaded: {previewVideo.uploadDate}</span>
              </div>

              <Button
                onClick={() => setPreviewVideo(null)}
                className="w-full bg-emerald-500 hover:bg-emerald-600"
              >
                Close Preview
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

