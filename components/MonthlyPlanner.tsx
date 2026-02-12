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
  Menu
} from 'lucide-react';
import { toast } from 'sonner';

interface PlannerEvent {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  startTime?: string;
  endTime?: string;
  type: 'chamber' | 'personal' | 'surgery' | 'other';
  description?: string;
  location?: string;
  chamberId?: number; // If linked to a chamber
  monthKey?: string;
}

import DashboardSidebar from './DashboardSidebar';

interface MonthlyPlannerProps {
  onMenuChange?: (menu: string) => void;
  onLogout?: () => void;
  activeAddOns?: string[];
}

export default function MonthlyPlanner({
  onMenuChange,
  onLogout,
  activeAddOns = []
}: MonthlyPlannerProps) {
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
    type: 'personal',
    startTime: '09:00',
    endTime: '10:00',
    description: ''
  });

  // Get days in month
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDayOfMonth = new Date(year, month, 1).getDay(); // 0 = Sunday

    const days = [];
    // Add empty slots for previous month
    for (let i = 0; i < firstDayOfMonth; i++) {
      days.push(null);
    }
    // Add days
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(year, month, i));
    }
    return days;
  };

  const monthNames = ["January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  // Fetch events for the month
  const fetchMonthEvents = async (date: Date) => {
    try {
      setLoading(true);
      const userId = localStorage.getItem('userId');
      if (!userId) return;

      const year = date.getFullYear();
      const month = date.getMonth() + 1; // 1-12
      const monthKey = `${year}-${month.toString().padStart(2, '0')}`;

      const { db } = await import('../lib/firebase/config');
      const { collection, query, where, getDocs, doc, getDoc, writeBatch } = await import('firebase/firestore');

      // 1. Check if we have generated schedule for this month
      if (!db) return;
      const metaRef = doc(db, `doctors/${userId}/planner_meta/${monthKey}`);
      const metaSnap = await getDoc(metaRef);

      if (!metaSnap.exists()) {
        // LAZY GENERATION: Schedule not exists -> Generate from Recurring Pattern
        setIsGenerating(true);
        console.log(`Generating schedule for ${monthKey}...`);

        // 1a. Load Recurring Schedule (Chambers)
        if (!db) return;
        const doctorDoc = await getDoc(doc(db, 'doctors', userId));
        const doctorData = doctorDoc.data();
        const chambers = doctorData?.chambers || [];

        const newEvents: any[] = [];
        const daysInMonth = new Date(year, month, 0).getDate();

        // 1b. Iterate days and match chambers
        for (let d = 1; d <= daysInMonth; d++) {
          const currentDayDate = new Date(year, month - 1, d);
          const dayName = currentDayDate.toLocaleDateString('en-US', { weekday: 'long' }); // "Monday"
          const yearStr = currentDayDate.getFullYear();
          const monthStr = String(currentDayDate.getMonth() + 1).padStart(2, '0');
          const dayStr = String(currentDayDate.getDate()).padStart(2, '0');
          const dateStr = `${yearStr}-${monthStr}-${dayStr}`;

          chambers.forEach((chamber: any) => {
             // Check if chamber is active on this day
             // chamber.days might be ["Mon", "Wed"] or full names
             // Or chamber.schedule might be a string
             // Let's assume normalized "Mon", "Tue" etc. or we interpret specific text
             // For safety in this MVP, we look for simple inclusion

             // Extract days from chamber data (usually normalized in UI to Short form "Mon")
             const chamberDays = chamber.days || []; // ["Mon", "Tue"]
             const shortDayName = currentDayDate.toLocaleDateString('en-US', { weekday: 'short' }); // "Mon"

             if (chamberDays.includes(shortDayName) || chamberDays.includes(dayName)) {
                newEvents.push({
                  title: chamber.chamberName,
                  date: dateStr,
                  startTime: chamber.startTime,
                  endTime: chamber.endTime,
                  type: 'chamber',
                  location: chamber.chamberAddress,
                  chamberId: chamber.id,
                  description: 'Recurring Schedule'
                });
             }
          });
        }

        // 1c. Batch Save Events
        const batch = writeBatch(db);
        const eventsRef = collection(db, `doctors/${userId}/planner_events`);

        newEvents.forEach(event => {
          const newDocRef = doc(eventsRef); // Auto ID
          batch.set(newDocRef, { ...event, monthKey });
        });

        // Save Meta
        batch.set(metaRef, { generatedAt: new Date(), count: newEvents.length });

        await batch.commit();
        setIsGenerating(false);
        toast.success(`Schedule generated for ${monthNames[month-1]}`);
      }

      // 2. Fetch Events from Firestore
      if (!db) return;
      const eventsRef = collection(db, `doctors/${userId}/planner_events`);
      const q = query(eventsRef, where('monthKey', '==', monthKey));
      const snapshot = await getDocs(q);

      const loadedEvents = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as PlannerEvent[];

      setEvents(loadedEvents);

    } catch (error) {
      console.error("Error fetching planner:", error);
      toast.error("Failed to load planner");
    } finally {
      setLoading(false);
      setIsGenerating(false);
    }
  };

  useEffect(() => {
    fetchMonthEvents(currentDate);
  }, [currentDate]);

  const handleSaveEvent = async () => {
    try {
      if (!selectedDate || !newEventData.title) return;

      const userId = localStorage.getItem('userId');
      if (!userId) return;

      const { db } = await import('../lib/firebase/config');
      if (!db) return;
      const { collection, addDoc } = await import('firebase/firestore');

      const newEvent = {
        title: newEventData.title,
        date: selectedDate,
        startTime: newEventData.startTime,
        endTime: newEventData.endTime,
        type: newEventData.type as any,
        description: newEventData.description,
        monthKey: selectedDate.substring(0, 7) // YYYY-MM
      };

      const docRef = await addDoc(collection(db, `doctors/${userId}/planner_events`), newEvent);

      // Update local state
      setEvents([...events, { id: docRef.id, ...newEvent }]);

      toast.success('Event added successfully');
      setShowAddEventForm(false);
      setNewEventData({
        title: '',
        type: 'personal',
        startTime: '09:00',
        endTime: '10:00',
        description: ''
      });
    } catch (error) {
      console.error('Error adding event:', error);
      toast.error('Failed to add event');
    }
  };

  const changeMonth = (delta: number) => {
    const newDate = new Date(currentDate);
    newDate.setMonth(newDate.getMonth() + delta);
    setCurrentDate(newDate);
    setSelectedDate(null);
  };

  const days = getDaysInMonth(currentDate);

  // Filter events for selected day or view
  const getEventsForDay = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;
    return events.filter(e => e.date === dateStr);
  };

  return (
    <div className="min-h-screen bg-[#0a0f1a] text-white">
      <DashboardSidebar
        activeMenu="monthly-planner"
        onMenuChange={onMenuChange || (() => {})}
        onLogout={onLogout}
        activeAddOns={activeAddOns}
        isOpen={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
      />

      <div className="p-6 lg:ml-64">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          {/* Mobile Menu Button */}
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden text-gray-400 -ml-2"
            onClick={() => setMobileMenuOpen(true)}
          >
            <Menu className="w-6 h-6" />
          </Button>

          <div className="flex-1 flex items-center justify-between">
            <div>
              <h1 className="text-xl lg:text-2xl font-bold text-white mb-1">Monthly Planner</h1>
              <p className="text-sm text-gray-400 hidden sm:block">Manage your schedule and clinics</p>
            </div>
          <div className="flex items-center gap-2 lg:gap-4">
            <Button
              variant="outline"
              size="sm"
              className="border-gray-700 text-gray-300 hover:text-white hidden sm:flex"
              onClick={() => setCurrentDate(new Date())}
            >
              Today
            </Button>
            <Button
              className="bg-emerald-500 hover:bg-emerald-600 text-white gap-2"
              onClick={() => {
                const now = new Date();
                const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
                setSelectedDate(dateStr);
              }}
            >
              <Plus className="w-4 h-4" /> <span className="hidden sm:inline">Add Event</span>
              <span className="sm:hidden">Add</span>
            </Button>
          </div>
        </div>
      </div>

        {/* Calendar Controls */}
        <div className="flex items-center justify-between mb-6 bg-gray-900/50 p-4 rounded-xl border border-gray-800">
          <h2 className="text-xl font-semibold text-emerald-400">
            {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
          </h2>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => changeMonth(-1)}>
              <ChevronLeft className="w-5 h-5" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => changeMonth(1)}>
              <ChevronRight className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Loading State */}
        {loading || isGenerating ? (
          <div className="flex flex-col items-center justify-center py-20">
            <RefreshCw className="w-10 h-10 text-emerald-500 animate-spin mb-4" />
            <p className="text-gray-400">
              {isGenerating ? 'Generating monthly schedule...' : 'Loading planner...'}
            </p>
          </div>
        ) : (
          /* Calendar Grid */
          <div className="grid grid-cols-7 gap-4">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div key={day} className="text-center text-gray-500 text-sm font-medium py-2">
                {day}
              </div>
            ))}

            {days.map((date, i) => {
              if (!date) return <div key={`empty-${i}`} className="min-h-[120px]" />;

              const year = date.getFullYear();
              const month = String(date.getMonth() + 1).padStart(2, '0');
              const day = String(date.getDate()).padStart(2, '0');
              const dateStr = `${year}-${month}-${day}`;

              const isToday = new Date().toLocaleDateString('en-CA') === dateStr;
              const dayEvents = getEventsForDay(date);
              const isSelected = selectedDate === dateStr;

              return (
                <div
                  key={i}
                  onClick={() => setSelectedDate(isSelected ? null : dateStr)}
                  className={`
                    min-h-[120px] p-3 rounded-lg border transition-all cursor-pointer
                    ${isToday ? 'bg-emerald-950/30 border-emerald-500/50' : 'bg-gray-900 border-gray-800 hover:border-gray-600'}
                    ${isSelected ? 'ring-2 ring-emerald-500' : ''}
                  `}
                >
                  <div className="flex items-start justify-between mb-2">
                    <span className={`text-sm font-medium ${isToday ? 'text-emerald-400' : 'text-gray-400'}`}>
                      {date.getDate()}
                    </span>
                    {dayEvents.length > 0 && (
                      <span className="text-xs bg-gray-800 text-gray-400 px-1.5 py-0.5 rounded">
                        {dayEvents.length}
                      </span>
                    )}
                  </div>

                  <div className="space-y-1">
                    {dayEvents.slice(0, 3).map((event) => (
                      <div
                        key={event.id}
                        className={`
                          text-xs px-2 py-1 rounded truncate
                          ${event.type === 'chamber' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-blue-500/10 text-blue-400'}
                        `}
                      >
                        {event.title}
                      </div>
                    ))}
                    {dayEvents.length > 3 && (
                      <div className="text-xs text-gray-500 pl-1">
                        + {dayEvents.length - 3} more
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Event Dialog */}
        <Dialog open={!!selectedDate} onOpenChange={(open) => !open && setSelectedDate(null)}>
          <DialogContent className="bg-gray-900 border-gray-800 text-white sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>
                {selectedDate && new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
               {showAddEventForm ? (
                 <div className="space-y-4 py-2">
                   <div>
                     <Label className="text-gray-300">Event Title</Label>
                     <Input
                       value={newEventData.title}
                       onChange={(e) => setNewEventData({...newEventData, title: e.target.value})}
                       placeholder="e.g. Dentist Appointment"
                       className="bg-[#0f172a] border-gray-700 text-white placeholder:text-gray-500 focus:border-emerald-500"
                     />
                   </div>
                   <div className="grid grid-cols-2 gap-4">
                     <div>
                       <Label className="text-gray-300">Start Time</Label>
                       <Input
                         type="time"
                         value={newEventData.startTime}
                         onChange={(e) => setNewEventData({...newEventData, startTime: e.target.value})}
                         className="bg-[#0f172a] border-gray-700 text-white focus:border-emerald-500 [color-scheme:dark]"
                       />
                     </div>
                     <div>
                       <Label className="text-gray-300">End Time</Label>
                       <Input
                         type="time"
                         value={newEventData.endTime}
                         onChange={(e) => setNewEventData({...newEventData, endTime: e.target.value})}
                         className="bg-[#0f172a] border-gray-700 text-white focus:border-emerald-500 [color-scheme:dark]"
                       />
                     </div>
                   </div>
                   <div>
                     <Label className="text-gray-300">Type</Label>
                     <Select
                       value={newEventData.type}
                       onValueChange={(val) => setNewEventData({...newEventData, type: val})}
                     >
                       <SelectTrigger className="bg-[#0f172a] border-gray-700 text-white">
                         <SelectValue />
                       </SelectTrigger>
                       <SelectContent className="bg-gray-900 border-gray-800 text-white">
                         <SelectItem value="personal">Personal</SelectItem>
                         <SelectItem value="chamber">Chamber</SelectItem>
                         <SelectItem value="surgery">Surgery</SelectItem>
                         <SelectItem value="other">Other</SelectItem>
                       </SelectContent>
                     </Select>
                   </div>
                 </div>
               ) : (
                 /* List Events */
                 <div className="space-y-3 max-h-[300px] overflow-y-auto custom-scrollbar">
                  {selectedDate && getEventsForDay(new Date(selectedDate)).length === 0 ? (
                    <p className="text-gray-500 italic text-center py-4">No events scheduled.</p>
                  ) : (
                    selectedDate && getEventsForDay(new Date(selectedDate)).map(event => (
                      <div key={event.id} className="flex items-center justify-between p-3 bg-black/40 rounded-lg border border-gray-800">
                          <div className="flex items-start gap-3">
                            <div className={`p-2 rounded-full ${event.type === 'chamber' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-blue-500/20 text-blue-400'}`}>
                              {event.type === 'chamber' ? <MapPin className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
                            </div>
                            <div>
                              <h3 className="font-medium text-white text-sm">{event.title}</h3>
                              <div className="flex items-center gap-2 text-xs text-gray-400 mt-1">
                                <span className="flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  {event.startTime} - {event.endTime}
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400 hover:text-white">
                              <Edit2 className="w-3.5 h-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-red-400 hover:text-red-300 hover:bg-red-950/30">
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                      </div>
                    ))
                  )}
                </div>
               )}
            </div>

            <DialogFooter className="sm:justify-between gap-2 border-t border-gray-800 pt-4 mt-2">
                 {showAddEventForm ? (
                   <>
                     <Button
                        variant="ghost"
                        onClick={() => setShowAddEventForm(false)}
                        className="text-gray-400 hover:text-white"
                      >
                        Cancel
                      </Button>
                      <Button
                        className="bg-emerald-500 hover:bg-emerald-600 text-white gap-2"
                        onClick={handleSaveEvent}
                        disabled={!newEventData.title}
                      >
                        Save Event
                      </Button>
                   </>
                 ) : (
                   <>
                     <Button
                        variant="ghost"
                        onClick={() => setSelectedDate(null)}
                        className="text-gray-400 hover:text-white"
                      >
                        Close
                      </Button>
                      <Button
                        className="bg-emerald-500 hover:bg-emerald-600 text-white gap-2"
                        onClick={() => setShowAddEventForm(true)}
                      >
                        <Plus className="w-4 h-4" /> Add Event
                      </Button>
                   </>
                 )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
