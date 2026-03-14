import { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Star, Paperclip, X } from 'lucide-react';
import { toast } from 'sonner';

interface ContactSupportProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  doctorName: string;
  doctorCode: string;
  onSubmit?: (request: { doctorName: string; doctorCode: string; message: string; rating: number }) => void;
}

export default function ContactSupport({ open, onOpenChange, doctorName, doctorCode, onSubmit }: ContactSupportProps) {
  const [message, setMessage] = useState('');
  const [rating, setRating] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleSubmit = async () => {
    if (!message.trim()) {
      toast.error('Please enter a message');
      return;
    }

    // Only process if rating is provided
    if (rating && onSubmit) {
      onSubmit({
        doctorName,
        doctorCode,
        message,
        rating: parseFloat(rating),
      });
    }

    // ✅ SAVE TO FIRESTORE SUPPORT REQUESTS COLLECTION
    try {
      const { db } = await import('../lib/firebase/config');
      const { collection, addDoc, serverTimestamp } = await import('firebase/firestore');
      
      console.log('🔄 Attempting to save support request...');
      console.log('Doctor Name:', doctorName);
      console.log('Doctor Code:', doctorCode);
      console.log('Message:', message);
      console.log('Rating:', rating);
      
      const docRef = await addDoc(collection(db, 'supportRequests'), {
        doctorName,
        doctorCode,
        message,
        rating: rating ? parseFloat(rating) : null,
        status: 'unread',
        type: 'doctor',
        createdAt: serverTimestamp(),
        resolvedAt: null,
      });
      
      console.log('✅ Support request saved to Firestore with ID:', docRef.id);
      
      // Show success message
      toast.success('Support request submitted successfully!');
      
      // Reset form
      setMessage('');
      setRating('');
      setFile(null);
      onOpenChange(false);
      
    } catch (error: any) {
      console.error('❌ Error saving support request:', error);
      console.error('Error code:', error.code);
      console.error('Error message:', error.message);
      toast.error('Failed to submit request. Please try again.');
      return;
    }
  };

  const handleCancel = () => {
    setMessage('');
    setRating('');
    setFile(null);
    onOpenChange(false);
  };

  const renderStars = (count: number) => {
    const stars = [];
    const fullStars = Math.floor(count);
    const hasHalfStar = count % 1 !== 0;

    for (let i = 0; i < fullStars; i++) {
      stars.push(<Star key={`full-${i}`} className="w-4 h-4 fill-yellow-400 text-yellow-400" />);
    }

    if (hasHalfStar) {
      stars.push(
        <div key="half" className="relative w-4 h-4">
          <Star className="w-4 h-4 text-yellow-400 absolute" />
          <div className="overflow-hidden w-2 absolute">
            <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
          </div>
        </div>
      );
    }

    return stars;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-white text-black max-w-md p-0 gap-0 border-0 rounded-2xl">
        {/* Close Button */}
        <button
          onClick={() => onOpenChange(false)}
          className="absolute right-4 top-4 text-gray-400 hover:text-gray-600 transition-colors z-10"
        >
          <X className="w-5 h-5" />
        </button>

        <DialogHeader className="p-6 pb-4">
          <DialogTitle className="text-xl text-black">Contact Support</DialogTitle>
          <DialogDescription className="text-sm text-gray-500 mt-2">
            Your information is pre-filled. Please describe your issue below.
          </DialogDescription>
        </DialogHeader>

        <div className="px-6 pb-6 space-y-4">
          {/* Doctor Name and Code */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-black mb-2">
                Doctor Name
              </label>
              <Input
                type="text"
                value={doctorName}
                disabled
                className="bg-gray-50 text-gray-600 border-gray-200 h-11 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm text-black mb-2">
                Doctor Code
              </label>
              <Input
                type="text"
                value={doctorCode}
                disabled
                className="bg-gray-50 text-gray-600 border-gray-200 h-11 rounded-lg"
              />
            </div>
          </div>

          {/* Message */}
          <div>
            <label className="block text-sm text-black mb-2">
              Message
            </label>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Please type your message here..."
              rows={5}
              className="bg-white border-2 border-black text-black rounded-lg resize-none focus:border-black"
            />
          </div>

          {/* Rating */}
          <div>
            <label className="block text-sm text-black mb-2">
              Rate your support experience (Optional)
            </label>
            <Select value={rating} onValueChange={setRating}>
              <SelectTrigger className="w-full bg-white border-2 border-black h-12 rounded-lg text-black focus:border-black">
                <SelectValue>
                  {rating ? (
                    <div className="flex items-center gap-2">
                      {renderStars(parseFloat(rating))}
                      <span className="ml-1">{rating} Stars</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-gray-500">
                      <Star className="w-4 h-4" />
                      Select a rating
                    </div>
                  )}
                </SelectValue>
              </SelectTrigger>
              <SelectContent className="bg-white border-2 border-gray-200 rounded-lg">
                <SelectItem value="5" className="hover:bg-gray-100">
                  <div className="flex items-center gap-2">
                    {renderStars(5)}
                    <span className="ml-1">5 Stars</span>
                  </div>
                </SelectItem>
                <SelectItem value="4.5" className="hover:bg-gray-100">
                  <div className="flex items-center gap-2">
                    {renderStars(4.5)}
                    <span className="ml-1">4.5 Stars</span>
                  </div>
                </SelectItem>
                <SelectItem value="4" className="hover:bg-gray-100">
                  <div className="flex items-center gap-2">
                    {renderStars(4)}
                    <span className="ml-1">4 Stars</span>
                  </div>
                </SelectItem>
                <SelectItem value="3.5" className="hover:bg-gray-100">
                  <div className="flex items-center gap-2">
                    {renderStars(3.5)}
                    <span className="ml-1">3.5 Stars</span>
                  </div>
                </SelectItem>
                <SelectItem value="3" className="hover:bg-gray-100">
                  <div className="flex items-center gap-2">
                    {renderStars(3)}
                    <span className="ml-1">3 Stars</span>
                  </div>
                </SelectItem>
                <SelectItem value="2.5" className="hover:bg-gray-100">
                  <div className="flex items-center gap-2">
                    {renderStars(2.5)}
                    <span className="ml-1">2.5 Stars</span>
                  </div>
                </SelectItem>
                <SelectItem value="2" className="hover:bg-gray-100">
                  <div className="flex items-center gap-2">
                    {renderStars(2)}
                    <span className="ml-1">2 Stars</span>
                  </div>
                </SelectItem>
                <SelectItem value="1.5" className="hover:bg-gray-100">
                  <div className="flex items-center gap-2">
                    {renderStars(1.5)}
                    <span className="ml-1">1.5 Stars</span>
                  </div>
                </SelectItem>
                <SelectItem value="1" className="hover:bg-gray-100">
                  <div className="flex items-center gap-2">
                    {renderStars(1)}
                    <span className="ml-1">1 Stars</span>
                  </div>
                </SelectItem>
                <SelectItem value="0.5" className="hover:bg-gray-100">
                  <div className="flex items-center gap-2">
                    {renderStars(0.5)}
                    <span className="ml-1">0.5 Stars</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* File Attachment */}
          <div>
            <label className="block text-sm text-black mb-2">
              Attachment (Optional)
            </label>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-gray-300 text-black hover:bg-gray-50 h-11 rounded-lg"
              >
                <Paperclip className="w-4 h-4 mr-2 text-gray-600" />
                Choose file
              </Button>
              <span className="text-sm text-gray-500">
                {file ? file.name : 'No file chosen'}
              </span>
              <input
                ref={fileInputRef}
                type="file"
                onChange={handleFileChange}
                accept=".jpg,.jpeg,.png,.xlsx,.xls,.doc,.docx,.pdf"
                className="hidden"
              />
            </div>
            <p className="text-xs text-gray-400 mt-2">
              Accepted file types: JPG, PNG, Excel, Word, PDF.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              className="flex-1 border-2 border-gray-300 text-black hover:bg-gray-50 h-12 rounded-lg"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSubmit}
              className="flex-1 bg-indigo-900 hover:bg-indigo-800 text-white h-12 rounded-lg"
            >
              Submit Request
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

