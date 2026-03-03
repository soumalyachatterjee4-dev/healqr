import { useState, useEffect } from 'react';
import {
  LayoutGrid, Building2, BarChart2, Info, Save, Loader2, CheckCircle2,
  AlertCircle, ExternalLink
} from 'lucide-react';
import { db } from '../lib/firebase/config';
import { collection, getDocs, doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';

interface PageSlot {
  pageId: string;
  pageName: string;
  description: string;
  category: 'booking-flow' | 'notification' | 'dashboard';
  assignedTo: {
    type: 'pharma' | 'advertiser' | 'admin' | 'none';
    companyId: string;
    companyName: string;
  };
}

interface Company {
  id: string;
  name: string;
  type: 'pharma' | 'advertiser';
}

const DEFAULT_PAGES: Omit<PageSlot, 'assignedTo'>[] = [
  // Booking Flow (6 pages)
  { pageId: 'booking-confirmation', pageName: 'Booking Confirmation', description: 'Shown after patient books an appointment', category: 'booking-flow' },
  { pageId: 'waiting-room', pageName: 'Waiting Room', description: 'Digital waiting room screen', category: 'booking-flow' },
  { pageId: 'prescription-view', pageName: 'Prescription View', description: 'Shown alongside prescriptions', category: 'booking-flow' },
  { pageId: 'follow-up-reminder', pageName: 'Follow-up Reminder', description: 'Follow-up reminder page banner', category: 'booking-flow' },
  { pageId: 'patient-dashboard', pageName: 'Patient Dashboard', description: 'Patient dashboard banner slot', category: 'booking-flow' },
  { pageId: 'doctor-search', pageName: 'Doctor Search', description: 'Doctor search results sponsorship', category: 'booking-flow' },
  // Notifications (2 pages)
  { pageId: 'push-notification', pageName: 'Push Notification', description: 'FCM push notification banner', category: 'notification' },
  { pageId: 'in-app-notification', pageName: 'In-App Notification', description: 'In-app notification card ad', category: 'notification' },
  // Dashboard promos
  { pageId: 'doctor-dashboard-promo', pageName: 'Doctor Dashboard Promo', description: 'Pharma promo on doctor dashboard', category: 'dashboard' },
  { pageId: 'health-tips', pageName: 'Health Tips', description: 'Health tip content cards', category: 'dashboard' },
];

export default function AdminPageDistribution() {
  const [pages, setPages] = useState<PageSlot[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    if (!db) return;
    setLoading(true);

    try {
      // Load companies
      const allCompanies: Company[] = [];

      // Pharma companies
      const pharmaSnap = await getDocs(collection(db, 'pharmaCompanies'));
      pharmaSnap.docs.forEach(d => {
        allCompanies.push({
          id: d.id,
          name: d.data().companyName || d.id,
          type: 'pharma',
        });
      });

      // Advertisers
      const advSnap = await getDocs(collection(db, 'advertisers'));
      advSnap.docs.forEach(d => {
        allCompanies.push({
          id: d.id,
          name: d.data().companyName || d.id,
          type: 'advertiser',
        });
      });

      setCompanies(allCompanies);

      // Load existing page distribution
      const distRef = collection(db, 'pageDistribution');
      const distSnap = await getDocs(distRef);
      const distMap: Record<string, PageSlot['assignedTo']> = {};

      distSnap.docs.forEach(d => {
        const data = d.data();
        distMap[d.id] = {
          type: data.assignedType || 'none',
          companyId: data.companyId || '',
          companyName: data.companyName || '',
        };
      });

      // Build page slots
      const slots: PageSlot[] = DEFAULT_PAGES.map(p => ({
        ...p,
        assignedTo: distMap[p.pageId] || { type: 'none', companyId: '', companyName: '' },
      }));

      setPages(slots);
    } catch (error) {
      console.error('Error loading page distribution:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAssign = (pageId: string, companyId: string) => {
    if (companyId === '') {
      // Unassign
      setPages(prev => prev.map(p =>
        p.pageId === pageId ? { ...p, assignedTo: { type: 'none', companyId: '', companyName: '' } } : p
      ));
    } else if (companyId === 'admin') {
      setPages(prev => prev.map(p =>
        p.pageId === pageId ? { ...p, assignedTo: { type: 'admin', companyId: 'admin', companyName: 'HealQR Admin' } } : p
      ));
    } else {
      const company = companies.find(c => c.id === companyId);
      if (!company) return;
      setPages(prev => prev.map(p =>
        p.pageId === pageId ? { ...p, assignedTo: { type: company.type, companyId: company.id, companyName: company.name } } : p
      ));
    }
    setHasChanges(true);
    setSaved(false);
  };

  const handleSaveAll = async () => {
    if (!db) return;
    setSaving(true);

    try {
      for (const page of pages) {
        await setDoc(doc(db, 'pageDistribution', page.pageId), {
          pageName: page.pageName,
          description: page.description,
          category: page.category,
          assignedType: page.assignedTo.type,
          companyId: page.assignedTo.companyId,
          companyName: page.assignedTo.companyName,
          updatedAt: serverTimestamp(),
        });
      }

      setSaved(true);
      setHasChanges(false);
      setTimeout(() => setSaved(false), 3000);
    } catch (error) {
      console.error('Error saving page distribution:', error);
      alert('Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const getCategoryLabel = (cat: string) => {
    switch (cat) {
      case 'booking-flow': return 'Booking Flow';
      case 'notification': return 'Notifications';
      case 'dashboard': return 'Dashboard Content';
      default: return cat;
    }
  };

  const getCategoryColor = (cat: string) => {
    switch (cat) {
      case 'booking-flow': return 'text-emerald-400 border-emerald-500/30';
      case 'notification': return 'text-amber-400 border-amber-500/30';
      case 'dashboard': return 'text-blue-400 border-blue-500/30';
      default: return 'text-gray-400 border-zinc-700';
    }
  };

  const getAssignmentColor = (type: string) => {
    switch (type) {
      case 'pharma': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'advertiser': return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
      case 'admin': return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
      default: return 'bg-zinc-800 text-gray-500 border-zinc-700';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-emerald-500 border-t-transparent" />
      </div>
    );
  }

  const grouped = {
    'booking-flow': pages.filter(p => p.category === 'booking-flow'),
    'notification': pages.filter(p => p.category === 'notification'),
    'dashboard': pages.filter(p => p.category === 'dashboard'),
  };

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <LayoutGrid className="w-5 h-5 text-emerald-400" />
            Page Distribution
          </h2>
          <p className="text-sm text-gray-400 mt-1">
            Assign ad slots to pharma companies, advertisers, or admin content
          </p>
        </div>
        <button
          onClick={handleSaveAll}
          disabled={saving || !hasChanges}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors text-sm ${
            saved
              ? 'bg-emerald-600 text-white'
              : hasChanges
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                : 'bg-zinc-800 text-gray-500 cursor-not-allowed'
          }`}
        >
          {saving ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</>
          ) : saved ? (
            <><CheckCircle2 className="w-4 h-4" /> Saved!</>
          ) : (
            <><Save className="w-4 h-4" /> Save All</>
          )}
        </button>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 bg-zinc-900 rounded-xl border border-zinc-800 p-4">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-blue-500" />
          <span className="text-xs text-gray-400">Pharma ({companies.filter(c => c.type === 'pharma').length})</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-purple-500" />
          <span className="text-xs text-gray-400">Advertiser ({companies.filter(c => c.type === 'advertiser').length})</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-emerald-500" />
          <span className="text-xs text-gray-400">Admin</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-zinc-700" />
          <span className="text-xs text-gray-400">Unassigned</span>
        </div>
      </div>

      {/* Page Groups */}
      {Object.entries(grouped).map(([category, categoryPages]) => (
        <div key={category} className="space-y-3">
          <h3 className={`text-sm font-semibold uppercase tracking-wider ${getCategoryColor(category).split(' ')[0]}`}>
            {getCategoryLabel(category)} ({categoryPages.length} slots)
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {categoryPages.map(page => (
              <div
                key={page.pageId}
                className={`bg-zinc-900 rounded-xl border p-4 ${
                  page.assignedTo.type !== 'none'
                    ? getAssignmentColor(page.assignedTo.type).split(' ').find(c => c.startsWith('border-')) || 'border-zinc-800'
                    : 'border-zinc-800'
                }`}
              >
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <h4 className="font-medium text-sm">{page.pageName}</h4>
                    <p className="text-xs text-gray-500 mt-0.5">{page.description}</p>
                  </div>
                  {page.assignedTo.type !== 'none' && (
                    <span className={`text-xs px-2 py-1 rounded-full whitespace-nowrap ${getAssignmentColor(page.assignedTo.type)}`}>
                      {page.assignedTo.type === 'pharma' ? <Building2 className="w-3 h-3 inline mr-1" /> :
                       page.assignedTo.type === 'advertiser' ? <BarChart2 className="w-3 h-3 inline mr-1" /> : null}
                      {page.assignedTo.companyName}
                    </span>
                  )}
                </div>

                <select
                  value={page.assignedTo.companyId || ''}
                  onChange={(e) => handleAssign(page.pageId, e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="">— Unassigned —</option>
                  <option value="admin">HealQR Admin</option>
                  <optgroup label="Pharma Companies">
                    {companies.filter(c => c.type === 'pharma').map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </optgroup>
                  <optgroup label="Advertisers">
                    {companies.filter(c => c.type === 'advertiser').map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </optgroup>
                </select>
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Info */}
      <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4">
        <div className="flex items-start gap-2">
          <Info className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm text-emerald-400 font-medium">How Page Distribution Works</p>
            <ul className="text-xs text-gray-400 mt-1 space-y-1 list-disc list-inside">
              <li><strong>Booking Flow:</strong> 6 premium ad slots along the patient booking journey</li>
              <li><strong>Notifications:</strong> 2 slots for FCM push and in-app notification ads</li>
              <li><strong>Dashboard Content:</strong> Pharma promos and health tip cards on dashboards</li>
              <li>Pharma companies see their promo templates on assigned doctor dashboards</li>
              <li>Advertisers see pincode-level aggregated data only — no patient PII</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
