import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import {
  Upload, Search, Clock, CheckCircle2, AlertTriangle, FileText, Send, RefreshCw,
  Inbox, History, UploadCloud, X, FilePlus, Eye,
} from 'lucide-react';
import { toast } from 'sonner';
import { db, storage } from '../lib/firebase/config';
import {
  collection, query, where, onSnapshot, doc, updateDoc, Timestamp,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { sendLabReportReady } from '../services/notificationService';

interface LabReportUploadProps {
  labId: string;
  labName?: string;
}

interface ReportBooking {
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
  sampleCollectedAt?: string;
  tests: Array<{ testName: string; category?: string }>;
  status: string;
  sampleCollected?: boolean;
  reportPdfUrl?: string;
  reportFileName?: string;
  reportSource?: string;
  reportUploadedAt?: string;
  reportSent?: boolean;
  reportSentAt?: string;
  reportFcmSuccess?: boolean;
  reportFcmError?: string;
  language?: string;
  createdAt?: Timestamp;
}

type TabType = 'pending' | 'bulk' | 'history';

interface PendingFile {
  file: File;
  matchedBookingId?: string; // document id
  matchedLabel?: string;
  manualMatch?: boolean;
  uploading?: boolean;
  uploaded?: boolean;
  error?: string;
}

export default function LabReportUpload({ labId, labName }: LabReportUploadProps) {
  const [bookings, setBookings] = useState<ReportBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<TabType>('pending');
  const [search, setSearch] = useState('');

  // Pending queue state
  const [rowBusy, setRowBusy] = useState<Record<string, boolean>>({});
  const singleFileInputRef = useRef<HTMLInputElement | null>(null);
  const [singleUploadTargetId, setSingleUploadTargetId] = useState<string | null>(null);

  // Bulk state
  const [bulkFiles, setBulkFiles] = useState<PendingFile[]>([]);
  const bulkInputRef = useRef<HTMLInputElement | null>(null);
  const [bulkProcessing, setBulkProcessing] = useState(false);
  const [bulkDragOver, setBulkDragOver] = useState(false);
  const [matchPickerIdx, setMatchPickerIdx] = useState<number | null>(null);
  const [matchPickerQuery, setMatchPickerQuery] = useState('');

  /* ──────────── Realtime bookings ──────────── */
  useEffect(() => {
    if (!labId) { setLoading(false); return; }
    const q = query(collection(db, 'labBookings'), where('labId', '==', labId));
    const unsub = onSnapshot(q, (snap) => {
      const list = snap.docs.map((d) => {
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
          sampleCollectedAt: data.sampleCollectedAt || '',
          tests: Array.isArray(data.tests) ? data.tests : Array.isArray(data.selectedTests) ? data.selectedTests : [],
          status: data.status || 'booked',
          sampleCollected: !!data.sampleCollected,
          reportPdfUrl: data.reportPdfUrl || '',
          reportFileName: data.reportFileName || '',
          reportSource: data.reportSource || '',
          reportUploadedAt: data.reportUploadedAt || '',
          reportSent: !!data.reportSent,
          reportSentAt: data.reportSentAt || '',
          reportFcmSuccess: data.reportFcmSuccess,
          reportFcmError: data.reportFcmError || '',
          language: data.language || 'english',
          createdAt: data.createdAt,
        } as ReportBooking;
      });
      setBookings(list);
      setLoading(false);
    }, (err) => {
      console.error('[LabReportUpload] snapshot error:', err);
      setLoading(false);
    });
    return () => unsub();
  }, [labId, labName]);

  /* ──────────── Derived lists ──────────── */
  const pending = useMemo(() => {
    return bookings
      .filter(b => b.sampleCollected && !b.reportPdfUrl && b.status !== 'cancelled' && b.status !== 'rejected')
      .filter(b => matchesSearch(b, search))
      .sort((a, b) => (a.sampleCollectedAt || a.bookingDate || '').localeCompare(b.sampleCollectedAt || b.bookingDate || ''));
  }, [bookings, search]);

  const history = useMemo(() => {
    return bookings
      .filter(b => !!b.reportPdfUrl)
      .filter(b => matchesSearch(b, search))
      .sort((a, b) => (b.reportUploadedAt || '').localeCompare(a.reportUploadedAt || ''));
  }, [bookings, search]);

  /* ──────────── Upload + notify helpers ──────────── */
  const uploadReportForBooking = useCallback(async (
    booking: ReportBooking,
    file: Blob,
    fileName: string,
  ): Promise<boolean> => {
    if (!storage) { toast.error('Storage not available'); return false; }
    try {
      const safe = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
      const path = `labs/${labId}/reports/${booking.id}/${Date.now()}_${safe}`;
      const r = ref(storage, path);
      await uploadBytes(r, file, { contentType: 'application/pdf' });
      const url = await getDownloadURL(r);

      await updateDoc(doc(db, 'labBookings', booking.id), {
        reportPdfUrl: url,
        reportFileName: safe,
        reportSource: 'uploaded-pdf',
        reportUploadedAt: new Date().toISOString(),
        reportSent: false,
        status: 'report-ready',
      });
      return true;
    } catch (err) {
      console.error('Upload failed for booking', booking.id, err);
      return false;
    }
  }, [labId]);

  const notifyPatient = useCallback(async (booking: ReportBooking, pdfUrl: string, fileName: string) => {
    try {
      const testsSummary = (booking.tests || []).map(t => (t as any).testName || (t as any).name).filter(Boolean).slice(0, 5).join(', ');
      const result = await sendLabReportReady({
        patientPhone: booking.patientPhone,
        patientName: booking.patientName,
        labId: booking.labId,
        labName: booking.labName,
        branchName: booking.branchName,
        bookingId: booking.bookingId,
        reportPdfUrl: pdfUrl,
        reportFileName: fileName,
        language: booking.language || 'english',
        testsSummary,
      });
      const ok = result?.success !== false;
      await updateDoc(doc(db, 'labBookings', booking.id), {
        reportSent: true,
        reportSentAt: new Date().toISOString(),
        reportFcmSuccess: ok,
        reportFcmError: result?.error || null,
      });
      return ok;
    } catch (err) {
      console.error('Notify failed:', err);
      return false;
    }
  }, []);

  /* ──────────── Pending queue actions ──────────── */
  const handleRowUploadClick = (bookingId: string) => {
    setSingleUploadTargetId(bookingId);
    setTimeout(() => singleFileInputRef.current?.click(), 0);
  };

  const handleSingleFilePicked = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !singleUploadTargetId) return;
    if (file.type !== 'application/pdf') { toast.error('Only PDF files allowed'); return; }
    if (file.size > 8 * 1024 * 1024) { toast.error('Max file size is 8 MB'); return; }

    const booking = bookings.find(b => b.id === singleUploadTargetId);
    if (!booking) return;

    setRowBusy(prev => ({ ...prev, [booking.id]: true }));
    const ok = await uploadReportForBooking(booking, file, file.name);
    if (ok) {
      // auto-send FCM immediately
      const url = await waitForReportUrl(booking.id, bookings);
      if (url) {
        const delivered = await notifyPatient(booking, url, file.name);
        toast[delivered ? 'success' : 'warning'](
          delivered
            ? `Report uploaded & sent to ${booking.patientName}`
            : `Uploaded; push failed — saved to patient inbox`,
        );
      } else {
        toast.success('Report uploaded (tap Send to notify)');
      }
    } else {
      toast.error('Upload failed');
    }
    setRowBusy(prev => ({ ...prev, [booking.id]: false }));
    setSingleUploadTargetId(null);
  };

  const resendReport = async (booking: ReportBooking) => {
    if (!booking.reportPdfUrl) return;
    setRowBusy(prev => ({ ...prev, [booking.id]: true }));
    const ok = await notifyPatient(booking, booking.reportPdfUrl, booking.reportFileName || 'report.pdf');
    toast[ok ? 'success' : 'warning'](ok ? 'Notification re-sent' : 'Push failed; stored in patient inbox');
    setRowBusy(prev => ({ ...prev, [booking.id]: false }));
  };

  /* ──────────── Bulk upload ──────────── */
  const addBulkFiles = useCallback((files: FileList | File[]) => {
    const arr = Array.from(files).filter(f => f.type === 'application/pdf');
    if (arr.length === 0) { toast.error('Only PDF files accepted'); return; }
    const mapped: PendingFile[] = arr.map((file) => {
      const matched = autoMatch(file.name, bookings);
      return {
        file,
        matchedBookingId: matched?.id,
        matchedLabel: matched ? `${matched.patientName} · ${matched.bookingId}` : undefined,
      };
    });
    setBulkFiles(prev => [...prev, ...mapped]);
  }, [bookings]);

  const onBulkDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setBulkDragOver(false);
    if (e.dataTransfer.files?.length) addBulkFiles(e.dataTransfer.files);
  };

  const processBulk = async () => {
    const toUpload = bulkFiles.filter(f => f.matchedBookingId && !f.uploaded);
    if (toUpload.length === 0) { toast.info('No matched files to upload'); return; }
    setBulkProcessing(true);

    const updated = [...bulkFiles];
    let ok = 0, fail = 0, notified = 0;

    for (let i = 0; i < updated.length; i++) {
      const pf = updated[i];
      if (!pf.matchedBookingId || pf.uploaded) continue;
      const booking = bookings.find(b => b.id === pf.matchedBookingId);
      if (!booking) { updated[i] = { ...pf, error: 'Booking not found' }; fail++; continue; }

      updated[i] = { ...pf, uploading: true, error: undefined };
      setBulkFiles([...updated]);

      const uploaded = await uploadReportForBooking(booking, pf.file, pf.file.name);
      if (uploaded) {
        updated[i] = { ...updated[i], uploading: false, uploaded: true };
        setBulkFiles([...updated]);
        ok++;
        // notify
        const url = await waitForReportUrl(booking.id, bookings);
        if (url) {
          const delivered = await notifyPatient(booking, url, pf.file.name);
          if (delivered) notified++;
        }
      } else {
        updated[i] = { ...updated[i], uploading: false, error: 'Upload failed' };
        setBulkFiles([...updated]);
        fail++;
      }
    }

    setBulkProcessing(false);
    if (ok) toast.success(`Uploaded ${ok} report(s); ${notified} patient(s) notified`);
    if (fail) toast.error(`${fail} upload(s) failed`);
  };

  const assignBulkMatch = (idx: number, bookingId: string) => {
    const b = bookings.find(x => x.id === bookingId);
    if (!b) return;
    setBulkFiles(prev => prev.map((pf, i) => i === idx ? {
      ...pf, matchedBookingId: b.id, matchedLabel: `${b.patientName} · ${b.bookingId}`, manualMatch: true, error: undefined,
    } : pf));
    setMatchPickerIdx(null);
    setMatchPickerQuery('');
  };

  const removeBulkFile = (idx: number) => setBulkFiles(prev => prev.filter((_, i) => i !== idx));

  /* ──────────── Render ──────────── */
  const pendingCount = bookings.filter(b => b.sampleCollected && !b.reportPdfUrl && b.status !== 'cancelled' && b.status !== 'rejected').length;
  const historyCount = bookings.filter(b => !!b.reportPdfUrl).length;
  const unmatchedCount = bulkFiles.filter(f => !f.matchedBookingId).length;

  return (
    <div className="space-y-6">
      {/* Hidden inputs */}
      <input ref={singleFileInputRef} type="file" accept="application/pdf" className="hidden" onChange={handleSingleFilePicked} />
      <input ref={bulkInputRef} type="file" accept="application/pdf" multiple className="hidden"
        onChange={(e) => { if (e.target.files) addBulkFiles(e.target.files); e.target.value = ''; }} />

      {/* Header */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h2 className="text-white text-2xl font-bold flex items-center gap-2">
                <Upload className="w-6 h-6 text-purple-500" />
                Report Upload Center
              </h2>
              <p className="text-gray-400 text-sm mt-1">Batch upload, manage pending queue and track delivery to patients.</p>
            </div>
            <div className="relative w-full md:w-80">
              <Search className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input value={search} onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by patient, phone, booking ID"
                className="w-full bg-zinc-950 border border-zinc-800 text-white text-sm rounded-lg pl-9 pr-3 py-2 outline-none focus:border-purple-500" />
            </div>
          </div>

          {/* KPI strip */}
          <div className="grid grid-cols-3 gap-3 mt-6">
            <StatPill label="Pending" value={pendingCount} color="text-amber-400" Icon={Clock} />
            <StatPill label="Uploaded" value={historyCount} color="text-emerald-400" Icon={CheckCircle2} />
            <StatPill label="Bulk Queue" value={bulkFiles.length} color="text-purple-400" Icon={UploadCloud} />
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-zinc-800">
        <TabBtn active={tab === 'pending'} onClick={() => setTab('pending')} Icon={Inbox} label={`Pending Queue (${pendingCount})`} />
        <TabBtn active={tab === 'bulk'} onClick={() => setTab('bulk')} Icon={UploadCloud} label={`Bulk Upload${bulkFiles.length ? ` (${bulkFiles.length})` : ''}`} />
        <TabBtn active={tab === 'history'} onClick={() => setTab('history')} Icon={History} label={`Delivery History (${historyCount})`} />
      </div>

      {/* ─────── PENDING TAB ─────── */}
      {tab === 'pending' && (
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-white text-base flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-500" />
              Samples collected — reports pending
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-10 text-gray-500 text-sm">Loading…</div>
            ) : pending.length === 0 ? (
              <EmptyState icon={CheckCircle2} title="All caught up" description="Every collected sample has a report uploaded. 🎉" />
            ) : (
              <div className="divide-y divide-zinc-800">
                {pending.map(b => (
                  <div key={b.id} className="py-3 flex flex-col md:flex-row md:items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-white font-semibold">{b.patientName}</span>
                        <code className="text-[11px] text-purple-300 bg-purple-500/10 px-2 py-0.5 rounded">{b.bookingId}</code>
                        {b.branchName && <span className="text-[11px] text-gray-500">· {b.branchName}</span>}
                      </div>
                      <div className="text-xs text-gray-400 mt-1 flex flex-wrap gap-x-3 gap-y-1">
                        <span>📞 {b.patientPhone}</span>
                        <span>🗓 {b.bookingDate}</span>
                        {b.sampleCollectedAt && <span>🧪 Collected {new Date(b.sampleCollectedAt).toLocaleDateString()}</span>}
                        <span>🧾 {b.tests.length} test(s)</span>
                      </div>
                    </div>
                    <Button
                      onClick={() => handleRowUploadClick(b.id)}
                      disabled={!!rowBusy[b.id]}
                      className="bg-purple-600 hover:bg-purple-700 text-white text-xs h-9"
                    >
                      {rowBusy[b.id] ? <RefreshCw className="w-3 h-3 mr-2 animate-spin" /> : <FilePlus className="w-3 h-3 mr-2" />}
                      Upload PDF
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ─────── BULK TAB ─────── */}
      {tab === 'bulk' && (
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-white text-base flex items-center gap-2">
              <UploadCloud className="w-4 h-4 text-purple-500" />
              Bulk Upload
            </CardTitle>
            <p className="text-xs text-gray-500 mt-1">
              Drag &amp; drop multiple PDF files. Filenames containing the Booking ID or patient name will auto-match.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Dropzone */}
            <div
              onDragOver={(e) => { e.preventDefault(); setBulkDragOver(true); }}
              onDragLeave={() => setBulkDragOver(false)}
              onDrop={onBulkDrop}
              className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors cursor-pointer ${
                bulkDragOver ? 'border-purple-500 bg-purple-500/5' : 'border-zinc-700 hover:border-zinc-600'
              }`}
              onClick={() => bulkInputRef.current?.click()}
            >
              <UploadCloud className="w-10 h-10 text-purple-500/60 mx-auto mb-3" />
              <p className="text-white font-semibold text-sm">Drop PDF reports here or click to browse</p>
              <p className="text-gray-500 text-xs mt-1">Each file max 8 MB. Filename tip: include Booking ID (e.g. <code className="text-purple-300">{`LT90011_Sumit.pdf`}</code>)</p>
            </div>

            {/* File list */}
            {bulkFiles.length > 0 && (
              <div className="space-y-2">
                {unmatchedCount > 0 && (
                  <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg px-3 py-2 text-xs text-amber-300 flex items-center gap-2">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    {unmatchedCount} file(s) could not be auto-matched — assign manually before uploading.
                  </div>
                )}

                <div className="divide-y divide-zinc-800 rounded-lg border border-zinc-800 bg-zinc-950">
                  {bulkFiles.map((pf, idx) => (
                    <div key={idx} className="p-3 flex items-center gap-3 text-sm">
                      <FileText className="w-4 h-4 text-purple-400 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="text-white truncate">{pf.file.name}</div>
                        <div className="text-[11px] text-gray-500 flex items-center gap-2">
                          <span>{(pf.file.size / 1024).toFixed(0)} KB</span>
                          {pf.matchedLabel ? (
                            <span className={`flex items-center gap-1 ${pf.manualMatch ? 'text-blue-300' : 'text-emerald-400'}`}>
                              <CheckCircle2 className="w-3 h-3" />
                              {pf.manualMatch ? 'Manual match: ' : 'Auto-matched: '}{pf.matchedLabel}
                            </span>
                          ) : (
                            <span className="text-amber-400 flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3" /> No match
                            </span>
                          )}
                          {pf.uploaded && <span className="text-emerald-400">✓ uploaded</span>}
                          {pf.uploading && <span className="text-blue-400">uploading…</span>}
                          {pf.error && <span className="text-red-400">{pf.error}</span>}
                        </div>
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => setMatchPickerIdx(idx)} className="text-xs text-gray-300 hover:text-white">
                        {pf.matchedBookingId ? 'Change' : 'Match'}
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => removeBulkFile(idx)} className="text-gray-400 hover:text-red-400">
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <Button variant="ghost" onClick={() => setBulkFiles([])} disabled={bulkProcessing} className="text-gray-400">
                    Clear
                  </Button>
                  <Button onClick={processBulk} disabled={bulkProcessing || bulkFiles.every(f => !f.matchedBookingId || f.uploaded)}
                    className="bg-purple-600 hover:bg-purple-700 text-white">
                    {bulkProcessing ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
                    Upload &amp; notify
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ─────── HISTORY TAB ─────── */}
      {tab === 'history' && (
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-white text-base flex items-center gap-2">
              <History className="w-4 h-4 text-emerald-500" />
              Delivery History
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-10 text-gray-500 text-sm">Loading…</div>
            ) : history.length === 0 ? (
              <EmptyState icon={FileText} title="No reports uploaded yet" description="Once a report is uploaded, it will appear here with delivery status." />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-[11px] text-gray-400 uppercase tracking-wider border-b border-zinc-800">
                      <th className="py-2 font-semibold">Patient</th>
                      <th className="py-2 font-semibold">Booking</th>
                      <th className="py-2 font-semibold">Uploaded</th>
                      <th className="py-2 font-semibold">Delivery</th>
                      <th className="py-2 font-semibold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.map(b => (
                      <tr key={b.id} className="border-b border-zinc-800/60 last:border-0">
                        <td className="py-3 text-white">
                          <div className="font-medium">{b.patientName}</div>
                          <div className="text-[11px] text-gray-500">{b.patientPhone}</div>
                        </td>
                        <td className="py-3">
                          <code className="text-[11px] text-purple-300 bg-purple-500/10 px-2 py-0.5 rounded">{b.bookingId}</code>
                        </td>
                        <td className="py-3 text-gray-300 text-xs">
                          {b.reportUploadedAt ? new Date(b.reportUploadedAt).toLocaleString() : '—'}
                        </td>
                        <td className="py-3">
                          {!b.reportSent ? (
                            <span className="text-[11px] px-2 py-0.5 rounded bg-zinc-800 text-gray-300">Not sent</span>
                          ) : b.reportFcmSuccess ? (
                            <span className="text-[11px] px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400">📱 Delivered</span>
                          ) : (
                            <span className="text-[11px] px-2 py-0.5 rounded bg-yellow-500/15 text-yellow-400" title={b.reportFcmError}>
                              ⚠ Push failed · inbox only
                            </span>
                          )}
                          {b.reportSentAt && (
                            <div className="text-[10px] text-gray-500 mt-1">{new Date(b.reportSentAt).toLocaleString()}</div>
                          )}
                        </td>
                        <td className="py-3 text-right">
                          <div className="inline-flex gap-1">
                            {b.reportPdfUrl && (
                              <a href={b.reportPdfUrl} target="_blank" rel="noopener noreferrer"
                                className="text-[11px] inline-flex items-center gap-1 px-2 py-1 rounded bg-zinc-800 text-gray-200 hover:bg-zinc-700">
                                <Eye className="w-3 h-3" /> View
                              </a>
                            )}
                            <Button size="sm" onClick={() => resendReport(b)} disabled={!!rowBusy[b.id]}
                              className="h-7 text-[11px] bg-purple-600 hover:bg-purple-700 text-white">
                              {rowBusy[b.id] ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3 mr-1" />}
                              {b.reportSent ? 'Resend' : 'Send'}
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Match picker modal */}
      {matchPickerIdx !== null && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={() => setMatchPickerIdx(null)}>
          <Card className="bg-zinc-900 border-zinc-800 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <CardHeader>
              <CardTitle className="text-white text-base">Match to a booking</CardTitle>
              <p className="text-xs text-gray-500 mt-1">Search by patient name, phone or booking ID.</p>
            </CardHeader>
            <CardContent>
              <input autoFocus value={matchPickerQuery} onChange={(e) => setMatchPickerQuery(e.target.value)}
                placeholder="Search…"
                className="w-full bg-zinc-950 border border-zinc-800 text-white rounded-lg px-3 py-2 text-sm mb-3 outline-none focus:border-purple-500" />
              <div className="max-h-80 overflow-y-auto divide-y divide-zinc-800">
                {bookings
                  .filter(b => b.sampleCollected && b.status !== 'cancelled' && b.status !== 'rejected')
                  .filter(b => matchesSearch(b, matchPickerQuery))
                  .slice(0, 40)
                  .map(b => (
                    <button key={b.id} className="w-full text-left py-2 px-2 hover:bg-zinc-800 rounded"
                      onClick={() => assignBulkMatch(matchPickerIdx!, b.id)}>
                      <div className="text-white text-sm">{b.patientName}</div>
                      <div className="text-[11px] text-gray-500">{b.patientPhone} · {b.bookingId} · {b.bookingDate}</div>
                    </button>
                  ))}
              </div>
              <div className="flex justify-end pt-3">
                <Button variant="ghost" onClick={() => setMatchPickerIdx(null)} className="text-gray-400">Cancel</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

/* ─────────── helpers ─────────── */

function matchesSearch(b: ReportBooking, q: string): boolean {
  if (!q) return true;
  const t = q.toLowerCase();
  return (b.patientName || '').toLowerCase().includes(t)
    || (b.patientPhone || '').toLowerCase().includes(t)
    || (b.bookingId || '').toLowerCase().includes(t);
}

function normalize(s: string): string {
  return (s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

function autoMatch(fileName: string, bookings: ReportBooking[]): ReportBooking | undefined {
  const base = fileName.replace(/\.pdf$/i, '');
  const norm = normalize(base);
  if (!norm) return undefined;

  // 1) exact booking ID substring
  const byId = bookings.find(b => b.bookingId && norm.includes(normalize(b.bookingId)));
  if (byId) return byId;

  // 2) patient phone (last 10 digits)
  const digits = (base.match(/\d{6,}/g) || []).join('');
  if (digits.length >= 6) {
    const tail = digits.slice(-10);
    const byPhone = bookings.find(b => b.patientPhone && b.patientPhone.replace(/\D/g, '').endsWith(tail));
    if (byPhone) return byPhone;
  }

  // 3) patient name full match in filename (require at least 4 chars)
  const byName = bookings.find(b => {
    const pn = normalize(b.patientName);
    return pn.length >= 4 && norm.includes(pn);
  });
  if (byName) return byName;

  return undefined;
}

async function waitForReportUrl(bookingId: string, bookings: ReportBooking[]): Promise<string | null> {
  // Since we just wrote the URL to Firestore, the realtime snapshot will refresh bookings shortly.
  // Retry a few times to pick up the new URL before notifying.
  for (let i = 0; i < 6; i++) {
    const b = bookings.find(x => x.id === bookingId);
    if (b?.reportPdfUrl) return b.reportPdfUrl;
    await new Promise(r => setTimeout(r, 250));
  }
  return null;
}

/* ─────────── small components ─────────── */
function StatPill({ label, value, color, Icon }: { label: string; value: number; color: string; Icon: any }) {
  return (
    <div className="bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-3 flex items-center gap-3">
      <div className={`p-2 rounded-md bg-zinc-900 ${color}`}><Icon className="w-4 h-4" /></div>
      <div>
        <div className="text-[10px] uppercase tracking-widest text-gray-400 font-bold">{label}</div>
        <div className="text-white text-xl font-bold">{value}</div>
      </div>
    </div>
  );
}

function TabBtn({ active, onClick, Icon, label }: { active: boolean; onClick: () => void; Icon: any; label: string }) {
  return (
    <button onClick={onClick}
      className={`px-4 py-2 text-sm flex items-center gap-2 border-b-2 transition-colors ${
        active ? 'border-purple-500 text-white' : 'border-transparent text-gray-400 hover:text-gray-200'
      }`}>
      <Icon className="w-4 h-4" />
      {label}
    </button>
  );
}

function EmptyState({ icon: Icon, title, description }: { icon: any; title: string; description: string }) {
  return (
    <div className="py-12 text-center">
      <Icon className="w-10 h-10 text-purple-500/30 mx-auto mb-3" />
      <h3 className="text-white font-semibold text-base">{title}</h3>
      <p className="text-gray-500 text-sm mt-1">{description}</p>
    </div>
  );
}
