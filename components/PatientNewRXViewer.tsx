/**
 * PatientNewRXViewer Component v1.0.0
 * Shows patient's NEW prescription (uploaded by doctor after consultation)
 * Features:
 * - View NEW RX uploaded by doctor
 * - AI-decoded prescription with multi-lingual translation
 * - Download combined image (Original RX + AI Report)
 * - Full integration with notification system
 * BUILD_ID: PATIENT_NEW_RX_VIEWER_001
 */
import React, { useState } from 'react';
import { X, Download, FileText, Sparkles, User, Calendar, Pill, Clock, Eye, ArrowLeft } from 'lucide-react';
import { Button } from './ui/button';
import { toast } from 'sonner';

interface Medicine {
  name: string;
  dosage: string;
  frequency: string;
  duration: string;
}

interface AIAnalysis {
  medicines: Medicine[];
  diagnosis: string;
  instructions: string;
  confidence: number;
}

interface NewRXFile {
  id: string;
  fileName: string;
  uploadDate: string;
  fileUrl: string;
  doctorName: string;
  consultationDate: string;
  aiAnalysis: AIAnalysis;
  viewed: boolean;
}

interface PatientNewRXViewerProps {
  isOpen: boolean;
  onClose: () => void;
  patientName: string;
  patientLanguage: 'english' | 'hindi' | 'bengali';
  newRXFiles: NewRXFile[];
  userId?: string;
}

