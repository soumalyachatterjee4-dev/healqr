import { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import {
  Search, Eye, Send, Copy, RefreshCw, FileText, Filter, Calendar, X,
  CheckCircle2, AlertTriangle, Clock, Mail, Phone, Hash,
} from 'lucide-react';
import { toast } from 'sonner';
import { db } from '../lib/firebase/config';
import {
  collection, query, where, onSnapshot, doc, updateDoc, Timestamp,
} from 'firebase/firestore';
import { sendLabReportReady } from '../services/notificationService';

interface LabReportSearchProps {
  labId: string;
  labName?: string;
}

interface ReportRow {
  id: string;
  bookingId: string;
  patientName: string;
  patientPhone: string;
  patientAge?: string;
  patientGender?: string;
  labId: string;
  labName: string;
  branchName?: string;
  bookingDate: string;
  tests: Array<{ testName?: string; name?: string; category?: string }>;
  status: string;
  sampleCollected?: boolean;
  reportPdfUrl?: string;
  reportFileName?: string;
  reportUploadedAt?: string;
  reportSent?: boolean;
  reportSentAt?: string;
  reportFcmSuccess?: boolean;
  reportFcmError?: string;
  language?: string;
  createdAt?: Timestamp;
}

type DeliveryFilter = 'all' | 'uploaded' | 'delivered' | 'push-failed' | 'not-sent' | 'no-report';

export default function LabReportSearch({ labId, labName }: LabReportSearchProps) {
  const [rows, setRows] = useState<ReportRow[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [q, setQ] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [deliveryFilter, setDeliveryFilter] = useState<DeliveryFilter>('all');
  const [testName, setTestName] = useState<string>('all');
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 25;

  // Row actions
  const [rowBusy, setRowBusy] = useState<Record<string, boolean>>({});
  const [selected, setSelected] = useState<ReportRow | null>(null);

  /* ─────── Realtime data ─────── */
  useEffect(() => {
    if (!labId) { setLoading(false); return; }
    const qy = query(collection(db, 'labBookings'), where('labId', '==', labId));
    const unsub = onSnapshot(qy, (snap) => {
      const list: ReportRow[] = snap.docs.map((d) => {
        const data: any = d.data();
        return {
          id: d.id,
          bookingId: data.bookingId || '',
          patientName: data.patientName || 'Unknown',
          patientPhone: data.patientPhone || '',
          patientAge: data.patientAge || '',
          patientGender: data.patientGender || '',
          labId: data.labId,
          labName: data.labName || labName || 'Lab',
          branchName: data.branchName || '',
          bookingDate: data.bookingDate || '',
          tests: Array.isArray(data.tests) ? data.tests : Array.isArray(data.selectedTests) ? data.selectedTests : [],
          status: data.status || 'booked',
          sampleCollected: !!data.sampleCollected,
          reportPdfUrl: data.reportPdfUrl || '',
          reportFileName: data.reportFileName || '',
          reportUploadedAt: data.reportUploadedAt || '',
          reportSent: !!data.reportSent,
          reportSentAt: data.reportSentAt || '',
          reportFcmSuccess: data.reportFcmSuccess,
          reportFcmError: data.reportFcmError || '',
          language: data.language || 'english',
          createdAt: data.createdAt,
        };
      });
      setRows(list);
      setLoading(false);
    }, (err) => {
      console.error('[LabReportSearch] snapshot error:', err);
      setLoading(false);
    });
    return () => unsub();
  }, [labId, labName]);

  /* ─────── Unique tests list for filter ─────── */
  const uniqueTests = useMemo(() => {
    const set = new Set<string>();
    rows.forEach(r => r.tests.forEach((t: any) => {
      const n = t?.testName || t?.name;
      if (n) set.add(String(n));
    }));
    return Array.from(set).sort();
  }, [rows]);

  /* ─────── Filtered results ─────── */
  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return rows
      .filter(r => {
        // text search
        if (needle) {
          const hay = `${r.patientName} ${r.patientPhone} ${r.bookingId} ${r.reportFileName || ''}`.toLowerCase();
          if (!hay.includes(needle)) return false;
        }
        // date range (booking date)
        if (dateFrom && r.bookingDate && r.bookingDate < dateFrom) return false;
        if (dateTo && r.bookingDate && r.bookingDate > dateTo) return false;
        // test filter
        if (testName !== 'all') {
          const has = r.tests.some((t: any) => (t?.testName || t?.name) === testName);
          if (!has) return false;
        }
        // delivery filter
        switch (deliveryFilter) {
          case 'uploaded': return !!r.reportPdfUrl;
          case 'delivered': return !!r.reportPdfUrl && r.reportSent && r.reportFcmSuccess === true;
          case 'push-failed': return !!r.reportPdfUrl && r.reportSent && r.reportFcmSuccess === false;
          case 'not-sent': return !!r.reportPdfUrl && !r.reportSent;
          case 'no-report': return !r.reportPdfUrl && r.sampleCollected && r.status !== 'cancelled' && r.status !== 'rejected';
          case 'all':
          default: return true;
        }
      })
      .sort((a, b) => {
        // newest upload first, then newest booking
        const aKey = a.reportUploadedAt || a.bookingDate || '';
        const bKey = b.reportUploadedAt || b.bookingDate || '';
        return bKey.localeCompare(aKey);
      });
  }, [rows, q, dateFrom, dateTo, testName, deliveryFilter]);

  useEffect(() => { setPage(1); }, [q, dateFrom, dateTo, testName, deliveryFilter]);

  const pageRows = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, page]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));

  /* ─────── Stats for filter chips ─────── */
  const stats = useMemo(() => {
    let uploaded = 0, delivered = 0, failed = 0, notSent = 0, noReport = 0;
    rows.forEach(r => {
      if (r.reportPdfUrl) {
        uploaded++;
        if (r.reportSent) {
          if (r.reportFcmSuccess === true) delivered++;
          else if (r.reportFcmSuccess === false) failed++;
        } else {
          notSent++;
        }
      } else if (r.sampleCollected && r.status !== 'cancelled' && r.status !== 'rejected') {
        noReport++;
      }
    });
    return { total: rows.length, uploaded, delivered, failed, notSent, noReport };
  }, [rows]);

  /* ─────── Actions ─────── */
  const resend = useCallback(async (r: ReportRow) => {
    if (!r.reportPdfUrl) { toast.info('Upload a report first'); return; }
    setRowBusy(p => ({ ...p, [r.id]: true }));
    try {
      const testsSummary = (r.tests || []).map((t: any) => t.testName || t.name).filter(Boolean).slice(0, 5).join(', ');
      const result = await sendLabReportReady({
        patientPhone: r.patientPhone,
        patientName: r.patientName,
        labId: r.labId,
        labName: r.labName,
        branchName: r.branchName,
        bookingId: r.bookingId,
        reportPdfUrl: r.reportPdfUrl,
        reportFileName: r.reportFileName,
        language: r.language || 'english',
        testsSummary,
      });
      const ok = result?.success !== false;
      await updateDoc(doc(db, 'labBookings', r.id), {
        reportSent: true,
        reportSentAt: new Date().toISOString(),
        reportFcmSuccess: ok,
        reportFcmError: result?.error || null,
      });
      toast[ok ? 'success' : 'warning'](ok ? `Report resent to ${r.patientName}` : 'Push failed; saved to patient inbox');
    } catch (err) {
      console.error('Resend failed:', err);
      toast.error('Resend failed');
    } finally {
      setRowBusy(p => ({ ...p, [r.id]: false }));
    }
  }, []);

  const copyLink = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      toast.success('Report link copied');
    } catch { toast.error('Copy failed'); }
  };

  const clearFilters = () => {
    setQ(''); setDateFrom(''); setDateTo(''); setDeliveryFilter('all'); setTestName('all');
  };

  /* ─────── Render ─────── */
  return (
    <div className="space-y-6">
      {/* Header + search */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardContent className="pt-6 space-y-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h2 className="text-white text-2xl font-bold flex items-center gap-2">
                <Search className="w-6 h-6 text-purple-500" />
                Report Search
              </h2>
              <p className="text-gray-400 text-sm mt-1">Look up any uploaded report by patient, booking, date or test.</p>
            </div>
            <div className="relative w-full md:w-96">
              <Search className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input value={q} onChange={(e) => setQ(e.target.value)}
                placeholder="Patient name, phone, booking ID, filename…"
                className="w-full bg-zinc-950 border border-zinc-800 text-white text-sm rounded-lg pl-9 pr-3 py-2 outline-none focus:border-purple-500" />
              {q && (
                <button onClick={() => setQ('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Filters row */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1 text-xs text-gray-400">
              <Calendar className="w-3.5 h-3.5" /> Date:
            </div>
            <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)}
              className="bg-zinc-950 border border-zinc-800 text-white text-xs rounded px-2 py-1.5 outline-none focus:border-purple-500" />
            <span className="text-xs text-gray-500">to</span>
            <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)}
              className="bg-zinc-950 border border-zinc-800 text-white text-xs rounded px-2 py-1.5 outline-none focus:border-purple-500" />

            <Select value={testName} onValueChange={setTestName}>
              <SelectTrigger className="w-[180px] bg-zinc-950 border-zinc-800 text-gray-200 text-xs h-8">
                <Filter className="w-3.5 h-3.5 mr-2 text-purple-500" />
                <SelectValue placeholder="All tests" />
              </SelectTrigger>
              <SelectContent className="bg-zinc-900 border-zinc-800 text-gray-200 max-h-64">
                <SelectItem value="all">All tests</SelectItem>
                {uniqueTests.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>

            {(q || dateFrom || dateTo || testName !== 'all' || deliveryFilter !== 'all') && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="h-8 text-xs text-gray-400 hover:text-white">
                <X className="w-3 h-3 mr-1" /> Clear
              </Button>
            )}
          </div>

          {/* Status filter chips */}
          <div className="flex flex-wrap gap-2">
            <FilterChip active={deliveryFilter === 'all'} onClick={() => setDeliveryFilter('all')}
              label="All" count={stats.total} color="slate" />
            <FilterChip active={deliveryFilter === 'uploaded'} onClick={() => setDeliveryFilter('uploaded')}
              label="Uploaded" count={stats.uploaded} color="blue" Icon={FileText} />
            <FilterChip active={deliveryFilter === 'delivered'} onClick={() => setDeliveryFilter('delivered')}
              label="Delivered" count={stats.delivered} color="emerald" Icon={CheckCircle2} />
            <FilterChip active={deliveryFilter === 'push-failed'} onClick={() => setDeliveryFilter('push-failed')}
              label="Push Failed" count={stats.failed} color="amber" Icon={AlertTriangle} />
            <FilterChip active={deliveryFilter === 'not-sent'} onClick={() => setDeliveryFilter('not-sent')}
              label="Not Sent" count={stats.notSent} color="purple" Icon={Clock} />
            <FilterChip active={deliveryFilter === 'no-report'} onClick={() => setDeliveryFilter('no-report')}
              label="Pending Upload" count={stats.noReport} color="orange" Icon={Clock} />
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-white text-base flex items-center justify-between">
            <span>Results</span>
            <span className="text-xs text-gray-400 font-normal">{filtered.length} matching</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-10 text-gray-500 text-sm">Loading…</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12">
              <Search className="w-10 h-10 text-purple-500/30 mx-auto mb-3" />
              <h3 className="text-white font-semibold">No matches</h3>
              <p className="text-gray-500 text-sm mt-1">Try adjusting filters or search query.</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-[11px] text-gray-400 uppercase tracking-wider border-b border-zinc-800">
                      <th className="py-2 font-semibold">Patient</th>
                      <th className="py-2 font-semibold">Booking</th>
                      <th className="py-2 font-semibold">Tests</th>
                      <th className="py-2 font-semibold">Status</th>
                      <th className="py-2 font-semibold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pageRows.map(r => (
                      <tr key={r.id} className="border-b border-zinc-800/60 last:border-0 hover:bg-zinc-950/50">
                        <td className="py-3 align-top">
                          <div className="text-white font-medium">{r.patientName}</div>
                          <div className="text-[11px] text-gray-500 flex items-center gap-1 mt-0.5">
                            <Phone className="w-3 h-3" />{r.patientPhone}
                          </div>
                        </td>
                        <td className="py-3 align-top">
                          <code className="text-[11px] text-purple-300 bg-purple-500/10 px-2 py-0.5 rounded flex items-center gap-1 w-fit">
                            <Hash className="w-3 h-3" />{r.bookingId}
                          </code>
                          <div className="text-[11px] text-gray-500 mt-1">{r.bookingDate}</div>
                          {r.branchName && <div className="text-[10px] text-gray-600">{r.branchName}</div>}
                        </td>
                        <td className="py-3 align-top">
                          <div className="text-gray-300 text-xs">
                            {r.tests.slice(0, 2).map((t: any) => t.testName || t.name || '').filter(Boolean).join(', ')}
                            {r.tests.length > 2 && <span className="text-gray-500"> +{r.tests.length - 2}</span>}
                          </div>
                        </td>
                        <td className="py-3 align-top">
                          <StatusBadge row={r} />
                          {r.reportUploadedAt && (
                            <div className="text-[10px] text-gray-500 mt-1">Up: {new Date(r.reportUploadedAt).toLocaleDateString()}</div>
                          )}
                          {r.reportSentAt && r.reportSent && (
                            <div className="text-[10px] text-gray-500">Sent: {new Date(r.reportSentAt).toLocaleDateString()}</div>
                          )}
                        </td>
                        <td className="py-3 text-right align-top">
                          <div className="inline-flex gap-1">
                            {r.reportPdfUrl && (
                              <>
                                <a href={r.reportPdfUrl} target="_blank" rel="noopener noreferrer"
                                  title="View PDF"
                                  className="text-[11px] inline-flex items-center gap-1 px-2 py-1 rounded bg-zinc-800 text-gray-200 hover:bg-zinc-700">
                                  <Eye className="w-3 h-3" />
                                </a>
                                <button onClick={() => copyLink(r.reportPdfUrl!)}
                                  title="Copy link"
                                  className="text-[11px] inline-flex items-center gap-1 px-2 py-1 rounded bg-zinc-800 text-gray-200 hover:bg-zinc-700">
                                  <Copy className="w-3 h-3" />
                                </button>
                                <Button size="sm" onClick={() => resend(r)} disabled={!!rowBusy[r.id]}
                                  title={r.reportSent ? 'Resend notification' : 'Send notification'}
                                  className="h-7 text-[11px] bg-purple-600 hover:bg-purple-700 text-white">
                                  {rowBusy[r.id]
                                    ? <RefreshCw className="w-3 h-3 animate-spin" />
                                    : <Send className="w-3 h-3" />}
                                </Button>
                              </>
                            )}
                            <button onClick={() => setSelected(r)}
                              title="Details"
                              className="text-[11px] inline-flex items-center gap-1 px-2 py-1 rounded bg-zinc-800 text-gray-200 hover:bg-zinc-700">
                              <Mail className="w-3 h-3" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between pt-4 border-t border-zinc-800 mt-4 text-xs text-gray-400">
                  <span>Page {page} / {totalPages} · showing {pageRows.length} of {filtered.length}</span>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                      className="h-7 text-xs text-gray-300">Prev</Button>
                    <Button variant="ghost" size="sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                      className="h-7 text-xs text-gray-300">Next</Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Details modal */}
      {selected && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={() => setSelected(null)}>
          <Card className="bg-zinc-900 border-zinc-800 w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
            <CardHeader className="flex flex-row items-start justify-between space-y-0">
              <div>
                <CardTitle className="text-white">{selected.patientName}</CardTitle>
                <p className="text-xs text-gray-500 mt-1">{selected.patientPhone} · {selected.bookingId}</p>
              </div>
              <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <Row label="Booking date" value={selected.bookingDate} />
              <Row label="Branch" value={selected.branchName || '—'} />
              <Row label="Age / Sex" value={`${selected.patientAge || '—'} / ${selected.patientGender || '—'}`} />
              <Row label="Language" value={selected.language} />
              <Row label="Status" value={<StatusBadge row={selected} />} />
              <Row label="Tests" value={
                <div className="text-gray-300 text-xs space-y-0.5">
                  {selected.tests.length === 0 ? '—' : selected.tests.map((t: any, i) => (
                    <div key={i}>• {t.testName || t.name} {t.category ? <span className="text-gray-500">({t.category})</span> : null}</div>
                  ))}
                </div>
              } />
              {selected.reportPdfUrl && (
                <>
                  <Row label="Uploaded" value={selected.reportUploadedAt ? new Date(selected.reportUploadedAt).toLocaleString() : '—'} />
                  <Row label="File" value={selected.reportFileName || '—'} />
                  {selected.reportSent && (
                    <>
                      <Row label="Sent at" value={selected.reportSentAt ? new Date(selected.reportSentAt).toLocaleString() : '—'} />
                      <Row label="Push result" value={
                        selected.reportFcmSuccess
                          ? <span className="text-emerald-400">✅ Delivered</span>
                          : <span className="text-amber-400">⚠ {selected.reportFcmError || 'Failed'}</span>
                      } />
                    </>
                  )}
                </>
              )}
              <div className="flex gap-2 justify-end pt-2">
                {selected.reportPdfUrl && (
                  <a href={selected.reportPdfUrl} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-3 py-2 rounded bg-zinc-800 text-gray-200 hover:bg-zinc-700 text-xs">
                    <Eye className="w-3.5 h-3.5" /> Open PDF
                  </a>
                )}
                {selected.reportPdfUrl && (
                  <Button onClick={() => resend(selected)} disabled={!!rowBusy[selected.id]}
                    className="bg-purple-600 hover:bg-purple-700 text-white text-xs h-9">
                    {rowBusy[selected.id] ? <RefreshCw className="w-3.5 h-3.5 mr-2 animate-spin" /> : <Send className="w-3.5 h-3.5 mr-2" />}
                    {selected.reportSent ? 'Resend to patient' : 'Send to patient'}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

/* ─────────── sub components ─────────── */
function FilterChip({ active, onClick, label, count, color, Icon }: {
  active: boolean; onClick: () => void; label: string; count: number; color: string; Icon?: any;
}) {
  const base = active
    ? `bg-${color}-500/20 text-${color}-200 border-${color}-500/40`
    : 'bg-zinc-950 text-gray-400 border-zinc-800 hover:border-zinc-700';
  return (
    <button onClick={onClick}
      className={`text-xs px-3 py-1.5 rounded-full border transition-colors inline-flex items-center gap-1.5 ${base}`}>
      {Icon && <Icon className="w-3 h-3" />}
      {label}
      <span className="text-[10px] px-1.5 py-0.5 rounded bg-black/30">{count}</span>
    </button>
  );
}

function StatusBadge({ row }: { row: ReportRow }) {
  if (!row.reportPdfUrl) {
    if (row.sampleCollected) {
      return <span className="text-[11px] px-2 py-0.5 rounded bg-orange-500/15 text-orange-400">Pending upload</span>;
    }
    return <span className="text-[11px] px-2 py-0.5 rounded bg-zinc-800 text-gray-400">No sample</span>;
  }
  if (!row.reportSent) {
    return <span className="text-[11px] px-2 py-0.5 rounded bg-blue-500/15 text-blue-400">Uploaded · not sent</span>;
  }
  if (row.reportFcmSuccess === true) {
    return <span className="text-[11px] px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400">📱 Delivered</span>;
  }
  if (row.reportFcmSuccess === false) {
    return <span className="text-[11px] px-2 py-0.5 rounded bg-yellow-500/15 text-yellow-400" title={row.reportFcmError}>⚠ Push failed</span>;
  }
  return <span className="text-[11px] px-2 py-0.5 rounded bg-zinc-800 text-gray-300">Sent</span>;
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4 border-b border-zinc-800/60 pb-2">
      <span className="text-gray-400 text-xs">{label}</span>
      <span className="text-gray-200 text-right">{value}</span>
    </div>
  );
}
