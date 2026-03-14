import { MessageCircle, Clock, ExternalLink } from 'lucide-react';
import TemplateDisplay from './TemplateDisplay';

interface ChatLinkNotificationProps {
  doctorName?: string;
  doctorSpecialization?: string;
  patientName?: string;
  chatLink?: string;
  language?: 'en' | 'hi' | 'bn';
}

const translations = {
  en: {
    greeting: 'Hello',
    message1: 'wants to talk with you.',
    message2: 'Kindly respond by clicking the link below.',
    expiryInfo: 'Link will be expired within 24 hours',
    buttonText: 'Open Chat',
    note: 'Note:',
    noteMessage: 'This is a secure chat link. Please do not share it with anyone else.',
    healthTipTitle: 'Today\'s Health Tip',
    poweredBy: 'Powered by HealQR.com'
  },
  hi: {
    greeting: 'नमस्ते',
    message1: 'आपसे बात करना चाहते हैं।',
    message2: 'कृपया नीचे दिए गए लिंक पर क्लिक करके जवाब दें।',
    expiryInfo: 'लिंक 24 घंटे के भीतर समाप्त हो जाएगा',
    buttonText: 'चैट खोलें',
    note: 'नोट:',
    noteMessage: 'यह एक सुरक्षित चैट लिंक है। कृपया इसे किसी और के साथ साझा न करें।',
    healthTipTitle: 'आज का स्वास्थ्य टिप',
    poweredBy: 'HealQR.com द्वारा संचालित'
  },
  bn: {
    greeting: 'হ্যালো',
    message1: 'আপনার সাথে কথা বলতে চান।',
    message2: 'অনুগ্রহ করে নিচের লিঙ্কে ক্লিক করে সাড়া দিন।',
    expiryInfo: 'লিঙ্ক 24 ঘন্টার মধ্যে মেয়াদ শেষ হবে',
    buttonText: 'চ্যাট খুলুন',
    note: 'নোট:',
    noteMessage: 'এটি একটি সুরক্ষিত চ্যাট লিঙ্ক। অনুগ্রহ করে এটি অন্য কারো সাথে শেয়ার করবেন না।',
    healthTipTitle: 'আজকের স্বাস্থ্য টিপ',
    poweredBy: 'HealQR.com দ্বারা চালিত'
  }
};

export default function ChatLinkNotification({
  doctorName = 'Dr. Ankita Sharma',
  doctorSpecialization = 'Cardiologist',
  patientName = 'Rahul Kumar',
  chatLink = '#',
  language = 'en'
}: ChatLinkNotificationProps) {
  const t = translations[language];

  return (
    <div className="min-h-screen bg-[#1a1f2e] text-white p-4 sm:p-6 flex items-center justify-center">
      <div className="max-w-md w-full">
        {/* Card */}
        <div className="bg-white rounded-3xl overflow-hidden shadow-2xl">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-500 to-cyan-500 p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center">
              <MessageCircle className="w-6 h-6 text-blue-600" />
            </div>
            <div className="flex-1">
              <h2 className="text-white text-lg font-semibold">New Chat Request</h2>
            </div>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            {/* Greeting */}
            <div className="text-gray-800">
              <p className="text-base">
                {t.greeting} <span className="font-semibold text-blue-600">{patientName}</span>, 👋
              </p>
            </div>

            {/* Doctor Info */}
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center flex-shrink-0">
                <span className="text-white text-xl font-semibold">
                  {doctorName.split(' ')[1]?.charAt(0) || 'A'}S
                </span>
              </div>
              <div className="flex-1">
                <h3 className="text-gray-900 font-semibold text-lg">{doctorName}</h3>
                <p className="text-gray-600 text-sm">{doctorSpecialization}</p>
              </div>
            </div>

            {/* Message */}
            <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <MessageCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-gray-700 text-sm leading-relaxed">
                    <span className="font-semibold">{doctorName}</span> {t.message1}
                  </p>
                  <p className="text-gray-700 text-sm leading-relaxed mt-2">
                    {t.message2}
                  </p>
                </div>
              </div>
            </div>

            {/* Expiry Warning */}
            <div className="flex items-center gap-3 bg-orange-50 border border-orange-200 rounded-lg p-3">
              <Clock className="w-5 h-5 text-orange-600 flex-shrink-0" />
              <p className="text-orange-800 text-sm font-medium">
                {t.expiryInfo}
              </p>
            </div>

            {/* Open Chat Button */}
            <button className="w-full bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white py-4 rounded-xl font-semibold text-base shadow-lg hover:shadow-xl transition-all transform hover:scale-[1.02] flex items-center justify-center gap-2">
              <ExternalLink className="w-5 h-5" />
              {t.buttonText}
            </button>

            {/* Security Note */}
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
              <p className="text-purple-900 text-xs">
                <span className="font-semibold">{t.note}</span> {t.noteMessage}
              </p>
            </div>

            {/* Health Tip Section */}
            <TemplateDisplay placement="notif-chat-link" className="mb-0" />
          </div>

          {/* Footer */}
          <div className="bg-gray-50 px-6 py-3 border-t border-gray-100">
            <p className="text-gray-400 text-xs text-center">{t.poweredBy}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

