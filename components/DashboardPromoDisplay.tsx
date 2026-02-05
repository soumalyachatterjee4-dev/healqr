import { useEffect, useState } from 'react';
import { X } from 'lucide-react';

interface Template {
  id: number;
  name: string;
  description: string;
  category: 'dashboard-promo' | 'health-tip' | 'birthday-card';
  imageUrl: string;
  placements?: string[];
  isPublished: boolean;
  uploadDate: string;
}

interface DashboardPromoDisplayProps {
  doctorBirthday?: string; // Format: 'MM-DD'
  hideBirthday?: boolean; // Hide promo when it's doctor's birthday
  className?: string;
  category?: 'dashboard-promo' | 'health-tip' | 'birthday-card';
  placement?: string;
}

export default function DashboardPromoDisplay({ doctorBirthday, hideBirthday = false, className = '', category = 'dashboard-promo', placement }: DashboardPromoDisplayProps) {
  const [template, setTemplate] = useState<Template | null>(null);
  const [isDismissed, setIsDismissed] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    // Don't load templates on doctor's birthday
    if (hideBirthday) {
      console.log('🎂 DashboardPromoDisplay: Hidden because it\'s doctor\'s birthday');
      return;
    }

    // Listen for template-refresh events from AdminTemplateUploader
    const handleRefresh = () => {
      console.log('🔄 DashboardPromoDisplay: Received refresh event');
      setRefreshKey(prev => prev + 1);
    };
    
    window.addEventListener('template-refresh', handleRefresh);

    const loadTemplates = async () => {
      let templates: Template[] = [];

      // Load from Firestore global templates
      console.log('🔄 DashboardPromoDisplay: Loading global templates from Firestore...');
      
      try {
        const { db } = await import('../lib/firebase/config');
        const { doc, getDoc } = await import('firebase/firestore');
        
        const adminRef = doc(db, 'adminProfiles', 'super_admin');
        const adminSnap = await getDoc(adminRef);
        
        if (adminSnap.exists()) {
          const data = adminSnap.data();
          if (data.globalTemplates && Array.isArray(data.globalTemplates)) {
            templates = data.globalTemplates;
            console.log('✅ DashboardPromoDisplay loaded', templates.length, 'global templates');
          } else {
            console.log('⚠️ No globalTemplates found');
          }
        } else {
          console.log('⚠️ Admin document does not exist');
        }
      } catch (err) {
        console.error('❌ Error loading global templates:', err);
      }

      // Find matching template based on category prop and optional placement
      const matchingTemplate = templates.find(
        t => {
          const categoryMatch = t.category === category;
          const placementMatch = placement ? t.placements?.includes(placement) : true;
          return categoryMatch && placementMatch && t.isPublished;
        }
      );
      
      if (matchingTemplate) {
        console.log(`✅ DashboardPromoDisplay: Showing ${category} template (placement: ${placement || 'any'}):`, matchingTemplate.name);
        setTemplate(matchingTemplate);
      } else {
        console.log(`⚠️ DashboardPromoDisplay: No matching ${category} template found for placement: ${placement || 'any'}`);
        setTemplate(null);
      }
    };

    loadTemplates();
    
    return () => {
      window.removeEventListener('template-refresh', handleRefresh);
    };
  }, [refreshKey, hideBirthday, category, placement]);

  if (hideBirthday || !template || isDismissed) {
    return null;
  }

  return (
    <div className={`relative rounded-lg overflow-hidden shadow-lg ${className}`}>
      {/* Close Button */}
      <button
        onClick={() => setIsDismissed(true)}
        className="absolute top-2 right-2 w-8 h-8 bg-black/50 hover:bg-black/70 rounded-full flex items-center justify-center transition-colors z-10"
        aria-label="Dismiss"
      >
        <X className="w-4 h-4 text-white" />
      </button>

      {/* Template Image */}
      <img
        src={template.imageUrl}
        alt={template.name}
        className="w-full h-auto object-cover"
      />
    </div>
  );
}
