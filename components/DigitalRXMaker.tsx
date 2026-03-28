import { useState, useEffect } from 'react';
import { X, Download, Plus, Trash2, Wand2, QrCode } from 'lucide-react';
import QRCode from 'qrcode';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card } from './ui/card';
import { Label } from './ui/label';
import { toast } from 'sonner';
import { jsPDF } from 'jspdf';
import { searchMedicines, type Medicine } from '../utils/medicines';
import { getDrugSuggestionsFromGemini } from '../services/aiService';
import { needsNonLatinRendering, ensureFontLoaded, transliterateTexts, renderNonLatinForPDF } from '../utils/pdfTransliteration';
import type { AILanguage } from '../services/aiTranslationService';

import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { app } from '../lib/firebase/config';
import { processConsultationCompletion } from '../services/fcmLogicService';

interface DigitalRXMakerProps {
  patient: {
    id: string;
    name: string;
    age: number;
    gender: string;
    phone: string;
    bookingId: string;
    appointmentTime: Date;
    bookingTime: Date;
    language?: any;
    purpose?: string;
    srlNo?: string | number;
  };
  doctorInfo: {
    name: string;
    degree: string;
    degrees?: string[];
    specialty?: string;
    specialities?: string[];
    specialties?: string[];
    qrNumber?: string;
    clinicName?: string;
    doctorId: string;
    address?: string;
    timing?: string;
    registrationNumber?: string;
    showRegistrationOnRX?: boolean;
    useDrPrefix?: boolean;
    // Context-aware PDF fields
    pdfContext?: 'clinic' | 'doctor';
    clinicInfo?: {
      name: string;
      address: string;
      qrNumber: string;
      phone?: string;
      clinicId: string;
      registrationNumber?: string;
      showRegistrationOnRx?: boolean;
      footerLine1?: string;
      footerLine2?: string;
      watermarkLogo?: string;
    };
    allDoctors?: Array<{
      name: string;
      specialty: string;
      timing: string;
      registrationNumber?: string;
    }>;
    allChambers?: Array<{
      name: string;
      address: string;
      timing: string;
    }>;
    footerLine1?: string;
    footerLine2?: string;
    watermarkLogo?: string;
  };
  onClose: () => void;
  onPause?: (savedState: { items: any[], remarks: string, diagnosis: string, vitals: Record<string,string>, pathology: Record<string,string>, suggestedTests: string[] }) => void;
  onGenerated?: (downloadURL: string, rxData?: { items: any[], remarks: string, diagnosis: string, vitals: Record<string,string>, pathology: Record<string,string>, suggestedTests: string[] }) => void;
  initialState?: {
    items: any[];
    remarks: string;
    diagnosis: string;
    vitals?: Record<string,string>;
    pathology?: Record<string,string>;
    suggestedTests?: string[];
  };
}

interface PrescriptionItem {
  id: string;
  medicineName: string;
  type: string;
  strength: string;
  dosage: string;
  duration: string;
  instructions: string;
}

const VITALS_OPTIONS: Record<string, { label: string; unit: string }> = {
  bp: { label: 'Blood Pressure', unit: 'mmHg' },
  pulse: { label: 'Pulse', unit: 'bpm' },
  temp: { label: 'Temperature', unit: '°F' },
  spo2: { label: 'SpO2', unit: '%' },
  rr: { label: 'Resp. Rate', unit: '/min' },
  weight: { label: 'Weight', unit: 'kg' },
  height: { label: 'Height', unit: 'cm' },
  bmi: { label: 'BMI', unit: 'kg/m²' },
};

const PATHOLOGY_OPTIONS: Record<string, { label: string; unit: string }> = {
  fbs: { label: 'Fasting Blood Sugar', unit: 'mg/dL' },
  ppbs: { label: 'PP Blood Sugar', unit: 'mg/dL' },
  rbs: { label: 'Random Blood Sugar', unit: 'mg/dL' },
  hba1c: { label: 'HbA1c', unit: '%' },
  hb: { label: 'Hemoglobin', unit: 'g/dL' },
  wbc: { label: 'WBC', unit: '/μL' },
  platelet: { label: 'Platelet', unit: 'lakh/μL' },
  creatinine: { label: 'Creatinine', unit: 'mg/dL' },
  urea: { label: 'Blood Urea', unit: 'mg/dL' },
  uricAcid: { label: 'Uric Acid', unit: 'mg/dL' },
  cholesterol: { label: 'Total Cholesterol', unit: 'mg/dL' },
  hdl: { label: 'HDL', unit: 'mg/dL' },
  ldl: { label: 'LDL', unit: 'mg/dL' },
  triglycerides: { label: 'Triglycerides', unit: 'mg/dL' },
  tsh: { label: 'TSH', unit: 'μIU/mL' },
  t3: { label: 'T3', unit: 'ng/dL' },
  t4: { label: 'T4', unit: 'μg/dL' },
  sgot: { label: 'SGOT (AST)', unit: 'U/L' },
  sgpt: { label: 'SGPT (ALT)', unit: 'U/L' },
  esr: { label: 'ESR', unit: 'mm/hr' },
};

const COMMON_TESTS: string[] = [
  'CBC (Complete Blood Count)',
  'LFT (Liver Function Test)',
  'KFT (Kidney Function Test)',
  'Lipid Profile',
  'Thyroid Profile (T3, T4, TSH)',
  'Blood Sugar (F/PP)',
  'HbA1c',
  'Urine R/M',
  'Urine C/S',
  'Stool R/M',
  'Chest X-Ray (PA View)',
  'X-Ray',
  'ECG',
  'USG Abdomen',
  'USG Whole Abdomen',
  '2D Echo',
  'TMT (Treadmill Test)',
  'MRI',
  'CT Scan',
  'HRCT Chest',
  'Blood C/S',
  'Widal Test',
  'Dengue NS1 + IgM/IgG',
  'Malaria (MP)',
  'CRP (C-Reactive Protein)',
  'RA Factor',
  'ANA Profile',
  'Vitamin D',
  'Vitamin B12',
  'Iron Profile',
  'Serum Electrolytes',
  'PT/INR',
  'D-Dimer',
  'Troponin I',
  'PSA (Prostate Specific Antigen)',
  'HBsAg',
  'Anti HCV',
  'HIV I & II',
  'Sputum AFB',
  'Mantoux Test',
];

