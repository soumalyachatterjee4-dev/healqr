import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Input } from './ui/input';
import { Search, Check } from 'lucide-react';
import { useState, useMemo } from 'react';

interface SelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  items: string[];
  onSelect: (item: string) => void;
  selectedItems?: string[];
}

export default function SelectionModal({ 
  isOpen, 
  onClose, 
  title, 
  items, 
  onSelect,
  selectedItems = []
}: SelectionModalProps) {
  const [search, setSearch] = useState('');

  const filteredItems = useMemo(() => {
    return items.filter(item => 
      item.toLowerCase().includes(search.toLowerCase())
    );
  }, [items, search]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="bg-zinc-900 border-zinc-800 text-white max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        
        <div className="relative mb-4 shrink-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          <Input 
            placeholder="Search..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-zinc-800 border-zinc-700 text-white focus-visible:ring-emerald-500"
          />
        </div>

        <div className="flex-1 overflow-y-auto space-y-1 pr-2 min-h-[300px] custom-scrollbar">
          <style jsx>{`
            .custom-scrollbar::-webkit-scrollbar {
              width: 6px;
            }
            .custom-scrollbar::-webkit-scrollbar-track {
              background: rgba(255, 255, 255, 0.05);
              border-radius: 3px;
            }
            .custom-scrollbar::-webkit-scrollbar-thumb {
              background: rgba(255, 255, 255, 0.2);
              border-radius: 3px;
            }
            .custom-scrollbar::-webkit-scrollbar-thumb:hover {
              background: rgba(255, 255, 255, 0.3);
            }
          `}</style>
          {filteredItems.length === 0 ? (
            <div className="text-center py-8 text-zinc-500">
              No results found
            </div>
          ) : (
            filteredItems.map((item) => (
              <button
                key={item}
                onClick={() => {
                  onSelect(item);
                  onClose();
                }}
                className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-zinc-800 transition-colors text-left group"
              >
                <span className="group-hover:text-emerald-400 transition-colors">{item}</span>
                {selectedItems.includes(item) && (
                  <Check className="w-4 h-4 text-emerald-500" />
                )}
              </button>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
