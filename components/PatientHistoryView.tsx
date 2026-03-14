import React, { useState, useEffect } from 'react';
import { History, Loader2, AlertCircle, Calendar, User } from 'lucide-react';
import { PatientHistoryCard } from './PatientHistoryCard';
import { getPatientNotificationHistory, NotificationRecord } from '../services/notificationHistoryService';

interface PatientHistoryViewProps {
  patientPhone: string;
  patientName: string;
}

export const PatientHistoryView: React.FC<PatientHistoryViewProps> = ({ patientPhone, patientName }) => {
  const [history, setHistory] = useState<NotificationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'completed' | 'cancelled' | 'confirmed'>('all');

  useEffect(() => {
    loadHistory();
  }, [patientPhone]);

  const loadHistory = async () => {
    setLoading(true);
    try {
      const results = await getPatientNotificationHistory(patientPhone);
      setHistory(results);
    } catch (error) {
      console.error('Failed to load history:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredHistory = history.filter((record) => {
    if (filter === 'all') return true;
    return record.bookingStatus === filter;
  });

  // Group by doctor
  const groupedByDoctor = filteredHistory.reduce((acc, record) => {
    const doctor = record.doctorName || 'Unknown Doctor';
    if (!acc[doctor]) {
      acc[doctor] = [];
    }
    acc[doctor].push(record);
    return acc;
  }, {} as Record<string, NotificationRecord[]>);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl shadow-lg p-6 mb-6 text-white">
          <div className="flex items-center gap-3 mb-4">
            <History className="w-8 h-8" />
            <div>
              <h1 className="text-2xl font-bold">Your Medical History</h1>
              <p className="text-blue-100 text-sm">Complete consultation history across all doctors</p>
            </div>
          </div>

          <div className="bg-white/20 rounded-lg p-4 backdrop-blur-sm">
            <div className="flex items-center gap-2 mb-1">
              <User className="w-4 h-4" />
              <span className="text-sm font-medium">Patient Name:</span>
            </div>
            <p className="text-lg font-semibold">{patientName}</p>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="bg-white rounded-xl shadow-md p-4 mb-6">
          <div className="flex gap-2 overflow-x-auto">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap ${
                filter === 'all'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              All ({history.length})
            </button>
            <button
              onClick={() => setFilter('completed')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap ${
                filter === 'completed'
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Completed ({history.filter((r) => r.bookingStatus === 'completed').length})
            </button>
            <button
              onClick={() => setFilter('confirmed')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap ${
                filter === 'confirmed'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Confirmed ({history.filter((r) => r.bookingStatus === 'confirmed').length})
            </button>
            <button
              onClick={() => setFilter('cancelled')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap ${
                filter === 'cancelled'
                  ? 'bg-red-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Cancelled ({history.filter((r) => r.bookingStatus === 'cancelled').length})
            </button>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="bg-white rounded-xl shadow-md p-12 text-center">
            <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
            <p className="text-gray-600">Loading your history...</p>
          </div>
        )}

        {/* Empty State */}
        {!loading && history.length === 0 && (
          <div className="bg-white rounded-xl shadow-md p-12 text-center">
            <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-700 mb-2">No History Yet</h3>
            <p className="text-gray-500">
              Your consultation history will appear here after your first booking.
            </p>
          </div>
        )}

        {/* History List - Grouped by Doctor */}
        {!loading && filteredHistory.length > 0 && (
          <div className="space-y-6">
            {Object.entries(groupedByDoctor).map(([doctorName, records]) => (
              <div key={doctorName}>
                <div className="flex items-center gap-2 mb-3">
                  <User className="w-5 h-5 text-gray-600" />
                  <h2 className="text-lg font-bold text-gray-900">{doctorName}</h2>
                  <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded-full text-xs font-medium">
                    {records.length} visit{records.length !== 1 ? 's' : ''}
                  </span>
                </div>
                <div className="space-y-4 mb-6">
                  {records.map((record) => (
                    <PatientHistoryCard key={record.id} record={record} showDownload={true} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* No Results after filtering */}
        {!loading && history.length > 0 && filteredHistory.length === 0 && (
          <div className="bg-white rounded-xl shadow-md p-12 text-center">
            <AlertCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-700 mb-2">No {filter} consultations</h3>
            <p className="text-gray-500">Try changing the filter to see other consultations.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default PatientHistoryView;

