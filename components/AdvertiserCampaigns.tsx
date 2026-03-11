import { useState } from 'react';
import { Check, ArrowRight, Search, MapPin, Layout, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { db, auth } from '../lib/firebase/config';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

// Mock Data
const TEMPLATES = [
  { id: 't1', name: 'Health Awareness', image: 'https://via.placeholder.com/300x200/18181b/10b981?text=Health+Awareness' },
  { id: 't2', name: 'Special Offer', image: 'https://via.placeholder.com/300x200/18181b/3b82f6?text=Special+Offer' },
  { id: 't3', name: 'New Clinic', image: 'https://via.placeholder.com/300x200/18181b/8b5cf6?text=New+Clinic' },
  { id: 't4', name: 'General Checkup', image: 'https://via.placeholder.com/300x200/18181b/f59e0b?text=General+Checkup' },
];

const PINCODES = [
  '700001', '700002', '700003', '700004', '700005',
  '700006', '700007', '700008', '700009', '700010'
];

const VIEW_PACKAGES = [
  { id: '1k', label: '1k Views', value: 1000, price: 500, popular: false },
  { id: '5k', label: '5k Views', value: 5000, price: 2200, popular: true },
  { id: '10k', label: '10k Views', value: 10000, price: 4000, popular: false },
  { id: '25k', label: '25k Views', value: 25000, price: 9000, popular: false },
];

export default function AdvertiserCampaigns() {
  const [mode, setMode] = useState<'create' | 'history'>('create');

  // Creation State
  const [selectedTemplates, setSelectedTemplates] = useState<string[]>([]);
  const [selectedPincodes, setSelectedPincodes] = useState<string[]>([]);
  const [selectedPackage, setSelectedPackage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [pincodeSearch, setPincodeSearch] = useState('');

  const toggleTemplate = (id: string) => {
    setSelectedTemplates(prev =>
      prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]
    );
  };

  const togglePincode = (code: string) => {
    setSelectedPincodes(prev =>
      prev.includes(code) ? prev.filter(p => p !== code) : [...prev, code]
    );
  };

  const filteredPincodes = PINCODES.filter(p => p.includes(pincodeSearch));

  const toggleAllTemplates = () => {
    if (selectedTemplates.length === TEMPLATES.length) {
      setSelectedTemplates([]);
    } else {
      setSelectedTemplates(TEMPLATES.map(t => t.id));
    }
  };

  const toggleAllPincodes = () => {
    const targetPincodes = filteredPincodes;
    const allSelected = targetPincodes.length > 0 && targetPincodes.every(code => selectedPincodes.includes(code));

    if (allSelected) {
      setSelectedPincodes(prev => prev.filter(code => !targetPincodes.includes(code)));
    } else {
      const newSelection = new Set([...selectedPincodes, ...targetPincodes]);
      setSelectedPincodes(Array.from(newSelection));
    }
  };

  const handlePayment = async () => {
    if (selectedTemplates.length === 0) return toast.error("Select at least one template");
    if (selectedPincodes.length === 0) return toast.error("Select at least one pincode");
    if (!selectedPackage) return toast.error("Select a view package");

    setLoading(true);
    const pkg = VIEW_PACKAGES.find(p => p.id === selectedPackage);

    try {
      const user = auth.currentUser;

      // Demo Mode Simulation
      if (!user) {
        await new Promise(resolve => setTimeout(resolve, 2000));
        toast.success("Campaign created successfully (Demo Mode)");
        setMode('history');
        setLoading(false);
        return;
      }

      // Real Firestore Write
      await addDoc(collection(db, 'advertiser_campaigns'), {
        advertiserId: user.uid,
        templates: selectedTemplates,
        pincodes: selectedPincodes,
        viewBundle: pkg?.value,
        totalAmount: pkg?.price,
        status: 'active',
        createdAt: serverTimestamp(),
        stats: { impressions: 0, clicks: 0 }
      });

      toast.success("Campaign launched successfully!");
      setMode('history');
    } catch (error) {
      console.error("Error creating campaign:", error);
      toast.error("Failed to create campaign");
    } finally {
      setLoading(false);
    }
  };

  if (mode === 'history') {
    return (
      <div className="p-6 md:p-8">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-2xl font-bold text-white">Campaign History</h2>
          <button
            onClick={() => setMode('create')}
            className="bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-2.5 rounded-xl font-medium transition-colors flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Create New
          </button>
        </div>

        <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-12 text-center">
          <div className="w-16 h-16 bg-zinc-800 rounded-full flex items-center justify-center mx-auto mb-4">
            <Layout className="w-8 h-8 text-zinc-500" />
          </div>
          <h3 className="text-lg font-medium text-white mb-2">No campaigns yet</h3>
          <p className="text-zinc-500 max-w-sm mx-auto">
            Your campaign history will appear here once you launch your first campaign.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto">
      {/* Header Tabs */}
      <div className="flex items-center gap-1 bg-zinc-900/50 p-1 rounded-xl w-fit mb-8 border border-zinc-800">
        <button
          onClick={() => setMode('create')}
          className={`px-6 py-2 rounded-lg text-sm font-medium transition-all ${
            mode === 'create' ? 'bg-emerald-600 text-white shadow-lg' : 'text-zinc-400 hover:text-white'
          }`}
        >
          Create Campaign
        </button>
        <button
          onClick={() => setMode('history')}
          className="px-6 py-2 rounded-lg text-sm font-medium transition-all text-zinc-400 hover:text-white"
        >
          History
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Configuration */}
        <div className="lg:col-span-8 space-y-8">

          {/* Step 1: Templates */}
          <section className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-emerald-500/10 rounded-lg flex items-center justify-center text-emerald-500 font-bold">1</div>
                <h3 className="text-lg font-semibold text-white">Choose Templates</h3>
              </div>
              <button
                onClick={toggleAllTemplates}
                className="text-sm text-emerald-500 hover:text-emerald-400 font-medium"
              >
                {selectedTemplates.length === TEMPLATES.length ? 'Deselect All' : 'Select All'}
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {TEMPLATES.map(template => (
                <div
                  key={template.id}
                  onClick={() => toggleTemplate(template.id)}
                  className={`relative group cursor-pointer rounded-xl overflow-hidden border-2 transition-all duration-200 ${
                    selectedTemplates.includes(template.id)
                      ? 'border-emerald-500 ring-2 ring-emerald-500/20'
                      : 'border-zinc-800 hover:border-zinc-600'
                  }`}
                >
                  <img src={template.image} alt={template.name} className="w-full h-40 object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent flex flex-col justify-end p-4">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-white">{template.name}</span>
                      {selectedTemplates.includes(template.id) && (
                        <div className="bg-emerald-500 rounded-full p-1">
                          <Check className="w-3 h-3 text-white" />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Step 2: Targeting */}
          <section className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-emerald-500/10 rounded-lg flex items-center justify-center text-emerald-500 font-bold">2</div>
                <h3 className="text-lg font-semibold text-white">Select Target Areas</h3>
              </div>
              <button
                onClick={toggleAllPincodes}
                className="text-sm text-emerald-500 hover:text-emerald-400 font-medium"
              >
                {filteredPincodes.length > 0 && filteredPincodes.every(code => selectedPincodes.includes(code)) ? 'Deselect All' : 'Select All'}
              </button>
            </div>

            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
              <input
                type="text"
                placeholder="Search pincodes..."
                value={pincodeSearch}
                onChange={(e) => setPincodeSearch(e.target.value)}
                className="w-full bg-black border border-zinc-800 rounded-xl pl-10 pr-4 py-3 text-white focus:outline-none focus:border-emerald-500 transition-colors"
              />
            </div>

            <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto custom-scrollbar">
              {filteredPincodes.map(code => (
                <button
                  key={code}
                  onClick={() => togglePincode(code)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                    selectedPincodes.includes(code)
                      ? 'bg-emerald-600 text-white'
                      : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-white'
                  }`}
                >
                  <MapPin className="w-3 h-3" />
                  {code}
                </button>
              ))}
            </div>
          </section>

          {/* Step 3: Budget */}
          <section className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-8 h-8 bg-emerald-500/10 rounded-lg flex items-center justify-center text-emerald-500 font-bold">3</div>
              <h3 className="text-lg font-semibold text-white">Select View Package</h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {VIEW_PACKAGES.map(pkg => (
                <button
                  key={pkg.id}
                  onClick={() => setSelectedPackage(pkg.id)}
                  className={`relative p-4 rounded-xl border-2 text-left transition-all ${
                    selectedPackage === pkg.id
                      ? 'bg-emerald-500/10 border-emerald-500'
                      : 'bg-zinc-900 border-zinc-800 hover:border-zinc-600'
                  }`}
                >
                  {pkg.popular && (
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-amber-500 text-black text-[10px] font-bold px-2 py-0.5 rounded-full">
                      POPULAR
                    </span>
                  )}
                  <div className="text-2xl font-bold text-white mb-1">{pkg.label}</div>
                  <div className="text-zinc-400 text-sm mb-3">{pkg.value.toLocaleString()} impressions</div>
                  <div className={`text-lg font-semibold ${selectedPackage === pkg.id ? 'text-emerald-400' : 'text-white'}`}>
                    ₹{pkg.price}
                  </div>
                </button>
              ))}
            </div>
          </section>

        </div>

        {/* Right Column: Summary & Pay */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 sticky top-24">
            <h3 className="text-lg font-semibold text-white mb-6">Campaign Summary</h3>

            <div className="space-y-4 mb-8">
              <div className="flex justify-between text-sm">
                <span className="text-zinc-400">Templates Selected</span>
                <span className="text-white font-medium">{selectedTemplates.length}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-zinc-400">Target Pincodes</span>
                <span className="text-white font-medium">{selectedPincodes.length}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-zinc-400">View Package</span>
                <span className="text-white font-medium">
                  {selectedPackage ? VIEW_PACKAGES.find(p => p.id === selectedPackage)?.label : '-'}
                </span>
              </div>
              <div className="h-px bg-zinc-800 my-4"></div>
              <div className="flex justify-between items-end">
                <span className="text-zinc-400">Total Amount</span>
                <span className="text-2xl font-bold text-emerald-500">
                  ₹{selectedPackage ? VIEW_PACKAGES.find(p => p.id === selectedPackage)?.price : '0'}
                </span>
              </div>
            </div>

            <button
              onClick={handlePayment}
              disabled={loading}
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-4 rounded-xl transition-all transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                'Processing...'
              ) : (
                <>
                  Proceed to Pay <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>

            <p className="text-xs text-zinc-500 text-center mt-4">
              By proceeding, you agree to our advertising terms and conditions.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
