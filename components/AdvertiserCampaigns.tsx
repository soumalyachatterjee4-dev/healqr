import { useState, useEffect } from 'react';
import { Layout, Plus, Megaphone, Clock, CheckCircle2, XCircle, Eye, Calendar } from 'lucide-react';
import { db, auth } from '../lib/firebase/config';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import AdvertiserCreateCampaign from './AdvertiserCreateCampaign';

interface Campaign {
  id: string;
  status: string;
  templates: string[];
  totalReach: number;
  duration: number;
  totalAmount: number;
  createdAt: any;
  zone: string;
  state: string;
  stats: { impressions: number; clicks: number };
  // Legacy fields
  viewBundle?: number;
  pincodes?: string[];
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  'pending_review': { label: 'Under Review', color: 'amber', icon: Clock },
  'active': { label: 'Active', color: 'emerald', icon: CheckCircle2 },
  'completed': { label: 'Completed', color: 'blue', icon: CheckCircle2 },
  'rejected': { label: 'Rejected', color: 'red', icon: XCircle },
  'paused': { label: 'Paused', color: 'zinc', icon: Clock },
};

export default function AdvertiserCampaigns() {
  const [mode, setMode] = useState<'list' | 'create'>('list');
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCampaigns();
  }, []);

  const fetchCampaigns = async () => {
    const uid = auth.currentUser?.uid || localStorage.getItem('healqr_advertiser_id');
    if (!uid) { setLoading(false); return; }

    try {
      const q = query(
        collection(db, 'advertiser_campaigns'),
        where('advertiserId', '==', uid),
        orderBy('createdAt', 'desc')
      );
      const snap = await getDocs(q);
      setCampaigns(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Campaign)));
    } catch (error) {
      console.error('Error fetching campaigns:', error);
    } finally {
      setLoading(false);
    }
  };

  if (mode === 'create') {
    return (
      <AdvertiserCreateCampaign
        onBack={() => {
          setMode('list');
          fetchCampaigns();
        }}
      />
    );
  }

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-2xl font-bold text-white">Campaigns</h2>
          <p className="text-zinc-400 text-sm mt-1">{campaigns.length} total campaigns</p>
        </div>
        <button
          onClick={() => setMode('create')}
          className="bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-2.5 rounded-xl font-medium transition-colors flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          Create Campaign
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full" />
        </div>
      ) : campaigns.length === 0 ? (
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-12 text-center">
          <div className="w-16 h-16 bg-zinc-800 rounded-full flex items-center justify-center mx-auto mb-4">
            <Megaphone className="w-8 h-8 text-zinc-500" />
          </div>
          <h3 className="text-lg font-medium text-white mb-2">No campaigns yet</h3>
          <p className="text-zinc-500 max-w-sm mx-auto mb-6">
            Create your first campaign to start reaching patients through targeted doctor networks.
          </p>
          <button
            onClick={() => setMode('create')}
            className="bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-2.5 rounded-xl font-medium transition-colors inline-flex items-center gap-2"
          >
            <Plus className="w-5 h-5" /> Create Campaign
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {campaigns.map(campaign => {
            const statusConf = STATUS_CONFIG[campaign.status] || STATUS_CONFIG['pending_review'];
            const StatusIcon = statusConf.icon;
            const totalViews = campaign.totalReach || campaign.viewBundle || 0;
            const impressions = campaign.stats?.impressions || 0;
            const progress = totalViews > 0 ? Math.min((impressions / totalViews) * 100, 100) : 0;
            const createdDate = campaign.createdAt?.toDate
              ? campaign.createdAt.toDate().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
              : '-';

            return (
              <div key={campaign.id} className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6 hover:border-zinc-700 transition-colors">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg bg-${statusConf.color}-500/10`}>
                      <StatusIcon className={`w-5 h-5 text-${statusConf.color}-500`} />
                    </div>
                    <div>
                      <h4 className="font-medium text-white">Campaign #{campaign.id.slice(-6).toUpperCase()}</h4>
                      <div className="flex items-center gap-3 text-xs text-zinc-500 mt-0.5">
                        <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {createdDate}</span>
                        <span>{campaign.zone || 'All Zones'} / {campaign.state || 'All States'}</span>
                      </div>
                    </div>
                  </div>
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-${statusConf.color}-500/10 text-${statusConf.color}-500 w-fit`}>
                    <StatusIcon className="w-3 h-3" />
                    {statusConf.label}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
                  <div>
                    <div className="text-xs text-zinc-500">Templates</div>
                    <div className="text-white font-medium">{campaign.templates?.length || 0}</div>
                  </div>
                  <div>
                    <div className="text-xs text-zinc-500">Duration</div>
                    <div className="text-white font-medium">{campaign.duration || '-'} days</div>
                  </div>
                  <div>
                    <div className="text-xs text-zinc-500">Impressions</div>
                    <div className="text-white font-medium flex items-center gap-1">
                      <Eye className="w-3 h-3 text-zinc-400" />
                      {impressions.toLocaleString()} / {totalViews.toLocaleString()}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-zinc-500">Amount</div>
                    <div className="text-emerald-400 font-bold">₹{(campaign.totalAmount || 0).toLocaleString()}</div>
                  </div>
                </div>

                {campaign.status === 'active' && totalViews > 0 && (
                  <div>
                    <div className="flex justify-between text-xs text-zinc-500 mb-1">
                      <span>Progress</span>
                      <span>{progress.toFixed(1)}%</span>
                    </div>
                    <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400 rounded-full transition-all duration-500"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}