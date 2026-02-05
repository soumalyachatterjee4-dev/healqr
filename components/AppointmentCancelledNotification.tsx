import { Calendar } from 'lucide-react';
import TemplateDisplay from './TemplateDisplay';

interface AppointmentCancelledNotificationProps {
  bookingId?: string;
  language?: 'en' | 'hi' | 'bn';
  patientName?: string;
  doctorName?: string;
  specialization?: string;
  clinicName?: string;
  cancelledDate?: string;
  cancellationTime?: string;
  cancellationReason?: string;
}

export default function AppointmentCancelledNotification({
  bookingId,
  language = 'en',
  patientName = 'Rahul Kumar',
  doctorName = 'Dr. Anika Sharma',
  specialization = 'Cardiologist',
  clinicName = 'Health Care Clinic',
  cancelledDate = 'October 10, 2025',
  cancellationTime = '10:00 AM',
  cancellationReason = 'Unavoidable circumstances',
}: AppointmentCancelledNotificationProps) {
  
  const content = {
    en: {
      title: 'APPOINTMENT CANCELLED',
      greeting: `Hello ${patientName},`,
      message: `Due to unavoidable circumstances, your appointment at ${clinicName} scheduled for ${cancelledDate} has been cancelled.`,
      cancelledDateLabel: 'Cancelled Date:',
      timeLabel: 'Time:',
      chamberLabel: 'Chamber:',
      reasonLabel: 'Reason:',
      reschedulingLabel: 'Rescheduling:',
      reschedulingText: "Scan Dr's unique QR code for new appointment",
      healthTip: "Today's Health Tip",
      footer: 'Powered by HealQR.com',
    },
    hi: {
      title: 'अपॉइंटमेंट रद्द',
      greeting: `नमस्ते ${patientName},`,
      message: `अपरिहार्य परिस्थितियों के कारण, ${clinicName} में ${cancelledDate} के लिए निर्धारित आपकी अपॉइंटमेंट रद्द कर दी गई है।`,
      cancelledDateLabel: 'रद्द तिथि:',
      timeLabel: 'समय:',
      chamberLabel: 'चैंबर:',
      reasonLabel: 'कारण:',
      reschedulingLabel: 'पुनर्निर्धारण:',
      reschedulingText: 'नई अपॉइंटमेंट के लिए डॉक्टर का अनोखा QR कोड स्कैन करें',
      healthTip: 'आज का स्वास्थ्य टिप',
      footer: 'HealQR.com द्वारा संचालित',
    },
    bn: {
      title: 'অ্যাপয়েন্টমেন্ট বাতিল',
      greeting: `হ্যালো ${patientName},`,
      message: `অনিবার্য পরিস্থিতির কারণে, ${clinicName}-এ ${cancelledDate}-এর জন্য নির্ধারিত আপনার অ্যাপয়েন্টমেন্ট বাতিল করা হয়েছে।`,
      cancelledDateLabel: 'বাতিল তারিখ:',
      timeLabel: 'সময়:',
      chamberLabel: 'চেম্বার:',
      reasonLabel: 'কারণ:',
      reschedulingLabel: 'পুনঃনির্ধারণ:',
      reschedulingText: 'নতুন অ্যাপয়েন্টমেন্টের জন্য ডাক্তারের অনন্য QR কোড স্কান করুন',
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
            {/* Header - Green Calendar Icon */}
            <div className="bg-white px-6 pt-6 pb-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-emerald-500 rounded-full flex items-center justify-center flex-shrink-0">
                  <Calendar className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1">
                  <h2 className="text-gray-900 leading-tight">{t.title}</h2>
                </div>
              </div>
            </div>

      {/* Doctor Info */}
      <div className="px-6 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-indigo-500 rounded-full flex items-center justify-center flex-shrink-0">
            <span className="text-white">AS</span>
          </div>
          <div>
            <h3 className="text-gray-900">{doctorName}</h3>
            <p className="text-gray-500 text-sm">{specialization}</p>
          </div>
        </div>
      </div>

      {/* Greeting */}
      <div className="px-6 pb-3">
        <p className="text-gray-700">
          {t.greeting} <span className="inline-block">👋</span>
        </p>
      </div>

      {/* Main Message */}
      <div className="px-6 pb-4">
        <p className="text-gray-600 text-sm leading-relaxed">
          {t.message}
        </p>
      </div>

      {/* Details Section */}
      <div className="px-6 pb-4 bg-gray-50 mx-6 rounded-lg p-4">
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-700">{t.chamberLabel}</span>
            <span className="text-gray-900 font-medium">{clinicName}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-700">{t.cancelledDateLabel}</span>
            <span className="text-gray-900 font-medium">{cancelledDate}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-700">{t.timeLabel}</span>
            <span className="text-gray-900 font-medium">{cancellationTime}</span>
          </div>
          <div className="pt-2 border-t">
            <span className="text-gray-700">{t.reasonLabel}</span>{' '}
            <span className="text-gray-900 font-medium">{cancellationReason}</span>
          </div>
          <div className="pt-2 border-t">
            <span className="text-gray-700">{t.reschedulingLabel}</span>{' '}
            <span className="text-gray-900">{t.reschedulingText}</span>
          </div>
        </div>
      </div>

      {/* Health Tip Section */}
      <div className="px-6 py-4">
        <TemplateDisplay placement="notif-appointment-cancelled" className="mb-0" />
      </div>

      {/* Footer */}
      <div className="px-6 pb-6 text-center">
        <p className="text-gray-400 text-xs">{t.footer}</p>
      </div>
          </div>
        </div>
      </div>
    </div>
  );
}