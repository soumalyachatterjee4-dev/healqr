import { Dialog, DialogContent, DialogTitle, DialogDescription } from './ui/dialog';
import { Button } from './ui/button';
import { Info, CheckCircle } from 'lucide-react';

interface RestorationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  patientName?: string;
}

export default function RestorationModal({
  isOpen,
  onClose,
  onConfirm,
  patientName = 'Patient',
}: RestorationModalProps) {
  
  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-[#1a1f2e] border border-gray-700 max-w-[90vw] sm:max-w-lg !p-0 gap-0">
        {/* Accessible Title - Visually Hidden */}
        <DialogTitle className="sr-only">Restore Appointment Confirmation</DialogTitle>
        <DialogDescription className="sr-only">
          Important information about restoring this patient appointment
        </DialogDescription>

        <div className="p-6">
          {/* Info Icon */}
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-blue-500/10 rounded-full flex items-center justify-center">
              <Info className="w-8 h-8 text-blue-500" />
            </div>
          </div>

          {/* Important Heading */}
          <div className="mb-4 pb-4 border-b border-gray-700">
            <h2 className="text-white text-center text-xl font-semibold">Important:</h2>
          </div>

          {/* Bullet Points */}
          <ul className="space-y-3 mb-5 text-gray-300 text-sm">
            <li className="flex items-start gap-2">
              <span className="text-gray-500 mt-1">•</span>
              <span>Patient has already received cancellation notification via app</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-gray-500 mt-1">•</span>
              <span>System will automatically send restoration notification to patient</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-gray-500 mt-1">•</span>
              <span>Patient will be notified that their appointment is reactivated</span>
            </li>
          </ul>

          {/* Action Buttons */}
          <div className="flex flex-col gap-3">
            <Button
              onClick={onClose}
              className="w-full bg-gray-700 text-white hover:bg-gray-600 border-0 text-base py-3"
            >
              Cancel Restoration
            </Button>
            <Button
              onClick={handleConfirm}
              className="w-full bg-emerald-600 text-white hover:bg-emerald-700 border-0 flex items-center justify-center gap-2 text-base py-3"
            >
              <CheckCircle className="w-4 h-4" />
              Confirm Restoration
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

