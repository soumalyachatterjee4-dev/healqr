import { useState, useEffect } from 'react';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Percent, Plus, Trash2, Calendar, CheckCircle, XCircle } from 'lucide-react';
import { toast } from 'sonner';

interface DiscountCard {
  id: string;
  code: string;
  discountPercentage: number;
  expiryDate: Date;
  isActive: boolean;
  createdAt: Date;
  usageCount?: number;
}

export default function AdminDiscountCards() {
  const [discountCards, setDiscountCards] = useState<DiscountCard[]>([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formData, setFormData] = useState({
    code: '',
    discountPercentage: '',
    expiryDate: '',
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadDiscountCards();
  }, []);

  const loadDiscountCards = async () => {
    try {
      const { db } = await import('../lib/firebase/config');
      if (!db) return;

      const { collection, getDocs, orderBy, query } = await import('firebase/firestore');
      const discountCardsRef = collection(db, 'discountCards');
      const q = query(discountCardsRef, orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);

      const cards: DiscountCard[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        cards.push({
          id: doc.id,
          code: data.code,
          discountPercentage: data.discountPercentage,
          expiryDate: data.expiryDate?.toDate(),
          isActive: data.isActive,
          createdAt: data.createdAt?.toDate(),
          usageCount: data.usageCount || 0,
        });
      });

      setDiscountCards(cards);
    } catch (error) {
      console.error('Error loading discount cards:', error);
      toast.error('Failed to load discount cards');
    }
  };

  const handleCreateCard = async () => {
    if (!formData.code || !formData.discountPercentage || !formData.expiryDate) {
      toast.error('Please fill all fields');
      return;
    }

    const percentage = parseInt(formData.discountPercentage);
    if (percentage < 1 || percentage > 100) {
      toast.error('Discount percentage must be between 1 and 100');
      return;
    }

    setLoading(true);

    try {
      const { db } = await import('../lib/firebase/config');
      if (!db) {
        toast.error('Database not available');
        return;
      }

      const { collection, addDoc, serverTimestamp } = await import('firebase/firestore');
      const discountCardsRef = collection(db, 'discountCards');

      await addDoc(discountCardsRef, {
        code: formData.code.toUpperCase(),
        discountPercentage: percentage,
        expiryDate: new Date(formData.expiryDate),
        isActive: true,
        createdAt: serverTimestamp(),
        usageCount: 0,
      });

      toast.success('Discount card created successfully!');
      setFormData({ code: '', discountPercentage: '', expiryDate: '' });
      setShowCreateForm(false);
      loadDiscountCards();
    } catch (error) {
      console.error('Error creating discount card:', error);
      toast.error('Failed to create discount card');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleActive = async (cardId: string, currentStatus: boolean) => {
    try {
      const { db } = await import('../lib/firebase/config');
      if (!db) return;

      const { doc, updateDoc } = await import('firebase/firestore');
      const cardRef = doc(db, 'discountCards', cardId);
      await updateDoc(cardRef, { isActive: !currentStatus });

      toast.success(currentStatus ? 'Discount card deactivated' : 'Discount card activated');
      loadDiscountCards();
    } catch (error) {
      console.error('Error toggling card status:', error);
      toast.error('Failed to update card status');
    }
  };

  const handleDeleteCard = async (cardId: string) => {
    if (!confirm('Are you sure you want to delete this discount card?')) return;

    try {
      const { db } = await import('../lib/firebase/config');
      if (!db) return;

      const { doc, deleteDoc } = await import('firebase/firestore');
      const cardRef = doc(db, 'discountCards', cardId);
      await deleteDoc(cardRef);

      toast.success('Discount card deleted');
      loadDiscountCards();
    } catch (error) {
      console.error('Error deleting card:', error);
      toast.error('Failed to delete card');
    }
  };

  return (
    <div className="min-h-screen bg-black text-white p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">Discount Cards</h1>
            <p className="text-gray-400">Create and manage promotional discount codes</p>
          </div>
          <Button
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create New
          </Button>
        </div>

        {/* Create Form */}
        {showCreateForm && (
          <Card className="bg-zinc-900 border-zinc-800 mb-6">
            <CardContent className="p-6">
              <h3 className="text-xl font-semibold mb-4">Create Discount Card</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Discount Code</label>
                  <Input
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                    placeholder="DIWALI50"
                    className="bg-zinc-800 border-zinc-700 text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Discount %</label>
                  <Input
                    type="number"
                    value={formData.discountPercentage}
                    onChange={(e) => setFormData({ ...formData, discountPercentage: e.target.value })}
                    placeholder="50"
                    min="1"
                    max="100"
                    className="bg-zinc-800 border-zinc-700 text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Expiry Date</label>
                  <Input
                    type="date"
                    value={formData.expiryDate}
                    onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
                    className="bg-zinc-800 border-zinc-700 text-white"
                  />
                </div>
              </div>
              <div className="flex gap-3 mt-4">
                <Button
                  onClick={handleCreateCard}
                  disabled={loading}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  {loading ? 'Creating...' : 'Create Card'}
                </Button>
                <Button
                  onClick={() => {
                    setShowCreateForm(false);
                    setFormData({ code: '', discountPercentage: '', expiryDate: '' });
                  }}
                  variant="outline"
                  className="border-zinc-700 text-gray-400"
                >
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Discount Cards List */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {discountCards.map((card) => {
            const isExpired = card.expiryDate && card.expiryDate < new Date();
            return (
              <Card key={card.id} className="bg-zinc-900 border-zinc-800">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-emerald-500/20 rounded-lg flex items-center justify-center">
                        <Percent className="w-6 h-6 text-emerald-500" />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold">{card.code}</h3>
                        <p className="text-emerald-500 text-lg">{card.discountPercentage}% OFF</p>
                      </div>
                    </div>
                    {card.isActive && !isExpired ? (
                      <CheckCircle className="w-5 h-5 text-emerald-500" />
                    ) : (
                      <XCircle className="w-5 h-5 text-gray-500" />
                    )}
                  </div>

                  <div className="space-y-2 mb-4">
                    <div className="flex items-center gap-2 text-sm text-gray-400">
                      <Calendar className="w-4 h-4" />
                      <span>Expires: {card.expiryDate?.toLocaleDateString()}</span>
                    </div>
                    {isExpired && (
                      <p className="text-red-400 text-sm">⚠️ Expired</p>
                    )}
                    <p className="text-gray-400 text-sm">Used: {card.usageCount || 0} times</p>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      onClick={() => handleToggleActive(card.id, card.isActive)}
                      variant="outline"
                      size="sm"
                      className={`flex-1 ${
                        card.isActive
                          ? 'border-yellow-500 text-yellow-500 hover:bg-yellow-500/10'
                          : 'border-emerald-500 text-emerald-500 hover:bg-emerald-500/10'
                      }`}
                    >
                      {card.isActive ? 'Deactivate' : 'Activate'}
                    </Button>
                    <Button
                      onClick={() => handleDeleteCard(card.id)}
                      variant="outline"
                      size="sm"
                      className="border-red-500 text-red-500 hover:bg-red-500/10"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {discountCards.length === 0 && (
          <div className="text-center py-12">
            <Percent className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400">No discount cards created yet</p>
            <Button
              onClick={() => setShowCreateForm(true)}
              className="mt-4 bg-emerald-600 hover:bg-emerald-700"
            >
              Create Your First Card
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

