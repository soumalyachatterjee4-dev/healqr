import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { ArrowLeft, Calendar, Star, Check, Eye, AlertTriangle, History, Lock, Upload, FileText, Sparkles, Apple } from 'lucide-react';
import { Patient } from './ViewPatientsModal';
import { useState, useEffect } from 'react';
import FollowUpModal from './FollowUpModal';
import PatientHistoryModal from './PatientHistoryModal';
import DigitalRXMaker from './DigitalRXMaker';
import InlineDietChartModal from './InlineDietChartModal';
import { toast } from 'sonner';

interface WalkInPatientsPageProps {
  patients: Patient[];
  onBack: () => void;
  onMenuChange?: (menu: string) => void;
}

interface WalkInPatientStates {
  [key: string]: {
    reviewScheduled: boolean;
    followUpScheduled: boolean;
  };
}

export default function WalkInPatientsPage({ patients, onBack, onMenuChange }: WalkInPatientsPageProps) {
  // Filter patients to only show verified ones
  const verifiedPatients = patients.filter(p => p.verifiedByPatient);

  // State management for buttons - Initialize from Firestore data
  const [patientStates, setPatientStates] = useState<WalkInPatientStates>(() => {
    const initialStates: WalkInPatientStates = {};
    verifiedPatients.forEach(patient => {
      initialStates[patient.id] = {
        reviewScheduled: patient.reviewScheduled || false, // Load from Firestore
        followUpScheduled: patient.followUpScheduled || false, // Load from Firestore
      };
    });
    return initialStates;
  });

  const [followUpModalOpen, setFollowUpModalOpen] = useState(false);
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);

  const [doctorInfo, setDoctorInfo] = useState<{ id: string; name: string }>({
    id: '',
    name: ''
  });

  // Full doctor info for DigitalRXMaker / InlineDietChartModal
  const [fullDoctorInfo, setFullDoctorInfo] = useState<any>(null);

  // RX Maker state
  const [rxMakerOpen, setRxMakerOpen] = useState(false);
  const [rxPatient, setRxPatient] = useState<Patient | null>(null);

  // Diet Chart state
  const [dietChartOpen, setDietChartOpen] = useState(false);
  const [dietPatient, setDietPatient] = useState<Patient | null>(null);

  useEffect(() => {
    const id = localStorage.getItem('userId') || '';
    const name = localStorage.getItem('healqr_user_name') || localStorage.getItem('doctorName') || 'Doctor';
    setDoctorInfo({ id, name });
  }, []);

  // Load full doctor info for PDF generation (same as PatientDetails)
  useEffect(() => {
    const loadFullDoctorInfo = async () => {
      try {
        const userId = localStorage.getItem('userId');
        if (!userId) return;

        const { db } = await import('../lib/firebase/config');
        const { doc, getDoc } = await import('firebase/firestore');

        if (!db) {
          console.error('Firestore not initialized');
          return;
        }

        const doctorDoc = await getDoc(doc(db, 'doctors', userId));
        if (!doctorDoc.exists()) return;
        const d = doctorDoc.data();

        // Check if doctor belongs to a clinic
        const chamberClinicId = d.clinicId;
        let clinicInfo: any = null;
        let allDoctors: any[] = [];

        if (chamberClinicId) {
          try {
            const clinicDoc = await getDoc(doc(db!, 'clinics', chamberClinicId));
            if (clinicDoc.exists()) {
              const cd = clinicDoc.data();
              clinicInfo = {
                name: cd.name || cd.clinicName || '',
                address: cd.address || '',
                qrNumber: cd.qrNumber || '',
                phone: cd.phone || '',
                clinicId: chamberClinicId,
                registrationNumber: cd.registrationNumber || '',
                showRegistrationOnRx: cd.showRegistrationOnRx !== undefined ? cd.showRegistrationOnRx : true,
                footerLine1: cd.footerLine1 || '',
                footerLine2: cd.footerLine2 || '',
                watermarkLogo: cd.watermarkLogo || '',
              };

              const linkedDoctors = cd.linkedDoctorsDetails || [];
              for (const ld of linkedDoctors) {
                let docTiming = '';
                let docRegNumber = '';
                try {
                  const ldDoc = await getDoc(doc(db!, 'doctors', ld.uid || ld.doctorId));
                  if (ldDoc.exists()) {
                    const ldData = ldDoc.data();
                    const ldChamber = ldData.chambers?.find((c: any) => c.clinicId === chamberClinicId);
                    docTiming = ldChamber ? `${ldChamber.startTime} - ${ldChamber.endTime}` : '';
                    docRegNumber = ldData.registrationNumber || '';
                  }
                } catch { /* skip */ }
                allDoctors.push({
                  name: ld.name || '',
                  specialty: ld.specialties?.[0] || ld.specialty || '',
                  timing: docTiming,
                  registrationNumber: docRegNumber,
                });
              }
            }
          } catch (e) {
            console.error('Failed to load clinic info:', e);
          }
        }

        let allChambers: any[] = [];
        if (!chamberClinicId && d.chambers) {
          allChambers = d.chambers.map((c: any) => ({
            name: c.chamberName || '',
            address: c.chamberAddress || '',
            timing: `${c.startTime} - ${c.endTime}`,
          }));
        }

        setFullDoctorInfo({
          id: userId,
          name: d.name || 'Doctor',
          degree: d.degree || d.degrees?.[0] || '',
          degrees: d.degrees || (d.degree ? [d.degree] : []),
          specialties: d.specialties || d.specialities || (d.specialty ? [d.specialty] : []),
          qrNumber: d.qrNumber || '',
          clinicName: clinicInfo?.name || d.clinicName || '',
          doctorId: userId,
          address: clinicInfo?.address || d.address || '',
          timing: d.timing || '',
          registrationNumber: d.registrationNumber || '',
          showRegistrationOnRX: d.showRegistrationOnRX !== false,
          useDrPrefix: d.useDrPrefix !== false,
          pdfContext: chamberClinicId ? 'clinic' : 'doctor',
          clinicInfo: clinicInfo || undefined,
          allDoctors: allDoctors.length > 0 ? allDoctors : undefined,
          allChambers: allChambers.length > 0 ? allChambers : undefined,
          footerLine1: d.footerLine1 || '',
          footerLine2: d.footerLine2 || '',
          watermarkLogo: d.watermarkLogo || '',
        });
      } catch (error) {
        console.error('Failed to load doctor info:', error);
      }
    };
    loadFullDoctorInfo();
  }, []);

  // Handle RX button click — open DigitalRXMaker directly
  const handleOpenRxMaker = (patient: Patient) => {
    setRxPatient(patient);
    setRxMakerOpen(true);
  };

  // Handle RX generated — save to Firestore, skip notification for manual_override
  const handleRxGenerated = async (downloadURL: string, rxData?: any) => {
    setRxMakerOpen(false);
    if (!rxPatient) return;

    try {
      toast.loading('Saving Digital RX...', { id: 'walkin-rx' });
      const { doc: docRef, updateDoc } = await import('firebase/firestore');
      const { db: fireDb } = await import('../lib/firebase/config');
      await updateDoc(docRef(fireDb!, 'bookings', rxPatient.id), {
        digitalRxUrl: downloadURL,
        ...(rxData ? { rxLastData: rxData } : {}),
      });

      const isManualOverride = rxPatient.verificationMethod === 'manual_override';
      if (!isManualOverride) {
        // QR-verified: send RX notification
        try {
          const { sendRxUpdatedNotification } = await import('../services/notificationService');
          await sendRxUpdatedNotification({
            patientPhone: rxPatient.whatsappNumber,
            patientName: rxPatient.patientName,
            age: rxPatient.age,
            sex: rxPatient.gender,
            purpose: rxPatient.purposeOfVisit,
            doctorId: doctorInfo.id,
            doctorName: doctorInfo.name,
            clinicName: fullDoctorInfo?.clinicName || 'Chamber',
            bookingId: rxPatient.bookingId || rxPatient.id,
            consultationDate: new Date().toISOString().split('T')[0],
            consultationTime: new Date().toTimeString().split(' ')[0].slice(0, 5),
            chamber: fullDoctorInfo?.clinicName || 'Chamber',
            language: rxPatient.language || 'english',
            rxUrl: downloadURL,
          });
        } catch (notifErr) {
          console.error('RX notification error:', notifErr);
        }
      }

      toast.success(
        isManualOverride ? 'Digital RX created — ready for printing!' : 'Digital RX created & sent to patient!',
        { id: 'walkin-rx' }
      );
    } catch (err) {
      console.error('Error saving RX:', err);
      toast.error('Failed to save Digital RX', { id: 'walkin-rx' });
    }
    setRxPatient(null);
  };

  // Handle Diet Chart button click — open InlineDietChartModal directly
  const handleOpenDietChart = (patient: Patient) => {
    setDietPatient(patient);
    setDietChartOpen(true);
  };

  // Handle Diet Chart generated
  const handleDietGenerated = async (dietUrl: string) => {
    setDietChartOpen(false);
    if (!dietPatient) return;

    try {
      const { doc: docRef, updateDoc } = await import('firebase/firestore');
      const { db: fireDb } = await import('../lib/firebase/config');
      await updateDoc(docRef(fireDb!, 'bookings', dietPatient.id), {
        dietChartUrl: dietUrl,
      });
      toast.success('AI Diet Chart saved!');
    } catch (err) {
      console.error('Error saving diet chart:', err);
    }
    setDietPatient(null);
  };

  // Get current date
  const getCurrentDate = () => {
    const today = new Date();
    const options: Intl.DateTimeFormatOptions = {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    };
    return today.toLocaleDateString('en-US', options);
  };

  // Calculate counts
  const homeCallCount = verifiedPatients.filter(p => p.visitType === 'home-call').length;
  const chamberWalkInCount = verifiedPatients.filter(p => p.visitType === 'walk-in').length;

  // Action handlers
  // NOTE: Review request is now SYSTEM-CONTROLLED (scheduled automatically 24h after patient submission)
  // No manual handler needed - just visual indicator

  const handleFollowUp = (patientId: string) => {
    const patient = verifiedPatients.find(p => p.id === patientId);
    if (!patient) return;

    setSelectedPatient(patient);
    setFollowUpModalOpen(true);
  };

  const handleSaveFollowUp = async (days: number, message: string) => {
    if (selectedPatient) {
      try {
        // Calculate follow-up date
        const followUpDate = new Date();
        followUpDate.setDate(followUpDate.getDate() + days);

        // Update booking record in Firestore
        const { db, auth } = await import('../lib/firebase/config');
        const { doc, updateDoc, addDoc, collection, serverTimestamp } = await import('firebase/firestore');

        if (!db || !auth || !auth.currentUser) {
          toast.error('Authentication failed. Please try again.');
          return;
        }

        const doctorId = auth.currentUser.uid;
        const doctorName = localStorage.getItem('doctorName') || 'Doctor';

        // Update booking with follow-up info
        await updateDoc(doc(db, 'bookings', selectedPatient.id), {
          followUpScheduled: true,
          followUpScheduledDate: followUpDate,
          doctorFollowUpMessage: message,
          followUpScheduledAt: new Date(),
        });

        // Store in scheduledFollowUps collection (same as QR patients)
        await addDoc(collection(db, 'scheduledFollowUps'), {
          patientPhone: selectedPatient.whatsappNumber,
          patientName: selectedPatient.patientName,
          doctorId: doctorId,
          doctorName: doctorName,
          followUpDate: followUpDate.toISOString(),
          scheduledDays: days,
          doctorMessage: message,
          status: 'pending',
          createdAt: serverTimestamp(),
          bookingId: selectedPatient.id,
        });

        // ============================================
        // 🔔 SEND FOLLOW-UP NOTIFICATION IMMEDIATELY
        // Per roadmap: Follow-up commitment is PERMANENT
        // Notification will be delivered even if subscription expires
        // ============================================
        try {
          const { sendFollowUp } = await import('../services/notificationService');

          await sendFollowUp({
            patientPhone: selectedPatient.whatsappNumber,
            patientName: selectedPatient.patientName,
            age: selectedPatient.age,
            sex: selectedPatient.gender, // Fixed from sex
            purpose: selectedPatient.purposeOfVisit, // Fixed from purpose
            chamber: fullDoctorInfo?.clinicName || 'Chamber', // Fixed undefined
            clinicName: fullDoctorInfo?.clinicName || 'Chamber', // Fixed undefined
            doctorId: doctorId,
            doctorName: doctorName,
            followUpDate: followUpDate.toISOString(),
            followUpDays: days,
            customMessage: message,
            language: selectedPatient.language || 'english',
          });

          console.log('✅ Follow-up notification scheduled via FCM');
        } catch (notifError) {
          console.warn('⚠️ Follow-up notification error (non-blocking):', notifError);
        }

        setPatientStates(prev => ({
          ...prev,
          [selectedPatient.id]: {
            ...prev[selectedPatient.id],
            followUpScheduled: true,
          }
        }));

        console.log(`✅ Follow-up scheduled for ${days} days`);
      } catch (error) {
        console.error('❌ Error scheduling follow-up:', error);
      }
    }
    setFollowUpModalOpen(false);
    setSelectedPatient(null);
  };



  return (
    <div className="min-h-screen bg-[#0a0f1a] text-white">
      {/* Header */}
      <div className="border-b border-gray-800 bg-[#0a0f1a]/95 backdrop-blur sticky top-0 z-40">
        <div className="flex items-center justify-between px-4 lg:px-8 py-4">
          <div className="flex items-center gap-3 md:gap-4">
            <Button
              variant="ghost"
              size="icon"
              className="text-gray-400 hover:text-white flex-shrink-0"
              onClick={onBack}
            >
              <ArrowLeft className="w-5 h-5 md:w-6 md:h-6" />
            </Button>
            <div>
              <h1 className="text-white text-base md:text-xl font-semibold">Walk-In Patients</h1>
              <p className="text-gray-400 text-xs md:text-sm mt-0.5 md:mt-1">Total Patients: {verifiedPatients.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 lg:px-8 py-8 max-w-7xl mx-auto">
        {/* Date and Statistics */}
        <div className="mb-6 space-y-3">
          <div className="flex items-center gap-2 text-gray-400 text-sm md:text-base">
            <Calendar className="w-4 h-4 md:w-5 md:h-5 flex-shrink-0" />
            <span className="text-xs md:text-sm">{getCurrentDate()}</span>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6">
            <div className="text-sm md:text-base">
              <span className="text-gray-400">Home Call: </span>
              <span className="text-white font-semibold">{homeCallCount}</span>
            </div>
            <div className="text-sm md:text-base">
              <span className="text-gray-400">Chamber Walk In: </span>
              <span className="text-white font-semibold">{chamberWalkInCount}</span>
            </div>
          </div>
        </div>

        {/* Patient List */}
        <div className="space-y-4">
          {verifiedPatients.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-400">No verified patients yet</p>
            </div>
          ) : (
            verifiedPatients.map((patient) => (
              <div
                key={patient.id}
                className="bg-gray-800/50 border border-gray-700 rounded-lg p-4 md:p-6"
              >
                {/* Line 1: Name and Badge */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                  <h3 className="text-white text-lg md:text-xl font-semibold">{patient.patientName}</h3>
                  {/* Booking Channel Badge - SINGLE BADGE ONLY */}
                  <Badge
                    className={`w-fit text-xs md:text-sm font-semibold ${
                      patient.isWalkIn
                        ? 'bg-orange-500/20 text-orange-400 border-orange-500/30'
                        : 'bg-purple-500/20 text-purple-400 border-purple-500/30'
                    }`}
                  >
                    {patient.isWalkIn ? '🚶 WALK IN' : '📱 QR SCAN'}
                  </Badge>
                </div>

                {/* Booking ID */}
                {patient.bookingId && (
                  <div className="mb-4">
                    <span className="text-xs md:text-sm text-blue-400 font-mono bg-blue-500/10 px-2 py-1 rounded border border-blue-500/30">
                      {patient.bookingId}
                    </span>
                  </div>
                )}

                {/* Line 2: Details in responsive grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6 text-sm mb-4">
                  <div className="flex flex-col md:flex-row md:items-center">
                    <span className="text-gray-400 whitespace-nowrap">Mobile: </span>
                    <span className="text-white break-all md:ml-1">{patient.whatsappNumber}</span>
                  </div>
                  <div className="flex items-center">
                    <span className="text-gray-400 whitespace-nowrap">Age: </span>
                    <span className="text-white ml-1">{patient.age || 'N/A'}</span>
                  </div>
                  <div className="flex items-center">
                    <span className="text-gray-400 whitespace-nowrap">Gender: </span>
                    <span className="text-white ml-1">{patient.gender || 'N/A'}</span>
                  </div>
                  <div className="flex flex-col md:flex-row md:items-center">
                    <span className="text-gray-400 whitespace-nowrap">Purpose: </span>
                    <span className="text-white md:ml-1 break-words">{patient.purposeOfVisit || 'N/A'}</span>
                  </div>
                </div>

                {/* Line 3: Action Buttons for Walk-In */}
                <div className="flex items-center gap-3 mt-4 flex-wrap">

                  {/* 1. History Button */}
                  <div
                    onClick={() => {
                        setSelectedPatient(patient);
                        setHistoryModalOpen(true);
                    }}
                    className="relative w-12 h-12 md:w-10 md:h-10 rounded-lg flex items-center justify-center transition-colors bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 cursor-pointer group"
                    title="View Consultation History"
                  >
                    <History className="w-5 h-5 md:w-4 md:h-4 text-emerald-400 group-hover:scale-110 transition-transform" />
                  </div>

                  {/* 2. Verify Visit (Eye) */}
                  {patient.verificationMethod === 'manual_override' ? (
                    <div
                      className="relative w-12 h-12 md:w-10 md:h-10 rounded-lg flex items-center justify-center transition-colors bg-yellow-500/10 border border-yellow-500/30 cursor-default"
                      title="Manually Verified (No Notifications)"
                    >
                      <Eye className="w-5 h-5 md:w-4 md:h-4 text-yellow-500" />
                      <div className="absolute -top-1 -right-1 w-5 h-5 md:w-4 md:h-4 bg-yellow-500 rounded-full flex items-center justify-center border-2 border-[#0f1419]">
                        <AlertTriangle className="w-3 h-3 md:w-2.5 md:h-2.5 text-white" />
                      </div>
                    </div>
                  ) : (
                    <div
                      className="relative w-12 h-12 md:w-10 md:h-10 rounded-lg flex items-center justify-center transition-colors bg-emerald-500/20 border border-emerald-500/50 cursor-default"
                      title="Visit Verified via QR Scan"
                    >
                      <Eye className="w-5 h-5 md:w-4 md:h-4 text-emerald-400" />
                      <div className="absolute -top-1 -right-1 w-5 h-5 md:w-4 md:h-4 bg-emerald-500 rounded-full flex items-center justify-center border-2 border-[#0f1419]">
                        <Check className="w-3 h-3 md:w-2.5 md:h-2.5 text-white" />
                      </div>
                    </div>
                  )}

                  {/* 3. Digital RX — FileText Blue (Opens RX Maker inline) */}
                  <button
                    onClick={() => handleOpenRxMaker(patient)}
                    disabled={!fullDoctorInfo}
                    className={`relative w-12 h-12 md:w-10 md:h-10 rounded-lg flex items-center justify-center transition-colors ${!fullDoctorInfo ? 'bg-gray-800 border border-gray-700 opacity-50 cursor-not-allowed' : 'bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/50 cursor-pointer'} group`}
                    title={!fullDoctorInfo ? "Loading doctor info..." : (patient.verificationMethod === 'manual_override' ? "Create Digital RX (Print Only)" : "Create Digital RX")}
                  >
                    <FileText className="w-5 h-5 md:w-4 md:h-4 text-blue-400 group-hover:scale-110 transition-transform" />
                  </button>

                  {/* 4. AI RX Reader — Purple Sparkle */}
                  <button
                    onClick={() => {
                      const prefilledData = {
                        name: patient.patientName,
                        age: patient.age,
                        gender: patient.gender,
                        phone: patient.whatsappNumber,
                        bookingId: patient.id,
                      };
                      localStorage.setItem('prefilled_rx_reader_patient', JSON.stringify(prefilledData));
                      if (onMenuChange) onMenuChange('ai-rx-reader');
                    }}
                    className="relative w-12 h-12 md:w-10 md:h-10 rounded-lg flex items-center justify-center transition-colors bg-gradient-to-br from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 border border-purple-500/50 shadow-lg shadow-purple-500/30 cursor-pointer group"
                    title="AI RX Reader"
                  >
                    <Sparkles className="w-5 h-5 md:w-4 md:h-4 text-white group-hover:scale-110 transition-transform" />
                  </button>

                  {/* 5. AI Diet Chart — Orange Apple (Opens Diet Chart inline) */}
                  <button
                    onClick={() => handleOpenDietChart(patient)}
                    disabled={!fullDoctorInfo}
                    className={`relative w-12 h-12 md:w-10 md:h-10 rounded-lg flex items-center justify-center transition-colors ${!fullDoctorInfo ? 'bg-gray-800 border border-gray-700 opacity-50 cursor-not-allowed' : 'bg-orange-500/20 hover:bg-orange-500/30 border border-orange-500/50 cursor-pointer'} group`}
                    title={!fullDoctorInfo ? "Loading doctor info..." : "Create AI Diet Chart"}
                  >
                    <Apple className="w-5 h-5 md:w-4 md:h-4 text-orange-500 group-hover:scale-110 transition-transform" />
                  </button>

                  {/* 6. Review/Rating (Star) */}
                  <div
                    className={`relative w-12 h-12 md:w-10 md:h-10 rounded-lg flex items-center justify-center transition-colors ${
                      patient.verificationMethod === 'manual_override'
                        ? 'bg-gray-800 border border-gray-700 opacity-30 cursor-not-allowed'
                        : patientStates[patient.id]?.reviewScheduled
                          ? 'bg-yellow-500/30 border border-yellow-500/50'
                          : 'bg-yellow-500/10 border border-yellow-500/30 opacity-50'
                    }`}
                    title={
                      patient.verificationMethod === 'manual_override'
                        ? "Disabled (Manual Verification)"
                        : patientStates[patient.id]?.reviewScheduled
                          ? "Review Request Scheduled (System sends after 24h)"
                          : "Review Request (System sends after 24h)"
                    }
                  >
                    <Star className={`w-5 h-5 md:w-4 md:h-4 ${
                      patient.verificationMethod === 'manual_override'
                        ? 'text-gray-500'
                        : patientStates[patient.id]?.reviewScheduled ? 'text-yellow-300' : 'text-yellow-400'
                    }`} />
                    {patientStates[patient.id]?.reviewScheduled && patient.verificationMethod !== 'manual_override' && (
                      <div className="absolute -top-1 -right-1 w-5 h-5 md:w-4 md:h-4 bg-emerald-500 rounded-full flex items-center justify-center border-2 border-[#0f1419]">
                        <Check className="w-3 h-3 md:w-2.5 md:h-2.5 text-white" />
                      </div>
                    )}
                  </div>

                  {/* 7. Follow-Up (Calendar) */}
                  <button
                    onClick={() => patient.verificationMethod !== 'manual_override' && handleFollowUp(patient.id)}
                    disabled={patientStates[patient.id]?.followUpScheduled || patient.verificationMethod === 'manual_override'}
                    className={`relative w-12 h-12 md:w-10 md:h-10 rounded-lg flex items-center justify-center transition-colors ${
                      patient.verificationMethod === 'manual_override'
                        ? 'bg-gray-800 border border-gray-700 opacity-30 cursor-not-allowed'
                        : patientStates[patient.id]?.followUpScheduled
                          ? 'bg-blue-500/30 border border-blue-500/50 cursor-not-allowed'
                          : 'bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30'
                    }`}
                    title={
                      patient.verificationMethod === 'manual_override'
                        ? "Disabled (Manual Verification)"
                        : patientStates[patient.id]?.followUpScheduled
                          ? "Follow-Up Scheduled"
                          : "Schedule Follow-Up (As set)"
                    }
                  >
                    <Calendar className={`w-5 h-5 md:w-4 md:h-4 ${
                      patient.verificationMethod === 'manual_override'
                        ? 'text-gray-500'
                        : patientStates[patient.id]?.followUpScheduled ? 'text-blue-300' : 'text-blue-400'
                    }`} />
                    {patientStates[patient.id]?.followUpScheduled && patient.verificationMethod !== 'manual_override' && (
                      <div className="absolute -top-1 -right-1 w-5 h-5 md:w-4 md:h-4 bg-emerald-500 rounded-full flex items-center justify-center border-2 border-[#0f1419]">
                        <Check className="w-3 h-3 md:w-2.5 md:h-2.5 text-white" />
                      </div>
                    )}
                  </button>

                  {/* 8. Upload (Share/Upload Reports) - DISABLED (Medico Locker Feature) */}
                  <div
                    className="relative w-12 h-12 md:w-10 md:h-10 rounded-lg flex items-center justify-center transition-colors bg-gray-500/10 border border-gray-500/30 cursor-not-allowed opacity-40"
                    title="Upload Reports (Available with Medico Locker - Coming Soon)"
                  >
                    <Upload className="w-5 h-5 md:w-4 md:h-4 text-gray-500" />
                  </div>

                  {/* 9. Lock (Medical Records/Locker) */}
                  <div
                    className="relative w-12 h-12 md:w-10 md:h-10 rounded-lg flex items-center justify-center transition-colors bg-gray-500/10 hover:bg-gray-500/20 border border-gray-500/30 cursor-pointer"
                    title="Medical Locker"
                  >
                    <Lock className="w-5 h-5 md:w-4 md:h-4 text-gray-400" />
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Follow-Up Modal */}
      {selectedPatient && (
        <FollowUpModal
          isOpen={followUpModalOpen}
          onClose={() => {
            setFollowUpModalOpen(false);
            if (!historyModalOpen) setSelectedPatient(null); // Only clear if not switching modals
          }}
          patientName={selectedPatient.patientName}
          onSave={handleSaveFollowUp}
        />
      )}

      {/* Patient History Modal */}
      {selectedPatient && historyModalOpen && (
        <PatientHistoryModal
          isOpen={historyModalOpen}
          onClose={() => {
            setHistoryModalOpen(false);
            setSelectedPatient(null);
          }}
          patientPhone={selectedPatient.whatsappNumber || ''}
          patientName={selectedPatient.patientName}
          doctorId={doctorInfo.id}
          doctorName={doctorInfo.name}
        />
      )}

      {/* DigitalRXMaker Modal (inline) */}
      {rxMakerOpen && rxPatient && fullDoctorInfo && (
        <DigitalRXMaker
          patient={{
            id: rxPatient.id,
            name: rxPatient.patientName,
            age: typeof rxPatient.age === 'number' ? rxPatient.age : (parseInt(rxPatient.age) || 0),
            gender: rxPatient.gender || 'N/A',
            phone: rxPatient.whatsappNumber,
            bookingId: rxPatient.bookingId || rxPatient.id,
            appointmentTime: new Date(),
            bookingTime: rxPatient.timestamp || new Date(),
            language: rxPatient.language || 'english',
            purpose: rxPatient.purposeOfVisit,
          }}
          doctorInfo={fullDoctorInfo}
          onClose={() => { setRxMakerOpen(false); setRxPatient(null); }}
          onGenerated={handleRxGenerated}
        />
      )}

      {/* InlineDietChartModal (inline) */}
      {dietChartOpen && dietPatient && fullDoctorInfo && (
        <InlineDietChartModal
          patient={{
            id: dietPatient.id,
            name: dietPatient.patientName,
            age: typeof dietPatient.age === 'number' ? dietPatient.age : (parseInt(dietPatient.age) || 0),
            gender: dietPatient.gender || 'N/A',
            phone: dietPatient.whatsappNumber,
            visitType: dietPatient.purposeOfVisit,
          }}
          doctorInfo={fullDoctorInfo}
          onClose={() => { setDietChartOpen(false); setDietPatient(null); }}
          onGenerated={handleDietGenerated}
        />
      )}
    </div>
  );
}

