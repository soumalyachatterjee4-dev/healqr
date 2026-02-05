import React, { useState, useEffect } from 'react';
import { X, History, Download, Loader2, AlertCircle, Calendar, Clock, MapPin, CheckCircle2, XCircle, Bell, Eye, Star, CalendarCheck } from 'lucide-react';
import { searchPatientConsultationHistory, ConsultationHistory } from '../services/notificationHistoryService';

interface PatientHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  patientPhone: string;
  patientName: string;
  doctorId: string;
  doctorName: string;
}

export const PatientHistoryModal: React.FC<PatientHistoryModalProps> = ({
  isOpen,
  onClose,
  patientPhone,
  patientName,
  doctorId,
  doctorName
}) => {
  const [history, setHistory] = useState<ConsultationHistory[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && patientPhone && doctorId) {
      loadHistory();
    }
  }, [isOpen, patientPhone, doctorId]);

  const loadHistory = async () => {
    setLoading(true);
    try {

      const results = await searchPatientConsultationHistory(patientPhone, doctorId);

      setHistory(results);
    } catch (error) {
      console.error('❌ Failed to load consultation history:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    // Confirmed - Walk-in patient (already in chamber)
    if (status === 'confirmed') {
      return (
        <div className="flex items-center gap-1" title="Confirmed - Patient in Chamber">
          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
        </div>
      );
    }
    
    // Completed consultation
    if (status === 'completed') {
      return (
        <div className="flex items-center gap-1" title="Consultation Completed">
          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
        </div>
      );
    }
    
    // Cancelled appointment
    if (status === 'cancelled') {
      return (
        <div className="flex items-center gap-1" title="Cancelled">
          <XCircle className="w-5 h-5 text-red-400" />
        </div>
      );
    }
    
    // Drop-out (patient didn't show up)
    if (status === 'dropout') {
      return (
        <div className="flex items-center gap-1" title="Drop-out">
          <XCircle className="w-5 h-5 text-gray-400" />
        </div>
      );
    }
    
    // Pending (for future bookings, not walk-ins)
    return (
      <div className="flex items-center gap-1" title="Pending Consultation">
        <Clock className="w-5 h-5 text-yellow-400" />
      </div>
    );
  };

  const getNotificationIcon = (
    notifStatus: { status: 'sent' | 'failed' | 'pending' } | undefined,
    Icon: any,
    label: string,
    consultationStatus: string
  ) => {
    let color = 'text-gray-500'; // Default: dull/gray (not sent)
    let title = label;

    // If consultation is cancelled or dropout, all icons are dull
    if (consultationStatus === 'cancelled' || consultationStatus === 'dropout') {
      color = 'text-gray-500';
      title = `${label} - N/A`;
    } else if (notifStatus) {
      // Consultation is completed/confirmed - show delivery status
      if (notifStatus.status === 'sent') {
        color = 'text-emerald-400'; // Green = sent
        title = `${label} - Sent`;
      } else if (notifStatus.status === 'failed') {
        color = 'text-red-400'; // Red = failed
        title = `${label} - Failed`;
      } else if (notifStatus.status === 'pending') {
        color = 'text-yellow-400'; // Yellow = pending
        title = `${label} - Pending`;
      }
    }

    return (
      <div className="flex items-center gap-1" title={title}>
        <Icon className={`w-4 h-4 ${color}`} />
      </div>
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="relative w-full max-w-3xl bg-[#0a0f1a] rounded-2xl shadow-2xl border border-emerald-500/30 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-emerald-500/30 bg-gradient-to-r from-emerald-900/30 to-emerald-800/20">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500/20 rounded-lg">
              <History className="w-6 h-6 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-white">Consultation History</h2>
              <p className="text-sm text-gray-400">All bookings from +91 {patientPhone.replace(/\D/g, '').slice(-10)}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
              <p className="text-gray-400 text-sm">Loading consultation history...</p>
            </div>
          ) : history.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <AlertCircle className="w-12 h-12 text-gray-600" />
              <p className="text-gray-400">No consultation history found</p>
            </div>
          ) : (
            <>
              <p className="text-sm text-gray-400 mb-4">
                Total Consultations: <span className="text-emerald-400 font-semibold">{history.length}</span>
              </p>
              <div className="space-y-3">
                {history.map((consultation, index) => (
                  <div
                    key={consultation.bookingId || index}
                    className="p-4 bg-gradient-to-br from-gray-900/50 to-gray-800/30 border border-gray-700/50 rounded-xl hover:border-emerald-500/30 transition-all"
                  >
                    {/* Patient Name & Phone */}
                    <div className="mb-3 pb-3 border-b border-gray-700/30">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h3 className="font-semibold text-white text-lg">{consultation.patientName}</h3>
                          <p className="text-sm text-gray-400">+91 {consultation.patientPhone}</p>
                        </div>
                        
                        {/* Booking Channel Badge */}
                        {consultation.isWalkIn !== undefined && (
                          <span 
                            className={`text-xs font-semibold px-2 py-1 rounded border ${
                              consultation.isWalkIn
                                ? 'bg-orange-500/20 text-orange-400 border-orange-500/30'
                                : 'bg-purple-500/20 text-purple-400 border-purple-500/30'
                            }`}
                          >
                            {consultation.isWalkIn ? '🚶 WALK IN' : '📱 QR SCAN'}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Date & Time */}
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-emerald-500/10 rounded-lg">
                          <Calendar className="w-5 h-5 text-emerald-400" />
                        </div>
                        <div>
                          <h3 className="font-medium text-white">
                            {consultation.consultationDate}
                          </h3>
                          <p className="text-sm text-gray-400">{consultation.consultationTime}</p>
                        </div>
                      </div>
                      
                      {/* Status & Notification Icons */}
                      <div className="flex items-center gap-2">
                        {/* Booking Status */}
                        {getStatusBadge(consultation.currentStatus)}
                        
                        {/* Notification History Icons - Always show all 4 */}
                        {getNotificationIcon(consultation.notifications.reminder, Bell, 'Reminder (2h before)', consultation.currentStatus)}
                        {getNotificationIcon(consultation.notifications.followUp, CalendarCheck, 'Follow-Up (72h before)', consultation.currentStatus)}
                        {getNotificationIcon(consultation.notifications.consultationCompleted, Eye, 'Consultation Completed', consultation.currentStatus)}
                        {getNotificationIcon(consultation.notifications.reviewRequest, Star, 'Review Request', consultation.currentStatus)}
                        
                        {/* Download - Always disabled (will be linked to Medico Locker on paid basis) */}
                        <button
                          disabled
                          className="p-1 rounded transition-colors cursor-not-allowed opacity-40"
                          title="Download prescription (Available with Medico Locker - Coming Soon)"
                        >
                          <Download className="w-4 h-4 text-gray-500" />
                        </button>
                      </div>
                    </div>

                    {/* Consultation Details */}
                    <div className="space-y-2 text-sm">
                      {consultation.chamber && (
                        <div className="flex items-center gap-2 text-gray-400">
                          <MapPin className="w-4 h-4" />
                          <span>{consultation.chamber}</span>
                        </div>
                      )}
                      
                      {consultation.serialNumber && (
                        <div className="flex items-center gap-2 text-gray-400">
                          <Clock className="w-4 h-4" />
                          <span>Serial: #{consultation.serialNumber}</span>
                        </div>
                      )}

                      {/* Patient Demographics */}
                      <div className="flex items-center gap-4 text-gray-400 mt-2 pt-2 border-t border-gray-700/50">
                        <span>Age: {consultation.age !== undefined && consultation.age !== null && consultation.age !== '' ? consultation.age : 'N/A'}</span>
                        <span>Sex: {consultation.sex ? consultation.sex.toUpperCase() : 'N/A'}</span>
                        <span>Purpose: {consultation.purpose || 'In-Person'}</span>
                      </div>
                      
                      {/* Booking ID */}
                      <p className="text-xs text-gray-500 mt-2">ID: {consultation.bookingId}</p>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default PatientHistoryModal;
