import React, { useState, useEffect, useCallback } from 'react';
import { db, auth } from '../lib/firebase/config';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { signInAnonymously } from 'firebase/auth';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import PatientDetails from './PatientDetails';
import {
  Stethoscope, Clock, Users, MapPin, Calendar,
  LogOut, AlertTriangle, RefreshCw,
  Shield
} from 'lucide-react';
import { toast } from 'sonner';

interface Chamber {
  id: string | number;
  chamberName: string;
  chamberAddress: string;
  startTime: string;
  endTime: string;
  maxCapacity: number;
  days: string[];
  frequency: string;
  clinicId?: string;
}

interface TempPatient {
  id: string;
  name: string;
  phone: string;
  bookingId: string;
  age: number;
  gender: string;
  visitType: string;
  bookingTime: Date;
  appointmentTime: Date;
  isMarkedSeen?: boolean;
  isCancelled?: boolean;
  paymentVerified?: boolean;
  consultationType?: string;
  language?: string;
  prescriptionUrl?: string | string[];
  prescriptionReviewed?: boolean;
  serialNumber?: string | number;
  tokenNumber?: string;
  chamber?: string;
  isDataRestricted?: boolean;
  bookingSource?: string;
  clinicId?: string;
  digitalRxUrl?: string;
  dietChartUrl?: string;
  isWalkIn?: boolean;
}

/**
 * TempDoctorDashboard — Minimal dashboard for temporary doctor access.
 * Shows: Today's Schedule (filtered for this doctor) → Patient Details
 * Auto-checks time window and expires outside chamber hours.
 */
