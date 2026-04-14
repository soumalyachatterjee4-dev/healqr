import { useState, useEffect, useMemo } from 'react';
import {
  Menu, Package, Plus, Trash2, Search, AlertTriangle, Edit2,
  Check, X, ChevronDown, ChevronUp, Calendar, Filter,
  Archive, ShoppingCart, TrendingDown
} from 'lucide-react';
import ClinicSidebar from './ClinicSidebar';
import { db, auth } from '../lib/firebase/config';
import {
  collection, query, getDocs, doc, addDoc, updateDoc, deleteDoc,
  serverTimestamp, orderBy
} from 'firebase/firestore';
import { toast } from 'sonner';

interface ClinicInventoryManagerProps {
  onMenuChange?: (menu: string) => void;
  onLogout?: () => void | Promise<void>;
  activeAddOns?: string[];
}

interface InventoryItem {
  id: string;
  name: string;
  category: string;
  quantity: number;
  unit: string;
  minStock: number;
  costPerUnit: number;
  supplier: string;
  expiryDate: string;
  lastRestocked: string;
  notes: string;
}

interface StockLog {
  id: string;
  itemId: string;
  itemName: string;
  type: 'in' | 'out';
  quantity: number;
  costAmount: number;
  note: string;
  date: string;
}

const CATEGORIES = [
  'Medical Supplies', 'Stationery', 'Instruments', 'Consumables',
  'Medicines', 'Lab Supplies', 'Cleaning', 'Equipment', 'Other'
];

const UNITS = ['pcs', 'boxes', 'packs', 'bottles', 'rolls', 'tubes', 'sets', 'kg', 'litre', 'ml'];

