import { Send, Paperclip, X, AlertCircle, CheckCircle, Clock, ChevronLeft, Image as ImageIcon, Mic, Play, Pause, Languages } from 'lucide-react';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { useState, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { translate, type SupportedLanguage } from '../services/translationService';
import DashboardPromoDisplay from './DashboardPromoDisplay';

interface PatientChatInterfaceProps {
  chatToken: string;
}

interface ChatMessage {
  id: string;
  senderType: 'doctor' | 'patient';
  message: string;
  imageUrl?: string;
  voiceUrl?: string;
  voiceDuration?: number;
  timestamp: string;
  read: boolean;
  translatedMessage?: string;
  isTranslating?: boolean;
}

interface DoctorInfo {
  name: string;
  specialization: string;
  photo?: string;
  isOnline: boolean;
}

export default function PatientChatInterface({ chatToken }: PatientChatInterfaceProps) {
  const [isLinkExpired, setIsLinkExpired] = useState(false);
  const [hasRequestedNewChat, setHasRequestedNewChat] = useState(false);
  const [packageExpired, setPackageExpired] = useState(false);
  const [packageExpiryDate, setPackageExpiryDate] = useState<string>('2025-11-30'); // From backend
  const [targetLanguage, setTargetLanguage] = useState<SupportedLanguage>('bengali');
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      senderType: 'doctor',
      message: 'Hello! How are you feeling today?',
      timestamp: '10:15 AM',
      read: true
    },
    {
      id: '2',
      senderType: 'patient',
      message: 'Much better doctor, thank you',
      timestamp: '10:18 AM',
      read: true
    }
  ]);
  const [newMessage, setNewMessage] = useState('');
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const doctorInfo: DoctorInfo = {
    name: 'Dr. Rajesh Sharma',
    specialization: 'Cardiologist',
    isOnline: true
  };

  // Simulate checking token validity
  useEffect(() => {
    // In production, validate token with backend
    // For demo, we'll show expired state for certain tokens
    if (chatToken === 'expired' || chatToken === 'old456abc') {
      setIsLinkExpired(true);
    }
    
    // Check if package is expired
    const packageExpiry = new Date(packageExpiryDate);
    const currentDate = new Date();
    if (currentDate > packageExpiry) {
      setPackageExpired(true);
    }
  }, [chatToken, packageExpiryDate]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
      if (mediaRecorderRef.current && isRecording) {
        mediaRecorderRef.current.stop();
      }
    };
  }, [isRecording]);

  const handleStartRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setAudioBlob(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);

      recordingIntervalRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);

      toast.success('Recording started...');
    } catch (error) {
      // Only show error if it's not a permission denial (expected behavior)
      if (error instanceof Error && error.name !== 'NotAllowedError') {
        toast.error('Could not access microphone');
      }
      // Silent log for debugging
      if (error instanceof Error && error.name === 'NotAllowedError') {

      } else {
        console.error('Error accessing microphone:', error);
      }
    }
  };

  const handleStopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
      toast.success('Recording saved!');
    }
  };

  const handleTranslate = async (messageId: string, text: string) => {
    // Find message
    const msgIndex = messages.findIndex(m => m.id === messageId);
    if (msgIndex === -1) return;

    // If already translated, do nothing
    if (messages[msgIndex].translatedMessage) return;

    // Set loading state
    setMessages(prev => prev.map(m => 
      m.id === messageId ? { ...m, isTranslating: true } : m
    ));

    try {
      // Use selected target language (auto-detect source from English)
      const translatedText = await translate(text, targetLanguage, 'english');
      
      if (translatedText === text) {
        toast.error('Translation failed - please try again');
        setMessages(prev => prev.map(m => 
          m.id === messageId ? { ...m, isTranslating: false } : m
        ));
        return;
      }
      
      setMessages(prev => prev.map(m => 
        m.id === messageId 
          ? { ...m, translatedMessage: translatedText, isTranslating: false }
          : m
      ));
      
      toast.success('Translated successfully');
    } catch (error) {
      console.error('Translation failed:', error);
      toast.error(`Translation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setMessages(prev => prev.map(m => 
        m.id === messageId ? { ...m, isTranslating: false } : m
      ));
    }
  };

  const handleCancelRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setRecordingTime(0);
      setAudioBlob(null);
      audioChunksRef.current = [];
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
      toast.info('Recording cancelled');
    }
  };

  const handlePlayVoice = (messageId: string, voiceUrl: string) => {
    if (playingVoiceId === messageId) {
      // Pause
      audioRef.current?.pause();
      setPlayingVoiceId(null);
    } else {
      // Play
      if (audioRef.current) {
        audioRef.current.pause();
      }
      audioRef.current = new Audio(voiceUrl);
      audioRef.current.play();
      setPlayingVoiceId(messageId);
      audioRef.current.onended = () => {
        setPlayingVoiceId(null);
      };
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSendMessage = () => {
    if (!newMessage.trim() && !uploadedImage && !audioBlob) return;

    const message: ChatMessage = {
      id: Date.now().toString(),
      senderType: 'patient',
      message: newMessage,
      imageUrl: uploadedImage || undefined,
      voiceUrl: audioBlob ? URL.createObjectURL(audioBlob) : undefined,
      voiceDuration: audioBlob ? recordingTime : undefined,
      timestamp: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      read: false
    };

    setMessages(prev => [...prev, message]);
    setNewMessage('');
    setUploadedImage(null);
    setAudioBlob(null);
    setRecordingTime(0);

    // Simulate doctor typing
    setTimeout(() => {
      setIsTyping(true);
      setTimeout(() => {
        setIsTyping(false);
        // Simulate doctor response
        const doctorResponse: ChatMessage = {
          id: (Date.now() + 1).toString(),
          senderType: 'doctor',
          message: 'Thank you for the update. Continue your medication as prescribed.',
          timestamp: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
          read: false
        };
        setMessages(prev => [...prev, doctorResponse]);
      }, 2000);
    }, 500);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Image size should be less than 5MB');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setUploadedImage(reader.result as string);
        toast.success('Image attached');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRequestNewChat = () => {
    // In production, send request to backend with current chatToken
    // Backend will validate: one expired link = one re-chat request
    // Patient can request unlimited times, but each old link can only be used once
    setHasRequestedNewChat(true);
    toast.success('Request sent to doctor! You will receive a new chat link soon.');
    
    // Log the token for backend tracking (in production)

  };

  // Expired Link View
  if (isLinkExpired) {
    return (
      <div className="min-h-screen bg-black text-white">
        {/* Header */}
        <div className="bg-zinc-900 border-b border-zinc-800 p-4">
          <div className="max-w-4xl mx-auto flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center">
              <span className="text-white text-lg">🩺</span>
            </div>
            <div>
              <h1 className="text-lg">HealQR</h1>
              <p className="text-xs text-gray-400">Secure Doctor-Patient Chat</p>
            </div>
          </div>
        </div>

        {/* Expired Content */}
        <div className="max-w-2xl mx-auto p-6">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-yellow-500/10 flex items-center justify-center mx-auto mb-4">
              <Clock className="w-8 h-8 text-yellow-500" />
            </div>
            <h2 className="text-2xl mb-3">Chat Session Expired</h2>
            <p className="text-gray-400 mb-6">
              This chat link expired for security reasons. Links are valid for 24 hours.
            </p>

            {packageExpired ? (
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-6 mb-6">
                <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-3" />
                <h3 className="text-red-400 text-lg mb-2">Service No Longer Available</h3>
                <p className="text-gray-400 text-sm mb-4">
                  {doctorInfo.name}'s chat service subscription expired on {new Date(packageExpiryDate).toLocaleDateString()}.
                  Re-chat requests are no longer available.
                </p>
                <p className="text-gray-400 text-sm">
                  Please contact the clinic directly for further consultation.
                </p>
              </div>
            ) : hasRequestedNewChat ? (
              <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-6 mb-6">
                <CheckCircle className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
                <h3 className="text-emerald-400 text-lg mb-2">Request Sent!</h3>
                <p className="text-gray-400 text-sm mb-4">
                  {doctorInfo.name} has been notified. You'll receive a new chat link via SMS/notification 
                  when the doctor approves your request.
                </p>
                <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3">
                  <p className="text-xs text-yellow-400">
                    📱 Please check your phone for SMS or notifications
                  </p>
                </div>
              </div>
            ) : (
              <>
                <div className="bg-indigo-500/10 border border-indigo-500/30 rounded-lg p-4 mb-6">
                  <h3 className="text-indigo-400 mb-2">Need to talk to {doctorInfo.name}?</h3>
                  <p className="text-sm text-gray-400 mb-3">
                    Click below to request a new chat session. The doctor will be notified 
                    and can send you a new secure chat link.
                  </p>
                  <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-2">
                    <p className="text-xs text-yellow-400">
                      💡 Keep this link! You can request anytime using this expired link (one request per link)
                    </p>
                  </div>
                </div>

                <Button
                  onClick={handleRequestNewChat}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white w-full sm:w-auto px-8"
                >
                  Request New Chat Session
                </Button>
              </>
            )}

            {/* Previous Chat History */}
            {messages.length > 0 && (
              <div className="mt-8 pt-8 border-t border-zinc-800">
                <h3 className="text-gray-400 mb-4 text-left">Previous Messages</h3>
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex ${msg.senderType === 'patient' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[70%] rounded-lg p-3 ${
                          msg.senderType === 'patient'
                            ? 'bg-zinc-700 text-gray-300'
                            : 'bg-zinc-800 text-gray-300'
                        }`}
                      >
                        {msg.imageUrl && (
                          <img
                            src={msg.imageUrl}
                            alt="Shared"
                            className="rounded-lg mb-2 max-w-full opacity-70"
                          />
                        )}
                        <p className="text-sm opacity-70">{msg.message}</p>
                        <p className="text-xs text-gray-500 mt-1">{msg.timestamp}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-gray-500 mt-4 text-center">
                  Read-only - Request new chat to continue conversation
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Active Chat View
  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      {/* Header */}
      <div className="bg-zinc-900 border-b border-zinc-800 p-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center">
                <span className="text-white text-lg">🩺</span>
              </div>
              <div>
                <h1 className="text-lg">HealQR</h1>
                <p className="text-xs text-gray-400">Secure Chat</p>
              </div>
            </div>
          </div>

          {/* Doctor Info */}
          <div className="bg-[#1a1f2e] border border-zinc-800 rounded-lg p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 rounded-full bg-indigo-500/20 flex items-center justify-center flex-shrink-0">
                <span className="text-indigo-400 text-xl">
                  {doctorInfo.name.charAt(0)}
                </span>
              </div>
              <div className="flex-1">
                <h2 className="text-white mb-1">{doctorInfo.name}</h2>
                <p className="text-sm text-gray-400">{doctorInfo.specialization}</p>
              </div>
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${doctorInfo.isOnline ? 'bg-emerald-500' : 'bg-gray-500'}`} />
                <span className="text-xs text-gray-400">
                  {doctorInfo.isOnline ? 'Online' : 'Offline'}
                </span>
              </div>
            </div>

            {/* Translation Language Selector */}
            <div className="flex items-center gap-2 pt-3 border-t border-zinc-800">
              <Languages className="w-4 h-4 text-gray-400" />
              <span className="text-xs text-gray-400">Translate to:</span>
              <select
                value={targetLanguage}
                onChange={(e) => setTargetLanguage(e.target.value as any)}
                className="flex-1 bg-zinc-800 border border-zinc-700 text-white text-sm rounded-lg px-2 py-1 focus:outline-none focus:border-emerald-500"
              >
                <option value="english">English</option>
                <option value="hindi">हिंदी (Hindi)</option>
                <option value="bengali">বাংলা (Bengali)</option>
                <option value="tamil">தமிழ் (Tamil)</option>
                <option value="telugu">తెలుగు (Telugu)</option>
                <option value="marathi">मराठी (Marathi)</option>
                <option value="gujarati">ગુજરાતી (Gujarati)</option>
                <option value="kannada">ಕನ್ನಡ (Kannada)</option>
                <option value="malayalam">മലയാളം (Malayalam)</option>
                <option value="punjabi">ਪੰਜਾਬੀ (Punjabi)</option>
                <option value="urdu">اردو (Urdu)</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Health Tip Card */}
      <div className="max-w-4xl w-full mx-auto px-4 pt-4">
        <DashboardPromoDisplay category="health-tip" placement="patient-chat" />
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 max-w-4xl w-full mx-auto">
        <div className="space-y-4">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.senderType === 'patient' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] sm:max-w-[70%] rounded-lg p-3 ${
                  msg.senderType === 'patient'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-zinc-800 text-white'
                }`}
              >
                {msg.imageUrl && (
                  <img
                    src={msg.imageUrl}
                    alt="Shared image"
                    className="rounded-lg mb-2 max-w-full cursor-pointer hover:opacity-90"
                    onClick={() => window.open(msg.imageUrl, '_blank')}
                  />
                )}
                {msg.voiceUrl && (
                  <div className="flex items-center gap-3 bg-black/20 rounded-lg p-2 mb-2">
                    <button
                      onClick={() => handlePlayVoice(msg.id, msg.voiceUrl!)}
                      className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30 transition-colors"
                    >
                      {playingVoiceId === msg.id ? (
                        <Pause className="w-4 h-4" />
                      ) : (
                        <Play className="w-4 h-4" />
                      )}
                    </button>
                    <div className="flex-1">
                      <div className="h-1 bg-white/20 rounded-full" />
                    </div>
                    <span className="text-xs">
                      {formatTime(msg.voiceDuration || 0)}
                    </span>
                  </div>
                )}
                {msg.message && (
                  <div>
                    <p className="text-sm whitespace-pre-wrap break-words">{msg.message}</p>
                    
                    {/* Translation Button (Only for doctor messages) - Always Visible & Mobile-Friendly */}
                    {msg.senderType === 'doctor' && !msg.translatedMessage && (
                      <button
                        onClick={() => handleTranslate(msg.id, msg.message)}
                        disabled={msg.isTranslating}
                        className="mt-2 flex items-center gap-2 px-3 py-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/50 rounded-lg transition-colors"
                      >
                        {msg.isTranslating ? (
                          <>
                            <div className="w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                            <span className="text-xs text-emerald-400">Translating...</span>
                          </>
                        ) : (
                          <>
                            <Languages className="w-4 h-4 text-emerald-400" />
                            <span className="text-xs text-emerald-400 font-medium">
                              Translate
                            </span>
                          </>
                        )}
                      </button>
                    )}

                    {/* Translated Text with Status Badge */}
                    {msg.translatedMessage && (
                      <div className="mt-3 p-3 bg-gradient-to-r from-emerald-500/10 to-blue-500/10 border border-emerald-500/30 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="px-2 py-0.5 bg-emerald-500 rounded text-[10px] text-white font-bold">
                            TRANSLATED
                          </div>
                          <span className="text-[10px] text-gray-400">
                            English → {targetLanguage === 'bengali' ? 'বাংলা' : targetLanguage === 'hindi' ? 'हिंदी' : 'English'}
                          </span>
                        </div>
                        <p className="text-sm text-white whitespace-pre-wrap break-words leading-relaxed">
                          {msg.translatedMessage}
                        </p>
                      </div>
                    )}
                  </div>
                )}
                <p
                  className={`text-xs mt-1 ${
                    msg.senderType === 'patient' ? 'text-indigo-200' : 'text-gray-400'
                  }`}
                >
                  {msg.timestamp}
                </p>
              </div>
            </div>
          ))}

          {isTyping && (
            <div className="flex justify-start">
              <div className="bg-zinc-800 rounded-lg px-4 py-3">
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Area */}
      <div className="border-t border-zinc-800 bg-zinc-900 p-4">
        <div className="max-w-4xl mx-auto">
          {/* Security Notice */}
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3 mb-4">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-yellow-400 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-yellow-400">
                🔒 This chat is secure and private. Link expires in 24 hours. You can request a new chat 
                session anytime after expiry.
              </p>
            </div>
          </div>

          {uploadedImage && (
            <div className="mb-3 relative inline-block">
              <img
                src={uploadedImage}
                alt="Upload preview"
                className="h-24 rounded-lg border border-zinc-700"
              />
              <button
                onClick={() => setUploadedImage(null)}
                className="absolute -top-2 -right-2 bg-red-500 rounded-full p-1 hover:bg-red-600 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {audioBlob && (
            <div className="mb-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-3">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => handlePlayVoice('preview', URL.createObjectURL(audioBlob))}
                  className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center hover:bg-emerald-500/30 transition-colors"
                >
                  {playingVoiceId === 'preview' ? (
                    <Pause className="w-5 h-5 text-emerald-400" />
                  ) : (
                    <Play className="w-5 h-5 text-emerald-400" />
                  )}
                </button>
                <div className="flex-1">
                  <p className="text-sm text-emerald-400 mb-1">Voice message ready</p>
                  <div className="h-1 bg-emerald-500/20 rounded-full" />
                </div>
                <span className="text-sm text-emerald-400">{formatTime(recordingTime)}</span>
                <button
                  onClick={() => {
                    setAudioBlob(null);
                    setRecordingTime(0);
                  }}
                  className="text-red-400 hover:text-red-300"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}

          {isRecording && (
            <div className="mb-3 bg-red-500/10 border border-red-500/30 rounded-lg p-3">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                <span className="text-red-400 text-sm flex-1">Recording... {formatTime(recordingTime)}</span>
                <Button
                  onClick={handleCancelRecording}
                  size="sm"
                  variant="outline"
                  className="border-gray-600 text-gray-400 hover:bg-gray-800"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleStopRecording}
                  size="sm"
                  className="bg-red-500 hover:bg-red-600"
                >
                  <CheckCircle className="w-4 h-4 mr-1" />
                  Done
                </Button>
              </div>
            </div>
          )}

          <div className="flex items-end gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
            />
            <Button
              onClick={() => fileInputRef.current?.click()}
              size="sm"
              variant="outline"
              className="border-gray-600 text-gray-400 hover:bg-gray-800 flex-shrink-0"
              title="Attach image"
              disabled={isRecording}
            >
              <Paperclip className="w-5 h-5" />
            </Button>
            <Button
              onClick={isRecording ? handleStopRecording : handleStartRecording}
              size="sm"
              variant="outline"
              className={`border-gray-600 flex-shrink-0 ${
                isRecording 
                  ? 'bg-red-500/20 text-red-400 border-red-500/50' 
                  : 'text-gray-400 hover:bg-gray-800'
              }`}
              title="Voice message"
            >
              <Mic className="w-5 h-5" />
            </Button>
            <Textarea
              placeholder="Type your message..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              className="bg-[#1a1f2e] border-gray-700 text-white resize-none"
              rows={2}
              disabled={isRecording}
            />
            <Button
              onClick={handleSendMessage}
              disabled={(!newMessage.trim() && !uploadedImage && !audioBlob) || isRecording}
              className="bg-indigo-600 hover:bg-indigo-700 flex-shrink-0"
            >
              <Send className="w-5 h-5" />
            </Button>
          </div>

          <p className="text-xs text-gray-500 mt-2 text-center">
            Press Enter to send • Shift + Enter for new line
          </p>
        </div>
      </div>
    </div>
  );
}
