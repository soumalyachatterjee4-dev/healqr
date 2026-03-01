import { useState, useEffect } from 'react';
import {
  Apple,
  Plus,
  History,
  Sparkles,
  CheckCircle2,
  Loader2,
  FileText,
  User,
  Activity,
  ChevronRight,
  Menu,
  Search,
  X,
  Pencil,
  Trash2,
  PlusCircle,
  Save
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { toast } from 'sonner';
import DashboardSidebar from './DashboardSidebar';

interface AIDietChartManagerProps {
  doctorName: string;
  email: string;
  onLogout: () => void;
  onMenuChange: (menu: string) => void;
  activeAddOns: string[];
}

interface DietChartHistoryItem {
  id: string;
  patientName: string;
  phone: string;
  age: string;
  gender: string;
  conditions: string;
  region: string;
  isSmoker: boolean;
  isAlcoholic: boolean;
  date: string;
  timestamp: number;
  plan?: {
    day: number;
    meals: {
      type: 'Breakfast' | 'Lunch' | 'Snacks' | 'Dinner';
      items: { name: string; weight: string; kcal: string }[];
    }[];
  }[];
}

export default function AIDietChartManager({
  doctorName,
  onLogout,
  onMenuChange,
  activeAddOns
}: AIDietChartManagerProps) {
  const [activeTab, setActiveTab] = useState<'create' | 'history'>('create');
  const [isGenerating, setIsGenerating] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selectedChart, setSelectedChart] = useState<DietChartHistoryItem | null>(null);
  const [editingSection, setEditingSection] = useState<{ day: number, mealType: string } | null>(null);
  const [tempPlan, setTempPlan] = useState<DietChartHistoryItem['plan']>([]);
  const [historyItems, setHistoryItems] = useState<DietChartHistoryItem[]>(() => {
    const saved = localStorage.getItem('healqr_diet_history');
    return saved ? JSON.parse(saved) : [];
  });

  // Dropdown states for conditions & preferences
  const [selectedConditions, setSelectedConditions] = useState<string[]>([]);
  const [otherCondition, setOtherCondition] = useState('');
  const [selectedPreferences, setSelectedPreferences] = useState<string[]>([]);
  const [conditionsDropdownOpen, setConditionsDropdownOpen] = useState(false);
  const [preferencesDropdownOpen, setPreferencesDropdownOpen] = useState(false);
  const [remarks, setRemarks] = useState('');

  const HEALTH_CONDITIONS = [
    'None', 'Type 2 Diabetes', 'Type 1 Diabetes', 'Gestational Diabetes',
    'Hypertension (High BP)', 'Hypotension (Low BP)', 'Hypothyroidism', 'Hyperthyroidism',
    'PCOD / PCOS', 'Obesity', 'Underweight / Malnutrition', 'High Cholesterol',
    'Heart Disease / CAD', 'Kidney Disease / CKD', 'Liver Disease / Fatty Liver',
    'Gastritis / Acidity / GERD', 'IBS (Irritable Bowel)', 'Ulcerative Colitis',
    'Celiac Disease', 'Anemia (Iron Deficiency)', 'Vitamin D Deficiency',
    'Vitamin B12 Deficiency', 'Calcium Deficiency', 'Uric Acid / Gout',
    'Arthritis', 'Osteoporosis', 'Asthma / COPD', 'Tuberculosis (TB)',
    'Cancer (under treatment)', 'Post Surgery Recovery', 'Pregnancy',
    'Lactating Mother', 'Depression / Anxiety', 'Insomnia / Sleep Disorder',
    'Migraine', 'Skin Disorders (Eczema/Psoriasis)', 'Food Allergy',
    'All of the above', 'Others',
  ];

  const FOOD_PREFERENCES = [
    'Vegetarian (Pure Veg)', 'Non-Vegetarian', 'Eggetarian (Veg + Eggs)',
    'Vegan (No Dairy/Animal)', 'Pescatarian (Veg + Fish)', 'High Protein',
    'Low Carb / Keto', 'Low Fat', 'Low Sodium', 'Gluten-Free',
    'Lactose-Free', 'No Seafood', 'No Red Meat', 'No Nuts', 'No Soy',
    'Sugar-Free / Low Sugar', 'Jain Food (No Root Vegetables)', 'Satvik Diet',
    'Halal Only', 'No Onion/Garlic', 'Intermittent Fasting', 'Liquid / Soft Diet Only',
  ];

  const toggleCondition = (condition: string) => {
    if (condition === 'None') { setSelectedConditions(['None']); return; }
    if (condition === 'All of the above') {
      const allExceptMeta = HEALTH_CONDITIONS.filter(c => c !== 'None' && c !== 'All of the above' && c !== 'Others');
      setSelectedConditions([...allExceptMeta, 'All of the above']);
      return;
    }
    setSelectedConditions(prev => {
      const filtered = prev.filter(c => c !== 'None' && c !== 'All of the above');
      return filtered.includes(condition) ? filtered.filter(c => c !== condition) : [...filtered, condition];
    });
  };

  const togglePreference = (pref: string) => {
    setSelectedPreferences(prev =>
      prev.includes(pref) ? prev.filter(p => p !== pref) : [...prev, pref]
    );
  };

  const getConditionsString = () => {
    let result = selectedConditions.filter(c => c !== 'All of the above').join(', ');
    if (selectedConditions.includes('Others') && otherCondition.trim()) {
      result += (result ? ', ' : '') + otherCondition.trim();
    }
    return result;
  };

  // Save history to localStorage
  useEffect(() => {
    localStorage.setItem('healqr_diet_history', JSON.stringify(historyItems));
  }, [historyItems]);

  // Lock body scroll when modal is open
  useEffect(() => {
    if (selectedChart) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [selectedChart]);

  // Check for pre-filled patient data from localStorage
  useEffect(() => {
    const prefilledData = localStorage.getItem('prefilled_diet_patient');
    if (prefilledData) {
      try {
        const patient = JSON.parse(prefilledData);
        setPatientData(prev => ({
          ...prev,
          name: patient.name || '',
          age: patient.age ? String(patient.age) : '',
          gender: patient.gender ? patient.gender.toLowerCase() : 'male',
          phone: patient.phone || ''
        }));
        setActiveTab('create');
        // Clear the data so it doesn't persist on refresh
        localStorage.removeItem('prefilled_diet_patient');
      } catch (error) {
        console.error('Error parsing prefilled patient data:', error);
      }
    }
  }, []);

  // Form state
  const [patientData, setPatientData] = useState({
    name: '',
    phone: '',
    age: '',
    gender: 'male',
    weight: '',
    height: '',
    activityLevel: 'moderate',
    conditions: '',
    preferences: '',
    region: 'West Bengal',
    isSmoker: false,
    isAlcoholic: false
  });

  // BMI Calculation
  const bmi = patientData.weight && patientData.height && parseFloat(patientData.height) > 0
    ? (parseFloat(patientData.weight) / ((parseFloat(patientData.height) / 100) ** 2)).toFixed(1)
    : null;

  const getBmiCategory = (bmiVal: number): { label: string; color: string } => {
    if (bmiVal < 18.5) return { label: 'Underweight', color: 'text-yellow-400' };
    if (bmiVal < 25) return { label: 'Normal', color: 'text-emerald-400' };
    if (bmiVal < 30) return { label: 'Overweight', color: 'text-orange-400' };
    return { label: 'Obese', color: 'text-red-400' };
  };

  // Simulated chart generation
  const handleGenerate = async () => {
    const condStr = getConditionsString();
    if (!patientData.name || !patientData.age) {
      toast.error('Required fields missing', {
        description: 'Please fill in Patient Name and Age.'
      });
      return;
    }
    if (!condStr.trim()) {
      toast.error('Medical conditions required', {
        description: 'Please select at least one medical condition. If none, select "None".'
      });
      return;
    }

    setIsGenerating(true);

    // Simulate AI thinking process
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Generate a structured 7-day plan (Mock logic for now, but detailed as requested)
    const generateDetailedPlan = (region: string) => {
      const days = [];
      for (let i = 1; i <= 7; i++) {
        days.push({
          day: i,
          meals: [
            {
              type: 'Breakfast' as const,
              items: [
                { name: 'Oats with Milk', weight: '50 GM', kcal: '180 KCAL' },
                { name: 'Boiled Egg', weight: '1 unit', kcal: '70 KCAL' }
              ]
            },
            {
              type: 'Lunch' as const,
              items: region === 'West Bengal' ? [
                { name: 'Rice (Red/Brown)', weight: '50 GM', kcal: '100 KCAL' },
                { name: 'Boiled Spinach+Carrot', weight: '100 GM', kcal: '200 KCAL' },
                { name: 'Fish (Steamed/Grilled)', weight: '75 GM', kcal: '200 KCAL' },
                { name: 'Mishti (Low GI/Stevia)', weight: '20 GM', kcal: '80 KCAL' }
              ] : [
                { name: 'Multigrain Roti', weight: '2 units', kcal: '140 KCAL' },
                { name: 'Dal (Lentils)', weight: '100 GM', kcal: '120 KCAL' },
                { name: 'Mixed Veggies', weight: '100 GM', kcal: '150 KCAL' },
                { name: 'Curd', weight: '50 GM', kcal: '50 KCAL' }
              ]
            },
            {
              type: 'Snacks' as const,
              items: [
                { name: 'Roasted Foxnuts (Makhana)', weight: '20 GM', kcal: '70 KCAL' },
                { name: 'Green Tea', weight: '1 Cup', kcal: '0 KCAL' }
              ]
            },
            {
              type: 'Dinner' as const,
              items: [
                { name: 'Vegetable Soup', weight: '150 ML', kcal: '90 KCAL' },
                { name: 'Grilled Paneer/Chicken', weight: '50 GM', kcal: '130 KCAL' }
              ]
            }
          ]
        });
      }
      return days;
    };

    const newChart: DietChartHistoryItem = {
      id: Math.random().toString(36).substr(2, 9),
      patientName: patientData.name,
      phone: patientData.phone,
      age: patientData.age,
      gender: patientData.gender,
      conditions: getConditionsString(),
      region: patientData.region,
      isSmoker: patientData.isSmoker,
      isAlcoholic: patientData.isAlcoholic,
      date: new Date().toLocaleDateString('en-GB'),
      timestamp: Date.now(),
      plan: generateDetailedPlan(patientData.region)
    };

    setHistoryItems(prev => [newChart, ...prev]);
    setIsGenerating(false);
    toast.success('AI Diet Chart generated successfully!');
  };

  const handleCloseReport = () => {
    setSelectedChart(null);
    setEditingSection(null);
    setTempPlan([]);
  };

  const handleStartEdit = (day: number, mealType: string) => {
    if (!selectedChart) return;
    setTempPlan(JSON.parse(JSON.stringify(selectedChart.plan || [])));
    setEditingSection({ day, mealType });
  };

  const handleSaveMealItems = () => {
    if (!selectedChart) return;

    const updatedPlan = tempPlan;
    const updatedChart = { ...selectedChart, plan: updatedPlan };
    setSelectedChart(updatedChart);

    // Update history
    const updatedHistory = historyItems.map(item =>
      item.id === selectedChart.id ? updatedChart : item
    );
    setHistoryItems(updatedHistory);
    localStorage.setItem('healqr_diet_history', JSON.stringify(updatedHistory));

    setEditingSection(null);
    toast.success('Meal plan updated successfully');
  };

  const handleAddItem = (day: number, mealType: string) => {
    setTempPlan(prev => {
      const newPlan = [...(prev || [])];
      const dayPlan = newPlan.find(d => d.day === day);
      if (dayPlan) {
        const meal = dayPlan.meals.find(m => m.type === mealType);
        if (meal) {
          meal.items.push({ name: 'New Item', weight: '0 GM', kcal: '0 KCAL' });
        }
      }
      return newPlan;
    });
  };

  const handleDeleteItem = (day: number, mealType: string, itemIdx: number) => {
    setTempPlan(prev => {
      const newPlan = [...(prev || [])];
      const dayPlan = newPlan.find(d => d.day === day);
      if (dayPlan) {
        const meal = dayPlan.meals.find(m => m.type === mealType);
        if (meal) {
          meal.items.splice(itemIdx, 1);
        }
      }
      return newPlan;
    });
  };

  const handleUpdateItem = (day: number, mealType: string, itemIdx: number, field: string, value: string) => {
    setTempPlan(prev => {
      const newPlan = JSON.parse(JSON.stringify(prev || []));
      const dayPlan = newPlan.find((d: any) => d.day === day);
      if (dayPlan) {
        const meal = dayPlan.meals.find((m: any) => m.type === mealType);
        if (meal) {
          meal.items[itemIdx] = { ...meal.items[itemIdx], [field]: value };
        }
      }
      return newPlan;
    });
  };

  // Download PDF for selected chart
  const handleDownloadPDF = async () => {
    if (!selectedChart?.plan) return;
    try {
      const { jsPDF } = await import('jspdf');
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const margin = 20;
      let y = 20;

      // Header
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(18);
      doc.setTextColor(30, 41, 59);
      doc.text('AI DIET CHART', pageWidth / 2, y, { align: 'center' });
      y += 6;
      doc.setFontSize(8);
      doc.setTextColor(100);
      doc.text('PRECISION NUTRITION STRATEGY', pageWidth / 2, y, { align: 'center' });
      y += 10;

      // Patient Info Stripe
      doc.setFillColor(248, 250, 252);
      doc.rect(margin, y, pageWidth - margin * 2, 14, 'F');
      doc.setDrawColor(226, 232, 240);
      doc.line(margin, y, pageWidth - margin, y);
      doc.line(margin, y + 14, pageWidth - margin, y + 14);
      doc.setFontSize(7);
      doc.setTextColor(148, 163, 184);
      doc.text('PATIENT', margin + 5, y + 4);
      doc.text('PHONE', 75, y + 4);
      doc.text('AGE/SEX', 120, y + 4);
      doc.text('DATE', pageWidth - 45, y + 4);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(30, 41, 59);
      doc.text(selectedChart.patientName.toUpperCase(), margin + 5, y + 10);
      doc.text(selectedChart.phone || 'NA', 75, y + 10);
      doc.text(`${selectedChart.age}Y/${selectedChart.gender.charAt(0).toUpperCase()}`, 120, y + 10);
      doc.setTextColor(37, 99, 235);
      doc.text(selectedChart.date, pageWidth - 45, y + 10);
      y += 22;

      // Conditions
      if (selectedChart.conditions) {
        doc.setFillColor(255, 247, 237);
        doc.roundedRect(margin, y, pageWidth - margin * 2, 12, 2, 2, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7);
        doc.setTextColor(194, 65, 12);
        doc.text('DIAGNOSIS', margin + 5, y + 5);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(71, 85, 105);
        const condLines = doc.splitTextToSize(selectedChart.conditions, pageWidth - margin * 2 - 10);
        doc.text(condLines, margin + 5, y + 9);
        y += 16;
      }

      // 7-Day Plan
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(37, 99, 235);
      doc.text('7-DAY NUTRITIONAL STRATEGY', margin, y);
      y += 8;

      const maxY = doc.internal.pageSize.getHeight() - 30;

      selectedChart.plan.forEach((day) => {
        if (y > maxY - 35) { doc.addPage(); y = 20; }
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.setTextColor(30, 41, 59);
        doc.setFillColor(241, 245, 249);
        doc.rect(margin, y, pageWidth - margin * 2, 7, 'F');
        doc.text(`DAY ${day.day}`, margin + 5, y + 5);
        y += 10;

        day.meals.forEach((meal) => {
          if (y > maxY - 15) { doc.addPage(); y = 20; }
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(8);
          doc.setTextColor(37, 99, 235);
          doc.text(meal.type.toUpperCase(), margin + 5, y);
          y += 4;
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(8);
          doc.setTextColor(71, 85, 105);
          meal.items.forEach((item) => {
            if (y > maxY - 8) { doc.addPage(); y = 20; }
            doc.text(`• ${item.name} (${item.weight}) — ${item.kcal}`, margin + 8, y);
            y += 4;
          });
          y += 2;
        });
        y += 3;
      });

      // Footer
      if (y > maxY - 20) { doc.addPage(); y = 20; }
      y += 5;
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(8);
      doc.setTextColor(100);
      doc.text('This plan is medically reviewed and', pageWidth - margin, y, { align: 'right' });
      y += 5;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.setTextColor(30, 41, 59);
      doc.text(`Guided by Dr. ${doctorName}`, pageWidth - margin, y, { align: 'right' });

      // Watermark on all pages
      const totalPages = doc.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFontSize(40);
        doc.setTextColor(240, 240, 240);
        doc.text('HealQR', pageWidth / 2, doc.internal.pageSize.getHeight() / 2, {
          align: 'center',
          angle: 45,
        });
        doc.setFontSize(7);
        doc.setTextColor(180);
        doc.text('Powered by HealQR AI • teamhealqr.web.app', pageWidth / 2, doc.internal.pageSize.getHeight() - 8, { align: 'center' });
      }

      doc.save(`DietChart_${selectedChart.patientName.replace(/\s+/g, '_')}_${selectedChart.date.replace(/\//g, '-')}.pdf`);
      toast.success('PDF downloaded successfully!');
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Failed to generate PDF');
    }
  };

  // Share via WhatsApp
  const handleShareWhatsApp = () => {
    if (!selectedChart?.plan) return;
    let text = `*AI DIET CHART*\n`;
    text += `Patient: ${selectedChart.patientName}\n`;
    text += `Age: ${selectedChart.age} | Gender: ${selectedChart.gender}\n`;
    if (selectedChart.conditions) text += `Diagnosis: ${selectedChart.conditions}\n`;
    text += `Date: ${selectedChart.date}\n\n`;

    selectedChart.plan.forEach((day) => {
      text += `*DAY ${day.day}*\n`;
      day.meals.forEach((meal) => {
        text += `_${meal.type}_\n`;
        meal.items.forEach((item) => {
          text += `  • ${item.name} (${item.weight}) - ${item.kcal}\n`;
        });
      });
      text += `\n`;
    });

    text += `_Guided by Dr. ${doctorName}_\n`;
    text += `_Powered by HealQR AI_`;

    const phoneNumber = selectedChart.phone ? selectedChart.phone.replace(/\D/g, '') : '';
    const url = phoneNumber
      ? `https://wa.me/${phoneNumber.startsWith('91') ? phoneNumber : '91' + phoneNumber}?text=${encodeURIComponent(text)}`
      : `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  const filteredHistory = historyItems.filter(item => {
    const matchesSearch =
      item.patientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.phone.includes(searchQuery);

    const itemDate = new Date(item.timestamp);
    const matchesDateFrom = !dateFrom || itemDate >= new Date(dateFrom);
    const matchesDateTo = !dateTo || itemDate <= new Date(dateTo + 'T23:59:59');

    return matchesSearch && matchesDateFrom && matchesDateTo;
  });

  return (
    <div className="min-h-screen bg-black text-white flex flex-col lg:flex-row">
      <DashboardSidebar
        activeMenu="ai-diet-chart"
        onMenuChange={onMenuChange}
        onLogout={onLogout}
        isOpen={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
        activeAddOns={activeAddOns}
      />

      <main className="flex-1 lg:ml-64 flex flex-col min-h-screen">
        <header className="bg-black border-b border-zinc-900 px-4 md:px-8 py-4 flex items-center justify-between sticky top-0 z-50">
          <div className="flex items-center gap-3">
             <button
               onClick={() => setMobileMenuOpen(true)}
               className="lg:hidden w-10 h-10 bg-zinc-900 hover:bg-zinc-800 rounded-lg flex items-center justify-center transition-colors"
             >
               <Menu className="w-5 h-5 text-emerald-500" />
             </button>
            <Apple className="w-6 h-6 text-emerald-500" />
            <h2 className="text-lg md:text-xl font-semibold">AI Driven Diet Chart</h2>
          </div>
          <div className="flex items-center gap-2">
            <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 px-3 py-1">
              <Sparkles className="w-3 h-3 mr-1 inline" />
              AI Powered
            </Badge>
          </div>
        </header>

        <div className="p-4 md:p-8 max-w-4xl mx-auto w-full space-y-6">
          {/* Main Action Tabs */}
          <div className="flex p-1 bg-zinc-900 rounded-xl w-fit">
            <button
              onClick={() => setActiveTab('create')}
              className={`flex items-center gap-2 px-6 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'create'
                  ? 'bg-black text-white shadow-lg'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <Plus className="w-4 h-4" />
              Create New Chart
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`flex items-center gap-2 px-6 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'history'
                  ? 'bg-black text-white shadow-lg'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <History className="w-4 h-4" />
              History
            </button>
          </div>

          {activeTab === 'create' ? (
            <Card className="bg-zinc-900 border-zinc-800 shadow-2xl">
              <CardHeader className="border-b border-zinc-800">
                <CardTitle className="text-white flex items-center gap-2">
                  <User className="w-5 h-5 text-emerald-500" />
                  Patient Assessment
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6 space-y-6">

                {/* Row 1: Name, Phone, Age, Gender */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-400">Patient Name <span className="text-red-500">*</span></label>
                    <input
                      type="text"
                      placeholder="Enter full name"
                      className="w-full bg-black border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500 transition-all"
                      value={patientData.name}
                      onChange={(e) => setPatientData({...patientData, name: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-400">Phone Number</label>
                    <input
                      type="tel"
                      placeholder="Enter phone number"
                      className="w-full bg-black border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500 transition-all"
                      value={patientData.phone}
                      onChange={(e) => setPatientData({...patientData, phone: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-400">Age <span className="text-red-500">*</span></label>
                    <input
                      type="number"
                      placeholder="Years"
                      className="w-full bg-black border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500 transition-all"
                      value={patientData.age}
                      onChange={(e) => setPatientData({...patientData, age: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-400">Gender</label>
                    <select
                      className="w-full bg-black border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500 transition-all"
                      value={patientData.gender}
                      onChange={(e) => setPatientData({...patientData, gender: e.target.value})}
                    >
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                </div>

                {/* Row 2: Weight, Height, BMI */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-400">Weight (kg)</label>
                    <input
                      type="number"
                      placeholder="e.g. 72"
                      className="w-full bg-black border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500 transition-all"
                      value={patientData.weight}
                      onChange={(e) => setPatientData({...patientData, weight: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-400">Height (cm)</label>
                    <input
                      type="number"
                      placeholder="e.g. 170"
                      className="w-full bg-black border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500 transition-all"
                      value={patientData.height}
                      onChange={(e) => setPatientData({...patientData, height: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-400">BMI</label>
                    <div className={`flex flex-col items-center justify-center h-[42px] rounded-lg border ${
                      bmi ? 'bg-zinc-800 border-zinc-600' : 'bg-zinc-900/50 border-zinc-700/50'
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
                  <label className="text-sm font-medium text-gray-400">Activity Level</label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['sedentary', 'moderate', 'active'] as const).map((level) => (
                      <button
                        key={level}
                        onClick={() => setPatientData({...patientData, activityLevel: level})}
                        className={`py-2.5 px-3 rounded-lg text-sm font-medium capitalize border transition-colors ${
                          patientData.activityLevel === level
                            ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300'
                            : 'bg-black border-zinc-700 text-gray-400 hover:bg-zinc-800'
                        }`}
                      >
                        {level}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Medical Conditions Dropdown (Mandatory) */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <label className="text-sm font-medium text-gray-400">Medical Conditions / Diagnosis</label>
                    <span className="text-[10px] bg-red-500/20 text-red-400 px-2 py-0.5 rounded-full">Mandatory</span>
                  </div>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => { setConditionsDropdownOpen(!conditionsDropdownOpen); setPreferencesDropdownOpen(false); }}
                      className="w-full bg-black border border-zinc-700 rounded-lg p-3 text-sm text-left flex items-center justify-between min-h-[44px]"
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
                                ? 'bg-emerald-500 border-emerald-500 text-white'
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
                  {selectedConditions.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {selectedConditions.map((cond) => (
                        <span
                          key={cond}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
                        >
                          {cond}
                          <button type="button" onClick={() => toggleCondition(cond)} className="hover:text-emerald-100">×</button>
                        </span>
                      ))}
                    </div>
                  )}
                  {selectedConditions.includes('Others') && (
                    <input
                      placeholder="Specify other conditions..."
                      value={otherCondition}
                      onChange={(e) => setOtherCondition(e.target.value)}
                      className="w-full bg-black border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500 mt-1"
                    />
                  )}
                </div>

                {/* Food Preferences Dropdown */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-400">Food Preferences / Restrictions</label>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => { setPreferencesDropdownOpen(!preferencesDropdownOpen); setConditionsDropdownOpen(false); }}
                      className="w-full bg-black border border-zinc-700 rounded-lg p-3 text-sm text-left flex items-center justify-between min-h-[44px]"
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
                  <label className="text-sm font-medium text-gray-400">Region (for cuisine preferences)</label>
                  <select
                    value={patientData.region}
                    onChange={(e) => setPatientData({...patientData, region: e.target.value})}
                    className="w-full bg-black border border-zinc-700 rounded-lg p-3 text-sm text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="West Bengal">West Bengal</option>
                    <option value="North India">North India</option>
                    <option value="South India">South India</option>
                    <option value="East India">East India</option>
                    <option value="West India">West India</option>
                    <option value="Northeast India">Northeast India</option>
                    <option value="Maharashtra">Maharashtra</option>
                    <option value="Gujarat">Gujarat</option>
                    <option value="General Indian">General Indian</option>
                  </select>
                </div>

                {/* Smoker / Alcoholic Checkboxes */}
                <div className="flex items-center gap-6">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={patientData.isSmoker}
                      onChange={(e) => setPatientData({...patientData, isSmoker: e.target.checked})}
                      className="w-4 h-4 rounded border-zinc-700 bg-zinc-900 text-emerald-500 focus:ring-emerald-500"
                    />
                    <span className="text-sm text-gray-400">Smoker</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={patientData.isAlcoholic}
                      onChange={(e) => setPatientData({...patientData, isAlcoholic: e.target.checked})}
                      className="w-4 h-4 rounded border-zinc-700 bg-zinc-900 text-emerald-500 focus:ring-emerald-500"
                    />
                    <span className="text-sm text-gray-400">Alcoholic</span>
                  </label>
                </div>

                {/* Special Instructions / Remarks */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-400">Special Instructions / Remarks</label>
                  <textarea
                    placeholder="e.g. Low sodium diet, avoid spicy food..."
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                    className="w-full bg-black border border-zinc-700 rounded-lg p-3 text-sm text-white min-h-[60px] focus:outline-none focus:border-emerald-500"
                  />
                </div>

                {/* Footer: AI text + Generate Button */}
                <div className="pt-4 border-t border-zinc-800 flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <Sparkles className="w-4 h-4 text-emerald-400" />
                    <span>AI-powered nutrition plan based on patient assessment</span>
                  </div>
                  <Button
                    onClick={handleGenerate}
                    disabled={isGenerating}
                    className="w-full sm:w-auto bg-emerald-500 hover:bg-emerald-600 text-white font-bold h-10 px-6"
                  >
                    {isGenerating ? (
                      <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Generating...</>
                    ) : (
                      <><Sparkles className="w-4 h-4 mr-2" /> Generate Diet Chart</>
                    )}
                  </Button>
                </div>

              </CardContent>
            </Card>
          ) : (
            /* History Tab */
            <div className="space-y-6">
              {/* Search and Filters */}
              {/* Search and Filters */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-zinc-900/30 p-4 rounded-2xl border border-zinc-800/50">
                <div className="md:col-span-2 flex gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <input
                      type="text"
                      placeholder="Search Name or Phone..."
                      className="w-full bg-black border border-zinc-800 rounded-lg pl-10 pr-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                  <Button className="bg-emerald-500 hover:bg-emerald-600 h-9 px-4 rounded-lg text-xs font-bold whitespace-nowrap">
                    Search
                  </Button>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500 whitespace-nowrap">From:</span>
                  <input
                    type="date"
                    className="flex-1 bg-black border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500 whitespace-nowrap">To:</span>
                  <input
                    type="date"
                    className="flex-1 bg-black border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                  />
                </div>
              </div>

              {historyItems.length === 0 ? (
                <div className="text-center py-20 bg-zinc-900/50 rounded-2xl border border-dashed border-zinc-800">
                  <History className="w-16 h-16 text-zinc-800 mx-auto mb-4" />
                  <p className="text-gray-500">No chart generation history found.</p>
                  <Button
                    variant="link"
                    onClick={() => setActiveTab('create')}
                    className="text-emerald-500 mt-2"
                  >
                    Start your first generation
                  </Button>
                </div>
              ) : filteredHistory.length === 0 ? (
                <div className="text-center py-10">
                  <p className="text-gray-500">No records match your filters.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredHistory.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => setSelectedChart(item)}
                      className="bg-zinc-900 border border-zinc-800 p-5 rounded-2xl flex items-center justify-between group hover:border-emerald-500/50 transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-emerald-500/10 rounded-xl flex items-center justify-center">
                          <FileText className="w-6 h-6 text-emerald-500" />
                        </div>
                        <div>
                          <h4 className="font-bold text-white">{item.patientName}</h4>
                          <p className="text-xs text-gray-500">
                            {item.phone && `${item.phone} • `}
                            {item.conditions.length > 20 ? `${item.conditions.substring(0, 20)}...` : item.conditions}
                          </p>
                          <p className="text-[10px] text-zinc-600 mt-1">Generated: {item.date}</p>
                        </div>
                      </div>
                      <Button size="icon" variant="ghost" className="rounded-full text-gray-500 hover:text-white hover:bg-zinc-800">
                        <ChevronRight className="w-5 h-5" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

        </div>

        <footer className="mt-auto py-8 text-center border-t border-zinc-900">
          <p className="text-xs text-gray-500 flex items-center justify-center gap-2">
            AI Diet Advisor v1.0
            <span className="w-1 h-1 bg-zinc-800 rounded-full" />
            Empowering Preventive Care
          </p>
        </footer>
      </main>

      {/* Report Viewer Modal - Rendering at the end for proper Stacking Context */}
      {selectedChart && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/98">
          <div className="bg-zinc-950 border border-zinc-800 w-full max-w-2xl max-h-[90vh] rounded-3xl overflow-hidden flex flex-col shadow-[0_0_100px_rgba(0,0,0,0.8)]">
            <div className="p-6 border-b border-zinc-900 flex items-center justify-between bg-zinc-950">
              <div className="flex items-center gap-3">
                <Apple className="w-6 h-6 text-emerald-500" />
                <h3 className="text-xl font-bold">Patient Diet Report</h3>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleCloseReport}
                className="rounded-full hover:bg-zinc-800"
              >
                <X className="w-6 h-6" />
              </Button>
            </div>

            <div className="flex-1 overflow-y-auto p-8 space-y-8 bg-zinc-950">
              {/* Patient Info */}
              <div className="grid grid-cols-2 gap-4 bg-zinc-900 p-6 rounded-2xl border border-zinc-800">
                <div>
                  <span className="text-xs text-zinc-500 uppercase tracking-wider">Patient Name</span>
                  <p className="font-bold text-lg">{selectedChart.patientName}</p>
                </div>
                <div>
                  <span className="text-xs text-zinc-500 uppercase tracking-wider">Contact</span>
                  <p className="font-bold text-base md:text-lg break-all">{selectedChart.phone || 'Not provided'}</p>
                </div>
                <div>
                  <span className="text-xs text-zinc-500 uppercase tracking-wider">Age/Gender</span>
                  <p className="text-zinc-300">{selectedChart.age} Years • {selectedChart.gender}</p>
                </div>
                <div>
                  <span className="text-xs text-zinc-500 uppercase tracking-wider">Generated On</span>
                  <p className="text-zinc-300">{selectedChart.date}</p>
                </div>
              </div>

              {/* AI Content - Detailed Structure */}
              <div className="space-y-6">
                <div className="flex items-center justify-between mb-2">
                   <h4 className="text-emerald-500 font-bold flex items-center gap-2">
                    <Sparkles className="w-4 h-4" />
                    7-Day Nutritional Strategy
                   </h4>
                   <Badge variant="outline" className="text-emerald-500 border-emerald-500/30 bg-emerald-500/5">
                     ~1800-2200 kcal/day
                   </Badge>
                </div>

                <div className="space-y-8">
                  {(editingSection ? tempPlan : selectedChart.plan) ? (
                    (editingSection ? tempPlan : selectedChart.plan)?.map((dayData) => (
                      <div key={dayData.day} className="space-y-4">
                        <div className="flex items-center gap-2 border-l-4 border-emerald-500 pl-3 py-1 bg-emerald-500/5">
                           <h5 className="text-white font-bold text-base uppercase tracking-widest">Day {dayData.day}</h5>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {dayData.meals.map((meal, mIdx) => {
                            const isEditing = editingSection?.day === dayData.day && editingSection?.mealType === meal.type;

                            return (
                              <div key={mIdx} className={`bg-zinc-900 p-5 rounded-2xl border transition-all ${
                                isEditing ? 'border-emerald-500 ring-1 ring-emerald-500/20' : 'border-zinc-800 hover:border-emerald-500/30'
                              }`}>
                                <div className="flex items-center justify-between mb-3">
                                  <div className="flex items-center gap-3">
                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                                      meal.type === 'Breakfast' ? 'bg-orange-500/10' :
                                      meal.type === 'Lunch' ? 'bg-blue-500/10' :
                                      meal.type === 'Snacks' ? 'bg-yellow-500/10' : 'bg-indigo-500/10'
                                    }`}>
                                      <span className={`text-[10px] font-bold ${
                                        meal.type === 'Breakfast' ? 'text-orange-500' :
                                        meal.type === 'Lunch' ? 'text-blue-500' :
                                        meal.type === 'Snacks' ? 'text-yellow-500' : 'text-indigo-500'
                                      }`}>{meal.type === 'Breakfast' ? 'BF' : meal.type === 'Lunch' ? 'LN' : meal.type === 'Snacks' ? 'SN' : 'DN'}</span>
                                    </div>
                                    <h6 className="font-bold text-white text-[11px] uppercase tracking-wider">{meal.type}</h6>
                                  </div>

                                  {!isEditing ? (
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-7 w-7 rounded-lg hover:bg-zinc-800 text-zinc-500 hover:text-white"
                                      onClick={() => handleStartEdit(dayData.day, meal.type)}
                                    >
                                      <Pencil className="w-3.5 h-3.5" />
                                    </Button>
                                  ) : (
                                    <div className="flex gap-1">
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-7 w-7 rounded-lg hover:bg-emerald-500/20 text-emerald-400"
                                        onClick={handleSaveMealItems}
                                      >
                                        <Save className="w-3.5 h-3.5" />
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-7 w-7 rounded-lg hover:bg-zinc-800 text-zinc-500"
                                        onClick={() => setEditingSection(null)}
                                      >
                                        <X className="w-3.5 h-3.5" />
                                      </Button>
                                    </div>
                                  )}
                                </div>

                                <div className="space-y-3">
                                  {meal.items.map((item, iIdx) => (
                                    <div key={iIdx} className="group relative">
                                      {isEditing ? (
                                        <div className="space-y-2 pb-3 border-b border-zinc-800/50 last:border-0 last:pb-0">
                                          <div className="flex gap-2">
                                            <input
                                              className="flex-1 bg-black border border-zinc-800 rounded px-2 py-1 text-xs text-white focus:border-emerald-500"
                                              value={item.name}
                                              onChange={(e) => handleUpdateItem(dayData.day, meal.type, iIdx, 'name', e.target.value)}
                                              placeholder="Food name"
                                            />
                                            <Button
                                              variant="ghost"
                                              size="icon"
                                              className="h-6 w-6 text-zinc-600 hover:text-red-500"
                                              onClick={() => handleDeleteItem(dayData.day, meal.type, iIdx)}
                                            >
                                              <Trash2 className="w-3 h-3" />
                                            </Button>
                                          </div>
                                          <div className="flex gap-2">
                                            <input
                                              className="w-1/2 bg-black border border-zinc-800 rounded px-2 py-1 text-[10px] text-zinc-400"
                                              value={item.weight}
                                              onChange={(e) => handleUpdateItem(dayData.day, meal.type, iIdx, 'weight', e.target.value)}
                                              placeholder="Quantity"
                                            />
                                            <input
                                              className="w-1/2 bg-black border border-zinc-800 rounded px-2 py-1 text-[10px] text-emerald-500"
                                              value={item.kcal}
                                              onChange={(e) => handleUpdateItem(dayData.day, meal.type, iIdx, 'kcal', e.target.value)}
                                              placeholder="Calories"
                                            />
                                          </div>
                                        </div>
                                      ) : (
                                        <div className="flex justify-between items-start gap-2 border-b border-zinc-800/50 pb-2 last:border-0 last:pb-0">
                                          <div className="flex-1">
                                            <p className="text-sm font-medium text-white">{item.name}</p>
                                            <p className="text-[10px] text-zinc-500">{item.weight}</p>
                                          </div>
                                          <Badge variant="outline" className="text-[10px] py-0 bg-white/5 border-zinc-700 text-emerald-400">
                                            {item.kcal}
                                          </Badge>
                                        </div>
                                      )}
                                    </div>
                                  ))}

                                  {isEditing && (
                                    <Button
                                      variant="ghost"
                                      className="w-full flex items-center gap-2 py-2 text-[10px] text-zinc-500 hover:text-emerald-500 hover:bg-emerald-500/5 mt-2 border border-dashed border-zinc-800"
                                      onClick={() => handleAddItem(dayData.day, meal.type)}
                                    >
                                      <PlusCircle className="w-3 h-3" />
                                      Add Item
                                    </Button>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-gray-500 text-center italic">Detailed day-wise plan not available for this legacy record.</p>
                  )}
                </div>

                {/* Patient Lifestyle Summary */}
                <div className="grid grid-cols-2 gap-4">
                   <div className={`p-4 rounded-xl border flex items-center gap-3 ${selectedChart.isSmoker ? 'bg-red-500/5 border-red-500/20' : 'bg-zinc-900 border-zinc-800 opacity-40'}`}>
                      <Activity className={`w-5 h-5 ${selectedChart.isSmoker ? 'text-red-500' : 'text-zinc-600'}`} />
                      <div>
                        <p className="text-[10px] text-zinc-500">Smoking Status</p>
                        <p className="text-xs font-bold text-white">{selectedChart.isSmoker ? 'Smoker' : 'Non-Smoker'}</p>
                      </div>
                   </div>
                   <div className={`p-4 rounded-xl border flex items-center gap-3 ${selectedChart.isAlcoholic ? 'bg-red-500/5 border-red-500/20' : 'bg-zinc-900 border-zinc-800 opacity-40'}`}>
                      <Activity className={`w-5 h-5 ${selectedChart.isAlcoholic ? 'text-red-500' : 'text-zinc-600'}`} />
                      <div>
                        <p className="text-[10px] text-zinc-500">Alcohol Consumption</p>
                        <p className="text-xs font-bold text-white">{selectedChart.isAlcoholic ? 'Yes' : 'No'}</p>
                      </div>
                   </div>
                </div>

                {/* Food Guidelines */}
                <div className="mt-8 bg-emerald-500/5 border border-emerald-500/20 rounded-2xl p-6">
                  <h5 className="text-emerald-500 font-bold text-sm mb-3">General Food Guidelines:</h5>
                  <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <li className="text-[11px] text-zinc-300 flex items-center gap-2">
                      <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                      Hydration: Minimum 3.5L water/day.
                    </li>
                    <li className="text-[11px] text-zinc-300 flex items-center gap-2">
                      <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                      No processed/packaged foods.
                    </li>
                    <li className="text-[11px] text-zinc-300 flex items-center gap-2">
                      <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                      Walk for 15 mins post-meal.
                    </li>
                    <li className="text-[11px] text-zinc-300 flex items-center gap-2">
                      <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                      Consult before supplement use.
                    </li>
                  </ul>
                </div>

                {/* Doctor Signature */}
                <div className="pt-8 border-t border-zinc-900 flex flex-col items-end">
                  <p className="text-xs text-zinc-500 italic">This plan is medically reviewed and</p>
                  <p className="font-bold text-white text-lg">Guided by Dr. {doctorName}</p>
                  <div className="h-0.5 w-32 bg-emerald-500/30 mt-1" />
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-zinc-900 bg-zinc-950 flex gap-4">
              <Button onClick={handleDownloadPDF} className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl py-6 font-bold">
                 Download PDF
              </Button>
              <Button onClick={handleShareWhatsApp} variant="outline" className="flex-1 border-zinc-800 bg-zinc-950 hover:bg-zinc-900 text-white rounded-xl py-6 font-bold">
                 Share via WhatsApp
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
