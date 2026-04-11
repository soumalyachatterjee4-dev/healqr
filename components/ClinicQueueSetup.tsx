import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Monitor, Copy, ExternalLink, Check, Tv, Tablet, Smartphone, QrCode, Menu } from 'lucide-react';
import ClinicSidebar from './ClinicSidebar';

interface ClinicQueueSetupProps {
  clinicId: string;
  clinicName: string;
  onMenuChange?: (menu: string) => void;
  onLogout?: () => void | Promise<void>;
  activeAddOns?: string[];
}

export default function ClinicQueueSetup({
  clinicId,
  clinicName,
  onMenuChange = () => {},
  onLogout,
  activeAddOns = [],
}: ClinicQueueSetupProps) {
  const [copied, setCopied] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  const queueUrl = `${window.location.origin}?page=queue-display&clinicId=${clinicId}`;

  const copyUrl = () => {
    navigator.clipboard.writeText(queueUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const openDisplay = () => {
    window.open(queueUrl, '_blank', 'noopener');
  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col lg:flex-row">
      <ClinicSidebar activeMenu="queue-display" onMenuChange={onMenuChange} onLogout={onLogout || (() => {})} isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} activeAddOns={activeAddOns} isCollapsed={isSidebarCollapsed} onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)} />
      <div className={`flex-1 transition-all duration-300 ${isSidebarCollapsed ? 'lg:ml-20' : 'lg:ml-64'} flex flex-col min-h-screen relative`}>
        {/* Mobile Header */}
        <header className="bg-black/80 backdrop-blur-md border-b border-white/5 px-4 md:px-8 py-4 flex items-center gap-4 sticky top-0 z-50 lg:hidden">
          <Button variant="ghost" size="icon" className="text-blue-500 hover:bg-zinc-900" onClick={() => setSidebarOpen(true)}>
            <Menu className="w-6 h-6" />
          </Button>
          <span className="text-sm font-medium text-white">Queue Display</span>
        </header>

        <div className="p-4 md:p-8 space-y-6 max-w-4xl mx-auto w-full">
          {/* Header */}
          <div>
            <h1 className="text-xl lg:text-2xl font-bold flex items-center gap-2 text-white">
              <Monitor className="w-6 h-6 text-emerald-400" />
              Queue Display Screen
            </h1>
            <p className="text-sm text-gray-400 mt-1">Set up a live token display for your waiting area TV or tablet</p>
          </div>

          {/* URL Card */}
          <Card className="bg-gray-900/50 border-gray-800 border-emerald-500/20">
            <CardHeader className="pb-3">
              <CardTitle className="text-base text-white">Your Queue Display URL</CardTitle>
              <p className="text-xs text-gray-400">Open this link on any device to show the live queue</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-gray-800 rounded-lg px-4 py-3 text-sm text-emerald-300 font-mono break-all border border-gray-700">
                  {queueUrl}
                </div>
              </div>
              <div className="flex flex-wrap gap-3">
                <Button onClick={copyUrl} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                  {copied ? <><Check className="w-4 h-4 mr-2" /> Copied!</> : <><Copy className="w-4 h-4 mr-2" /> Copy URL</>}
                </Button>
                <Button onClick={openDisplay} variant="outline" className="border-gray-700 text-gray-300 hover:bg-gray-800">
                  <ExternalLink className="w-4 h-4 mr-2" /> Open in New Tab
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* How to Use */}
          <Card className="bg-gray-900/50 border-gray-800">
            <CardHeader className="pb-3">
              <CardTitle className="text-base text-white">How to Set Up</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700/50 text-center">
                  <div className="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center mx-auto mb-3">
                    <Tv className="w-6 h-6 text-blue-400" />
                  </div>
                  <h3 className="text-sm font-semibold text-white mb-1">Smart TV</h3>
                  <p className="text-xs text-gray-400">Open the URL in your Smart TV browser. Set it to full screen for best results.</p>
                </div>
                <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700/50 text-center">
                  <div className="w-12 h-12 rounded-full bg-purple-500/20 flex items-center justify-center mx-auto mb-3">
                    <Tablet className="w-6 h-6 text-purple-400" />
                  </div>
                  <h3 className="text-sm font-semibold text-white mb-1">Tablet</h3>
                  <p className="text-xs text-gray-400">Open on an iPad or Android tablet. Mount at the reception desk or waiting area.</p>
                </div>
                <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700/50 text-center">
                  <div className="w-12 h-12 rounded-full bg-amber-500/20 flex items-center justify-center mx-auto mb-3">
                    <Smartphone className="w-6 h-6 text-amber-400" />
                  </div>
                  <h3 className="text-sm font-semibold text-white mb-1">Any Device</h3>
                  <p className="text-xs text-gray-400">Works on any device with a browser. No login needed — it's a public link.</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Features */}
          <Card className="bg-gray-900/50 border-gray-800">
            <CardHeader className="pb-3">
              <CardTitle className="text-base text-white">What Patients See</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3 text-sm text-gray-300">
                <li className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0 mt-0.5">
                    <Check className="w-3 h-3 text-emerald-400" />
                  </div>
                  <span><strong className="text-white">Current Token</strong> — Large, prominent display of the token being served for each doctor</span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0 mt-0.5">
                    <Check className="w-3 h-3 text-emerald-400" />
                  </div>
                  <span><strong className="text-white">Next in Line</strong> — Shows the next 3 tokens with estimated wait time</span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0 mt-0.5">
                    <Check className="w-3 h-3 text-emerald-400" />
                  </div>
                  <span><strong className="text-white">Token Grid</strong> — Color-coded grid showing completed, current, waiting & cancelled tokens</span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0 mt-0.5">
                    <Check className="w-3 h-3 text-emerald-400" />
                  </div>
                  <span><strong className="text-white">Sound Alert</strong> — Chime sound when a new token is called (can be muted)</span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0 mt-0.5">
                    <Check className="w-3 h-3 text-emerald-400" />
                  </div>
                  <span><strong className="text-white">Multi-Doctor</strong> — Shows all active doctor queues side by side</span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0 mt-0.5">
                    <Check className="w-3 h-3 text-emerald-400" />
                  </div>
                  <span><strong className="text-white">Live Updates</strong> — Auto-refreshes in real-time as the doctor marks patients as seen</span>
                </li>
              </ul>
            </CardContent>
          </Card>

          <div className="text-center text-xs text-gray-500 pb-4">
            <p>No login required for the display screen. Share the link with your reception staff.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
