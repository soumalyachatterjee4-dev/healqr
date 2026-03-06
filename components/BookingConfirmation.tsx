import { Button } from './ui/button';
import { Check, Download, Share2, Bell, BellOff } from 'lucide-react';
import { t, type Language } from '../utils/translations';
import { useAITranslation } from '../hooks/useAITranslation';
import BookingFlowLayout from './BookingFlowLayout';
import { toast } from 'sonner';
import TemplateDisplay from './TemplateDisplay';
import { useState, useEffect, useRef } from 'react';
import { requestNotificationPermission, getCurrentToken, hasNotificationPermission } from '../services/fcm.service';
import html2canvas from 'html2canvas';

interface BookingConfirmationProps {
  onBackToHome: () => void;
  language: Language;
  patientData: {
    patientName: string;
    whatsappNumber: string;
    age?: string;
    gender?: string;
    purposeOfVisit?: string;
  };
  appointmentData: {
    serialNo: string;
    bookingId: string;
    doctorName: string;
    date: Date;
    time: string;
    location: string;
    consultationType?: 'chamber' | 'video';
    totalInQueue?: number;
    chamberCapacity?: number;
  };
  doctorName?: string;
  doctorSpecialty?: string;
  doctorPhoto?: string;
  doctorDegrees?: string[];
  isTestMode?: boolean;
  useDrPrefix?: boolean;
  themeColor?: 'emerald' | 'blue';
}

