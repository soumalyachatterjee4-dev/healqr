import { useEffect, useMemo, useState } from 'react';
import { db } from '../lib/firebase/config';
import {
  addDoc, collection, deleteDoc, doc, getDocs, onSnapshot, orderBy, query,
  serverTimestamp, updateDoc,
} from 'firebase/firestore';
import { toast } from 'sonner';
import { Loader2, Package, Plus, Trash2, ArrowUpCircle, ArrowDownCircle, AlertTriangle, Search } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';

interface ParamedicalInventoryProps {
  paraId: string;
}

interface Item {
  id: string;
  name: string;
  category?: string;
  quantity: number;
  unit?: string;
  reorderLevel?: number;
  notes?: string;
  updatedAt?: any;
}

interface Log {
  id: string;
  itemId: string;
  itemName: string;
  type: 'credit' | 'debit';
  quantity: number;
  reason?: string;
  createdAt?: any;
}

const SUGGESTED = [
  'Vacutainers', 'Vials', 'Alcohol Swabs', 'Cotton', 'Gauze', 'Bandage',
  'Gloves', 'Syringe 5ml', 'Syringe 10ml', 'Needle', 'Surgical Tape',
  'Antiseptic Solution', 'Mask N95', 'Lancets', 'Glucose Strips',
];

