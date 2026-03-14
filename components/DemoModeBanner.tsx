import { X, Presentation } from 'lucide-react';
import { Button } from './ui/button';

interface DemoModeBannerProps {
  onExitDemo: () => void;
  hasSidebar?: boolean;
}

export default function DemoModeBanner({ onExitDemo, hasSidebar = false }: DemoModeBannerProps) {
  return (
    <div 
      className={`fixed top-0 right-0 z-50 bg-gradient-to-r from-orange-600 to-orange-500 text-white shadow-lg ${
        hasSidebar ? 'left-0 lg:left-64' : 'left-0'
      }`}
    >
      <div className="px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Presentation className="w-5 h-5" />
          <div>
            <p className="font-semibold">🎯 DEMO MODE ACTIVE</p>
            <p className="text-xs text-orange-100">
              All validations bypassed • Mock data loaded • No real data affected
            </p>
          </div>
        </div>
        
        <Button
          onClick={onExitDemo}
          variant="outline"
          className="bg-white text-orange-600 hover:bg-orange-50 border-orange-200"
        >
          <X className="w-4 h-4 mr-2" />
          Exit Demo
        </Button>
      </div>
    </div>
  );
}

