import { MessageSquare, Check, Send, Users, Clock, Menu, ChevronLeft, Image, X, AlertCircle, ExternalLink, Copy, CheckCircle, Bell, Upload, Paperclip, ChevronDown, Search, Plus, Mic, Play, Pause, Calendar } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { useState, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { Textarea } from './ui/textarea';
import { Checkbox } from './ui/checkbox';
import DashboardSidebar from './DashboardSidebar';

interface DoctorPatientChatManagerProps {
  isActive?: boolean;
  onUpgrade?: () => void;
  onBack?: () => void;
  onOpenMobileSidebar?: () => void;
  // Dashboard integration props
  doctorName?: string;
  email?: string;
  onLogout?: () => void;
  onMenuChange?: (menu: string) => void;
  activeAddOns?: string[];
}

interface ChatMessage {
  id: string;
  senderId: string;
  senderType: 'doctor' | 'patient';
  message: string;
  imageUrl?: string;
  voiceUrl?: string;
  voiceDuration?: number;
  timestamp: string;
  read: boolean;
}

interface ChatConversation {
  patientId: string;
  patientName: string;
  patientPhone: string;
  lastMessage: string;
  lastMessageTime: string;
  lastMessageDate: Date;
  unreadCount: number;
  chatToken: string;
  tokenExpiry: string;
  isExpired: boolean;
  requestingNewChat: boolean;
  packageExpiryDate: string; // Service expiry date - re-chat link valid until this date
  messages: ChatMessage[];
}

export default function DoctorPatientChatManager({
  isActive: isActiveProp,
  onUpgrade,
  onBack,
  onOpenMobileSidebar,
  doctorName,
  email,
  onLogout,
  onMenuChange,
  activeAddOns = []
}: DoctorPatientChatManagerProps = {}) {
  // Check if this addon is active based on activeAddOns array
  const isActive = isActiveProp !== undefined 
    ? isActiveProp 
    : activeAddOns.includes('doctor-patient-chat');
  const [conversations, setConversations] = useState<ChatConversation[]>([]);

  const [selectedConversation, setSelectedConversation] = useState<ChatConversation | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [showChatLinkModal, setShowChatLinkModal] = useState(false);
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [generatedLink, setGeneratedLink] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'week' | 'month' | 'custom'>('all');
  const [customDateFrom, setCustomDateFrom] = useState('');
  const [customDateTo, setCustomDateTo] = useState('');
  const [newPatientName, setNewPatientName] = useState('');
  const [newPatientPhone, setNewPatientPhone] = useState('');
  const [patientSearchTerm, setPatientSearchTerm] = useState('');
  const [customMessage, setCustomMessage] = useState('');
  const [selectedPatientForNewChat, setSelectedPatientForNewChat] = useState<string | null>(null);
  
  // Voice recording states
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

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [selectedConversation?.messages]);

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

  const handleGenerateChatLink = (conversation: ChatConversation) => {
    // Generate unique token (in production, this would be from backend)
    const token = Math.random().toString(36).substring(7);
    const link = `${window.location.origin}/chat/${token}`;
    
    setGeneratedLink(link);
    setShowChatLinkModal(true);

    // Update conversation with new token
    setConversations(prev => 
      prev.map(conv => 
        conv.patientId === conversation.patientId
          ? { 
              ...conv, 
              chatToken: token,
              tokenExpiry: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
              isExpired: false,
              requestingNewChat: false
            }
          : conv
      )
    );

    toast.success(`Chat link generated for ${conversation.patientName}`);
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(generatedLink);
    toast.success('Link copied to clipboard!');
  };

  const handleSendNotification = () => {
    // In production, this would trigger backend notification/SMS
    const fullMessage = customMessage 
      ? `${customMessage}\n\nChat Link: ${generatedLink}`
      : `Your doctor wants to chat with you.\n\nChat Link: ${generatedLink}`;
    
    toast.success('Notification sent to patient with chat link!');
    setShowChatLinkModal(false);
    setCustomMessage('');
  };

  const handleAcceptChatRequest = (conversation: ChatConversation) => {
    handleGenerateChatLink(conversation);
    toast.success('New chat link generated and sent to patient!');
  };

  // Patient database - in production, fetch from backend (past appointments)
  const allPatients: Array<{ id: string; name: string; phone: string }> = [];

  const filteredPatients = allPatients.filter(p =>
    p.name.toLowerCase().includes(patientSearchTerm.toLowerCase()) ||
    p.phone.includes(patientSearchTerm)
  );

  const handleSelectPatient = (patient: typeof allPatients[0]) => {
    setNewPatientName(patient.name);
    setNewPatientPhone(patient.phone);
    setPatientSearchTerm('');
  };

  const handleCheckboxClick = (conversation: ChatConversation, e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation();
    if (e.target.checked) {
      // Open new chat modal with pre-filled data
      setNewPatientName(conversation.patientName);
      setNewPatientPhone(conversation.patientPhone);
      setShowNewChatModal(true);
      setSelectedPatientForNewChat(conversation.patientId);
    } else {
      setSelectedPatientForNewChat(null);
    }
  };

  const handleCreateNewChat = () => {
    if (!newPatientName.trim() || !newPatientPhone.trim()) {
      toast.error('Please enter patient name and phone number');
      return;
    }

    // Calculate package expiry (in production, fetch from doctor's subscription)
    // For demo: package expires Nov 30, 2025
    const packageExpiry = new Date('2025-11-30T23:59:59');
    
    const newConversation: ChatConversation = {
      patientId: Date.now().toString(),
      patientName: newPatientName,
      patientPhone: newPatientPhone,
      lastMessage: 'New conversation',
      lastMessageTime: 'Just now',
      lastMessageDate: new Date(),
      unreadCount: 0,
      chatToken: Math.random().toString(36).substring(7),
      tokenExpiry: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24hr chat validity
      isExpired: false,
      requestingNewChat: false,
      packageExpiryDate: packageExpiry.toISOString(), // Re-chat link valid until package expires
      messages: []
    };

    setConversations(prev => [newConversation, ...prev]);
    setNewPatientName('');
    setNewPatientPhone('');
    setPatientSearchTerm('');
    setShowNewChatModal(false);
    setSelectedPatientForNewChat(null);
    
    // Auto-generate link
    const link = `${window.location.origin}/chat/${newConversation.chatToken}`;
    setGeneratedLink(link);
    setShowChatLinkModal(true);
    
    toast.success(`Chat created for ${newPatientName}`);
  };

  const handleSendMessage = () => {
    if (!newMessage.trim() && !uploadedImage && !audioBlob) return;
    if (!selectedConversation) return;

    const message: ChatMessage = {
      id: Date.now().toString(),
      senderId: 'doctor',
      senderType: 'doctor',
      message: newMessage,
      imageUrl: uploadedImage || undefined,
      voiceUrl: audioBlob ? URL.createObjectURL(audioBlob) : undefined,
      voiceDuration: audioBlob ? recordingTime : undefined,
      timestamp: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      read: false
    };

    setConversations(prev =>
      prev.map(conv =>
        conv.patientId === selectedConversation.patientId
          ? {
              ...conv,
              messages: [...conv.messages, message],
              lastMessage: newMessage || (audioBlob ? '🎤 Voice message' : '📷 Image'),
              lastMessageTime: 'Just now',
              lastMessageDate: new Date()
            }
          : conv
      )
    );

    setSelectedConversation(prev => 
      prev ? { ...prev, messages: [...prev.messages, message] } : null
    );

    setNewMessage('');
    setUploadedImage(null);
    setAudioBlob(null);
    setRecordingTime(0);
    toast.success('Message sent!');
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setUploadedImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const filterConversationsByDate = (conversations: ChatConversation[]) => {
    const now = new Date();
    
    switch (dateFilter) {
      case 'today':
        return conversations.filter(c => {
          const msgDate = new Date(c.lastMessageDate);
          return msgDate.toDateString() === now.toDateString();
        });
      case 'week':
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        return conversations.filter(c => new Date(c.lastMessageDate) >= weekAgo);
      case 'month':
        const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        return conversations.filter(c => new Date(c.lastMessageDate) >= monthAgo);
      case 'custom':
        if (!customDateFrom || !customDateTo) return conversations;
        const from = new Date(customDateFrom);
        const to = new Date(customDateTo);
        return conversations.filter(c => {
          const msgDate = new Date(c.lastMessageDate);
          return msgDate >= from && msgDate <= to;
        });
      default:
        return conversations;
    }
  };

  const filteredConversations = filterConversationsByDate(
    conversations.filter(conv =>
      conv.patientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      conv.patientPhone.includes(searchTerm)
    )
  );

  const activeChatsCount = conversations.filter(c => !c.isExpired).length;
  const totalUnread = conversations.reduce((sum, c) => sum + c.unreadCount, 0);
  const pendingRequests = conversations.filter(c => c.requestingNewChat).length;

  // If called from dashboard, use premium layout
  if (onMenuChange) {
    return (
      <div
        featureId="doctor-patient-chat"
        featureName="Doctor-Patient Chat"
        featureDescription="Web-based secure messaging for patient follow-up care. Generate chat links, share files, voice messages, and communicate seamlessly without requiring patients to install any app."
        featureIcon={MessageSquare}
        monthlyPrice={299}
        yearlyPrice={2999}
        features={[
          'Web-based chat links',
          'Photo/file sharing',
          'Patient can request chat',
          'Voice messages',
          'No patient app needed',
          'Date-based search'
        ]}
        activeAddOns={activeAddOns}
        onMenuChange={onMenuChange}
        onLogout={onLogout}
      >
        {renderContent()}
      </div>
    );
  }

  // Standalone mode - always show working feature
  return renderContent();

  function renderContent() {
    return (
      <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <div className="flex items-center gap-3 sm:gap-4 w-full sm:w-auto">
          {onOpenMobileSidebar && (
            <button
              onClick={onOpenMobileSidebar}
              className="lg:hidden w-10 h-10 bg-zinc-900 hover:bg-zinc-800 rounded-lg flex items-center justify-center transition-colors flex-shrink-0"
            >
              <Menu className="w-5 h-5 text-emerald-500" />
            </button>
          )}
          {onBack && (
            <button
              onClick={onBack}
              className="text-white hover:bg-white/10 rounded-full p-2 transition-colors flex-shrink-0"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <MessageSquare className="w-5 h-5 text-indigo-500 flex-shrink-0" />
              <h2 className="text-base sm:text-xl truncate">Doctor-Patient Chat</h2>
              <span className="bg-indigo-500 text-white text-xs px-2 py-0.5 rounded-full flex-shrink-0">
                Active
              </span>
            </div>
            <p className="text-xs sm:text-sm text-gray-400 hidden sm:block">
              Secure web-based messaging with your patients
            </p>
          </div>
        </div>
        <Button
          onClick={() => setShowNewChatModal(true)}
          className="bg-emerald-600 hover:bg-emerald-700 text-white w-full sm:w-auto flex-shrink-0"
        >
          <Plus className="w-4 h-4 mr-2" />
          <span className="hidden sm:inline">New Chat</span>
          <span className="sm:hidden">New Chat</span>
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
          <div className="text-gray-400 text-sm mb-1">Active Chats</div>
          <div className="text-2xl">{activeChatsCount}</div>
          <div className="text-xs text-emerald-500 mt-1">Links valid for 24h</div>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
          <div className="text-gray-400 text-sm mb-1">Unread Messages</div>
          <div className="text-2xl text-indigo-500">{totalUnread}</div>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
          <div className="text-gray-400 text-sm mb-1">Chat Requests</div>
          <div className="text-2xl text-yellow-500">{pendingRequests}</div>
          <div className="text-xs text-yellow-500 mt-1">Patients waiting</div>
        </div>
      </div>

      {/* Chat Interface */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-3 h-[600px]">
          {/* Conversation List */}
          <div className="border-r border-zinc-800 flex flex-col">
            {/* Search & Filters */}
            <div className="p-4 border-b border-zinc-800 space-y-3">
              {/* Quick tip */}
              <div className="bg-indigo-500/10 border border-indigo-500/30 rounded-lg p-2">
                <p className="text-xs text-indigo-400">
                  💡 Check box ☑ = Auto-fill chat details
                </p>
              </div>
              
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  type="text"
                  placeholder="Search patients..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="bg-[#1a1f2e] border-gray-700 text-white pl-10"
                />
              </div>

              {/* Date Filter */}
              <div className="flex gap-2">
                <select
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value as any)}
                  className="flex-1 bg-[#1a1f2e] border border-gray-700 text-white rounded-lg px-3 py-2 text-sm"
                >
                  <option value="all">All Time</option>
                  <option value="today">Today</option>
                  <option value="week">Last 7 Days</option>
                  <option value="month">Last 30 Days</option>
                  <option value="custom">Custom Range</option>
                </select>
              </div>

              {dateFilter === 'custom' && (
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    type="date"
                    value={customDateFrom}
                    onChange={(e) => setCustomDateFrom(e.target.value)}
                    className="bg-[#1a1f2e] border-gray-700 text-white text-sm"
                  />
                  <Input
                    type="date"
                    value={customDateTo}
                    onChange={(e) => setCustomDateTo(e.target.value)}
                    className="bg-[#1a1f2e] border-gray-700 text-white text-sm"
                  />
                </div>
              )}
            </div>

            {/* Conversation List */}
            <div className="flex-1 overflow-y-auto">
              {filteredConversations.length === 0 ? (
                <div className="p-8 text-center text-gray-400">
                  <MessageSquare className="w-12 h-12 mx-auto mb-3 text-gray-600" />
                  <p className="text-sm">No conversations found</p>
                  <p className="text-xs mt-1">Click "New Chat" to start</p>
                </div>
              ) : (
                filteredConversations.map((conv) => (
                  <div
                    key={conv.patientId}
                    className={`w-full border-b border-zinc-800 hover:bg-zinc-800/50 transition-colors ${
                      selectedConversation?.patientId === conv.patientId ? 'bg-zinc-800' : ''
                    }`}
                  >
                    <div className="flex items-start gap-3 p-4">
                      {/* Checkbox */}
                      <div className="flex items-center pt-2">
                        <Checkbox
                          checked={selectedPatientForNewChat === conv.patientId}
                          onCheckedChange={(checked) => {
                            const e = {
                              target: { checked: checked as boolean },
                              stopPropagation: () => {}
                            } as React.ChangeEvent<HTMLInputElement>;
                            handleCheckboxClick(conv, e);
                          }}
                          className="border-gray-600 data-[state=checked]:bg-indigo-600 data-[state=checked]:border-indigo-600"
                          onClick={(e) => e.stopPropagation()}
                        />
                      </div>

                      {/* Patient Info - Clickable */}
                      <button
                        onClick={() => setSelectedConversation(conv)}
                        className="flex items-start gap-3 flex-1 text-left"
                      >
                        <div className="w-10 h-10 rounded-full bg-indigo-500/20 flex items-center justify-center flex-shrink-0">
                          <span className="text-indigo-400 text-sm">
                            {conv.patientName.charAt(0)}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <h4 className="text-white text-sm truncate">{conv.patientName}</h4>
                            <span className="text-xs text-gray-400 flex-shrink-0 ml-2">
                              {conv.lastMessageTime}
                            </span>
                          </div>
                          <p className="text-xs text-gray-400 truncate mb-1">{conv.lastMessage}</p>
                          <div className="flex items-center gap-2 flex-wrap">
                            {conv.requestingNewChat && (
                              <div
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const link = `${window.location.origin}/chat/${Math.random().toString(36).substring(7)}`;
                                  setGeneratedLink(link);
                                  setShowChatLinkModal(true);
                                  toast.success(`New 24hr chat link generated for ${conv.patientName}!`);
                                }}
                                className="bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-400 text-xs px-2 py-0.5 rounded flex items-center gap-1 cursor-pointer transition-colors border border-yellow-500/40"
                              >
                                <Bell className="w-3 h-3" />
                                Requesting chat - Click to generate link
                              </div>
                            )}
                            {conv.isExpired && !conv.requestingNewChat && (
                              <span className="bg-red-500/20 text-red-400 text-xs px-2 py-0.5 rounded">
                                Link expired
                              </span>
                            )}
                            {!conv.isExpired && (
                              <span className="bg-emerald-500/20 text-emerald-400 text-xs px-2 py-0.5 rounded">
                                Active
                              </span>
                            )}
                            {conv.unreadCount > 0 && (
                              <span className="bg-indigo-500 text-white text-xs px-2 py-0.5 rounded-full">
                                {conv.unreadCount}
                              </span>
                            )}
                          </div>
                        </div>
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Chat Window */}
          <div className="lg:col-span-2 flex flex-col">
            {selectedConversation ? (
              <>
                {/* Chat Header */}
                <div className="p-4 border-b border-zinc-800 bg-[#1a1f2e]">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-white mb-1">{selectedConversation.patientName}</h3>
                      <p className="text-xs text-gray-400">{selectedConversation.patientPhone}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {selectedConversation.requestingNewChat && (
                        <Button
                          onClick={() => handleAcceptChatRequest(selectedConversation)}
                          size="sm"
                          className="bg-yellow-500 hover:bg-yellow-600 text-white"
                        >
                          <CheckCircle className="w-4 h-4 mr-1" />
                          Accept Request
                        </Button>
                      )}
                      <Button
                        onClick={() => handleGenerateChatLink(selectedConversation)}
                        size="sm"
                        variant="outline"
                        className="border-indigo-500 text-indigo-400 hover:bg-indigo-500/10"
                      >
                        <ExternalLink className="w-4 h-4 mr-1" />
                        {selectedConversation.isExpired ? 'Generate New Link' : 'Share Link'}
                      </Button>
                    </div>
                  </div>
                  {selectedConversation.isExpired && !selectedConversation.requestingNewChat && (
                    <div className="mt-3 bg-red-500/10 border border-red-500/30 rounded-lg p-2">
                      <p className="text-xs text-red-400">
                        ⚠️ Chat link expired. Generate new link to continue conversation.
                      </p>
                    </div>
                  )}
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-black">
                  {selectedConversation.messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex ${msg.senderType === 'doctor' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[70%] rounded-lg p-3 ${
                          msg.senderType === 'doctor'
                            ? 'bg-indigo-600 text-white'
                            : 'bg-zinc-800 text-white'
                        }`}
                      >
                        {msg.imageUrl && (
                          <img
                            src={msg.imageUrl}
                            alt="Shared image"
                            className="rounded-lg mb-2 max-w-full"
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
                        {msg.message && <p className="text-sm whitespace-pre-wrap">{msg.message}</p>}
                        <p
                          className={`text-xs mt-1 ${
                            msg.senderType === 'doctor' ? 'text-indigo-200' : 'text-gray-400'
                          }`}
                        >
                          {msg.timestamp}
                        </p>
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>

                {/* Message Input */}
                <div className="p-4 border-t border-zinc-800 bg-[#1a1f2e]">
                  {uploadedImage && (
                    <div className="mb-3 relative inline-block">
                      <img
                        src={uploadedImage}
                        alt="Upload preview"
                        className="h-20 rounded-lg border border-zinc-700"
                      />
                      <button
                        onClick={() => setUploadedImage(null)}
                        className="absolute -top-2 -right-2 bg-red-500 rounded-full p-1 hover:bg-red-600"
                      >
                        <X className="w-3 h-3" />
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
                      disabled={isRecording}
                    >
                      <Paperclip className="w-4 h-4" />
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
                    >
                      <Mic className="w-4 h-4" />
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
                      className="bg-black border-gray-700 text-white resize-none"
                      rows={2}
                      disabled={isRecording}
                    />
                    <Button
                      onClick={handleSendMessage}
                      disabled={(!newMessage.trim() && !uploadedImage && !audioBlob) || isRecording}
                      className="bg-indigo-600 hover:bg-indigo-700 flex-shrink-0"
                    >
                      <Send className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-400">
                <div className="text-center">
                  <MessageSquare className="w-16 h-16 mx-auto mb-4 text-gray-600" />
                  <p>Select a conversation to start chatting</p>
                  <p className="text-sm mt-2">or click "New Chat" to create one</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* New Chat Modal */}
      {showNewChatModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <h3 className="text-xl text-white">Create New Chat</h3>
                {selectedPatientForNewChat && (
                  <span className="bg-emerald-500/20 text-emerald-400 text-xs px-2 py-1 rounded-full">
                    Auto-filled
                  </span>
                )}
              </div>
              <button
                onClick={() => {
                  setShowNewChatModal(false);
                  setPatientSearchTerm('');
                  setNewPatientName('');
                  setNewPatientPhone('');
                  setSelectedPatientForNewChat(null);
                }}
                className="text-gray-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Patient Search */}
              <div>
                <Label htmlFor="patientSearch" className="text-white mb-2 block">
                  Search Existing Patient
                </Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    id="patientSearch"
                    type="text"
                    placeholder="Search by name or phone..."
                    value={patientSearchTerm}
                    onChange={(e) => setPatientSearchTerm(e.target.value)}
                    className="bg-[#1a1f2e] border-gray-700 text-white pl-10"
                  />
                </div>
                
                {/* Patient Search Results */}
                {patientSearchTerm && (
                  <div className="mt-2 bg-black border border-zinc-700 rounded-lg max-h-48 overflow-y-auto">
                    {filteredPatients.length > 0 ? (
                      filteredPatients.map((patient) => (
                        <button
                          key={patient.id}
                          onClick={() => handleSelectPatient(patient)}
                          className="w-full p-3 text-left hover:bg-zinc-800 transition-colors border-b border-zinc-800 last:border-0"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center flex-shrink-0">
                              <span className="text-indigo-400 text-xs">
                                {patient.name.charAt(0)}
                              </span>
                            </div>
                            <div className="flex-1">
                              <p className="text-white text-sm">{patient.name}</p>
                              <p className="text-gray-400 text-xs">{patient.phone}</p>
                            </div>
                            <CheckCircle className="w-5 h-5 text-gray-600" />
                          </div>
                        </button>
                      ))
                    ) : (
                      <div className="p-4 text-center text-gray-400 text-sm">
                        No patients found
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Divider */}
              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-zinc-700" />
                <span className="text-xs text-gray-500">OR ENTER MANUALLY</span>
                <div className="flex-1 h-px bg-zinc-700" />
              </div>

              {/* Manual Entry */}
              <div>
                <Label htmlFor="patientName" className="text-white mb-2 block">
                  Patient Name
                </Label>
                <Input
                  id="patientName"
                  type="text"
                  placeholder="Enter patient name"
                  value={newPatientName}
                  onChange={(e) => setNewPatientName(e.target.value)}
                  className="bg-[#1a1f2e] border-gray-700 text-white"
                />
              </div>

              <div>
                <Label htmlFor="patientPhone" className="text-white mb-2 block">
                  Patient Phone
                </Label>
                <Input
                  id="patientPhone"
                  type="tel"
                  placeholder="+91-9876543210"
                  value={newPatientPhone}
                  onChange={(e) => setNewPatientPhone(e.target.value)}
                  className="bg-[#1a1f2e] border-gray-700 text-white"
                />
              </div>

              <div className="bg-indigo-500/10 border border-indigo-500/30 rounded-lg p-3">
                <p className="text-xs text-indigo-400">
                  💡 A secure chat link will be generated automatically. You can add a custom message and share it via notification.
                </p>
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={() => {
                    setShowNewChatModal(false);
                    setPatientSearchTerm('');
                    setNewPatientName('');
                    setNewPatientPhone('');
                    setSelectedPatientForNewChat(null);
                  }}
                  variant="outline"
                  className="flex-1 border-gray-600 text-gray-400 hover:bg-gray-800"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleCreateNewChat}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                >
                  Create Chat
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Chat Link Modal */}
      {showChatLinkModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 max-w-md w-full">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl text-white">Chat Link Generated</h3>
              <button
                onClick={() => {
                  setShowChatLinkModal(false);
                  setCustomMessage('');
                }}
                className="text-gray-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-4">
                <p className="text-sm text-emerald-400 mb-3">
                  ✓ Secure chat link created! Share this with your patient.
                </p>
                <div className="bg-black rounded-lg p-3 break-all text-sm text-gray-300 border border-gray-700">
                  {generatedLink}
                </div>
              </div>

              {/* Custom Message Field */}
              <div>
                <Label htmlFor="customMessage" className="text-white mb-2 block">
                  Add Custom Message (Optional)
                </Label>
                <Textarea
                  id="customMessage"
                  placeholder="e.g., Please send your latest reports"
                  value={customMessage}
                  onChange={(e) => setCustomMessage(e.target.value)}
                  className="bg-[#1a1f2e] border-gray-700 text-white resize-none"
                  rows={2}
                  maxLength={150}
                />
                <p className="text-xs text-gray-500 mt-1">
                  {customMessage.length}/150 characters
                </p>
              </div>

              {/* Preview */}
              {customMessage && (
                <div className="bg-black border border-zinc-700 rounded-lg p-3">
                  <p className="text-xs text-gray-400 mb-2">Message Preview:</p>
                  <p className="text-sm text-white mb-2">{customMessage}</p>
                  <p className="text-xs text-gray-400 break-all">
                    Chat Link: {generatedLink}
                  </p>
                </div>
              )}

              <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3">
                <p className="text-xs text-yellow-400">
                  ⏰ Link expires in 24 hours. Patient can request new link after expiry.
                </p>
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={handleCopyLink}
                  variant="outline"
                  className="flex-1 border-indigo-500 text-indigo-400 hover:bg-indigo-500/10"
                >
                  <Copy className="w-4 h-4 mr-2" />
                  Copy Link
                </Button>
                <Button
                  onClick={handleSendNotification}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700"
                >
                  <Send className="w-4 h-4 mr-2" />
                  Send Notification
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Info Banner */}
      <div className="bg-indigo-500/10 border border-indigo-500/30 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-indigo-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h4 className="text-indigo-400 mb-1">How It Works</h4>
            <ul className="text-sm text-gray-400 space-y-1">
              <li>• Click "New Chat" to create chat link for any patient</li>
              <li>• Use date filters to find old patient conversations</li>
              <li>• Links expire in 24 hours for security</li>
              <li>• Patients can request new chat - you'll get notification</li>
              <li>• Share photos, voice messages, and text securely</li>
              <li>• All chat history is preserved and searchable</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
    );
  }
}

