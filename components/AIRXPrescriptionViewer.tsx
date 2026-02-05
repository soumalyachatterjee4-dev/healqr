/**
 * AI RX Prescription Viewer Component
 * Displays AI-decoded prescription sent by doctor via FCM
 * One-time view only - no storage
 */

import React, { useEffect, useState } from 'react';
import { X, Download, AlertCircle, CheckCircle, Sparkles } from 'lucide-react';
import { Button } from './ui/button';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase/config';
import { AIRXReportTemplate } from './AIRXReportTemplate';
import { toast } from 'sonner';

interface AIRXPrescriptionViewerProps {
  notificationId: string;
  onClose: () => void;
}

export const AIRXPrescriptionViewer: React.FC<AIRXPrescriptionViewerProps> = ({
  notificationId,
  onClose,
}) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [prescriptionData, setPrescriptionData] = useState<any>(null);
  const [hasDownloaded, setHasDownloaded] = useState(false);

  useEffect(() => {
    loadPrescription();
  }, [notificationId]);

  const loadPrescription = async () => {
    try {
      if (!db) {
        throw new Error('Firebase not configured');
      }

      const notifRef = doc(db, 'notifications', notificationId);
      const notifDoc = await getDoc(notifRef);

      if (!notifDoc.exists()) {
        throw new Error('Prescription not found');
      }

      const data = notifDoc.data();

      // Check if already viewed/downloaded
      if (data.read && data.expiresAfterDownload) {
        setError('This prescription has already been viewed and is no longer available.');
        setLoading(false);
        return;
      }

      setPrescriptionData(data);
      setLoading(false);

      // Mark as read
      await updateDoc(notifRef, {
        read: true,
        readAt: serverTimestamp(),
      });

    } catch (err: any) {
      console.error('❌ Error loading prescription:', err);
      setError(err.message || 'Failed to load prescription');
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    if (!prescriptionData || hasDownloaded) return;

    try {
      // Create a download link for the image
      const link = document.createElement('a');
      link.href = prescriptionData.prescriptionImage;
      link.download = `prescription-${prescriptionData.doctorName}-${new Date().toISOString().split('T')[0]}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setHasDownloaded(true);

      toast.success('Prescription downloaded successfully');

      // Mark as expired after download if configured
      if (prescriptionData.expiresAfterDownload && db) {
        await updateDoc(doc(db, 'notifications', notificationId), {
          expired: true,
          expiredAt: serverTimestamp(),
        });

        toast.info('This prescription will no longer be accessible', {
          description: 'One-time download completed'
        });
      }

    } catch (err) {
      console.error('❌ Download error:', err);
      toast.error('Failed to download prescription');
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto mb-4"></div>
          <div className="text-gray-600">Loading prescription...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg p-8 max-w-md text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-gray-900 mb-2">Unable to Load</h3>
          <p className="text-gray-600 mb-6">{error}</p>
          <Button onClick={onClose} className="w-full">
            Close
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-lg shadow-2xl max-w-4xl w-full my-8">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white p-6 relative rounded-t-lg">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 hover:bg-white/20 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-white/20 rounded-lg backdrop-blur-sm">
              <Sparkles className="w-8 h-8" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">AI-Decoded Prescription</h2>
              <p className="text-emerald-50 text-sm mt-1">
                From Dr. {prescriptionData?.doctorName}
              </p>
            </div>
          </div>
        </div>

        {/* One-time warning */}
        {prescriptionData?.expiresAfterDownload && !hasDownloaded && (
          <div className="bg-amber-50 border-l-4 border-amber-500 p-4 m-4">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-amber-900">
                <div className="font-bold mb-1">⚠️ One-Time View Only</div>
                <div>
                  This prescription will be permanently deleted after you download it. 
                  Make sure to save it to your device.
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Success message after download */}
        {hasDownloaded && (
          <div className="bg-emerald-50 border-l-4 border-emerald-500 p-4 m-4">
            <div className="flex items-start gap-2">
              <CheckCircle className="w-5 h-5 text-emerald-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-emerald-900">
                <div className="font-bold mb-1">✅ Downloaded Successfully</div>
                <div>
                  Your prescription has been saved to your device. 
                  This notification will no longer be accessible.
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Prescription Report */}
        <div className="p-6 max-h-[600px] overflow-y-auto">
          {prescriptionData && (
            <AIRXReportTemplate
              patientName={prescriptionData.patientName}
              doctorName={prescriptionData.doctorName}
              date={new Date().toLocaleDateString('en-GB', {
                day: '2-digit',
                month: 'short',
                year: 'numeric'
              })}
              decodedText={prescriptionData.decodedText}
              ocrConfidence={prescriptionData.ocrConfidence}
              originalImageUrl={prescriptionData.prescriptionImage}
            />
          )}
        </div>

        {/* Footer Actions */}
        <div className="border-t p-4 bg-gray-50 flex gap-3 rounded-b-lg">
          <Button
            onClick={onClose}
            variant="outline"
            className="flex-1"
          >
            Close
          </Button>
          <Button
            onClick={handleDownload}
            disabled={hasDownloaded}
            className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            <Download className="w-4 h-4 mr-2" />
            {hasDownloaded ? 'Downloaded' : 'Download Prescription'}
          </Button>
        </div>
      </div>
    </div>
  );
};
