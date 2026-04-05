import { useState, useEffect, useMemo } from 'react';
import { collection, getDocs, query, orderBy, limit, where, Timestamp } from 'firebase/firestore';
import { db } from '../lib/firebase/config';
import { TrendingUp, Download, Calendar, MapPin, Stethoscope, Pill, Activity, RefreshCw, FileText, ChevronDown, ChevronRight, Filter } from 'lucide-react';

interface TrendSummary {
  id: string;
  date: string;
  totalRx: number;
  uniqueDoctors: number;
  topMedicines: { name: string; count: number; topStates: { state: string; count: number }[]; topSpecialties: { specialty: string; count: number }[]; topDiagnoses: { diagnosis: string; count: number }[] }[];
  topDiagnoses: { name: string; count: number }[];
  topStates: { name: string; count: number }[];
  topSpecialties: { name: string; count: number }[];
  territorySummaries: { territory: string; totalRx: number; topMedicines: { name: string; count: number }[] }[];
  createdAt: any;
}

interface RawMoleculeData {
  medicineName: string;
  dosage: string;
  frequency: string;
  specialty: string;
  state: string;
  pincode: string;
  diagnosis: string;
  territory: string;
  source?: string;
  createdAt: any;
}

export default function AdminRxTrends() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [trendSummaries, setTrendSummaries] = useState<TrendSummary[]>([]);
  const [rawData, setRawData] = useState<RawMoleculeData[]>([]);
  const [viewMode, setViewMode] = useState<'aggregated' | 'raw' | 'extract'>('aggregated');
  const [expandedMed, setExpandedMed] = useState<string | null>(null);
  const [filterState, setFilterState] = useState('all');
  const [filterSpecialty, setFilterSpecialty] = useState('all');
  const [filterPincode, setFilterPincode] = useState('all');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  const loadData = async () => {
    try {
      // Load aggregated trends (last 30 days)
      const trendsSnap = await getDocs(
        query(collection(db, 'rxTrends'), orderBy('date', 'desc'), limit(30))
      );
      const trends = trendsSnap.docs.map(d => ({ id: d.id, ...d.data() } as TrendSummary));
      setTrendSummaries(trends);

      // Load raw molecule data (all time)
      const rawSnap = await getDocs(collection(db, 'rxMoleculeData'));
      const raw = rawSnap.docs.map(d => d.data() as RawMoleculeData);
      setRawData(raw);
    } catch (err) {
      console.error('Failed to load Rx trends:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  // Compute all-time aggregation from raw data
  const allTimeStats = useMemo(() => {
    const medicineMap: Record<string, { count: number; states: Record<string, number>; specialties: Record<string, number>; diagnoses: Record<string, number> }> = {};
    const stateSet = new Set<string>();
    const specialtySet = new Set<string>();
    let totalRx = 0;

    for (const rec of rawData) {
      const med = (rec.medicineName || '').trim().toUpperCase();
      const state = (rec.state || '').trim();
      const specialty = (rec.specialty || '').trim();
      const diagnosis = (rec.diagnosis || '').trim();
      const pincode = (rec.pincode || '').trim();

      // Apply filters
      if (filterState !== 'all' && state !== filterState) continue;
      if (filterSpecialty !== 'all' && specialty !== filterSpecialty) continue;
      if (filterPincode !== 'all' && pincode !== filterPincode) continue;

      // Apply date filter
      if (fromDate && toDate) {
        const d = rec.createdAt?.toDate?.();
        if (!d) continue;
        const from = new Date(fromDate + 'T00:00:00');
        const to = new Date(toDate + 'T23:59:59');
        if (d < from || d > to) continue;
      }

      totalRx++;
      if (state) stateSet.add(state);
      if (specialty) specialtySet.add(specialty);

      if (med) {
        if (!medicineMap[med]) medicineMap[med] = { count: 0, states: {}, specialties: {}, diagnoses: {} };
        medicineMap[med].count++;
        if (state) medicineMap[med].states[state] = (medicineMap[med].states[state] || 0) + 1;
        if (specialty) medicineMap[med].specialties[specialty] = (medicineMap[med].specialties[specialty] || 0) + 1;
        if (diagnosis) medicineMap[med].diagnoses[diagnosis] = (medicineMap[med].diagnoses[diagnosis] || 0) + 1;
      }
    }

    const topMedicines = Object.entries(medicineMap)
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 50)
      .map(([name, data]) => ({
        name,
        count: data.count,
        topStates: Object.entries(data.states).sort((a, b) => b[1] - a[1]).slice(0, 5),
        topSpecialties: Object.entries(data.specialties).sort((a, b) => b[1] - a[1]).slice(0, 5),
        topDiagnoses: Object.entries(data.diagnoses).sort((a, b) => b[1] - a[1]).slice(0, 3),
      }));

    return { totalRx, uniqueMedicines: Object.keys(medicineMap).length, uniqueStates: stateSet.size, topMedicines };
  }, [rawData, filterState, filterSpecialty, filterPincode, fromDate, toDate]);

  // All unique states, specialties & pincodes for filters
  const allStates = useMemo(() => [...new Set(rawData.map(r => r.state).filter(Boolean))].sort(), [rawData]);
  const allSpecialties = useMemo(() => [...new Set(rawData.map(r => r.specialty).filter(Boolean))].sort(), [rawData]);
  const allPincodes = useMemo(() => [...new Set(rawData.map(r => r.pincode).filter(Boolean))].sort(), [rawData]);

  // CSV Export — anonymous data only (no doctor names/IDs, no company names)
  const exportCSV = (dataToExport?: RawMoleculeData[]) => {
    const data = dataToExport || rawData;
    const headers = ['Date', 'Territory', 'State', 'Pincode', 'Specialty', 'Diagnosis', 'Medicine', 'Dosage', 'Frequency', 'Source'];
    const rows = data
      .filter(r => {
        if (filterState !== 'all' && r.state !== filterState) return false;
        if (filterSpecialty !== 'all' && r.specialty !== filterSpecialty) return false;
        if (filterPincode !== 'all' && r.pincode !== filterPincode) return false;
        return true;
      })
      .map(r => {
        const date = r.createdAt?.toDate?.() ? r.createdAt.toDate().toISOString().split('T')[0] : '';
        return [
          date,
          r.territory || '',
          r.state || '',
          r.pincode || '',
          r.specialty || '',
          r.diagnosis || '',
          r.medicineName || '',
          r.dosage || '',
          r.frequency || '',
          r.source || 'ai-rx',
        ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(',');
      });

    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const dateLabel = fromDate && toDate ? `${fromDate}-to-${toDate}` : new Date().toISOString().split('T')[0];
    a.download = `healqr-rx-trends-${dateLabel}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Date-range filtered data for extraction
  const dateFilteredData = useMemo(() => {
    if (!fromDate || !toDate) return rawData;
    const from = new Date(fromDate + 'T00:00:00');
    const to = new Date(toDate + 'T23:59:59');
    return rawData.filter(r => {
      const d = r.createdAt?.toDate?.();
      if (!d) return false;
      return d >= from && d <= to;
    });
  }, [rawData, fromDate, toDate]);

  // Prescription grouping for date-filtered data (group by doctorId+date → anonymous Rx)
  const dateFilteredGroups = useMemo(() => {
    const groups: Record<string, RawMoleculeData[]> = {};
    dateFilteredData.forEach(m => {
      const dateStr = m.createdAt?.toDate?.()?.toISOString?.()?.split('T')[0] || 'unknown';
      const key = `${dateStr}_${m.territory}_${m.diagnosis}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(m);
    });
    return groups;
  }, [dateFilteredData]);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-black min-h-screen">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 text-emerald-400 animate-spin mx-auto mb-3" />
          <p className="text-gray-400">Loading Rx Trends...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto bg-black min-h-screen p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <TrendingUp className="w-7 h-7 text-emerald-400" />
            <div>
              <h1 className="text-xl font-bold text-white">Rx Trends</h1>
              <p className="text-sm text-gray-500">Anonymous prescription data analytics — no patient PII</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => { setRefreshing(true); loadData(); }}
              className="flex items-center gap-2 px-3 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg text-sm transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <button
              onClick={() => exportCSV()}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-medium transition-colors"
            >
              <Download className="w-4 h-4" />
              Export CSV
            </button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <div className="flex items-center gap-2 text-gray-500 text-xs mb-1">
              <Pill className="w-3.5 h-3.5" /> Total Rx Records
            </div>
            <p className="text-2xl font-bold text-white">{allTimeStats.totalRx.toLocaleString()}</p>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <div className="flex items-center gap-2 text-gray-500 text-xs mb-1">
              <Activity className="w-3.5 h-3.5" /> Unique Products
            </div>
            <p className="text-2xl font-bold text-emerald-400">{allTimeStats.uniqueMedicines.toLocaleString()}</p>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <div className="flex items-center gap-2 text-gray-500 text-xs mb-1">
              <Stethoscope className="w-3.5 h-3.5" /> Unique Specialties
            </div>
            <p className="text-2xl font-bold text-purple-400">{allSpecialties.length}</p>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <div className="flex items-center gap-2 text-gray-500 text-xs mb-1">
              <MapPin className="w-3.5 h-3.5" /> States Covered
            </div>
            <p className="text-2xl font-bold text-amber-400">{allTimeStats.uniqueStates}</p>
          </div>
        </div>

        {/* Filters & View Toggle */}
        <div className="flex flex-wrap items-center gap-3 mb-6">
          <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)}
            className="bg-gray-800 border border-gray-700 text-gray-300 text-sm rounded-lg px-3 py-2" placeholder="From" />
          <input type="date" value={toDate} onChange={e => setToDate(e.target.value)}
            className="bg-gray-800 border border-gray-700 text-gray-300 text-sm rounded-lg px-3 py-2" placeholder="To" />
          <select
            value={filterState}
            onChange={e => setFilterState(e.target.value)}
            className="bg-gray-800 border border-gray-700 text-gray-300 text-sm rounded-lg px-3 py-2"
          >
            <option value="all">All States</option>
            {allStates.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <select
            value={filterPincode}
            onChange={e => setFilterPincode(e.target.value)}
            className="bg-gray-800 border border-gray-700 text-gray-300 text-sm rounded-lg px-3 py-2"
          >
            <option value="all">All Pincodes</option>
            {allPincodes.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
          <select
            value={filterSpecialty}
            onChange={e => setFilterSpecialty(e.target.value)}
            className="bg-gray-800 border border-gray-700 text-gray-300 text-sm rounded-lg px-3 py-2"
          >
            <option value="all">All Specialties</option>
            {allSpecialties.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <div className="flex-1" />
          <div className="flex bg-gray-800 rounded-lg overflow-hidden">
            <button
              onClick={() => setViewMode('aggregated')}
              className={`px-4 py-2 text-sm font-medium transition-colors ${viewMode === 'aggregated' ? 'bg-emerald-600 text-white' : 'text-gray-400 hover:text-white'}`}
            >
              Aggregated
            </button>
            <button
              onClick={() => setViewMode('extract')}
              className={`px-4 py-2 text-sm font-medium transition-colors ${viewMode === 'extract' ? 'bg-emerald-600 text-white' : 'text-gray-400 hover:text-white'}`}
            >
              Extract Report
            </button>
            <button
              onClick={() => setViewMode('raw')}
              className={`px-4 py-2 text-sm font-medium transition-colors ${viewMode === 'raw' ? 'bg-emerald-600 text-white' : 'text-gray-400 hover:text-white'}`}
            >
              Daily Trends
            </button>
          </div>
        </div>

        {/* ====== AGGREGATED VIEW ====== */}
        {viewMode === 'aggregated' && (
          <div className="space-y-3">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-emerald-400" />
              Top Molecules (All Time)
            </h2>
            {allTimeStats.topMedicines.length === 0 ? (
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 text-center">
                <Pill className="w-10 h-10 text-gray-600 mx-auto mb-3" />
                <p className="text-gray-400">No Rx data yet. Data will appear after doctors start using AI RX Reader.</p>
              </div>
            ) : (
              allTimeStats.topMedicines.map((med, idx) => (
                <div key={med.name} className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
                  <button
                    onClick={() => setExpandedMed(expandedMed === med.name ? null : med.name)}
                    className="w-full flex items-center gap-4 p-4 hover:bg-gray-800/50 transition-colors"
                  >
                    <span className="text-emerald-400 font-mono text-sm w-8 text-right">#{idx + 1}</span>
                    <div className="flex-1 text-left">
                      <p className="text-white font-medium">{med.name}</p>
                      <p className="text-gray-500 text-xs mt-0.5">
                        {med.topDiagnoses.length > 0 && `Dx: ${med.topDiagnoses.map(d => d[0]).join(', ')} · `}
                        {med.topSpecialties.length > 0 && `${med.topSpecialties[0][0]}`}
                      </p>
                    </div>
                    <div className="text-right mr-2">
                      <p className="text-white font-bold">{med.count}</p>
                      <p className="text-gray-500 text-xs">prescriptions</p>
                    </div>
                    {/* Bar indicator */}
                    <div className="w-24 h-2 bg-gray-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 rounded-full"
                        style={{ width: `${Math.min(100, (med.count / (allTimeStats.topMedicines[0]?.count || 1)) * 100)}%` }}
                      />
                    </div>
                    {expandedMed === med.name ? <ChevronDown className="w-4 h-4 text-gray-500" /> : <ChevronRight className="w-4 h-4 text-gray-500" />}
                  </button>

                  {expandedMed === med.name && (
                    <div className="px-4 pb-4 pt-0 border-t border-gray-800 grid grid-cols-1 md:grid-cols-3 gap-4">
                      {/* States */}
                      <div>
                        <p className="text-xs text-gray-500 uppercase mb-2 flex items-center gap-1"><MapPin className="w-3 h-3" /> Top States</p>
                        {med.topStates.map(([state, count]) => (
                          <div key={state} className="flex justify-between text-sm py-1">
                            <span className="text-gray-300">{state}</span>
                            <span className="text-emerald-400 font-mono">{count}</span>
                          </div>
                        ))}
                        {med.topStates.length === 0 && <p className="text-gray-600 text-xs">No state data</p>}
                      </div>
                      {/* Specialties */}
                      <div>
                        <p className="text-xs text-gray-500 uppercase mb-2 flex items-center gap-1"><Stethoscope className="w-3 h-3" /> Specialties</p>
                        {med.topSpecialties.map(([spec, count]) => (
                          <div key={spec} className="flex justify-between text-sm py-1">
                            <span className="text-gray-300">{spec}</span>
                            <span className="text-purple-400 font-mono">{count}</span>
                          </div>
                        ))}
                        {med.topSpecialties.length === 0 && <p className="text-gray-600 text-xs">No specialty data</p>}
                      </div>
                      {/* Diagnoses */}
                      <div>
                        <p className="text-xs text-gray-500 uppercase mb-2 flex items-center gap-1"><FileText className="w-3 h-3" /> Diagnoses</p>
                        {med.topDiagnoses.map(([dx, count]) => (
                          <div key={dx} className="flex justify-between text-sm py-1">
                            <span className="text-gray-300">{dx}</span>
                            <span className="text-amber-400 font-mono">{count}</span>
                          </div>
                        ))}
                        {med.topDiagnoses.length === 0 && <p className="text-gray-600 text-xs">No diagnosis data yet</p>}
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {/* ====== EXTRACT REPORT TAB ====== */}
        {viewMode === 'extract' && (
          <div className="space-y-6">
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-4">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <Filter className="w-5 h-5 text-emerald-400" />
                Extract Anonymous Report
              </h3>
              <p className="text-sm text-gray-400">Download anonymous Rx data by date range. No doctor names, IDs, or patient data included — legally safe for analytics and pharma sales.</p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">From Date</label>
                  <input
                    type="date"
                    value={fromDate}
                    onChange={e => setFromDate(e.target.value)}
                    className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">To Date</label>
                  <input
                    type="date"
                    value={toDate}
                    onChange={e => setToDate(e.target.value)}
                    className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm"
                  />
                </div>
              </div>

              {/* Stats for selected range */}
              {fromDate && toDate && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="bg-gray-800 rounded-lg p-3 text-center">
                    <p className="text-xs text-gray-500">Records</p>
                    <p className="text-xl font-bold text-emerald-400">{dateFilteredData.length}</p>
                  </div>
                  <div className="bg-gray-800 rounded-lg p-3 text-center">
                    <p className="text-xs text-gray-500">Unique Products</p>
                    <p className="text-xl font-bold text-purple-400">{new Set(dateFilteredData.map(m => (m.medicineName || '').toUpperCase().trim())).size}</p>
                  </div>
                  <div className="bg-gray-800 rounded-lg p-3 text-center">
                    <p className="text-xs text-gray-500">States</p>
                    <p className="text-xl font-bold text-amber-400">{new Set(dateFilteredData.map(m => m.state).filter(Boolean)).size}</p>
                  </div>
                  <div className="bg-gray-800 rounded-lg p-3 text-center">
                    <p className="text-xs text-gray-500">Prescriptions</p>
                    <p className="text-xl font-bold text-blue-400">{Object.keys(dateFilteredGroups).length}</p>
                  </div>
                </div>
              )}

              <button
                onClick={() => exportCSV(fromDate && toDate ? dateFilteredData : undefined)}
                disabled={fromDate && toDate ? dateFilteredData.length === 0 : rawData.length === 0}
                className="flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-500 disabled:bg-gray-700 disabled:text-gray-500 text-white rounded-lg text-sm font-bold transition-colors"
              >
                <Download className="w-4 h-4" />
                {fromDate && toDate ? `Download CSV (${dateFilteredData.length} records)` : 'Download All Data CSV'}
              </button>
            </div>

            {/* Preview of top products in selected range */}
            {fromDate && toDate && dateFilteredData.length > 0 && (
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                <h4 className="text-sm font-semibold text-gray-400 mb-3">Top Products in Selected Period</h4>
                <div className="space-y-2">
                  {(() => {
                    const medMap: Record<string, number> = {};
                    dateFilteredData.forEach(m => {
                      const name = (m.medicineName || '').toUpperCase().trim();
                      if (name) medMap[name] = (medMap[name] || 0) + 1;
                    });
                    return Object.entries(medMap)
                      .sort(([, a], [, b]) => b - a)
                      .slice(0, 15)
                      .map(([name, count], i) => (
                        <div key={name} className="flex items-center justify-between py-1.5 px-3 bg-gray-800/50 rounded-lg">
                          <div className="flex items-center gap-3">
                            <span className="text-emerald-400 font-mono text-xs w-6 text-right">#{i + 1}</span>
                            <span className="text-white text-sm">{name}</span>
                          </div>
                          <span className="text-emerald-400 font-mono text-sm font-bold">{count}</span>
                        </div>
                      ));
                  })()}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ====== DAILY TRENDS VIEW ====== */}
        {viewMode === 'raw' && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <Calendar className="w-5 h-5 text-emerald-400" />
              Daily Aggregated Trends
            </h2>
            {trendSummaries.length === 0 ? (
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 text-center">
                <Calendar className="w-10 h-10 text-gray-600 mx-auto mb-3" />
                <p className="text-gray-400">No daily summaries yet. The nightly aggregation runs at 2:00 AM IST.</p>
                <p className="text-gray-600 text-sm mt-1">Deploy Cloud Functions to start automated aggregation.</p>
              </div>
            ) : (
              trendSummaries.map(summary => (
                <div key={summary.id} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <Calendar className="w-4 h-4 text-emerald-400" />
                      <span className="text-white font-medium">{summary.date}</span>
                    </div>
                    <div className="flex items-center gap-4 text-sm">
                      <span className="text-gray-400">{summary.totalRx} Rx</span>
                      <span className="text-gray-400">{summary.uniqueDoctors} doctors</span>
                    </div>
                  </div>
                  {/* Top 5 medicines for the day */}
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                    {(summary.topMedicines || []).slice(0, 5).map((med, i) => (
                      <div key={med.name} className="bg-gray-800 rounded-lg px-3 py-2">
                        <p className="text-emerald-400 text-xs font-mono">#{i + 1}</p>
                        <p className="text-white text-sm font-medium truncate">{med.name}</p>
                        <p className="text-gray-500 text-xs">{med.count} Rx</p>
                      </div>
                    ))}
                  </div>
                  {/* Territory breakdown */}
                  {summary.territorySummaries?.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-gray-800">
                      <p className="text-xs text-gray-500 mb-2">Territory Distribution</p>
                      <div className="flex flex-wrap gap-2">
                        {summary.territorySummaries.slice(0, 6).map(t => (
                          <span key={t.territory} className="bg-gray-800 px-2 py-1 rounded text-xs text-gray-300">
                            {t.territory}: {t.totalRx} Rx
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
