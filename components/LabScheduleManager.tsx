import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import {
  Plus,
  Edit2,
  Trash2,
  Clock,
  Calendar,
  MapPin,
  X,
  ToggleLeft,
  ToggleRight,
  Home,
  FlaskConical,
  Info,
  AlertCircle,
} from 'lucide-react';
import { auth, db } from '../lib/firebase/config';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { toast } from 'sonner';

interface CollectionSlot {
  id: number;
  slotName: string;
  slotType: 'walk-in' | 'home-collection';
  days: string[];
  startTime: string;
  endTime: string;
  slotDuration: number; // minutes per booking
  maxCapacity: number;
  branchName?: string;
  branchAddress?: string;
  isActive: boolean;
}

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const DAY_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const DURATIONS = [10, 15, 20, 30, 45, 60];

const EMPTY_SLOT: Omit<CollectionSlot, 'id'> = {
  slotName: '',
  slotType: 'walk-in',
  days: [],
  startTime: '08:00',
  endTime: '14:00',
  slotDuration: 30,
  maxCapacity: 20,
  branchName: '',
  branchAddress: '',
  isActive: true,
};

interface LabScheduleManagerProps {
  labId: string;
  labData: {
    name: string;
    locations?: Array<{ name: string; address: string }>;
  } | null;
}

