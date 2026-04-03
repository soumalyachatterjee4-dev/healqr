import { Video, VideoOff, Mic, MicOff, Upload, X, PhoneOff, Clock, User, FileText, Download } from 'lucide-react';
import { Button } from './ui/button';
import { useState, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { useTranslatedConfirm } from './TranslatedConfirmModal';

interface VideoConsultationInterfaceProps {
  patientName: string;
  patientId: string;
  bookingId: string;
  onEndConsultation: (duration: string) => void;
  onClose: () => void;
}

export default function VideoConsultationInterface({
  patientName,
  patientId,
  bookingId,
  onEndConsultation,
  onClose,
}: VideoConsultationInterfaceProps) {
  const [isCameraOn, setIsCameraOn] = useState(true);
  const [isMicOn, setIsMicOn] = useState(true);
  const [consultationStartTime, setConsultationStartTime] = useState<Date>(new Date());
  const [duration, setDuration] = useState('00:00');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadedRxUrl, setUploadedRxUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Timer for consultation duration
  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      const diff = Math.floor((now.getTime() - consultationStartTime.getTime()) / 1000);
      const minutes = Math.floor(diff / 60);
      const seconds = diff % 60;
      setDuration(`${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`);
    }, 1000);

    return () => clearInterval(interval);
  }, [consultationStartTime]);

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
      setUploadedRxUrl(url);
      
      toast.success('Prescription selected');
    }
  };

  const handleSendRx = () => {
    if (!selectedFile) {
      toast.error('Please select a prescription file first');
      return;
    }

    // Mock upload and send notification
    setTimeout(() => {
      toast.success(`Prescription sent to ${patientName}`, {
        description: 'Patient notified with downloadable link',
      });
      
      // Clear selection after sending
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }, 1000);
  };

  const handleRemoveRx = () => {
    setSelectedFile(null);
    setUploadedRxUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    toast.info('Prescription removed');
  };

  const { showConfirm, ConfirmModalComponent } = useTranslatedConfirm();

  const handleEndCall = async () => {
    const confirmEnd = await showConfirm('Are you sure you want to end the consultation?', 'End Consultation');
    if (confirmEnd) {
      onEndConsultation(duration);
      toast.success('Consultation ended successfully');
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col">
      <ConfirmModalComponent />
      {/* Header */}
      <div className="bg-gray-900 border-b border-gray-700 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
            <User className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-white font-medium">{patientName}</h2>
            <p className="text-gray-400 text-sm">Booking ID: {bookingId}</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 bg-red-500/20 px-4 py-2 rounded-full">
            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
            <Clock className="w-4 h-4 text-red-400" />
            <span className="text-white font-mono">{duration}</span>
          </div>
        </div>
      </div>

      {/* Main Video Area */}
      <div className="flex-1 relative bg-gray-950">
        {/* Doctor's Video (Large) */}
        <div className="absolute inset-0">
          <div className="w-full h-full bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center">
            {isCameraOn ? (
              <div className="text-center">
                <div className="w-32 h-32 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <User className="w-16 h-16 text-white" />
                </div>
                <p className="text-gray-400">Camera Active</p>
                <p className="text-gray-500 text-sm">Your video feed would appear here</p>
              </div>
            ) : (
              <div className="text-center">
                <VideoOff className="w-16 h-16 text-gray-500 mx-auto mb-4" />
                <p className="text-gray-400">Camera Off</p>
              </div>
            )}
          </div>
        </div>

        {/* Patient's Video (Picture-in-Picture) */}
        <div className="absolute top-4 right-4 w-64 h-48 bg-gray-800 rounded-xl overflow-hidden border-2 border-gray-600 shadow-2xl">
          <div className="w-full h-full bg-gradient-to-br from-green-800 to-green-900 flex items-center justify-center">
            <div className="text-center">
              <div className="w-16 h-16 bg-green-600 rounded-full flex items-center justify-center mx-auto mb-2">
                <User className="w-8 h-8 text-white" />
              </div>
              <p className="text-gray-300 text-sm">{patientName}</p>
            </div>
          </div>
        </div>

        {/* RX Upload Panel (Bottom Right) */}
        <div className="absolute bottom-20 right-4 w-80 bg-gray-900/95 backdrop-blur-lg rounded-2xl border border-gray-700 shadow-2xl p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-white font-medium flex items-center gap-2">
              <FileText className="w-5 h-5 text-emerald-400" />
              Upload Prescription
            </h3>
          </div>

          {/* Upload Area */}
          {!selectedFile ? (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-gray-600 rounded-xl p-6 text-center cursor-pointer hover:border-emerald-500 hover:bg-emerald-500/5 transition-all"
            >
              <Upload className="w-10 h-10 text-gray-400 mx-auto mb-2" />
              <p className="text-gray-300 text-sm mb-1">Click to upload RX</p>
              <p className="text-gray-500 text-xs">JPG or PNG (Max 5MB)</p>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Preview */}
              {uploadedRxUrl && (
                <div className="relative">
                  <img
                    src={uploadedRxUrl}
                    alt="RX Preview"
                    className="w-full h-40 object-contain bg-gray-800 rounded-lg"
                  />
                  <button
                    onClick={handleRemoveRx}
                    className="absolute top-2 right-2 w-8 h-8 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center transition-colors"
                  >
                    <X className="w-4 h-4 text-white" />
                  </button>
                </div>
              )}
              
              {/* File Info */}
              <div className="bg-gray-800 rounded-lg p-3">
                <p className="text-white text-sm font-medium truncate mb-1">{selectedFile.name}</p>
                <p className="text-gray-400 text-xs">
                  {(selectedFile.size / 1024).toFixed(2)} KB • {selectedFile.type.split('/')[1].toUpperCase()}
                </p>
              </div>

              {/* Send Button */}
              <Button
                onClick={handleSendRx}
                className="w-full bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-600 hover:to-green-600 text-white h-12"
              >
                <Download className="w-5 h-5 mr-2" />
                Send to Patient
              </Button>

              {/* Change File Button */}
              <Button
                onClick={() => fileInputRef.current?.click()}
                variant="outline"
                className="w-full border-gray-600 text-gray-300 hover:bg-gray-800 h-10"
              >
                Change File
              </Button>
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/jpg,image/png"
            className="hidden"
            onChange={handleFileSelect}
          />
        </div>
      </div>

      {/* Bottom Controls */}
      <div className="bg-gray-900 border-t border-gray-700 px-6 py-4">
        <div className="flex items-center justify-center gap-4">
          {/* Microphone Toggle */}
          <button
            onClick={() => setIsMicOn(!isMicOn)}
            className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${
              isMicOn
                ? 'bg-gray-700 hover:bg-gray-600'
                : 'bg-red-500 hover:bg-red-600'
            }`}
            title={isMicOn ? 'Mute' : 'Unmute'}
          >
            {isMicOn ? (
              <Mic className="w-6 h-6 text-white" />
            ) : (
              <MicOff className="w-6 h-6 text-white" />
            )}
          </button>

          {/* Camera Toggle */}
          <button
            onClick={() => setIsCameraOn(!isCameraOn)}
            className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${
              isCameraOn
                ? 'bg-gray-700 hover:bg-gray-600'
                : 'bg-red-500 hover:bg-red-600'
            }`}
            title={isCameraOn ? 'Stop Camera' : 'Start Camera'}
          >
            {isCameraOn ? (
              <Video className="w-6 h-6 text-white" />
            ) : (
              <VideoOff className="w-6 h-6 text-white" />
            )}
          </button>

          {/* End Call */}
          <button
            onClick={handleEndCall}
            className="w-14 h-14 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center transition-all"
            title="End Consultation"
          >
            <PhoneOff className="w-6 h-6 text-white" />
          </button>
        </div>
      </div>
    </div>
  );
}

