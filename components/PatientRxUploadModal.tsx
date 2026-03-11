import React, { useState } from 'react';
import { X, Upload, FileText, Check, Loader2, Plus, Trash2 } from 'lucide-react';
import { Button } from './ui/button';
import { toast } from 'sonner';
import { Language } from '../utils/translations';

interface PatientRxUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUploadSuccess: (fileUrls: string[]) => void; // Changed to array
  language?: Language;
  consultationType?: 'video' | 'chamber'; // New prop to control visibility
}

interface UploadedFile {
  file: File;
  previewUrl: string;
  id: string;
}

export const PatientRxUploadModal: React.FC<PatientRxUploadModalProps> = ({
  isOpen,
  onClose,
  onUploadSuccess,
  language = 'english',
  consultationType = 'video',
}) => {
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const MAX_FILES = 8;

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    // Check if adding these files would exceed the limit
    if (uploadedFiles.length + files.length > MAX_FILES) {
      toast.error('Maximum 8 files reached');
      return;
    }

    const newFiles: UploadedFile[] = [];

    Array.from(files).forEach((file) => {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast.error(`${file.name}: Please select an image file`);
        return;
      }

      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        toast.error(`${file.name}: File size must be less than 10MB`);
        return;
      }

      // Create preview URL
      const reader = new FileReader();
      reader.onloadend = () => {
        const uploadedFile: UploadedFile = {
          file,
          previewUrl: reader.result as string,
          id: `${Date.now()}-${Math.random()}`,
        };
        setUploadedFiles((prev) => [...prev, uploadedFile]);
      };
      reader.readAsDataURL(file);
    });

    // Reset input
    event.target.value = '';
  };

  const handleRemoveFile = (id: string) => {
    setUploadedFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const handleUpload = async () => {
    if (uploadedFiles.length === 0) {
      toast.error('Please select at least one file');
      return;
    }

    setIsUploading(true);

    try {
      // Simulate upload - in production, upload to your server/cloud storage
      await new Promise((resolve) => setTimeout(resolve, 1500));

      const fileUrls = uploadedFiles.map((f) => f.previewUrl);

      toast.success(`${uploadedFiles.length} file(s) uploaded successfully!`);
      onUploadSuccess(fileUrls);

      // Reset and close
      setTimeout(() => {
        setUploadedFiles([]);
        setIsUploading(false);
        onClose();
      }, 500);
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload. Please try again.');
      setIsUploading(false);
    }
  };

  if (!isOpen) return null;

  // Don't show modal for chamber consultations
  if (consultationType === 'chamber') return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-[#1a1f2e] rounded-lg shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-6 relative">
          <button
            onClick={onClose}
            disabled={isUploading}
            className="absolute top-4 right-4 p-2 hover:bg-white/20 rounded-lg transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-white/20 rounded-lg backdrop-blur-sm">
              <FileText className="w-8 h-8" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">Upload Previous Prescription</h2>
              <p className="text-blue-50 text-sm mt-1">Help your doctor provide better care</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* Info Badge */}
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3 text-center">
            <p className="text-blue-300 text-sm">Upload up to 8 pages (Old RX + Reports)</p>
            <p className="text-gray-400 text-xs mt-1">
              {uploadedFiles.length} / {MAX_FILES} uploaded
            </p>
          </div>

          {/* Uploaded Files Grid */}
          {uploadedFiles.length > 0 && (
            <div className="grid grid-cols-2 gap-3">
              {uploadedFiles.map((uploadedFile, index) => (
                <div key={uploadedFile.id} className="relative group">
                  <img
                    src={uploadedFile.previewUrl}
                    alt={`Page ${index + 1}`}
                    className="w-full h-32 object-cover rounded-lg border-2 border-gray-600"
                  />
                  <div className="absolute top-2 left-2 bg-blue-600 text-white text-xs px-2 py-1 rounded">
                    Page {index + 1}
                  </div>
                  {!isUploading && (
                    <button
                      onClick={() => handleRemoveFile(uploadedFile.id)}
                      className="absolute top-2 right-2 p-1.5 bg-red-500 hover:bg-red-600 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 className="w-4 h-4 text-white" />
                    </button>
                  )}
                  <div className="absolute bottom-2 left-2 right-2 text-xs text-gray-300 bg-black/70 px-2 py-1 rounded truncate">
                    {uploadedFile.file.name}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Add More Button */}
          {uploadedFiles.length < MAX_FILES && (
            <label className="block">
              <div className="border-2 border-dashed border-gray-600 rounded-lg p-6 text-center hover:border-blue-500 transition-colors cursor-pointer bg-[#0a0f1a]">
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleFileSelect}
                  disabled={isUploading}
                  className="hidden"
                />
                <div className="space-y-3">
                  <div className="w-12 h-12 bg-blue-500/10 rounded-full flex items-center justify-center mx-auto">
                    <Plus className="w-6 h-6 text-blue-400" />
                  </div>
                  <div className="text-gray-300">
                    <div className="font-semibold">{uploadedFiles.length === 0 ? 'Drop prescription image here or click to browse' : 'Add More'}</div>
                    <div className="text-sm mt-1 text-gray-500">Supports JPG, PNG (Max 10MB per file)</div>
                  </div>
                </div>
              </div>
            </label>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-700 p-4 bg-[#0a0f1a] flex gap-3">
          <Button
            onClick={onClose}
            variant="outline"
            disabled={isUploading}
            className="flex-1 border-gray-600 text-gray-300"
          >
            Cancel
          </Button>
          <Button
            onClick={handleUpload}
            disabled={uploadedFiles.length === 0 || isUploading}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isUploading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4 mr-2" />
                Upload All ({uploadedFiles.length})
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};
