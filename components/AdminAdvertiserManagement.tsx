import { useState, useEffect } from 'react';
import {
  BarChart2, Plus, Search, Edit2, Trash2, CheckCircle2, XCircle,
  Mail, Phone, MapPin, Eye, Loader2, X, CreditCard
} from 'lucide-react';
import { db } from '../lib/firebase/config';
import {
  collection, getDocs, addDoc, updateDoc, deleteDoc, doc, serverTimestamp
} from 'firebase/firestore';

interface Advertiser {
  id: string;
  companyName: string;
  contactEmail: string;
  contactPhone: string;
  contactPerson: string;
  businessType: string;
  targetPincodes: string[];
  status: 'active' | 'suspended' | 'pending';
  planType: 'basic' | 'premium' | 'enterprise';
  allocatedPages: string[];
  createdAt: any;
  notes: string;
  paymentStatus: 'paid' | 'pending' | 'overdue';
}

const PREMIUM_PAGES = [
  { id: 'booking-confirmation', label: 'Booking Confirmation', desc: 'Shown after patient books appointment' },
  { id: 'waiting-room', label: 'Waiting Room', desc: 'Shown while patient waits' },
  { id: 'prescription-view', label: 'Prescription View', desc: 'Shown on prescription page' },
  { id: 'follow-up-reminder', label: 'Follow-up Reminder', desc: 'Shown in follow-up notifications' },
  { id: 'patient-dashboard', label: 'Patient Dashboard', desc: 'Banner on patient dashboard' },
  { id: 'doctor-search', label: 'Doctor Search', desc: 'Shown during doctor search' },
  { id: 'push-notification', label: 'Push Notification', desc: 'FCM notification banner' },
  { id: 'in-app-notification', label: 'In-App Notification', desc: 'In-app notification card' },
];

