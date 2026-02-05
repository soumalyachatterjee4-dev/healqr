import React from 'react';
import { Sparkles } from 'lucide-react';

interface AIRXReportTemplateProps {
  patientName: string;
  doctorName: string;
  date: string;
  decodedText: string;
  ocrConfidence: number;
  originalImageUrl: string;
}

export const AIRXReportTemplate: React.FC<AIRXReportTemplateProps> = ({
  patientName,
  doctorName,
  date,
  decodedText,
  ocrConfidence,
  originalImageUrl,
}) => {
  return (
    <div className="bg-white w-full max-w-4xl mx-auto" id="ai-rx-report">
      {/* Letterhead */}
      <div className="border-b-4 border-gradient-purple-pink pb-4 mb-6">
        <div className="flex items-start justify-between">
          {/* Logo - Left Top */}
          <div className="flex items-center gap-2">
            <img
              src="/healqr-logo.png"
              alt="HealQR"
              className="h-12 w-12"
              onError={(e) => {
                // Fallback if logo not found
                e.currentTarget.style.display = 'none';
              }}
            />
            <div>
              <div className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                HealQR
              </div>
              <div className="text-xs text-gray-500">Digital Healthcare Solutions</div>
            </div>
          </div>

          {/* Date - Right Top */}
          <div className="text-right text-sm text-gray-600">
            <div className="font-semibold">Report Date</div>
            <div>{date}</div>
          </div>
        </div>

        {/* Main Heading - Center */}
        <div className="text-center mt-6">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Sparkles className="w-6 h-6 text-purple-600" />
            <h1 className="text-3xl font-bold text-gray-900">
              AI RX Reader Report
            </h1>
            <Sparkles className="w-6 h-6 text-purple-600" />
          </div>
          <p className="text-sm text-gray-600">
            AI-Powered Prescription Decoding & Analysis
          </p>
        </div>
      </div>

      {/* Report Body */}
      <div className="space-y-6 px-6">
        {/* Patient & Doctor Info */}
        <div className="grid grid-cols-2 gap-4 bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-lg border border-blue-200">
          <div>
            <div className="text-xs text-gray-600 font-semibold mb-1">Patient Name</div>
            <div className="text-base font-bold text-gray-900">{patientName}</div>
          </div>
          <div>
            <div className="text-xs text-gray-600 font-semibold mb-1">Prescribed By</div>
            <div className="text-base font-bold text-gray-900">Dr. {doctorName}</div>
          </div>
        </div>

        {/* OCR Confidence Badge */}
        <div className="flex items-center justify-between bg-gradient-to-r from-emerald-50 to-teal-50 p-4 rounded-lg border border-emerald-200">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-emerald-600" />
            <span className="font-semibold text-gray-900">AI Decoding Confidence</span>
          </div>
          <div className={`px-4 py-2 rounded-full text-base font-bold ${
            ocrConfidence >= 80 ? 'bg-emerald-500 text-white' :
            ocrConfidence >= 60 ? 'bg-amber-500 text-white' :
            'bg-red-500 text-white'
          }`}>
            {ocrConfidence}%
          </div>
        </div>

        {/* Decoded Prescription Text */}
        <div className="border-2 border-gray-300 rounded-lg overflow-hidden">
          <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-4 py-3">
            <h2 className="text-lg font-bold">Decoded Prescription</h2>
            <p className="text-sm text-purple-100">Extracted from handwritten prescription</p>
          </div>
          <div className="p-6 bg-white">
            <pre className="whitespace-pre-wrap font-sans text-sm text-gray-800 leading-relaxed">
              {decodedText || 'No text could be decoded from the image.'}
            </pre>
          </div>
        </div>

        {/* Original Prescription Image */}
        <div className="border-2 border-gray-300 rounded-lg overflow-hidden">
          <div className="bg-gray-100 px-4 py-2 border-b">
            <h3 className="font-semibold text-gray-900">Original Prescription Image</h3>
          </div>
          <div className="p-4 bg-white text-center">
            <img
              src={originalImageUrl}
              alt="Original Prescription"
              className="max-w-full mx-auto rounded border-2 border-gray-200"
            />
          </div>
        </div>

        {/* Important Disclaimer */}
        <div className="bg-amber-50 border-2 border-amber-300 rounded-lg p-4">
          <div className="flex items-start gap-2">
            <div className="text-amber-600 text-xl">⚠️</div>
            <div className="text-sm text-amber-900">
              <div className="font-bold mb-2">Important Medical Disclaimer:</div>
              <ul className="space-y-1 list-disc list-inside">
                <li>This report is AI-generated for informational purposes only</li>
                <li>AI decoding may contain errors - always verify with original prescription</li>
                <li>This is NOT a substitute for professional medical advice</li>
                <li>Consult your doctor or pharmacist for any clarifications</li>
                <li><strong>One-time delivery - Save this report, no future downloads available</strong></li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-8 pt-4 border-t-2 border-gray-200 text-center pb-6">
        <div className="text-sm text-gray-500 mb-1">
          Powered by <span className="font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">healQR.com</span>
        </div>
        <div className="text-xs text-gray-400">
          Digital Healthcare Solutions • AI-Powered Prescription Management
        </div>
      </div>
    </div>
  );
};
