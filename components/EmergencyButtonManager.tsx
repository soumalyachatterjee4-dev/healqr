import { useState, useEffect } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { AlertCircle, Phone, Shield, Power, Edit, ArrowLeft, Clock, Calendar, Plus, X, Zap } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from './ui/dialog';
import { toast } from 'sonner';
import DashboardSidebar from './DashboardSidebar';
import { Switch } from './ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';

interface TimeSlot {
  id: string;
  startTime: string;
  endTime: string;
  days: string[]; // ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']
}

interface EmergencyButtonManagerProps {
  onBack: () => void;
}

export default function EmergencyButtonManager({ onBack }: EmergencyButtonManagerProps) {
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
    loadEmergencyButtonStatus();
  }, []);

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

  const calculateNextChange = (slot: TimeSlot, now: Date): string => {
    const [endHour, endMin] = slot.endTime.split(':').map(Number);
    const endTime = new Date(now);
    endTime.setHours(endHour, endMin, 0, 0);

    // If end time is past midnight
    if (endTime < now) {
      endTime.setDate(endTime.getDate() + 1);
    }

    return `Deactivates at ${slot.endTime}`;
  };

  const updateScheduleStatus = async (shouldBeActive: boolean) => {
    if (shouldBeActive === isScheduleActive) return;

    setIsScheduleActive(shouldBeActive);

    if (!phoneNumber) return; // No phone number set

    try {
      const userId = localStorage.getItem('userId');
      if (!userId) return;

      const { db } = await import('../lib/firebase/config');
      if (!db) return;

      const { doc, updateDoc, serverTimestamp } = await import('firebase/firestore');
      const doctorRef = doc(db, 'doctors', userId);

      await updateDoc(doctorRef, {
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
      const userId = localStorage.getItem('userId');
      if (!userId) return;

      const { db } = await import('../lib/firebase/config');
      if (!db) return;

      const { doc, getDoc } = await import('firebase/firestore');
      const doctorDoc = await getDoc(doc(db, 'doctors', userId));

      if (doctorDoc.exists()) {
        const data = doctorDoc.data();
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
      const userId = localStorage.getItem('userId');
      if (!userId) throw new Error('User not found');

      const { db } = await import('../lib/firebase/config');
      if (!db) throw new Error('Database not configured');

      const { doc, updateDoc, serverTimestamp } = await import('firebase/firestore');
      const doctorRef = doc(db, 'doctors', userId);

      await updateDoc(doctorRef, {
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
      const userId = localStorage.getItem('userId');
      if (!userId) throw new Error('User not found');

      const { db } = await import('../lib/firebase/config');
      if (!db) throw new Error('Database not configured');

      const { doc, updateDoc, serverTimestamp } = await import('firebase/firestore');
      const doctorRef = doc(db, 'doctors', userId);

      await updateDoc(doctorRef, {
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
      const userId = localStorage.getItem('userId');
      if (!userId) throw new Error('User not found');

      const { db } = await import('../lib/firebase/config');
      if (!db) throw new Error('Database not configured');

      const { doc, updateDoc, serverTimestamp } = await import('firebase/firestore');
      const doctorRef = doc(db, 'doctors', userId);

      await updateDoc(doctorRef, {
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
      const userId = localStorage.getItem('userId');
      if (!userId) return;

      const { db } = await import('../lib/firebase/config');
      if (!db) return;

      const { doc, updateDoc } = await import('firebase/firestore');
      const doctorRef = doc(db, 'doctors', userId);

      await updateDoc(doctorRef, {
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
      const userId = localStorage.getItem('userId');
      if (!userId) return;

      const { db } = await import('../lib/firebase/config');
      if (!db) return;

      const { doc, updateDoc } = await import('firebase/firestore');
      const doctorRef = doc(db, 'doctors', userId);

      await updateDoc(doctorRef, {
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
      const userId = localStorage.getItem('userId');
      if (!userId) return;

      const { db } = await import('../lib/firebase/config');
      if (!db) return;

      const { doc, updateDoc } = await import('firebase/firestore');
      const doctorRef = doc(db, 'doctors', userId);

      await updateDoc(doctorRef, {
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

  return (
    <div className="min-h-screen bg-black">
      <DashboardSidebar
        activeMenu="emergency-button"
        onMenuChange={onBack}
        isOpen={false}
      />

      <div className="lg:ml-64 p-6">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-6">
            <div className="flex items-center gap-4 mb-4">
              <button
                onClick={onBack}
                className="p-2 hover:bg-zinc-800 rounded-lg transition-colors text-gray-400 hover:text-white"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-3xl font-bold text-white">Emergency Button</h1>
              </div>
            </div>
            <p className="text-gray-400">
              Enable direct emergency calling for your patients
            </p>
          </div>

          {/* Status Card */}
          <Card className="bg-zinc-900 border-zinc-800 p-6 mb-6">
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
              <div className="bg-zinc-800 rounded-lg p-4 mb-4">
                <div className="flex items-center gap-2 text-emerald-500 mb-2">
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
                    <li>• Red emergency button appears on your booking page</li>
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
            <Card className="bg-zinc-900 border-zinc-800 p-6">
              <h3 className="text-white font-semibold text-lg mb-4 flex items-center gap-2">
                <Power className="w-5 h-5 text-emerald-500" />
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
            <Card className="bg-zinc-900 border-zinc-800 p-6">
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
            <Card className="bg-zinc-900 border-zinc-800 p-6 mt-6">
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
                      ? 'bg-green-500/10 border border-green-500/20' 
                      : 'bg-zinc-800 border border-zinc-700'
                  }`}>
                    <div className="flex items-center gap-2">
                      <Clock className={`w-4 h-4 ${isScheduleActive ? 'text-green-500' : 'text-gray-400'}`} />
                      <div>
                        <p className={`font-medium text-sm ${isScheduleActive ? 'text-green-300' : 'text-gray-300'}`}>
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
                            className="bg-zinc-800 rounded-lg p-3 flex items-center justify-between"
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
                    <div className="bg-zinc-800 rounded-lg p-4 space-y-4">
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
                <div className="bg-zinc-800 p-3 rounded-lg">
                  <p className="text-white font-bold text-lg">+91 {newPhoneNumber}</p>
                </div>
                <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3">
                  <p className="text-yellow-300 text-sm font-medium mb-1">⚠️ Important:</p>
                  <ul className="text-xs text-yellow-300/80 space-y-1">
                    <li>• This number will be visible to patients</li>
                    <li>• Use only for genuine emergencies</li>
                    <li>• Ensure you're available to take emergency calls</li>
                    <li>• You can deactivate anytime</li>
                  </ul>
                </div>
              </div>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setShowActivateModal(false)}
              className="border-zinc-700 text-white hover:bg-zinc-800"
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
            <DialogTitle>Deactivate Emergency Button?</DialogTitle>
            <DialogDescription className="text-gray-400 pt-4">
              <p>The emergency button will be removed from your booking page. Patients will no longer be able to call you directly.</p>
              <p className="mt-2">You can reactivate it anytime from this page.</p>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setShowDeactivateModal(false)}
              className="border-zinc-700 text-white hover:bg-zinc-800"
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              onClick={confirmDeactivate}
              variant="destructive"
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
            <DialogTitle>Update Emergency Number?</DialogTitle>
            <DialogDescription className="text-gray-400 pt-4">
              <p className="mb-3">Your emergency contact number will be updated to:</p>
              <div className="bg-zinc-800 p-3 rounded-lg">
                <p className="text-white font-bold text-lg">+91 {newPhoneNumber}</p>
              </div>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setShowChangeNumberModal(false)}
              className="border-zinc-700 text-white hover:bg-zinc-800"
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              onClick={confirmChangeNumber}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
              disabled={loading}
            >
              {loading ? 'Updating...' : 'Update Number'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

