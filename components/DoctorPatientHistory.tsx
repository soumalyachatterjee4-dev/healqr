import React, { useState } from 'react';
import { Search, History, Loader2, AlertCircle, X } from 'lucide-react';
import { PatientHistoryCard } from './PatientHistoryCard';
import { searchPatientHistory, NotificationRecord } from '../services/notificationHistoryService';
import DashboardSidebar from './DashboardSidebar';

interface DoctorPatientHistoryProps {
  doctorId: string;
  doctorName: string;
  onLogout?: () => void;
  onMenuChange?: (menu: string) => void;
  email?: string;
}

export const DoctorPatientHistory: React.FC<DoctorPatientHistoryProps> = ({ 
  doctorId, 
  doctorName,
  onLogout,
  onMenuChange,
  email = ''
}) => {
  const [searchPhone, setSearchPhone] = useState('');
  const [history, setHistory] = useState<NotificationRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleSearch = async () => {
    if (!searchPhone.trim() || searchPhone.length < 10) {
      alert('Please enter a valid 10-digit phone number');
      return;
    }

    setLoading(true);
    setSearched(true);

    try {
      const results = await searchPatientHistory(searchPhone, doctorId);
      setHistory(results);
    } catch (error) {
      console.error('Search failed:', error);
      alert('Failed to search patient history. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0f1a] text-white">
      {/* Sidebar */}
      <DashboardSidebar 
        isOpen={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
        activeMenu="patient-history"
        onMenuChange={onMenuChange || (() => {})}
        onLogout={onLogout || (() => {})}
      />

      {/* Main Content */}
      <div className="lg:pl-64">
        {/* Header with mobile menu */}
        <div className="border-b border-gray-800 bg-[#0a0f1a]/95 backdrop-blur sticky top-0 z-40">
          <div className="flex items-center justify-between px-4 lg:px-8 py-4">
            <button
              className="lg:hidden text-gray-400 hover:text-white"
              onClick={() => setMobileMenuOpen(true)}
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>

        <div className="p-6">
          <div className="max-w-4xl mx-auto">
            {/* Header */}
            <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl shadow-lg p-6 mb-6 border border-gray-700">
              <div className="flex items-center gap-3 mb-4">
                <History className="w-8 h-8 text-emerald-400" />
                <div>
                  <h1 className="text-2xl font-bold text-white">Patient History</h1>
                  <p className="text-sm text-gray-300">Search patient consultation history</p>
                </div>
              </div>

          {/* Search Box */}
          <div className="flex gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="tel"
                placeholder="Enter patient phone number (10 digits)"
                value={searchPhone}
                onChange={(e) => setSearchPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                onKeyPress={handleKeyPress}
                className="w-full pl-10 pr-12 py-3 bg-gray-700 border-2 border-gray-600 text-white rounded-lg focus:border-emerald-500 focus:outline-none text-lg placeholder-gray-400"
                maxLength={10}
              />
              {searchPhone && (
                <button
                  onClick={() => setSearchPhone('')}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>
            <button
              onClick={handleSearch}
              disabled={loading || searchPhone.length < 10}
              className="px-6 py-3 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Searching...</span>
                </>
              ) : (
                <>
                  <Search className="w-5 h-5" />
                  <span>Search</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Results */}
        {searched && !loading && (
          <div>
            {history.length === 0 ? (
              <div className="bg-gradient-to-br from-gray-800 to-gray-900 border border-gray-700 rounded-xl shadow-lg p-12 text-center">
                <AlertCircle className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-white mb-2">No History Found</h3>
                <p className="text-gray-400">
                  This patient has no consultation history with {doctorName}.
                </p>
              </div>
            ) : (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-white">
                    Found {history.length} consultation{history.length !== 1 ? 's' : ''}
                  </h2>
                  <p className="text-sm text-gray-400">
                    Patient: {history[0]?.patientName || 'Unknown'}
                  </p>
                </div>

                <div className="space-y-4">
                  {history.map((record) => (
                    <PatientHistoryCard key={record.id} record={record} showDownload={true} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Initial State */}
        {!searched && !loading && (
          <div className="bg-gradient-to-br from-gray-800 to-gray-900 border border-gray-700 rounded-xl shadow-lg p-12 text-center">
            <Search className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">Search Patient History</h3>
            <p className="text-gray-400">
              Enter a patient's phone number to view their consultation history with you.
            </p>
          </div>
        )}
      </div>
    </div>
      </div>
    </div>
  );
};

export default DoctorPatientHistory;

