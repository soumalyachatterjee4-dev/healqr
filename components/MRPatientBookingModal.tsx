import React, { useState, useEffect } from 'react';
import { db } from '../lib/firebase/config';
import { collection, doc, getDoc, addDoc, serverTimestamp, updateDoc, increment } from 'firebase/firestore';
import { X, User, Phone, CheckCircle2, Loader2, Calendar } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { toast } from 'sonner';

interface MRPatientBookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  mrData: any;
  doctorLink: any;
}

export function MRPatientBookingModal({ isOpen, onClose, mrData, doctorLink }: MRPatientBookingModalProps) {
  const [formData, setFormData] = useState({
    patientName: '',
    phone: '',
    age: '',
    gender: 'male',
  });
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'book' | 'success'>('book');

  useEffect(() => {
    if (isOpen) {
      setStep('book');
      setFormData({ patientName: '', phone: '', age: '', gender: 'male' });
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.patientName || !formData.phone || !doctorLink?.doctorId) return;
    
    setLoading(true);
    try {
      const doctorRef = doc(db, 'doctors', doctorLink.doctorId);
      const doctorSnap = await getDoc(doctorRef);
      if (!doctorSnap.exists()) throw new Error('Doctor not found');
      
      const doctorData = doctorSnap.data();

      // Simple unique ID logic for MR referred patients
      const randomPart = Math.floor(1000 + Math.random() * 9000);
      const bookingId = `MR-REF-${randomPart}`;

      await addDoc(collection(db, 'bookings'), {
        bookingId,
        patientName: formData.patientName,
        whatsappNumber: formData.phone.startsWith('+91') ? formData.phone : `+91${formData.phone}`,
        age: formData.age || null,
        gender: formData.gender,
        doctorId: doctorLink.doctorId,
        doctorName: doctorLink.doctorName,
        date: new Date(),
        time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        type: 'walkin_booking',
        status: 'confirmed',
        createdAt: serverTimestamp(),
        isWalkIn: true,
        verifiedByPatient: true, // MR referral is auto-verified
        verificationMethod: 'mr_referral',
        referredBy: `MR: ${mrData.name} (${mrData.company})`,
        mrId: localStorage.getItem('userId'),
      });

      // Increment doctor booking count
      await updateDoc(doctorRef, { bookingsCount: increment(1) });

      setStep('success');
    } catch (err) {
      console.error(err);
      toast.error('Failed to book patient');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-4 border-b border-zinc-800 flex items-center justify-between sticky top-0 bg-zinc-900 z-10">
          <div>
            <h2 className="font-semibold text-lg">Book Patient</h2>
            <p className="text-sm text-gray-400">For Dr. {doctorLink?.doctorName}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-zinc-800 rounded-lg text-gray-400">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 overflow-y-auto">
          {step === 'success' ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-8 h-8 text-emerald-500" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Patient Booked!</h3>
              <p className="text-gray-400 text-sm mb-6">
                The patient has been added to Dr. {doctorLink?.doctorName}'s queue as a walk-in patient.
              </p>
              <Button onClick={onClose} className="bg-blue-600 hover:bg-blue-700 w-full">Done</Button>
            </div>
          ) : (
            <form id="mrPatientForm" onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Patient Name *</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <Input
                    required
                    value={formData.patientName}
                    onChange={e => setFormData({ ...formData, patientName: e.target.value })}
                    className="pl-9 bg-zinc-800 border-zinc-700 text-white"
                    placeholder="Enter full name"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Phone Number *</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <Input
                    required
                    type="tel"
                    value={formData.phone}
                    onChange={e => setFormData({ ...formData, phone: e.target.value })}
                    className="pl-9 bg-zinc-800 border-zinc-700 text-white"
                    placeholder="10-digit mobile number"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Age</label>
                  <Input
                    type="number"
                    value={formData.age}
                    onChange={e => setFormData({ ...formData, age: e.target.value })}
                    className="bg-zinc-800 border-zinc-700 text-white"
                    placeholder="e.g. 35"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Gender</label>
                  <select
                    value={formData.gender}
                    onChange={e => setFormData({ ...formData, gender: e.target.value })}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white h-10 outline-none focus:border-blue-500"
                  >
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>
            </form>
          )}
        </div>

        {step === 'book' && (
          <div className="p-4 border-t border-zinc-800 bg-zinc-900 mt-auto">
            <Button
              type="submit"
              form="mrPatientForm"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium"
              disabled={loading || !formData.patientName || !formData.phone}
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Confirm Booking'}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
