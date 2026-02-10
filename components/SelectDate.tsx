import { Button } from './ui/button';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { ChevronLeft, ChevronRight, Lightbulb } from 'lucide-react';
import { useState } from 'react';
import { t, type Language } from '../utils/translations';
import TemplateDisplay from './TemplateDisplay';
import BookingFlowLayout from './BookingFlowLayout';

interface SelectDateProps {
  onBack: () => void;
  onContinue: (date: Date) => void;
  language: Language;
  maxAdvanceDays?: number;
  plannedOffPeriods?: Array<{
    startDate: string;
    endDate: string;
    status: string;
    appliesTo?: 'clinic' | 'doctor';
    clinicId?: string;
  }>;
  clinicPlannedOffPeriods?: Array<{
    startDate: string;
    endDate: string;
    status: string;
    clinicId?: string;
    chamberName?: string;
    doctorId?: string;
  }>;
  chambers?: Array<{
    clinicId?: string;
    chamberName?: string;
    chamberAddress?: string;
  }>;
  schedules?: Array<{
    days: string[];
    frequency: string;
  }>;
  globalBookingEnabled?: boolean;
  doctorName?: string;
  doctorSpecialty?: string;
  doctorPhoto?: string;
  useDrPrefix?: boolean;
  themeColor?: 'emerald' | 'blue';
  clinicId?: string;
  doctorId?: string;
}

