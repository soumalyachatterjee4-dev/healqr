import { useState, useEffect, useMemo } from 'react';
import {
  Package, Plus, Trash2, Search, AlertTriangle, Edit2,
  X, ArrowDown, ArrowUp, Filter, Archive, FlaskConical, Calendar,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { db } from '../lib/firebase/config';
import {
  collection, query, getDocs, doc, addDoc, updateDoc, deleteDoc,
  serverTimestamp, orderBy, limit,
} from 'firebase/firestore';
import { toast } from 'sonner';

interface LabInventoryProps {
  labId: string;
  labName?: string;
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
  'Reagents', 'Test Kits', 'Consumables', 'Glassware',
  'Sample Containers', 'PPE', 'Lab Equipment', 'Cleaning', 'Stationery', 'Other',
];
const UNITS = ['pcs', 'boxes', 'packs', 'bottles', 'vials', 'rolls', 'tubes', 'kits', 'kg', 'litre', 'ml'];

const emptyForm = {
  name: '', category: 'Reagents', quantity: '', unit: 'pcs',
  minStock: '5', costPerUnit: '', supplier: '', expiryDate: '', notes: '',
};

export default function LabInventory({ labId }: LabInventoryProps) {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [logs, setLogs] = useState<StockLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'low' | 'expiring' | 'out'>('all');

  const [showAddModal, setShowAddModal] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [form, setForm] = useState(emptyForm);

  const [stockModal, setStockModal] = useState<{ item: InventoryItem; type: 'in' | 'out' } | null>(null);
  const [stockQty, setStockQty] = useState('');
  const [stockCost, setStockCost] = useState('');
  const [stockNote, setStockNote] = useState('');

  const colItems = `labs/${labId}/inventory`;
  const colLogs = `labs/${labId}/stockLogs`;

  useEffect(() => {
    if (!labId) { setLoading(false); return; }
    loadItems();
    loadLogs();
  }, [labId]);

  const loadItems = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(query(collection(db, colItems), orderBy('name')));
      setItems(snap.docs.map(d => ({ id: d.id, ...(d.data() as any) })));
    } catch (err) {
      console.error('[LabInventory] loadItems:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadLogs = async () => {
    try {
      const snap = await getDocs(query(collection(db, colLogs), orderBy('date', 'desc'), limit(50)));
      setLogs(snap.docs.map(d => ({ id: d.id, ...(d.data() as any) })));
    } catch {
      // index may be missing — fallback
      try {
        const snap = await getDocs(collection(db, colLogs));
        const rows = snap.docs.map(d => ({ id: d.id, ...(d.data() as any) })) as StockLog[];
        rows.sort((a, b) => (a.date < b.date ? 1 : -1));
        setLogs(rows.slice(0, 50));
      } catch {}
    }
  };

  const stats = useMemo(() => {
    const totalItems = items.length;
    const lowStock = items.filter(i => i.quantity > 0 && i.quantity <= i.minStock).length;
    const outOfStock = items.filter(i => i.quantity === 0).length;
    const expiringSoon = items.filter(i => {
      if (!i.expiryDate) return false;
      const days = Math.ceil((new Date(i.expiryDate).getTime() - Date.now()) / 86400000);
      return days >= 0 && days <= 30;
    }).length;
    const inventoryValue = items.reduce((s, i) => s + i.quantity * (i.costPerUnit || 0), 0);
    return { totalItems, lowStock, outOfStock, expiringSoon, inventoryValue };
  }, [items]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter(i => {
      if (q && !`${i.name} ${i.supplier}`.toLowerCase().includes(q)) return false;
      if (filterCategory !== 'all' && i.category !== filterCategory) return false;
      if (filterStatus === 'low' && !(i.quantity > 0 && i.quantity <= i.minStock)) return false;
      if (filterStatus === 'out' && i.quantity !== 0) return false;
      if (filterStatus === 'expiring') {
        if (!i.expiryDate) return false;
        const days = Math.ceil((new Date(i.expiryDate).getTime() - Date.now()) / 86400000);
        if (!(days >= 0 && days <= 30)) return false;
      }
      return true;
    });
  }, [items, search, filterCategory, filterStatus]);

  const startEdit = (item: InventoryItem) => {
    setEditingItem(item);
    setForm({
      name: item.name,
      category: item.category,
      quantity: String(item.quantity),
      unit: item.unit,
      minStock: String(item.minStock),
      costPerUnit: String(item.costPerUnit),
      supplier: item.supplier || '',
      expiryDate: item.expiryDate || '',
      notes: item.notes || '',
    });
    setShowAddModal(true);
  };

  const submitItem = async () => {
    if (!form.name.trim()) { toast.error('Item name is required'); return; }
    const payload = {
      name: form.name.trim(),
      category: form.category,
      quantity: Number(form.quantity || 0),
      unit: form.unit,
      minStock: Number(form.minStock || 0),
      costPerUnit: Number(form.costPerUnit || 0),
      supplier: form.supplier.trim(),
      expiryDate: form.expiryDate,
      notes: form.notes.trim(),
      lastRestocked: editingItem?.lastRestocked || new Date().toISOString().split('T')[0],
    };
    try {
      if (editingItem) {
        await updateDoc(doc(db, colItems, editingItem.id), payload);
        toast.success('Item updated');
      } else {
        await addDoc(collection(db, colItems), { ...payload, createdAt: serverTimestamp() });
        toast.success('Item added');
      }
      setShowAddModal(false);
      setEditingItem(null);
      setForm(emptyForm);
      loadItems();
    } catch (err) {
      console.error(err);
      toast.error('Save failed');
    }
  };

  const removeItem = async (item: InventoryItem) => {
    if (!confirm(`Delete "${item.name}"? This cannot be undone.`)) return;
    try {
      await deleteDoc(doc(db, colItems, item.id));
      toast.success('Item deleted');
      loadItems();
    } catch (err) {
      console.error(err);
      toast.error('Delete failed');
    }
  };

  const submitStock = async () => {
    if (!stockModal) return;
    const qty = Number(stockQty || 0);
    if (qty <= 0) { toast.error('Enter quantity'); return; }
    const isIn = stockModal.type === 'in';
    const newQty = isIn ? stockModal.item.quantity + qty : Math.max(0, stockModal.item.quantity - qty);
    try {
      await updateDoc(doc(db, colItems, stockModal.item.id), {
        quantity: newQty,
        lastRestocked: isIn ? new Date().toISOString().split('T')[0] : stockModal.item.lastRestocked,
      });
      await addDoc(collection(db, colLogs), {
        itemId: stockModal.item.id,
        itemName: stockModal.item.name,
        type: stockModal.type,
        quantity: qty,
        costAmount: Number(stockCost || 0),
        note: stockNote.trim(),
        date: new Date().toISOString(),
        createdAt: serverTimestamp(),
      });
      toast.success(`${isIn ? 'Stocked in' : 'Stocked out'} ${qty} ${stockModal.item.unit}`);
      setStockModal(null);
      setStockQty(''); setStockCost(''); setStockNote('');
      loadItems();
      loadLogs();
    } catch (err) {
      console.error(err);
      toast.error('Stock update failed');
    }
  };

  const statusOf = (i: InventoryItem) => {
    if (i.quantity === 0) return { label: 'OUT', cls: 'bg-red-500/20 text-red-300' };
    if (i.quantity <= i.minStock) return { label: 'LOW', cls: 'bg-amber-500/20 text-amber-300' };
    return { label: 'OK', cls: 'bg-emerald-500/20 text-emerald-300' };
  };

  const expiryBadge = (d: string) => {
    if (!d) return null;
    const days = Math.ceil((new Date(d).getTime() - Date.now()) / 86400000);
    if (days < 0) return <span className="text-[10px] font-bold text-red-400">EXPIRED</span>;
    if (days <= 30) return <span className="text-[10px] font-bold text-amber-400">{days}d left</span>;
    return null;
  };

  return (
    <div className="space-y-6">
      <Card className="bg-zinc-900 border-zinc-800">
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h2 className="text-white text-2xl font-bold flex items-center gap-2">
                <Package className="w-6 h-6 text-amber-500" /> Inventory
              </h2>
              <p className="text-gray-400 text-sm mt-1">Reagents, kits, consumables &amp; supplies</p>
            </div>
            <Button onClick={() => { setEditingItem(null); setForm(emptyForm); setShowAddModal(true); }}
              className="bg-amber-600 hover:bg-amber-700 text-white">
              <Plus className="w-4 h-4 mr-1" /> Add Item
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          { label: 'Total Items', value: stats.totalItems, icon: Package, color: 'text-blue-400' },
          { label: 'Low Stock', value: stats.lowStock, icon: AlertTriangle, color: 'text-amber-400' },
          { label: 'Out of Stock', value: stats.outOfStock, icon: Archive, color: 'text-red-400' },
          { label: 'Expiring ≤30d', value: stats.expiringSoon, icon: Calendar, color: 'text-orange-400' },
          { label: 'Stock Value', value: `₹${stats.inventoryValue.toLocaleString()}`, icon: FlaskConical, color: 'text-emerald-400' },
        ].map((k, i) => (
          <Card key={i} className="bg-zinc-900 border-zinc-800">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{k.label}</span>
                <div className={`p-2 rounded-lg bg-zinc-950 ${k.color}`}><k.icon className="w-4 h-4" /></div>
              </div>
              <div className="text-2xl font-bold text-white">{loading ? '…' : k.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
            <div className="md:col-span-5 relative">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-500" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)}
                placeholder="Search item or supplier"
                className="pl-9 bg-zinc-950 border-zinc-800 text-white" />
            </div>
            <div className="md:col-span-3">
              <Select value={filterCategory} onValueChange={setFilterCategory}>
                <SelectTrigger className="bg-zinc-950 border-zinc-800 text-gray-200 text-xs">
                  <Filter className="w-3.5 h-3.5 mr-2 text-amber-500" />
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-800 text-gray-200">
                  <SelectItem value="all">All Categories</SelectItem>
                  {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="md:col-span-4">
              <Select value={filterStatus} onValueChange={(v: any) => setFilterStatus(v)}>
                <SelectTrigger className="bg-zinc-950 border-zinc-800 text-gray-200 text-xs">
                  <Filter className="w-3.5 h-3.5 mr-2 text-amber-500" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-800 text-gray-200">
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="low">Low stock</SelectItem>
                  <SelectItem value="out">Out of stock</SelectItem>
                  <SelectItem value="expiring">Expiring ≤30d</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Items Table */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardContent className="pt-6">
          {loading ? (
            <div className="text-gray-500 text-sm py-10 text-center">Loading inventory…</div>
          ) : filtered.length === 0 ? (
            <div className="text-gray-500 text-sm py-10 text-center">No items match the filters.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-[11px] text-gray-400 uppercase tracking-wider border-b border-zinc-800">
                    <th className="py-2 font-semibold">Item</th>
                    <th className="py-2 font-semibold">Category</th>
                    <th className="py-2 font-semibold text-right">Qty</th>
                    <th className="py-2 font-semibold text-right">Min</th>
                    <th className="py-2 font-semibold text-right">Unit Cost</th>
                    <th className="py-2 font-semibold">Supplier</th>
                    <th className="py-2 font-semibold">Expiry</th>
                    <th className="py-2 font-semibold">Status</th>
                    <th className="py-2 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(i => {
                    const st = statusOf(i);
                    return (
                      <tr key={i.id} className="border-b border-zinc-800/60 last:border-0 hover:bg-zinc-800/30">
                        <td className="py-3 text-white font-medium">{i.name}</td>
                        <td className="py-3 text-gray-400 text-xs">{i.category}</td>
                        <td className="py-3 text-right text-blue-300 font-semibold">{i.quantity} <span className="text-gray-500 text-[10px]">{i.unit}</span></td>
                        <td className="py-3 text-right text-gray-400">{i.minStock}</td>
                        <td className="py-3 text-right text-gray-300">₹{(i.costPerUnit || 0).toLocaleString()}</td>
                        <td className="py-3 text-gray-400 text-xs truncate max-w-[140px]">{i.supplier || '—'}</td>
                        <td className="py-3 text-gray-400 text-xs">
                          {i.expiryDate || '—'} {expiryBadge(i.expiryDate)}
                        </td>
                        <td className="py-3"><span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${st.cls}`}>{st.label}</span></td>
                        <td className="py-3">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button size="sm" variant="outline" className="h-7 text-xs border-emerald-700 text-emerald-300 hover:bg-emerald-950"
                              onClick={() => setStockModal({ item: i, type: 'in' })}
                              title="Credit (Stock In) — add to stock">
                              <ArrowDown className="w-3 h-3 mr-1" /> Credit
                            </Button>
                            <Button size="sm" variant="outline" className="h-7 text-xs border-red-700 text-red-300 hover:bg-red-950"
                              onClick={() => setStockModal({ item: i, type: 'out' })}
                              title="Debit (Stock Out) — consume / remove from stock">
                              <ArrowUp className="w-3 h-3 mr-1" /> Debit
                            </Button>
                            <Button size="sm" variant="outline" className="h-7 text-xs border-zinc-700 text-gray-300"
                              onClick={() => startEdit(i)}>
                              <Edit2 className="w-3 h-3" />
                            </Button>
                            <Button size="sm" variant="outline" className="h-7 text-xs border-zinc-700 text-red-400 hover:bg-red-950"
                              onClick={() => removeItem(i)}>
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Stock logs */}
      {logs.length > 0 && (
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-white text-base">Recent Stock Movements</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto max-h-[280px] overflow-y-auto">
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-zinc-900">
                  <tr className="text-left text-[10px] text-gray-400 uppercase tracking-wider border-b border-zinc-800">
                    <th className="py-2 font-semibold">When</th>
                    <th className="py-2 font-semibold">Item</th>
                    <th className="py-2 font-semibold">Type</th>
                    <th className="py-2 font-semibold text-right">Qty</th>
                    <th className="py-2 font-semibold text-right">Amount</th>
                    <th className="py-2 font-semibold">Note</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map(l => (
                    <tr key={l.id} className="border-b border-zinc-800/60 last:border-0">
                      <td className="py-2 text-gray-400">{new Date(l.date).toLocaleString('en-IN')}</td>
                      <td className="py-2 text-white">{l.itemName}</td>
                      <td className="py-2">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${l.type === 'in' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-red-500/20 text-red-300'}`}>
                          {l.type === 'in' ? 'IN' : 'OUT'}
                        </span>
                      </td>
                      <td className="py-2 text-right text-blue-300">{l.quantity}</td>
                      <td className="py-2 text-right text-gray-300">{l.costAmount ? `₹${l.costAmount.toLocaleString()}` : '—'}</td>
                      <td className="py-2 text-gray-500 truncate max-w-[280px]">{l.note || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Add/Edit modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={() => setShowAddModal(false)}>
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white text-lg font-bold">{editingItem ? 'Edit Item' : 'Add Inventory Item'}</h3>
              <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <Label>Name *</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="bg-zinc-950 border-zinc-800 text-white mt-1" />
              </div>
              <div>
                <Label>Category</Label>
                <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}
                  className="w-full bg-zinc-950 border border-zinc-800 text-white rounded px-3 py-2 mt-1 text-sm">
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <Label>Unit</Label>
                <select value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })}
                  className="w-full bg-zinc-950 border border-zinc-800 text-white rounded px-3 py-2 mt-1 text-sm">
                  {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>
              <div>
                <Label>Quantity</Label>
                <Input type="number" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                  className="bg-zinc-950 border-zinc-800 text-white mt-1" />
              </div>
              <div>
                <Label>Min Stock</Label>
                <Input type="number" value={form.minStock} onChange={(e) => setForm({ ...form, minStock: e.target.value })}
                  className="bg-zinc-950 border-zinc-800 text-white mt-1" />
              </div>
              <div>
                <Label>Cost / Unit (₹)</Label>
                <Input type="number" value={form.costPerUnit} onChange={(e) => setForm({ ...form, costPerUnit: e.target.value })}
                  className="bg-zinc-950 border-zinc-800 text-white mt-1" />
              </div>
              <div>
                <Label>Expiry Date</Label>
                <Input type="date" value={form.expiryDate} onChange={(e) => setForm({ ...form, expiryDate: e.target.value })}
                  className="bg-zinc-950 border-zinc-800 text-white mt-1" />
              </div>
              <div className="col-span-2">
                <Label>Supplier</Label>
                <Input value={form.supplier} onChange={(e) => setForm({ ...form, supplier: e.target.value })}
                  className="bg-zinc-950 border-zinc-800 text-white mt-1" />
              </div>
              <div className="col-span-2">
                <Label>Notes</Label>
                <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2}
                  className="w-full bg-zinc-950 border border-zinc-800 text-white rounded px-3 py-2 mt-1 text-sm resize-none" />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <Button variant="outline" className="border-zinc-700 text-gray-300" onClick={() => setShowAddModal(false)}>Cancel</Button>
              <Button className="bg-amber-600 hover:bg-amber-700 text-white" onClick={submitItem}>
                {editingItem ? 'Save Changes' : 'Add Item'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Stock In/Out Modal */}
      {stockModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={() => setStockModal(null)}>
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-white text-lg font-bold mb-1 flex items-center gap-2">
              {stockModal.type === 'in' ? <ArrowDown className="w-5 h-5 text-emerald-500" /> : <ArrowUp className="w-5 h-5 text-red-500" />}
              {stockModal.type === 'in' ? 'Credit (Stock In)' : 'Debit (Stock Out)'}: {stockModal.item.name}
            </h3>
            <p className="text-gray-400 text-xs mb-4">Current: {stockModal.item.quantity} {stockModal.item.unit}</p>
            <div className="space-y-3">
              <div>
                <Label>Quantity</Label>
                <Input type="number" value={stockQty} onChange={(e) => setStockQty(e.target.value)}
                  className="bg-zinc-950 border-zinc-800 text-white mt-1" />
              </div>
              {stockModal.type === 'in' && (
                <div>
                  <Label>Total Cost (₹) — optional</Label>
                  <Input type="number" value={stockCost} onChange={(e) => setStockCost(e.target.value)}
                    className="bg-zinc-950 border-zinc-800 text-white mt-1" />
                </div>
              )}
              <div>
                <Label>Note (optional)</Label>
                <Input value={stockNote} onChange={(e) => setStockNote(e.target.value)}
                  className="bg-zinc-950 border-zinc-800 text-white mt-1"
                  placeholder={stockModal.type === 'in' ? 'PO #, supplier, etc.' : 'Used for sample run, etc.'} />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <Button variant="outline" className="border-zinc-700 text-gray-300" onClick={() => setStockModal(null)}>Cancel</Button>
              <Button className={stockModal.type === 'in' ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : 'bg-red-600 hover:bg-red-700 text-white'} onClick={submitStock}>
                Confirm
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <label className="text-[11px] text-gray-400 uppercase tracking-wider font-semibold">{children}</label>;
}
