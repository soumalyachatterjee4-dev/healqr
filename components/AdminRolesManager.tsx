import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader } from './ui/card';
import { Badge } from './ui/badge';
import { Shield, Check, Users, AlertCircle, Crown, Loader2, CheckSquare, Square } from 'lucide-react';

interface PartnerAdmin {
  email: string;
  name: string;
  isAuthorized: boolean;
  allowedPages: string[];
  addedBy?: string;
  addedAt?: any;
}

interface PageItem {
  id: string;
  label: string;
}

interface PageSection {
  key: string;
  label: string;
  color: string;
  items: PageItem[];
}

const PAGE_SECTIONS: PageSection[] = [
  {
    key: 'doctors', label: 'Doctors', color: 'text-blue-400',
    items: [
      { id: 'doctors', label: 'Doctor Management' },
      { id: 'health-tips', label: 'Health Tips' },
      { id: 'send-notifications', label: 'Send Notifications' },
    ],
  },
  {
    key: 'clinics', label: 'Clinics', color: 'text-cyan-400',
    items: [{ id: 'clinics', label: 'Clinic Management' }],
  },
  {
    key: 'patients', label: 'Patients', color: 'text-pink-400',
    items: [
      { id: 'patients', label: 'Patient Management' },
      { id: 'support-chat', label: 'Support Chat' },
    ],
  },
  {
    key: 'pharma', label: 'Pharma (Distributor)', color: 'text-orange-400',
    items: [
      { id: 'pharma-management', label: 'Pharma Companies' },
      { id: 'pharma-templates', label: 'Template Approvals' },
      { id: 'distribution-requests', label: 'Distributor Requests' },
      { id: 'pharma-extractions', label: 'Pharma Extractions' },
      { id: 'page-distribution', label: 'Page Distribution' },
    ],
  },
  {
    key: 'advertisers', label: 'Advertisers', color: 'text-amber-400',
    items: [
      { id: 'advertiser-management', label: 'Advertiser Management' },
      { id: 'discount-cards', label: 'Discount Cards' },
    ],
  },
  {
    key: 'admin', label: 'Admin Self', color: 'text-emerald-400',
    items: [
      { id: 'profile', label: 'Profile (Me + Partner)' },
      { id: 'daily-work-report', label: 'Daily Work Report' },
      { id: 'personal-management', label: 'Personal Management' },
      { id: 'roles-manager', label: 'Roles & Permissions' },
    ],
  },
  {
    key: 'qr', label: 'QR Generation', color: 'text-violet-400',
    items: [
      { id: 'qr-generator', label: 'QR Generator' },
      { id: 'qr-generation', label: 'QR Batch Generation' },
      { id: 'qr-management', label: 'QR Management' },
    ],
  },
  {
    key: 'content', label: 'Content & Tools', color: 'text-teal-400',
    items: [
      { id: 'templates', label: 'Template Uploader' },
      { id: 'videos', label: 'Video Uploader' },
      { id: 'promo-manager', label: 'Promo Manager' },
      { id: 'data-cleanup', label: 'Data Standardization' },
    ],
  },
  {
    key: 'ai', label: 'AI & Analytics', color: 'text-purple-400',
    items: [
      { id: 'ai-pm-dashboard', label: 'AI Project Manager' },
      { id: 'platform-analytics', label: 'Platform Analytics' },
      { id: 'rx-trends', label: 'Rx Trends' },
      { id: 'admin-pathology-trends', label: 'Pathology Trends' },
    ],
  },
];

const ALL_PAGE_IDS = PAGE_SECTIONS.flatMap(s => s.items.map(i => i.id));