export default function LabScheduleManager({ labId, labData }: LabScheduleManagerProps) {
  const [slots, setSlots] = useState<CollectionSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingSlot, setEditingSlot] = useState<CollectionSlot | null>(null);
  const [form, setForm] = useState<Omit<CollectionSlot, 'id'>>({ ...EMPTY_SLOT });

  // Global settings
  const [maxAdvanceDays, setMaxAdvanceDays] = useState('30');
  const [plannedOffEnabled, setPlannedOffEnabled] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [plannedOffPeriods, setPlannedOffPeriods] = useState<Array<{ id: string; startDate: string; endDate: string; status: string }>>([]);
  const hasActivePeriods = plannedOffPeriods.some(p => p.status === 'active');

  // Load slots from Firestore
  useEffect(() => {
    loadSlots();
  }, [labId]);

  const loadSlots = async () => {
    if (!labId || !db) { setLoading(false); return; }
    try {
      const labDoc = await getDoc(doc(db, 'labs', labId));
      if (labDoc.exists()) {
        const data = labDoc.data();
        setSlots(data.collectionSlots || []);
        // Load global settings
        setMaxAdvanceDays(data.maxAdvanceBookingDays?.toString() || '30');
        if (data.plannedOffPeriods && Array.isArray(data.plannedOffPeriods)) {
          setPlannedOffPeriods(data.plannedOffPeriods.map((p: any) => ({
            ...p,
            startDate: (p.startDate as any)?.toDate ? (p.startDate as any).toDate().toISOString().split('T')[0] : p.startDate,
            endDate: (p.endDate as any)?.toDate ? (p.endDate as any).toDate().toISOString().split('T')[0] : p.endDate,
          })));
          if (data.plannedOffPeriods.some((p: any) => p.status === 'active')) {
            setPlannedOffEnabled(true);
          }
        }
      }
    } catch (err) {
      console.error('Error loading schedule:', err);
      toast.error('Failed to load schedule');
    } finally {
      setLoading(false);
    }
  };

  const saveSlots = async (updatedSlots: CollectionSlot[]) => {
    setSaving(true);
    try {
      await updateDoc(doc(db, 'labs', labId), {
        collectionSlots: updatedSlots,
        updatedAt: serverTimestamp(),
      });
      setSlots(updatedSlots);
      toast.success('Schedule saved');
    } catch (err) {
      console.error('Error saving schedule:', err);
      toast.error('Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setForm({ ...EMPTY_SLOT });
    setEditingSlot(null);
    setShowModal(false);
  };

  const openAdd = () => {
    setForm({ ...EMPTY_SLOT });
    setEditingSlot(null);
    setShowModal(true);
  };

  const openEdit = (slot: CollectionSlot) => {
    setEditingSlot(slot);
    setForm({
      slotName: slot.slotName,
      slotType: slot.slotType,
      days: [...slot.days],
      startTime: slot.startTime,
      endTime: slot.endTime,
      slotDuration: slot.slotDuration,
      maxCapacity: slot.maxCapacity,
      branchName: slot.branchName || '',
      branchAddress: slot.branchAddress || '',
      isActive: slot.isActive,
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.slotName.trim()) { toast.error('Slot name is required'); return; }
    if (form.days.length === 0) { toast.error('Select at least one day'); return; }
    if (!form.startTime || !form.endTime) { toast.error('Set start and end time'); return; }
    if (form.startTime >= form.endTime) { toast.error('End time must be after start time'); return; }

    const slotData: CollectionSlot = {
      id: editingSlot ? editingSlot.id : Date.now(),
      slotName: form.slotName.trim(),
      slotType: form.slotType,
      days: form.days,
      startTime: form.startTime,
      endTime: form.endTime,
      slotDuration: form.slotDuration,
      maxCapacity: form.maxCapacity,
      branchName: form.branchName?.trim() || '',
      branchAddress: form.branchAddress?.trim() || '',
      isActive: form.isActive,
    };

    let updated: CollectionSlot[];
    if (editingSlot) {
      updated = slots.map((s) => (s.id === editingSlot.id ? slotData : s));
    } else {
      updated = [...slots, slotData];
    }

    await saveSlots(updated);
    resetForm();
  };

  const handleDelete = async (slotId: number) => {
    if (!confirm('Delete this schedule slot?')) return;
    const updated = slots.filter((s) => s.id !== slotId);
    await saveSlots(updated);
  };

  const toggleActive = async (slotId: number) => {
    const updated = slots.map((s) =>
      s.id === slotId ? { ...s, isActive: !s.isActive } : s,
    );
    await saveSlots(updated);
  };

  const toggleDay = (day: string) => {
    setForm((f) => ({
      ...f,
      days: f.days.includes(day) ? f.days.filter((d) => d !== day) : [...f.days, day],
    }));
  };

  // Compute slots per session
  const computeSlotCount = (start: string, end: string, duration: number) => {
    const [sh, sm] = start.split(':').map(Number);
    const [eh, em] = end.split(':').map(Number);
    const totalMinutes = (eh * 60 + em) - (sh * 60 + sm);
    return totalMinutes > 0 ? Math.floor(totalMinutes / duration) : 0;
  };

  const branches = labData?.locations || [];

  // ─── Save Max Advance Days ───
  const handleSaveMaxAdvanceDays = async () => {
    const days = parseInt(maxAdvanceDays);
    if (isNaN(days) || days < 1 || days > 365) { toast.error('Enter a value between 1 and 365'); return; }
    setSaving(true);
    try {
      await updateDoc(doc(db, 'labs', labId), { maxAdvanceBookingDays: days, updatedAt: serverTimestamp() });
      toast.success(`Max advance booking set to ${days} days`);
    } catch (err) {
      console.error(err);
      toast.error('Failed to save');
    } finally { setSaving(false); }
  };

  // ─── Save Planned Off ───
  const handlePlannedOffSave = async () => {
    if (!startDate || !endDate) { toast.error('Select both start and end date'); return; }
    if (endDate < startDate) { toast.error('End date must be after start date'); return; }
    setSaving(true);
    try {
      const newPeriod = { id: Date.now().toString(), startDate, endDate, status: 'active' as const };
      const updated = [...plannedOffPeriods, newPeriod];
      await updateDoc(doc(db, 'labs', labId), {
        plannedOffPeriods: updated,
        updatedAt: serverTimestamp(),
      });
      setPlannedOffPeriods(updated);
      setStartDate('');
      setEndDate('');
      toast.success('Planned off period saved');
    } catch (err) {
      console.error(err);
      toast.error('Failed to save');
    } finally { setSaving(false); }
  };

  // ─── Deactivate Planned Off ───
  const handleDeactivatePlannedOff = async (periodId: string) => {
    setSaving(true);
    try {
      const updated = plannedOffPeriods.map(p => p.id === periodId ? { ...p, status: 'deactivated' } : p);
      await updateDoc(doc(db, 'labs', labId), { plannedOffPeriods: updated, updatedAt: serverTimestamp() });
      setPlannedOffPeriods(updated);
      if (!updated.some(p => p.status === 'active')) setPlannedOffEnabled(false);
      toast.success('Planned off deactivated');
    } catch (err) {
      console.error(err);
      toast.error('Failed to deactivate');
    } finally { setSaving(false); }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6 px-1">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-white flex items-center gap-2">
            <Calendar className="w-5 h-5 text-purple-400" />
            Collection Schedule
          </h2>
          <p className="text-gray-400 text-sm mt-1">Set up sample collection time slots for patients</p>
        </div>
        <Button onClick={openAdd} className="bg-purple-500 hover:bg-purple-600 gap-2">
          <Plus className="w-4 h-4" /> Add Slot
        </Button>
      </div>

      {/* ═══ Global Settings ═══ */}
      <div>
        <h3 className="text-white font-medium mb-4">Global Settings</h3>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

          {/* LEFT CARD — Planned Off */}
          <Card className="bg-zinc-900/80 border-zinc-800 p-5">
            <div className="flex items-start justify-between mb-2">
              <h4 className="text-white font-medium">Planned Off</h4>
            </div>
            <p className="text-gray-400 text-sm mb-4">
              {hasActivePeriods
                ? 'You have active planned off periods. Patients cannot book during these dates.'
                : 'Temporarily close bookings during vacations or maintenance.'}
            </p>

            <div className="space-y-3">
              {/* Status */}
              {hasActivePeriods ? (
                <div className="py-2.5 px-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-red-500" />
                    <span className="text-red-400 text-sm">Bookings Blocked — {plannedOffPeriods.filter(p => p.status === 'active').length} Active Period{plannedOffPeriods.filter(p => p.status === 'active').length > 1 ? 's' : ''}</span>
                  </div>
                </div>
              ) : (
                <div className="py-2.5 px-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-500" />
                    <span className="text-green-400 text-sm">Active — Accepting Bookings</span>
                  </div>
                </div>
              )}

              {/* Active periods list */}
              {plannedOffPeriods.filter(p => p.status === 'active').map(p => (
                <div key={p.id} className="flex items-center justify-between bg-zinc-800 rounded-lg px-3 py-2">
                  <div>
                    <p className="text-white text-sm">{p.startDate} → {p.endDate}</p>
                  </div>
                  <button
                    onClick={() => handleDeactivatePlannedOff(p.id)}
                    className="text-xs px-2 py-1 rounded bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20"
                  >
                    Deactivate
                  </button>
                </div>
              ))}

              {/* Enable toggle */}
              {!plannedOffEnabled && (
                <div className="flex items-center justify-between py-2.5 px-3 bg-zinc-800/50 rounded-lg">
                  <Label className="text-gray-300 text-sm cursor-pointer">Enable Planned Off</Label>
                  <button
                    onClick={() => setPlannedOffEnabled(true)}
                    className="px-3 py-1.5 rounded-lg text-xs bg-purple-500/10 text-purple-300 border border-purple-500/30 hover:bg-purple-500/20"
                  >
                    Enable
                  </button>
                </div>
              )}

              {/* Date selection */}
              {plannedOffEnabled && (
                <div className="space-y-3 pt-1">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-gray-400 text-xs">Start Date</Label>
                      <Input
                        type="date"
                        value={startDate}
                        onChange={e => setStartDate(e.target.value)}
                        min={new Date(Date.now() + 86400000).toISOString().split('T')[0]}
                        className="bg-black border-zinc-700 text-white mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-gray-400 text-xs">End Date</Label>
                      <Input
                        type="date"
                        value={endDate}
                        onChange={e => setEndDate(e.target.value)}
                        min={startDate || new Date(Date.now() + 86400000).toISOString().split('T')[0]}
                        className="bg-black border-zinc-700 text-white mt-1"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2 justify-end">
                    <Button variant="ghost" onClick={() => { setPlannedOffEnabled(false); setStartDate(''); setEndDate(''); }} className="text-gray-400 text-sm">
                      Cancel
                    </Button>
                    <Button onClick={handlePlannedOffSave} disabled={saving} className="bg-purple-500 hover:bg-purple-600 text-sm">
                      {saving ? 'Saving...' : 'Save'}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </Card>

          {/* RIGHT CARD — Max Advance Booking Days */}
          <Card className="bg-zinc-900/80 border-zinc-800 p-5">
            <h4 className="text-white font-medium mb-2">Maximum Advance Booking Days</h4>
            <p className="text-gray-400 text-sm mb-4">
              Set how far in advance patients can book. For example, 30 days means patients see only the next 30 days.
            </p>

            <div className="space-y-3">
              <div>
                <Label className="text-gray-400 text-xs">Maximum Days</Label>
                <div className="flex items-center gap-3 mt-1">
                  <Input
                    type="number"
                    value={maxAdvanceDays}
                    onChange={e => setMaxAdvanceDays(e.target.value)}
                    className="bg-black border-zinc-700 text-white flex-1"
                    min="1"
                    max="365"
                  />
                  <span className="text-gray-400 text-sm">days</span>
                </div>
              </div>

              <div className="flex items-start gap-2 py-2.5 px-3 bg-purple-500/10 border border-purple-500/20 rounded-lg">
                <Info className="w-4 h-4 text-purple-400 mt-0.5 flex-shrink-0" />
                <p className="text-purple-300 text-sm">
                  Patients will see available slots only within the next {maxAdvanceDays} days.
                </p>
              </div>

              <div className="flex justify-end">
                <Button onClick={handleSaveMaxAdvanceDays} disabled={saving} className="bg-purple-500 hover:bg-purple-600 text-sm">
                  {saving ? 'Saving...' : 'Save'}
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {[
          { label: 'Total Slots', value: slots.length, icon: Clock },
          { label: 'Active', value: slots.filter((s) => s.isActive).length, icon: ToggleRight },
          { label: 'Walk-in', value: slots.filter((s) => s.slotType === 'walk-in').length, icon: FlaskConical },
        ].map((s) => (
          <Card key={s.label} className="bg-zinc-900/80 border-zinc-800 rounded-xl">
            <CardContent className="py-5 px-5 flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center flex-shrink-0">
                <s.icon className="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <p className="text-gray-400 text-xs">{s.label}</p>
                <p className="text-2xl font-bold text-white">{s.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Slot List */}
      {slots.length === 0 ? (
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Calendar className="w-12 h-12 text-purple-500/30 mb-4" />
            <h3 className="text-white text-lg font-semibold mb-2">No schedule slots yet</h3>
            <p className="text-gray-500 text-sm mb-4">Set up your first collection time slot</p>
            <Button onClick={openAdd} className="bg-purple-500 hover:bg-purple-600 gap-2">
              <Plus className="w-4 h-4" /> Add Slot
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {slots.map((slot) => (
            <Card key={slot.id} className={`bg-zinc-900/80 border-zinc-800 rounded-xl ${!slot.isActive ? 'opacity-60' : ''}`}>
              <CardContent className="py-5 px-6">
                <div className="flex flex-col md:flex-row md:items-center gap-4">
                  {/* Info */}
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-white font-semibold">{slot.slotName}</h3>
                      <Badge className={`text-[10px] px-2 py-0 ${
                        slot.slotType === 'walk-in'
                          ? 'bg-purple-500/20 text-purple-300'
                          : 'bg-blue-500/20 text-blue-300'
                      }`}>
                        {slot.slotType === 'walk-in' ? 'Walk-in' : 'Home Collection'}
                      </Badge>
                    </div>

                    {/* Days */}
                    <div className="flex gap-1 flex-wrap">
                      {DAYS.map((day, i) => (
                        <span
                          key={day}
                          className={`text-[10px] px-1.5 py-0.5 rounded ${
                            slot.days.includes(day)
                              ? 'bg-purple-500/20 text-purple-300'
                              : 'bg-zinc-800 text-gray-600'
                          }`}
                        >
                          {DAY_SHORT[i]}
                        </span>
                      ))}
                    </div>

                    {/* Time + Details */}
                    <div className="flex flex-wrap gap-3 text-sm text-gray-400">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {slot.startTime} – {slot.endTime}
                      </span>
                      <span>
                        {slot.slotDuration} min slots · {computeSlotCount(slot.startTime, slot.endTime, slot.slotDuration)} bookings/day
                      </span>
                      <span>Max {slot.maxCapacity}</span>
                    </div>

                    {slot.branchName && (
                      <p className="text-gray-500 text-xs flex items-center gap-1">
                        <MapPin className="w-3 h-3" /> {slot.branchName}
                      </p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => toggleActive(slot.id)}
                      className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                        slot.isActive
                          ? 'bg-green-500/10 text-green-400 border-green-500/30 hover:bg-green-500/20'
                          : 'bg-red-500/10 text-red-400 border-red-500/30 hover:bg-red-500/20'
                      }`}
                    >
                      {slot.isActive ? 'Active' : 'Paused'}
                    </button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openEdit(slot)}
                      className="text-purple-400 hover:bg-purple-500/10 w-8 h-8"
                    >
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(slot.id)}
                      className="text-red-400 hover:bg-red-500/10 w-8 h-8"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={resetForm}>
          <div
            className="bg-zinc-900 border border-zinc-700 rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-5 border-b border-zinc-800">
              <h3 className="text-white font-semibold text-lg">
                {editingSlot ? 'Edit Slot' : 'Add Collection Slot'}
              </h3>
              <button onClick={resetForm} className="text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {/* Slot Name */}
              <div>
                <Label className="text-gray-400 text-sm">Slot Name *</Label>
                <Input
                  value={form.slotName}
                  onChange={(e) => setForm({ ...form, slotName: e.target.value })}
                  placeholder="e.g. Morning Collection, Evening Slot"
                  className="bg-black border-zinc-700 text-white mt-1"
                />
              </div>

              {/* Slot Type */}
              <div>
                <Label className="text-gray-400 text-sm">Collection Type</Label>
                <div className="flex gap-3 mt-2">
                  {[
                    { value: 'walk-in', label: 'Walk-in', icon: FlaskConical },
                    { value: 'home-collection', label: 'Home Collection', icon: Home },
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => setForm({ ...form, slotType: opt.value as any })}
                      className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border text-sm transition-colors ${
                        form.slotType === opt.value
                          ? 'border-purple-500 bg-purple-500/10 text-purple-300'
                          : 'border-zinc-700 text-gray-400 hover:border-zinc-600'
                      }`}
                    >
                      <opt.icon className="w-4 h-4" />
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Days */}
              <div>
                <Label className="text-gray-400 text-sm">Days *</Label>
                <div className="flex gap-2 mt-2 flex-wrap">
                  {DAYS.map((day, i) => (
                    <button
                      key={day}
                      onClick={() => toggleDay(day)}
                      className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${
                        form.days.includes(day)
                          ? 'border-purple-500 bg-purple-500/20 text-purple-300'
                          : 'border-zinc-700 text-gray-400 hover:border-zinc-600'
                      }`}
                    >
                      {DAY_SHORT[i]}
                    </button>
                  ))}
                  <button
                    onClick={() => setForm({ ...form, days: form.days.length === 7 ? [] : [...DAYS] })}
                    className="px-3 py-1.5 rounded-lg text-xs border border-zinc-700 text-gray-500 hover:text-gray-300 hover:border-zinc-600"
                  >
                    {form.days.length === 7 ? 'Clear all' : 'All days'}
                  </button>
                </div>
              </div>

              {/* Time */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-gray-400 text-sm">Start Time</Label>
                  <Input
                    type="time"
                    value={form.startTime}
                    onChange={(e) => setForm({ ...form, startTime: e.target.value })}
                    className="bg-black border-zinc-700 text-white mt-1"
                  />
                </div>
                <div>
                  <Label className="text-gray-400 text-sm">End Time</Label>
                  <Input
                    type="time"
                    value={form.endTime}
                    onChange={(e) => setForm({ ...form, endTime: e.target.value })}
                    className="bg-black border-zinc-700 text-white mt-1"
                  />
                </div>
              </div>

              {/* Duration + Capacity */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-gray-400 text-sm">Slot Duration</Label>
                  <select
                    value={form.slotDuration}
                    onChange={(e) => setForm({ ...form, slotDuration: Number(e.target.value) })}
                    className="w-full bg-black border border-zinc-700 text-white rounded-lg px-3 h-10 text-sm mt-1"
                  >
                    {DURATIONS.map((d) => (
                      <option key={d} value={d}>{d} minutes</option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label className="text-gray-400 text-sm">Max Bookings/Day</Label>
                  <Input
                    type="number"
                    value={form.maxCapacity}
                    onChange={(e) => setForm({ ...form, maxCapacity: Number(e.target.value) })}
                    className="bg-black border-zinc-700 text-white mt-1"
                    min={1}
                    max={200}
                  />
                </div>
              </div>

              {/* Computed info */}
              {form.startTime && form.endTime && form.startTime < form.endTime && (
                <div className="bg-purple-500/10 border border-purple-500/20 rounded-lg p-3">
                  <p className="text-purple-300 text-sm">
                    {computeSlotCount(form.startTime, form.endTime, form.slotDuration)} time slots available per day
                    ({form.startTime} – {form.endTime}, {form.slotDuration} min each)
                  </p>
                </div>
              )}

              {/* Branch */}
              <div>
                <Label className="text-gray-400 text-sm">Branch / Location</Label>
                {branches.length > 0 ? (
                  <select
                    value={form.branchName}
                    onChange={(e) => {
                      const branch = branches.find((b) => b.name === e.target.value);
                      setForm({
                        ...form,
                        branchName: e.target.value,
                        branchAddress: branch?.address || '',
                      });
                    }}
                    className="w-full bg-black border border-zinc-700 text-white rounded-lg px-3 h-10 text-sm mt-1"
                  >
                    <option value="">Main Lab</option>
                    {branches.map((b) => (
                      <option key={b.name} value={b.name}>{b.name}</option>
                    ))}
                  </select>
                ) : (
                  <Input
                    value={form.branchName}
                    onChange={(e) => setForm({ ...form, branchName: e.target.value })}
                    placeholder="Optional — branch name"
                    className="bg-black border-zinc-700 text-white mt-1"
                  />
                )}
              </div>

              {/* Active toggle */}
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                  className="w-4 h-4 accent-purple-500"
                />
                <span className="text-gray-300 text-sm">Active (accepting bookings)</span>
              </label>
            </div>

            <div className="flex gap-3 p-5 border-t border-zinc-800">
              <Button variant="ghost" onClick={resetForm} className="flex-1 text-gray-400">
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 bg-purple-500 hover:bg-purple-600"
              >
                {saving ? 'Saving...' : editingSlot ? 'Update Slot' : 'Add Slot'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
