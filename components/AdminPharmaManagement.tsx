import { useState, useEffect } from 'react';
import {
  Building2, Search, Trash2, CheckCircle2, XCircle,
  Mail, Phone, MapPin, Users, Loader2, ChevronDown, ChevronUp,
  Clock, ShieldCheck, Ban, Tag, Briefcase, FileText, Globe
} from 'lucide-react';
import { db } from '../lib/firebase/config';
import {
  collection, getDocs, updateDoc, deleteDoc, doc, serverTimestamp, query
} from 'firebase/firestore';

interface PharmaCompany {
  id: string;
  companyName: string;
  contactEmail: string;
  contactPhone: string;
  contactPerson: string;
  address: string;
  gstNumber: string;
  registeredOfficePincode: string;
  registeredOfficeState: string;
  division: string;
  specialties: string[];
  territoryStates: string[];
  territoryType: string;
  status: string;
  createdAt: any;
  emailVerifiedAt: any;
  doctorCount: number;
}

export default function AdminPharmaManagement() {
  const [companies, setCompanies] = useState<PharmaCompany[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    loadCompanies();
  }, []);

  const loadCompanies = async () => {
    if (!db) return;
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, 'pharmaCompanies'));
      const items: PharmaCompany[] = [];

      for (const docSnap of snap.docs) {
        const data = docSnap.data();
        let doctorCount = 0;
        try {
          const doctorsSnap = await getDocs(collection(db!, 'pharmaCompanies', docSnap.id, 'distributedDoctors'));
          doctorCount = doctorsSnap.size;
        } catch (_) { /* ignore */ }

        items.push({
          id: docSnap.id,
          companyName: data.companyName || '',
          contactEmail: data.contactEmail || '',
          contactPhone: data.contactPhone || '',
          contactPerson: data.contactPerson || '',
          address: data.address || '',
          gstNumber: data.gstNumber || '',
          registeredOfficePincode: data.registeredOfficePincode || '',
          registeredOfficeState: data.registeredOfficeState || '',
          division: data.division || '',
          specialties: data.specialties || [],
          territoryStates: data.territoryStates || [],
          territoryType: data.territoryType || '',
          status: data.status || 'pending',
          createdAt: data.createdAt,
          emailVerifiedAt: data.emailVerifiedAt,
          doctorCount,
        });
      }

      // Sort: pending_approval first, then pending_verification, then active, then suspended
      const statusOrder: Record<string, number> = {
        pending_approval: 0,
        pending_verification: 1,
        pending: 2,
        active: 3,
        suspended: 4,
      };
      items.sort((a, b) => (statusOrder[a.status] ?? 5) - (statusOrder[b.status] ?? 5) || a.companyName.localeCompare(b.companyName));
      setCompanies(items);
    } catch (error) {
      console.error('Error loading pharma companies:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (company: PharmaCompany) => {
    if (!db) return;
    if (!confirm(`Approve "${company.companyName}"? They will be able to login and access the distributor portal.`)) return;
    setActionLoading(company.id);
    try {
      await updateDoc(doc(db, 'pharmaCompanies', company.id), {
        status: 'active',
        approvedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      setCompanies(prev => prev.map(c => c.id === company.id ? { ...c, status: 'active' } : c));
    } catch (error) {
      console.error('Error approving:', error);
      alert('Failed to approve');
    } finally {
      setActionLoading(null);
    }
  };

  const handleSuspend = async (company: PharmaCompany) => {
    if (!db) return;
    if (!confirm(`Suspend "${company.companyName}"? They will lose access to the portal.`)) return;
    setActionLoading(company.id);
    try {
      await updateDoc(doc(db, 'pharmaCompanies', company.id), {
        status: 'suspended',
        updatedAt: serverTimestamp(),
      });
      setCompanies(prev => prev.map(c => c.id === company.id ? { ...c, status: 'suspended' } : c));
    } catch (error) {
      console.error('Error suspending:', error);
      alert('Failed to suspend');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!db) return;
    if (!confirm(`Permanently delete "${name}"? This will remove all their data including distributed doctor records.`)) return;
    setActionLoading(id);
    try {
      // Cascade delete subcollections
      for (const sub of ['distributedDoctors', 'distributedClinics', 'promoTemplates', 'supportMessages']) {
        const subSnap = await getDocs(collection(db, 'pharmaCompanies', id, sub));
        for (const d of subSnap.docs) {
          await deleteDoc(doc(db, 'pharmaCompanies', id, sub, d.id));
        }
      }
      await deleteDoc(doc(db, 'pharmaCompanies', id));
      setCompanies(prev => prev.filter(c => c.id !== id));
    } catch (error) {
      console.error('Error deleting:', error);
      alert('Failed to delete');
    } finally {
      setActionLoading(null);
    }
  };

  const StatusBadge = ({ status }: { status: string }) => {
    const config: Record<string, { bg: string; text: string; label: string }> = {
      active: { bg: 'bg-emerald-500/20', text: 'text-emerald-400', label: 'Active' },
      suspended: { bg: 'bg-red-500/20', text: 'text-red-400', label: 'Suspended' },
      pending_approval: { bg: 'bg-amber-500/20', text: 'text-amber-400', label: 'Awaiting Approval' },
      pending_verification: { bg: 'bg-blue-500/20', text: 'text-blue-400', label: 'Email Not Verified' },
      pending: { bg: 'bg-amber-500/20', text: 'text-amber-400', label: 'Pending' },
    };
    const c = config[status] || config.pending;
    return <span className={`text-xs px-2.5 py-1 rounded-full ${c.bg} ${c.text}`}>{c.label}</span>;
  };

  const filteredCompanies = companies.filter(c => {
    const matchesSearch = !searchQuery.trim() ||
      c.companyName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.contactEmail.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.contactPerson.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || c.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const pendingCount = companies.filter(c => c.status === 'pending_approval').length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-emerald-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Building2 className="w-5 h-5 text-blue-400" />
          healQR Distributors
        </h2>
        <p className="text-sm text-gray-400 mt-1">
          {companies.length} companies registered
          {pendingCount > 0 && (
            <span className="ml-2 text-amber-400 font-medium">• {pendingCount} awaiting approval</span>
          )}
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            placeholder="Search companies..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-zinc-900 border border-zinc-800 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2.5 bg-zinc-900 border border-zinc-800 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">All Status</option>
          <option value="pending_approval">Awaiting Approval</option>
          <option value="pending_verification">Email Not Verified</option>
          <option value="active">Active</option>
          <option value="suspended">Suspended</option>
        </select>
      </div>

      {/* Companies List */}
      <div className="space-y-3">
        {filteredCompanies.length === 0 ? (
          <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-12 text-center">
            <Building2 className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <h3 className="text-lg text-gray-400">No companies found</h3>
          </div>
        ) : (
          filteredCompanies.map(company => {
            const isExpanded = expandedId === company.id;
            const isPending = company.status === 'pending_approval' || company.status === 'pending' || company.status === 'pending_verification';
            const isActive = company.status === 'active';
            const isActionLoading = actionLoading === company.id;

            return (
              <div
                key={company.id}
                className={`bg-zinc-900 rounded-xl border transition-colors ${
                  isPending && company.status !== 'pending_verification'
                    ? 'border-amber-500/40'
                    : 'border-zinc-800'
                }`}
              >
                {/* Main row */}
                <div className="p-4 sm:p-5">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2 flex-wrap">
                        <h3 className="font-semibold text-lg">{company.companyName}</h3>
                        <StatusBadge status={company.status} />
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-sm text-gray-400">
                        <div className="flex items-center gap-2">
                          <Mail className="w-3.5 h-3.5 text-gray-500 shrink-0" />
                          <span className="truncate">{company.contactEmail}</span>
                        </div>
                        {company.contactPhone && (
                          <div className="flex items-center gap-2">
                            <Phone className="w-3.5 h-3.5 text-gray-500 shrink-0" />
                            <span>{company.contactPhone}</span>
                          </div>
                        )}
                        {company.contactPerson && (
                          <div className="flex items-center gap-2">
                            <Users className="w-3.5 h-3.5 text-gray-500 shrink-0" />
                            <span>{company.contactPerson}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-2">
                          <Users className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                          <span className="text-blue-400 font-medium">{company.doctorCount} doctors distributed</span>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 shrink-0">
                      {/* Approve button - show for pending_approval */}
                      {(company.status === 'pending_approval' || company.status === 'pending') && (
                        <button
                          onClick={() => handleApprove(company)}
                          disabled={isActionLoading}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 rounded-lg transition-colors text-sm font-medium"
                          title="Approve"
                        >
                          {isActionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                          Approve
                        </button>
                      )}

                      {/* Suspend button - show for active */}
                      {isActive && (
                        <button
                          onClick={() => handleSuspend(company)}
                          disabled={isActionLoading}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600/20 hover:bg-red-600/30 text-red-400 disabled:opacity-50 rounded-lg transition-colors text-sm"
                          title="Suspend"
                        >
                          {isActionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Ban className="w-4 h-4" />}
                          Suspend
                        </button>
                      )}

                      {/* Re-activate for suspended */}
                      {company.status === 'suspended' && (
                        <button
                          onClick={() => handleApprove(company)}
                          disabled={isActionLoading}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 disabled:opacity-50 rounded-lg transition-colors text-sm"
                          title="Re-activate"
                        >
                          {isActionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                          Re-activate
                        </button>
                      )}

                      {/* Expand/Collapse */}
                      <button
                        onClick={() => setExpandedId(isExpanded ? null : company.id)}
                        className="p-2 text-gray-400 hover:bg-zinc-800 rounded-lg transition-colors"
                        title="View details"
                      >
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>

                      {/* Delete */}
                      <button
                        onClick={() => handleDelete(company.id, company.companyName)}
                        disabled={isActionLoading}
                        className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors disabled:opacity-50"
                        title="Delete permanently"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Expanded details (read-only) */}
                {isExpanded && (
                  <div className="border-t border-zinc-800 p-4 sm:p-5 bg-zinc-950/50 rounded-b-xl">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
                      <DetailItem icon={<Building2 className="w-4 h-4" />} label="Company Name" value={company.companyName} />
                      <DetailItem icon={<Mail className="w-4 h-4" />} label="Email" value={company.contactEmail} />
                      <DetailItem icon={<Users className="w-4 h-4" />} label="Contact Person" value={company.contactPerson || '—'} />
                      <DetailItem icon={<Phone className="w-4 h-4" />} label="Phone" value={company.contactPhone || '—'} />
                      <DetailItem icon={<MapPin className="w-4 h-4" />} label="Pincode" value={company.registeredOfficePincode || '—'} />
                      <DetailItem icon={<MapPin className="w-4 h-4" />} label="State" value={company.registeredOfficeState || '—'} />
                      <DetailItem icon={<FileText className="w-4 h-4" />} label="GST Number" value={company.gstNumber || '—'} />
                      <DetailItem icon={<Briefcase className="w-4 h-4" />} label="Division" value={company.division || '—'} />
                      <DetailItem icon={<MapPin className="w-4 h-4" />} label="Address" value={company.address || '—'} />
                      <DetailItem
                        icon={<Clock className="w-4 h-4" />}
                        label="Registered"
                        value={company.createdAt?.toDate?.() ? company.createdAt.toDate().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                      />
                    </div>

                    {/* Specialties */}
                    {company.specialties && company.specialties.length > 0 && (
                      <div className="mt-4">
                        <p className="text-xs text-gray-500 mb-2 flex items-center gap-1.5">
                          <Tag className="w-3.5 h-3.5" /> Specialties
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {company.specialties.map(s => (
                            <span key={s} className={`text-xs px-2 py-1 rounded-full border ${
                              s === 'Clinic'
                                ? 'bg-blue-500/20 text-blue-400 border-blue-500/30'
                                : 'bg-zinc-800 text-gray-300 border-zinc-700'
                            }`}>
                              {s}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Territory States */}
                    {company.territoryStates && company.territoryStates.length > 0 && (
                      <div className="mt-4">
                        <p className="text-xs text-gray-500 mb-2 flex items-center gap-1.5">
                          <Globe className="w-3.5 h-3.5" /> Territory
                          <span className="text-xs bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded border border-blue-500/30">Locked</span>
                        </p>
                        {company.territoryType === 'all_india' ? (
                          <span className="text-sm font-medium text-blue-400">🇮🇳 All India ({company.territoryStates.length} states)</span>
                        ) : (
                          <div className="flex flex-wrap gap-1.5">
                            {company.territoryStates.map(s => (
                              <span key={s} className="text-xs px-2 py-1 rounded-full border bg-blue-500/10 text-blue-400 border-blue-500/30">
                                {s}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

function DetailItem({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-gray-500 mb-1 flex items-center gap-1.5">{icon} {label}</p>
      <p className="text-gray-200 break-words">{value}</p>
    </div>
  );
}
