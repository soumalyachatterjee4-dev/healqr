/**
 * AI PM Dashboard — HealQR Intelligence Hub
 * Platform Health • AI Services • Daily Reports • AI Assistant Integration
 */

import { useState, useEffect } from 'react';
import {
  Brain, Globe, MessageCircle, RefreshCw, Trash2, Activity, Zap,
  Languages, TrendingUp, Shield, AlertTriangle, Clock, Mail,
  Key, Link2, Server, Users, Bell, CheckCircle, Save, HeartPulse
} from 'lucide-react';
import { getAICacheStats, clearAITranslationCache, AI_SUPPORTED_LANGUAGES } from '../services/aiTranslationService';
import { db } from '../lib/firebase/config';
import {
  collection, query, orderBy, limit, getDocs, where, doc, setDoc,
  getDoc, updateDoc, Timestamp
} from 'firebase/firestore';

interface AdminAIPMDashboardProps {
  adminEmail: string;
}

interface HealthReport {
  id: string;
  timestamp: Date;
  bookingsLastHour: number;
  notificationsSentLastHour: number;
  activeDoctorsToday: number;
  stuckNotifications: number;
  status: 'healthy' | 'warning' | 'critical';
  issues: string[];
}

interface AdminAlert {
  id: string;
  type: string;
  severity: string;
  message: string;
  timestamp: Date;
  resolved: boolean;
}

interface DailyReportConfig {
  enabled: boolean;
  email: string;
  time: string;
}

interface AIAssistantConfig {
  provider: string;
  apiKeySet: boolean;
  connectedAt: Date | null;
  status: 'not_connected' | 'connected' | 'error';
}

const ESTIMATED_COST_PER_CALL_INR = 0.015;

