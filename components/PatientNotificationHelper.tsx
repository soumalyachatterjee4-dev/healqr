/**
 * Patient Notification Helper
 * Use this to manually prompt existing patients to enable notifications
 */
import { useState } from 'react';
import { Button } from './ui/button';
import { Bell, X } from 'lucide-react';
import { toast } from 'sonner';

interface PatientNotificationHelperProps {
  patientPhone: string; // 10-digit phone number
  onClose?: () => void;
}

export default function PatientNotificationHelper({ 
  patientPhone,
  onClose 
}: PatientNotificationHelperProps) {
  const [isRegistering, setIsRegistering] = useState(false);
  const [registered, setRegistered] = useState(false);

  const handleEnableNotifications = async () => {
    try {
      setIsRegistering(true);
      
      const { requestNotificationPermission } = await import('../services/fcm.service');
      
      // Create patient userId from phone number
      const phone10 = patientPhone.replace(/\D/g, '').slice(-10);
      const patientUserId = `patient_${phone10}`;
      

      
      const token = await requestNotificationPermission(patientUserId, 'patient');
      
      if (token) {

        setRegistered(true);
        toast.success('🔔 Notifications enabled!', {
          description: 'You will now receive appointment reminders and updates.',
          duration: 5000
        });
        
        // Auto-close after 3 seconds
        setTimeout(() => {
          onClose?.();
        }, 3000);
      } else {
        toast.error('Could not enable notifications.', {
          description: 'Please check your browser settings and allow notifications.',
          duration: 8000
        });
      }
    } catch (error) {
      console.error('Error enabling notifications:', error);
      toast.error('Failed to enable notifications.');
    } finally {
      setIsRegistering(false);
    }
  };

  if (registered) {
    return (
      <div className="bg-emerald-500/10 border-2 border-emerald-500/30 rounded-2xl p-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-emerald-500/30 rounded-full flex items-center justify-center">
            <Bell className="w-5 h-5 text-emerald-300" />
          </div>
          <div className="flex-1">
            <p className="text-emerald-300 text-sm font-medium">
              ✅ Notifications Enabled Successfully!
            </p>
            <p className="text-gray-300 text-xs">
              You will receive appointment reminders
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-r from-amber-500/20 to-orange-500/20 border-3 border-amber-500/50 rounded-2xl p-5 shadow-lg">
      <div className="flex items-start gap-3">
        <div className="w-12 h-12 bg-amber-500/30 rounded-full flex items-center justify-center flex-shrink-0">
          <Bell className="w-6 h-6 text-amber-300 animate-pulse" />
        </div>
        <div className="flex-1">
          <div className="flex items-start justify-between mb-1">
            <p className="text-white text-base font-bold">
              ⚠️ Enable Notifications
            </p>
            {onClose && (
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
          <p className="text-gray-200 text-sm mb-3 leading-relaxed">
            <strong>Don't miss important updates!</strong><br/>
            Get instant reminders about your appointments and consultations.
          </p>
          <Button 
            onClick={handleEnableNotifications}
            disabled={isRegistering}
            className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-semibold text-sm py-3 shadow-md"
          >
            <Bell className="w-5 h-5 mr-2" />
            {isRegistering ? 'Enabling...' : 'Enable Notifications Now'}
          </Button>
          <p className="text-gray-400 text-xs mt-2 text-center">
            Click "Allow" when your browser asks for permission
          </p>
        </div>
      </div>
    </div>
  );
}
