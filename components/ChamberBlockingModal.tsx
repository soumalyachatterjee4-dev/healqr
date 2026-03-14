import { AlertTriangle, CircleX } from 'lucide-react';
import { Button } from './ui/button';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from './ui/dialog';

interface PendingPatient {
  id: string;
  name: string;
  phone: string;
  appointmentTime: string;
}

interface ChamberBlockingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  pendingPatients: PendingPatient[];
  chamberName?: string;
  isLoading?: boolean;
}

export default function ChamberBlockingModal({
  isOpen,
  onClose,
  onConfirm,
  pendingPatients,
  chamberName = 'Chamber',
  isLoading = false,
}: ChamberBlockingModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-[#1a1f2e] border border-gray-700 max-w-[90vw] sm:max-w-lg !p-0 gap-0 max-h-[80vh] overflow-hidden flex flex-col">
        {/* Accessible Title - Visually Hidden */}
        <DialogTitle className="sr-only">Block Chamber with Pending Patients</DialogTitle>
        <DialogDescription className="sr-only">
          Important information about blocking this chamber with pending patient appointments
        </DialogDescription>

        <div className="p-6 overflow-y-auto flex-1">
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

          {/* Pending Patients Info */}
          <div className="mb-5">
            <p className="text-gray-300 text-sm mb-3">
              <span className="text-red-400 font-semibold">{pendingPatients.length}</span> patient(s) have pending appointments in <span className="text-emerald-400 font-semibold">{chamberName}</span>:
            </p>
            
            {/* Patients List */}
            <div className="bg-gray-800/50 rounded-lg max-h-[200px] overflow-y-auto border border-gray-700">
              {pendingPatients.map((patient, idx) => (
                <div key={patient.id} className="border-b border-gray-700 last:border-b-0 p-3">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <p className="text-white font-medium text-sm">{idx + 1}. {patient.name}</p>
                      <p className="text-gray-400 text-xs mt-1">Time: {patient.appointmentTime}</p>
                      <p className="text-gray-400 text-xs">Phone: {patient.phone}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Bullet Points */}
          <ul className="space-y-3 mb-5 text-gray-300 text-sm">
            <li className="flex items-start gap-2">
              <span className="text-gray-500 mt-1">•</span>
              <span>All pending patients will receive <span className="text-red-400 font-semibold">CANCELLATION</span> notifications via app</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-gray-500 mt-1">•</span>
              <span>Appointment slots will become available for other patients</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-gray-500 mt-1">•</span>
              <span>Chamber will be blocked immediately after confirmation</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-gray-500 mt-1">•</span>
              <span>You can unblock the chamber and <span className="text-emerald-400 font-semibold">restore</span> appointments later if needed</span>
            </li>
          </ul>
        </div>

        {/* Action Buttons - Fixed at bottom */}
        <div className="border-t border-gray-700 p-6 bg-[#1a1f2e] flex flex-col gap-3">
          <Button
            onClick={onClose}
            disabled={isLoading}
            className="w-full bg-gray-700 text-white hover:bg-gray-600 border-0 text-base py-3 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Keep Chamber Active
          </Button>
          <Button
            onClick={() => {
              onConfirm();
              onClose();
            }}
            disabled={isLoading}
            className="w-full bg-red-500 text-white hover:bg-red-600 border-0 flex items-center justify-center gap-2 text-base py-3 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <CircleX className="w-4 h-4" />
                Block Chamber & Cancel All
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

