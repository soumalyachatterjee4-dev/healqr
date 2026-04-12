import { useState, useEffect, useRef, useMemo } from 'react';
import {
  Menu, IndianRupee, Plus, Trash2, Download, Share2, Printer,
  Calendar, Search, User, FileText, ChevronLeft, ChevronRight,
  Phone, Receipt, X, Check, Copy
} from 'lucide-react';
import DashboardSidebar from './DashboardSidebar';
import { db } from '../lib/firebase/config';
import {
  collection, query, where, getDocs, doc, getDoc, addDoc,
  deleteDoc, serverTimestamp, orderBy
} from 'firebase/firestore';
import { toast } from 'sonner';
import { jsPDF } from 'jspdf';
import QRCode from 'qrcode';

interface BillingReceiptProps {
  onMenuChange?: (menu: string) => void;
  onLogout?: () => void | Promise<void>;
  activeAddOns?: string[];
}

interface PatientBilling {
  bookingId: string;
  patientName: string;
  phone: string;
  age: string;
  gender: string;
  chamberName: string;
  purpose: string;
  consultationFee: number;
  srlNo: string;
  isSeen: boolean;
}

interface LineItem {
  id: string;
  description: string;
  amount: number;
}

interface SavedReceipt {
  id: string;
  receiptNo: string;
  patientName: string;
  phone: string;
  totalAmount: number;
  paymentMethod: string;
  date: string;
  createdAt: any;
}

let receiptCounter = 0;

