import { useState, useEffect } from 'react';
import {
  Apple,
  Plus,
  History,
  Sparkles,
  CheckCircle2,
  Loader2,
  AlertCircle,
  FileText,
  User,
  Activity,
  Weight,
  Scale,
  Calendar,
  ChevronRight,
  CreditCard,
  Crown,
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
  const [usageCount, setUsageCount] = useState(0);
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
  const maxFreeUsage = 10;

  // Derive usageCount from historyItems (current month only)
  useEffect(() => {
    const now = new Date();
    const currentMonth = now.getMonth() + 1; // 1-12
    const currentYear = now.getFullYear();

    const monthlyItems = historyItems.filter(item => {
      if (!item.date) return false;
      const parts = item.date.split('/');
      if (parts.length !== 3) return false;
      const [, month, year] = parts.map(Number);
      return month === currentMonth && year === currentYear;
    });

    setUsageCount(monthlyItems.length);
  }, [historyItems]);

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

  // Simulated chart generation
  const handleGenerate = async () => {
    if (!patientData.name || !patientData.age || !patientData.conditions) {
      toast.error('Required fields missing', {
        description: 'Please fill in Name, Age, and Medical Conditions. If none, please mention "None".'
      });
      return;
    }

    if (usageCount >= maxFreeUsage) {
      toast.error('Free limit reached', {
        description: 'Please upgrade to premium for unlimited charts.'
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
      conditions: patientData.conditions,
      region: patientData.region,
      isSmoker: patientData.isSmoker,
      isAlcoholic: patientData.isAlcoholic,
      date: new Date().toLocaleDateString('en-GB'),
      timestamp: Date.now(),
      plan: generateDetailedPlan(patientData.region)
    };

    setHistoryItems(prev => [newChart, ...prev]);
    setIsGenerating(false);
    setUsageCount(prev => prev + 1);
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

        <div className="p-4 md:p-8 max-w-5xl mx-auto w-full space-y-8">
          {/* Usage Tracker & Premium Card */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="md:col-span-2 bg-zinc-900 border-zinc-800 overflow-hidden relative">
              <CardContent className="pt-6">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                  <div>
                    <h3 className="text-xl font-bold text-white mb-1">Monthly Usage</h3>
                    <p className="text-sm text-gray-400">Generate up to 10 diet charts for free every month.</p>
                  </div>
                  <div className="bg-black rounded-lg px-4 py-2 border border-zinc-800">
                    <span className="text-2xl font-bold text-emerald-500">{usageCount}</span>
                    <span className="text-gray-500 mx-2">/</span>
                    <span className="text-gray-400">{maxFreeUsage}</span>
                  </div>
                </div>

                <div className="w-full h-3 bg-zinc-800 rounded-full overflow-hidden mb-4">
                  <div
                    className="h-full bg-emerald-500 transition-all duration-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]"
                    style={{ width: `${(usageCount / maxFreeUsage) * 100}%` }}
                  />
                </div>

                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>Usage resets on the 1st of next month</span>
                  <span className="flex items-center text-emerald-500">
                    <CheckCircle2 className="w-3 h-3 mr-1" />
                    Real-time analysis active
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-emerald-600 to-emerald-900 border-0 text-white relative overflow-hidden group">
              <div className="absolute inset-0 bg-black/10 group-hover:bg-transparent transition-colors" />
              <CardContent className="pt-6 relative z-10 flex flex-col h-full">
                <Crown className="w-8 h-8 text-yellow-400 mb-3" />
                <h3 className="text-xl font-bold mb-2">Go Premium</h3>
                <p className="text-emerald-100 text-sm mb-6 flex-1">
                  Get unlimited charts, custom branding, and early access to new AI models.
                </p>
                <Button className="w-full bg-emerald-500 hover:bg-emerald-400 text-white font-bold border-0 flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 py-6">
                  <CreditCard className="w-4 h-4" />
                  Upgrade Now
                </Button>
                <p className="text-[10px] text-center mt-3 text-emerald-200 opacity-60">
                  Secure payment via Razorpay
                </p>
              </CardContent>
            </Card>
          </div>

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
              <CardContent className="pt-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* Personal Info */}
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                       <label className="text-sm font-medium text-gray-400">Patient Name <span className="text-red-500">*</span></label>
                       <div className="relative">
                         <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                         <input
                           type="text"
                           placeholder="Enter full name"
                           className="w-full bg-black border border-zinc-800 rounded-xl pl-12 pr-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                           value={patientData.name}
                           onChange={(e) => setPatientData({...patientData, name: e.target.value})}
                         />
                       </div>
                    </div>

                    <div className="space-y-2">
                       <label className="text-sm font-medium text-gray-400">Phone Number</label>
                       <div className="relative">
                         <CreditCard className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                         <input
                           type="tel"
                           placeholder="Enter phone number"
                           className="w-full bg-black border border-zinc-800 rounded-xl pl-12 pr-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                           value={patientData.phone}
                           onChange={(e) => setPatientData({...patientData, phone: e.target.value})}
                         />
                       </div>
                    </div>
                  </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-400">Age</label>
                        <div className="relative group">
                          <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                          <input
                            type="number"
                            placeholder="Years"
                            className="w-full bg-black border border-zinc-800 rounded-xl pl-10 pr-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                            value={patientData.age}
                            onChange={(e) => setPatientData({...patientData, age: e.target.value})}
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-400">Gender</label>
                        <select
                          className="w-full bg-black border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all appearance-none"
                          value={patientData.gender}
                          onChange={(e) => setPatientData({...patientData, gender: e.target.value})}
                        >
                          <option value="male">Male</option>
                          <option value="female">Female</option>
                          <option value="other">Other</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-400">Weight (kg)</label>
                        <div className="relative group">
                          <Weight className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                          <input
                            type="number"
                            placeholder="e.g. 70"
                            className="w-full bg-black border border-zinc-800 rounded-xl pl-10 pr-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                            value={patientData.weight}
                            onChange={(e) => setPatientData({...patientData, weight: e.target.value})}
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-400">Height (cm)</label>
                        <div className="relative group">
                          <Scale className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                          <input
                            type="number"
                            placeholder="e.g. 175"
                            className="w-full bg-black border border-zinc-800 rounded-xl pl-10 pr-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                            value={patientData.height}
                            onChange={(e) => setPatientData({...patientData, height: e.target.value})}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Medical Info */}
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-400">Activity Level</label>
                      <div className="grid grid-cols-3 gap-2">
                        {['sedentary', 'moderate', 'active'].map((level) => (
                          <button
                            key={level}
                            onClick={() => setPatientData({...patientData, activityLevel: level})}
                            className={`px-3 py-2 rounded-lg text-xs font-semibold capitalize transition-all border ${
                              patientData.activityLevel === level
                                ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400'
                                : 'bg-black border-zinc-800 text-gray-500 hover:border-zinc-700'
                            }`}
                          >
                            {level}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-400 flex items-center gap-2">
                        Medical Conditions / Complaints
                        <Badge variant="outline" className="text-[10px] py-0 border-red-500/50 text-red-400 bg-red-500/5">Mandatory</Badge>
                      </label>
                      <textarea
                        placeholder="Mention 'None' if applicable. e.g. Diabetes, Hypertension..."
                        className="w-full h-24 bg-black border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all resize-none"
                        value={patientData.conditions}
                        onChange={(e) => setPatientData({...patientData, conditions: e.target.value})}
                      />
                    </div>

                    <div className="space-y-4">
                      <label className="text-sm font-medium text-gray-400">Dietary Preferences & Lifestyle</label>
                      <textarea
                        placeholder="e.g. Vegetarian, No Dairy, High Protein..."
                        className="w-full h-16 bg-black border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all resize-none mb-2"
                        value={patientData.preferences}
                        onChange={(e) => setPatientData({...patientData, preferences: e.target.value})}
                      />

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                           <label className="text-[12px] text-gray-500">Regional Culture</label>
                           <select
                             className="w-full bg-black border border-zinc-800 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-emerald-500 appearance-none"
                             value={patientData.region}
                             onChange={(e) => setPatientData({...patientData, region: e.target.value})}
                           >
                             <option value="West Bengal">West Bengal</option>
                             <option value="North India">North India</option>
                             <option value="South India">South India</option>
                             <option value="Maharashtra">Maharashtra</option>
                             <option value="Gujarat">Gujarat</option>
                             <option value="General Indian">General Indian</option>
                           </select>
                        </div>

                        <div className="flex items-center gap-4 pt-6">
                           <label className="flex items-center gap-2 cursor-pointer group">
                             <div
                               onClick={() => setPatientData({...patientData, isSmoker: !patientData.isSmoker})}
                               className={`w-10 h-5 rounded-full transition-colors relative ${patientData.isSmoker ? 'bg-emerald-500' : 'bg-zinc-800'}`}
                             >
                               <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${patientData.isSmoker ? 'left-6' : 'left-1'}`} />
                             </div>
                             <span className="text-xs text-gray-400">Smoker</span>
                           </label>

                           <label className="flex items-center gap-2 cursor-pointer group">
                             <div
                               onClick={() => setPatientData({...patientData, isAlcoholic: !patientData.isAlcoholic})}
                               className={`w-10 h-5 rounded-full transition-colors relative ${patientData.isAlcoholic ? 'bg-emerald-500' : 'bg-zinc-800'}`}
                             >
                               <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${patientData.isAlcoholic ? 'left-6' : 'left-1'}`} />
                             </div>
                             <span className="text-xs text-gray-400">Alcoholic</span>
                           </label>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-12 flex flex-col items-center">
                  <Button
                    onClick={handleGenerate}
                    disabled={isGenerating}
                    className="h-16 !px-[80px] bg-emerald-500 hover:bg-emerald-600 text-white rounded-full !text-[16px] font-bold shadow-[0_0_30px_rgba(16,185,129,0.4)] hover:shadow-[0_0_40px_rgba(16,185,129,0.6)] transition-all group overflow-hidden relative min-w-max"
                  >
                    {isGenerating ? (
                      <span className="flex items-center gap-3 whitespace-nowrap">
                        <Loader2 className="w-6 h-6 animate-spin" />
                        AI is crafting the chart...
                      </span>
                    ) : (
                      <span className="flex items-center gap-3 whitespace-nowrap">
                        <Sparkles className="w-5 h-5 transition-transform group-hover:scale-125 group-hover:rotate-12" />
                        Generate AI Diet Chart
                      </span>
                    )}
                  </Button>
                  <p className="mt-4 text-xs text-gray-500 max-w-sm text-center">
                    HealQR AI analysis takes into account 25+ biometric markers and medical associations. Result may vary based on data accuracy.
                  </p>
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


          {/* Educational / Feature Highlight Section */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-12">
            {[
              {
                icon: Activity,
                title: 'Nutritional Harmony',
                desc: 'Balanced macros tailored to specific metabolic rates.'
              },
              {
                icon: AlertCircle,
                title: 'Medical Compliance',
                desc: 'Intelligent filtering for common allergies and contraindications.'
              },
              {
                icon: History,
                title: '7-Day Precision',
                desc: 'Complete week-long planning to ensure long-term adherence.'
              }
            ].map((feature, i) => (
              <div key={i} className="flex gap-4 p-4 grayscale hover:grayscale-0 transition-all opacity-60 hover:opacity-100">
                <div className="mt-1">
                  <feature.icon className="w-5 h-5 text-emerald-500" />
                </div>
                <div>
                  <h5 className="font-semibold text-white text-sm mb-1">{feature.title}</h5>
                  <p className="text-xs text-gray-500 leading-relaxed">{feature.desc}</p>
                </div>
              </div>
            ))}
          </div>
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
              <Button className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl py-6 font-bold">
                 Download PDF
              </Button>
              <Button variant="outline" className="flex-1 border-zinc-800 bg-zinc-950 hover:bg-zinc-900 text-white rounded-xl py-6 font-bold">
                 Share via WhatsApp
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
