import { MessageCircle, Clock, AlertCircle } from 'lucide-react';
import TemplateDisplay from './TemplateDisplay';

interface ChatRequestNotificationProps {
  doctorName?: string;
  doctorSpecialization?: string;
  patientName?: string;
  chatExpiredDate?: string;
  requestValidUntil?: string;
  healthTip?: string;
  language?: 'en' | 'hi' | 'bn';
}

const translations = {
  en: {
    title: 'CHAT SESSION EXPIRED',
    hello: 'Hello',
    mainMessage: 'Your chat session with',
    hasExpired: 'has expired.',
    goodNews: 'Good News!',
    keepLinkMessage: 'You can still request a new chat session using this expired link. Just click the button below and we\'ll notify the doctor.',
    requestButton: 'Request New Chat Session',
    note: 'Note:',
    oneRequestInfo: 'You can make one request per expired link. The doctor will send you a new chat link once approved.',
    requestValidUntil: 'Re-chat request valid until:',
    expiredOn: 'Chat expired on:',
    healthTipTitle: 'Today\'s Health Tip',
    poweredBy: 'Powered by HealQR.com'
  },
  hi: {
    title: 'चैट सत्र समाप्त हो गया',
    hello: 'नमस्ते',
    mainMessage: 'आपका चैट सत्र',
    hasExpired: 'के साथ समाप्त हो गया है।',
    goodNews: 'अच्छी खबर!',
    keepLinkMessage: 'आप अभी भी इस समाप्त लिंक का उपयोग करके नया चैट सत्र का अनुरोध कर सकते हैं। बस नीचे दिए गए बटन पर क्लिक करें और हम डॉक्टर को सूचित करेंगे।',
    requestButton: 'नया चैट सत्र का अनुरोध करें',
    note: 'नोट:',
    oneRequestInfo: 'आप प्रति समाप्त लिंक एक अनुरोध कर सकते हैं। स्वीकृति के बाद डॉक्टर आपको नया चैट लिंक भेजेंगे।',
    requestValidUntil: 'पुनः चैट अनुरोध मान्य है:',
    expiredOn: 'चैट समाप्त हुई:',
    healthTipTitle: 'आज का स्वास्थ्य टिप',
    poweredBy: 'HealQR.com द्वारा संचालित'
  },
  bn: {
    title: 'চ্যাট সেশন মেয়াদ শেষ',
    hello: 'হ্যালো',
    mainMessage: 'আপনার চ্যাট সেশন',
    hasExpired: 'এর সাথে মেয়াদ শেষ হয়েছে।',
    goodNews: 'সুসংবাদ!',
    keepLinkMessage: 'আপনি এখনও এই মেয়াদোত্তীর্ণ লিঙ্ক ব্যবহার করে নতুন চ্যাট সেশনের অনুরোধ করতে পারেন। শুধু নিচের বোতামে ক্লিক করুন এবং আমরা ডাক্তারকে জানাব।',
    requestButton: 'নতুন চ্যাট সেশনের অনুরোধ করুন',
    note: 'নোট:',
    oneRequestInfo: 'আপনি প্রতি মেয়াদোত্তীর্ণ লিঙ্কে একটি অনুরোধ করতে পারেন। অনুমোদনের পর ডাক্তার আপনাকে নতুন চ্যাট লিঙ্ক পাঠাবেন।',
    requestValidUntil: 'পুনরায় চ্যাট অনুরোধ বৈধ:',
    expiredOn: 'চ্যাট মেয়াদ শেষ:',
    healthTipTitle: 'আজকের স্বাস্থ্য টিপ',
    poweredBy: 'HealQR.com দ্বারা চালিত'
  }
};

export default function ChatRequestNotification({
  doctorName = 'Dr. Anika Sharma',
  doctorSpecialization = 'Cardiologist',
  patientName = 'Rahul Kumar',
  chatExpiredDate = 'November 10, 2025',
  requestValidUntil = 'November 30, 2025',
  healthTip = '',
  language = 'en'
}: ChatRequestNotificationProps) {
  const t = translations[language];

  return (
    <div className="min-h-screen bg-[#1a1f2e] text-white p-4 sm:p-6 flex items-center justify-center">
      <div className="max-w-md w-full">
        {/* Card */}
        <div className="bg-white rounded-3xl overflow-hidden shadow-2xl">
          {/* Header */}
          <div className="bg-gradient-to-r from-orange-500 to-red-500 p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center">
              <Clock className="w-6 h-6 text-orange-600" />
            </div>
            <div className="flex-1">
              <h2 className="text-white text-lg font-semibold">{t.title}</h2>
            </div>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            {/* Doctor Info */}
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center flex-shrink-0">
                <span className="text-white text-xl font-semibold">
                  {doctorName.split(' ')[1]?.charAt(0) || 'A'}S
                </span>
              </div>
              <div className="flex-1">
                <h3 className="text-gray-900 font-semibold text-lg">{doctorName}</h3>
                <p className="text-gray-600 text-sm">{doctorSpecialization}</p>
              </div>
            </div>

            {/* Greeting */}
            <div className="text-gray-800">
              <p className="text-base">
                {t.hello} <span className="font-semibold text-orange-600">{patientName}</span>, 👋
              </p>
            </div>

            {/* Expired Message */}
            <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-gray-700 text-sm leading-relaxed">
                    {t.mainMessage} <span className="font-semibold">{doctorName}</span> {t.hasExpired}
                  </p>
                </div>
              </div>
            </div>

            {/* Expired Date */}
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">{t.expiredOn}</span>
              <span className="text-gray-900 font-semibold">{chatExpiredDate}</span>
            </div>

            {/* Good News Section */}
            <div className="bg-green-50 border-2 border-green-200 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <MessageCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-green-800 font-semibold text-sm mb-2">{t.goodNews}</p>
                  <p className="text-gray-700 text-sm leading-relaxed">
                    {t.keepLinkMessage}
                  </p>
                </div>
              </div>
            </div>

            {/* Request Button */}
            <button className="w-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white py-4 rounded-xl font-semibold text-base shadow-lg hover:shadow-xl transition-all transform hover:scale-[1.02] flex items-center justify-center gap-2">
              <MessageCircle className="w-5 h-5" />
              {t.requestButton}
            </button>

            {/* Note */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-blue-900 text-xs">
                <span className="font-semibold">{t.note}</span> {t.oneRequestInfo}
              </p>
            </div>

            {/* Request Valid Until */}
            <div className="border-t border-gray-200 pt-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">{t.requestValidUntil}</span>
                <span className="text-green-600 font-semibold">{requestValidUntil}</span>
              </div>
            </div>

            {/* Health Tip Section */}
            <TemplateDisplay placement="notif-chat-request" className="mb-0" />
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