export default function BookingConfirmation({
  onBackToHome,
  language,
  patientData,
  appointmentData,
  doctorName = '',
  doctorSpecialty = '',
  doctorPhoto = '',
  doctorDegrees = [],
  isTestMode = false,
  useDrPrefix = true,
  themeColor = 'emerald',
}: BookingConfirmationProps) {
  const { bt, dt } = useAITranslation(language);
  const [notificationStatus, setNotificationStatus] = useState<'checking' | 'enabled' | 'disabled' | 'enabling'>('checking');
  const [hasToken, setHasToken] = useState(false);
  const [arrivalTime, setArrivalTime] = useState<string>('');
  const [vcLinkTime, setVcLinkTime] = useState<string>('');
  const [isSharing, setIsSharing] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  // Calculate recommended arrival time
  useEffect(() => {
    const calculateArrivalTime = () => {
      try {
        const serialNo = parseInt(appointmentData.serialNo);
        const totalInQueue = appointmentData.totalInQueue || 20;
        const timeSlot = appointmentData.time;

        if (!timeSlot || !serialNo) return;

        // Parse time slot (e.g., "20:30 - 23:59")
        const parts = timeSlot.toLowerCase().split('-');
        if (parts.length !== 2) return;

        const startStr = parts[0].trim();
        const endStr = parts[1].trim();

        let startHour: number, startMin: number = 0;
        let endHour: number, endMin: number = 0;

        // Check for AM/PM format FIRST (handles both "10:00 AM" and "10 AM")
        if (startStr.toLowerCase().includes('am') || startStr.toLowerCase().includes('pm') ||
            endStr.toLowerCase().includes('am') || endStr.toLowerCase().includes('pm')) {
          // 12-hour format (e.g., "10:00 AM - 02:00 PM" or "10 AM - 2 PM")
          const startParts = startStr.toLowerCase().replace(/\s+/g, ' ').split(' ');
          const endParts = endStr.toLowerCase().replace(/\s+/g, ' ').split(' ');

          // Parse start time
          const startTimePart = startParts[0];
          const startPeriod = startParts[1] || endParts[1]; // Use end period if start doesn't have one
          if (startTimePart.includes(':')) {
            const [h, m] = startTimePart.split(':').map(s => parseInt(s));
            startHour = h;
            startMin = m || 0;
          } else {
            startHour = parseInt(startTimePart);
          }
          if (startPeriod === 'pm' && startHour < 12) startHour += 12;
          if (startPeriod === 'am' && startHour === 12) startHour = 0;

          // Parse end time
          const endTimePart = endParts[0];
          const endPeriod = endParts[1];
          if (endTimePart.includes(':')) {
            const [h, m] = endTimePart.split(':').map(s => parseInt(s));
            endHour = h;
            endMin = m || 0;
          } else {
            endHour = parseInt(endTimePart);
          }
          if (endPeriod === 'pm' && endHour < 12) endHour += 12;
          if (endPeriod === 'am' && endHour === 12) endHour = 0;
        } else if (startStr.includes(':')) {
          // 24-hour format (e.g., "20:30 - 23:59")
          [startHour, startMin] = startStr.split(':').map(Number);
          [endHour, endMin] = endStr.split(':').map(Number);
        } else {
          // Simple hour format without colons or AM/PM (fallback)
          startHour = parseInt(startStr);
          endHour = parseInt(endStr);
        }

        const startTime = new Date(appointmentData.date);
        startTime.setHours(startHour, startMin, 0, 0);

        const endTime = new Date(appointmentData.date);
        endTime.setHours(endHour, endMin, 0, 0);

        // Calculate total duration in minutes
        const totalMinutes = (endTime.getTime() - startTime.getTime()) / (1000 * 60);

        // Time per patient
        const timePerPatient = totalMinutes / totalInQueue;

        // Patient's slot time
        const patientSlotMinutes = (serialNo - 1) * timePerPatient;

        // Recommended arrival (15 minutes before slot)
        const slotTime = new Date(startTime.getTime() + patientSlotMinutes * 60 * 1000);
        const arrival = new Date(slotTime.getTime() - 15 * 60 * 1000);

        // Check if arrival time has already passed
        const now = new Date();
        if (arrival.getTime() < now.getTime()) {
          setArrivalTime('IMMEDIATELY');
          return;
        }

        // Format time
        const hours = arrival.getHours();
        const minutes = arrival.getMinutes();
        const period = hours >= 12 ? 'PM' : 'AM';
        const displayHours = hours % 12 || 12;

        setArrivalTime(`${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`);
      } catch (error) {
        console.error('Error calculating arrival time:', error);
      }
    };

    calculateArrivalTime();

    // Calculate VC link time (30 min before slot start)
    if (appointmentData?.consultationType === 'video') {
      try {
        const timeSlot = appointmentData.time;
        if (timeSlot) {
          const parts = timeSlot.toLowerCase().split('-');
          const startStr = parts[0].trim();
          let startHour: number, startMin: number = 0;

          if (startStr.toLowerCase().includes('am') || startStr.toLowerCase().includes('pm')) {
            const startParts = startStr.toLowerCase().replace(/\s+/g, ' ').split(' ');
            const startTimePart = startParts[0];
            const startPeriod = startParts[1];
            if (startTimePart.includes(':')) {
              const [h, m] = startTimePart.split(':').map(s => parseInt(s));
              startHour = h;
              startMin = m || 0;
            } else {
              startHour = parseInt(startTimePart);
            }
            if (startPeriod === 'pm' && startHour < 12) startHour += 12;
            if (startPeriod === 'am' && startHour === 12) startHour = 0;
          } else if (startStr.includes(':')) {
            [startHour, startMin] = startStr.split(':').map(Number);
          } else {
            startHour = parseInt(startStr);
          }

          // Estimate patient slot time
          const serialNo = parseInt(appointmentData.serialNo);
          const totalInQueue = appointmentData.totalInQueue || 20;
          const endStr = parts[1]?.trim();
          let endHour: number, endMin: number = 0;
          if (endStr?.toLowerCase().includes('am') || endStr?.toLowerCase().includes('pm')) {
            const endParts = endStr.toLowerCase().replace(/\s+/g, ' ').split(' ');
            const endTimePart = endParts[0];
            const endPeriod = endParts[1];
            if (endTimePart.includes(':')) {
              const [h, m] = endTimePart.split(':').map(s => parseInt(s));
              endHour = h;
              endMin = m || 0;
            } else {
              endHour = parseInt(endTimePart);
            }
            if (endPeriod === 'pm' && endHour < 12) endHour += 12;
            if (endPeriod === 'am' && endHour === 12) endHour = 0;
          } else if (endStr?.includes(':')) {
            [endHour, endMin] = endStr.split(':').map(Number);
          } else {
            endHour = parseInt(endStr || '0');
          }

          const startTime = new Date(appointmentData.date);
          startTime.setHours(startHour!, startMin, 0, 0);
          const endTime = new Date(appointmentData.date);
          endTime.setHours(endHour!, endMin, 0, 0);
          const totalMinutes = (endTime.getTime() - startTime.getTime()) / (1000 * 60);
          const timePerPatient = totalMinutes / totalInQueue;
          const patientSlotMinutes = (serialNo - 1) * timePerPatient;
          const slotTime = new Date(startTime.getTime() + patientSlotMinutes * 60 * 1000);

          // VC link is sent 30 min before slot
          const linkTime = new Date(slotTime.getTime() - 30 * 60 * 1000);
          const hours = linkTime.getHours();
          const minutes = linkTime.getMinutes();
          const period = hours >= 12 ? 'PM' : 'AM';
          const displayHours = hours % 12 || 12;
          setVcLinkTime(`${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`);
        }
      } catch (error) {
        console.error('Error calculating VC link time:', error);
      }
    }
  }, [appointmentData]);


  // Check notification status on mount
  useEffect(() => {
    const checkNotificationStatus = async () => {
      try {
        const phone10 = patientData.whatsappNumber.replace(/\D/g, '').slice(-10);
        const patientUserId = `patient_${phone10}`;

        // Check if token exists in Firestore
        const token = await getCurrentToken(patientUserId);

        if (token) {
          setHasToken(true);
          setNotificationStatus('enabled');
          console.log('✅ Patient has FCM token registered');
        } else {
          setHasToken(false);
          setNotificationStatus('disabled');
          console.log('⚠️ Patient does not have FCM token');
        }
      } catch (error) {
        console.error('Error checking notification status:', error);
        setNotificationStatus('disabled');
      }
    };

    if (patientData?.whatsappNumber) {
      checkNotificationStatus();
    }
  }, [patientData]);

  const handleEnableNotifications = async () => {
    try {
      setNotificationStatus('enabling');
      const phone10 = patientData.whatsappNumber.replace(/\D/g, '').slice(-10);
      const patientUserId = `patient_${phone10}`;

      console.log('🔔 Manually enabling notifications for:', patientUserId);

      const token = await requestNotificationPermission(patientUserId, 'patient');

      if (token) {
        setHasToken(true);
        setNotificationStatus('enabled');
        toast.success(dt('Notifications enabled! You will receive appointment updates.'), {
          duration: 4000
        });
      } else {
        setNotificationStatus('disabled');

        // Check if permission was denied
        if (!hasNotificationPermission()) {
          toast.error(dt('Notification permission denied. Please enable notifications in your browser settings.'), {
            duration: 6000
          });
        } else {
          toast.error(dt('Could not enable notifications. Please try again later.'), {
            duration: 4000
          });
        }
      }
    } catch (error) {
      console.error('❌ Error enabling notifications:', error);
      setNotificationStatus('disabled');
      toast.error(dt('Failed to enable notifications. Please try again.'), {
        duration: 4000
      });
    }
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getSummaryText = () => {
    let summary = 'APPOINTMENT CONFIRMATION\n';
    summary += '========================\n\n';
    summary += 'PATIENT DETAILS\n';
    summary += '---------------\n';
    summary += 'Name: ' + patientData.patientName + '\n';
    summary += 'WhatsApp: +91 ' + patientData.whatsappNumber + '\n';

    if (patientData.gender) {
      summary += 'Gender: ' + patientData.gender.charAt(0).toUpperCase() + patientData.gender.slice(1) + '\n';
    }
    if (patientData.age) {
      summary += 'Age: ' + patientData.age + '\n';
    }
    if (patientData.purposeOfVisit) {
      summary += 'Purpose: ' + patientData.purposeOfVisit + '\n';
    }

    summary += '\nAPPOINTMENT DETAILS\n';
    summary += '-------------------\n';
    summary += 'Serial No: #' + appointmentData.serialNo + '\n';
    summary += 'Booking ID: ' + appointmentData.bookingId + '\n';
    summary += 'Doctor: ' + appointmentData.doctorName + '\n';
    summary += 'Date: ' + formatDate(appointmentData.date) + '\n';
    summary += 'Time: ' + appointmentData.time + '\n';
    summary += 'Location: ' + appointmentData.location + '\n';
    summary += '\nThank you for booking with www.healqr.com';

    return summary;
  };

  const handleDownloadSummary = () => {
    const summaryText = getSummaryText();
    const blob = new Blob([summaryText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'appointment-' + appointmentData.bookingId + '.txt';
    link.click();
    URL.revokeObjectURL(url);
    toast.success(dt('Appointment summary downloaded.'));
  };

  const handleShare = async () => {
    if (!cardRef.current) {
      toast.error(dt('Unable to generate card. Try again.'));
      return;
    }

    setIsSharing(true);
    try {
      const canvas = await html2canvas(cardRef.current, {
        backgroundColor: '#1a1f2e',
        scale: 2,
        useCORS: true,
        logging: false,
      });

      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, 'image/png')
      );

      if (!blob) {
        throw new Error('Failed to generate image');
      }

      const file = new File(
        [blob],
        `appointment-${appointmentData.bookingId}.png`,
        { type: 'image/png' }
      );

      // Try native share with image first
      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          title: 'Appointment Confirmation - HealQR',
          text: `Appointment confirmed! Serial #${appointmentData.serialNo} with ${appointmentData.doctorName}`,
          files: [file],
        });
        toast.success(dt('Shared successfully!'));
      } else {
        // Fallback: download image + open WhatsApp with text
        const link = document.createElement('a');
        link.href = canvas.toDataURL('image/png');
        link.download = `appointment-${appointmentData.bookingId}.png`;
        link.click();

        const whatsappText = encodeURIComponent(
          `*Appointment Confirmed ✅*\n\n` +
          `*Patient:* ${patientData.patientName}\n` +
          `*Serial No:* #${appointmentData.serialNo}\n` +
          `*Doctor:* ${appointmentData.doctorName}\n` +
          `*Date:* ${formatDate(appointmentData.date)}\n` +
          `*Mode:* ${appointmentData.consultationType === 'video' ? '📹 Video Consultation' : '🏥 In-Chamber'}\n` +
          `${appointmentData.consultationType !== 'video' ? `*Location:* ${appointmentData.location}\n` : ''}` +
          `\n_Booked via www.healqr.com_`
        );
        window.open(`https://wa.me/?text=${whatsappText}`, '_blank');
        toast.success(dt('Card downloaded! Share the image on WhatsApp.'));
      }
    } catch (error: any) {
      if (error?.name !== 'AbortError') {
        console.error('Share failed:', error);
        toast.error(dt('Share failed. Try again.'));
      }
    } finally {
      setIsSharing(false);
    }
  };

  return (
    <BookingFlowLayout
      doctorName={doctorName}
      doctorPhoto={doctorPhoto}
      doctorSpecialty={doctorSpecialty}
      doctorDegrees={doctorDegrees}
      showHeader={true}
      onBack={isTestMode ? onBackToHome : undefined}
      useDrPrefix={useDrPrefix}
    >
      <div className="flex items-center justify-center min-h-[calc(100vh-200px)]">
        <div ref={cardRef} className="w-full max-w-md bg-[#1a1f2e] rounded-3xl shadow-xl p-6 text-white">

          <div className="flex justify-center mb-6">
            <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center">
              <div className="w-16 h-16 bg-emerald-500 rounded-full flex items-center justify-center">
                <Check className="w-10 h-10 text-white" strokeWidth={3} />
              </div>
            </div>
          </div>

          <h1 className="text-center text-white mb-2" style={{ fontSize: '2rem', fontWeight: '700' }}>
            #{appointmentData?.serialNo || '---'}
          </h1>
          <p className="text-center text-emerald-400 mb-4">
            {t('bookingConfirmed', language)}
          </p>

          <div className="bg-[#0f1419] p-4 rounded-2xl mb-4 border border-gray-700">
            <h3 className="text-white mb-3">{t('patientDetails', language)}</h3>
            <p className="text-gray-300">{patientData?.patientName || ''}</p>
            <p className="text-gray-300">+91 {patientData?.whatsappNumber || ''}</p>
            {patientData?.gender && <p className="text-gray-300">{patientData.gender}</p>}
            {patientData?.age && <p className="text-gray-300">{bt('Age')}: {patientData.age}</p>}
            {patientData?.purposeOfVisit && <p className="text-gray-300">{bt('Purpose')}: {patientData.purposeOfVisit}</p>}
          </div>

          <div className="bg-[#0f1419] p-4 rounded-2xl mb-4 border border-gray-700">
            <h3 className="text-white mb-3">{t('appointmentDetails', language)}</h3>
            <p className="text-gray-300">{dt('Booking ID')}: {appointmentData?.bookingId || ''}</p>
            <p className="text-gray-300">{dt('Doctor')}: {appointmentData?.doctorName || doctorName}</p>
            <p className="text-gray-300">{dt('Date')}: {appointmentData?.date ? formatDate(appointmentData.date) : ''}</p>
            <p className="text-gray-300">{dt('Time')}: {appointmentData?.time || ''}</p>
            {appointmentData?.consultationType !== 'video' && (
              <p className="text-gray-300">{dt('Location')}: {appointmentData?.location || ''}</p>
            )}
            {/* Mode of Consultation */}
            <div className="mt-2 pt-2 border-t border-gray-600">
              <div className="flex items-center gap-2">
                {appointmentData.consultationType === 'video' ? (
                  <>
                    <svg className="w-5 h-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    <span className="text-blue-400 font-medium">{bt('Mode: Video Consultation')}</span>
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                    <span className="text-emerald-400 font-medium">{bt('Mode: In-Chamber')}</span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Recommended Arrival Time - In-Chamber */}
          {arrivalTime && appointmentData.consultationType !== 'video' && (
            <div className={`${arrivalTime === 'IMMEDIATELY' ? 'bg-red-500/10 border-red-500/30' : 'bg-orange-500/10 border-orange-500/30'} border rounded-2xl p-4 mb-4`}>
              <div className="flex items-center gap-3">
                <svg className={`w-5 h-5 ${arrivalTime === 'IMMEDIATELY' ? 'text-red-400' : 'text-orange-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <p className={`${arrivalTime === 'IMMEDIATELY' ? 'text-red-400' : 'text-orange-400'} font-medium text-sm`}>
                    {arrivalTime === 'IMMEDIATELY' ? dt('Please come') : dt('You must reach by')}
                  </p>
                  <p className={`${arrivalTime === 'IMMEDIATELY' ? 'text-red-400' : 'text-orange-400'} text-xl font-bold`}>{arrivalTime}</p>
                  <p className="text-gray-400 text-xs mt-1">
                    {arrivalTime === 'IMMEDIATELY' ? dt('Your appointment time has arrived') : dt('Arrive 15 minutes before your slot')}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* VC Link Time - Video Consultation */}
          {appointmentData.consultationType === 'video' && vcLinkTime && (
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-2xl p-4 mb-4">
              <div className="flex items-center gap-3">
                <svg className="w-5 h-5 text-blue-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                <div>
                  <p className="text-blue-400 font-medium text-sm">{bt('VC link will be sent at')}</p>
                  <p className="text-blue-400 text-xl font-bold">{vcLinkTime}</p>
                  <p className="text-gray-400 text-xs mt-1">
                    {dt('Please tap on the notification link to join.')}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Notification Status Indicator */}
          {notificationStatus === 'checking' && (
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-2xl p-4 mb-4">
              <div className="flex items-center gap-3">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-400"></div>
                <p className="text-blue-300 text-sm">{bt('Checking notification status...')}</p>
              </div>
            </div>
          )}

          {notificationStatus === 'enabled' && hasToken && (
            <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-4 mb-4">
              <div className="flex items-center gap-3">
                <Bell className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-emerald-300 text-sm font-medium">{bt('Notifications Enabled')} ✅</p>
                  <p className="text-gray-400 text-xs mt-1">{dt("You'll receive appointment reminders and updates")}</p>
                </div>
              </div>
            </div>
          )}

          {notificationStatus === 'disabled' && !hasToken && (
            <div className="bg-orange-500/10 border border-orange-500/30 rounded-2xl p-4 mb-4">
              <div className="flex items-start gap-3">
                <BellOff className="w-5 h-5 text-orange-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-orange-300 text-sm font-medium mb-2">{bt('Enable Notifications')}</p>
                  <p className="text-gray-400 text-xs mb-3">
                    {dt('Get appointment reminders and prescription updates on this device')}
                  </p>
                  <Button
                    onClick={handleEnableNotifications}
                    className="w-full bg-orange-500 hover:bg-orange-600 text-white text-sm py-2"
                  >
                    <Bell className="w-4 h-4 mr-2" />
                    {bt('Enable Notifications Now')}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {notificationStatus === 'enabling' && (
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-2xl p-4 mb-4">
              <div className="flex items-center gap-3">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-400"></div>
                <p className="text-blue-300 text-sm">{bt('Enabling notifications...')}</p>
              </div>
            </div>
          )}

          {/* Video Consultation Note */}
          {appointmentData.consultationType === 'video' && (
            <div className="bg-red-500/10 border-2 border-red-500/30 rounded-2xl p-4 mb-6">
              <div className="flex items-start gap-3">
                <svg className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div className="flex-1">
                  <p className="text-red-300 text-sm font-medium mb-1">
                    {bt('Video Consultation Booked')}
                  </p>
                  <p className="text-gray-300 text-sm">
                    {dt('You will receive an in-app notification 30 minutes before your scheduled time with the video call link. No physical visit required.')}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Health Tip Image */}
          <TemplateDisplay placement="booking-confirmation" className="mb-4" />

          {/* Patient Portal Link */}
          <div
            onClick={() => {
              const phone = patientData.whatsappNumber?.replace(/\D/g, '').slice(-10);
              const url = `${window.location.origin}/?page=patient-login&phone=${phone}`;
              window.location.href = url;
            }}
            className="bg-gradient-to-r from-orange-500/20 to-orange-600/20 border border-orange-500/40 rounded-2xl p-4 mb-4 cursor-pointer hover:border-orange-400 transition-all"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-orange-500/30 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
              </div>
              <div className="flex-1">
                <p className="text-orange-300 font-semibold text-sm">{bt('Open Patient Portal')}</p>
                <p className="text-gray-400 text-xs">{dt('View history, prescriptions & install app on your phone')}</p>
              </div>
              <svg className="w-5 h-5 text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </div>

          <div className="flex gap-3 mb-4">
            <Button onClick={handleShare} disabled={isSharing} className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white">
              {isSharing ? (
                <><div className="w-5 h-5 mr-2 animate-spin rounded-full border-2 border-white border-t-transparent" /> Sharing...</>
              ) : (
                <><Share2 className="w-5 h-5 mr-2" /> Share</>
              )}
            </Button>
            <Button onClick={handleDownloadSummary} className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white">
              <Download className="w-5 h-5 mr-2" /> Download
            </Button>
          </div>

          {/* View My History Button */}
          <Button
            onClick={() => {
              const phone = patientData.whatsappNumber;
              const name = patientData.patientName;
              // Create clean URL with only required params
              const url = new URL(window.location.origin + window.location.pathname);
              url.searchParams.set('page', 'my-history');
              url.searchParams.set('phone', phone);
              url.searchParams.set('name', name);
              console.log('📜 Navigating to patient history:', url.toString());
              window.location.href = url.toString();
            }}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white mb-4"
          >
            <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {bt('View My Consultation History')}
          </Button>

          <button onClick={onBackToHome} className="w-full text-center text-gray-400 hover:text-white mt-4">
            {t('backToHome', language)}
          </button>
        </div>
      </div>
    </BookingFlowLayout>
  );
}
