import { useState, useEffect, useMemo, useRef } from 'react';
import { Monitor, RefreshCw, Maximize2, Minimize2, Clock, CheckCircle, FlaskConical, FileCheck } from 'lucide-react';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { db } from '../lib/firebase/config';
import { collection, query, where, onSnapshot } from 'firebase/firestore';

interface LabQueueDisplayProps {
  labId: string;
  labName?: string;
}

interface QueueRow {
  id: string;
  serial: number | string;
  patientName: string;
  tests: string;
  branchName: string;
  timeSlot: string;
  status: 'waiting' | 'collected' | 'reported';
  isHome: boolean;
}

export default function LabQueueDisplay({ labId, labName }: LabQueueDisplayProps) {
  const [rows, setRows] = useState<QueueRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [today, setToday] = useState(() => new Date().toISOString().split('T')[0]);
  const [now, setNow] = useState(new Date());
  const [fullscreen, setFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    const dayT = setInterval(() => setToday(new Date().toISOString().split('T')[0]), 60_000);
    return () => { clearInterval(t); clearInterval(dayT); };
  }, []);

  useEffect(() => {
    if (!labId) return;
    setLoading(true);
    const q = query(collection(db, 'labBookings'), where('labId', '==', labId), where('bookingDate', '==', today));
    const unsub = onSnapshot(q, (snap) => {
      const out: QueueRow[] = [];
      snap.forEach(d => {
        const data: any = d.data();
        if (data.isCancelled || data.status === 'cancelled') return;
        const tests = (Array.isArray(data.selectedTests) ? data.selectedTests : data.tests || []) as any[];
        const status: QueueRow['status'] =
          data.reportSent ? 'reported' :
          data.sampleCollected ? 'collected' : 'waiting';
        out.push({
          id: d.id,
          serial: data.serialNo || data.tokenNumber || '#',
          patientName: data.patientName || 'Unknown',
          tests: tests.map(t => t?.name || t?.testName).filter(Boolean).slice(0, 3).join(', ') || '—',
          branchName: data.branchName || '',
          timeSlot: data.timeSlot || data.slotName || '',
          status,
          isHome: data.collectionType === 'home-collection',
        });
      });
      out.sort((a, b) => Number(a.serial) - Number(b.serial));
      setRows(out);
      setLoading(false);
    }, () => setLoading(false));
    return () => unsub();
  }, [labId, today]);

  const counts = useMemo(() => {
    return {
      waiting: rows.filter(r => r.status === 'waiting').length,
      collected: rows.filter(r => r.status === 'collected').length,
      reported: rows.filter(r => r.status === 'reported').length,
    };
  }, [rows]);

  const toggleFullscreen = async () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      await containerRef.current.requestFullscreen();
      setFullscreen(true);
    } else {
      await document.exitFullscreen();
      setFullscreen(false);
    }
  };

  useEffect(() => {
    const onFs = () => setFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onFs);
    return () => document.removeEventListener('fullscreenchange', onFs);
  }, []);

  const statusCls = (s: QueueRow['status']) => {
    if (s === 'waiting') return 'bg-amber-500/20 text-amber-300';
    if (s === 'collected') return 'bg-blue-500/20 text-blue-300';
    return 'bg-emerald-500/20 text-emerald-300';
  };
  const statusLabel = (s: QueueRow['status']) =>
    s === 'waiting' ? 'WAITING' : s === 'collected' ? 'SAMPLE COLLECTED' : 'REPORT READY';

  return (
    <div ref={containerRef} className="bg-zinc-950">
      <Card className="bg-zinc-900 border-zinc-800">
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h2 className="text-white text-2xl font-bold flex items-center gap-2">
                <Monitor className="w-6 h-6 text-cyan-500" /> Live Queue Display
              </h2>
              <p className="text-gray-400 text-sm mt-1">
                {labName || 'Lab'} · {new Date(today).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' })} · {now.toLocaleTimeString('en-IN')}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" className="border-zinc-700 text-gray-300" onClick={toggleFullscreen}>
                {fullscreen ? <Minimize2 className="w-4 h-4 mr-1" /> : <Maximize2 className="w-4 h-4 mr-1" />}
                {fullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
              </Button>
              <span className="text-[11px] text-gray-500 flex items-center gap-1">
                <RefreshCw className="w-3 h-3 animate-spin" /> Live
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-3 gap-4 mt-6">
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="pt-6 text-center">
            <Clock className="w-6 h-6 text-amber-400 mx-auto mb-2" />
            <div className="text-4xl font-bold text-amber-400">{counts.waiting}</div>
            <div className="text-xs text-gray-400 mt-1 font-bold uppercase tracking-widest">Waiting</div>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="pt-6 text-center">
            <FlaskConical className="w-6 h-6 text-blue-400 mx-auto mb-2" />
            <div className="text-4xl font-bold text-blue-400">{counts.collected}</div>
            <div className="text-xs text-gray-400 mt-1 font-bold uppercase tracking-widest">Sample Collected</div>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="pt-6 text-center">
            <FileCheck className="w-6 h-6 text-emerald-400 mx-auto mb-2" />
            <div className="text-4xl font-bold text-emerald-400">{counts.reported}</div>
            <div className="text-xs text-gray-400 mt-1 font-bold uppercase tracking-widest">Report Ready</div>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-zinc-900 border-zinc-800 mt-6">
        <CardContent className="pt-6">
          {loading ? (
            <div className="text-gray-500 text-center py-12">Loading…</div>
          ) : rows.length === 0 ? (
            <div className="text-gray-500 text-center py-12">No bookings today.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left text-[11px] text-gray-400 uppercase tracking-wider border-b border-zinc-800">
                    <th className="py-3 font-semibold">Token</th>
                    <th className="py-3 font-semibold">Patient</th>
                    <th className="py-3 font-semibold">Tests</th>
                    <th className="py-3 font-semibold">Branch</th>
                    <th className="py-3 font-semibold">Slot</th>
                    <th className="py-3 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map(r => (
                    <tr key={r.id} className="border-b border-zinc-800/60 last:border-0">
                      <td className="py-4">
                        <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center">
                          <span className="text-cyan-300 font-bold text-lg">{r.serial}</span>
                        </div>
                      </td>
                      <td className="py-4 text-white text-lg font-semibold">
                        {r.patientName}
                        {r.isHome && <span className="ml-2 text-[10px] font-bold bg-violet-500/20 text-violet-300 px-2 py-0.5 rounded-full">HOME</span>}
                      </td>
                      <td className="py-4 text-gray-300">{r.tests}</td>
                      <td className="py-4 text-gray-400 text-sm">{r.branchName || '—'}</td>
                      <td className="py-4 text-gray-400 text-sm">{r.timeSlot || '—'}</td>
                      <td className="py-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${statusCls(r.status)}`}>
                          {statusLabel(r.status)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
