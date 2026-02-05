import { Calendar } from 'lucide-react';
import { Button } from './ui/button';

interface DateRangeFilterProps {
  startDate: string;
  endDate: string;
  onStartDateChange: (date: string) => void;
  onEndDateChange: (date: string) => void;
  onClear: () => void;
  label?: string;
}

export default function DateRangeFilter({
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  onClear,
  label = 'Filter by Date Range'
}: DateRangeFilterProps) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <Calendar className="w-5 h-5 text-emerald-500" />
        <h3 className="text-sm text-white">{label}</h3>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-xs text-gray-400 mb-1">From Date</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => onStartDateChange(e.target.value)}
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-400 mb-1">To Date</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => onEndDateChange(e.target.value)}
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
        <div className="flex items-end">
          {(startDate || endDate) ? (
            <Button
              onClick={onClear}
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
  );
}