export default function AdminRolesManager() {
  const [superAdmin, setSuperAdmin] = useState<{ name: string; email: string } | null>(null);
  const [partnerAdmins, setPartnerAdmins] = useState<PartnerAdmin[]>([]);
  const [editedPermissions, setEditedPermissions] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const { db } = await import('../lib/firebase/config');
      const { doc, getDoc, collection, getDocs } = await import('firebase/firestore');

      // Load super admin profile
      const superDoc = await getDoc(doc(db, 'adminProfiles', 'super_admin'));
      if (superDoc.exists()) {
        const data = superDoc.data();
        setSuperAdmin({ name: data.name || 'Super Admin', email: data.email || '' });
      }

      // Load partner admins
      const adminsSnap = await getDocs(collection(db, 'admins'));
      const partners: PartnerAdmin[] = [];
      const perms: Record<string, string[]> = {};
      adminsSnap.docs.forEach(d => {
        const data = d.data();
        if (data.isAuthorized) {
          const allowed = data.allowedPages || [];
          partners.push({
            email: d.id,
            name: data.name || d.id,
            isAuthorized: true,
            allowedPages: allowed,
            addedBy: data.addedBy,
            addedAt: data.addedAt,
          });
          perms[d.id] = [...allowed];
        }
      });
      setPartnerAdmins(partners);
      setEditedPermissions(perms);
    } catch (err) {
      console.error('Error loading admins:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleTogglePage = (email: string, pageId: string) => {
    setEditedPermissions(prev => {
      const current = prev[email] || [];
      const updated = current.includes(pageId)
        ? current.filter(p => p !== pageId)
        : [...current, pageId];
      return { ...prev, [email]: updated };
    });
    setHasUnsavedChanges(true);
  };

  const handleSelectAll = (email: string) => {
    const current = editedPermissions[email] || [];
    const allSelected = current.length === ALL_PAGE_IDS.length;
    setEditedPermissions(prev => ({
      ...prev,
      [email]: allSelected ? [] : [...ALL_PAGE_IDS],
    }));
    setHasUnsavedChanges(true);
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const { db } = await import('../lib/firebase/config');
      const { doc, updateDoc } = await import('firebase/firestore');

      for (const admin of partnerAdmins) {
        const pages = editedPermissions[admin.email] || [];
        await updateDoc(doc(db, 'admins', admin.email), { allowedPages: pages });
      }

      setPartnerAdmins(prev => prev.map(a => ({ ...a, allowedPages: editedPermissions[a.email] || [] })));
      setHasUnsavedChanges(false);
      alert('✅ Page permissions saved successfully!');
    } catch (err) {
      console.error('Error saving permissions:', err);
      alert('❌ Failed to save permissions. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="p-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h1 className="text-3xl text-white mb-2 flex items-center gap-3">
                <Shield className="w-8 h-8 text-emerald-500" />
                Page Permission Manager
              </h1>
              <p className="text-gray-400">
                Distribute admin panel page access to partner admins. Super Admin always has full access.
              </p>
            </div>
            <Button
              onClick={handleSave}
              disabled={!hasUnsavedChanges || saving}
              className="bg-emerald-500 hover:bg-emerald-600 text-white disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Check className="w-4 h-4 mr-2" />}
              Save Changes
            </Button>
          </div>

          {hasUnsavedChanges && (
            <div className="bg-yellow-900/20 border border-yellow-700/30 rounded-lg p-3 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-yellow-400" />
              <p className="text-sm text-yellow-400">
                You have unsaved changes. Click "Save Changes" to apply them.
              </p>
            </div>
          )}
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card className="bg-gradient-to-br from-emerald-900/40 to-emerald-800/20 border-emerald-700/30">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-emerald-400 mb-1">Total Pages</p>
                  <p className="text-3xl text-white">{ALL_PAGE_IDS.length}</p>
                </div>
                <Shield className="w-12 h-12 text-emerald-500/30" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-blue-900/40 to-blue-800/20 border-blue-700/30">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-blue-400 mb-1">Partner Admins</p>
                  <p className="text-3xl text-white">{partnerAdmins.length}</p>
                </div>
                <Users className="w-12 h-12 text-blue-500/30" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-yellow-900/40 to-yellow-800/20 border-yellow-700/30">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-yellow-400 mb-1">Super Admin</p>
                  <p className="text-lg text-white truncate">{superAdmin?.name || '—'}</p>
                </div>
                <Crown className="w-12 h-12 text-yellow-500/30" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Super Admin Card */}
        <Card className="bg-zinc-900 border-zinc-800 mb-6">
          <CardHeader>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-yellow-500 to-amber-600 flex items-center justify-center">
                <Crown className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="text-white flex items-center gap-2">
                  {superAdmin?.name || 'Super Admin'}
                  <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30 text-xs">
                    SUPER ADMIN
                  </Badge>
                </h3>
                <p className="text-sm text-gray-400">{superAdmin?.email}</p>
              </div>
              <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
                All {ALL_PAGE_IDS.length} Pages
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="px-6 pb-6">
            <p className="text-xs text-gray-500 italic">
              Super Admin has full unrestricted access to all pages. This cannot be changed.
            </p>
          </CardContent>
        </Card>

        {/* Partner Admin Permission Cards */}
        {partnerAdmins.length === 0 ? (
          <Card className="bg-zinc-900 border-zinc-800">
            <CardContent className="p-12 text-center">
              <Users className="w-16 h-16 text-gray-600 mx-auto mb-4" />
              <h3 className="text-white text-lg mb-2">No Partner Admins</h3>
              <p className="text-gray-400 text-sm">
                Go to Profile (Me + Partner) → Partner Admin Access to add partner admins first.
              </p>
            </CardContent>
          </Card>
        ) : (
          partnerAdmins.map(admin => {
            const currentPages = editedPermissions[admin.email] || [];
            return (
              <Card key={admin.email} className="bg-zinc-900 border-zinc-800 mb-6">
                <CardHeader>
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-lg text-white">
                      {admin.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1">
                      <h3 className="text-white">{admin.name}</h3>
                      <p className="text-sm text-gray-400">{admin.email}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">
                        {currentPages.length}/{ALL_PAGE_IDS.length} Pages
                      </Badge>
                      <Button
                        onClick={() => handleSelectAll(admin.email)}
                        size="sm"
                        variant="outline"
                        className="border-zinc-700 hover:bg-zinc-800 text-xs"
                      >
                        {currentPages.length === ALL_PAGE_IDS.length ? (
                          <><Square className="w-3 h-3 mr-1" /> Deselect All</>
                        ) : (
                          <><CheckSquare className="w-3 h-3 mr-1" /> Select All</>
                        )}
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="px-6 pb-6">
                  <div className="space-y-4">
                    {PAGE_SECTIONS.map(section => (
                      <div key={section.key}>
                        <p className={`text-xs uppercase tracking-wider font-bold mb-2 ${section.color}`}>
                          {section.label}
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                          {section.items.map(item => {
                            const checked = currentPages.includes(item.id);
                            return (
                              <label
                                key={item.id}
                                className={`flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-colors ${
                                  checked ? 'bg-emerald-900/30 border border-emerald-700/40' : 'bg-zinc-800/50 border border-zinc-700/30 hover:bg-zinc-800'
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  onChange={() => handleTogglePage(admin.email, item.id)}
                                  className="w-4 h-4 rounded border-zinc-600 bg-zinc-700 text-emerald-500 focus:ring-emerald-500 cursor-pointer"
                                />
                                <span className={`text-sm ${checked ? 'text-white' : 'text-gray-400'}`}>
                                  {item.label}
                                </span>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}

        {/* Help Section */}
        <Card className="bg-blue-900/20 border-blue-700/30 mt-6">
          <CardContent className="p-6">
            <h3 className="text-blue-400 mb-3 flex items-center gap-2">
              <AlertCircle className="w-5 h-5" />
              How Page Permissions Work
            </h3>
            <div className="space-y-2 text-sm text-blue-300">
              <p>👑 <strong>Super Admin</strong> always has access to all pages — this cannot be restricted.</p>
              <p>✅ <strong>Partner Admins</strong> can only see pages you assign to them in the sidebar.</p>
              <p>📋 <strong>Dashboard</strong> is always visible to all admins regardless of permissions.</p>
              <p>➕ <strong>Add partners</strong> via Profile (Me + Partner) → Partner Admin Access section.</p>
              <p>⚠️ <strong>Remember:</strong> Click "Save Changes" to apply permission updates.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

