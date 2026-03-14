import { useState } from 'react';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { Input } from './ui/input';
import { Calendar, Plus, Search, Edit2, Trash2, Save, X } from 'lucide-react';

interface DiaryEntry {
  id: number;
  date: string;
  title: string;
  content: string;
  category: 'meeting' | 'task' | 'note' | 'reminder';
  createdAt: string;
}

export default function AdminWorkingDiary() {
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [entries, setEntries] = useState<DiaryEntry[]>([
    {
      id: 1,
      date: '2025-11-01',
      title: 'Platform Review Meeting',
      content: 'Discussed Q4 targets with the team. Focus on increasing doctor onboarding by 25%. Need to improve payment gateway success rate.',
      category: 'meeting',
      createdAt: '2025-11-01 10:30 AM'
    },
    {
      id: 2,
      date: '2025-11-01',
      title: 'Technical Issues',
      content: 'Fixed notification delivery bug. Updated Firebase rules for better security. Need to optimize database queries.',
      category: 'task',
      createdAt: '2025-11-01 02:15 PM'
    }
  ]);

  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');

  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    title: '',
    content: '',
    category: 'note' as DiaryEntry['category']
  });

  const handleAdd = () => {
    if (!formData.title || !formData.content) return;

    const newEntry: DiaryEntry = {
      id: Date.now(),
      date: formData.date,
      title: formData.title,
      content: formData.content,
      category: formData.category,
      createdAt: new Date().toLocaleString()
    };

    setEntries([newEntry, ...entries]);
    setFormData({
      date: new Date().toISOString().split('T')[0],
      title: '',
      content: '',
      category: 'note'
    });
    setIsAdding(false);
  };

  const handleEdit = (id: number) => {
    const entry = entries.find(e => e.id === id);
    if (entry) {
      setFormData({
        date: entry.date,
        title: entry.title,
        content: entry.content,
        category: entry.category
      });
      setEditingId(id);
    }
  };

  const handleUpdate = () => {
    setEntries(entries.map(entry => 
      entry.id === editingId 
        ? { ...entry, ...formData, createdAt: entry.createdAt + ' (edited)' }
        : entry
    ));
    setEditingId(null);
    setFormData({
      date: new Date().toISOString().split('T')[0],
      title: '',
      content: '',
      category: 'note'
    });
  };

  const handleDelete = (id: number) => {
    if (confirm('Are you sure you want to delete this entry?')) {
      setEntries(entries.filter(entry => entry.id !== id));
    }
  };

  const filteredEntries = entries.filter(entry => {
    const matchesSearch = entry.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         entry.content.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = filterCategory === 'all' || entry.category === filterCategory;
    
    // Date range filter
    let matchesDateRange = true;
    if (startDate || endDate) {
      const entryDate = new Date(entry.date);
      const start = startDate ? new Date(startDate) : null;
      const end = endDate ? new Date(endDate) : null;
      
      if (start && end) {
        matchesDateRange = entryDate >= start && entryDate <= end;
      } else if (start) {
        matchesDateRange = entryDate >= start;
      } else if (end) {
        matchesDateRange = entryDate <= end;
      }
    }
    
    return matchesSearch && matchesCategory && matchesDateRange;
  });

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'meeting': return 'bg-blue-500/10 text-blue-500 border-blue-500/30';
      case 'task': return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30';
      case 'note': return 'bg-purple-500/10 text-purple-500 border-purple-500/30';
      case 'reminder': return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/30';
      default: return 'bg-gray-500/10 text-gray-500 border-gray-500/30';
    }
  };

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="p-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl mb-2">Working Diary</h1>
          <p className="text-gray-400">Keep track of your daily activities, meetings, and important notes</p>
        </div>

        {/* Actions Bar */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
            <Input
              placeholder="Search diary entries..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-zinc-900 border-zinc-800"
            />
          </div>

          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-white"
          >
            <option value="all">All Categories</option>
            <option value="meeting">Meetings</option>
            <option value="task">Tasks</option>
            <option value="note">Notes</option>
            <option value="reminder">Reminders</option>
          </select>

          <Button
            onClick={() => setIsAdding(true)}
            className="bg-emerald-500 hover:bg-emerald-600"
          >
            <Plus className="w-5 h-5 mr-2" />
            New Entry
          </Button>
        </div>

        {/* Date Range Filter */}
        <div className="mb-6 bg-zinc-900 border border-zinc-800 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <Calendar className="w-5 h-5 text-emerald-500" />
            <h3 className="text-sm text-white">Filter by Date Range</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs text-gray-400 mb-1">From Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">To Date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div className="flex items-end">
              {(startDate || endDate) ? (
                <Button
                  onClick={() => {
                    setStartDate('');
                    setEndDate('');
                  }}
                  variant="outline"
                  size="sm"
                  className="w-full border-zinc-700 text-gray-400 hover:bg-zinc-800"
                >
                  Clear Filter
                </Button>
              ) : (
                <div className="w-full flex items-center justify-center text-xs text-gray-500 py-2 border border-dashed border-zinc-700 rounded-lg">
                  Select date range
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Add/Edit Form */}
        {(isAdding || editingId) && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 mb-6">
            <h3 className="text-lg mb-4">{editingId ? 'Edit Entry' : 'New Diary Entry'}</h3>
            
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Date</label>
                  <Input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="bg-zinc-800 border-zinc-700"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Category</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value as DiaryEntry['category'] })}
                    className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white"
                  >
                    <option value="note">Note</option>
                    <option value="meeting">Meeting</option>
                    <option value="task">Task</option>
                    <option value="reminder">Reminder</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-2">Title</label>
                <Input
                  placeholder="Enter entry title..."
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="bg-zinc-800 border-zinc-700"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-2">Content</label>
                <Textarea
                  placeholder="Write your diary entry here..."
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  rows={6}
                  className="bg-zinc-800 border-zinc-700"
                />
              </div>

              <div className="flex gap-3">
                <Button
                  onClick={editingId ? handleUpdate : handleAdd}
                  className="bg-emerald-500 hover:bg-emerald-600"
                >
                  <Save className="w-4 h-4 mr-2" />
                  {editingId ? 'Update' : 'Save'} Entry
                </Button>
                <Button
                  onClick={() => {
                    setIsAdding(false);
                    setEditingId(null);
                    setFormData({
                      date: new Date().toISOString().split('T')[0],
                      title: '',
                      content: '',
                      category: 'note'
                    });
                  }}
                  variant="outline"
                  className="border-zinc-700"
                >
                  <X className="w-4 h-4 mr-2" />
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Entries List */}
        <div className="space-y-4">
          {filteredEntries.length === 0 ? (
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-12 text-center">
              <Calendar className="w-12 h-12 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400">No diary entries found</p>
              <p className="text-sm text-gray-500 mt-2">Start by creating your first entry</p>
            </div>
          ) : (
            filteredEntries.map(entry => (
              <div key={entry.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 hover:border-emerald-500/30 transition-colors">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className={`px-3 py-1 rounded-full text-xs border ${getCategoryColor(entry.category)}`}>
                        {entry.category}
                      </span>
                      <span className="text-sm text-gray-500">{entry.date}</span>
                    </div>
                    <h3 className="text-lg text-white mb-2">{entry.title}</h3>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEdit(entry.id)}
                      className="p-2 hover:bg-zinc-800 rounded-lg text-gray-400 hover:text-emerald-500 transition-colors"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(entry.id)}
                      className="p-2 hover:bg-zinc-800 rounded-lg text-gray-400 hover:text-red-500 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <p className="text-gray-400 text-sm whitespace-pre-wrap mb-3">{entry.content}</p>
                <p className="text-xs text-gray-600">Created: {entry.createdAt}</p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

