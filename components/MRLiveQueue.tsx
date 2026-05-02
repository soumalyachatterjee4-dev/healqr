import { useState, useEffect } from 'react';
import { Activity, Clock, Loader2, Users, Briefcase, MapPin, AlertCircle } from 'lucide-react';
import { db } from '../lib/firebase/config';
import { collection, query, where, onSnapshot, doc, getDoc } from 'firebase/firestore';

interface MRLiveQueueProps {
  mrId: string;
}

export default function MRLiveQueue({ mrId }: MRLiveQueueProps) {
  const [activeVisits, setActiveVisits] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // States to hold realtime queue data for each visit
  const [queueData, setQueueData] = useState<Record<string, any>>({});

  useEffect(() => {
    if (!mrId || !db) return;

    const todayStr = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD
    
    // Listen to MR's today visits
    const q = query(
      collection(db, 'mrBookings'),
      where('mrId', '==', mrId),
      where('status', 'in', ['confirmed', 'met'])
    );

    const unsubVisits = onSnapshot(q, (snap) => {
      let data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      data = data.filter(b => b.appointmentDate === todayStr);
      data.sort((a, b) => (a.slotIndex || 0) - (b.slotIndex || 0));
      setActiveVisits(data);
      setLoading(false);
    });

    return () => unsubVisits();
  }, [mrId]);

  // For each active visit, fetch chamber config and listen to patient queue
  useEffect(() => {
    if (!activeVisits.length || !db) return;
    
    const unsubs: Array<() => void> = [];
    const todayStr = new Date().toLocaleDateString('en-CA');

    activeVisits.forEach((visit) => {
      // Avoid creating multiple listeners for the same chamber if MR has multiple visits (rare but possible)
      if (queueData[visit.chamberId] && queueData[visit.chamberId].listenersActive) return;

      const setupQueueListener = async () => {
        try {
          // 1. Fetch chamber config from doctor doc
          const docRef = await getDoc(doc(db, 'doctors', visit.doctorId));
          let mrMeetingTime = 'after';
          let mrInterval = 2;
          let capacity = 20;

          if (docRef.exists()) {
            const docData = docRef.data();
            const chamber = docData.chambers?.find((c: any) => String(c.id) === String(visit.chamberId));
            if (chamber) {
              mrMeetingTime = chamber.mrMeetingTime || 'after';
              mrInterval = chamber.mrIntervalAfterPatients || 2;
              capacity = chamber.maxCapacity || 20;
            }
          }

          // 2. Listen to all MRs for this chamber today
          const mrQ = query(
            collection(db, 'mrBookings'),
            where('chamberId', '==', visit.chamberId),
            where('appointmentDate', '==', todayStr),
            where('status', 'in', ['confirmed', 'met'])
          );

          // 3. Listen to all patients for this chamber today
          const ptQ = query(
            collection(db, 'bookings'),
            where('chamberId', '==', visit.chamberId)
          );

          let currentMRs: any[] = [];
          let currentPatients: any[] = [];

          const updateQueueData = () => {
            setQueueData(prev => ({
              ...prev,
              [visit.chamberId]: {
                listenersActive: true,
                mrMeetingTime,
                mrInterval,
                capacity,
                mrs: currentMRs,
                patients: currentPatients
              }
            }));
          };

          const unsubMRs = onSnapshot(mrQ, (snap) => {
            currentMRs = snap.docs.map(d => ({ id: d.id, isMR: true, ...d.data() }));
            currentMRs.sort((a, b) => (a.slotIndex || 0) - (b.slotIndex || 0));
            updateQueueData();
          });

          const unsubPts = onSnapshot(ptQ, (snap) => {
            let pts = snap.docs.map(d => ({ id: d.id, isPatient: true, ...d.data() }));
            pts = pts.filter(p => p.appointmentDate === todayStr && p.status !== 'cancelled');
            pts.sort((a, b) => (a.slotNumber || 0) - (b.slotNumber || 0));
            currentPatients = pts;
            updateQueueData();
          });

          unsubs.push(unsubMRs, unsubPts);
        } catch (error) {
          console.error("Error setting up queue listener:", error);
        }
      };

      setupQueueListener();
    });

    return () => {
      unsubs.forEach(unsub => unsub());
    };
  }, [activeVisits.length]); // Re-run if number of visits changes

  const calculateQueue = (visit: any) => {
    const data = queueData[visit.chamberId];
    if (!data) return null;

    const { mrMeetingTime, mrInterval, capacity, mrs, patients } = data;
    let combinedQueue: any[] = [];

    // Construct the logical queue
    if (mrMeetingTime === 'before') {
      combinedQueue = [...mrs, ...patients];
    } else if (mrMeetingTime === 'after') {
      combinedQueue = [...patients, ...mrs];
    } else if (mrMeetingTime === 'interval') {
      let pIdx = 0;
      let mIdx = 0;
      let countSinceLastMR = 0;

      while (pIdx < patients.length || mIdx < mrs.length) {
        if (pIdx < patients.length && countSinceLastMR < mrInterval) {
          combinedQueue.push(patients[pIdx]);
          pIdx++;
          countSinceLastMR++;
        } else if (mIdx < mrs.length) {
          combinedQueue.push(mrs[mIdx]);
          mIdx++;
          countSinceLastMR = 0; // reset
        } else if (pIdx < patients.length) {
          combinedQueue.push(patients[pIdx]);
          pIdx++;
        }
      }
    }

    // Find current MR's index
    const myIndex = combinedQueue.findIndex(item => item.isMR && item.id === visit.id);
    if (myIndex === -1) return null;

    // Calculate who is ahead and not seen yet
    let patientsAheadNotSeen = 0;
    let mrsAheadNotSeen = 0;
    let totalAheadNotSeen = 0;

    for (let i = 0; i < myIndex; i++) {
      const item = combinedQueue[i];
      // For patients, we check isMarkedSeen
      // For MRs, we check status === 'met' or isMet === true
      const isSeen = item.isPatient ? item.isMarkedSeen : (item.status === 'met' || item.isMet);
      
      if (!isSeen) {
        totalAheadNotSeen++;
        if (item.isPatient) patientsAheadNotSeen++;
        if (item.isMR) mrsAheadNotSeen++;
      }
    }

    // Calculate approximate wait time
    // Patient avg time = 5 mins, MR avg time = 2 mins
    const estimatedWaitMinutes = (patientsAheadNotSeen * 5) + (mrsAheadNotSeen * 2);

    // Determine current active item (the first item that is not seen)
    let activeItemIndex = combinedQueue.findIndex(item => {
      return item.isPatient ? !item.isMarkedSeen : !(item.status === 'met' || item.isMet);
    });

    const isMyTurn = activeItemIndex === myIndex;

    return {
      combinedQueue,
      myIndex,
      patientsAheadNotSeen,
      mrsAheadNotSeen,
      totalAheadNotSeen,
      estimatedWaitMinutes,
      activeItemIndex,
      isMyTurn
    };
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
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center">
          <Activity className="w-6 h-6 text-blue-400" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-white">Live Queue</h2>
          <p className="text-sm text-gray-400">Track your chamber position in real-time</p>
        </div>
      </div>

      {activeVisits.length === 0 ? (
        <div className="text-center py-16 bg-zinc-900 border border-zinc-800 rounded-xl">
          <Clock className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">No active visits today</h3>
          <p className="text-gray-400 text-sm max-w-sm mx-auto">
            You don't have any confirmed professional visits scheduled for today to track.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {activeVisits.map(visit => {
            const queueStats = calculateQueue(visit);
            const isMet = visit.status === 'met' || visit.isMet;

            return (
              <div key={visit.id} className={`bg-zinc-900 border ${isMet ? 'border-emerald-500/30' : queueStats?.isMyTurn ? 'border-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.15)]' : 'border-zinc-800'} rounded-xl p-5 overflow-hidden relative`}>
                
                {queueStats?.isMyTurn && !isMet && (
                  <div className="absolute top-0 left-0 w-full h-1 bg-blue-500 animate-pulse" />
                )}
                {isMet && (
                  <div className="absolute top-0 left-0 w-full h-1 bg-emerald-500" />
                )}

                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h3 className="font-bold text-white text-lg">Dr. {visit.doctorName}</h3>
                    <p className="text-gray-400 text-sm flex items-center gap-1 mt-1">
                      <MapPin className="w-3.5 h-3.5" />
                      {visit.chamberName || 'Clinic Chamber'}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Your Slot</p>
                    <div className="bg-zinc-800 rounded-lg px-4 py-2 inline-block">
                      <span className="text-xl font-bold text-white">MR {visit.slotIndex || '-'}</span>
                    </div>
                  </div>
                </div>

                {isMet ? (
                  <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-4 flex items-center gap-3">
                    <div className="w-10 h-10 bg-emerald-500/20 rounded-full flex items-center justify-center shrink-0">
                      <Activity className="w-5 h-5 text-emerald-500" />
                    </div>
                    <div>
                      <h4 className="text-emerald-400 font-bold">Visit Completed</h4>
                      <p className="text-emerald-500/80 text-sm">The doctor has marked your meeting as completed.</p>
                    </div>
                  </div>
                ) : !queueStats ? (
                  <div className="flex items-center gap-2 text-gray-400 text-sm py-4">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Calculating queue position...
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                      <div className="bg-zinc-950/50 border border-zinc-800 rounded-lg p-3">
                        <p className="text-xs text-gray-500 mb-1">Queue Position</p>
                        <p className="text-lg font-bold text-white">{queueStats.myIndex + 1} <span className="text-xs text-gray-500 font-normal">/ {queueStats.combinedQueue.length}</span></p>
                      </div>
                      <div className="bg-zinc-950/50 border border-zinc-800 rounded-lg p-3">
                        <p className="text-xs text-gray-500 mb-1">Ahead of You</p>
                        <p className="text-lg font-bold text-amber-400">{queueStats.totalAheadNotSeen}</p>
                      </div>
                      <div className="bg-zinc-950/50 border border-zinc-800 rounded-lg p-3">
                        <p className="text-xs text-gray-500 mb-1">Est. Wait Time</p>
                        <p className="text-lg font-bold text-white">
                          {queueStats.isMyTurn ? 'Now' : queueStats.estimatedWaitMinutes > 0 ? `~${queueStats.estimatedWaitMinutes} min` : 'Next'}
                        </p>
                      </div>
                      <div className="bg-zinc-950/50 border border-zinc-800 rounded-lg p-3">
                        <p className="text-xs text-gray-500 mb-1">Current Rule</p>
                        <p className="text-sm font-medium text-gray-300 capitalize">
                          {queueData[visit.chamberId]?.mrMeetingTime}
                          {queueData[visit.chamberId]?.mrMeetingTime === 'interval' && ` (${queueData[visit.chamberId]?.mrInterval})`}
                        </p>
                      </div>
                    </div>

                    {queueStats.isMyTurn ? (
                      <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-blue-500 flex items-center justify-center rounded-full animate-pulse shadow-[0_0_15px_rgba(59,130,246,0.5)]">
                            <Briefcase className="w-5 h-5 text-white" />
                          </div>
                          <div>
                            <h4 className="text-blue-400 font-bold">It's your turn!</h4>
                            <p className="text-blue-300/80 text-sm">Please proceed to the doctor's chamber.</p>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4">
                        <div className="flex items-start gap-3">
                          <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                          <div>
                            <h4 className="text-amber-500 font-medium text-sm mb-1">Please wait for your turn</h4>
                            <p className="text-amber-500/80 text-xs">
                              There are currently {queueStats.patientsAheadNotSeen} patients and {queueStats.mrsAheadNotSeen} MRs ahead of you. The queue updates automatically.
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Queue Status Board Grid */}
                    <div className="mt-6 pt-6 border-t border-zinc-800/50">
                      <h3 className="text-white font-bold text-sm mb-4">Queue Status Board</h3>
                      <div className="grid grid-cols-5 sm:grid-cols-10 gap-2 mb-6">
                        {queueStats.combinedQueue.map((item, idx) => {
                          const isSeen = item.isPatient ? item.isMarkedSeen : (item.status === 'met' || item.isMet);
                          const isMe = item.isMR && item.id === visit.id;
                          const isActive = idx === queueStats.activeItemIndex;
                          
                          let statusClass = "border-zinc-700 text-gray-500";
                          if (isSeen) statusClass = "border-red-600 text-red-500 bg-red-600/5";
                          else if (isActive) statusClass = "border-green-500 text-green-500 bg-green-500/10 animate-pulse";
                          else if (isMe) statusClass = "border-blue-500 text-blue-500 bg-blue-500/10 ring-1 ring-blue-500/50";
                          else statusClass = "border-yellow-500/30 text-yellow-500/60";

                          return (
                            <div 
                              key={item.id}
                              className={`aspect-square rounded-lg border-2 flex flex-col items-center justify-center transition-all ${statusClass}`}
                              title={item.isPatient ? `Patient: ${item.patientName}` : `MR: ${item.mrName}`}
                            >
                              <span className="text-xs font-bold">{item.isPatient ? (item.serialNumber || item.slotNumber) : `MR${item.slotIndex}`}</span>
                              <span className="text-[8px] opacity-70">{item.isPatient ? 'PT' : 'MR'}</span>
                            </div>
                          );
                        })}
                      </div>

                      <p className="text-xs text-gray-500 mb-3 uppercase tracking-wider">Queue Timeline Bar</p>
                      <div className="flex gap-1 h-3 rounded-full overflow-hidden bg-zinc-950">
                        {queueStats.combinedQueue.map((item, idx) => {
                          const isSeen = item.isPatient ? item.isMarkedSeen : (item.status === 'met' || item.isMet);
                          const isMe = item.isMR && item.id === visit.id;
                          const isActive = idx === queueStats.activeItemIndex;

                          let bgColor = 'bg-yellow-500/20 border border-yellow-500/40'; // Upcoming/Waiting
                          if (isSeen) bgColor = 'bg-red-600'; // Done
                          else if (isActive) bgColor = 'bg-green-500 animate-pulse'; // Inside
                          else if (isMe) bgColor = 'bg-blue-500'; // Me

                          return (
                            <div 
                              key={item.id} 
                              className={`flex-1 ${bgColor} transition-colors duration-500`}
                              title={`${item.isPatient ? 'Patient' : 'MR'} ${isSeen ? '(Seen)' : isActive ? '(In Chamber)' : isMe ? '(You)' : '(Waiting)'}`}
                            />
                          );
                        })}
                      </div>
                      <div className="flex justify-between mt-2 text-[10px] text-gray-500 font-medium">
                        <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-red-600" /> Done</div>
                        <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-green-500" /> In Chamber</div>
                        <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-blue-500" /> You</div>
                        <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-yellow-500" /> Waiting</div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
