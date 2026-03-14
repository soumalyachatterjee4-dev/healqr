import { useState, useEffect } from 'react';
import {
  FileText, CheckCircle2, XCircle, Clock,
  Eye, Loader2, Building2, MapPin, Users, Image
} from 'lucide-react';
import { db } from '../lib/firebase/config';
import {
  collection, getDocs, updateDoc, doc, serverTimestamp
} from 'firebase/firestore';

interface PharmaTemplate {
  id: string;
  companyId: string;
  companyName: string;
  title: string;
  description: string;
  imageUrl: string;
  status: string;
  createdAt: any;
  targetStates: string[];
  targetSpecialties: string[];
  targetDoctorNames: string[];
  targetClinicNames: string[];
  targetDoctorIds: string[];
  targetClinicIds: string[];
}

export default function AdminPharmaTemplateApprovals() {
  const [templates, setTemplates] = useState<PharmaTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('pending');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [viewingImage, setViewingImage] = useState<string | null>(null);

  useEffect(() => {
    loadAllTemplates();
  }, []);

  const loadAllTemplates = async () => {
    if (!db) return;
    setLoading(true);
    try {
      // Get all pharma companies first
      const companiesSnap = await getDocs(collection(db, 'pharmaCompanies'));
      const allTemplates: PharmaTemplate[] = [];

      for (const companyDoc of companiesSnap.docs) {
        const companyData = companyDoc.data();
        const templatesSnap = await getDocs(
          collection(db, 'pharmaCompanies', companyDoc.id, 'promoTemplates')
        );

        templatesSnap.forEach(tDoc => {
          const data = tDoc.data();
          allTemplates.push({
            id: tDoc.id,
            companyId: companyDoc.id,
            companyName: companyData.companyName || 'Unknown',
            title: data.title || '',
            description: data.description || '',
            imageUrl: data.imageUrl || '',
            status: data.status || 'pending',
            createdAt: data.createdAt,
            targetStates: data.targetStates || [],
            targetSpecialties: data.targetSpecialties || [],
            targetDoctorNames: data.targetDoctorNames || [],
            targetClinicNames: data.targetClinicNames || [],
            targetDoctorIds: data.targetDoctorIds || [],
            targetClinicIds: data.targetClinicIds || [],
          });
        });
      }

      // Sort: pending first, then by date
      allTemplates.sort((a, b) => {
        const statusOrder: Record<string, number> = { pending: 0, approved: 1, rejected: 2 };
        const sDiff = (statusOrder[a.status] ?? 3) - (statusOrder[b.status] ?? 3);
        if (sDiff !== 0) return sDiff;
        const dateA = a.createdAt?.toDate?.() || new Date(0);
        const dateB = b.createdAt?.toDate?.() || new Date(0);
        return dateB.getTime() - dateA.getTime();
      });

      setTemplates(allTemplates);
    } catch (error) {
      console.error('Error loading pharma templates:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (template: PharmaTemplate) => {
    if (!db) return;
    if (!confirm(`Approve "${template.title}" from ${template.companyName}?`)) return;
    setActionLoading(template.id);
    try {
      await updateDoc(
        doc(db, 'pharmaCompanies', template.companyId, 'promoTemplates', template.id),
        { status: 'approved', approvedAt: serverTimestamp() }
      );
      setTemplates(prev => prev.map(t =>
        t.id === template.id ? { ...t, status: 'approved' } : t
      ));
    } catch (error) {
      console.error('Error approving:', error);
      alert('Failed to approve template');
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (template: PharmaTemplate) => {
    if (!db) return;
    if (!confirm(`Reject "${template.title}" from ${template.companyName}?`)) return;
    setActionLoading(template.id);
    try {
      await updateDoc(
        doc(db, 'pharmaCompanies', template.companyId, 'promoTemplates', template.id),
        { status: 'rejected', rejectedAt: serverTimestamp() }
      );
      setTemplates(prev => prev.map(t =>
        t.id === template.id ? { ...t, status: 'rejected' } : t
      ));
    } catch (error) {
      console.error('Error rejecting:', error);
      alert('Failed to reject template');
    } finally {
      setActionLoading(null);
    }
  };

  const filteredTemplates = templates.filter(t =>
    statusFilter === 'all' ? true : t.status === statusFilter
  );

  const pendingCount = templates.filter(t => t.status === 'pending').length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      <div>
        <h2 className="text-xl font-bold flex items-center gap-2">
          <FileText className="w-5 h-5 text-blue-400" />
          Pharma Template Approvals
        </h2>
        <p className="text-sm text-gray-400 mt-1">
          {templates.length} templates from pharma companies
          {pendingCount > 0 && (
            <span className="ml-2 text-amber-400 font-medium">• {pendingCount} pending approval</span>
          )}
        </p>
      </div>

      {/* Filter */}
      <div className="flex gap-2">
        {['pending', 'approved', 'rejected', 'all'].map(f => (
          <button
            key={f}
            onClick={() => setStatusFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-sm transition-colors capitalize ${
              statusFilter === f
                ? 'bg-blue-600 text-white'
                : 'bg-zinc-800 text-gray-400 hover:bg-zinc-700'
            }`}
          >
            {f} {f === 'pending' && pendingCount > 0 ? `(${pendingCount})` : ''}
          </button>
        ))}
      </div>

      {/* Templates */}
      {filteredTemplates.length === 0 ? (
        <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-12 text-center">
          <Image className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg text-gray-400">No {statusFilter !== 'all' ? statusFilter : ''} templates</h3>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredTemplates.map(template => (
            <div
              key={`${template.companyId}-${template.id}`}
              className={`bg-zinc-900 rounded-xl border overflow-hidden ${
                template.status === 'pending' ? 'border-amber-500/40' : 'border-zinc-800'
              }`}
            >
              <div className="flex flex-col sm:flex-row">
                {/* Image preview */}
                <div
                  className="w-full sm:w-48 h-32 sm:h-auto bg-zinc-800 cursor-pointer shrink-0 relative group"
                  onClick={() => setViewingImage(template.imageUrl)}
                >
                  {template.imageUrl ? (
                    <>
                      <img src={template.imageUrl} alt={template.title} className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <Eye className="w-6 h-6 text-white" />
                      </div>
                    </>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Image className="w-8 h-8 text-gray-600" />
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <h4 className="font-medium">{template.title}</h4>
                      <div className="flex items-center gap-2 mt-1 text-sm text-gray-400">
                        <Building2 className="w-3.5 h-3.5" />
                        {template.companyName}
                      </div>
                      {template.description && (
                        <p className="text-xs text-gray-500 mt-1">{template.description}</p>
                      )}
                    </div>
                    <StatusBadge status={template.status} />
                  </div>

                  {/* Targeting info */}
                  <div className="mt-3 space-y-1">
                    {template.targetStates.length > 0 && (
                      <div className="flex items-center gap-2 flex-wrap">
                        <MapPin className="w-3 h-3 text-blue-400 shrink-0" />
                        {template.targetStates.map(s => (
                          <span key={s} className="text-xs px-2 py-0.5 bg-blue-500/20 text-blue-400 rounded-full">{s}</span>
                        ))}
                      </div>
                    )}
                    {(template.targetDoctorNames.length > 0 || template.targetClinicNames.length > 0) && (
                      <div className="flex items-center gap-2 flex-wrap">
                        <Users className="w-3 h-3 text-emerald-400 shrink-0" />
                        {template.targetDoctorNames.slice(0, 4).map(n => (
                          <span key={n} className="text-xs px-2 py-0.5 bg-zinc-800 text-gray-300 rounded-full">{n}</span>
                        ))}
                        {template.targetClinicNames.slice(0, 4).map(n => (
                          <span key={n} className="text-xs px-2 py-0.5 bg-purple-500/20 text-purple-400 rounded-full">{n}</span>
                        ))}
                        {(template.targetDoctorNames.length + template.targetClinicNames.length) > 8 && (
                          <span className="text-xs text-gray-500">
                            +{template.targetDoctorNames.length + template.targetClinicNames.length - 8} more
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2 mt-3 text-xs text-gray-500">
                    <Clock className="w-3 h-3" />
                    {template.createdAt?.toDate?.()?.toLocaleDateString?.('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) || '—'}
                  </div>

                  {/* Actions */}
                  {template.status === 'pending' && (
                    <div className="flex items-center gap-2 mt-3">
                      <button
                        onClick={() => handleApprove(template)}
                        disabled={actionLoading === template.id}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 rounded-lg text-sm font-medium transition-colors"
                      >
                        {actionLoading === template.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                        Approve
                      </button>
                      <button
                        onClick={() => handleReject(template)}
                        disabled={actionLoading === template.id}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600/20 hover:bg-red-600/30 text-red-400 disabled:opacity-50 rounded-lg text-sm transition-colors"
                      >
                        {actionLoading === template.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                        Reject
                      </button>
                    </div>
                  )}

                  {template.status !== 'pending' && (
                    <div className="flex items-center gap-2 mt-3">
                      <button
                        onClick={() => handleApprove(template)}
                        disabled={actionLoading === template.id}
                        className="text-xs text-emerald-400 hover:underline disabled:opacity-50"
                      >
                        Re-approve
                      </button>
                      <button
                        onClick={() => handleReject(template)}
                        disabled={actionLoading === template.id}
                        className="text-xs text-red-400 hover:underline disabled:opacity-50"
                      >
                        Reject
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Image Lightbox */}
      {viewingImage && (
        <div
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
          onClick={() => setViewingImage(null)}
        >
          <img src={viewingImage} alt="Template" className="max-w-full max-h-full rounded-lg" />
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { color: string; label: string }> = {
    pending: { color: 'bg-amber-500/20 text-amber-400', label: 'Pending' },
    approved: { color: 'bg-emerald-500/20 text-emerald-400', label: 'Approved' },
    rejected: { color: 'bg-red-500/20 text-red-400', label: 'Rejected' },
  };
  const c = config[status] || { color: 'bg-gray-500/20 text-gray-400', label: status };
  return <span className={`text-xs px-2.5 py-1 rounded-full ${c.color}`}>{c.label}</span>;
}

