import { useEffect, useState } from 'react';

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

interface TemplateDisplayProps {
  placement: string;
  className?: string;
}

export default function TemplateDisplay({ placement, className = '' }: TemplateDisplayProps) {
  const [template, setTemplate] = useState<Template | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let isMounted = true; // Track if component is still mounted
    let timeoutId: NodeJS.Timeout;
    
    const loadTemplate = async () => {
      
      // Add a small delay to prevent rapid mount/unmount issues
      await new Promise(resolve => { timeoutId = setTimeout(resolve, 50); });
      
      if (!isMounted) {
        return;
      }
      
      try {
        const { db } = await import('../lib/firebase/config');
        const { doc, getDoc } = await import('firebase/firestore');
        
        if (!isMounted) {
          return;
        }
        
        const adminRef = doc(db, 'adminProfiles', 'super_admin');
        const adminSnap = await getDoc(adminRef);
        
        // Check if component is still mounted before updating state
        if (!isMounted) {
          return;
        }
        
        if (adminSnap.exists()) {
          const data = adminSnap.data();
          if (data.globalTemplates && Array.isArray(data.globalTemplates)) {
            const globalTemplates = data.globalTemplates;
            
            // First, try to find any published health-tip template (fallback)
            const anyPublishedHealthTip = globalTemplates.find(
              (t: any) => t.category === 'health-tip' && t.isPublished === true
            );
            
            
            const matchingTemplate = globalTemplates.find(
              (t: any) => {
                const isCategoryMatch = t.category === 'health-tip';
                const isPublished = t.isPublished === true;
                const hasPlacementsArray = Array.isArray(t.placements);
                const placementsString = hasPlacementsArray ? t.placements.join(', ') : 'none';
                const includesPlacement = hasPlacementsArray && t.placements.some((p: string) => 
                  p.trim().toLowerCase() === placement.trim().toLowerCase()
                );
                
                
                return isCategoryMatch && isPublished && includesPlacement;
              }
            );
            
            if (matchingTemplate) {
              setTemplate(matchingTemplate);
              return;
            } else if (anyPublishedHealthTip) {
              // Fallback: show any published health tip if placement doesn't match
              setTemplate(anyPublishedHealthTip);
              return;
            } else {
            }
        } else {
        }
      } else {
      }
      } catch (error: any) {
        // Ignore AbortError when component is unmounted
        if (!isMounted) {
          return;
        }
        
        // Only log non-abort errors
        if (error?.name !== 'AbortError' && error?.code !== 'ERR_CANCELED') {
          console.error('Error loading templates from Firestore:', error);
        } else {
        }
      }
    };

    // FIREBASE LOADING CODE COMMENTED OUT - SEE ABOVE
    loadTemplate().catch((error: any) => {
      if (error?.name === 'AbortError' || error?.code === 'ERR_CANCELED') {
      } else if (isMounted) {
        console.error('Unhandled error in loadTemplate:', error);
      }
    });

    // Listen for storage changes from other tabs
    window.addEventListener('storage', loadTemplate);
    
    // Listen for custom event from same window
    const handleCustomRefresh = () => {
      setRefreshKey(prev => prev + 1);
      loadTemplate().catch(() => {}); // Suppress errors on refresh too
    };
    window.addEventListener('template-refresh', handleCustomRefresh);
    
    return () => {
      isMounted = false; // Mark component as unmounted
      clearTimeout(timeoutId); // Clear any pending timeout
      window.removeEventListener('storage', loadTemplate);
      window.removeEventListener('template-refresh', handleCustomRefresh);
    };
  }, [placement, refreshKey]);

  // Don't show anything if no template
  if (!template) {
    return null;
  }

  // Show uploaded template
  return (
    <div className={`rounded-lg overflow-hidden ${className}`}>
      <img
        src={template.imageUrl}
        alt={template.name}
        className="w-full h-auto max-h-[200px] sm:max-h-[300px] md:max-h-[400px] object-cover sm:object-contain bg-gradient-to-br from-purple-900/20 to-blue-900/20"
        style={{ maxWidth: '100%' }}
      />
    </div>
  );
}

