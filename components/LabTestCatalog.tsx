import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  FlaskConical,
  IndianRupee,
  Clock,
  Tag,
  X,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Upload,
  Download,
  FileSpreadsheet,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { auth, db } from '../lib/firebase/config';
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  onSnapshot,
  serverTimestamp,
  query,
  orderBy,
} from 'firebase/firestore';
import { toast } from 'sonner';

interface TestItem {
  id: string;
  testName: string;
  testCode: string;
  category: string;
  sampleType: string;
  price: number;
  discountedPrice?: number;
  turnaroundTime: string;
  turnaroundUnit: 'hours' | 'days';
  description?: string;
  preparation?: string;
  isActive: boolean;
  isHomeCollection: boolean;
  homeCollectionCharge?: number;
  createdAt?: any;
  updatedAt?: any;
}

type FormData = Omit<TestItem, 'id' | 'createdAt' | 'updatedAt'>;

const CATEGORIES = [
  'Haematology',
  'Biochemistry',
  'Microbiology',
  'Pathology',
  'Immunology',
  'Endocrinology',
  'Radiology',
  'Cardiology',
  'Urology',
  'Serology',
  'Molecular Biology',
  'Cytology',
  'Histopathology',
  'Genetics',
  'Allergy',
  'Toxicology',
  'Profiles / Panels',
  'Other',
];

const SAMPLE_TYPES = [
  'Blood (Venous)',
  'Blood (Capillary)',
  'Urine',
  'Stool',
  'Sputum',
  'Swab (Throat)',
  'Swab (Nasal)',
  'Swab (Wound)',
  'CSF',
  'Serum',
  'Plasma',
  'Tissue / Biopsy',
  'Saliva',
  'Other',
];

const EMPTY_FORM: FormData = {
  testName: '',
  testCode: '',
  category: 'Biochemistry',
  sampleType: 'Blood (Venous)',
  price: 0,
  discountedPrice: undefined,
  turnaroundTime: '24',
  turnaroundUnit: 'hours',
  description: '',
  preparation: '',
  isActive: true,
  isHomeCollection: false,
  homeCollectionCharge: undefined,
};

interface LabTestCatalogProps {
  labId: string;
}

