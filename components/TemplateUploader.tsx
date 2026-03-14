import { useState } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Menu, ArrowLeft, Upload, X, Eye, Trash2 } from 'lucide-react';
import DashboardSidebar from './DashboardSidebar';

interface TemplateUploaderProps {
  onMenuChange?: (menu: string) => void;
  onLogout?: () => void;
  uploadedTemplates: string[];
  onTemplatesUpdate: (templates: string[]) => void;
  activeAddOns?: string[];
}

export default function TemplateUploader({ onMenuChange, onLogout, uploadedTemplates, onTemplatesUpdate, activeAddOns = [] }: TemplateUploaderProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) {
      // Limit to max 2 total templates
      const availableSlots = 2 - uploadedTemplates.length;
      if (availableSlots <= 0) {
        alert('Maximum 2 review cards allowed. Please remove existing cards first.');
        event.target.value = '';
        return;
      }

      const filesToProcess = Array.from(files).slice(0, availableSlots);
      const newTemplates: string[] = [];
      let processed = 0;
      
      filesToProcess.forEach((file) => {
        // Check file size (5MB max)
        if (file.size > 5 * 1024 * 1024) {
          alert(`File ${file.name} is too large. Maximum size is 5MB.`);
          processed++;
          if (processed === filesToProcess.length && newTemplates.length > 0) {
            onTemplatesUpdate([...uploadedTemplates, ...newTemplates]);
          }
          return;
        }

        // Check file type
        if (!file.type.startsWith('image/')) {
          alert(`File ${file.name} is not an image.`);
          processed++;
          if (processed === filesToProcess.length && newTemplates.length > 0) {
            onTemplatesUpdate([...uploadedTemplates, ...newTemplates]);
          }
          return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
          if (e.target?.result) {
            newTemplates.push(e.target.result as string);
            processed++;
            if (processed === filesToProcess.length) {
              onTemplatesUpdate([...uploadedTemplates, ...newTemplates]);
            }
          }
        };
        reader.onerror = () => {
          alert(`Error reading file ${file.name}`);
          processed++;
          if (processed === filesToProcess.length && newTemplates.length > 0) {
            onTemplatesUpdate([...uploadedTemplates, ...newTemplates]);
          }
        };
        reader.readAsDataURL(file);
      });

      // Reset input
      event.target.value = '';
    }
  };

  const handleRemoveTemplate = (index: number) => {
    const newTemplates = uploadedTemplates.filter((_, i) => i !== index);
    onTemplatesUpdate(newTemplates);
  };

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Sidebar */}
      <DashboardSidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        activeMenu="template"
        onMenuChange={onMenuChange}
        onLogout={onLogout}
        activeAddOns={activeAddOns}
      />

      {/* Main Content */}
      <div className="flex flex-col min-h-screen">
        {/* Header */}
        <header className="bg-gray-800 border-b border-gray-700 px-4 py-3 flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden text-white"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="text-white hover:bg-gray-700"
              onClick={() => onMenuChange?.('dashboard')}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-2">
              <Upload className="h-5 w-5 text-green-400" />
              <h1 className="text-white">Template Uploader</h1>
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 p-4 lg:ml-64">
          {/* Instructions */}
          <Card className="mb-6 bg-gray-800/50 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white">How to Use Template Uploader</CardTitle>
            </CardHeader>
            <CardContent className="text-gray-300 space-y-2">
              <p>1. View your patient reviews from the Dashboard (Patient Reviews card)</p>
              <p>2. Download review cards as images using the Download button</p>
              <p>3. Upload the downloaded review images here (Maximum 2 cards)</p>
              <p>4. Uploaded reviews will be displayed on your mini website</p>
              <p className="text-green-400 mt-4">✓ All uploaded templates are automatically synced to your mini website</p>
              <p className="text-yellow-400 mt-2">⚠ Maximum 2 review cards can be displayed on your mini website</p>
            </CardContent>
          </Card>

          {/* Upload Section */}
          <Card className="mb-6 bg-gray-800/50 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center justify-between">
                <span>Upload Review Templates</span>
                <span className="text-sm text-green-400">{uploadedTemplates.length}/2 Cards Uploaded</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="border-2 border-dashed border-gray-600 rounded-lg p-8 text-center hover:border-green-500 transition-colors">
                <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-white mb-2">Upload Review Cards</h3>
                <p className="text-gray-400 text-sm mb-4">
                  Drag and drop files here or click to browse
                </p>
                <label htmlFor="file-upload">
                  <input
                    id="file-upload"
                    type="file"
                    accept="image/png,image/jpeg,image/jpg"
                    multiple
                    onChange={handleFileUpload}
                    disabled={uploadedTemplates.length >= 2}
                    className="hidden"
                  />
                  <Button 
                    className="bg-green-600 hover:bg-green-700 text-white cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={uploadedTemplates.length >= 2}
                    type="button"
                    onClick={() => document.getElementById('file-upload')?.click()}
                  >
                    Choose Files
                  </Button>
                </label>
                <p className="text-gray-500 text-xs mt-3">
                  Supported formats: PNG, JPG, JPEG (Max 5MB per file)
                </p>
                <p className="text-yellow-400 text-xs mt-2">
                  Maximum 2 review cards allowed
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Uploaded Templates */}
          {uploadedTemplates.length > 0 && (
            <Card className="bg-gray-800/50 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center justify-between">
                  <span>Uploaded Templates ({uploadedTemplates.length})</span>
                  {uploadedTemplates.length > 0 && (
                    <span className="text-sm text-gray-400">Click to preview</span>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-4xl mx-auto">
                  {uploadedTemplates.map((template, index) => (
                    <div
                      key={index}
                      className="relative group bg-gray-700 rounded-lg overflow-hidden border border-gray-600 hover:border-green-500 transition-colors"
                    >
                      <img
                        src={template}
                        alt={`Template ${index + 1}`}
                        className="w-full h-auto object-contain cursor-pointer"
                        style={{ maxHeight: '500px' }}
                        onClick={() => setPreviewImage(template)}
                      />
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="bg-gray-800 text-white hover:bg-gray-700"
                          onClick={() => setPreviewImage(template)}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="bg-red-600 text-white hover:bg-red-700"
                          onClick={() => handleRemoveTemplate(index)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                      <div className="p-3 bg-gray-800">
                        <p className="text-white text-sm text-center">Review Card {index + 1}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </main>
      </div>

      {/* Preview Modal */}
      {previewImage && (
        <>
          <div 
            className="fixed inset-0 bg-black/80 z-50"
            onClick={() => setPreviewImage(null)}
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="relative bg-gray-800 rounded-lg max-w-2xl max-h-[90vh] overflow-auto">
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-2 right-2 text-white bg-gray-900/80 hover:bg-gray-900"
                onClick={() => setPreviewImage(null)}
              >
                <X className="w-5 h-5" />
              </Button>
              <img
                src={previewImage}
                alt="Preview"
                className="w-full h-auto"
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
}

