import { CheckCircle, AlertCircle } from 'lucide-react';
import { Button } from './ui/button';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from './ui/dialog';

interface RestoredPatient {
  id: string;
  name: string;
  phone: string;
  appointmentTime: string;
}

interface ChamberRestorationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  restoredPatients: RestoredPatient[];
  chamberName?: string;
  isLoading?: boolean;
}

export default function ChamberRestorationModal({
  isOpen,
  onClose,
  onConfirm,
  restoredPatients,
  chamberName = 'Chamber',
  isLoading = false,
}: ChamberRestorationModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-[#1a1f2e] border border-gray-700 max-w-[90vw] sm:max-w-lg !p-0 gap-0 max-h-[80vh] overflow-hidden flex flex-col">
        {/* Accessible Title - Visually Hidden */}
        <DialogTitle className="sr-only">Restore Chamber with Cancelled Appointments</DialogTitle>
        <DialogDescription className="sr-only">
          Information about restoring this chamber and reactivating patient appointments
        </DialogDescription>

        <div className="p-6 overflow-y-auto flex-1">
          {/* Info Icon */}
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center">
              <AlertCircle className="w-8 h-8 text-emerald-400" />
            </div>
          </div>

          {/* Important Heading */}
          <div className="mb-4 pb-4 border-b border-gray-700">
            <h2 className="text-white text-center text-xl font-semibold">Restore Chamber</h2>
          </div>

          {/* Restored Patients Info */}
          <div className="mb-5">
            <p className="text-gray-300 text-sm mb-3">
              <span className="text-emerald-400 font-semibold">{restoredPatients.length}</span> patient(s) will be <span className="text-emerald-400 font-semibold">RESTORED</span> in <span className="text-emerald-400 font-semibold">{chamberName}</span>:
            </p>
            
            {/* Patients List */}
            <div className="bg-gray-800/50 rounded-lg max-h-[200px] overflow-y-auto border border-gray-700">
              {restoredPatients.map((patient, idx) => (
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
              <span>All cancelled patients will receive <span className="text-emerald-400 font-semibold">RESTORATION</span> notifications via app</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-gray-500 mt-1">•</span>
              <span>Appointments will be reactivated in the system</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-gray-500 mt-1">•</span>
              <span>Patients can now book this chamber again</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-gray-500 mt-1">•</span>
              <span>Chamber will be active immediately after confirmation</span>
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
            Keep Chamber Blocked
          </Button>
          <Button
            onClick={() => {
              onConfirm();
              onClose();
            }}
            disabled={isLoading}
            className="w-full bg-emerald-600 text-white hover:bg-emerald-700 border-0 flex items-center justify-center gap-2 text-base py-3 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <CheckCircle className="w-4 h-4" />
                Restore Chamber & Patients
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
