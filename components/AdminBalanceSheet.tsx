import { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Plus, TrendingUp, TrendingDown, DollarSign, Calendar, Download, Edit2, Trash2 } from 'lucide-react';

interface Transaction {
  id: number;
  date: string;
  type: 'credit' | 'debit';
  amount: number;
  description: string;
  category: string;
  autoFetched: boolean;
}

export default function AdminBalanceSheet() {
  const [transactions, setTransactions] = useState<Transaction[]>([
    // Auto-fetched credits (from platform revenue)
    { id: 1, date: '2025-11-01', type: 'credit', amount: 45678, description: 'Company share from subscriptions', category: 'Revenue', autoFetched: true },
    { id: 2, date: '2025-10-31', type: 'credit', amount: 23456, description: 'Premium add-on sales', category: 'Revenue', autoFetched: true },
    { id: 3, date: '2025-10-30', type: 'credit', amount: 34567, description: 'Company share from subscriptions', category: 'Revenue', autoFetched: true },
    
    // Manual debit entries
    { id: 4, date: '2025-11-01', type: 'debit', amount: 15000, description: 'Server hosting costs', category: 'Infrastructure', autoFetched: false },
    { id: 5, date: '2025-10-31', type: 'debit', amount: 8000, description: 'Marketing campaign', category: 'Marketing', autoFetched: false },
    { id: 6, date: '2025-10-30', type: 'debit', amount: 12000, description: 'Staff salaries', category: 'Payroll', autoFetched: false },
    { id: 7, date: '2025-10-29', type: 'debit', amount: 3500, description: 'Office supplies', category: 'Operational', autoFetched: false },
  ]);

  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [filterType, setFilterType] = useState<'all' | 'credit' | 'debit'>('all');
  const [dateRange, setDateRange] = useState({ from: '', to: '' });

  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    amount: '',
    description: '',
    category: 'Operational'
  });

  const handleAdd = () => {
    if (!formData.amount || !formData.description) return;

    const newTransaction: Transaction = {
      id: Date.now(),
      date: formData.date,
      type: 'debit',
      amount: parseFloat(formData.amount),
      description: formData.description,
      category: formData.category,
      autoFetched: false
    };

    setTransactions([newTransaction, ...transactions]);
    setFormData({
      date: new Date().toISOString().split('T')[0],
      amount: '',
      description: '',
      category: 'Operational'
    });
    setIsAdding(false);
  };

  const handleEdit = (id: number) => {
    const transaction = transactions.find(t => t.id === id);
    if (transaction && !transaction.autoFetched) {
      setFormData({
        date: transaction.date,
        amount: transaction.amount.toString(),
        description: transaction.description,
        category: transaction.category
      });
      setEditingId(id);
    }
  };

  const handleUpdate = () => {
    setTransactions(transactions.map(t => 
      t.id === editingId 
        ? { ...t, date: formData.date, amount: parseFloat(formData.amount), description: formData.description, category: formData.category }
        : t
    ));
    setEditingId(null);
    setFormData({
      date: new Date().toISOString().split('T')[0],
      amount: '',
      description: '',
      category: 'Operational'
    });
  };

  const handleDelete = (id: number) => {
    const transaction = transactions.find(t => t.id === id);
    if (transaction?.autoFetched) {
      alert('Cannot delete auto-fetched transactions');
      return;
    }
    if (confirm('Are you sure you want to delete this transaction?')) {
      setTransactions(transactions.filter(t => t.id !== id));
    }
  };

  // Calculate totals
  const filteredTransactions = transactions.filter(t => {
    const matchesType = filterType === 'all' || t.type === filterType;
    const matchesDate = (!dateRange.from || t.date >= dateRange.from) && 
                        (!dateRange.to || t.date <= dateRange.to);
    return matchesType && matchesDate;
  });

  const totalCredit = filteredTransactions
    .filter(t => t.type === 'credit')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalDebit = filteredTransactions
    .filter(t => t.type === 'debit')
    .reduce((sum, t) => sum + t.amount, 0);

  const balance = totalCredit - totalDebit;

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="p-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl mb-2">Balance Sheet</h1>
          <p className="text-gray-400">Track your income (auto-fetched) and expenses (manual entry)</p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-gradient-to-br from-emerald-900/30 to-emerald-900/10 border border-emerald-700/30 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-emerald-500/10 p-3 rounded-lg">
                <TrendingUp className="w-6 h-6 text-emerald-500" />
              </div>
              <div>
                <p className="text-sm text-gray-400">Total Credit</p>
                <p className="text-xs text-emerald-500">(Auto-fetched)</p>
              </div>
            </div>
            <p className="text-3xl text-emerald-500">₹{totalCredit.toLocaleString()}</p>
          </div>

          <div className="bg-gradient-to-br from-red-900/30 to-red-900/10 border border-red-700/30 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-red-500/10 p-3 rounded-lg">
                <TrendingDown className="w-6 h-6 text-red-500" />
              </div>
              <div>
                <p className="text-sm text-gray-400">Total Debit</p>
                <p className="text-xs text-red-500">(Manual Entry)</p>
              </div>
            </div>
            <p className="text-3xl text-red-500">₹{totalDebit.toLocaleString()}</p>
          </div>

          <div className={`bg-gradient-to-br ${balance >= 0 ? 'from-blue-900/30 to-blue-900/10 border-blue-700/30' : 'from-yellow-900/30 to-yellow-900/10 border-yellow-700/30'} border rounded-xl p-6`}>
            <div className="flex items-center gap-3 mb-4">
              <div className={`${balance >= 0 ? 'bg-blue-500/10' : 'bg-yellow-500/10'} p-3 rounded-lg`}>
                <DollarSign className={`w-6 h-6 ${balance >= 0 ? 'text-blue-500' : 'text-yellow-500'}`} />
              </div>
              <div>
                <p className="text-sm text-gray-400">Net Balance</p>
                <p className={`text-xs ${balance >= 0 ? 'text-blue-500' : 'text-yellow-500'}`}>(Credit - Debit)</p>
              </div>
            </div>
            <p className={`text-3xl ${balance >= 0 ? 'text-blue-500' : 'text-yellow-500'}`}>
              ₹{Math.abs(balance).toLocaleString()}
            </p>
          </div>
        </div>

        {/* Filters & Actions */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm text-gray-400 mb-2">Filter by Type</label>
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value as any)}
                  className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white"
                >
                  <option value="all">All Transactions</option>
                  <option value="credit">Credits Only</option>
                  <option value="debit">Debits Only</option>
                </select>
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-2">From Date</label>
                <Input
                  type="date"
                  value={dateRange.from}
                  onChange={(e) => setDateRange({ ...dateRange, from: e.target.value })}
                  className="bg-zinc-800 border-zinc-700"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-2">To Date</label>
                <Input
                  type="date"
                  value={dateRange.to}
                  onChange={(e) => setDateRange({ ...dateRange, to: e.target.value })}
                  className="bg-zinc-800 border-zinc-700"
                />
              </div>
            </div>

            <div className="flex gap-3 items-end">
              <Button
                onClick={() => setIsAdding(true)}
                className="bg-emerald-500 hover:bg-emerald-600"
              >
                <Plus className="w-5 h-5 mr-2" />
                Add Debit
              </Button>
              <Button
                variant="outline"
                className="border-zinc-700"
              >
                <Download className="w-5 h-5 mr-2" />
                Export
              </Button>
            </div>
          </div>
        </div>

        {/* Add/Edit Form */}
        {(isAdding || editingId) && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 mb-6">
            <h3 className="text-lg mb-4">{editingId ? 'Edit Debit Entry' : 'Add Debit Entry'}</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm text-gray-400 mb-2">Date</label>
                <Input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  className="bg-zinc-800 border-zinc-700"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-2">Amount (₹)</label>
                <Input
                  type="number"
                  placeholder="0.00"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  className="bg-zinc-800 border-zinc-700"
                />
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-sm text-gray-400 mb-2">Category</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white"
              >
                <option value="Operational">Operational</option>
                <option value="Infrastructure">Infrastructure</option>
                <option value="Marketing">Marketing</option>
                <option value="Payroll">Payroll</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div className="mb-4">
              <label className="block text-sm text-gray-400 mb-2">Description</label>
              <Textarea
                placeholder="Enter expense details..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
                className="bg-zinc-800 border-zinc-700"
              />
            </div>

            <div className="flex gap-3">
              <Button
                onClick={editingId ? handleUpdate : handleAdd}
                className="bg-emerald-500 hover:bg-emerald-600"
              >
                {editingId ? 'Update' : 'Add'} Entry
              </Button>
              <Button
                onClick={() => {
                  setIsAdding(false);
                  setEditingId(null);
                  setFormData({
                    date: new Date().toISOString().split('T')[0],
                    amount: '',
                    description: '',
                    category: 'Operational'
                  });
                }}
                variant="outline"
                className="border-zinc-700"
              >
                Cancel
              </Button>
            </div>
          </div>
        )}

        {/* Transactions Table */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-zinc-800">
                <tr>
                  <th className="text-left px-6 py-4 text-sm text-gray-400">Date</th>
                  <th className="text-left px-6 py-4 text-sm text-gray-400">Type</th>
                  <th className="text-left px-6 py-4 text-sm text-gray-400">Category</th>
                  <th className="text-left px-6 py-4 text-sm text-gray-400">Description</th>
                  <th className="text-right px-6 py-4 text-sm text-gray-400">Amount</th>
                  <th className="text-right px-6 py-4 text-sm text-gray-400">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {filteredTransactions.map(transaction => (
                  <tr key={transaction.id} className="hover:bg-zinc-800/50">
                    <td className="px-6 py-4 text-sm">{transaction.date}</td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-xs ${
                        transaction.type === 'credit' 
                          ? 'bg-emerald-500/10 text-emerald-500' 
                          : 'bg-red-500/10 text-red-500'
                      }`}>
                        {transaction.type.toUpperCase()}
                        {transaction.autoFetched && ' (Auto)'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-400">{transaction.category}</td>
                    <td className="px-6 py-4 text-sm text-gray-300">{transaction.description}</td>
                    <td className={`px-6 py-4 text-right ${
                      transaction.type === 'credit' ? 'text-emerald-500' : 'text-red-500'
                    }`}>
                      {transaction.type === 'credit' ? '+' : '-'}₹{transaction.amount.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {!transaction.autoFetched && (
                        <div className="flex gap-2 justify-end">
                          <button
                            onClick={() => handleEdit(transaction.id)}
                            className="p-2 hover:bg-zinc-700 rounded-lg text-gray-400 hover:text-emerald-500 transition-colors"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(transaction.id)}
                            className="p-2 hover:bg-zinc-700 rounded-lg text-gray-400 hover:text-red-500 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
