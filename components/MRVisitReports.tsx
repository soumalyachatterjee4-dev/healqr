import { useState } from 'react';
import { Calendar, Loader2, FileDown, AlertCircle } from 'lucide-react';
import { Button } from './ui/button';
import { toast } from 'sonner';
import { db } from '../lib/firebase/config';
import { collection, query, where, getDocs } from 'firebase/firestore';

interface MRVisitReportsProps {
  mrId: string;
}

export default function MRVisitReports({ mrId }: MRVisitReportsProps) {
  const [reportStartDate, setReportStartDate] = useState('');
  const [reportEndDate, setReportEndDate] = useState('');
  const [reportData, setReportData] = useState<any[]>([]);
  const [reportLoading, setReportLoading] = useState(false);

  const fetchReports = async () => {
    if (!db || !mrId || !reportStartDate || !reportEndDate) {
      toast.error('Please select both start and end dates');
      return;
    }
    setReportLoading(true);
    try {
      const q = query(
        collection(db, 'mrBookings'),
        where('mrId', '==', mrId)
      );
      const snap = await getDocs(q);
      let data = snap.docs.map(doc => doc.data());
      
      // Filter dates client-side to avoid Firestore composite index requirement
      data = data.filter(visit => {
        return visit.appointmentDate >= reportStartDate && visit.appointmentDate <= reportEndDate;
      });

      // Sort by date descending
      data.sort((a, b) => new Date(b.appointmentDate).getTime() - new Date(a.appointmentDate).getTime());
      setReportData(data);
      if (data.length === 0) toast.info('No visits found in this date range');
    } catch (error) {
      console.error(error);
      toast.error('Failed to load reports');
    } finally {
      setReportLoading(false);
    }
  };

  const downloadCSV = () => {
    if (reportData.length === 0) return;
    const headers = ['Date', 'Doctor Name', 'Chamber', 'Type', 'Status'];
    const csvContent = [
      headers.join(','),
      ...reportData.map(row => [
        row.appointmentDate,
        `"Dr. ${row.doctorName}"`,
        `"${row.chamberName || 'N/A'}"`,
        row.isSpecial ? 'Special Appointment' : 'Regular Visit',
        row.status
      ].join(','))
    ].join('\r\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `visit_report_${reportStartDate}_to_${reportEndDate}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 mb-4">
        <p className="text-sm text-blue-400 font-medium flex items-center gap-2">
          <AlertCircle className="w-4 h-4" /> Please Note
        </p>
        <p className="text-xs text-blue-300/80 mt-1">
          System clears data automatically to prevent overloading. Download your visit history of the last month between the 1st and 10th of every month. Otherwise, the system will overwrite the data after 40 days.
        </p>
      </div>
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div>
            <label className="block text-xs text-gray-400 mb-1">Start Date</label>
            <input type="date" value={reportStartDate} onChange={e => setReportStartDate(e.target.value)} className="w-full bg-zinc-800 border-zinc-700 rounded-lg px-3 py-2 text-sm text-white [color-scheme:dark]" />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">End Date</label>
            <input type="date" value={reportEndDate} onChange={e => setReportEndDate(e.target.value)} className="w-full bg-zinc-800 border-zinc-700 rounded-lg px-3 py-2 text-sm text-white [color-scheme:dark]" />
          </div>
        </div>
        <Button onClick={fetchReports} disabled={reportLoading || !reportStartDate || !reportEndDate} className="w-full bg-blue-600 hover:bg-blue-700 text-sm text-white">
          {reportLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Generate Report'}
        </Button>
      </div>

      {reportData.length > 0 && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-medium text-sm text-white">Report Results ({reportData.length})</h3>
            <Button onClick={downloadCSV} size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-xs flex items-center gap-2 text-white">
              <FileDown className="w-3 h-3" /> Download CSV
            </Button>
          </div>
          <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
            {reportData.map((visit, i) => (
              <div key={i} className="bg-zinc-800/50 rounded-lg p-3 flex justify-between items-center text-sm">
                <div>
                  <p className="font-medium text-white">Dr. {visit.doctorName}</p>
                  <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5"><Calendar className="w-3 h-3" /> {visit.appointmentDate} at {visit.chamberName}</p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className={`text-[10px] px-2 py-0.5 rounded-full ${visit.isSpecial ? 'bg-purple-500/10 text-purple-400' : 'bg-blue-500/10 text-blue-400'}`}>
                    {visit.isSpecial ? 'Special' : 'Regular'}
                  </span>
                  <p className={`text-[10px] font-bold uppercase ${visit.status === 'met' || visit.isMet ? 'text-emerald-500' : 'text-zinc-500'}`}>
                    {visit.status === 'met' || visit.isMet ? 'Visit Made' : 'Pending'}
                  </p>
                  <p className="text-[10px] text-gray-500 capitalize">{visit.status}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