export default function AdminAdvertiserManagement() {
  const [advertisers, setAdvertisers] = useState<Advertiser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    companyName: '',
    contactEmail: '',
    contactPhone: '',
    contactPerson: '',
    businessType: '',
    targetPincodes: '',
    status: 'active' as Advertiser['status'],
    planType: 'basic' as Advertiser['planType'],
    allocatedPages: [] as string[],
    notes: '',
    paymentStatus: 'pending' as Advertiser['paymentStatus'],
  });

  useEffect(() => {
    loadAdvertisers();
  }, []);

  const loadAdvertisers = async () => {
    if (!db) return;
    setLoading(true);

    try {
      const ref = collection(db, 'advertisers');
      const snap = await getDocs(ref);

      const items: Advertiser[] = snap.docs.map(d => {
        const data = d.data();
        return {
          id: d.id,
          companyName: data.companyName || '',
          contactEmail: data.contactEmail || '',
          contactPhone: data.contactPhone || '',
          contactPerson: data.contactPerson || '',
          businessType: data.businessType || '',
          targetPincodes: data.targetPincodes || [],
          status: data.status || 'pending',
          planType: data.planType || 'basic',
          allocatedPages: data.allocatedPages || [],
          createdAt: data.createdAt,
          notes: data.notes || '',
          paymentStatus: data.paymentStatus || 'pending',
        };
      });

      items.sort((a, b) => a.companyName.localeCompare(b.companyName));
      setAdvertisers(items);
    } catch (error) {
      console.error('Error loading advertisers:', error);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      companyName: '', contactEmail: '', contactPhone: '', contactPerson: '',
      businessType: '', targetPincodes: '', status: 'active', planType: 'basic',
      allocatedPages: [], notes: '', paymentStatus: 'pending',
    });
    setEditingId(null);
    setShowForm(false);
  };

  const handleEdit = (adv: Advertiser) => {
    setFormData({
      companyName: adv.companyName,
      contactEmail: adv.contactEmail,
      contactPhone: adv.contactPhone,
      contactPerson: adv.contactPerson,
      businessType: adv.businessType,
      targetPincodes: adv.targetPincodes.join(', '),
      status: adv.status,
      planType: adv.planType,
      allocatedPages: adv.allocatedPages,
      notes: adv.notes,
      paymentStatus: adv.paymentStatus,
    });
    setEditingId(adv.id);
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!formData.companyName.trim() || !formData.contactEmail.trim() || !db) return;
    setSaving(true);

    try {
      const pincodes = formData.targetPincodes.split(',')
        .map(s => s.trim())
        .filter(s => s.length > 0);

      const payload = {
        companyName: formData.companyName.trim(),
        contactEmail: formData.contactEmail.trim().toLowerCase(),
        contactPhone: formData.contactPhone.trim(),
        contactPerson: formData.contactPerson.trim(),
        businessType: formData.businessType.trim(),
        targetPincodes: pincodes,
        status: formData.status,
        planType: formData.planType,
        allocatedPages: formData.allocatedPages,
        notes: formData.notes.trim(),
        paymentStatus: formData.paymentStatus,
        updatedAt: serverTimestamp(),
      };

      if (editingId) {
        await updateDoc(doc(db, 'advertisers', editingId), payload);
      } else {
        await addDoc(collection(db, 'advertisers'), {
          ...payload,
          createdAt: serverTimestamp(),
        });
      }

      resetForm();
      await loadAdvertisers();
    } catch (error) {
      console.error('Error saving advertiser:', error);
      alert('Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete "${name}"?`)) return;
    if (!db) return;

    try {
      await deleteDoc(doc(db, 'advertisers', id));
      setAdvertisers(prev => prev.filter(a => a.id !== id));
    } catch (error) {
      console.error('Error deleting advertiser:', error);
    }
  };

  const togglePage = (pageId: string) => {
    setFormData(prev => ({
      ...prev,
      allocatedPages: prev.allocatedPages.includes(pageId)
        ? prev.allocatedPages.filter(p => p !== pageId)
        : [...prev.allocatedPages, pageId],
    }));
  };

  const filteredAdvertisers = advertisers.filter(a =>
    !searchQuery.trim() ||
    a.companyName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    a.contactEmail.toLowerCase().includes(searchQuery.toLowerCase()) ||
    a.businessType.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const PlanBadge = ({ plan }: { plan: string }) => {
    const colors: Record<string, string> = {
      basic: 'bg-gray-500/20 text-gray-300',
      premium: 'bg-blue-500/20 text-blue-400',
      enterprise: 'bg-purple-500/20 text-purple-400',
    };
    return <span className={`text-xs px-2 py-1 rounded-full capitalize ${colors[plan] || colors.basic}`}>{plan}</span>;
  };

  const PaymentBadge = ({ status }: { status: string }) => {
    const colors: Record<string, string> = {
      paid: 'bg-emerald-500/20 text-emerald-400',
      pending: 'bg-amber-500/20 text-amber-400',
      overdue: 'bg-red-500/20 text-red-400',
    };
    return <span className={`text-xs px-2 py-1 rounded-full capitalize ${colors[status] || colors.pending}`}>{status}</span>;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-emerald-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <BarChart2 className="w-5 h-5 text-purple-400" />
            Advertiser Management
          </h2>
          <p className="text-sm text-gray-400 mt-1">{advertisers.length} advertisers</p>
        </div>
        <button
          onClick={() => { resetForm(); setShowForm(true); }}
          className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors text-sm"
        >
          <Plus className="w-4 h-4" />
          Add Advertiser
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">{editingId ? 'Edit Advertiser' : 'Add New Advertiser'}</h3>
            <button onClick={resetForm} className="text-gray-400 hover:text-white">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Company Name *</label>
              <input type="text" value={formData.companyName} onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                className="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500" />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Contact Email *</label>
              <input type="email" value={formData.contactEmail} onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
                className="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500" />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Contact Person</label>
              <input type="text" value={formData.contactPerson} onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
                className="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500" />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Phone</label>
              <input type="tel" value={formData.contactPhone} onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
                className="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500" />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Business Type</label>
              <input type="text" value={formData.businessType} onChange={(e) => setFormData({ ...formData, businessType: e.target.value })}
                placeholder="e.g., Health Insurance, Lab Testing"
                className="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500" />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Plan</label>
              <select value={formData.planType} onChange={(e) => setFormData({ ...formData, planType: e.target.value as any })}
                className="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500">
                <option value="basic">Basic</option>
                <option value="premium">Premium</option>
                <option value="enterprise">Enterprise</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Status</label>
              <select value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                className="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500">
                <option value="active">Active</option>
                <option value="pending">Pending</option>
                <option value="suspended">Suspended</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Payment Status</label>
              <select value={formData.paymentStatus} onChange={(e) => setFormData({ ...formData, paymentStatus: e.target.value as any })}
                className="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500">
                <option value="paid">Paid</option>
                <option value="pending">Pending</option>
                <option value="overdue">Overdue</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">Target Pincodes (comma-separated)</label>
            <input type="text" value={formData.targetPincodes} onChange={(e) => setFormData({ ...formData, targetPincodes: e.target.value })}
              placeholder="e.g., 400001, 400002, 400003"
              className="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500" />
          </div>

          {/* Allocated Pages */}
          <div>
            <label className="block text-sm text-gray-400 mb-2">Allocated Ad Pages</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {PREMIUM_PAGES.map(page => (
                <button
                  key={page.id}
                  onClick={() => togglePage(page.id)}
                  className={`text-left p-3 rounded-lg border transition-colors ${
                    formData.allocatedPages.includes(page.id)
                      ? 'border-purple-500 bg-purple-500/10'
                      : 'border-zinc-700 bg-zinc-800 hover:border-zinc-600'
                  }`}
                >
                  <p className="text-sm font-medium">{page.label}</p>
                  <p className="text-xs text-gray-500">{page.desc}</p>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">Notes</label>
            <textarea value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} rows={2}
              className="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none" />
          </div>

          <div className="flex justify-end gap-3">
            <button onClick={resetForm} className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-sm transition-colors">Cancel</button>
            <button onClick={handleSave} disabled={saving || !formData.companyName.trim() || !formData.contactEmail.trim()}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 rounded-lg text-sm transition-colors flex items-center gap-2">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {editingId ? 'Update' : 'Create'}
            </button>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
        <input type="text" placeholder="Search advertisers..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 bg-zinc-900 border border-zinc-800 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500" />
      </div>

      {/* List */}
      <div className="space-y-3">
        {filteredAdvertisers.length === 0 ? (
          <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-12 text-center">
            <BarChart2 className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <h3 className="text-lg text-gray-400">No advertisers found</h3>
          </div>
        ) : (
          filteredAdvertisers.map(adv => (
            <div key={adv.id} className="bg-zinc-900 rounded-xl border border-zinc-800 p-4 sm:p-5">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-2">
                    <h3 className="font-semibold text-lg">{adv.companyName}</h3>
                    <PlanBadge plan={adv.planType} />
                    <PaymentBadge status={adv.paymentStatus} />
                    {adv.status !== 'active' && (
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        adv.status === 'suspended' ? 'bg-red-500/20 text-red-400' : 'bg-amber-500/20 text-amber-400'
                      }`}>
                        {adv.status}
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-gray-400 mb-2">
                    <div className="flex items-center gap-2">
                      <Mail className="w-3.5 h-3.5 text-gray-500" />
                      <span className="truncate">{adv.contactEmail}</span>
                    </div>
                    {adv.businessType && (
                      <div className="text-gray-500">{adv.businessType}</div>
                    )}
                  </div>
                  {adv.allocatedPages.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {adv.allocatedPages.map(p => (
                        <span key={p} className="text-xs px-2 py-0.5 bg-purple-500/10 text-purple-400 rounded-full">
                          {PREMIUM_PAGES.find(pp => pp.id === p)?.label || p}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button onClick={() => handleEdit(adv)} className="p-2 text-gray-400 hover:bg-zinc-800 rounded-lg transition-colors">
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleDelete(adv.id, adv.companyName)} className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Payment Gateway Notice */}
      <div className="bg-purple-500/10 border border-purple-500/30 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-1">
          <CreditCard className="w-4 h-4 text-purple-400" />
          <p className="text-sm text-purple-400 font-medium">Payment Gateway</p>
        </div>
        <p className="text-xs text-gray-400">
          Payment gateway integration is pending. Currently tracking payment status manually.
          Razorpay/Stripe integration will be added in a future update.
        </p>
      </div>
    </div>
  );
}

