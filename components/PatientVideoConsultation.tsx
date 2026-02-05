import { useState, useEffect } from 'react';
import { Video, Mic, MicOff, VideoOff, PhoneOff, MonitorUp, Settings, User, Clock, AlertCircle, CheckCircle, Calendar } from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';

interface PatientVideoConsultationProps {
  meetingId?: string;
  doctorName?: string;
  doctorSpecialization?: string;
  scheduledDate?: string;
  scheduledTime?: string;
  patientName?: string;
  bookingId?: string;
}

export default function PatientVideoConsultation({
  meetingId = 'abc-xyz-123',
  doctorName = 'Dr. Ankita Sharma',
  doctorSpecialization = 'Cardiologist',
  scheduledDate = 'November 15, 2025',
  scheduledTime = '10:00 AM',
  patientName = 'Rahul Kumar',
  bookingId = 'V7-001'
}: PatientVideoConsultationProps) {
  const [callStatus, setCallStatus] = useState<'waiting' | 'connecting' | 'connected' | 'ended'>('waiting');
  const [isMicOn, setIsMicOn] = useState(true);
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [callDuration, setCallDuration] = useState(0);

  // Timer for call duration
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (callStatus === 'connected') {
      interval = setInterval(() => {
        setCallDuration(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [callStatus]);

  // Format duration
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Handle join call
  const handleJoinCall = () => {
    setCallStatus('connecting');
    setTimeout(() => {
      setCallStatus('connected');
    }, 2000);
  };

  // Handle end call
  const handleEndCall = () => {
    setCallStatus('ended');
  };

  // Waiting Room
  if (callStatus === 'waiting') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0a0f1a] via-[#1a1f2e] to-[#0a0f1a] text-white flex items-center justify-center p-4">
        <div className="max-w-2xl w-full">
          <div className="bg-white rounded-3xl overflow-hidden shadow-2xl">
            {/* Header */}
            <div className="bg-gradient-to-r from-red-500 to-orange-500 p-6 text-center">
              <div className="w-20 h-20 rounded-full bg-white flex items-center justify-center mx-auto mb-4">
                <Video className="w-10 h-10 text-red-500" />
              </div>
              <h1 className="text-white text-2xl mb-2">Video Consultation</h1>
              <p className="text-white/90">You're about to join your appointment</p>
            </div>

            {/* Content */}
            <div className="p-8">
              {/* Doctor Info */}
              <div className="flex items-center gap-4 mb-6 pb-6 border-b border-gray-200">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center flex-shrink-0">
                  <span className="text-white text-xl font-semibold">
                    {doctorName.split(' ')[1]?.charAt(0) || 'A'}S
                  </span>
                </div>
                <div className="flex-1">
                  <h2 className="text-gray-900 text-xl font-semibold">{doctorName}</h2>
                  <p className="text-gray-600">{doctorSpecialization}</p>
                  <Badge variant="outline" className="border-green-500 text-green-500 mt-2">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Verified Doctor
                  </Badge>
                </div>
              </div>

              {/* Appointment Details */}
              <div className="bg-gray-50 rounded-xl p-6 mb-6">
                <h3 className="text-gray-900 font-semibold mb-4">Appointment Details</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-500 mb-1">Patient Name</p>
                    <p className="text-gray-900 font-medium">{patientName}</p>
                  </div>
                  <div>
                    <p className="text-gray-500 mb-1">Booking ID</p>
                    <p className="text-gray-900 font-medium">{bookingId}</p>
                  </div>
                  <div>
                    <p className="text-gray-500 mb-1">
                      <Calendar className="w-4 h-4 inline mr-1" />
                      Date
                    </p>
                    <p className="text-gray-900 font-medium">{scheduledDate}</p>
                  </div>
                  <div>
                    <p className="text-gray-500 mb-1">
                      <Clock className="w-4 h-4 inline mr-1" />
                      Time
                    </p>
                    <p className="text-gray-900 font-medium">{scheduledTime}</p>
                  </div>
                </div>
              </div>

              {/* Device Check */}
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 mb-6">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <h3 className="text-blue-900 font-semibold mb-2">Before You Join</h3>
                    <ul className="text-blue-800 text-sm space-y-2">
                      <li className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-blue-600" />
                        Check your camera and microphone are working
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-blue-600" />
                        Ensure you have a stable internet connection
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-blue-600" />
                        Find a quiet, well-lit space for the consultation
                      </li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Audio/Video Preview */}
              <div className="bg-black rounded-xl aspect-video mb-6 flex items-center justify-center relative overflow-hidden">
                {isVideoOn ? (
                  <div className="text-center">
                    <div className="w-32 h-32 rounded-full bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center mx-auto mb-4">
                      <User className="w-16 h-16 text-white" />
                    </div>
                    <p className="text-white">Camera Preview</p>
                    <p className="text-gray-400 text-sm">Your video is ready</p>
                  </div>
                ) : (
                  <div className="text-center">
                    <VideoOff className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                    <p className="text-gray-400">Camera is off</p>
                  </div>
                )}
                
                {/* Preview Controls */}
                <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-3">
                  <button
                    onClick={() => setIsMicOn(!isMicOn)}
                    className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${
                      isMicOn ? 'bg-gray-800 hover:bg-gray-700' : 'bg-red-500 hover:bg-red-600'
                    }`}
                  >
                    {isMicOn ? (
                      <Mic className="w-5 h-5 text-white" />
                    ) : (
                      <MicOff className="w-5 h-5 text-white" />
                    )}
                  </button>
                  <button
                    onClick={() => setIsVideoOn(!isVideoOn)}
                    className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${
                      isVideoOn ? 'bg-gray-800 hover:bg-gray-700' : 'bg-red-500 hover:bg-red-600'
                    }`}
                  >
                    {isVideoOn ? (
                      <Video className="w-5 h-5 text-white" />
                    ) : (
                      <VideoOff className="w-5 h-5 text-white" />
                    )}
                  </button>
                </div>
              </div>

              {/* Join Button */}
              <Button
                onClick={handleJoinCall}
                className="w-full bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 text-white py-6 text-lg"
              >
                <Video className="w-5 h-5 mr-2" />
                Join Video Consultation
              </Button>

              {/* Meeting ID */}
              <div className="mt-6 text-center">
                <p className="text-gray-500 text-sm">
                  Meeting ID: <span className="font-mono text-gray-700">{meetingId}</span>
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className="bg-gray-50 px-8 py-4 border-t border-gray-200">
              <p className="text-gray-400 text-xs text-center">
                Powered by HealQR.com • Secure & HIPAA Compliant
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Connecting State
  if (callStatus === 'connecting') {
    return (
      <div className="min-h-screen bg-[#0a0f1a] text-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-24 h-24 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-6 animate-pulse">
            <Video className="w-12 h-12 text-red-500" />
          </div>
          <h2 className="text-2xl mb-2">Connecting...</h2>
          <p className="text-gray-400">Please wait while we connect you to the doctor</p>
        </div>
      </div>
    );
  }

  // Connected State
  if (callStatus === 'connected') {
    return (
      <div className="h-screen bg-[#0a0f1a] text-white flex flex-col">
        {/* Header */}
        <div className="bg-black/50 backdrop-blur px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-sm">Connected to {doctorName}</span>
          </div>
          <div className="flex items-center gap-4">
            <Badge variant="outline" className="border-gray-700">
              {bookingId}
            </Badge>
            <div className="flex items-center gap-2 text-sm">
              <Clock className="w-4 h-4" />
              {formatDuration(callDuration)}
            </div>
          </div>
        </div>

        {/* Video Area */}
        <div className="flex-1 relative bg-black">
          {/* Doctor's Video (Main) */}
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-zinc-900 to-black">
            <div className="text-center">
              <div className="w-40 h-40 rounded-full bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center mx-auto mb-6">
                <span className="text-white text-5xl font-semibold">
                  {doctorName.split(' ')[1]?.charAt(0) || 'A'}S
                </span>
              </div>
              <h3 className="text-2xl mb-2">{doctorName}</h3>
              <p className="text-gray-400">{doctorSpecialization}</p>
            </div>
          </div>

          {/* Patient's Video (PiP) */}
          <div className="absolute top-6 right-6 w-64 h-48 bg-black rounded-xl overflow-hidden border-2 border-zinc-700 shadow-2xl">
            {isVideoOn ? (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-zinc-800 to-black">
                <div className="text-center">
                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center mx-auto mb-2">
                    <User className="w-10 h-10 text-white" />
                  </div>
                  <p className="text-sm text-gray-400">You</p>
                </div>
              </div>
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-black">
                <VideoOff className="w-10 h-10 text-gray-600" />
              </div>
            )}
          </div>
        </div>

        {/* Controls */}
        <div className="bg-black/50 backdrop-blur px-6 py-6">
          <div className="flex items-center justify-center gap-4">
            {/* Mic Toggle */}
            <button
              onClick={() => setIsMicOn(!isMicOn)}
              className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${
                isMicOn 
                  ? 'bg-gray-700 hover:bg-gray-600' 
                  : 'bg-red-500 hover:bg-red-600'
              }`}
              title={isMicOn ? 'Mute' : 'Unmute'}
            >
              {isMicOn ? (
                <Mic className="w-6 h-6 text-white" />
              ) : (
                <MicOff className="w-6 h-6 text-white" />
              )}
            </button>

            {/* Video Toggle */}
            <button
              onClick={() => setIsVideoOn(!isVideoOn)}
              className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${
                isVideoOn 
                  ? 'bg-gray-700 hover:bg-gray-600' 
                  : 'bg-red-500 hover:bg-red-600'
              }`}
              title={isVideoOn ? 'Turn off camera' : 'Turn on camera'}
            >
              {isVideoOn ? (
                <Video className="w-6 h-6 text-white" />
              ) : (
                <VideoOff className="w-6 h-6 text-white" />
              )}
            </button>

            {/* Screen Share */}
            <button
              onClick={() => setIsScreenSharing(!isScreenSharing)}
              className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${
                isScreenSharing 
                  ? 'bg-blue-500 hover:bg-blue-600' 
                  : 'bg-gray-700 hover:bg-gray-600'
              }`}
              title="Share screen"
            >
              <MonitorUp className="w-6 h-6 text-white" />
            </button>

            {/* Settings */}
            <button
              className="w-14 h-14 rounded-full bg-gray-700 hover:bg-gray-600 flex items-center justify-center transition-all"
              title="Settings"
            >
              <Settings className="w-6 h-6 text-white" />
            </button>

            {/* End Call */}
            <button
              onClick={handleEndCall}
              className="w-14 h-14 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center transition-all ml-4"
              title="End call"
            >
              <PhoneOff className="w-6 h-6 text-white" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Call Ended State
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0f1a] via-[#1a1f2e] to-[#0a0f1a] text-white flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-3xl overflow-hidden shadow-2xl">
          {/* Header */}
          <div className="bg-gradient-to-r from-green-500 to-emerald-500 p-8 text-center">
            <div className="w-20 h-20 rounded-full bg-white flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-10 h-10 text-green-500" />
            </div>
            <h1 className="text-white text-2xl mb-2">Consultation Completed</h1>
            <p className="text-white/90">Thank you for your time</p>
          </div>

          {/* Content */}
          <div className="p-8">
            <div className="bg-gray-50 rounded-xl p-6 mb-6">
              <h3 className="text-gray-900 font-semibold mb-4">Call Summary</h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Doctor</span>
                  <span className="text-gray-900 font-medium">{doctorName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Duration</span>
                  <span className="text-gray-900 font-medium">{formatDuration(callDuration)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Booking ID</span>
                  <span className="text-gray-900 font-medium">{bookingId}</span>
                </div>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
              <p className="text-blue-900 text-sm">
                <AlertCircle className="w-4 h-4 inline mr-2" />
                A consultation summary will be sent to your WhatsApp shortly.
              </p>
            </div>

            <Button
              onClick={() => window.close()}
              className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white py-6"
            >
              Close Window
            </Button>
          </div>

          {/* Footer */}
          <div className="bg-gray-50 px-8 py-4 border-t border-gray-200">
            <p className="text-gray-400 text-xs text-center">
              Powered by HealQR.com
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
