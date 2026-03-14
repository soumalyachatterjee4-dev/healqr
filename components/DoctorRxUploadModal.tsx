import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Button } from './ui/button';
import { Upload, X, FileText, Download, Check } from 'lucide-react';
import { useState, useRef } from 'react';
import { toast } from 'sonner';

interface DoctorRxUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  patientId?: string;
  patientName: string;
  patientPhone?: string;
  bookingId?: string;
  onUploadSuccess: (data: {
    fileName: string;
    fileUrl: string;
    ocrText: string;
    translations: {
      english: string;
      hindi: string;
      bengali: string;
    };
  }) => void;
}

export default function DoctorRxUploadModal({
  isOpen,
  onClose,
  patientId,
  patientName,
  patientPhone,
  bookingId,
  onUploadSuccess,
}: DoctorRxUploadModalProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type (JPG/PNG only)
      const validTypes = ['image/jpeg', 'image/jpg', 'image/png'];
      if (!validTypes.includes(file.type)) {
        toast.error('Please upload only JPG or PNG images');
        return;
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error('File size should be less than 5MB');
        return;
      }

      setSelectedFile(file);
      
      // Create preview URL
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      
      toast.success('Prescription selected');
    }
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      toast.error('Please select a file first');
      return;
    }

    setUploading(true);

    // Simulate upload delay
    setTimeout(() => {
      const mockData = {
        fileName: selectedFile.name,
        fileUrl: previewUrl || '',
        ocrText: 'Mock OCR text from prescription',
        translations: {
          english: 'Mock English translation',
          hindi: 'Mock Hindi translation',
          bengali: 'Mock Bengali translation',
        },
      };

      console.log(`📤 UPLOADING PRESCRIPTION: ${selectedFile.name} for ${patientName} (${bookingId || patientPhone || patientId})`);
      console.log(`📧 NOTIFICATION SENT: RXDownloadNotification sent to patient with download link`);

      onUploadSuccess(mockData);
      setUploading(false);
      
      // Show success message with notification details
      toast.success(
        <div className="flex flex-col gap-1">
          <div className="font-semibold">Prescription Uploaded Successfully! ✅</div>
          <div className="text-sm text-gray-300">Patient will receive downloadable RX notification</div>
        </div>,
        {
          duration: 4000,
        }
      );
      
      // Reset and close
      handleRemoveFile();
      onClose();
    }, 1500);
  };

  const handleClose = () => {
    if (!uploading) {
      handleRemoveFile();
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md bg-gray-900 border-gray-700 text-white">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-emerald-400" />
            Upload Prescription
          </DialogTitle>
          <DialogDescription className="text-sm text-gray-400 mt-2">
            Upload prescription for <span className="text-emerald-400 font-medium">{patientName}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Upload Area */}
          {!selectedFile ? (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-gray-600 rounded-xl p-8 text-center cursor-pointer hover:border-emerald-500 hover:bg-emerald-500/5 transition-all"
            >
              <Upload className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-300 mb-1">Click to upload prescription</p>
              <p className="text-gray-500 text-sm">JPG or PNG (Max 5MB)</p>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Preview */}
              {previewUrl && (
                <div className="relative bg-gray-800 rounded-xl p-4">
                  <button
                    onClick={handleRemoveFile}
                    disabled={uploading}
                    className="absolute top-2 right-2 w-8 h-8 bg-red-500 hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-full flex items-center justify-center transition-colors z-10"
                  >
                    <X className="w-4 h-4 text-white" />
                  </button>
                  <img
                    src={previewUrl}
                    alt="RX Preview"
                    className="w-full h-64 object-contain rounded-lg"
                  />
                </div>
              )}
              
              {/* File Info */}
              <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-emerald-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                    <FileText className="w-5 h-5 text-emerald-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-medium truncate">{selectedFile.name}</p>
                    <p className="text-gray-400 text-xs">
                      {(selectedFile.size / 1024).toFixed(2)} KB • {selectedFile.type.split('/')[1].toUpperCase()}
                    </p>
                  </div>
                  {!uploading && (
                    <Check className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                  )}
                </div>
              </div>
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/jpg,image/png"
            className="hidden"
            onChange={handleFileSelect}
            disabled={uploading}
          />
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <Button
            onClick={handleClose}
            variant="outline"
            className="flex-1 border-gray-700 text-gray-300 hover:bg-gray-800"
            disabled={uploading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleUpload}
            disabled={!selectedFile || uploading}
            className="flex-1 bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-600 hover:to-green-600 text-white disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {uploading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                Sending...
              </>
            ) : (
              <>
                <Download className="w-4 h-4 mr-2" />
                Send to Patient
              </>
            )}
          </Button>
        </div>

        {/* Note */}
        <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3 mt-2">
          <div className="flex items-start gap-2">
            <span className="text-lg">💡</span>
            <div className="flex-1">
              <p className="text-blue-300 text-xs font-medium mb-1">Automatic Notification Delivery:</p>
              <ul className="text-blue-300/80 text-xs space-y-0.5">
                <li>• Patient receives "Prescription Ready" notification</li>
                <li>• Includes downloadable link (JPG/PNG format)</li>
                <li>• Can download as image for pharmacy use</li>
              </ul>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

