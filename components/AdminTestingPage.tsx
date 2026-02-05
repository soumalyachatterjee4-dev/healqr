import { useState } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { ArrowLeft, Upload, FileText, CheckCircle, Send } from 'lucide-react';
import AdminTemplateUploader from './AdminTemplateUploader';
import { FCMTestNotification } from './FCMTestNotification';
import { FCMSystemStatus } from './FCMSystemStatus';

interface AdminTestingPageProps {
  onBack?: () => void;
}

export default function AdminTestingPage({ onBack }: AdminTestingPageProps) {
  const [showUploader, setShowUploader] = useState(false);

  if (showUploader) {
    return (
      <div className="min-h-screen bg-black">
        <div className="container mx-auto p-4">
          <Button
            onClick={() => setShowUploader(false)}
            variant="ghost"
            className="mb-4 text-white"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Testing
          </Button>
          <AdminTemplateUploader />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white p-6">
      <div className="container mx-auto max-w-4xl">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          {onBack && (
            <Button
              onClick={onBack}
              variant="ghost"
              className="text-white"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          )}
          <div>
            <h1 className="text-3xl mb-2">🧪 Admin Testing Page</h1>
            <p className="text-gray-400">Quick access to Template Uploader for testing</p>
          </div>
        </div>

        {/* Instructions Card */}
        <Card className="mb-6 bg-zinc-900 border-zinc-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <FileText className="w-5 h-5 text-emerald-400" />
              Template Uploader Testing Instructions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-4">
              <h3 className="text-emerald-400 mb-2 flex items-center gap-2">
                <CheckCircle className="w-4 h-4" />
                What You'll Test:
              </h3>
              <ol className="list-decimal list-inside space-y-2 text-gray-300 text-sm">
                <li>Upload Health Tip templates (Business Card size: 1050 × 600px)</li>
                <li>Select placements - choose from 17 notification templates</li>
                <li>Click "Select All" to apply template to ALL notifications</li>
                <li>Activate/Deactivate templates</li>
                <li>View templates in notification placeholders</li>
              </ol>
            </div>

            <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
              <h3 className="text-blue-400 mb-2">📋 Step-by-Step Test Flow:</h3>
              <ol className="list-decimal list-inside space-y-1 text-gray-300 text-sm">
                <li>Click "Open Template Uploader" below</li>
                <li>Click "Create New Template" (green button)</li>
                <li>Select "Health Tip" category (middle tab)</li>
                <li>Enter template name: "Business Card"</li>
                <li>Click "Select All" button → 17 placements selected</li>
                <li>Upload your business card image (1050 × 600px recommended)</li>
                <li>Click "Upload Template"</li>
                <li>Click "Activate" button on your template</li>
                <li>Go to "Reminder Notifications" in main dashboard</li>
                <li>Your business card should appear in placeholder boxes!</li>
              </ol>
            </div>

            <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-4">
              <h3 className="text-purple-400 mb-2">💡 Pro Tips:</h3>
              <ul className="list-disc list-inside space-y-1 text-gray-300 text-sm">
                <li>Business card size: 1050 × 600px (landscape)</li>
                <li>Max file size: 5MB</li>
                <li>Supported formats: JPG, PNG, WebP</li>
                <li>Templates are saved in localStorage</li>
                <li>Can upload multiple templates and switch between them</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* FCM System Status & Test */}
        <div className="mb-6">
          <FCMSystemStatus />
        </div>
        
        <div className="mb-6">
          <FCMTestNotification />
        </div>

        {/* Action Button */}
        <Card className="bg-gradient-to-br from-emerald-500/20 to-blue-500/20 border-emerald-500/30">
          <CardContent className="p-8 text-center">
            <Upload className="w-16 h-16 text-emerald-400 mx-auto mb-4" />
            <h2 className="text-2xl mb-3">Ready to Test?</h2>
            <p className="text-gray-300 mb-6">
              Click the button below to open the Template Uploader interface
            </p>
            <Button
              onClick={() => setShowUploader(true)}
              className="bg-emerald-500 hover:bg-emerald-600 text-white h-12 px-8 text-lg"
            >
              <Upload className="w-5 h-5 mr-2" />
              Open Template Uploader
            </Button>
          </CardContent>
        </Card>

        {/* Storage Info */}
        <Card className="mt-6 bg-zinc-900/50 border-zinc-800">
          <CardContent className="p-4">
            <p className="text-sm text-gray-400 text-center">
              💾 All templates are stored locally in your browser (localStorage: healqr_templates)
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
