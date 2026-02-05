import { Button } from './ui/button';
import { Menu } from 'lucide-react';
import { useState } from 'react';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import DashboardSidebar from './DashboardSidebar';
import BookingMiniWebsite from './BookingMiniWebsite';
import AppointmentReminderNotification from './AppointmentReminderNotification';
import ConsultationCompletedNotification from './ConsultationCompletedNotification';
import AdminAlertNotification from './AdminAlertNotification';
import AppointmentSlotReleasedNotification from './AppointmentSlotReleasedNotification';
import ReviewRequestNotification from './ReviewRequestNotification';
import FollowUpNotification from './FollowUpNotification';
import AppointmentCancelledNotification from './AppointmentCancelledNotification';
import AppointmentRestoredNotification from './AppointmentRestoredNotification';
import ChatRequestNotification from './ChatRequestNotification';
import ChatLinkNotification from './ChatLinkNotification';
import PatientChatInterface from './PatientChatInterface';
import VideoConsultationNotification from './VideoConsultationNotification';
import PatientVideoConsultation from './PatientVideoConsultation';
import VideoConsultationLinkNotification from './VideoConsultationLinkNotification';
import RXDownloadNotification from './RXDownloadNotification';
import { AIRXAnalysisNotification } from './AIRXAnalysisNotification';
import WalkInPreview from './WalkInPreview';

interface Review {
  id: number;
  patientName: string;
  rating: number;
  date: string;
  comment: string;
  verified: boolean;
}

interface PreviewCenterProps {
  onMenuChange?: (menu: string) => void;
  onLogout?: () => void;
  uploadedReviews?: Review[];
  activeAddOns?: string[];
}

