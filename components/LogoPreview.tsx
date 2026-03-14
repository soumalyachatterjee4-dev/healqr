import React from 'react';
import logoImage from '../assets/logo-preview.svg';

/**
 * Logo Preview Component
 * 
 * This component shows your HealQR logo that will be used for the PWA icon.
 * The actual PWA icon needs to be saved in /public folder as:
 * - /public/icon-192.png (192x192 pixels)
 * - /public/icon-512.png (512x512 pixels)
 * 
 * See PWA_ICON_SETUP.md for instructions.
 */
export function LogoPreview() {
  return (
    <div className="p-8 bg-gray-50 rounded-lg">
      <h2 className="mb-4">HealQR PWA Logo Preview</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Original Logo */}
        <div className="text-center">
          <p className="mb-2 text-sm text-gray-600">Original Logo</p>
          <div className="bg-white p-4 rounded-lg shadow-sm inline-block">
            <img 
              src={logoImage} 
              alt="HealQR Logo" 
              className="w-64 h-64 object-contain"
            />
          </div>
        </div>

        {/* PWA Icon Preview (192x192) */}
        <div className="text-center">
          <p className="mb-2 text-sm text-gray-600">PWA Icon (192x192)</p>
          <div className="bg-white p-4 rounded-lg shadow-sm inline-block">
            <img 
              src={logoImage} 
              alt="HealQR PWA Icon" 
              className="w-48 h-48 object-contain rounded-2xl"
            />
          </div>
          <p className="mt-2 text-xs text-gray-500">
            This is how it will look on home screen
          </p>
        </div>
      </div>

      {/* Instructions */}
      <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h3 className="text-sm font-semibold mb-2">📋 Next Steps:</h3>
        <ol className="text-sm space-y-1 ml-4 list-decimal">
          <li>Read <code className="px-1 bg-white rounded">PWA_ICON_SETUP.md</code></li>
          <li>Resize this logo to 192x192 and 512x512 pixels</li>
          <li>Save as <code className="px-1 bg-white rounded">icon-192.png</code> and <code className="px-1 bg-white rounded">icon-512.png</code></li>
          <li>Add files to <code className="px-1 bg-white rounded">/public</code> folder</li>
          <li>Deploy! Your PWA will have this beautiful logo 🎉</li>
        </ol>
      </div>

      {/* Preview Grid */}
      <div className="mt-8">
        <h3 className="text-sm font-semibold mb-4">Preview on Different Devices:</h3>
        <div className="grid grid-cols-3 gap-4">
          {/* Mobile */}
          <div className="text-center">
            <p className="text-xs text-gray-600 mb-2">📱 Mobile</p>
            <div className="bg-gray-900 p-3 rounded-2xl inline-block">
              <img 
                src={logoImage} 
                alt="Mobile Preview" 
                className="w-16 h-16 object-contain rounded-xl"
              />
            </div>
          </div>

          {/* Tablet */}
          <div className="text-center">
            <p className="text-xs text-gray-600 mb-2">📱 Tablet</p>
            <div className="bg-gray-900 p-4 rounded-2xl inline-block">
              <img 
                src={logoImage} 
                alt="Tablet Preview" 
                className="w-20 h-20 object-contain rounded-xl"
              />
            </div>
          </div>

          {/* Desktop */}
          <div className="text-center">
            <p className="text-xs text-gray-600 mb-2">💻 Desktop</p>
            <div className="bg-gray-900 p-4 rounded-2xl inline-block">
              <img 
                src={logoImage} 
                alt="Desktop Preview" 
                className="w-24 h-24 object-contain rounded-xl"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

