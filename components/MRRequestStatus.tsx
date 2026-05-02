import { useState, useEffect } from 'react';
import { db } from '../lib/firebase/config';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { 
  ClipboardList, Users, Star, Clock, CheckCircle2, XCircle, 
  Building2, Calendar, MapPin, AlertCircle, Loader2 
} from 'lucide-react';

interface MRRequestStatusProps {
  mrId: string;
}

export default function MRRequestStatus({ mrId }: MRRequestStatusProps) {
  const [activeTab, setActiveTab] = useState<'doctor-links' | 'special-visits'>('doctor-links');
  const [doctorLinks, setDoctorLinks] = useState<any[]>([]);
  const [specialVisits, setSpecialVisits] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!mrId || !db) return;

    // Listen for doctor connection requests
    const linksQuery = query(
      collection(db, 'mrDoctorLinks'),
      where('mrId', '==', mrId)
    );
    
    const unsubLinks = onSnapshot(linksQuery, (snap) => {
      const items = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      items.sort((a: any, b: any) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      setDoctorLinks(items);
      setLoading(false);
    });

    // Listen for special visit requests
    const visitsQuery = query(
      collection(db, 'mrBookings'),
      where('mrId', '==', mrId),
      where('isSpecial', '==', true)
    );

    const unsubVisits = onSnapshot(visitsQuery, (snap) => {
      const items = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      items.sort((a: any, b: any) => {
        // Sort by appointment date descending
        return b.appointmentDate.localeCompare(a.appointmentDate);
      });
      setSpecialVisits(items);
    });

    return () => {
      unsubLinks();
      unsubVisits();
    };
  }, [mrId]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="w-10 h-10 animate-spin text-blue-500 mb-4" />
        <p className="text-gray-400">Loading your requests...</p>
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
      case 'pending_special':
        return (
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-yellow-500/10 text-yellow-500 text-xs font-medium border border-yellow-500/20">
            <Clock className="w-3 h-3" /> Pending Approval
          </span>
        );
      case 'approved':
      case 'confirmed':
        return (
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-500 text-xs font-medium border border-emerald-500/20">
            <CheckCircle2 className="w-3 h-3" /> Approved
          </span>
        );
      case 'rejected':
        return (
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-500/10 text-red-500 text-xs font-medium border border-red-500/20">
            <XCircle className="w-3 h-3" /> Rejected
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-1 rounded-full bg-zinc-800 text-gray-400 text-xs font-medium border border-zinc-700">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <ClipboardList className="w-7 h-7 text-blue-500" />
            My Requests & Status
          </h1>
          <p className="text-gray-400 text-sm mt-1">Track your connections and special appointments</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-zinc-800">
        <button
          onClick={() => setActiveTab('doctor-links')}
          className={`px-6 py-3 text-sm font-medium transition-colors relative ${
            activeTab === 'doctor-links' ? 'text-blue-400' : 'text-gray-500 hover:text-gray-300'
          }`}
        >
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            Doctor Connections
            {doctorLinks.filter(l => l.status === 'pending').length > 0 && (
              <span className="ml-1 bg-yellow-500 text-black text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                {doctorLinks.filter(l => l.status === 'pending').length}
              </span>
            )}
          </div>
          {activeTab === 'doctor-links' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500" />
          )}
        </button>
        <button
          onClick={() => setActiveTab('special-visits')}
          className={`px-6 py-3 text-sm font-medium transition-colors relative ${
            activeTab === 'special-visits' ? 'text-blue-400' : 'text-gray-500 hover:text-gray-300'
          }`}
        >
          <div className="flex items-center gap-2">
            <Star className="w-4 h-4" />
            Special Appointments
            {specialVisits.filter(v => v.status === 'pending_special').length > 0 && (
              <span className="ml-1 bg-yellow-500 text-black text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                {specialVisits.filter(v => v.status === 'pending_special').length}
              </span>
            )}
          </div>
          {activeTab === 'special-visits' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500" />
          )}
        </button>
      </div>

      {/* Content */}
      <div className="space-y-4">
        {activeTab === 'doctor-links' ? (
          <div className="space-y-3">
            {doctorLinks.length === 0 ? (
              <div className="text-center py-20 bg-zinc-900/50 border border-dashed border-zinc-800 rounded-2xl">
                <Users className="w-12 h-12 text-zinc-700 mx-auto mb-4" />
                <p className="text-gray-400">No connection requests found.</p>
                <p className="text-xs text-gray-500 mt-2">Connect with doctors from the "My Doctors" page.</p>
              </div>
            ) : (
              doctorLinks.map((link) => (
                <div key={link.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 hover:border-zinc-700 transition-all">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-blue-500/10 rounded-full flex items-center justify-center border border-blue-500/20">
                        <Users className="w-6 h-6 text-blue-400" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-white">Dr. {link.doctorName}</h3>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1">
                          <span className="text-xs text-gray-400 flex items-center gap-1">
                            <Building2 className="w-3 h-3" /> {link.mrCompany}
                          </span>
                          <span className="text-xs text-gray-500">
                            Requested: {link.createdAt?.toDate?.().toLocaleDateString() || 'N/A'}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div>
                      {getStatusBadge(link.status)}
                    </div>
                  </div>
                  {link.status === 'approved' && (
                    <div className="mt-4 pt-4 border-t border-zinc-800 flex items-center gap-2">
                      <span className="text-[10px] text-emerald-500 uppercase font-bold">Frequency Set:</span>
                      <span className="text-xs text-gray-300 capitalize">{link.frequency || 'Weekly'}</span>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {specialVisits.length === 0 ? (
              <div className="text-center py-20 bg-zinc-900/50 border border-dashed border-zinc-800 rounded-2xl">
                <Star className="w-12 h-12 text-zinc-700 mx-auto mb-4" />
                <p className="text-gray-400">No special appointment requests found.</p>
              </div>
            ) : (
              specialVisits.map((visit) => (
                <div key={visit.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 hover:border-zinc-700 transition-all">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-purple-500/10 rounded-full flex items-center justify-center border border-purple-500/20">
                        <Calendar className="w-6 h-6 text-purple-400" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-white">Dr. {visit.doctorName}</h3>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1">
                          <span className="text-xs text-blue-400 flex items-center gap-1 font-medium">
                            <Calendar className="w-3 h-3" /> {visit.appointmentDate}
                          </span>
                          <span className="text-xs text-gray-400 flex items-center gap-1">
                            <MapPin className="w-3 h-3" /> {visit.chamberName}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      {getStatusBadge(visit.status)}
                      <span className="text-[10px] bg-purple-500/10 text-purple-400 px-2 py-0.5 rounded uppercase font-bold">
                        Special Request
                      </span>
                    </div>
                  </div>
                  
                  {visit.specialReason && (
                    <div className="mt-4 p-3 bg-zinc-950/50 border border-zinc-800 rounded-lg">
                      <div className="flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 text-gray-500 mt-0.5" />
                        <div>
                          <p className="text-[10px] text-gray-500 uppercase font-bold mb-1">Your Reason for Request</p>
                          <p className="text-xs text-gray-300 italic">"{visit.specialReason}"</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
