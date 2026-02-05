import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { ScrollArea } from './ui/scroll-area';
import { X, CheckCircle, XCircle, Clock, CreditCard, Video, Eye } from 'lucide-react';
import { toast } from 'sonner';
import { useState } from 'react';
import PatientActionsBar from './PatientActionsBar';
import { PatientOldRXViewer } from './PatientOldRXViewer';
import { type Language } from '../utils/translations';

export interface Patient {
  id: string;
  patientName: string;
  whatsappNumber: string;
  age: string;
  gender: string;
  purposeOfVisit: string;
  visitType: 'home-call' | 'walk-in';
  timestamp: Date;
  paymentStatus?: 'not_required' | 'paid' | 'pay_later' | 'pending' | 'verified' | 'rejected';
  utrNumber?: string;
  consultationFee?: number;
  consultationType?: 'chamber' | 'video'; // Add consultation type
  bookingId?: string; // Add booking ID for video consultations
  prescriptionUrl?: string; // Old RX uploaded by patient
  prescriptionReviewed?: boolean; // Whether doctor has reviewed the old RX
  language?: Language; // Patient's preferred language
  verifiedByPatient?: boolean; // Whether patient has verified the visit via QR scan
  verificationMethod?: 'qr_scan' | 'manual_override'; // Method of verification
  isWalkIn?: boolean; // Whether patient is a walk-in (true) or QR advance booking (false)
  reviewScheduled?: boolean; // Whether review request is scheduled
  followUpScheduled?: boolean; // Whether follow-up is scheduled
}

interface ViewPatientsModalProps {
  isOpen: boolean;
  onClose: () => void;
  patients: Patient[];
  onUpdatePatients?: (patients: Patient[]) => void; // Callback to update parent state
  activeAddOns?: string[]; // Premium add-ons that are activated
}

