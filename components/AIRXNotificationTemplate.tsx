import React from 'react';
import { Sparkles, Download, AlertCircle } from 'lucide-react';

interface AIRXNotificationTemplateProps {
  patientName: string;
  doctorName: string;
  decodedText: string;
  reportUrl?: string; // For future use if needed
}

/**
 * Notification template shown in Preview Center when patient receives FCM notification
 * Contains downloadable prescription report with AI decoded text
 */
export const AIRXNotificationTemplate: React.FC<AIRXNotificationTemplateProps> = ({
  patientName,
  doctorName,
  decodedText,
  reportUrl,
}) => {
  return (
    <div className="bg-gradient-to-br from-purple-50 via-pink-50 to-indigo-50 rounded-lg shadow-lg overflow-hidden border-2 border-purple-200">
      {/* Notification Header */}
      <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
            <Sparkles className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold">🎉 Your Prescription is Ready!</h2>
            <p className="text-sm text-purple-100">AI Decoded Prescription from Dr. {doctorName}</p>
          </div>
        </div>
      </div>

      {/* Notification Body */}
      <div className="p-6 space-y-4">
        {/* Greeting */}
        <div className="text-gray-800">
          <p className="text-lg font-semibold">Dear {patientName},</p>
          <p className="text-sm mt-2 text-gray-600">
            Your doctor has sent you an AI-decoded prescription for easy understanding and pharmacy submission.
          </p>
        </div>

        {/* Decoded Preview */}
        <div className="bg-white rounded-lg border-2 border-purple-200 overflow-hidden">
          <div className="bg-purple-100 px-4 py-2 border-b border-purple-200">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-purple-600" />
              <span className="font-semibold text-gray-900 text-sm">AI Decoded Prescription Preview</span>
            </div>
          </div>
          <div className="p-4">
            <div className="bg-gray-50 rounded border border-gray-200 p-3 max-h-32 overflow-y-auto">
              <pre className="text-xs font-mono text-gray-700 whitespace-pre-wrap line-clamp-4">
                {decodedText.substring(0, 200)}...
              </pre>
            </div>
          </div>
        </div>

        {/* Download Button */}
        <div className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-lg p-4 text-center">
          <Download className="w-8 h-8 mx-auto mb-2" />
          <div className="font-bold text-lg mb-1">Download Full Report</div>
          <div className="text-sm text-emerald-100 mb-3">
            Includes original prescription image & complete AI analysis
          </div>
          <button className="bg-white text-emerald-600 px-6 py-2 rounded-lg font-bold hover:bg-emerald-50 transition-colors">
            📥 Download Now
          </button>
        </div>

        {/* Important Notice */}
        <div className="bg-amber-50 border-2 border-amber-300 rounded-lg p-3">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
            <div className="text-xs text-amber-900">
              <div className="font-bold mb-1">⚠️ Important: One-Time Download Only</div>
              <ul className="space-y-0.5 text-xs">
                <li>• No storage - Save this report to your device immediately</li>
                <li>• This notification expires after download</li>
                <li>• AI may make mistakes - verify with doctor if unclear</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-xs text-gray-500 pt-2 border-t border-gray-200">
          Powered by <span className="font-bold text-purple-600">healQR.com</span> • Digital Healthcare Solutions
        </div>
      </div>
    </div>
  );
};

