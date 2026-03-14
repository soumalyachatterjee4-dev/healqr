import { useState, useEffect } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { AlertCircle, Phone, Shield, Power, Edit, ArrowLeft, Clock, Calendar, Plus, X, Zap } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from './ui/dialog';
import { toast } from 'sonner';
import ClinicSidebar from './ClinicSidebar';
import { Switch } from './ui/switch';

interface TimeSlot {
  id: string;
  startTime: string;
  endTime: string;
  days: string[]; // ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']
}

interface ClinicEmergencyButtonManagerProps {
  clinicId?: string;
  onLogout: () => void;
  onMenuChange: (menu: string) => void;
  activeAddOns?: string[];
  isSidebarCollapsed?: boolean;
  setIsSidebarCollapsed?: (collapsed: boolean) => void;
}

export default function ClinicEmergencyButtonManager({
  clinicId,
  onLogout,
  onMenuChange,
  activeAddOns = [],
  isSidebarCollapsed = false,
  setIsSidebarCollapsed
}: ClinicEmergencyButtonManagerProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isActive, setIsActive] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [newPhoneNumber, setNewPhoneNumber] = useState('');
  const [showActivateModal, setShowActivateModal] = useState(false);
  const [showDeactivateModal, setShowDeactivateModal] = useState(false);
  const [showChangeNumberModal, setShowChangeNumberModal] = useState(false);
  const [loading, setLoading] = useState(false);

  // Scheduling features
  const [schedulingEnabled, setSchedulingEnabled] = useState(false);
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [newSlotStart, setNewSlotStart] = useState('09:00');
  const [newSlotEnd, setNewSlotEnd] = useState('18:00');
  const [newSlotDays, setNewSlotDays] = useState<string[]>(['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']);
  const [isScheduleActive, setIsScheduleActive] = useState(false);
  const [nextScheduleChange, setNextScheduleChange] = useState<string>('');

  // Load current status from Firestore
  useEffect(() => {
    if (clinicId) {
      loadEmergencyButtonStatus();
    }
  }, [clinicId]);

  // Check schedule every minute when scheduling is enabled
  useEffect(() => {
    if (!schedulingEnabled) return;

    const checkSchedule = () => {
      const shouldBeActive = checkIfScheduleActive();
      updateScheduleStatus(shouldBeActive);
    };

    checkSchedule(); // Check immediately
    const interval = setInterval(checkSchedule, 60000); // Check every minute

    return () => clearInterval(interval);
  }, [schedulingEnabled, timeSlots]);

  const checkIfScheduleActive = (): boolean => {
    if (timeSlots.length === 0) {
      setNextScheduleChange('No time slots configured');
      return false;
    }

    const now = new Date();
    const currentDay = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'][now.getDay()];
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    for (const slot of timeSlots) {
      if (!slot.days.includes(currentDay)) continue;

      const [startHour, startMin] = slot.startTime.split(':').map(Number);
      const [endHour, endMin] = slot.endTime.split(':').map(Number);
      const startMinutes = startHour * 60 + startMin;
      const endMinutes = endHour * 60 + endMin;

      // Handle overnight slots (e.g., 23:00 - 06:00)
      if (endMinutes < startMinutes) {
        if (currentMinutes >= startMinutes || currentMinutes < endMinutes) {
          setNextScheduleChange(`Active until ${slot.endTime}`);
          return true;
        }
      } else {
        if (currentMinutes >= startMinutes && currentMinutes < endMinutes) {
          setNextScheduleChange(`Active until ${slot.endTime}`);
          return true;
        }
      }
    }

    setNextScheduleChange('Inactive - outside scheduled hours');
    return false;
  };

  const updateScheduleStatus = async (shouldBeActive: boolean) => {
    if (shouldBeActive === isScheduleActive) return;

    setIsScheduleActive(shouldBeActive);

    if (!phoneNumber) return; // No phone number set

    try {
      if (!clinicId) return;

      const { db } = await import('../lib/firebase/config');
      if (!db) return;

      const { doc, updateDoc, serverTimestamp } = await import('firebase/firestore');
      const clinicRef = doc(db, 'clinics', clinicId);

      await updateDoc(clinicRef, {
        emergencyButtonActive: shouldBeActive,
        lastScheduleUpdate: serverTimestamp(),
        scheduleTriggered: true
      });

      setIsActive(shouldBeActive);

      if (shouldBeActive) {
        toast.success('Emergency Button Auto-Activated', {
          description: 'Based on your schedule'
        });
      } else {
        toast.info('Emergency Button Auto-Deactivated', {
          description: 'Schedule period ended'
        });
      }
    } catch (error) {
      console.error('Error updating schedule status:', error);
    }
  };

  const loadEmergencyButtonStatus = async () => {
    try {
      if (!clinicId) return;

      const { db } = await import('../lib/firebase/config');
      if (!db) return;

      const { doc, getDoc } = await import('firebase/firestore');
      const clinicDoc = await getDoc(doc(db, 'clinics', clinicId));

      if (clinicDoc.exists()) {
        const data = clinicDoc.data();
        const active = data.emergencyButtonActive || false;
        const phone = data.emergencyPhone || '';

        setIsActive(active);
        setPhoneNumber(phone);

        // Load scheduling settings
        if (data.emergencyScheduling) {
          setSchedulingEnabled(data.emergencyScheduling.enabled || false);
          setTimeSlots(data.emergencyScheduling.timeSlots || []);
        }
      }
    } catch (error) {
      console.error('Error loading emergency button status:', error);
    }
  };

  const handleActivate = () => {
    if (!newPhoneNumber.trim()) {
      toast.error('Please enter a phone number');
      return;
    }

    if (!/^[6-9]\d{9}$/.test(newPhoneNumber)) {
      toast.error('Please enter a valid 10-digit Indian mobile number');
      return;
    }

    setShowActivateModal(true);
  };

  const confirmActivate = async () => {
    setLoading(true);
    try {
      if (!clinicId) throw new Error('Clinic ID not found');

      const { db } = await import('../lib/firebase/config');
      if (!db) throw new Error('Database not configured');

      const { doc, updateDoc, serverTimestamp } = await import('firebase/firestore');
      const clinicRef = doc(db, 'clinics', clinicId);

      await updateDoc(clinicRef, {
        emergencyButtonActive: true,
        emergencyPhone: newPhoneNumber,
        emergencyActivatedAt: serverTimestamp(),
        emergencyScheduling: {
          enabled: schedulingEnabled,
          timeSlots: timeSlots
        }
      });

      setIsActive(true);
      setPhoneNumber(newPhoneNumber);
      setNewPhoneNumber('');
      setShowActivateModal(false);

      toast.success('Emergency Button Activated!', {
        description: schedulingEnabled
          ? 'Button will activate/deactivate based on your schedule'
          : 'Patients can now call you directly in emergencies'
      });
    } catch (error) {
      console.error('Error activating emergency button:', error);
      toast.error('Failed to activate Emergency Button');
    } finally {
      setLoading(false);
    }
  };

  const confirmDeactivate = async () => {
    setLoading(true);
    try {
      if (!clinicId) throw new Error('Clinic ID not found');

      const { db } = await import('../lib/firebase/config');
      if (!db) throw new Error('Database not configured');

      const { doc, updateDoc, serverTimestamp } = await import('firebase/firestore');
      const clinicRef = doc(db, 'clinics', clinicId);

      await updateDoc(clinicRef, {
        emergencyButtonActive: false,
        emergencyDeactivatedAt: serverTimestamp()
      });

      setIsActive(false);
      setShowDeactivateModal(false);

      toast.success('Emergency Button Deactivated');
    } catch (error) {
      console.error('Error deactivating emergency button:', error);
      toast.error('Failed to deactivate Emergency Button');
    } finally {
      setLoading(false);
    }
  };

  const handleChangeNumber = () => {
    if (!newPhoneNumber.trim()) {
      toast.error('Please enter a new phone number');
      return;
    }

    if (!/^[6-9]\d{9}$/.test(newPhoneNumber)) {
      toast.error('Please enter a valid 10-digit Indian mobile number');
      return;
    }

    setShowChangeNumberModal(true);
  };

  const confirmChangeNumber = async () => {
    setLoading(true);
    try {
      if (!clinicId) throw new Error('Clinic ID not found');

      const { db } = await import('../lib/firebase/config');
      if (!db) throw new Error('Database not configured');

      const { doc, updateDoc, serverTimestamp } = await import('firebase/firestore');
      const clinicRef = doc(db, 'clinics', clinicId);

      await updateDoc(clinicRef, {
        emergencyPhone: newPhoneNumber,
        emergencyPhoneUpdatedAt: serverTimestamp()
      });

      setPhoneNumber(newPhoneNumber);
      setNewPhoneNumber('');
      setShowChangeNumberModal(false);

      toast.success('Emergency Number Updated!');
    } catch (error) {
      console.error('Error updating emergency number:', error);
      toast.error('Failed to update phone number');
    } finally {
      setLoading(false);
    }
  };

  // Scheduling functions
  const toggleScheduling = async (enabled: boolean) => {
    try {
      if (!clinicId) return;

      const { db } = await import('../lib/firebase/config');
      if (!db) return;

      const { doc, updateDoc } = await import('firebase/firestore');
      const clinicRef = doc(db, 'clinics', clinicId);

      await updateDoc(clinicRef, {
        'emergencyScheduling.enabled': enabled
      });

      setSchedulingEnabled(enabled);

      if (enabled) {
        // Immediately apply the schedule when enabled
        const shouldBeActive = checkIfScheduleActive();
        await updateScheduleStatus(shouldBeActive);

        toast.success('Smart Scheduling Enabled', {
          description: shouldBeActive
            ? 'Schedule active - button turned ON'
            : 'Schedule inactive - button turned OFF'
        });
      } else {
        toast.success('Smart Scheduling Disabled', {
          description: 'Button will remain in current state until you toggle it'
        });
      }
    } catch (error) {
      console.error('Error toggling scheduling:', error);
      toast.error('Failed to update scheduling');
    }
  };

  const addTimeSlot = async () => {
    if (!newSlotStart || !newSlotEnd || newSlotDays.length === 0) {
      toast.error('Please select time and days');
      return;
    }

    const newSlot: TimeSlot = {
      id: Date.now().toString(),
      startTime: newSlotStart,
      endTime: newSlotEnd,
      days: [...newSlotDays]
    };

    const updatedSlots = [...timeSlots, newSlot];

    try {
      if (!clinicId) return;

      const { db } = await import('../lib/firebase/config');
      if (!db) return;

      const { doc, updateDoc } = await import('firebase/firestore');
      const clinicRef = doc(db, 'clinics', clinicId);

      await updateDoc(clinicRef, {
        'emergencyScheduling.timeSlots': updatedSlots
      });

      setTimeSlots(updatedSlots);
      setNewSlotStart('09:00');
      setNewSlotEnd('18:00');
      setNewSlotDays(['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']);

      // Immediately re-check schedule if scheduling is enabled
      if (schedulingEnabled) {
        const shouldBeActive = checkIfScheduleActive();
        await updateScheduleStatus(shouldBeActive);
      }

      toast.success('Time Slot Added');
    } catch (error) {
      console.error('Error adding time slot:', error);
      toast.error('Failed to add time slot');
    }
  };

  const removeTimeSlot = async (slotId: string) => {
    const updatedSlots = timeSlots.filter(slot => slot.id !== slotId);

    try {
      if (!clinicId) return;

      const { db } = await import('../lib/firebase/config');
      if (!db) return;

      const { doc, updateDoc } = await import('firebase/firestore');
      const clinicRef = doc(db, 'clinics', clinicId);

      await updateDoc(clinicRef, {
        'emergencyScheduling.timeSlots': updatedSlots
      });

      setTimeSlots(updatedSlots);

      // Immediately re-check schedule if scheduling is enabled
      if (schedulingEnabled) {
        const shouldBeActive = checkIfScheduleActive();
        await updateScheduleStatus(shouldBeActive);
      }

      toast.success('Time Slot Removed');
    } catch (error) {
      console.error('Error removing time slot:', error);
      toast.error('Failed to remove time slot');
    }
  };

  const toggleDay = (day: string) => {
    setNewSlotDays(prev =>
      prev.includes(day)
        ? prev.filter(d => d !== day)
        : [...prev, day]
    );
  };

  const dayLabels: Record<string, string> = {
    mon: 'Mon',
    tue: 'Tue',
    wed: 'Wed',
    thu: 'Thu',
    fri: 'Fri',
    sat: 'Sat',
    sun: 'Sun'
  };

  const isCollapsed = isSidebarCollapsed;

  return (
    <div className="min-h-screen bg-[#0a0f1a] text-white flex flex-col lg:flex-row">
      <ClinicSidebar
        activeMenu="emergency-button"
        onMenuChange={onMenuChange}
        onLogout={onLogout}
        isOpen={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed && setIsSidebarCollapsed(!isCollapsed)}
        activeAddOns={activeAddOns}
      />

      <div className={`flex-1 transition-all duration-300 ${isSidebarCollapsed ? 'lg:ml-20' : 'lg:ml-64'} min-h-screen flex flex-col`}>
        {/* Header */}
        <header className="bg-zinc-950 border-b border-zinc-900 p-4 lg:p-6 sticky top-0 z-10">
          <div className="flex items-center gap-4 mb-4">
             <button
              onClick={() => onMenuChange('dashboard')}
              className="p-2 hover:bg-zinc-800 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <Button
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden bg-blue-500 hover:bg-blue-600 ml-auto"
            >
              Menu
            </Button>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white mb-1">Clinic Emergency Button</h1>
            <p className="text-gray-400 text-sm">Enable direct emergency calling for your patients</p>
          </div>
        </header>

        <div className="p-4 lg:p-6 max-w-4xl mx-auto w-full flex-1 overflow-y-auto">
          {/* Status Card */}
          <Card className="bg-zinc-900/50 border-zinc-800 p-6 mb-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                  isActive ? 'bg-red-500/10' : 'bg-zinc-800'
                }`}>
                  <AlertCircle className={`w-6 h-6 ${isActive ? 'text-red-500' : 'text-gray-500'}`} />
                </div>
                <div>
                  <h3 className="text-white font-semibold text-lg">Emergency Button Status</h3>
                  <p className="text-sm text-gray-400">
                    {isActive ? 'Active - Patients can call you directly' : 'Inactive - Not visible to patients'}
                  </p>
                </div>
              </div>
              <div className={`px-4 py-2 rounded-full text-sm font-bold ${
                isActive
                  ? 'bg-red-500/10 text-red-500 border border-red-500/20'
                  : 'bg-zinc-800 text-gray-400 border border-zinc-700'
              }`}>
                {isActive ? 'ACTIVE' : 'INACTIVE'}
              </div>
            </div>

            {isActive && phoneNumber && (
              <div className="bg-zinc-800 rounded-lg p-4 mb-4 border border-zinc-700">
                <div className="flex items-center gap-2 text-blue-500 mb-2">
                  <Phone className="w-4 h-4" />
                  <span className="text-sm font-medium">Current Emergency Number</span>
                </div>
                <p className="text-white text-xl font-bold">+91 {phoneNumber}</p>
              </div>
            )}

            {/* Info Box */}
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 mb-4">
              <div className="flex gap-3">
                <Shield className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-blue-300">
                  <p className="font-medium mb-1">How it works:</p>
                  <ul className="space-y-1 text-blue-300/80">
                    <li>• Red emergency button appears on your clinic's booking page</li>
                    <li>• Patients click it to directly call your emergency number</li>
                    <li>• Use for genuine medical emergencies only</li>
                    <li>• You can deactivate anytime when not available</li>
                  </ul>
                </div>
              </div>
            </div>
          </Card>

          {/* Action Cards */}
          {!isActive ? (
            /* Activation Card */
            <Card className="bg-zinc-900/50 border-zinc-800 p-6">
              <h3 className="text-white font-semibold text-lg mb-4 flex items-center gap-2">
                <Power className="w-5 h-5 text-blue-500" />
                Activate Emergency Button
              </h3>
              <p className="text-gray-400 text-sm mb-4">
                Enter your emergency contact number that patients can call during critical situations
              </p>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="phone" className="text-white mb-2 block">
                    Emergency Phone Number
                  </Label>
                  <div className="flex gap-3">
                    <div className="flex-shrink-0 flex items-center px-4 bg-zinc-800 border border-zinc-700 rounded-lg text-gray-400">
                      +91
                    </div>
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="Enter 10-digit mobile number"
                      value={newPhoneNumber}
                      onChange={(e) => setNewPhoneNumber(e.target.value.replace(/\D/g, '').slice(0, 10))}
                      className="flex-1 bg-zinc-800 border-zinc-700 text-white"
                      maxLength={10}
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    Only Indian mobile numbers (starting with 6-9)
                  </p>
                </div>

                <Button
                  onClick={handleActivate}
                  className="w-full bg-red-600 hover:bg-red-700 text-white h-12"
                  disabled={!newPhoneNumber || newPhoneNumber.length !== 10}
                >
                  <Power className="w-4 h-4 mr-2" />
                  Activate Emergency Button
                </Button>
              </div>
            </Card>
          ) : (
            /* Management Card */
            <Card className="bg-zinc-900/50 border-zinc-800 p-6">
              <h3 className="text-white font-semibold text-lg mb-4">Manage Emergency Button</h3>

              <div className="space-y-4">
                {/* Change Number */}
                <div>
                  <Label htmlFor="new-phone" className="text-white mb-2 block">
                    Change Emergency Number
                  </Label>
                  <div className="flex gap-3">
                    <div className="flex-shrink-0 flex items-center px-4 bg-zinc-800 border border-zinc-700 rounded-lg text-gray-400">
                      +91
                    </div>
                    <Input
                      id="new-phone"
                      type="tel"
                      placeholder="Enter new number"
                      value={newPhoneNumber}
                      onChange={(e) => setNewPhoneNumber(e.target.value.replace(/\D/g, '').slice(0, 10))}
                      className="flex-1 bg-zinc-800 border-zinc-700 text-white"
                      maxLength={10}
                    />
                  </div>
                </div>

                <Button
                  onClick={handleChangeNumber}
                  variant="outline"
                  className="w-full border-zinc-700 text-white hover:bg-zinc-800 h-12"
                  disabled={!newPhoneNumber || newPhoneNumber.length !== 10}
                >
                  <Edit className="w-4 h-4 mr-2" />
                  Update Phone Number
                </Button>

                <div className="border-t border-zinc-800 pt-4">
                  <Button
                    onClick={() => setShowDeactivateModal(true)}
                    variant="outline"
                    className="w-full border-red-500/30 text-red-500 hover:bg-red-500/10 h-12"
                  >
                    <Power className="w-4 h-4 mr-2" />
                    Deactivate Emergency Button
                  </Button>
                </div>
              </div>
            </Card>
          )}

          {/* Smart Scheduling Section */}
          {phoneNumber && (
            <Card className="bg-zinc-900/50 border-zinc-800 p-6 mt-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-white font-semibold text-lg flex items-center gap-2">
                    <Clock className="w-5 h-5 text-purple-500" />
                    Smart Scheduling
                  </h3>
                  <p className="text-gray-400 text-sm mt-1">
                    Auto-activate/deactivate emergency button based on time slots
                  </p>
                </div>
                <Switch
                  checked={schedulingEnabled}
                  onCheckedChange={toggleScheduling}
                />
              </div>

              {schedulingEnabled && (
                <div className="space-y-6">
                  {/* Current Schedule Status */}
                  <div className={`rounded-lg p-4 ${
                    isScheduleActive
                      ? 'bg-blue-500/10 border border-blue-500/20'
                      : 'bg-zinc-800 border border-zinc-700'
                  }`}>
                    <div className="flex items-center gap-2">
                      <Clock className={`w-4 h-4 ${isScheduleActive ? 'text-blue-500' : 'text-gray-400'}`} />
                      <div>
                        <p className={`font-medium text-sm ${isScheduleActive ? 'text-blue-300' : 'text-gray-300'}`}>
                          {isScheduleActive ? 'Schedule Active Now' : 'Schedule Inactive'}
                        </p>
                        {nextScheduleChange && (
                          <p className="text-xs text-gray-400 mt-0.5">{nextScheduleChange}</p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Time Slots Section */}
                  <div>
                    <h4 className="text-white font-medium text-sm mb-3">Time-Based Activation</h4>

                    {/* Existing Time Slots */}
                    {timeSlots.length > 0 && (
                      <div className="space-y-2 mb-4">
                        {timeSlots.map((slot) => (
                          <div
                            key={slot.id}
                            className="bg-zinc-800/80 rounded-lg p-3 flex items-center justify-between border border-zinc-700/50"
                          >
                            <div>
                              <p className="text-white font-medium text-sm">
                                {slot.startTime} - {slot.endTime}
                              </p>
                              <div className="flex gap-1 mt-1 flex-wrap">
                                {slot.days.map((day) => (
                                  <span
                                    key={day}
                                    className="px-2 py-0.5 bg-purple-500/20 text-purple-300 rounded text-xs"
                                  >
                                    {dayLabels[day]}
                                  </span>
                                ))}
                              </div>
                            </div>
                            <button
                              onClick={() => removeTimeSlot(slot.id)}
                              className="p-1 hover:bg-zinc-700 rounded text-gray-400 hover:text-red-400 transition-colors"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Add New Time Slot */}
                    <div className="bg-zinc-800/80 rounded-lg p-4 space-y-4 border border-zinc-700/50">
                      <p className="text-gray-300 text-sm font-medium">Add Time Slot</p>

                      {/* Time Inputs */}
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label className="text-gray-400 text-xs mb-1 block">Start Time</Label>
                          <Input
                            type="time"
                            value={newSlotStart}
                            onChange={(e) => setNewSlotStart(e.target.value)}
                            className="bg-zinc-900 border-zinc-700 text-white"
                          />
                        </div>
                        <div>
                          <Label className="text-gray-400 text-xs mb-1 block">End Time</Label>
                          <Input
                            type="time"
                            value={newSlotEnd}
                            onChange={(e) => setNewSlotEnd(e.target.value)}
                            className="bg-zinc-900 border-zinc-700 text-white"
                          />
                        </div>
                      </div>

                      {/* Day Selection */}
                      <div>
                        <Label className="text-gray-400 text-xs mb-2 block">Active Days</Label>
                        <div className="flex gap-2 flex-wrap">
                          {Object.entries(dayLabels).map(([day, label]) => (
                            <button
                              key={day}
                              onClick={() => toggleDay(day)}
                              className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                                newSlotDays.includes(day)
                                  ? 'bg-purple-600 text-white'
                                  : 'bg-zinc-700 text-gray-400 hover:bg-zinc-600'
                              }`}
                            >
                              {label}
                            </button>
                          ))}
                        </div>
                      </div>

                      <Button
                        onClick={addTimeSlot}
                        className="w-full bg-purple-600 hover:bg-purple-700 text-white"
                        disabled={!newSlotStart || !newSlotEnd || newSlotDays.length === 0}
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Add Time Slot
                      </Button>
                    </div>

                    {timeSlots.length === 0 && (
                      <p className="text-gray-500 text-xs text-center mt-3">
                        No time slots configured. Add one to enable time-based activation.
                      </p>
                    )}
                  </div>

                  {/* Priority Info */}
                  <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
                    <p className="text-blue-300 text-xs font-medium mb-1">📋 Priority System:</p>
                    <ul className="text-blue-300/80 text-xs space-y-0.5">
                      <li>1. Manual Override (highest priority)</li>
                      <li>2. Time-Based Schedule</li>
                      <li>3. Chamber-Aware Mode (lowest priority)</li>
                    </ul>
                  </div>
                </div>
              )}
            </Card>
          )}
        </div>
      </div>

      {/* Activation Confirmation Modal */}
      <Dialog open={showActivateModal} onOpenChange={setShowActivateModal}>
        <DialogContent className="bg-zinc-900 border-zinc-800 text-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <Shield className="w-6 h-6 text-red-500" />
              Activate Emergency Button?
            </DialogTitle>
            <DialogDescription className="text-gray-400 pt-4">
              <div className="space-y-3">
                <p>You are about to activate the emergency calling feature with:</p>
                <div className="bg-zinc-800 p-3 rounded-lg border border-zinc-700 text-center">
                  <p className="text-white font-bold text-xl tracking-wider">+91 {newPhoneNumber}</p>
                </div>
                <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
                  <p className="text-yellow-400 text-sm font-semibold mb-2 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" />
                    Important Information
                  </p>
                  <ul className="text-sm text-yellow-500/80 space-y-2">
                    <li className="flex items-start gap-2">
                      <span className="mt-1 flex-shrink-0">•</span>
                      <span>This number will be visible to all patients visiting your booking page</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="mt-1 flex-shrink-0">•</span>
                      <span>Ensure you or your staff are available to answer calls on this number</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="mt-1 flex-shrink-0">•</span>
                      <span>You can manually deactivate this feature at any time</span>
                    </li>
                  </ul>
                </div>
              </div>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-6 flex gap-3 sm:justify-end">
            <Button
              variant="outline"
              onClick={() => setShowActivateModal(false)}
              className="border-zinc-700 text-gray-300 hover:bg-zinc-800"
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              onClick={confirmActivate}
              className="bg-red-600 hover:bg-red-700 text-white"
              disabled={loading}
            >
              {loading ? 'Activating...' : 'Yes, Activate'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Deactivation Confirmation Modal */}
      <Dialog open={showDeactivateModal} onOpenChange={setShowDeactivateModal}>
        <DialogContent className="bg-zinc-900 border-zinc-800 text-white">
          <DialogHeader>
            <DialogTitle className="text-xl">Deactivate Emergency Button?</DialogTitle>
            <DialogDescription className="text-gray-400 pt-4 space-y-4">
              <p>
                Are you sure you want to turn off the emergency calling feature?
              </p>
              <div className="bg-zinc-800 rounded-lg p-4 flex items-start gap-3">
                <Power className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="text-gray-300 mb-1">
                    The emergency button will be immediately removed from your booking website.
                  </p>
                  <p className="text-gray-500">
                    Patients will no longer be able to call this number directly from the page.
                  </p>
                </div>
              </div>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-6 flex gap-3 sm:justify-end">
            <Button
              variant="outline"
              onClick={() => setShowDeactivateModal(false)}
              className="border-zinc-700 text-gray-300 hover:bg-zinc-800"
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              onClick={confirmDeactivate}
              className="bg-red-600 hover:bg-red-700 text-white"
              disabled={loading}
            >
              {loading ? 'Deactivating...' : 'Yes, Deactivate'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Change Number Confirmation Modal */}
      <Dialog open={showChangeNumberModal} onOpenChange={setShowChangeNumberModal}>
        <DialogContent className="bg-zinc-900 border-zinc-800 text-white">
          <DialogHeader>
            <DialogTitle className="text-xl">Update Emergency Number</DialogTitle>
            <DialogDescription className="text-gray-400 pt-4">
              <div className="space-y-4">
                <p>You are about to update the emergency contact number to:</p>
                <div className="bg-zinc-800 p-3 rounded-lg border border-zinc-700 text-center">
                  <p className="text-white font-bold text-xl tracking-wider">+91 {newPhoneNumber}</p>
                </div>
                <p className="text-sm">
                  This new number will be immediately visible on your booking website and all new emergency calls will be routed to it.
                </p>
              </div>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-6 flex gap-3 sm:justify-end">
            <Button
              variant="outline"
              onClick={() => setShowChangeNumberModal(false)}
              className="border-zinc-700 text-gray-300 hover:bg-zinc-800"
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              onClick={confirmChangeNumber}
              className="bg-blue-600 hover:bg-blue-700 text-white"
              disabled={loading}
            >
              {loading ? 'Updating...' : 'Confirm Update'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