export default function ViewPatientsModal({ isOpen, onClose, patients: initialPatients, onUpdatePatients, activeAddOns = [] }: ViewPatientsModalProps) {
  const [patients, setPatients] = useState(initialPatients);
  const [oldRxViewerOpen, setOldRxViewerOpen] = useState(false);
  const [selectedPatientForRxView, setSelectedPatientForRxView] = useState<Patient | null>(null);

  // Sync with parent state
  const updatePatients = (updatedPatients: Patient[]) => {
    setPatients(updatedPatients);
    if (onUpdatePatients) {
      onUpdatePatients(updatedPatients);
    }
  };

  const handleVerifyPayment = (patientId: string) => {
    const updated = patients.map(p => 
      p.id === patientId ? { ...p, paymentStatus: 'verified' as const } : p
    );
    updatePatients(updated);
    toast.success('Payment verified successfully!');
  };

  const handleRejectPayment = (patientId: string) => {
    const updated = patients.map(p => 
      p.id === patientId ? { ...p, paymentStatus: 'rejected' as const } : p
    );
    updatePatients(updated);
    toast.error('Payment rejected');
  };

  const handleMarkRxAsReviewed = (patientId: string) => {
    const updated = patients.map(p => 
      p.id === patientId ? { ...p, prescriptionReviewed: true } : p
    );
    updatePatients(updated);
  };

  const handleViewOldRx = (patient: Patient) => {
    if (patient.prescriptionUrl) {
      setSelectedPatientForRxView(patient);
      setOldRxViewerOpen(true);
    }
  };

  const getPaymentBadge = (patient: Patient) => {
    if (!patient.paymentStatus || patient.paymentStatus === 'not_required') return null;

    const badges = {
      verified: { 
        icon: CheckCircle, 
        text: 'PAID ✓', 
        className: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' 
      },
      paid: { 
        icon: Clock, 
        text: 'VERIFY PAYMENT', 
        className: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' 
      },
      pending: { 
        icon: Clock, 
        text: 'VERIFY PAYMENT', 
        className: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' 
      },
      pay_later: { 
        icon: XCircle, 
        text: 'NOT PAID', 
        className: 'bg-gray-500/20 text-gray-400 border-gray-500/30' 
      },
      rejected: { 
        icon: XCircle, 
        text: 'PAYMENT REJECTED', 
        className: 'bg-red-500/20 text-red-400 border-red-500/30' 
      }
    };

    const badge = badges[patient.paymentStatus];
    if (!badge) return null;

    const Icon = badge.icon;
    return (
      <Badge className={badge.className}>
        <Icon className="w-3 h-3 mr-1" />
        {badge.text}
      </Badge>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-[#1a1f2e] border-gray-800 text-white max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-white">Walk-In Patients</DialogTitle>
              <DialogDescription className="text-gray-400 text-sm mt-1">
                Total Patients: {patients.length}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(90vh-120px)] pr-4">
          <div className="space-y-4 mt-4">
            {patients.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-400">No patients added yet</p>
              </div>
            ) : (
              patients.map((patient) => (
                <div
                  key={patient.id}
                  className="bg-gray-800/50 border border-gray-700 rounded-lg p-4"
                >
                  {/* First Line: Name and Badge */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <h4 className="text-white">{patient.patientName}</h4>
                      {patient.consultationType === 'video' && (
                        <Badge className="bg-red-500/20 text-red-400 border-red-500/30">
                          <Video className="w-3 h-3 mr-1" />
                          VC
                        </Badge>
                      )}
                      {patient.bookingId && (
                        <Badge variant="outline" className="border-blue-500 text-blue-400 text-xs">
                          {patient.bookingId}
                        </Badge>
                      )}
                    </div>
                    <Badge 
                      className={
                        patient.visitType === 'home-call'
                          ? 'bg-blue-500/20 text-blue-400 border-blue-500/30'
                          : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                      }
                    >
                      {patient.visitType === 'home-call' ? 'Home Call' : 'Chamber Walk In'}
                    </Badge>
                  </div>

                  {/* Second Line: Details */}
                  <div className="grid grid-cols-2 gap-4 text-sm mb-3">
                    <div>
                      <span className="text-gray-400">Mobile: </span>
                      <span className="text-white">{patient.whatsappNumber}</span>
                    </div>
                    <div>
                      <span className="text-gray-400">Age: </span>
                      <span className="text-white">{patient.age || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-gray-400">Gender: </span>
                      <span className="text-white">{patient.gender || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-gray-400">Purpose: </span>
                      <span className="text-white">{patient.purposeOfVisit || 'N/A'}</span>
                    </div>
                  </div>

                  {/* Payment Status */}
                  {patient.paymentStatus && patient.paymentStatus !== 'not_required' && (
                    <div className="border-t border-gray-700 pt-3 mt-3">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <CreditCard className="w-4 h-4 text-gray-400" />
                          <span className="text-sm text-gray-400">
                            Fee: ₹{patient.consultationFee || 0}
                          </span>
                        </div>
                        {getPaymentBadge(patient)}
                      </div>

                      {/* UTR Number for pending/paid status */}
                      {(patient.paymentStatus === 'pending' || patient.paymentStatus === 'paid') && patient.utrNumber && (
                        <>
                          <div className="text-xs text-gray-400 mb-3">
                            UTR: {patient.utrNumber}
                          </div>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={() => handleVerifyPayment(patient.id)}
                              className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white h-8"
                            >
                              <CheckCircle className="w-4 h-4 mr-1" />
                              Verify
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => handleRejectPayment(patient.id)}
                              variant="outline"
                              className="flex-1 border-red-600 text-red-400 hover:bg-red-900/20 h-8"
                            >
                              <XCircle className="w-4 h-4 mr-1" />
                              Reject
                            </Button>
                          </div>
                        </>
                      )}

                      {/* Status message for verified */}
                      {patient.paymentStatus === 'verified' && (
                        <p className="text-xs text-emerald-400">
                          ✓ Payment verified and confirmed
                        </p>
                      )}

                      {/* Status message for rejected */}
                      {patient.paymentStatus === 'rejected' && patient.utrNumber && (
                        <p className="text-xs text-red-400">
                          ✗ Payment rejected • UTR: {patient.utrNumber}
                        </p>
                      )}

                      {/* Status message for pay_later */}
                      {patient.paymentStatus === 'pay_later' && (
                        <p className="text-xs text-yellow-400">
                          ⏳ Patient will pay at clinic
                        </p>
                      )}
                    </div>
                  )}

                  {/* Video Consultation Actions */}
                  {patient.consultationType === 'video' && (
                    <div className="border-t border-gray-700 pt-3 mt-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Video className="w-4 h-4 text-red-400" />
                          <span className="text-sm text-gray-300">Video Consultation</span>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-blue-500 text-blue-400 hover:bg-blue-500/10 h-8"
                            onClick={() => {
                              toast.info('Notification marked as seen');
                            }}
                          >
                            <Eye className="w-4 h-4 mr-1" />
                            Mark Seen
                          </Button>
                          <Button
                            size="sm"
                            className="bg-red-500 hover:bg-red-600 text-white h-8"
                            onClick={() => {
                              toast.success('Starting video consultation...');
                              // This would open the video consultation interface
                            }}
                          >
                            <Video className="w-4 h-4 mr-1" />
                            Start Call
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Action Buttons Row */}
                  <div className="border-t border-gray-700 pt-4 mt-4">
                    <PatientActionsBar
                      patient={{
                        id: patient.id,
                        name: patient.patientName,
                        phone: patient.whatsappNumber,
                        bookingId: patient.bookingId || `VZT-QR-${patient.id}`,
                        age: parseInt(patient.age) || 0,
                        gender: patient.gender,
                        visitType: patient.purposeOfVisit,
                        prescriptionUrl: patient.prescriptionUrl,
                        prescriptionReviewed: patient.prescriptionReviewed,
                      }}
                      onVideoCall={() => {
                        toast.success('Starting video consultation...');
                      }}
                      onViewRx={() => {
                        toast.info('Opening prescription viewer');
                      }}
                      onSchedule={() => {
                        toast.info('Opening schedule');
                      }}
                      onToggleFavorite={() => {
                        toast.success('Added to favorites');
                      }}
                      onNotify={() => {
                        toast.success('Notification sent to patient');
                      }}
                      onDelete={() => {
                        toast.error('Patient removed from list');
                      }}
                      onViewOldRx={() => handleViewOldRx(patient)}
                      isPrescriptionSent={false}
                      isVideoCallActive={patient.consultationType === 'video'}
                      hasNotification={false}
                      hasAIRXReaderPackage={activeAddOns.includes('ai-rx-reader')}
                      hasVideoConsultationPackage={activeAddOns.includes('video-consultation')}
                      patientLanguage={patient.language || 'english'}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </DialogContent>

      {/* Old RX Viewer Modal */}
      {selectedPatientForRxView && selectedPatientForRxView.prescriptionUrl && (
        <PatientOldRXViewer
          isOpen={oldRxViewerOpen}
          onClose={() => {
            setOldRxViewerOpen(false);
            setSelectedPatientForRxView(null);
          }}
          patientName={selectedPatientForRxView.patientName}
          patientId={selectedPatientForRxView.bookingId || `VZT-QR-${selectedPatientForRxView.id}`}
          oldRXFiles={[
            {
              id: 'old-rx-1',
              fileName: 'Patient Uploaded Prescription',
              uploadDate: 'Recently uploaded',
              fileUrl: selectedPatientForRxView.prescriptionUrl,
              viewed: selectedPatientForRxView.prescriptionReviewed || false,
            }
          ]}
        />
      )}
    </Dialog>
  );
}
