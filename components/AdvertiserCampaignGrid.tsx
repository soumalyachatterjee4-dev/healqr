import { useState, useMemo } from 'react';
import { 
  LayoutGrid, 
  MonitorPlay, 
  Image as ImageIcon, 
  AlertCircle, 
  CheckCircle2, 
  MapPin, 
  Info,
  Users,
  ArrowRight,
  GripVertical,
  Plus,
  Trash2,
  Search,
  Filter
} from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';

interface CampaignGridProps {
  pincodes: string[];
  specialities: string[];
  onBack: () => void;
  onNext: (selectedInventory: any) => void;
}

// Mock Data for Draggables
const MOCK_TEMPLATES = [
  { id: 't1', name: 'Diwali Promo', type: 'static', image: 'https://images.unsplash.com/photo-1516640986224-6b6f505e6323?w=150&h=150&fit=crop' },
  { id: 't2', name: 'Heart Health', type: 'video', image: 'https://images.unsplash.com/photo-1505751172876-fa1923c5c528?w=150&h=150&fit=crop' },
  { id: 't3', name: 'Free Checkup', type: 'static', image: 'https://images.unsplash.com/photo-1532938911079-1b06ac7ceec7?w=150&h=150&fit=crop' },
  { id: 't4', name: 'Vaccine Drive', type: 'video', image: 'https://images.unsplash.com/photo-1584036561566-b93a945c3575?w=150&h=150&fit=crop' },
];

const MOCK_SPECIALTIES = [
  "Cardiologist", "Dentist", "General Physician", "Dermatologist", "Pediatrician"
];

const MOCK_PINCODES = [
  "400001", "400050", "400099", "110001", "110020"
];

interface GridCell {
  templateId?: string;
  specialties: string[];
  status: 'available' | 'waitlist';
  queuePosition?: number;
  price: number;
}