export default function PreviewCenter({ onMenuChange, onLogout, uploadedReviews = [], activeAddOns = [] }: PreviewCenterProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [templateType, setTemplateType] = useState('mini-website');
  const [language, setLanguage] = useState<'en' | 'hi' | 'bn'>('en');

  // All notification templates now support language!
  const isNotification = templateType !== 'mini-website' && 
    templateType !== 'patient-chat-interface' && 
    templateType !== 'patient-video-consultation' && 
    templateType !== 'video-consultation-link' && 
    templateType !== 'rx-download' &&
    templateType !== 'walkin-verification' &&
    templateType !== 'walkin-complete';
  const supportsLanguage = isNotification || templateType === 'ai-rx-analysis';

  return (
    <div className="min-h-screen bg-[#0a0f1a] text-white">
      {/* Sidebar */}
      <DashboardSidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        activeMenu="preview"
        onMenuChange={onMenuChange || (() => {})}
        onLogout={onLogout}
        activeAddOns={activeAddOns}
      />

      {/* Main Content */}
      <div className="lg:pl-64">
        {/* Header */}
        <div className="border-b border-gray-800 bg-[#0a0f1a]/95 backdrop-blur sticky top-0 z-40">
          <div className="flex items-center justify-between px-4 lg:px-8 py-4">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                className="lg:hidden text-gray-400 hover:text-white"
                onClick={() => setSidebarOpen(true)}
              >
                <Menu className="w-6 h-6" />
              </Button>
              <div>
                <h1 className="text-white">Preview Center</h1>
                <p className="text-gray-400 text-sm mt-1">Mini Website & Notification Template</p>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="px-4 lg:px-8 py-8 max-w-7xl mx-auto">
          {/* Live Reviews Indicator */}
          {uploadedReviews.length > 0 && templateType === 'mini-website' && (
            <div className="flex items-center gap-2 bg-green-500/20 px-4 py-3 rounded-lg border border-green-500/30 mb-6">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-green-400">
                ✓ {uploadedReviews.length} review{uploadedReviews.length > 1 ? 's' : ''} are now LIVE on your mini website below
              </span>
            </div>
          )}
          
          <div className="space-y-6">
            {/* Template Controls */}
            <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-6">
              <h2 className="text-white mb-4">Template Preview</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Template Type Dropdown */}
                <div className="space-y-2">
                  <Label htmlFor="template-type" className="text-gray-300">Template Type</Label>
                  <Select value={templateType} onValueChange={setTemplateType}>
                    <SelectTrigger id="template-type" className="bg-gray-900/50 border-gray-700 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-900 border-gray-700 max-h-[400px] overflow-y-auto">
                      {/* Core Notifications (Position 1-7) */}
                      <SelectItem value="mini-website" className="text-white">1. Mini Website</SelectItem>
                      <SelectItem value="reminder" className="text-white">2. Appointment Reminder</SelectItem>
                      <SelectItem value="completed" className="text-white">3. Consultation Completed</SelectItem>
                      <SelectItem value="admin-alert" className="text-white">4. Admin Alert</SelectItem>
                      <SelectItem value="review-request" className="text-white">5. Review Request</SelectItem>
                      <SelectItem value="follow-up" className="text-white">6. Follow-up</SelectItem>
                      
                      {/* Cancellation & Restoration Notifications (Position 7-8) */}
                      <SelectItem value="cancellation" className="text-white">7. 🔴 Cancellation</SelectItem>
                      <SelectItem value="restoration" className="text-white">8. 🟢 Restoration</SelectItem>
                      
                      {/* Communication & Consultation (Position 10-17) */}
                      <SelectItem value="chat-link" className="text-white">10. Chat Link</SelectItem>
                      <SelectItem value="chat-request" className="text-white">11. Chat Request (Expired Link)</SelectItem>
                      <SelectItem value="video-consultation" className="text-white">12. Video Consultation</SelectItem>
                      <SelectItem value="video-consultation-link" className="text-white">13. Video Consultation Link (30 mins)</SelectItem>
                      <SelectItem value="rx-download" className="text-white">14. RX Download</SelectItem>
                      <SelectItem value="ai-rx-analysis" className="text-white">15. AI RX Analysis</SelectItem>
                      <SelectItem value="patient-chat-interface" className="text-white">16. Patient Chat Interface</SelectItem>
                      <SelectItem value="patient-video-consultation" className="text-white">17. Patient Video Call Interface</SelectItem>
                      <SelectItem value="walkin-verification" className="text-white">18. Walk In Visit Verification</SelectItem>
                      <SelectItem value="walkin-complete" className="text-white">19. Walkin Visit Complete</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Language Dropdown */}
                <div className="space-y-2">
                  <Label htmlFor="language" className="text-gray-300">Language</Label>
                  <Select 
                    value={language} 
                    onValueChange={(val) => setLanguage(val as 'en' | 'hi' | 'bn')}
                    disabled={!supportsLanguage}
                  >
                    <SelectTrigger 
                      id="language" 
                      className={`bg-gray-900/50 border-gray-700 text-white ${!supportsLanguage ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-900 border-gray-700">
                      <SelectItem value="en" className="text-white">English</SelectItem>
                      <SelectItem value="hi" className="text-white">Hindi</SelectItem>
                      <SelectItem value="bn" className="text-white">Bengali</SelectItem>
                    </SelectContent>
                  </Select>
                  {!isNotification && (
                    <p className="text-xs text-gray-500">Language not applicable for Mini Website</p>
                  )}
                  {isNotification && (
                    <p className="text-xs text-emerald-500">✓ Full multilingual support enabled</p>
                  )}
                </div>
              </div>

              {/* Info Box for Cancellation */}
              {templateType === 'cancellation' && (
                <div className="mt-4 bg-red-500/10 border border-red-500/30 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <div className="text-2xl">🔴</div>
                    <div className="flex-1">
                      <p className="text-red-400 mb-2"><strong>Cancellation Notification</strong></p>
                      <p className="text-gray-300 text-sm">
                        <strong>When sent:</strong> Doctor cancels patient appointment (individual or chamber-wide) or patient/system initiates cancellation.
                        <br /><strong>Recipient:</strong> Patient(s) whose appointment was cancelled.
                        <br /><strong>Note:</strong> One unified template for all cancellation reasons - patient only needs to know the appointment is cancelled.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Info Box for Restoration */}
              {templateType === 'restoration' && (
                <div className="mt-4 bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <div className="text-2xl">🟢</div>
                    <div className="flex-1">
                      <p className="text-emerald-400 mb-2"><strong>Restoration Notification</strong></p>
                      <p className="text-gray-300 text-sm">
                        <strong>When sent:</strong> Doctor restores cancelled appointment (individual or chamber-wide) or system/patient restoration is approved.
                        <br /><strong>Recipient:</strong> Patient(s) whose appointment was restored.
                        <br /><strong>Note:</strong> One unified template for all restoration reasons - patient only needs to know the appointment is confirmed again.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Live Preview Indicator */}
            {templateType !== 'mini-website' && (
              <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-4">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 bg-emerald-500 rounded-full animate-pulse"></div>
                  <p className="text-emerald-400">
                    <strong>Live Preview Active</strong> - You're seeing the exact notification patients will receive
                  </p>
                </div>
              </div>
            )}

            {/* Template Preview */}
            <div className="bg-gray-800/50 border border-gray-700 rounded-lg overflow-hidden">
              {templateType === 'mini-website' && (
                <>
                  {uploadedReviews.length === 0 && (
                    <div className="bg-yellow-500/10 border-l-4 border-yellow-500 p-4 mx-6 my-4">
                      <div className="flex items-start gap-3">
                        <div className="text-yellow-500 text-xl">💡</div>
                        <div className="flex-1">
                          <p className="text-yellow-400 text-sm mb-1">
                            <strong>No reviews uploaded yet</strong>
                          </p>
                          <p className="text-gray-400 text-xs">
                            The preview below shows default placeholder reviews. Upload patient reviews from the header review panel to see them here in real-time.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                  <div className="max-w-md mx-auto">
                    <BookingMiniWebsite 
                      uploadedReviews={uploadedReviews}
                      language="en"
                    />
                  </div>
                </>
              )}
              {templateType === 'reminder' && (
                <AppointmentReminderNotification language={language} />
              )}
              {templateType === 'completed' && (
                <ConsultationCompletedNotification language={language} />
              )}
              {templateType === 'admin-alert' && (
                <AdminAlertNotification language={language} />
              )}
              {templateType === 'review-request' && (
                <ReviewRequestNotification language={language} />
              )}
              {templateType === 'follow-up' && (
                <FollowUpNotification language={language} />
              )}
              
              {/* CANCELLATION NOTIFICATION - Unified (Position 8) */}
              {templateType === 'cancellation' && (
                <AppointmentCancelledNotification 
                  language={language}
                  patientName="Rahul Kumar"
                  clinicName="City Medical Center"
                  cancelledDate="November 20, 2025"
                  cancellationReason="Your appointment has been cancelled"
                />
              )}
              
              {/* RESTORATION NOTIFICATION - Unified (Position 9) */}
              {templateType === 'restoration' && (
                <AppointmentRestoredNotification
                  doctorName="Dr. Anika Sharma"
                  doctorSpecialty="Cardiologist"
                  doctorInitials="AS"
                  patientName="Rahul Kumar"
                  clinicName="Health Care Clinic"
                  restoredDate="November 20, 2025"
                  chamberName="City Medical Center"
                  scheduleTime="10:00 AM - 02:00 PM"
                  location="123 Park Street, Kolkata - 700016"
                  bookingSerialNo="#7"
                  uniqueBookingId="V7-001"
                  language={language}
                  healthTip="Your appointment has been successfully restored and confirmed."
                />
              )}
              {templateType === 'chat-link' && (
                <ChatLinkNotification
                  doctorName="Dr. Ankita Sharma"
                  doctorSpecialization="Cardiologist"
                  patientName="Rahul Kumar"
                  chatLink="#"
                  language={language}
                />
              )}
              {templateType === 'chat-request' && (
                <ChatRequestNotification
                  doctorName="Dr. Anika Sharma"
                  doctorSpecialization="Cardiologist"
                  patientName="Rahul Kumar"
                  chatExpiredDate="November 10, 2025"
                  requestValidUntil="November 30, 2025"
                  healthTip="Stay hydrated and maintain regular communication with your doctor."
                  language={language}
                />
              )}
              {templateType === 'video-consultation' && (
                <VideoConsultationNotification
                  doctorName="Dr. Ankita Sharma"
                  doctorSpecialization="Cardiologist"
                  patientName="Rahul Kumar"
                  consultationDate="November 15, 2025"
                  consultationTime="10:00 AM"
                  meetingLink="https://meet.healqr.com/abc-xyz-123"
                  bookingId="V7-001"
                  language={language}
                />
              )}
              {templateType === 'video-consultation-link' && (
                <VideoConsultationLinkNotification
                  patientName="Rajesh Kumar"
                  doctorName="Dr. Priya Sharma"
                  appointmentTime="10:30 AM"
                  appointmentDate="November 14, 2025"
                  consultationLink="https://healqr.com/vc/abc123xyz"
                  isPreview={true}
                />
              )}
              {templateType === 'rx-download' && (
                <RXDownloadNotification
                  patientName="Rajesh Kumar"
                  doctorName="Dr. Priya Sharma"
                  consultationDate="November 14, 2025"
                  rxImageUrl=""
                  isPreview={true}
                />
              )}
              {templateType === 'ai-rx-analysis' && (
                <AIRXAnalysisNotification
                  patientName={language === 'hi' ? 'राहुल शर्मा' : language === 'bn' ? 'রাহুল শর্মা' : 'Rahul Sharma'}
                  doctorName={language === 'hi' ? 'प्रिया शर्मा' : language === 'bn' ? 'প্রিয়া শর্মা' : 'Priya Sharma'}
                  consultationDate={language === 'hi' ? '14 नवंबर 2025' : language === 'bn' ? '১৪ নভেম্বর ২০২৫' : 'November 14, 2025'}
                  language={language === 'hi' ? 'hindi' : language === 'bn' ? 'bengali' : 'english'}
                  prescriptionImage="https://images.unsplash.com/photo-1584820927498-cfe5211fd8bf?w=600"
                  aiDecodedData={{
                    medicines: [
                      {
                        name: language === 'hi' ? 'पैरासिटामोल' : language === 'bn' ? 'প্যারাসিটামল' : 'Paracetamol',
                        dosage: '500mg',
                        frequency: language === 'hi' ? 'दिन में 2 बार' : language === 'bn' ? 'দিনে ২ বার' : '2 times daily',
                        duration: language === 'hi' ? '5 दिन' : language === 'bn' ? '৫ দিন' : '5 days',
                        instructions: language === 'hi' ? 'खाने के बाद लें' : language === 'bn' ? 'খাবারের পরে নিন' : 'Take after meals',
                      },
                      {
                        name: language === 'hi' ? 'अमोक्सिसिलिन' : language === 'bn' ? 'অ্যামক্সিসিলিন' : 'Amoxicillin',
                        dosage: '250mg',
                        frequency: language === 'hi' ? 'दिन में 3 बार' : language === 'bn' ? 'দিনে ৩ বার' : '3 times daily',
                        duration: language === 'hi' ? '7 दिन' : language === 'bn' ? '৭ দিন' : '7 days',
                        instructions: language === 'hi' ? 'पूरा कोर्स लें' : language === 'bn' ? 'সম্পূর্ণ কোর্স নিন' : 'Complete the full course',
                      },
                    ],
                    generalInstructions: language === 'hi' 
                      ? 'पर्याप्त पानी पिएं और आराम करें। यदि लक्षण बिगड़ते हैं तो डॉक्टर से संपर्क करें।' 
                      : language === 'bn' 
                      ? 'পর্যাপ্ত পানি পান করুন এবং বিশ্রাম নিন। লক্ষণ খারাপ হলে ডাক্তারের সাথে যোগাযোগ করুন।'
                      : 'Drink plenty of water and take rest. Contact doctor if symptoms worsen.',
                    dietaryAdvice: language === 'hi'
                      ? 'हल्का भोजन करें, तली हुई चीज़ों से बचें'
                      : language === 'bn'
                      ? 'হালকা খাবার খান, ভাজা খাবার এড়িয়ে চলুন'
                      : 'Eat light meals, avoid fried foods',
                    followUpDate: language === 'hi' ? '20 नवंबर 2025' : language === 'bn' ? '২০ নভেম্বর ২০২৫' : 'November 20, 2025',
                  }}
                  isPreview={true}
                />
              )}
              {templateType === 'patient-chat-interface' && (
                <div className="bg-black">
                  <PatientChatInterface chatToken="abc123xyz" />
                </div>
              )}
              {templateType === 'patient-video-consultation' && (
                <PatientVideoConsultation
                  meetingId="abc-xyz-123"
                  doctorName="Dr. Ankita Sharma"
                  doctorSpecialization="Cardiologist"
                  scheduledDate="November 15, 2025"
                  scheduledTime="10:00 AM"
                  patientName="Rahul Kumar"
                  bookingId="V7-001"
                />
              )}
              {templateType === 'walkin-verification' && (
                <div className="bg-black">
                  <WalkInPreview mode="verification" />
                </div>
              )}
              {templateType === 'walkin-complete' && (
                <div className="bg-black">
                  <WalkInPreview mode="complete" />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