export default function ClinicInventoryManager({ onMenuChange = () => {}, onLogout, activeAddOns = [] }: ClinicInventoryManagerProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [stockLogs, setStockLogs] = useState<StockLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'low' | 'expiring' | 'out'>('all');
  const [showStockModal, setShowStockModal] = useState<{ item: InventoryItem; type: 'in' | 'out' } | null>(null);
  const [stockQty, setStockQty] = useState('');
  const [stockCost, setStockCost] = useState('');
  const [stockNote, setStockNote] = useState('');
  const [sortField, setSortField] = useState<'name' | 'quantity' | 'category' | 'expiry'>('name');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const [form, setForm] = useState({
    name: '', category: 'Medical Supplies', quantity: '', unit: 'pcs',
    minStock: '5', costPerUnit: '', supplier: '', expiryDate: '', notes: ''
  });

  const isLocationManager = localStorage.getItem('healqr_is_location_manager') === 'true';
  const isAssistant = localStorage.getItem('healqr_is_assistant') === 'true';
  const clinicId = isLocationManager
    ? localStorage.getItem('healqr_parent_clinic_id') || auth?.currentUser?.uid || ''
    : isAssistant
    ? localStorage.getItem('healqr_assistant_doctor_id') || auth?.currentUser?.uid || ''
    : auth?.currentUser?.uid || '';

  useEffect(() => { if (clinicId) { loadItems(); loadLogs(); } }, [clinicId]);

  const loadItems = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, `clinics/${clinicId}/inventory`), orderBy('name'));
      const snap = await getDocs(q);
      setItems(snap.docs.map(d => ({ id: d.id, ...d.data() } as InventoryItem)));
    } catch (err) {
      console.error('Error loading inventory:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadLogs = async () => {
    try {
      const q = query(collection(db, `clinics/${clinicId}/stockLogs`), orderBy('date', 'desc'));
      const snap = await getDocs(q);
      setStockLogs(snap.docs.map(d => ({ id: d.id, ...d.data() } as StockLog)).slice(0, 50));
    } catch {}
  };

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error('Item name required'); return; }
    const qty = parseInt(form.quantity) || 0;
    const payload = {
      name: form.name.trim(),
      category: form.category,
      quantity: qty,
      unit: form.unit,
      minStock: parseInt(form.minStock) || 5,
      costPerUnit: parseFloat(form.costPerUnit) || 0,
      supplier: form.supplier.trim(),
      expiryDate: form.expiryDate,
      notes: form.notes.trim(),
      lastRestocked: new Date().toISOString().split('T')[0],
      updatedAt: serverTimestamp(),
    };
    try {
      if (editingItem) {
        await updateDoc(doc(db, `clinics/${clinicId}/inventory`, editingItem.id), payload);
        toast.success('Item updated');
      } else {
        await addDoc(collection(db, `clinics/${clinicId}/inventory`), { ...payload, createdAt: serverTimestamp() });
        toast.success('Item added');
      }
      resetForm();
      loadItems();
    } catch {
      toast.error('Failed to save');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this item?')) return;
    try {
      await deleteDoc(doc(db, `clinics/${clinicId}/inventory`, id));
      toast.success('Item deleted');
      loadItems();
    } catch { toast.error('Failed to delete'); }
  };

  const handleStockUpdate = async () => {
    if (!showStockModal || !stockQty) return;
    const q = parseInt(stockQty);
    if (!q || q <= 0) { toast.error('Enter valid quantity'); return; }
    const { item, type } = showStockModal;
    const newQty = type === 'in' ? item.quantity + q : Math.max(0, item.quantity - q);
    try {
      await updateDoc(doc(db, `clinics/${clinicId}/inventory`, item.id), {
        quantity: newQty,
        lastRestocked: type === 'in' ? new Date().toISOString().split('T')[0] : item.lastRestocked,
        updatedAt: serverTimestamp(),
      });
      const cost = parseFloat(stockCost) || (q * item.costPerUnit);
      await addDoc(collection(db, `clinics/${clinicId}/stockLogs`), {
        itemId: item.id, itemName: item.name, type, quantity: q,
        costAmount: cost,
        note: stockNote.trim(), date: new Date().toISOString(),
      });
      toast.success(`Stock ${type === 'in' ? 'added' : 'used'}: ${q} ${item.unit} (₹${cost.toLocaleString('en-IN')})`);
      setShowStockModal(null); setStockQty(''); setStockCost(''); setStockNote('');
      loadItems(); loadLogs();
    } catch { toast.error('Failed to update stock'); }
  };

  const startEdit = (item: InventoryItem) => {
    setEditingItem(item);
    setForm({
      name: item.name, category: item.category, quantity: item.quantity.toString(), unit: item.unit,
      minStock: item.minStock.toString(), costPerUnit: item.costPerUnit.toString(),
      supplier: item.supplier, expiryDate: item.expiryDate, notes: item.notes
    });
    setShowAddModal(true);
  };

  const resetForm = () => {
    setForm({ name: '', category: 'Medical Supplies', quantity: '', unit: 'pcs', minStock: '5', costPerUnit: '', supplier: '', expiryDate: '', notes: '' });
    setEditingItem(null);
    setShowAddModal(false);
  };

  const today = new Date().toISOString().split('T')[0];
  const in30Days = new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0];

  const filtered = useMemo(() => {
    let list = [...items];
    if (searchTerm) list = list.filter(i => i.name.toLowerCase().includes(searchTerm.toLowerCase()) || i.supplier.toLowerCase().includes(searchTerm.toLowerCase()));
    if (filterCategory !== 'all') list = list.filter(i => i.category === filterCategory);
    if (filterStatus === 'low') list = list.filter(i => i.quantity > 0 && i.quantity <= i.minStock);
    if (filterStatus === 'out') list = list.filter(i => i.quantity === 0);
    if (filterStatus === 'expiring') list = list.filter(i => i.expiryDate && i.expiryDate <= in30Days && i.expiryDate >= today);
    list.sort((a, b) => {
      let cmp = 0;
      if (sortField === 'name') cmp = a.name.localeCompare(b.name);
      else if (sortField === 'quantity') cmp = a.quantity - b.quantity;
      else if (sortField === 'category') cmp = a.category.localeCompare(b.category);
      else if (sortField === 'expiry') cmp = (a.expiryDate || 'z').localeCompare(b.expiryDate || 'z');
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return list;
  }, [items, searchTerm, filterCategory, filterStatus, sortField, sortDir]);

  const stats = useMemo(() => {
    const totalItems = items.length;
    const lowStock = items.filter(i => i.quantity > 0 && i.quantity <= i.minStock).length;
    const outOfStock = items.filter(i => i.quantity === 0).length;
    const expiringSoon = items.filter(i => i.expiryDate && i.expiryDate <= in30Days && i.expiryDate >= today).length;
    const totalValue = items.reduce((s, i) => s + i.quantity * i.costPerUnit, 0);
    const totalCredit = stockLogs.filter(l => l.type === 'out').reduce((s, l) => s + (l.costAmount || 0), 0);
    const totalDebit = stockLogs.filter(l => l.type === 'in').reduce((s, l) => s + (l.costAmount || 0), 0);
    return { totalItems, lowStock, outOfStock, expiringSoon, totalValue, totalCredit, totalDebit };
  }, [items, stockLogs]);

  const toggleSort = (field: typeof sortField) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('asc'); }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white overflow-x-hidden">
      <ClinicSidebar
        activeMenu="inventory-manager"
        onMenuChange={onMenuChange}
        onLogout={onLogout || (() => {})}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        activeAddOns={activeAddOns}
      />

      <div className="transition-all duration-300 lg:ml-64">
        {/* HEADER */}
        <header className="sticky top-0 z-20 px-4 lg:px-8 py-3 flex items-center gap-3 bg-zinc-950/80 backdrop-blur-sm border-b border-zinc-800">
          <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-blue-500">
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-3 flex-1">
            <div className="p-2 rounded-xl bg-blue-500/20">
              <Package className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white">Inventory Manager</h1>
              <p className="text-xs text-zinc-500">Track all clinic supplies & consumables</p>
            </div>
          </div>
          <button onClick={() => { resetForm(); setShowAddModal(true); }}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-semibold transition">
            <Plus className="w-4 h-4" /> Add Item
          </button>
        </header>

        <div className="px-4 lg:px-8 py-6 max-w-7xl mx-auto space-y-5 overflow-hidden">
          {/* STATS */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
            {[
              { label: 'Total Items', value: stats.totalItems, icon: Package, color: 'text-blue-400' },
              { label: 'Low Stock', value: stats.lowStock, icon: TrendingDown, color: 'text-yellow-400' },
              { label: 'Out of Stock', value: stats.outOfStock, icon: AlertTriangle, color: 'text-red-400' },
              { label: 'Expiring Soon', value: stats.expiringSoon, icon: Calendar, color: 'text-purple-400' },
              { label: 'Stock Value', value: `₹${stats.totalValue.toLocaleString('en-IN')}`, icon: ShoppingCart, color: 'text-emerald-400' },
              { label: 'Purchased', value: `₹${stats.totalDebit.toLocaleString('en-IN')}`, icon: TrendingDown, color: 'text-rose-400' },
              { label: 'Used', value: `₹${stats.totalCredit.toLocaleString('en-IN')}`, icon: Archive, color: 'text-sky-400' },
            ].map((s, i) => (
              <div key={i} className="bg-zinc-900 border border-zinc-800 rounded-xl p-3">
                <div className="flex items-center gap-2 mb-1">
                  <s.icon className={`w-4 h-4 ${s.color}`} />
                  <span className="text-[10px] text-zinc-400 uppercase tracking-wider">{s.label}</span>
                </div>
                <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
              </div>
            ))}
          </div>

          {/* FILTERS */}
          <div className="flex flex-wrap gap-2 items-center">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
              <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                placeholder="Search items or suppliers..."
                className="w-full pl-10 pr-3 py-2 bg-black/50 border border-zinc-800 rounded-xl text-white text-sm placeholder-zinc-600 focus:outline-none focus:border-blue-500" />
            </div>
            <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)}
              className="px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-white text-sm focus:outline-none">
              <option value="all">All Categories</option>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <div className="flex gap-1 bg-zinc-900 rounded-xl p-0.5 border border-zinc-800">
              {(['all', 'low', 'out', 'expiring'] as const).map(f => (
                <button key={f} onClick={() => setFilterStatus(f)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${filterStatus === f ? 'bg-blue-600 text-white' : 'text-zinc-400 hover:text-white'}`}>
                  {f === 'all' ? 'All' : f === 'low' ? '⚠ Low' : f === 'out' ? '❌ Out' : '⏰ Expiring'}
                </button>
              ))}
            </div>
          </div>

          {/* TABLE */}
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="animate-spin w-7 h-7 border-2 border-blue-500 border-t-transparent rounded-full mb-3" />
              <p className="text-zinc-500 text-sm">Loading inventory...</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16">
              <Package className="w-12 h-12 mx-auto text-zinc-700 mb-3" />
              <p className="text-zinc-400">{items.length === 0 ? 'No items yet. Add your first inventory item.' : 'No items match filters.'}</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-zinc-800 max-w-[calc(100vw-2rem)] lg:max-w-none">
              <table className="min-w-[700px] w-full text-sm">
                <thead>
                  <tr className="bg-zinc-900 text-zinc-400 text-left">
                    {[
                      { key: 'name' as const, label: 'Item' },
                      { key: 'category' as const, label: 'Category' },
                      { key: 'quantity' as const, label: 'Stock' },
                      { key: 'expiry' as const, label: 'Expiry' },
                    ].map(col => (
                      <th key={col.key} className="px-4 py-3 font-medium cursor-pointer hover:text-white transition" onClick={() => toggleSort(col.key)}>
                        <div className="flex items-center gap-1">
                          {col.label}
                          {sortField === col.key && (sortDir === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
                        </div>
                      </th>
                    ))}
                    <th className="px-4 py-3 font-medium">Cost</th>
                    <th className="px-4 py-3 font-medium">Supplier</th>
                    <th className="px-4 py-3 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/50">
                  {filtered.map(item => {
                    const isLow = item.quantity > 0 && item.quantity <= item.minStock;
                    const isOut = item.quantity === 0;
                    const isExpiring = item.expiryDate && item.expiryDate <= in30Days && item.expiryDate >= today;
                    const isExpired = item.expiryDate && item.expiryDate < today;
                    return (
                      <tr key={item.id} className="hover:bg-zinc-900/50 transition">
                        <td className="px-4 py-3">
                          <span className="text-white font-medium">{item.name}</span>
                          {item.notes && <p className="text-xs text-zinc-600 mt-0.5">{item.notes}</p>}
                        </td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-0.5 rounded-md bg-zinc-800 text-zinc-300 text-xs">{item.category}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`font-bold ${isOut ? 'text-red-400' : isLow ? 'text-yellow-400' : 'text-emerald-400'}`}>
                            {item.quantity}
                          </span>
                          <span className="text-zinc-500 ml-1">{item.unit}</span>
                          {isLow && <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded bg-yellow-500/20 text-yellow-400">LOW</span>}
                          {isOut && <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded bg-red-500/20 text-red-400">OUT</span>}
                          <p className="text-[10px] text-zinc-600">min: {item.minStock}</p>
                        </td>
                        <td className="px-4 py-3">
                          {item.expiryDate ? (
                            <span className={`text-xs ${isExpired ? 'text-red-400 font-bold' : isExpiring ? 'text-amber-400' : 'text-zinc-400'}`}>
                              {isExpired ? '⛔ ' : isExpiring ? '⚠️ ' : ''}{item.expiryDate}
                            </span>
                          ) : <span className="text-zinc-600 text-xs">N/A</span>}
                        </td>
                        <td className="px-4 py-3 text-zinc-300 text-xs">₹{item.costPerUnit}/{item.unit}</td>
                        <td className="px-4 py-3 text-zinc-400 text-xs">{item.supplier || '-'}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1 justify-end">
                            <button onClick={() => setShowStockModal({ item, type: 'in' })} title="Stock In"
                              className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition">
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => setShowStockModal({ item, type: 'out' })} title="Use/Remove"
                              className="p-1.5 rounded-lg bg-orange-500/10 text-orange-400 hover:bg-orange-500/20 transition">
                              <Archive className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => startEdit(item)} title="Edit"
                              className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 transition">
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => handleDelete(item.id)} title="Delete"
                              className="p-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* QUICK STOCK IN / OUT */}
          {items.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
                <h3 className="text-sm font-semibold text-emerald-400 flex items-center gap-2 mb-3">
                  <Plus className="w-4 h-4" /> Quick Stock In (Purchase)
                </h3>
                <p className="text-[11px] text-zinc-400 mb-2">Select an item to add newly purchased stock</p>
                <div className="flex flex-wrap gap-2">
                  {items.slice(0, 12).map(item => (
                    <button key={item.id} onClick={() => setShowStockModal({ item, type: 'in' })}
                      className="px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-300 text-xs font-medium hover:bg-emerald-500/20 transition border border-emerald-500/20">
                      {item.name} <span className="text-emerald-500/60">({item.quantity})</span>
                    </button>
                  ))}
                </div>
              </div>
              <div className="rounded-xl border border-orange-500/20 bg-orange-500/5 p-4">
                <h3 className="text-sm font-semibold text-orange-400 flex items-center gap-2 mb-3">
                  <Archive className="w-4 h-4" /> Quick Stock Out (Used/Consumed)
                </h3>
                <p className="text-[11px] text-zinc-400 mb-2">Select an item to record usage or consumption</p>
                <div className="flex flex-wrap gap-2">
                  {items.filter(i => i.quantity > 0).slice(0, 12).map(item => (
                    <button key={item.id} onClick={() => setShowStockModal({ item, type: 'out' })}
                      className="px-3 py-1.5 rounded-lg bg-orange-500/10 text-orange-300 text-xs font-medium hover:bg-orange-500/20 transition border border-orange-500/20">
                      {item.name} <span className="text-orange-500/60">({item.quantity})</span>
                    </button>
                  ))}
                  {items.filter(i => i.quantity > 0).length === 0 && (
                    <p className="text-xs text-zinc-500">All items are out of stock</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* RECENT LOG */}
          {stockLogs.length > 0 && (
            <div className="rounded-xl border border-zinc-800 bg-zinc-900 overflow-hidden">
              <div className="px-4 py-3 border-b border-zinc-800 flex items-center gap-2">
                <Archive className="w-4 h-4 text-blue-400" />
                <h3 className="text-sm font-semibold text-white">Recent Stock Activity</h3>
              </div>
              <div className="max-h-48 overflow-y-auto divide-y divide-zinc-800/50">
                {stockLogs.slice(0, 15).map(log => (
                  <div key={log.id} className="px-4 py-2 flex items-center gap-3 text-xs">
                    <span className={`px-1.5 py-0.5 rounded font-bold ${log.type === 'in' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-orange-500/20 text-orange-400'}`}>
                      {log.type === 'in' ? '+' : '-'}{log.quantity}
                    </span>
                    <span className="text-white flex-1">{log.itemName}</span>
                    {log.costAmount > 0 && <span className={`font-semibold ${log.type === 'in' ? 'text-rose-400' : 'text-sky-400'}`}>₹{log.costAmount.toLocaleString('en-IN')}</span>}
                    {log.note && <span className="text-zinc-500">{log.note}</span>}
                    <span className="text-zinc-600">{new Date(log.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ADD / EDIT MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={resetForm}>
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-5 space-y-3" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-white">{editingItem ? 'Edit Item' : 'Add Inventory Item'}</h2>
              <button onClick={resetForm} className="p-1.5 rounded-lg bg-zinc-800 text-zinc-400 hover:text-white"><X className="w-4 h-4" /></button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="text-xs text-zinc-400 mb-1 block">Item Name *</label>
                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  className="w-full px-3 py-2 bg-black/50 border border-zinc-800 rounded-xl text-white text-sm focus:outline-none focus:border-blue-500" placeholder="e.g., Cotton Rolls" />
              </div>
              <div>
                <label className="text-xs text-zinc-400 mb-1 block">Category</label>
                <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                  className="w-full px-3 py-2 bg-black/50 border border-zinc-800 rounded-xl text-white text-sm focus:outline-none">
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-zinc-400 mb-1 block">Unit</label>
                <select value={form.unit} onChange={e => setForm(f => ({ ...f, unit: e.target.value }))}
                  className="w-full px-3 py-2 bg-black/50 border border-zinc-800 rounded-xl text-white text-sm focus:outline-none">
                  {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-zinc-400 mb-1 block">Current Qty</label>
                <input type="number" value={form.quantity} onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))}
                  className="w-full px-3 py-2 bg-black/50 border border-zinc-800 rounded-xl text-white text-sm focus:outline-none focus:border-blue-500" placeholder="0" />
              </div>
              <div>
                <label className="text-xs text-zinc-400 mb-1 block">Min Stock Alert</label>
                <input type="number" value={form.minStock} onChange={e => setForm(f => ({ ...f, minStock: e.target.value }))}
                  className="w-full px-3 py-2 bg-black/50 border border-zinc-800 rounded-xl text-white text-sm focus:outline-none focus:border-blue-500" placeholder="5" />
              </div>
              <div>
                <label className="text-xs text-zinc-400 mb-1 block">Cost/Unit (₹)</label>
                <input type="number" value={form.costPerUnit} onChange={e => setForm(f => ({ ...f, costPerUnit: e.target.value }))}
                  className="w-full px-3 py-2 bg-black/50 border border-zinc-800 rounded-xl text-white text-sm focus:outline-none focus:border-blue-500" placeholder="0" />
              </div>
              <div>
                <label className="text-xs text-zinc-400 mb-1 block">Expiry Date</label>
                <input type="date" value={form.expiryDate} onChange={e => setForm(f => ({ ...f, expiryDate: e.target.value }))}
                  className="w-full px-3 py-2 bg-black/50 border border-zinc-800 rounded-xl text-white text-sm focus:outline-none focus:border-blue-500" />
              </div>
              <div className="col-span-2">
                <label className="text-xs text-zinc-400 mb-1 block">Supplier</label>
                <input value={form.supplier} onChange={e => setForm(f => ({ ...f, supplier: e.target.value }))}
                  className="w-full px-3 py-2 bg-black/50 border border-zinc-800 rounded-xl text-white text-sm focus:outline-none focus:border-blue-500" placeholder="Supplier name" />
              </div>
              <div className="col-span-2">
                <label className="text-xs text-zinc-400 mb-1 block">Notes</label>
                <input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  className="w-full px-3 py-2 bg-black/50 border border-zinc-800 rounded-xl text-white text-sm focus:outline-none focus:border-blue-500" placeholder="Optional notes" />
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <button onClick={resetForm} className="flex-1 py-2 rounded-xl bg-zinc-800 text-zinc-300 text-sm hover:bg-zinc-700 transition">Cancel</button>
              <button onClick={handleSave} className="flex-1 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold transition">
                {editingItem ? 'Update' : 'Add Item'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* STOCK IN/OUT MODAL */}
      {showStockModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowStockModal(null)}>
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-sm p-5 space-y-3" onClick={e => e.stopPropagation()}>
            <h2 className={`text-lg font-bold ${showStockModal.type === 'in' ? 'text-emerald-400' : 'text-orange-400'}`}>
              {showStockModal.type === 'in' ? '📦 Stock In' : '📤 Stock Out'}: {showStockModal.item.name}
            </h2>
            <p className="text-xs text-zinc-400">Current: {showStockModal.item.quantity} {showStockModal.item.unit} • Cost/unit: ₹{showStockModal.item.costPerUnit}</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-zinc-400 mb-1 block">Quantity *</label>
                <input type="number" value={stockQty} onChange={e => setStockQty(e.target.value)} autoFocus
                  className="w-full px-3 py-2 bg-black/50 border border-zinc-800 rounded-xl text-white text-sm focus:outline-none focus:border-blue-500" placeholder="Qty" />
              </div>
              <div>
                <label className="text-xs text-zinc-400 mb-1 block">Total Cost (₹)</label>
                <input type="number" value={stockCost} onChange={e => setStockCost(e.target.value)}
                  placeholder={stockQty ? `${(parseInt(stockQty) || 0) * showStockModal.item.costPerUnit}` : 'Auto'}
                  className="w-full px-3 py-2 bg-black/50 border border-zinc-800 rounded-xl text-white text-sm focus:outline-none focus:border-blue-500" />
              </div>
            </div>
            <div>
              <label className="text-xs text-zinc-400 mb-1 block">Note (optional)</label>
              <input value={stockNote} onChange={e => setStockNote(e.target.value)}
                className="w-full px-3 py-2 bg-black/50 border border-zinc-800 rounded-xl text-white text-sm focus:outline-none focus:border-blue-500" placeholder="e.g., Monthly restock" />
            </div>
            <div className="flex gap-2 pt-1">
              <button onClick={() => setShowStockModal(null)} className="flex-1 py-2 rounded-xl bg-zinc-800 text-zinc-300 text-sm">Cancel</button>
              <button onClick={handleStockUpdate}
                className={`flex-1 py-2 rounded-xl text-white text-sm font-semibold ${showStockModal.type === 'in' ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-orange-600 hover:bg-orange-500'} transition`}>
                {showStockModal.type === 'in' ? 'Add Stock' : 'Remove Stock'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