export default function LabTestCatalog({ labId }: LabTestCatalogProps) {
  const [tests, setTests] = useState<TestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingTest, setEditingTest] = useState<TestItem | null>(null);
  const [form, setForm] = useState<FormData>({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Bulk upload
  const [showBulkUpload, setShowBulkUpload] = useState(false);
  const [bulkData, setBulkData] = useState<FormData[]>([]);
  const [bulkUploading, setBulkUploading] = useState(false);
  const [bulkProgress, setBulkProgress] = useState(0);
  const [bulkErrors, setBulkErrors] = useState<string[]>([]);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');
  const [sortField, setSortField] = useState<'testName' | 'price' | 'category'>('testName');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  // Load tests from Firestore
  useEffect(() => {
    if (!labId || !db) return;

    const q = query(
      collection(db, 'labs', labId, 'testCatalog'),
      orderBy('testName', 'asc'),
    );

    const unsub = onSnapshot(q, (snap) => {
      const items: TestItem[] = snap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      } as TestItem));
      setTests(items);
      setLoading(false);
    }, (err) => {
      console.error('Error loading test catalog:', err);
      toast.error('Failed to load test catalog');
      setLoading(false);
    });

    return () => unsub();
  }, [labId]);

  const resetForm = () => {
    setForm({ ...EMPTY_FORM });
    setEditingTest(null);
    setShowModal(false);
  };

  const openAdd = () => {
    setForm({ ...EMPTY_FORM });
    setEditingTest(null);
    setShowModal(true);
  };

  const openEdit = (test: TestItem) => {
    setEditingTest(test);
    setForm({
      testName: test.testName,
      testCode: test.testCode,
      category: test.category,
      sampleType: test.sampleType,
      price: test.price,
      discountedPrice: test.discountedPrice,
      turnaroundTime: test.turnaroundTime,
      turnaroundUnit: test.turnaroundUnit,
      description: test.description || '',
      preparation: test.preparation || '',
      isActive: test.isActive,
      isHomeCollection: test.isHomeCollection,
      homeCollectionCharge: test.homeCollectionCharge,
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.testName.trim()) {
      toast.error('Test name is required');
      return;
    }
    if (form.price <= 0) {
      toast.error('Price must be greater than 0');
      return;
    }

    setSaving(true);
    try {
      const data: any = {
        testName: form.testName.trim(),
        testCode: form.testCode.trim(),
        category: form.category,
        sampleType: form.sampleType,
        price: Number(form.price),
        discountedPrice: form.discountedPrice ? Number(form.discountedPrice) : null,
        turnaroundTime: form.turnaroundTime,
        turnaroundUnit: form.turnaroundUnit,
        description: form.description?.trim() || '',
        preparation: form.preparation?.trim() || '',
        isActive: form.isActive,
        isHomeCollection: form.isHomeCollection,
        homeCollectionCharge: form.isHomeCollection && form.homeCollectionCharge ? Number(form.homeCollectionCharge) : null,
        updatedAt: serverTimestamp(),
      };

      if (editingTest) {
        await updateDoc(doc(db, 'labs', labId, 'testCatalog', editingTest.id), data);
        toast.success('Test updated');
      } else {
        data.createdAt = serverTimestamp();
        await addDoc(collection(db, 'labs', labId, 'testCatalog'), data);
        toast.success('Test added to catalog');
      }
      resetForm();
    } catch (err) {
      console.error('Error saving test:', err);
      toast.error('Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (testId: string) => {
    if (!confirm('Delete this test from catalog?')) return;
    setDeletingId(testId);
    try {
      await deleteDoc(doc(db, 'labs', labId, 'testCatalog', testId));
      toast.success('Test removed');
    } catch (err) {
      console.error('Error deleting test:', err);
      toast.error('Failed to delete');
    } finally {
      setDeletingId(null);
    }
  };

  const toggleActive = async (test: TestItem) => {
    try {
      await updateDoc(doc(db, 'labs', labId, 'testCatalog', test.id), {
        isActive: !test.isActive,
        updatedAt: serverTimestamp(),
      });
      toast.success(test.isActive ? 'Test deactivated' : 'Test activated');
    } catch (err) {
      console.error('Error toggling status:', err);
      toast.error('Failed to update status');
    }
  };

  // === BULK UPLOAD ===
  const bulkFileRef = React.useRef<HTMLInputElement>(null);

  const matchCategory = (raw: string): string => {
    if (!raw) return 'Other';
    const lc = raw.toLowerCase().trim();
    const found = CATEGORIES.find(c => c.toLowerCase() === lc);
    if (found) return found;
    const partial = CATEGORIES.find(c => c.toLowerCase().includes(lc) || lc.includes(c.toLowerCase()));
    return partial || 'Other';
  };

  const matchSampleType = (raw: string): string => {
    if (!raw) return 'Blood (Venous)';
    const lc = raw.toLowerCase().trim();
    const found = SAMPLE_TYPES.find(s => s.toLowerCase() === lc);
    if (found) return found;
    const partial = SAMPLE_TYPES.find(s => s.toLowerCase().includes(lc) || lc.includes(s.toLowerCase()));
    return partial || 'Blood (Venous)';
  };

  const downloadTemplate = () => {
    const data = [
      { 'SRL': 1, 'Test Name': 'Complete Blood Count (CBC)', 'Test Code': 'CBC001', 'Category': 'Haematology', 'Sample Type': 'Blood (Venous)', 'Price (MRP)': 500, 'Discount Price': '', 'Turnaround Time': 24, 'TAT Unit (hours/days)': 'hours', 'Description': 'Includes WBC, RBC, Platelets', 'Patient Preparation': 'No fasting required', 'Home Collection (yes/no)': 'no', 'Home Collection Charge': '' },
      { 'SRL': 2, 'Test Name': 'Fasting Blood Sugar (FBS)', 'Test Code': 'FBS001', 'Category': 'Biochemistry', 'Sample Type': 'Blood (Venous)', 'Price (MRP)': 200, 'Discount Price': 150, 'Turnaround Time': 6, 'TAT Unit (hours/days)': 'hours', 'Description': 'Glucose level check', 'Patient Preparation': '12 hours fasting required', 'Home Collection (yes/no)': 'yes', 'Home Collection Charge': 100 },
      { 'SRL': 3, 'Test Name': 'Lipid Profile', 'Test Code': 'LIPID001', 'Category': 'Biochemistry', 'Sample Type': 'Blood (Venous)', 'Price (MRP)': 800, 'Discount Price': 650, 'Turnaround Time': 24, 'TAT Unit (hours/days)': 'hours', 'Description': 'Total cholesterol, HDL, LDL, Triglycerides', 'Patient Preparation': '12 hours fasting required', 'Home Collection (yes/no)': 'yes', 'Home Collection Charge': 100 },
      { 'SRL': 4, 'Test Name': 'Thyroid Profile (T3, T4, TSH)', 'Test Code': 'THY001', 'Category': 'Endocrinology', 'Sample Type': 'Blood (Venous)', 'Price (MRP)': 600, 'Discount Price': '', 'Turnaround Time': 24, 'TAT Unit (hours/days)': 'hours', 'Description': 'T3, T4, TSH levels', 'Patient Preparation': 'No fasting required', 'Home Collection (yes/no)': 'no', 'Home Collection Charge': '' },
      { 'SRL': 5, 'Test Name': 'Urine Routine', 'Test Code': 'UR001', 'Category': 'Pathology', 'Sample Type': 'Urine', 'Price (MRP)': 150, 'Discount Price': '', 'Turnaround Time': 4, 'TAT Unit (hours/days)': 'hours', 'Description': 'Physical, chemical, microscopic', 'Patient Preparation': 'Midstream clean catch sample', 'Home Collection (yes/no)': 'yes', 'Home Collection Charge': 50 },
    ];
    const ws = XLSX.utils.json_to_sheet(data);
    ws['!cols'] = [{ wch: 5 }, { wch: 32 }, { wch: 10 }, { wch: 16 }, { wch: 16 }, { wch: 10 }, { wch: 13 }, { wch: 14 }, { wch: 18 }, { wch: 30 }, { wch: 25 }, { wch: 20 }, { wch: 18 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Test List');
    XLSX.writeFile(wb, 'HealQR_Test_List_Template.xlsx');
    toast.success('Template downloaded! Fill and upload.');
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (!['xlsx', 'xls', 'csv'].includes(ext || '')) {
      toast.error('Please upload an Excel (.xlsx) or CSV file');
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = ev.target?.result;
        const wb = XLSX.read(data, { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows: any[] = XLSX.utils.sheet_to_json(ws, { defval: '' });
        if (rows.length === 0) {
          toast.error('File is empty or has no data rows');
          return;
        }
        const errors: string[] = [];
        const parsed: FormData[] = [];
        for (let i = 0; i < rows.length; i++) {
          const r = rows[i];
          const keys = Object.keys(r);
          const findCol = (patterns: string[]) => {
            const k = keys.find(key => {
              const lk = key.toLowerCase().trim();
              return patterns.some(p => lk.includes(p));
            });
            return k ? String(r[k]).trim() : '';
          };
          const testName = findCol(['test name', 'investigation', 'name']);
          if (!testName) { errors.push(`Row ${i + 2}: No test name found — skipped`); continue; }
          const mrpStr = findCol(['price', 'mrp', 'rate', 'amount', 'cost', 'fee']);
          const mrp = parseFloat(mrpStr) || 0;
          if (mrp <= 0) { errors.push(`Row ${i + 2} (${testName}): Invalid price — skipped`); continue; }
          const discStr = findCol(['discount', 'disc', 'offer', 'special']);
          const discount = parseFloat(discStr) || 0;
          const categoryRaw = findCol(['category', 'dept', 'department', 'section']);
          const sampleRaw = findCol(['sample', 'specimen']);
          const testCode = findCol(['test code', 'code']);
          const tatStr = findCol(['turnaround', 'tat', 'time']);
          const tatUnitRaw = findCol(['tat unit', 'unit']);
          const tatUnit = tatUnitRaw.toLowerCase() === 'days' ? 'days' as const : 'hours' as const;
          const description = findCol(['description', 'desc', 'detail']);
          const preparation = findCol(['preparation', 'prep', 'patient prep', 'instruction']);
          const homeRaw = findCol(['home collection', 'home']);
          const isHome = ['yes', 'y', 'true', '1'].includes(homeRaw.toLowerCase());
          const homeChargeStr = findCol(['home charge', 'collection charge', 'home collection charge']);
          parsed.push({
            testName,
            testCode: testCode.toUpperCase(),
            category: matchCategory(categoryRaw),
            sampleType: matchSampleType(sampleRaw),
            price: mrp,
            discountedPrice: discount > 0 && discount < mrp ? discount : undefined,
            turnaroundTime: tatStr || '24',
            turnaroundUnit: tatUnit,
            description,
            preparation,
            isActive: true,
            isHomeCollection: isHome,
            homeCollectionCharge: isHome && homeChargeStr ? parseFloat(homeChargeStr) || undefined : undefined,
          });
        }
        setBulkErrors(errors);
        setBulkData(parsed);
      } catch (err) {
        console.error('Error parsing file:', err);
        toast.error('Could not read the file. Please check the format.');
      }
    };
    reader.readAsArrayBuffer(file);
    e.target.value = '';
  };

  const handleBulkSave = async () => {
    if (bulkData.length === 0) return;
    setBulkUploading(true);
    setBulkProgress(0);
    let success = 0;
    const colRef = collection(db, 'labs', labId, 'testCatalog');
    for (let i = 0; i < bulkData.length; i++) {
      try {
        const item = bulkData[i];
        await addDoc(colRef, {
          testName: item.testName,
          testCode: item.testCode || '',
          category: item.category,
          sampleType: item.sampleType,
          price: Number(item.price),
          discountedPrice: item.discountedPrice ? Number(item.discountedPrice) : null,
          turnaroundTime: item.turnaroundTime || '24',
          turnaroundUnit: item.turnaroundUnit || 'hours',
          description: item.description || '',
          preparation: item.preparation || '',
          isActive: true,
          isHomeCollection: item.isHomeCollection || false,
          homeCollectionCharge: item.isHomeCollection && item.homeCollectionCharge ? Number(item.homeCollectionCharge) : null,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        success++;
      } catch (err) {
        console.error(`Error adding test ${bulkData[i].testName}:`, err);
      }
      setBulkProgress(Math.round(((i + 1) / bulkData.length) * 100));
    }
    setBulkUploading(false);
    setBulkData([]);
    setBulkErrors([]);
    toast.success(`${success} tests added to catalog!`);
  };

  // Filter + sort
  const filtered = tests
    .filter((t) => {
      if (filterCategory !== 'all' && t.category !== filterCategory) return false;
      if (filterStatus === 'active' && !t.isActive) return false;
      if (filterStatus === 'inactive' && t.isActive) return false;
      if (searchTerm) {
        const s = searchTerm.toLowerCase();
        return (
          t.testName.toLowerCase().includes(s) ||
          t.testCode.toLowerCase().includes(s) ||
          t.category.toLowerCase().includes(s)
        );
      }
      return true;
    })
    .sort((a, b) => {
      let cmp = 0;
      if (sortField === 'testName') cmp = a.testName.localeCompare(b.testName);
      else if (sortField === 'price') cmp = a.price - b.price;
      else if (sortField === 'category') cmp = a.category.localeCompare(b.category);
      return sortDir === 'asc' ? cmp : -cmp;
    });

  const activeCount = tests.filter((t) => t.isActive).length;
  const avgPrice = tests.length > 0 ? Math.round(tests.reduce((s, t) => s + t.price, 0) / tests.length) : 0;
  const categories = [...new Set(tests.map((t) => t.category))];

  const toggleSort = (field: typeof sortField) => {
    if (sortField === field) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortField(field); setSortDir('asc'); }
  };

  const SortIcon = ({ field }: { field: typeof sortField }) => (
    sortField === field
      ? (sortDir === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)
      : <ChevronDown className="w-3 h-3 opacity-30" />
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-white flex items-center gap-2">
            <FlaskConical className="w-5 h-5 text-purple-400" />
            Test Catalog
          </h2>
          <p className="text-gray-400 text-sm mt-1">Manage your lab's test menu and pricing</p>
        </div>
        <div className="flex gap-2">
          <input ref={bulkFileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleFileUpload} />
          <Button onClick={() => setShowBulkUpload(true)} variant="outline" className="border-purple-500/40 text-purple-300 hover:bg-purple-500/10 gap-2">
            <Upload className="w-4 h-4" /> Bulk Upload
          </Button>
          <Button onClick={openAdd} className="bg-purple-500 hover:bg-purple-600 gap-2">
            <Plus className="w-4 h-4" /> Add Test
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Tests', value: tests.length, color: 'purple' },
          { label: 'Active', value: activeCount, color: 'green' },
          { label: 'Inactive', value: tests.length - activeCount, color: 'red' },
          { label: 'Avg Price', value: `₹${avgPrice}`, color: 'yellow' },
        ].map((s) => (
          <Card key={s.label} className="bg-zinc-900 border-zinc-800">
            <CardContent className="py-4 px-4 text-center">
              <p className="text-gray-400 text-xs">{s.label}</p>
              <p className={`text-2xl font-bold text-${s.color}-400 mt-1`}>{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search tests..."
            className="pl-9 bg-zinc-900 border-zinc-700 text-white h-10"
          />
        </div>
        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          className="bg-zinc-900 border border-zinc-700 text-white rounded-lg px-3 h-10 text-sm"
        >
          <option value="all">All Categories</option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value as any)}
          className="bg-zinc-900 border border-zinc-700 text-white rounded-lg px-3 h-10 text-sm"
        >
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      {/* Test List */}
      {filtered.length === 0 ? (
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <FlaskConical className="w-12 h-12 text-purple-500/30 mb-4" />
            <h3 className="text-white text-lg font-semibold mb-2">
              {tests.length === 0 ? 'No tests yet' : 'No matching tests'}
            </h3>
            <p className="text-gray-500 text-sm mb-4">
              {tests.length === 0 ? 'Add your first test to get started' : 'Try changing your filters'}
            </p>
            {tests.length === 0 && (
              <Button onClick={openAdd} className="bg-purple-500 hover:bg-purple-600 gap-2">
                <Plus className="w-4 h-4" /> Add Test
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {/* Sort headers — mobile-friendly */}
          <div className="hidden md:flex items-center gap-4 px-4 text-xs text-gray-500">
            <button onClick={() => toggleSort('testName')} className="flex items-center gap-1 flex-1">
              Test Name <SortIcon field="testName" />
            </button>
            <button onClick={() => toggleSort('category')} className="flex items-center gap-1 w-32">
              Category <SortIcon field="category" />
            </button>
            <button onClick={() => toggleSort('price')} className="flex items-center gap-1 w-24 text-right">
              Price <SortIcon field="price" />
            </button>
            <span className="w-20 text-right">TAT</span>
            <span className="w-20 text-center">Status</span>
            <span className="w-24 text-right">Actions</span>
          </div>

          {filtered.map((test) => (
            <Card key={test.id} className={`bg-zinc-900 border-zinc-800 ${!test.isActive ? 'opacity-60' : ''}`}>
              <CardContent className="py-3 px-4">
                <div className="flex flex-col md:flex-row md:items-center gap-3 md:gap-4">
                  {/* Name + Code */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-white font-medium truncate">{test.testName}</p>
                      {test.isHomeCollection && (
                        <Badge className="bg-purple-500/20 text-purple-300 text-[10px] px-1.5 py-0">Home</Badge>
                      )}
                    </div>
                    {test.testCode && (
                      <p className="text-gray-500 text-xs mt-0.5">{test.testCode}</p>
                    )}
                    <p className="text-gray-500 text-xs mt-0.5 md:hidden">
                      {test.category} · {test.sampleType}
                    </p>
                  </div>

                  {/* Category — desktop */}
                  <div className="hidden md:block w-32">
                    <Badge className="bg-zinc-800 text-gray-300 text-xs">{test.category}</Badge>
                  </div>

                  {/* Price */}
                  <div className="flex items-center gap-2 md:w-24 md:justify-end">
                    <IndianRupee className="w-3 h-3 text-gray-400 md:hidden" />
                    {test.discountedPrice ? (
                      <div className="text-right">
                        <span className="text-gray-500 text-xs line-through">₹{test.price}</span>
                        <span className="text-green-400 font-semibold ml-1">₹{test.discountedPrice}</span>
                      </div>
                    ) : (
                      <span className="text-white font-semibold">₹{test.price}</span>
                    )}
                  </div>

                  {/* TAT */}
                  <div className="flex items-center gap-1 md:w-20 md:justify-end text-gray-400 text-sm">
                    <Clock className="w-3 h-3 md:hidden" />
                    {test.turnaroundTime} {test.turnaroundUnit === 'hours' ? 'hrs' : 'days'}
                  </div>

                  {/* Status */}
                  <div className="md:w-20 md:text-center">
                    <button
                      onClick={() => toggleActive(test)}
                      className={`text-xs px-2 py-1 rounded-full border transition-colors ${
                        test.isActive
                          ? 'bg-green-500/10 text-green-400 border-green-500/30 hover:bg-green-500/20'
                          : 'bg-red-500/10 text-red-400 border-red-500/30 hover:bg-red-500/20'
                      }`}
                    >
                      {test.isActive ? 'Active' : 'Inactive'}
                    </button>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 md:w-24 md:justify-end">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openEdit(test)}
                      className="text-purple-400 hover:bg-purple-500/10 w-8 h-8"
                    >
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(test.id)}
                      disabled={deletingId === test.id}
                      className="text-red-400 hover:bg-red-500/10 w-8 h-8"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={resetForm}>
          <div
            className="bg-zinc-900 border border-zinc-700 rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-5 border-b border-zinc-800">
              <h3 className="text-white font-semibold text-lg">
                {editingTest ? 'Edit Test' : 'Add New Test'}
              </h3>
              <button onClick={resetForm} className="text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {/* Test Name */}
              <div>
                <Label className="text-gray-400 text-sm">Test Name *</Label>
                <Input
                  value={form.testName}
                  onChange={(e) => setForm({ ...form, testName: e.target.value })}
                  placeholder="e.g. Complete Blood Count (CBC)"
                  className="bg-black border-zinc-700 text-white mt-1"
                />
              </div>

              {/* Test Code */}
              <div>
                <Label className="text-gray-400 text-sm">Test Code</Label>
                <Input
                  value={form.testCode}
                  onChange={(e) => setForm({ ...form, testCode: e.target.value.toUpperCase() })}
                  placeholder="e.g. CBC001"
                  className="bg-black border-zinc-700 text-white mt-1"
                  maxLength={20}
                />
              </div>

              {/* Category + Sample Type */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-gray-400 text-sm">Category *</Label>
                  <select
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    className="w-full bg-black border border-zinc-700 text-white rounded-lg px-3 h-10 text-sm mt-1"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label className="text-gray-400 text-sm">Sample Type</Label>
                  <select
                    value={form.sampleType}
                    onChange={(e) => setForm({ ...form, sampleType: e.target.value })}
                    className="w-full bg-black border border-zinc-700 text-white rounded-lg px-3 h-10 text-sm mt-1"
                  >
                    {SAMPLE_TYPES.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Price + Discounted Price */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-gray-400 text-sm">Price (₹) *</Label>
                  <Input
                    type="number"
                    value={form.price || ''}
                    onChange={(e) => setForm({ ...form, price: Number(e.target.value) })}
                    placeholder="500"
                    className="bg-black border-zinc-700 text-white mt-1"
                    min={0}
                  />
                </div>
                <div>
                  <Label className="text-gray-400 text-sm">Discounted Price (₹)</Label>
                  <Input
                    type="number"
                    value={form.discountedPrice || ''}
                    onChange={(e) => setForm({ ...form, discountedPrice: e.target.value ? Number(e.target.value) : undefined })}
                    placeholder="Optional"
                    className="bg-black border-zinc-700 text-white mt-1"
                    min={0}
                  />
                </div>
              </div>

              {/* TAT */}
              <div>
                <Label className="text-gray-400 text-sm">Turnaround Time</Label>
                <div className="flex gap-2 mt-1">
                  <Input
                    type="number"
                    value={form.turnaroundTime}
                    onChange={(e) => setForm({ ...form, turnaroundTime: e.target.value })}
                    className="bg-black border-zinc-700 text-white flex-1"
                    min={1}
                  />
                  <select
                    value={form.turnaroundUnit}
                    onChange={(e) => setForm({ ...form, turnaroundUnit: e.target.value as any })}
                    className="bg-black border border-zinc-700 text-white rounded-lg px-3 h-10 text-sm"
                  >
                    <option value="hours">Hours</option>
                    <option value="days">Days</option>
                  </select>
                </div>
              </div>

              {/* Description */}
              <div>
                <Label className="text-gray-400 text-sm">Description</Label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Brief description of the test..."
                  className="w-full bg-black border border-zinc-700 text-white rounded-lg px-3 py-2 text-sm mt-1 resize-none"
                  rows={2}
                  maxLength={300}
                />
              </div>

              {/* Preparation Instructions */}
              <div>
                <Label className="text-gray-400 text-sm">Patient Preparation</Label>
                <textarea
                  value={form.preparation}
                  onChange={(e) => setForm({ ...form, preparation: e.target.value })}
                  placeholder="e.g. 12 hours fasting required..."
                  className="w-full bg-black border border-zinc-700 text-white rounded-lg px-3 py-2 text-sm mt-1 resize-none"
                  rows={2}
                  maxLength={200}
                />
              </div>

              {/* Home Collection */}
              <div className="bg-black border border-zinc-800 rounded-lg p-4 space-y-3">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.isHomeCollection}
                    onChange={(e) => setForm({ ...form, isHomeCollection: e.target.checked })}
                    className="w-4 h-4 accent-purple-500"
                  />
                  <span className="text-gray-300 text-sm">Home collection available</span>
                </label>
                {form.isHomeCollection && (
                  <div>
                    <Label className="text-gray-400 text-xs">Extra charge for home collection (₹)</Label>
                    <Input
                      type="number"
                      value={form.homeCollectionCharge || ''}
                      onChange={(e) => setForm({ ...form, homeCollectionCharge: e.target.value ? Number(e.target.value) : undefined })}
                      placeholder="e.g. 100"
                      className="bg-zinc-900 border-zinc-700 text-white mt-1 h-9"
                      min={0}
                    />
                  </div>
                )}
              </div>

              {/* Active toggle */}
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                  className="w-4 h-4 accent-purple-500"
                />
                <span className="text-gray-300 text-sm">Active (visible to patients)</span>
              </label>
            </div>

            <div className="flex gap-3 p-5 border-t border-zinc-800">
              <Button variant="ghost" onClick={resetForm} className="flex-1 text-gray-400">
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 bg-purple-500 hover:bg-purple-600"
              >
                {saving ? 'Saving...' : editingTest ? 'Update Test' : 'Add Test'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Upload Modal */}
      {showBulkUpload && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={() => !bulkUploading && (setShowBulkUpload(false), setBulkData([]), setBulkErrors([]))}>
          <div
            className="bg-zinc-900 border border-zinc-700 rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-5 border-b border-zinc-800">
              <h3 className="text-white font-semibold text-lg flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-purple-400" />
                {bulkData.length > 0 ? 'Upload Preview' : 'Bulk Upload Test List'}
              </h3>
              {!bulkUploading && (
                <button onClick={() => { setShowBulkUpload(false); setBulkData([]); setBulkErrors([]); }} className="text-gray-400 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>

            <div className="p-5 space-y-4">
              {/* STEP 1: Show demo format + pick file */}
              {bulkData.length === 0 && !bulkUploading && (
                <>
                  <p className="text-gray-300 text-sm">Prepare your test list in Excel with these columns. Download the template for exact format:</p>

                  {/* Demo sheet */}
                  <div className="border border-purple-500/30 rounded-lg overflow-hidden">
                    <div className="bg-purple-500/10 px-3 py-2 text-purple-300 text-xs font-semibold">Demo Format — Your Excel should look like this:</div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm" style={{ minWidth: '700px' }}>
                        <thead className="bg-zinc-800">
                          <tr>
                            <th className="text-left text-purple-300 px-2 py-2 font-semibold text-[10px] whitespace-nowrap">SRL</th>
                            <th className="text-left text-purple-300 px-2 py-2 font-semibold text-[10px] whitespace-nowrap">Test Name *</th>
                            <th className="text-left text-purple-300 px-2 py-2 font-semibold text-[10px] whitespace-nowrap">Test Code</th>
                            <th className="text-left text-purple-300 px-2 py-2 font-semibold text-[10px] whitespace-nowrap">Category</th>
                            <th className="text-left text-purple-300 px-2 py-2 font-semibold text-[10px] whitespace-nowrap">Sample Type</th>
                            <th className="text-right text-purple-300 px-2 py-2 font-semibold text-[10px] whitespace-nowrap">Price *</th>
                            <th className="text-right text-purple-300 px-2 py-2 font-semibold text-[10px] whitespace-nowrap">Discount</th>
                            <th className="text-right text-purple-300 px-2 py-2 font-semibold text-[10px] whitespace-nowrap">TAT</th>
                            <th className="text-left text-purple-300 px-2 py-2 font-semibold text-[10px] whitespace-nowrap">Unit</th>
                            <th className="text-left text-purple-300 px-2 py-2 font-semibold text-[10px] whitespace-nowrap">Description</th>
                            <th className="text-left text-purple-300 px-2 py-2 font-semibold text-[10px] whitespace-nowrap">Preparation</th>
                            <th className="text-center text-purple-300 px-2 py-2 font-semibold text-[10px] whitespace-nowrap">Home</th>
                          </tr>
                        </thead>
                        <tbody>
                          {[
                            { srl: 1, name: 'CBC', code: 'CBC001', cat: 'Haematology', sample: 'Blood (Venous)', mrp: 500, disc: '', tat: 24, unit: 'hours', desc: 'WBC, RBC, Platelets', prep: 'No fasting', home: 'no' },
                            { srl: 2, name: 'Fasting Blood Sugar', code: 'FBS001', cat: 'Biochemistry', sample: 'Blood (Venous)', mrp: 200, disc: 150, tat: 6, unit: 'hours', desc: 'Glucose level', prep: '12hr fasting', home: 'yes' },
                            { srl: 3, name: 'Lipid Profile', code: 'LIPID001', cat: 'Biochemistry', sample: 'Blood (Venous)', mrp: 800, disc: 650, tat: 24, unit: 'hours', desc: 'Cholesterol, HDL, LDL', prep: '12hr fasting', home: 'yes' },
                          ].map((row) => (
                            <tr key={row.srl} className="border-t border-zinc-800">
                              <td className="text-gray-500 px-2 py-1 text-[10px]">{row.srl}</td>
                              <td className="text-white px-2 py-1 text-[10px]">{row.name}</td>
                              <td className="text-gray-400 px-2 py-1 text-[10px]">{row.code}</td>
                              <td className="text-gray-400 px-2 py-1 text-[10px]">{row.cat}</td>
                              <td className="text-gray-400 px-2 py-1 text-[10px]">{row.sample}</td>
                              <td className="text-white text-right px-2 py-1 text-[10px]">{row.mrp}</td>
                              <td className="text-green-400 text-right px-2 py-1 text-[10px]">{row.disc || '—'}</td>
                              <td className="text-gray-400 text-right px-2 py-1 text-[10px]">{row.tat}</td>
                              <td className="text-gray-400 px-2 py-1 text-[10px]">{row.unit}</td>
                              <td className="text-gray-400 px-2 py-1 text-[10px]">{row.desc}</td>
                              <td className="text-gray-400 px-2 py-1 text-[10px]">{row.prep}</td>
                              <td className="text-center px-2 py-1 text-[10px]">{row.home === 'yes' ? <span className="text-green-400">yes</span> : <span className="text-gray-500">no</span>}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-3 space-y-1">
                    <p className="text-purple-300 text-xs font-semibold mb-1">Column Guide:</p>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-0.5">
                      <p className="text-gray-400 text-[11px]"><span className="text-white font-medium">Test Name *</span> — Required</p>
                      <p className="text-gray-400 text-[11px]"><span className="text-white font-medium">Test Code</span> — e.g. CBC001</p>
                      <p className="text-gray-400 text-[11px]"><span className="text-white font-medium">Category</span> — Haematology, Biochemistry...</p>
                      <p className="text-gray-400 text-[11px]"><span className="text-white font-medium">Sample Type</span> — Blood, Urine, Stool...</p>
                      <p className="text-gray-400 text-[11px]"><span className="text-white font-medium">Price (MRP) *</span> — Required, in ₹</p>
                      <p className="text-gray-400 text-[11px]"><span className="text-white font-medium">Discount Price</span> — Blank = no discount</p>
                      <p className="text-gray-400 text-[11px]"><span className="text-white font-medium">TAT / Unit</span> — e.g. 24 hours, 2 days</p>
                      <p className="text-gray-400 text-[11px]"><span className="text-white font-medium">Description</span> — Brief test info</p>
                      <p className="text-gray-400 text-[11px]"><span className="text-white font-medium">Preparation</span> — Fasting, etc.</p>
                      <p className="text-gray-400 text-[11px]"><span className="text-white font-medium">Home Collection</span> — yes / no</p>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <Button onClick={downloadTemplate} variant="outline" className="flex-1 border-zinc-700 text-gray-300 hover:bg-zinc-800 gap-2">
                      <Download className="w-4 h-4" /> Download Template
                    </Button>
                    <Button onClick={() => bulkFileRef.current?.click()} className="flex-1 bg-purple-500 hover:bg-purple-600 gap-2">
                      <Upload className="w-4 h-4" /> Choose Excel File
                    </Button>
                  </div>

                  <p className="text-gray-500 text-xs text-center">Supports .xlsx, .xls, and .csv files</p>

                  {/* Show errors from a failed parse */}
                  {bulkErrors.length > 0 && (
                    <div className="bg-red-500/5 border border-red-500/20 rounded-lg p-3">
                      <p className="text-red-400 text-xs font-semibold mb-1 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" /> Issues found:
                      </p>
                      {bulkErrors.map((err, i) => (
                        <p key={i} className="text-red-300/70 text-xs">{err}</p>
                      ))}
                    </div>
                  )}
                </>
              )}

              {/* STEP 2: Preview parsed data */}
              {bulkData.length > 0 && (
                <>
                  <div className="flex gap-4">
                    <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg px-4 py-3 flex-1 text-center">
                      <p className="text-2xl font-bold text-purple-400">{bulkData.length}</p>
                      <p className="text-gray-400 text-xs">Tests ready</p>
                    </div>
                    {bulkErrors.length > 0 && (
                      <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3 flex-1 text-center">
                        <p className="text-2xl font-bold text-red-400">{bulkErrors.length}</p>
                        <p className="text-gray-400 text-xs">Rows skipped</p>
                      </div>
                    )}
                  </div>

                  {bulkErrors.length > 0 && (
                    <div className="bg-red-500/5 border border-red-500/20 rounded-lg p-3 max-h-28 overflow-y-auto">
                      <p className="text-red-400 text-xs font-semibold mb-1 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" /> Skipped rows:
                      </p>
                      {bulkErrors.map((err, i) => (
                        <p key={i} className="text-red-300/70 text-xs">{err}</p>
                      ))}
                    </div>
                  )}

                  <div className="border border-zinc-800 rounded-lg overflow-hidden">
                    <div className="max-h-56 overflow-x-auto overflow-y-auto">
                      <table className="w-full text-sm" style={{ minWidth: '600px' }}>
                        <thead className="bg-zinc-800 sticky top-0">
                          <tr>
                            <th className="text-left text-gray-400 px-2 py-2 font-medium text-[10px]">#</th>
                            <th className="text-left text-gray-400 px-2 py-2 font-medium text-[10px]">Test Name</th>
                            <th className="text-left text-gray-400 px-2 py-2 font-medium text-[10px]">Code</th>
                            <th className="text-left text-gray-400 px-2 py-2 font-medium text-[10px]">Category</th>
                            <th className="text-left text-gray-400 px-2 py-2 font-medium text-[10px]">Sample</th>
                            <th className="text-right text-gray-400 px-2 py-2 font-medium text-[10px]">MRP</th>
                            <th className="text-right text-gray-400 px-2 py-2 font-medium text-[10px]">Disc.</th>
                            <th className="text-right text-gray-400 px-2 py-2 font-medium text-[10px]">TAT</th>
                          </tr>
                        </thead>
                        <tbody>
                          {bulkData.map((item, i) => (
                            <tr key={i} className="border-t border-zinc-800 hover:bg-zinc-800/50">
                              <td className="text-gray-500 px-2 py-1.5 text-[10px]">{i + 1}</td>
                              <td className="text-white px-2 py-1.5 text-[10px]">{item.testName}</td>
                              <td className="text-gray-500 px-2 py-1.5 text-[10px]">{item.testCode || '—'}</td>
                              <td className="text-gray-400 px-2 py-1.5 text-[10px]">{item.category}</td>
                              <td className="text-gray-400 px-2 py-1.5 text-[10px]">{item.sampleType}</td>
                              <td className="text-white text-right px-2 py-1.5 text-[10px]">₹{item.price}</td>
                              <td className="text-right px-2 py-1.5 text-[10px]">
                                {item.discountedPrice ? (
                                  <span className="text-green-400">₹{item.discountedPrice}</span>
                                ) : (
                                  <span className="text-gray-600">—</span>
                                )}
                              </td>
                              <td className="text-gray-400 text-right px-2 py-1.5 text-[10px]">
                                {item.turnaroundTime}{item.turnaroundUnit === 'hours' ? 'h' : 'd'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Progress bar */}
                  {bulkUploading && (
                    <div className="space-y-2">
                      <div className="w-full bg-zinc-800 rounded-full h-3 overflow-hidden">
                        <div
                          className="bg-purple-500 h-3 rounded-full transition-all duration-300"
                          style={{ width: `${bulkProgress}%` }}
                        />
                      </div>
                      <p className="text-purple-300 text-sm text-center">{bulkProgress}% — Adding tests...</p>
                    </div>
                  )}

                  <div className="flex gap-3">
                    <Button
                      variant="ghost"
                      onClick={() => { setBulkData([]); setBulkErrors([]); }}
                      disabled={bulkUploading}
                      className="flex-1 text-gray-400"
                    >
                      ← Back
                    </Button>
                    <Button
                      onClick={handleBulkSave}
                      disabled={bulkUploading}
                      className="flex-1 bg-purple-500 hover:bg-purple-600 gap-2"
                    >
                      <Upload className="w-4 h-4" />
                      {bulkUploading ? `Adding... ${bulkProgress}%` : `Add ${bulkData.length} Tests`}
                    </Button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
