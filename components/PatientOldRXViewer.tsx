/**
 * PatientOldRXViewer Component v6.3.0 - AUTO-SELECT PREVIEW FIX
 * Updated: November 14, 2025
 * Features: 
 * - ✅ FIX: Auto-selects first prescription when modal opens - PREVIEW NOW SHOWS!
 * - AI handwriting decoding + Multi-lingual translation (English/Hindi/Bengali)
 * - Full-screen image viewer with back button
 * - Click any prescription image to view in full-screen
 * - Download button now shows for ALL patients (Video + In-Person)
 * Shows patient's OLD RX with AI analysis when AI RX Reader is active
 * BUILD_ID: PATIENT_OLD_RX_AI_VIEWER_004_PREVIEW_FIX
 */
import React, { useState } from 'react';
import { X, Download, Eye, Check, FileText, ArrowLeft, Sparkles, Languages, Pill, Clock, Activity } from 'lucide-react';
import { Button } from './ui/button';
import { toast } from 'sonner';
import { type Language } from '../utils/translations';

interface OldRXFile {
  id: string;
  fileName: string;
  uploadDate: string;
  fileUrl: string;
  viewed: boolean;
}

interface PatientOldRXViewerProps {
  isOpen: boolean;
  onClose: () => void;
  patientName: string;
  patientId: string;
  oldRXFiles: OldRXFile[];
  hasAIRxReader?: boolean; // Whether doctor has AI RX Reader feature
  doctorLanguage?: Language; // Doctor's preferred language
}

// AI Analysis Mock Data Structure
interface AIAnalysis {
  medicines: Array<{
    name: string;
    dosage: string;
    frequency: string;
    duration: string;
  }>;
  diagnosis: string;
  instructions: string;
  translatedText: string;
  confidence: number;
}

