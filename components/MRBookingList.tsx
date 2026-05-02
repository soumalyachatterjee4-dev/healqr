import { useState, useEffect } from 'react';
import { Calendar, Clock, MapPin, XCircle, CheckCircle2, Loader2, Stethoscope, AlertTriangle } from 'lucide-react';
import { Button } from './ui/button';
import { toast } from 'sonner';
import { db } from '../lib/firebase/config';
import { collection, query, where, onSnapshot, doc, updateDoc } from 'firebase/firestore';

interface MRBookingListProps {
  mrId: string;
  type: 'today' | 'advance';
}

export default function MRBookingList({ mrId, type }: MRBookingListProps) {
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  useEffect(() => {
    if (!mrId || !db) return;

    const todayStr = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD
    
    // We fetch all non-cancelled bookings and filter locally because 
    // Firestore inequalities (>, <) require composite indexes.
    const q = query(
      collection(db, 'mrBookings'),
      where('mrId', '==', mrId),
      where('status', 'in', ['confirmed', 'pending_special', 'met', 'cancelled'])
    );

    const unsub = onSnapshot(q, (snap) => {
      let data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      
      // Filter by date
      if (type === 'today') {
        data = data.filter(b => b.appointmentDate === todayStr);
      } else if (type === 'advance') {
        data = data.filter(b => b.appointmentDate > todayStr);
      }

      // Sort by date ascending
      data.sort((a, b) => new Date(a.appointmentDate).getTime() - new Date(b.appointmentDate).getTime());
      
      setBookings(data);
      setLoading(false);
    }, (err) => {
      console.error('Failed to fetch bookings:', err);
      setLoading(false);
      toast.error('Failed to load schedule');
    });

    return () => unsub();
  }, [mrId, type]);

  const handleCancel = async (bookingId: string) => {
    const confirm = window.confirm("Are you sure you want to cancel this visit? This slot will become available to other MRs.");
    if (!confirm) return;

    setCancellingId(bookingId);
    try {
      await updateDoc(doc(db, 'mrBookings', bookingId), {
        status: 'cancelled',
        cancelledBy: 'mr',
        cancelledAt: new Date().toISOString()
      });
      toast.success('Visit cancelled successfully');
    } catch (err) {
      console.error('Failed to cancel:', err);
      toast.error('Failed to cancel visit');
    } finally {
      setCancellingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            {type === 'today' ? <Clock className="w-6 h-6 text-blue-400" /> : <Calendar className="w-6 h-6 text-blue-400" />}
            {type === 'today' ? "Today's Schedule" : "Advance Bookings"}
          </h2>
          <p className="text-sm text-gray-400 mt-1">
            {type === 'today' ? "Your confirmed professional visits for today" : "Your upcoming professional visits"}
          </p>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-2">
          <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Total Visits</p>
          <p className="text-xl font-bold text-white text-center">{bookings.length}</p>
        </div>
      </div>

      {bookings.length === 0 ? (
        <div className="text-center py-16 bg-zinc-900 border border-zinc-800 rounded-xl">
          <Calendar className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">No visits scheduled</h3>
          <p className="text-gray-400 text-sm max-w-sm mx-auto">
            {type === 'today' 
              ? "You don't have any professional visits scheduled for today." 
              : "You don't have any upcoming professional visits scheduled."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {bookings.map(booking => (
            <div key={booking.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 relative overflow-hidden group transition-all hover:border-zinc-700">
              {/* Status indicator line */}
              <div className={`absolute top-0 left-0 w-1 h-full ${
                booking.status === 'met' ? 'bg-emerald-500' :
                booking.isSpecial ? 'bg-purple-500' : 'bg-blue-500'
              }`} />

              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    booking.status === 'met' ? 'bg-emerald-500/20 text-emerald-400' :
                    booking.isSpecial ? 'bg-purple-500/20 text-purple-400' : 'bg-blue-500/20 text-blue-400'
                  }`}>
                    {booking.status === 'met' ? <CheckCircle2 className="w-5 h-5" /> : <Stethoscope className="w-5 h-5" />}
                  </div>
                  <div>
                    <h3 className="font-bold text-white">Dr. {booking.doctorName}</h3>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                        booking.isSpecial ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20' : 
                        'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                      }`}>
                        {booking.isSpecial ? 'Special Request' : 'Regular Visit'}
                      </span>
                      {booking.status === 'pending_special' && (
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" /> Awaiting Approval
                        </span>
                      )}
                      {(booking.status === 'met' || booking.isMet) && (
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          Met
                        </span>
                      )}
                      {booking.status === 'cancelled' && (
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-red-500/10 text-red-400 border border-red-500/20">
                          {booking.cancelledBy === 'doctor' ? 'Cancelled by Dr' : 'Cancelled'}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-3 mb-5 bg-zinc-950/50 rounded-lg p-3 border border-zinc-800/50">
                <div className="flex items-start gap-2.5">
                  <Calendar className="w-4 h-4 text-gray-500 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-gray-200">
                      {new Date(booking.appointmentDate).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                    </p>
                    <p className="text-xs text-gray-500">Booking ID: {booking.bookingId}</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-2.5">
                  <MapPin className="w-4 h-4 text-gray-500 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-gray-200">{booking.chamberName || 'Clinic Chamber'}</p>
                  </div>
                </div>
              </div>

              {booking.status !== 'met' && !booking.isMet && booking.status !== 'cancelled' && (
                <div className="pt-4 border-t border-zinc-800/80">
                  <Button 
                    onClick={() => handleCancel(booking.id)} 
                    disabled={cancellingId === booking.id}
                    variant="outline" 
                    className="w-full border-red-900/50 text-red-400 hover:bg-red-950/30 hover:text-red-300 hover:border-red-900 h-10"
                  >
                    {cancellingId === booking.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <XCircle className="w-4 h-4 mr-2" />
                        Cancel Visit
                      </>
                    )}
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