export default function AdvertiserCampaignGrid({ pincodes: initialPincodes, specialities: initialSpecialties, onBack, onNext }: CampaignGridProps) {
  // State
  const [activePincodes, setActivePincodes] = useState<string[]>(initialPincodes.length > 0 ? initialPincodes : ['400001', '400050']); // Default if empty
  const [gridState, setGridState] = useState<Record<string, GridCell>>({}); // Key: "pincode_type" (e.g. "400001_static")
  const [draggedItem, setDraggedItem] = useState<{ type: 'template' | 'specialty' | 'pincode', data: any } | null>(null);

  // Initialize Grid State on mount or pincode change
  useMemo(() => {
    const newGrid: Record<string, GridCell> = { ...gridState };
    activePincodes.forEach(pin => {
      ['static', 'video'].forEach(type => {
        const key = `${pin}_${type}`;
        if (!newGrid[key]) {
          // Mock Availability Logic
          const isWaitlist = Math.random() > 0.7;
          newGrid[key] = {
            specialties: [],
            status: isWaitlist ? 'waitlist' : 'available',
            queuePosition: isWaitlist ? Math.floor(Math.random() * 10) + 1 : undefined,
            price: type === 'static' ? 500 : 1200 // Base prices
          };
        }
      });
    });
    setGridState(newGrid);
  }, [activePincodes]);

  // Drag Handlers
  const handleDragStart = (e: React.DragEvent, type: 'template' | 'specialty' | 'pincode', data: any) => {
    setDraggedItem({ type, data });
    e.dataTransfer.setData('application/json', JSON.stringify({ type, data }));
    e.dataTransfer.effectAllowed = 'copy';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  };

  const handleDrop = (e: React.DragEvent, pincode: string, type: 'static' | 'video') => {
    e.preventDefault();
    const key = `${pincode}_${type}`;
    const cell = gridState[key];
    
    if (!draggedItem) return;

    if (draggedItem.type === 'template') {
      // Validate Type (Static vs Video)
      if (draggedItem.data.type !== type) {
        alert(`Cannot drop ${draggedItem.data.type} template into ${type} slot!`);
        return;
      }
      setGridState(prev => ({
        ...prev,
        [key]: { ...prev[key], templateId: draggedItem.data.id }
      }));
    } else if (draggedItem.type === 'specialty') {
      if (!cell.specialties.includes(draggedItem.data)) {
        setGridState(prev => ({
          ...prev,
          [key]: { ...prev[key], specialties: [...prev[key].specialties, draggedItem.data] }
        }));
      }
    }
    setDraggedItem(null);
  };

  const handleAddPincode = (pincode: string) => {
    if (!activePincodes.includes(pincode)) {
      setActivePincodes([...activePincodes, pincode]);
    }
  };

  const removePincode = (pincode: string) => {
    setActivePincodes(activePincodes.filter(p => p !== pincode));
  };

  const clearCell = (key: string) => {
    setGridState(prev => ({
      ...prev,
      [key]: { ...prev[key], templateId: undefined, specialties: [] }
    }));
  };

  const calculateTotal = () => {
    let total = 0;
    Object.values(gridState).forEach(cell => {
      if (cell.templateId) {
        total += cell.price;
      }
    });
    return total;
  };

  return (
    <div className="lg:h-[calc(100vh-100px)] h-auto min-h-screen flex flex-col lg:flex-row gap-6 p-4 lg:p-6 animate-in fade-in duration-500">
      
      {/* LEFT PANEL: Draggable Resources */}
      <div className="w-full lg:w-80 flex flex-col gap-4 shrink-0 h-96 lg:h-full">
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex-1 flex flex-col overflow-hidden">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <LayoutGrid className="w-5 h-5 text-emerald-500" />
            Resources
          </h3>
          
          <Tabs defaultValue="templates" className="flex-1 flex flex-col overflow-hidden">
            <TabsList className="grid grid-cols-3 bg-zinc-800 mb-4 h-auto p-1">
              <TabsTrigger value="templates" className="text-xs px-1 py-2">Templates</TabsTrigger>
              <TabsTrigger value="pincodes" className="text-xs px-1 py-2">Pincodes</TabsTrigger>
              <TabsTrigger value="specialty" className="text-xs px-1 py-2">Specialty</TabsTrigger>
            </TabsList>

            {/* Templates Tab */}
            <TabsContent value="templates" className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
              <div className="space-y-3">
                {MOCK_TEMPLATES.map(template => (
                  <div
                    key={template.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, 'template', template)}
                    className="bg-black border border-zinc-800 rounded-lg p-3 cursor-grab active:cursor-grabbing hover:border-emerald-500 transition-colors group"
                  >
                    <div className="flex items-center gap-3">
                      <img src={template.image} alt={template.name} className="w-12 h-12 rounded object-cover bg-zinc-800" />
                      <div>
                        <div className="font-medium text-white text-sm">{template.name}</div>
                        <Badge variant="outline" className="text-[10px] mt-1 border-zinc-700 text-zinc-400 capitalize">
                          {template.type}
                        </Badge>
                      </div>
                      <GripVertical className="w-4 h-4 text-zinc-600 ml-auto group-hover:text-zinc-400" />
                    </div>
                  </div>
                ))}
                <div className="p-4 border-2 border-dashed border-zinc-800 rounded-lg text-center text-zinc-500 text-sm hover:border-zinc-700 hover:text-zinc-400 cursor-pointer transition-colors">
                  <Plus className="w-6 h-6 mx-auto mb-2" />
                  Upload New Template
                </div>
              </div>
            </TabsContent>

            {/* Pincodes Tab */}
            <TabsContent value="pincodes" className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
              <div className="space-y-2">
                <div className="relative mb-3">
                  <Search className="w-4 h-4 absolute left-3 top-3 text-zinc-500" />
                  <Input placeholder="Search Pincodes..." className="pl-9 bg-black border-zinc-800" />
                </div>
                {MOCK_PINCODES.map(pin => (
                  <div
                    key={pin}
                    className="flex items-center justify-between bg-black border border-zinc-800 rounded-lg p-3 group"
                  >
                    <div className="flex items-center gap-2 text-zinc-300">
                      <MapPin className="w-4 h-4 text-emerald-500" />
                      {pin}
                    </div>
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      className="h-6 w-6 p-0 hover:bg-emerald-500/20 hover:text-emerald-500"
                      onClick={() => handleAddPincode(pin)}
                      disabled={activePincodes.includes(pin)}
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </TabsContent>

            {/* Specialty Tab */}
            <TabsContent value="specialty" className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
              <div className="space-y-2">
                {MOCK_SPECIALTIES.map(spec => (
                  <div
                    key={spec}
                    draggable
                    onDragStart={(e) => handleDragStart(e, 'specialty', spec)}
                    className="bg-black border border-zinc-800 rounded-lg p-3 cursor-grab active:cursor-grabbing hover:border-blue-500 transition-colors flex items-center justify-between group"
                  >
                    <span className="text-zinc-300 text-sm">{spec}</span>
                    <GripVertical className="w-4 h-4 text-zinc-600 group-hover:text-zinc-400" />
                  </div>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* RIGHT PANEL: The Composer Grid */}
      <div className="flex-1 flex flex-col min-w-0 h-[600px] lg:h-auto">
        {/* Header / Stats */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 mb-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-white">Campaign Composer</h2>
            <p className="text-sm text-zinc-400">Drag templates to slots to book inventory</p>
          </div>
          <div className="flex items-center gap-6 w-full sm:w-auto justify-between sm:justify-end">
            <div className="text-right">
              <div className="text-xs text-zinc-400">Total Cost</div>
              <div className="text-2xl font-bold text-emerald-400">₹{calculateTotal().toLocaleString()}</div>
            </div>
            <Button 
              onClick={() => onNext(gridState)} 
              className="bg-emerald-600 hover:bg-emerald-500"
              disabled={calculateTotal() === 0}
            >
              Proceed
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>

        {/* The Grid Canvas */}
        <div className="flex-1 bg-black border border-zinc-800 rounded-xl overflow-hidden flex flex-col">
          <div className="overflow-auto custom-scrollbar flex-1">
            <div className="min-w-max">
              {/* Grid Header (Pincodes) */}
              <div className="flex border-b border-zinc-800 sticky top-0 bg-zinc-900 z-10">
                <div className="w-32 p-4 shrink-0 border-r border-zinc-800 font-medium text-zinc-400 flex items-center justify-center bg-zinc-900 sticky left-0 z-20">
                  Format
                </div>
                {activePincodes.map(pin => (
                  <div key={pin} className="w-64 p-4 shrink-0 border-r border-zinc-800 flex items-center justify-between group">
                    <div className="flex items-center gap-2 text-white font-medium">
                      <MapPin className="w-4 h-4 text-emerald-500" />
                      {pin}
                    </div>
                    <button onClick={() => removePincode(pin)} className="text-zinc-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                <div className="w-32 p-4 shrink-0 flex items-center justify-center text-zinc-500 italic text-sm">
                  + Add Pincode
                </div>
              </div>

              {/* Grid Rows (Static / Video) */}
              {['static', 'video'].map(type => (
                <div key={type} className="flex border-b border-zinc-800 last:border-0">
                  {/* Row Header */}
                  <div className="w-32 p-4 shrink-0 border-r border-zinc-800 bg-zinc-900/50 sticky left-0 z-10 flex flex-col items-center justify-center gap-2">
                    {type === 'static' ? <ImageIcon className="w-6 h-6 text-blue-400" /> : <MonitorPlay className="w-6 h-6 text-purple-400" />}
                    <span className="text-sm font-medium text-white capitalize">{type}</span>
                    <span className="text-[10px] text-zinc-500">₹{type === 'static' ? 500 : 1200}/1k</span>
                  </div>

                  {/* Cells */}
                  {activePincodes.map(pin => {
                    const key = `${pin}_${type}`;
                    const cell = gridState[key];
                    const template = MOCK_TEMPLATES.find(t => t.id === cell?.templateId);

                    return (
                      <div 
                        key={key}
                        onDragOver={handleDragOver}
                        onDrop={(e) => handleDrop(e, pin, type as 'static' | 'video')}
                        className={`w-64 p-3 shrink-0 border-r border-zinc-800 min-h-[180px] transition-colors relative group
                          ${!cell ? 'bg-zinc-950' : ''}
                          ${cell?.status === 'waitlist' ? 'bg-amber-950/10' : 'hover:bg-zinc-900/50'}
                        `}
                      >
                        {/* Empty State */}
                        {!cell?.templateId && (
                          <div className="h-full border-2 border-dashed border-zinc-800 rounded-lg flex flex-col items-center justify-center text-zinc-600 gap-2">
                            <Plus className="w-6 h-6" />
                            <span className="text-xs">Drag {type} template</span>
                            {cell?.status === 'waitlist' && (
                              <Badge variant="outline" className="mt-2 border-amber-500/50 text-amber-500 bg-amber-500/10">
                                Waitlist #{cell.queuePosition}
                              </Badge>
                            )}
                          </div>
                        )}

                        {/* Filled State */}
                        {cell?.templateId && template && (
                          <div className="h-full bg-zinc-900 border border-zinc-700 rounded-lg p-3 flex flex-col gap-2 relative group/card">
                            <button 
                              onClick={() => clearCell(key)}
                              className="absolute top-2 right-2 text-zinc-500 hover:text-red-400 opacity-0 group-hover/card:opacity-100 transition-opacity"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>

                            <div className="flex items-center gap-3">
                              <img src={template.image} className="w-10 h-10 rounded object-cover" />
                              <div className="overflow-hidden">
                                <div className="text-sm font-medium text-white truncate">{template.name}</div>
                                <div className="text-xs text-emerald-400">₹{cell.price}</div>
                              </div>
                            </div>

                            {/* Specialties List */}
                            <div className="flex flex-wrap gap-1 mt-auto">
                              {cell.specialties.length > 0 ? (
                                cell.specialties.map(spec => (
                                  <span key={spec} className="text-[10px] px-1.5 py-0.5 bg-zinc-800 rounded text-zinc-300 border border-zinc-700">
                                    {spec}
                                  </span>
                                ))
                              ) : (
                                <span className="text-[10px] text-zinc-500 italic">All Specialties</span>
                              )}
                            </div>

                            {cell.status === 'waitlist' && (
                              <div className="absolute inset-0 bg-black/60 backdrop-blur-[1px] flex items-center justify-center rounded-lg">
                                <div className="text-center">
                                  <AlertCircle className="w-6 h-6 text-amber-500 mx-auto mb-1" />
                                  <div className="text-xs font-bold text-amber-500">Waitlist #{cell.queuePosition}</div>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                  
                  {/* Add Column Placeholder */}
                  <div className="w-32 shrink-0 bg-zinc-950/50 flex items-center justify-center">
                    {/* Spacer */}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Helper Icons
function X({ className }: { className?: string }) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      width="24" 
      height="24" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
    >
      <path d="M18 6 6 18"/>
      <path d="m6 6 12 12"/>
    </svg>
  )
}

