import React, { useState, useEffect } from 'react';
import { Search, Calendar, FileText, Sparkles, Download, Eye, Filter, ChevronDown, ArrowLeft, Printer, User, Clock } from 'lucide-react';
import { Button } from './ui/button';

interface AIRXRecord {
  id: string;
  patientId: string;
  patientName: string;
  doctorName?: string;
  consultationDate: string;
  uploadDate: string;
  prescriptionImage?: string;
  aiProcessed: boolean;
  language: 'english' | 'hindi' | 'bengali';
  viewed: boolean;
  medicines: {
    name: string;
    dosage: string;
    frequency: string;
  }[];
}

interface AIRXReaderHistoryProps {
  onBack?: () => void;
  clinicId?: string;
}

export const AIRXReaderHistory: React.FC<AIRXReaderHistoryProps> = ({ onBack, clinicId }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [doctorFilter, setDoctorFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [languageFilter, setLanguageFilter] = useState<string>('all');
  const [expandedRecord, setExpandedRecord] = useState<string | null>(null);
  const [records, setRecords] = useState<AIRXRecord[]>([]);

  // Load records from localStorage
  useEffect(() => {
    if (clinicId) {
      const historyJson = localStorage.getItem(`healqr_clinic_rx_history_${clinicId}`);
      if (historyJson) {
        try {
          setRecords(JSON.parse(historyJson));
        } catch (e) {
          console.error('Failed to parse rx history', e);
        }
      }
    }
  }, [clinicId]);

  const filteredRecords = records.filter((record) => {
    const matchesSearch =
      record.patientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.patientId.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDoctor = !doctorFilter || (record.doctorName || '').toLowerCase().includes(doctorFilter.toLowerCase());
    const matchesDate = dateFilter ? record.consultationDate === dateFilter : true;
    const matchesLanguage = languageFilter === 'all' || record.language === languageFilter;
    return matchesSearch && matchesDoctor && matchesDate && matchesLanguage;
  });

  const handleDownload = (record: AIRXRecord) => {
    const text = `AI RX Reader Report\n\nPatient: ${record.patientName}\nPatient ID: ${record.patientId}\n${record.doctorName ? `Doctor: Dr. ${record.doctorName}\n` : ''}Consultation: ${record.consultationDate}\nLanguage: ${record.language}\n\nMedicines:\n${record.medicines.map((m, i) => `${i + 1}. ${m.name} - ${m.dosage} (${m.frequency})`).join('\n')}`;
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rx_${record.patientName.replace(/\s+/g, '_')}_${record.consultationDate}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const languageLabels: Record<string, string> = {
    english: 'English',
    hindi: 'Hindi (हिंदी)',
    bengali: 'Bengali (বাংলা)',
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-emerald-500/20 rounded-lg flex items-center justify-center">
            <Sparkles className="w-6 h-6 text-emerald-400" />
          </div>
          <div>
            <h1 className="text-white text-xl uppercase font-black tracking-tight">AI RX Reader History</h1>
            <p className="text-zinc-400 text-sm mt-0.5">View all AI-processed prescription records</p>
          </div>
        </div>
        {onBack && (
          <Button onClick={onBack} variant="ghost" className="text-gray-400 hover:text-white hover:bg-zinc-900">
            <ArrowLeft className="w-4 h-4 mr-2" /> Back
          </Button>
        )}
      </div>

      {/* Filters */}
      <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="w-5 h-5 text-emerald-400" />
          <h2 className="text-white font-semibold">Filters</h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <div>
            <label className="text-[10px] text-gray-500 uppercase tracking-wider mb-1 block">Patient</label>
            <input type="text" placeholder="Search patient..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-gray-900 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 placeholder:text-gray-600" />
          </div>
          <div>
            <label className="text-[10px] text-gray-500 uppercase tracking-wider mb-1 block">Doctor</label>
            <input type="text" placeholder="Search doctor..." value={doctorFilter} onChange={(e) => setDoctorFilter(e.target.value)}
              className="w-full bg-gray-900 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 placeholder:text-gray-600" />
          </div>
          <div>
            <label className="text-[10px] text-gray-500 uppercase tracking-wider mb-1 block">Date</label>
            <input type="date" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)}
              className="w-full bg-gray-900 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
          </div>
          <div>
            <label className="text-[10px] text-gray-500 uppercase tracking-wider mb-1 block">Language</label>
            <select value={languageFilter} onChange={(e) => setLanguageFilter(e.target.value)}
              className="w-full bg-gray-900 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500">
              <option value="all">All Languages</option>
              <option value="english">English</option>
              <option value="hindi">Hindi</option>
              <option value="bengali">Bengali</option>
            </select>
          </div>
          <div className="flex flex-col justify-end gap-2">
            <div className="flex items-center gap-2 bg-blue-500/10 border border-blue-500/30 rounded-lg px-3 py-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
              <span className="text-blue-400 text-xs">{filteredRecords.length} found</span>
            </div>
            <Button variant="ghost" size="sm" onClick={() => { setSearchTerm(''); setDoctorFilter(''); setDateFilter(''); setLanguageFilter('all'); }}
              className="text-xs text-gray-400 hover:text-white">Clear All</Button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4">
          <p className="text-zinc-400 text-[10px] font-black uppercase tracking-[0.15em]">Total Records</p>
          <p className="text-white text-2xl font-black mt-1">{records.length}</p>
        </div>
        <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4">
          <p className="text-zinc-400 text-[10px] font-black uppercase tracking-[0.15em]">AI Processed</p>
          <p className="text-emerald-400 text-2xl font-black mt-1">{records.filter((r) => r.aiProcessed).length}</p>
        </div>
        <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4">
          <p className="text-zinc-400 text-[10px] font-black uppercase tracking-[0.15em]">Patient Viewed</p>
          <p className="text-blue-400 text-2xl font-black mt-1">{records.filter((r) => r.viewed).length}</p>
        </div>
        <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4">
          <p className="text-zinc-400 text-[10px] font-black uppercase tracking-[0.15em]">Pending Review</p>
          <p className="text-amber-400 text-2xl font-black mt-1">{records.filter((r) => !r.viewed).length}</p>
        </div>
      </div>

      {/* Records */}
      <div className="bg-gray-800/50 border border-gray-700 rounded-xl overflow-hidden">
        <div className="bg-gray-900/50 border-b border-gray-700 px-6 py-4">
          <h2 className="text-white flex items-center gap-2">
            <Clock className="w-5 h-5 text-emerald-400" />
            Prescription Records
          </h2>
        </div>

        {filteredRecords.length === 0 ? (
          <div className="text-center py-16">
            <FileText className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <h3 className="text-gray-400 text-lg mb-1">No records found</h3>
            <p className="text-gray-500 text-sm">
              {records.length === 0 ? 'AI RX Reader records will appear here once prescriptions are processed' : 'Try adjusting your search or filter criteria'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-700/50">
            {filteredRecords.map((record) => (
              <div key={record.id} className="hover:bg-gray-700/20 transition-colors">
                <div className="p-4 sm:p-5">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-white flex items-center gap-2 flex-wrap">
                          {record.patientName}
                          {record.aiProcessed && (
                            <span className="inline-flex items-center gap-1 text-[10px] bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 px-2 py-0.5 rounded-full">
                              <Sparkles className="w-3 h-3" /> AI Processed
                            </span>
                          )}
                          {record.viewed && (
                            <span className="inline-flex items-center gap-1 text-[10px] bg-blue-500/10 border border-blue-500/30 text-blue-400 px-2 py-0.5 rounded-full">
                              <Eye className="w-3 h-3" /> Viewed
                            </span>
                          )}
                        </div>
                        {record.doctorName && (
                          <div className="text-xs text-blue-400 mt-0.5">Dr. {record.doctorName}</div>
                        )}
                        <div className="text-sm text-gray-500 mt-1">
                          ID: {record.patientId} • {languageLabels[record.language] || record.language}
                        </div>
                      </div>
                      <div className="hidden md:block text-sm text-gray-400">
                        <div>Consultation: {record.consultationDate}</div>
                        <div className="text-xs text-gray-500">Uploaded: {record.uploadDate}</div>
                      </div>
                      <div className="hidden lg:block text-center">
                        <div className="font-bold text-white text-lg">{record.medicines.length}</div>
                        <div className="text-[10px] text-gray-500 uppercase tracking-wider">Medicine{record.medicines.length !== 1 ? 's' : ''}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button onClick={() => handleDownload(record)} variant="ghost" size="sm" className="text-blue-400 hover:text-blue-300 hover:bg-blue-500/10">
                        <Download className="w-4 h-4 mr-1.5" /><span className="hidden sm:inline">Download</span>
                      </Button>
                      <Button onClick={() => { setExpandedRecord(record.id); setTimeout(() => window.print(), 500); }} variant="ghost" size="sm" className="text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10">
                        <Printer className="w-4 h-4 mr-1.5" /><span className="hidden sm:inline">Print</span>
                      </Button>
                      <Button onClick={() => setExpandedRecord(expandedRecord === record.id ? null : record.id)} variant="ghost" size="sm" className="text-gray-400 hover:text-white">
                        <ChevronDown className={`w-5 h-5 transition-transform ${expandedRecord === record.id ? 'rotate-180' : ''}`} />
                      </Button>
                    </div>
                  </div>
                </div>

                {expandedRecord === record.id && (
                  <div className="border-t border-gray-700/50 bg-gray-900/50 p-6">
                    <div className="grid md:grid-cols-2 gap-6">
                      {record.prescriptionImage && (
                        <div>
                          <h4 className="font-semibold text-white mb-3">Original Prescription</h4>
                          <div className="border-2 border-gray-700 rounded-lg overflow-hidden">
                            <img src={record.prescriptionImage} alt="Prescription" className="w-full h-auto" />
                          </div>
                        </div>
                      )}
                      <div>
                        <h4 className="font-semibold text-white mb-3 flex items-center gap-2">
                          <Sparkles className="w-5 h-5 text-emerald-400" /> AI Decoded Medicines
                        </h4>
                        <div className="space-y-3">
                          {record.medicines.map((med, index) => (
                            <div key={index} className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                              <div className="font-medium text-white mb-2">{index + 1}. {med.name}</div>
                              <div className="grid grid-cols-2 gap-2 text-sm text-gray-400">
                                <div><span className="font-medium text-gray-300">Dosage:</span> {med.dosage}</div>
                                <div><span className="font-medium text-gray-300">Frequency:</span> {med.frequency}</div>
                              </div>
                            </div>
                          ))}
                        </div>
                        <div className="mt-4 bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 text-sm text-amber-400">
                          <div className="flex items-start gap-2">
                            <Sparkles className="w-4 h-4 mt-0.5 flex-shrink-0" />
                            <div>AI decoded from doctor's handwriting and translated to {languageLabels[record.language] || record.language}</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

