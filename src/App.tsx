/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useState, useRef } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, query, where, onSnapshot, doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db, OperationType, handleFirestoreError } from './lib/firebase';
import { useAppStore } from './store/useAppStore';
import { useWebRTC } from './hooks/useWebRTC';
import { UserProfile, ChatThread, CallHandshake, FriendRequest } from './types';
import LoginScreen from './components/LoginScreen';
import LandingPage from './components/LandingPage';
import Sidebar from './components/Sidebar';
import ChatArea from './components/ChatArea';
import CallingScreen from './components/CallingScreen';
import SettingsRightPanel from './components/SettingsRightPanel';
import LocalAiPage from './components/LocalAiPage';
import { ShieldCheck, MessageCircle, Lock, Globe, Sparkles, Cpu, Hash, Wifi } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { soundSynthesizer } from './lib/sounds';
import { THEME_PRESETS, WALLPAPER_PRESETS, getSafeTheme, getSafeWallpaperUrl } from './lib/theme';

export default function App() {
  const { 
    user, 
    loading, 
    activeChatPartner, 
    activeCall,
    chats,
    allUsers,
    themeMode,
    graphicsMode,
    wallpaperPattern,
    customWallpaperUrl,
    chatTransparency,
    chatBlur,
    bgBrightness,
    bgDimming,
    rightPanelView,
    localAiOpen,
    setLocalAiOpen,
    setUser, 
    setLoading, 
    setAllUsers, 
    setUsersError,
    setChats,
    setActiveCall,
    setFriendRequests,
    updateOnlineStatus,
    setActiveChat
  } = useAppStore();

  const webRTC = useWebRTC();
  const [showLanding, setShowLanding] = useState(false);
  const [inAppNotification, setInAppNotification] = useState<{
    id: string;
    senderId: string;
    senderName: string;
    senderPhoto: string;
    text: string;
    chatId: string;
  } | null>(null);

  const activeTheme = getSafeTheme(themeMode);
  const activeWallpaperUrl = getSafeWallpaperUrl(wallpaperPattern, customWallpaperUrl);
  const isPotato = graphicsMode === 'potato';
  // Lighter graphics = cheaper blur everywhere (all glass panels read --glass-blur)
  const effectiveBlur = isPotato ? 0 : graphicsMode === 'balanced' ? Math.min(chatBlur, 6) : chatBlur;

  const processedMessageIds = useRef<Set<string>>(new Set());
  const activeCallRef = useRef(activeCall);
  activeCallRef.current = activeCall;

  // 1. Auth & Profiles syncing listeners
  useEffect(() => {
    const safetyTimer = setTimeout(() => {
      setLoading(false);
    }, 1000);

    let unsubUsers: (() => void) | null = null;
    let unsubChats: (() => void) | null = null;
    let unsubCalls: (() => void) | null = null;
    let unsubRequests: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      clearTimeout(safetyTimer);
      if (firebaseUser) {
        try {
          // Sync active profile
          const userRef = doc(db, 'users', firebaseUser.uid);
          const userDoc = await getDoc(userRef).catch(() => null);

          if (userDoc && userDoc.exists()) {
            const profile = userDoc.data() as UserProfile;
            setUser(profile);
            localStorage.setItem('pulsechat_cached_user', JSON.stringify(profile));
            updateOnlineStatus(true).catch(() => {});
          } else {
            let cachedName = firebaseUser.displayName || 'User';
            let cachedPhoto = firebaseUser.photoURL || `https://api.dicebear.com/7.x/adventurer/svg?seed=${firebaseUser.uid}`;
            try {
              const cached = localStorage.getItem('pulsechat_cached_user');
              if (cached) {
                const parsed = JSON.parse(cached);
                if (parsed.uid === firebaseUser.uid) {
                  if (parsed.displayName) cachedName = parsed.displayName;
                  if (parsed.photoURL) cachedPhoto = parsed.photoURL;
                }
              }
            } catch {}

            const fallbackProfile: UserProfile = {
              uid: firebaseUser.uid,
              displayName: cachedName,
              email: firebaseUser.email || '',
              photoURL: cachedPhoto,
              online: true,
              lastSeen: serverTimestamp() as any
            };
            setUser(fallbackProfile);
            await setDoc(userRef, fallbackProfile, { merge: true }).catch((err) => {
              console.warn('Initial profile create notice:', err);
            });
          }
        } catch (e) {
          console.warn('Error fetching user profile:', e);
        }
        
        try {
          // Listen to users directory
          if (!unsubUsers) {
            const usersRef = collection(db, 'users');
            unsubUsers = onSnapshot(usersRef, (snapshot) => {
              const list: UserProfile[] = [];
              snapshot.forEach((d) => list.push(d.data() as UserProfile));
              setAllUsers(list);
            }, (err) => {
              console.warn('Users listener notice:', err?.message || err);
              setUsersError(err?.code === 'permission-denied'
                ? 'Firestore rules block reading users (permission-denied).'
                : (err?.message || 'Could not load contacts.'));
            });
          }

          // Sync chats
          if (!unsubChats) {
            const chatsRef = collection(db, 'chats');
            const chatsQuery = query(chatsRef, where('participants', 'array-contains', firebaseUser.uid));
            unsubChats = onSnapshot(chatsQuery, (snapshot) => {
              const list: ChatThread[] = [];
              snapshot.forEach((d) => list.push(d.data() as ChatThread));
              setChats(list);
            }, (err) => {
              console.warn('Chats listener notice:', err?.message || err);
            });
          }

          // Voice/Video Call signaling listener
          if (!unsubCalls) {
            const callsRef = collection(db, 'calls');
            const callsQuery = query(
              callsRef, 
              where('receiverId', '==', firebaseUser.uid), 
              where('status', '==', 'ringing')
            );
            unsubCalls = onSnapshot(callsQuery, (snapshot) => {
              if (!activeCallRef.current && !snapshot.empty) {
                const incomingCall = snapshot.docs[0].data() as CallHandshake;
                setActiveCall(incomingCall);
              }
            }, (err) => {
              console.warn('Calls listener notice:', err?.message || err);
            });
          }

          // Friend Requests listener
          if (!unsubRequests) {
            const friendRequestsRef = collection(db, 'friendRequests');
            const friendRequestsQuery = query(
              friendRequestsRef, 
              where('participants', 'array-contains', firebaseUser.uid)
            );
            unsubRequests = onSnapshot(friendRequestsQuery, (snapshot) => {
              const list: FriendRequest[] = [];
              snapshot.forEach((d) => list.push(d.data() as FriendRequest));
              setFriendRequests(list);
            }, (err) => {
              console.warn('Friend requests listener notice:', err?.message || err);
            });
          }
        } catch (subErr) {
          console.warn('Subscription error:', subErr);
        }

        setLoading(false);
      } else {
        setUser(null);
        setLoading(false);
      }
    });

    return () => {
      clearTimeout(safetyTimer);
      unsubscribeAuth();
      if (unsubUsers) unsubUsers();
      if (unsubChats) unsubChats();
      if (unsubCalls) unsubCalls();
      if (unsubRequests) unsubRequests();
    };
  }, [setUser, setLoading, setAllUsers, setUsersError, setChats, setActiveCall, setFriendRequests, updateOnlineStatus]);

  // 5. Connection presence listeners
  useEffect(() => {
    if (!user) return;

    const handleBeforeUnload = () => {
      updateOnlineStatus(false);
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [user, updateOnlineStatus]);

  // Request browser local OS Web notification permissions dynamically
  useEffect(() => {
    if (user && 'Notification' in window) {
      if (Notification.permission === 'default') {
        Notification.requestPermission();
      }
    }
  }, [user]);

  // Handle auto-closing modular drop-down message banners
  useEffect(() => {
    if (inAppNotification) {
      const timer = setTimeout(() => {
        setInAppNotification(null);
      }, 5500);
      return () => clearTimeout(timer);
    }
  }, [inAppNotification]);

  // Standard device push alert notifier
  const triggerSystemNotification = (title: string, body: string, iconUrl?: string) => {
    if (!('Notification' in window)) return;
    if (Notification.permission === 'granted') {
      const options: any = {
        body: body,
        icon: iconUrl || 'https://api.dicebear.com/7.x/adventurer/svg?seed=pulse',
        tag: 'pulsechat-alert',
        renotify: true,
        silent: true // Silent to allow custom harmonic syth sounds to emit without overlapping
      };
      try {
        new Notification(title, options);
      } catch (e) {
        console.warn('Native notification instance blocked:', e);
      }
    }
  };

  // Manage Sound Ringer and System Notifications for Calls
  useEffect(() => {
    if (activeCall) {
      if (activeCall.status === 'ringing') {
        const isOutgoing = activeCall.callerId === user?.uid;
        soundSynthesizer.startRingingLoop(isOutgoing);

        if (!isOutgoing) {
          triggerSystemNotification(
            `Incoming ${activeCall.type === 'video' ? '📺 Video' : '📞 Voice'} Call`,
            `${activeCall.callerName} is calling you. Click to answer!`,
            activeCall.callerPhoto
          );
        }
      } else {
        soundSynthesizer.stopRingingLoop();
      }
    } else {
      soundSynthesizer.stopRingingLoop();
    }
    
    return () => {
      soundSynthesizer.stopRingingLoop();
    };
  }, [activeCall, user?.uid]);

  const activeListenersRef = useRef<Map<string, () => void>>(new Map());

  // Listen to incoming messages for OS & custom banner notifications efficiently
  useEffect(() => {
    if (!user) return;

    const appLoadTime = Date.now();

    // Attach listeners only for new chat threads
    chats.forEach((chat) => {
      const chatId = chat.id;
      if (activeListenersRef.current.has(chatId)) return;

      const messagesRef = collection(db, 'chats', chatId, 'messages');
      const q = query(messagesRef);

      const unsubscribe = onSnapshot(q, (snapshot) => {
        snapshot.docChanges().forEach((change) => {
          if (change.type === 'added') {
            const msgId = change.doc.id;
            
            if (processedMessageIds.current.has(msgId)) {
              return;
            }
            processedMessageIds.current.add(msgId);

            const msgData = change.doc.data();
            const msgTime = msgData.timestamp?.toDate ? msgData.timestamp.toDate().getTime() : Date.now();

            if (
              msgData.senderId !== user.uid && 
              msgTime > appLoadTime - 6000
            ) {
              soundSynthesizer.playMessageAlert();

              const cachedSender = allUsers.find(u => u.uid === msgData.senderId);
              const sName = cachedSender?.displayName || 'Someone';
              const sPhoto = cachedSender?.photoURL || `https://api.dicebear.com/7.x/adventurer/svg?seed=${msgData.senderId}`;

              triggerSystemNotification(sName, msgData.text, sPhoto);

              if (activeChatPartner?.uid !== msgData.senderId) {
                setInAppNotification({
                  id: change.doc.id,
                  senderId: msgData.senderId,
                  senderName: sName,
                  senderPhoto: sPhoto,
                  text: msgData.text,
                  chatId
                });
              }
            }
          }
        });
      }, () => {});

      activeListenersRef.current.set(chatId, unsubscribe);
    });
  }, [chats, user?.uid, activeChatPartner?.uid, allUsers]);

  // Clean up all message listeners on unmount
  useEffect(() => {
    return () => {
      activeListenersRef.current.forEach((unsub) => unsub());
      activeListenersRef.current.clear();
    };
  }, []);

  // Handle dial initiation from active chat header UI trigger
  const handleVoiceOrVideoCall = (type: 'voice' | 'video') => {
    if (activeChatPartner) {
      webRTC.initiateCall(activeChatPartner.uid, type, activeChatPartner.displayName);
    }
  };

  // Ultra-Premium Obsidian & Amethyst Loading Screen (Lag-Free GPU Accelerated)
  if (loading) {
    return (
      <div className="min-h-screen bg-[#090714] bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(124,58,237,0.25),rgba(255,255,255,0))] flex flex-col items-center justify-center font-sans text-white antialiased p-6 relative overflow-hidden select-none">
        
        {/* Subtle Ambient Glow Orbs (GPU Layer) */}
        <div className="absolute w-72 h-72 rounded-full bg-purple-600/15 blur-[100px] pointer-events-none -top-10 -left-10" />
        <div className="absolute w-80 h-80 rounded-full bg-violet-500/15 blur-[120px] pointer-events-none -bottom-10 -right-10" />

        <div className="relative z-10 flex flex-col items-center max-w-sm w-full text-center">
          
          {/* Multi-Ring Glowing Amethyst Orbital Crest */}
          <div className="relative flex items-center justify-center mb-8">
            {/* Outer Glowing Pulse Aura */}
            <div className="absolute w-28 h-28 rounded-full bg-purple-600/20 blur-xl animate-pulse" />

            {/* Precision Outer Spinner Ring */}
            <div 
              className="w-24 h-24 rounded-full border-[2.5px] border-purple-500/20 border-t-[#a855f7] border-r-[#7c3aed] animate-spin" 
              style={{ animationDuration: '1.6s', willChange: 'transform' }} 
            />

            {/* Inner Reverse Spinner Ring */}
            <div 
              className="absolute w-18 h-18 rounded-full border-2 border-violet-400/20 border-b-[#c084fc] border-l-[#8b5cf6] animate-spin" 
              style={{ animationDirection: 'reverse', animationDuration: '1.1s', willChange: 'transform' }} 
            />

            {/* Center Amethyst Monogram Card */}
            <div className="absolute w-12 h-12 rounded-2xl bg-gradient-to-br from-[#7c3aed] via-[#6d28d9] to-[#4c1d95] flex items-center justify-center text-white shadow-lg shadow-purple-900/60 border border-purple-300/30">
              <MessageCircle className="w-6 h-6 text-white drop-shadow-md" />
            </div>
          </div>

          {/* Typography & Status Badges */}
          <div className="space-y-3 w-full">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-950/60 border border-purple-500/30 text-[11px] font-mono font-bold text-purple-300 shadow-inner">
              <Sparkles className="w-3 h-3 text-purple-400 animate-spin" style={{ animationDuration: '4s' }} />
              <span>PULSECHAT SECURE ENGINE</span>
            </div>

            <h3 className="text-xl font-heading font-extrabold text-white tracking-tight">
              Initializing Workspace
            </h3>

            <p className="text-xs text-purple-200/70 font-mono">
              Synchronizing Encrypted Channels & P2P Nodes...
            </p>

            {/* Shimmering Progress Bar */}
            <div className="w-56 h-1.5 bg-purple-950/80 rounded-full mx-auto overflow-hidden border border-purple-500/20 p-0.5 mt-2">
              <div className="h-full bg-gradient-to-r from-[#7c3aed] via-[#a855f7] to-[#c084fc] rounded-full animate-pulse w-4/5 shadow-[0_0_12px_rgba(168,85,247,0.8)]" />
            </div>

            {/* Security Pill Indicators */}
            <div className="pt-6 flex items-center justify-center gap-4 text-[10px] font-mono text-purple-300/60">
              <div className="flex items-center gap-1">
                <Lock className="w-3 h-3 text-purple-400" />
                <span>Zero-Knowledge</span>
              </div>
              <span className="text-purple-700">•</span>
              <div className="flex items-center gap-1">
                <Wifi className="w-3 h-3 text-purple-400" />
                <span>Sub-15ms Mesh</span>
              </div>
            </div>
          </div>

        </div>
      </div>
    );
  }

  // Auth Guard
  if (!user) {
    if (showLanding) {
      return <LandingPage onEnterApp={() => setShowLanding(false)} />;
    }
    return <LoginScreen onBackToLanding={() => setShowLanding(true)} />;
  }

  const alpha = (chatTransparency / 100).toFixed(2);
  const cardBgStyle = `rgba(${activeTheme.cardBgBase}, ${alpha})`;
  const headerBgStyle = `rgba(${activeTheme.headerBgBase}, ${Math.min(1, Number(alpha) + 0.1).toFixed(2)})`;
  const inputBgStyle = `rgba(${activeTheme.inputBgBase}, ${Math.min(1, Number(alpha) + 0.15).toFixed(2)})`;
  const popoverBgStyle = `rgba(${activeTheme.popoverBgBase}, ${Math.min(1, Number(alpha) + 0.2).toFixed(2)})`;

  return (
    <div 
      className={`w-screen h-screen flex flex-col overflow-hidden select-none font-sans relative ${
        activeTheme.isDark ? 'dark' : ''
      }`}
      style={{ 
        backgroundColor: activeTheme.bgMain,
        ['--glass-blur' as any]: `${effectiveBlur}px`,
        ['--glass-opacity' as any]: alpha,
        ['--card-bg-base' as any]: activeTheme.cardBgBase,
        ['--header-bg-base' as any]: activeTheme.headerBgBase,
        ['--input-bg-base' as any]: activeTheme.inputBgBase,
        ['--popover-bg-base' as any]: activeTheme.popoverBgBase,
        ['--accent-color' as any]: activeTheme.accentColor,
        ['--accent-hover' as any]: activeTheme.accentHover,
        ['--accent-glow' as any]: activeTheme.accentGlow,
        ['--border-color' as any]: activeTheme.borderColor,
        ['--text-primary' as any]: activeTheme.primaryText,
        ['--text-secondary' as any]: activeTheme.secondaryText,
        ['--msg-outgoing-bg' as any]: activeTheme.msgOutgoingBg,
        ['--msg-outgoing-text' as any]: activeTheme.msgOutgoingText,
        ['--msg-incoming-bg' as any]: activeTheme.msgIncomingBg,
        ['--msg-incoming-text' as any]: activeTheme.msgIncomingText,
        ['--panel-bg' as any]: cardBgStyle,
        ['--header-bg' as any]: headerBgStyle,
        ['--input-bg' as any]: inputBgStyle,
        ['--popover-bg' as any]: popoverBgStyle,
      }}
    >
      {/* Background Wallpaper Photo Layer */}
      {activeWallpaperUrl && !isPotato && (
        <div className="fixed inset-0 overflow-hidden pointer-events-none select-none z-0">
          <img 
            src={activeWallpaperUrl} 
            alt="Chat Background"
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover transition-[filter] duration-150"
            style={{ 
              filter: `blur(${effectiveBlur}px) brightness(${(bgBrightness / 100).toFixed(2)}) contrast(1.02)`,
              transform: effectiveBlur > 0 ? `scale(${1 + Math.min(0.08, effectiveBlur * 0.003)})` : 'none',
              willChange: isPotato ? 'auto' : 'filter, transform'
            }}
          />
          {/* User-controlled darkness & dimming overlay layer */}
          <div 
            className="absolute inset-0 pointer-events-none transition-colors duration-200"
            style={{ 
              backgroundColor: `rgba(0, 0, 0, ${(bgDimming / 100).toFixed(2)})`
            }}
          />
        </div>
      )}

      {/* 1. WebRTC Signaling Calling Screen Overlay */}
      <CallingScreen 
        localStream={webRTC.localStream}
        remoteStream={webRTC.remoteStream}
        isMuted={webRTC.isMuted}
        isCameraOff={webRTC.isCameraOff}
        getFormattedDuration={webRTC.getFormattedDuration}
        acceptIncomingCall={webRTC.acceptIncomingCall}
        rejectIncomingCall={webRTC.rejectIncomingCall}
        endActiveCall={webRTC.endActiveCall}
        toggleMic={webRTC.toggleMic}
        toggleCamera={webRTC.toggleCamera}
      />

      {/* 2. In-App Notification Drop-down Banner */}
      <AnimatePresence>
        {inAppNotification && (
          <motion.div
            initial={{ opacity: 0, y: -60, scale: 0.92, x: '-50%' }}
            animate={{ opacity: 1, y: 16, scale: 1, x: '-50%' }}
            exit={{ opacity: 0, y: -30, scale: 0.95, x: '-50%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 350 }}
            className="fixed top-4 left-1/2 z-[100] w-[calc(100%-2rem)] max-w-sm md:max-w-md bg-slate-900/90 text-white border border-purple-500/30 backdrop-blur-xl rounded-2xl p-3.5 shadow-2xl flex items-center gap-3.5 cursor-pointer hover:bg-slate-800 transition-all"
            onClick={() => {
              const partner = allUsers.find(u => u.uid === inAppNotification.senderId);
              if (partner) {
                setActiveChat(inAppNotification.chatId, partner);
              }
              setInAppNotification(null);
            }}
          >
            <div className="relative shrink-0">
              <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-purple-500"></span>
              </span>
              <img
                src={inAppNotification.senderPhoto}
                alt={inAppNotification.senderName}
                className="w-11 h-11 rounded-xl bg-slate-900 object-cover ring-2 ring-purple-500/30"
                referrerPolicy="no-referrer"
              />
            </div>
            
            <div className="flex-1 min-w-0 pr-2">
              <span className="text-[9px] text-purple-400 font-bold tracking-wider uppercase block mb-0.5">
                Pulse • New Message
              </span>
              <h4 className="text-xs font-bold text-white truncate">
                {inAppNotification.senderName}
              </h4>
              <p className="text-slate-300 text-xs truncate mt-0.5 font-sans">
                {inAppNotification.text}
              </p>
            </div>

            <button
              onClick={(e) => {
                e.stopPropagation();
                setInAppNotification(null);
              }}
              className="p-1 px-2 bg-white/10 hover:bg-rose-500/30 hover:text-rose-300 transition-colors text-slate-300 rounded-lg text-xs font-mono font-bold cursor-pointer shrink-0"
              title="Close Banner"
            >
              ×
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 3. Edge-to-Edge Glass Main Container */}
      <main 
        id="app-container"
        className="w-full h-full flex overflow-hidden relative z-10"
      >
        {/* Left Sidebar (Conversations, Contacts, Status & Settings) */}
        <Sidebar onStartCall={webRTC.initiateCall} />

        {/* Center / Main area: AI page or the active conversation */}
        {localAiOpen ? (
          <LocalAiPage onClose={() => setLocalAiOpen(false)} />
        ) : (
          <ChatArea onStartCall={handleVoiceOrVideoCall} />
        )}

        {/* Right Settings & Profile Panel */}
        <AnimatePresence>
          {rightPanelView !== 'none' && (
            <SettingsRightPanel />
          )}
        </AnimatePresence>
      </main>


    </div>
  );
}
