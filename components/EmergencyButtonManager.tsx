import { useState, useEffect } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { AlertCircle, Phone, Shield, Power, Edit, ArrowLeft } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from './ui/dialog';
import { toast } from 'sonner';
import DashboardSidebar from './DashboardSidebar';

interface EmergencyButtonManagerProps {
  onBack: () => void;
}

export default function EmergencyButtonManager({ onBack }: EmergencyButtonManagerProps) {
  const [isActive, setIsActive] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [newPhoneNumber, setNewPhoneNumber] = useState('');
  const [showActivateModal, setShowActivateModal] = useState(false);
  const [showDeactivateModal, setShowDeactivateModal] = useState(false);
  const [showChangeNumberModal, setShowChangeNumberModal] = useState(false);
  const [loading, setLoading] = useState(false);

  // Load current status from Firestore
  useEffect(() => {
    loadEmergencyButtonStatus();
  }, []);

  const loadEmergencyButtonStatus = async () => {
    try {
      const userId = localStorage.getItem('userId');
      if (!userId) return;

      const { db } = await import('../lib/firebase/config');
      if (!db) return;

      const { doc, getDoc } = await import('firebase/firestore');
      const doctorDoc = await getDoc(doc(db, 'doctors', userId));

      if (doctorDoc.exists()) {
        const data = doctorDoc.data();
        const active = data.emergencyButtonActive || false;
        const phone = data.emergencyPhone || '';
        
        setIsActive(active);
        setPhoneNumber(phone);
      }
    } catch (error) {
      console.error('Error loading emergency button status:', error);
    }
  };

  const handleActivate = () => {
    if (!newPhoneNumber.trim()) {
      toast.error('Please enter a phone number');
      return;
    }

    if (!/^[6-9]\d{9}$/.test(newPhoneNumber)) {
      toast.error('Please enter a valid 10-digit Indian mobile number');
      return;
    }

    setShowActivateModal(true);
  };

  const confirmActivate = async () => {
    setLoading(true);
    try {
      const userId = localStorage.getItem('userId');
      if (!userId) throw new Error('User not found');

      const { db } = await import('../lib/firebase/config');
      if (!db) throw new Error('Database not configured');

      const { doc, updateDoc, serverTimestamp } = await import('firebase/firestore');
      const doctorRef = doc(db, 'doctors', userId);

      await updateDoc(doctorRef, {
        emergencyButtonActive: true,
        emergencyPhone: newPhoneNumber,
        emergencyActivatedAt: serverTimestamp()
      });

      setIsActive(true);
      setPhoneNumber(newPhoneNumber);
      setNewPhoneNumber('');
      setShowActivateModal(false);

      toast.success('Emergency Button Activated!', {
        description: 'Patients can now call you directly in emergencies'
      });
    } catch (error) {
      console.error('Error activating emergency button:', error);
      toast.error('Failed to activate Emergency Button');
    } finally {
      setLoading(false);
    }
  };

  const confirmDeactivate = async () => {
    setLoading(true);
    try {
      const userId = localStorage.getItem('userId');
      if (!userId) throw new Error('User not found');

      const { db } = await import('../lib/firebase/config');
      if (!db) throw new Error('Database not configured');

      const { doc, updateDoc, serverTimestamp } = await import('firebase/firestore');
      const doctorRef = doc(db, 'doctors', userId);

      await updateDoc(doctorRef, {
        emergencyButtonActive: false,
        emergencyDeactivatedAt: serverTimestamp()
      });

      setIsActive(false);
      setShowDeactivateModal(false);

      toast.success('Emergency Button Deactivated');
    } catch (error) {
      console.error('Error deactivating emergency button:', error);
      toast.error('Failed to deactivate Emergency Button');
    } finally {
      setLoading(false);
    }
  };

  const handleChangeNumber = () => {
    if (!newPhoneNumber.trim()) {
      toast.error('Please enter a new phone number');
      return;
    }

    if (!/^[6-9]\d{9}$/.test(newPhoneNumber)) {
      toast.error('Please enter a valid 10-digit Indian mobile number');
      return;
    }

    setShowChangeNumberModal(true);
  };

  const confirmChangeNumber = async () => {
    setLoading(true);
    try {
      const userId = localStorage.getItem('userId');
      if (!userId) throw new Error('User not found');

      const { db } = await import('../lib/firebase/config');
      if (!db) throw new Error('Database not configured');

      const { doc, updateDoc, serverTimestamp } = await import('firebase/firestore');
      const doctorRef = doc(db, 'doctors', userId);

      await updateDoc(doctorRef, {
        emergencyPhone: newPhoneNumber,
        emergencyPhoneUpdatedAt: serverTimestamp()
      });

      setPhoneNumber(newPhoneNumber);
      setNewPhoneNumber('');
      setShowChangeNumberModal(false);

      toast.success('Emergency Number Updated!');
    } catch (error) {
      console.error('Error updating emergency number:', error);
      toast.error('Failed to update phone number');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black">
      <DashboardSidebar
        activeMenu="emergency-button"
        onMenuChange={onBack}
        isOpen={false}
      />

      <div className="lg:ml-64 p-6">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-6">
            <div className="flex items-center gap-4 mb-4">
              <button
                onClick={onBack}
                className="p-2 hover:bg-zinc-800 rounded-lg transition-colors text-gray-400 hover:text-white"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-3xl font-bold text-white">Emergency Button</h1>
              </div>
            </div>
            <p className="text-gray-400">
              Enable direct emergency calling for your patients
            </p>
          </div>

          {/* Status Card */}
          <Card className="bg-zinc-900 border-zinc-800 p-6 mb-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                  isActive ? 'bg-red-500/10' : 'bg-zinc-800'
                }`}>
                  <AlertCircle className={`w-6 h-6 ${isActive ? 'text-red-500' : 'text-gray-500'}`} />
                </div>
                <div>
                  <h3 className="text-white font-semibold text-lg">Emergency Button Status</h3>
                  <p className="text-sm text-gray-400">
                    {isActive ? 'Active - Patients can call you directly' : 'Inactive - Not visible to patients'}
                  </p>
                </div>
              </div>
              <div className={`px-4 py-2 rounded-full text-sm font-bold ${
                isActive 
                  ? 'bg-red-500/10 text-red-500 border border-red-500/20' 
                  : 'bg-zinc-800 text-gray-400 border border-zinc-700'
              }`}>
                {isActive ? 'ACTIVE' : 'INACTIVE'}
              </div>
            </div>

            {isActive && phoneNumber && (
              <div className="bg-zinc-800 rounded-lg p-4 mb-4">
                <div className="flex items-center gap-2 text-emerald-500 mb-2">
                  <Phone className="w-4 h-4" />
                  <span className="text-sm font-medium">Current Emergency Number</span>
                </div>
                <p className="text-white text-xl font-bold">+91 {phoneNumber}</p>
              </div>
            )}

            {/* Info Box */}
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 mb-4">
              <div className="flex gap-3">
                <Shield className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-blue-300">
                  <p className="font-medium mb-1">How it works:</p>
                  <ul className="space-y-1 text-blue-300/80">
                    <li>• Red emergency button appears on your booking page</li>
                    <li>• Patients click it to directly call your emergency number</li>
                    <li>• Use for genuine medical emergencies only</li>
                    <li>• You can deactivate anytime when not available</li>
                  </ul>
                </div>
              </div>
            </div>
          </Card>

          {/* Action Cards */}
          {!isActive ? (
            /* Activation Card */
            <Card className="bg-zinc-900 border-zinc-800 p-6">
              <h3 className="text-white font-semibold text-lg mb-4 flex items-center gap-2">
                <Power className="w-5 h-5 text-emerald-500" />
                Activate Emergency Button
              </h3>
              <p className="text-gray-400 text-sm mb-4">
                Enter your emergency contact number that patients can call during critical situations
              </p>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="phone" className="text-white mb-2 block">
                    Emergency Phone Number
                  </Label>
                  <div className="flex gap-3">
                    <div className="flex-shrink-0 flex items-center px-4 bg-zinc-800 border border-zinc-700 rounded-lg text-gray-400">
                      +91
                    </div>
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="Enter 10-digit mobile number"
                      value={newPhoneNumber}
                      onChange={(e) => setNewPhoneNumber(e.target.value.replace(/\D/g, '').slice(0, 10))}
                      className="flex-1 bg-zinc-800 border-zinc-700 text-white"
                      maxLength={10}
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    Only Indian mobile numbers (starting with 6-9)
                  </p>
                </div>

                <Button
                  onClick={handleActivate}
                  className="w-full bg-red-600 hover:bg-red-700 text-white h-12"
                  disabled={!newPhoneNumber || newPhoneNumber.length !== 10}
                >
                  <Power className="w-4 h-4 mr-2" />
                  Activate Emergency Button
                </Button>
              </div>
            </Card>
          ) : (
            /* Management Card */
            <Card className="bg-zinc-900 border-zinc-800 p-6">
              <h3 className="text-white font-semibold text-lg mb-4">Manage Emergency Button</h3>

              <div className="space-y-4">
                {/* Change Number */}
                <div>
                  <Label htmlFor="new-phone" className="text-white mb-2 block">
                    Change Emergency Number
                  </Label>
                  <div className="flex gap-3">
                    <div className="flex-shrink-0 flex items-center px-4 bg-zinc-800 border border-zinc-700 rounded-lg text-gray-400">
                      +91
                    </div>
                    <Input
                      id="new-phone"
                      type="tel"
                      placeholder="Enter new number"
                      value={newPhoneNumber}
                      onChange={(e) => setNewPhoneNumber(e.target.value.replace(/\D/g, '').slice(0, 10))}
                      className="flex-1 bg-zinc-800 border-zinc-700 text-white"
                      maxLength={10}
                    />
                  </div>
                </div>

                <Button
                  onClick={handleChangeNumber}
                  variant="outline"
                  className="w-full border-zinc-700 text-white hover:bg-zinc-800 h-12"
                  disabled={!newPhoneNumber || newPhoneNumber.length !== 10}
                >
                  <Edit className="w-4 h-4 mr-2" />
                  Update Phone Number
                </Button>

                <div className="border-t border-zinc-800 pt-4">
                  <Button
                    onClick={() => setShowDeactivateModal(true)}
                    variant="outline"
                    className="w-full border-red-500/30 text-red-500 hover:bg-red-500/10 h-12"
                  >
                    <Power className="w-4 h-4 mr-2" />
                    Deactivate Emergency Button
                  </Button>
                </div>
              </div>
            </Card>
          )}
        </div>
      </div>

      {/* Activation Confirmation Modal */}
      <Dialog open={showActivateModal} onOpenChange={setShowActivateModal}>
        <DialogContent className="bg-zinc-900 border-zinc-800 text-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <Shield className="w-6 h-6 text-red-500" />
              Activate Emergency Button?
            </DialogTitle>
            <DialogDescription className="text-gray-400 pt-4">
              <div className="space-y-3">
                <p>You are about to activate the emergency calling feature with:</p>
                <div className="bg-zinc-800 p-3 rounded-lg">
                  <p className="text-white font-bold text-lg">+91 {newPhoneNumber}</p>
                </div>
                <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3">
                  <p className="text-yellow-300 text-sm font-medium mb-1">⚠️ Important:</p>
                  <ul className="text-xs text-yellow-300/80 space-y-1">
                    <li>• This number will be visible to patients</li>
                    <li>• Use only for genuine emergencies</li>
                    <li>• Ensure you're available to take emergency calls</li>
                    <li>• You can deactivate anytime</li>
                  </ul>
                </div>
              </div>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setShowActivateModal(false)}
              className="border-zinc-700 text-white hover:bg-zinc-800"
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              onClick={confirmActivate}
              className="bg-red-600 hover:bg-red-700 text-white"
              disabled={loading}
            >
              {loading ? 'Activating...' : 'Yes, Activate'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Deactivation Confirmation Modal */}
      <Dialog open={showDeactivateModal} onOpenChange={setShowDeactivateModal}>
        <DialogContent className="bg-zinc-900 border-zinc-800 text-white">
          <DialogHeader>
            <DialogTitle>Deactivate Emergency Button?</DialogTitle>
            <DialogDescription className="text-gray-400 pt-4">
              <p>The emergency button will be removed from your booking page. Patients will no longer be able to call you directly.</p>
              <p className="mt-2">You can reactivate it anytime from this page.</p>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setShowDeactivateModal(false)}
              className="border-zinc-700 text-white hover:bg-zinc-800"
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              onClick={confirmDeactivate}
              variant="destructive"
              disabled={loading}
            >
              {loading ? 'Deactivating...' : 'Yes, Deactivate'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Change Number Confirmation Modal */}
      <Dialog open={showChangeNumberModal} onOpenChange={setShowChangeNumberModal}>
        <DialogContent className="bg-zinc-900 border-zinc-800 text-white">
          <DialogHeader>
            <DialogTitle>Update Emergency Number?</DialogTitle>
            <DialogDescription className="text-gray-400 pt-4">
              <p className="mb-3">Your emergency contact number will be updated to:</p>
              <div className="bg-zinc-800 p-3 rounded-lg">
                <p className="text-white font-bold text-lg">+91 {newPhoneNumber}</p>
              </div>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setShowChangeNumberModal(false)}
              className="border-zinc-700 text-white hover:bg-zinc-800"
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              onClick={confirmChangeNumber}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
              disabled={loading}
            >
              {loading ? 'Updating...' : 'Update Number'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
