/**
 * AI PM Dashboard — Admin panel for monitoring AI services
 * Translation cache stats, ChatBot usage, API cost tracking
 */

import { useState, useEffect } from 'react';
import { Brain, Globe, MessageCircle, RefreshCw, Trash2, Activity, Zap, Languages, TrendingUp } from 'lucide-react';
import { getAICacheStats, clearAITranslationCache, AI_SUPPORTED_LANGUAGES } from '../services/aiTranslationService';

interface AdminAIPMDashboardProps {
  adminEmail: string;
}

// Estimated cost per Gemini 2.0 Flash API call (input+output tokens average)
const ESTIMATED_COST_PER_CALL_INR = 0.015;

export default function AdminAIPMDashboard({ adminEmail }: AdminAIPMDashboardProps) {
  const [cacheStats, setCacheStats] = useState({ memorySize: 0, dbName: '' });
  const [dbCacheCount, setDbCacheCount] = useState<number | null>(null);
  const [isClearing, setIsClearing] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState(new Date());

  const loadStats = async () => {
    const stats = getAICacheStats();
    setCacheStats(stats);

    // Count IndexedDB entries
    try {
      const request = indexedDB.open('healqr_translations', 1);
      request.onsuccess = () => {
        const db = request.result;
        try {
          const tx = db.transaction('translations', 'readonly');
          const store = tx.objectStore('translations');
          const countReq = store.count();
          countReq.onsuccess = () => setDbCacheCount(countReq.result);
        } catch {
          setDbCacheCount(0);
        }
      };
      request.onerror = () => setDbCacheCount(0);
    } catch {
      setDbCacheCount(0);
    }

    setLastRefreshed(new Date());
  };

  useEffect(() => {
    loadStats();
  }, []);

  const handleClearCache = async () => {
    if (!confirm('Clear all AI translation caches? Translations will be re-fetched on next use.')) return;
    setIsClearing(true);
    try {
      await clearAITranslationCache();
      await loadStats();
    } finally {
      setIsClearing(false);
    }
  };

  const totalLanguages = Object.keys(AI_SUPPORTED_LANGUAGES).length;
  const estimatedSavings = (dbCacheCount ?? 0) * ESTIMATED_COST_PER_CALL_INR;

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-gradient-to-br from-purple-600 to-indigo-600 rounded-xl">
            <Brain className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">AI PM Dashboard</h1>
            <p className="text-sm text-gray-400">Gemini 2.0 Flash — Translation & ChatBot Monitoring</p>
          </div>
        </div>
        <button
          onClick={loadStats}
          className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-sm text-gray-300 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          icon={<Languages className="w-5 h-5" />}
          label="Supported Languages"
          value={totalLanguages.toString()}
          sub="22 Indian + 9 International"
          color="emerald"
        />
        <StatCard
          icon={<Zap className="w-5 h-5" />}
          label="Memory Cache"
          value={cacheStats.memorySize.toString()}
          sub="In-session translations"
          color="blue"
        />
        <StatCard
          icon={<Activity className="w-5 h-5" />}
          label="Persistent Cache"
          value={dbCacheCount !== null ? dbCacheCount.toString() : '...'}
          sub="IndexedDB stored"
          color="purple"
        />
        <StatCard
          icon={<TrendingUp className="w-5 h-5" />}
          label="Est. API Savings"
          value={`₹${estimatedSavings.toFixed(2)}`}
          sub="From cached translations"
          color="orange"
        />
      </div>

      {/* Services Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
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
            <span className="ml-auto px-2 py-1 bg-emerald-500/20 text-emerald-400 text-xs rounded-full font-medium">
              Live
            </span>
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
            <button
              onClick={handleClearCache}
              disabled={isClearing}
              className="flex items-center gap-2 px-3 py-2 bg-red-900/30 hover:bg-red-900/50 text-red-400 rounded-lg text-sm transition-colors disabled:opacity-50"
            >
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
            <span className="ml-auto px-2 py-1 bg-emerald-500/20 text-emerald-400 text-xs rounded-full font-medium">
              Live
            </span>
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
            <div className="text-xs text-gray-500">
              Visible on: All booking & patient pages (floating widget)
            </div>
          </div>
        </div>
      </div>

      {/* Language Coverage */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 mb-8">
        <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
          <Languages className="w-5 h-5 text-emerald-400" />
          Language Coverage ({totalLanguages} Languages)
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
          {Object.entries(AI_SUPPORTED_LANGUAGES).map(([code, lang]) => (
            <div
              key={code}
              className="px-3 py-2 bg-zinc-800 rounded-lg text-sm flex items-center gap-2"
            >
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
        <div className="mt-4 text-xs text-gray-500">
          Last refreshed: {lastRefreshed.toLocaleTimeString()} • Admin: {adminEmail}
        </div>
      </div>
    </div>
  );
}

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