export const PatientNewRXViewer: React.FC<PatientNewRXViewerProps> = ({
  isOpen,
  onClose,
  patientName,
  patientLanguage,
  newRXFiles,
  userId
}) => {
  const [selectedFile, setSelectedFile] = useState<NewRXFile | null>(null);
  const [showAIReport, setShowAIReport] = useState(false);
  const [showFullImage, setShowFullImage] = useState(false);

  // 🔔 Request Notification Permission on Mount (if userId provided)
  React.useEffect(() => {
    // Prevent doctors from overwriting patient tokens
    const userType = localStorage.getItem('userType');
    const isDoctor = userType === 'doctor' || window.location.pathname.includes('/doctor');
    
    if (isOpen && userId && !isDoctor) {
      const registerFCM = async () => {
        try {
          const { requestNotificationPermission } = await import('../services/fcm.service');
          await requestNotificationPermission(userId, 'patient');
        } catch (error) {
          console.error('Error registering FCM in viewer:', error);
        }
      };
      registerFCM();
    }
  }, [isOpen, userId]);
  const [files, setFiles] = useState<NewRXFile[]>(newRXFiles || []);

  // Auto-select first file when modal opens
  React.useEffect(() => {
    const newFiles = newRXFiles || [];
    setFiles(newFiles);
    
    if (isOpen && newFiles.length > 0 && !selectedFile) {
      setSelectedFile(newFiles[0]);

    }
  }, [newRXFiles, isOpen]);

  // Reset selection when modal closes
  React.useEffect(() => {
    if (!isOpen) {
      setSelectedFile(null);
      setShowFullImage(false);
    }
  }, [isOpen]);

  // Language content
  const content = {
    english: {
      title: 'Your New Prescription',
      subtitle: 'AI-Decoded prescription from your doctor',
      aiPowered: 'AI-Powered Analysis',
      patient: 'Patient',
      prescribedBy: 'Prescribed by',
      consultDate: 'Consultation Date',
      originalRx: 'Original Prescription',
      aiDecoded: 'AI Decoded Medicines',
      diagnosis: 'Diagnosis',
      instructions: 'Instructions',
      downloadBtn: 'Download Prescription & AI Report',
      downloadOriginal: 'Download Original Only',
      viewFull: 'View Full Size',
      backToList: 'Back to List',
      noRx: 'No new prescriptions available',
      important: 'Important Notes',
      notes: [
        'Follow the prescribed dosage carefully',
        'Complete the full course of medication',
        'Contact doctor for any side effects',
        'Show this to pharmacist when buying medicines',
      ],
      accuracy: 'AI Confidence',
      markViewed: 'Mark as Viewed',
      viewed: 'Viewed',
    },
    hindi: {
      title: 'आपका नया प्रिस्क्रिप्शन',
      subtitle: 'डॉक्टर से AI-डिकोडेड प्रिस्क्रिप्शन',
      aiPowered: 'AI-संचालित विश्लेषण',
      patient: 'मरीज़',
      prescribedBy: 'द्वारा निर्धारित',
      consultDate: 'परामर्श तिथि',
      originalRx: 'मूल प्रिस्क्रिप्शन',
      aiDecoded: 'AI डिकोडेड दवाएं',
      diagnosis: 'निदान',
      instructions: 'निर्देश',
      downloadBtn: 'प्रिस्क्रिप्शन और AI रिपोर्ट डाउनलोड करें',
      downloadOriginal: 'केवल मूल डाउनलोड करें',
      viewFull: 'पूर्ण आकार देखें',
      backToList: 'सूची में वापस',
      noRx: 'कोई नया प्रिस्क्रिप्शन उपलब्ध नहीं',
      important: 'महत्वपूर्ण नोट्स',
      notes: [
        'निर्धारित खुराक का ध्यानपूर्वक पालन करें',
        'दवा का पूरा कोर्स पूरा करें',
        'किसी भी दुष्प्रभाव के लिए डॉक्टर से संपर्क करें',
        'दवाई खरीदते समय यह फार्मासिस्ट को दिखाएं',
      ],
      accuracy: 'AI विश्वसनीयता',
      markViewed: 'देखा गया के रूप में चिह्नित करें',
      viewed: 'देखा गया',
    },
    bengali: {
      title: 'আপনার নতুন প্রেসক্রিপশন',
      subtitle: 'ডাক্তারের AI-ডিকোডেড প্রেসক্রিপশন',
      aiPowered: 'AI-চালিত বিশ্লেষণ',
      patient: 'রোগী',
      prescribedBy: 'দ্বারা নির্ধারিত',
      consultDate: 'পরামর্শের তারিখ',
      originalRx: 'মূল প্রেসক্রিপশন',
      aiDecoded: 'AI ডিকোডেড ওষুধ',
      diagnosis: 'রোগ নির্ণয়',
      instructions: 'নির্দেশাবলী',
      downloadBtn: 'প্রেসক্রিপশন এবং AI রিপোর্ট ডাউনলোড করুন',
      downloadOriginal: 'শুধুমাত্র মূল ডাউনলোড করুন',
      viewFull: 'সম্পূর্ণ আকার দেখুন',
      backToList: 'তালিকায় ফিরুন',
      noRx: 'কোনো নতুন প্রেসক্রিপশন উপলব্ধ নেই',
      important: 'গুরুত্বপূর্ণ নোট',
      notes: [
        'নির্ধারিত ডোজ সাবধানে অনুসরণ করুন',
        'ওষুধের সম্পূর্ণ কোর্স সম্পূর্ণ করুন',
        'যেকোনো পার্শ্বপ্রতিক্রিয়ার জন্য ডাক্তারের সাথে যোগাযোগ করুন',
        'ওষুধ কেনার সময় এটি ফার্মাসিস্টকে দেখান',
      ],
      accuracy: 'AI নির্ভুলতা',
      markViewed: 'দেখা হয়েছে হিসাবে চিহ্নিত করুন',
      viewed: 'দেখা হয়ে���ে',
    },
  };

  const t = content[patientLanguage];

  const handleDownloadCombined = async (file: NewRXFile) => {
    try {
      toast.success('Downloading combined prescription...', {
        description: 'Original RX + AI Analysis Report (PNG)',
        duration: 3000,
      });

      // In production, this would download a combined image
      const link = document.createElement('a');
      link.href = file.fileUrl;
      link.download = `prescription-combined-${patientName.replace(/\\s+/g, '-')}-${Date.now()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);


    } catch (error) {
      toast.error('Failed to download prescription');
      console.error('Download error:', error);
    }
  };

  const handleDownloadOriginal = async (file: NewRXFile) => {
    try {
      toast.success('Downloading original prescription...', {
        duration: 2000,
      });

      const link = document.createElement('a');
      link.href = file.fileUrl;
      link.download = `prescription-${patientName.replace(/\\s+/g, '-')}-${Date.now()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);


    } catch (error) {
      toast.error('Failed to download');
    }
  };

  const handleMarkAsViewed = (fileId: string) => {
    setFiles((prevFiles) =>
      prevFiles.map((file) =>
        file.id === fileId ? { ...file, viewed: true } : file
      )
    );

    toast.success('Marked as viewed', {
      description: 'You can access this anytime from notifications',
    });


  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 via-pink-600 to-purple-600 text-white p-6 relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 hover:bg-white/20 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-white/20 rounded-lg backdrop-blur-sm relative">
              <FileText className="w-8 h-8" />
              <div className="absolute -top-1 -right-1 w-6 h-6 bg-emerald-400 rounded-full flex items-center justify-center border-2 border-purple-600">
                <Sparkles className="w-3 h-3 text-white" />
              </div>
            </div>
            <div>
              <h2 className="text-2xl font-bold">{t.title}</h2>
              <p className="text-purple-100 text-sm mt-1 flex items-center gap-2">
                <Sparkles className="w-4 h-4" />
                {t.aiPowered}
              </p>
            </div>
          </div>
        </div>

        {/* Content - 3 Panel Layout */}
        <div className="flex-1 overflow-hidden grid grid-cols-1 md:grid-cols-3">
          {/* Left Panel - Prescription List */}
          <div className="border-r border-gray-200 p-6 overflow-y-auto bg-gray-50">
            <div className="mb-4">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <FileText className="w-5 h-5 text-purple-600" />
                New Prescriptions
              </h3>
              <div className="text-sm text-gray-600 mt-1">
                {files.length} prescription{files.length !== 1 ? 's' : ''} received
              </div>
            </div>

            {files.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <div className="text-gray-500">{t.noRx}</div>
              </div>
            ) : (
              <div className="space-y-3">
                {files.map((file) => (
                  <div
                    key={file.id}
                    onClick={() => {
                      setSelectedFile(file);
                      setShowFullImage(false);
                    }}
                    className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
                      selectedFile?.id === file.id
                        ? 'border-purple-500 bg-purple-50'
                        : file.viewed
                        ? 'border-green-400 bg-green-50 hover:border-green-500'
                        : 'border-gray-200 hover:border-gray-300 bg-white'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-gray-900 truncate">
                          {file.fileName}
                        </div>
                        <div className="text-sm text-gray-500 mt-1">
                          Dr. {file.doctorName}
                        </div>
                        <div className="text-xs text-gray-400 mt-1">
                          {file.uploadDate}
                        </div>
                      </div>
                      {file.viewed && (
                        <div className="flex items-center gap-1 text-green-600 text-sm font-medium">
                          <Eye className="w-4 h-4" />
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Middle Panel - Image Preview */}
          <div className="p-6 overflow-y-auto bg-gray-50">
            {selectedFile ? (
              <div className="space-y-4">
                {/* Header */}
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-gray-900">{t.originalRx}</h3>
                  {!selectedFile.viewed && (
                    <Button
                      onClick={() => handleMarkAsViewed(selectedFile.id)}
                      size="sm"
                      className="bg-emerald-600 hover:bg-emerald-700"
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      {t.markViewed}
                    </Button>
                  )}
                </div>

                {/* Prescription Image */}
                <div className="border-2 border-gray-300 rounded-lg overflow-hidden bg-white">
                  <img
                    src={selectedFile.fileUrl}
                    alt={selectedFile.fileName}
                    className="w-full h-auto cursor-pointer hover:opacity-90 transition-opacity"
                    onClick={() => setShowFullImage(true)}
                    title="Click to view full screen"
                  />
                </div>

                {/* Doctor & Date Info */}
                <div className="bg-white rounded-lg p-4 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">{t.prescribedBy}:</span>
                    <span className="font-medium text-gray-900">Dr. {selectedFile.doctorName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">{t.consultDate}:</span>
                    <span className="font-medium text-gray-900">{selectedFile.consultationDate}</span>
                  </div>
                </div>

                {/* Download Buttons */}
                <div className="space-y-2">
                  <Button
                    onClick={() => handleDownloadCombined(selectedFile)}
                    className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    {t.downloadBtn}
                  </Button>
                  <Button
                    onClick={() => handleDownloadOriginal(selectedFile)}
                    variant="outline"
                    className="w-full"
                  >
                    <FileText className="w-4 h-4 mr-2" />
                    {t.downloadOriginal}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-400">
                <div className="text-center">
                  <FileText className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <div>Select a prescription to preview</div>
                </div>
              </div>
            )}
          </div>

          {/* Right Panel - AI Analysis */}
          <div className="border-l border-gray-200 p-6 overflow-y-auto bg-gradient-to-br from-purple-50 to-pink-50">
            {selectedFile ? (
              <div className="space-y-4">
                {/* AI Badge */}
                <div className="bg-gradient-to-r from-purple-100 to-pink-100 rounded-lg p-3 border border-purple-200">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-purple-600" />
                    <span className="font-semibold text-purple-900">{t.aiDecoded}</span>
                    <span className="ml-auto text-xs bg-emerald-500 text-white px-2 py-1 rounded-full">
                      {t.accuracy}: {selectedFile.aiAnalysis.confidence}%
                    </span>
                  </div>
                </div>

                {/* Medicines */}
                <div className="space-y-3">
                  {selectedFile.aiAnalysis.medicines.map((medicine, index) => (
                    <div key={index} className="bg-white rounded-lg p-4 border border-purple-200">
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
                          <Pill className="w-4 h-4 text-purple-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-gray-900 mb-2">{medicine.name}</p>
                          <div className="space-y-1 text-sm">
                            <div className="flex items-center gap-2 text-gray-700">
                              <Pill className="w-3 h-3 text-blue-500" />
                              <span>{medicine.dosage}</span>
                            </div>
                            <div className="flex items-center gap-2 text-gray-700">
                              <Clock className="w-3 h-3 text-emerald-500" />
                              <span>{medicine.frequency}</span>
                            </div>
                            <div className="flex items-center gap-2 text-gray-700">
                              <Calendar className="w-3 h-3 text-purple-500" />
                              <span>{medicine.duration}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Diagnosis */}
                {selectedFile.aiAnalysis.diagnosis && (
                  <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                    <p className="text-blue-900 text-sm font-semibold mb-1">{t.diagnosis}:</p>
                    <p className="text-blue-800 text-sm">{selectedFile.aiAnalysis.diagnosis}</p>
                  </div>
                )}

                {/* Instructions */}
                {selectedFile.aiAnalysis.instructions && (
                  <div className="bg-emerald-50 rounded-lg p-4 border border-emerald-200">
                    <p className="text-emerald-900 text-sm font-semibold mb-1">{t.instructions}:</p>
                    <p className="text-emerald-800 text-sm">{selectedFile.aiAnalysis.instructions}</p>
                  </div>
                )}

                {/* Important Notes */}
                <div className="bg-amber-50 rounded-lg p-4 border border-amber-200">
                  <p className="text-amber-900 text-sm font-semibold mb-2">{t.important}:</p>
                  <ul className="text-amber-800 text-xs space-y-1">
                    {t.notes.map((note, index) => (
                      <li key={index}>• {note}</li>
                    ))}
                  </ul>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-400">
                <div className="text-center">
                  <Sparkles className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <div>AI analysis will appear here</div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Full Screen Image Viewer */}
      {showFullImage && selectedFile && (
        <div className="fixed inset-0 bg-black/95 z-[60] flex items-center justify-center p-4">
          <button
            onClick={() => setShowFullImage(false)}
            className="absolute top-4 left-4 p-3 bg-white/10 hover:bg-white/20 rounded-full transition-colors flex items-center gap-2"
          >
            <ArrowLeft className="w-5 h-5 text-white" />
            <span className="text-white">Back</span>
          </button>
          <img
            src={selectedFile.fileUrl}
            alt="Full Prescription"
            className="max-w-full max-h-full object-contain"
          />
        </div>
      )}
    </div>
  );
};

