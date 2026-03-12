import React, { useState } from 'react';
import { X, Download, FileText, Sparkles, Check } from 'lucide-react';
import { Button } from './ui/button';
import TemplateDisplay from './TemplateDisplay';

interface Medicine {
  name: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions: string;
}

interface AIRXAnalysisNotificationProps {
  patientName: string;
  doctorName: string;
  consultationDate: string;
  language: 'english' | 'hindi' | 'bengali';
  prescriptionImage: string;
  aiDecodedData: {
    medicines: Medicine[];
    generalInstructions?: string;
    dietaryAdvice?: string;
    followUpDate?: string;
  };
  onClose?: () => void;
  isPreview?: boolean;
}

export const AIRXAnalysisNotification: React.FC<AIRXAnalysisNotificationProps> = ({
  patientName,
  doctorName,
  consultationDate,
  language,
  prescriptionImage,
  aiDecodedData,
  onClose,
  isPreview = false,
}) => {
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloaded, setDownloaded] = useState(false);

  const translations = {
    english: {
      title: 'Prescription Ready - AI Decoded',
      subtitle: 'Your prescription has been decoded and translated',
      originalRx: 'Original Prescription',
      decodedRx: 'AI Decoded Prescription',
      medicines: 'Medicines',
      medicine: 'Medicine',
      dosage: 'Dosage',
      frequency: 'Frequency',
      duration: 'Duration',
      instructions: 'Instructions',
      generalInstructions: 'General Instructions',
      dietaryAdvice: 'Dietary Advice',
      followUp: 'Follow-up Date',
      downloadBtn: 'Download as Image',
      downloading: 'Downloading...',
      downloaded: 'Downloaded!',
      aiNote: '✨ AI decoded from doctor\'s handwriting - Not medical advice',
      showPharmacy: 'Show this to your pharmacy',
    },
    hindi: {
      title: 'प्रिस्क्रिप्शन तैयार - AI द्वारा डिकोड',
      subtitle: 'आपका प्रिस्क्रिप्शन डिकोड और अनुवादित किया गया है',
      originalRx: 'मूल प्रिस्क्रिप्शन',
      decodedRx: 'AI डिकोड प्रिस्क्रिप्शन',
      medicines: 'दवाइयाँ',
      medicine: 'दवा',
      dosage: 'खुराक',
      frequency: 'आवृत्ति',
      duration: 'अवधि',
      instructions: 'निर्देश',
      generalInstructions: 'सामान्य निर्देश',
      dietaryAdvice: 'आहार सलाह',
      followUp: 'फॉलो-अप तिथि',
      downloadBtn: 'छवि के रूप में डाउनलोड करें',
      downloading: 'डाउनलोड हो रहा है...',
      downloaded: 'डाउनलोड हो गया!',
      aiNote: '✨ डॉक्टर की हस्तलेखन से AI द्वारा डिकोड - चिकित्सा सलाह नहीं',
      showPharmacy: 'इसे अपनी फार्मेसी में दिखाएं',
    },
    bengali: {
      title: 'প্রেসক্রিপশন প্রস্তুত - AI ডিকোড',
      subtitle: 'আপনার প্রেসক্রিপশন ডিকোড এবং অনুবাদ করা হয়েছে',
      originalRx: 'মূল প্রেসক্রিপশন',
      decodedRx: 'AI ডিকোড প্রেসক্রিপশন',
      medicines: 'ওষুধ',
      medicine: 'ওষুধ',
      dosage: 'ডোজ',
      frequency: 'ফ্রিকোয়েন্সি',
      duration: 'সময়কাল',
      instructions: 'নির্দেশাবলী',
      generalInstructions: 'সাধারণ নির্দেশাবলী',
      dietaryAdvice: 'খাদ্য পরামর্শ',
      followUp: 'ফলো-আপ তারিখ',
      downloadBtn: 'ছবি হিসেবে ডাউনলোড করুন',
      downloading: 'ডাউনলোড হচ্ছে...',
      downloaded: 'ডাউনলোড সম্পন্ন!',
      aiNote: '✨ ডাক্তারের হাতের লেখা থেকে AI ডিকোড - চিকিৎসা পরামর্শ নয়',
      showPharmacy: 'আপনার ফার্মেসিতে এটি দেখান',
    },
  };

  const t = translations[language];

  const handleDownload = async () => {
    setIsDownloading(true);

    try {
      // Create a canvas to combine the prescription image and AI decoded text
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      if (!ctx) return;

      // Set canvas size (A4 ratio)
      canvas.width = 1240;
      canvas.height = 1754;

      // White background
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Header section
      ctx.fillStyle = '#10b981';
      ctx.fillRect(0, 0, canvas.width, 100);
      
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 32px Arial';
      ctx.fillText(t.title, 40, 60);

      // Patient and Doctor info
      ctx.fillStyle = '#1f2937';
      ctx.font = '20px Arial';
      ctx.fillText(`Patient: ${patientName}`, 40, 150);
      ctx.fillText(`Doctor: Dr. ${doctorName}`, 40, 185);
      ctx.fillText(`Date: ${consultationDate}`, 40, 220);

      let yPosition = 270;

      // Original prescription image (if available)
      if (prescriptionImage) {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        
        await new Promise((resolve) => {
          img.onload = () => {
            ctx.fillStyle = '#f3f4f6';
            ctx.fillRect(40, yPosition, canvas.width - 80, 30);
            ctx.fillStyle = '#1f2937';
            ctx.font = 'bold 18px Arial';
            ctx.fillText(t.originalRx, 50, yPosition + 20);
            
            yPosition += 40;
            
            // Draw prescription image (scaled to fit)
            const maxWidth = canvas.width - 80;
            const maxHeight = 400;
            const scale = Math.min(maxWidth / img.width, maxHeight / img.height);
            const scaledWidth = img.width * scale;
            const scaledHeight = img.height * scale;
            
            ctx.drawImage(img, 40, yPosition, scaledWidth, scaledHeight);
            yPosition += scaledHeight + 40;
            
            resolve(true);
          };
          img.src = prescriptionImage;
        });
      }

      // AI Decoded Section Header
      ctx.fillStyle = '#f3f4f6';
      ctx.fillRect(40, yPosition, canvas.width - 80, 40);
      ctx.fillStyle = '#10b981';
      ctx.font = 'bold 22px Arial';
      ctx.fillText(`✨ ${t.decodedRx}`, 50, yPosition + 28);
      
      yPosition += 60;

      // Medicines
      ctx.fillStyle = '#1f2937';
      ctx.font = 'bold 20px Arial';
      ctx.fillText(`${t.medicines}:`, 50, yPosition);
      yPosition += 35;

      aiDecodedData.medicines.forEach((med, index) => {
        // Medicine box background
        ctx.fillStyle = '#f9fafb';
        ctx.fillRect(50, yPosition, canvas.width - 100, 140);
        ctx.strokeStyle = '#e5e7eb';
        ctx.lineWidth = 2;
        ctx.strokeRect(50, yPosition, canvas.width - 100, 140);

        ctx.fillStyle = '#1f2937';
        ctx.font = 'bold 18px Arial';
        ctx.fillText(`${index + 1}. ${med.name}`, 70, yPosition + 30);

        ctx.font = '16px Arial';
        ctx.fillStyle = '#4b5563';
        ctx.fillText(`${t.dosage}: ${med.dosage}`, 70, yPosition + 60);
        ctx.fillText(`${t.frequency}: ${med.frequency}`, 70, yPosition + 85);
        ctx.fillText(`${t.duration}: ${med.duration}`, 70, yPosition + 110);

        yPosition += 160;
      });

      // General Instructions
      if (aiDecodedData.generalInstructions) {
        ctx.fillStyle = '#1f2937';
        ctx.font = 'bold 18px Arial';
        ctx.fillText(`${t.generalInstructions}:`, 50, yPosition);
        yPosition += 30;
        
        ctx.font = '16px Arial';
        ctx.fillStyle = '#4b5563';
        const instructions = aiDecodedData.generalInstructions;
        const words = instructions.split(' ');
        let line = '';
        
        words.forEach((word) => {
          const testLine = line + word + ' ';
          const metrics = ctx.measureText(testLine);
          if (metrics.width > canvas.width - 120) {
            ctx.fillText(line, 70, yPosition);
            line = word + ' ';
            yPosition += 25;
          } else {
            line = testLine;
          }
        });
        ctx.fillText(line, 70, yPosition);
        yPosition += 40;
      }

      // Footer - AI Note
      yPosition = canvas.height - 100;
      ctx.fillStyle = '#fef3c7';
      ctx.fillRect(0, yPosition, canvas.width, 60);
      ctx.fillStyle = '#92400e';
      ctx.font = '14px Arial';
      ctx.fillText(t.aiNote, 40, yPosition + 35);

      // Pharmacy note
      ctx.fillStyle = '#10b981';
      ctx.font = 'bold 16px Arial';
      ctx.fillText(t.showPharmacy, 40, canvas.height - 20);

      // Download the canvas as image
      canvas.toBlob((blob) => {
        if (blob) {
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.download = `prescription-${patientName.replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.png`;
          link.href = url;
          link.click();
          URL.revokeObjectURL(url);
          
          setDownloaded(true);
          setTimeout(() => setDownloaded(false), 3000);
        }
      });
    } catch (error) {
      console.error('Download error:', error);
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
      {/* Header */}
      <div className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white p-6 relative">
        {!isPreview && onClose && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 hover:bg-white/20 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        )}
        <div className="flex items-center gap-3">
          <div className="p-3 bg-white/20 rounded-lg backdrop-blur-sm">
            <Sparkles className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">{t.title}</h2>
            <p className="text-emerald-50 text-sm mt-1">{t.subtitle}</p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Patient Info */}
        <div className="bg-gray-50 rounded-lg p-4 space-y-2">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-gray-600" />
            <span className="text-sm text-gray-600">Patient: <span className="font-semibold text-gray-900">{patientName}</span></span>
          </div>
          <div className="text-sm text-gray-600">Doctor: <span className="font-semibold text-gray-900">Dr. {doctorName}</span></div>
          <div className="text-sm text-gray-600">Date: <span className="font-semibold text-gray-900">{consultationDate}</span></div>
        </div>

        {/* Original Prescription Image */}
        {prescriptionImage && (
          <div className="space-y-2">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <FileText className="w-5 h-5 text-emerald-600" />
              {t.originalRx}
            </h3>
            <div className="border-2 border-gray-200 rounded-lg overflow-hidden">
              <img 
                src={prescriptionImage} 
                alt="Original Prescription" 
                className="w-full h-auto"
              />
            </div>
          </div>
        )}

        {/* AI Decoded Section */}
        <div className="space-y-4">
          <div className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-lg p-4">
            <h3 className="font-bold text-gray-900 flex items-center gap-2 text-lg">
              <Sparkles className="w-5 h-5 text-emerald-600" />
              {t.decodedRx}
            </h3>
            <p className="text-xs text-amber-700 mt-2 flex items-center gap-1">
              {t.aiNote}
            </p>
          </div>

          {/* Medicines List */}
          <div className="space-y-3">
            <h4 className="font-semibold text-gray-900">{t.medicines}:</h4>
            {aiDecodedData.medicines.map((medicine, index) => (
              <div key={index} className="bg-gray-50 rounded-lg p-4 border-l-4 border-emerald-500">
                <div className="font-semibold text-gray-900 mb-2">
                  {index + 1}. {medicine.name}
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="text-gray-600">
                    <span className="font-medium">{t.dosage}:</span> {medicine.dosage}
                  </div>
                  <div className="text-gray-600">
                    <span className="font-medium">{t.frequency}:</span> {medicine.frequency}
                  </div>
                  <div className="text-gray-600">
                    <span className="font-medium">{t.duration}:</span> {medicine.duration}
                  </div>
                </div>
                {medicine.instructions && (
                  <div className="mt-2 text-sm text-gray-700">
                    <span className="font-medium">{t.instructions}:</span> {medicine.instructions}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* General Instructions */}
          {aiDecodedData.generalInstructions && (
            <div className="bg-blue-50 rounded-lg p-4">
              <h4 className="font-semibold text-gray-900 mb-2">{t.generalInstructions}:</h4>
              <p className="text-sm text-gray-700">{aiDecodedData.generalInstructions}</p>
            </div>
          )}

          {/* Dietary Advice */}
          {aiDecodedData.dietaryAdvice && (
            <div className="bg-amber-50 rounded-lg p-4">
              <h4 className="font-semibold text-gray-900 mb-2">{t.dietaryAdvice}:</h4>
              <p className="text-sm text-gray-700">{aiDecodedData.dietaryAdvice}</p>
            </div>
          )}

          {/* Follow-up Date */}
          {aiDecodedData.followUpDate && (
            <div className="bg-purple-50 rounded-lg p-4">
              <h4 className="font-semibold text-gray-900 mb-2">{t.followUp}:</h4>
              <p className="text-sm text-gray-700">{aiDecodedData.followUpDate}</p>
            </div>
          )}
        </div>

        {/* Pharmacy Note */}
        <div className="bg-emerald-100 border-2 border-emerald-300 rounded-lg p-4 text-center">
          <p className="text-emerald-900 font-semibold">
            💊 {t.showPharmacy}
          </p>
        </div>
      </div>

      {/* Footer - Download Button */}
      <div className="border-t p-4 bg-gray-50 space-y-4">
        {/* Health Tip Section */}
        <TemplateDisplay placement="notif-ai-rx-analysis" className="mb-0" />
        
        <Button
          onClick={handleDownload}
          disabled={isDownloading || downloaded}
          className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
        >
          {downloaded ? (
            <>
              <Check className="w-4 h-4 mr-2" />
              {t.downloaded}
            </>
          ) : isDownloading ? (
            <>
              <Download className="w-4 h-4 mr-2 animate-bounce" />
              {t.downloading}
            </>
          ) : (
            <>
              <Download className="w-4 h-4 mr-2" />
              {t.downloadBtn}
            </>
          )}
        </Button>
      </div>
    </div>
  );
};