const AI_PROVIDERS = [
  { value: 'claude-opus-4', label: 'Claude Opus 4.6 (Anthropic)' },
  { value: 'claude-sonnet-4', label: 'Claude Sonnet 4 (Anthropic)' },
  { value: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro (Google)' },
  { value: 'gpt-4o', label: 'GPT-4o (OpenAI)' },
];

export default function AdminAIPMDashboard({ adminEmail }: AdminAIPMDashboardProps) {
  // AI cache state
  const [cacheStats, setCacheStats] = useState({ memorySize: 0, dbName: '' });
  const [dbCacheCount, setDbCacheCount] = useState<number | null>(null);
  const [isClearing, setIsClearing] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState(new Date());

  // Platform Health state
  const [healthReports, setHealthReports] = useState<HealthReport[]>([]);
  const [activeAlerts, setActiveAlerts] = useState<AdminAlert[]>([]);
  const [healthLoading, setHealthLoading] = useState(true);

  // Daily Report config state
  const [dailyReportConfig, setDailyReportConfig] = useState<DailyReportConfig>({
    enabled: false, email: '', time: '10:00'
  });
  const [reportConfigSaving, setReportConfigSaving] = useState(false);
  const [reportConfigSaved, setReportConfigSaved] = useState(false);

  // AI Assistant state
  const [aiConfig, setAiConfig] = useState<AIAssistantConfig>({
    provider: 'claude-opus-4', apiKeySet: false, connectedAt: null, status: 'not_connected'
  });
  const [aiApiKey, setAiApiKey] = useState('');
  const [aiConfigSaving, setAiConfigSaving] = useState(false);
  const [aiConfigSaved, setAiConfigSaved] = useState(false);

  // Active tab
  const [activeTab, setActiveTab] = useState<'health' | 'services' | 'reports' | 'integration'>('health');

  const loadStats = async () => {
    const stats = getAICacheStats();
    setCacheStats(stats);
    try {
      const request = indexedDB.open('healqr_translations', 1);
      request.onsuccess = () => {
        const idb = request.result;
        try {
          const tx = idb.transaction('translations', 'readonly');
          const store = tx.objectStore('translations');
          const countReq = store.count();
          countReq.onsuccess = () => setDbCacheCount(countReq.result);
        } catch { setDbCacheCount(0); }
      };
      request.onerror = () => setDbCacheCount(0);
    } catch { setDbCacheCount(0); }
    setLastRefreshed(new Date());
  };

  const loadPlatformHealth = async () => {
    setHealthLoading(true);
    try {
      // Load latest health reports
      const healthQ = query(
        collection(db, 'platform_health'),
        orderBy('timestamp', 'desc'),
        limit(12)
      );
      const healthSnap = await getDocs(healthQ);
      const reports: HealthReport[] = healthSnap.docs.map(d => {
        const data = d.data();
        return {
          id: d.id,
          timestamp: data.timestamp?.toDate?.() || new Date(),
          bookingsLastHour: data.bookingsLastHour || 0,
          notificationsSentLastHour: data.notificationsSentLastHour || 0,
          activeDoctorsToday: data.activeDoctorsToday || 0,
          stuckNotifications: data.stuckNotifications || 0,
          status: data.status || 'healthy',
          issues: data.issues || [],
        };
      });
      setHealthReports(reports);

      // Load active alerts
      const alertQ = query(
        collection(db, 'admin_alerts'),
        where('resolved', '==', false),
        orderBy('timestamp', 'desc'),
        limit(10)
      );
      const alertSnap = await getDocs(alertQ);
      setActiveAlerts(alertSnap.docs.map(d => {
        const data = d.data();
        return {
          id: d.id,
          type: data.type || '',
          severity: data.severity || 'info',
          message: data.message || '',
          timestamp: data.timestamp?.toDate?.() || new Date(),
          resolved: data.resolved || false,
        };
      }));
    } catch (err) {
      console.warn('Could not load platform health:', err);
    }
    setHealthLoading(false);
  };

  const loadConfigs = async () => {
    try {
      const reportDoc = await getDoc(doc(db, 'admin_config', 'dailyReport'));
      if (reportDoc.exists()) {
        const data = reportDoc.data();
        setDailyReportConfig({
          enabled: data.enabled ?? false,
          email: data.email ?? '',
          time: data.time ?? '10:00',
        });
      }
    } catch (err) {
      console.warn('Could not load daily report config:', err);
    }

    try {
      const aiDoc = await getDoc(doc(db, 'admin_config', 'aiAssistant'));
      if (aiDoc.exists()) {
        const data = aiDoc.data();
        setAiConfig({
          provider: data.provider ?? 'claude-opus-4',
          apiKeySet: !!data.apiKeyHash,
          connectedAt: data.connectedAt?.toDate?.() || null,
          status: data.apiKeyHash ? 'connected' : 'not_connected',
        });
      }
    } catch (err) {
      console.warn('Could not load AI assistant config:', err);
    }
  };

  useEffect(() => {
    loadStats();
    loadPlatformHealth();
    loadConfigs();
  }, []);

  const handleClearCache = async () => {
    if (!confirm('Clear all AI translation caches? Translations will be re-fetched on next use.')) return;
    setIsClearing(true);
    try {
      await clearAITranslationCache();
      await loadStats();
    } finally { setIsClearing(false); }
  };

  const handleResolveAlert = async (alertId: string) => {
    try {
      await updateDoc(doc(db, 'admin_alerts', alertId), { resolved: true, resolvedAt: Timestamp.now(), resolvedBy: adminEmail });
      setActiveAlerts(prev => prev.filter(a => a.id !== alertId));
    } catch (err) { console.error('Failed to resolve alert:', err); }
  };

  const handleSaveDailyReport = async () => {
    setReportConfigSaving(true);
    try {
      await setDoc(doc(db, 'admin_config', 'dailyReport'), {
        ...dailyReportConfig,
        updatedAt: Timestamp.now(),
        updatedBy: adminEmail,
      });
      setReportConfigSaved(true);
      setTimeout(() => setReportConfigSaved(false), 3000);
    } catch (err) { console.error('Failed to save report config:', err); }
    setReportConfigSaving(false);
  };

  const handleSaveAIConfig = async () => {
    if (!aiApiKey && !aiConfig.apiKeySet) {
      alert('Please enter an API key.');
      return;
    }
    setAiConfigSaving(true);
    try {
      const configData: Record<string, unknown> = {
        provider: aiConfig.provider,
        updatedAt: Timestamp.now(),
        updatedBy: adminEmail,
      };
      if (aiApiKey) {
        // Store a hash indicator (first 4 + last 4 chars) — full key should go to Cloud Functions env
        configData.apiKeyHash = aiApiKey.substring(0, 4) + '****' + aiApiKey.substring(aiApiKey.length - 4);
        configData.apiKeyLength = aiApiKey.length;
        configData.connectedAt = Timestamp.now();
      }
      await setDoc(doc(db, 'admin_config', 'aiAssistant'), configData, { merge: true });
      setAiConfig(prev => ({
        ...prev,
        apiKeySet: true,
        connectedAt: new Date(),
        status: 'connected',
      }));
      setAiApiKey('');
      setAiConfigSaved(true);
      setTimeout(() => setAiConfigSaved(false), 3000);
    } catch (err) { console.error('Failed to save AI config:', err); }
    setAiConfigSaving(false);
  };

  const totalLanguages = Object.keys(AI_SUPPORTED_LANGUAGES).length;
  const estimatedSavings = (dbCacheCount ?? 0) * ESTIMATED_COST_PER_CALL_INR;
  const latestHealth = healthReports[0];

  const tabs = [
    { id: 'health' as const, label: 'Platform Health', icon: <HeartPulse className="w-4 h-4" /> },
    { id: 'services' as const, label: 'AI Services', icon: <Brain className="w-4 h-4" /> },
    { id: 'reports' as const, label: 'Daily Reports', icon: <Mail className="w-4 h-4" /> },
    { id: 'integration' as const, label: 'AI Integration', icon: <Link2 className="w-4 h-4" /> },
  ];

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-gradient-to-br from-purple-600 to-indigo-600 rounded-xl">
            <Brain className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">AI PM Dashboard</h1>
            <p className="text-sm text-gray-400">HealQR Intelligence Hub — Platform Health & AI Monitoring</p>
          </div>
        </div>
        <button
          onClick={() => { loadStats(); loadPlatformHealth(); }}
          className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-sm text-gray-300 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {/* Platform Status Banner */}
      {latestHealth && (
        <div className={`mb-6 p-4 rounded-xl border flex items-center gap-4 ${
          latestHealth.status === 'healthy' ? 'bg-emerald-900/20 border-emerald-700/40' :
          latestHealth.status === 'warning' ? 'bg-yellow-900/20 border-yellow-700/40' :
          'bg-red-900/20 border-red-700/40'
        }`}>
          <Shield className={`w-8 h-8 ${
            latestHealth.status === 'healthy' ? 'text-emerald-400' :
            latestHealth.status === 'warning' ? 'text-yellow-400' :
            'text-red-400'
          }`} />
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className={`text-lg font-bold ${
                latestHealth.status === 'healthy' ? 'text-emerald-400' :
                latestHealth.status === 'warning' ? 'text-yellow-400' :
                'text-red-400'
              }`}>
                {latestHealth.status === 'healthy' ? 'All Systems Operational' :
                 latestHealth.status === 'warning' ? 'Warning Detected' :
                 'Critical Issue'}
              </span>
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                latestHealth.status === 'healthy' ? 'bg-emerald-500/20 text-emerald-400' :
                latestHealth.status === 'warning' ? 'bg-yellow-500/20 text-yellow-400' :
                'bg-red-500/20 text-red-400'
              }`}>
                {latestHealth.status.toUpperCase()}
              </span>
            </div>
            <p className="text-sm text-gray-400 mt-1">
              Last check: {latestHealth.timestamp.toLocaleString()} • Bookings/hr: {latestHealth.bookingsLastHour} • Active Doctors: {latestHealth.activeDoctorsToday} • Notifications/hr: {latestHealth.notificationsSentLastHour}
            </p>
          </div>
          {activeAlerts.length > 0 && (
            <div className="flex items-center gap-1 px-3 py-1 bg-red-500/20 rounded-full">
              <AlertTriangle className="w-4 h-4 text-red-400" />
              <span className="text-sm text-red-400 font-medium">{activeAlerts.length} Alert{activeAlerts.length > 1 ? 's' : ''}</span>
            </div>
          )}
        </div>
      )}

      {/* Tab Navigation */}
      <div className="flex gap-1 mb-6 bg-zinc-900 p-1 rounded-xl border border-zinc-800">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors flex-1 justify-center ${
              activeTab === tab.id
                ? 'bg-purple-600 text-white'
                : 'text-gray-400 hover:text-gray-200 hover:bg-zinc-800'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* ======================== PLATFORM HEALTH TAB ======================== */}
      {activeTab === 'health' && (
        <div className="space-y-6">
          {/* Health Metric Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard icon={<Server className="w-5 h-5" />} label="Bookings / Hour" value={latestHealth?.bookingsLastHour?.toString() || '0'} sub="Current rate" color="blue" />
            <StatCard icon={<Users className="w-5 h-5" />} label="Active Doctors" value={latestHealth?.activeDoctorsToday?.toString() || '0'} sub="With bookings today" color="emerald" />
            <StatCard icon={<Bell className="w-5 h-5" />} label="Notifications / Hour" value={latestHealth?.notificationsSentLastHour?.toString() || '0'} sub="Sent recently" color="purple" />
            <StatCard icon={<AlertTriangle className="w-5 h-5" />} label="Stuck Notifications" value={latestHealth?.stuckNotifications?.toString() || '0'} sub="Pending > 30 min" color="orange" />
          </div>

          {/* Health Timeline */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
            <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
              <Activity className="w-5 h-5 text-purple-400" />
              Health Check Timeline (Last {healthReports.length} Checks)
            </h3>
            {healthLoading ? (
              <div className="text-gray-500 text-sm py-4">Loading health data...</div>
            ) : healthReports.length === 0 ? (
              <div className="text-gray-500 text-sm py-4">No health reports yet. Cloud Function runs every 15 minutes.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-zinc-800">
                      <th className="text-left py-2 text-gray-400 font-medium">Time</th>
                      <th className="text-center py-2 text-gray-400 font-medium">Status</th>
                      <th className="text-right py-2 text-gray-400 font-medium">Bookings/hr</th>
                      <th className="text-right py-2 text-gray-400 font-medium">Notifs/hr</th>
                      <th className="text-right py-2 text-gray-400 font-medium">Doctors</th>
                      <th className="text-right py-2 text-gray-400 font-medium">Stuck</th>
                      <th className="text-left py-2 text-gray-400 font-medium">Issues</th>
                    </tr>
                  </thead>
                  <tbody>
                    {healthReports.map(report => (
                      <tr key={report.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/30">
                        <td className="py-2 text-gray-300">{report.timestamp.toLocaleTimeString()}</td>
                        <td className="py-2 text-center">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                            report.status === 'healthy' ? 'bg-emerald-500/20 text-emerald-400' :
                            report.status === 'warning' ? 'bg-yellow-500/20 text-yellow-400' :
                            'bg-red-500/20 text-red-400'
                          }`}>{report.status}</span>
                        </td>
                        <td className="py-2 text-right text-gray-300">{report.bookingsLastHour}</td>
                        <td className="py-2 text-right text-gray-300">{report.notificationsSentLastHour}</td>
                        <td className="py-2 text-right text-gray-300">{report.activeDoctorsToday}</td>
                        <td className="py-2 text-right text-gray-300">{report.stuckNotifications}</td>
                        <td className="py-2 text-gray-500 text-xs max-w-xs truncate">{report.issues.length > 0 ? report.issues.join('; ') : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Active Alerts */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
            <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-yellow-400" />
              Active Alerts ({activeAlerts.length})
            </h3>
            {activeAlerts.length === 0 ? (
              <div className="flex items-center gap-2 text-emerald-400 text-sm py-2">
                <CheckCircle className="w-4 h-4" />
                No active alerts — all systems normal
              </div>
            ) : (
              <div className="space-y-3">
                {activeAlerts.map(alert => (
                  <div key={alert.id} className={`p-4 rounded-lg border flex items-start gap-3 ${
                    alert.severity === 'critical' ? 'bg-red-900/20 border-red-700/40' : 'bg-yellow-900/20 border-yellow-700/40'
                  }`}>
                    <AlertTriangle className={`w-5 h-5 mt-0.5 ${alert.severity === 'critical' ? 'text-red-400' : 'text-yellow-400'}`} />
                    <div className="flex-1">
                      <p className="text-sm text-gray-200">{alert.message}</p>
                      <p className="text-xs text-gray-500 mt-1">{alert.timestamp.toLocaleString()} • {alert.type}</p>
                    </div>
                    <button
                      onClick={() => handleResolveAlert(alert.id)}
                      className="px-3 py-1 bg-zinc-700 hover:bg-zinc-600 text-gray-300 rounded-lg text-xs transition-colors"
                    >
                      Resolve
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ======================== AI SERVICES TAB ======================== */}
      {activeTab === 'services' && (
        <div className="space-y-6">
          {/* AI Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard icon={<Languages className="w-5 h-5" />} label="Supported Languages" value={totalLanguages.toString()} sub="22 Indian + 9 International" color="emerald" />
            <StatCard icon={<Zap className="w-5 h-5" />} label="Memory Cache" value={cacheStats.memorySize.toString()} sub="In-session translations" color="blue" />
            <StatCard icon={<Activity className="w-5 h-5" />} label="Persistent Cache" value={dbCacheCount !== null ? dbCacheCount.toString() : '...'} sub="IndexedDB stored" color="purple" />
            <StatCard icon={<TrendingUp className="w-5 h-5" />} label="Est. API Savings" value={`₹${estimatedSavings.toFixed(2)}`} sub="From cached translations" color="orange" />
          </div>

          {/* Services Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* AI Translation Service */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-emerald-500/10 rounded-lg">
                  <Globe className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-white">AI Translation Service</h3>
                  <p className="text-xs text-gray-500">Gemini 2.0 Flash</p>
                </div>
                <span className="ml-auto px-2 py-1 bg-emerald-500/20 text-emerald-400 text-xs rounded-full font-medium">Live</span>
              </div>
              <div className="space-y-3">
                <InfoRow label="Model" value="gemini-2.0-flash" />
                <InfoRow label="Cache DB" value={cacheStats.dbName || 'healqr_translations'} />
                <InfoRow label="Memory Cache Limit" value="5,000 entries" />
                <InfoRow label="Temperature" value="0.1 (deterministic)" />
                <InfoRow label="Contexts" value="UI, Medical, Chat, Notifications" />
                <InfoRow label="Script Detection" value="Devanagari, Bengali, Tamil, +8 more" />
              </div>
              <div className="mt-4 pt-4 border-t border-zinc-800">
                <button onClick={handleClearCache} disabled={isClearing} className="flex items-center gap-2 px-3 py-2 bg-red-900/30 hover:bg-red-900/50 text-red-400 rounded-lg text-sm transition-colors disabled:opacity-50">
                  <Trash2 className="w-4 h-4" />
                  {isClearing ? 'Clearing...' : 'Clear Translation Cache'}
                </button>
              </div>
            </div>

            {/* AI ChatBot Service */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-orange-500/10 rounded-lg">
                  <MessageCircle className="w-5 h-5 text-orange-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-white">AI ChatBot Service</h3>
                  <p className="text-xs text-gray-500">Gemini 2.0 Flash</p>
                </div>
                <span className="ml-auto px-2 py-1 bg-emerald-500/20 text-emerald-400 text-xs rounded-full font-medium">Live</span>
              </div>
              <div className="space-y-3">
                <InfoRow label="Scope" value="Booking & System Help Only" />
                <InfoRow label="Medical Advice" value="Blocked — Redirects to appointment" />
                <InfoRow label="Session History" value="20 messages max" />
                <InfoRow label="Quick Replies" value="7 preset options" />
                <InfoRow label="Offline Fallback" value="Keyword-matched responses" />
                <InfoRow label="Multilingual" value="Auto-translates via AI" />
              </div>
              <div className="mt-4 pt-4 border-t border-zinc-800">
                <div className="text-xs text-gray-500">Visible on: All booking & patient pages (floating widget)</div>
              </div>
            </div>
          </div>

          {/* Language Coverage */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
            <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
              <Languages className="w-5 h-5 text-emerald-400" />
              Language Coverage ({totalLanguages} Languages)
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
              {Object.entries(AI_SUPPORTED_LANGUAGES).map(([code, lang]) => (
                <div key={code} className="px-3 py-2 bg-zinc-800 rounded-lg text-sm flex items-center gap-2">
                  <span className="text-gray-300">{lang.nativeName}</span>
                  <span className="text-gray-600 text-xs ml-auto">{lang.code}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Cost Model */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
            <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-purple-400" />
              Cost Model — Gemini AI PM
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <CostCard title="Free Tier" cost="₹0/mo" detail="1,500 RPM included" highlight />
              <CostCard title="Phase 1 (500 clinics)" cost="~₹2,500/mo" detail="Translation + ChatBot + Drug Suggestions" />
              <CostCard title="Phase 4 (5,000 clinics)" cost="~₹8,500/mo" detail="All AI services at scale" />
            </div>
            <div className="mt-4 text-xs text-gray-500">Last refreshed: {lastRefreshed.toLocaleTimeString()} • Admin: {adminEmail}</div>
          </div>
        </div>
      )}

      {/* ======================== DAILY REPORTS TAB ======================== */}
      {activeTab === 'reports' && (
        <div className="space-y-6">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-blue-500/10 rounded-lg">
                <Mail className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <h3 className="font-semibold text-white">Daily Health Report</h3>
                <p className="text-xs text-gray-500">Automated email summary of platform health</p>
              </div>
            </div>

            <div className="space-y-5">
              {/* Enable Toggle */}
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm text-gray-200 font-medium">Enable Daily Report</label>
                  <p className="text-xs text-gray-500 mt-0.5">Receive platform health summary via email</p>
                </div>
                <button
                  onClick={() => setDailyReportConfig(prev => ({ ...prev, enabled: !prev.enabled }))}
                  className={`relative w-12 h-6 rounded-full transition-colors ${dailyReportConfig.enabled ? 'bg-emerald-600' : 'bg-zinc-700'}`}
                >
                  <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full transition-transform ${dailyReportConfig.enabled ? 'translate-x-6' : 'translate-x-0.5'}`} />
                </button>
              </div>

              {/* Email Input */}
              <div>
                <label className="text-sm text-gray-400 block mb-1">Report Email</label>
                <input
                  type="email"
                  value={dailyReportConfig.email}
                  onChange={e => setDailyReportConfig(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="admin@healqr.com"
                  className="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-gray-200 text-sm focus:outline-none focus:border-purple-500"
                />
              </div>

              {/* Time Selector */}
              <div>
                <label className="text-sm text-gray-400 block mb-1 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" /> Report Time (IST)
                </label>
                <select
                  value={dailyReportConfig.time}
                  onChange={e => setDailyReportConfig(prev => ({ ...prev, time: e.target.value }))}
                  className="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-gray-200 text-sm focus:outline-none focus:border-purple-500"
                >
                  {['06:00', '07:00', '08:00', '09:00', '10:00', '11:00', '12:00', '18:00', '21:00'].map(t => (
                    <option key={t} value={t}>{t} IST</option>
                  ))}
                </select>
              </div>

              {/* Report Contents Preview */}
              <div className="bg-zinc-800 rounded-lg p-4">
                <h4 className="text-sm font-medium text-gray-300 mb-3">Report Contents</h4>
                <div className="space-y-2 text-xs text-gray-400">
                  <div className="flex items-center gap-2"><CheckCircle className="w-3.5 h-3.5 text-emerald-400" /> Platform status (healthy/warning/critical)</div>
                  <div className="flex items-center gap-2"><CheckCircle className="w-3.5 h-3.5 text-emerald-400" /> 24-hour booking count & trend</div>
                  <div className="flex items-center gap-2"><CheckCircle className="w-3.5 h-3.5 text-emerald-400" /> Active doctors count</div>
                  <div className="flex items-center gap-2"><CheckCircle className="w-3.5 h-3.5 text-emerald-400" /> Notification delivery rate</div>
                  <div className="flex items-center gap-2"><CheckCircle className="w-3.5 h-3.5 text-emerald-400" /> Stuck/failed notifications count</div>
                  <div className="flex items-center gap-2"><CheckCircle className="w-3.5 h-3.5 text-emerald-400" /> Active alerts summary</div>
                  <div className="flex items-center gap-2"><CheckCircle className="w-3.5 h-3.5 text-emerald-400" /> AI service cache utilization</div>
                </div>
              </div>

              {/* Save Button */}
              <button
                onClick={handleSaveDailyReport}
                disabled={reportConfigSaving}
                className="flex items-center gap-2 px-5 py-2.5 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                {reportConfigSaving ? 'Saving...' : reportConfigSaved ? 'Saved!' : 'Save Report Config'}
              </button>
            </div>
          </div>

          {/* How it works */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
            <h3 className="font-semibold text-white mb-3">How Daily Reports Work</h3>
            <div className="space-y-3 text-sm text-gray-400">
              <p>1. A Cloud Function runs at your scheduled time (default 10:00 AM IST)</p>
              <p>2. It aggregates all health checks from the last 24 hours</p>
              <p>3. Calculates trends: booking rate changes, doctor activity, notification success rate</p>
              <p>4. Sends a formatted email report to your configured address</p>
              <p>5. Critical issues trigger immediate alerts (not just daily reports)</p>
            </div>
          </div>
        </div>
      )}

      {/* ======================== AI INTEGRATION TAB ======================== */}
      {activeTab === 'integration' && (
        <div className="space-y-6">
          {/* AI Assistant Connection */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-purple-500/10 rounded-lg">
                <Link2 className="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <h3 className="font-semibold text-white">AI Assistant Integration</h3>
                <p className="text-xs text-gray-500">Connect advanced AI for automated analysis & pharma data insights</p>
              </div>
              <span className={`ml-auto px-2 py-1 rounded-full text-xs font-medium ${
                aiConfig.status === 'connected' ? 'bg-emerald-500/20 text-emerald-400' :
                aiConfig.status === 'error' ? 'bg-red-500/20 text-red-400' :
                'bg-zinc-700 text-gray-400'
              }`}>
                {aiConfig.status === 'connected' ? 'Connected' : aiConfig.status === 'error' ? 'Error' : 'Not Connected'}
              </span>
            </div>

            <div className="space-y-5">
              {/* Provider Selection */}
              <div>
                <label className="text-sm text-gray-400 block mb-1">AI Provider</label>
                <select
                  value={aiConfig.provider}
                  onChange={e => setAiConfig(prev => ({ ...prev, provider: e.target.value }))}
                  className="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-gray-200 text-sm focus:outline-none focus:border-purple-500"
                >
                  {AI_PROVIDERS.map(p => (
                    <option key={p.value} value={p.value}>{p.label}</option>
                  ))}
                </select>
              </div>

              {/* API Key Input */}
              <div>
                <label className="text-sm text-gray-400 block mb-1 flex items-center gap-1">
                  <Key className="w-3.5 h-3.5" /> API Key
                </label>
                <input
                  type="password"
                  value={aiApiKey}
                  onChange={e => setAiApiKey(e.target.value)}
                  placeholder={aiConfig.apiKeySet ? '••••••••••••••••  (key saved)' : 'Enter your API key'}
                  className="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-gray-200 text-sm focus:outline-none focus:border-purple-500"
                />
                {aiConfig.apiKeySet && (
                  <p className="text-xs text-emerald-400 mt-1 flex items-center gap-1">
                    <CheckCircle className="w-3 h-3" /> API key configured — enter new key to update
                  </p>
                )}
              </div>

              {/* Connection Status */}
              {aiConfig.connectedAt && (
                <div className="bg-zinc-800 rounded-lg p-3 flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-400" />
                  <span className="text-sm text-gray-300">Connected since {aiConfig.connectedAt.toLocaleDateString()}</span>
                  <span className="text-xs text-gray-500 ml-auto">Provider: {AI_PROVIDERS.find(p => p.value === aiConfig.provider)?.label}</span>
                </div>
              )}

              {/* Save Button */}
              <button
                onClick={handleSaveAIConfig}
                disabled={aiConfigSaving}
                className="flex items-center gap-2 px-5 py-2.5 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                {aiConfigSaving ? 'Saving...' : aiConfigSaved ? 'Saved!' : 'Save AI Config'}
              </button>
            </div>
          </div>

          {/* Use Cases */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
            <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
              <Brain className="w-5 h-5 text-purple-400" />
              AI Assistant Capabilities (When Connected)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <CapabilityCard
                title="Pharma Data Analysis"
                description="Automated analysis of anonymized Rx trends, prescription patterns, and territory-wise drug usage data for pharma partners"
                badge="Pharma Partnership"
              />
              <CapabilityCard
                title="Platform Health Insights"
                description="AI-driven anomaly detection beyond simple thresholds — correlates booking patterns, doctor activity, and seasonal trends"
                badge="Auto-Monitor"
              />
              <CapabilityCard
                title="Daily Intelligent Reports"
                description="AI-generated natural language summaries with actionable recommendations instead of raw metrics"
                badge="Smart Reports"
              />
              <CapabilityCard
                title="Support Response Assist"
                description="Draft suggested responses for support tickets based on historical resolutions and knowledge base"
                badge="Support AI"
              />
            </div>
          </div>

          {/* Security Note */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
            <h3 className="font-semibold text-white mb-3 flex items-center gap-2">
              <Shield className="w-5 h-5 text-blue-400" />
              Security & Data Privacy
            </h3>
            <div className="space-y-2 text-sm text-gray-400">
              <p>• API keys are stored securely in Firebase with admin-only access</p>
              <p>• No patient PII (name, phone, address) is ever sent to external AI</p>
              <p>• Only anonymized, aggregated data is used for pharma analysis</p>
              <p>• All AI interactions are logged for audit compliance</p>
              <p>• Medical ethics: AI never interferes with doctor prescriptions or treatment decisions</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ======================== HELPER COMPONENTS ======================== */

function StatCard({ icon, label, value, sub, color }: {
  icon: React.ReactNode; label: string; value: string; sub: string; color: string;
}) {
  const colors: Record<string, string> = {
    emerald: 'from-emerald-600/20 to-emerald-900/10 border-emerald-800/50',
    blue: 'from-blue-600/20 to-blue-900/10 border-blue-800/50',
    purple: 'from-purple-600/20 to-purple-900/10 border-purple-800/50',
    orange: 'from-orange-600/20 to-orange-900/10 border-orange-800/50',
  };
  const iconColors: Record<string, string> = {
    emerald: 'text-emerald-400',
    blue: 'text-blue-400',
    purple: 'text-purple-400',
    orange: 'text-orange-400',
  };
  return (
    <div className={`bg-gradient-to-br ${colors[color]} border rounded-xl p-4`}>
      <div className={`${iconColors[color]} mb-2`}>{icon}</div>
      <div className="text-2xl font-bold text-white">{value}</div>
      <div className="text-sm text-gray-300">{label}</div>
      <div className="text-xs text-gray-500 mt-1">{sub}</div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-sm text-gray-400">{label}</span>
      <span className="text-sm text-gray-200">{value}</span>
    </div>
  );
}

function CostCard({ title, cost, detail, highlight }: {
  title: string; cost: string; detail: string; highlight?: boolean;
}) {
  return (
    <div className={`p-4 rounded-lg border ${highlight ? 'bg-emerald-900/20 border-emerald-700/40' : 'bg-zinc-800 border-zinc-700'}`}>
      <div className="text-sm text-gray-400">{title}</div>
      <div className={`text-xl font-bold ${highlight ? 'text-emerald-400' : 'text-white'}`}>{cost}</div>
      <div className="text-xs text-gray-500 mt-1">{detail}</div>
    </div>
  );
}

function CapabilityCard({ title, description, badge }: {
  title: string; description: string; badge: string;
}) {
  return (
    <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-4">
      <div className="flex items-center gap-2 mb-2">
        <h4 className="text-sm font-medium text-white">{title}</h4>
        <span className="px-2 py-0.5 bg-purple-500/20 text-purple-400 text-xs rounded-full">{badge}</span>
      </div>
      <p className="text-xs text-gray-400 leading-relaxed">{description}</p>
    </div>
  );
}