export default function BillingReceipt({ onMenuChange = () => {}, onLogout, activeAddOns = [] }: BillingReceiptProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(() => {
    const now = new Date();
    return new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().split('T')[0];
  });

  const [patients, setPatients] = useState<PatientBilling[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<PatientBilling | null>(null);
  const [patientSearch, setPatientSearch] = useState('');
  const [lineItems, setLineItems] = useState<LineItem[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'UPI' | 'CARD'>('CASH');
  const [remarks, setRemarks] = useState('');
  const [savedReceipts, setSavedReceipts] = useState<SavedReceipt[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [generatingPdf, setGeneratingPdf] = useState(false);

  const [doctorInfo, setDoctorInfo] = useState<{
    name: string; degree: string; degrees: string[]; specialty: string; specialties: string[];
    clinicName: string; address: string; phone: string; timing: string;
    registrationNumber: string; showRegistrationOnRX: boolean; useDrPrefix: boolean;
    doctorId: string; qrNumber: string;
    allChambers: Array<{ name: string; address: string; timing: string }>;
    footerLine1: string; footerLine2: string;
  }>({ name: '', degree: '', degrees: [], specialty: '', specialties: [], clinicName: '', address: '', phone: '', timing: '', registrationNumber: '', showRegistrationOnRX: true, useDrPrefix: true, doctorId: '', qrNumber: '', allChambers: [], footerLine1: '', footerLine2: '' });

  // Load doctor info
  useEffect(() => {
    const loadDoctor = async () => {
      const userId = localStorage.getItem('userId');
      if (!userId || !db) return;
      try {
        const snap = await getDoc(doc(db, 'doctors', userId));
        if (snap.exists()) {
          const d = snap.data();
          const chambers = d.chambers || [];
          setDoctorInfo({
            name: d.name || d.displayName || '',
            degree: d.degree || d.degrees?.join(', ') || '',
            degrees: d.degrees || (d.degree ? [d.degree] : []),
            specialty: d.specialty || d.specialties?.[0] || '',
            specialties: d.specialties || d.specialities || (d.specialty ? [d.specialty] : []),
            clinicName: d.clinicName || chambers[0]?.chamberName || '',
            address: d.address || chambers[0]?.address || '',
            phone: d.phone || d.mobile || '',
            timing: d.timing || chambers[0]?.timing || '',
            registrationNumber: d.registrationNumber || '',
            showRegistrationOnRX: d.showRegistrationOnRX !== false,
            useDrPrefix: d.useDrPrefix !== false,
            doctorId: userId,
            qrNumber: d.qrNumber || '',
            allChambers: chambers.map((c: any) => ({ name: c.chamberName || c.name || '', address: c.address || '', timing: c.timing || '' })),
            footerLine1: d.footerLine1 || '',
            footerLine2: d.footerLine2 || '',
          });
        }
      } catch {}
    };
    loadDoctor();
  }, []);

  // Load patients for the selected date
  useEffect(() => {
    loadPatients();
    loadReceipts();
  }, [selectedDate]);

  const loadPatients = async () => {
    setLoading(true);
    const userId = localStorage.getItem('userId');
    if (!userId || !db) { setLoading(false); return; }
    try {
      const q = query(
        collection(db, 'bookings'),
        where('doctorId', '==', userId),
        where('appointmentDate', '==', selectedDate)
      );
      const snap = await getDocs(q);
      const list: PatientBilling[] = [];
      snap.docs.forEach(d => {
        const data = d.data();
        if (data.status === 'cancelled' || data.isCancelled) return;
        const isSeen = data.isMarkedSeen || data.consultationCompleted || data.eyeIconPressed || data.inChamber || data.status === 'completed' || data.status === 'confirmed';
        list.push({
          bookingId: d.id,
          patientName: data.patientName || 'Unknown',
          phone: data.patientPhone || data.phone || '',
          age: data.patientAge?.toString() || '',
          gender: data.patientGender || '',
          chamberName: data.chamberName || data.clinicName || 'Chamber',
          purpose: data.purposeOfVisit || data.purpose || '',
          consultationFee: data.consultationFee || 0,
          srlNo: data.srlNo?.toString() || data.tokenNumber?.toString() || '',
          isSeen,
        });
      });
      list.sort((a, b) => a.patientName.localeCompare(b.patientName));
      setPatients(list);
    } catch (err) {
      console.error('Error loading patients:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadReceipts = async () => {
    const userId = localStorage.getItem('userId');
    if (!userId || !db) return;
    try {
      const q = query(
        collection(db, 'doctors', userId, 'receipts'),
        where('date', '==', selectedDate)
      );
      const snap = await getDocs(q);
      const list: SavedReceipt[] = snap.docs.map(d => ({
        id: d.id,
        ...d.data() as Omit<SavedReceipt, 'id'>
      }));
      list.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      setSavedReceipts(list);
    } catch {}
  };

  // When patient selected, auto-add consultation fee as first line item
  const handleSelectPatient = (p: PatientBilling) => {
    setSelectedPatient(p);
    setLineItems([
      { id: crypto.randomUUID(), description: 'Consultation Fee', amount: p.consultationFee }
    ]);
    setPaymentMethod('CASH');
    setRemarks('');
  };

  const addLineItem = () => {
    setLineItems([...lineItems, { id: crypto.randomUUID(), description: '', amount: 0 }]);
  };

  const updateLineItem = (id: string, field: 'description' | 'amount', value: string | number) => {
    setLineItems(prev => prev.map(li => li.id === id ? { ...li, [field]: value } : li));
  };

  const removeLineItem = (id: string) => {
    setLineItems(prev => prev.filter(li => li.id !== id));
  };

  const totalAmount = useMemo(() => lineItems.reduce((sum, li) => sum + (li.amount || 0), 0), [lineItems]);

  const filteredPatients = patients.filter(p =>
    p.patientName.toLowerCase().includes(patientSearch.toLowerCase()) ||
    p.phone.includes(patientSearch)
  );

  // Generate receipt number
  const generateReceiptNo = () => {
    const dateStr = selectedDate.replace(/-/g, '');
    receiptCounter++;
    return `HQ-${dateStr}-${String(savedReceipts.length + receiptCounter).padStart(3, '0')}`;
  };

  // Save + Generate PDF
  const handleGenerateReceipt = async () => {
    if (!selectedPatient) return;
    if (lineItems.length === 0 || lineItems.every(li => !li.description)) {
      toast.error('Add at least one line item');
      return;
    }
    setGeneratingPdf(true);
    const receiptNo = generateReceiptNo();
    const userId = localStorage.getItem('userId');

    try {
      // Save to Firestore
      if (userId && db) {
        await addDoc(collection(db, 'doctors', userId, 'receipts'), {
          date: selectedDate,
          receiptNo,
          bookingId: selectedPatient.bookingId,
          patientName: selectedPatient.patientName,
          phone: selectedPatient.phone,
          age: selectedPatient.age,
          gender: selectedPatient.gender,
          chamberName: selectedPatient.chamberName,
          items: lineItems.map(li => ({ description: li.description, amount: li.amount })),
          totalAmount,
          paymentMethod,
          remarks,
          createdAt: serverTimestamp(),
        });
      }

      // Generate PDF — A4 format matching Rx layout
      const pdfDoc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pageWidth = 210;
      const margin = 20;
      const contentWidth = pageWidth - margin * 2;
      let y = 20;

      // === HEADER: Doctor Name & Details (Left Side) ===
      pdfDoc.setFontSize(22);
      pdfDoc.setTextColor(40, 40, 40);
      pdfDoc.setFont('helvetica', 'bold');
      const displayName = (doctorInfo.useDrPrefix ? `Dr. ${doctorInfo.name}` : doctorInfo.name).toUpperCase();
      pdfDoc.text(displayName, margin, y);
      y += 8;

      pdfDoc.setFontSize(10);
      pdfDoc.setFont('helvetica', 'normal');
      pdfDoc.setTextColor(100, 100, 100);

      const degreesText = doctorInfo.degrees.length ? doctorInfo.degrees.join(', ') : doctorInfo.degree;
      if (degreesText) { pdfDoc.text(degreesText, margin, y); y += 5; }

      const specialtiesText = doctorInfo.specialties.length ? doctorInfo.specialties.join(', ') : doctorInfo.specialty;
      if (specialtiesText) { pdfDoc.text(specialtiesText, margin, y); y += 5; }

      if (doctorInfo.showRegistrationOnRX && doctorInfo.registrationNumber) {
        pdfDoc.text(`REG NO: ${doctorInfo.registrationNumber}`, margin, y); y += 6;
      }

      // Chamber / Clinic info
      if (doctorInfo.clinicName) {
        pdfDoc.setFont('helvetica', 'bold');
        pdfDoc.setTextColor(60, 60, 60);
        pdfDoc.text(doctorInfo.clinicName, margin, y); y += 5;
      }
      pdfDoc.setFont('helvetica', 'normal');
      pdfDoc.setTextColor(100, 100, 100);
      pdfDoc.setFontSize(9);
      if (doctorInfo.address) {
        const splitAddr = pdfDoc.splitTextToSize(doctorInfo.address, pageWidth / 2 - margin);
        pdfDoc.text(splitAddr, margin, y);
        y += splitAddr.length * 4;
      }
      if (doctorInfo.phone) { pdfDoc.text(`Ph: ${doctorInfo.phone}`, margin, y); y += 4; }
      if (doctorInfo.timing) { pdfDoc.text(`Timing: ${doctorInfo.timing}`, margin, y); y += 4; }

      // === QR CODE (Right Side) ===
      const qrSize = 35;
      const qrX = pageWidth - margin - qrSize;
      const qrY = 18;
      try {
        pdfDoc.setFontSize(7);
        pdfDoc.setFont('helvetica', 'bold');
        pdfDoc.setTextColor(40);
        pdfDoc.text('FOR APPOINTMENT SCAN HERE', qrX + qrSize / 2, qrY - 3, { align: 'center' });
        const qrUrl = `https://teamhealqr.web.app/?page=doctor-mini-website&doctorId=${doctorInfo.doctorId}`;
        const qrDataUrl = await QRCode.toDataURL(qrUrl, { margin: 1, width: 200 });
        pdfDoc.addImage(qrDataUrl, 'PNG', qrX, qrY, qrSize, qrSize);
      } catch {}

      // === HEADER DIVIDER ===
      const headerEndY = Math.max(y + 3, 65);
      pdfDoc.setLineWidth(0.5);
      pdfDoc.setDrawColor(200, 200, 200);
      pdfDoc.line(margin, headerEndY, pageWidth - margin, headerEndY);

      // === RECEIPT TITLE ===
      y = headerEndY + 8;
      pdfDoc.setFontSize(18);
      pdfDoc.setFont('helvetica', 'bold');
      pdfDoc.setTextColor(30, 41, 59);
      pdfDoc.text('RECEIPT', pageWidth / 2, y, { align: 'center' });
      y += 6;
      pdfDoc.setFontSize(9);
      pdfDoc.setFont('helvetica', 'normal');
      pdfDoc.setTextColor(80, 80, 80);
      pdfDoc.text(`Receipt No: ${receiptNo}`, margin, y);
      const displayDate = new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
      pdfDoc.text(`Date: ${displayDate}`, pageWidth - margin, y, { align: 'right' });

      // === PATIENT INFO ===
      y += 8;
      pdfDoc.setDrawColor(200, 200, 200);
      pdfDoc.setLineWidth(0.2);
      pdfDoc.line(margin, y, pageWidth - margin, y);
      y += 6;
      pdfDoc.setFontSize(10);
      pdfDoc.setTextColor(40, 40, 40);
      // Row 1: Name | Mobile | Age/Sex
      pdfDoc.setFont('helvetica', 'bold');
      pdfDoc.text('Patient:', margin, y);
      pdfDoc.setFont('helvetica', 'normal');
      pdfDoc.text(selectedPatient.patientName, margin + 25, y);
      pdfDoc.setFont('helvetica', 'bold');
      pdfDoc.text('Mobile:', margin + 80, y);
      pdfDoc.setFont('helvetica', 'normal');
      pdfDoc.text(selectedPatient.phone || '-', margin + 95, y);
      if (selectedPatient.age || selectedPatient.gender) {
        pdfDoc.setFont('helvetica', 'bold');
        pdfDoc.text('Age/Sex:', margin + 135, y);
        pdfDoc.setFont('helvetica', 'normal');
        const ageSex = [selectedPatient.age ? `${selectedPatient.age}Y` : '', selectedPatient.gender?.toUpperCase()].filter(Boolean).join('/');
        pdfDoc.text(ageSex, margin + 155, y);
      }
      // Row 2: Chamber | SRL
      y += 7;
      pdfDoc.setFont('helvetica', 'bold');
      pdfDoc.text('Chamber:', margin, y);
      pdfDoc.setFont('helvetica', 'normal');
      pdfDoc.text(selectedPatient.chamberName || '-', margin + 25, y);
      if (selectedPatient.srlNo) {
        pdfDoc.setFont('helvetica', 'bold');
        pdfDoc.text('SRL:', margin + 135, y);
        pdfDoc.setFont('helvetica', 'normal');
        pdfDoc.text(`#${selectedPatient.srlNo}`, margin + 155, y);
      }
      y += 6;
      pdfDoc.line(margin, y, pageWidth - margin, y);

      // === ITEMIZED TABLE ===
      y += 6;
      // Table header
      pdfDoc.setFillColor(248, 250, 252);
      pdfDoc.rect(margin, y - 4, contentWidth, 8, 'F');
      pdfDoc.setFontSize(10);
      pdfDoc.setFont('helvetica', 'bold');
      pdfDoc.setTextColor(40, 40, 40);
      pdfDoc.text('#', margin + 3, y);
      pdfDoc.text('Description', margin + 15, y);
      pdfDoc.text('Amount (\u20B9)', pageWidth - margin - 5, y, { align: 'right' });
      y += 6;
      pdfDoc.setLineWidth(0.3);
      pdfDoc.line(margin, y, pageWidth - margin, y);
      y += 5;

      // Table rows
      pdfDoc.setFont('helvetica', 'normal');
      pdfDoc.setFontSize(10);
      lineItems.forEach((li, idx) => {
        if (!li.description) return;
        pdfDoc.setTextColor(60, 60, 60);
        pdfDoc.text(`${idx + 1}.`, margin + 3, y);
        pdfDoc.text(li.description, margin + 15, y);
        pdfDoc.setFont('helvetica', 'bold');
        pdfDoc.text(`\u20B9${li.amount.toLocaleString('en-IN')}`, pageWidth - margin - 5, y, { align: 'right' });
        pdfDoc.setFont('helvetica', 'normal');
        y += 7;
      });

      // === TOTAL ===
      y += 2;
      pdfDoc.setLineWidth(0.5);
      pdfDoc.setDrawColor(16, 185, 129);
      pdfDoc.line(margin, y, pageWidth - margin, y);
      y += 7;
      pdfDoc.setFontSize(13);
      pdfDoc.setFont('helvetica', 'bold');
      pdfDoc.setTextColor(30, 41, 59);
      pdfDoc.text('TOTAL', margin + 3, y);
      pdfDoc.text(`\u20B9${totalAmount.toLocaleString('en-IN')}`, pageWidth - margin - 5, y, { align: 'right' });
      y += 7;
      pdfDoc.setFontSize(9);
      pdfDoc.setFont('helvetica', 'normal');
      pdfDoc.setTextColor(80, 80, 80);
      pdfDoc.text(`Payment Method: ${paymentMethod}`, margin + 3, y);
      if (remarks) { y += 5; pdfDoc.text(`Note: ${remarks}`, margin + 3, y); }

      // === FOOTER: "ALSO AVAILABLE AT" with all chambers ===
      const footerStartY = 235;
      if (doctorInfo.allChambers.length > 1) {
        const chLineH = 4;
        const footerBoxH = 5 + doctorInfo.allChambers.length * chLineH + 2;
        pdfDoc.setDrawColor(200, 200, 200);
        pdfDoc.setLineWidth(0.2);
        pdfDoc.setFillColor(248, 250, 252);
        pdfDoc.roundedRect(margin, footerStartY, contentWidth, footerBoxH, 2, 2, 'FD');
        pdfDoc.setFontSize(7);
        pdfDoc.setFont('helvetica', 'bold');
        pdfDoc.setTextColor(60, 60, 60);
        pdfDoc.text('ALSO AVAILABLE AT', margin + 3, footerStartY + 4);
        pdfDoc.setFont('helvetica', 'normal');
        pdfDoc.setTextColor(80, 80, 80);
        pdfDoc.setFontSize(6.5);
        doctorInfo.allChambers.forEach((ch, i) => {
          const chY = footerStartY + 8 + i * chLineH;
          pdfDoc.text(`${ch.name} \u2022 ${ch.address} \u2022 ${ch.timing}`, margin + 5, chY);
        });
      }

      // Custom footer lines
      if (doctorInfo.footerLine1 || doctorInfo.footerLine2) {
        const flY = doctorInfo.allChambers.length > 1 ? footerStartY + 5 + doctorInfo.allChambers.length * 4 + 5 : footerStartY;
        pdfDoc.setFontSize(5.5);
        pdfDoc.setFont('helvetica', 'italic');
        pdfDoc.setTextColor(120, 120, 120);
        if (doctorInfo.footerLine1) pdfDoc.text(doctorInfo.footerLine1, pageWidth / 2, flY, { align: 'center' });
        if (doctorInfo.footerLine2) pdfDoc.text(doctorInfo.footerLine2, pageWidth / 2, flY + 3, { align: 'center' });
      }

      // === DISCLAIMER ===
      const disclaimerY = 262;
      pdfDoc.setDrawColor(180, 160, 130);
      pdfDoc.setFillColor(255, 250, 235);
      pdfDoc.setLineWidth(0.2);
      pdfDoc.roundedRect(margin, disclaimerY, contentWidth, 10, 1.5, 1.5, 'FD');
      pdfDoc.setFontSize(5);
      pdfDoc.setFont('helvetica', 'bold');
      pdfDoc.setTextColor(100, 80, 50);
      pdfDoc.text('This is a computer-generated receipt. No signature required.', margin + 3, disclaimerY + 4);
      pdfDoc.setFont('helvetica', 'normal');
      pdfDoc.text('This receipt is valid only for the services mentioned above. Please retain for your records.', margin + 3, disclaimerY + 7.5);

      // === HEALQR FOOTER ===
      pdfDoc.setFontSize(6);
      pdfDoc.setTextColor(150, 150, 150);
      pdfDoc.text(`Digitally generated by HealQR \u2022 No signature required \u2022 ${displayDate}`, pageWidth / 2, 277, { align: 'center' });

      // === WATERMARK ===
      pdfDoc.setTextColor(240, 240, 240);
      pdfDoc.setFontSize(60);
      pdfDoc.setFont('helvetica', 'bold');
      pdfDoc.text('healQR', pageWidth / 2, 150, { align: 'center', angle: 35 });

      // Download
      pdfDoc.save(`Receipt_${receiptNo}_${selectedPatient.patientName.replace(/\s+/g, '_')}.pdf`);
      toast.success('Receipt generated & saved!');
      await loadReceipts();

      // Reset
      setSelectedPatient(null);
      setLineItems([]);
      setRemarks('');
    } catch (err) {
      console.error('Error generating receipt:', err);
      toast.error('Failed to generate receipt');
    } finally {
      setGeneratingPdf(false);
    }
  };

  // Share via WhatsApp
  const handleWhatsAppShare = () => {
    if (!selectedPatient) return;
    const itemsText = lineItems.filter(li => li.description).map((li, i) => `${i + 1}. ${li.description}: \u20B9${li.amount.toLocaleString('en-IN')}`).join('\n');
    const displayDate = new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    const message = `*Receipt - Dr. ${doctorInfo.name}*\nDate: ${displayDate}\n\nPatient: ${selectedPatient.patientName}\nMobile: ${selectedPatient.phone}\n\n${itemsText}\n\n*Total: \u20B9${totalAmount.toLocaleString('en-IN')}*\nPayment: ${paymentMethod}\n${remarks ? `Note: ${remarks}\n` : ''}\n_Generated by HealQR_`;
    const phone = selectedPatient.phone?.replace(/\D/g, '');
    const url = `https://wa.me/${phone.startsWith('91') ? phone : '91' + phone}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleDeleteReceipt = async (receiptId: string) => {
    const userId = localStorage.getItem('userId');
    if (!userId || !db) return;
    try {
      await deleteDoc(doc(db, 'doctors', userId, 'receipts', receiptId));
      toast.success('Receipt deleted');
      await loadReceipts();
    } catch {
      toast.error('Failed to delete receipt');
    }
  };

  // Date navigation
  const changeDate = (delta: number) => {
    const d = new Date(selectedDate + 'T00:00:00');
    d.setDate(d.getDate() + delta);
    setSelectedDate(d.toISOString().split('T')[0]);
  };

  const displayDate = new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' });
  const isToday = selectedDate === new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().split('T')[0];

  // Stats
  const seenPatients = patients.filter(p => p.isSeen);
  const todayRevenue = savedReceipts.reduce((sum, r) => sum + (r.totalAmount || 0), 0);
  const pendingPatients = patients.filter(p => !savedReceipts.some(r => r.patientName === p.patientName)).length;

  return (
    <div className="flex min-h-screen bg-zinc-950 text-white">
      {/* Sidebar */}
      <DashboardSidebar
        activeMenu="billing-receipt"
        onMenuChange={onMenuChange}
        onLogout={onLogout}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        activeAddOns={activeAddOns}
      />

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto">
        {/* Top Bar */}
        <div className="sticky top-0 z-30 bg-zinc-950/80 backdrop-blur-sm border-b border-zinc-800 px-4 lg:px-8 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-2 bg-zinc-900 hover:bg-zinc-800 rounded-lg">
              <Menu className="w-5 h-5 text-emerald-500" />
            </button>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-500/20 rounded-lg">
                <Receipt className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-white">Billing & Receipts</h1>
                <p className="text-[11px] text-zinc-500 hidden sm:block">{displayDate}{isToday && <span className="text-emerald-400 ml-1.5">• Today</span>}</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button onClick={() => setShowHistory(!showHistory)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all ${showHistory ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-zinc-900 text-zinc-400 hover:bg-zinc-800 border border-zinc-800'}`}>
              <FileText className="w-3.5 h-3.5" /> History
              {savedReceipts.length > 0 && (
                <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${showHistory ? 'bg-emerald-500/30 text-emerald-300' : 'bg-zinc-700 text-zinc-300'}`}>
                  {savedReceipts.length}
                </span>
              )}
            </button>
          </div>
        </div>

        <div className="px-4 lg:px-8 py-6 max-w-6xl mx-auto space-y-5">
          {/* Date Navigation */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button onClick={() => changeDate(-1)} className="p-2 bg-zinc-900 hover:bg-zinc-800 rounded-lg transition-colors border border-zinc-800">
                <ChevronLeft className="w-4 h-4 text-zinc-400" />
              </button>
              <div className="relative flex items-center gap-2 bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2 min-w-[180px] justify-center">
                <Calendar className="w-4 h-4 text-emerald-500" />
                <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)}
                  className="bg-transparent text-white text-sm font-medium focus:outline-none cursor-pointer" />
              </div>
              <button onClick={() => changeDate(1)} className="p-2 bg-zinc-900 hover:bg-zinc-800 rounded-lg transition-colors border border-zinc-800">
                <ChevronRight className="w-4 h-4 text-zinc-400" />
              </button>
              {!isToday && (
                <button onClick={() => setSelectedDate(new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().split('T')[0])}
                  className="ml-1 text-[11px] text-emerald-500 hover:text-emerald-400 px-2.5 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-lg font-medium">Today</button>
              )}
            </div>
          </div>

          {/* Summary Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-gray-400 text-[10px] uppercase tracking-wider">Patients</span>
                <User className="w-4 h-4 text-blue-400" />
              </div>
              <div className="text-xl font-bold text-blue-400">{patients.length}</div>
              <p className="text-[10px] text-zinc-600 mt-0.5">{seenPatients.length} seen</p>
            </div>
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-gray-400 text-[10px] uppercase tracking-wider">Receipts</span>
                <FileText className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="text-xl font-bold text-emerald-400">{savedReceipts.length}</div>
              <p className="text-[10px] text-zinc-600 mt-0.5">generated</p>
            </div>
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-gray-400 text-[10px] uppercase tracking-wider">Revenue</span>
                <IndianRupee className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="text-xl font-bold text-emerald-400">{'\u20B9'}{todayRevenue.toLocaleString('en-IN')}</div>
              <p className="text-[10px] text-zinc-600 mt-0.5">total billed</p>
            </div>
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-gray-400 text-[10px] uppercase tracking-wider">Pending</span>
                <Receipt className="w-4 h-4 text-amber-400" />
              </div>
              <div className="text-xl font-bold text-amber-400">{pendingPatients}</div>
              <p className="text-[10px] text-zinc-600 mt-0.5">no receipt yet</p>
            </div>
          </div>

          {/* Receipt History */}
          {showHistory && (
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
              <div className="px-4 py-3 border-b border-zinc-800 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                  <FileText className="w-4 h-4 text-emerald-400" /> Receipts — {displayDate}
                </h3>
                {savedReceipts.length > 0 && (
                  <span className="text-emerald-400 text-xs font-bold">Total: {'\u20B9'}{todayRevenue.toLocaleString('en-IN')}</span>
                )}
              </div>
              {savedReceipts.length === 0 ? (
                <div className="text-center py-8">
                  <Receipt className="w-8 h-8 text-zinc-700 mx-auto mb-2" />
                  <p className="text-zinc-500 text-sm">No receipts for this date</p>
                </div>
              ) : (
                <div className="divide-y divide-zinc-800/50">
                  {savedReceipts.map((r, idx) => (
                    <div key={r.id} className={`flex items-center justify-between px-4 py-3 hover:bg-zinc-800/30 transition-colors ${idx % 2 !== 0 ? 'bg-zinc-950' : ''}`}>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-emerald-500/10 rounded-lg flex items-center justify-center">
                          <Receipt className="w-4 h-4 text-emerald-400" />
                        </div>
                        <div>
                          <div className="text-white text-sm font-medium">{r.patientName}</div>
                          <div className="text-zinc-600 text-[11px]">#{r.receiptNo}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                          r.paymentMethod === 'CASH' ? 'bg-emerald-500/20 text-emerald-400' :
                          r.paymentMethod === 'UPI' ? 'bg-blue-500/20 text-blue-400' :
                          'bg-amber-500/20 text-amber-400'
                        }`}>{r.paymentMethod}</span>
                        <span className="text-emerald-400 font-bold text-sm min-w-[60px] text-right">{'\u20B9'}{r.totalAmount.toLocaleString('en-IN')}</span>
                        <button onClick={() => handleDeleteReceipt(r.id)}
                          className="p-1.5 text-zinc-600 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Patient List — horizontal strip when patient selected, full card when not */}
          {!selectedPatient ? (
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
              <div className="lg:col-span-2">
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
                  <div className="px-4 py-3 border-b border-zinc-800 flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                      <User className="w-4 h-4 text-blue-400" /> Patients
                    </h3>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 font-bold">{patients.length}</span>
                  </div>
                  <div className="p-3">
                    <div className="relative mb-3">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                      <input type="text" placeholder="Search name or phone..." value={patientSearch}
                        onChange={(e) => setPatientSearch(e.target.value)}
                        className="w-full bg-black/50 border border-zinc-800 rounded-lg pl-9 pr-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500 transition-colors placeholder:text-zinc-600" />
                    </div>
                    {loading ? (
                      <div className="flex flex-col items-center justify-center py-12">
                        <div className="animate-spin w-7 h-7 border-2 border-emerald-500 border-t-transparent rounded-full mb-3" />
                        <p className="text-zinc-600 text-xs">Loading patients...</p>
                      </div>
                    ) : patients.length === 0 ? (
                      <div className="text-center py-12">
                        <div className="w-14 h-14 bg-zinc-800/50 rounded-2xl flex items-center justify-center mx-auto mb-3">
                          <User className="w-7 h-7 text-zinc-700" />
                        </div>
                        <p className="text-zinc-400 text-sm font-medium mb-1">No patients</p>
                        <p className="text-zinc-600 text-xs">Patients booked for this date will appear here</p>
                      </div>
                    ) : (
                      <div className="space-y-1.5 max-h-[55vh] overflow-y-auto custom-scrollbar pr-1">
                        {filteredPatients.map(p => {
                          const hasReceipt = savedReceipts.some(r => r.patientName === p.patientName);
                          return (
                            <button key={p.bookingId} onClick={() => handleSelectPatient(p)}
                              className="w-full text-left p-3 rounded-xl transition-all bg-black/30 border border-zinc-800 hover:border-zinc-600 hover:bg-zinc-800/50">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2.5">
                                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${hasReceipt ? 'bg-emerald-500/10 text-emerald-500' : 'bg-zinc-800 text-zinc-400'}`}>
                                    {hasReceipt ? <Check className="w-3.5 h-3.5" /> : p.patientName.charAt(0).toUpperCase()}
                                  </div>
                                  <div>
                                    <div className="text-white text-sm font-medium flex items-center gap-1.5">
                                      {p.patientName}
                                      {hasReceipt && <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold">BILLED</span>}
                                      {p.isSeen && !hasReceipt && <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-blue-500/20 text-blue-400 font-bold">SEEN</span>}
                                    </div>
                                    <div className="text-zinc-500 text-[11px] flex items-center gap-1 mt-0.5">
                                      <Phone className="w-3 h-3 shrink-0" /> {p.phone || 'N/A'}
                                      {p.srlNo && <span className="text-zinc-600">• #{p.srlNo}</span>}
                                    </div>
                                  </div>
                                </div>
                                <div className="text-right shrink-0">
                                  <div className="text-emerald-400 text-sm font-bold">{'\u20B9'}{p.consultationFee || 0}</div>
                                  <div className="text-zinc-600 text-[10px] truncate max-w-[80px]">{p.chamberName}</div>
                                </div>
                              </div>
                            </button>
                          );
                        })}
                        {patientSearch && filteredPatients.length === 0 && (
                          <div className="text-center py-6">
                            <Search className="w-5 h-5 text-zinc-700 mx-auto mb-1.5" />
                            <p className="text-zinc-500 text-xs">No matching patients</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Empty state */}
              <div className="lg:col-span-3">
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
                  <div className="px-4 py-3 border-b border-zinc-800">
                    <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                      <Receipt className="w-4 h-4 text-emerald-400" /> Receipt Builder
                    </h3>
                  </div>
                  <div className="flex flex-col items-center justify-center py-16 px-6">
                    <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center justify-center mb-4">
                      <Receipt className="w-8 h-8 text-emerald-500/50" />
                    </div>
                    <h3 className="text-white font-semibold text-base mb-1">Select a Patient</h3>
                    <p className="text-zinc-500 text-sm text-center max-w-[250px]">Choose a patient from the list to create a receipt with itemized billing</p>
                    {patients.length > 0 && (
                      <div className="mt-4 flex items-center gap-1.5 text-[11px] text-emerald-500">
                        <ChevronLeft className="w-3.5 h-3.5" />
                        <span>{patients.length} patient{patients.length !== 1 ? 's' : ''} available</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* Compact patient selector strip */}
              <div className="flex gap-2 items-center overflow-x-auto pb-1 custom-scrollbar">
                {filteredPatients.map(p => {
                  const hasReceipt = savedReceipts.some(r => r.patientName === p.patientName);
                  const isActive = selectedPatient?.bookingId === p.bookingId;
                  return (
                    <button key={p.bookingId} onClick={() => handleSelectPatient(p)}
                      className={`shrink-0 flex items-center gap-2 px-3 py-2 rounded-xl text-xs transition-all ${
                        isActive
                          ? 'bg-emerald-500/15 border border-emerald-500/30 text-white'
                          : 'bg-zinc-900 border border-zinc-800 text-zinc-400 hover:border-zinc-600 hover:text-white'
                      }`}>
                      <div className={`w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-bold shrink-0 ${
                        isActive ? 'bg-emerald-500/20 text-emerald-400' : hasReceipt ? 'bg-emerald-500/10 text-emerald-500' : 'bg-zinc-800 text-zinc-500'
                      }`}>
                        {hasReceipt ? <Check className="w-3 h-3" /> : p.patientName.charAt(0).toUpperCase()}
                      </div>
                      <span className="font-medium whitespace-nowrap">{p.patientName}</span>
                      {hasReceipt && <span className="text-[8px] px-1 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold">BILLED</span>}
                    </button>
                  );
                })}
              </div>

              {/* Full-width Receipt Builder */}
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
                {/* Patient Header */}
                <div className="bg-emerald-500/5 border-b border-emerald-500/20 px-4 py-2.5 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-emerald-500/20 rounded-xl flex items-center justify-center text-emerald-400 font-bold text-sm">
                      {selectedPatient.patientName.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="text-white font-semibold text-sm">{selectedPatient.patientName}</div>
                      <div className="text-zinc-400 text-[11px] flex items-center gap-2">
                        {selectedPatient.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" /> {selectedPatient.phone}</span>}
                        {selectedPatient.age && <><span className="text-zinc-600">•</span><span>{selectedPatient.age}Y/{selectedPatient.gender?.toUpperCase()}</span></>}
                        {selectedPatient.srlNo && <><span className="text-zinc-600">•</span><span className="px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 text-[10px]">SRL #{selectedPatient.srlNo}</span></>}
                      </div>
                    </div>
                  </div>
                  <button onClick={() => { setSelectedPatient(null); setLineItems([]); }}
                    className="p-1.5 text-zinc-500 hover:text-white rounded-lg hover:bg-zinc-800 transition-colors">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Horizontal Builder: 3 sections side by side */}
                <div className="p-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Col 1: Line Items */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-xs font-semibold text-white flex items-center gap-1.5">
                          <FileText className="w-3.5 h-3.5 text-zinc-400" /> Line Items
                        </h4>
                        <button onClick={addLineItem} className="text-[11px] text-emerald-500 hover:text-emerald-400 flex items-center gap-1 px-2 py-0.5 bg-emerald-500/10 rounded-md hover:bg-emerald-500/20 transition-colors">
                          <Plus className="w-3 h-3" /> Add
                        </button>
                      </div>
                      <div className="space-y-1.5 max-h-[30vh] overflow-y-auto custom-scrollbar pr-1">
                        {lineItems.map((li, idx) => (
                          <div key={li.id} className="flex items-center gap-1.5 group">
                            <span className="text-zinc-600 text-[11px] w-4 shrink-0 text-center">{idx + 1}.</span>
                            <input type="text" value={li.description}
                              onChange={(e) => updateLineItem(li.id, 'description', e.target.value)}
                              placeholder="Description"
                              className="flex-1 bg-black/50 border border-zinc-800 rounded-md px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500 transition-colors placeholder:text-zinc-600" />
                            <div className="relative w-20 shrink-0">
                              <IndianRupee className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-zinc-500" />
                              <input type="number" value={li.amount || ''}
                                onChange={(e) => updateLineItem(li.id, 'amount', Number(e.target.value))}
                                placeholder="0"
                                className="w-full bg-black/50 border border-zinc-800 rounded-md pl-6 pr-2 py-1.5 text-xs text-white text-right focus:outline-none focus:border-emerald-500 transition-colors placeholder:text-zinc-600" />
                            </div>
                            {lineItems.length > 1 && (
                              <button onClick={() => removeLineItem(li.id)}
                                className="p-1 text-zinc-700 hover:text-red-400 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Trash2 className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Col 2: Quick Add */}
                    <div>
                      <p className="text-xs font-semibold text-white mb-2">Quick Add</p>
                      <div className="grid grid-cols-2 gap-1.5">
                        {['Injection', 'Dressing', 'ECG', 'Nebulization', 'Vaccination', 'Lab Test', 'Procedure Fee', 'Follow-up'].map(label => (
                          <button key={label} onClick={() => setLineItems(prev => [...prev, { id: crypto.randomUUID(), description: label, amount: 0 }])}
                            className="text-[11px] px-2.5 py-1.5 bg-zinc-800/80 text-zinc-400 rounded-lg hover:bg-emerald-500/10 hover:text-emerald-400 border border-zinc-800 transition-all text-left">
                            + {label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Col 3: Total + Payment + Actions */}
                    <div className="space-y-3">
                      <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl px-4 py-3 flex items-center justify-between">
                        <span className="text-white font-bold text-sm">Total</span>
                        <span className="text-emerald-400 font-bold text-xl">{'\u20B9'}{totalAmount.toLocaleString('en-IN')}</span>
                      </div>

                      <div>
                        <label className="text-[9px] text-zinc-500 uppercase tracking-wider mb-1.5 block">Payment</label>
                        <div className="flex bg-zinc-800 rounded-lg p-0.5">
                          {(['CASH', 'UPI', 'CARD'] as const).map(method => (
                            <button key={method} onClick={() => setPaymentMethod(method)}
                              className={`flex-1 py-1.5 rounded-md text-xs font-medium transition-all ${
                                paymentMethod === method ? 'bg-emerald-600 text-white' : 'text-zinc-400 hover:text-white'
                              }`}>
                              {method}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <label className="text-[9px] text-zinc-500 uppercase tracking-wider mb-1.5 block">Remarks</label>
                        <input type="text" value={remarks} onChange={(e) => setRemarks(e.target.value)}
                          placeholder="Optional note..."
                          className="w-full bg-black/50 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500 transition-colors placeholder:text-zinc-600" />
                      </div>

                      <div className="flex gap-2">
                        <button onClick={handleGenerateReceipt} disabled={generatingPdf || totalAmount <= 0}
                          className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded-xl transition-all flex items-center justify-center gap-1.5 text-xs disabled:opacity-40 disabled:cursor-not-allowed">
                          {generatingPdf
                            ? <><div className="animate-spin w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full" /> ...</>
                            : <><Download className="w-3.5 h-3.5" /> PDF</>
                          }
                        </button>
                        <button onClick={handleWhatsAppShare} disabled={totalAmount <= 0}
                          className="px-3 py-2 bg-green-700 hover:bg-green-600 text-white font-medium rounded-xl transition-all flex items-center gap-1.5 text-xs disabled:opacity-40 disabled:cursor-not-allowed">
                          <Share2 className="w-3.5 h-3.5" /> WA
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