export default function ParamedicalInventory({ paraId }: ParamedicalInventoryProps) {
  const [items, setItems] = useState<Item[]>([]);
  const [logs, setLogs] = useState<Log[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState('');
  const [newQty, setNewQty] = useState(0);
  const [newUnit, setNewUnit] = useState('pcs');
  const [newReorder, setNewReorder] = useState(5);
  const [adjustItem, setAdjustItem] = useState<Item | null>(null);
  const [adjustType, setAdjustType] = useState<'credit' | 'debit'>('credit');
  const [adjustQty, setAdjustQty] = useState(1);
  const [adjustReason, setAdjustReason] = useState('');

  const colItems = `paramedicals/${paraId}/inventory`;
  const colLogs = `paramedicals/${paraId}/stockLogs`;

  useEffect(() => {
    if (!paraId) { setLoading(false); return; }
    const unsubI = onSnapshot(collection(db, colItems), (snap) => {
      setItems(snap.docs.map(d => ({ id: d.id, ...d.data() } as Item))
        .sort((a, b) => (a.name || '').localeCompare(b.name || '')));
      setLoading(false);
    });
    const unsubL = onSnapshot(query(collection(db, colLogs), orderBy('createdAt', 'desc')), (snap) => {
      setLogs(snap.docs.map(d => ({ id: d.id, ...d.data() } as Log)).slice(0, 100));
    }, () => {});
    return () => { unsubI(); unsubL(); };
  }, [paraId]);

  const filtered = useMemo(() =>
    items.filter(i => !search || i.name.toLowerCase().includes(search.toLowerCase())),
    [items, search]);

  const lowStock = items.filter(i => i.quantity <= (i.reorderLevel ?? 0));

  const addItem = async () => {
    if (!newName.trim()) return;
    try {
      await addDoc(collection(db, colItems), {
        name: newName.trim(),
        quantity: Number(newQty) || 0,
        unit: newUnit,
        reorderLevel: Number(newReorder) || 0,
        updatedAt: serverTimestamp(),
      });
      setNewName(''); setNewQty(0); setNewReorder(5);
      setShowAdd(false);
      toast.success('Item added');
    } catch (e: any) { toast.error(e?.message); }
  };

  const removeItem = async (id: string) => {
    if (!confirm('Remove this item?')) return;
    try {
      await deleteDoc(doc(db, colItems, id));
      toast.success('Removed');
    } catch (e: any) { toast.error(e?.message); }
  };

  const submitAdjust = async () => {
    if (!adjustItem || adjustQty <= 0) return;
    const newQty = adjustType === 'credit'
      ? adjustItem.quantity + adjustQty
      : Math.max(0, adjustItem.quantity - adjustQty);
    try {
      await updateDoc(doc(db, colItems, adjustItem.id), {
        quantity: newQty, updatedAt: serverTimestamp(),
      });
      await addDoc(collection(db, colLogs), {
        itemId: adjustItem.id,
        itemName: adjustItem.name,
        type: adjustType,
        quantity: adjustQty,
        reason: adjustReason || '',
        createdAt: serverTimestamp(),
      });
      setAdjustItem(null); setAdjustQty(1); setAdjustReason('');
      toast.success(`${adjustType === 'credit' ? 'Stocked in' : 'Used'}: ${adjustQty} ${adjustItem.unit || 'pcs'}`);
    } catch (e: any) { toast.error(e?.message); }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64 text-gray-400"><Loader2 className="w-6 h-6 animate-spin mr-2" /> Loading…</div>;
  }

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        <KPI label="Total Items" value={items.length} icon={Package} color="text-teal-400" />
        <KPI label="Low Stock" value={lowStock.length} icon={AlertTriangle} color="text-orange-400" />
        <KPI label="Recent Movements" value={logs.length} icon={ArrowUpCircle} color="text-purple-400" />
      </div>

      {/* Low stock alert */}
      {lowStock.length > 0 && (
        <div className="bg-orange-500/10 border border-orange-500/30 rounded-xl p-4">
          <p className="text-orange-400 font-medium mb-2 flex items-center gap-2"><AlertTriangle className="w-4 h-4" /> Low Stock Alerts</p>
          <div className="flex flex-wrap gap-2">
            {lowStock.map(i => (
              <span key={i.id} className="text-xs bg-orange-500/20 text-orange-300 px-2 py-1 rounded-md">{i.name} ({i.quantity} {i.unit})</span>
            ))}
          </div>
        </div>
      )}

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search items"
            className="pl-9 bg-black border-zinc-800 text-white" />
        </div>
        <Button onClick={() => setShowAdd(s => !s)} className="bg-teal-600 hover:bg-teal-700">
          <Plus className="w-4 h-4 mr-1" /> Add Item
        </Button>
      </div>

      {/* Add form */}
      {showAdd && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
            <Input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Item name" className="bg-black border-zinc-800 text-white md:col-span-2" list="para-inv-suggest" />
            <datalist id="para-inv-suggest">{SUGGESTED.map(s => <option key={s} value={s} />)}</datalist>
            <Input type="number" value={newQty} onChange={e => setNewQty(Number(e.target.value))} placeholder="Qty" className="bg-black border-zinc-800 text-white" />
            <Input value={newUnit} onChange={e => setNewUnit(e.target.value)} placeholder="Unit (pcs/box)" className="bg-black border-zinc-800 text-white" />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400">Reorder when below:</span>
            <Input type="number" value={newReorder} onChange={e => setNewReorder(Number(e.target.value))} className="w-24 bg-black border-zinc-800 text-white" />
            <Button onClick={addItem} className="bg-emerald-600 hover:bg-emerald-700">Save</Button>
            <Button variant="ghost" onClick={() => setShowAdd(false)} className="text-gray-400">Cancel</Button>
          </div>
        </div>
      )}

      {/* Items grid */}
      {filtered.length === 0 ? (
        <Empty msg="No items. Add your consumables." />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map(i => {
            const low = i.quantity <= (i.reorderLevel ?? 0);
            return (
              <div key={i.id} className={`bg-zinc-900 border rounded-xl p-4 ${low ? 'border-orange-500/40' : 'border-zinc-800'}`}>
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="text-white font-medium">{i.name}</p>
                    <p className="text-gray-500 text-xs">Reorder ≤ {i.reorderLevel ?? 0}</p>
                  </div>
                  <button onClick={() => removeItem(i.id)} className="text-red-400 hover:text-red-300"><Trash2 className="w-4 h-4" /></button>
                </div>
                <p className={`text-3xl font-bold ${low ? 'text-orange-400' : 'text-white'}`}>{i.quantity} <span className="text-sm text-gray-500">{i.unit || ''}</span></p>
                <div className="flex gap-2 mt-3">
                  <Button size="sm" onClick={() => { setAdjustItem(i); setAdjustType('credit'); }} className="bg-emerald-600 hover:bg-emerald-700 flex-1"><ArrowUpCircle className="w-3.5 h-3.5 mr-1" /> Credit</Button>
                  <Button size="sm" onClick={() => { setAdjustItem(i); setAdjustType('debit'); }} className="bg-orange-600 hover:bg-orange-700 flex-1"><ArrowDownCircle className="w-3.5 h-3.5 mr-1" /> Debit</Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Recent logs */}
      {logs.length > 0 && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
          <h4 className="text-white font-semibold mb-3">Recent Movements</h4>
          <div className="space-y-1 max-h-72 overflow-y-auto">
            {logs.slice(0, 30).map(l => (
              <div key={l.id} className="flex items-center justify-between text-sm py-1.5 border-b border-zinc-800/50 last:border-0">
                <span className={l.type === 'credit' ? 'text-emerald-400' : 'text-orange-400'}>
                  {l.type === 'credit' ? '+' : '−'}{l.quantity} {l.itemName}
                </span>
                <span className="text-gray-500 text-xs">{l.reason || ''}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Adjust modal */}
      {adjustItem && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 max-w-sm w-full">
            <h3 className="text-white font-semibold mb-1">{adjustType === 'credit' ? 'Credit (Stock In)' : 'Debit (Use)'}</h3>
            <p className="text-gray-400 text-sm mb-4">{adjustItem.name} — current: {adjustItem.quantity} {adjustItem.unit}</p>
            <div className="space-y-3">
              <Input type="number" min={1} value={adjustQty} onChange={e => setAdjustQty(Number(e.target.value))} className="bg-black border-zinc-800 text-white" />
              <Input value={adjustReason} onChange={e => setAdjustReason(e.target.value)} placeholder="Reason / note (optional)" className="bg-black border-zinc-800 text-white" />
              <div className="flex gap-2">
                <Button onClick={submitAdjust} className={`flex-1 ${adjustType === 'credit' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-orange-600 hover:bg-orange-700'}`}>Confirm</Button>
                <Button variant="ghost" onClick={() => setAdjustItem(null)} className="text-gray-400">Cancel</Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function KPI({ label, value, icon: Icon, color }: any) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
      <div className="flex items-center gap-2 mb-2"><Icon className={`w-4 h-4 ${color}`} /><p className="text-gray-400 text-xs">{label}</p></div>
      <p className="text-white text-2xl font-bold">{value}</p>
    </div>
  );
}

function Empty({ msg }: { msg: string }) {
  return <div className="text-center text-gray-500 py-12 bg-zinc-900/40 rounded-xl border border-dashed border-zinc-800">{msg}</div>;
}
