import { useState } from 'react';
import { Scan, Settings, TrendingUp, Zap, FileText, History, Info, Menu } from 'lucide-react';
import { Button } from './ui/button';
import { Label } from './ui/label';
import { Switch } from './ui/switch';
import { Card } from './ui/card';
import { AIRXReaderHistory } from './AIRXReaderHistory';
import DashboardSidebar from './DashboardSidebar';

interface AIRXReaderManagerProps {
  doctorName?: string;
  email?: string;
  onLogout?: () => void;
  onMenuChange?: (menu: string) => void;
  activeAddOns?: string[];
}

export default function AIRXReaderManager({
  doctorName,
  email,
  onLogout,
  onMenuChange,
  activeAddOns = []
}: AIRXReaderManagerProps = {}) {
  const [isEnabled, setIsEnabled] = useState(true);
  const [autoExtract, setAutoExtract] = useState(true);
  const [showHistory, setShowHistory] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Statistics - Start empty (will be populated from backend)
  const todayScanned = 0;
  const avgConfidence = 0;
  const yesterdayScanned = 0;

  const handleSaveSettings = () => {
    // In production: Save settings to backend
    alert('Settings saved successfully!');
  };

  // If showing history, render the history component instead
  if (showHistory) {
    return (
      <div className={onMenuChange ? "min-h-screen bg-gray-950 flex flex-col lg:flex-row" : "h-screen bg-gray-950"}>
        {onMenuChange && (
          <DashboardSidebar
            activeMenu="ai-rx-reader"
            onMenuChange={(menu) => { setMobileMenuOpen(false); onMenuChange(menu); }}
            onLogout={onLogout}
            isOpen={mobileMenuOpen}
            onClose={() => setMobileMenuOpen(false)}
            activeAddOns={activeAddOns}
          />
        )}
        <div className={`flex-1 overflow-auto ${onMenuChange ? 'lg:ml-64' : ''}`}>
          <div className="p-4 md:p-8">
            <div className="flex items-center gap-3 mb-4">
              <button
                onClick={() => setMobileMenuOpen(true)}
                className="lg:hidden w-10 h-10 bg-zinc-900 hover:bg-zinc-800 rounded-lg flex items-center justify-center transition-colors"
              >
                <Menu className="w-5 h-5 text-purple-500" />
              </button>
              <Button onClick={() => setShowHistory(false)} variant="ghost" className="text-purple-400 hover:text-purple-300">
                &larr; Back to Settings
              </Button>
            </div>
            <AIRXReaderHistory onBack={() => setShowHistory(false)} />
          </div>
        </div>
      </div>
    );
  }

  // If called from dashboard, render with sidebar
  if (onMenuChange) {
    return (
      <div className="min-h-screen bg-gray-950 flex flex-col lg:flex-row">
        <DashboardSidebar
          activeMenu="ai-rx-reader"
          onMenuChange={(menu) => { setMobileMenuOpen(false); onMenuChange(menu); }}
          onLogout={onLogout}
          isOpen={mobileMenuOpen}
          onClose={() => setMobileMenuOpen(false)}
          activeAddOns={activeAddOns}
        />
        <div className="flex-1 overflow-auto lg:ml-64">
          <div className="p-4 md:p-8">
            {renderContent()}
          </div>
        </div>
      </div>
    );
  }

  // Standalone mode
  return (
    <div className="h-screen bg-gray-950 overflow-auto">
      <div className="p-4 md:p-8">
        {renderContent()}
      </div>
    </div>
  );

  function renderContent() {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setMobileMenuOpen(true)}
                className="lg:hidden w-10 h-10 bg-zinc-900 hover:bg-zinc-800 rounded-lg flex items-center justify-center transition-colors"
              >
                <Menu className="w-5 h-5 text-purple-500" />
              </button>
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-purple-500/10 rounded-lg">
                    <Scan className="w-6 h-6 text-purple-500" />
                  </div>
                  <h1 className="text-white">AI RX Reader</h1>
                </div>
                <p className="text-gray-400 text-sm">Configure AI-powered prescription analysis settings</p>
              </div>
            </div>
            <Button
              onClick={() => setShowHistory(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <History className="w-4 h-4 mr-2" />
              View History
            </Button>
          </div>
        </div>

        {/* Settings Card */}
        <Card className="bg-zinc-900 border-zinc-800 p-6 mb-6">
          <div className="flex items-center gap-3 mb-6">
            <Settings className="w-5 h-5 text-purple-500" />
            <h2 className="text-white">AI Reader Settings</h2>
          </div>

          <div className="space-y-6">
            {/* Enable/Disable */}
            <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
              <div>
                <Label className="text-white mb-1 block">Enable AI RX Reader</Label>
                <p className="text-sm text-gray-400">Automatically scan and extract prescription information</p>
              </div>
              <Switch
                checked={isEnabled}
                onCheckedChange={setIsEnabled}
                className="data-[state=checked]:bg-purple-500"
              />
            </div>

            {/* Auto Extract */}
            <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
              <div>
                <Label className="text-white mb-1 block">Auto-Detect on Upload</Label>
                <p className="text-sm text-gray-400">Process prescriptions immediately after upload</p>
              </div>
              <Switch
                checked={autoExtract}
                onCheckedChange={setAutoExtract}
                className="data-[state=checked]:bg-purple-500"
              />
            </div>

            <Button
              onClick={handleSaveSettings}
              className="bg-purple-500 hover:bg-purple-600 text-white"
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
                <p className="text-gray-400 text-sm mb-1">Scanned Today</p>
                <p className="text-white text-2xl">{todayScanned}</p>
              </div>
              <div className="p-3 bg-blue-500/10 rounded-lg">
                <FileText className="w-6 h-6 text-blue-500" />
              </div>
            </div>
          </Card>

          <Card className="bg-zinc-900 border-zinc-800 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm mb-1">Avg. Confidence</p>
                <p className="text-white text-2xl">{avgConfidence}%</p>
              </div>
              <div className="p-3 bg-green-500/10 rounded-lg">
                <TrendingUp className="w-6 h-6 text-green-500" />
              </div>
            </div>
          </Card>

          <Card className="bg-zinc-900 border-zinc-800 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm mb-1">Yesterday</p>
                <p className="text-white text-2xl">{yesterdayScanned}</p>
              </div>
              <div className="p-3 bg-purple-500/10 rounded-lg">
                <Zap className="w-6 h-6 text-purple-500" />
              </div>
            </div>
          </Card>
        </div>

        {/* Info Card - How to Upload */}
        <Card className="bg-gradient-to-br from-purple-900/20 to-pink-900/20 border-purple-500/30 p-6">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-purple-500/10 rounded-lg">
              <Info className="w-6 h-6 text-purple-400" />
            </div>
            <div>
              <h3 className="text-white mb-2">How to Upload Prescriptions</h3>
              <div className="space-y-2 text-sm text-gray-300">
                <p>1. Go to <span className="text-purple-400">Patient Details</span> page</p>
                <p>2. Select a patient from your list</p>
                <p>3. Click the <span className="text-purple-400">✨ AI Upload RX</span> button (purple sparkles)</p>
                <p>4. Upload prescription image - AI will automatically analyze it</p>
                <p>5. Patient receives notification with decoded prescription in their language</p>
              </div>
              <div className="mt-4 p-3 bg-black/30 rounded-lg border border-purple-500/20">
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
