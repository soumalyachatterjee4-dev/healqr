import { useState } from 'react';
import { Video, Calendar, Clock, User, FileText, CheckCircle2, XCircle, Menu, Filter, ArrowLeft } from 'lucide-react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import DashboardSidebar from './DashboardSidebar';
import { toast } from 'sonner';

interface VideoConsultationHistory {
  id: string;
  date: string;
  time: string;
  patientName: string;
  duration: string; // e.g., "25 min", "30 min"
  rxSent: boolean;
}

interface VideoConsultationManagerProps {
  onMenuChange?: (menu: string) => void;
  onLogout?: () => void;
  activeAddOns?: string[];
}

export default function VideoConsultationManager({ 
  onMenuChange, 
  onLogout,
  activeAddOns = []
}: VideoConsultationManagerProps) {
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<'today' | 'yesterday' | 'custom'>('today');
  const [selectedDate, setSelectedDate] = useState<string>('');

  // Consultation history - Start empty
  const [consultationHistory, setConsultationHistory] = useState<VideoConsultationHistory[]>([]);

  const getTodayDate = () => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  };

  const getYesterdayDate = () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    return yesterday.toISOString().split('T')[0];
  };

  const getFilteredHistory = () => {
    const today = getTodayDate();
    const yesterday = getYesterdayDate();

    if (selectedFilter === 'today') {
      return consultationHistory.filter(item => item.date === today);
    } else if (selectedFilter === 'yesterday') {
      return consultationHistory.filter(item => item.date === yesterday);
    } else if (selectedFilter === 'custom' && selectedDate) {
      return consultationHistory.filter(item => item.date === selectedDate);
    }

    return consultationHistory;
  };

  const filteredData = getFilteredHistory();

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const handleFilterChange = (filter: 'today' | 'yesterday' | 'custom') => {
    setSelectedFilter(filter);
    if (filter !== 'custom') {
      setSelectedDate('');
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0f1a] text-white">
      {/* Sidebar */}
      <DashboardSidebar
        isOpen={isMobileSidebarOpen}
        onClose={() => setIsMobileSidebarOpen(false)}
        activeMenu="video-consultation"
        onMenuChange={onMenuChange || (() => {})}
        onLogout={onLogout}
        activeAddOns={activeAddOns}
      />

      {/* Main Content */}
      <div className="lg:pl-64">
        {/* Header */}
        <div className="border-b border-gray-800 bg-[#0a0f1a]/95 backdrop-blur sticky top-0 z-40">
          <div className="flex items-center justify-between px-4 lg:px-8 py-4">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                className="lg:hidden text-gray-400 hover:text-white"
                onClick={() => setIsMobileSidebarOpen(true)}
              >
                <Menu className="w-6 h-6" />
              </Button>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-red-500/20 rounded-lg flex items-center justify-center">
                  <Video className="w-6 h-6 text-red-400" />
                </div>
                <div>
                  <h1 className="text-white">Video Consultation History</h1>
                  <p className="text-gray-400 text-sm mt-1">View all past video consultations</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="px-4 lg:px-8 py-8 max-w-7xl mx-auto">
          {/* Back Button - Shifted on mobile to avoid overlap */}
          <Button
            onClick={() => onMenuChange?.('dashboard')}
            variant="ghost"
            className="mb-6 text-gray-400 hover:text-white hover:bg-zinc-900 lg:-ml-2"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>

          {/* Date Filter */}
          <Card className="bg-gray-800/50 border-gray-700 p-6 mb-6">
            <div className="flex items-center gap-2 mb-4">
              <Filter className="w-5 h-5 text-emerald-400" />
              <h2 className="text-white">Filter by Date</h2>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {/* Quick Filter Buttons */}
              <Button
                onClick={() => handleFilterChange('today')}
                className={`${
                  selectedFilter === 'today'
                    ? 'bg-emerald-500 hover:bg-emerald-600 text-white'
                    : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                }`}
              >
                <Calendar className="w-4 h-4 mr-2" />
                Today
              </Button>

              <Button
                onClick={() => handleFilterChange('yesterday')}
                className={`${
                  selectedFilter === 'yesterday'
                    ? 'bg-emerald-500 hover:bg-emerald-600 text-white'
                    : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                }`}
              >
                <Calendar className="w-4 h-4 mr-2" />
                Yesterday
              </Button>

              <Button
                onClick={() => handleFilterChange('custom')}
                className={`${
                  selectedFilter === 'custom'
                    ? 'bg-emerald-500 hover:bg-emerald-600 text-white'
                    : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                }`}
              >
                <Calendar className="w-4 h-4 mr-2" />
                Custom Date
              </Button>

              {/* Custom Date Picker */}
              {selectedFilter === 'custom' && (
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="bg-gray-900 border border-gray-700 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              )}

              {/* Results Count */}
              <div className="ml-auto flex items-center gap-2 bg-blue-500/10 border border-blue-500/30 rounded-lg px-4 py-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                <span className="text-blue-400 text-sm">
                  {filteredData.length} consultation{filteredData.length !== 1 ? 's' : ''} found
                </span>
              </div>
            </div>
          </Card>

          {/* History Table */}
          <Card className="bg-gray-800/50 border-gray-700 overflow-hidden">
            {/* Table Header */}
            <div className="bg-gray-900/50 border-b border-gray-700 px-6 py-4">
              <h2 className="text-white flex items-center gap-2">
                <Clock className="w-5 h-5 text-emerald-400" />
                Consultation Records
              </h2>
            </div>

            {/* Table Content */}
            {filteredData.length === 0 ? (
              <div className="p-12 text-center">
                <Video className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                <h3 className="text-gray-400 mb-2">No consultations found</h3>
                <p className="text-gray-500 text-sm">
                  {selectedFilter === 'today'
                    ? 'No video consultations scheduled for today'
                    : selectedFilter === 'yesterday'
                    ? 'No video consultations from yesterday'
                    : 'No consultations found for the selected date'}
                </p>
              </div>
            ) : (
              <>
                {/* Desktop Table View */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-gray-900/30 border-b border-gray-700">
                        <th className="px-6 py-4 text-left text-sm text-gray-400">Date</th>
                        <th className="px-6 py-4 text-left text-sm text-gray-400">Time</th>
                        <th className="px-6 py-4 text-left text-sm text-gray-400">Patient Name</th>
                        <th className="px-6 py-4 text-left text-sm text-gray-400">Duration</th>
                        <th className="px-6 py-4 text-left text-sm text-gray-400">RX Sent</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredData.map((item, index) => (
                        <tr
                          key={item.id}
                          className={`border-b border-gray-700/50 hover:bg-gray-700/30 transition-colors ${
                            index % 2 === 0 ? 'bg-gray-900/10' : ''
                          }`}
                        >
                          {/* Date */}
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <Calendar className="w-4 h-4 text-blue-400" />
                              <span className="text-white text-sm">{formatDate(item.date)}</span>
                            </div>
                          </td>

                          {/* Time */}
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <Clock className="w-4 h-4 text-purple-400" />
                              <span className="text-gray-300 text-sm">{item.time}</span>
                            </div>
                          </td>

                          {/* Patient Name */}
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <User className="w-4 h-4 text-emerald-400" />
                              <span className="text-white font-medium">{item.patientName}</span>
                            </div>
                          </td>

                          {/* Duration */}
                          <td className="px-6 py-4">
                            <span className="inline-flex items-center gap-1.5 bg-orange-500/10 border border-orange-500/30 text-orange-400 text-sm px-3 py-1 rounded-full">
                              <Clock className="w-3.5 h-3.5" />
                              {item.duration}
                            </span>
                          </td>

                          {/* RX Sent Status */}
                          <td className="px-6 py-4">
                            {item.rxSent ? (
                              <span className="inline-flex items-center gap-1.5 bg-green-500/10 border border-green-500/30 text-green-400 text-sm px-3 py-1 rounded-full">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                Sent
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 bg-red-500/10 border border-red-500/30 text-red-400 text-sm px-3 py-1 rounded-full">
                                <XCircle className="w-3.5 h-3.5" />
                                Not Sent
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Table View */}
                <div className="md:hidden">
                  {filteredData.map((item, index) => (
                    <div
                      key={item.id}
                      className={`border-b border-gray-700/50 hover:bg-gray-700/30 transition-colors ${
                        index % 2 === 0 ? 'bg-gray-900/10' : ''
                      } p-4`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-blue-400" />
                          <span className="text-white text-sm">{formatDate(item.date)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-purple-400" />
                          <span className="text-gray-300 text-sm">{item.time}</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between mt-2">
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-emerald-400" />
                          <span className="text-white font-medium">{item.patientName}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="w-3.5 h-3.5" />
                          <span className="inline-flex items-center gap-1.5 bg-orange-500/10 border border-orange-500/30 text-orange-400 text-sm px-3 py-1 rounded-full">
                            {item.duration}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between mt-2">
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-red-400" />
                          <span className="text-gray-400 text-sm">RX Sent</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {item.rxSent ? (
                            <span className="inline-flex items-center gap-1.5 bg-green-500/10 border border-green-500/30 text-green-400 text-sm px-3 py-1 rounded-full">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              Sent
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 bg-red-500/10 border border-red-500/30 text-red-400 text-sm px-3 py-1 rounded-full">
                              <XCircle className="w-3.5 h-3.5" />
                              Not Sent
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </Card>

          {/* Summary Stats */}
          {filteredData.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
              <Card className="bg-gray-800/50 border-gray-700 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-400 text-sm mb-1">Total Consultations</p>
                    <p className="text-white text-2xl">{filteredData.length}</p>
                  </div>
                  <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center">
                    <Video className="w-6 h-6 text-blue-400" />
                  </div>
                </div>
              </Card>

              <Card className="bg-gray-800/50 border-gray-700 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-400 text-sm mb-1">RX Sent</p>
                    <p className="text-white text-2xl">
                      {filteredData.filter(item => item.rxSent).length}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-green-500/20 rounded-lg flex items-center justify-center">
                    <CheckCircle2 className="w-6 h-6 text-green-400" />
                  </div>
                </div>
              </Card>

              <Card className="bg-gray-800/50 border-gray-700 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-400 text-sm mb-1">RX Pending</p>
                    <p className="text-white text-2xl">
                      {filteredData.filter(item => !item.rxSent).length}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-red-500/20 rounded-lg flex items-center justify-center">
                    <FileText className="w-6 h-6 text-red-400" />
                  </div>
                </div>
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}