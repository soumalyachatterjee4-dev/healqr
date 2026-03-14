import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Button } from './ui/button';
import { CheckCircle2, MapPin, Clock, Calendar, Users } from 'lucide-react';

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

interface ReactivateChamberModalProps {
  isOpen: boolean;
  onClose: () => void;
  chamber: Chamber | null;
  onConfirm: () => void;
}

export default function ReactivateChamberModal({ 
  isOpen, 
  onClose, 
  chamber, 
  onConfirm 
}: ReactivateChamberModalProps) {
  if (!chamber) return null;

  const handleReactivate = () => {
    onConfirm();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-[#1a1f2e] border-gray-800 text-white max-w-md">
        <DialogHeader>
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
              <CheckCircle2 className="w-5 h-5 text-emerald-500" />
            </div>
            <div>
              <DialogTitle className="text-white mb-1">Reactivate Chamber</DialogTitle>
              <DialogDescription className="text-gray-400 text-sm">
                This will enable all bookings for this chamber
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

          {/* Info Box */}
          <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-4">
            <div className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-emerald-400 text-sm mb-2">What happens when you toggle ON:</p>
                <ul className="space-y-1 text-sm text-gray-300">
                  <li>• System enables new bookings for this chamber</li>
                  <li>• System sends restoration message to all previously booked patients</li>
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
            onClick={handleReactivate}
            className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            <CheckCircle2 className="w-4 h-4 mr-2" />
            Reactivate Chamber
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

