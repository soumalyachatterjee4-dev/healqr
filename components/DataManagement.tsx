import { useState, useEffect, useRef } from 'react';
import { Database, Download, Clock, CheckCircle, FileText, Menu, ChevronDown, ChevronUp, Upload } from 'lucide-react';
import * as XLSX from 'xlsx';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { Label } from './ui/label';
import { toast } from 'sonner';
import { collection, query, where, getDocs, addDoc, serverTimestamp, orderBy, limit } from 'firebase/firestore';
import { db, auth } from '../lib/firebase/config';
import DashboardSidebar from './DashboardSidebar';

interface DataManagementProps {
  mode: 'doctor' | 'clinic';
  doctorName?: string;
  clinicName?: string;
  email: string;
  onLogout: () => void;
  onMenuChange: (menu: string) => void;
  activeAddOns?: string[];
  clinicId?: string;
  branches?: { id: string; name: string }[];
}

interface DownloadRecord {
  id: string;
  startDate: string;
  endDate: string;
  recordCount: number;
  downloadedAt: any;
  section: string; // 'main' or branch name
}

export default function DataManagement({
  mode, doctorName, clinicName, email, onLogout, onMenuChange, activeAddOns = [], clinicId, branches = []
}: DataManagementProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const userId = auth?.currentUser?.uid || '';

  // Section toggle: 'main' or branch id
  const [activeSection, setActiveSection] = useState<string>('main');

  // Date range
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [availableFrom, setAvailableFrom] = useState('');
  const [availableTo, setAvailableTo] = useState('');

  // Export state
  const [preparing, setPreparing] = useState(false);
  const [recordCount, setRecordCount] = useState<number | null>(null);
  const [exportComplete, setExportComplete] = useState(false);
  const [totalPatients, setTotalPatients] = useState<number | null>(null);

  // Download history
  const [downloadHistory, setDownloadHistory] = useState<DownloadRecord[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  // Compute available dates (today-7 to yesterday)
  useEffect(() => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const monthAgo = new Date(today);
    monthAgo.setDate(monthAgo.getDate() - 30);

    const fmt = (d: Date) => d.toISOString().split('T')[0];
    setAvailableFrom(fmt(monthAgo));
    setAvailableTo(fmt(yesterday));
    setStartDate(fmt(monthAgo));
    setEndDate(fmt(yesterday));
  }, []);

  // Load download history & sharing settings & total patient count
  useEffect(() => {
    if (!userId || !db) return;
    loadDownloadHistory();
    loadTotalPatients();
  }, [userId]);

  const loadTotalPatients = async () => {
    if (!db || !userId) return;
    try {
      let q;
      if (mode === 'doctor') {
        q = query(collection(db, 'bookings'), where('doctorId', '==', userId));
      } else {
        const targetClinicId = clinicId || userId;
        q = query(collection(db, 'bookings'), where('clinicId', '==', targetClinicId));
      }
      const snap = await getDocs(q);
      setTotalPatients(snap.size);
    } catch {}
  };

  const loadDownloadHistory = async () => {
    if (!db || !userId) return;
    try {
      const colPath = mode === 'doctor' ? `doctors/${userId}/downloadHistory` : `clinics/${userId}/downloadHistory`;
      const q = query(collection(db, colPath), orderBy('downloadedAt', 'desc'), limit(4));
      const snap = await getDocs(q);
      setDownloadHistory(snap.docs.map(d => ({ id: d.id, ...d.data() })) as DownloadRecord[]);
    } catch {}
  };

  const fetchBookingsForExport = async () => {
    if (!db || !userId || !startDate || !endDate) return [];

    // Build query based on mode and section
    let bookingsQuery;
    if (mode === 'doctor') {
      bookingsQuery = query(
        collection(db, 'bookings'),
        where('doctorId', '==', userId),
        where('appointmentDate', '>=', startDate),
        where('appointmentDate', '<=', endDate)
      );
    } else {
      // Clinic mode
      const targetClinicId = activeSection === 'main' ? (clinicId || userId) : activeSection;
      bookingsQuery = query(
        collection(db, 'bookings'),
        where('clinicId', '==', targetClinicId),
        where('appointmentDate', '>=', startDate),
        where('appointmentDate', '<=', endDate)
      );
    }

    const snap = await getDocs(bookingsQuery);
    const bookings = snap.docs.map(d => ({ id: d.id, ...d.data() }));

    // Apply data masking based on sharing settings
    return bookings.map((b: any) => {
      const isClinicQR = b.bookingSource === 'clinic_qr';
      const isDoctorQR = b.bookingSource === 'doctor_qr' || !b.bookingSource;

      let masked = { ...b };

      if (mode === 'clinic' && isDoctorQR) {
        // Clinic viewing doctor-QR booking: check if doctor restricted
        // We check from the doctor's setting stored on the booking or default false
        if (b._doctorRestrictedToClinic) {
          masked.patientPhone = '****';
          masked.whatsappNumber = '****';
          masked.patientName = b.patientName ? b.patientName.split(' ')[0] + ' ***' : '***';
        }
      } else if (mode === 'doctor' && isClinicQR) {
        // Doctor viewing clinic-QR booking: check if clinic restricted
        if (b._clinicRestrictedToDoctor) {
          masked.patientPhone = '****';
          masked.whatsappNumber = '****';
          masked.patientName = b.patientName ? b.patientName.split(' ')[0] + ' ***' : '***';
        }
      }

      return masked;
    });
  };

  const headers = [
    'Date', 'Token No', 'Patient Name', 'Phone', 'Age', 'Gender',
    'Booking ID', 'Chamber', 'Time', 'Visit Type', 'Consultation Status',
    'Seen Date', 'Rx Type', 'Medicines', 'Diagnosis', 'Referrer',
    'Referrer Role', 'Fee', 'Booking Source',
  ];

  const buildRows = (bookings: any[]) => {
    const rows = bookings.map((b: any) => {
      const seenDate = b.markedSeenAt?.toDate
        ? b.markedSeenAt.toDate().toLocaleDateString('en-IN')
        : b.isMarkedSeen ? 'Yes' : '';
      const consultStatus = b.isMarkedSeen ? 'Completed' : b.status === 'cancelled' ? 'Cancelled' : 'Booked';
      let rxType = 'None';
      if (b.prescriptionUrl) rxType = 'Digital Rx';
      if (b.aiRxProcessed) rxType = 'AI Rx Reader';
      const medicines = (b.medicines || []).map((m: any) =>
        typeof m === 'string' ? m : `${m.name || m.medicineName || ''} ${m.dosage || ''} ${m.frequency || ''}`.trim()
      ).join('; ');
      const fee = b.consultationFee || b.fee || b.amount || '';
      return {
        'Date': b.appointmentDate || b.date || b.bookingDate || '',
        'Token No': b.tokenNumber || b.serialNo || '',
        'Patient Name': b.patientName || '',
        'Phone': b.patientPhone || '',
        'Age': b.age || '',
        'Gender': b.gender || '',
        'Booking ID': b.bookingId || b.id || '',
        'Chamber': b.chamberName || b.chamber || '',
        'Time': b.time || b.bookingTime || '',
        'Visit Type': b.consultationType || b.visitType || b.purposeOfVisit || '',
        'Consultation Status': consultStatus,
        'Seen Date': seenDate,
        'Rx Type': rxType,
        'Medicines': medicines,
        'Diagnosis': b.diagnosis || '',
        'Referrer': b.referrerName || '',
        'Referrer Role': b.referrerRole || '',
        'Fee': fee,
        'Booking Source': b.bookingSource || 'doctor_qr',
      };
    });
    rows.sort((a, b) => {
      if (a['Date'] !== b['Date']) return a['Date'].localeCompare(b['Date']);
      return (parseInt(a['Token No']) || 0) - (parseInt(b['Token No']) || 0);
    });
    return rows;
  };

  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateDates = () => {
    if (!startDate || !endDate) { toast.error('Select date range'); return false; }
    if (startDate > endDate) { toast.error('Start date must be before end date'); return false; }
    if (startDate > availableTo || endDate > availableTo) { toast.error('Cannot export today\'s data. Select up to yesterday.'); return false; }
    return true;
  };

  const getSheetName = () => {
    // e.g. "Apr 02-08" from startDate/endDate
    const s = new Date(startDate + 'T00:00:00');
    const e = new Date(endDate + 'T00:00:00');
    const month = s.toLocaleString('en-IN', { month: 'short' });
    return `${month} ${String(s.getDate()).padStart(2, '0')}-${String(e.getDate()).padStart(2, '0')}`;
  };

  const getFileName = () => {
    const entityName = mode === 'doctor' ? (doctorName || 'Doctor') : (clinicName || 'Clinic');
    const sectionLabel = activeSection === 'main' ? 'Main' : branches.find(b => b.id === activeSection)?.name || activeSection;
    return `HealQR_${entityName}_${sectionLabel}_PatientData.xlsx`;
  };

  const downloadWorkbook = (wb: XLSX.WorkBook) => {
    const wbOut = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([wbOut], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = getFileName();
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const saveDownloadRecord = async (count: number) => {
    if (!db || !userId) return;
    const colPath = mode === 'doctor' ? `doctors/${userId}/downloadHistory` : `clinics/${userId}/downloadHistory`;
    const sectionLabel = activeSection === 'main' ? 'Main' : branches.find(b => b.id === activeSection)?.name || activeSection;
    await addDoc(collection(db, colPath), {
      startDate, endDate, recordCount: count,
      downloadedAt: serverTimestamp(), section: sectionLabel,
    });
    loadDownloadHistory();
  };

  // Fresh download — creates new .xlsx file with one sheet
  const handleFreshExport = async () => {
    if (!validateDates()) return;
    setPreparing(true); setExportComplete(false); setRecordCount(null);
    try {
      const bookings = await fetchBookingsForExport();
      if (bookings.length === 0) { toast.error('No records found for selected date range'); setPreparing(false); return; }
      setRecordCount(bookings.length);
      const rows = buildRows(bookings);
      const ws = XLSX.utils.json_to_sheet(rows, { header: headers });
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, getSheetName());
      downloadWorkbook(wb);
      setExportComplete(true);
      await saveDownloadRecord(bookings.length);
      toast.success(`${bookings.length} records exported — new Excel file created`);
    } catch (err) {
      console.error('Export error:', err);
      toast.error('Export failed. Please try again.');
    } finally { setPreparing(false); }
  };

  // Append to existing — doctor picks their file, new sheet tab gets added
  const handleAppendExport = () => {
    if (!validateDates()) return;
    fileInputRef.current?.click();
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // Reset input so same file can be selected again
    e.target.value = '';

    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      toast.error('Please select an Excel file (.xlsx)');
      return;
    }

    setPreparing(true); setExportComplete(false); setRecordCount(null);
    try {
      const bookings = await fetchBookingsForExport();
      if (bookings.length === 0) { toast.error('No records found for selected date range'); setPreparing(false); return; }
      setRecordCount(bookings.length);
      const rows = buildRows(bookings);

      // Read existing workbook
      const arrayBuffer = await file.arrayBuffer();
      const existingWb = XLSX.read(arrayBuffer, { type: 'array' });

      // Create new sheet with date range name
      let sheetName = getSheetName();
      // Avoid duplicate sheet names
      let suffix = 1;
      const baseName = sheetName;
      while (existingWb.SheetNames.includes(sheetName)) {
        sheetName = `${baseName} (${suffix})`;
        suffix++;
      }
      const ws = XLSX.utils.json_to_sheet(rows, { header: headers });
      XLSX.utils.book_append_sheet(existingWb, ws, sheetName);

      downloadWorkbook(existingWb);
      setExportComplete(true);
      await saveDownloadRecord(bookings.length);
      toast.success(`${bookings.length} records added as new sheet "${sheetName}" — replace your old file with this one`);
    } catch (err) {
      console.error('Append error:', err);
      toast.error('Failed to update Excel file. Please try again.');
    } finally { setPreparing(false); }
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp?.toDate) return '';
    return timestamp.toDate().toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      {mode === 'doctor' && (
        <DashboardSidebar
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          onMenuChange={onMenuChange}
          onLogout={onLogout}
          activeMenu="data-management"
          activeAddOns={activeAddOns}
        />
      )}

      <div className={`transition-all duration-300 ${mode === 'doctor' ? 'lg:ml-64' : ''}`}>
        {/* Sticky header */}
        <div className="border-b border-zinc-800 bg-[#0a0a0a]/80 backdrop-blur-sm sticky top-0 z-40">
          <div className="px-4 lg:px-8 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              {mode === 'doctor' && (
                <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-2 hover:bg-zinc-800 rounded-lg transition-colors">
                  <Menu className="w-6 h-6" />
                </button>
              )}
              <div>
                <h1 className="text-white text-xl font-bold">Data Management</h1>
                <p className="text-gray-400 text-sm mt-0.5">Export patient data to Excel</p>
              </div>
            </div>
            <Database className="w-6 h-6 text-emerald-400" />
          </div>
        </div>

        <div className="p-4 lg:p-8 max-w-3xl mx-auto space-y-6">

          {/* Section Tabs (Main + Branches) */}
          {(mode === 'clinic' && branches.length > 0) && (
            <div className="flex gap-2 overflow-x-auto pb-2">
              <button
                onClick={() => setActiveSection('main')}
                className={`px-4 py-2 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
                  activeSection === 'main'
                    ? 'bg-emerald-500 text-white'
                    : 'bg-zinc-800 text-gray-400 hover:bg-zinc-700'
                }`}
              >
                🏥 Main Clinic
              </button>
              {branches.map(branch => (
                <button
                  key={branch.id}
                  onClick={() => setActiveSection(branch.id)}
                  className={`px-4 py-2 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
                    activeSection === branch.id
                      ? 'bg-emerald-500 text-white'
                      : 'bg-zinc-800 text-gray-400 hover:bg-zinc-700'
                  }`}
                >
                  🏥 {branch.name}
                </button>
              ))}
            </div>
          )}

          {/* Export Section */}
          <Card className="bg-zinc-900/50 border-zinc-800">
            <CardContent className="p-4 space-y-4">
              <div className="flex items-center gap-2 mb-1">
                <Download className="w-4 h-4 text-emerald-400" />
                <h3 className="text-white text-sm font-bold">Export Data</h3>
              </div>

              {/* Data retention notice */}
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3">
                <p className="text-amber-400 text-xs font-medium">⏰ Data Retention Policy</p>
                <p className="text-amber-400/70 text-[10px] mt-1">
                  Data is available for the last 30 days only (excluding today). Export monthly to keep your records.
                  Data older than 30 days will be auto-removed.
                </p>
              </div>

              {/* Available range info */}
              <div className="flex items-center justify-between text-[10px] text-gray-500">
                <span>Available data: <span className="text-emerald-400 font-medium">{availableFrom}</span> to <span className="text-emerald-400 font-medium">{availableTo}</span></span>
                {totalPatients !== null && (
                  <span className="text-white bg-zinc-800 px-2 py-0.5 rounded-full font-medium">
                    Total records: <span className="text-emerald-400">{totalPatients.toLocaleString()}</span>
                  </span>
                )}
              </div>

              {/* Date range picker */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs text-gray-400 mb-1 block">Start Date</Label>
                  <input
                    type="date"
                    value={startDate}
                    min={availableFrom}
                    max={availableTo}
                    onChange={e => { setStartDate(e.target.value); setExportComplete(false); setRecordCount(null); }}
                    className="w-full h-9 px-3 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-xs focus:border-emerald-500 outline-none [color-scheme:dark]"
                  />
                </div>
                <div>
                  <Label className="text-xs text-gray-400 mb-1 block">End Date</Label>
                  <input
                    type="date"
                    value={endDate}
                    min={startDate || availableFrom}
                    max={availableTo}
                    onChange={e => { setEndDate(e.target.value); setExportComplete(false); setRecordCount(null); }}
                    className="w-full h-9 px-3 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-xs focus:border-emerald-500 outline-none [color-scheme:dark]"
                  />
                </div>
              </div>

              {/* Record count preview */}
              {recordCount !== null && (
                <div className="flex items-center gap-2 text-emerald-400 text-xs">
                  <FileText className="w-4 h-4" />
                  <span>{recordCount} patient records</span>
                </div>
              )}

              {/* Hidden file input for append mode */}
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileUpload}
                className="hidden"
              />

              {/* Export buttons */}
              <div className="space-y-2">
                {/* First time / Fresh download */}
                <Button
                  onClick={handleFreshExport}
                  disabled={preparing || !startDate || !endDate}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-medium h-10"
                >
                  {preparing ? (
                    <span className="flex items-center gap-2">
                      <span className="animate-spin">⏳</span> Preparing...
                    </span>
                  ) : exportComplete ? (
                    <span className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4" /> Done — Saved to Downloads
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <Download className="w-4 h-4" /> Download New Excel File
                    </span>
                  )}
                </Button>

                {/* Divider */}
                <div className="flex items-center gap-2">
                  <div className="flex-1 border-t border-zinc-700" />
                  <span className="text-[10px] text-gray-500">OR</span>
                  <div className="flex-1 border-t border-zinc-700" />
                </div>

                {/* Append to existing file */}
                <Button
                  onClick={handleAppendExport}
                  disabled={preparing || !startDate || !endDate}
                  variant="outline"
                  className="w-full border-emerald-600/50 text-emerald-400 hover:bg-emerald-600/10 font-medium h-10"
                >
                  <span className="flex items-center gap-2">
                    <Upload className="w-4 h-4" /> Update Existing Excel File
                  </span>
                </Button>
                <p className="text-gray-500 text-[10px] text-center">
                  Attach your previously downloaded Excel file — new data will be added as a new sheet tab.
                </p>
              </div>

              {exportComplete && (
                <p className="text-emerald-400/70 text-[10px] text-center">
                  File saved as Excel (.xlsx). Replace the old file with the new download to keep all data in one place.
                </p>
              )}
            </CardContent>
          </Card>

          {/* How it works */}
          <Card className="bg-zinc-900/50 border-zinc-800">
            <CardContent className="p-4">
              <h3 className="text-white text-xs font-bold mb-2">How it works</h3>
              <div className="space-y-2 text-[10px] text-gray-400">
                <div className="flex gap-2"><span className="text-emerald-400 font-bold">1.</span> First time — click "Download New Excel File" to create your master file</div>
                <div className="flex gap-2"><span className="text-emerald-400 font-bold">2.</span> Every month — click "Update Existing Excel File" & select your master file</div>
                <div className="flex gap-2"><span className="text-emerald-400 font-bold">3.</span> New data is added as a new sheet tab (e.g. Mar 10-Apr 08, Apr 09-May 08)</div>
                <div className="flex gap-2"><span className="text-emerald-400 font-bold">4.</span> Replace the old file with the new download — all your data stays in one Excel file</div>
              </div>
            </CardContent>
          </Card>

          {/* Excel columns info */}
          <Card className="bg-zinc-900/50 border-zinc-800">
            <CardContent className="p-4">
              <h3 className="text-white text-xs font-bold mb-2">What's included in each sheet?</h3>
              <div className="grid grid-cols-2 gap-1 text-[10px] text-gray-400">
                <span>• Date & Time</span>
                <span>• Token Number</span>
                <span>• Patient Name</span>
                <span>• Phone Number</span>
                <span>• Age & Gender</span>
                <span>• Booking ID</span>
                <span>• Chamber Name</span>
                <span>• Visit Type</span>
                <span>• Consultation Status</span>
                <span>• Seen Date</span>
                <span>• Rx Type (Digital/AI)</span>
                <span>• Medicines</span>
                <span>• Diagnosis</span>
                <span>• Referrer Info</span>
                <span>• Fee</span>
                <span>• Booking Source</span>
              </div>
            </CardContent>
          </Card>

          {/* Download History — Last 4 */}
          <Card className="bg-zinc-900/50 border-zinc-800">
            <CardContent className="p-4">
              <button
                onClick={() => setShowHistory(!showHistory)}
                className="flex items-center justify-between w-full"
              >
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-gray-400" />
                  <h3 className="text-white text-sm font-bold">Download History</h3>
                  <span className="text-[10px] text-gray-500">(Last 4 weeks)</span>
                </div>
                {showHistory ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
              </button>

              {showHistory && (
                <div className="mt-3 space-y-2">
                  {downloadHistory.length === 0 ? (
                    <p className="text-gray-500 text-xs text-center py-4">No downloads yet</p>
                  ) : (
                    downloadHistory.map(h => (
                      <div key={h.id} className="flex items-center justify-between p-2 bg-zinc-800/50 rounded-lg">
                        <div>
                          <p className="text-white text-xs">{h.startDate} → {h.endDate}</p>
                          <p className="text-gray-500 text-[10px]">{h.section} • {h.recordCount} records</p>
                        </div>
                        <p className="text-gray-500 text-[10px]">{formatDate(h.downloadedAt)}</p>
                      </div>
                    ))
                  )}
                </div>
              )}
            </CardContent>
          </Card>

        </div>
      </div>
    </div>
  );
}
