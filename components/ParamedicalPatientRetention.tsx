import { useEffect, useMemo, useState } from 'react';
import { db } from '../lib/firebase/config';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { Loader2, Users, Repeat2, AlertTriangle, MessageCircle, TrendingUp } from 'lucide-react';
import { Button } from './ui/button';

interface ParamedicalPatientRetentionProps {
  paraId: string;
  paraName?: string;
}

interface PatientStat {
  phone: string;
  name: string;
  visits: number;
  lastVisit: string;
  totalSpend: number;
}

const winBackTemplate = (name: string, paraName: string) =>
  `Hi ${name || 'there'}, this is ${paraName || 'your healthcare professional'} from HealQR. ` +
  `It's been a while since your last visit — would you like to book a follow-up session? Reply YES to confirm.`;

export default function ParamedicalPatientRetention({ paraId, paraName }: ParamedicalPatientRetentionProps) {
  const [loading, setLoading] = useState(true);
  const [bookings, setBookings] = useState<any[]>([]);

  useEffect(() => {
    if (!paraId) { setLoading(false); return; }
    (async () => {
      try {
        const snap = await getDocs(query(
          collection(db, 'paramedicalBookings'),
          where('paramedicalId', '==', paraId)
        ));
        setBookings(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (e) {
        console.error('[ParamedicalPatientRetention] load failed', e);
      } finally {
        setLoading(false);
      }
    })();
  }, [paraId]);

  const patients = useMemo<PatientStat[]>(() => {
    const map = new Map<string, PatientStat>();
    bookings.forEach((b: any) => {
      const phone = (b.patientPhone || '').replace(/\D/g, '').slice(-10);
      if (!phone) return;
      if (!map.has(phone)) {
        map.set(phone, {
          phone,
          name: b.patientName || 'Patient',
          visits: 0,
          lastVisit: '',
          totalSpend: 0,
        });
      }
      const p = map.get(phone)!;
      p.visits += 1;
      p.totalSpend += Number(b.amount || 0);
      const d = b.appointmentDate || '';
      if (d > p.lastVisit) p.lastVisit = d;
      if (b.patientName) p.name = b.patientName;
    });
    return Array.from(map.values()).sort((a, b) => b.visits - a.visits);
  }, [bookings]);

  const today = new Date();
  const stats = useMemo(() => {
    const total = patients.length;
    const repeat = patients.filter(p => p.visits >= 2).length;
    const inactive = patients.filter(p => {
      if (!p.lastVisit) return true;
      const days = Math.floor((today.getTime() - new Date(p.lastVisit).getTime()) / 86400000);
      return days > 60;
    }).length;
    const retentionRate = total ? Math.round((repeat / total) * 100) : 0;
    return { total, repeat, inactive, retentionRate };
  }, [patients]);

  const segments = useMemo(() => {
    const loyal = patients.filter(p => p.visits >= 4);
    const repeat = patients.filter(p => p.visits === 2 || p.visits === 3);
    const oneTime = patients.filter(p => p.visits === 1);
    const inactive = patients.filter(p => {
      if (!p.lastVisit) return false;
      const days = Math.floor((today.getTime() - new Date(p.lastVisit).getTime()) / 86400000);
      return days > 60;
    });
    return { loyal, repeat, oneTime, inactive };
  }, [patients]);

  const sendWinBack = (p: PatientStat) => {
    const msg = encodeURIComponent(winBackTemplate(p.name, paraName || 'your professional'));
    window.open(`https://wa.me/91${p.phone}?text=${msg}`, '_blank');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400">
        <Loader2 className="w-6 h-6 animate-spin mr-2" /> Loading retention data…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KPI label="Total Patients" value={stats.total} icon={Users} color="text-teal-400" />
        <KPI label="Repeat Patients" value={stats.repeat} icon={Repeat2} color="text-emerald-400" />
        <KPI label="Inactive (60+ days)" value={stats.inactive} icon={AlertTriangle} color="text-orange-400" />
        <KPI label="Retention Rate" value={`${stats.retentionRate}%`} icon={TrendingUp} color="text-purple-400" />
      </div>

      {/* Segments */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <SegmentCard title="Loyal (4+ visits)" patients={segments.loyal} color="emerald" onAction={sendWinBack} actionLabel="Thank" />
        <SegmentCard title="Repeat (2-3 visits)" patients={segments.repeat} color="teal" onAction={sendWinBack} actionLabel="Engage" />
        <SegmentCard title="One-time" patients={segments.oneTime} color="purple" onAction={sendWinBack} actionLabel="Win back" />
        <SegmentCard title="Inactive (60+ days)" patients={segments.inactive} color="orange" onAction={sendWinBack} actionLabel="Win back" />
      </div>
    </div>
  );
}

function KPI({ label, value, icon: Icon, color }: any) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
      <div className="flex items-center gap-2 mb-2">
        <Icon className={`w-4 h-4 ${color}`} />
        <p className="text-gray-400 text-xs">{label}</p>
      </div>
      <p className="text-white text-2xl font-bold">{value}</p>
    </div>
  );
}

function SegmentCard({ title, patients, color, onAction, actionLabel }: any) {
  const colorMap: Record<string, string> = {
    emerald: 'text-emerald-400 border-emerald-500/30',
    teal: 'text-teal-400 border-teal-500/30',
    purple: 'text-purple-400 border-purple-500/30',
    orange: 'text-orange-400 border-orange-500/30',
  };
  return (
    <div className={`bg-zinc-900 border rounded-xl p-5 ${colorMap[color]}`}>
      <h4 className={`font-semibold mb-3 ${colorMap[color].split(' ')[0]}`}>
        {title} <span className="text-gray-500 text-sm">({patients.length})</span>
      </h4>
      {patients.length === 0 ? (
        <p className="text-gray-500 text-xs">No patients in this segment.</p>
      ) : (
        <div className="space-y-2 max-h-72 overflow-y-auto">
          {patients.slice(0, 50).map((p: PatientStat) => (
            <div key={p.phone} className="flex items-center justify-between bg-zinc-800/40 rounded-lg px-3 py-2">
              <div className="min-w-0 flex-1">
                <p className="text-white text-sm truncate">{p.name}</p>
                <p className="text-gray-500 text-xs">{p.visits} visit{p.visits > 1 ? 's' : ''} • last {p.lastVisit || '—'} • ₹{p.totalSpend}</p>
              </div>
              <Button size="sm" variant="outline" className="border-zinc-700 text-emerald-400 hover:bg-emerald-500/10" onClick={() => onAction(p)}>
                <MessageCircle className="w-3.5 h-3.5 mr-1" /> {actionLabel}
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