export default function DigitalRXMaker({
  patient,
  doctorInfo,
  onClose,
  onPause,
  onGenerated,
  initialState
}: DigitalRXMakerProps) {
  const [items, setItems] = useState<PrescriptionItem[]>(initialState?.items || [
    { id: '1', medicineName: '', type: 'Tablet', strength: '', dosage: '1-0-1', duration: '5 Days', instructions: 'After Food' }
  ]);
  const [remarks, setRemarks] = useState(initialState?.remarks || '');
  const [diagnosis, setDiagnosis] = useState(initialState?.diagnosis || '');
  const [generating, setGenerating] = useState(false);

  // Common Findings (Vitals)
  const [vitals, setVitals] = useState<Record<string, string>>(initialState?.vitals || {});
  const [selectedVitalKey, setSelectedVitalKey] = useState('');
  const [vitalInputValue, setVitalInputValue] = useState('');
  const [customVitalName, setCustomVitalName] = useState('');

  // Pathology Values
  const [pathology, setPathology] = useState<Record<string, string>>(initialState?.pathology || {});
  const [selectedPathKey, setSelectedPathKey] = useState('');
  const [pathInputValue, setPathInputValue] = useState('');
  const [customPathName, setCustomPathName] = useState('');

  // Suggested Tests
  const [suggestedTests, setSuggestedTests] = useState<string[]>(initialState?.suggestedTests || []);
  const [selectedTestKey, setSelectedTestKey] = useState('');
  const [customTestName, setCustomTestName] = useState('');

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [activeItemIndex, setActiveItemIndex] = useState<number | null>(null);
  const [suggestions, setSuggestions] = useState<Medicine[]>([]);
  const [aiLoading, setAiLoading] = useState(false);

  useEffect(() => {
    if (searchQuery.length > 1) {
      const localResults = searchMedicines(searchQuery);
      setSuggestions(localResults);
    } else {
      setSuggestions([]);
    }
  }, [searchQuery]);

  const handleAIHelp = async (index: number) => {
    const query = items[index].medicineName;
    if (query.length < 3) {
      toast.error('Type at least 3 letters for AI help');
      return;
    }

    setAiLoading(true);
    const aiResults = await getDrugSuggestionsFromGemini(query);
    if (aiResults.length > 0) {
      // Map AI types to our Medicine types if needed, or just use as is
      setSuggestions(aiResults as Medicine[]);
      setActiveItemIndex(index);
    } else {
      toast.error('No suggestions found');
    }
    setAiLoading(false);
  };

  const addItem = () => {
    setItems([{
      id: Math.random().toString(36).substr(2, 9),
      medicineName: '',
      type: 'Tablet',
      strength: '',
      dosage: '1-0-1',
      duration: '5 Days',
      instructions: 'After Food'
    }, ...items]);
  };

  const removeItem = (id: string) => {
    if (items.length > 1) {
      setItems(items.filter(item => item.id !== id));
    }
  };

  const updateItem = (index: number, field: keyof PrescriptionItem, value: string) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    setItems(newItems);
  };

  const selectSuggestion = (index: number, med: Medicine) => {
    const newItems = [...items];
    newItems[index] = {
      ...newItems[index],
      medicineName: med.name,
      type: med.type,
      strength: med.strength,
      dosage: med.commonDosage || newItems[index].dosage
    };
    setItems(newItems);
    setSuggestions([]);
    setActiveItemIndex(null);
  };

  const generatePDF = async () => {
    setGenerating(true);
    try {
      // ─── Bilingual: Transliterate medicine names + instructions if non-English ───
      const patientLang = (patient.language || 'english') as AILanguage;
      const isBilingual = needsNonLatinRendering(patientLang);
      let scriptFont: string | null = null;
      let transliteratedMeds: string[] = [];
      let transliteratedInstructions: string[] = [];
      const headerTranslit = new Map<string, string>(); // English → transliterated

      if (isBilingual) {
        const validMeds = items.filter(item => item.medicineName);
        const medNames = validMeds.map((item: any) => `${item.type} ${item.medicineName} ${item.strength}`);
        const instrTexts = validMeds.map((item: any) => item.instructions || '').filter(Boolean);

        // Collect header texts for transliteration
        const headerTexts: string[] = [];
        const isClinicCtx = doctorInfo.pdfContext === 'clinic' && doctorInfo.clinicInfo;
        if (isClinicCtx) {
          if (doctorInfo.clinicInfo!.name) headerTexts.push(doctorInfo.clinicInfo!.name);
          if (doctorInfo.clinicInfo!.address) headerTexts.push(doctorInfo.clinicInfo!.address);
        }
        const drDisplay = (doctorInfo.useDrPrefix ?? true) ? `Dr. ${doctorInfo.name}` : doctorInfo.name;
        headerTexts.push(drDisplay);
        const degStr = doctorInfo.degrees?.length ? doctorInfo.degrees.join(', ') : doctorInfo.degree;
        if (degStr) headerTexts.push(degStr);
        const specList = doctorInfo.specialties || doctorInfo.specialities;
        const specStr = (specList && specList.length > 0) ? specList.join(', ') : doctorInfo.specialty;
        if (specStr) headerTexts.push(specStr);
        if (doctorInfo.timing) headerTexts.push(doctorInfo.timing);
        if (!isClinicCtx && doctorInfo.clinicName) headerTexts.push(doctorInfo.clinicName);
        if (!isClinicCtx && doctorInfo.address) headerTexts.push(doctorInfo.address);
        // Patient labels + values
        headerTexts.push('Patient Name:', patient.name, 'Mobile:', 'Age/Sex:', 'Purpose:', 'Booking ID / SRL:');
        if (patient.purpose) headerTexts.push(patient.purpose);

        // Load font + transliterate all in parallel
        const [font, medResults, instrResults, headerResults] = await Promise.all([
          ensureFontLoaded(patientLang),
          transliterateTexts(medNames, patientLang),
          instrTexts.length > 0 ? transliterateTexts(instrTexts, patientLang) : Promise.resolve([]),
          transliterateTexts(headerTexts, patientLang),
        ]);
        scriptFont = font;
        transliteratedMeds = medResults;
        transliteratedInstructions = instrResults;
        headerTexts.forEach((text, idx) => headerTranslit.set(text, headerResults[idx]));
      }

      // Helper: render transliterated text below the current position
      const addTranslitBelow = (text: string, x: number, y: number, fontSize: number, maxWidth?: number) => {
        if (!isBilingual || !scriptFont || !headerTranslit.has(text)) return 0;
        const rendered = renderNonLatinForPDF(headerTranslit.get(text)!, scriptFont, fontSize, '#888');
        const w = maxWidth ? Math.min(rendered.widthMM, maxWidth) : rendered.widthMM;
        doc.addImage(rendered.dataUrl, 'PNG', x, y, w, rendered.heightMM);
        return rendered.heightMM + 0.5;
      };

      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const margin = 20;
      const contentWidth = pageWidth - (margin * 2);

      // --- HEADER SECTION (Context-Aware) ---
      const isClinic = doctorInfo.pdfContext === 'clinic' && doctorInfo.clinicInfo;

      let currentY = 20;

      if (isClinic) {
        // === CLINIC HEADER: Clinic Name & Address FIRST, then Doctor ===
        doc.setFontSize(20);
        doc.setTextColor(30, 41, 59);
        doc.setFont('helvetica', 'bold');
        const clinicNameText = (doctorInfo.clinicInfo!.name || '');
        doc.text(clinicNameText.toUpperCase(), margin, currentY);
        currentY += addTranslitBelow(clinicNameText, margin, currentY, 12, pageWidth / 2 - margin);
        currentY += 7;

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.setTextColor(100);
        if (doctorInfo.clinicInfo!.address) {
          const addrText = doctorInfo.clinicInfo!.address;
          const splitAddr = doc.splitTextToSize(addrText, pageWidth / 2 - margin);
          doc.text(splitAddr, margin, currentY);
          currentY += splitAddr.length * 4 + 1;
          currentY += addTranslitBelow(addrText, margin, currentY, 7, pageWidth / 2 - margin);
          currentY += 1;
        }
        if (doctorInfo.clinicInfo!.phone) {
          doc.text(`Tel: ${doctorInfo.clinicInfo!.phone}`, margin, currentY);
          currentY += 5;
        }
        // Clinic registration number
        if (doctorInfo.clinicInfo!.showRegistrationOnRx && doctorInfo.clinicInfo!.registrationNumber) {
          doc.text(`Clinic Reg: ${doctorInfo.clinicInfo!.registrationNumber}`, margin, currentY);
          currentY += 5;
        }

        // Then Doctor info
        currentY += 2;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(14);
        doc.setTextColor(40);
        const displayName = (doctorInfo.useDrPrefix ?? true) ? `Dr. ${doctorInfo.name}` : doctorInfo.name;
        doc.text(displayName.toUpperCase(), margin, currentY);
        currentY += addTranslitBelow(displayName, margin, currentY, 9, pageWidth / 2 - margin);
        currentY += 5;

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.setTextColor(100);
        const degreesText = doctorInfo.degrees?.length ? doctorInfo.degrees.join(', ') : doctorInfo.degree;
        if (degreesText) {
          doc.text(degreesText, margin, currentY); currentY += 4;
          currentY += addTranslitBelow(degreesText, margin, currentY - 1, 7);
        }
        const specialtiesList = doctorInfo.specialties || doctorInfo.specialities;
        const specialtiesText = (specialtiesList && specialtiesList.length > 0) ? specialtiesList.join(', ') : doctorInfo.specialty;
        if (specialtiesText) {
          doc.text(specialtiesText, margin, currentY); currentY += 4;
          currentY += addTranslitBelow(specialtiesText, margin, currentY - 1, 7);
        }
        if (doctorInfo.showRegistrationOnRX && doctorInfo.registrationNumber) {
          doc.text(`REG NO: ${doctorInfo.registrationNumber}`, margin, currentY);
          currentY += 4;
        }
        if (doctorInfo.timing) {
          doc.text(`Timing: ${doctorInfo.timing}`, margin, currentY); currentY += 4;
          currentY += addTranslitBelow(doctorInfo.timing, margin, currentY - 1, 7);
        }

      } else {
        // === DOCTOR HEADER: Doctor Name & Details FIRST, then Chamber ===
        doc.setFontSize(22);
        doc.setTextColor(40);
        doc.setFont('helvetica', 'bold');
        const displayName = (doctorInfo.useDrPrefix ?? true) ? `Dr. ${doctorInfo.name}` : doctorInfo.name;
        doc.text(displayName.toUpperCase(), margin, currentY);
        currentY += addTranslitBelow(displayName, margin, currentY, 12, pageWidth / 2 - margin);
        currentY += 8;

        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100);

        const degreesText = doctorInfo.degrees?.length ? doctorInfo.degrees.join(', ') : doctorInfo.degree;
        if (degreesText) {
          doc.text(degreesText, margin, currentY); currentY += 5;
          currentY += addTranslitBelow(degreesText, margin, currentY - 2, 7);
        }
        const specialtiesList = doctorInfo.specialties || doctorInfo.specialities;
        const specialtiesText = (specialtiesList && specialtiesList.length > 0) ? specialtiesList.join(', ') : doctorInfo.specialty;
        if (specialtiesText) {
          doc.text(specialtiesText, margin, currentY); currentY += 5;
          currentY += addTranslitBelow(specialtiesText, margin, currentY - 2, 7);
        }
        if (doctorInfo.showRegistrationOnRX && doctorInfo.registrationNumber) {
          doc.text(`REG NO: ${doctorInfo.registrationNumber}`, margin, currentY);
          currentY += 6;
        }

        // Chamber / Clinic info below doctor
        if (doctorInfo.clinicName) {
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(60);
          doc.text(doctorInfo.clinicName, margin, currentY);
          currentY += addTranslitBelow(doctorInfo.clinicName, margin, currentY, 8);
          currentY += 5;
        }
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100);
        doc.setFontSize(9);
        if (doctorInfo.address) {
          const addrText = doctorInfo.address;
          const splitAddress = doc.splitTextToSize(addrText, pageWidth / 2 - margin);
          doc.text(splitAddress, margin, currentY);
          currentY += (splitAddress.length * 5);
          currentY += addTranslitBelow(addrText, margin, currentY, 7, pageWidth / 2 - margin);
        }
        if (doctorInfo.timing) {
          doc.text(doctorInfo.timing, margin, currentY); currentY += 5;
          currentY += addTranslitBelow(doctorInfo.timing, margin, currentY - 2, 7);
        }
      }

      // Right Side: QR Code — Context-Aware
      const qrSize = 35;
      const qrX = pageWidth - margin - qrSize;
      const qrY = 18;

      doc.setFontSize(7);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(40);
      doc.text('FOR APPOINTMENT SCAN HERE', qrX + (qrSize / 2), qrY - 3, { align: 'center' });

      // Build QR URL — Clinic QR for clinic bookings, Doctor QR for personal bookings
      let qrUrl: string;
      if (isClinic && doctorInfo.clinicInfo?.clinicId) {
        qrUrl = `https://teamhealqr.web.app/?page=clinic-mini-website&clinicId=${doctorInfo.clinicInfo.clinicId}`;
      } else {
        qrUrl = `https://teamhealqr.web.app/?page=doctor-mini-website&doctorId=${doctorInfo.doctorId}`;
      }

      // Generate QR Code as DataURL
      const qrDataUrl = await QRCode.toDataURL(qrUrl, { margin: 1, width: 200 });
      doc.addImage(qrDataUrl, 'PNG', qrX, qrY, qrSize, qrSize);

      // Show main clinic name below QR code if this is a branch
      if (isClinic && doctorInfo.clinicInfo?.mainClinicName) {
        doc.setFontSize(7);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(80);
        doc.text(doctorInfo.clinicInfo.mainClinicName.toUpperCase(), qrX + (qrSize / 2), qrY + qrSize + 4, { align: 'center' });
      }

      doc.setLineWidth(0.5);
      doc.setDrawColor(200);
      const headerEndY = Math.max(currentY + 5, 65);
      doc.line(margin, headerEndY, pageWidth - margin, headerEndY);

      // --- PATIENT INFO SECTION ---
      doc.setFontSize(10);
      doc.setTextColor(60);
      doc.setFont('helvetica', 'bold');

      const patientRowY = headerEndY + 10;
      doc.text('Patient Name:', margin, patientRowY);
      doc.setFont('helvetica', 'normal');
      doc.text(patient.name, margin + 25, patientRowY);
      // Transliterated patient name below
      addTranslitBelow(patient.name, margin + 25, patientRowY + 1, 7);

      doc.setFont('helvetica', 'bold');
      doc.text('Mobile:', margin + 80, patientRowY);
      doc.setFont('helvetica', 'normal');
      doc.text(patient.phone, margin + 95, patientRowY);

      doc.setFont('helvetica', 'bold');
      doc.text('Age/Sex:', margin + 135, patientRowY);
      doc.setFont('helvetica', 'normal');
      doc.text(`${patient.age}Y/${patient.gender}`, margin + 155, patientRowY);

      const patientRow2Y = patientRowY + 7;
      if (patient.purpose) {
        doc.setFont('helvetica', 'bold');
        doc.text('Purpose:', margin, patientRow2Y);
        doc.setFont('helvetica', 'normal');
        doc.text(patient.purpose, margin + 20, patientRow2Y);
        addTranslitBelow(patient.purpose, margin + 20, patientRow2Y + 1, 7);
      }

      doc.setFont('helvetica', 'bold');
      doc.text('Booking ID / SRL:', margin + 120, patientRow2Y);
      doc.setFont('helvetica', 'normal');
      const serialDisplay = patient.srlNo ? `SRL-${patient.srlNo}` : patient.bookingId;
      doc.text(serialDisplay, margin + 155, patientRow2Y);

      const patientEndY = patientRow2Y + 6;
      doc.line(margin, patientEndY, pageWidth - margin, patientEndY);

      // --- WATERMARK LOGO (if available) ---
      const wmLogo = (isClinic && doctorInfo.clinicInfo?.watermarkLogo) || doctorInfo.watermarkLogo;
      if (wmLogo) {
        try {
          const wmImg = new Image();
          wmImg.crossOrigin = 'anonymous';
          await new Promise<void>((resolve, reject) => {
            wmImg.onload = () => resolve();
            wmImg.onerror = () => reject();
            wmImg.src = wmLogo;
          });
          // Draw watermark in center with low opacity
          const wmSize = 80;
          const wmX = (pageWidth - wmSize) / 2;
          const wmY = 120;
          // jsPDF doesn't support opacity directly — use GState
          const gState = (doc as any).GState({ opacity: 0.08 });
          doc.saveGraphicsState();
          doc.setGState(gState);
          doc.addImage(wmImg, 'PNG', wmX, wmY, wmSize, wmSize);
          doc.restoreGraphicsState();
        } catch {
          // Skip watermark if image fails to load
          console.log('Watermark image failed to load, skipping');
        }
      }

      // --- MAIN BODY (TWO PANELS) ---
      const bodyY = patientEndY + 10;
      const leftColWidth = contentWidth * 0.33;
      const dividerX = margin + leftColWidth;

      // Draw vertical divider
      doc.setLineWidth(0.2);
      doc.line(dividerX, bodyY - 5, dividerX, 230);

      // LEFT PANEL: History & Diagnosis
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.text('HISTORY & DIAGNOSIS', margin, bodyY);

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      const diagnosisLines = doc.splitTextToSize(diagnosis || 'No diagnosis recorded.', leftColWidth - 5);
      doc.text(diagnosisLines, margin, bodyY + 10);

      // Vitals & Pathology in Left Panel
      let leftPanelY = bodyY + 10 + (diagnosisLines.length * 5) + 5;

      // Common Findings / Vitals
      const activeVitals = Object.entries(vitals).filter(([_, v]) => v);
      if (activeVitals.length > 0) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(0, 150, 150);
        doc.text('VITALS:', margin, leftPanelY);
        leftPanelY += 4;

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.5);
        doc.setTextColor(60);
        activeVitals.forEach(([key, val]) => {
          if (leftPanelY < 225) {
            const opt = VITALS_OPTIONS[key];
            const label = opt ? opt.label : key;
            const unit = opt ? ` ${opt.unit}` : '';
            doc.text(`${label}: ${val}${unit}`, margin + 2, leftPanelY);
            leftPanelY += 4;
          }
        });
        leftPanelY += 2;
      }

      // Pathology Values
      const activePath = Object.entries(pathology).filter(([_, v]) => v);
      if (activePath.length > 0) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(180, 120, 0);
        doc.text('LAB VALUES:', margin, leftPanelY);
        leftPanelY += 4;

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.5);
        doc.setTextColor(60);
        activePath.forEach(([key, val]) => {
          if (leftPanelY < 225) {
            const opt = PATHOLOGY_OPTIONS[key];
            const label = opt ? opt.label : key;
            const unit = opt ? ` ${opt.unit}` : '';
            doc.text(`${label}: ${val}${unit}`, margin + 2, leftPanelY);
            leftPanelY += 4;
          }
        });
        leftPanelY += 2;
      }

      // Suggested Investigations in Left Panel
      if (suggestedTests.length > 0) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(100, 60, 180);
        doc.text('INVESTIGATIONS:', margin, leftPanelY);
        leftPanelY += 4;

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7);
        doc.setTextColor(60);
        suggestedTests.forEach((test) => {
          if (leftPanelY < 228) {
            const testLines = doc.splitTextToSize(`• ${test}`, leftColWidth - 5);
            doc.text(testLines, margin + 2, leftPanelY);
            leftPanelY += testLines.length * 3.5;
          }
        });
      }

      // RIGHT PANEL: Prescription
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(24);
      doc.text('Rx', dividerX + 10, bodyY);

      const rxAreaWidth = contentWidth - leftColWidth - 10;
      const validItems = items.filter(item => item.medicineName);
      const maxMedsPerPage = 8;
      let currentMedY = bodyY + 15;
      let medPageCount = 0;

      validItems.forEach((item, i) => {
        // Check if we need a new page (after every 5 meds)
        if (i > 0 && i % maxMedsPerPage === 0) {
          // Draw bottom section and footer on current page before creating new page
          // (only remarks on first page)
          doc.addPage();
          medPageCount++;

          // Re-draw header on new page
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(10);
          doc.setTextColor(100);
          const drName = (doctorInfo.useDrPrefix ?? true) ? `Dr. ${doctorInfo.name}` : doctorInfo.name;
          doc.text(`${drName} — Prescription (contd.)`, margin, 15);
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(8);
          doc.text(`Patient: ${patient.name} | ${patient.age}Y/${patient.gender}`, margin, 22);
          doc.setLineWidth(0.3);
          doc.setDrawColor(200);
          doc.line(margin, 26, pageWidth - margin, 26);

          // Reset Rx header on new page
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(18);
          doc.setTextColor(60);
          doc.text('Rx (contd.)', margin, 36);
          currentMedY = 46;
        }

        doc.setFontSize(11);
        doc.setTextColor(60);
        doc.setFont('helvetica', 'bold');
        const medLine = `${i + 1}. ${item.type} ${item.medicineName} (${item.strength})`;
        const medLines = doc.splitTextToSize(medLine, rxAreaWidth);
        doc.text(medLines, dividerX + 10, currentMedY);

        // ─── Bilingual: transliterated medicine name below English ───
        let bilingualOffset = 0;
        if (isBilingual && scriptFont && transliteratedMeds[i]) {
          const rendered = renderNonLatinForPDF(transliteratedMeds[i], scriptFont, 10, '#888');
          doc.addImage(rendered.dataUrl, 'PNG', dividerX + 15, currentMedY + (medLines.length * 5) - 1, rendered.widthMM, rendered.heightMM);
          bilingualOffset = rendered.heightMM + 1;
        }

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.text(`Dosage: ${item.dosage} | Duration: ${item.duration}`, dividerX + 15, currentMedY + (medLines.length * 5) + 1 + bilingualOffset);

        if (item.instructions) {
          doc.setTextColor(100);
          doc.text(`Note: ${item.instructions}`, dividerX + 15, currentMedY + (medLines.length * 5) + 7 + bilingualOffset);

          // Transliterated instruction
          let instrOffset = 0;
          if (isBilingual && scriptFont && item.instructions) {
            // Find the matching transliterated instruction
            const instrIdx = validItems.slice(0, i + 1).filter((it: any) => it.instructions).length - 1;
            if (transliteratedInstructions[instrIdx]) {
              const instrRendered = renderNonLatinForPDF(transliteratedInstructions[instrIdx], scriptFont, 8, '#999');
              doc.addImage(instrRendered.dataUrl, 'PNG', dividerX + 15, currentMedY + (medLines.length * 5) + 10 + bilingualOffset, instrRendered.widthMM, instrRendered.heightMM);
              instrOffset = instrRendered.heightMM;
            }
          }

          doc.setTextColor(60);
          currentMedY += (medLines.length * 5) + 14 + bilingualOffset + instrOffset;
        } else {
          currentMedY += (medLines.length * 5) + 8 + bilingualOffset;
        }
      });

      // If we had extra pages, go back to page 1 for the bottom section
      // Actually, we write bottom/footer on last page
      // If multi-page, remarks go on the last page
      const lastPageBottomStart = medPageCount > 0 ? Math.max(currentMedY + 5, 200) : 235;

      // --- BOTTOM SECTION: Special Instructions ---
      let bottomY = lastPageBottomStart + 5;
      if (medPageCount === 0) {
        doc.setLineWidth(0.5);
        doc.setDrawColor(200);
        doc.line(margin, lastPageBottomStart, pageWidth - margin, lastPageBottomStart);
        bottomY = lastPageBottomStart + 5;
      }

      if (remarks) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.setTextColor(60);
        doc.text('SPECIAL INSTRUCTIONS:', margin, bottomY);
        doc.setFont('helvetica', 'normal');
        const remarksLines = doc.splitTextToSize(remarks, contentWidth);
        doc.text(remarksLines, margin, bottomY + 7);
        bottomY += 7 + (remarksLines.length * 4) + 2;

        // Bilingual: transliterated special instructions
        if (isBilingual && scriptFont) {
          try {
            const [translitRemarks] = await transliterateTexts([remarks], patientLang);
            if (translitRemarks) {
              const rendered = renderNonLatinForPDF(translitRemarks, scriptFont, 8, '#888');
              doc.addImage(rendered.dataUrl, 'PNG', margin, bottomY, Math.min(rendered.widthMM, contentWidth), rendered.heightMM);
              bottomY += rendered.heightMM + 2;
            }
          } catch { /* skip if fails */ }
        }
      }

      // --- FOOTER BOX (Context-Aware, Compact) ---
      const footerTopY = 258;
      doc.setDrawColor(200);
      doc.setLineWidth(0.3);

      // Helper: render custom footer lines side-by-side in one tiny line
      const renderFooterLines = (line1: string, line2: string, yPos: number) => {
        const combined = [line1, line2].filter(Boolean).join('  |  ');
        if (combined) {
          doc.setFont('helvetica', 'italic');
          doc.setFontSize(5.5);
          doc.setTextColor(130);
          doc.text(combined, pageWidth / 2, yPos, { align: 'center' });
          return 3;
        }
        return 0;
      };

      // Helper: render standardized disclaimer box
      const renderDisclaimer = (yPos: number) => {
        const line1 = 'DISCLAIMER: Not valid for death certificate, fitness/leave/rest certificate, or medico-legal purposes.';
        const line2 = 'Clinical responsibility lies with the prescribing doctor. HealQR.com bears no medical or legal liability.';
        doc.setDrawColor(180, 160, 130);
        doc.setLineWidth(0.3);
        doc.setFillColor(255, 250, 235);
        const dH = 8;
        doc.roundedRect(margin, yPos, contentWidth, dH, 1.5, 1.5, 'FD');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(5);
        doc.setTextColor(120, 100, 70);
        doc.text(line1, pageWidth / 2, yPos + 3, { align: 'center' });
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(5);
        doc.setTextColor(130, 110, 80);
        doc.text(line2, pageWidth / 2, yPos + 6, { align: 'center' });
        return dH + 1;
      };

      if (isClinic && doctorInfo.allDoctors && doctorInfo.allDoctors.length > 0) {
        // CLINIC FOOTER: Always show specialty groups with counts (saves space)
        const doctors = doctorInfo.allDoctors;
        const specialtyMap: Record<string, number> = {};
        doctors.forEach(dr => {
          const spec = dr.specialty || 'General';
          specialtyMap[spec] = (specialtyMap[spec] || 0) + 1;
        });
        const specEntries = Object.entries(specialtyMap);
        const specLine = specEntries.map(([spec, count]) => `${spec} (${count})`).join('  •  ');
        const specLines = doc.splitTextToSize(specLine, contentWidth - 6);

        const footerBoxH = 8 + (specLines.length * 3.5) + 5;
        doc.setFillColor(248, 250, 252);
        doc.roundedRect(margin, footerTopY, contentWidth, footerBoxH, 2, 2, 'FD');

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(6);
        doc.setTextColor(100);
        doc.text(`DOCTORS BY SPECIALTY (${doctors.length} Doctors)`, margin + 3, footerTopY + 3.5);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(6);
        doc.setTextColor(80);
        doc.text(specLines, margin + 3, footerTopY + 7);

        // QR scan prompt line
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(5.5);
        doc.setTextColor(60);
        doc.text('FOR MORE DETAILS AND APPOINTMENT SCAN ABOVE QR CODE', pageWidth / 2, footerTopY + 7 + (specLines.length * 3.5) + 2, { align: 'center' });

        const cFL1 = doctorInfo.clinicInfo?.footerLine1 || doctorInfo.footerLine1 || '';
        const cFL2 = doctorInfo.clinicInfo?.footerLine2 || doctorInfo.footerLine2 || '';
        let afterBox = footerTopY + footerBoxH + 2;
        afterBox += renderFooterLines(cFL1, cFL2, afterBox);
        afterBox += renderDisclaimer(afterBox);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(6);
        doc.setTextColor(150);
        doc.text(`Digitally generated by HealQR  •  No signature required  •  ${new Date().toLocaleDateString('en-GB')}`, pageWidth / 2, afterBox + 1, { align: 'center' });

      } else if (!isClinic && doctorInfo.allChambers && doctorInfo.allChambers.length > 0) {
        // DOCTOR FOOTER: Compact box with all chambers
        const chLineH = 3.5;
        const footerBoxH = 5 + (doctorInfo.allChambers.length * chLineH) + 2;
        doc.setFillColor(248, 250, 252);
        doc.roundedRect(margin, footerTopY, contentWidth, footerBoxH, 2, 2, 'FD');

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(6);
        doc.setTextColor(100);
        doc.text('ALSO AVAILABLE AT', margin + 3, footerTopY + 3.5);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(6);
        doc.setTextColor(80);
        doctorInfo.allChambers.forEach((ch, i) => {
          const line = `${ch.name}  •  ${ch.address || ''}  •  ${ch.timing || ''}`;
          const trimmed = doc.splitTextToSize(line, contentWidth - 6)[0];
          doc.text(trimmed, margin + 3, footerTopY + 7 + (i * chLineH));
        });

        const dFooterLine1 = doctorInfo.footerLine1 || '';
        const dFooterLine2 = doctorInfo.footerLine2 || '';
        let afterBox = footerTopY + footerBoxH + 2;
        afterBox += renderFooterLines(dFooterLine1, dFooterLine2, afterBox);
        afterBox += renderDisclaimer(afterBox);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(6);
        doc.setTextColor(150);
        doc.text(`Digitally generated by HealQR  •  No signature required  •  ${new Date().toLocaleDateString('en-GB')}`, pageWidth / 2, afterBox + 1, { align: 'center' });

      } else {
        // FALLBACK: Simple footer with custom lines side-by-side
        const fFooterLine1 = doctorInfo.clinicInfo?.footerLine1 || doctorInfo.footerLine1 || '';
        const fFooterLine2 = doctorInfo.clinicInfo?.footerLine2 || doctorInfo.footerLine2 || '';
        let fallbackY = 280;
        fallbackY += renderFooterLines(fFooterLine1, fFooterLine2, fallbackY);
        fallbackY += renderDisclaimer(fallbackY);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(6);
        doc.setTextColor(150);
        doc.text(`Digitally generated by HealQR  •  No signature required  •  ${new Date().toLocaleDateString('en-GB')}`, pageWidth / 2, fallbackY + 1, { align: 'center' });
      }

      // Generate PDF as Blob for upload
      const pdfBlob = doc.output('blob');
      const fileName = `rx_${patient.bookingId}_${Date.now()}.pdf`;
      const storagePath = `prescriptions/${patient.id}/${fileName}`;

      const storageRef = ref(getStorage(app!), storagePath);
      await uploadBytes(storageRef, pdfBlob);
      const downloadURL = await getDownloadURL(storageRef);

      // Save PDF to local device
      doc.save(`Prescription_${patient.name.replace(/\s+/g, '_')}.pdf`);

      if (onGenerated) {
        toast.success('Digital RX generated!');
        onGenerated(downloadURL, { items, remarks, diagnosis, vitals, pathology, suggestedTests });
      } else {
        // Fallback for standalone usage
        try {
          await processConsultationCompletion(
            {
              ...patient,
              doctorId: doctorInfo.doctorId
            } as any,
            {
              doctorName: doctorInfo.name,
              chamberName: doctorInfo.clinicName || 'Clinic',
              doctorId: doctorInfo.doctorId
            },
            downloadURL
          );
          toast.success('Digital RX generated and sent to patient!');
        } catch (notifError) {
          console.error('Notification error:', notifError);
          toast.error('RX generated but failed to notify patient');
        }
        onClose();
      }
    } catch (error) {
      console.error('PDF Generation Error:', error);
      toast.error('Failed to generate PDF');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4">
      <Card className="w-full max-w-4xl bg-[#0f172a] border-zinc-800 shadow-2xl flex flex-col max-h-[95vh] sm:max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500/20 rounded-lg">
              <Plus className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Digital Prescription Maker</h2>
              <p className="text-xs text-gray-400">Professional RX for {patient.name}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-zinc-800 rounded-lg text-gray-400">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Patient Summary */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 bg-zinc-800/30 rounded-xl border border-zinc-700/50">
            <div>
              <Label className="text-gray-500 text-[10px] uppercase">Patient Name</Label>
              <p className="text-sm font-medium text-white">{patient.name}</p>
            </div>
            <div>
              <Label className="text-gray-500 text-[10px] uppercase">Age/Gender</Label>
              <p className="text-sm font-medium text-white">{patient.age}Y / {patient.gender}</p>
            </div>
            <div className="text-right">
              <Label className="text-gray-500 text-[10px] uppercase">Date</Label>
              <p className="text-sm font-medium text-white">{new Date().toLocaleDateString()}</p>
            </div>
          </div>

          {/* Clinical Info */}
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-gray-400">Diagnosis / Provisional Diagnosis</Label>
                <Input
                  placeholder="e.g. Acute Viral Fever"
                  value={diagnosis}
                  onChange={(e) => setDiagnosis(e.target.value)}
                  className="bg-zinc-900 border-zinc-700 text-white"
                />
              </div>
            </div>

            {/* Common Findings (Vitals) — Select dropdown + type value */}
            <div className="p-3 bg-zinc-800 rounded-xl border border-cyan-800/50">
              <h4 className="text-sm font-bold text-cyan-300 mb-3 tracking-wide">Common Findings / Vitals</h4>
              <div className="flex flex-wrap items-center gap-2 mb-3">
                <select
                  value={selectedVitalKey}
                  onChange={(e) => { setSelectedVitalKey(e.target.value); setCustomVitalName(''); setVitalInputValue(''); }}
                  className="bg-black border-2 border-cyan-600 text-white text-sm rounded-lg h-9 px-3 flex-shrink-0 min-w-[140px]"
                >
                  <option value="">Select...</option>
                  {Object.entries(VITALS_OPTIONS)
                    .filter(([k]) => !vitals[k])
                    .map(([k, opt]) => (
                      <option key={k} value={k}>{opt.label}</option>
                    ))}
                  <option value="__other__">⊕ Others (Custom)</option>
                </select>
                {selectedVitalKey && selectedVitalKey !== '__other__' && (
                  <>
                    <Input
                      type="text"
                      placeholder={`Value (${VITALS_OPTIONS[selectedVitalKey]?.unit})`}
                      value={vitalInputValue}
                      onChange={(e) => setVitalInputValue(e.target.value)}
                      className="bg-black border-2 border-cyan-600 text-white text-sm h-9 w-32 placeholder:text-gray-400"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && vitalInputValue.trim()) {
                          setVitals({ ...vitals, [selectedVitalKey]: vitalInputValue.trim() });
                          setSelectedVitalKey('');
                          setVitalInputValue('');
                        }
                      }}
                    />
                    <Button
                      size="sm"
                      onClick={() => {
                        if (vitalInputValue.trim()) {
                          setVitals({ ...vitals, [selectedVitalKey]: vitalInputValue.trim() });
                          setSelectedVitalKey('');
                          setVitalInputValue('');
                        }
                      }}
                      className="bg-cyan-500 hover:bg-cyan-400 text-black h-9 px-4 text-sm font-bold"
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </>
                )}
                {selectedVitalKey === '__other__' && (
                  <>
                    <Input
                      type="text"
                      placeholder="Name (e.g. RBS)"
                      value={customVitalName}
                      onChange={(e) => setCustomVitalName(e.target.value)}
                      className="bg-black border-2 border-cyan-600 text-white text-sm h-9 w-32 placeholder:text-gray-400"
                      autoFocus
                    />
                    <Input
                      type="text"
                      placeholder="Value"
                      value={vitalInputValue}
                      onChange={(e) => setVitalInputValue(e.target.value)}
                      className="bg-black border-2 border-cyan-600 text-white text-sm h-9 w-28 placeholder:text-gray-400"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && customVitalName.trim() && vitalInputValue.trim()) {
                          setVitals({ ...vitals, [customVitalName.trim()]: vitalInputValue.trim() });
                          setCustomVitalName('');
                          setVitalInputValue('');
                        }
                      }}
                    />
                    <Button
                      size="sm"
                      onClick={() => {
                        if (customVitalName.trim() && vitalInputValue.trim()) {
                          setVitals({ ...vitals, [customVitalName.trim()]: vitalInputValue.trim() });
                          setCustomVitalName('');
                          setVitalInputValue('');
                        }
                      }}
                      className="bg-cyan-500 hover:bg-cyan-400 text-black h-9 px-4 text-sm font-bold"
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </>
                )}
              </div>
              {Object.keys(vitals).length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {Object.entries(vitals).map(([key, val]) => {
                    const opt = VITALS_OPTIONS[key];
                    const label = opt ? opt.label : key;
                    const unit = opt ? opt.unit : '';
                    return (
                      <span key={key} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-cyan-600/30 border border-cyan-400/60 text-white text-sm rounded-lg font-medium shadow-sm">
                        <span className="text-cyan-200">{label}:</span> <strong>{val}</strong> {unit && <span className="text-cyan-300 text-xs">{unit}</span>}
                        <button onClick={() => { const v = { ...vitals }; delete v[key]; setVitals(v); }} className="ml-1 text-cyan-200 hover:text-red-400 text-base leading-none font-bold">×</button>
                      </span>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Pathology / Lab Values — Select dropdown + type value */}
            <div className="p-3 bg-zinc-800 rounded-xl border border-amber-800/50">
              <h4 className="text-sm font-bold text-amber-300 mb-3 tracking-wide">Pathology / Lab Values</h4>
              <div className="flex flex-wrap items-center gap-2 mb-3">
                <select
                  value={selectedPathKey}
                  onChange={(e) => { setSelectedPathKey(e.target.value); setCustomPathName(''); setPathInputValue(''); }}
                  className="bg-black border-2 border-amber-600 text-white text-sm rounded-lg h-9 px-3 flex-shrink-0 min-w-[140px]"
                >
                  <option value="">Select...</option>
                  {Object.entries(PATHOLOGY_OPTIONS)
                    .filter(([k]) => !pathology[k])
                    .map(([k, opt]) => (
                      <option key={k} value={k}>{opt.label}</option>
                    ))}
                  <option value="__other__">⊕ Others (Custom)</option>
                </select>
                {selectedPathKey && selectedPathKey !== '__other__' && (
                  <>
                    <Input
                      type="text"
                      placeholder={`Value (${PATHOLOGY_OPTIONS[selectedPathKey]?.unit})`}
                      value={pathInputValue}
                      onChange={(e) => setPathInputValue(e.target.value)}
                      className="bg-black border-2 border-amber-600 text-white text-sm h-9 w-32 placeholder:text-gray-400"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && pathInputValue.trim()) {
                          setPathology({ ...pathology, [selectedPathKey]: pathInputValue.trim() });
                          setSelectedPathKey('');
                          setPathInputValue('');
                        }
                      }}
                    />
                    <Button
                      size="sm"
                      onClick={() => {
                        if (pathInputValue.trim()) {
                          setPathology({ ...pathology, [selectedPathKey]: pathInputValue.trim() });
                          setSelectedPathKey('');
                          setPathInputValue('');
                        }
                      }}
                      className="bg-amber-500 hover:bg-amber-400 text-black h-9 px-4 text-sm font-bold"
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </>
                )}
                {selectedPathKey === '__other__' && (
                  <>
                    <Input
                      type="text"
                      placeholder="Name (e.g. CRP)"
                      value={customPathName}
                      onChange={(e) => setCustomPathName(e.target.value)}
                      className="bg-black border-2 border-amber-600 text-white text-sm h-9 w-32 placeholder:text-gray-400"
                      autoFocus
                    />
                    <Input
                      type="text"
                      placeholder="Value"
                      value={pathInputValue}
                      onChange={(e) => setPathInputValue(e.target.value)}
                      className="bg-black border-2 border-amber-600 text-white text-sm h-9 w-28 placeholder:text-gray-400"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && customPathName.trim() && pathInputValue.trim()) {
                          setPathology({ ...pathology, [customPathName.trim()]: pathInputValue.trim() });
                          setCustomPathName('');
                          setPathInputValue('');
                        }
                      }}
                    />
                    <Button
                      size="sm"
                      onClick={() => {
                        if (customPathName.trim() && pathInputValue.trim()) {
                          setPathology({ ...pathology, [customPathName.trim()]: pathInputValue.trim() });
                          setCustomPathName('');
                          setPathInputValue('');
                        }
                      }}
                      className="bg-amber-500 hover:bg-amber-400 text-black h-9 px-4 text-sm font-bold"
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </>
                )}
              </div>
              {Object.keys(pathology).length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {Object.entries(pathology).map(([key, val]) => {
                    const opt = PATHOLOGY_OPTIONS[key];
                    const label = opt ? opt.label : key;
                    const unit = opt ? opt.unit : '';
                    return (
                      <span key={key} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-600/30 border border-amber-400/60 text-white text-sm rounded-lg font-medium shadow-sm">
                        <span className="text-amber-200">{label}:</span> <strong>{val}</strong> {unit && <span className="text-amber-300 text-xs">{unit}</span>}
                        <button onClick={() => { const p = { ...pathology }; delete p[key]; setPathology(p); }} className="ml-1 text-amber-200 hover:text-red-400 text-base leading-none font-bold">×</button>
                      </span>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Medicines Entry */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <h3 className="text-lg font-semibold text-white flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                Medicines & Dosage
                <span className="text-emerald-400 text-xs font-normal">(Use AI for suggestions)</span>
              </h3>
            </div>

            {/* Add Medicine Button - Top */}
            <Button onClick={addItem} size="sm" variant="outline" className="border-emerald-500/30 text-emerald-400 h-9 w-full sm:w-fit">
              <Plus className="w-4 h-4 mr-1" /> Add New Medicine
            </Button>

            <div className="space-y-3">
              {items.map((item, index) => (
                <div key={item.id} className="p-3 sm:p-4 bg-zinc-900/50 rounded-xl border border-zinc-800 space-y-4 relative">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="md:col-span-1 relative">
                      <Label className="text-[10px] text-gray-500 mb-1 block">Medicine Name</Label>
                      <div className="flex gap-2">
                        <Input
                          placeholder="Search or Type..."
                          value={item.medicineName}
                          onChange={(e) => {
                            updateItem(index, 'medicineName', e.target.value);
                            setSearchQuery(e.target.value);
                            setActiveItemIndex(index);
                          }}
                          className="bg-zinc-900 border-zinc-700 text-white"
                        />
                        <Button
                          onClick={() => handleAIHelp(index)}
                          disabled={aiLoading}
                          variant="ghost"
                          className="p-2 h-9 bg-purple-500/10 hover:bg-purple-500/20 text-purple-400"
                        >
                          <Wand2 className={`w-4 h-4 ${aiLoading ? 'animate-pulse' : ''}`} />
                        </Button>
                      </div>

                      {/* Suggestions Dropdown */}
                      {activeItemIndex === index && suggestions.length > 0 && (
                        <div className="absolute z-10 top-full left-0 right-0 mt-1 bg-zinc-800 border border-zinc-700 rounded-lg shadow-xl overflow-hidden">
                          {suggestions.map((med, sIndex) => (
                            <button
                              key={sIndex}
                              onClick={() => selectSuggestion(index, med)}
                              className="w-full px-4 py-2 text-left text-sm hover:bg-emerald-500/20 text-gray-200 border-b border-zinc-700/50 last:border-0"
                            >
                              <span className="font-bold">{med.name}</span>
                              <span className="ml-2 text-[10px] text-gray-400">{med.strength} ({med.type})</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    <div>
                      <Label className="text-[10px] text-gray-500 mb-1 block">Strength</Label>
                      <Input
                        placeholder="500mg"
                        value={item.strength}
                        onChange={(e) => updateItem(index, 'strength', e.target.value)}
                        className="bg-zinc-900 border-zinc-700 text-white"
                      />
                    </div>

                    <div>
                      <Label className="text-[10px] text-gray-500 mb-1 block">Dosage Pattern</Label>
                      <Input
                        placeholder="1-0-1"
                        value={item.dosage}
                        onChange={(e) => updateItem(index, 'dosage', e.target.value)}
                        className="bg-zinc-900 border-zinc-700 text-white"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <Label className="text-[10px] text-gray-500 mb-1 block">Duration</Label>
                      <Input
                        placeholder="5 Days"
                        value={item.duration}
                        onChange={(e) => updateItem(index, 'duration', e.target.value)}
                        className="bg-zinc-900 border-zinc-700 text-white"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <Label className="text-[10px] text-gray-500 mb-1 block">Special Instructions</Label>
                      <div className="flex gap-2">
                        <Input
                          placeholder="e.g. After Food, Empty Stomach"
                          value={item.instructions}
                          onChange={(e) => updateItem(index, 'instructions', e.target.value)}
                          className="bg-zinc-900 border-zinc-700 flex-1 text-white"
                        />
                        {items.length > 1 && (
                          <Button
                            variant="ghost"
                            onClick={() => removeItem(item.id)}
                            className="p-2 h-9 text-red-400 hover:bg-red-500/10"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Advise / Remarks */}
          <div className="space-y-2">
            <Label className="text-gray-400">Additional Remarks / Advise</Label>
            <textarea
              placeholder="e.g. Plenty of fluids, avoid cold water, review after 3 days if fever persists."
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-700 rounded-lg p-3 text-sm text-white min-h-[80px]"
            />
          </div>

          {/* Suggested Test Reports */}
          <div className="p-3 bg-zinc-800 rounded-xl border border-violet-800/50">
            <h4 className="text-sm font-bold text-violet-300 mb-3 tracking-wide">Suggested Test Reports</h4>
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <select
                value={selectedTestKey}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val && val !== '__other__') {
                    if (!suggestedTests.includes(val)) {
                      setSuggestedTests([...suggestedTests, val]);
                    }
                    setSelectedTestKey('');
                  } else {
                    setSelectedTestKey(val);
                    setCustomTestName('');
                  }
                }}
                className="bg-black border-2 border-violet-600 text-white text-sm rounded-lg h-9 px-3 flex-shrink-0 min-w-[180px]"
              >
                <option value="">Select Test...</option>
                {COMMON_TESTS
                  .filter(t => !suggestedTests.includes(t))
                  .map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                <option value="__other__">⊕ Others (Custom)</option>
              </select>
              {selectedTestKey === '__other__' && (
                <>
                  <Input
                    type="text"
                    placeholder="Test name (e.g. PFT)"
                    value={customTestName}
                    onChange={(e) => setCustomTestName(e.target.value)}
                    className="bg-black border-2 border-violet-600 text-white text-sm h-9 w-40 placeholder:text-gray-400"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && customTestName.trim()) {
                        if (!suggestedTests.includes(customTestName.trim())) {
                          setSuggestedTests([...suggestedTests, customTestName.trim()]);
                        }
                        setCustomTestName('');
                      }
                    }}
                  />
                  <Button
                    size="sm"
                    onClick={() => {
                      if (customTestName.trim()) {
                        if (!suggestedTests.includes(customTestName.trim())) {
                          setSuggestedTests([...suggestedTests, customTestName.trim()]);
                        }
                        setCustomTestName('');
                      }
                    }}
                    className="bg-violet-500 hover:bg-violet-400 text-black h-9 px-4 text-sm font-bold"
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </>
              )}
            </div>
            {suggestedTests.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {suggestedTests.map((test, idx) => (
                  <span key={idx} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-violet-600/30 border border-violet-400/60 text-white text-sm rounded-lg font-medium shadow-sm">
                    <span className="text-violet-200">{test}</span>
                    <button onClick={() => setSuggestedTests(suggestedTests.filter((_, i) => i !== idx))} className="ml-1 text-violet-200 hover:text-red-400 text-base leading-none font-bold">×</button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-6 border-t border-zinc-800 flex flex-col items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-[10px] sm:text-xs text-gray-500 w-full sm:w-auto overflow-hidden">
            <QrCode className="w-4 h-4 flex-shrink-0" />
            <span className="truncate">QR Code: {doctorInfo.qrNumber || 'HQR-XXXXX'}</span>
          </div>
          <div className="flex flex-wrap sm:flex-nowrap gap-2 sm:gap-3 w-full sm:w-auto justify-center sm:justify-end">
            {onPause && (
              <Button
                onClick={() => onPause({ items, remarks, diagnosis, vitals, pathology, suggestedTests })}
                variant="outline"
                size="sm"
                className="flex-1 sm:flex-none border-zinc-700 text-gray-400 hover:text-white h-9 px-3"
              >
                PAUSE
              </Button>
            )}
            <Button onClick={onClose} variant="ghost" size="sm" className="flex-1 sm:flex-none text-gray-400 hover:text-white h-9 px-3">
              Cancel
            </Button>
            <Button
              onClick={generatePDF}
              disabled={generating}
              size="sm"
              className="w-full sm:w-auto bg-emerald-500 hover:bg-emerald-600 text-white font-bold h-9 px-4"
            >
              {generating ? '...' : (
                <>
                  <Download className="w-4 h-4 mr-2" /> Generate RX
                </>
              )}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}