const TempDoctorDashboard: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [doctorName] = useState(localStorage.getItem('healqr_temp_doctor_name') || 'Doctor');
  const [clinicName] = useState(localStorage.getItem('healqr_temp_doctor_clinic_name') || 'Clinic');
  const [doctorId] = useState(localStorage.getItem('healqr_temp_doctor_id') || '');
  const [clinicId] = useState(localStorage.getItem('healqr_temp_doctor_clinic_id') || '');
  const [chambers, setChambers] = useState<Chamber[]>([]);
  const [activeChambers, setActiveChambers] = useState<any[]>([]);
  const [selectedChamber, setSelectedChamber] = useState<any>(null);
  const [patients, setPatients] = useState<TempPatient[]>([]);
  const [showPatientDetails, setShowPatientDetails] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState('');
  const [isExpired, setIsExpired] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Parse stored chambers
  useEffect(() => {
    try {
      const storedChambers = JSON.parse(localStorage.getItem('healqr_temp_doctor_chambers') || '[]');
      setChambers(storedChambers);
    } catch {
      setChambers([]);
    }
  }, []);

  // Time window checker
  useEffect(() => {
    const checkTimeWindow = () => {
      if (chambers.length === 0) return;
      const now = new Date();
      const today = now.toLocaleDateString('en-US', { weekday: 'long' });
      const currentMinutes = now.getHours() * 60 + now.getMinutes();
      const BUFFER = 30;

      let maxEndMinute = 0;
      let isWithinWindow = false;

      for (const ch of chambers) {
        if (!ch.days?.includes(today)) continue;
        const start = parseTimeToMinutes(ch.startTime);
        const end = parseTimeToMinutes(ch.endTime);
        if (start === -1 || end === -1) continue;

        if (currentMinutes >= start - BUFFER && currentMinutes <= end + BUFFER) {
          isWithinWindow = true;
          if (end + BUFFER > maxEndMinute) maxEndMinute = end + BUFFER;
        }
      }

      if (!isWithinWindow) {
        setIsExpired(true);
        setTimeRemaining('Session expired');
      } else {
        setIsExpired(false);
        const remaining = maxEndMinute - currentMinutes;
        const hrs = Math.floor(remaining / 60);
        const mins = remaining % 60;
        setTimeRemaining(hrs > 0 ? `${hrs}h ${mins}m remaining` : `${mins}m remaining`);
      }
    };

    checkTimeWindow();
    const interval = setInterval(checkTimeWindow, 60000); // Check every minute
    return () => clearInterval(interval);
  }, [chambers]);

  // Ensure Firebase Auth session for storage uploads (anonymous sign-in)
  useEffect(() => {
    const ensureAuth = async () => {
      try {
        if (auth && !auth.currentUser) {
          await signInAnonymously(auth);
        }
      } catch (err) {
        console.warn('⚠️ Anonymous auth failed (PDF uploads may not work):', err);
      }
    };
    ensureAuth();
  }, []);

  // Load today's schedule
  useEffect(() => {
    if (doctorId && clinicId) {
      loadTodaysSchedule();
    } else {
      setLoading(false);
    }
  }, [doctorId, clinicId]);

  const parseTimeToMinutes = (timeStr: string): number => {
    if (!timeStr) return -1;
    if (/^\d{1,2}:\d{2}$/.test(timeStr)) {
      const [h, m] = timeStr.split(':').map(Number);
      return h * 60 + m;
    }
    const match = timeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
    if (match) {
      let h = parseInt(match[1]);
      const m = parseInt(match[2]);
      const period = match[3].toUpperCase();
      if (period === 'PM' && h !== 12) h += 12;
      if (period === 'AM' && h === 12) h = 0;
      return h * 60 + m;
    }
    return -1;
  };

  const loadTodaysSchedule = async () => {
    try {
      setLoading(true);

      // Get today's date
      const now = new Date();
      const todayStr = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().split('T')[0];
      const todayDay = now.toLocaleDateString('en-US', { weekday: 'long' });

      // Load doctor data to get chambers
      const doctorDoc = await getDoc(doc(db, 'doctors', doctorId));
      let doctorChambers: Chamber[] = [];

      if (doctorDoc.exists()) {
        const data = doctorDoc.data();
        doctorChambers = (data.chambers || []).filter((ch: any) =>
          ch.clinicId === clinicId && ch.status === 'active'
        );
      }

      // Also check clinic's linked doctor chambers
      if (doctorChambers.length === 0) {
        const clinicDoc = await getDoc(doc(db, 'clinics', clinicId));
        if (clinicDoc.exists()) {
          const clinicData = clinicDoc.data();
          const linkedDoc = (clinicData.linkedDoctorsDetails || []).find(
            (d: any) => d.uid === doctorId
          );
          if (linkedDoc?.chambers) {
            doctorChambers = linkedDoc.chambers.filter((ch: any) =>
              ch.status === 'active'
            );
          }
        }
      }

      // Filter for today's chambers
      const todaysChambers = doctorChambers.filter((ch: any) => {
        if (ch.frequency === 'Custom') return ch.customDate === todayStr;
        return ch.days?.includes(todayDay);
      });

      // Load bookings for each chamber
      const chambersWithBookings = [];
      for (const ch of todaysChambers) {
        const numericChamberId = typeof ch.id === 'string' ? parseInt(ch.id, 10) : ch.id;

        // Query QR bookings
        const bookingsRef = collection(db, 'bookings');
        const qrQuery = query(
          bookingsRef,
          where('chamberId', '==', numericChamberId),
          where('appointmentDate', '==', todayStr)
        );
        const qrSnap = await getDocs(qrQuery);

        // Fallback query
        let bookingDocs = qrSnap.docs;
        if (bookingDocs.length === 0) {
          const fallbackQuery = query(
            bookingsRef,
            where('doctorId', '==', doctorId),
            where('appointmentDate', '==', todayStr)
          );
          const fallbackSnap = await getDocs(fallbackQuery);
          bookingDocs = fallbackSnap.docs.filter(d => d.data().type !== 'walkin_booking');
        }

        // Walk-in bookings
        const walkInQuery = query(
          bookingsRef,
          where('doctorId', '==', doctorId),
          where('type', '==', 'walkin_booking'),
          where('clinicId', '==', clinicId)
        );
        const walkInSnap = await getDocs(walkInQuery);
        const todaysWalkIns = walkInSnap.docs.filter(d => {
          const data = d.data();
          const bookingDate = data.date?.toDate ? data.date.toDate() : new Date(data.date);
          return bookingDate.toISOString().split('T')[0] === todayStr;
        });

        const totalBookings = bookingDocs.filter(d => {
          const data = d.data();
          return !data.isCancelled && data.status !== 'cancelled' && data.type !== 'walkin_booking';
        }).length + todaysWalkIns.filter(d => {
          const data = d.data();
          return !data.isCancelled && data.status !== 'cancelled';
        }).length;

        chambersWithBookings.push({
          ...ch,
          booked: totalBookings,
          numericChamberId,
          qrDocs: bookingDocs,
          walkInDocs: todaysWalkIns
        });
      }

      setActiveChambers(chambersWithBookings);
      setLoading(false);
    } catch (err) {
      console.error('Error loading schedule:', err);
      toast.error('Failed to load schedule');
      setLoading(false);
    }
  };

  const loadPatientsForChamber = useCallback(async (chamber: any) => {
    try {
      const { decrypt } = await import('../utils/encryptionService');

      const buildAppointmentDateTime = (dateValue: any, timeValue: any, fallback: Date) => {
        if (dateValue && timeValue && timeValue !== 'immediate') {
          const dateStr = typeof dateValue === 'string'
            ? dateValue
            : (dateValue.toDate ? dateValue.toDate().toISOString().split('T')[0] : '');
          const timeStr = String(timeValue);
          const date = new Date(dateStr);
          if (!isNaN(date.getTime())) {
            const match = timeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
            if (match) {
              let hour = parseInt(match[1], 10);
              const minute = parseInt(match[2], 10);
              const ampm = (match[3] || '').toLowerCase();
              if (ampm === 'pm' && hour < 12) hour += 12;
              if (ampm === 'am' && hour === 12) hour = 0;
              date.setHours(hour, minute, 0, 0);
              return date;
            }
          }
        }
        if (dateValue?.toDate) return dateValue.toDate();
        if (dateValue) {
          const parsed = new Date(dateValue);
          if (!isNaN(parsed.getTime())) return parsed;
        }
        return fallback;
      };

      const processBooking = (docSnap: any, isWalkIn = false) => {
        const data = docSnap.data();
        const bookingTime = data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt);
        const appointmentFallback = data.date?.toDate ? data.date.toDate() : bookingTime;
        const appointmentTime = buildAppointmentDateTime(data.appointmentDate, data.time, appointmentFallback);
        const isCancelled = data.isCancelled === true || data.status === 'cancelled';

        const patientName = decrypt(data.patientName_encrypted || data.patientName || '');
        const whatsappNumber = decrypt(data.whatsappNumber_encrypted || data.whatsappNumber || '');
        const ageDecrypted = decrypt(data.age_encrypted || '');
        const genderDecrypted = decrypt(data.gender_encrypted || data.gender || '');
        const purposeDecrypted = decrypt(data.purposeOfVisit_encrypted || data.purposeOfVisit || '');

        let parsedAge = 0;
        if (ageDecrypted) {
          parsedAge = parseInt(ageDecrypted.toString().trim()) || 0;
        } else if (data.age) {
          parsedAge = typeof data.age === 'number' ? data.age : (parseInt(data.age.toString().trim()) || 0);
        }

        return {
          id: docSnap.id,
          name: patientName || 'N/A',
          phone: whatsappNumber || data.phone || 'N/A',
          bookingId: data.bookingId || docSnap.id,
          age: parsedAge,
          gender: (genderDecrypted || 'MALE').toUpperCase() as 'MALE' | 'FEMALE',
          visitType: purposeDecrypted || data.visitType || (data.consultationType === 'video' ? 'Video Consultation' : 'In-Person'),
          bookingTime,
          appointmentTime,
          paymentVerified: data.paymentVerified || false,
          consultationType: data.consultationType || 'chamber',
          language: data.language || 'english',
          prescriptionUrl: data.prescriptionUrl,
          prescriptionReviewed: data.prescriptionReviewed || false,
          isCancelled,
          isMarkedSeen: data.isMarkedSeen || false,
          serialNumber: data.serialNo || 0,
          tokenNumber: data.tokenNumber || `#${data.serialNo || 0}`,
          isWalkIn,
          bookingSource: data.bookingSource || (isWalkIn ? 'walkin' : 'clinic_qr'),
          clinicId: data.clinicId || '',
          digitalRxUrl: data.digitalRxUrl || '',
          dietChartUrl: data.dietChartUrl || '',
        };
      };

      // Process QR bookings
      const qrPatients = (chamber.qrDocs || [])
        .filter((d: any) => d.data().type !== 'walkin_booking')
        .map((d: any) => processBooking(d, false));

      // Process walk-in bookings
      const walkInPatients = (chamber.walkInDocs || [])
        .map((d: any) => processBooking(d, true));

      const allPatients = [...qrPatients, ...walkInPatients]
        .filter(p => !p.isCancelled)
        .sort((a, b) => {
          const aNum = typeof a.serialNumber === 'number' ? a.serialNumber : parseInt(String(a.serialNumber)) || 999;
          const bNum = typeof b.serialNumber === 'number' ? b.serialNumber : parseInt(String(b.serialNumber)) || 999;
          return aNum - bNum;
        });

      setPatients(allPatients);
      setSelectedChamber(chamber);
      setShowPatientDetails(true);
    } catch (err) {
      console.error('Error loading patients:', err);
      toast.error('Failed to load patient list');
    }
  }, []);

  const handleLogout = () => {
    // Clear temp doctor localStorage
    localStorage.removeItem('healqr_is_temp_doctor');
    localStorage.removeItem('healqr_temp_doctor_clinic_id');
    localStorage.removeItem('healqr_temp_doctor_id');
    localStorage.removeItem('healqr_temp_doctor_name');
    localStorage.removeItem('healqr_temp_doctor_clinic_name');
    localStorage.removeItem('healqr_temp_doctor_chambers');
    localStorage.removeItem('healqr_temp_doctor_token');
    localStorage.removeItem('healqr_temp_doctor_expiry');
    window.location.href = window.location.origin;
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadTodaysSchedule();
    if (selectedChamber) {
      // Reload the improved data
      const updatedChamber = activeChambers.find(c => c.id === selectedChamber.id);
      if (updatedChamber) {
        await loadPatientsForChamber(updatedChamber);
      }
    }
    setRefreshing(false);
    toast.success('Data refreshed');
  };

  // Expired session view
  if (isExpired) {
    return (
      <div className="min-h-screen bg-[#0a0f1a] flex items-center justify-center p-4">
        <Card className="bg-gray-800/50 border-orange-700/50 p-8 max-w-md w-full text-center">
          <AlertTriangle className="w-16 h-16 text-orange-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">Session Expired</h2>
          <p className="text-gray-400 text-sm mb-4">
            Your temporary access has ended as we're outside chamber hours.
          </p>
          <p className="text-gray-500 text-xs mb-6">
            Access is available 30 minutes before to 30 minutes after scheduled chamber times.
          </p>
          <Button onClick={handleLogout} className="bg-gray-700 hover:bg-gray-600 text-white">
            <LogOut className="w-4 h-4 mr-2" />
            Exit
          </Button>
        </Card>
      </div>
    );
  }

  // Patient details view
  if (showPatientDetails && selectedChamber) {
    return (
      <div className="min-h-screen bg-[#0a0f1a]">
        {/* Temp Doctor Header Bar */}
        <div className="bg-blue-900/30 border-b border-blue-700/30 px-4 py-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-blue-400" />
            <span className="text-blue-300 text-xs font-medium">Temporary Access</span>
            <span className="text-gray-500 text-xs">|</span>
            <span className="text-gray-400 text-xs">Dr. {doctorName}</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-blue-400 text-xs flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {timeRemaining}
            </span>
            <Button
              onClick={handleLogout}
              size="sm"
              variant="ghost"
              className="text-gray-400 hover:text-white text-xs h-7"
            >
              <LogOut className="w-3 h-3 mr-1" />
              Exit
            </Button>
          </div>
        </div>

        <PatientDetails
          chamberName={selectedChamber.chamberName}
          chamberAddress={selectedChamber.chamberAddress}
          scheduleTime={`${selectedChamber.startTime} - ${selectedChamber.endTime}`}
          scheduleDate={new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          currentPatients={patients.filter(p => !p.isCancelled).length}
          totalPatients={selectedChamber.maxCapacity}
          patients={patients as any}
          onBack={() => setShowPatientDetails(false)}
          onRefresh={handleRefresh}
          doctorId={doctorId}
        />
      </div>
    );
  }

  // Loading
  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0f1a] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-white text-lg">Loading today's schedule...</p>
        </div>
      </div>
    );
  }

  // Main view — Today's Schedule
  return (
    <div className="min-h-screen bg-[#0a0f1a]">
      {/* Top Bar */}
      <div className="bg-blue-900/30 border-b border-blue-700/30 px-4 py-3">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
              <Stethoscope className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-white font-semibold text-sm sm:text-base">Dr. {doctorName}</h1>
              <p className="text-gray-400 text-xs">{clinicName} • Temporary Access</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-1.5 bg-blue-800/30 border border-blue-700/30 rounded-lg px-3 py-1.5">
              <Clock className="w-3.5 h-3.5 text-blue-400" />
              <span className="text-blue-300 text-xs">{timeRemaining}</span>
            </div>
            <Button
              onClick={handleRefresh}
              size="sm"
              variant="outline"
              className="border-gray-700 text-gray-300 hover:bg-gray-800 h-8"
              disabled={refreshing}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            </Button>
            <Button
              onClick={handleLogout}
              size="sm"
              variant="outline"
              className="border-red-700/50 text-red-400 hover:bg-red-900/30 h-8"
            >
              <LogOut className="w-3.5 h-3.5 mr-1.5" />
              <span className="hidden sm:inline">Exit</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile time badge */}
      <div className="sm:hidden px-4 pt-3">
        <div className="flex items-center gap-1.5 bg-blue-800/30 border border-blue-700/30 rounded-lg px-3 py-1.5 w-fit">
          <Clock className="w-3.5 h-3.5 text-blue-400" />
          <span className="text-blue-300 text-xs">{timeRemaining}</span>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-white text-xl font-bold flex items-center gap-2">
              <Calendar className="w-5 h-5 text-blue-400" />
              Today's Schedule
            </h2>
            <p className="text-gray-400 text-sm mt-1">
              {new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>
          <Badge variant="outline" className="border-blue-600 text-blue-400 text-xs">
            <Shield className="w-3 h-3 mr-1" />
            Temp Access
          </Badge>
        </div>

        {activeChambers.length === 0 ? (
          <Card className="bg-gray-800/50 border-gray-700 p-8 text-center">
            <Calendar className="w-12 h-12 text-gray-600 mx-auto mb-4" />
            <h3 className="text-white text-lg font-semibold mb-2">No Chambers Today</h3>
            <p className="text-gray-400 text-sm">
              There are no scheduled chambers for today, or chambers haven't been set up yet.
            </p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {activeChambers.map((chamber, index) => (
              <Card
                key={chamber.id || index}
                className="bg-gray-800/50 border-gray-700 p-5 hover:border-blue-600/50 transition-colors cursor-pointer group"
                onClick={() => loadPatientsForChamber(chamber)}
              >
                <div className="flex items-start gap-3 mb-4">
                  <div className="w-10 h-10 bg-blue-600/20 rounded-lg flex items-center justify-center flex-shrink-0 group-hover:bg-blue-600/30 transition-colors">
                    <MapPin className="w-5 h-5 text-blue-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-white font-semibold text-sm break-words">{chamber.chamberName}</h3>
                    <p className="text-gray-400 text-xs break-words">{chamber.chamberAddress}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="flex items-center gap-2 text-gray-300 text-xs">
                    <Clock className="w-3.5 h-3.5 text-gray-500" />
                    <span>{chamber.startTime} - {chamber.endTime}</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-300 text-xs">
                    <Users className="w-3.5 h-3.5 text-gray-500" />
                    <span>{chamber.booked || 0} / {chamber.maxCapacity} patients</span>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <div className={`w-2 h-2 rounded-full ${
                      (chamber.booked || 0) > 0 ? 'bg-emerald-500' : 'bg-gray-600'
                    }`}></div>
                    <span className={`text-xs ${
                      (chamber.booked || 0) > 0 ? 'text-emerald-400' : 'text-gray-500'
                    }`}>
                      {(chamber.booked || 0) > 0 ? 'Patients waiting' : 'No patients yet'}
                    </span>
                  </div>
                  <Button
                    size="sm"
                    className="bg-blue-600 hover:bg-blue-700 text-white text-xs h-7 px-3 group-hover:bg-blue-500"
                  >
                    View Patients →
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Scope Notice */}
        <div className="mt-8 bg-gray-800/30 border border-gray-700/50 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <Shield className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-gray-300 text-sm font-medium mb-1">Temporary Access Scope</p>
              <ul className="text-gray-500 text-xs space-y-1">
                <li>• View today's patient schedule for your chambers at this clinic</li>
                <li>• Access patient details and write Digital RX prescriptions</li>
                <li>• Access automatically expires outside chamber hours (±30 min buffer)</li>
                <li>• This session does not grant access to clinic settings or other features</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TempDoctorDashboard;

