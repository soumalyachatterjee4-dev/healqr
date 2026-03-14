import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "./ui/dialog";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Trash2,
  Edit2,
  Clock,
  MapPin,
  RefreshCw,
  Menu,
  User,
  Building2
} from 'lucide-react';
import { toast } from 'sonner';
import ClinicSidebar from './ClinicSidebar';

interface PlannerEvent {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  startTime?: string;
  endTime?: string;
  type: 'chamber' | 'clinic-event' | 'holiday' | 'other';
  description?: string;
  location?: string;
  doctorName?: string;
  doctorId?: string;
  chamberId?: string;
  monthKey?: string;
}

interface ClinicMonthlyPlannerProps {
  clinicId?: string;
  onMenuChange?: (menu: string) => void;
  onLogout?: () => void;
  activeAddOns?: string[];
  isSidebarCollapsed?: boolean;
  setIsSidebarCollapsed?: (collapsed: boolean) => void;
}

export default function ClinicMonthlyPlanner({
  clinicId,
  onMenuChange,
  onLogout,
  activeAddOns = [],
  isSidebarCollapsed = false,
  setIsSidebarCollapsed
}: ClinicMonthlyPlannerProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<PlannerEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Add Event State
  const [showAddEventForm, setShowAddEventForm] = useState(false);
  const [newEventData, setNewEventData] = useState({
    title: '',
    type: 'clinic-event',
    startTime: '09:00',
    endTime: '10:00',
    description: ''
  });

  const monthNames = ["January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDayOfMonth = new Date(year, month, 1).getDay();

    const days = [];
    for (let i = 0; i < firstDayOfMonth; i++) days.push(null);
    for (let i = 1; i <= daysInMonth; i++) days.push(new Date(year, month, i));
    return days;
  };

  const fetchMonthEvents = async (date: Date) => {
    try {
      setLoading(true);
      const id = clinicId || localStorage.getItem('userId');
      if (!id) return;

      const year = date.getFullYear();
      const month = date.getMonth() + 1;
      const monthKey = `${year}-${month.toString().padStart(2, '0')}`;

      const { db } = await import('../lib/firebase/config');
      const { collection, query, where, getDocs, doc, getDoc, writeBatch } = await import('firebase/firestore');

      if (!db) return;

      // 1. Check if generated
      const metaRef = doc(db, `doctors/${id}/planner_meta`, monthKey);
      const metaSnap = await getDoc(metaRef);

      if (!metaSnap.exists()) {
        setIsGenerating(true);
        console.log(`Generating Clinic Planner for ${monthKey}...`);

        const clinicSnap = await getDoc(doc(db, 'clinics', id));
        const clinicData = clinicSnap.data();
        const linkedDoctors = clinicData?.linkedDoctorsDetails || [];

        const newEvents: any[] = [];
        const daysInMonth = new Date(year, month, 0).getDate();

        for (const doctor of linkedDoctors) {
          const docId = doctor.doctorId || doctor.uid;
          if (!docId) continue;

          const doctorSnap = await getDoc(doc(db, 'doctors', docId));
          const doctorData = doctorSnap.data();
          const chambers = doctorData?.chambers || [];

          for (let d = 1; d <= daysInMonth; d++) {
            const currentDayDate = new Date(year, month - 1, d);
            const dayName = currentDayDate.toLocaleDateString('en-US', { weekday: 'long' });
            const shortDayName = currentDayDate.toLocaleDateString('en-US', { weekday: 'short' });
            const dateStr = `${year}-${month.toString().padStart(2, '0')}-${d.toString().padStart(2, '0')}`;

            chambers.forEach((chamber: any) => {
              if (chamber.clinicId !== id) return;

              let isActive = false;
              if (chamber.frequency === 'Daily') isActive = true;
              else if (chamber.frequency === 'Custom') isActive = chamber.customDate === dateStr;
              else if (chamber.days?.includes(shortDayName) || chamber.days?.includes(dayName)) isActive = true;

              if (isActive) {
                newEvents.push({
                  title: `${chamber.chamberName} (${doctor.name})`,
                  date: dateStr,
                  startTime: chamber.startTime,
                  endTime: chamber.endTime,
                  type: 'chamber',
                  doctorName: doctor.name,
                  doctorId: docId,
                  chamberId: chamber.id,
                  description: `Doctor: ${doctor.name} | Chamber: ${chamber.chamberName}`,
                  monthKey
                });
              }
            });
          }
        }

        const batch = writeBatch(db);
        const eventsRef = collection(db, `doctors/${id}/planner_events`);
        newEvents.forEach(evt => {
          const ref = doc(eventsRef);
          batch.set(ref, evt);
        });
        batch.set(metaRef, { generatedAt: new Date(), count: newEvents.length });
        await batch.commit();
        toast.success(`Schedule generated for ${monthNames[month-1]}`);
      }

      // 2. Fetch
      const eventsRef = collection(db, `doctors/${id}/planner_events`);
      const q = query(eventsRef, where('monthKey', '==', monthKey));
      const snap = await getDocs(q);
      const loaded = snap.docs.map(d => ({ id: d.id, ...d.data() })) as PlannerEvent[];
      setEvents(loaded);

    } catch (error) {
      console.error("Error fetching clinic planner:", error);
      toast.error("Failed to load planner");
    } finally {
      setLoading(false);
      setIsGenerating(false);
    }
  };

  useEffect(() => {
    fetchMonthEvents(currentDate);
  }, [currentDate, clinicId]);

  const handleSaveEvent = async () => {
    try {
      if (!selectedDate || !newEventData.title) return;
      const id = clinicId || localStorage.getItem('userId');
      if (!id) return;

      const { db } = await import('../lib/firebase/config');
      const { collection, addDoc } = await import('firebase/firestore');

      const evt = {
        title: newEventData.title,
        date: selectedDate,
        startTime: newEventData.startTime,
        endTime: newEventData.endTime,
        type: newEventData.type,
        description: newEventData.description,
        monthKey: selectedDate.substring(0, 7)
      };

      const ref = await addDoc(collection(db, `doctors/${id}/planner_events`), evt);
      setEvents([...events, { id: ref.id, ...evt } as PlannerEvent]);
      toast.success('Event added');
      setShowAddEventForm(false);
    } catch (e) {
      toast.error('Failed to add event');
    }
  };

  const days = getDaysInMonth(currentDate);
  const getEventsForDay = (dStr: string) => events.filter(e => e.date === dStr);

  return (
    <div className="min-h-screen bg-black text-white flex flex-col lg:flex-row">
      <ClinicSidebar
        activeMenu="monthly-planner"
        onMenuChange={onMenuChange || (() => {})}
        onLogout={onLogout || (() => {})}
        isOpen={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
        activeAddOns={activeAddOns}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed?.(!isSidebarCollapsed)}
      />

      <div className={`flex-1 transition-all duration-300 ${isSidebarCollapsed ? 'lg:ml-20' : 'lg:ml-64'} overflow-x-hidden`}>
        <div className="border-b border-zinc-800 px-6 py-4 flex items-center gap-4 sticky top-0 bg-black z-40">
           <button onClick={() => setMobileMenuOpen(true)} className="lg:hidden text-blue-500 p-2"><Menu /></button>
           <h1 className="text-xl font-bold">Monthly Planner</h1>
        </div>

        <div className="p-4 sm:p-6 space-y-6">
           {/* Controls */}
           <div className="flex items-center justify-between bg-zinc-900/50 border border-zinc-800 p-4 rounded-xl">
              <h2 className="text-xl font-bold text-blue-400">
                {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
              </h2>
              <div className="flex items-center gap-2">
                 <Button variant="outline" size="sm" onClick={() => setCurrentDate(new Date())} className="border-zinc-700 bg-black">Today</Button>
                 <Button variant="ghost" size="icon" onClick={() => {
                    const d = new Date(currentDate);
                    d.setMonth(d.getMonth() - 1);
                    setCurrentDate(d);
                    setSelectedDate(null);
                 }}><ChevronLeft /></Button>
                 <Button variant="ghost" size="icon" onClick={() => {
                    const d = new Date(currentDate);
                    d.setMonth(d.getMonth() + 1);
                    setCurrentDate(d);
                    setSelectedDate(null);
                 }}><ChevronRight /></Button>
              </div>
           </div>

           {loading || isGenerating ? (
             <div className="flex flex-col items-center py-20 gap-4">
                <RefreshCw className="w-10 h-10 animate-spin text-blue-500" />
                <p className="text-zinc-400">{isGenerating ? 'Syncing with doctor schedules...' : 'Loading planner...'}</p>
             </div>
           ) : (
             <div className="grid grid-cols-7 gap-2 sm:gap-4">
               {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                 <div key={day} className="text-center text-zinc-500 text-xs font-bold uppercase tracking-wider py-2">{day}</div>
               ))}
               {days.map((date, i) => {
                 if (!date) return <div key={`empty-${i}`} className="min-h-[100px] sm:min-h-[140px]" />;
                 const dStr = `${date.getFullYear()}-${(date.getMonth()+1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;
                 const isToday = new Date().toLocaleDateString('en-CA') === dStr;
                 const dayEvents = getEventsForDay(dStr);
                 return (
                   <div key={i} onClick={() => setSelectedDate(dStr)} className={`min-h-[100px] sm:min-h-[140px] p-2 rounded-xl border transition-all cursor-pointer overflow-hidden ${isToday ? 'bg-blue-900/10 border-blue-500/50' : 'bg-zinc-900/30 border-zinc-800 hover:border-zinc-600'} ${selectedDate === dStr ? 'ring-2 ring-blue-500' : ''}`}>
                      <div className="flex justify-between items-center mb-1">
                        <span className={`text-sm font-bold ${isToday ? 'text-blue-400' : 'text-zinc-500'}`}>{date.getDate()}</span>
                        {dayEvents.length > 0 && <span className="text-[10px] bg-zinc-800 text-zinc-400 px-1.5 py-0.5 rounded-full">{dayEvents.length}</span>}
                      </div>
                      <div className="space-y-1">
                         {dayEvents.slice(0, 3).map(e => (
                           <div key={e.id} className={`text-[10px] px-1.5 py-0.5 rounded truncate ${e.type === 'chamber' ? 'bg-blue-500/10 text-blue-400' : 'bg-zinc-700/50 text-zinc-300'}`}>
                             {e.title}
                           </div>
                         ))}
                         {dayEvents.length > 3 && <div className="text-[10px] text-zinc-500 pl-1">+{dayEvents.length - 3} more</div>}
                      </div>
                   </div>
                 );
               })}
             </div>
           )}

           <Button onClick={() => {
              const now = new Date();
              setSelectedDate(`${now.getFullYear()}-${(now.getMonth()+1).toString().padStart(2, '0')}-${now.getDate().toString().padStart(2, '0')}`);
              setShowAddEventForm(true);
           }} className="fixed bottom-6 right-6 lg:right-10 bg-blue-600 hover:bg-blue-700 text-white rounded-full h-14 w-14 lg:h-auto lg:w-auto lg:px-6 shadow-xl z-50">
              <Plus className="w-6 h-6" /> <span className="hidden lg:inline ml-2">Add Event</span>
           </Button>
        </div>

        <Dialog open={!!selectedDate} onOpenChange={(v) => !v && (setSelectedDate(null), setShowAddEventForm(false))}>
           <DialogContent className="bg-zinc-950 border-zinc-800 text-white">
              <DialogHeader>
                 <DialogTitle>{selectedDate && new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</DialogTitle>
              </DialogHeader>
              <div className="py-4 space-y-4">
                 {showAddEventForm ? (
                    <div className="space-y-4">
                       <div className="space-y-2">
                          <Label>Event Title</Label>
                          <Input value={newEventData.title} onChange={e => setNewEventData({...newEventData, title: e.target.value})} className="bg-zinc-900 border-zinc-800" placeholder="e.g. Clinic Maintenance" />
                       </div>
                       <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                             <Label>Start</Label>
                             <Input type="time" value={newEventData.startTime} onChange={e => setNewEventData({...newEventData, startTime: e.target.value})} className="bg-zinc-900 border-zinc-800" />
                          </div>
                          <div className="space-y-2">
                             <Label>End</Label>
                             <Input type="time" value={newEventData.endTime} onChange={e => setNewEventData({...newEventData, endTime: e.target.value})} className="bg-zinc-900 border-zinc-800" />
                          </div>
                       </div>
                    </div>
                 ) : (
                    <div className="space-y-2 max-h-[400px] overflow-y-auto">
                       {selectedDate && getEventsForDay(selectedDate).length === 0 ? (
                          <div className="text-center py-10 text-zinc-500">No events scheduled.</div>
                       ) : (
                          selectedDate && getEventsForDay(selectedDate).map(e => (
                             <div key={e.id} className="p-3 bg-zinc-900 border border-zinc-800 rounded-xl flex items-center justify-between group">
                                <div className="flex items-center gap-3">
                                   <div className={`p-2 rounded-lg ${e.type === 'chamber' ? 'bg-blue-500/20 text-blue-400' : 'bg-zinc-800 text-zinc-400'}`}>
                                      {e.type === 'chamber' ? <User className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
                                   </div>
                                   <div>
                                      <div className="font-bold text-sm">{e.title}</div>
                                      <div className="text-xs text-zinc-500 font-medium">{e.startTime} - {e.endTime}</div>
                                   </div>
                                </div>
                                <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 text-red-400"><Trash2 className="w-4 h-4" /></Button>
                             </div>
                          ))
                       )}
                    </div>
                 )}
              </div>
              <DialogFooter className="border-t border-zinc-800 pt-4">
                 {showAddEventForm ? (
                    <><Button variant="ghost" onClick={() => setShowAddEventForm(false)}>Back</Button><Button onClick={handleSaveEvent} className="bg-blue-600">Save</Button></>
                 ) : (
                    <><Button variant="ghost" onClick={() => setSelectedDate(null)}>Close</Button><Button onClick={() => setShowAddEventForm(true)} className="bg-blue-600">Add New</Button></>
                 )}
              </DialogFooter>
           </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

