import { Send, Video, FileText, Eye, Calendar, Star, Bell, X, Upload, Check, Download, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { useState } from 'react';
import DoctorRxUploadModal from './DoctorRxUploadModal';
// import { DoctorAIRXUploadModal } from './DoctorAIRXUploadModal';
// import { PatientOldRXViewer } from './PatientOldRXViewer';
import { type Language } from '../utils/translations';

interface PatientActionsBarProps {
  patient: {
    id: string;
    name: string;
    phone: string;
    bookingId: string;
    age: number;
    gender: string;
    visitType?: string;
    prescriptionUrl?: string; // Old RX uploaded by patient
    prescriptionReviewed?: boolean; // Whether doctor has reviewed it
    isMarkedSeen?: boolean; // Whether consultation is completed
    isCancelled?: boolean; // Whether booking is cancelled
  };
  onSendPrescription?: () => void;
  onVideoCall?: () => void;
  onViewRx?: () => void;
  onSchedule?: () => void;
  onToggleFavorite?: () => void;
  onNotify?: () => void;
  onDelete?: () => void;
  onViewOldRx?: () => void; // View patient's uploaded old RX
  onMarkedSeen?: () => void; // NEW: Mark consultation as completed
  isPrescriptionSent?: boolean;
  isVideoCallActive?: boolean;
  hasNotification?: boolean;
  patientJoinedVC?: boolean; // NEW: Patient has joined video consultation (waiting)
  hasAIRXReaderPackage?: boolean; // Whether doctor has AI RX Reader package activated
  hasVideoConsultationPackage?: boolean; // Whether doctor has Video Consultation package activated
  patientLanguage?: Language; // Patient's preferred language for AI translation
  reviewScheduled?: boolean; // Whether review request is scheduled
  followUpScheduled?: boolean; // Whether follow-up is scheduled
}

export default function PatientActionsBar({
  patient,
  onSendPrescription,
  onVideoCall,
  onViewRx,
  onSchedule,
  onToggleFavorite,
  onNotify,
  onDelete,
  onViewOldRx,
  onMarkedSeen,
  isPrescriptionSent = false,
  isVideoCallActive = false,
  hasNotification = false,
  patientJoinedVC = false,
  hasAIRXReaderPackage = true, // FREE FEATURE - Always enabled
  hasVideoConsultationPackage = false, // Default to false (locked)
  patientLanguage = 'english',
  reviewScheduled = false,
  followUpScheduled = false,
}: PatientActionsBarProps) {
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  // const [aiUploadModalOpen, setAiUploadModalOpen] = useState(false);
  // const [newAiUploadModalOpen, setNewAiUploadModalOpen] = useState(false);
  // const [oldRxViewerOpen, setOldRxViewerOpen] = useState(false);
  
  // Check if patient uploaded old RX
  const hasOldRx = !!patient.prescriptionUrl;
  const isOldRxReviewed = !!patient.prescriptionReviewed;

  // Normal Upload Handler - Always opens normal upload modal (for Video Consultation)
  const handleNormalUploadClick = () => {
    setUploadModalOpen(true);
  };

  /*
  const handleViewOldRx = () => {
    setOldRxViewerOpen(true);
  };
  */

  const handleUploadSuccess = (data: {
    fileName: string;
    fileUrl: string;
    ocrText: string;
    translations: {
      english: string;
      hindi: string;
      bengali: string;
    };
  }) => {
    toast.success(`Prescription uploaded for ${patient.name}`, {
      description: 'Patient notified with download link',
    });
    setUploadModalOpen(false);
  };

  // AI Upload Handler - Always opens AI upload modal (for AI RX Reader)
  /*
  const handleNewAiUploadClick = () => {


    setNewAiUploadModalOpen(true);

  };

  const handleNewAiUploadSuccess = (data: {
    fileName: string;
    fileUrl: string;
    ocrText: string;
    translations: {
      english: string;
      hindi: string;
      bengali: string;
    };
  }) => {
    toast.success(`AI Prescription uploaded for ${patient.name}`, {
      description: 'Patient notified with AI analysis & download link',
    });
    setNewAiUploadModalOpen(false);
  };
  */

  return (
    <>
      <div className="flex items-center gap-2 flex-wrap">
        {/* Download Patient's Old RX Button - Blue with Download icon - ONLY if patient uploaded */}
        {/* {hasOldRx && (
          <button
            onClick={handleViewOldRx}
            className={`relative w-12 h-12 rounded-full ${
              isOldRxReviewed 
                ? 'bg-emerald-600 hover:bg-emerald-700' 
                : 'bg-blue-600 hover:bg-blue-700'
            } flex items-center justify-center transition-all hover:scale-110 group`}
            title={isOldRxReviewed ? "Patient's Old RX (Reviewed)" : "Download Patient's Old RX"}
          >
            <Download className="w-5 h-5 text-white" />
            {!isOldRxReviewed && (
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-400 rounded-full border-2 border-gray-900 animate-pulse"></div>
            )}
            <span className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
              {isOldRxReviewed ? 'Old RX (Reviewed)' : 'Download Old RX'}
            </span>
          </button>
        )} */}

        {/* Normal Upload Button - Purple with Sparkle - ONLY if Video Consultation package is active */}
        {hasVideoConsultationPackage && (
          <button
            onClick={handleNormalUploadClick}
            className="relative w-12 h-12 rounded-full bg-purple-600 hover:bg-purple-700 flex flex-col items-center justify-center transition-all hover:scale-110 group shadow-lg shadow-purple-500/30"
            title="Upload RX (Normal)"
          >
            <Sparkles className="w-4 h-4 text-white mb-0.5" />
            {/* Upward Arrow */}
            <svg 
              className="w-3.5 h-3.5 text-white" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2.5" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 19V5m0 0l-7 7m7-7l7 7" />
            </svg>
            {isPrescriptionSent && (
              <div className="absolute -top-1 -right-1 w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center border-2 border-gray-900">
                <Check className="w-3 h-3 text-white" />
              </div>
            )}
            <span className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-20">
              Upload RX
            </span>
          </button>
        )}

        {/* AI Upload Button - Purple/Pink Gradient with AI Text - ONLY if AI RX Reader package is active */}
        {/* {hasAIRXReaderPackage && (
          <button
            onClick={handleNewAiUploadClick}
            className="relative w-12 h-12 rounded-full bg-gradient-to-br from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 flex flex-col items-center justify-center transition-all hover:scale-110 group shadow-lg shadow-pink-500/50"
            title="AI Upload RX with Analysis"
          >
            <div className="flex items-center gap-0.5 mb-0.5">
              <span className="text-[9px] font-bold text-white leading-none tracking-tight">AI</span>
              <Sparkles className="w-2.5 h-2.5 text-yellow-300" />
            </div>
            <svg 
              className="w-3.5 h-3.5 text-white" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2.5" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 19V5m0 0l-7 7m7-7l7 7" />
            </svg>
            <span className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-20">
              AI Upload
            </span>
          </button>
        )} */}

        {/* Video Call Button - Red/Maroon with BLINKING indicator when patient joined - ONLY if Video Consultation package is active */}
        {hasVideoConsultationPackage && (
          <button
            onClick={onVideoCall}
            className={`relative w-12 h-12 rounded-full flex items-center justify-center transition-all hover:scale-110 group ${
              patientJoinedVC
                ? 'bg-[#8B2635] hover:bg-[#A02A3A] animate-pulse'
                : 'bg-[#8B2635] hover:bg-[#A02A3A]'
            }`}
            title={patientJoinedVC ? 'Patient Waiting! Click to join' : 'Video Consultation'}
          >
            {/* Blinking ring effect when patient joined */}
            {patientJoinedVC && (
              <div className="absolute inset-0 rounded-full bg-green-500 opacity-50 animate-ping"></div>
            )}
            
            <Video className="w-5 h-5 text-white relative z-10" />
            
            {/* Blinking green badge when patient is waiting */}
            {patientJoinedVC && (
              <div className="absolute -top-1 -right-1 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center border-2 border-gray-900 animate-pulse">
                <div className="w-2 h-2 bg-white rounded-full animate-ping"></div>
              </div>
            )}
            
            {/* Active call indicator (when doctor is in call) */}
            {isVideoCallActive && !patientJoinedVC && (
              <div className="absolute -top-1 -right-1 w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center border-2 border-gray-900">
                <Check className="w-3 h-3 text-white" />
              </div>
            )}
            
            <span className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-20">
              {patientJoinedVC ? 'Patient Waiting!' : 'Video Call'}
            </span>
          </button>
        )}

        {/* View RX Button - Orange */}
        <button
          onClick={onViewRx}
          className="relative w-12 h-12 rounded-full bg-orange-600 hover:bg-orange-700 flex items-center justify-center transition-all hover:scale-110 group"
          title="View Prescription"
        >
          <FileText className="w-5 h-5 text-white" />
          <span className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
            View RX
          </span>
        </button>

        {/* Eye Button - Marked Seen (Doctor Controlled) */}
        <button
          onClick={onMarkedSeen}
          disabled={patient.isMarkedSeen || patient.isCancelled}
          className={`relative w-12 h-12 rounded-full flex items-center justify-center transition-all group ${
            patient.isMarkedSeen 
              ? 'bg-emerald-600 cursor-not-allowed opacity-70'
              : patient.isCancelled
              ? 'bg-gray-600 cursor-not-allowed opacity-50'
              : 'bg-teal-600 hover:bg-teal-700 hover:scale-110'
          }`}
          title={patient.isMarkedSeen ? 'Consultation Completed' : patient.isCancelled ? 'Cancelled' : 'Mark as Seen'}
        >
          <Eye className="w-5 h-5 text-white" />
          {patient.isMarkedSeen && (
            <div className="absolute -top-1 -right-1 w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center border-2 border-gray-900 animate-pulse">
              <Check className="w-3 h-3 text-white" />
            </div>
          )}
          <span className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
            {patient.isMarkedSeen ? 'Seen ✓' : 'Mark Seen'}
          </span>
        </button>

        {/* Schedule Follow-up Button - Activated after Eye pressed */}
        <button
          onClick={onSchedule}
          disabled={!patient.isMarkedSeen || patient.isCancelled}
          className={`relative w-12 h-12 rounded-full flex items-center justify-center transition-all group ${
            !patient.isMarkedSeen || patient.isCancelled
              ? 'bg-slate-700/30 cursor-not-allowed opacity-50'
              : followUpScheduled
              ? 'bg-emerald-600 hover:bg-emerald-700 hover:scale-110'
              : 'bg-slate-700 hover:bg-slate-600 hover:scale-110'
          }`}
          title={!patient.isMarkedSeen ? 'Complete consultation first' : followUpScheduled ? 'Follow-up Scheduled' : 'Schedule Follow-up'}
        >
          <Calendar className="w-5 h-5 text-white" />
          {followUpScheduled && (
            <div className="absolute -top-1 -right-1 w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center border-2 border-gray-900">
              <Check className="w-3 h-3 text-white" />
            </div>
          )}
          <span className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
            {followUpScheduled ? 'Scheduled ✓' : 'Follow-up'}
          </span>
        </button>

        {/* Notification Bell Button - SYSTEM CONTROLLED (Appointment Reminder) */}
        <button
          disabled
          className="relative w-12 h-12 rounded-full bg-yellow-600/50 cursor-not-allowed flex items-center justify-center group opacity-70"
          title="Appointment Reminder (System Controlled)"
        >
          <Bell className="w-5 h-5 text-white" />
          {hasNotification && (
            <div className="absolute -top-1 -right-1 w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center border-2 border-gray-900 animate-pulse">
              <Check className="w-3 h-3 text-white" />
            </div>
          )}
          <span className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
            System Controlled
          </span>
        </button>

        {/* Review Request Button (Star) - Activated after Eye pressed */}
        <button
          onClick={onToggleFavorite}
          disabled={!patient.isMarkedSeen || patient.isCancelled}
          className={`relative w-12 h-12 rounded-full flex items-center justify-center transition-all group ${
            !patient.isMarkedSeen || patient.isCancelled
              ? 'bg-blue-900/30 cursor-not-allowed opacity-50'
              : reviewScheduled
              ? 'bg-yellow-600 hover:bg-yellow-700 hover:scale-110'
              : 'bg-blue-900 hover:bg-blue-800 hover:scale-110'
          }`}
          title={!patient.isMarkedSeen ? 'Complete consultation first' : reviewScheduled ? 'Review Requested' : 'Request Review'}
        >
          <Star className="w-5 h-5 text-white" />
          {reviewScheduled && (
            <div className="absolute -top-1 -right-1 w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center border-2 border-gray-900">
              <Check className="w-3 h-3 text-white" />
            </div>
          )}
          <span className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
            {reviewScheduled ? 'Requested ✓' : 'Review'}
          </span>
        </button>

        {/* Delete/Close Button - Red */}
        <button
          onClick={onDelete}
          className="relative w-12 h-12 rounded-full bg-red-600 hover:bg-red-700 flex items-center justify-center transition-all hover:scale-110 group"
          title="Remove Patient"
        >
          <X className="w-5 h-5 text-white" />
          <span className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
            Remove
          </span>
        </button>
      </div>

      {/* Upload RX Modal (Simple - for doctors without AI package) */}
      <DoctorRxUploadModal
        isOpen={uploadModalOpen}
        onClose={() => setUploadModalOpen(false)}
        patientId={patient.bookingId}
        patientName={patient.name}
        onUploadSuccess={handleUploadSuccess}
      />

      {/* Upload RX with AI Analysis Modal (for doctors with AI RX Reader package) */}
      {/* <DoctorAIRXUploadModal
        isOpen={aiUploadModalOpen}
        onClose={() => setAiUploadModalOpen(false)}
        patientName={patient.name}
        patientId={patient.id}
        patientPhone={patient.phone}
        patientLanguage={patientLanguage}
        onUploadSuccess={handleNewAiUploadSuccess}
      /> */}

      {/* NEW: AI Upload Modal for ALL Patients */}
      {/* <DoctorAIRXUploadModal
        isOpen={newAiUploadModalOpen}
        onClose={() => setNewAiUploadModalOpen(false)}
        patientName={patient.name}
        patientId={patient.id}
        patientPhone={patient.phone}
        patientLanguage={patientLanguage}
        onUploadSuccess={handleNewAiUploadSuccess}
      /> */}

      {/* Patient's Old RX Viewer Modal */}
      {/* <PatientOldRXViewer
        isOpen={oldRxViewerOpen}
        onClose={() => setOldRxViewerOpen(false)}
        patientName={patient.name}
        patientId={patient.id}
        oldRXFiles={[
          {
            id: 'rx-old-1',
            fileName: 'Previous-Prescription-1.jpg',
            uploadDate: '2025-11-10 09:30 AM',
            fileUrl: 'https://images.unsplash.com/photo-1584820927498-cfe5211fd8bf?w=600',
            viewed: false,
          },
          {
            id: 'rx-old-2',
            fileName: 'Old-RX-Oct-2025.jpg',
            uploadDate: '2025-10-15 02:45 PM',
            fileUrl: 'https://images.unsplash.com/photo-1584820927498-cfe5211fd8bf?w=600',
            viewed: true,
          },
        ]}
      /> */}
    </>
  );
}
