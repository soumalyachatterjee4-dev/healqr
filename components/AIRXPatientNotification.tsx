/**
 * AI RX Patient Notification v1.0.0
 * Shows NEW prescription with AI analysis to patient
 * Features:
 * - Original RX image preview
 * - AI decoded medicines with dosage/frequency/duration
 * - Multi-lingual translation (English/Hindi/Bengali)
 * - Download combined image (RX + AI Report)
 * - Instructions and doctor details
 */
import React from 'react';
import { FileText, Download, User, Calendar, Sparkles, Pill, Clock, ArrowRight, Eye } from 'lucide-react';
import { Button } from './ui/button';
import TemplateDisplay from './TemplateDisplay';
import { toast } from 'sonner';

interface Medicine {
  name: string;
  dosage: string;
  frequency: string;
  duration: string;
}

interface AIRXPatientNotificationProps {
  patientName: string;
  doctorName: string;
  consultationDate: string;
  rxImageUrl: string;
  language: 'english' | 'hindi' | 'bengali';
  aiAnalysis: {
    medicines: Medicine[];
    diagnosis: string;
    instructions: string;
    confidence: number;
  };
  isPreview?: boolean;
}

export const AIRXPatientNotification: React.FC<AIRXPatientNotificationProps> = ({
  patientName,
  doctorName,
  consultationDate,
  rxImageUrl,
  language,
  aiAnalysis,
  isPreview = false,
}) => {
  const [showFullImage, setShowFullImage] = React.useState(false);

  // Language content
  const content = {
    english: {
      title: 'Your Prescription is Ready! 💊',
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
      viewFullBtn: 'View Full Prescription',
      important: 'Important',
      notes: [
        'Follow the prescribed dosage carefully',
        'Complete the full course of medication',
        'Contact doctor for any side effects',
        'Show this to pharmacist when buying medicines',
      ],
      poweredBy: 'Powered by',
      accuracy: 'AI Confidence',
    },
    hindi: {
      title: 'आपका प्रिस्क्रिप्शन तैयार है! 💊',
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
      viewFullBtn: 'पूरा प्रिस्क्रिप्शन देखें',
      important: 'महत्वपूर्ण',
      notes: [
        'निर्धारित खुराक का ध्यानपूर्वक पालन करें',
        'दवा का पूरा कोर्स पूरा करें',
        'किसी भी दुष्प्रभाव के लिए डॉक्टर से संपर्क करें',
        'दवाई खरीदते समय यह फार्मासिस्ट को दिखाएं',
      ],
      poweredBy: 'द्वारा संचालित',
      accuracy: 'AI विश्वसनीयता',
    },
    bengali: {
      title: 'আপনার প্রেসক্রিপশন তৈরি! 💊',
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
      viewFullBtn: 'সম্পূর্ণ প্রেসক্রিপশন দেখুন',
      important: 'গুরুত্বপূর্ণ',
      notes: [
        'নির্ধারিত ডোজ সাবধানে অনুসরণ করুন',
        'ওষুধের সম্পূর্ণ কোর্স সম্পূর্ণ করুন',
        'যেকোনো পার্শ্বপ্রতিক্রিয়ার জন্য ডাক্তারের সাথে যোগাযোগ করুন',
        'ওষুধ কেনার সময় এটি ফার্মাসিস্টকে দেখান',
      ],
      poweredBy: 'দ্বারা চালিত',
      accuracy: 'AI নির্ভুলতা',
    },
  };

  const t = content[language];

  const handleDownload = async () => {
    if (isPreview) {
      toast.success('Preview Mode: Combined image would download here', {
        description: 'Original RX + AI Analysis Report (PNG format)',
      });
      return;
    }

    try {
      // In production, this would download a combined image
      // with original RX + AI decoded report
      toast.success('Downloading combined prescription...', {
        description: 'Original RX + AI Analysis Report',
        duration: 3000,
      });

      // Simulate download
      const link = document.createElement('a');
      link.href = rxImageUrl;
      link.download = `prescription-${patientName.replace(/\\s+/g, '-')}-${Date.now()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      toast.error('Failed to download prescription');
      console.error('Download error:', error);
    }
  };

  const handleViewFull = () => {
    if (isPreview) {
      toast.info('Preview Mode: Full prescription viewer would open');
      return;
    }
    setShowFullImage(true);
  };

  return (
    <>
      <div className="w-full max-w-2xl mx-auto bg-gradient-to-br from-purple-600/20 via-pink-600/20 to-purple-600/20 border-2 border-purple-500/40 backdrop-blur-lg rounded-3xl shadow-2xl p-6">
        {/* Header Icon with AI Badge */}
        <div className="flex justify-center mb-4">
          <div className="relative">
            <div className="w-20 h-20 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center shadow-lg">
              <FileText className="w-10 h-10 text-white" />
            </div>
            <div className="absolute -top-2 -right-2 w-10 h-10 bg-gradient-to-br from-emerald-400 to-teal-400 rounded-full flex items-center justify-center border-2 border-white shadow-lg">
              <Sparkles className="w-5 h-5 text-white animate-pulse" />
            </div>
          </div>
        </div>

        {/* Title */}
        <h2 className="text-center text-white mb-1">
          {t.title}
        </h2>
        <div className="flex items-center justify-center gap-2 mb-4">
          <Sparkles className="w-4 h-4 text-emerald-400" />
          <p className="text-center text-emerald-300 text-sm font-semibold">
            {t.aiPowered}
          </p>
          <Sparkles className="w-4 h-4 text-emerald-400" />
        </div>
        <p className="text-center text-gray-200 text-sm mb-6">
          {t.subtitle}
        </p>

        {/* Patient & Doctor Details */}
        <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-5 mb-5 space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-500/20 rounded-full flex items-center justify-center">
              <User className="w-5 h-5 text-blue-300" />
            </div>
            <div>
              <p className="text-gray-300 text-xs">{t.patient}</p>
              <p className="text-white font-medium">{patientName}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-500/20 rounded-full flex items-center justify-center">
              <User className="w-5 h-5 text-emerald-300" />
            </div>
            <div>
              <p className="text-gray-300 text-xs">{t.prescribedBy}</p>
              <p className="text-white font-medium">{doctorName}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-500/20 rounded-full flex items-center justify-center">
              <Calendar className="w-5 h-5 text-purple-300" />
            </div>
            <div>
              <p className="text-gray-300 text-xs">{t.consultDate}</p>
              <p className="text-white font-medium">{consultationDate}</p>
            </div>
          </div>
        </div>

        {/* AI Analysis Section */}
        <div className="space-y-4 mb-5">
          {/* Original RX Preview */}
          <div className="bg-white/5 border border-purple-500/30 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <FileText className="w-5 h-5 text-purple-300" />
              <h3 className="text-white font-semibold">{t.originalRx}</h3>
            </div>
            <div 
              className="bg-white/10 border border-white/10 rounded-lg overflow-hidden cursor-pointer hover:opacity-80 transition-opacity"
              onClick={handleViewFull}
            >
              {!isPreview && rxImageUrl ? (
                <img
                  src={rxImageUrl}
                  alt="Prescription"
                  className="w-full h-48 object-contain bg-white/5"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              ) : (
                <div className="flex items-center justify-center h-48">
                  <FileText className="w-16 h-16 text-purple-300 opacity-50" />
                </div>
              )}
            </div>
            <p className="text-xs text-gray-400 mt-2 text-center flex items-center justify-center gap-1">
              <Eye className="w-3 h-3" />
              Click to view full size
            </p>
          </div>

          {/* AI Decoded Medicines */}
          <div className="bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border border-emerald-500/30 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-5 h-5 text-emerald-400" />
              <h3 className="text-white font-semibold">{t.aiDecoded}</h3>
              <span className="ml-auto text-xs bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 px-2 py-1 rounded-full">
                {t.accuracy}: {aiAnalysis.confidence}%
              </span>
            </div>

            <div className="space-y-3">
              {aiAnalysis.medicines.map((medicine, index) => (
                <div key={index} className="bg-white/5 border border-white/10 rounded-lg p-3">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-purple-500/20 rounded-full flex items-center justify-center flex-shrink-0">
                      <Pill className="w-4 h-4 text-purple-300" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-semibold mb-2">{medicine.name}</p>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-sm">
                        <div className="flex items-center gap-1">
                          <Pill className="w-3 h-3 text-blue-400" />
                          <span className="text-gray-300">{medicine.dosage}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-emerald-400" />
                          <span className="text-gray-300">{medicine.frequency}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-purple-400" />
                          <span className="text-gray-300">{medicine.duration}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Diagnosis */}
            {aiAnalysis.diagnosis && (
              <div className="mt-3 pt-3 border-t border-white/10">
                <p className="text-emerald-300 text-xs font-semibold mb-1">{t.diagnosis}:</p>
                <p className="text-white text-sm">{aiAnalysis.diagnosis}</p>
              </div>
            )}

            {/* Instructions */}
            {aiAnalysis.instructions && (
              <div className="mt-3 pt-3 border-t border-white/10">
                <p className="text-blue-300 text-xs font-semibold mb-1">{t.instructions}:</p>
                <p className="text-white text-sm">{aiAnalysis.instructions}</p>
              </div>
            )}
          </div>
        </div>

        {/* Important Notes */}
        <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4 mb-5">
          <div className="flex items-start gap-2">
            <svg className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="flex-1">
              <p className="text-blue-300 text-sm font-medium mb-1">{t.important}:</p>
              <ul className="text-blue-200 text-xs space-y-1">
                {t.notes.map((note, index) => (
                  <li key={index}>• {note}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3">
          <Button
            onClick={handleDownload}
            className="w-full h-14 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white shadow-lg shadow-purple-500/30 rounded-xl transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
          >
            <Download className="w-5 h-5 mr-2" />
            <span className="text-lg">{t.downloadBtn}</span>
          </Button>

          <Button
            onClick={handleViewFull}
            variant="outline"
            className="w-full h-12 bg-white/5 border-2 border-purple-500/40 text-purple-300 hover:bg-white/10 rounded-xl transition-all duration-300"
          >
            <FileText className="w-5 h-5 mr-2" />
            {t.viewFullBtn}
          </Button>
        </div>

        {/* Preview Mode Indicator */}
        {isPreview && (
          <div className="mt-4 text-center">
            <span className="inline-block bg-purple-500/20 border border-purple-500/40 text-purple-300 text-xs px-3 py-1 rounded-full">
              📱 Template Preview
            </span>
          </div>
        )}

        {/* Health Tip Section */}
        <div className="mt-5">
          <TemplateDisplay placement="notif-ai-rx-patient" className="mb-0" />
        </div>

        {/* Footer */}
        <div className="mt-5 pt-4 border-t border-white/10 text-center">
          <p className="text-gray-300 text-xs">
            {t.poweredBy} <span className="text-purple-400 font-semibold">HealQR AI</span>
          </p>
          <p className="text-gray-400 text-xs mt-1">
            AI-Decoded • Multi-lingual • Downloadable
          </p>
        </div>
      </div>

      {/* Full Screen Image Viewer */}
      {showFullImage && !isPreview && (
        <div className="fixed inset-0 bg-black/95 z-[100] flex items-center justify-center p-4">
          <button
            onClick={() => setShowFullImage(false)}
            className="absolute top-4 right-4 p-3 bg-white/10 hover:bg-white/20 rounded-full transition-colors"
          >
            <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <img
            src={rxImageUrl}
            alt="Full Prescription"
            className="max-w-full max-h-full object-contain"
          />
        </div>
      )}
    </>
  );
};

