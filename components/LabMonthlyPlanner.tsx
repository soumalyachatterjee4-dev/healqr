import { useState, useEffect, useMemo } from 'react';
import {
  CalendarPlus, ChevronLeft, ChevronRight, Trash2, IndianRupee, ClipboardList, Sparkles,
} from 'lucide-react';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { db } from '../lib/firebase/config';
import {
  collection, query, where, getDocs, addDoc, deleteDoc, doc, serverTimestamp,
} from 'firebase/firestore';
import { toast } from 'sonner';

interface LabMonthlyPlannerProps {
  labId: string;
  labName?: string;
}

interface PlannerNote {
  id: string;
  date: string;
  text: string;
  type: 'task' | 'event' | 'reminder';
}

interface DayStats {
  bookings: number;
  revenue: number;
  homeCollections: number;
}

const TYPE_COLORS = {
  task: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
  event: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
  reminder: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
};
const TYPE_ICON = { task: '📋', event: '📅', reminder: '⏰' };

function isoOf(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

export default function LabMonthlyPlanner({ labId }: LabMonthlyPlannerProps) {
  const [cursor, setCursor] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const [bookingsByDay, setBookingsByDay] = useState<Map<string, DayStats>>(new Map());
  const [notes, setNotes] = useState<PlannerNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [noteText, setNoteText] = useState('');
  const [noteType, setNoteType] = useState<PlannerNote['type']>('task');

  const colNotes = `labs/${labId}/plannerNotes`;
  const monthLabel = cursor.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });

  useEffect(() => {
    if (!labId) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [labId, cursor]);

  const load = async () => {
    setLoading(true);
    try {
      const start = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
      const end = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0);
      const startISO = isoOf(start);
      const endISO = isoOf(end);

      const [bSnap, nSnap] = await Promise.all([
        getDocs(query(collection(db, 'labBookings'), where('labId', '==', labId),
          where('bookingDate', '>=', startISO), where('bookingDate', '<=', endISO))),
        getDocs(query(collection(db, colNotes),
          where('date', '>=', startISO), where('date', '<=', endISO))),
      ]);

      const map = new Map<string, DayStats>();
      bSnap.docs.forEach(d => {
        const data: any = d.data();
        if (data.isCancelled || data.status === 'cancelled') return;
        const k = data.bookingDate;
        if (!k) return;
        const cur = map.get(k) || { bookings: 0, revenue: 0, homeCollections: 0 };
        cur.bookings += 1;
        cur.revenue += Number(data.paymentDetails?.discountedPrice ?? data.totalAmount ?? 0);
        if (data.collectionType === 'home-collection') cur.homeCollections += 1;
        map.set(k, cur);
      });

      const ns: PlannerNote[] = nSnap.docs.map(d => ({ id: d.id, ...(d.data() as any) }));
      ns.sort((a, b) => a.date.localeCompare(b.date));

      setBookingsByDay(map);
      setNotes(ns);
    } catch (err) {
      console.error('[LabMonthlyPlanner] load:', err);
    } finally {
      setLoading(false);
    }
  };

  const calendar = useMemo(() => {
    const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    const start = new Date(first);
    const dow = first.getDay() || 7;
    start.setDate(first.getDate() - (dow - 1));
    const days: { iso: string; inMonth: boolean; date: Date }[] = [];
    const c = new Date(start);
    for (let i = 0; i < 42; i++) {
      days.push({ iso: isoOf(c), inMonth: c.getMonth() === cursor.getMonth(), date: new Date(c) });
      c.setDate(c.getDate() + 1);
    }
    return days;
  }, [cursor]);

  const monthTotals = useMemo(() => {
    let bookings = 0, revenue = 0, home = 0;
    bookingsByDay.forEach(v => { bookings += v.bookings; revenue += v.revenue; home += v.homeCollections; });
    return { bookings, revenue, home, notes: notes.length };
  }, [bookingsByDay, notes]);

  const submitNote = async () => {
    if (!selectedDay || !noteText.trim()) return;
    try {
      const ref = await addDoc(collection(db, colNotes), {
        date: selectedDay,
        text: noteText.trim(),
        type: noteType,
        createdAt: serverTimestamp(),
      });
      setNotes(prev => [...prev, { id: ref.id, date: selectedDay, text: noteText.trim(), type: noteType }]);
      setNoteText('');
      toast.success('Note added');
    } catch (err) {
      console.error(err);
      toast.error('Save failed');
    }
  };

  const removeNote = async (id: string) => {
    try {
      await deleteDoc(doc(db, colNotes, id));
      setNotes(prev => prev.filter(n => n.id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  const todayISO = isoOf(new Date());
  const dayNotes = (iso: string) => notes.filter(n => n.date === iso);
  const selectedDayNotes = selectedDay ? dayNotes(selectedDay) : [];
  const selectedDayStats = selectedDay ? bookingsByDay.get(selectedDay) : undefined;

  return (
    <div className="space-y-6">
      <Card className="bg-zinc-900 border-zinc-800">
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h2 className="text-white text-2xl font-bold flex items-center gap-2">
                <CalendarPlus className="w-6 h-6 text-indigo-500" /> Monthly Planner
              </h2>
              <p className="text-gray-400 text-sm mt-1">Bookings, revenue, tasks &amp; reminders by day</p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" className="border-zinc-700 text-gray-300"
                onClick={() => setCursor(c => new Date(c.getFullYear(), c.getMonth() - 1, 1))}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="text-white text-sm font-semibold w-[160px] text-center">{monthLabel}</span>
              <Button variant="outline" className="border-zinc-700 text-gray-300"
                onClick={() => setCursor(c => new Date(c.getFullYear(), c.getMonth() + 1, 1))}>
                <ChevronRight className="w-4 h-4" />
              </Button>
              <Button variant="outline" className="border-zinc-700 text-gray-300"
                onClick={() => setCursor(new Date(new Date().getFullYear(), new Date().getMonth(), 1))}>
                Today
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Bookings', value: monthTotals.bookings, color: 'text-blue-400' },
          { label: 'Revenue', value: `₹${monthTotals.revenue.toLocaleString()}`, color: 'text-emerald-400' },
          { label: 'Home Visits', value: monthTotals.home, color: 'text-violet-400' },
          { label: 'Tasks/Events', value: monthTotals.notes, color: 'text-amber-400' },
        ].map((k, i) => (
          <Card key={i} className="bg-zinc-900 border-zinc-800">
            <CardContent className="pt-6">
              <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{k.label}</span>
              <div className={`text-2xl font-bold mt-2 ${k.color}`}>{loading ? '…' : k.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <Card className="bg-zinc-900 border-zinc-800 lg:col-span-3">
          <CardContent className="pt-6">
            <div className="grid grid-cols-7 gap-1 text-center mb-2">
              {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => (
                <div key={d} className="text-[10px] text-gray-400 font-bold uppercase tracking-widest py-1">{d}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {calendar.map((d, i) => {
                const stats = bookingsByDay.get(d.iso);
                const dn = dayNotes(d.iso);
                const isSelected = selectedDay === d.iso;
                const isToday = d.iso === todayISO;
                return (
                  <button key={i}
                    onClick={() => setSelectedDay(d.iso)}
                    className={`min-h-[88px] p-2 rounded-lg border text-left transition ${
                      isSelected ? 'border-indigo-500 bg-indigo-500/10' :
                      isToday ? 'border-emerald-500/40 bg-emerald-500/5' :
                      d.inMonth ? 'border-zinc-800 hover:border-zinc-700 bg-zinc-950' : 'border-zinc-900 bg-zinc-950/40 opacity-50'
                    }`}>
                    <div className="flex items-start justify-between">
                      <span className={`text-xs font-bold ${isToday ? 'text-emerald-300' : d.inMonth ? 'text-white' : 'text-gray-600'}`}>
                        {d.date.getDate()}
                      </span>
                      {isToday && <span className="text-[8px] font-bold bg-emerald-500/20 text-emerald-300 px-1 rounded">TODAY</span>}
                    </div>
                    {stats && (
                      <div className="mt-1 space-y-0.5">
                        <div className="text-[10px] text-blue-300">{stats.bookings} 📋</div>
                        {stats.revenue > 0 && <div className="text-[10px] text-emerald-400">₹{stats.revenue >= 1000 ? `${(stats.revenue / 1000).toFixed(1)}k` : stats.revenue}</div>}
                      </div>
                    )}
                    {dn.length > 0 && (
                      <div className="mt-1 flex gap-0.5 flex-wrap">
                        {dn.slice(0, 3).map(n => (
                          <span key={n.id} className="text-[9px]" title={n.text}>{TYPE_ICON[n.type]}</span>
                        ))}
                        {dn.length > 3 && <span className="text-[9px] text-gray-500">+{dn.length - 3}</span>}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900 border-zinc-800 lg:col-span-1">
          <CardContent className="pt-6">
            {!selectedDay ? (
              <div className="text-gray-500 text-sm py-10 text-center">
                <Sparkles className="w-6 h-6 mx-auto mb-2 text-indigo-500" />
                Click a day to view details &amp; add notes.
              </div>
            ) : (
              <>
                <p className="text-white font-bold text-base">
                  {new Date(selectedDay).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short' })}
                </p>
                {selectedDayStats && (
                  <div className="mt-3 space-y-1.5 text-xs">
                    <p className="text-blue-300 flex items-center gap-1"><ClipboardList className="w-3 h-3" /> {selectedDayStats.bookings} bookings</p>
                    <p className="text-emerald-400 flex items-center gap-1"><IndianRupee className="w-3 h-3" /> ₹{selectedDayStats.revenue.toLocaleString()}</p>
                    {selectedDayStats.homeCollections > 0 && <p className="text-violet-300">🏠 {selectedDayStats.homeCollections} home visits</p>}
                  </div>
                )}

                <div className="mt-4 pt-4 border-t border-zinc-800">
                  <p className="text-[11px] text-gray-400 uppercase tracking-wider font-semibold mb-2">Notes &amp; Tasks</p>
                  <div className="space-y-1.5 max-h-[200px] overflow-y-auto">
                    {selectedDayNotes.length === 0 ? (
                      <p className="text-gray-500 text-xs italic">No notes yet.</p>
                    ) : selectedDayNotes.map(n => (
                      <div key={n.id} className={`px-2 py-1.5 rounded-lg border text-xs flex items-start gap-2 ${TYPE_COLORS[n.type]}`}>
                        <span>{TYPE_ICON[n.type]}</span>
                        <span className="flex-1 break-words">{n.text}</span>
                        <button onClick={() => removeNote(n.id)} className="text-gray-400 hover:text-red-400 shrink-0">
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 space-y-2">
                    <div className="flex gap-1">
                      {(['task', 'event', 'reminder'] as const).map(t => (
                        <button key={t} onClick={() => setNoteType(t)}
                          className={`flex-1 text-[10px] py-1 rounded border font-semibold transition ${noteType === t ? TYPE_COLORS[t] : 'border-zinc-800 text-gray-500'}`}>
                          {TYPE_ICON[t]} {t}
                        </button>
                      ))}
                    </div>
                    <Input value={noteText} onChange={(e) => setNoteText(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') submitNote(); }}
                      placeholder="Add a note for this day"
                      className="bg-zinc-950 border-zinc-800 text-white text-xs h-8" />
                    <Button size="sm" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white text-xs h-8" onClick={submitNote} disabled={!noteText.trim()}>
                      Add Note
                    </Button>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
