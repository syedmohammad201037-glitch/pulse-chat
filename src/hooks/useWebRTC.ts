import { useEffect, useRef, useState, useCallback } from 'react';
import { useAppStore } from '../store/useAppStore';
import { CallHandshake, CallType } from '../types';
import { db, OperationType, handleFirestoreError } from '../lib/firebase';
import { 
  doc, 
  setDoc, 
  updateDoc, 
  onSnapshot, 
  collection, 
  addDoc, 
  getDocs, 
  deleteDoc, 
  serverTimestamp 
} from 'firebase/firestore';

const peerConfiguration: RTCConfiguration = {
  iceServers: [
    {
      urls: [
        'stun:stun.l.google.com:19302',
        'stun:stun1.l.google.com:19302',
        'stun:stun2.l.google.com:19302'
      ],
    },
  ],
  iceCandidatePoolSize: 10,
};

export function useWebRTC() {
  const { user, activeCall, setActiveCall, allUsers } = useAppStore();
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const callTimerRef = useRef<NodeJS.Timeout | null>(null);
  const callDurationRef = useRef(0);
  const unsubscribeCallRef = useRef<(() => void) | null>(null);

  // Sync callDuration state with ref
  useEffect(() => {
    callDurationRef.current = callDuration;
  }, [callDuration]);

  const logCall = useCallback(async (
    callId: string,
    callerId: string,
    callerName: string,
    callerPhoto: string,
    receiverId: string,
    type: 'voice' | 'video',
    finalStatus: 'accepted' | 'rejected' | 'missed' | 'ended',
    durationSec: number
  ) => {
    if (!user) return;
    
    // Find partner profile for enrichment
    const partnerId = callerId === user.uid ? receiverId : callerId;
    const partner = allUsers.find(u => u.uid === partnerId);
    
    const receiverName = callerId === user.uid ? (partner?.displayName || 'User') : user.displayName;
    const receiverPhoto = callerId === user.uid ? (partner?.photoURL || `https://api.dicebear.com/7.x/adventurer/svg?seed=${receiverId}`) : user.photoURL;

    let statusToRecord = finalStatus;
    if (finalStatus === 'ended' && durationSec === 0) {
      statusToRecord = 'missed';
    }

    const payload = {
      id: callId,
      callerId,
      callerName,
      callerPhoto,
      receiverId,
      receiverName,
      receiverPhoto,
      type,
      status: statusToRecord,
      duration: durationSec,
      timestamp: serverTimestamp(),
      participants: [callerId, receiverId]
    };

    try {
      await setDoc(doc(db, 'callLogs', callId), payload, { merge: true });
    } catch (err) {
      console.error('Failed to log call:', err);
    }
  }, [user, allUsers]);

  // Stop media tracks
  const stopStream = useCallback((stream: MediaStream | null) => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
    }
  }, []);

  // Clean and reset connection
  const resetCallStates = useCallback(() => {
    if (callTimerRef.current) {
      clearInterval(callTimerRef.current);
      callTimerRef.current = null;
    }
    
    if (unsubscribeCallRef.current) {
      unsubscribeCallRef.current();
      unsubscribeCallRef.current = null;
    }

    stopStream(localStreamRef.current);
    stopStream(remoteStreamRef.current);
    
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }

    setLocalStream(null);
    setRemoteStream(null);
    localStreamRef.current = null;
    remoteStreamRef.current = null;
    setIsMuted(false);
    setIsCameraOff(false);
    setCallDuration(0);
    setActiveCall(null);
  }, [stopStream, setActiveCall]);

  // Format call duration MM:SS
  const getFormattedDuration = useCallback(() => {
    const minutes = Math.floor(callDuration / 60);
    const seconds = callDuration % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }, [callDuration]);

  // Hook up timer upon acceptance
  useEffect(() => {
    if (activeCall && activeCall.status === 'accepted') {
      callTimerRef.current = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
    } else {
      if (callTimerRef.current) {
        clearInterval(callTimerRef.current);
        callTimerRef.current = null;
      }
    }
    return () => {
      if (callTimerRef.current) {
        clearInterval(callTimerRef.current);
      }
    };
  }, [activeCall?.status]);

  // Generate a synthesized/mock MediaStream for testing in environments without camera/microphone hardware
  const createMockStream = useCallback((type: CallType) => {
    const stream = new MediaStream();
    
    // Synthesize mock audio track (gentle silent pulse track)
    if (typeof window !== 'undefined') {
      try {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioCtx) {
          const ctx = new AudioCtx();
          const dest = ctx.createMediaStreamDestination();
          const osc = ctx.createOscillator();
          const gainNode = ctx.createGain();
          
          osc.frequency.setValueAtTime(440, ctx.currentTime);
          gainNode.gain.setValueAtTime(0.001, ctx.currentTime); // barely audible safe test buzz
          
          osc.connect(gainNode);
          gainNode.connect(dest);
          osc.start();
          
          dest.stream.getAudioTracks().forEach(track => stream.addTrack(track));
        }
      } catch (e) {
        console.warn('Failed to synthesize mock audio track:', e);
      }
    }

    // Synthesize mock video track
    if (type === 'video') {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = 640;
        canvas.height = 480;
        const ctx = canvas.getContext('2d');
        
        let angle = 0;
        const interval = setInterval(() => {
          if (!ctx) return;
          // Gradient background
          const gradient = ctx.createLinearGradient(0, 0, 640, 480);
          gradient.addColorStop(0, '#0a0b0e'); // Slate bg matching minimalist theme
          gradient.addColorStop(1, '#1e1b4b'); // Deep indigo
          ctx.fillStyle = gradient;
          ctx.fillRect(0, 0, 640, 480);
          
          // Draw subtle grid lines
          ctx.strokeStyle = 'rgba(99, 102, 241, 0.1)';
          ctx.lineWidth = 1;
          for (let i = 0; i < 640; i += 40) {
            ctx.beginPath();
            ctx.moveTo(i, 0);
            ctx.lineTo(i, 480);
            ctx.stroke();
          }
          for (let j = 0; j < 480; j += 40) {
            ctx.beginPath();
            ctx.moveTo(0, j);
            ctx.lineTo(640, j);
            ctx.stroke();
          }

          // Pulsing indigo camera indicator circle
          ctx.fillStyle = 'rgba(99, 102, 241, 0.15)';
          ctx.beginPath();
          const rPulse = 80 + Math.sin(angle) * 20;
          ctx.arc(320, 240, rPulse, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = '#6366f1'; // Clean primary indigo
          ctx.beginPath();
          const r = 50 + Math.sin(angle) * 10;
          ctx.arc(320, 240, r, 0, Math.PI * 2);
          ctx.fill();
          
          // Outer ring
          ctx.strokeStyle = '#818cf8';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.arc(320, 240, r + 15, 0, Math.PI * 2);
          ctx.stroke();
          
          // Text inside pulse
          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 14px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('LIVE PEER', 320, 245);
          
          // Text descriptor at bottom
          ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
          ctx.font = '11px monospace';
          ctx.fillText('EMULATED LIVE INPUT (HARDWARE BYPASS)', 320, 410);
          ctx.fillText(`CONTAINER NODAL SIGNAL: OK`, 320, 430);
          ctx.fillText(`UTC: ${new Date().toISOString()}`, 320, 450);
          
          angle += 0.05;
        }, 66); // ~15 FPS to save CPU

        const canvasStream = (canvas as any).captureStream ? (canvas as any).captureStream(15) : null;
        if (canvasStream) {
          canvasStream.getVideoTracks().forEach((track: any) => {
            stream.addTrack(track);
            const originalStop = track.stop;
            track.stop = function() {
              clearInterval(interval);
              if (originalStop) originalStop.call(this);
            };
          });
        }
      } catch (e) {
        console.warn('Failed to synthesize mock video track:', e);
      }
    }
    
    return stream;
  }, []);

  // Handle stream tracks addition
  const startLocalStream = async (type: CallType) => {
    try {
      const constraints: MediaStreamConstraints = {
        audio: true,
        video: type === 'video' ? {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user'
        } : false
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      localStreamRef.current = stream;
      setLocalStream(stream);
      return stream;
    } catch (err) {
      console.warn('Physical camera/microphone input not accessed. Falling back to synthetic media stream:', err);
      // Fallback to beautiful synthetic track
      const fallbackStream = createMockStream(type);
      localStreamRef.current = fallbackStream;
      setLocalStream(fallbackStream);
      return fallbackStream;
    }
  };

  // Caller: initiate RTC call
  const initiateCall = async (receiverId: string, type: CallType, receiverName: string) => {
    if (!user) return;
    
    resetCallStates();
    
    // Create new peer connection
    const pc = new RTCPeerConnection(peerConfiguration);
    peerConnectionRef.current = pc;
    
    setActiveCall({
      id: '', // to be set
      callerId: user.uid,
      callerName: user.displayName,
      callerPhoto: user.photoURL,
      receiverId,
      type,
      status: 'ringing',
      timestamp: null as any
    });

    try {
      // 1. Fetch user local stream
      const stream = await startLocalStream(type);
      stream.getTracks().forEach((track) => {
        pc.addTrack(track, stream);
      });

      // 2. Set remote stream handler
      const rStream = new MediaStream();
      remoteStreamRef.current = rStream;
      setRemoteStream(rStream);
      pc.ontrack = (event) => {
        const stream = event.streams[0];
        if (stream) {
          remoteStreamRef.current = stream;
          setRemoteStream(stream);
        } else if (event.track) {
          rStream.addTrack(event.track);
          const nextStream = new MediaStream(rStream.getTracks());
          remoteStreamRef.current = nextStream;
          setRemoteStream(nextStream);
        }
      };

      // 3. Initiate a Firestore Call Handshake record
      const callRef = doc(collection(db, 'calls'));
      const callId = callRef.id;

      // Prepare RTC Local SDP offer
      const offerDescription = await pc.createOffer();
      await pc.setLocalDescription(offerDescription);

      const rtcOfferDesc = {
        type: offerDescription.type,
        sdp: offerDescription.sdp
      };

      const callDocument: CallHandshake = {
        id: callId,
        callerId: user.uid,
        callerName: user.displayName,
        callerPhoto: user.photoURL,
        receiverId,
        type,
        status: 'ringing',
        timestamp: serverTimestamp() as any,
        offer: rtcOfferDesc
      };

      await setDoc(callRef, callDocument).catch((err) => {
        handleFirestoreError(err, OperationType.CREATE, `calls/${callId}`);
      });

      setActiveCall(callDocument);

      // 4. Send ICE candidates
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          const candRef = collection(db, 'calls', callId, 'callerCandidates');
          addDoc(candRef, event.candidate.toJSON()).catch((err) => {
            handleFirestoreError(err, OperationType.CREATE, `calls/${callId}/callerCandidates`);
          });
        }
      };

      // 5. Connect and monitor recipient callbacks (Answer + ICE)
      const unsubCallState = onSnapshot(callRef, async (snapshot) => {
        const data = snapshot.data() as CallHandshake | undefined;
        if (!data) return;

        setActiveCall(data);

        // If active call accepted by receiver
        if (data.status === 'accepted' && data.answer && !pc.currentRemoteDescription) {
          const answerDesc = new RTCSessionDescription(data.answer);
          await pc.setRemoteDescription(answerDesc);
        }

        // Handle termination cases
        if (data.status === 'rejected' || data.status === 'ended') {
          await logCall(
            data.id,
            data.callerId,
            data.callerName,
            data.callerPhoto,
            data.receiverId,
            data.type,
            data.status,
            callDurationRef.current
          );
          resetCallStates();
        }
      }, (error) => {
        handleFirestoreError(error, OperationType.GET, `calls/${callId}`);
      });

      // Listen for incoming ICE candidates from responder
      const receiverCandidatesRef = collection(db, 'calls', callId, 'receiverCandidates');
      const unsubReceiverIce = onSnapshot(receiverCandidatesRef, (snapshot) => {
        snapshot.docChanges().forEach(async (change) => {
          if (change.type === 'added') {
            const candidateData = change.doc.data();
            await pc.addIceCandidate(new RTCIceCandidate(candidateData));
          }
        });
      }, (error) => {
        handleFirestoreError(error, OperationType.GET, `calls/${callId}/receiverCandidates`);
      });

      unsubscribeCallRef.current = () => {
        unsubCallState();
        unsubReceiverIce();
      };

    } catch (e) {
      console.error('Call initiation failed:', e);
      resetCallStates();
    }
  };

  // Receiver: accept incoming call
  const acceptIncomingCall = async (incoming: CallHandshake) => {
    if (!user || !incoming.offer) return;
    
    resetCallStates();
    
    const pc = new RTCPeerConnection(peerConfiguration);
    peerConnectionRef.current = pc;
    setActiveCall({ ...incoming, status: 'accepted' });

    try {
      // 1. Start local stream
      const stream = await startLocalStream(incoming.type);
      stream.getTracks().forEach((track) => {
        pc.addTrack(track, stream);
      });

      // 2. Set remote stream handler
      const rStream = new MediaStream();
      remoteStreamRef.current = rStream;
      setRemoteStream(rStream);
      pc.ontrack = (event) => {
        const stream = event.streams[0];
        if (stream) {
          remoteStreamRef.current = stream;
          setRemoteStream(stream);
        } else if (event.track) {
          rStream.addTrack(event.track);
          const nextStream = new MediaStream(rStream.getTracks());
          remoteStreamRef.current = nextStream;
          setRemoteStream(nextStream);
        }
      };

      // 3. Bind Caller candidates subcollection
      const callerCandidatesRef = collection(db, 'calls', incoming.id, 'callerCandidates');
      const unsubCallerIce = onSnapshot(callerCandidatesRef, (snapshot) => {
        snapshot.docChanges().forEach(async (change) => {
          if (change.type === 'added') {
            const candidateData = change.doc.data();
            await pc.addIceCandidate(new RTCIceCandidate(candidateData));
          }
        });
      }, (error) => {
        handleFirestoreError(error, OperationType.GET, `calls/${incoming.id}/callerCandidates`);
      });

      // 4. Send Receiver candidates
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          const candRef = collection(db, 'calls', incoming.id, 'receiverCandidates');
          addDoc(candRef, event.candidate.toJSON()).catch((err) => {
            handleFirestoreError(err, OperationType.CREATE, `calls/${incoming.id}/receiverCandidates`);
          });
        }
      };

      // 5. Connect Session Descriptions
      const offerDesc = new RTCSessionDescription(incoming.offer);
      await pc.setRemoteDescription(offerDesc);

      const answerDesc = await pc.createAnswer();
      await pc.setLocalDescription(answerDesc);

      const rtcAnswerDesc = {
        type: answerDesc.type,
        sdp: answerDesc.sdp
      };

      // Update call status & answer SDP in Firestore
      const callRef = doc(db, 'calls', incoming.id);
      await updateDoc(callRef, {
        status: 'accepted',
        answer: rtcAnswerDesc
      }).catch((err) => {
        handleFirestoreError(err, OperationType.UPDATE, `calls/${incoming.id}`);
      });

      // 6. Monitor call changes (like Caller hanging up)
      const unsubCallState = onSnapshot(callRef, (snapshot) => {
        const data = snapshot.data() as CallHandshake | undefined;
        if (!data) return;

        setActiveCall(data);

        if (data.status === 'ended' || data.status === 'rejected') {
          logCall(
            data.id,
            data.callerId,
            data.callerName,
            data.callerPhoto,
            data.receiverId,
            data.type,
            data.status,
            callDurationRef.current
          );
          resetCallStates();
        }
      }, (error) => {
        handleFirestoreError(error, OperationType.GET, `calls/${incoming.id}`);
      });

      unsubscribeCallRef.current = () => {
        unsubCallState();
        unsubCallerIce();
      };

    } catch (e) {
      console.error('Error accepting call:', e);
      resetCallStates();
    }
  };

  // Receiver: reject call
  const rejectIncomingCall = async (incoming: CallHandshake) => {
    try {
      const callRef = doc(db, 'calls', incoming.id);
      await updateDoc(callRef, { status: 'rejected' }).catch((err) => {
        handleFirestoreError(err, OperationType.UPDATE, `calls/${incoming.id}`);
      });
      await logCall(
        incoming.id,
        incoming.callerId,
        incoming.callerName,
        incoming.callerPhoto,
        incoming.receiverId,
        incoming.type,
        'rejected',
        0
      );
      resetCallStates();
    } catch (e) {
      console.error('Error rejecting call:', e);
    }
  };

  // End active call
  const endActiveCall = async () => {
    if (!activeCall) return;
    const currentCall = activeCall;
    const durationSec = callDurationRef.current;
    try {
      const callRef = doc(db, 'calls', currentCall.id);
      await updateDoc(callRef, { status: 'ended' }).catch((err) => {
        handleFirestoreError(err, OperationType.UPDATE, `calls/${currentCall.id}`);
      });
      await logCall(
        currentCall.id,
        currentCall.callerId,
        currentCall.callerName,
        currentCall.callerPhoto,
        currentCall.receiverId,
        currentCall.type,
        'ended',
        durationSec
      );
      resetCallStates();
    } catch (e) {
      console.error('Error ending call:', e);
      resetCallStates();
    }
  };

  // Toggle local microphone
  const toggleMic = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
      }
    }
  };

  // Toggle local camera (video)
  const toggleCamera = () => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsCameraOff(!videoTrack.enabled);
      }
    }
  };

  // Ensure cleans up everything on unmount
  useEffect(() => {
    return () => {
      if (unsubscribeCallRef.current) {
        unsubscribeCallRef.current();
      }
    };
  }, []);

  return {
    localStream,
    remoteStream,
    isMuted,
    isCameraOff,
    callDuration,
    getFormattedDuration,
    initiateCall,
    acceptIncomingCall,
    rejectIncomingCall,
    endActiveCall,
    toggleMic,
    toggleCamera
  };
}
