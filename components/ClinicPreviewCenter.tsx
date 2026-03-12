import { Button } from './ui/button';
import { Menu } from 'lucide-react';
import { useState } from 'react';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import ClinicSidebar from './ClinicSidebar';
import ClinicBookingMiniWebsite from './ClinicBookingMiniWebsite';
import WalkInPreview from './WalkInPreview';

interface Review {
  id: number;
  patientName: string;
  rating: number;
  date: string;
  comment: string;
  verified: boolean;
}

interface ClinicPreviewCenterProps {
  onMenuChange?: (menu: string) => void;
  onLogout?: () => void;
  clinicData?: any;
  uploadedReviews?: Review[];
  activeAddOns?: string[];
  isSidebarCollapsed?: boolean;
  setIsSidebarCollapsed?: (collapsed: boolean) => void;
}

export default function ClinicPreviewCenter({
  onMenuChange,
  onLogout,
  clinicData,
  uploadedReviews = [],
  activeAddOns = [],
  isSidebarCollapsed = false,
  setIsSidebarCollapsed
}: ClinicPreviewCenterProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [templateType, setTemplateType] = useState('mini-website');
  const [language, setLanguage] = useState<'english' | 'hindi' | 'bengali'>('english');

  const supportsLanguage = templateType === 'mini-website';

  return (
    <div className="min-h-screen bg-black text-white flex flex-col lg:flex-row">
      {/* Sidebar */}
      <ClinicSidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        activeMenu="preview"
        onMenuChange={onMenuChange || (() => {})}
        onLogout={onLogout || (() => {})}
        activeAddOns={activeAddOns}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed?.(!isSidebarCollapsed)}
      />

      {/* Main Content */}
      <div className={`flex-1 transition-all duration-300 ${isSidebarCollapsed ? 'lg:ml-20' : 'lg:ml-64'} overflow-x-hidden`}>
        {/* Header */}
        <div className="border-b border-zinc-800 bg-black/95 backdrop-blur sticky top-0 z-40">
          <div className="flex items-center justify-between px-4 lg:px-8 py-4">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                className="lg:hidden text-blue-500"
                onClick={() => setSidebarOpen(true)}
              >
                <Menu className="w-6 h-6" />
              </Button>
              <div>
                <h1 className="text-xl font-bold">Preview Center</h1>
                <p className="text-zinc-400 text-sm mt-1">Mini Website & Walk-in Flow Preview</p>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="px-4 lg:px-8 py-8 max-w-7xl mx-auto">
          {/* Live Reviews Indicator */}
          {uploadedReviews.length > 0 && templateType === 'mini-website' && (
            <div className="flex items-center gap-2 bg-blue-500/10 px-4 py-3 rounded-xl border border-blue-500/30 mb-6">
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
              <span className="text-blue-400 font-medium">
                ✓ {uploadedReviews.length} review{uploadedReviews.length > 1 ? 's' : ''} are now LIVE on your mini website
              </span>
            </div>
          )}

          <div className="space-y-6">
            {/* Template Controls */}
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6">
              <h2 className="text-white font-bold mb-4">Template Preview Settings</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Template Type Dropdown */}
                <div className="space-y-2">
                  <Label htmlFor="template-type" className="text-zinc-400">Template Type</Label>
                  <Select value={templateType} onValueChange={setTemplateType}>
                    <SelectTrigger id="template-type" className="bg-black border-zinc-800 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-900 border-zinc-800">
                      <SelectItem value="mini-website">1. Mini Website (Main)</SelectItem>
                      <SelectItem value="walkin-verification">2. Walk-in Verification</SelectItem>
                      <SelectItem value="walkin-complete">3. Walk-in Confirmed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Language Dropdown */}
                <div className="space-y-2">
                  <Label htmlFor="language" className="text-zinc-400">Language</Label>
                  <Select
                    value={language}
                    onValueChange={(val) => setLanguage(val as any)}
                    disabled={!supportsLanguage}
                  >
                    <SelectTrigger
                      id="language"
                      className={`bg-black border-zinc-800 text-white ${!supportsLanguage ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-900 border-zinc-800">
                      <SelectItem value="english">English</SelectItem>
                      <SelectItem value="hindi">Hindi</SelectItem>
                      <SelectItem value="bengali">Bengali</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Live Preview Indicator */}
            <div className="bg-blue-500/5 border border-blue-500/20 rounded-2xl p-4 flex items-center gap-3">
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
              <p className="text-blue-400 text-sm font-medium">
                <strong>Live Preview Active</strong> - You're seeing the exact interface patients will encounter
              </p>
            </div>

            {/* Template Preview Frame */}
            <div className="bg-zinc-900/30 border border-zinc-800 rounded-3xl overflow-hidden min-h-[600px] flex items-center justify-center p-4 sm:p-8 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]">
              <div className="w-full max-w-[420px] bg-black rounded-[3rem] border-[8px] border-zinc-800 shadow-2xl relative overflow-hidden h-[850px] overflow-y-auto custom-scrollbar scrollbar-hide">
                {/* Phone Notch */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-6 bg-zinc-800 rounded-b-2xl z-50"></div>

                <div className="pt-8 min-h-full">
                  {templateType === 'mini-website' && (
                    <ClinicBookingMiniWebsite
                      language={language}
                      onBack={() => {}}
                    />
                  )}
                  {templateType === 'walkin-verification' && (
                    <WalkInPreview mode="verification" />
                  )}
                  {templateType === 'walkin-complete' && (
                    <WalkInPreview mode="complete" />
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
