import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Monitor, Copy, ExternalLink, Check, Tv, Tablet, Smartphone } from 'lucide-react';

interface LabQueueSetupProps {
  labId: string;
  labName?: string;
}

export default function LabQueueSetup({ labId, labName }: LabQueueSetupProps) {
  const [copied, setCopied] = useState(false);

  const queueUrl = `${window.location.origin}?page=lab-queue-display&labId=${labId}`;

  const copyUrl = () => {
    navigator.clipboard.writeText(queueUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const openDisplay = () => {
    window.open(queueUrl, '_blank', 'noopener');
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="text-xl lg:text-2xl font-bold flex items-center gap-2 text-white">
          <Monitor className="w-6 h-6 text-cyan-400" />
          Queue Display Screen
        </h1>
        <p className="text-sm text-gray-400 mt-1">Set up a live token display for your lab waiting area TV or tablet</p>
      </div>

      {/* URL Card */}
      <Card className="bg-zinc-900 border-zinc-800 border-cyan-500/20">
        <CardHeader className="pb-3">
          <CardTitle className="text-base text-white">Your Queue Display URL</CardTitle>
          <p className="text-xs text-gray-400">Open this link on any device to show the live queue for {labName || 'your lab'}</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="flex-1 bg-zinc-950 rounded-lg px-4 py-3 text-sm text-cyan-300 font-mono break-all border border-zinc-800">
              {queueUrl}
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button onClick={copyUrl} className="bg-cyan-600 hover:bg-cyan-700 text-white">
              {copied ? <><Check className="w-4 h-4 mr-2" /> Copied!</> : <><Copy className="w-4 h-4 mr-2" /> Copy URL</>}
            </Button>
            <Button onClick={openDisplay} variant="outline" className="border-zinc-700 text-gray-300 hover:bg-zinc-800">
              <ExternalLink className="w-4 h-4 mr-2" /> Open in New Tab
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* How to Use */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader className="pb-3">
          <CardTitle className="text-base text-white">How to Set Up</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-zinc-950 rounded-xl p-4 border border-zinc-800 text-center">
              <div className="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center mx-auto mb-3">
                <Tv className="w-6 h-6 text-blue-400" />
              </div>
              <h3 className="text-sm font-semibold text-white mb-1">Smart TV</h3>
              <p className="text-xs text-gray-400">Open the URL in your Smart TV browser. Set it to full screen for best results.</p>
            </div>
            <div className="bg-zinc-950 rounded-xl p-4 border border-zinc-800 text-center">
              <div className="w-12 h-12 rounded-full bg-purple-500/20 flex items-center justify-center mx-auto mb-3">
                <Tablet className="w-6 h-6 text-purple-400" />
              </div>
              <h3 className="text-sm font-semibold text-white mb-1">Tablet</h3>
              <p className="text-xs text-gray-400">Open on an iPad or Android tablet. Mount at the reception or sample-collection area.</p>
            </div>
            <div className="bg-zinc-950 rounded-xl p-4 border border-zinc-800 text-center">
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
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader className="pb-3">
          <CardTitle className="text-base text-white">What Patients See</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-3 text-sm text-gray-300">
            <li className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-cyan-500/20 flex items-center justify-center shrink-0 mt-0.5">
                <Check className="w-3 h-3 text-cyan-400" />
              </div>
              <span><strong className="text-white">Token Numbers</strong> — Large display of each patient's serial number with name</span>
            </li>
            <li className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-cyan-500/20 flex items-center justify-center shrink-0 mt-0.5">
                <Check className="w-3 h-3 text-cyan-400" />
              </div>
              <span><strong className="text-white">Status</strong> — Waiting · Sample Collected · Report Ready (color-coded)</span>
            </li>
            <li className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-cyan-500/20 flex items-center justify-center shrink-0 mt-0.5">
                <Check className="w-3 h-3 text-cyan-400" />
              </div>
              <span><strong className="text-white">Live Counts</strong> — Real-time totals for each status</span>
            </li>
            <li className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-cyan-500/20 flex items-center justify-center shrink-0 mt-0.5">
                <Check className="w-3 h-3 text-cyan-400" />
              </div>
              <span><strong className="text-white">Home vs Walk-in</strong> — Visual badge shows home-collection visits separately</span>
            </li>
            <li className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-cyan-500/20 flex items-center justify-center shrink-0 mt-0.5">
                <Check className="w-3 h-3 text-cyan-400" />
              </div>
              <span><strong className="text-white">Live Updates</strong> — Auto-refreshes when staff mark sample collected or report sent</span>
            </li>
          </ul>
        </CardContent>
      </Card>

      <div className="text-center text-xs text-gray-500 pb-4">
        <p>No login required for the display screen. Share the link with your reception staff.</p>
      </div>
    </div>
  );
}
