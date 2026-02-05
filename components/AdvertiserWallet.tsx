import { useState } from 'react';
import { Wallet, ArrowUpRight, ArrowDownLeft, History, CreditCard, Plus } from 'lucide-react';

// Mock Transaction Data
const TRANSACTIONS = [
  { id: 'tx1', type: 'debit', description: 'Campaign: Summer Health', amount: 2500, date: '2024-12-20', status: 'completed' },
  { id: 'tx2', type: 'credit', description: 'Wallet Top-up', amount: 5000, date: '2024-12-18', status: 'completed' },
  { id: 'tx3', type: 'debit', description: 'Campaign: Dental Promo', amount: 1000, date: '2024-12-15', status: 'completed' },
  { id: 'tx4', type: 'credit', description: 'Wallet Top-up', amount: 2000, date: '2024-12-10', status: 'completed' },
];

export default function AdvertiserWallet() {
  const [balance, setBalance] = useState(1500);

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto space-y-8">
      
      {/* Balance Card */}
      <div className="bg-gradient-to-br from-zinc-900 to-black border border-zinc-800 rounded-2xl p-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl -mr-32 -mt-32"></div>
        
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <div className="flex items-center gap-2 text-zinc-400 mb-2">
              <Wallet className="w-5 h-5" />
              <span>Available Balance</span>
            </div>
            <div className="text-5xl font-bold text-white">₹{balance.toLocaleString()}</div>
          </div>

          <div className="flex gap-4">
            <button className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-3 rounded-xl font-medium transition-all shadow-lg shadow-emerald-900/20">
              <Plus className="w-5 h-5" />
              Add Funds
            </button>
            <button className="flex items-center gap-2 bg-zinc-800 hover:bg-zinc-700 text-white px-6 py-3 rounded-xl font-medium transition-all border border-zinc-700">
              <CreditCard className="w-5 h-5" />
              Manage Cards
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Quick Actions / Stats */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Monthly Spending</h3>
            <div className="flex items-end gap-2 mb-2">
              <span className="text-3xl font-bold text-white">₹3,500</span>
              <span className="text-sm text-zinc-500 mb-1">/ ₹10,000 limit</span>
            </div>
            <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
              <div className="h-full bg-blue-500 w-[35%] rounded-full"></div>
            </div>
            <p className="text-xs text-zinc-500 mt-3">
              You've used 35% of your monthly budget limit.
            </p>
          </div>

          <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Payment Methods</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-black border border-zinc-800 rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-6 bg-zinc-800 rounded flex items-center justify-center text-[10px] font-bold text-zinc-400">VISA</div>
                  <div className="text-sm text-white">•••• 4242</div>
                </div>
                <span className="text-xs bg-emerald-500/10 text-emerald-500 px-2 py-1 rounded">Primary</span>
              </div>
              <button className="w-full py-3 border border-dashed border-zinc-700 text-zinc-400 rounded-xl hover:text-white hover:border-zinc-500 transition-colors text-sm">
                + Add New Method
              </button>
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
            <button className="text-sm text-emerald-500 hover:text-emerald-400">View All</button>
          </div>

          <div className="space-y-4">
            {TRANSACTIONS.map((tx) => (
              <div key={tx.id} className="flex items-center justify-between p-4 bg-black/40 border border-zinc-800/50 rounded-xl hover:border-zinc-700 transition-colors">
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-full ${
                    tx.type === 'credit' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'
                  }`}>
                    {tx.type === 'credit' ? <ArrowDownLeft className="w-5 h-5" /> : <ArrowUpRight className="w-5 h-5" />}
                  </div>
                  <div>
                    <div className="font-medium text-white">{tx.description}</div>
                    <div className="text-xs text-zinc-500">{tx.date} • {tx.status}</div>
                  </div>
                </div>
                <div className={`font-bold ${
                  tx.type === 'credit' ? 'text-emerald-500' : 'text-white'
                }`}>
                  {tx.type === 'credit' ? '+' : '-'}₹{tx.amount.toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
