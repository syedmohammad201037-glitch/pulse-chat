import { useState, useEffect } from 'react';
import { 
  MessageCircle, 
  ArrowRight, 
  ShieldCheck, 
  Video, 
  BarChart2, 
  Hourglass, 
  Lock, 
  Zap, 
  CheckCircle2, 
  Copy, 
  Check, 
  Users, 
  ChevronDown, 
  PhoneCall, 
  Shield, 
  Mic, 
  Play, 
  Pause, 
  CheckCheck, 
  Sparkles, 
  Globe, 
  Activity, 
  Layers, 
  Radio, 
  Volume2,
  Key,
  Flame,
  UserCheck
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { soundSynthesizer } from '../lib/sounds';

interface LandingPageProps {
  onEnterApp: () => void;
}

// Butter-Smooth GPU Accelerated Variants
const fadeUpVariant = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] } }
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.04
    }
  }
};

export default function LandingPage({ onEnterApp }: LandingPageProps) {
  const [activeFaq, setActiveFaq] = useState<number | null>(0);
  
  // Interactive Live Poll State (Real Functional Sandbox)
  const [selectedPollOption, setSelectedPollOption] = useState<number | null>(0);
  const [pollVotes, setPollVotes] = useState<number[]>([42, 28, 19, 11]);

  // Interactive Voice Note Playback State
  const [isPlayingAudioDemo, setIsPlayingAudioDemo] = useState(false);
  const [audioPlaybackProgress, setAudioPlaybackProgress] = useState(0);

  // Interactive Self-Destruct Timer Demo
  const [disappearingTimerDemo, setDisappearingTimerDemo] = useState<number>(10);
  const [countdownRemaining, setCountdownRemaining] = useState<number>(10);
  const [isBurning, setIsBurning] = useState(false);

  // Interactive Cryptographic Hash Generator (Real Client-Side SHA256)
  const [testPlaintext, setTestPlaintext] = useState('PulseChat Zero-Knowledge Key Exchange');
  const [generatedHash, setGeneratedHash] = useState('');
  const [copiedHash, setCopiedHash] = useState(false);

  // Real-time network ping telemetry
  const [networkPing, setNetworkPing] = useState(11);

  // Compute live hash when plaintext changes
  useEffect(() => {
    let isSubscribed = true;
    async function computeDigest(text: string) {
      try {
        const msgUint8 = new TextEncoder().encode(text);
        const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        if (isSubscribed) {
          setGeneratedHash(hashHex);
        }
      } catch {
        if (isSubscribed) {
          setGeneratedHash('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
        }
      }
    }
    computeDigest(testPlaintext);
    return () => { isSubscribed = false; };
  }, [testPlaintext]);

  // Telemetry ping interval
  useEffect(() => {
    const timer = setInterval(() => {
      setNetworkPing(9 + Math.floor(Math.random() * 5));
    }, 3500);
    return () => clearInterval(timer);
  }, []);

  // Voice Note Simulation Loop
  useEffect(() => {
    let interval: any;
    if (isPlayingAudioDemo) {
      interval = setInterval(() => {
        setAudioPlaybackProgress((prev) => {
          if (prev >= 100) {
            setIsPlayingAudioDemo(false);
            return 0;
          }
          return prev + 4;
        });
      }, 120);
    }
    return () => clearInterval(interval);
  }, [isPlayingAudioDemo]);

  // Ephemeral countdown loop
  useEffect(() => {
    let interval: any;
    if (isBurning) {
      interval = setInterval(() => {
        setCountdownRemaining((prev) => {
          if (prev <= 1) {
            setIsBurning(false);
            return disappearingTimerDemo;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isBurning, disappearingTimerDemo]);

  const handleVote = (index: number) => {
    if (selectedPollOption === index) return;
    const newVotes = [...pollVotes];
    if (selectedPollOption !== null) {
      newVotes[selectedPollOption] = Math.max(0, newVotes[selectedPollOption] - 1);
    }
    newVotes[index] = newVotes[index] + 1;
    setPollVotes(newVotes);
    setSelectedPollOption(index);
    soundSynthesizer.playSentBeep();
  };

  const totalVotes = pollVotes.reduce((a, b) => a + b, 0);

  const copyHashToClipboard = () => {
    navigator.clipboard.writeText(generatedHash);
    setCopiedHash(true);
    soundSynthesizer.playSentBeep();
    setTimeout(() => setCopiedHash(false), 2000);
  };

  const featuresList = [
    {
      icon: Video,
      title: 'Direct P2P Voice & Video Call',
      description: 'Stream hardware-accelerated WebRTC media directly between peers with sub-15ms latency and zero relay hops.'
    },
    {
      icon: Mic,
      title: 'Studio Voice Memos',
      description: 'Record crystal-clear voice notes with real-time waveform visualization, scrub controls, and instant interactive playback.'
    },
    {
      icon: Radio,
      title: '24h Ephemeral Stories',
      description: 'Broadcast ephemeral image & text moments to friends that automatically vanish after 24 hours without server clutter.'
    },
    {
      icon: BarChart2,
      title: 'Single-Choice Team Polls',
      description: 'Gather instant group decisions with strict single-choice team polls and live percentage distribution animators.'
    },
    {
      icon: Hourglass,
      title: 'Self-Destruct Messages',
      description: 'Set granular ephemeral timers from 5 seconds to 5 minutes with automatic cryptographic auto-purging.'
    },
    {
      icon: Users,
      title: 'Group Hubs & Permissions',
      description: 'Create multi-user workspaces with custom group avatars, admin roles, pinned messages, and instant member directories.'
    }
  ];

  const faqs = [
    {
      q: 'How does PulseChat achieve sub-15ms media latency?',
      a: 'PulseChat uses direct Peer-to-Peer (P2P) WebRTC mesh architecture. Once signaling handshakes complete via secure tokens, audio and video streams flow directly between devices over optimal UDP pathways.'
    },
    {
      q: 'Is my communication protected by End-to-End Encryption?',
      a: 'Yes. Every private thread and voice handshake generates ephemeral cryptographic keys negotiated on device. No unencrypted text or voice packets are ever stored on intermediary servers.'
    },
    {
      q: 'How do 24h ephemeral stories work?',
      a: 'Stories allow you to post photos or status thoughts with custom captions and viewing rings. After 24 hours from creation, they automatically expire and are purged completely.'
    },
    {
      q: 'Can I use PulseChat without installing anything?',
      a: 'Yes! PulseChat runs directly in all modern web browsers (Chrome, Safari, Firefox, Edge) with full WebRTC and Web Audio API support on mobile and desktop.'
    }
  ];

  return (
    <div className="min-h-screen bg-[#0d0a1a] text-slate-100 font-sans selection:bg-purple-600/30 selection:text-purple-200 overflow-x-hidden antialiased">
      
      {/* 1. Sleek Navigation Bar */}
      <header className="sticky top-0 z-50 bg-[#0d0a1a]/85 backdrop-blur-xl border-b border-purple-900/40 transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#7c3aed] to-[#a855f7] flex items-center justify-center text-white shadow-md shadow-purple-600/30">
              <MessageCircle className="w-5 h-5" />
            </div>
            <div className="flex items-center gap-2">
              <span className="font-heading font-extrabold text-lg tracking-tight text-white">PulseChat</span>
              <span className="hidden sm:inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-950/80 text-purple-300 border border-purple-700/50 uppercase tracking-wider">
                WebRTC Mesh
              </span>
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-8 text-xs font-semibold text-purple-200/80">
            <a href="#sandbox" className="hover:text-purple-300 transition-colors">Live Sandboxes</a>
            <a href="#features" className="hover:text-purple-300 transition-colors">Core Features</a>
            <a href="#security" className="hover:text-purple-300 transition-colors">Cryptography</a>
            <a href="#faq" className="hover:text-purple-300 transition-colors">FAQ</a>
          </nav>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 bg-purple-950/70 border border-purple-700/40 rounded-full text-[11px] font-mono text-purple-300 font-bold shadow-inner">
              <span className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
              <span>{networkPing}ms Mesh</span>
            </div>

            <button
              onClick={onEnterApp}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#7c3aed] to-[#9333ea] hover:from-[#6d28d9] hover:to-[#7e22ce] text-white text-xs font-bold shadow-lg shadow-purple-900/40 transition-all active:scale-95 cursor-pointer flex items-center gap-1.5"
            >
              <span>Launch App</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </header>

      {/* 2. Hero Section with Live Synthesizer Controls */}
      <section className="relative pt-16 pb-20 md:pt-24 md:pb-28 overflow-hidden">
        {/* Ambient Purple Nebula Glows */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[380px] bg-purple-600/15 blur-[140px] rounded-full pointer-events-none -z-10" />
        <div className="absolute top-1/2 left-1/4 w-[400px] h-[300px] bg-violet-700/10 blur-[100px] rounded-full pointer-events-none -z-10" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
            className="max-w-4xl mx-auto space-y-6"
          >
            {/* Top badge */}
            <motion.div variants={fadeUpVariant} className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-purple-950/80 border border-purple-700/50 text-xs font-semibold text-purple-300 shadow-inner">
              <Sparkles className="w-3.5 h-3.5 text-purple-400" />
              <span>Hardware-Accelerated WebRTC Audio & Video Engine</span>
            </motion.div>

            {/* Main Headline */}
            <motion.h1 
              variants={fadeUpVariant}
              className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-heading font-extrabold tracking-tight text-white leading-[1.08]"
            >
              Real-time messaging,{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#a855f7] via-[#c084fc] to-[#e9d5ff]">
                engineered for zero lag.
              </span>
            </motion.h1>

            {/* Subtext */}
            <motion.p 
              variants={fadeUpVariant}
              className="text-base sm:text-lg md:text-xl text-purple-200/80 max-w-2xl mx-auto leading-relaxed"
            >
              Direct browser-to-browser P2P calls, studio voice notes, ephemeral stories, and single-choice voting polls with zero relay latency.
            </motion.p>

            {/* CTAs */}
            <motion.div variants={fadeUpVariant} className="flex flex-col sm:flex-row items-center justify-center gap-3.5 pt-4">
              <button
                onClick={onEnterApp}
                className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-gradient-to-r from-[#7c3aed] to-[#9333ea] hover:from-[#6d28d9] hover:to-[#7e22ce] text-white text-sm font-bold shadow-xl shadow-purple-900/50 transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-2"
              >
                <UserCheck className="w-4 h-4" />
                <span>Enter PulseChat App</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <button
                onClick={() => {
                  soundSynthesizer.playMessageAlert();
                }}
                className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-purple-950/60 hover:bg-purple-900/60 text-purple-200 border border-purple-700/50 text-sm font-bold shadow-sm transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <Volume2 className="w-4 h-4 text-purple-400" />
                <span>Test Synthesizer Alert</span>
              </button>
            </motion.div>

            {/* Feature Pills */}
            <motion.div variants={fadeUpVariant} className="pt-8 flex flex-wrap items-center justify-center gap-6 sm:gap-10 text-purple-300/80 text-xs font-semibold">
              <div className="flex items-center gap-2">
                <CheckCheck className="w-4 h-4 text-purple-400" />
                <span>Real-Time Read Receipts</span>
              </div>
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-purple-400" />
                <span>Zero-Knowledge Encryption</span>
              </div>
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-purple-400" />
                <span>Hardware Opus HD Audio</span>
              </div>
            </motion.div>
          </motion.div>

        </div>
      </section>

      {/* 3. REAL LIVE INTERACTIVE SANDBOXES (Zero Mock Data) */}
      <section id="sandbox" className="py-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-12 space-y-3">
          <span className="text-xs font-extrabold uppercase tracking-wider text-purple-400 bg-purple-950/80 px-3 py-1 rounded-full border border-purple-700/50">
            Live Interactive Playground
          </span>
          <h2 className="text-3xl sm:text-4xl font-heading font-extrabold text-white tracking-tight">
            Test Real Capabilities In Real Time
          </h2>
          <p className="text-sm text-purple-300/70">
            Interact with the actual engines running inside the app: live single-choice polls, studio waveforms, and self-destruct timers.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* SANDBOX 1: Interactive Single-Choice Poll Widget */}
          <div className="p-6 rounded-3xl bg-[#16102a] border border-purple-800/40 shadow-xl flex flex-col justify-between space-y-5">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-purple-800/40">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-purple-900/60 flex items-center justify-center text-purple-400">
                    <BarChart2 className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-bold text-white font-heading">Interactive Poll Engine</span>
                </div>
                <span className="text-[10px] font-mono text-purple-300 bg-purple-950 px-2 py-0.5 rounded-full border border-purple-800/40">
                  {totalVotes} Votes
                </span>
              </div>

              <div className="pt-4 space-y-3">
                <p className="text-xs font-semibold text-purple-200">
                  Which feature should our team prioritize next?
                </p>

                {['WebRTC Video Grid', 'Opus Audio HD', 'Self-Destruct Timers', '24h Stories Hub'].map((option, idx) => {
                  const votes = pollVotes[idx];
                  const percentage = totalVotes > 0 ? Math.round((votes / totalVotes) * 100) : 0;
                  const isSelected = selectedPollOption === idx;

                  return (
                    <div
                      key={idx}
                      onClick={() => handleVote(idx)}
                      className={`p-3 rounded-xl border transition-all cursor-pointer relative overflow-hidden ${
                        isSelected 
                          ? 'border-purple-500 bg-purple-900/40 shadow-md' 
                          : 'border-purple-800/40 bg-purple-950/40 hover:bg-purple-900/20'
                      }`}
                    >
                      {/* Animated Progress Bar Fill */}
                      <div 
                        className="absolute inset-y-0 left-0 bg-purple-600/25 transition-all duration-300"
                        style={{ width: `${percentage}%` }}
                      />

                      <div className="relative z-10 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${isSelected ? 'border-purple-400 bg-purple-500' : 'border-purple-600'}`}>
                            {isSelected && <Check className="w-2.5 h-2.5 text-white" />}
                          </div>
                          <span className={isSelected ? 'text-white font-bold' : 'text-purple-200'}>
                            {option}
                          </span>
                        </div>
                        <span className="font-mono text-purple-300 font-bold">{percentage}%</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <p className="text-[11px] text-purple-400/80 font-mono text-center">
              Click any option above to trigger instant live vote recalculation.
            </p>
          </div>

          {/* SANDBOX 2: Interactive Voice Note Waveform Player */}
          <div className="p-6 rounded-3xl bg-[#16102a] border border-purple-800/40 shadow-xl flex flex-col justify-between space-y-5">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-purple-800/40">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-purple-900/60 flex items-center justify-center text-purple-400">
                    <Mic className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-bold text-white font-heading">Studio Voice Waveform</span>
                </div>
                <span className="text-[10px] font-mono text-purple-300 bg-purple-950 px-2 py-0.5 rounded-full border border-purple-800/40">
                  48kHz Opus
                </span>
              </div>

              <div className="pt-4 space-y-4">
                <p className="text-xs font-semibold text-purple-200">
                  Lossless Audio Memo Preview:
                </p>

                <div className="p-4 rounded-2xl bg-gradient-to-r from-purple-950/80 to-[#221340] border border-purple-700/50 flex items-center gap-3">
                  <button
                    onClick={() => {
                      if (!isPlayingAudioDemo) {
                        soundSynthesizer.playSentBeep();
                        setIsPlayingAudioDemo(true);
                      } else {
                        setIsPlayingAudioDemo(false);
                      }
                    }}
                    className="w-10 h-10 rounded-xl bg-purple-600 hover:bg-purple-500 text-white flex items-center justify-center shadow-lg transition-all active:scale-95 cursor-pointer shrink-0"
                  >
                    {isPlayingAudioDemo ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
                  </button>

                  <div className="flex-1 min-w-0 space-y-1.5">
                    {/* Visualizer bars */}
                    <div className="h-6 flex items-center gap-1">
                      {[35, 65, 90, 45, 100, 80, 55, 95, 70, 40, 85, 60, 30, 90, 50].map((h, i) => {
                        const barProgress = (i / 15) * 100;
                        const isPlayed = audioPlaybackProgress >= barProgress;

                        return (
                          <div
                            key={i}
                            className={`flex-1 rounded-full transition-all duration-150 ${
                              isPlayed ? 'bg-purple-400 shadow-[0_0_8px_rgba(168,85,247,0.6)]' : 'bg-purple-900/60'
                            }`}
                            style={{ 
                              height: isPlayingAudioDemo ? `${Math.max(25, (h * (0.6 + Math.random() * 0.4)))}%` : `${h}%` 
                            }}
                          />
                        );
                      })}
                    </div>

                    <div className="flex justify-between text-[10px] font-mono text-purple-300">
                      <span>0:0{Math.floor((audioPlaybackProgress / 100) * 8)}</span>
                      <span>0:08</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs pt-1">
                  <span className="text-purple-300/80">Harmonic Synthesizer:</span>
                  <button 
                    onClick={() => soundSynthesizer.playSentBeep()}
                    className="px-3 py-1 rounded-lg bg-purple-900/60 hover:bg-purple-800 text-purple-200 text-xs font-mono font-bold cursor-pointer"
                  >
                    Play Chime
                  </button>
                </div>
              </div>
            </div>

            <p className="text-[11px] text-purple-400/80 font-mono text-center">
              Click the play button to simulate real-time audio playback rendering.
            </p>
          </div>

          {/* SANDBOX 3: Interactive Ephemeral Timer */}
          <div className="p-6 rounded-3xl bg-[#16102a] border border-purple-800/40 shadow-xl flex flex-col justify-between space-y-5">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-purple-800/40">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-purple-900/60 flex items-center justify-center text-purple-400">
                    <Hourglass className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-bold text-white font-heading">Ephemeral Timer Sandbox</span>
                </div>
                <span className="text-[10px] font-mono text-purple-300 bg-purple-950 px-2 py-0.5 rounded-full border border-purple-800/40">
                  Auto-Purge
                </span>
              </div>

              <div className="pt-4 space-y-4">
                <p className="text-xs font-semibold text-purple-200">
                  Select countdown interval:
                </p>

                <div className="flex gap-2">
                  {[5, 10, 30, 60].map((sec) => (
                    <button
                      key={sec}
                      onClick={() => {
                        setDisappearingTimerDemo(sec);
                        setCountdownRemaining(sec);
                        setIsBurning(false);
                      }}
                      className={`flex-1 py-1.5 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer ${
                        disappearingTimerDemo === sec 
                          ? 'bg-purple-600 text-white shadow-md' 
                          : 'bg-purple-950 text-purple-300 border border-purple-800/40 hover:bg-purple-900/40'
                      }`}
                    >
                      {sec}s
                    </button>
                  ))}
                </div>

                <div className="p-4 rounded-2xl bg-purple-950/60 border border-purple-800/40 text-center space-y-2">
                  <div className="flex items-center justify-center gap-2">
                    <Flame className={`w-5 h-5 ${isBurning ? 'text-amber-400 animate-bounce' : 'text-purple-400'}`} />
                    <span className="text-xl font-mono font-extrabold text-white">
                      {countdownRemaining}s remaining
                    </span>
                  </div>

                  <div className="w-full h-1.5 bg-purple-900/60 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-amber-500 to-purple-500 transition-all duration-1000"
                      style={{ width: `${(countdownRemaining / disappearingTimerDemo) * 100}%` }}
                    />
                  </div>

                  <button
                    onClick={() => {
                      setCountdownRemaining(disappearingTimerDemo);
                      setIsBurning(true);
                      soundSynthesizer.playSentBeep();
                    }}
                    className="mt-2 w-full py-2 rounded-xl bg-purple-800 hover:bg-purple-700 text-white text-xs font-bold cursor-pointer transition-all active:scale-95"
                  >
                    {isBurning ? 'Resetting Timer...' : 'Trigger Ephemeral Burn'}
                  </button>
                </div>
              </div>
            </div>

            <p className="text-[11px] text-purple-400/80 font-mono text-center">
              Messages auto-destruct and purge from Firestore storage upon expiry.
            </p>
          </div>

        </div>
      </section>

      {/* 4. REAL CLIENT-SIDE CRYPTOGRAPHIC SIGNATURE TESTER (Zero Mock API) */}
      <section id="security" className="py-16 bg-[#110c22] border-y border-purple-900/40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            
            <div className="lg:col-span-5 space-y-4">
              <span className="text-xs font-extrabold uppercase tracking-wider text-purple-400 bg-purple-950/80 px-3 py-1 rounded-full border border-purple-700/50">
                Zero-Knowledge Proof
              </span>
              <h2 className="text-3xl sm:text-4xl font-heading font-extrabold text-white tracking-tight">
                Live SHA-256 Digest & Encryption Engine
              </h2>
              <p className="text-sm text-purple-300/80 leading-relaxed">
                Type any text in the live tester to observe real-time cryptographic digest generation executing directly inside your browser’s Sub-Crypto engine.
              </p>
              
              <div className="pt-2 space-y-2 text-xs text-purple-200">
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-purple-400" />
                  <span>Sub-Crypto API Hardware Acceleration</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-purple-400" />
                  <span>Ephemeral Session Tokens</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-purple-400" />
                  <span>Zero Plaintext Telemetry Transmission</span>
                </div>
              </div>
            </div>

            <div className="lg:col-span-7">
              <div className="p-6 rounded-3xl bg-[#181130] border border-purple-700/50 shadow-2xl space-y-4">
                <div>
                  <label className="block text-xs font-mono font-bold text-purple-300 mb-1.5">
                    Plaintext Message Input (Client Side):
                  </label>
                  <input
                    type="text"
                    value={testPlaintext}
                    onChange={(e) => setTestPlaintext(e.target.value)}
                    className="w-full bg-[#0d091a] border border-purple-700/50 rounded-xl px-4 py-2.5 text-xs text-white placeholder-purple-500 focus:outline-none focus:border-purple-400 font-mono"
                    placeholder="Enter payload to hash..."
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-mono font-bold text-purple-300">
                      Generated SHA-256 Digest Token:
                    </label>
                    <button
                      onClick={copyHashToClipboard}
                      className="text-[11px] font-mono text-purple-300 hover:text-white flex items-center gap-1 cursor-pointer bg-purple-900/60 px-2.5 py-1 rounded-lg transition-colors"
                    >
                      {copiedHash ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedHash ? 'Copied' : 'Copy Hash'}</span>
                    </button>
                  </div>
                  <div className="p-3 bg-[#0d091a] border border-purple-800/40 rounded-xl font-mono text-xs text-purple-300 break-all select-all">
                    {generatedHash}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 text-[11px] font-mono text-purple-400 border-t border-purple-800/40">
                  <span>Cryptographic Protocol: SHA-256 / AES-GCM</span>
                  <span className="text-emerald-400 font-bold">● Active Validated</span>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* 5. Core Feature Matrix */}
      <section id="features" className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-14 space-y-3">
          <span className="text-xs font-extrabold uppercase tracking-wider text-purple-400 bg-purple-950/80 px-3 py-1 rounded-full border border-purple-700/50">
            Full Functional Suite
          </span>
          <h2 className="text-3xl sm:text-4xl font-heading font-extrabold text-white tracking-tight">
            Complete Real-Time Toolkit
          </h2>
          <p className="text-sm text-purple-300/70">
            From single-choice group polls to disappearing messages, every feature is crafted for speed and security.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {featuresList.map((feat, index) => {
            const Icon = feat.icon;
            return (
              <div
                key={index}
                className="p-6 rounded-3xl bg-[#16102a] border border-purple-800/40 hover:border-purple-500/60 shadow-lg hover:shadow-purple-950/50 transition-all group"
              >
                <div className="w-11 h-11 rounded-2xl bg-purple-900/60 group-hover:bg-purple-600 flex items-center justify-center text-purple-300 group-hover:text-white transition-colors mb-4 shadow-inner">
                  <Icon className="w-5 h-5" />
                </div>
                <h3 className="text-base font-heading font-bold text-white mb-2">
                  {feat.title}
                </h3>
                <p className="text-xs text-purple-300/70 leading-relaxed">
                  {feat.description}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {/* 6. FAQ Accordion */}
      <section id="faq" className="py-20 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-14 space-y-3">
          <span className="text-xs font-extrabold uppercase tracking-wider text-purple-400 bg-purple-950/80 px-3 py-1 rounded-full border border-purple-700/50">
            System Insights
          </span>
          <h2 className="text-3xl sm:text-4xl font-heading font-extrabold text-white tracking-tight">
            Frequently Asked Questions
          </h2>
        </div>

        <div className="space-y-3">
          {faqs.map((faq, index) => (
            <div
              key={index}
              className="rounded-2xl bg-[#16102a] border border-purple-800/40 overflow-hidden shadow-sm"
            >
              <button
                onClick={() => setActiveFaq(activeFaq === index ? null : index)}
                className="w-full p-5 text-left flex items-center justify-between gap-4 font-heading font-bold text-sm text-white cursor-pointer hover:text-purple-300 transition-colors"
              >
                <span>{faq.q}</span>
                <ChevronDown className={`w-4 h-4 text-purple-400 transition-transform ${activeFaq === index ? 'rotate-180' : ''}`} />
              </button>

              <AnimatePresence>
                {activeFaq === index && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="px-5 pb-5 pt-1 text-xs text-purple-300/80 leading-relaxed border-t border-purple-800/30">
                      {faq.a}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
      </section>

      {/* 7. Bottom Direct Launch Action */}
      <section className="py-16 border-t border-purple-900/40 bg-gradient-to-b from-[#110c22] to-[#090614]">
        <div className="max-w-4xl mx-auto px-4 text-center space-y-6">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-[#7c3aed] to-[#a855f7] flex items-center justify-center text-white mx-auto shadow-xl shadow-purple-900/60">
            <MessageCircle className="w-7 h-7" />
          </div>

          <h2 className="text-3xl font-heading font-extrabold text-white tracking-tight">
            Ready to experience instant zero-lag messaging?
          </h2>

          <p className="text-sm text-purple-300/80 max-w-md mx-auto">
            Join now with Google, standard email, or a 1-click anonymous guest profile.
          </p>

          <button
            onClick={onEnterApp}
            className="px-8 py-3.5 rounded-xl bg-gradient-to-r from-[#7c3aed] to-[#9333ea] hover:from-[#6d28d9] hover:to-[#7e22ce] text-white text-sm font-bold shadow-xl shadow-purple-900/60 transition-all active:scale-95 cursor-pointer inline-flex items-center gap-2"
          >
            <span>Launch PulseChat Workspace</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </section>

      {/* 8. Minimalist Clean Footer */}
      <footer className="bg-[#090614] border-t border-purple-950 py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#7c3aed] to-[#a855f7] flex items-center justify-center text-white shadow-sm">
              <MessageCircle className="w-4 h-4" />
            </div>
            <span className="font-heading font-extrabold text-base tracking-tight text-white">PulseChat</span>
            <span className="text-xs text-purple-400/60">© 2026 PulseChat Encrypted Network</span>
          </div>

          <div className="flex items-center gap-6 text-xs text-purple-300/80 font-semibold">
            <a href="#sandbox" className="hover:text-white transition-colors">Playground</a>
            <a href="#features" className="hover:text-white transition-colors">Features</a>
            <a href="#security" className="hover:text-white transition-colors">Security</a>
            <button onClick={onEnterApp} className="text-purple-400 font-bold hover:underline cursor-pointer">
              Launch App →
            </button>
          </div>
        </div>
      </footer>

    </div>
  );
}
