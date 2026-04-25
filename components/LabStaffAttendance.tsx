import { useState, useEffect, useMemo } from 'react';
import {
  UserCheck, Plus, Check, X, Trash2, Calendar, Users, Clock, LogIn, LogOut as LogOutIcon,
} from 'lucide-react';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { db } from '../lib/firebase/config';
import {
  collection, doc, addDoc, deleteDoc, updateDoc, getDocs, query, where, serverTimestamp, setDoc,
} from 'firebase/firestore';
import { toast } from 'sonner';

interface LabStaffAttendanceProps {
  labId: string;
  labName?: string;
}

interface StaffMember {
  id: string;
  name: string;
  role: string;
  phone: string;
  branchName: string;
}

interface AttendanceRow {
  id: string; // doc id = staffId_date
  staffId: string;
  date: string;
  inTime?: string;
  outTime?: string;
  status: 'present' | 'absent' | 'leave';
  note?: string;
}

const ROLES = ['Lab Technician', 'Receptionist', 'Phlebotomist', 'Manager', 'Admin', 'Other'];

export default function LabStaffAttendance({ labId }: LabStaffAttendanceProps) {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: '', role: 'Lab Technician', phone: '', branchName: '' });

  useEffect(() => { if (labId) loadStaff(); }, [labId]);
  useEffect(() => { if (labId) loadAttendance(); }, [labId, date]);

  const colStaff = `labs/${labId}/staff`;
  const colAttendance = `labs/${labId}/attendance`;

  const loadStaff = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, colStaff));
      const list = snap.docs.map(d => ({ id: d.id, ...(d.data() as any) })) as StaffMember[];
      list.sort((a, b) => a.name.localeCompare(b.name));
      setStaff(list);
    } catch (err) {
      console.error('[LabStaffAttendance] loadStaff:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadAttendance = async () => {
    try {
      const snap = await getDocs(query(collection(db, colAttendance), where('date', '==', date)));
      setAttendance(snap.docs.map(d => ({ id: d.id, ...(d.data() as any) })));
    } catch (err) {
      console.error('[LabStaffAttendance] loadAttendance:', err);
    }
  };

  const submitStaff = async () => {
    if (!form.name.trim()) { toast.error('Name required'); return; }
    try {
      await addDoc(collection(db, colStaff), {
        name: form.name.trim(),
        role: form.role,
        phone: form.phone.trim(),
        branchName: form.branchName.trim(),
        createdAt: serverTimestamp(),
      });
      toast.success('Staff added');
      setShowAdd(false);
      setForm({ name: '', role: 'Lab Technician', phone: '', branchName: '' });
      loadStaff();
    } catch (err) {
      console.error(err);
      toast.error('Save failed');
    }
  };

  const removeStaff = async (s: StaffMember) => {
    if (!confirm(`Remove ${s.name}?`)) return;
    try {
      await deleteDoc(doc(db, colStaff, s.id));
      toast.success('Staff removed');
      loadStaff();
    } catch (err) {
      console.error(err);
      toast.error('Delete failed');
    }
  };

  const updateAttendance = async (s: StaffMember, patch: Partial<AttendanceRow>) => {
    const docId = `${s.id}_${date}`;
    const ref = doc(db, colAttendance, docId);
    const existing = attendance.find(a => a.id === docId);
    const merged: AttendanceRow = {
      id: docId,
      staffId: s.id,
      date,
      status: 'present',
      ...existing,
      ...patch,
    };
    try {
      await setDoc(ref, {
        staffId: s.id,
        date,
        status: merged.status,
        inTime: merged.inTime || '',
        outTime: merged.outTime || '',
        note: merged.note || '',
        updatedAt: serverTimestamp(),
      });
      setAttendance(prev => {
        const others = prev.filter(a => a.id !== docId);
        return [...others, merged];
      });
    } catch (err) {
      console.error(err);
      toast.error('Save failed');
    }
  };

  const checkIn = (s: StaffMember) => {
    const t = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false });
    updateAttendance(s, { inTime: t, status: 'present' });
    toast.success(`${s.name} checked in at ${t}`);
  };
  const checkOut = (s: StaffMember) => {
    const t = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false });
    updateAttendance(s, { outTime: t });
    toast.success(`${s.name} checked out at ${t}`);
  };
  const markStatus = (s: StaffMember, status: AttendanceRow['status']) => {
    updateAttendance(s, { status });
  };

  const getRow = (s: StaffMember) => attendance.find(a => a.staffId === s.id);

  const totals = useMemo(() => {
    const present = staff.filter(s => getRow(s)?.status === 'present').length;
    const absent = staff.filter(s => getRow(s)?.status === 'absent').length;
    const leave = staff.filter(s => getRow(s)?.status === 'leave').length;
    const unmarked = staff.length - present - absent - leave;
    return { total: staff.length, present, absent, leave, unmarked };
  }, [staff, attendance]);

  return (
    <div className="space-y-6">
      <Card className="bg-zinc-900 border-zinc-800">
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h2 className="text-white text-2xl font-bold flex items-center gap-2">
                <UserCheck className="w-6 h-6 text-emerald-500" /> Staff Attendance
              </h2>
              <p className="text-gray-400 text-sm mt-1">Daily check-in/out, leaves &amp; absences</p>
            </div>
            <div className="flex items-center gap-2">
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
                className="bg-zinc-950 border border-zinc-800 text-white px-3 py-2 rounded text-xs" />
              <Button onClick={() => setShowAdd(true)} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                <Plus className="w-4 h-4 mr-1" /> Add Staff
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          { label: 'Total', value: totals.total, icon: Users, color: 'text-blue-400' },
          { label: 'Present', value: totals.present, icon: Check, color: 'text-emerald-400' },
          { label: 'Absent', value: totals.absent, icon: X, color: 'text-red-400' },
          { label: 'Leave', value: totals.leave, icon: Calendar, color: 'text-amber-400' },
          { label: 'Unmarked', value: totals.unmarked, icon: Clock, color: 'text-gray-400' },
        ].map((k, i) => (
          <Card key={i} className="bg-zinc-900 border-zinc-800">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{k.label}</span>
                <div className={`p-2 rounded-lg bg-zinc-950 ${k.color}`}><k.icon className="w-4 h-4" /></div>
              </div>
              <div className="text-2xl font-bold text-white">{loading ? '…' : k.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="bg-zinc-900 border-zinc-800">
        <CardContent className="pt-6">
          {loading ? (
            <div className="text-gray-500 text-sm py-10 text-center">Loading staff…</div>
          ) : staff.length === 0 ? (
            <div className="text-gray-500 text-sm py-10 text-center">No staff added yet. Click "Add Staff".</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-[11px] text-gray-400 uppercase tracking-wider border-b border-zinc-800">
                    <th className="py-2 font-semibold">Name</th>
                    <th className="py-2 font-semibold">Role</th>
                    <th className="py-2 font-semibold">Branch</th>
                    <th className="py-2 font-semibold">In</th>
                    <th className="py-2 font-semibold">Out</th>
                    <th className="py-2 font-semibold">Status</th>
                    <th className="py-2 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {staff.map(s => {
                    const row = getRow(s);
                    return (
                      <tr key={s.id} className="border-b border-zinc-800/60 last:border-0 hover:bg-zinc-800/30">
                        <td className="py-3 text-white font-medium">{s.name}<span className="text-gray-500 text-xs ml-2">{s.phone}</span></td>
                        <td className="py-3 text-gray-400 text-xs">{s.role}</td>
                        <td className="py-3 text-gray-400 text-xs">{s.branchName || '—'}</td>
                        <td className="py-3 text-blue-300 font-mono text-xs">{row?.inTime || '—'}</td>
                        <td className="py-3 text-violet-300 font-mono text-xs">{row?.outTime || '—'}</td>
                        <td className="py-3">
                          <div className="inline-flex rounded-lg border border-zinc-800 bg-zinc-950 p-0.5">
                            {(['present', 'absent', 'leave'] as const).map(st => (
                              <button key={st} onClick={() => markStatus(s, st)}
                                className={`px-2 py-0.5 text-[10px] font-bold rounded-md transition ${row?.status === st ? (st === 'present' ? 'bg-emerald-500/20 text-emerald-300' : st === 'absent' ? 'bg-red-500/20 text-red-300' : 'bg-amber-500/20 text-amber-300') : 'text-gray-500 hover:text-white'}`}>
                                {st === 'present' ? 'P' : st === 'absent' ? 'A' : 'L'}
                              </button>
                            ))}
                          </div>
                        </td>
                        <td className="py-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button size="sm" variant="outline" className="h-7 text-xs border-emerald-700 text-emerald-300"
                              onClick={() => checkIn(s)}>
                              <LogIn className="w-3 h-3 mr-1" /> In
                            </Button>
                            <Button size="sm" variant="outline" className="h-7 text-xs border-violet-700 text-violet-300"
                              onClick={() => checkOut(s)}>
                              <LogOutIcon className="w-3 h-3 mr-1" /> Out
                            </Button>
                            <Button size="sm" variant="outline" className="h-7 text-xs border-zinc-700 text-red-400"
                              onClick={() => removeStaff(s)}>
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {showAdd && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={() => setShowAdd(false)}>
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-white text-lg font-bold mb-4">Add Staff Member</h3>
            <div className="space-y-3">
              <div>
                <label className="text-[11px] text-gray-400 uppercase tracking-wider font-semibold">Name *</label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="bg-zinc-950 border-zinc-800 text-white mt-1" />
              </div>
              <div>
                <label className="text-[11px] text-gray-400 uppercase tracking-wider font-semibold">Role</label>
                <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}
                  className="w-full bg-zinc-950 border border-zinc-800 text-white rounded px-3 py-2 mt-1 text-sm">
                  {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[11px] text-gray-400 uppercase tracking-wider font-semibold">Phone</label>
                <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="bg-zinc-950 border-zinc-800 text-white mt-1" />
              </div>
              <div>
                <label className="text-[11px] text-gray-400 uppercase tracking-wider font-semibold">Branch (optional)</label>
                <Input value={form.branchName} onChange={(e) => setForm({ ...form, branchName: e.target.value })}
                  className="bg-zinc-950 border-zinc-800 text-white mt-1" />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <Button variant="outline" className="border-zinc-700 text-gray-300" onClick={() => setShowAdd(false)}>Cancel</Button>
              <Button className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={submitStaff}>Add</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
