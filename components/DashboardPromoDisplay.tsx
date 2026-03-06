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

interface PharmaPromoTemplate {
  id: string;
  companyId: string;
  title: string;
  imageUrl: string;
  targetDoctorIds: string[];
  targetClinicIds: string[];
}

interface DashboardPromoDisplayProps {
  doctorBirthday?: string; // Format: 'MM-DD'
  hideBirthday?: boolean; // Hide promo when it's doctor's birthday
  className?: string;
  category?: 'dashboard-promo' | 'health-tip' | 'birthday-card';
  placement?: string;
  doctorId?: string; // For pharma targeted promos
}

export default function DashboardPromoDisplay({ doctorBirthday, hideBirthday = false, className = '', category = 'dashboard-promo', placement, doctorId }: DashboardPromoDisplayProps) {
  const [template, setTemplate] = useState<Template | null>(null);
  const [pharmaTemplates, setPharmaTemplates] = useState<PharmaPromoTemplate[]>([]);
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

    // Load pharma-targeted promos for this doctor
    const loadPharmaPromos = async () => {
      const resolvedId = doctorId || localStorage.getItem('userId');
      if (!resolvedId || category !== 'dashboard-promo') return;
      try {
        const { db } = await import('../lib/firebase/config');
        const { collection, getDocs, query, where } = await import('firebase/firestore');
        if (!db) return;

        const companiesSnap = await getDocs(collection(db, 'pharmaCompanies'));
        const pharmaItems: PharmaPromoTemplate[] = [];

        for (const compDoc of companiesSnap.docs) {
          const tSnap = await getDocs(
            query(
              collection(db, 'pharmaCompanies', compDoc.id, 'promoTemplates'),
              where('status', '==', 'approved')
            )
          );
          tSnap.forEach(tDoc => {
            const data = tDoc.data();
            const targetDoctorIds: string[] = data.targetDoctorIds || [];
            const targetClinicIds: string[] = data.targetClinicIds || [];
            if (targetDoctorIds.includes(resolvedId) || targetClinicIds.includes(resolvedId)) {
              pharmaItems.push({
                id: tDoc.id,
                companyId: compDoc.id,
                title: data.title || '',
                imageUrl: data.imageUrl || '',
                targetDoctorIds,
                targetClinicIds,
              });
            }
          });
        }
        setPharmaTemplates(pharmaItems);
      } catch (err) {
        console.error('Error loading pharma promos:', err);
      }
    };
    loadPharmaPromos();

    return () => {
      window.removeEventListener('template-refresh', handleRefresh);
    };
  }, [refreshKey, hideBirthday, category, placement, doctorId]);

  if (hideBirthday || isDismissed) {
    return null;
  }

  if (!template && pharmaTemplates.length === 0) {
    return null;
  }

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Admin global template */}
      {template && (
        <div className="relative rounded-lg overflow-hidden shadow-lg">
          <button
            onClick={() => setIsDismissed(true)}
            className="absolute top-2 right-2 w-8 h-8 bg-black/50 hover:bg-black/70 rounded-full flex items-center justify-center transition-colors z-10"
            aria-label="Dismiss"
          >
            <X className="w-4 h-4 text-white" />
          </button>
          <img
            src={template.imageUrl}
            alt={template.name}
            className="w-full h-auto object-cover"
          />
        </div>
      )}

      {/* Pharma company targeted promos */}
      {pharmaTemplates.map(pt => (
        <div key={pt.id} className="relative rounded-lg overflow-hidden shadow-lg">
          <img
            src={pt.imageUrl}
            alt={pt.title}
            className="w-full h-auto object-cover"
          />
        </div>
      ))}
    </div>
  );
}
