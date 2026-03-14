import { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { MessageSquare, X, User, Mail, Send } from 'lucide-react';
import { toast } from 'sonner';

export default function FloatingSupportBox() {
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    console.log('🎯 FloatingSupportBox form submitted');
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
      
      console.log('🔄 Attempting to save floating support request...');
      console.log('Name:', name);
      console.log('Email:', email);
      console.log('Message:', message);
      
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
      
      console.log('✅✅✅ Floating support request saved to Firestore with ID:', docRef.id);
      console.log('📍 Document path: supportRequests/' + docRef.id);
      
      // Show success message
      toast.success('Support request submitted successfully! We\'ll get back to you soon.');
      
      // Reset form
      setName('');
      setEmail('');
      setMessage('');
      setIsOpen(false);
      
    } catch (error: any) {
      console.error('❌ Error saving support request:', error);
      console.error('Error code:', error.code);
      console.error('Error message:', error.message);
      toast.error('Failed to submit request. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      {/* Floating Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-emerald-500 hover:bg-emerald-600 rounded-full flex items-center justify-center shadow-lg transition-all hover:scale-110"
        >
          <MessageSquare className="w-6 h-6 text-white" />
        </button>
      )}

      {/* Support Box */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 z-50 w-80 md:w-96 bg-zinc-900 rounded-2xl border border-zinc-800 shadow-2xl">
          {/* Header */}
          <div className="bg-emerald-500 rounded-t-2xl p-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-white" />
              <h3 className="text-white">Support</h3>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-white hover:bg-emerald-600 rounded-full p-1 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6">
            <p className="text-gray-400 text-sm mb-4">
              Need help? Send us a message and we'll get back to you soon.
            </p>

            {/* Name Field */}
            <div className="mb-4">
              <label className="block text-white text-sm mb-2">
                Name <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your name"
                  required
                  className="pl-10 bg-black border-zinc-800 text-white h-11 rounded-lg focus:border-emerald-500"
                />
              </div>
            </div>

            {/* Email Field */}
            <div className="mb-4">
              <label className="block text-white text-sm mb-2">
                Email <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  required
                  className="pl-10 bg-black border-zinc-800 text-white h-11 rounded-lg focus:border-emerald-500"
                />
              </div>
            </div>

            {/* Message Field */}
            <div className="mb-4">
              <label className="block text-white text-sm mb-2">
                Message <span className="text-red-500">*</span>
              </label>
              <Textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="How can we help you?"
                required
                rows={4}
                className="bg-black border-zinc-800 text-white rounded-lg resize-none focus:border-emerald-500"
              />
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:bg-gray-500 disabled:cursor-not-allowed text-white h-11 rounded-lg"
            >
              <Send className="w-4 h-4 mr-2" />
              {isSubmitting ? 'Submitting...' : 'Submit'}
            </Button>
          </form>
        </div>
      )}
    </>
  );
}

