import { useState, useEffect } from 'react';
import { db } from '../lib/firebase/config';
import {
  collection,
  getDocs,
  doc,
  updateDoc,
  getDoc,
  arrayUnion,
  arrayRemove,
  serverTimestamp
} from 'firebase/firestore';
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react';

interface ChangeRequest {
  id: string;
  companyId: string;
  companyName: string;
  type: 'territory' | 'specialty' | 'profile_edit' | 'territory_specialty';
  action: 'add' | 'remove' | 'update';
  items: string[];
  territory?: string;
  changes?: Record<string, { from: string; to: string }>;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: any;
}

export default function AdminDistributorManager() {
  const [requests, setRequests] = useState<ChangeRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    loadRequests();
  }, []);

  const loadRequests = async () => {
    if (!db) return;
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, 'pharmaChangeRequests'));
      const items: ChangeRequest[] = [];
      snap.forEach(docSnap => {
        const data = docSnap.data() as any;
        items.push({
          id: docSnap.id,
          companyId: data.companyId,
          companyName: data.companyName || '',
          type: data.type,
          action: data.action,
          items: data.items || [],
          territory: data.territory || undefined,
          changes: data.changes || undefined,
          status: data.status || 'pending',
          createdAt: data.createdAt,
        });
      });
      // sort pending first
      items.sort((a,b) => {
        if (a.status === b.status) return 0;
        if (a.status === 'pending') return -1;
        if (b.status === 'pending') return 1;
        return 0;
      });
      setRequests(items);
    } catch (err) {
      console.error('Failed loading requests', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDecision = async (req: ChangeRequest, approve: boolean) => {
    if (!db) return;
    setActionLoading(req.id);
    try {
      // update status in request
      await updateDoc(doc(db, 'pharmaChangeRequests', req.id), {
        status: approve ? 'approved' : 'rejected',
        reviewedAt: serverTimestamp(),
      });

      if (approve) {
        // apply change to company doc
        const compRef = doc(db, 'pharmaCompanies', req.companyId);
        if (req.type === 'territory') {
          if (req.action === 'add') {
            await updateDoc(compRef, {
              territoryStates: arrayUnion(...req.items),
              updatedAt: serverTimestamp(),
            });
          } else {
            await updateDoc(compRef, {
              territoryStates: arrayRemove(...req.items),
              updatedAt: serverTimestamp(),
            });
          }
        } else if (req.type === 'specialty') {
          if (req.action === 'add') {
            await updateDoc(compRef, {
              specialties: arrayUnion(...req.items),
              updatedAt: serverTimestamp(),
            });
          } else {
            await updateDoc(compRef, {
              specialties: arrayRemove(...req.items),
              updatedAt: serverTimestamp(),
            });
          }
        } else if (req.type === 'profile_edit' && req.changes) {
          // Apply each changed field to the company doc
          const updateData: Record<string, any> = { updatedAt: serverTimestamp() };
          for (const [field, { to }] of Object.entries(req.changes)) {
            updateData[field] = to;
          }
          await updateDoc(compRef, updateData);
        } else if (req.type === 'territory_specialty' && req.territory) {
          // Update territorySpecialties map for specific territory
          const compSnap = await getDoc(compRef);
          const compData = compSnap.data() || {};
          const current = compData.territorySpecialties || {};
          const territorySpecs = current[req.territory] || [];
          let updated: string[];
          if (req.action === 'add') {
            updated = [...new Set([...territorySpecs, ...req.items])];
          } else {
            updated = territorySpecs.filter((s: string) => !req.items.includes(s));
          }
          // Write full map to avoid issues with special chars in territory names
          const newMap = { ...current, [req.territory]: updated };
          await updateDoc(compRef, {
            territorySpecialties: newMap,
            updatedAt: serverTimestamp(),
          });
        }
      }

      // reload list
      loadRequests();
    } catch (err) {
      console.error('Decision error', err);
      alert('Failed to update request');
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin w-8 h-8 text-blue-500" />
      </div>
    );
  }

  if (requests.length === 0) {
    return <p className="p-4 text-center text-gray-400">No change requests found.</p>;
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-4">
      <h2 className="text-2xl font-bold">Distributor Change Requests</h2>
      <div className="space-y-4">
        {requests.map((req) => (
          <div key={req.id} className="bg-zinc-900 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold">{req.companyName}</p>
                {req.type === 'profile_edit' && req.changes ? (
                  <div className="text-xs text-gray-400 space-y-1 mt-1">
                    <p className="text-amber-400 font-medium">Profile Edit Request</p>
                    {Object.entries(req.changes).map(([field, { from, to }]) => (
                      <p key={field}>
                        <span className="text-gray-300">{field}:</span>{' '}
                        <span className="text-red-400 line-through">{from || '(empty)'}</span>{' → '}
                        <span className="text-green-400">{to || '(empty)'}</span>
                      </p>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-gray-400">
                    {req.type === 'territory_specialty' && req.territory
                      ? `Specialty ${req.action} for ${req.territory} – ${req.items.join(', ')}`
                      : `${req.type} ${req.action} – ${req.items.join(', ')}`}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-xs px-2.5 py-1 rounded-full ${
                  req.status === 'pending' ? 'bg-amber-500/20 text-amber-400' :
                  req.status === 'approved' ? 'bg-emerald-500/20 text-emerald-400' :
                  'bg-red-500/20 text-red-400'}
                `}>{req.status.charAt(0).toUpperCase() + req.status.slice(1)}</span>
                {req.status === 'pending' && (
                  <>
                    <button
                      onClick={() => handleDecision(req, true)}
                      disabled={actionLoading === req.id}
                      className="text-green-400 hover:text-green-300"
                    >
                      <CheckCircle2 className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => handleDecision(req, false)}
                      disabled={actionLoading === req.id}
                      className="text-red-400 hover:text-red-300"
                    >
                      <XCircle className="w-5 h-5" />
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

