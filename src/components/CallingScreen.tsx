import { useEffect, useRef, useState } from 'react';
import { useAppStore } from '../store/useAppStore';
import { CallHandshake } from '../types';
import { 
  Phone, 
  PhoneOff, 
  Mic, 
  MicOff, 
  Video, 
  VideoOff, 
  Maximize2, 
  Minimize2,
  Volume2,
  ShieldCheck 
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface CallingScreenProps {
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  isMuted: boolean;
  isCameraOff: boolean;
  getFormattedDuration: () => string;
  acceptIncomingCall: (call: CallHandshake) => Promise<void>;
  rejectIncomingCall: (call: CallHandshake) => Promise<void>;
  endActiveCall: () => Promise<void>;
  toggleMic: () => void;
  toggleCamera: () => void;
}

export default function CallingScreen({
  localStream,
  remoteStream,
  isMuted,
  isCameraOff,
  getFormattedDuration,
  acceptIncomingCall,
  rejectIncomingCall,
  endActiveCall,
  toggleMic,
  toggleCamera
}: CallingScreenProps) {
  const { user, activeCall } = useAppStore();
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Bind local source tracks
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream, activeCall?.status]);

  // Bind remote source tracks
  useEffect(() => {
    if (remoteVideoRef.current && remoteStream && activeCall?.type === 'video') {
      remoteVideoRef.current.srcObject = remoteStream;
      remoteVideoRef.current.play().catch(err => console.warn('Programmatic remote video play failed:', err));
    }
  }, [remoteStream, activeCall?.status, activeCall?.type]);

  // Bind remote audio tracks for voice calls to ensure sound
  useEffect(() => {
    if (remoteAudioRef.current && remoteStream && activeCall?.type === 'voice') {
      remoteAudioRef.current.srcObject = remoteStream;
      remoteAudioRef.current.play().catch(err => console.warn('Programmatic remote audio play failed:', err));
    } else if (remoteAudioRef.current) {
      remoteAudioRef.current.srcObject = null;
    }
  }, [remoteStream, activeCall?.status, activeCall?.type]);

  if (!activeCall) return null;

  const isIncoming = activeCall.receiverId === user?.uid && activeCall.status === 'ringing';
  const isOutgoing = activeCall.callerId === user?.uid && activeCall.status === 'ringing';
  const isConnected = activeCall.status === 'accepted';

  return (
    <div className="fixed inset-0 min-h-screen bg-[#07080B] flex flex-col z-50 text-white overflow-hidden font-sans select-none items-center justify-center">
      
      {/* Playback element for remote audio during voice-only calls */}
      <audio
        ref={remoteAudioRef}
        autoPlay
        playsInline
      />

      {/* Background ambient blur decorations */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[40rem] h-[40rem] bg-indigo-500/5 rounded-full blur-[8rem] pointer-events-none" />

      {/* ==================== OUTGOING / INCOMING HOOKUP DIALS ==================== */}
      <AnimatePresence mode="wait">
        {(isIncoming || isOutgoing) && (
          <motion.div
            key="handshake-window"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="w-full max-w-md mx-4 p-8 rounded-3xl bg-[#111318]/90 border border-slate-800/60 backdrop-blur-2xl flex flex-col items-center justify-center relative shadow-2xl space-y-6"
          >
            {/* Header calling mode */}
            <div className="flex items-center space-x-1.5 px-3 py-1 bg-indigo-500/10 border border-indigo-500/20 rounded-full text-indigo-400 text-[10px] font-bold uppercase tracking-wider">
              {activeCall.type === 'video' ? <Video className="w-3.5 h-3.5" /> : <Phone className="w-3.5 h-3.5" />}
              <span>{activeCall.type} call</span>
            </div>

            {/* Pulsing profile cover avatar */}
            <div className="relative">
              <div className="absolute inset-0 bg-indigo-500/10 rounded-full animate-ping scale-110" />
              <img
                referrerPolicy="no-referrer"
                src={isIncoming ? activeCall.callerPhoto : (activeCall.callerId === user?.uid ? user?.photoURL : activeCall.callerPhoto)}
                alt="Profile photo"
                className="w-24 h-24 rounded-2xl ring-2 ring-indigo-500/20 bg-slate-950 relative z-10 object-cover shadow-lg"
              />
            </div>

            {/* Call State Title */}
            <div className="text-center space-y-1">
              <h3 className="text-lg font-bold tracking-tight text-white font-sans">
                {isIncoming ? activeCall.callerName : 'Calling contact...'}
              </h3>
              <p className="text-slate-500 text-xs animate-pulse">
                {isIncoming ? 'Incoming Secure Call Request' : 'Connecting real-time handshakes...'}
              </p>
            </div>

            {/* Action Bar */}
            <div className="flex items-center justify-center space-x-5 w-full pt-4">
              {isIncoming ? (
                <>
                  {/* Reject Dial */}
                  <button
                    id="reject-call-btn"
                    onClick={() => rejectIncomingCall(activeCall)}
                    className="p-4 bg-rose-500 hover:bg-rose-400 transition-all text-white rounded-xl flex items-center justify-center hover:shadow-lg hover:shadow-rose-500/20 duration-150 active:scale-95 cursor-pointer"
                    title="Reject Call"
                  >
                    <PhoneOff className="w-5 h-5 rotate-135" />
                  </button>

                  {/* Accept Dial */}
                  <button
                    id="accept-call-btn"
                    onClick={() => acceptIncomingCall(activeCall)}
                    className="p-4 bg-indigo-500 hover:bg-indigo-400 transition-all text-white rounded-xl flex items-center justify-center hover:shadow-lg hover:shadow-indigo-500/20 duration-150 active:scale-95 cursor-pointer"
                    title="Accept Call"
                  >
                    <Phone className="w-5 h-5" />
                  </button>
                </>
              ) : (
                /* Cancel Outgoing dial */
                <button
                  id="cancel-call-btn"
                  onClick={endActiveCall}
                  className="p-4 bg-rose-500 hover:bg-rose-400 transition-all text-white rounded-xl flex items-center justify-center hover:shadow-lg hover:shadow-rose-500/20 duration-150 active:scale-95 cursor-pointer"
                  title="Cancel Call"
                >
                  <PhoneOff className="w-5 h-5" />
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ==================== CONNECTED ACTIVE COMMUNICATIONS ==================== */}
      <AnimatePresence>
        {isConnected && (
          <motion.div
            key="active-communication-window"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className={`w-full h-full flex flex-col relative ${isFullscreen ? 'p-0' : 'p-6 md:p-8'}`}
          >
            {/* If Call Mode is Video */}
            {activeCall.type === 'video' ? (
              <div className="flex-1 w-full relative bg-slate-950 border border-slate-900 rounded-3xl overflow-hidden shadow-2xl flex items-center justify-center">
                
                {/* Remote Video Stream elements */}
                <video
                  ref={remoteVideoRef}
                  autoPlay
                  playsInline
                  className="w-full h-full object-cover rounded-3xl"
                />

                {/* Picture in picture local preview overlay */}
                <div className="absolute top-4 right-4 w-32 md:w-44 aspect-video bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden glassmorphism shadow-xl z-20">
                  {isCameraOff ? (
                    <div className="w-full h-full flex items-center justify-center bg-slate-950 text-[10px] text-slate-500 font-mono">
                      <span>Camera Disabled</span>
                    </div>
                  ) : (
                    <video
                      ref={localVideoRef}
                      autoPlay
                      playsInline
                      muted
                      className="w-full h-full object-cover"
                    />
                  )}
                </div>

                {/* Remote No stream fallback indicator */}
                {!remoteStream && (
                  <div className="absolute inset-0 bg-[#07080B] flex flex-col items-center justify-center space-y-4">
                    <div className="w-12 h-12 rounded-2xl bg-slate-900 flex items-center justify-center border border-slate-800">
                      <Video className="w-5 h-5 text-indigo-400 animate-pulse" />
                    </div>
                    <span className="text-slate-500 text-xs font-mono">Negotiating peer stream...</span>
                  </div>
                )}

                {/* Fullscreen controller */}
                <button
                  onClick={() => setIsFullscreen(!isFullscreen)}
                  className="absolute top-4 left-4 p-2 bg-slate-900/65 border border-slate-850 hover:bg-slate-800 rounded-xl text-white transition-all shadow-lg z-20 cursor-pointer"
                >
                  {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                </button>

              </div>
            ) : (
              /* If Call Mode is Voice options show large pulsing avatar cards */
              <div className="flex-1 w-full bg-[#111318]/60 border border-slate-850/70 backdrop-blur-xl rounded-3xl overflow-hidden flex flex-col items-center justify-center space-y-6">
                
                {/* Pulse Ring container */}
                <div className="relative">
                  <div className="absolute -inset-10 bg-indigo-500/5 rounded-full animate-ping scale-110" />
                  <div className="absolute -inset-6 bg-indigo-500/10 rounded-full animate-pulse" />
                  <img
                    referrerPolicy="no-referrer"
                    src={activeCall.callerId === user?.uid ? activeCall.callerPhoto : activeCall.callerPhoto}
                    alt="Receiver photo"
                    className="w-28 h-28 rounded-3xl ring-2 ring-indigo-500/20 object-cover shadow-2xl bg-slate-950 relative z-10"
                  />
                </div>

                <div className="text-center space-y-1 z-10">
                  <h3 className="text-xl font-bold tracking-tight text-white font-sans">
                    {activeCall.callerId === user?.uid ? activeCall.callerName : activeCall.callerName}
                  </h3>
                  <p className="text-indigo-400 text-xs font-semibold tracking-wider uppercase font-sans flex items-center justify-center space-x-1.5">
                    <Volume2 className="w-3.5 h-3.5 text-indigo-400 animate-pulse" />
                    <span>Real-Time Audio Connected</span>
                  </p>
                </div>

                {/* Connection check badge */}
                <div className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-950 border border-slate-850 rounded-xl text-slate-500 text-[10px] font-mono leading-none">
                  <ShieldCheck className="w-3.5 h-3.5 text-indigo-500" />
                  <span>Encrypted Peer Access Link</span>
                </div>

              </div>
            )}

            {/* Underneath Global active call controls */}
            <div className="p-6 flex flex-col items-center space-y-4 shrink-0">
              {/* Call Timer badge */}
              <div className="px-3.5 py-1 bg-[#111318] border border-slate-800/80 rounded-full text-slate-300 text-xs font-semibold font-mono tracking-widest shadow-xl">
                {getFormattedDuration()}
              </div>

              {/* Toggle actions row */}
              <div className="flex items-center space-x-4">
                {/* Mute logic */}
                <button
                  onClick={toggleMic}
                  className={`p-3.5 rounded-xl transition-all shadow-lg border cursor-pointer ${
                    isMuted 
                      ? 'bg-rose-500/20 border-rose-500/40 text-rose-400 hover:bg-rose-550/30' 
                      : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800'
                  }`}
                  title={isMuted ? 'Unmute microphone' : 'Mute microphone'}
                >
                  {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                </button>

                {/* If video calls, toggle camera */}
                {activeCall.type === 'video' && (
                  <button
                    onClick={toggleCamera}
                    className={`p-3.5 rounded-xl transition-all shadow-lg border cursor-pointer ${
                      isCameraOff 
                        ? 'bg-rose-500/20 border-rose-500/40 text-rose-400 hover:bg-rose-550/30' 
                        : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800'
                  }`}
                    title={isCameraOff ? 'Enable camera' : 'Disable camera'}
                  >
                    {isCameraOff ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
                  </button>
                )}

                {/* End Call red actions */}
                <button
                  id="disconnect-call-btn"
                  onClick={endActiveCall}
                  className="p-4 bg-rose-500 hover:bg-rose-400 text-white rounded-xl flex items-center justify-center hover:shadow-lg hover:shadow-rose-500/20 transition-all duration-150 active:scale-95 cursor-pointer shrink-0"
                  title="Disconnect Call"
                >
                  <PhoneOff className="w-5 h-5" />
                </button>
              </div>
            </div>

          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
