import { RotateCcw } from 'lucide-react';
import TemplateDisplay from './TemplateDisplay';

interface AppointmentRestoredNotificationProps {
  bookingId?: string;
  // Doctor Info
  doctorName?: string;
  doctorSpecialty?: string;
  doctorInitials?: string;
  
  // Patient Info
  patientName?: string;
  
  // Appointment Details
  clinicName?: string;
  restoredDate?: string;
  chamberName?: string;
  scheduleTime?: string;
  location?: string;
  bookingSerialNo?: string;
  uniqueBookingId?: string;
  
  // Multilingual
  language?: 'en' | 'hi' | 'bn';
  
  // Health Tip
  healthTip?: string;
}

export default function AppointmentRestoredNotification({
  bookingId,
  doctorName = 'Dr. Unknown',
  doctorSpecialty = 'General',
  doctorInitials = 'DU',
  patientName = 'Patient',
  clinicName = 'Clinic',
  restoredDate = 'Unknown Date',
  chamberName = 'Unknown Chamber',
  scheduleTime = 'Unknown Time',
  location = 'Unknown Location',
  bookingSerialNo = '#0',
  uniqueBookingId = 'HQL-000000',
  language = 'en',
  healthTip = "Regular health checkups help detect problems before they start.",
}: AppointmentRestoredNotificationProps) {
  
  const content = {
    en: {
      title: 'APPOINTMENT RESTORED',
      greeting: `Hello ${patientName}, 👋`,
      message: `We are pleased to inform you that your appointment at ${clinicName} for ${restoredDate} has been restored. Your appointment with Dr. ${doctorName} is confirmed.`,
      chamberLabel: 'Chamber:',
      dateLabel: 'Date:',
      scheduleTimeLabel: 'Schedule Time:',
      locationLabel: 'Location:',
      bookingSerialLabel: 'Booking Serial No:',
      uniqueBookingLabel: 'Unique Booking ID:',
      arrivalMessage: 'Please arrive 15 minutes before your scheduled time.',
      healthTip: "Today's Health Tip",
      footer: 'Powered by HealQR.com',
    },
    hi: {
      title: 'अपॉइंटमेंट पुनर्स्थापित',
      greeting: `नमस्ते ${patientName}, 👋`,
      message: `हमें आपको सूचित करते हुए खुशी हो रही है कि ${clinicName} में ${restoredDate} के लिए आपकी अपॉइंटमेंट पुनर्स्थापित कर दी गई है। डॉ. ${doctorName} के साथ आपका अपॉइंटमेंट पुष्ट है।`,
      chamberLabel: 'चैंबर:',
      dateLabel: 'तिथि:',
      scheduleTimeLabel: 'समय:',
      locationLabel: 'स्थान:',
      bookingSerialLabel: 'बुकिंग क्रमांक:',
      uniqueBookingLabel: 'अनोखा बुकिंग ID:',
      arrivalMessage: 'कृपया अपने निर्धारित समय से 15 मिनट पहले पहुंचें।',
      healthTip: 'आज का स्वास्थ्य टिप',
      footer: 'HealQR.com द्वारा संचालित',
    },
    bn: {
      title: 'অ্যাপয়েন্টমেন্ট পুনরুদ্ধার',
      greeting: `হ্যালো ${patientName}, 👋`,
      message: `আমরা আপনাকে জানাতে পেরে আনন্দিত যে ${clinicName}-এ ${restoredDate}-এর জন্য আপনার অ্যাপয়েন্টমেন্ট পুনরুদ্ধার করা হয়েছে। ডাঃ ${doctorName}-এর সাথে আপনার অ্যাপয়েন্টমেন্ট নিশ্চিত করা হয়েছে।`,
      chamberLabel: 'চেম্বার:',
      dateLabel: 'তারিখ:',
      scheduleTimeLabel: 'সময়সূচী:',
      locationLabel: 'অবস্থান:',
      bookingSerialLabel: 'বুকিং সিরিয়াল নম্বর:',
      uniqueBookingLabel: 'অনন্য বুকিং ID:',
      arrivalMessage: 'অনুগ্রহ করে আপনার নির্ধারিত সময়ের 15 মিনিট আগে পৌঁছান।',
      healthTip: 'আজকের স্বাস্থ্য টিপ',
      footer: 'HealQR.com দ্বারা চালিত',
    },
  };

  const t = content[language];

  return (
    <div className="flex items-center justify-center py-8">
      {/* Phone Mockup with Black Border */}
      <div className="w-full max-w-sm">
        {/* Phone Frame */}
        <div className="bg-gray-900 rounded-3xl p-4 shadow-2xl border-8 border-gray-800">
          {/* Notification Card */}
          <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
            {/* Header with Icon and Title */}
            <div className="px-6 pt-6 pb-4">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-emerald-500 rounded-full flex items-center justify-center flex-shrink-0">
                  <RotateCcw className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-gray-900">{t.title}</h1>
                </div>
              </div>

              {/* Doctor Info */}
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-indigo-500 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-white">{doctorInitials}</span>
                </div>
                <div>
                  <p className="text-gray-900">{doctorName}</p>
                  <p className="text-gray-500 text-sm">{doctorSpecialty}</p>
                </div>
              </div>

              {/* Greeting */}
              <p className="text-gray-700 mb-4">{t.greeting}</p>

              {/* Message */}
              <p className="text-gray-700 mb-6 leading-relaxed">
                {t.message}
              </p>

              {/* Appointment Details Box */}
              <div className="bg-gray-50 rounded-xl p-4 mb-6 space-y-2 mx-6">
            <div className="flex justify-between">
              <span className="text-gray-600">{t.chamberLabel}</span>
              <span className="text-gray-900">{chamberName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">{t.dateLabel}</span>
              <span className="text-gray-900">{restoredDate}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">{t.scheduleTimeLabel}</span>
              <span className="text-gray-900">{scheduleTime}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">{t.locationLabel}</span>
              <span className="text-gray-900">{location}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">{t.bookingSerialLabel}</span>
              <span className="text-gray-900">{bookingSerialNo}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">{t.uniqueBookingLabel}</span>
              <span className="text-gray-900">{uniqueBookingId}</span>
            </div>
              </div>

              {/* Arrival Message */}
              <p className="text-gray-700 mb-6 px-6">
                {t.arrivalMessage}
              </p>

              {/* Health Tip Section */}
              <div className="px-6 py-4">
                <TemplateDisplay placement="notif-appointment-restored" className="mb-0" />
              </div>

          {/* Footer */}
          <div className="text-center mt-6 pt-4 border-t border-gray-200">
            <p className="text-gray-400 text-sm">{t.footer}</p>
          </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}