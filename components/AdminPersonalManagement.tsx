import { useState, useEffect } from 'react';
import { Calendar, FileText, Plus, Save, Trash2, DollarSign, TrendingUp, Download, RefreshCw } from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { collection, query, getDocs, addDoc, deleteDoc, doc, where, orderBy, Timestamp } from 'firebase/firestore';
import { db } from '../lib/firebase/config';

type TabType = 'daily-work' | 'balance-sheet';
type OnboardStatus = 'onboard' | 'denied' | 'not-decided' | '';

interface DailyWorkEntry {
  id: string;
  date: string;
  doctorName: string;
  mobileNo: string;
  status: OnboardStatus;
  remarks: string;
}

interface DebitEntry {
  id: string;
  date: string;
  purpose: string;
  amount: number;
  method: 'CASH' | 'UPI' | 'CHEQUE';
  upiChequeNo?: string;
}

interface CreditEntry {
  id: string;
  date: string;
  source: string;
  amount: number;
  description: string;
}

export default function AdminPersonalManagement() {
  const [activeTab, setActiveTab] = useState<TabType>('daily-work');
  const [filterDate, setFilterDate] = useState<string>(''); // Date filter for viewing entries
  const [loading, setLoading] = useState(false);
  
  // Balance Sheet Date Range Filter
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  // Daily Work State
  const [dailyWorkEntries, setDailyWorkEntries] = useState<DailyWorkEntry[]>([]);

  const [newEntry, setNewEntry] = useState<DailyWorkEntry>({
    id: '',
    date: new Date().toISOString().split('T')[0],
    doctorName: '',
    mobileNo: '',
    status: '',
    remarks: ''
  });

  // Balance Sheet State
  const [debitEntries, setDebitEntries] = useState<DebitEntry[]>([]);
  const [creditEntries, setCreditEntries] = useState<CreditEntry[]>([]);

  const [newDebit, setNewDebit] = useState<DebitEntry>({
    id: '',
    date: new Date().toISOString().split('T')[0],
    purpose: '',
    amount: 0,
    method: 'CASH',
    upiChequeNo: ''
  });

  // Load data from Firestore
  const loadDailyWorkEntries = async () => {
    try {
      if (!db) return;
      
      const workDiaryRef = collection(db, 'adminWorkDiary');
      const q = query(workDiaryRef, orderBy('date', 'desc'));
      const snapshot = await getDocs(q);
      
      const entries: DailyWorkEntry[] = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as DailyWorkEntry));
      
      setDailyWorkEntries(entries);
    } catch (error) {
      console.error('Error loading daily work entries:', error);
    }
  };

  const loadDebitEntries = async () => {
    try {
      if (!db) return;
      
      const debitRef = collection(db, 'adminDebits');
      const q = query(debitRef, orderBy('date', 'desc'));
      const snapshot = await getDocs(q);
      
      const entries: DebitEntry[] = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as DebitEntry));
      
      setDebitEntries(entries);
    } catch (error) {
      console.error('Error loading debit entries:', error);
    }
  };

  const loadCreditEntries = async () => {
    try {
      if (!db) return;
      
      // Load from transactions collection (successful payments)
      const transactionsRef = collection(db, 'transactions');
      const q = query(
        transactionsRef,
        where('status', '==', 'success'),
        orderBy('createdAt', 'desc')
      );
      const snapshot = await getDocs(q);
      
      const entries: CreditEntry[] = snapshot.docs.map(doc => {
        const data = doc.data();
        const date = data.createdAt?.toDate ? data.createdAt.toDate() : new Date();
        
        return {
          id: doc.id,
          date: date.toISOString().split('T')[0],
          source: data.type === 'subscription' ? 'Subscription Payment' : 
                 data.type === 'topup' ? 'Top-up Payment' : 'Other Payment',
          amount: data.amount || 0,
          description: data.description || `Payment from ${data.doctorEmail || 'Doctor'}`
        };
      });
      
      setCreditEntries(entries);
    } catch (error) {
      console.error('Error loading credit entries:', error);
    }
  };

  const loadAllData = async () => {
    setLoading(true);
    await Promise.all([
      loadDailyWorkEntries(),
      loadDebitEntries(),
      loadCreditEntries()
    ]);
    setLoading(false);
  };

  useEffect(() => {
    loadAllData();
  }, []);

  // Filter entries based on date range
  const filterByDateRange = <T extends { date: string }>(entries: T[]): T[] => {
    if (!startDate && !endDate) return entries;
    
    return entries.filter(entry => {
      const entryDate = new Date(entry.date);
      const start = startDate ? new Date(startDate) : null;
      const end = endDate ? new Date(endDate) : null;
      
      if (start && end) {
        return entryDate >= start && entryDate <= end;
      } else if (start) {
        return entryDate >= start;
      } else if (end) {
        return entryDate <= end;
      }
      return true;
    });
  };

  const filteredCreditEntries = filterByDateRange(creditEntries);
  const filteredDebitEntries = filterByDateRange(debitEntries);

  const totalCredit = filteredCreditEntries.reduce((sum, entry) => sum + entry.amount, 0);
  const totalDebit = filteredDebitEntries.reduce((sum, entry) => sum + entry.amount, 0);
  const balance = totalCredit - totalDebit;

  const handleSaveDailyWork = async () => {
    if (!newEntry.doctorName || !newEntry.mobileNo || !newEntry.status) {
      alert('Please fill in all required fields');
      return;
    }

    try {
      if (!db) return;
      
      const workDiaryRef = collection(db, 'adminWorkDiary');
      const { id, ...entryData } = newEntry;
      
      await addDoc(workDiaryRef, entryData);
      
      setNewEntry({
        id: '',
        date: new Date().toISOString().split('T')[0],
        doctorName: '',
        mobileNo: '',
        status: '',
        remarks: ''
      });
      
      loadDailyWorkEntries();
    } catch (error) {
      console.error('Error saving daily work entry:', error);
      alert('Failed to save entry');
    }
  };

  const handleDeleteDailyWork = async (id: string) => {
    try {
      if (!db) return;
      
      await deleteDoc(doc(db, 'adminWorkDiary', id));
      loadDailyWorkEntries();
    } catch (error) {
      console.error('Error deleting daily work entry:', error);
      alert('Failed to delete entry');
    }
  };

  const handleSaveDebit = async () => {
    if (!newDebit.purpose || newDebit.amount <= 0) {
      alert('Please fill in all required fields');
      return;
    }

    if (newDebit.method !== 'CASH' && !newDebit.upiChequeNo) {
      alert('Please enter UPI/Cheque number');
      return;
    }

    try {
      if (!db) return;
      
      const debitRef = collection(db, 'adminDebits');
      const { id, ...debitData } = newDebit;
      
      await addDoc(debitRef, debitData);
      
      setNewDebit({
        id: '',
        date: new Date().toISOString().split('T')[0],
        purpose: '',
        amount: 0,
        method: 'CASH',
        upiChequeNo: ''
      });
      
      loadDebitEntries();
    } catch (error) {
      console.error('Error saving debit entry:', error);
      alert('Failed to save debit entry');
    }
  };

  const handleDeleteDebit = async (id: string) => {
    try {
      if (!db) return;
      
      await deleteDoc(doc(db, 'adminDebits', id));
      loadDebitEntries();
    } catch (error) {
      console.error('Error deleting debit entry:', error);
      alert('Failed to delete entry');
    }
  };

  const getStatusColor = (status: OnboardStatus) => {
    switch (status) {
      case 'onboard':
        return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
      case 'denied':
        return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'not-decided':
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      default:
        return 'bg-zinc-700 text-gray-300';
    }
  };

  const formatCurrency = (amount: number) => {
    return `₹${amount.toLocaleString('en-IN')}`;
  };

  return (
    <div className="flex-1 overflow-y-auto bg-black">
      <div className="p-4 md:p-8">
        {/* Header */}
        <div className="mb-6 md:mb-8 flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl mb-2 text-white">Personal Management</h1>
            <p className="text-gray-400">Manage your daily work diary and financial balance sheet</p>
          </div>
          <Button 
            onClick={loadAllData}
            disabled={loading}
            variant="outline"
            className="border-zinc-700 text-white hover:bg-zinc-800 w-full md:w-auto"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {/* Tab Navigation */}
        <div className="mb-6 flex gap-2 border-b border-zinc-800">
          <button
            onClick={() => setActiveTab('daily-work')}
            className={`flex items-center gap-2 px-6 py-3 transition-all relative ${
              activeTab === 'daily-work'
                ? 'text-emerald-500 border-b-2 border-emerald-500'
                : 'text-gray-400 hover:text-gray-300'
            }`}
          >
            <FileText className="w-5 h-5" />
            <span>Daily Work Report</span>
          </button>
          <button
            onClick={() => setActiveTab('balance-sheet')}
            className={`flex items-center gap-2 px-6 py-3 transition-all relative ${
              activeTab === 'balance-sheet'
                ? 'text-emerald-500 border-b-2 border-emerald-500'
                : 'text-gray-400 hover:text-gray-300'
            }`}
          >
            <DollarSign className="w-5 h-5" />
            <span>Balance Sheet</span>
          </button>
        </div>

        {/* Daily Work Tab */}
        {activeTab === 'daily-work' && (
          <div>
            {/* Add New Entry Form */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 mb-6">
              <h3 className="text-lg text-white mb-6 flex items-center gap-2">
                <Plus className="w-5 h-5 text-emerald-500" />
                Add New Entry
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                {/* Date */}
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Date *</label>
                  <input
                    type="date"
                    value={newEntry.date}
                    onChange={(e) => setNewEntry({ ...newEntry, date: e.target.value })}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                {/* Doctor Name */}
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Doctor Name *</label>
                  <input
                    type="text"
                    value={newEntry.doctorName}
                    onChange={(e) => setNewEntry({ ...newEntry, doctorName: e.target.value })}
                    placeholder="Enter doctor name"
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                {/* Mobile No */}
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Mobile Number *</label>
                  <input
                    type="tel"
                    value={newEntry.mobileNo}
                    onChange={(e) => setNewEntry({ ...newEntry, mobileNo: e.target.value })}
                    placeholder="+91 XXXXX XXXXX"
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                {/* Status */}
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Status *</label>
                  <select
                    value={newEntry.status}
                    onChange={(e) => setNewEntry({ ...newEntry, status: e.target.value as OnboardStatus })}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="">Select Status</option>
                    <option value="onboard">Onboard</option>
                    <option value="denied">Denied</option>
                    <option value="not-decided">Not Decided</option>
                  </select>
                </div>
              </div>

              {/* Remarks */}
              <div className="mb-6">
                <label className="block text-sm text-gray-400 mb-2">Remarks</label>
                <textarea
                  value={newEntry.remarks}
                  onChange={(e) => setNewEntry({ ...newEntry, remarks: e.target.value })}
                  placeholder="Add any additional notes or remarks..."
                  rows={3}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* Save Button */}
              <Button
                onClick={handleSaveDailyWork}
                className="bg-emerald-500 hover:bg-emerald-600 text-white"
              >
                <Save className="w-4 h-4 mr-2" />
                Save Entry
              </Button>
            </div>

            {/* Date Filter & Entries List */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg text-white flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-emerald-500" />
                  Work Diary ({dailyWorkEntries.length} total entries)
                </h3>
              </div>

              {/* Date Filter */}
              <div className="mb-6">
                <label className="block text-sm text-gray-400 mb-2">Filter by Date</label>
                <div className="flex items-center gap-3">
                  <input
                    type="date"
                    value={filterDate}
                    onChange={(e) => setFilterDate(e.target.value)}
                    className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  {filterDate && (
                    <Button
                      onClick={() => setFilterDate('')}
                      variant="outline"
                      className="border-zinc-700 text-gray-400 hover:bg-zinc-800"
                    >
                      Clear Filter
                    </Button>
                  )}
                </div>
              </div>

              {/* Filtered Entries */}
              <div className="space-y-4">
                {!filterDate ? (
                  <div className="text-center py-12">
                    <Calendar className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                    <p className="text-gray-500">Select a date to view entries</p>
                  </div>
                ) : dailyWorkEntries.filter(entry => entry.date === filterDate).length === 0 ? (
                  <div className="text-center py-12">
                    <FileText className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                    <p className="text-gray-500">No entries found for {new Date(filterDate).toLocaleDateString('en-IN')}</p>
                  </div>
                ) : (
                  dailyWorkEntries
                    .filter(entry => entry.date === filterDate)
                    .map((entry) => (
                      <div
                        key={entry.id}
                        className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-4 hover:bg-zinc-800 transition-colors"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <h4 className="text-white font-medium">{entry.doctorName}</h4>
                              <Badge className={getStatusColor(entry.status)}>
                                {entry.status.charAt(0).toUpperCase() + entry.status.slice(1).replace('-', ' ')}
                              </Badge>
                            </div>
                            <p className="text-sm text-gray-400">{entry.mobileNo}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-500">{new Date(entry.date).toLocaleDateString('en-IN')}</span>
                            <button
                              onClick={() => handleDeleteDailyWork(entry.id)}
                              className="text-red-500 hover:text-red-400 p-2 hover:bg-red-500/10 rounded-lg transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                        {entry.remarks && (
                          <p className="text-sm text-gray-400 bg-zinc-900/50 rounded p-3 border border-zinc-700/50">
                            {entry.remarks}
                          </p>
                        )}
                      </div>
                    ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* Balance Sheet Tab */}
        {activeTab === 'balance-sheet' && (
          <div>
            {/* Date Range Filter */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 mb-6">
              <h3 className="text-lg text-white mb-4 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-emerald-500" />
                Filter by Date Range
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-2">From Date</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-2">To Date</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div className="flex items-end">
                  {(startDate || endDate) && (
                    <Button
                      onClick={() => {
                        setStartDate('');
                        setEndDate('');
                      }}
                      variant="outline"
                      className="w-full border-zinc-700 text-gray-400 hover:bg-zinc-800"
                    >
                      Clear Filter
                    </Button>
                  )}
                  {!startDate && !endDate && (
                    <div className="w-full flex items-center justify-center text-sm text-gray-500 py-3">
                      Select date range to filter
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Balance Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              {/* Total Credit */}
              <div className="bg-gradient-to-br from-emerald-900/30 to-emerald-900/10 border border-emerald-700/30 rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="bg-emerald-500/10 p-3 rounded-lg">
                    <TrendingUp className="w-6 h-6 text-emerald-500" />
                  </div>
                  <Badge className="bg-emerald-500/20 text-emerald-400">Auto-Generated</Badge>
                </div>
                <h3 className="text-2xl md:text-3xl mb-1 text-white">{formatCurrency(totalCredit)}</h3>
                <p className="text-sm text-gray-400">Total Credit</p>
                <p className="text-xs text-gray-500 mt-2">{filteredCreditEntries.length} transactions</p>
              </div>

              {/* Total Debit */}
              <div className="bg-gradient-to-br from-red-900/30 to-red-900/10 border border-red-700/30 rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="bg-red-500/10 p-3 rounded-lg">
                    <DollarSign className="w-6 h-6 text-red-500" />
                  </div>
                  <Badge className="bg-red-500/20 text-red-400">Manual</Badge>
                </div>
                <h3 className="text-2xl md:text-3xl mb-1 text-white">{formatCurrency(totalDebit)}</h3>
                <p className="text-sm text-gray-400">Total Debit</p>
                <p className="text-xs text-gray-500 mt-2">{filteredDebitEntries.length} transactions</p>
              </div>

              {/* Balance */}
              <div className={`bg-gradient-to-br ${balance >= 0 ? 'from-blue-900/30 to-blue-900/10 border-blue-700/30' : 'from-orange-900/30 to-orange-900/10 border-orange-700/30'} border rounded-xl p-6`}>
                <div className="flex items-center justify-between mb-4">
                  <div className={`${balance >= 0 ? 'bg-blue-500/10' : 'bg-orange-500/10'} p-3 rounded-lg`}>
                    <DollarSign className={`w-6 h-6 ${balance >= 0 ? 'text-blue-500' : 'text-orange-500'}`} />
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-zinc-700"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Export
                  </Button>
                </div>
                <h3 className={`text-2xl md:text-3xl mb-1 ${balance >= 0 ? 'text-blue-500' : 'text-orange-500'}`}>
                  {formatCurrency(balance)}
                </h3>
                <p className="text-sm text-gray-400">Current Balance</p>
                <p className="text-xs text-gray-500 mt-2">{balance >= 0 ? 'Surplus' : 'Deficit'}</p>
              </div>
            </div>

            {/* Add Debit Entry Form */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 mb-6">
              <h3 className="text-lg text-white mb-6 flex items-center gap-2">
                <Plus className="w-5 h-5 text-emerald-500" />
                Add Debit Entry
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                {/* Date */}
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Date *</label>
                  <input
                    type="date"
                    value={newDebit.date}
                    onChange={(e) => setNewDebit({ ...newDebit, date: e.target.value })}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                {/* Purpose */}
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Debit Purpose *</label>
                  <input
                    type="text"
                    value={newDebit.purpose}
                    onChange={(e) => setNewDebit({ ...newDebit, purpose: e.target.value })}
                    placeholder="e.g., Office Rent, Marketing"
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                {/* Amount */}
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Debit Amount *</label>
                  <input
                    type="number"
                    value={newDebit.amount || ''}
                    onChange={(e) => setNewDebit({ ...newDebit, amount: parseFloat(e.target.value) || 0 })}
                    placeholder="0"
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                {/* Payment Method */}
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Debit Method *</label>
                  <select
                    value={newDebit.method}
                    onChange={(e) => setNewDebit({ ...newDebit, method: e.target.value as 'CASH' | 'UPI' | 'CHEQUE' })}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="CASH">CASH</option>
                    <option value="UPI">UPI</option>
                    <option value="CHEQUE">CHEQUE</option>
                  </select>
                </div>

                {/* UPI/Cheque Number (conditional) */}
                {newDebit.method !== 'CASH' && (
                  <div className="md:col-span-2">
                    <label className="block text-sm text-gray-400 mb-2">
                      {newDebit.method === 'UPI' ? 'UPI Transaction ID' : 'Cheque Number'} *
                    </label>
                    <input
                      type="text"
                      value={newDebit.upiChequeNo || ''}
                      onChange={(e) => setNewDebit({ ...newDebit, upiChequeNo: e.target.value })}
                      placeholder={newDebit.method === 'UPI' ? 'Enter UPI transaction ID' : 'Enter cheque number'}
                      className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                )}
              </div>

              {/* Save Button */}
              <Button
                onClick={handleSaveDebit}
                className="bg-emerald-500 hover:bg-emerald-600 text-white"
              >
                <Save className="w-4 h-4 mr-2" />
                Save Debit Entry
              </Button>
            </div>

            {/* Credit & Debit Tables */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Credit Entries (Auto-Generated) */}
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg text-white flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-emerald-500" />
                    Credit Entries
                  </h3>
                  <Badge className="bg-emerald-500/20 text-emerald-400">System Generated</Badge>
                </div>

                <div className="space-y-3">
                  {filteredCreditEntries.length === 0 ? (
                    <div className="text-center py-12">
                      <TrendingUp className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                      <p className="text-gray-500">No credit entries found for selected date range</p>
                    </div>
                  ) : (
                    filteredCreditEntries.map((entry) => (
                      <div
                        key={entry.id}
                        className="bg-zinc-800/50 border border-emerald-700/30 rounded-lg p-4"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <h4 className="text-white font-medium mb-1">{entry.source}</h4>
                            <p className="text-xs text-gray-500">{entry.description}</p>
                          </div>
                          <span className="text-emerald-500 font-medium">+{formatCurrency(entry.amount)}</span>
                        </div>
                        <p className="text-xs text-gray-500">{new Date(entry.date).toLocaleDateString('en-IN')}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Debit Entries (Manual) */}
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg text-white flex items-center gap-2">
                    <DollarSign className="w-5 h-5 text-red-500" />
                    Debit Entries
                  </h3>
                  <Badge className="bg-red-500/20 text-red-400">Manual Entry</Badge>
                </div>

                <div className="space-y-3">
                  {filteredDebitEntries.length === 0 ? (
                    <div className="text-center py-12">
                      <DollarSign className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                      <p className="text-gray-500">
                        {debitEntries.length === 0 
                          ? 'No debit entries yet. Add one above.' 
                          : 'No debit entries found for selected date range'}
                      </p>
                    </div>
                  ) : (
                    filteredDebitEntries.map((entry) => (
                      <div
                        key={entry.id}
                        className="bg-zinc-800/50 border border-red-700/30 rounded-lg p-4"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <h4 className="text-white font-medium mb-1">{entry.purpose}</h4>
                            <div className="flex items-center gap-2">
                              <Badge className="bg-zinc-700 text-gray-300">{entry.method}</Badge>
                              {entry.upiChequeNo && (
                                <span className="text-xs text-gray-500">{entry.upiChequeNo}</span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-red-500 font-medium">-{formatCurrency(entry.amount)}</span>
                            <button
                              onClick={() => handleDeleteDebit(entry.id)}
                              className="text-red-500 hover:text-red-400 p-1 hover:bg-red-500/10 rounded transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                        <p className="text-xs text-gray-500">{new Date(entry.date).toLocaleDateString('en-IN')}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

