import { useEffect, useMemo, useState } from 'react';
import { db } from '../lib/firebase/config';
import {
  addDoc, collection, deleteDoc, doc, getDocs, onSnapshot, query, serverTimestamp, where,
} from 'firebase/firestore';
import { toast } from 'sonner';
import { Calendar, ChevronLeft, ChevronRight, Loader2, Plus, Trash2, IndianRupee, Users } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';

interface ParamedicalMonthlyPlannerProps {
  paraId: string;
}

interface DayNote {
  id: string;
  date: string; // YYYY-MM-DD
  text: string;
}

export default function ParamedicalMonthlyPlanner({ paraId }: ParamedicalMonthlyPlannerProps) {
  const [cursor, setCursor] = useState(() => {
    const d = new Date(); d.setDate(1); return d;
  });
  const [bookings, setBookings] = useState<any[]>([]);
  const [notes, setNotes] = useState<DayNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [newNote, setNewNote] = useState('');

  const colNotes = `paramedicals/${paraId}/plannerNotes`;
  const ymKey = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}`;

  useEffect(() => {
    if (!paraId) return;
    setLoading(true);
    (async () => {
      try {
        const start = `${ymKey}-01`;
        const endDate = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0);
        const end = `${ymKey}-${String(endDate.getDate()).padStart(2, '0')}`;
        const snap = await getDocs(query(
          collection(db, 'paramedicalBookings'),
          where('paramedicalId', '==', paraId),
        ));
        setBookings(snap.docs
          .map(d => ({ id: d.id, ...(d.data() as any) }))
          .filter(b => b.appointmentDate >= start && b.appointmentDate <= end));
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    })();
  }, [paraId, ymKey]);

  useEffect(() => {
    if (!paraId) return;
    const unsub = onSnapshot(collection(db, colNotes), (snap) => {
      setNotes(snap.docs.map(d => ({ id: d.id, ...(d.data() as any) })));
    }, () => {});
    return () => unsub();
  }, [paraId, colNotes]);

  const daysInMonth = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate();
  const firstWeekday = new Date(cursor.getFullYear(), cursor.getMonth(), 1).getDay();

  const dayStats = useMemo(() => {
    const map: Record<string, { count: number; revenue: number; completed: number }> = {};
    bookings.forEach(b => {
      const d = b.appointmentDate;
      if (!d) return;
      if (!map[d]) map[d] = { count: 0, revenue: 0, completed: 0 };
      map[d].count += 1;
      if (b.status === 'completed') {
        map[d].completed += 1;
        map[d].revenue += Number(b.amount || 0);
      }
    });
    return map;
  }, [bookings]);

  const monthTotals = useMemo(() => {
    const total = bookings.length;
    const completed = bookings.filter(b => b.status === 'completed').length;
    const revenue = bookings.filter(b => b.status === 'completed').reduce((s, b) => s + Number(b.amount || 0), 0);
    const uniquePatients = new Set(bookings.map(b => (b.patientPhone || '').replace(/\D/g, '').slice(-10))).size;
    return { total, completed, revenue, uniquePatients };
  }, [bookings]);

  const monthNotes = notes.filter(n => n.date.startsWith(ymKey));

  const prevMonth = () => setCursor(c => new Date(c.getFullYear(), c.getMonth() - 1, 1));
  const nextMonth = () => setCursor(c => new Date(c.getFullYear(), c.getMonth() + 1, 1));
  const today = () => setCursor(() => { const d = new Date(); d.setDate(1); return d; });

  const addNote = async () => {
    if (!newNote.trim() || !selectedDate) return;
    try {
      await addDoc(collection(db, colNotes), {
        date: selectedDate,
        text: newNote.trim(),
        createdAt: serverTimestamp(),
      });
      setNewNote('');
      toast.success('Note added');
    } catch (e: any) { toast.error(e?.message); }
  };

  const removeNote = async (id: string) => {
    try {
      await deleteDoc(doc(db, colNotes, id));
    } catch (e: any) { toast.error(e?.message); }
  };

  const monthLabel = cursor.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
  const cells: (string | null)[] = [];
  for (let i = 0; i < firstWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(`${ymKey}-${String(d).padStart(2, '0')}`);

  return (
    <div className="space-y-6">
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Calendar className="w-6 h-6 text-purple-400" />
          <h3 className="text-white font-semibold text-lg">{monthLabel}</h3>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" className="border-zinc-700 text-white" onClick={prevMonth}><ChevronLeft className="w-4 h-4" /></Button>
          <Button size="sm" variant="outline" className="border-zinc-700 text-white" onClick={today}>Today</Button>
          <Button size="sm" variant="outline" className="border-zinc-700 text-white" onClick={nextMonth}><ChevronRight className="w-4 h-4" /></Button>
        </div>
      </div>

      {/* Month KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KPI label="Total Bookings" value={monthTotals.total} color="text-teal-400" />
        <KPI label="Completed" value={monthTotals.completed} color="text-emerald-400" />
        <KPI label="Revenue" value={`₹${monthTotals.revenue}`} color="text-purple-400" icon={IndianRupee} />
        <KPI label="Unique Patients" value={monthTotals.uniquePatients} color="text-orange-400" icon={Users} />
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64 text-gray-400"><Loader2 className="w-6 h-6 animate-spin mr-2" /> Loading…</div>
      ) : (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3 md:p-5">
          <div className="grid grid-cols-7 gap-1 mb-2 text-center text-xs text-gray-500">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => <div key={d}>{d}</div>)}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {cells.map((date, idx) => {
              if (!date) return <div key={idx} className="aspect-square bg-transparent" />;
              const stat = dayStats[date];
              const hasNotes = notes.some(n => n.date === date);
              const isSelected = selectedDate === date;
              const todayStr = new Date().toISOString().slice(0, 10);
              const isToday = date === todayStr;
              return (
                <button
                  key={date}
                  onClick={() => setSelectedDate(date)}
                  className={`aspect-square rounded-lg p-1 md:p-2 text-left transition-colors border ${
                    isSelected ? 'bg-purple-600/30 border-purple-500' :
                    isToday ? 'bg-teal-500/10 border-teal-500/40' :
                    'bg-zinc-800/40 border-zinc-800 hover:border-zinc-700'
                  }`}
                >
                  <div className="text-xs text-gray-400">{Number(date.slice(-2))}</div>
                  {stat && (
                    <div className="mt-1 space-y-0.5">
                      <p className="text-[10px] text-teal-400 font-bold">{stat.count}b</p>
                      {stat.revenue > 0 && <p className="text-[10px] text-emerald-400">₹{stat.revenue}</p>}
                    </div>
                  )}
                  {hasNotes && <div className="mt-1 w-1.5 h-1.5 rounded-full bg-orange-400" />}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Selected day */}
      {selectedDate && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 space-y-3">
          <p className="text-white font-semibold">{new Date(selectedDate).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
          {dayStats[selectedDate] && (
            <p className="text-gray-400 text-sm">{dayStats[selectedDate].count} booking(s) • ₹{dayStats[selectedDate].revenue} revenue</p>
          )}
          <div className="space-y-2">
            {notes.filter(n => n.date === selectedDate).map(n => (
              <div key={n.id} className="flex items-start justify-between bg-zinc-800/40 rounded-lg p-2">
                <p className="text-gray-300 text-sm flex-1">{n.text}</p>
                <button onClick={() => removeNote(n.id)} className="text-red-400 hover:text-red-300"><Trash2 className="w-4 h-4" /></button>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <Input value={newNote} onChange={e => setNewNote(e.target.value)} placeholder="Add a note / task / route plan…"
              className="bg-black border-zinc-800 text-white" onKeyDown={e => e.key === 'Enter' && addNote()} />
            <Button onClick={addNote} className="bg-teal-600 hover:bg-teal-700"><Plus className="w-4 h-4" /></Button>
          </div>
        </div>
      )}

      {!selectedDate && monthNotes.length > 0 && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
          <p className="text-gray-400 text-xs mb-3">NOTES THIS MONTH</p>
          <div className="space-y-1">
            {monthNotes.map(n => (
              <div key={n.id} className="flex items-center justify-between text-sm py-1 border-b border-zinc-800/50 last:border-0">
                <span className="text-gray-300"><span className="text-orange-400 mr-2">{n.date.slice(-2)}</span> {n.text}</span>
                <button onClick={() => removeNote(n.id)} className="text-red-400 hover:text-red-300"><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function KPI({ label, value, color, icon: Icon }: any) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
      <div className="flex items-center gap-2 mb-1">
        {Icon && <Icon className={`w-4 h-4 ${color}`} />}
        <p className="text-gray-400 text-xs">{label}</p>
      </div>
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
    </div>
  );
}
