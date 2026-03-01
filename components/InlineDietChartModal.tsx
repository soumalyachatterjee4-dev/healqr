import { useState } from 'react';
import { X, Apple, Sparkles, Loader2, CheckCircle2, Send, Pencil, Plus, Trash2, Save } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card } from './ui/card';
import { toast } from 'sonner';
import QRCode from 'qrcode';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { app } from '../lib/firebase/config';

interface InlineDietChartModalProps {
  patient: {
    id: string;
    name: string;
    age: number;
    gender: string;
    phone: string;
    visitType?: string;
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
  };
  onClose: () => void;
  onGenerated: (downloadURL: string) => void;
}

interface DietPlanDay {
  day: number;
  meals: {
    type: 'Breakfast' | 'Lunch' | 'Snacks' | 'Dinner';
    items: { name: string; weight: string; kcal: string }[];
  }[];
}

type Step = 'form' | 'review';

export default function InlineDietChartModal({ patient, doctorInfo, onClose, onGenerated }: InlineDietChartModalProps) {
  const [step, setStep] = useState<Step>('form');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSending, setIsSending] = useState(false);

  // Common health conditions list
  const HEALTH_CONDITIONS = [
    'None',
    'Type 2 Diabetes',
    'Type 1 Diabetes',
    'Gestational Diabetes',
    'Hypertension (High BP)',
    'Hypotension (Low BP)',
    'Hypothyroidism',
    'Hyperthyroidism',
    'PCOD / PCOS',
    'Obesity',
    'Underweight / Malnutrition',
    'High Cholesterol',
    'Heart Disease / CAD',
    'Kidney Disease / CKD',
    'Liver Disease / Fatty Liver',
    'Gastritis / Acidity / GERD',
    'IBS (Irritable Bowel)',
    'Ulcerative Colitis',
    'Celiac Disease',
    'Anemia (Iron Deficiency)',
    'Vitamin D Deficiency',
    'Vitamin B12 Deficiency',
    'Calcium Deficiency',
    'Uric Acid / Gout',
    'Arthritis',
    'Osteoporosis',
    'Asthma / COPD',
    'Tuberculosis (TB)',
    'Cancer (under treatment)',
    'Post Surgery Recovery',
    'Pregnancy',
    'Lactating Mother',
    'Depression / Anxiety',
    'Insomnia / Sleep Disorder',
    'Migraine',
    'Skin Disorders (Eczema/Psoriasis)',
    'Food Allergy',
    'All of the above',
    'Others',
  ];

  const FOOD_PREFERENCES = [
    'Vegetarian (Pure Veg)',
    'Non-Vegetarian',
    'Eggetarian (Veg + Eggs)',
    'Vegan (No Dairy/Animal)',
    'Pescatarian (Veg + Fish)',
    'High Protein',
    'Low Carb / Keto',
    'Low Fat',
    'Low Sodium',
    'Gluten-Free',
    'Lactose-Free',
    'No Seafood',
    'No Red Meat',
    'No Nuts',
    'No Soy',
    'Sugar-Free / Low Sugar',
    'Jain Food (No Root Vegetables)',
    'Satvik Diet',
    'Halal Only',
    'No Onion/Garlic',
    'Intermittent Fasting',
    'Liquid / Soft Diet Only',
  ];

  // Patient Assessment Form State
  const [selectedConditions, setSelectedConditions] = useState<string[]>(
    patient.visitType ? [patient.visitType] : []
  );
  const [otherCondition, setOtherCondition] = useState('');
  const [selectedPreferences, setSelectedPreferences] = useState<string[]>([]);
  const [conditions] = useState(patient.visitType || '');
  const [preferences] = useState('');
  const [weight, setWeight] = useState('');
  const [height, setHeight] = useState('');
  const [activityLevel, setActivityLevel] = useState<'sedentary' | 'moderate' | 'active'>('moderate');
  const [region, setRegion] = useState('West Bengal');
  const [isSmoker, setIsSmoker] = useState(false);
  const [isAlcoholic, setIsAlcoholic] = useState(false);
  const [remarks, setRemarks] = useState('');
  const [conditionsDropdownOpen, setConditionsDropdownOpen] = useState(false);
  const [preferencesDropdownOpen, setPreferencesDropdownOpen] = useState(false);

  // BMI Calculation
  const bmi = weight && height && parseFloat(height) > 0
    ? (parseFloat(weight) / ((parseFloat(height) / 100) ** 2)).toFixed(1)
    : null;

  const getBmiCategory = (bmiVal: number): { label: string; color: string } => {
    if (bmiVal < 18.5) return { label: 'Underweight', color: 'text-yellow-400' };
    if (bmiVal < 25) return { label: 'Normal', color: 'text-emerald-400' };
    if (bmiVal < 30) return { label: 'Overweight', color: 'text-orange-400' };
    return { label: 'Obese', color: 'text-red-400' };
  };

  // Toggle condition selection
  const toggleCondition = (condition: string) => {
    if (condition === 'None') {
      setSelectedConditions(['None']);
      return;
    }
    if (condition === 'All of the above') {
      const allExceptMeta = HEALTH_CONDITIONS.filter(c => c !== 'None' && c !== 'All of the above' && c !== 'Others');
      setSelectedConditions([...allExceptMeta, 'All of the above']);
      return;
    }
    setSelectedConditions(prev => {
      const filtered = prev.filter(c => c !== 'None' && c !== 'All of the above');
      if (filtered.includes(condition)) {
        return filtered.filter(c => c !== condition);
      }
      return [...filtered, condition];
    });
  };

  // Toggle food preference
  const togglePreference = (pref: string) => {
    setSelectedPreferences(prev =>
      prev.includes(pref) ? prev.filter(p => p !== pref) : [...prev, pref]
    );
  };

  // Sync selected conditions to string for AI generation
  const getConditionsString = () => {
    let result = selectedConditions.filter(c => c !== 'All of the above').join(', ');
    if (selectedConditions.includes('Others') && otherCondition.trim()) {
      result += (result ? ', ' : '') + otherCondition.trim();
    }
    return result || conditions;
  };

  const getPreferencesString = (): string => {
    return selectedPreferences.join(', ') || preferences;
  };

  // Generated plan
  const [generatedPlan, setGeneratedPlan] = useState<DietPlanDay[] | null>(null);

  // Editing state
  const [editingSection, setEditingSection] = useState<{ day: number; mealType: string } | null>(null);
  const [tempPlan, setTempPlan] = useState<DietPlanDay[] | null>(null);

  // Generate 7-day plan
  const handleGenerate = async () => {
    const condStr = getConditionsString();
    if (!condStr.trim()) {
      toast.error('Please select medical conditions', {
        description: 'This field is mandatory for AI diet generation',
      });
      return;
    }

    setIsGenerating(true);

    try {
      // Simulate AI processing
      await new Promise(resolve => setTimeout(resolve, 2500));

      const plan = generateDetailedPlan(region);
      setGeneratedPlan(plan);
      setStep('review');
      toast.success('AI Diet Chart generated!');
    } catch (error) {
      console.error('Error generating diet chart:', error);
      toast.error('Failed to generate diet chart');
    } finally {
      setIsGenerating(false);
    }
  };

  const generateDetailedPlan = (selectedRegion: string): DietPlanDay[] => {
    const days: DietPlanDay[] = [];
    for (let i = 1; i <= 7; i++) {
      days.push({
        day: i,
        meals: [
          {
            type: 'Breakfast',
            items: [
              { name: 'Oats with Milk', weight: '50 GM', kcal: '180 KCAL' },
              { name: 'Boiled Egg', weight: '1 unit', kcal: '70 KCAL' },
            ],
          },
          {
            type: 'Lunch',
            items: selectedRegion === 'West Bengal'
              ? [
                  { name: 'Rice (Red/Brown)', weight: '50 GM', kcal: '100 KCAL' },
                  { name: 'Boiled Spinach+Carrot', weight: '100 GM', kcal: '200 KCAL' },
                  { name: 'Fish (Steamed/Grilled)', weight: '75 GM', kcal: '200 KCAL' },
                  { name: 'Mishti (Low GI/Stevia)', weight: '20 GM', kcal: '80 KCAL' },
                ]
              : [
                  { name: 'Multigrain Roti', weight: '2 units', kcal: '140 KCAL' },
                  { name: 'Dal (Lentils)', weight: '100 GM', kcal: '120 KCAL' },
                  { name: 'Mixed Veggies', weight: '100 GM', kcal: '150 KCAL' },
                  { name: 'Curd', weight: '50 GM', kcal: '50 KCAL' },
                ],
          },
          {
            type: 'Snacks',
            items: [
              { name: 'Roasted Foxnuts (Makhana)', weight: '20 GM', kcal: '70 KCAL' },
              { name: 'Green Tea', weight: '1 Cup', kcal: '0 KCAL' },
            ],
          },
          {
            type: 'Dinner',
            items: [
              { name: 'Vegetable Soup', weight: '150 ML', kcal: '90 KCAL' },
              { name: 'Grilled Paneer/Chicken', weight: '50 GM', kcal: '130 KCAL' },
            ],
          },
        ],
      });
    }
    return days;
  };

  // Edit meal items
  const handleStartEdit = (day: number, mealType: string) => {
    if (!generatedPlan) return;
    setTempPlan(JSON.parse(JSON.stringify(generatedPlan)));
    setEditingSection({ day, mealType });
  };

  const handleSaveMealEdit = () => {
    if (tempPlan) {
      setGeneratedPlan(tempPlan);
    }
    setEditingSection(null);
    setTempPlan(null);
    toast.success('Meal updated');
  };

  const handleCancelEdit = () => {
    setEditingSection(null);
    setTempPlan(null);
  };

  // Final submit: Generate PDF + Upload + Return URL
  const handleFinalSubmit = async () => {
    if (!generatedPlan) return;
    setIsSending(true);

    try {
      const { jsPDF } = await import('jspdf');

      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const margin = 20;
      const isClinic = doctorInfo.pdfContext === 'clinic' && doctorInfo.clinicInfo;

      // --- CONTEXT-AWARE HEADER ---
      let headerY = 20;

      if (isClinic) {
        // === CLINIC HEADER: Clinic first, then Doctor ===
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(20);
        doc.setTextColor(30, 41, 59);
        doc.text((doctorInfo.clinicInfo!.name || '').toUpperCase(), margin, headerY);
        headerY += 7;

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.setTextColor(100);
        if (doctorInfo.clinicInfo!.address) {
          const splitAddr = doc.splitTextToSize(doctorInfo.clinicInfo!.address, pageWidth / 2 - margin);
          doc.text(splitAddr, margin, headerY);
          headerY += splitAddr.length * 4 + 2;
        }
        if (doctorInfo.clinicInfo!.phone) {
          doc.text(`Tel: ${doctorInfo.clinicInfo!.phone}`, margin, headerY);
          headerY += 5;
        }
        // Clinic registration number
        if (doctorInfo.clinicInfo!.showRegistrationOnRx && doctorInfo.clinicInfo!.registrationNumber) {
          doc.text(`Clinic Reg: ${doctorInfo.clinicInfo!.registrationNumber}`, margin, headerY);
          headerY += 5;
        }
        headerY += 2;

        // Doctor details
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(14);
        doc.setTextColor(40);
        const drName = (doctorInfo.useDrPrefix ?? true) ? `DR. ${doctorInfo.name}` : doctorInfo.name.toUpperCase();
        doc.text(drName, margin, headerY);
        headerY += 5;

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.setTextColor(71, 85, 105);
        const degreesStr = doctorInfo.degrees?.join('  •  ') || doctorInfo.degree || '';
        if (degreesStr) { doc.text(degreesStr, margin, headerY); headerY += 4; }
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(37, 99, 235);
        const specStr = (doctorInfo.specialities?.join(' • ') || doctorInfo.specialty || '').toUpperCase();
        if (specStr) { doc.text(specStr, margin, headerY); headerY += 4; }
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100);
        if (doctorInfo.showRegistrationOnRX && doctorInfo.registrationNumber) {
          doc.text(`REG NO: ${doctorInfo.registrationNumber}`, margin, headerY);
          headerY += 4;
        }
        if (doctorInfo.timing) { doc.text(`Timing: ${doctorInfo.timing}`, margin, headerY); headerY += 4; }

      } else {
        // === DOCTOR HEADER: Doctor first, then Chamber ===
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(22);
        doc.setTextColor(30, 41, 59);
        const drName = (doctorInfo.useDrPrefix ?? true) ? `DR. ${doctorInfo.name}` : doctorInfo.name.toUpperCase();
        doc.text(drName, margin, headerY);
        headerY += 8;

        doc.setFontSize(10);
        doc.setTextColor(71, 85, 105);
        const degreesStr = doctorInfo.degrees?.join('  •  ') || doctorInfo.degree || '';
        if (degreesStr) { doc.text(degreesStr, margin, headerY); headerY += 5; }
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(37, 99, 235);
        const specStr = (doctorInfo.specialities?.join(' • ') || doctorInfo.specialty || 'General Physician').toUpperCase();
        doc.text(specStr, margin, headerY);
        headerY += 5;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.setTextColor(100);
        if (doctorInfo.showRegistrationOnRX && doctorInfo.registrationNumber) {
          doc.text(`REG NO: ${doctorInfo.registrationNumber}`, margin, headerY);
          headerY += 5;
        }

        // Chamber info
        if (doctorInfo.clinicName) {
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(11);
          doc.setTextColor(51, 65, 85);
          doc.text(doctorInfo.clinicName.toUpperCase(), margin, headerY);
          headerY += 5;
        }
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.setTextColor(100);
        if (doctorInfo.address) {
          const addressLines = doc.splitTextToSize(doctorInfo.address, 70);
          doc.text(addressLines, margin, headerY);
          headerY += addressLines.length * 4;
        }
        if (doctorInfo.timing) {
          doc.setFont('helvetica', 'italic');
          doc.text(doctorInfo.timing, margin, headerY);
          doc.setFont('helvetica', 'normal');
          headerY += 4;
        }
      }

      // QR Code — Context-Aware
      doc.setDrawColor(220);
      doc.roundedRect(pageWidth - 50, 20, 30, 30, 3, 3);
      try {
        let qrContent: string;
        if (isClinic && doctorInfo.clinicInfo?.clinicId) {
          qrContent = `https://teamhealqr.web.app/?page=clinic-mini-website&clinicId=${doctorInfo.clinicInfo.clinicId}`;
        } else {
          qrContent = `https://teamhealqr.web.app/?page=doctor-mini-website&doctorId=${doctorInfo.doctorId}`;
        }
        const qrDataUrl = await QRCode.toDataURL(qrContent, { margin: 1 });
        doc.addImage(qrDataUrl, 'PNG', pageWidth - 48, 22, 26, 26);
      } catch {
        doc.setTextColor(200);
        doc.setFontSize(8);
        doc.text('SCAN QR', pageWidth - 35, 35, { align: 'center' });
      }

      // --- PATIENT STRIPE ---
      doc.setFillColor(248, 250, 252);
      doc.rect(20, 85, pageWidth - 40, 15, 'F');
      doc.setDrawColor(226, 232, 240);
      doc.line(20, 85, pageWidth - 20, 85);
      doc.line(20, 100, pageWidth - 20, 100);

      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      doc.text('PATIENT', 25, 91);
      doc.text('PHONE', 75, 91);
      doc.text('AGE/SEX', 125, 91);
      doc.text('DATE', pageWidth - 45, 91);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(30, 41, 59);
      doc.text(patient.name.toUpperCase(), 25, 96);
      doc.text(patient.phone || 'NA', 75, 96);
      doc.text(`${patient.age}Y/${patient.gender.substring(0, 1).toUpperCase()}`, 125, 96);
      doc.setTextColor(37, 99, 235);
      doc.text(new Date().toLocaleDateString('en-GB'), pageWidth - 45, 96);

      // --- AI DIET CHART HEADING ---
      let currentY = 115;
      doc.setFontSize(18);
      doc.setTextColor(30, 41, 59);
      doc.text('AI DIET CHART', pageWidth / 2, currentY, { align: 'center', charSpace: 2 });
      doc.setFontSize(8);
      doc.setTextColor(100);
      doc.text('PRECISION NUTRITION STRATEGY', pageWidth / 2, currentY + 5, { align: 'center', charSpace: 1 });
      currentY += 15;

      // --- PATIENT ASSESSMENT SUMMARY ---
      const condStr = getConditionsString();
      const prefStr = getPreferencesString();
      const assessmentLines: string[] = [];
      if (condStr) assessmentLines.push(`Diagnosis: ${condStr}`);
      if (prefStr) assessmentLines.push(`Diet: ${prefStr}`);
      if (bmi) assessmentLines.push(`BMI: ${bmi} (${getBmiCategory(parseFloat(bmi)).label})`);
      assessmentLines.push(`Activity: ${activityLevel.charAt(0).toUpperCase() + activityLevel.slice(1)}${isSmoker ? ' | Smoker' : ''}${isAlcoholic ? ' | Alcoholic' : ''}`);

      doc.setFillColor(255, 247, 237);
      const assessHeight = 8 + assessmentLines.length * 5;
      doc.roundedRect(20, currentY, pageWidth - 40, assessHeight, 2, 2, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      doc.setTextColor(194, 65, 12);
      doc.text('PATIENT ASSESSMENT', 25, currentY + 5);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(71, 85, 105);
      assessmentLines.forEach((line, idx) => {
        const wrapped = doc.splitTextToSize(line, pageWidth - 55);
        doc.text(wrapped, 25, currentY + 10 + idx * 5);
      });
      currentY += assessHeight + 5;

      // --- SPECIAL INSTRUCTIONS ---
      doc.setFillColor(241, 245, 249);
      doc.roundedRect(20, currentY, pageWidth - 40, 20, 2, 2, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(37, 99, 235);
      doc.text('SPECIAL INSTRUCTIONS / REMARKS', 25, currentY + 6);
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(9);
      doc.setTextColor(71, 85, 105);
      const remarksLines = doc.splitTextToSize(remarks || 'No additional remarks provided.', pageWidth - 50);
      doc.text(remarksLines, 25, currentY + 12);
      currentY += 30;

      // --- 7-DAY PLAN ---
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.setTextColor(37, 99, 235);
      doc.text('7-DAY NUTRITIONAL STRATEGY', 20, currentY);
      currentY += 10;

      const footerReserve = 35; // Reserve space for footer
      const maxContentY = doc.internal.pageSize.getHeight() - footerReserve;

      generatedPlan.forEach((day) => {
        if (currentY > maxContentY - 40) {
          doc.addPage();
          currentY = 20;
        }
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.setTextColor(30, 41, 59);
        doc.setFillColor(241, 245, 249);
        doc.rect(20, currentY, pageWidth - 40, 8, 'F');
        doc.text(`DAY ${day.day}`, 25, currentY + 6);
        currentY += 12;

        const colWidth = (pageWidth - 50) / 2;
        day.meals.forEach((meal, mIdx) => {
          const xPos = mIdx % 2 === 0 ? 25 : 25 + colWidth + 5;

          doc.setFont('helvetica', 'bold');
          doc.setFontSize(9);
          doc.setTextColor(37, 99, 235);
          doc.text(meal.type.toUpperCase(), xPos, currentY);
          let mealY = currentY + 5;

          doc.setFont('helvetica', 'normal');
          doc.setFontSize(8);
          doc.setTextColor(71, 85, 105);
          meal.items.forEach((item) => {
            const itemText = `${item.name} (${item.weight})`;
            const wrappedItem = doc.splitTextToSize(itemText, colWidth - 15);
            doc.text(wrappedItem, xPos + 2, mealY);
            doc.setTextColor(37, 99, 235);
            doc.text(item.kcal, xPos + colWidth - 10, mealY, { align: 'right' });
            doc.setTextColor(71, 85, 105);
            mealY += wrappedItem.length * 4;
          });

          if (mIdx % 2 !== 0 || mIdx === day.meals.length - 1) {
            currentY = Math.max(currentY, mealY) + 5;
            // Check if we're too close to footer area, push to next page
            if (currentY > maxContentY) {
              doc.addPage();
              currentY = 20;
            }
          }
        });
        currentY += 5;
      });

      // --- CONTEXT-AWARE FOOTER ---
      const addFooter = (pDoc: any) => {
        const pWidth = pDoc.internal.pageSize.getWidth();
        const pHeight = pDoc.internal.pageSize.getHeight();
        const fMargin = 20;
        const fContentW = pWidth - fMargin * 2;

        if (isClinic && doctorInfo.allDoctors && doctorInfo.allDoctors.length > 0) {
          // CLINIC FOOTER: Always show specialty groups with counts (saves space, same as Digital RX)
          const doctors = doctorInfo.allDoctors;
          const specialtyMap: Record<string, number> = {};
          doctors.forEach(dr => {
            const spec = dr.specialty || 'General';
            specialtyMap[spec] = (specialtyMap[spec] || 0) + 1;
          });
          const specEntries = Object.entries(specialtyMap);
          const specLine = specEntries.map(([spec, count]) => `${spec} (${count})`).join('  \u2022  ');
          const specLines = pDoc.splitTextToSize(specLine, fContentW - 6);

          const boxH = 8 + (specLines.length * 3.5) + 5;
          const boxY = pHeight - boxH - 14;

          pDoc.setDrawColor(200);
          pDoc.setLineWidth(0.3);
          pDoc.setFillColor(248, 250, 252);
          pDoc.roundedRect(fMargin, boxY, fContentW, boxH, 2, 2, 'FD');

          pDoc.setFont('helvetica', 'bold');
          pDoc.setFontSize(6);
          pDoc.setTextColor(100);
          pDoc.text(`DOCTORS BY SPECIALTY (${doctors.length} Doctors)`, fMargin + 3, boxY + 3.5);

          pDoc.setFont('helvetica', 'normal');
          pDoc.setFontSize(6);
          pDoc.setTextColor(80);
          pDoc.text(specLines, fMargin + 3, boxY + 7);

          // QR scan prompt line
          pDoc.setFont('helvetica', 'bold');
          pDoc.setFontSize(5.5);
          pDoc.setTextColor(60);
          pDoc.text('FOR MORE DETAILS AND APPOINTMENT SCAN ABOVE QR CODE', pWidth / 2, boxY + 7 + (specLines.length * 3.5) + 2, { align: 'center' });

          // Custom footer lines (clinic context: prefer clinic's, fallback to doctor's)
          const cLine1 = doctorInfo.clinicInfo?.footerLine1 || doctorInfo.footerLine1 || '';
          const cLine2 = doctorInfo.clinicInfo?.footerLine2 || doctorInfo.footerLine2 || '';
          let afterBox = boxY + boxH + 2;
          if (cLine1 || cLine2) {
            const combined = [cLine1, cLine2].filter(Boolean).join('  |  ');
            if (combined) {
              pDoc.setFont('helvetica', 'italic');
              pDoc.setFontSize(5.5);
              pDoc.setTextColor(130);
              pDoc.text(combined, pWidth / 2, afterBox, { align: 'center' });
              afterBox += 3;
            }
          }

          pDoc.setFont('helvetica', 'normal');
          pDoc.setFontSize(6);
          pDoc.setTextColor(150);
          pDoc.text(
            'Digitally generated by HealQR  \u2022  No signature required  \u2022  ' + new Date().toLocaleDateString('en-GB'),
            pWidth / 2, afterBox + 1, { align: 'center' }
          );

        } else if (!isClinic && doctorInfo.allChambers && doctorInfo.allChambers.length > 0) {
          // DOCTOR FOOTER: Box with all chambers
          const boxH = 6 + (doctorInfo.allChambers.length * 4.5) + 2;
          const boxY = pHeight - boxH - 14;

          pDoc.setDrawColor(200);
          pDoc.setLineWidth(0.3);
          pDoc.setFillColor(248, 250, 252);
          pDoc.roundedRect(fMargin, boxY, fContentW, boxH, 2, 2, 'FD');

          pDoc.setFont('helvetica', 'bold');
          pDoc.setFontSize(6);
          pDoc.setTextColor(100);
          pDoc.text('ALSO AVAILABLE AT', fMargin + 3, boxY + 4);

          pDoc.setFont('helvetica', 'normal');
          pDoc.setFontSize(6.5);
          pDoc.setTextColor(80);
          doctorInfo.allChambers!.forEach((ch, i) => {
            const line = `${ch.name}  \u2022  ${ch.address || ''}  \u2022  ${ch.timing || ''}`;
            pDoc.text(pDoc.splitTextToSize(line, fContentW - 6)[0], fMargin + 3, boxY + 8 + (i * 4.5));
          });

          // Custom footer lines (doctor context)
          const dLine1 = doctorInfo.footerLine1 || '';
          const dLine2 = doctorInfo.footerLine2 || '';
          let customY = pHeight - 12;
          if (dLine1 || dLine2) {
            pDoc.setFont('helvetica', 'italic');
            pDoc.setFontSize(6);
            pDoc.setTextColor(120);
            if (dLine2) {
              pDoc.text(dLine2, pWidth / 2, customY, { align: 'center' });
              customY -= 3.5;
            }
            if (dLine1) {
              pDoc.text(dLine1, pWidth / 2, customY, { align: 'center' });
              customY -= 3.5;
            }
          }

          pDoc.setFont('helvetica', 'normal');
          pDoc.setFontSize(7);
          pDoc.setTextColor(148, 163, 184);
          pDoc.text(
            'POWERED BY WWW.HEALQR.COM  \u2022  GENERATED BY GEMINI FLASH 1.5',
            pWidth / 2, pHeight - 4, { align: 'center' }
          );

        } else {
          // FALLBACK: Simple footer with custom lines
          const fLine1 = doctorInfo.footerLine1 || '';
          const fLine2 = doctorInfo.footerLine2 || '';
          let customY = pHeight - 16;
          if (fLine1 || fLine2) {
            pDoc.setFont('helvetica', 'italic');
            pDoc.setFontSize(6);
            pDoc.setTextColor(120);
            if (fLine2) {
              pDoc.text(fLine2, pWidth / 2, customY, { align: 'center' });
              customY -= 3.5;
            }
            if (fLine1) {
              pDoc.text(fLine1, pWidth / 2, customY, { align: 'center' });
              customY -= 3.5;
            }
          }
          pDoc.setFont('helvetica', 'bold');
          pDoc.setFontSize(10);
          pDoc.setTextColor(30, 41, 59);
          pDoc.text(
            `Guided by ${(doctorInfo.useDrPrefix ?? true) ? 'Dr. ' : ''}${doctorInfo.name}`,
            pWidth / 2, pHeight - 20, { align: 'center' }
          );
          pDoc.setFont('helvetica', 'normal');
          pDoc.setFontSize(8);
          pDoc.setTextColor(148, 163, 184);
          pDoc.text(
            'POWERED BY WWW.HEALQR.COM  \u2022  GENERATED BY GEMINI FLASH 1.5',
            pWidth / 2, pHeight - 8, { align: 'center' }
          );
        }
      };

      const pageCount = doc.internal.pages.length - 1;
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        addFooter(doc);
      }

      // Save PDF to local device (user download)
      doc.save(`Diet_Chart_${patient.name.replace(/\s+/g, '_')}.pdf`);

      // Upload to Firebase Storage
      const pdfBlob = doc.output('blob');
      const chartId = Math.random().toString(36).substr(2, 9);
      const fileName = `diet_${chartId}_${Date.now()}.pdf`;
      const storagePath = `diet-charts/${patient.phone || 'unregistered'}/${fileName}`;
      const storageRef = ref(getStorage(app!), storagePath);
      await uploadBytes(storageRef, pdfBlob);
      const downloadURL = await getDownloadURL(storageRef);

      toast.success('AI Diet Chart downloaded & sent to patient!');
      onGenerated(downloadURL);
    } catch (error) {
      console.error('Error generating Diet PDF:', error);
      toast.error('Failed to generate Diet Chart PDF');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4">
      <Card className="w-full max-w-4xl bg-[#0f172a] border-zinc-800 shadow-2xl flex flex-col max-h-[95vh] sm:max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-500/20 rounded-lg">
              <Apple className="w-5 h-5 text-orange-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">AI Diet Chart</h2>
              <p className="text-xs text-gray-400">
                {step === 'form' ? 'Patient Assessment' : '7-Day Nutrition Plan'} • {patient.name}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-zinc-800 rounded-lg text-gray-400">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {step === 'form' ? (
            /* ============================================ */
            /* PATIENT ASSESSMENT FORM                      */
            /* ============================================ */
            <div className="space-y-6">
              {/* Patient Info Summary */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 bg-zinc-800/30 rounded-xl border border-zinc-700/50">
                <div>
                  <Label className="text-gray-500 text-[10px] uppercase">Patient Name</Label>
                  <p className="text-sm font-medium text-white">{patient.name}</p>
                </div>
                <div>
                  <Label className="text-gray-500 text-[10px] uppercase">Age/Gender</Label>
                  <p className="text-sm font-medium text-white">{patient.age}Y / {patient.gender}</p>
                </div>
                <div>
                  <Label className="text-gray-500 text-[10px] uppercase">Phone</Label>
                  <p className="text-sm font-medium text-white">{patient.phone}</p>
                </div>
              </div>

              {/* Physical Measurements + BMI */}
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-2">
                  <Label className="text-gray-400">Weight (kg)</Label>
                  <Input
                    type="number"
                    placeholder="e.g. 72"
                    value={weight}
                    onChange={(e) => setWeight(e.target.value)}
                    className="bg-zinc-900 border-zinc-700 text-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-gray-400">Height (cm)</Label>
                  <Input
                    type="number"
                    placeholder="e.g. 170"
                    value={height}
                    onChange={(e) => setHeight(e.target.value)}
                    className="bg-zinc-900 border-zinc-700 text-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-gray-400">BMI</Label>
                  <div className={`flex flex-col items-center justify-center h-10 rounded-lg border ${
                    bmi
                      ? 'bg-zinc-800 border-zinc-600'
                      : 'bg-zinc-900/50 border-zinc-700/50'
                  }`}>
                    {bmi ? (
                      <>
                        <span className="text-base font-bold text-white leading-tight">{bmi}</span>
                        <span className={`text-[9px] font-semibold leading-tight ${getBmiCategory(parseFloat(bmi)).color}`}>
                          {getBmiCategory(parseFloat(bmi)).label}
                        </span>
                      </>
                    ) : (
                      <span className="text-xs text-gray-600">Auto</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Activity Level */}
              <div className="space-y-2">
                <Label className="text-gray-400">Activity Level</Label>
                <div className="grid grid-cols-3 gap-2">
                  {(['sedentary', 'moderate', 'active'] as const).map((level) => (
                    <button
                      key={level}
                      onClick={() => setActivityLevel(level)}
                      className={`py-2 px-3 rounded-lg text-sm font-medium border transition-colors ${
                        activityLevel === level
                          ? 'bg-orange-500/20 border-orange-500/50 text-orange-300'
                          : 'bg-zinc-800 border-zinc-700 text-gray-400 hover:bg-zinc-700'
                      }`}
                    >
                      {level.charAt(0).toUpperCase() + level.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Medical Conditions Dropdown (Mandatory) */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Label className="text-gray-400">Medical Conditions / Diagnosis</Label>
                  <span className="text-[10px] bg-red-500/20 text-red-400 px-2 py-0.5 rounded-full">Mandatory</span>
                </div>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => { setConditionsDropdownOpen(!conditionsDropdownOpen); setPreferencesDropdownOpen(false); }}
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-lg p-3 text-sm text-left flex items-center justify-between min-h-[44px]"
                  >
                    <span className={selectedConditions.length > 0 ? 'text-white' : 'text-gray-500'}>
                      {selectedConditions.length > 0
                        ? selectedConditions.slice(0, 3).join(', ') + (selectedConditions.length > 3 ? ` +${selectedConditions.length - 3} more` : '')
                        : 'Select conditions...'}
                    </span>
                    <svg className={`w-4 h-4 text-gray-400 transition-transform ${conditionsDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                  </button>
                  {conditionsDropdownOpen && (
                    <div className="absolute z-50 mt-1 w-full bg-zinc-900 border border-zinc-600 rounded-lg shadow-xl max-h-[200px] overflow-y-auto">
                      {HEALTH_CONDITIONS.map((cond) => (
                        <button
                          key={cond}
                          type="button"
                          onClick={() => toggleCondition(cond)}
                          className={`w-full text-left px-3 py-2 text-sm flex items-center gap-2 hover:bg-zinc-800 transition-colors ${
                            cond === 'None' ? 'text-gray-400 border-b border-zinc-700' :
                            cond === 'All of the above' ? 'text-blue-400 border-t border-zinc-700' :
                            cond === 'Others' ? 'text-orange-400 border-t border-zinc-700' :
                            'text-gray-300'
                          }`}
                        >
                          <span className={`w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center text-[10px] ${
                            selectedConditions.includes(cond)
                              ? 'bg-orange-500 border-orange-500 text-white'
                              : 'border-zinc-600 bg-zinc-800'
                          }`}>
                            {selectedConditions.includes(cond) && '✓'}
                          </span>
                          {cond}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                {/* Selected tags */}
                {selectedConditions.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {selectedConditions.map((cond) => (
                      <span
                        key={cond}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-orange-500/15 text-orange-300 border border-orange-500/30"
                      >
                        {cond}
                        <button type="button" onClick={() => toggleCondition(cond)} className="hover:text-orange-100">×</button>
                      </span>
                    ))}
                  </div>
                )}
                {/* Others free text */}
                {selectedConditions.includes('Others') && (
                  <Input
                    placeholder="Specify other conditions..."
                    value={otherCondition}
                    onChange={(e) => setOtherCondition(e.target.value)}
                    className="bg-zinc-900 border-zinc-700 text-white mt-1"
                  />
                )}
              </div>

              {/* Food Preferences Dropdown */}
              <div className="space-y-2">
                <Label className="text-gray-400">Food Preferences / Restrictions</Label>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => { setPreferencesDropdownOpen(!preferencesDropdownOpen); setConditionsDropdownOpen(false); }}
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-lg p-3 text-sm text-left flex items-center justify-between min-h-[44px]"
                  >
                    <span className={selectedPreferences.length > 0 ? 'text-white' : 'text-gray-500'}>
                      {selectedPreferences.length > 0
                        ? selectedPreferences.slice(0, 3).join(', ') + (selectedPreferences.length > 3 ? ` +${selectedPreferences.length - 3} more` : '')
                        : 'Select preferences...'}
                    </span>
                    <svg className={`w-4 h-4 text-gray-400 transition-transform ${preferencesDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                  </button>
                  {preferencesDropdownOpen && (
                    <div className="absolute z-50 mt-1 w-full bg-zinc-900 border border-zinc-600 rounded-lg shadow-xl max-h-[200px] overflow-y-auto">
                      {FOOD_PREFERENCES.map((pref) => (
                        <button
                          key={pref}
                          type="button"
                          onClick={() => togglePreference(pref)}
                          className="w-full text-left px-3 py-2 text-sm flex items-center gap-2 hover:bg-zinc-800 transition-colors text-gray-300"
                        >
                          <span className={`w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center text-[10px] ${
                            selectedPreferences.includes(pref)
                              ? 'bg-emerald-500 border-emerald-500 text-white'
                              : 'border-zinc-600 bg-zinc-800'
                          }`}>
                            {selectedPreferences.includes(pref) && '✓'}
                          </span>
                          {pref}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                {/* Selected tags */}
                {selectedPreferences.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {selectedPreferences.map((pref) => (
                      <span
                        key={pref}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
                      >
                        {pref}
                        <button type="button" onClick={() => togglePreference(pref)} className="hover:text-emerald-100">×</button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Region */}
              <div className="space-y-2">
                <Label className="text-gray-400">Region (for cuisine preferences)</Label>
                <select
                  value={region}
                  onChange={(e) => setRegion(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-lg p-3 text-sm text-white"
                >
                  <option value="West Bengal">West Bengal</option>
                  <option value="North India">North India</option>
                  <option value="South India">South India</option>
                  <option value="East India">East India</option>
                  <option value="West India">West India</option>
                  <option value="Northeast India">Northeast India</option>
                </select>
              </div>

              {/* Lifestyle Toggles */}
              <div className="flex items-center gap-6">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isSmoker}
                    onChange={(e) => setIsSmoker(e.target.checked)}
                    className="w-4 h-4 rounded border-zinc-700 bg-zinc-900 text-orange-500 focus:ring-orange-500"
                  />
                  <span className="text-sm text-gray-400">Smoker</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isAlcoholic}
                    onChange={(e) => setIsAlcoholic(e.target.checked)}
                    className="w-4 h-4 rounded border-zinc-700 bg-zinc-900 text-orange-500 focus:ring-orange-500"
                  />
                  <span className="text-sm text-gray-400">Alcoholic</span>
                </label>
              </div>

              {/* Special Instructions */}
              <div className="space-y-2">
                <Label className="text-gray-400">Special Instructions / Remarks</Label>
                <textarea
                  placeholder="e.g. Low sodium diet, avoid spicy food..."
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-lg p-3 text-sm text-white min-h-[60px]"
                />
              </div>
            </div>
          ) : (
            /* ============================================ */
            /* REVIEW: 7-DAY PLAN                           */
            /* ============================================ */
            <div className="space-y-4">
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                <p className="text-sm text-emerald-300">7-Day Diet Plan generated. Review and edit meals below, then submit.</p>
              </div>

              {/* Editable Special Instructions */}
              <div className="bg-zinc-800/30 rounded-xl border border-zinc-700/50 p-4 space-y-2">
                <label className="text-xs font-bold text-blue-400 uppercase">Special Instructions / Remarks</label>
                <textarea
                  placeholder="e.g. Low sodium diet, avoid spicy food, increase water intake..."
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-lg p-3 text-sm text-white min-h-[60px]"
                />
              </div>

              {generatedPlan?.map((day) => (
                <div key={day.day} className="bg-zinc-800/30 rounded-xl border border-zinc-700/50 overflow-hidden">
                  <div className="p-3 bg-zinc-800/50 border-b border-zinc-700/50">
                    <h4 className="text-sm font-bold text-white">DAY {day.day}</h4>
                  </div>
                  <div className="p-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {day.meals.map((meal) => {
                      const isEditing = editingSection?.day === day.day && editingSection?.mealType === meal.type;
                      const editableMeal = tempPlan?.find(d => d.day === day.day)?.meals.find(m => m.type === meal.type);

                      return (
                        <div key={meal.type} className="space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-blue-400 uppercase">{meal.type}</span>
                            {!isEditing ? (
                              <button
                                onClick={() => handleStartEdit(day.day, meal.type)}
                                className="p-1 hover:bg-zinc-700 rounded text-gray-500 hover:text-gray-300"
                              >
                                <Pencil className="w-3 h-3" />
                              </button>
                            ) : (
                              <div className="flex gap-1">
                                <button onClick={handleSaveMealEdit} className="p-1 bg-emerald-500/20 hover:bg-emerald-500/30 rounded text-emerald-400">
                                  <Save className="w-3 h-3" />
                                </button>
                                <button onClick={handleCancelEdit} className="p-1 bg-red-500/20 hover:bg-red-500/30 rounded text-red-400">
                                  <X className="w-3 h-3" />
                                </button>
                              </div>
                            )}
                          </div>

                          {isEditing && editableMeal ? (
                            <div className="space-y-1">
                              {editableMeal.items.map((item, idx) => (
                                <div key={idx} className="flex gap-1 items-center">
                                  <Input
                                    value={item.name}
                                    onChange={(e) => {
                                      const newPlan = [...(tempPlan || [])];
                                      const dayObj = newPlan.find(d => d.day === day.day);
                                      const mealObj = dayObj?.meals.find(m => m.type === meal.type);
                                      if (mealObj) mealObj.items[idx].name = e.target.value;
                                      setTempPlan(newPlan);
                                    }}
                                    className="bg-zinc-900 border-zinc-700 text-white text-xs h-7 flex-1"
                                  />
                                  <Input
                                    value={item.weight}
                                    onChange={(e) => {
                                      const newPlan = [...(tempPlan || [])];
                                      const dayObj = newPlan.find(d => d.day === day.day);
                                      const mealObj = dayObj?.meals.find(m => m.type === meal.type);
                                      if (mealObj) mealObj.items[idx].weight = e.target.value;
                                      setTempPlan(newPlan);
                                    }}
                                    className="bg-zinc-900 border-zinc-700 text-white text-xs h-7 w-16"
                                  />
                                  <Input
                                    value={item.kcal}
                                    onChange={(e) => {
                                      const newPlan = [...(tempPlan || [])];
                                      const dayObj = newPlan.find(d => d.day === day.day);
                                      const mealObj = dayObj?.meals.find(m => m.type === meal.type);
                                      if (mealObj) mealObj.items[idx].kcal = e.target.value;
                                      setTempPlan(newPlan);
                                    }}
                                    className="bg-zinc-900 border-zinc-700 text-white text-xs h-7 w-20"
                                  />
                                  <button
                                    onClick={() => {
                                      const newPlan = [...(tempPlan || [])];
                                      const dayObj = newPlan.find(d => d.day === day.day);
                                      const mealObj = dayObj?.meals.find(m => m.type === meal.type);
                                      if (mealObj) mealObj.items.splice(idx, 1);
                                      setTempPlan(newPlan);
                                    }}
                                    className="p-1 text-red-400 hover:bg-red-500/10 rounded"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                </div>
                              ))}
                              <button
                                onClick={() => {
                                  const newPlan = [...(tempPlan || [])];
                                  const dayObj = newPlan.find(d => d.day === day.day);
                                  const mealObj = dayObj?.meals.find(m => m.type === meal.type);
                                  if (mealObj) mealObj.items.push({ name: '', weight: '', kcal: '' });
                                  setTempPlan(newPlan);
                                }}
                                className="text-[10px] text-blue-400 hover:text-blue-300 flex items-center gap-1"
                              >
                                <Plus className="w-3 h-3" /> Add Item
                              </button>
                            </div>
                          ) : (
                            <div className="space-y-0.5">
                              {meal.items.map((item, idx) => (
                                <div key={idx} className="flex items-center justify-between text-xs">
                                  <span className="text-gray-300">{item.name} <span className="text-gray-500">({item.weight})</span></span>
                                  <span className="text-blue-400 text-[10px]">{item.kcal}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-6 border-t border-zinc-800 flex flex-col sm:flex-row items-center justify-between gap-3">
          {step === 'form' ? (
            <>
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <Sparkles className="w-4 h-4 text-orange-400" />
                <span>AI-powered nutrition plan based on patient assessment</span>
              </div>
              <div className="flex gap-2 w-full sm:w-auto">
                <Button onClick={onClose} variant="ghost" size="sm" className="flex-1 sm:flex-none text-gray-400 hover:text-white h-9 px-3">
                  Cancel
                </Button>
                <Button
                  onClick={handleGenerate}
                  disabled={isGenerating}
                  size="sm"
                  className="flex-1 sm:flex-none bg-orange-500 hover:bg-orange-600 text-white font-bold h-9 px-4"
                >
                  {isGenerating ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Generating...</>
                  ) : (
                    <><Sparkles className="w-4 h-4 mr-2" /> Generate Diet Chart</>
                  )}
                </Button>
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Review the plan, edit if needed, then submit</span>
              </div>
              <div className="flex gap-2 w-full sm:w-auto">
                <Button
                  onClick={() => setStep('form')}
                  variant="ghost"
                  size="sm"
                  className="flex-1 sm:flex-none text-gray-400 hover:text-white h-9 px-3"
                >
                  Back
                </Button>
                <Button
                  onClick={handleFinalSubmit}
                  disabled={isSending}
                  size="sm"
                  className="flex-1 sm:flex-none bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white font-bold h-9 px-4"
                >
                  {isSending ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Sending...</>
                  ) : (
                    <><Send className="w-4 h-4 mr-2" /> Submit & Send to Patient</>
                  )}
                </Button>
              </div>
            </>
          )}
        </div>
      </Card>
    </div>
  );
}
