import { FileText, Download, User, Calendar, CheckCircle2 } from 'lucide-react';
import { Button } from './ui/button';
import { toast } from 'sonner';
import TemplateDisplay from './TemplateDisplay';

interface RXDownloadNotificationProps {
  patientName?: string;
  doctorName?: string;
  consultationDate?: string;
  rxImageUrl?: string;
  isPreview?: boolean;
}

export default function RXDownloadNotification({
  patientName = 'Rajesh Kumar',
  doctorName = 'Dr. Priya Sharma',
  consultationDate = 'November 14, 2025',
  rxImageUrl = '',
  isPreview = false,
}: RXDownloadNotificationProps) {
  const handleDownloadRX = async () => {
    if (isPreview) {
      toast.success('Preview Mode: Download would start here');
      return;
    }

    if (!rxImageUrl) {
      toast.error('No prescription available to download');
      return;
    }

    try {
      // Download as image (JPG/PNG)
      const response = await fetch(rxImageUrl);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      // Get file extension from URL or default to .jpg
      const extension = rxImageUrl.match(/\.(jpg|jpeg|png)$/i)?.[1] || 'jpg';
      link.download = `prescription-${patientName.replace(/\s+/g, '-')}-${Date.now()}.${extension}`;
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      toast.success('Prescription downloaded successfully!');
    } catch (error) {
      toast.error('Failed to download prescription');
      console.error('Download error:', error);
    }
  };

  const handleViewRX = () => {
    if (isPreview) {
      toast.info('Preview Mode: Prescription viewer would open here');
      return;
    }

    if (!rxImageUrl) {
      toast.error('No prescription available to view');
      return;
    }

    // Open in new tab to view
    window.open(rxImageUrl, '_blank');
  };

  return (
    <div className="w-full max-w-md mx-auto bg-gradient-to-br from-emerald-500/20 via-teal-500/20 to-cyan-500/20 border-2 border-emerald-500/40 backdrop-blur-lg rounded-3xl shadow-2xl p-6">
      {/* Header Icon */}
      <div className="flex justify-center mb-4">
        <div className="w-20 h-20 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-full flex items-center justify-center shadow-lg relative">
          <FileText className="w-10 h-10 text-white" />
          <div className="absolute -top-1 -right-1 w-7 h-7 bg-green-400 rounded-full flex items-center justify-center border-2 border-white">
            <CheckCircle2 className="w-4 h-4 text-white" />
          </div>
        </div>
      </div>

      {/* Title */}
      <h2 className="text-center text-white mb-2">
        Prescription Ready! 💊
      </h2>
      <p className="text-center text-gray-200 text-sm mb-6">
        Your doctor has sent your prescription
      </p>

      {/* Consultation Details Card */}
      <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-5 mb-5 space-y-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-500/20 rounded-full flex items-center justify-center">
            <User className="w-5 h-5 text-blue-300" />
          </div>
          <div>
            <p className="text-gray-300 text-xs">Patient</p>
            <p className="text-white font-medium">{patientName}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-emerald-500/20 rounded-full flex items-center justify-center">
            <User className="w-5 h-5 text-emerald-300" />
          </div>
          <div>
            <p className="text-gray-300 text-xs">Prescribed by</p>
            <p className="text-white font-medium">{doctorName}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-purple-500/20 rounded-full flex items-center justify-center">
            <Calendar className="w-5 h-5 text-purple-300" />
          </div>
          <div>
            <p className="text-gray-300 text-xs">Consultation Date</p>
            <p className="text-white font-medium">{consultationDate}</p>
          </div>
        </div>
      </div>

      {/* Prescription Preview */}
      {!isPreview && rxImageUrl && (
        <div className="bg-white/5 border border-white/10 rounded-xl p-3 mb-5">
          <img 
            src={rxImageUrl} 
            alt="Prescription Preview" 
            className="w-full h-40 object-contain rounded-lg bg-white/10"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
        </div>
      )}

      {/* Mock Preview for Preview Mode */}
      {isPreview && (
        <div className="bg-white/5 border border-white/10 rounded-xl p-3 mb-5 flex items-center justify-center h-40">
          <FileText className="w-16 h-16 text-emerald-300 opacity-50" />
        </div>
      )}

      {/* Important Note */}
      <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4 mb-5">
        <div className="flex items-start gap-2">
          <svg className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <p className="text-blue-300 text-sm font-medium mb-1">Important:</p>
            <ul className="text-blue-200 text-xs space-y-1">
              <li>• Follow the prescribed dosage carefully</li>
              <li>• Complete the full course of medication</li>
              <li>• Contact doctor for any side effects</li>
              <li>• Keep prescription for future reference</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Health Tip Section */}
      <div className="mb-5">
        <TemplateDisplay placement="notif-rx-download" className="mb-0" />
      </div>

      {/* Action Buttons */}
      <div className="space-y-3">
        <Button
          onClick={handleDownloadRX}
          className="w-full h-14 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white shadow-lg shadow-emerald-500/30 rounded-xl transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
        >
          <Download className="w-5 h-5 mr-2" />
          <span className="text-lg">Download Prescription</span>
        </Button>

        <Button
          onClick={handleViewRX}
          variant="outline"
          className="w-full h-12 bg-white/5 border-2 border-emerald-500/40 text-emerald-300 hover:bg-white/10 rounded-xl transition-all duration-300"
        >
          <FileText className="w-5 h-5 mr-2" />
          View Full Prescription
        </Button>
      </div>

      {/* Preview Mode Indicator */}
      {isPreview && (
        <div className="mt-4 text-center">
          <span className="inline-block bg-blue-500/20 border border-blue-500/40 text-blue-300 text-xs px-3 py-1 rounded-full">
            📱 Template Preview
          </span>
        </div>
      )}

      {/* Footer */}
      <div className="mt-5 pt-4 border-t border-white/10 text-center">
        <p className="text-gray-300 text-xs">
          Powered by <span className="text-emerald-400 font-semibold">HealQR</span>
        </p>
        <p className="text-gray-400 text-xs mt-1">
          Available in JPG & PNG formats
        </p>
      </div>
    </div>
  );
}

