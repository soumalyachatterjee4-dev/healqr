import { useState, useEffect } from 'react';
import { Scan, Settings, TrendingUp, Zap, FileText, History, Info, Menu, ChevronLeft } from 'lucide-react';
import { Button } from './ui/button';
import { Label } from './ui/label';
import { Switch } from './ui/switch';
import { Card } from './ui/card';
import { AIRXReaderHistory } from './AIRXReaderHistory';
import ClinicSidebar from './ClinicSidebar';
import { toast } from 'sonner';

interface ClinicAIRXReaderManagerProps {
  clinicName?: string;
  clinicId?: string;
  onLogout?: () => void;
  onMenuChange?: (menu: string) => void;
  activeAddOns?: string[];
  isSidebarCollapsed?: boolean;
  setIsSidebarCollapsed?: (collapsed: boolean) => void;
  historyOnly?: boolean;
}

export default function ClinicAIRXReaderManager({
  clinicName,
  clinicId,
  onLogout,
  onMenuChange,
  activeAddOns = [],
  isSidebarCollapsed = false,
  setIsSidebarCollapsed,
  historyOnly = false
}: ClinicAIRXReaderManagerProps = {}) {
  // Using clinic-specific localStorage keys
  const getInitialState = (key: string, defaultValue: boolean) => {
    if (!clinicId) return defaultValue;
    const stored = localStorage.getItem(`healqr_clinic_rx_settings_${clinicId}_${key}`);
    return stored !== null ? stored === 'true' : defaultValue;
  };

  const [isEnabled, setIsEnabled] = useState(() => getInitialState('enabled', true));
  const [autoExtract, setAutoExtract] = useState(() => getInitialState('auto_extract', true));
  const [showHistory, setShowHistory] = useState(historyOnly);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Statistics - Start empty (will be populated from backend/localStorage)
  const [stats, setStats] = useState({
    todayScanned: 0,
    avgConfidence: 0,
    yesterdayScanned: 0
  });

  useEffect(() => {
    // Load rudimentary stats from localStorage for now, since db logic isn't fully set up for this
    if (clinicId) {
      const historyJson = localStorage.getItem(`healqr_clinic_rx_history_${clinicId}`);
      if (historyJson) {
        try {
          const history = JSON.parse(historyJson);
          const today = new Date().toDateString();
          const yesterday = new Date(Date.now() - 86400000).toDateString();

          let todayCount = 0;
          let yesterdayCount = 0;
          let totalConfidence = 0;
          let confidenceCount = 0;

          history.forEach((item: any) => {
            const date = new Date(item.timestamp).toDateString();
            if (date === today) todayCount++;
            if (date === yesterday) yesterdayCount++;
            if (item.confidence) {
              totalConfidence += item.confidence;
              confidenceCount++;
            }
          });

          setStats({
            todayScanned: todayCount,
            yesterdayScanned: yesterdayCount,
            avgConfidence: confidenceCount > 0 ? Math.round(totalConfidence / confidenceCount) : 0
          });
        } catch (e) {
          console.error("Failed to parse rx history", e);
        }
      }
    }
  }, [clinicId]);

  const handleSaveSettings = () => {
    if (clinicId) {
      localStorage.setItem(`healqr_clinic_rx_settings_${clinicId}_enabled`, String(isEnabled));
      localStorage.setItem(`healqr_clinic_rx_settings_${clinicId}_auto_extract`, String(autoExtract));
      toast.success('Clinic AI RX settings saved successfully!');
    }
  };

  // If showing history, render the history component instead
  if (showHistory) {
    return (
      <div className="flex h-screen bg-gray-950">
        <ClinicSidebar
          activeMenu="ai-rx"
          onMenuChange={onMenuChange || (() => {})}
          onLogout={onLogout || (() => {})}
          activeAddOns={activeAddOns}
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={() => setIsSidebarCollapsed?.(!isSidebarCollapsed)}
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />
        <div className={`flex-1 overflow-auto transition-all duration-300 ${isSidebarCollapsed ? 'lg:ml-20' : 'lg:ml-64'}`}>
          <div className="p-4 sm:p-8">
            {!historyOnly && (
              <Button onClick={() => setShowHistory(false)} variant="ghost" className="mb-4 text-blue-400">Back to Settings</Button>
            )}
            <AIRXReaderHistory clinicId={clinicId} onBack={historyOnly ? undefined : () => setShowHistory(false)} />
          </div>
        </div>
      </div>
    );
  }

  // If called from dashboard, render with sidebar
  if (onMenuChange) {
    return (
      <div className="flex h-screen bg-gray-950">
        <ClinicSidebar
          activeMenu="ai-rx-reader"
          onMenuChange={onMenuChange}
          onLogout={onLogout || (() => {})}
          activeAddOns={activeAddOns}
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={() => setIsSidebarCollapsed?.(!isSidebarCollapsed)}
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />
        <div className={`flex-1 overflow-auto transition-all duration-300 ${isSidebarCollapsed ? 'lg:ml-20' : 'lg:ml-64'}`}>
          <div className="p-4 sm:p-8">
            {renderContent()}
          </div>
        </div>
      </div>
    );
  }

  // Standalone mode
  return renderContent();

  function renderContent() {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3 sm:gap-4">
              {/* Mobile Menu Button */}
              <Button
                variant="ghost"
                size="icon"
                className="lg:hidden text-gray-400 hover:text-white"
                onClick={() => setSidebarOpen(true)}
              >
                <Menu className="w-6 h-6" />
              </Button>

              <button
                onClick={() => setIsSidebarCollapsed?.(!isSidebarCollapsed)}
                className="hidden lg:flex w-10 h-10 bg-zinc-900 hover:bg-zinc-800 rounded-lg items-center justify-center transition-colors"
                title={isSidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
              >
                <ChevronLeft className={`w-5 h-5 text-blue-500 transition-transform duration-300 ${isSidebarCollapsed ? 'rotate-180' : ''}`} />
              </button>
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-blue-500/10 rounded-lg">
                    <Scan className="w-6 h-6 text-blue-400" />
                  </div>
                  <h1 className="text-white text-xl uppercase font-black tracking-tight">Clinic AI RX Reader</h1>
                </div>
                <p className="text-zinc-100 text-sm font-semibold">Configure AI-powered prescription analysis settings for {clinicName}</p>
              </div>
            </div>
            <Button
              onClick={() => setShowHistory(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white w-full sm:w-auto mt-4 sm:mt-0 font-bold shadow-lg shadow-blue-900/20"
            >
              <History className="w-4 h-4 mr-2" />
              View History
            </Button>
          </div>
        </div>


        {/* Settings Card */}
        <Card className="bg-zinc-900 border-zinc-800 p-6 mb-6">
          <div className="flex items-center gap-3 mb-6">
            <Settings className="w-5 h-5 text-blue-500" />
            <h2 className="text-white">AI Reader Settings</h2>
          </div>

          <div className="space-y-6">
            {/* Enable/Disable */}
            <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
              <div>
                <Label className="text-white mb-1 block font-bold text-base">Enable AI RX Reader</Label>
                <p className="text-sm text-zinc-100 font-semibold">Automatically scan and extract prescription information</p>
              </div>
              <Switch
                checked={isEnabled}
                onCheckedChange={setIsEnabled}
                className="data-[state=checked]:bg-blue-500"
              />
            </div>

            {/* Auto Extract */}
            <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
              <div>
                <Label className="text-white mb-1 block font-bold text-base">Auto-Detect on Upload</Label>
                <p className="text-sm text-zinc-100 font-semibold">Process prescriptions immediately after upload</p>
              </div>
              <Switch
                checked={autoExtract}
                onCheckedChange={setAutoExtract}
                className="data-[state=checked]:bg-blue-500"
              />
            </div>

            <Button
              onClick={handleSaveSettings}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              Save Settings
            </Button>
          </div>
        </Card>

        {/* Quick Stats */}
        <div className="grid md:grid-cols-3 gap-4 mb-6">
          <Card className="bg-zinc-900 border-zinc-800 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-zinc-100 text-[10px] mb-1 font-black uppercase tracking-[0.15em]">Scanned Today</p>
                <p className="text-white text-3xl font-black">{stats.todayScanned}</p>
              </div>
              <div className="p-3 bg-blue-500/10 rounded-lg">
                <FileText className="w-6 h-6 text-blue-500" />
              </div>
            </div>
          </Card>

          <Card className="bg-zinc-900 border-zinc-800 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-zinc-100 text-[10px] mb-1 font-black uppercase tracking-[0.15em]">Avg. Confidence</p>
                <p className="text-white text-3xl font-black">{stats.avgConfidence}%</p>
              </div>
              <div className="p-3 bg-blue-500/10 rounded-lg">
                <TrendingUp className="w-6 h-6 text-blue-500" />
              </div>
            </div>
          </Card>

          <Card className="bg-zinc-900 border-zinc-800 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-zinc-100 text-[10px] mb-1 font-black uppercase tracking-[0.15em]">Yesterday</p>
                <p className="text-white text-3xl font-black">{stats.yesterdayScanned}</p>
              </div>
              <div className="p-3 bg-blue-500/10 rounded-lg">
                <Zap className="w-6 h-6 text-blue-500" />
              </div>
            </div>
          </Card>
        </div>

        {/* Info Card - How to Upload */}
        <Card className="bg-gradient-to-br from-blue-900/20 to-teal-900/20 border-blue-500/30 p-6">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-blue-500/10 rounded-lg">
              <Info className="w-6 h-6 text-blue-400" />
            </div>
            <div>
              <h3 className="text-white mb-2">How to Upload Prescriptions</h3>
              <div className="space-y-2 text-sm text-gray-300">
                <p>1. Go to <span className="text-blue-400">Patient Details</span> page</p>
                <p>2. Select a patient from your list</p>
                <p>3. Click the <span className="text-blue-400">✨ AI Upload RX</span> button (sparkles icon)</p>
                <p>4. Upload prescription image - AI will automatically analyze it</p>
                <p>5. Patient receives notification with decoded prescription in their language</p>
              </div>
              <div className="mt-4 p-3 bg-black/30 rounded-lg border border-blue-500/20">
                <p className="text-xs text-gray-400">
                  💡 <span className="text-white">Tip:</span> AI RX Reader works for ALL patients (both video and in-person consultations)
                </p>
              </div>
            </div>
          </div>
        </Card>
      </div>
    );
  }
}