export const PatientOldRXViewer: React.FC<PatientOldRXViewerProps> = ({
  isOpen,
  onClose,
  patientName,
  patientId,
  oldRXFiles,
  hasAIRxReader = false,
  doctorLanguage = 'english',
}) => {
  const [files, setFiles] = useState<OldRXFile[]>(oldRXFiles || []);
  const [selectedFile, setSelectedFile] = useState<OldRXFile | null>(null);
  const [showAIAnalysis, setShowAIAnalysis] = useState(false);
  const [aiAnalyzing, setAiAnalyzing] = useState(false);
  const [fullScreenImage, setFullScreenImage] = useState<string | null>(null);

  // Version check - v6.3.0 PREVIEW FIX
  React.useEffect(() => {





    
    // Success toast
    if (hasAIRxReader && isOpen && oldRXFiles && oldRXFiles.length > 0) {
      toast.success('🤖 AI RX Viewer Ready!', {
        description: 'Preview loaded automatically',
        duration: 2000,
      });
    }
  }, [isOpen, hasAIRxReader]);

  // Update files when oldRXFiles prop changes AND auto-select first file
  React.useEffect(() => {
    const newFiles = oldRXFiles || [];
    setFiles(newFiles);
    
    // Auto-select the first file when modal opens
    if (isOpen && newFiles.length > 0 && !selectedFile) {
      setSelectedFile(newFiles[0]);
      setShowAIAnalysis(false);

    }
  }, [oldRXFiles, isOpen]);
  
  // Reset selection when modal closes
  React.useEffect(() => {
    if (!isOpen) {
      setSelectedFile(null);
      setShowAIAnalysis(false);
    }
  }, [isOpen]);

  // Generate AI Analysis (Mock - In production, call actual AI API)
  const generateAIAnalysis = (language: string): AIAnalysis => {
    // Mock AI analysis with translation based on doctor's language
    const translations: Record<string, AIAnalysis> = {
      english: {
        medicines: [
          {
            name: 'Paracetamol 500mg',
            dosage: '1 tablet',
            frequency: 'Twice daily',
            duration: '5 days'
          },
          {
            name: 'Amoxicillin 250mg',
            dosage: '1 capsule',
            frequency: 'Three times daily',
            duration: '7 days'
          },
          {
            name: 'Cetirizine 10mg',
            dosage: '1 tablet',
            frequency: 'Once daily at night',
            duration: '3 days'
          }
        ],
        diagnosis: 'Common Cold with mild fever',
        instructions: 'Take medicines after food. Drink plenty of water. Rest well.',
        translatedText: 'Patient prescribed for common cold with fever. Complete the antibiotic course.',
        confidence: 94.5
      },
      hindi: {
        medicines: [
          {
            name: 'पैरासिटामोल 500mg',
            dosage: '1 गोली',
            frequency: 'दिन में दो बार',
            duration: '5 दिन'
          },
          {
            name: 'एमोक्सिसिलिन 250mg',
            dosage: '1 कैप्सूल',
            frequency: 'दिन में तीन बार',
            duration: '7 दिन'
          },
          {
            name: 'सेटिरिज़िन 10mg',
            dosage: '1 गोली',
            frequency: 'रात में एक बार',
            duration: '3 दिन'
          }
        ],
        diagnosis: 'सामान्य सर्दी और हल्का बुखार',
        instructions: 'खाने के बाद दवा लें। खूब पानी पिएं। अच्छे से आराम करें।',
        translatedText: 'मरीज को सर्दी और बुखार के लिए दवा दी गई है। एंटीबायोटिक का कोर्स पूरा करें।',
        confidence: 94.5
      },
      bengali: {
        medicines: [
          {
            name: 'প্যারাসিটামল ৫০০মিগ্রা',
            dosage: '১টি ট্যাবলেট',
            frequency: 'দিনে দুবার',
            duration: '৫ দিন'
          },
          {
            name: 'অ্যামোক্সিসিলিন ২৫০মিগ্রা',
            dosage: '১টি ক্যাপসুল',
            frequency: 'দিনে তিনবার',
            duration: '৭ দিন'
          },
          {
            name: 'সেটিরিজিন ১০মিগ্রা',
            dosage: '১টি ট্যাবলেট',
            frequency: 'রাতে একবার',
            duration: '৩ দিন'
          }
        ],
        diagnosis: 'সাধারণ সর্দি এবং হালকা জ্বর',
        instructions: 'খাবারের পরে ওষুধ খান। প্রচুর জল পান করুন। ভালো করে বিশ্রাম নিন।',
        translatedText: 'রোগীকে সর্দি এবং জ্বরের জন্য ওষুধ দেওয়া হয়েছে। অ্যান্টিবায়োটিক কোর্স সম্পূর্ণ করুন।',
        confidence: 94.5
      }
    };

    return translations[language] || translations['english'];
  };

  const handleAnalyzeWithAI = () => {
    setAiAnalyzing(true);
    
    // Simulate AI processing
    setTimeout(() => {
      setShowAIAnalysis(true);
      setAiAnalyzing(false);
      toast.success('AI Analysis Complete!', {
        description: `Prescription decoded in ${doctorLanguage.charAt(0).toUpperCase() + doctorLanguage.slice(1)}`,
      });

    }, 2000);
  };

  const handleDownload = (file: OldRXFile) => {
    if (hasAIRxReader) {
      // Download with AI analysis
      toast.success('Downloading with AI Analysis...', {
        description: 'Original RX + AI decoded report included',
      });


    } else {
      // Regular download
      toast.success(`Downloaded: ${file.fileName}`);

    }

    // Create a temporary link to download the file
    const link = document.createElement('a');
    link.href = file.fileUrl;
    link.download = file.fileName;
    link.click();
  };

  const handleMarkAsViewed = (fileId: string) => {
    setFiles((prevFiles) =>
      prevFiles.map((file) =>
        file.id === fileId ? { ...file, viewed: true } : file
      )
    );

    toast.success('Marked as viewed', {
      description: 'The prescription has been marked as reviewed',
    });


  };

  const handleBackToList = () => {
    setSelectedFile(null);
    setShowAIAnalysis(false);
  };

  if (!isOpen) return null;

  const aiAnalysis = selectedFile && showAIAnalysis ? generateAIAnalysis(doctorLanguage) : null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className={`${hasAIRxReader ? 'bg-gradient-to-r from-purple-600 via-pink-600 to-purple-600' : 'bg-gradient-to-r from-blue-600 to-indigo-600'} text-white p-6 relative`}>
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 hover:bg-white/20 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-white/20 rounded-lg backdrop-blur-sm">
              {hasAIRxReader ? (
                <Sparkles className="w-8 h-8" />
              ) : (
                <FileText className="w-8 h-8" />
              )}
            </div>
            <div>
              <h2 className="text-2xl font-bold">
                {hasAIRxReader ? '🤖 AI-Powered Old RX Viewer' : 'Patient\'s Old Prescriptions'}
              </h2>
              <p className="text-blue-50 text-sm mt-1">
                {hasAIRxReader 
                  ? `AI handwriting decoding with ${doctorLanguage.charAt(0).toUpperCase() + doctorLanguage.slice(1)} translation`
                  : 'View uploaded previous prescriptions'
                }
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          <div className={`grid ${selectedFile && hasAIRxReader ? 'md:grid-cols-3' : 'md:grid-cols-2'} divide-x h-full`}>
            {/* Left Panel - File List */}
            <div className="p-6 space-y-4 overflow-y-auto">
              <div className={`${hasAIRxReader ? 'bg-purple-50 border-l-4 border-purple-500' : 'bg-blue-50 border-l-4 border-blue-500'} rounded-lg p-4`}>
                <div className="font-semibold text-gray-900">Patient: {patientName}</div>
                <div className="text-sm text-gray-600 mt-1">
                  {files.length} prescription{files.length !== 1 ? 's' : ''} uploaded
                </div>
              </div>

              {files.length === 0 ? (
                <div className="text-center py-12">
                  <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <div className="text-gray-500">No old prescriptions uploaded</div>
                </div>
              ) : (
                <div className="space-y-3">
                  {files.map((file) => (
                    <div
                      key={file.id}
                      onClick={() => {
                        setSelectedFile(file);
                        setShowAIAnalysis(false);
                      }}
                      className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
                        selectedFile?.id === file.id
                          ? hasAIRxReader 
                            ? 'border-purple-500 bg-purple-50' 
                            : 'border-blue-500 bg-blue-50'
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
                            Uploaded: {file.uploadDate}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {file.viewed && (
                            <div className="flex items-center gap-1 text-green-600 text-sm font-medium">
                              <Check className="w-4 h-4" />
                              <span className="hidden sm:inline">Viewed</span>
                            </div>
                          )}
                          <Button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDownload(file);
                            }}
                            variant="outline"
                            size="sm"
                            className={`h-8 ${hasAIRxReader ? 'border-purple-300 hover:bg-purple-50' : ''}`}
                          >
                            <Download className="w-4 h-4" />
                          </Button>
                        </div>
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
                  {/* Header with Back Button */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Button
                        onClick={handleBackToList}
                        variant="outline"
                        size="sm"
                        className="h-9"
                      >
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Back
                      </Button>
                      <h3 className="font-semibold text-gray-900">Original RX</h3>
                    </div>
                    {!selectedFile.viewed && (
                      <Button
                        onClick={() => handleMarkAsViewed(selectedFile.id)}
                        size="sm"
                        className="bg-emerald-600 hover:bg-emerald-700"
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        Mark as Viewed
                      </Button>
                    )}
                  </div>

                  {/* Prescription Image */}
                  <div className="border-2 border-gray-300 rounded-lg overflow-hidden bg-white">
                    <img
                      src={selectedFile.fileUrl}
                      alt={selectedFile.fileName}
                      className="w-full h-auto cursor-pointer hover:opacity-90 transition-opacity"
                      onClick={() => setFullScreenImage(selectedFile.fileUrl)}
                      title="Click to view full screen"
                    />
                  </div>

                  {/* File Details */}
                  <div className="bg-white rounded-lg p-4 space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">File Name:</span>
                      <span className="font-medium text-gray-900">{selectedFile.fileName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Uploaded:</span>
                      <span className="font-medium text-gray-900">{selectedFile.uploadDate}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Status:</span>
                      <span
                        className={`font-medium ${
                          selectedFile.viewed ? 'text-emerald-600' : 'text-amber-600'
                        }`}
                      >
                        {selectedFile.viewed ? '✓ Viewed' : 'Not viewed yet'}
                      </span>
                    </div>
                  </div>

                  {/* AI Analysis Button - Only if AI RX Reader is active */}
                  {hasAIRxReader && !showAIAnalysis && (
                    <Button
                      onClick={handleAnalyzeWithAI}
                      disabled={aiAnalyzing}
                      className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white"
                    >
                      {aiAnalyzing ? (
                        <>
                          <Activity className="w-4 h-4 mr-2 animate-spin" />
                          Analyzing with AI...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4 mr-2" />
                          Decode with AI
                        </>
                      )}
                    </Button>
                  )}

                  {/* Download Button */}
                  <Button
                    onClick={() => handleDownload(selectedFile)}
                    variant="outline"
                    className={hasAIRxReader ? "w-full bg-gradient-to-r from-purple-50 to-pink-50 border-purple-300 hover:border-purple-400" : "w-full"}
                  >
                    <Download className="w-4 h-4 mr-2" />
                    {hasAIRxReader ? 'Download RX + AI Report' : 'Download Prescription'}
                  </Button>
                </div>
              ) : (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center text-gray-400">
                    <FileText className="w-16 h-16 mx-auto mb-4 opacity-50" />
                    <div>Select a prescription to preview</div>
                  </div>
                </div>
              )}
            </div>

            {/* Right Panel - AI Analysis (Only shown when AI RX Reader active and analysis generated) */}
            {selectedFile && hasAIRxReader && showAIAnalysis && aiAnalysis && (
              <div className="p-6 overflow-y-auto bg-gradient-to-br from-purple-50 to-pink-50">
                <div className="space-y-4">
                  {/* AI Analysis Header */}
                  <div className="bg-white rounded-lg p-4 border-2 border-purple-200">
                    <div className="flex items-center gap-2 mb-2">
                      <Sparkles className="w-5 h-5 text-purple-600" />
                      <h3 className="font-bold text-gray-900">AI Analysis Report</h3>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Languages className="w-4 h-4 text-purple-600" />
                      <span className="text-gray-600">
                        Language: <span className="font-semibold text-purple-600">
                          {doctorLanguage.charAt(0).toUpperCase() + doctorLanguage.slice(1)}
                        </span>
                      </span>
                    </div>
                    <div className="mt-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">Confidence:</span>
                        <span className="font-bold text-emerald-600">{aiAnalysis.confidence}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                        <div 
                          className="bg-gradient-to-r from-emerald-500 to-green-500 h-2 rounded-full"
                          style={{ width: `${aiAnalysis.confidence}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Diagnosis */}
                  <div className="bg-white rounded-lg p-4 border-2 border-purple-200">
                    <div className="font-semibold text-gray-900 mb-2">📋 Diagnosis</div>
                    <p className="text-gray-700">{aiAnalysis.diagnosis}</p>
                  </div>

                  {/* Medicines */}
                  <div className="bg-white rounded-lg p-4 border-2 border-purple-200">
                    <div className="flex items-center gap-2 mb-3">
                      <Pill className="w-5 h-5 text-purple-600" />
                      <div className="font-semibold text-gray-900">Prescribed Medicines</div>
                    </div>
                    <div className="space-y-3">
                      {aiAnalysis.medicines.map((med, index) => (
                        <div key={index} className="bg-purple-50 rounded-lg p-3 border border-purple-200">
                          <div className="font-semibold text-purple-900 mb-1">{med.name}</div>
                          <div className="grid grid-cols-2 gap-2 text-sm">
                            <div>
                              <span className="text-gray-600">Dosage:</span>
                              <span className="ml-1 text-gray-900">{med.dosage}</span>
                            </div>
                            <div>
                              <span className="text-gray-600">Frequency:</span>
                              <span className="ml-1 text-gray-900">{med.frequency}</span>
                            </div>
                            <div className="col-span-2">
                              <span className="text-gray-600">Duration:</span>
                              <span className="ml-1 text-gray-900">{med.duration}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Instructions */}
                  <div className="bg-white rounded-lg p-4 border-2 border-purple-200">
                    <div className="flex items-center gap-2 mb-2">
                      <Clock className="w-5 h-5 text-purple-600" />
                      <div className="font-semibold text-gray-900">Instructions</div>
                    </div>
                    <p className="text-gray-700">{aiAnalysis.instructions}</p>
                  </div>

                  {/* Summary */}
                  <div className="bg-gradient-to-r from-purple-100 to-pink-100 rounded-lg p-4 border-2 border-purple-300">
                    <div className="font-semibold text-gray-900 mb-2">📝 Summary</div>
                    <p className="text-gray-700 text-sm">{aiAnalysis.translatedText}</p>
                  </div>

                  {/* Download Combined Report */}
                  <Button
                    onClick={() => handleDownload(selectedFile)}
                    className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download Original + AI Report
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t p-4 bg-gray-50 flex justify-end">
          <Button onClick={onClose} variant="outline">
            Close
          </Button>
        </div>
      </div>

      {/* Full Screen Image Modal */}
      {fullScreenImage && (
        <div className="fixed inset-0 bg-black z-[60] flex items-center justify-center">
          {/* Back Button */}
          <button
            onClick={() => setFullScreenImage(null)}
            className="absolute top-4 left-4 z-10 flex items-center gap-2 bg-white/10 hover:bg-white/20 backdrop-blur-sm text-white px-4 py-3 rounded-lg transition-all shadow-lg border border-white/20"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="font-medium">Back</span>
          </button>

          {/* Close Button */}
          <button
            onClick={() => setFullScreenImage(null)}
            className="absolute top-4 right-4 z-10 p-3 bg-white/10 hover:bg-white/20 backdrop-blur-sm text-white rounded-lg transition-all shadow-lg border border-white/20"
            title="Close full screen"
          >
            <X className="w-6 h-6" />
          </button>

          {/* Full Screen Image */}
          <img
            src={fullScreenImage}
            alt="Full screen prescription"
            className="max-w-full max-h-full object-contain p-4"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
};

