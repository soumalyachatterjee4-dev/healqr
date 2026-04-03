import { useState, useEffect, useMemo } from 'react';
import { FlaskConical, Download, Lock, TrendingUp, MapPin, Stethoscope, BarChart3, AlertTriangle, RefreshCw } from 'lucide-react';
import { db } from '../lib/firebase/config';
import { collection, getDocs, query, where, doc, getDoc, addDoc, serverTimestamp, orderBy } from 'firebase/firestore';
import { getZoneFromState } from '../utils/pincodeMapping';

interface PharmaRxTrendsProps {
  companyId: string;
}

interface MoleculeData {
  medicineName: string;
  dosage: string;
  frequency: string;
  doctorId: string;
  specialty: string;
  state: string;
  pincode: string;
  companyName: string;
  division: string;
  createdAt: any;
}

interface ExtractionRecord {
  id: string;
  extractedAt: any;
  rxCount: number;
  moleculeCount: number;
  topMolecules: { name: string; count: number }[];
}

interface MoleculeSummary {
  name: string;
  count: number;
  states: Record<string, number>;
  specialties: Record<string, number>;
  zones: Record<string, number>;
}

export default function PharmaRxTrends({ companyId }: PharmaRxTrendsProps) {
  const [loading, setLoading] = useState(true);
  const [extracting, setExtracting] = useState(false);
  const [moleculeData, setMoleculeData] = useState<MoleculeData[]>([]);
  const [extractions, setExtractions] = useState<ExtractionRecord[]>([]);
  const [companyInfo, setCompanyInfo] = useState<{ companyName: string; territoryStates: string[]; specialties: string[] } | null>(null);
  const [totalRxCount, setTotalRxCount] = useState(0);
  const [viewMode, setViewMode] = useState<'overview' | 'history'>('overview');
  const [filterState, setFilterState] = useState<string>('all');
  const [filterSpecialty, setFilterSpecialty] = useState<string>('all');
  const MIN_RX = 100;

  useEffect(() => {
    loadData();
  }, [companyId]);

  const loadData = async () => {
    if (!companyId || !db) return;
    setLoading(true);
    try {
      // Get company info
      const companyDoc = await getDoc(doc(db, 'pharmaCompanies', companyId));
      if (companyDoc.exists()) {
        const d = companyDoc.data();
        setCompanyInfo({
          companyName: d.companyName || '',
          territoryStates: d.territoryStates || [],
          specialties: d.specialties || [],
        });
      }

      // Load rxMoleculeData for this company
      const q = query(collection(db, 'rxMoleculeData'), where('companyName', '==', companyDoc.data()?.companyName || ''));
      const snap = await getDocs(q);
      const data = snap.docs.map(d => d.data() as MoleculeData);
      setMoleculeData(data);

      // Count unique Rx (group by doctorId + createdAt day)
      const rxSet = new Set<string>();
      data.forEach(m => {
        const dateStr = m.createdAt?.toDate?.()?.toISOString?.()?.split('T')[0] || 'unknown';
        rxSet.add(`${m.doctorId}_${dateStr}`);
      });
      setTotalRxCount(rxSet.size);

      // Load extraction history
      const extSnap = await getDocs(query(
        collection(db, 'pharmaCompanies', companyId, 'rxExtractions'),
        orderBy('extractedAt', 'desc')
      ));
      setExtractions(extSnap.docs.map(d => ({
        id: d.id,
        extractedAt: d.data().extractedAt,
        rxCount: d.data().rxCount || 0,
        moleculeCount: d.data().moleculeCount || 0,
        topMolecules: d.data().topMolecules || [],
      })));
    } catch (err) {
      console.error('Error loading Rx trends:', err);
    } finally {
      setLoading(false);
    }
  };

  // Last extraction Rx count
  const lastExtractionRx = extractions.length > 0 ? extractions[0].rxCount : 0;
  const rxSinceLastExtraction = totalRxCount - lastExtractionRx;
  const canExtract = rxSinceLastExtraction >= MIN_RX;

  // Molecule aggregation
  const moleculeSummaries = useMemo(() => {
    const map: Record<string, MoleculeSummary> = {};
    moleculeData.forEach(m => {
      const name = (m.medicineName || '').toUpperCase().trim();
      if (!name) return;
      if (filterState !== 'all' && m.state !== filterState) return;
      if (filterSpecialty !== 'all' && m.specialty !== filterSpecialty) return;

      if (!map[name]) map[name] = { name, count: 0, states: {}, specialties: {}, zones: {} };
      map[name].count++;
      map[name].states[m.state] = (map[name].states[m.state] || 0) + 1;
      map[name].specialties[m.specialty] = (map[name].specialties[m.specialty] || 0) + 1;
      const zone = getZoneFromState(m.state);
      map[name].zones[zone] = (map[name].zones[zone] || 0) + 1;
    });
    return Object.values(map).sort((a, b) => b.count - a.count);
  }, [moleculeData, filterState, filterSpecialty]);

  const uniqueStates = useMemo(() => [...new Set(moleculeData.map(m => m.state))].filter(Boolean).sort(), [moleculeData]);
  const uniqueSpecialties = useMemo(() => [...new Set(moleculeData.map(m => m.specialty))].filter(Boolean).sort(), [moleculeData]);

  const handleExtract = async () => {
    if (!canExtract || extracting || !db) return;
    setExtracting(true);
    try {
      const top = moleculeSummaries.slice(0, 20).map(m => ({ name: m.name, count: m.count }));
      await addDoc(collection(db, 'pharmaCompanies', companyId, 'rxExtractions'), {
        extractedAt: serverTimestamp(),
        rxCount: totalRxCount,
        moleculeCount: moleculeSummaries.length,
        topMolecules: top,
        filterState,
        filterSpecialty,
      });
      await loadData();
    } catch (err) {
      console.error('Error saving extraction:', err);
    } finally {
      setExtracting(false);
    }
  };

  const maxCount = moleculeSummaries.length > 0 ? moleculeSummaries[0].count : 1;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-purple-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <FlaskConical className="w-5 h-5 text-purple-400" />
            Rx Molecule Trends
          </h2>
          <p className="text-sm text-gray-400 mt-1">Aggregated molecule data from AI RX decodes in your territory</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setViewMode('overview')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              viewMode === 'overview' ? 'bg-purple-600 text-white' : 'bg-zinc-800 text-gray-400 hover:bg-zinc-700'
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setViewMode('history')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              viewMode === 'history' ? 'bg-purple-600 text-white' : 'bg-zinc-800 text-gray-400 hover:bg-zinc-700'
            }`}
          >
            Extraction History
          </button>
        </div>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-zinc-900 rounded-xl p-5 border border-zinc-800">
          <p className="text-gray-400 text-sm mb-2">Total Rx Decoded</p>
          <p className="text-3xl font-bold text-purple-400">{totalRxCount}</p>
        </div>
        <div className="bg-zinc-900 rounded-xl p-5 border border-zinc-800">
          <p className="text-gray-400 text-sm mb-2">Unique Molecules</p>
          <p className="text-3xl font-bold text-blue-400">{moleculeSummaries.length}</p>
        </div>
        <div className="bg-zinc-900 rounded-xl p-5 border border-zinc-800">
          <p className="text-gray-400 text-sm mb-2">Since Last Extract</p>
          <p className={`text-3xl font-bold ${canExtract ? 'text-emerald-400' : 'text-amber-400'}`}>{rxSinceLastExtraction}</p>
          <p className="text-xs text-gray-500 mt-1">Need {MIN_RX} to extract</p>
        </div>
        <div className="bg-zinc-900 rounded-xl p-5 border border-zinc-800">
          <p className="text-gray-400 text-sm mb-2">Extractions Done</p>
          <p className="text-3xl font-bold text-emerald-400">{extractions.length}</p>
        </div>
      </div>

      {/* Extract Button */}
      <div className={`rounded-xl p-4 border ${canExtract ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-zinc-900 border-zinc-800'}`}>
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            {canExtract ? (
              <TrendingUp className="w-5 h-5 text-emerald-400" />
            ) : (
              <Lock className="w-5 h-5 text-gray-500" />
            )}
            <div>
              <p className={`text-sm font-medium ${canExtract ? 'text-emerald-400' : 'text-gray-400'}`}>
                {canExtract ? 'Ready to extract!' : `Need ${MIN_RX - rxSinceLastExtraction} more Rx to unlock extraction`}
              </p>
              <p className="text-xs text-gray-500 mt-0.5">
                Minimum {MIN_RX} new Rx prescriptions required between extractions
              </p>
            </div>
          </div>
          <button
            onClick={handleExtract}
            disabled={!canExtract || extracting}
            className={`px-5 py-2.5 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors ${
              canExtract
                ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                : 'bg-zinc-800 text-gray-600 cursor-not-allowed'
            }`}
          >
            {extracting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            {extracting ? 'Extracting...' : 'Extract Report'}
          </button>
        </div>
      </div>

      {viewMode === 'overview' ? (
        <>
          {/* Filters */}
          <div className="flex flex-wrap gap-3">
            <select
              value={filterState}
              onChange={e => setFilterState(e.target.value)}
              className="px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-sm text-white"
            >
              <option value="all">All States</option>
              {uniqueStates.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <select
              value={filterSpecialty}
              onChange={e => setFilterSpecialty(e.target.value)}
              className="px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-sm text-white"
            >
              <option value="all">All Specialties</option>
              {uniqueSpecialties.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          {/* Molecule Rankings */}
          <div className="bg-zinc-900 rounded-xl border border-zinc-800">
            <div className="p-4 border-b border-zinc-800">
              <h3 className="font-semibold flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-purple-400" />
                Molecule Rankings
              </h3>
              <p className="text-xs text-gray-500 mt-1">Top prescribed molecules across your territory</p>
            </div>
            <div className="divide-y divide-zinc-800">
              {moleculeSummaries.length === 0 ? (
                <div className="p-8 text-center">
                  <AlertTriangle className="w-8 h-8 text-gray-600 mx-auto mb-3" />
                  <p className="text-gray-400">No molecule data available yet</p>
                  <p className="text-xs text-gray-600 mt-1">Data will appear as doctors use the AI RX Reader</p>
                </div>
              ) : (
                moleculeSummaries.slice(0, 30).map((mol, idx) => {
                  const topState = Object.entries(mol.states).sort(([, a], [, b]) => b - a)[0];
                  const topSpec = Object.entries(mol.specialties).sort(([, a], [, b]) => b - a)[0];
                  return (
                    <div key={mol.name} className="px-4 py-3">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                            idx < 3 ? 'bg-purple-500/20 text-purple-400' : 'bg-zinc-800 text-gray-500'
                          }`}>
                            {idx + 1}
                          </span>
                          <div>
                            <p className="text-sm font-medium">{mol.name}</p>
                            <div className="flex items-center gap-3 text-xs text-gray-500 mt-0.5">
                              {topState && (
                                <span className="flex items-center gap-1">
                                  <MapPin className="w-3 h-3" />
                                  {topState[0]} ({topState[1]})
                                </span>
                              )}
                              {topSpec && (
                                <span className="flex items-center gap-1">
                                  <Stethoscope className="w-3 h-3" />
                                  {topSpec[0]} ({topSpec[1]})
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <span className="text-sm font-bold font-mono text-purple-400">{mol.count}</span>
                      </div>
                      <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-purple-600 to-purple-400 rounded-full"
                          style={{ width: `${(mol.count / maxCount) * 100}%` }}
                        />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Zone-wise Molecule Distribution */}
          {moleculeSummaries.length > 0 && (
            <div className="bg-zinc-900 rounded-xl border border-zinc-800">
              <div className="p-4 border-b border-zinc-800">
                <h3 className="font-semibold flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-amber-400" />
                  Zone-wise Top Molecules
                </h3>
              </div>
              <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {(() => {
                  const zoneMap: Record<string, Record<string, number>> = {};
                  moleculeData.forEach(m => {
                    const zone = getZoneFromState(m.state);
                    if (!zoneMap[zone]) zoneMap[zone] = {};
                    const name = (m.medicineName || '').toUpperCase().trim();
                    if (name) zoneMap[zone][name] = (zoneMap[zone][name] || 0) + 1;
                  });
                  return Object.entries(zoneMap)
                    .sort(([, a], [, b]) => Object.values(b).reduce((s, v) => s + v, 0) - Object.values(a).reduce((s, v) => s + v, 0))
                    .map(([zone, mols]) => {
                      const top3 = Object.entries(mols).sort(([, a], [, b]) => b - a).slice(0, 3);
                      return (
                        <div key={zone} className="bg-zinc-800/50 rounded-lg p-3 border border-zinc-700/50">
                          <p className="text-sm font-semibold text-amber-400 mb-2">{zone}</p>
                          <div className="space-y-1.5">
                            {top3.map(([name, count], i) => (
                              <div key={name} className="flex items-center justify-between text-xs">
                                <span className="text-gray-300 truncate flex-1">{i + 1}. {name}</span>
                                <span className="text-gray-500 font-mono ml-2">{count}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    });
                })()}
              </div>
            </div>
          )}
        </>
      ) : (
        /* Extraction History */
        <div className="bg-zinc-900 rounded-xl border border-zinc-800">
          <div className="p-4 border-b border-zinc-800">
            <h3 className="font-semibold flex items-center gap-2">
              <Download className="w-4 h-4 text-emerald-400" />
              Extraction History
            </h3>
            <p className="text-xs text-gray-500 mt-1">Previous reports — save to device for offline access</p>
          </div>
          {extractions.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <p>No extractions yet</p>
              <p className="text-xs mt-1">Extract your first report once you have {MIN_RX}+ decoded Rx</p>
            </div>
          ) : (
            <div className="divide-y divide-zinc-800">
              {extractions.map(ext => (
                <div key={ext.id} className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="text-sm font-medium">
                        {ext.extractedAt?.toDate?.()?.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) || 'Unknown date'}
                      </p>
                      <p className="text-xs text-gray-500">{ext.rxCount} Rx decoded • {ext.moleculeCount} unique molecules</p>
                    </div>
                    <button
                      onClick={() => {
                        const content = `Rx Molecule Extraction Report\nDate: ${ext.extractedAt?.toDate?.()?.toLocaleDateString() || 'N/A'}\nRx Count: ${ext.rxCount}\nUnique Molecules: ${ext.moleculeCount}\n\nTop Molecules:\n${ext.topMolecules.map((m, i) => `${i + 1}. ${m.name} — ${m.count} prescriptions`).join('\n')}`;
                        const blob = new Blob([content], { type: 'text/plain' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `rx-extraction-${ext.extractedAt?.toDate?.()?.toISOString?.()?.split('T')[0] || 'report'}.txt`;
                        a.click();
                        URL.revokeObjectURL(url);
                      }}
                      className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-sm rounded-lg flex items-center gap-1.5 transition-colors"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Save
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {ext.topMolecules.slice(0, 5).map(m => (
                      <span key={m.name} className="px-2 py-1 bg-purple-500/10 text-purple-400 text-xs rounded-lg">
                        {m.name} ({m.count})
                      </span>
                    ))}
                    {ext.topMolecules.length > 5 && (
                      <span className="px-2 py-1 bg-zinc-800 text-gray-500 text-xs rounded-lg">
                        +{ext.topMolecules.length - 5} more
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Privacy Notice */}
      <div className="bg-purple-500/10 border border-purple-500/30 rounded-xl p-4">
        <p className="text-sm text-purple-400">
          <strong>Aggregate Data Only:</strong> Molecule trends are aggregated from {MIN_RX}+ prescriptions. No individual patient or prescription data is shared.
        </p>
      </div>
    </div>
  );
}