export default function SelectDate({ onBack, onContinue, language, maxAdvanceDays = 30, plannedOffPeriods = [], clinicPlannedOffPeriods = [], chambers = [], schedules = [], globalBookingEnabled = true, doctorName = '', doctorSpecialty = '', doctorPhoto = '', useDrPrefix = true, themeColor = 'emerald', clinicId, doctorId }: SelectDateProps) {
  console.log('📅 SelectDate Props:', { 
    maxAdvanceDays, 
    globalBookingEnabled, 
    plannedOffPeriodsCount: plannedOffPeriods.length,
    clinicId: clinicId || 'NOT_FROM_CLINIC',
    doctorId: doctorId || 'NOT_SET',
    schedulesCount: schedules.length,
    doctorName,
    doctorSpecialty
  });
  
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const [currentMonth, setCurrentMonth] = useState(new Date(today.getFullYear(), today.getMonth(), 1));

  const daysOfWeek = [
    t('sun', language),
    t('mon', language),
    t('tue', language),
    t('wed', language),
    t('thu', language),
    t('fri', language),
    t('sat', language),
  ];

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    const days: (number | null)[] = [];
    
    // Add empty slots for days before the first day of the month
    for (let i = 0; i < firstDay; i++) {
      days.push(null);
    }
    
    // Add all days of the month
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(i);
    }
    
    return days;
  };

  const days = getDaysInMonth(currentMonth);

  // Check if a date is disabled
  const isDateDisabled = (day: number): boolean => {
    const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
    date.setHours(0, 0, 0, 0);
    
    // Disable past dates
    if (date < today) {
      return true;
    }
    
    // Disable dates beyond max advance booking days
    const maxDate = new Date(today);
    maxDate.setDate(maxDate.getDate() + maxAdvanceDays);
    console.log(`📅 Checking date ${day}:`, { 
      date: date.toDateString(), 
      maxDate: maxDate.toDateString(), 
      maxAdvanceDays,
      isDisabled: date > maxDate 
    });
    if (date > maxDate) {
      return true;
    }
    
    // ========================================
    // CLEAR BLOCKING LOGIC (Rebuilt from scratch)
    // ========================================
    // DATE PICKER RULES:
    // 1. Doctor full-day off (appliesTo='doctor', no clinicId, no chamberName) → BLOCK
    // 2. Chamber-specific off (chamberName set) → DON'T BLOCK (SelectChamber handles)
    // 3. Clinic-wide off:
    //    - Clinic QR → BLOCK date (entire clinic affected)
    //    - Doctor QR → DON'T BLOCK (personal chambers may be available)
    // ========================================
    
    const isClinicQr = !!clinicId;
    const isDoctorQr = !isClinicQr;
    
    // Process doctor's own planned-off periods
    const activePlannedOffPeriods = plannedOffPeriods.filter(p => {
      if (p.status !== 'active') return false;
      
      // Chamber-specific off → Don't block date (chamber selection handles it)
      if (p.chamberName) return false;
      
      // Doctor full-day off (no clinicId means full personal off)
      if (p.appliesTo === 'doctor' && !p.clinicId) {
        return true; // BLOCK date
      }
      
      // Clinic-scoped doctor off → Don't block date (only affects clinic chambers)
      if (p.clinicId) return false;
      
      // Legacy periods without appliesTo → Assume full-day off
      if (!p.appliesTo) return true;
      
      return false;
    });
    
    // Process clinic planned-off periods
    const activeClinicPeriods = clinicPlannedOffPeriods.filter(p => {
      if (p.status !== 'active') return false;
      
      // Chamber-specific off → Don't block date (chamber selection handles it)
      if (p.chamberName) return false;
      
      // Doctor-scoped clinic off: only apply to matching doctor
      if (p.doctorId && doctorId && p.doctorId !== doctorId) {
        return false; // Different doctor's off period
      }
      
      // Clinic QR mode: Block ALL clinic-wide off periods
      if (isClinicQr) {
        // Filter to current clinic only
        if (p.clinicId && clinicId && p.clinicId !== clinicId) {
          return false;
        }
        return true; // BLOCK date for clinic QR
      }
      
      // Doctor QR mode: NEVER block dates for clinic off
      // Reason: Doctor may have personal chambers (HOME) available
      // SelectChamber will filter clinic chambers
      if (isDoctorQr) {
        console.log(`🏥 Doctor QR: NOT blocking date for clinic off - chambers will handle filtering`);
        return false; // DON'T BLOCK date for doctor QR
      }
      
      return false;
    });

    const allBlockingPeriods = [...activePlannedOffPeriods, ...activeClinicPeriods];

    console.log('📊 Planned off summary:', {
      activeDoctorPeriodsCount: activePlannedOffPeriods.length,
      activeClinicPeriodsCount: activeClinicPeriods.length,
      allBlockingPeriodsCount: allBlockingPeriods.length,
      checkingDate: date.toDateString()
    });

    allBlockingPeriods.forEach(p => {
      console.log('  🧩 Period:', {
        startDate: p.startDate,
        endDate: p.endDate,
        appliesTo: p.appliesTo,
        clinicId: p.clinicId,
        chamberName: p.chamberName,
        status: p.status
      });
    });
    
    for (const period of allBlockingPeriods) {
      // Handle both string dates and Firestore timestamps
      let startDate: Date;
      let endDate: Date;
      
      if (typeof period.startDate === 'string') {
        // String format: "2025-12-15"
        // Parse as local date to avoid timezone issues
        const [year, month, dayVal] = period.startDate.split('-').map(Number);
        startDate = new Date(year, month - 1, dayVal);
      } else if (period.startDate?.toDate) {
        // Firestore Timestamp
        startDate = period.startDate.toDate();
      } else {
        // Already a Date object
        startDate = new Date(period.startDate);
      }
      
      if (typeof period.endDate === 'string') {
        const [year, month, dayVal] = period.endDate.split('-').map(Number);
        endDate = new Date(year, month - 1, dayVal);
      } else if (period.endDate?.toDate) {
        endDate = period.endDate.toDate();
      } else {
        endDate = new Date(period.endDate);
      }
      
      startDate.setHours(0, 0, 0, 0);
      endDate.setHours(0, 0, 0, 0);
      
      console.log(`  📅 Comparing with period:`, {
        startDate: startDate.toDateString(),
        endDate: endDate.toDateString(),
        isInRange: date >= startDate && date <= endDate
      });
      
      if (date >= startDate && date <= endDate) {
        console.log(`  ❌ Date ${day} IS BLOCKED by planned off period`);
        return true;
      }
    }
    
    console.log(`  ✅ Date ${day} is NOT blocked`);
    return false;
  };

  const handleDateSelect = (day: number) => {
    if (isDateDisabled(day)) {
      return;
    }
    const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
    setSelectedDate(date);
  };

  const formatMonth = (date: Date) => {
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  const previousMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  return (
    <BookingFlowLayout
      onBack={onBack}
      doctorName={doctorName}
      doctorPhoto={doctorPhoto}
      doctorSpecialty={doctorSpecialty}
      useDrPrefix={useDrPrefix}
      themeColor={themeColor}
    >
      <div>

        {/* Select Date Section */}
        <h2 className="text-white mb-4">{t('selectDate', language)}</h2>

        {/* Calendar */}
        <div className="bg-[#1a1f2e] rounded-2xl border border-gray-700 p-6 mb-6">
          {/* Month Navigation */}
          <div className="flex items-center justify-between mb-6">
            <button
              onClick={previousMonth}
              className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
            >
              <ChevronLeft className="w-5 h-5 text-gray-400" />
            </button>
            <h3 className="text-white">{formatMonth(currentMonth)}</h3>
            <button
              onClick={nextMonth}
              className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
            >
              <ChevronRight className="w-5 h-5 text-gray-400" />
            </button>
          </div>

          {/* Days of Week */}
          <div className="grid grid-cols-7 gap-2 mb-4">
            {daysOfWeek.map((day) => (
              <div key={day} className="text-center text-sm text-gray-400 py-2">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Days */}
          <div className="grid grid-cols-7 gap-2">
            {days.map((day, index) => (
              <div key={index} className="aspect-square">
                {day ? (
                  <button
                    onClick={() => handleDateSelect(day)}
                    disabled={isDateDisabled(day)}
                    className={`w-full h-full rounded-lg flex items-center justify-center transition-colors ${
                      isDateDisabled(day)
                        ? 'bg-red-900/30 text-red-400 cursor-not-allowed opacity-50'
                        : selectedDate?.getDate() === day &&
                          selectedDate?.getMonth() === currentMonth.getMonth()
                        ? themeColor === 'blue' ? 'bg-blue-500 text-white' : 'bg-emerald-500 text-white'
                        : 'text-gray-300 hover:bg-gray-700'
                    }`}
                  >
                    {day}
                  </button>
                ) : (
                  <div />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Health Tip Image */}
        <TemplateDisplay placement="booking-select-date" className="mb-6" />

        {/* Continue Button */}
        <Button
          onClick={() => selectedDate && onContinue(selectedDate)}
          disabled={!selectedDate}
          className={`w-full h-12 rounded-xl ${
            selectedDate
              ? themeColor === 'blue' 
                ? 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white'
                : 'bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white'
              : 'bg-gray-700 text-gray-500 cursor-not-allowed'
          }`}
        >
          {t('continueToChamberSelection', language)}
        </Button>
      </div>
    </BookingFlowLayout>
  );
}