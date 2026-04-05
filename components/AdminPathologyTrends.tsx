import { useState, useEffect, useMemo } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase/config';
import { Microscope, Download, RefreshCw, MapPin, Stethoscope, Activity, Filter, ChevronDown, ChevronRight, Hash } from 'lucide-react';

interface PathologyData {
  testName: string;
  testKey: string;
  testValue: string;
  testUnit: string;
  specialty: string;
  state: string;
  pincode: string;
  diagnosis: string;
  territory: string;
  source?: string;
  createdAt: any;
}

export default function AdminPathologyTrends() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [rawData, setRawData] = useState<PathologyData[]>([]);
  const [viewMode, setViewMode] = useState<'aggregated' | 'extract'>('aggregated');
  const [expandedTest, setExpandedTest] = useState<string | null>(null);
  const [filterState, setFilterState] = useState('all');
  const [filterSpecialty, setFilterSpecialty] = useState('all');
  const [filterPincode, setFilterPincode] = useState('all');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  const loadData = async () => {
    try {
      const snap = await getDocs(collection(db, 'pathologyMoleculeData'));
      setRawData(snap.docs.map(d => d.data() as PathologyData));
    } catch (err) {
      console.error('Failed to load pathology trends:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  // Aggregation
  const allTimeStats = useMemo(() => {
    const testMap: Record<string, { count: number; states: Record<string, number>; specialties: Record<string, number>; diagnoses: Record<string, number> }> = {};
    const stateSet = new Set<string>();
    const specialtySet = new Set<string>();
    let total = 0;

    for (const rec of rawData) {
      const test = (rec.testName || '').trim().toUpperCase();
      const state = (rec.state || '').trim();
      const specialty = (rec.specialty || '').trim();
      const diagnosis = (rec.diagnosis || '').trim();
      const pincode = (rec.pincode || '').trim();

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

      total++;
      if (state) stateSet.add(state);
      if (specialty) specialtySet.add(specialty);

      if (test) {
        if (!testMap[test]) testMap[test] = { count: 0, states: {}, specialties: {}, diagnoses: {} };
        testMap[test].count++;
        if (state) testMap[test].states[state] = (testMap[test].states[state] || 0) + 1;
        if (specialty) testMap[test].specialties[specialty] = (testMap[test].specialties[specialty] || 0) + 1;
        if (diagnosis) testMap[test].diagnoses[diagnosis] = (testMap[test].diagnoses[diagnosis] || 0) + 1;
      }
    }

    const topTests = Object.entries(testMap)
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 50)
      .map(([name, data]) => ({
        name,
        count: data.count,
        topStates: Object.entries(data.states).sort((a, b) => b[1] - a[1]).slice(0, 5),
        topSpecialties: Object.entries(data.specialties).sort((a, b) => b[1] - a[1]).slice(0, 5),
        topDiagnoses: Object.entries(data.diagnoses).sort((a, b) => b[1] - a[1]).slice(0, 3),
      }));

    return { total, uniqueTests: Object.keys(testMap).length, uniqueStates: stateSet.size, topTests };
  }, [rawData, filterState, filterSpecialty, filterPincode, fromDate, toDate]);

  const allStates = useMemo(() => [...new Set(rawData.map(r => r.state).filter(Boolean))].sort(), [rawData]);
  const allSpecialties = useMemo(() => [...new Set(rawData.map(r => r.specialty).filter(Boolean))].sort(), [rawData]);
  const allPincodes = useMemo(() => [...new Set(rawData.map(r => r.pincode).filter(Boolean))].sort(), [rawData]);

  // Date-range filtered data
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

  // Anonymous CSV export
  const exportCSV = (dataToExport?: PathologyData[]) => {
    const data = dataToExport || rawData;
    const headers = ['Date', 'Territory', 'State', 'Pincode', 'Specialty', 'Diagnosis', 'Test Name', 'Test Value', 'Unit', 'Source'];
    const rows = data
      .filter(r => {
        if (filterState !== 'all' && r.state !== filterState) return false;
        if (filterSpecialty !== 'all' && r.specialty !== filterSpecialty) return false;
        if (filterPincode !== 'all' && r.pincode !== filterPincode) return false;
        return true;
      })
      .map(r => {
        const date = r.createdAt?.toDate?.() ? r.createdAt.toDate().toISOString().split('T')[0] : '';
        return [date, r.territory, r.state, r.pincode, r.specialty, r.diagnosis, r.testName, r.testValue, r.testUnit, r.source || 'digital-rx']
          .map(v => `"${String(v || '').replace(/"/g, '""')}"`).join(',');
      });

    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const dateLabel = fromDate && toDate ? `${fromDate}-to-${toDate}` : new Date().toISOString().split('T')[0];
    a.download = `healqr-pathology-trends-${dateLabel}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-black min-h-screen">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 text-teal-400 animate-spin mx-auto mb-3" />
          <p className="text-gray-400">Loading Pathology Trends...</p>
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
            <Microscope className="w-7 h-7 text-teal-400" />
            <div>
              <h1 className="text-xl font-bold text-white">Pathology Trends</h1>
              <p className="text-sm text-gray-500">Anonymous diagnostic test analytics — no patient or doctor PII</p>
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
              className="flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-lg text-sm font-medium transition-colors"
            >
              <Download className="w-4 h-4" />
              Export CSV
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <div className="flex items-center gap-2 text-gray-500 text-xs mb-1">
              <Microscope className="w-3.5 h-3.5" /> Total Records
            </div>
            <p className="text-2xl font-bold text-white">{allTimeStats.total.toLocaleString()}</p>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <div className="flex items-center gap-2 text-gray-500 text-xs mb-1">
              <Activity className="w-3.5 h-3.5" /> Unique Tests
            </div>
            <p className="text-2xl font-bold text-teal-400">{allTimeStats.uniqueTests.toLocaleString()}</p>
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
          <select value={filterState} onChange={e => setFilterState(e.target.value)}
            className="bg-gray-800 border border-gray-700 text-gray-300 text-sm rounded-lg px-3 py-2">
            <option value="all">All States</option>
            {allStates.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <select value={filterPincode} onChange={e => setFilterPincode(e.target.value)}
            className="bg-gray-800 border border-gray-700 text-gray-300 text-sm rounded-lg px-3 py-2">
            <option value="all">All Pincodes</option>
            {allPincodes.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
          <select value={filterSpecialty} onChange={e => setFilterSpecialty(e.target.value)}
            className="bg-gray-800 border border-gray-700 text-gray-300 text-sm rounded-lg px-3 py-2">
            <option value="all">All Specialties</option>
            {allSpecialties.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <div className="flex-1" />
          <div className="flex bg-gray-800 rounded-lg overflow-hidden">
            <button onClick={() => setViewMode('aggregated')}
              className={`px-4 py-2 text-sm font-medium transition-colors ${viewMode === 'aggregated' ? 'bg-teal-600 text-white' : 'text-gray-400 hover:text-white'}`}>
              Aggregated
            </button>
            <button onClick={() => setViewMode('extract')}
              className={`px-4 py-2 text-sm font-medium transition-colors ${viewMode === 'extract' ? 'bg-teal-600 text-white' : 'text-gray-400 hover:text-white'}`}>
              Extract Report
            </button>
          </div>
        </div>

        {/* ====== AGGREGATED VIEW ====== */}
        {viewMode === 'aggregated' && (
          <div className="space-y-3">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <Microscope className="w-5 h-5 text-teal-400" />
              Top Tests (All Time)
            </h2>
            {allTimeStats.topTests.length === 0 ? (
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 text-center">
                <Microscope className="w-10 h-10 text-gray-600 mx-auto mb-3" />
                <p className="text-gray-400">No pathology data yet. Data will appear after doctors add lab values in Digital Prescriptions.</p>
              </div>
            ) : (
              allTimeStats.topTests.map((test, idx) => (
                <div key={test.name} className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
                  <button
                    onClick={() => setExpandedTest(expandedTest === test.name ? null : test.name)}
                    className="w-full flex items-center gap-4 p-4 hover:bg-gray-800/50 transition-colors"
                  >
                    <span className="text-teal-400 font-mono text-sm w-8 text-right">#{idx + 1}</span>
                    <div className="flex-1 text-left">
                      <p className="text-white font-medium">{test.name}</p>
                      <p className="text-gray-500 text-xs mt-0.5">
                        {test.topDiagnoses.length > 0 && `Dx: ${test.topDiagnoses.map(d => d[0]).join(', ')} · `}
                        {test.topSpecialties.length > 0 && `${test.topSpecialties[0][0]}`}
                      </p>
                    </div>
                    <div className="text-right mr-2">
                      <p className="text-white font-bold">{test.count}</p>
                      <p className="text-gray-500 text-xs">orders</p>
                    </div>
                    <div className="w-24 h-2 bg-gray-800 rounded-full overflow-hidden">
                      <div className="h-full bg-teal-500 rounded-full"
                        style={{ width: `${Math.min(100, (test.count / (allTimeStats.topTests[0]?.count || 1)) * 100)}%` }} />
                    </div>
                    {expandedTest === test.name ? <ChevronDown className="w-4 h-4 text-gray-500" /> : <ChevronRight className="w-4 h-4 text-gray-500" />}
                  </button>
                  {expandedTest === test.name && (
                    <div className="px-4 pb-4 pt-0 border-t border-gray-800 grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <p className="text-xs text-gray-500 uppercase mb-2 flex items-center gap-1"><MapPin className="w-3 h-3" /> Top States</p>
                        {test.topStates.map(([state, count]) => (
                          <div key={state} className="flex justify-between text-sm py-1">
                            <span className="text-gray-300">{state}</span>
                            <span className="text-teal-400 font-mono">{count}</span>
                          </div>
                        ))}
                        {test.topStates.length === 0 && <p className="text-gray-600 text-xs">No state data</p>}
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 uppercase mb-2 flex items-center gap-1"><Stethoscope className="w-3 h-3" /> Specialties</p>
                        {test.topSpecialties.map(([spec, count]) => (
                          <div key={spec} className="flex justify-between text-sm py-1">
                            <span className="text-gray-300">{spec}</span>
                            <span className="text-purple-400 font-mono">{count}</span>
                          </div>
                        ))}
                        {test.topSpecialties.length === 0 && <p className="text-gray-600 text-xs">No specialty data</p>}
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 uppercase mb-2 flex items-center gap-1"><Filter className="w-3 h-3" /> Diagnoses</p>
                        {test.topDiagnoses.map(([dx, count]) => (
                          <div key={dx} className="flex justify-between text-sm py-1">
                            <span className="text-gray-300">{dx}</span>
                            <span className="text-amber-400 font-mono">{count}</span>
                          </div>
                        ))}
                        {test.topDiagnoses.length === 0 && <p className="text-gray-600 text-xs">No diagnosis data</p>}
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
                <Filter className="w-5 h-5 text-teal-400" />
                Extract Anonymous Pathology Report
              </h3>
              <p className="text-sm text-gray-400">Download anonymous pathology data by date range. No doctor names, IDs, or patient data — legally safe.</p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">From Date</label>
                  <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)}
                    className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">To Date</label>
                  <input type="date" value={toDate} onChange={e => setToDate(e.target.value)}
                    className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm" />
                </div>
              </div>

              {fromDate && toDate && (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div className="bg-gray-800 rounded-lg p-3 text-center">
                    <p className="text-xs text-gray-500">Records</p>
                    <p className="text-xl font-bold text-teal-400">{dateFilteredData.length}</p>
                  </div>
                  <div className="bg-gray-800 rounded-lg p-3 text-center">
                    <p className="text-xs text-gray-500">Unique Tests</p>
                    <p className="text-xl font-bold text-purple-400">{new Set(dateFilteredData.map(m => (m.testName || '').toUpperCase().trim())).size}</p>
                  </div>
                  <div className="bg-gray-800 rounded-lg p-3 text-center">
                    <p className="text-xs text-gray-500">States</p>
                    <p className="text-xl font-bold text-amber-400">{new Set(dateFilteredData.map(m => m.state).filter(Boolean)).size}</p>
                  </div>
                </div>
              )}

              <button
                onClick={() => exportCSV(fromDate && toDate ? dateFilteredData : undefined)}
                disabled={fromDate && toDate ? dateFilteredData.length === 0 : rawData.length === 0}
                className="flex items-center gap-2 px-6 py-3 bg-teal-600 hover:bg-teal-500 disabled:bg-gray-700 disabled:text-gray-500 text-white rounded-lg text-sm font-bold transition-colors"
              >
                <Download className="w-4 h-4" />
                {fromDate && toDate ? `Download CSV (${dateFilteredData.length} records)` : 'Download All Data CSV'}
              </button>
            </div>

            {/* Preview */}
            {fromDate && toDate && dateFilteredData.length > 0 && (
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                <h4 className="text-sm font-semibold text-gray-400 mb-3">Top Tests in Selected Period</h4>
                <div className="space-y-2">
                  {(() => {
                    const testMap: Record<string, number> = {};
                    dateFilteredData.forEach(m => {
                      const name = (m.testName || '').toUpperCase().trim();
                      if (name) testMap[name] = (testMap[name] || 0) + 1;
                    });
                    return Object.entries(testMap)
                      .sort(([, a], [, b]) => b - a)
                      .slice(0, 15)
                      .map(([name, count], i) => (
                        <div key={name} className="flex items-center justify-between py-1.5 px-3 bg-gray-800/50 rounded-lg">
                          <div className="flex items-center gap-3">
                            <span className="text-teal-400 font-mono text-xs w-6 text-right">#{i + 1}</span>
                            <span className="text-white text-sm">{name}</span>
                          </div>
                          <span className="text-teal-400 font-mono text-sm font-bold">{count}</span>
                        </div>
                      ));
                  })()}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
