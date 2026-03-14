import React, { useState } from 'react';
import { Search, Calendar, FileText, Sparkles, Download, Eye, Filter, ChevronDown, ArrowLeft } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';

interface AIRXRecord {
  id: string;
  patientId: string;
  patientName: string;
  consultationDate: string;
  uploadDate: string;
  prescriptionImage: string;
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
}

export const AIRXReaderHistory: React.FC<AIRXReaderHistoryProps> = ({ onBack }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [languageFilter, setLanguageFilter] = useState<string>('all');
  const [expandedRecord, setExpandedRecord] = useState<string | null>(null);

  // Mock data - Replace with real data from database
  const [records] = useState<AIRXRecord[]>([
    {
      id: 'rx-001',
      patientId: 'p-001',
      patientName: 'Rahul Sharma',
      consultationDate: '2025-11-14',
      uploadDate: '2025-11-14 10:30 AM',
      prescriptionImage: 'https://images.unsplash.com/photo-1584820927498-cfe5211fd8bf?w=400',
      aiProcessed: true,
      language: 'hindi',
      viewed: true,
      medicines: [
        { name: 'Paracetamol', dosage: '500mg', frequency: '2 times daily' },
        { name: 'Amoxicillin', dosage: '250mg', frequency: '3 times daily' },
      ],
    },
    {
      id: 'rx-002',
      patientId: 'p-002',
      patientName: 'Priya Banerjee',
      consultationDate: '2025-11-13',
      uploadDate: '2025-11-13 02:45 PM',
      prescriptionImage: 'https://images.unsplash.com/photo-1584820927498-cfe5211fd8bf?w=400',
      aiProcessed: true,
      language: 'bengali',
      viewed: false,
      medicines: [
        { name: 'Azithromycin', dosage: '500mg', frequency: 'Once daily' },
      ],
    },
    {
      id: 'rx-003',
      patientId: 'p-003',
      patientName: 'John Doe',
      consultationDate: '2025-11-12',
      uploadDate: '2025-11-12 11:15 AM',
      prescriptionImage: 'https://images.unsplash.com/photo-1584820927498-cfe5211fd8bf?w=400',
      aiProcessed: true,
      language: 'english',
      viewed: true,
      medicines: [
        { name: 'Ibuprofen', dosage: '400mg', frequency: '3 times daily' },
        { name: 'Omeprazole', dosage: '20mg', frequency: 'Once daily before meal' },
      ],
    },
  ]);

  const filteredRecords = records.filter((record) => {
    const matchesSearch =
      record.patientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.patientId.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesDate = dateFilter ? record.consultationDate === dateFilter : true;

    const matchesLanguage = languageFilter === 'all' || record.language === languageFilter;

    return matchesSearch && matchesDate && matchesLanguage;
  });

  const handleDownload = (record: AIRXRecord) => {
    // Implement download logic
  };

  const languageLabels = {
    english: 'English',
    hindi: 'Hindi (हिंदी)',
    bengali: 'Bengali (বাংলা)',
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white p-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <Sparkles className="w-10 h-10" />
              <h1 className="text-3xl font-bold">AI RX Reader History</h1>
            </div>
            {onBack && (
              <Button
                onClick={onBack}
                variant="outline"
                className="border-white/30 text-white hover:bg-white/20 hover:text-white"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
            )}
          </div>
          <p className="text-emerald-50">
            View all AI-processed prescription records with patient history
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white border-b shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto p-6">
          <div className="grid md:grid-cols-4 gap-4">
            {/* Search by Patient Name */}
            <div className="md:col-span-2">
              <div className="relative">
                <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <Input
                  type="text"
                  placeholder="Search by patient name or ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Date Filter */}
            <div>
              <div className="relative">
                <Calendar className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <Input
                  type="date"
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Language Filter */}
            <div>
              <div className="relative">
                <Filter className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <select
                  value={languageFilter}
                  onChange={(e) => setLanguageFilter(e.target.value)}
                  className="w-full pl-10 pr-8 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="all">All Languages</option>
                  <option value="english">English</option>
                  <option value="hindi">Hindi</option>
                  <option value="bengali">Bengali</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Records List */}
      <div className="max-w-7xl mx-auto p-6">
        {/* Stats */}
        <div className="grid md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-gray-600">Total Records</div>
            <div className="text-2xl font-bold text-gray-900 mt-1">{records.length}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-gray-600">AI Processed</div>
            <div className="text-2xl font-bold text-emerald-600 mt-1">
              {records.filter((r) => r.aiProcessed).length}
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-gray-600">Patient Viewed</div>
            <div className="text-2xl font-bold text-blue-600 mt-1">
              {records.filter((r) => r.viewed).length}
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-gray-600">Pending Review</div>
            <div className="text-2xl font-bold text-amber-600 mt-1">
              {records.filter((r) => !r.viewed).length}
            </div>
          </div>
        </div>

        {/* Records Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {filteredRecords.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <div className="text-gray-500 text-lg">No records found</div>
              <div className="text-gray-400 text-sm mt-1">
                Try adjusting your search or filter criteria
              </div>
            </div>
          ) : (
            <div className="divide-y">
              {filteredRecords.map((record) => (
                <div key={record.id} className="hover:bg-gray-50 transition-colors">
                  {/* Main Row */}
                  <div className="p-4">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-4 flex-1 min-w-0">
                        {/* Patient Info */}
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-gray-900 flex items-center gap-2">
                            {record.patientName}
                            {record.aiProcessed && (
                              <span className="inline-flex items-center gap-1 text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">
                                <Sparkles className="w-3 h-3" />
                                AI Processed
                              </span>
                            )}
                            {record.viewed && (
                              <span className="inline-flex items-center gap-1 text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                                <Eye className="w-3 h-3" />
                                Viewed
                              </span>
                            )}
                          </div>
                          <div className="text-sm text-gray-600 mt-1">
                            Patient ID: {record.patientId} • {languageLabels[record.language]}
                          </div>
                        </div>

                        {/* Dates */}
                        <div className="hidden md:block text-sm text-gray-600">
                          <div>Consultation: {record.consultationDate}</div>
                          <div className="text-xs text-gray-500">Uploaded: {record.uploadDate}</div>
                        </div>

                        {/* Medicines Count */}
                        <div className="hidden lg:block">
                          <div className="text-sm text-gray-600 text-center">
                            <div className="font-semibold text-gray-900">
                              {record.medicines.length}
                            </div>
                            <div className="text-xs">Medicine{record.medicines.length !== 1 ? 's' : ''}</div>
                          </div>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2">
                        <Button
                          onClick={() => handleDownload(record)}
                          variant="outline"
                          size="sm"
                        >
                          <Download className="w-4 h-4 mr-2" />
                          Download
                        </Button>
                        <Button
                          onClick={() =>
                            setExpandedRecord(expandedRecord === record.id ? null : record.id)
                          }
                          variant="ghost"
                          size="sm"
                        >
                          <ChevronDown
                            className={`w-5 h-5 transition-transform ${
                              expandedRecord === record.id ? 'rotate-180' : ''
                            }`}
                          />
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Expanded Details */}
                  {expandedRecord === record.id && (
                    <div className="border-t bg-gray-50 p-6">
                      <div className="grid md:grid-cols-2 gap-6">
                        {/* Prescription Image */}
                        <div>
                          <h4 className="font-semibold text-gray-900 mb-3">
                            Original Prescription
                          </h4>
                          <div className="border-2 border-gray-200 rounded-lg overflow-hidden">
                            <img
                              src={record.prescriptionImage}
                              alt="Prescription"
                              className="w-full h-auto"
                            />
                          </div>
                        </div>

                        {/* AI Decoded Data */}
                        <div>
                          <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                            <Sparkles className="w-5 h-5 text-emerald-600" />
                            AI Decoded Medicines
                          </h4>
                          <div className="space-y-3">
                            {record.medicines.map((med, index) => (
                              <div
                                key={index}
                                className="bg-white rounded-lg p-4 border border-gray-200"
                              >
                                <div className="font-medium text-gray-900 mb-2">
                                  {index + 1}. {med.name}
                                </div>
                                <div className="grid grid-cols-2 gap-2 text-sm text-gray-600">
                                  <div>
                                    <span className="font-medium">Dosage:</span> {med.dosage}
                                  </div>
                                  <div>
                                    <span className="font-medium">Frequency:</span>{' '}
                                    {med.frequency}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>

                          <div className="mt-4 bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
                            <div className="flex items-start gap-2">
                              <Sparkles className="w-4 h-4 mt-0.5 flex-shrink-0" />
                              <div>
                                AI decoded from doctor's handwriting and translated to{' '}
                                {languageLabels[record.language]}
                              </div>
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
    </div>
  );
};

