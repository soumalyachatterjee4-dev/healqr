import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Button } from './ui/button';
import { AlertTriangle, MapPin, Clock, Calendar, Users } from 'lucide-react';

interface Chamber {
  id: number;
  name: string;
  address: string;
  startTime: string;
  endTime: string;
  schedule: string;
  booked: number;
  capacity: number;
}

interface DeactivateChamberModalProps {
  isOpen: boolean;
  onClose: () => void;
  chamber: Chamber | null;
  onConfirm: () => void;
}

export default function DeactivateChamberModal({ 
  isOpen, 
  onClose, 
  chamber, 
  onConfirm 
}: DeactivateChamberModalProps) {
  if (!chamber) return null;

  const handleDeactivate = () => {
    onConfirm();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-[#1a1f2e] border-gray-800 text-white max-w-md">
        <DialogHeader>
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-yellow-500/20 flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="w-5 h-5 text-yellow-500" />
            </div>
            <div>
              <DialogTitle className="text-white mb-1">Deactivate Chamber</DialogTitle>
              <DialogDescription className="text-gray-400 text-sm">
                This will block all new bookings for this chamber
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Chamber Information */}
        <div className="space-y-3 mt-6">
          <h3 className="text-white text-sm mb-3">Chamber Information</h3>
          
          <div className="bg-gray-800/50 rounded-lg p-3 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-gray-400 text-sm">
                <MapPin className="w-4 h-4 text-emerald-500" />
                <span>CHAMBER NAME:</span>
              </div>
              <span className="text-white text-sm">{chamber.name}</span>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-gray-400 text-sm">
                <MapPin className="w-4 h-4 text-emerald-500" />
                <span>ADDRESS:</span>
              </div>
              <span className="text-white text-sm text-right">{chamber.address}</span>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-gray-400 text-sm">
                <Clock className="w-4 h-4 text-emerald-500" />
                <span>SCHEDULE TIME:</span>
              </div>
              <span className="text-white text-sm">{chamber.startTime} - {chamber.endTime}</span>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-gray-400 text-sm">
                <Calendar className="w-4 h-4 text-emerald-500" />
                <span>DATE:</span>
              </div>
              <span className="text-white text-sm">{chamber.schedule}</span>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-gray-400 text-sm">
                <Users className="w-4 h-4 text-emerald-500" />
                <span>CURRENT BOOKINGS:</span>
              </div>
              <span className="text-white text-sm">{chamber.booked} / {chamber.capacity} slots</span>
            </div>
          </div>

          {/* Warning Box */}
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-yellow-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-yellow-500 text-sm mb-2">What happens when you toggle OFF:</p>
                <ul className="space-y-1 text-sm text-gray-300">
                  <li>• System blocks new bookings for this chamber</li>
                  <li>• System sends cancellation message to all booked patients</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 mt-6">
          <Button
            onClick={onClose}
            variant="outline"
            className="flex-1 border-gray-700 text-gray-300 hover:bg-gray-800 hover:text-white"
          >
            Cancel
          </Button>
          <Button
            onClick={handleDeactivate}
            className="flex-1 bg-red-600 hover:bg-red-700 text-white"
          >
            <AlertTriangle className="w-4 h-4 mr-2" />
            Deactivate Chamber
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
