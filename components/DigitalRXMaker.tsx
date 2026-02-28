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
    specialty: string;
    specialities?: string[];
    qrNumber?: string;
    clinicName?: string;
    doctorId: string;
    address?: string;
    timing?: string;
    registrationNumber?: string;
    showRegistrationOnRX?: boolean;
    useDrPrefix?: boolean;
  };
  onClose: () => void;
  onPause?: (savedState: { items: any[], remarks: string, diagnosis: string }) => void;
  onGenerated?: (downloadURL: string) => void;
  initialState?: {
    items: any[];
    remarks: string;
    diagnosis: string;
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
    setItems([...items, {
      id: Math.random().toString(36).substr(2, 9),
      medicineName: '',
      type: 'Tablet',
      strength: '',
      dosage: '1-0-1',
      duration: '5 Days',
      instructions: 'After Food'
    }]);
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
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const margin = 20;
      const contentWidth = pageWidth - (margin * 2);

      // --- HEADER SECTION ---
      // Left Side: Doctor Details
      doc.setFontSize(22);
      doc.setTextColor(40);
      doc.setFont('helvetica', 'bold');
      const displayName = doctorInfo.useDrPrefix ? `Dr. ${doctorInfo.name}` : doctorInfo.name;
      doc.text(displayName.toUpperCase(), margin, 20);

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100);

      let currentY = 28;

      // Degrees
      const degreesText = doctorInfo.degrees?.length
        ? doctorInfo.degrees.join(', ')
        : doctorInfo.degree;
      doc.text(degreesText, margin, currentY);
      currentY += 6;

      // Specialties
      const specialtiesText = doctorInfo.specialities?.length
        ? doctorInfo.specialities.join(', ')
        : doctorInfo.specialty;
      doc.text(specialtiesText, margin, currentY);
      currentY += 6;

      // Registration Number (Conditional)
      if (doctorInfo.showRegistrationOnRX && doctorInfo.registrationNumber) {
        doc.text(`REG NO: ${doctorInfo.registrationNumber}`, margin, currentY);
        currentY += 6;
      }

      // Clinic/Chamber Info
      if (doctorInfo.clinicName) {
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(60);
        doc.text(doctorInfo.clinicName, margin, currentY);
        currentY += 5;
      }

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100);
      doc.setFontSize(9);
      if (doctorInfo.address) {
        // Split address if too long
        const splitAddress = doc.splitTextToSize(doctorInfo.address, pageWidth / 2 - margin);
        doc.text(splitAddress, margin, currentY);
        currentY += (splitAddress.length * 5);
      }

      if (doctorInfo.timing) {
        doc.text(doctorInfo.timing, margin, currentY);
      }

      // Right Side: QR Code "Scan for Next Appointment"
      const qrSize = 35;
      const qrX = pageWidth - margin - qrSize;
      const qrY = 15;

      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(120);
      doc.text('SCAN FOR NEXT APPOINTMENT', qrX + (qrSize / 2), qrY - 2, { align: 'center' });

      // Build Mini-website URL for the QR
      const doctorId = doctorInfo.doctorId;
      const qrUrl = `https://teamhealqr.web.app/?page=doctor-mini-website&doctorId=${doctorId}`;

      // Generate QR Code as DataURL
      const qrDataUrl = await QRCode.toDataURL(qrUrl, { margin: 1, width: 200 });
      doc.addImage(qrDataUrl, 'PNG', qrX, qrY, qrSize, qrSize);

      doc.setLineWidth(0.5);
      doc.setDrawColor(200);
      doc.line(margin, 65, pageWidth - margin, 65);

      // --- PATIENT INFO SECTION ---
      doc.setFontSize(10);
      doc.setTextColor(60);
      doc.setFont('helvetica', 'bold');

      const patientRowY = 75;
      doc.text('Patient Name:', margin, patientRowY);
      doc.setFont('helvetica', 'normal');
      doc.text(patient.name, margin + 25, patientRowY);

      doc.setFont('helvetica', 'bold');
      doc.text('Mobile:', margin + 80, patientRowY);
      doc.setFont('helvetica', 'normal');
      doc.text(patient.phone, margin + 95, patientRowY);

      doc.setFont('helvetica', 'bold');
      doc.text('Age/Sex:', margin + 135, patientRowY);
      doc.setFont('helvetica', 'normal');
      doc.text(`${patient.age}Y/${patient.gender}`, margin + 155, patientRowY);

      const patientRow2Y = 82;
      if (patient.purpose) {
        doc.setFont('helvetica', 'bold');
        doc.text('Purpose:', margin, patientRow2Y);
        doc.setFont('helvetica', 'normal');
        doc.text(patient.purpose, margin + 20, patientRow2Y);
      }

      doc.setFont('helvetica', 'bold');
      doc.text('Booking ID / SRL:', margin + 120, patientRow2Y);
      doc.setFont('helvetica', 'normal');
      const serialDisplay = patient.srlNo ? `SRL-${patient.srlNo}` : patient.bookingId;
      doc.text(serialDisplay, margin + 155, patientRow2Y);

      doc.line(margin, 88, pageWidth - margin, 88);

      // --- MAIN BODY (TWO PANELS) ---
      const bodyY = 98;
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

      // RIGHT PANEL: Prescription
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(24);
      doc.text('Rx', dividerX + 10, bodyY);

      let currentMedY = bodyY + 15;
      doc.setFontSize(11);
      items.forEach((item, i) => {
        if (!item.medicineName) return;

        // Prevent overflow
        if (currentMedY > 220) return;

        doc.setFont('helvetica', 'bold');
        doc.text(`${i + 1}. ${item.type} ${item.medicineName} (${item.strength})`, dividerX + 10, currentMedY);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.text(`Dosage: ${item.dosage} | Duration: ${item.duration}`, dividerX + 15, currentMedY + 6);

        if (item.instructions) {
          doc.setTextColor(100);
          doc.text(`Note: ${item.instructions}`, dividerX + 15, currentMedY + 12);
          doc.setTextColor(60);
          currentMedY += 20;
        } else {
          currentMedY += 15;
        }
      });

      // --- BOTTOM SECTION: Special Instructions ---
      const bottomY = 240;
      doc.setLineWidth(0.5);
      doc.line(margin, 235, pageWidth - margin, 235);

      if (remarks) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.text('SPECIAL INSTRUCTIONS:', margin, bottomY);
        doc.setFont('helvetica', 'normal');
        const remarksLines = doc.splitTextToSize(remarks, contentWidth);
        doc.text(remarksLines, margin, bottomY + 7);
      }

      // --- FOOTER ---
      doc.setFontSize(8);
      doc.setTextColor(150);
      doc.text('Digitally generated by HealQR - No signature required.', pageWidth / 2, 285, { align: 'center' });
      doc.text(`Prescription Date: ${new Date().toLocaleDateString()}`, pageWidth / 2, 290, { align: 'center' });

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
        onGenerated(downloadURL);
      } else {
        // Fallback for standalone usage
        try {
          await processConsultationCompletion(
            {
              ...patient,
              doctorId: doctorInfo.doctorId
            } as any,
            {
              doctorName: displayName,
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

          {/* Medicines Entry */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <h3 className="text-lg font-semibold text-white flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                Medicines & Dosage
                <span className="text-emerald-400 text-xs font-normal">(Use AI for suggestions)</span>
              </h3>
              <Button onClick={addItem} size="sm" variant="outline" className="border-emerald-500/30 text-emerald-400 h-8 w-fit">
                <Plus className="w-4 h-4 mr-1" /> Add Medicine
              </Button>
            </div>

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
                onClick={() => onPause({ items, remarks, diagnosis })}
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
