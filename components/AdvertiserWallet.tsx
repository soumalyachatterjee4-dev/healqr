import { useState, useEffect } from 'react';
import { Wallet, ArrowUpRight, ArrowDownLeft, History, Plus, RefreshCw } from 'lucide-react';
import { db, auth } from '../lib/firebase/config';
import { doc, getDoc, collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';

interface Transaction {
  id: string;
  type: 'credit' | 'debit';
  description: string;
  amount: number;
  date: string;
  status: string;
}

export default function AdvertiserWallet() {
  const [balance, setBalance] = useState(0);
  const [totalSpent, setTotalSpent] = useState(0);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchWalletData();
  }, []);

  const fetchWalletData = async () => {
    const uid = auth.currentUser?.uid || localStorage.getItem('healqr_advertiser_id');
    if (!uid) { setLoading(false); return; }

    try {
      // Fetch advertiser profile for wallet balance
      const advDoc = await getDoc(doc(db, 'advertisers', uid));
      if (advDoc.exists()) {
        const data = advDoc.data();
        setBalance(data.walletBalance || 0);
      }

      // Fetch campaigns as transaction history
      const q = query(
        collection(db, 'advertiser_campaigns'),
        where('advertiserId', '==', uid),
        orderBy('createdAt', 'desc'),
        limit(20)
      );
      const snap = await getDocs(q);
      let spent = 0;
      const txns: Transaction[] = snap.docs.map(d => {
        const data = d.data();
        const amount = data.totalAmount || data.viewBundle || 0;
        spent += amount;
        const date = data.createdAt?.toDate
          ? data.createdAt.toDate().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
          : '-';
        return {
          id: d.id,
          type: 'debit' as const,
          description: `Campaign #${d.id.slice(-6).toUpperCase()}`,
          amount,
          date,
          status: data.status || 'unknown',
        };
      });
      setTotalSpent(spent);
      setTransactions(txns);
    } catch (error) {
      console.error('Error fetching wallet data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto space-y-8">

      {/* Balance Card */}
      <div className="bg-gradient-to-br from-zinc-900 to-black border border-zinc-800 rounded-2xl p-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl -mr-32 -mt-32"></div>
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <div className="flex items-center gap-2 text-zinc-400 mb-2">
              <Wallet className="w-5 h-5" />
              <span>Wallet Balance</span>
            </div>
            <div className="text-5xl font-bold text-white">₹{balance.toLocaleString()}</div>
            <div className="text-sm text-zinc-500 mt-2">Total spent: ₹{totalSpent.toLocaleString()}</div>
          </div>
          <div className="flex gap-3">
            <button className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2.5 rounded-xl font-medium transition-all">
              <Plus className="w-4 h-4" /> Add Funds
            </button>
            <button onClick={fetchWalletData} className="flex items-center gap-2 bg-zinc-800 hover:bg-zinc-700 text-white px-4 py-2.5 rounded-xl font-medium transition-all border border-zinc-700">
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Stats */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Campaign Spending</h3>
            <div className="flex items-end gap-2 mb-2">
              <span className="text-3xl font-bold text-white">₹{totalSpent.toLocaleString()}</span>
            </div>
            <div className="text-sm text-zinc-500 mt-1">
              Across {transactions.length} campaign{transactions.length !== 1 ? 's' : ''}
            </div>
          </div>

          <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Payment</h3>
            <p className="text-zinc-400 text-sm mb-3">
              Payments are processed securely via Razorpay at the time of campaign creation.
            </p>
            <div className="text-xs text-zinc-600">
              UPI, Cards, Net Banking supported
            </div>
          </div>
        </div>

        {/* Transaction History */}
        <div className="lg:col-span-2 bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <History className="w-5 h-5 text-zinc-400" />
              Transaction History
            </h3>
          </div>

          {transactions.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-12 h-12 bg-zinc-800 rounded-full flex items-center justify-center mx-auto mb-3">
                <History className="w-6 h-6 text-zinc-600" />
              </div>
              <p className="text-zinc-500">No transactions yet</p>
              <p className="text-zinc-600 text-xs mt-1">Campaign payments will appear here</p>
            </div>
          ) : (
            <div className="space-y-3">
              {transactions.map((tx) => (
                <div key={tx.id} className="flex items-center justify-between p-4 bg-black/40 border border-zinc-800/50 rounded-xl hover:border-zinc-700 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-full ${
                      tx.type === 'credit' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'
                    }`}>
                      {tx.type === 'credit' ? <ArrowDownLeft className="w-5 h-5" /> : <ArrowUpRight className="w-5 h-5" />}
                    </div>
                    <div>
                      <div className="font-medium text-white text-sm">{tx.description}</div>
                      <div className="text-xs text-zinc-500">{tx.date} &middot; {tx.status}</div>
                    </div>
                  </div>
                  <div className={`font-bold ${tx.type === 'credit' ? 'text-emerald-500' : 'text-white'}`}>
                    {tx.type === 'credit' ? '+' : '-'}₹{tx.amount.toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}