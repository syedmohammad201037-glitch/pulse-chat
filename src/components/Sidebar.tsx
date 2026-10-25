import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useAppStore } from '../store/useAppStore';
import { db, auth, OperationType, handleFirestoreError } from '../lib/firebase';
import { 
  collection, 
  doc, 
  updateDoc, 
  serverTimestamp, 
  deleteDoc, 
  setDoc,
  getDoc
} from 'firebase/firestore';
import { UserProfile, CallHandshake } from '../types';
import { playNotificationSound } from '../lib/sounds';
import { THEME_PRESETS, WALLPAPER_PRESETS, ThemeMode, WallpaperPattern } from '../lib/theme';
import AvatarPicker from './AvatarPicker';
import { 
  MessageSquare, 
  Search, 
  Users, 
  LogOut, 
  Settings, 
  UserPlus, 
  Check, 
  X, 
  Clock, 
  ShieldAlert, 
  MessageSquarePlus,
  Phone,
  Video,
  ArrowUpRight,
  ArrowDownLeft,
  Trash2,
  CircleDot,
  Volume2,
  VolumeX,
  Sparkles,
  Palette,
  Sliders,
  Sun,
  Moon,
  Image as ImageIcon,
  Link as LinkIcon,
  Eye,
  RefreshCw,
  MoreVertical,
  Camera,
  User,
  ArrowLeft,
  Star,
  CheckCheck,
  Bot,
  Bookmark,
  Cpu
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import StoriesSection from './StoriesSection';

interface SidebarProps {
  onStartCall?: (receiverId: string, type: 'voice' | 'video', receiverName: string) => void;
}

export default function Sidebar({ onStartCall }: SidebarProps) {
  const { 
    user, 
    chats, 
    allUsers, 
    activeChatId, 
    localAiOpen,
    usersError,
    setActiveChat, 
    logout,
    friendRequests,
    themeMode,
    setThemeMode,
    wallpaperPattern,
    setWallpaperPattern,
    customWallpaperUrl,
    setCustomWallpaperUrl,
    chatTransparency,
    setChatTransparency,
    chatBlur,
    setChatBlur,
    rightPanelView,
    setRightPanelView,
    savedMessagesFilter,
    setSavedMessagesFilter,
    setLocalAiOpen
  } = useAppStore();

  const [callLogs, setCallLogs] = useState<CallHandshake[]>([]);
  const [settingsTab, setSettingsTab] = useState<'profile' | 'theme' | 'audio'>('profile');
  const [customUrlInput, setCustomUrlInput] = useState(customWallpaperUrl || '');
  const [customUrlError, setCustomUrlError] = useState('');

  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'chats' | 'status' | 'calls'>('chats');
  const [chatCategory, setChatCategory] = useState<'all' | 'direct' | 'groups' | 'unread'>('all');
  const [showGroupForm, setShowGroupForm] = useState(false);
  const [showUserSearch, setShowUserSearch] = useState(false);
  const [showMenuDropdown, setShowMenuDropdown] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  
  // Group creation state
  const [groupFormName, setGroupFormName] = useState('');
  const [groupFormSelectedUids, setGroupFormSelectedUids] = useState<string[]>([]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenuDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Build mapping of users by ID for fast lookup
  const usersMap = useMemo(() => {
    const map = new Map<string, UserProfile>();
    allUsers.forEach(u => map.set(u.uid, u));
    return map;
  }, [allUsers]);

  // Retrieve fresh current user profile
  const currentUserProfile = useMemo(() => {
    if (!user) return null;
    return usersMap.get(user.uid) || user;
  }, [allUsers, user, usersMap]);

  // Filtered contacts list for user search tab
  const filteredSearchUsers = useMemo(() => {
    if (!user) return [];
    return allUsers.filter(u => {
      if (u.uid === user.uid) return false; // exclude self
      const queryStr = searchQuery.trim().toLowerCase();
      if (!queryStr) return true;
      return (
        (u.displayName || '').toLowerCase().includes(queryStr) ||
        (u.email || '').toLowerCase().includes(queryStr) ||
        (u.statusText && u.statusText.toLowerCase().includes(queryStr))
      );
    });
  }, [allUsers, user, searchQuery]);

  // Profile Management States
  const [showProfileDrawer, setShowProfileDrawer] = useState(false);
  const [editedName, setEditedName] = useState('');
  const [editedPhotoURL, setEditedPhotoURL] = useState('');
  const [editedBio, setEditedBio] = useState('');
  const [editedEmoji, setEditedEmoji] = useState('💬');
  const [editedStatus, setEditedStatus] = useState('');
  const [editedAccentColor, setEditedAccentColor] = useState<'indigo' | 'rose' | 'emerald' | 'amber' | 'violet'>('indigo');
  const [editedWallpaper, setEditedWallpaper] = useState<'cosmic' | 'grid' | 'slate' | 'nebula'>('cosmic');
  const [editedSounds, setEditedSounds] = useState<boolean>(true);

  const openProfileView = (tab: 'profile' | 'theme' | 'audio' = 'profile') => {
    if (!currentUserProfile) return;
    setRightPanelView(tab);
    setShowProfileDrawer(false);
    setShowGroupForm(false);
    setShowUserSearch(false);
    setShowMenuDropdown(false);
  };

  const handleSaveProfile = async () => {
    if (!user) return;
    try {
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        displayName: editedName.trim() || user.displayName,
        photoURL: editedPhotoURL.trim() || currentUserProfile?.photoURL || user.photoURL,
        bio: editedBio.trim(),
        statusEmoji: editedEmoji,
        statusText: editedStatus.trim(),
        accentColor: editedAccentColor,
        customWallpaper: editedWallpaper,
        enableSounds: editedSounds
      });
      setShowProfileDrawer(false);
      if (editedSounds) {
        playNotificationSound('success');
      }
    } catch (e: any) {
      console.error('Failed to update profile settings:', e);
      handleFirestoreError(e, OperationType.UPDATE, `users/${user.uid}`);
    }
  };

  const applyStatusPreset = (emoji: string, text: string) => {
    setEditedEmoji(emoji);
    setEditedStatus(text);
  };

  // Resolve Friendship statuses
  const getFriendshipStatus = (otherUid: string): 'friends' | 'pending_sent' | 'pending_received' | 'none' => {
    if (!user) return 'none';
    const uids = [user.uid, otherUid].sort();
    const requestId = `${uids[0]}_${uids[1]}`;
    const req = friendRequests.find(r => r.id === requestId);
    
    if (!req) return 'none';
    if (req.status === 'accepted') return 'friends';
    if (req.status === 'pending') {
      return req.senderId === user.uid ? 'pending_sent' : 'pending_received';
    }
    return 'none';
  };

  // Send friend request
  const handleSendRequest = async (targetUid: string) => {
    if (!user) return;
    const uids = [user.uid, targetUid].sort();
    const requestId = `${uids[0]}_${uids[1]}`;

    try {
      const reqRef = doc(db, 'friendRequests', requestId);
      await setDoc(reqRef, {
        id: requestId,
        senderId: user.uid,
        receiverId: targetUid,
        participants: [user.uid, targetUid],
        status: 'pending',
        timestamp: serverTimestamp()
      });
      if (currentUserProfile?.enableSounds !== false) {
        playNotificationSound('sent');
      }
    } catch (e: any) {
      console.error('Failed to send friend request:', e);
      handleFirestoreError(e, OperationType.CREATE, `friendRequests/${requestId}`);
    }
  };

  // Accept friend request
  const handleAcceptRequest = async (requestId: string) => {
    try {
      const reqRef = doc(db, 'friendRequests', requestId);
      await updateDoc(reqRef, {
        status: 'accepted'
      });
      if (currentUserProfile?.enableSounds !== false) {
        playNotificationSound('success');
      }
    } catch (e: any) {
      console.error('Failed to accept request:', e);
      handleFirestoreError(e, OperationType.UPDATE, `friendRequests/${requestId}`);
    }
  };

  // Decline friend request
  const handleDeclineRequest = async (requestId: string) => {
    try {
      const reqRef = doc(db, 'friendRequests', requestId);
      await deleteDoc(reqRef);
    } catch (e: any) {
      console.error('Failed to decline request:', e);
      handleFirestoreError(e, OperationType.DELETE, `friendRequests/${requestId}`);
    }
  };

  // Incoming Friend Requests List
  const requestSenders = useMemo(() => {
    if (!user) return [];
    return friendRequests
      .filter(r => r.receiverId === user.uid && r.status === 'pending')
      .map(r => {
        const sender = usersMap.get(r.senderId);
        return {
          request: r,
          sender: sender || {
            uid: r.senderId,
            displayName: 'User',
            email: '',
            photoURL: `https://api.dicebear.com/7.x/adventurer/svg?seed=${r.senderId}`,
            online: false,
            lastSeen: new Date() as any
          }
        };
      });
  }, [friendRequests, user, usersMap]);

  // Start 1-on-1 private chat
  const startPrivateChat = async (partner: UserProfile) => {
    if (!user) return;
    const uids = [user.uid, partner.uid].sort();
    const chatId = `${uids[0]}_${uids[1]}`;

    try {
      const chatRef = doc(db, 'chats', chatId);
      const docSnap = await getDoc(chatRef).catch(err => {
        handleFirestoreError(err, OperationType.GET, `chats/${chatId}`);
        return null;
      });

      if (!docSnap || !docSnap.exists()) {
        await setDoc(chatRef, {
          id: chatId,
          participants: uids,
          isGroup: false,
          createdAt: serverTimestamp(),
          unreadCount: { [user.uid]: 0, [partner.uid]: 0 },
          typing: { [user.uid]: false, [partner.uid]: false }
        });
      }

      setActiveChat(chatId, partner);
      setShowUserSearch(false);
      setSearchQuery('');
    } catch (e: any) {
      console.error('Failed to open private chat:', e);
      handleFirestoreError(e, OperationType.CREATE, `chats/${chatId}`);
    }
  };

  // Create group chat
  const startGroupChat = async (groupName: string, selectedUids: string[]) => {
    if (!user || !groupName.trim() || selectedUids.length === 0) return;
    
    const allParticipants = Array.from(new Set([user.uid, ...selectedUids]));
    
    try {
      const chatsRef = collection(db, 'chats');
      const newChatDoc = doc(chatsRef);
      const chatId = newChatDoc.id;

      const unreadCountObj: Record<string, number> = {};
      const typingObj: Record<string, boolean> = {};
      allParticipants.forEach(uid => {
        unreadCountObj[uid] = 0;
        typingObj[uid] = false;
      });

      await setDoc(newChatDoc, {
        id: chatId,
        participants: allParticipants,
        isGroup: true,
        groupName: groupName.trim(),
        groupAdmin: user.uid,
        groupAvatar: `https://api.dicebear.com/7.x/identicon/svg?seed=${chatId}`,
        createdAt: serverTimestamp(),
        unreadCount: unreadCountObj,
        typing: typingObj,
        lastMessage: {
          id: 'sys_start',
          senderId: 'system',
          text: `Group "${groupName.trim()}" created by ${currentUserProfile?.displayName || user.displayName}`,
          timestamp: new Date()
        }
      });

      const virtualPartner: UserProfile = {
        uid: chatId,
        displayName: groupName.trim(),
        email: `${allParticipants.length} participants`,
        photoURL: `https://api.dicebear.com/7.x/identicon/svg?seed=${chatId}`,
        online: true,
        lastSeen: new Date() as any
      };

      setActiveChat(chatId, virtualPartner);
      setShowGroupForm(false);
      setGroupFormName('');
      setGroupFormSelectedUids([]);
      if (currentUserProfile?.enableSounds !== false) {
        playNotificationSound('success');
      }
    } catch (e: any) {
      console.error('Failed to build group:', e);
      handleFirestoreError(e, OperationType.CREATE, 'chats');
    }
  };

  // Delete Call Log item
  const handleDeleteCallLog = async (e: React.MouseEvent, logId: string) => {
    e.stopPropagation();
    if (!user) return;
    try {
      const logRef = doc(db, 'callLogs', logId);
      await deleteDoc(logRef);
      setCallLogs(callLogs.filter(c => c.id !== logId));
    } catch (err: any) {
      console.error('Failed to delete log item:', err);
      handleFirestoreError(err, OperationType.DELETE, `callLogs/${logId}`);
    }
  };

  // Filter Call Logs
  const filteredCallLogs = useMemo(() => {
    if (!user) return [];
    const queryStr = searchQuery.trim().toLowerCase();
    
    return callLogs.map(log => {
      const isOutgoing = log.callerId === user.uid;
      const partnerId = isOutgoing ? log.receiverId : log.callerId;
      const partnerProfile = usersMap.get(partnerId);
      
      const partner: UserProfile = partnerProfile || {
        uid: partnerId,
        displayName: isOutgoing ? log.receiverName : log.callerName,
        email: '',
        photoURL: `https://api.dicebear.com/7.x/adventurer/svg?seed=${partnerId}`,
        online: false,
        lastSeen: new Date() as any
      };

      return {
        ...log,
        partner,
        partnerId,
        isOutgoing
      };
    }).filter(item => {
      if (!queryStr) return true;
      return (item.partner.displayName || '').toLowerCase().includes(queryStr);
    });
  }, [callLogs, user, usersMap, searchQuery]);

  // Construct active conversation threads
  const activeThreads = useMemo(() => {
    if (!user) return [];
    
    const threads = chats.map(c => {
      if (c.isGroup) {
        const virtualPartner: UserProfile = {
          uid: c.id,
          displayName: c.groupName || 'Unnamed Group',
          email: `${c.participants.length} participants`,
          photoURL: c.groupAvatar || `https://api.dicebear.com/7.x/identicon/svg?seed=${c.id}`,
          online: true,
          lastSeen: new Date() as any
        };
        return {
          thread: c,
          partner: virtualPartner,
          partnerId: c.id
        };
      }

      const partnerId = c.participants.find(p => p !== user.uid) || '';
      const partnerProfile = usersMap.get(partnerId);
      return {
        thread: c,
        partner: partnerProfile,
        partnerId
      };
    });

    // Apply category filter
    let categoryFiltered = threads;
    if (chatCategory === 'direct') {
      categoryFiltered = threads.filter(t => !t.thread.isGroup);
    } else if (chatCategory === 'groups') {
      categoryFiltered = threads.filter(t => t.thread.isGroup);
    } else if (chatCategory === 'unread') {
      categoryFiltered = threads.filter(t => (t.thread.unreadCount?.[user.uid] || 0) > 0);
    }

    // Apply search query filter
    const queryStr = searchQuery.trim().toLowerCase();
    if (queryStr) {
      categoryFiltered = categoryFiltered.filter(t => {
        const nameMatch = (t.partner?.displayName || '').toLowerCase().includes(queryStr);
        const lastMsgMatch = t.thread.lastMessage?.text?.toLowerCase().includes(queryStr);
        return nameMatch || lastMsgMatch;
      });
    }

    // Sort active threads by last message timestamp (most recent first)
    return categoryFiltered.sort((a, b) => {
      const timeA = a.thread.lastMessage?.timestamp?.toMillis?.() || 0;
      const timeB = b.thread.lastMessage?.timestamp?.toMillis?.() || 0;
      return timeB - timeA;
    });
  }, [chats, user, usersMap, chatCategory, searchQuery]);

  // Typing a name that matches no chat jumps to contacts; clearing the box jumps back.
  const autoSwitchedRef = useRef(false);
  useEffect(() => {
    const q = searchQuery.trim();
    if (activeTab !== 'chats' || showGroupForm || showProfileDrawer) return;
    if (q && !showUserSearch && activeThreads.length === 0) {
      autoSwitchedRef.current = true;
      setShowUserSearch(true);
    } else if (!q && showUserSearch && autoSwitchedRef.current) {
      autoSwitchedRef.current = false;
      setShowUserSearch(false);
    }
  }, [searchQuery, activeThreads.length, activeTab, showUserSearch, showGroupForm, showProfileDrawer]);

  return (
    <div 
      className={`w-full md:w-[320px] lg:w-[360px] border-r flex flex-col h-full shrink-0 shadow-lg transition-all duration-300 ${activeChatId || localAiOpen ? 'hidden md:flex' : 'flex'}`}
      style={{ 
        backgroundColor: 'var(--panel-bg)', 
        backdropFilter: 'blur(var(--glass-blur))', 
        WebkitBackdropFilter: 'blur(var(--glass-blur))',
        borderColor: 'var(--border-color)'
      }}
    >
      
      {/* 1. Minimal WhatsApp-Style Sidebar Header */}
      <div 
        className="p-3.5 flex items-center justify-between gap-3 border-b shrink-0 transition-colors"
        style={{ 
          backgroundColor: 'var(--header-bg)', 
          borderColor: 'var(--border-color)'
        }}
      >
        {/* Left: User Avatar & Info (WhatsApp-style) */}
        <div 
          className="flex items-center gap-3 min-w-0 flex-1 cursor-pointer group"
          onClick={() => openProfileView('profile')}
          title="Click to view & edit your profile"
        >
          <div className="relative shrink-0">
            <img 
              referrerPolicy="no-referrer"
              src={currentUserProfile?.photoURL || user?.photoURL} 
              alt={currentUserProfile?.displayName || user?.displayName} 
              className="w-10 h-10 rounded-full object-cover bg-slate-200 dark:bg-slate-800 border border-white/20 shadow-xs group-hover:opacity-90 transition-opacity"
            />
            <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border-2 border-white dark:border-slate-900 rounded-full" />
          </div>

          <div className="text-left leading-tight min-w-0 flex-1">
            <h2 className="text-sm font-bold text-[var(--text-primary)] truncate font-sans">
              {currentUserProfile?.displayName || user?.displayName}
            </h2>
            <p className="text-[11px] text-[var(--text-secondary)] truncate font-normal mt-0.5">
              {currentUserProfile?.statusText || 'Available'}
            </p>
          </div>
        </div>

        {/* Right: Modern Action Icons & Dropdown Menu */}
        <div className="flex items-center space-x-0.5 shrink-0 relative" ref={menuRef}>
          {/* Pulse Local AI (Transformers.js) */}
          <button
            onClick={() => setLocalAiOpen(true)}
            className="p-2 rounded-xl text-indigo-400 hover:text-indigo-300 hover:bg-indigo-500/15 transition-all cursor-pointer relative"
            title="Pulse Local AI (Transformers.js • CPU/GPU)"
          >
            <Cpu className="w-5 h-5" />
            <span className="absolute 1.5 top-1.5 right-1.5 flex h-2 w-2">
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-indigo-500"></span>
            </span>
          </button>

          {/* Status / Stories */}
          <button
            onClick={() => {
              setActiveTab('status');
              setShowProfileDrawer(false);
              setShowGroupForm(false);
              setShowUserSearch(false);
            }}
            className={`p-2 rounded-xl transition-all cursor-pointer ${
              activeTab === 'status' && !showProfileDrawer && !showGroupForm && !showUserSearch
                ? 'text-[var(--accent-color)] bg-slate-500/15' 
                : 'text-[var(--text-secondary)] hover:bg-slate-500/15 hover:text-[var(--text-primary)]'
            }`}
            title="Stories & Status"
          >
            <CircleDot className="w-5 h-5" />
          </button>

          {/* New Chat */}
          <button
            onClick={() => {
              setShowUserSearch(!showUserSearch);
              setShowGroupForm(false);
              setShowProfileDrawer(false);
              setShowMenuDropdown(false);
            }}
            className={`p-2 rounded-xl transition-all cursor-pointer ${
              showUserSearch 
                ? 'text-[var(--text-primary)] bg-slate-500/15' 
                : 'text-[var(--text-secondary)] hover:bg-slate-500/15 hover:text-[var(--text-primary)]'
            }`}
            title="New chat"
          >
            <MessageSquarePlus className="w-5 h-5" />
          </button>

          {/* 3 Dots Menu Button */}
          <button
            onClick={() => setShowMenuDropdown(!showMenuDropdown)}
            className={`p-2 rounded-xl transition-all cursor-pointer ${
              showMenuDropdown 
                ? 'text-[var(--text-primary)] bg-slate-500/15' 
                : 'text-[var(--text-secondary)] hover:bg-slate-500/15 hover:text-[var(--text-primary)]'
            }`}
            title="Menu"
          >
            <MoreVertical className="w-5 h-5" />
          </button>

          {/* Dropdown Options Menu */}
          <AnimatePresence>
            {showMenuDropdown && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: -4 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -4 }}
                transition={{ duration: 0.15 }}
                className="absolute right-0 top-11 w-56 rounded-2xl border shadow-xl z-50 py-1.5 font-sans overflow-hidden text-left"
                style={{
                  backgroundColor: 'var(--popover-bg)',
                  borderColor: 'var(--border-color)',
                  backdropFilter: 'blur(var(--glass-blur))',
                  WebkitBackdropFilter: 'blur(var(--glass-blur))'
                }}
              >
                {/* Local AI option */}
                <button
                  onClick={() => {
                    setLocalAiOpen(true);
                    setShowMenuDropdown(false);
                  }}
                  className="w-full px-3.5 py-2.5 text-xs text-indigo-400 hover:bg-indigo-500/10 flex items-center justify-between cursor-pointer font-medium transition-colors border-b border-white/5"
                >
                  <div className="flex items-center gap-2.5">
                    <Cpu className="w-4 h-4 text-indigo-400" />
                    <span>Local AI (Transformers.js)</span>
                  </div>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-mono">
                    CPU/GPU
                  </span>
                </button>

                <button
                  onClick={() => openProfileView('profile')}
                  className="w-full px-3.5 py-2.5 text-xs text-[var(--text-primary)] hover:bg-white/10 flex items-center gap-2.5 cursor-pointer font-medium transition-colors"
                >
                  <User className="w-4 h-4 text-[var(--text-secondary)]" />
                  <span>Profile & Avatars</span>
                </button>

                <button
                  onClick={() => {
                    setShowGroupForm(true);
                    setShowUserSearch(false);
                    setShowProfileDrawer(false);
                    setShowMenuDropdown(false);
                  }}
                  className="w-full px-3.5 py-2.5 text-xs text-[var(--text-primary)] hover:bg-white/10 flex items-center gap-2.5 cursor-pointer font-medium transition-colors"
                >
                  <Users className="w-4 h-4 text-[var(--text-secondary)]" />
                  <span>New group</span>
                </button>

                <button
                  onClick={() => openProfileView('theme')}
                  className="w-full px-3.5 py-2.5 text-xs text-[var(--text-primary)] hover:bg-white/10 flex items-center gap-2.5 cursor-pointer font-medium transition-colors"
                >
                  <Palette className="w-4 h-4 text-[var(--text-secondary)]" />
                  <span>Themes & Wallpapers</span>
                </button>

                <button
                  onClick={() => openProfileView('audio')}
                  className="w-full px-3.5 py-2.5 text-xs text-[var(--text-primary)] hover:bg-white/10 flex items-center gap-2.5 cursor-pointer font-medium transition-colors"
                >
                  <Sliders className="w-4 h-4 text-[var(--text-secondary)]" />
                  <span>Settings & Audio</span>
                </button>

                <div className="my-1 border-t" style={{ borderColor: 'var(--border-color)' }} />

                <button
                  onClick={async () => {
                    setShowMenuDropdown(false);
                    try {
                      await logout();
                    } catch (e) {
                      console.warn('Logout error:', e);
                    }
                  }}
                  className="w-full px-3.5 py-2.5 text-xs text-[var(--text-primary)] hover:bg-rose-500/15 flex items-center gap-2.5 cursor-pointer font-medium transition-colors"
                >
                  <LogOut className="w-4 h-4 text-[var(--text-secondary)]" />
                  <span>Log out</span>
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* 2. Chat Search Input */}
      <div 
        className="px-3 py-2 border-b"
        style={{ borderColor: 'var(--border-color)' }}
      >
        <div className="relative">
          <input
            type="text"
            placeholder={showUserSearch ? "Search contacts..." : (showGroupForm ? "Search group members..." : "Search chats...")}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full text-xs rounded-lg py-1.5 pl-8 pr-3 focus:outline-none text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] transition-all border"
            style={{ 
              backgroundColor: 'var(--input-bg)',
              borderColor: 'var(--border-color)'
            }}
          />
          <Search className="absolute left-2.5 top-2 w-3.5 h-3.5 text-[var(--text-secondary)]" />
        </div>
      </div>

      {/* Navigation Tabs (Chats, Status, Calls) */}
      {!showProfileDrawer && !showGroupForm && !showUserSearch && (
        <div 
          className="flex items-center border-b shrink-0 text-xs font-semibold"
          style={{ borderColor: 'var(--border-color)' }}
        >
          <button
            onClick={() => setActiveTab('chats')}
            className={`flex-1 py-2.5 text-center border-b-2 transition-all cursor-pointer ${
              activeTab === 'chats'
                ? 'text-[var(--text-primary)] font-bold'
                : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
            style={{
              borderColor: activeTab === 'chats' ? 'var(--accent-color)' : 'transparent'
            }}
          >
            Chats
          </button>
          <button
            onClick={() => setActiveTab('status')}
            className={`flex-1 py-2.5 text-center border-b-2 transition-all cursor-pointer ${
              activeTab === 'status'
                ? 'text-[var(--text-primary)] font-bold'
                : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
            style={{
              borderColor: activeTab === 'status' ? 'var(--accent-color)' : 'transparent'
            }}
          >
            Status
          </button>
          <button
            onClick={() => setActiveTab('calls')}
            className={`flex-1 py-2.5 text-center border-b-2 transition-all cursor-pointer ${
              activeTab === 'calls'
                ? 'text-[var(--text-primary)] font-bold'
                : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
            style={{
              borderColor: activeTab === 'calls' ? 'var(--accent-color)' : 'transparent'
            }}
          >
            Calls
          </button>
        </div>
      )}

      {/* 3. Main Conversations List / Drawers */}
      <div className="flex-1 overflow-y-auto min-h-0 bg-transparent">
        <AnimatePresence mode="wait">
          
          {/* Profile & Settings WhatsApp-Style Drawer */}
          {showProfileDrawer ? (
            <motion.div
              key="profile-drawer"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              className="p-4 space-y-4 font-sans text-left border m-2 rounded-2xl shadow-xl max-h-[calc(100vh-120px)] overflow-y-auto"
              style={{
                backgroundColor: 'var(--popover-bg)',
                borderColor: 'var(--border-color)',
                backdropFilter: 'blur(var(--glass-blur))',
                WebkitBackdropFilter: 'blur(var(--glass-blur))'
              }}
            >
              {/* WhatsApp Profile Top Bar */}
              <div 
                className="flex items-center justify-between pb-3 border-b"
                style={{ borderColor: 'var(--border-color)' }}
              >
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => setShowProfileDrawer(false)}
                    className="p-1.5 hover:bg-white/10 rounded-xl text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
                    title="Back"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </button>
                  <span className="text-sm font-bold text-[var(--text-primary)]">
                    Profile & Settings
                  </span>
                </div>
                <button 
                  onClick={() => setShowProfileDrawer(false)}
                  className="p-1 hover:bg-white/10 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Sub Navigation Tabs inside Drawer */}
              <div 
                className="flex p-1 rounded-xl gap-1 border"
                style={{ 
                  backgroundColor: 'var(--input-bg)',
                  borderColor: 'var(--border-color)'
                }}
              >
                <button
                  type="button"
                  onClick={() => setSettingsTab('profile')}
                  className={`flex-1 py-1.5 text-[11px] font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    settingsTab === 'profile' 
                      ? 'text-white shadow-xs' 
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                  style={{
                    backgroundColor: settingsTab === 'profile' ? 'var(--accent-color)' : 'transparent'
                  }}
                >
                  <User className="w-3.5 h-3.5" />
                  <span>Profile & Avatar</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSettingsTab('theme')}
                  className={`flex-1 py-1.5 text-[11px] font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    settingsTab === 'theme' 
                      ? 'text-white shadow-xs' 
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                  style={{
                    backgroundColor: settingsTab === 'theme' ? 'var(--accent-color)' : 'transparent'
                  }}
                >
                  <Palette className="w-3.5 h-3.5" />
                  <span>Theme & Wallpapers</span>
                </button>
              </div>

              {/* Tab 1: Profile & Avatar Management */}
              {settingsTab === 'profile' ? (
                <div className="space-y-4">
                  
                  {/* WhatsApp Profile Centered Photo */}
                  <div className="flex flex-col items-center gap-2 py-2">
                    <div className="relative group cursor-pointer">
                      <img 
                        src={editedPhotoURL || currentUserProfile?.photoURL || user?.photoURL} 
                        alt="Profile Avatar" 
                        referrerPolicy="no-referrer"
                        className="w-20 h-20 rounded-full ring-4 object-cover shadow-md bg-slate-800"
                        style={{ borderColor: 'var(--accent-color)' }}
                      />
                      <div 
                        className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center text-white transition-opacity text-[10px] font-bold"
                      >
                        <Camera className="w-5 h-5 mb-0.5" />
                        <span>CHANGE</span>
                      </div>
                    </div>
                    <span className="text-[11px] text-[var(--text-secondary)] font-mono font-medium">
                      {currentUserProfile?.email || user?.email}
                    </span>
                  </div>

                  {/* Avatar Picker Component with Multiple Styles & Generator */}
                  <div 
                    className="p-3 rounded-xl border"
                    style={{ 
                      backgroundColor: 'var(--input-bg)',
                      borderColor: 'var(--border-color)'
                    }}
                  >
                    <AvatarPicker 
                      currentPhotoURL={editedPhotoURL || currentUserProfile?.photoURL || user?.photoURL}
                      onSelectAvatar={(newUrl) => setEditedPhotoURL(newUrl)}
                      accentColor="var(--accent-color)"
                    />
                  </div>

                  {/* Display Name Input (WhatsApp Style) */}
                  <div className="space-y-1">
                    <label className="text-[10px] text-[var(--text-secondary)] font-bold uppercase tracking-wider block">
                      Your Name
                    </label>
                    <input
                      type="text"
                      placeholder="Your display name..."
                      value={editedName}
                      onChange={(e) => setEditedName(e.target.value)}
                      className="w-full border text-xs rounded-xl py-2 px-3 focus:outline-none text-[var(--text-primary)] shadow-2xs"
                      style={{ 
                        backgroundColor: 'var(--input-bg)',
                        borderColor: 'var(--border-color)' 
                      }}
                    />
                    <p className="text-[10px] text-[var(--text-secondary)]">
                      This is not your username or PIN. This name will be visible to your contacts.
                    </p>
                  </div>

                  {/* About / Status Presets (WhatsApp Style) */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-[var(--text-secondary)] font-bold uppercase tracking-wider block">
                      About / Status
                    </label>
                    <div className="flex gap-2">
                      <select
                        value={editedEmoji}
                        onChange={(e) => setEditedEmoji(e.target.value)}
                        className="border text-sm rounded-xl py-2 px-2 focus:outline-none text-[var(--text-primary)] cursor-pointer shadow-2xs"
                        style={{ 
                          backgroundColor: 'var(--input-bg)',
                          borderColor: 'var(--border-color)' 
                        }}
                      >
                        <option value="🍕">🍕</option>
                        <option value="🚀">🚀</option>
                        <option value="💻">💻</option>
                        <option value="🎯">🎯</option>
                        <option value="☕">☕</option>
                        <option value="🔥">🔥</option>
                        <option value="⛔">⛔</option>
                        <option value="✈️">✈️</option>
                        <option value="🎉">🎉</option>
                        <option value="💬">💬</option>
                        <option value="🔋">🔋</option>
                        <option value="🤫">🤫</option>
                      </select>
                      <input
                        type="text"
                        placeholder="Status note"
                        value={editedStatus}
                        onChange={(e) => setEditedStatus(e.target.value)}
                        className="flex-1 border text-xs rounded-xl py-2 px-3 focus:outline-none text-[var(--text-primary)] shadow-2xs"
                        style={{ 
                          backgroundColor: 'var(--input-bg)',
                          borderColor: 'var(--border-color)' 
                        }}
                      />
                    </div>
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {['🎯 Focus Mode', '💻 Coding', '☕ Coffee', '✈️ Travelling', '🔋 Available', '🤫 Busy'].map((preset) => {
                        const [emoji, ...rest] = preset.split(' ');
                        const text = rest.join(' ');
                        return (
                          <button 
                            key={preset}
                            type="button"
                            onClick={() => applyStatusPreset(emoji, text)}
                            className="px-2.5 py-1 rounded-lg text-[10px] text-[var(--text-primary)] cursor-pointer font-medium border shadow-2xs hover:bg-white/10"
                            style={{ 
                              backgroundColor: 'var(--input-bg)',
                              borderColor: 'var(--border-color)' 
                            }}
                          >
                            {preset}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Bio Description Input */}
                  <div className="space-y-1">
                    <label className="text-[10px] text-[var(--text-secondary)] font-bold uppercase tracking-wider block">
                      Bio / Summary
                    </label>
                    <textarea
                      placeholder="Write a brief bio..."
                      value={editedBio}
                      onChange={(e) => setEditedBio(e.target.value)}
                      rows={2}
                      className="w-full border text-xs rounded-xl py-2 px-3 focus:outline-none text-[var(--text-primary)] resize-none font-sans shadow-2xs"
                      style={{ 
                        backgroundColor: 'var(--input-bg)',
                        borderColor: 'var(--border-color)' 
                      }}
                    />
                  </div>

                  {/* Audio Feedback Chimes Toggle */}
                  <div 
                    className="flex items-center justify-between border p-3 rounded-xl shadow-2xs"
                    style={{ 
                      backgroundColor: 'var(--input-bg)',
                      borderColor: 'var(--border-color)' 
                    }}
                  >
                    <span className="text-xs font-semibold text-[var(--text-primary)] flex items-center gap-2">
                      <Volume2 className="w-4 h-4" style={{ color: 'var(--accent-color)' }} />
                      <span>Audio Feedback Chimes</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setEditedSounds(!editedSounds)}
                      className={`relative inline-flex h-5.5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-250 ease-in-out focus:outline-none ${
                        editedSounds ? 'opacity-100' : 'opacity-40'
                      }`}
                      style={{
                        backgroundColor: editedSounds ? 'var(--accent-color)' : 'rgba(255,255,255,0.2)'
                      }}
                    >
                      <span
                        className={`pointer-events-none inline-block h-4.5 w-4.5 transform rounded-full bg-white shadow ring-0 transition duration-250 ease-in-out ${
                          editedSounds ? 'translate-x-4.5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  {/* Save Profile Button */}
                  <button
                    type="button"
                    onClick={handleSaveProfile}
                    disabled={!editedName.trim()}
                    className="w-full py-2.5 text-white disabled:opacity-40 rounded-xl text-xs font-bold font-sans transition-all shadow-md active:scale-95 cursor-pointer text-center"
                    style={{ backgroundColor: 'var(--accent-color)' }}
                  >
                    Save Profile Changes
                  </button>
                </div>
              ) : (
                /* Tab 2: Theme, Wallpaper & Transparency Settings */
                <div className="space-y-4">
                  {/* Theme Mode Selector */}
                  <div className="space-y-2">
                    <label className="text-[10px] text-[var(--text-secondary)] font-bold uppercase tracking-wider block">
                      Color Theme (3 Active Themes)
                    </label>
                    <div className="grid grid-cols-1 gap-1.5">
                      {Object.values(THEME_PRESETS).map((preset) => {
                        const isSelected = themeMode === preset.id;
                        return (
                          <button
                            key={preset.id}
                            type="button"
                            onClick={() => setThemeMode(preset.id as ThemeMode)}
                            className={`w-full flex items-center justify-between p-2.5 rounded-xl border text-xs text-left transition-all cursor-pointer ${
                              isSelected
                                ? 'font-bold shadow-2xs'
                                : 'hover:border-white/30 text-[var(--text-primary)]'
                            }`}
                            style={{
                              backgroundColor: isSelected ? 'rgba(var(--card-bg-base), 0.7)' : 'var(--input-bg)',
                              borderColor: isSelected ? 'var(--accent-color)' : 'var(--border-color)',
                              color: isSelected ? 'var(--accent-color)' : 'var(--text-primary)'
                            }}
                          >
                            <div className="flex items-center gap-2.5">
                              <span 
                                className="w-4 h-4 rounded-full border border-white/20 shadow-2xs shrink-0" 
                                style={{ backgroundColor: preset.accentColor }} 
                              />
                              <span className="truncate font-medium">{preset.name}</span>
                            </div>
                            {isSelected && <Check className="w-4 h-4 shrink-0" style={{ color: 'var(--accent-color)' }} />}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Custom Wallpaper Image Link */}
                  <div 
                    className="space-y-2 p-3 rounded-xl border"
                    style={{ 
                      backgroundColor: 'var(--input-bg)',
                      borderColor: 'var(--border-color)'
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] text-[var(--text-primary)] font-bold uppercase tracking-wider flex items-center gap-1.5">
                        <LinkIcon className="w-3.5 h-3.5" style={{ color: 'var(--accent-color)' }} />
                        <span>Custom Wallpaper Link</span>
                      </label>
                      {customWallpaperUrl && (
                        <span 
                          className="text-[9px] font-bold px-1.5 py-0.5 rounded"
                          style={{
                            backgroundColor: 'rgba(var(--card-bg-base), 0.9)',
                            color: 'var(--accent-color)'
                          }}
                        >
                          Link Active
                        </span>
                      )}
                    </div>
                    
                    <div className="flex gap-1.5">
                      <input 
                        type="url"
                        placeholder="Paste image link (https://...)"
                        value={customUrlInput}
                        onChange={(e) => {
                          setCustomUrlInput(e.target.value);
                          setCustomUrlError('');
                        }}
                        className="flex-1 border rounded-lg px-2.5 py-1.5 text-xs text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] focus:outline-none"
                        style={{
                          backgroundColor: 'var(--panel-bg)',
                          borderColor: 'var(--border-color)'
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (!customUrlInput.trim()) {
                            setCustomUrlError('Please enter a valid image URL');
                            return;
                          }
                          setCustomWallpaperUrl(customUrlInput.trim());
                        }}
                        className="px-3 py-1.5 text-white font-bold text-xs rounded-lg transition-colors cursor-pointer shrink-0 shadow-xs"
                        style={{ backgroundColor: 'var(--accent-color)' }}
                      >
                        Apply
                      </button>
                    </div>

                    {customUrlError && (
                      <span className="text-[10px] text-rose-500 font-medium block">
                        {customUrlError}
                      </span>
                    )}

                    {customWallpaperUrl && (
                      <div 
                        className="flex items-center justify-between pt-1 border-t text-[10px]"
                        style={{ borderColor: 'var(--border-color)' }}
                      >
                        <span className="text-[var(--text-secondary)] truncate max-w-[180px] font-mono">
                          {customWallpaperUrl}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setCustomWallpaperUrl('');
                            setCustomUrlInput('');
                            setWallpaperPattern('minimal_flow');
                          }}
                          className="text-rose-500 hover:text-rose-400 font-semibold cursor-pointer underline"
                        >
                          Clear Link
                        </button>
                      </div>
                    )}
                  </div>

                  {/* 3 Background Wallpapers Presets */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] text-[var(--text-secondary)] font-bold uppercase tracking-wider block">
                        3 Provided HD Wallpapers
                      </label>
                      <span className="text-[10px] font-bold" style={{ color: 'var(--accent-color)' }}>
                        {wallpaperPattern === 'custom' ? 'Custom Link Active' : 'Preset Active'}
                      </span>
                    </div>
                    <div className="grid grid-cols-1 gap-2">
                      {WALLPAPER_PRESETS.map((wp) => {
                        const isSelected = wallpaperPattern === wp.id;
                        return (
                          <button
                            key={wp.id}
                            type="button"
                            onClick={() => setWallpaperPattern(wp.id as WallpaperPattern)}
                            className={`group relative flex items-center gap-3 p-2 rounded-xl border transition-all cursor-pointer overflow-hidden ${
                              isSelected
                                ? 'shadow-sm'
                                : 'hover:border-white/30'
                            }`}
                            style={{
                              backgroundColor: isSelected ? 'rgba(var(--card-bg-base), 0.7)' : 'var(--input-bg)',
                              borderColor: isSelected ? 'var(--accent-color)' : 'var(--border-color)'
                            }}
                          >
                            <div className="w-16 h-12 rounded-lg overflow-hidden relative shrink-0 bg-slate-900 border border-white/10">
                              <img 
                                src={wp.previewThumb} 
                                alt={wp.name}
                                referrerPolicy="no-referrer"
                                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                              />
                            </div>
                            <div className="flex-1 min-w-0 text-left">
                              <span className="text-xs font-bold truncate block text-[var(--text-primary)]">
                                {wp.name}
                              </span>
                              <span className="text-[10px] text-[var(--text-secondary)] truncate block font-mono">
                                4K Abstract Background
                              </span>
                            </div>
                            {isSelected && (
                              <div 
                                className="w-5 h-5 rounded-full text-white flex items-center justify-center shadow-xs shrink-0 mr-1"
                                style={{ backgroundColor: 'var(--accent-color)' }}
                              >
                                <Check className="w-3 h-3 text-white" />
                              </div>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Real-Time Glass Blur Slider */}
                  <div 
                    className="space-y-2 p-3 rounded-xl border"
                    style={{ 
                      backgroundColor: 'var(--input-bg)',
                      borderColor: 'var(--border-color)'
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] text-[var(--text-primary)] font-bold uppercase tracking-wider flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5" style={{ color: 'var(--accent-color)' }} />
                        <span>Background Glass Blur</span>
                      </label>
                      <span className="text-xs font-mono font-bold" style={{ color: 'var(--accent-color)' }}>
                        {chatBlur}px
                      </span>
                    </div>
                    <input 
                      type="range"
                      min="0"
                      max="30"
                      step="1"
                      value={chatBlur}
                      onChange={(e) => setChatBlur(Number(e.target.value))}
                      className="w-full h-2 rounded-lg appearance-none cursor-pointer"
                      style={{ accentColor: 'var(--accent-color)' }}
                    />
                    <div className="flex justify-between text-[9px] text-[var(--text-secondary)] font-medium">
                      <span>0px (Crisp)</span>
                      <span>16px (Glass)</span>
                      <span>30px (Frosted)</span>
                    </div>
                  </div>

                  {/* Real-Time Background Transparency Slider */}
                  <div 
                    className="space-y-2 p-3 rounded-xl border"
                    style={{ 
                      backgroundColor: 'var(--input-bg)',
                      borderColor: 'var(--border-color)'
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] text-[var(--text-primary)] font-bold uppercase tracking-wider flex items-center gap-1.5">
                        <Eye className="w-3.5 h-3.5" style={{ color: 'var(--accent-color)' }} />
                        <span>Transparency & Opacity</span>
                      </label>
                      <span className="text-xs font-mono font-bold" style={{ color: 'var(--accent-color)' }}>
                        {chatTransparency}%
                      </span>
                    </div>
                    <input 
                      type="range"
                      min="20"
                      max="100"
                      step="1"
                      value={chatTransparency}
                      onChange={(e) => setChatTransparency(Number(e.target.value))}
                      className="w-full h-2 rounded-lg appearance-none cursor-pointer"
                      style={{ accentColor: 'var(--accent-color)' }}
                    />
                    <div className="flex justify-between text-[9px] text-[var(--text-secondary)] font-medium">
                      <span>20% (See-Through)</span>
                      <span>75% (Glass)</span>
                      <span>100% (Solid)</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Explicit Sign Out Button */}
              <div 
                className="pt-2 border-t"
                style={{ borderColor: 'var(--border-color)' }}
              >
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      await logout();
                    } catch (e) {
                      console.warn('Logout error:', e);
                    }
                  }}
                  className="w-full py-2.5 bg-rose-500/15 hover:bg-rose-500/25 text-rose-400 border border-rose-500/30 rounded-xl text-xs font-bold font-sans transition-all cursor-pointer text-center flex items-center justify-center gap-2"
                >
                  <LogOut className="w-4 h-4 text-rose-400" />
                  <span>Log Out Account</span>
                </button>
              </div>
            </motion.div>
          ) : showGroupForm ? (
            <motion.div
              key="group-form-view"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              className="p-4 space-y-4 font-sans text-left border m-2 rounded-2xl shadow-lg"
              style={{
                backgroundColor: 'var(--popover-bg)',
                borderColor: 'var(--border-color)',
                backdropFilter: 'blur(var(--glass-blur))'
              }}
            >
              <div 
                className="flex items-center justify-between pb-2 border-b"
                style={{ borderColor: 'var(--border-color)' }}
              >
                <span className="text-xs font-bold font-heading text-[var(--text-primary)] uppercase tracking-wider">
                  Create Group Chat Hub
                </span>
                <button 
                  onClick={() => setShowGroupForm(false)}
                  className="p-1 hover:bg-white/10 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Group Name input */}
              <div className="space-y-1">
                <label className="text-[10px] text-[var(--text-secondary)] font-bold uppercase tracking-wider block">
                  Group Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Engineering Team, Design Sync"
                  value={groupFormName}
                  onChange={(e) => setGroupFormName(e.target.value)}
                  className="w-full border text-xs rounded-xl py-2.5 px-3 focus:outline-none text-[var(--text-primary)] shadow-2xs"
                  style={{ 
                    backgroundColor: 'var(--input-bg)',
                    borderColor: 'var(--border-color)' 
                  }}
                />
              </div>

              {/* User Selection checkboxes */}
              <div className="space-y-1.5">
                <label className="text-[10px] text-[var(--text-secondary)] font-bold uppercase tracking-wider block">
                  Select Members ({groupFormSelectedUids.length} selected)
                </label>
                <div 
                  className="max-h-48 overflow-y-auto space-y-1 border rounded-xl p-2 min-h-[100px]"
                  style={{ 
                    backgroundColor: 'var(--input-bg)',
                    borderColor: 'var(--border-color)' 
                  }}
                >
                  {allUsers.filter(u => u.uid !== user?.uid).map(u => {
                    const isSelected = groupFormSelectedUids.includes(u.uid);
                    return (
                      <button
                        type="button"
                        key={u.uid}
                        onClick={() => {
                          if (isSelected) {
                            setGroupFormSelectedUids(groupFormSelectedUids.filter(id => id !== u.uid));
                          } else {
                            setGroupFormSelectedUids([...groupFormSelectedUids, u.uid]);
                          }
                        }}
                        className="w-full text-left flex items-center justify-between p-2 rounded-lg hover:bg-white/10 transition-colors text-xs cursor-pointer"
                      >
                        <div className="flex items-center gap-2">
                          <img 
                            referrerPolicy="no-referrer"
                            src={u.photoURL} 
                            alt={u.displayName} 
                            className="w-6 h-6 rounded-full object-cover"
                          />
                          <span className="text-[var(--text-primary)] font-medium truncate max-w-[140px]">{u.displayName}</span>
                        </div>
                        <div 
                          className="w-4 h-4 rounded flex items-center justify-center border transition-all"
                          style={{
                            backgroundColor: isSelected ? 'var(--accent-color)' : 'transparent',
                            borderColor: isSelected ? 'var(--accent-color)' : 'var(--border-color)'
                          }}
                        >
                          {isSelected && <Check className="w-3 h-3 text-white" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Create Action Button */}
              <button
                type="button"
                onClick={() => startGroupChat(groupFormName, groupFormSelectedUids)}
                disabled={!groupFormName.trim() || groupFormSelectedUids.length === 0}
                className="w-full py-2.5 text-white disabled:opacity-40 rounded-xl text-xs font-bold font-heading transition-all shadow-sm active:scale-95 cursor-pointer text-center"
                style={{ backgroundColor: 'var(--accent-color)' }}
              >
                Create Group Chat
              </button>
            </motion.div>
          ) : showUserSearch ? (
            <motion.div
              key="search-view"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              className="space-y-0.5 bg-transparent"
            >
              <div 
                className="px-4 py-2 border-b text-[10px] text-[var(--text-secondary)] font-bold uppercase tracking-wider"
                style={{ 
                  backgroundColor: 'var(--header-bg)',
                  borderColor: 'var(--border-color)' 
                }}
              >
                Contacts matched ({filteredSearchUsers.length})
              </div>

              {filteredSearchUsers.length === 0 ? (
                <div className="py-12 text-center flex flex-col items-center justify-center space-y-2">
                  <ShieldAlert className="w-6 h-6 text-[var(--text-secondary)]" />
                  <p className="text-[var(--text-secondary)] text-xs px-6">
                    {usersError
                      ? `Can't load contacts: ${usersError}`
                      : allUsers.filter(u => u.uid !== user?.uid).length === 0
                      ? (!auth.currentUser
                          ? 'Guest mode is offline-only. Sign in with Google or email to find people.'
                          : 'No other users have signed up yet. Ask your friend to sign in once, then search again.')
                      : 'No matching contacts found. Try a name or email.'}
                  </p>
                </div>
              ) : (
                filteredSearchUsers.map(opponent => {
                  const status = getFriendshipStatus(opponent.uid);
                  const uids = [user?.uid || '', opponent.uid].sort();
                  const deterministicId = `${uids[0]}_${uids[1]}`;

                  const handleRowClick = () => {
                    if (status === 'friends') {
                      startPrivateChat(opponent);
                    }
                  };

                  return (
                    <div
                      key={opponent.uid}
                      onClick={handleRowClick}
                      className={`w-full flex items-center justify-between px-4 py-3 border-b transition-colors ${
                        status === 'friends' ? 'cursor-pointer hover:bg-white/10' : 'cursor-default'
                      }`}
                      style={{ borderColor: 'var(--border-color)' }}
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="relative shrink-0">
                          <img 
                            referrerPolicy="no-referrer"
                            src={opponent.photoURL} 
                            alt={opponent.displayName} 
                            className="w-10 h-10 rounded-xl object-cover bg-slate-800 border border-white/20"
                          />
                          {opponent.online && (
                            <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border-2 border-white rounded-full" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0 text-left">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <h4 className="text-sm font-bold text-[var(--text-primary)] truncate font-heading">
                              {opponent.displayName}
                            </h4>
                            {opponent.statusEmoji && (
                              <span className="text-xs shrink-0 select-none" title={opponent.statusText}>
                                {opponent.statusEmoji}
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] text-[var(--text-secondary)] truncate mt-0.5">
                            {opponent.statusText ? `"${opponent.statusText}"` : opponent.email}
                          </p>
                        </div>
                      </div>

                      {/* Action Triggers */}
                      <div className="shrink-0 flex items-center gap-1.5 pl-2" onClick={(e) => e.stopPropagation()}>
                        {status === 'friends' && (
                          <button
                            onClick={() => startPrivateChat(opponent)}
                            className="px-3 py-1.5 text-xs font-semibold text-[var(--accent-color)] hover:bg-slate-500/10 rounded-lg transition-all cursor-pointer"
                          >
                            Message
                          </button>
                        )}

                        {status === 'pending_sent' && (
                          <span className="text-xs text-[var(--text-secondary)] font-medium px-2 py-1 select-none">
                            Requested
                          </span>
                        )}

                        {status === 'pending_received' && (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleAcceptRequest(deterministicId)}
                              className="text-xs font-semibold text-[var(--accent-color)] hover:underline cursor-pointer"
                            >
                              Accept
                            </button>
                            <button
                              onClick={() => handleDeclineRequest(deterministicId)}
                              className="text-xs text-[var(--text-secondary)] hover:text-rose-500 hover:underline cursor-pointer"
                            >
                              Decline
                            </button>
                          </div>
                        )}

                        {status === 'none' && (
                          <button
                            onClick={() => handleSendRequest(opponent.uid)}
                            className="text-xs font-semibold text-[var(--accent-color)] hover:underline cursor-pointer px-2 py-1"
                          >
                            Add
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </motion.div>
          ) : activeTab === 'status' ? (
            /* 24-Hour Stories & Status */
            <motion.div
              key="stories-status-view"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="h-full"
            >
              <StoriesSection />
            </motion.div>
          ) : activeTab === 'calls' ? (
            
            /* Call History Log list */
            <motion.div
              key="call-logs-view"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-0.5 font-sans bg-transparent"
            >
              {filteredCallLogs.length === 0 ? (
                <div className="py-20 text-center flex flex-col items-center justify-center space-y-3 px-6">
                  <div 
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-[var(--text-secondary)] border"
                    style={{ 
                      backgroundColor: 'var(--input-bg)',
                      borderColor: 'var(--border-color)' 
                    }}
                  >
                    <Phone className="w-4.5 h-4.5 animate-pulse" />
                  </div>
                  <div>
                    <h4 className="text-[var(--text-primary)] text-xs font-bold font-heading">No call history</h4>
                    <p className="text-[var(--text-secondary)] text-[11px] mt-1 text-center leading-normal">
                      Initiate WebRTC video or voice calls directly from active chat windows.
                    </p>
                  </div>
                </div>
              ) : (
                filteredCallLogs.map((log) => {
                  const partner = log.partner;
                  const logId = log.id;
                  
                  const formattedTime = log.timestamp ? new Date(log.timestamp.toMillis ? log.timestamp.toMillis() : log.timestamp).toLocaleString([], {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  }) : 'Just now';

                  const getFormattedDuration = () => {
                    if (log.status === 'rejected') return 'Rejected';
                    if (log.status === 'missed') return 'Missed';
                    if (log.duration === 0) return 'Missed';
                    const mins = Math.floor(log.duration / 60);
                    const secs = log.duration % 60;
                    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
                  };

                  const isMissed = log.status === 'missed' || (log.status === 'ended' && log.duration === 0);
                  const isRejectedLog = log.status === 'rejected';

                  return (
                    <div
                      key={logId}
                      className="w-full text-left flex items-center justify-between gap-3 px-4 py-3 border-b hover:bg-white/10 transition-colors group select-none cursor-default"
                      style={{ borderColor: 'var(--border-color)' }}
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="relative shrink-0">
                          <img 
                            referrerPolicy="no-referrer"
                            src={partner.photoURL} 
                            alt={partner.displayName} 
                            className="w-10 h-10 rounded-xl object-cover bg-slate-800 border border-white/20"
                          />
                          {partner.online && (
                            <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border-2 border-white rounded-full" />
                          )}
                        </div>

                        <div className="flex-1 min-w-0 text-left">
                          <h4 className="text-xs font-bold text-[var(--text-primary)] truncate font-heading">
                            {partner.displayName}
                          </h4>
                          
                          <div className="flex items-center gap-1.5 text-[10px] text-[var(--text-secondary)] mt-1 flex-wrap font-sans">
                            {log.isOutgoing ? (
                              <span className="flex items-center gap-0.5 text-emerald-500 font-bold uppercase tracking-wider text-[9px]">
                                <ArrowUpRight className="w-3 h-3 shrink-0" />
                                <span>Out</span>
                              </span>
                            ) : (
                              <span className={`flex items-center gap-0.5 font-bold uppercase tracking-wider text-[9px] ${isMissed ? 'text-rose-500' : 'text-[var(--text-primary)]'}`}>
                                <ArrowDownLeft className="w-3 h-3 shrink-0" />
                                <span>In</span>
                              </span>
                            )}

                            <span>•</span>
                            
                            <span className={`font-mono text-[9px] ${
                              isMissed ? 'text-rose-500 font-bold' : (isRejectedLog ? 'text-amber-500' : 'text-[var(--text-secondary)]')
                            }`}>
                              {getFormattedDuration()}
                            </span>

                            <span>•</span>

                            <span className="text-[var(--text-secondary)]" title={`${log.type} call`}>
                              {log.type === 'video' ? <Video className="w-3 h-3" /> : <Phone className="w-3 h-3" />}
                            </span>

                            <span>•</span>

                            <span className="text-[9px] text-[var(--text-secondary)] whitespace-nowrap">
                              {formattedTime}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Quick Redial Actions & Deletion */}
                      <div className="flex items-center space-x-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                        {onStartCall && (
                          <>
                            <button
                              onClick={() => {
                                onStartCall(log.partnerId, 'voice', partner.displayName);
                              }}
                              className="p-1.5 hover:bg-white/10 text-[var(--text-secondary)] hover:text-emerald-400 rounded-lg transition-all cursor-pointer"
                              title="Voice callback"
                            >
                              <Phone className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => {
                                onStartCall(log.partnerId, 'video', partner.displayName);
                              }}
                              className="p-1.5 hover:bg-white/10 text-[var(--text-secondary)] hover:text-[var(--text-primary)] rounded-lg transition-all cursor-pointer"
                              title="Video callback"
                            >
                              <Video className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                        <button
                          onClick={(e) => handleDeleteCallLog(e, logId)}
                          className="p-1.5 hover:bg-rose-500/20 text-[var(--text-secondary)] hover:text-rose-400 rounded-lg transition-all cursor-pointer"
                          title="Delete Call Log"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                    </div>
                  );
                })
              )}
            </motion.div>
          ) : (
            
            /* Live Thread List */
            <motion.div
              key="chat-list-view"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-0.5 bg-transparent"
            >
              {/* Received Pending Friend Requests Section */}
              {requestSenders.length > 0 && (
                <div className="my-3 px-4 text-left">
                  <div 
                    className="flex items-center justify-between px-3 py-2 mb-2 border rounded-xl"
                    style={{
                      backgroundColor: 'rgba(var(--card-bg-base), 0.8)',
                      borderColor: 'var(--border-color)'
                    }}
                  >
                    <span className="text-[10px] font-bold uppercase tracking-wider font-mono flex items-center gap-1.5" style={{ color: 'var(--accent-color)' }}>
                      <Clock className="w-3.5 h-3.5 animate-pulse" />
                      <span>Friend Requests ({requestSenders.length})</span>
                    </span>
                  </div>
                  <div 
                    className="space-y-1.5 border rounded-xl p-2 shadow-2xs"
                    style={{
                      backgroundColor: 'var(--panel-bg)',
                      borderColor: 'var(--border-color)',
                      backdropFilter: 'blur(var(--glass-blur))'
                    }}
                  >
                    {requestSenders.map(({ request, sender }) => (
                      <div 
                        key={request.id} 
                        className="flex items-center justify-between p-2 hover:bg-white/10 rounded-xl transition-all border border-transparent hover:border-white/20 shadow-2xs"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <img 
                            referrerPolicy="no-referrer"
                            src={sender.photoURL} 
                            alt={sender.displayName} 
                            className="w-8 h-8 rounded-lg object-cover shrink-0 bg-slate-800 border border-white/20"
                          />
                          <div className="min-w-0 text-left">
                            <h5 className="text-xs font-bold text-[var(--text-primary)] truncate leading-tight font-heading">
                              {sender.displayName}
                            </h5>
                            <span className="text-[9px] text-[var(--text-secondary)] font-bold block mt-0.5">
                              Invites you to connect
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            onClick={() => handleAcceptRequest(request.id)}
                            className="text-xs font-semibold text-[var(--accent-color)] hover:underline cursor-pointer"
                          >
                            Accept
                          </button>
                          <button
                            onClick={() => handleDeclineRequest(request.id)}
                            className="text-xs text-[var(--text-secondary)] hover:text-rose-500 hover:underline cursor-pointer"
                          >
                            Decline
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeThreads.length === 0 ? (
                <div className="py-20 text-center flex flex-col items-center justify-center space-y-3 px-6">
                  <div 
                    className="w-10 h-10 rounded-xl flex items-center justify-center border shadow-xs"
                    style={{ 
                      backgroundColor: 'var(--input-bg)',
                      borderColor: 'var(--border-color)',
                      color: 'var(--accent-color)'
                    }}
                  >
                    <MessageSquare className="w-4.5 h-4.5" />
                  </div>
                  <div>
                    <h4 className="text-[var(--text-primary)] text-xs font-bold font-heading">No active chats</h4>
                    <p className="text-[var(--text-secondary)] text-[11px] mt-1 text-center leading-normal">
                      Click the search or new chat icon above to start conversing.
                    </p>
                  </div>
                </div>
              ) : (
                activeThreads.map(({ thread, partner }) => {
                  if (!partner) return null;
                  
                  const isActive = activeChatId === thread.id;
                  
                  const typingUserUids = Object.keys(thread.typing || {}).filter(uid => uid !== user?.uid && thread.typing[uid]);
                  const isTyping = typingUserUids.length > 0;
                  const unreadCount = thread.unreadCount?.[user?.uid || ''] || 0;
                  
                  const lastMessageContent = () => {
                    if (isTyping) {
                      if (thread.isGroup) {
                        const typingNames = typingUserUids.map(uid => usersMap.get(uid)?.displayName || 'Someone');
                        return <span className="font-bold animate-pulse" style={{ color: 'var(--accent-color)' }}>{typingNames.join(', ')} typing...</span>;
                      }
                      return <span className="font-bold animate-pulse" style={{ color: 'var(--accent-color)' }}>typing...</span>;
                    }
                    if (thread.lastMessage) {
                      if (thread.lastMessage.senderId === 'system') {
                        return <span className="text-[var(--text-secondary)] italic">{thread.lastMessage.text}</span>;
                      }
                      const isSenderMe = thread.lastMessage.senderId === user?.uid;
                      const prefix = isSenderMe 
                        ? 'You: ' 
                        : (thread.isGroup 
                           ? `${usersMap.get(thread.lastMessage.senderId)?.displayName || 'Member'}: ` 
                           : '');
                      return <span className="text-[var(--text-secondary)] font-medium">{prefix}{thread.lastMessage.text}</span>;
                    }
                    return <span className="text-[var(--text-secondary)] opacity-60 italic">No messages yet</span>;
                  };

                  return (
                    <button
                      key={thread.id}
                      onClick={() => setActiveChat(thread.id, partner)}
                      className={`w-full text-left flex items-center gap-3 px-4 py-3.5 transition-all duration-150 relative border-b ${
                        isActive 
                          ? 'shadow-sm font-semibold' 
                          : 'hover:bg-slate-500/10 active:bg-slate-500/15'
                      }`}
                      style={{
                        borderColor: 'var(--border-color)',
                        backgroundColor: isActive ? 'rgba(var(--card-bg-base), 0.85)' : 'transparent',
                        borderLeftWidth: '4px',
                        borderLeftColor: isActive ? 'var(--accent-color)' : 'transparent'
                      }}
                    >
                      <div className="relative shrink-0">
                        <img 
                          referrerPolicy="no-referrer"
                          src={partner.photoURL} 
                          alt={partner.displayName} 
                          className="w-11 h-11 rounded-2xl object-cover bg-slate-200 dark:bg-slate-800 border border-slate-300 dark:border-white/20 shadow-2xs"
                        />
                        {!thread.isGroup && partner.online && (
                          <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-white rounded-full" />
                        )}
                        {thread.isGroup && (
                          <span 
                            className="absolute -bottom-1 -right-1 text-white rounded-md text-[8px] px-1 font-bold font-mono tracking-wide uppercase select-none border border-white/40"
                            style={{ backgroundColor: 'var(--accent-color)' }}
                          >
                            Group
                          </span>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-0.5">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <h3 className="text-xs font-bold text-[var(--text-primary)] truncate font-heading">
                              {partner.displayName}
                            </h3>
                            {partner.statusEmoji && (
                              <span className="text-xs shrink-0 select-none" title={partner.statusText}>
                                {partner.statusEmoji}
                              </span>
                            )}
                          </div>
                          {thread.lastMessage?.timestamp && (
                            <span className="text-[10px] text-[var(--text-secondary)] font-mono select-none">
                              {new Date(thread.lastMessage.timestamp.toMillis ? thread.lastMessage.timestamp.toMillis() : thread.lastMessage.timestamp).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </span>
                          )}
                        </div>
                        <p className="text-xs truncate text-[var(--text-secondary)]">
                          {lastMessageContent()}
                        </p>
                      </div>

                      {/* Unread badge */}
                      {unreadCount > 0 && (
                        <div 
                          className="w-5 h-5 text-white text-[10px] font-extrabold rounded-full flex items-center justify-center shrink-0 shadow-xs"
                          style={{ backgroundColor: 'var(--accent-color)' }}
                        >
                          {unreadCount}
                        </div>
                      )}
                    </button>
                  );
                })
              )}
            </motion.div>
          )}

        </AnimatePresence>
      </div>

    </div>
  );
}
