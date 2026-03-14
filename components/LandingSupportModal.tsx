import { useState } from 'react';
import { X, Send, User, Mail } from 'lucide-react';
import { toast } from 'sonner';

interface LandingSupportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function LandingSupportModal({ open, onOpenChange }: LandingSupportModalProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Debug logging
  console.log('🔍 LandingSupportModal rendered - open:', open);

  const handleSubmit = async (e: React.FormEvent) => {
    console.log('🎯 handleSubmit called - event:', e);
    e.preventDefault();
    
    console.log('🎯 Landing page support form submitted');
    console.log('Form values - Name:', name, 'Email:', email, 'Message length:', message.length);

    if (!name.trim()) {
      toast.error('Please enter your name');
      return;
    }

    if (!email.trim()) {
      toast.error('Please enter your email');
      return;
    }

    if (!message.trim()) {
      toast.error('Please enter a message');
      return;
    }

    setIsSubmitting(true);

    // ✅ SAVE TO FIRESTORE SUPPORT REQUESTS COLLECTION
    try {
      const { db } = await import('../lib/firebase/config');
      const { collection, addDoc, serverTimestamp } = await import('firebase/firestore');
      
      console.log('🔄 Attempting to save landing page support request...');
      console.log('Name:', name);
      console.log('Email:', email);
      console.log('Message:', message);
      console.log('Type: landing');
      console.log('Status: unread');
      
      const docRef = await addDoc(collection(db, 'supportRequests'), {
        name,
        email,
        message,
        rating: null,
        status: 'unread',
        type: 'landing',
        createdAt: serverTimestamp(),
        resolvedAt: null,
      });
      
      console.log('✅✅✅ Landing page support request saved to Firestore with ID:', docRef.id);
      console.log('📍 Document path: supportRequests/' + docRef.id);
      
      // Show success message
      toast.success('Support request submitted successfully! We\'ll get back to you soon.');
      
      // Reset form
      setName('');
      setEmail('');
      setMessage('');
      onOpenChange(false);
      
    } catch (error: any) {
      console.error('❌ Error saving support request:', error);
      console.error('Error code:', error.code);
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
      toast.error('Failed to submit request. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
      <div className="w-full max-w-lg bg-black border-2 border-emerald-500 rounded-2xl shadow-2xl">
        {/* Header */}
        <div className="bg-emerald-500 px-6 py-4 rounded-t-2xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
              <Mail className="w-5 h-5 text-white" />
            </div>
            <h2 className="text-xl text-white">Support</h2>
          </div>
          <button
            onClick={() => onOpenChange(false)}
            className="text-white hover:bg-white/20 rounded-lg p-1 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <p className="text-gray-400 mb-6">
            Need help? Send us a message and we'll get back to you soon.
          </p>

          <form 
            onSubmit={(e) => {
              console.log('📝 Form onSubmit event triggered');
              handleSubmit(e);
            }} 
            className="space-y-4"
          >
            {/* Name Field */}
            <div>
              <label className="block text-white mb-2">
                Name <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2">
                  <User className="w-5 h-5 text-gray-500" />
                </div>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your name"
                  className="w-full bg-zinc-900 border border-zinc-800 text-white rounded-lg pl-11 pr-4 py-3 focus:outline-none focus:border-emerald-500 transition-colors"
                />
              </div>
            </div>

            {/* Email Field */}
            <div>
              <label className="block text-white mb-2">
                Email <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2">
                  <Mail className="w-5 h-5 text-gray-500" />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  className="w-full bg-zinc-900 border border-zinc-800 text-white rounded-lg pl-11 pr-4 py-3 focus:outline-none focus:border-emerald-500 transition-colors"
                />
              </div>
            </div>

            {/* Message Field */}
            <div>
              <label className="block text-white mb-2">
                Message <span className="text-red-500">*</span>
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="How can we help you?"
                rows={5}
                className="w-full bg-zinc-900 border border-zinc-800 text-white rounded-lg px-4 py-3 focus:outline-none focus:border-emerald-500 transition-colors resize-none"
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              onClick={(e) => {
                console.log('🖱️ Submit button clicked directly');
                console.log('Button type:', e.currentTarget.type);
                console.log('isSubmitting:', isSubmitting);
              }}
              className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:bg-gray-500 disabled:cursor-not-allowed text-white rounded-lg py-3 flex items-center justify-center gap-2 transition-colors"
            >
              <Send className="w-5 h-5" />
              {isSubmitting ? 'Submitting...' : 'Submit'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

