import { AlertTriangle, CircleX } from 'lucide-react';
import { Button } from './ui/button';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from './ui/dialog';

interface CancellationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export default function CancellationModal({
  isOpen,
  onClose,
  onConfirm,
}: CancellationModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-[#1a1f2e] border border-gray-700 max-w-[90vw] sm:max-w-lg !p-0 gap-0">
        {/* Accessible Title - Visually Hidden */}
        <DialogTitle className="sr-only">Cancel Appointment Confirmation</DialogTitle>
        <DialogDescription className="sr-only">
          Important information about cancelling this patient appointment
        </DialogDescription>

        <div className="p-6">
          {/* Warning Icon */}
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center">
              <AlertTriangle className="w-8 h-8 text-red-500" />
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
              <span>Patient will be notified via app notification</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-gray-500 mt-1">•</span>
              <span>Slot will become available for other patients</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-gray-500 mt-1">•</span>
              <span>This action can be undone using "Reactivate Appointment"</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-gray-500 mt-1">•</span>
              <span>System will automatically send restoration notification when reactivated</span>
            </li>
          </ul>

          {/* Action Buttons */}
          <div className="flex flex-col gap-3">
            <Button
              onClick={onClose}
              className="w-full bg-gray-700 text-white hover:bg-gray-600 border-0 text-base py-3"
            >
              Keep Appointment
            </Button>
            <Button
              onClick={() => {
                onConfirm();
                onClose();
              }}
              className="w-full bg-red-500 text-white hover:bg-red-600 border-0 flex items-center justify-center gap-2 text-base py-3"
            >
              <CircleX className="w-4 h-4" />
              Confirm Cancellation
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
