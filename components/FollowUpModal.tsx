import { X, CalendarDays, Save } from 'lucide-react';
import { useState, useEffect } from 'react';
import { Button } from './ui/button';

interface FollowUpModalProps {
  isOpen: boolean;
  onClose: () => void;
  patientName: string;
  onSave: (days: number, message: string) => void;
}

export default function FollowUpModal({
  isOpen,
  onClose,
  patientName,
  onSave,
}: FollowUpModalProps) {
  const [days, setDays] = useState(7);
  const [message, setMessage] = useState(`Dear ${patientName}, we hope you're feeling better. Please let us know if you need help.`);
  const [followUpDate, setFollowUpDate] = useState('');

  useEffect(() => {
    // Calculate follow-up date based on days
    const calculateDate = () => {
      const date = new Date();
      date.setDate(date.getDate() + days);
      
      const options: Intl.DateTimeFormatOptions = { 
        weekday: 'short', 
        month: 'short', 
        day: 'numeric' 
      };
      return date.toLocaleDateString('en-US', options);
    };

    setFollowUpDate(calculateDate());
  }, [days]);

  useEffect(() => {
    // Reset message when patient name changes
    setMessage(`Dear ${patientName}, we hope you're feeling better. Please let us know if you need help.`);
  }, [patientName]);

  const handleSave = () => {
    onSave(days, message);
    onClose();
  };

  const handleDaysChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value) || 0;
    // Limit to 5-120 days (notification sent 3 days before, so minimum 5 days needed)
    if (value >= 5 && value <= 120) {
      setDays(value);
    } else if (value < 5) {
      setDays(5);
    } else {
      setDays(120);
    }
  };

  const handleMessageChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    if (value.length <= 100) {
      setMessage(value);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-[#0a0f1a] border border-purple-500/30 rounded-2xl w-full max-w-xl mx-4 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center">
              <CalendarDays className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <h2 className="text-purple-400">Schedule Follow-Up</h2>
              <p className="text-gray-500 text-sm">Patient: {patientName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-800 transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Days Input */}
          <div className="bg-gray-900/50 border border-gray-700 rounded-xl p-6">
            <div className="flex items-center justify-center mb-4">
              <input
                type="number"
                value={days}
                onChange={handleDaysChange}
                min="5"
                max="120"
                className="w-32 h-16 bg-transparent border-2 border-gray-600 rounded-lg text-center text-white text-3xl focus:outline-none focus:border-purple-500 transition-colors"
              />
            </div>
            
            <p className="text-center text-gray-400 text-sm">
              Follow-up will be sent on: <span className="text-emerald-400">{followUpDate}</span>
            </p>
          </div>

          {/* Message Textarea */}
          <div className="bg-gray-900/50 border border-gray-700 rounded-xl p-4">
            <textarea
              value={message}
              onChange={handleMessageChange}
              className="w-full min-h-[100px] bg-transparent text-white text-sm resize-none focus:outline-none placeholder:text-gray-500"
              placeholder="Enter your follow-up message..."
            />
            <div className="flex justify-end mt-2">
              <span className="text-purple-400 text-xs">{message.length}/100 characters</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-800">
          <Button
            variant="ghost"
            onClick={onClose}
            className="text-gray-400 hover:text-white"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            className="bg-purple-600 hover:bg-purple-700 text-white flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            Save Follow-Up
          </Button>
        </div>
      </div>
    </div>
  );
}
