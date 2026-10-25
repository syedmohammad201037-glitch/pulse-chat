import React, { useState, useEffect, useRef, useMemo, KeyboardEvent, ChangeEvent } from 'react';
import { useAppStore } from '../store/useAppStore';
import { db, OperationType, handleFirestoreError } from '../lib/firebase';
import { 
  collection, 
  query, 
  orderBy, 
  onSnapshot, 
  doc, 
  setDoc,
  updateDoc, 
  deleteDoc, 
  writeBatch, 
  getDocs,
  where,
  serverTimestamp 
} from 'firebase/firestore';
import { ChatMessage, UserProfile, ChatThread } from '../types';
import { playNotificationSound } from '../lib/sounds';
import { 
  Send, 
  Phone, 
  Video, 
  Trash2, 
  Edit3, 
  X, 
  Check, 
  CheckCheck, 
  Smile, 
  MessageCircle,
  Clock,
  ArrowLeft,
  Star,
  Search,
  Pin,
  PinOff,
  BarChart2,
  Hourglass,
  Plus,
  Forward,
  CornerUpRight,
  CornerUpLeft,
  Copy,
  Users,
  Settings,
  Shield,
  Lock,
  Zap,
  Mic,
  Play,
  Pause,
  Volume2,
  Palette,
  Sparkles,
  Bot,
  Code,
  Paperclip,
  Languages,
  FileText,
  Bookmark,
  Download,
  ExternalLink,
  FileCode,
  Terminal,
  ChevronDown,
  Maximize2,
  Image as ImageIcon,
  Upload,
  Globe,
  Cpu
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { PRESET_CHAT_MEDIA } from '../lib/presetImages';
import { compressImageFile } from '../lib/imageUtils';
import { localAiService } from '../lib/localAiService';

interface ChatAreaProps {
  onStartCall: (type: 'voice' | 'video') => void;
}

const POPULAR_EMOJIS = [
  '😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣', '😊', '😇',
  '🙂', '🙃', '😉', '😌', '😍', '🥰', '😘', '😗', '😙', '😚',
  '😋', '😛', '😝', '😜', '🤪', '🤨', '🧐', '🤓', '😎', '🥸',
  '⭐', '🌟', '✨', '🔥', '❤️', '🧡', '💛', '💚', '💙', '💜',
  '🖤', '🤍', '🤎', '💖', '💗', '🎁', '🎈', '🎉', '🎊', '👍',
  '👎', '👏', '🙌', '🙏', '🤝', '✌️', '👌', '💪', '🚀', '💯'
];

const QUICK_REACTION_EMOJIS = ['❤️', '👍', '🔥', '😂', '😮', '😢', '🎉'];

const QUICK_RESPONSES = [
  "I'm in a meeting right now",
  "On my way!",
  "Can you send over the details?",
  "Thanks! Great work",
  "Let me check and get back to you",
  "Let's hop on a call!"
];

export default function ChatArea({ onStartCall }: ChatAreaProps) {
  const { 
    user, 
    activeChatId, 
    activeChatPartner, 
    setActiveChat, 
    chats, 
    allUsers, 
    friendRequests,
    rightPanelView,
    setRightPanelView,
    setLocalAiOpen
  } = useAppStore();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');

  // AI & Advanced Features States
  const [aiSmartReplies, setAiSmartReplies] = useState<string[]>([]);
  const [isFetchingSmartReplies, setIsFetchingSmartReplies] = useState(false);
  const [showAiPolish, setShowAiPolish] = useState(false);
  const [isPolishing, setIsPolishing] = useState(false);
  
  // Code Snippet Modal State
  const [showCodeModal, setShowCodeModal] = useState(false);
  const [codeSnippetLang, setCodeSnippetLang] = useState('typescript');
  const [codeSnippetTitle, setCodeSnippetTitle] = useState('');
  const [codeSnippetCode, setCodeSnippetCode] = useState('');
  const [copiedSnippetId, setCopiedSnippetId] = useState<string | null>(null);

  // Attachment Modal State
  const [showAttachmentModal, setShowAttachmentModal] = useState(false);
  const [attachmentTab, setAttachmentTab] = useState<'presets' | 'customLink' | 'deviceUpload'>('presets');
  const [attachmentUrl, setAttachmentUrl] = useState('');
  const [attachmentName, setAttachmentName] = useState('');
  const [attachmentType, setAttachmentType] = useState<'image' | 'file'>('image');
  const [isCompressingAttachment, setIsCompressingAttachment] = useState(false);
  const [lightboxImgUrl, setLightboxImgUrl] = useState<string | null>(null);
  const attachmentFileInputRef = useRef<HTMLInputElement>(null);

  const handleDeviceAttachmentSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type.startsWith('image/')) {
      setIsCompressingAttachment(true);
      try {
        const compressedDataUrl = await compressImageFile(file, 900, 900, 0.85);
        setAttachmentUrl(compressedDataUrl);
        setAttachmentType('image');
        if (!attachmentName) {
          setAttachmentName(file.name.replace(/\.[^/.]+$/, ''));
        }
      } catch (err) {
        console.error('Failed to compress attachment image:', err);
      } finally {
        setIsCompressingAttachment(false);
        if (attachmentFileInputRef.current) attachmentFileInputRef.current.value = '';
      }
    } else {
      // For small non-image documents, read as Data URL
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setAttachmentUrl(event.target.result as string);
          setAttachmentType('file');
          if (!attachmentName) {
            setAttachmentName(file.name);
          }
        }
      };
      reader.readAsDataURL(file);
      if (attachmentFileInputRef.current) attachmentFileInputRef.current.value = '';
    }
  };

  // Translation State
  const [translatedMessages, setTranslatedMessages] = useState<Record<string, string>>({});
  const [translatingMsgId, setTranslatingMsgId] = useState<string | null>(null);
  const [activeTranslateMenuMsgId, setActiveTranslateMenuMsgId] = useState<string | null>(null);

  // Summary Modal State
  const [showSummaryModal, setShowSummaryModal] = useState(false);
  const [summaryContent, setSummaryContent] = useState('');
  const [isSummarizing, setIsSummarizing] = useState(false);

  // Message Forwarding States
  const [forwardingMessage, setForwardingMessage] = useState<ChatMessage | null>(null);
  const [forwardSearchQuery, setForwardSearchQuery] = useState('');
  const [forwardedThreadIds, setForwardedThreadIds] = useState<Record<string, boolean>>({});

  // Quick Response Templates state
  const [showQuickResponses, setShowQuickResponses] = useState(false);

  // Build mapping of users by ID
  const usersMap = useMemo(() => {
    const map = new Map<string, UserProfile>();
    allUsers.forEach(u => map.set(u.uid, u));
    return map;
  }, [allUsers]);

  // Construct target conversations we can forward to
  const forwardThreads = useMemo(() => {
    if (!user) return [];
    
    return chats.map(c => {
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
          partner: virtualPartner
        };
      }

      const partnerId = c.participants.find(p => p !== user.uid) || '';
      const partnerProfile = usersMap.get(partnerId);
      
      const partner: UserProfile = partnerProfile || {
        uid: partnerId,
        displayName: 'User',
        email: '',
        photoURL: `https://api.dicebear.com/7.x/adventurer/svg?seed=${partnerId}`,
        online: false,
        lastSeen: new Date() as any
      };

      return {
        thread: c,
        partner
      };
    });
  }, [chats, user, usersMap]);

  // Filter threads based on search input
  const filteredForwardThreads = useMemo(() => {
    const queryStr = forwardSearchQuery.trim().toLowerCase();
    if (!queryStr) return forwardThreads;

    return forwardThreads.filter(({ partner }) => {
      return (partner.displayName || '').toLowerCase().includes(queryStr);
    });
  }, [forwardThreads, forwardSearchQuery]);

  // Command to forward message
  const handleForwardMessageToThread = async (targetThread: any, targetPartner: any) => {
    if (!user || !forwardingMessage) return;
    
    const targetChatId = targetThread.id;
    const targetPartnerUid = targetPartner.uid;

    try {
      const msgsRef = collection(db, 'chats', targetChatId, 'messages');
      const newMsgDocRef = doc(msgsRef);
      const msgId = newMsgDocRef.id;

      const payload: any = {
        id: msgId,
        senderId: user.uid,
        receiverId: targetPartnerUid,
        text: forwardingMessage.text,
        timestamp: serverTimestamp(),
        seen: false,
        edited: false,
        forwarded: true
      };

      if (forwardingMessage.pollData) {
        payload.pollData = forwardingMessage.pollData;
      }

      await setDoc(newMsgDocRef, payload);

      const chatRef = doc(db, 'chats', targetChatId);
      await updateDoc(chatRef, {
        lastMessage: {
          id: msgId,
          senderId: user.uid,
          text: forwardingMessage.pollData ? `📊 Poll: ${forwardingMessage.pollData.question}` : forwardingMessage.text,
          timestamp: new Date()
        }
      });

      setForwardedThreadIds(prev => ({ ...prev, [targetChatId]: true }));
      
      if (user.enableSounds !== false) {
        playNotificationSound('sent');
      }
    } catch (e: any) {
      console.error('Failed to forward message:', e);
      handleFirestoreError(e, OperationType.CREATE, `chats/${targetChatId}/messages`);
    }
  };

  // Profile details
  const currentUserProfile = useMemo(() => {
    if (!user) return null;
    return usersMap.get(user.uid) || user;
  }, [allUsers, user, usersMap]);

  // Retrieve current active chat thread
  const activeChatThread = useMemo(() => {
    if (!activeChatId) return null;
    return chats.find(c => c.id === activeChatId) || null;
  }, [chats, activeChatId]);

  // Group Admin validation
  const isGroupAdmin = useMemo(() => {
    if (!activeChatThread || !activeChatThread.isGroup || !user) return false;
    return (
      activeChatThread.createdBy === user.uid ||
      activeChatThread.groupAdmin === user.uid ||
      (activeChatThread.admins && activeChatThread.admins.includes(user.uid))
    );
  }, [activeChatThread, user]);

  const canPostMessage = useMemo(() => {
    if (!activeChatThread) return true;
    if (!activeChatThread.isGroup) return true;
    if (isGroupAdmin) return true;
    return activeChatThread.settings?.onlyAdminsCanPost !== true;
  }, [activeChatThread, isGroupAdmin]);

  // Check friendship status for private chats
  const isDirectPartnerFriend = useMemo(() => {
    if (!activeChatThread || activeChatThread.isGroup || !user || !activeChatPartner) return true;
    
    const uids = [user.uid, activeChatPartner.uid].sort();
    const requestId = `${uids[0]}_${uids[1]}`;
    const req = friendRequests.find(r => r.id === requestId);
    
    return req && req.status === 'accepted';
  }, [activeChatThread, user, activeChatPartner, friendRequests]);

  const friendshipStatus = useMemo(() => {
    if (!activeChatThread || activeChatThread.isGroup || !user || !activeChatPartner) return 'accepted';
    
    const uids = [user.uid, activeChatPartner.uid].sort();
    const requestId = `${uids[0]}_${uids[1]}`;
    const req = friendRequests.find(r => r.id === requestId);
    
    if (!req) return 'none';
    if (req.status === 'accepted') return 'accepted';
    if (req.status === 'pending') {
      return req.senderId === user.uid ? 'pending_sent' : 'pending_received';
    }
    return 'none';
  }, [activeChatThread, user, activeChatPartner, friendRequests]);

  const handleSendFriendRequestDirect = async () => {
    if (!user || !activeChatPartner) return;
    const uids = [user.uid, activeChatPartner.uid].sort();
    const requestId = `${uids[0]}_${uids[1]}`;

    try {
      const reqRef = doc(db, 'friendRequests', requestId);
      await setDoc(reqRef, {
        id: requestId,
        senderId: user.uid,
        receiverId: activeChatPartner.uid,
        participants: [user.uid, activeChatPartner.uid],
        status: 'pending',
        timestamp: serverTimestamp()
      });
      if (currentUserProfile?.enableSounds !== false) {
        playNotificationSound('sent');
      }
    } catch (e: any) {
      console.error('Failed to send request:', e);
      handleFirestoreError(e, OperationType.CREATE, `friendRequests/${requestId}`);
    }
  };

  const handleAcceptFriendRequestDirect = async () => {
    if (!user || !activeChatPartner) return;
    const uids = [user.uid, activeChatPartner.uid].sort();
    const requestId = `${uids[0]}_${uids[1]}`;

    try {
      const reqRef = doc(db, 'friendRequests', requestId);
      await updateDoc(reqRef, { status: 'accepted' });
      if (currentUserProfile?.enableSounds !== false) {
        playNotificationSound('success');
      }
    } catch (e: any) {
      console.error('Failed to accept request:', e);
      handleFirestoreError(e, OperationType.UPDATE, `friendRequests/${requestId}`);
    }
  };

  // Local state controls
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [disappearingSeconds, setDisappearingSeconds] = useState<number>(0);
  const [showDisappearingMenu, setShowDisappearingMenu] = useState(false);
  const [showPollCreator, setShowPollCreator] = useState(false);
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollOptions, setPollOptions] = useState<string[]>(['', '']);
  const [replyingMessage, setReplyingMessage] = useState<ChatMessage | null>(null);
  const [reactingMessageId, setReactingMessageId] = useState<string | null>(null);
  const [inChatSearchQuery, setInChatSearchQuery] = useState('');
  const [showInChatSearch, setShowInChatSearch] = useState(false);
  const [showStarredOnly, setShowStarredOnly] = useState(false);
  const [activePinIndex, setActivePinIndex] = useState(0);

  // Studio Voice Note states
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [recordingWaveform, setRecordingWaveform] = useState<number[]>([30, 45, 60, 40, 75, 90, 50, 65, 80, 40]);
  const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null);
  const [voicePlaybackProgress, setVoicePlaybackProgress] = useState<Record<string, number>>({});

  // Group settings drawer state
  const [showGroupSettings, setShowGroupSettings] = useState(false);
  const [editedGroupName, setEditedGroupName] = useState('');
  const [groupSettingsSearch, setGroupSettingsSearch] = useState('');

  // Clock tick state for disappearing countdown
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Voice note recording timer & animated waveform generator
  useEffect(() => {
    let interval: any;
    if (isRecordingVoice) {
      interval = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
        setRecordingWaveform((prev) => {
          const nextVal = Math.floor(Math.random() * 65) + 35;
          return [...prev.slice(-14), nextVal];
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRecordingVoice]);

  // Voice note playback simulator
  useEffect(() => {
    let interval: any;
    if (playingVoiceId) {
      interval = setInterval(() => {
        setVoicePlaybackProgress((prev) => {
          const current = prev[playingVoiceId] || 0;
          if (current >= 100) {
            setPlayingVoiceId(null);
            return { ...prev, [playingVoiceId]: 0 };
          }
          return { ...prev, [playingVoiceId]: current + 8 };
        });
      }, 250);
    }
    return () => clearInterval(interval);
  }, [playingVoiceId]);

  const handleTogglePlayVoice = (msgId: string) => {
    if (playingVoiceId === msgId) {
      setPlayingVoiceId(null);
    } else {
      setPlayingVoiceId(msgId);
    }
  };

  const handleStartVoiceRecording = () => {
    setIsRecordingVoice(true);
    setRecordingSeconds(0);
    setRecordingWaveform([35, 50, 70, 45, 80, 95, 60, 75, 85, 45]);
  };

  const handleCancelVoiceRecording = () => {
    setIsRecordingVoice(false);
    setRecordingSeconds(0);
  };

  const handleSendVoiceNote = async () => {
    if (!activeChatId || !user) {
      setIsRecordingVoice(false);
      return;
    }

    const duration = Math.max(1, recordingSeconds);
    setIsRecordingVoice(false);
    setRecordingSeconds(0);

    try {
      const msgsRef = collection(db, 'chats', activeChatId, 'messages');
      const newMsgDocRef = doc(msgsRef);
      const msgId = newMsgDocRef.id;

      const simulatedWaveform = Array.from({ length: 20 }, () => Math.floor(Math.random() * 65) + 35);

      const payload: any = {
        id: msgId,
        senderId: user.uid,
        receiverId: activeChatPartner?.uid || '',
        text: `🎤 Voice note (${Math.floor(duration / 60)}:${(duration % 60).toString().padStart(2, '0')})`,
        timestamp: serverTimestamp(),
        seen: false,
        edited: false,
        voiceNote: {
          duration,
          audioUrl: '',
          waveform: simulatedWaveform
        }
      };

      await setDoc(newMsgDocRef, payload);

      const chatRef = doc(db, 'chats', activeChatId);
      await updateDoc(chatRef, {
        lastMessage: {
          id: msgId,
          senderId: user.uid,
          text: `🎤 Voice note (${Math.floor(duration / 60)}:${(duration % 60).toString().padStart(2, '0')})`,
          timestamp: new Date()
        }
      });

      if (currentUserProfile?.enableSounds !== false) {
        playNotificationSound('sent');
      }
    } catch (e: any) {
      console.error('Failed to send voice note:', e);
      handleFirestoreError(e, OperationType.CREATE, `chats/${activeChatId}/messages`);
    }
  };

  // Filter messages based on search query and starred toggle
  const filteredMessages = useMemo(() => {
    let list = messages;
    if (showStarredOnly && user) {
      list = list.filter(m => m.starredBy?.includes(user.uid));
    }
    if (inChatSearchQuery.trim()) {
      list = list.filter(m => m.text.toLowerCase().includes(inChatSearchQuery.trim().toLowerCase()));
    }
    return list;
  }, [messages, inChatSearchQuery, showStarredOnly, user]);

  // List of pinned messages in current thread
  const pinnedMessages = useMemo(() => {
    if (!activeChatThread || !activeChatThread.pinnedMessageIds) return [];
    return messages.filter(m => activeChatThread.pinnedMessageIds?.includes(m.id));
  }, [messages, activeChatThread]);

  // List of users currently typing in thread
  const typingUserProfiles = useMemo(() => {
    if (!activeChatThread || !activeChatThread.typing) return [];
    const uids = Object.keys(activeChatThread.typing).filter(uid => uid !== user?.uid && activeChatThread.typing[uid]);
    return uids.map(uid => usersMap.get(uid)).filter(Boolean) as UserProfile[];
  }, [activeChatThread, user, usersMap]);

  // Real-time Firestore sync
  useEffect(() => {
    if (!activeChatId || !user) return;

    setLoading(true);
    const msgsRef = collection(db, 'chats', activeChatId, 'messages');
    const q = query(msgsRef, orderBy('timestamp', 'asc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs: ChatMessage[] = [];
      const batch = writeBatch(db);
      let needsBatchCommit = false;

      snapshot.docs.forEach((docSnap) => {
        const data = docSnap.data() as ChatMessage;
        
        // Check if message has expired via disappearing timers
        if (data.disappearingAt) {
          const expireTime = typeof data.disappearingAt === 'number' ? data.disappearingAt : (data.disappearingAt.toMillis ? data.disappearingAt.toMillis() : Date.now());
          if (Date.now() >= expireTime) {
            batch.delete(docSnap.ref);
            needsBatchCommit = true;
            return;
          }
        }

        msgs.push(data);

        // Mark incoming unseen messages as seen
        if (!data.seen && data.senderId !== user.uid) {
          batch.update(docSnap.ref, { seen: true });
          needsBatchCommit = true;
        }
      });

      if (needsBatchCommit) {
        batch.commit().catch(e => console.warn('Batch commit error:', e));
      }

      setMessages(msgs);
      setLoading(false);

      // Reset unread counter for current user in thread
      const chatDocRef = doc(db, 'chats', activeChatId);
      updateDoc(chatDocRef, {
        [`unreadCount.${user.uid}`]: 0
      }).catch(err => console.warn('Failed to clear unread:', err));

    }, (error) => {
      console.error('Error fetching chat messages:', error);
      handleFirestoreError(error, OperationType.GET, `chats/${activeChatId}/messages`);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [activeChatId, user]);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const typingTimerRef = useRef<NodeJS.Timeout | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
    // Generate contextual smart replies when new incoming messages arrive
    if (messages.length > 0) {
      const lastMsg = messages[messages.length - 1];
      if (lastMsg && lastMsg.senderId !== user?.uid) {
        fetchSmartReplies(messages);
      }
    }
  }, [messages, typingUserProfiles]);

  // AI Smart Replies generator (Local AI first with 0 network lag)
  const fetchSmartReplies = async (recentMsgs: ChatMessage[]) => {
    if (!recentMsgs.length) return;
    const lastOtherMsg = [...recentMsgs].reverse().find(m => m.senderId !== user?.uid);
    if (!lastOtherMsg) return;

    setIsFetchingSmartReplies(true);
    try {
      // 1. Try local model on CPU/GPU first for instant offline zero-lag smart replies
      const localState = localAiService.getState();
      if (localState.status === 'ready') {
        const localReplies = await localAiService.generateSmartReplies(lastOtherMsg.text);
        if (localReplies && localReplies.length > 0) {
          setAiSmartReplies(localReplies);
          setIsFetchingSmartReplies(false);
          return;
        }
      }

      // 2. Fallback to API if model is not yet loaded
      const response = await fetch('/api/ai/smart-replies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lastMessage: lastOtherMsg.text,
          context: recentMsgs.slice(-5).map(m => `${m.senderId === user?.uid ? 'Me' : 'Partner'}: ${m.text}`).join('\n')
        })
      });
      if (response.ok) {
        const data = await response.json();
        if (data.replies && Array.isArray(data.replies) && data.replies.length > 0) {
          setAiSmartReplies(data.replies.slice(0, 3));
        }
      }
    } catch (e) {
      console.warn('Smart replies fetch notice:', e);
    } finally {
      setIsFetchingSmartReplies(false);
    }
  };

  // AI Message Polisher (Local model capable)
  const handlePolishDraft = async (tone: string) => {
    if (!inputText.trim()) return;
    setIsPolishing(true);
    try {
      const localState = localAiService.getState();
      { // loads the model on demand
        const localPolished = await localAiService.polishDraft(inputText.trim());
        if (localPolished && localPolished.trim()) {
          setInputText(localPolished);
          setShowAiPolish(false);
          setIsPolishing(false);
          return;
        }
      }

      const response = await fetch('/api/ai/polish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: inputText.trim(), tone })
      });
      if (response.ok) {
        const data = await response.json();
        if (data.polished) {
          setInputText(data.polished);
          setShowAiPolish(false);
        }
      }
    } catch (e) {
      console.error('Polish error:', e);
    } finally {
      setIsPolishing(false);
    }
  };

  // Code Snippet Sender
  const handleSendCodeSnippet = async () => {
    if (!codeSnippetCode.trim() || !activeChatId || !user) return;
    try {
      const msgsRef = collection(db, 'chats', activeChatId, 'messages');
      const newMsgDocRef = doc(msgsRef);
      const msgId = newMsgDocRef.id;

      const payload: any = {
        id: msgId,
        senderId: user.uid,
        receiverId: activeChatPartner.uid,
        text: `💻 Code Snippet: ${codeSnippetTitle.trim() || codeSnippetLang.toUpperCase()}`,
        codeSnippet: {
          code: codeSnippetCode.trim(),
          language: codeSnippetLang,
          title: codeSnippetTitle.trim() || undefined
        },
        timestamp: serverTimestamp(),
        seen: false,
        edited: false
      };

      await setDoc(newMsgDocRef, payload);

      const chatRef = doc(db, 'chats', activeChatId);
      await updateDoc(chatRef, {
        lastMessage: {
          id: msgId,
          senderId: user.uid,
          text: `💻 ${codeSnippetLang.toUpperCase()} Code Snippet`,
          timestamp: serverTimestamp(),
          seen: false
        },
        updatedAt: serverTimestamp()
      });

      setShowCodeModal(false);
      setCodeSnippetCode('');
      setCodeSnippetTitle('');
      if (currentUserProfile?.enableSounds !== false) {
        playNotificationSound('sent');
      }
    } catch (e: any) {
      console.error('Send code error:', e);
      handleFirestoreError(e, OperationType.CREATE, `chats/${activeChatId}/messages`);
    }
  };

  // Attachment Sender
  const handleSendAttachment = async () => {
    if (!attachmentUrl.trim() || !activeChatId || !user) return;
    try {
      const msgsRef = collection(db, 'chats', activeChatId, 'messages');
      const newMsgDocRef = doc(msgsRef);
      const msgId = newMsgDocRef.id;

      const isImg = attachmentType === 'image';
      const payload: any = {
        id: msgId,
        senderId: user.uid,
        receiverId: activeChatPartner.uid,
        text: isImg ? (attachmentName.trim() || '📷 Photo Attachment') : `📎 Document: ${attachmentName.trim() || 'File'}`,
        mediaAttachment: {
          url: attachmentUrl.trim(),
          name: attachmentName.trim() || (isImg ? 'Photo' : 'Document'),
          type: attachmentType
        },
        timestamp: serverTimestamp(),
        seen: false,
        edited: false
      };

      await setDoc(newMsgDocRef, payload);

      const chatRef = doc(db, 'chats', activeChatId);
      await updateDoc(chatRef, {
        lastMessage: {
          id: msgId,
          senderId: user.uid,
          text: isImg ? '📷 Photo Attachment' : '📎 Document Attachment',
          timestamp: serverTimestamp(),
          seen: false
        },
        updatedAt: serverTimestamp()
      });

      setShowAttachmentModal(false);
      setAttachmentUrl('');
      setAttachmentName('');
      if (currentUserProfile?.enableSounds !== false) {
        playNotificationSound('sent');
      }
    } catch (e: any) {
      console.error('Send attachment error:', e);
      handleFirestoreError(e, OperationType.CREATE, `chats/${activeChatId}/messages`);
    }
  };

  // Message Translator
  const handleTranslateMessage = async (msgId: string, targetLanguage: string) => {
    const msg = messages.find(m => m.id === msgId);
    if (!msg) return;

    setTranslatingMsgId(msgId);
    setActiveTranslateMenuMsgId(null);
    try {
      const response = await fetch('/api/ai/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: msg.text, targetLanguage })
      });
      if (response.ok) {
        const data = await response.json();
        if (data.translated) {
          setTranslatedMessages(prev => ({
            ...prev,
            [msgId]: data.translated
          }));
        }
      }
    } catch (e) {
      console.error('Translate error:', e);
    } finally {
      setTranslatingMsgId(null);
    }
  };

  // Chat Summarizer (Supports Local Model on CPU/GPU or API)
  const handleSummarizeConversation = async () => {
    if (!messages.length) return;
    setIsSummarizing(true);
    setShowSummaryModal(true);
    setSummaryContent('');

    const chatContext = messages
      .slice(-15)
      .map(m => `${m.senderId === user?.uid ? (user?.displayName || 'Me') : (activeChatPartner.displayName || 'Partner')}: ${m.text}`)
      .join('\n');

    try {
      const localState = localAiService.getState();
      { // loads the model on demand
        const localSummary = await localAiService.summarizeChat(chatContext);
        if (localSummary && localSummary.trim()) {
          setSummaryContent(`⚡ [AI on your CPU]\n\n${localSummary}`);
          setIsSummarizing(false);
          return;
        }
      }

      const response = await fetch('/api/ai/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: messages.slice(-20).map(m => ({
            sender: m.senderId === user?.uid ? (user?.displayName || 'Me') : (activeChatPartner.displayName || 'Partner'),
            text: m.text
          }))
        })
      });
      if (response.ok) {
        const data = await response.json();
        setSummaryContent(data.summary || 'Summary completed.');
      } else {
        const localSummary = await localAiService.summarizeChat(chatContext);
        setSummaryContent(`⚡ [Local Model]\n\n${localSummary || 'Summary completed.'}`);
      }
    } catch (e) {
      console.error('Summarize error:', e);
      try {
        const localSummary = await localAiService.summarizeChat(chatContext);
        setSummaryContent(`⚡ [AI on your CPU]\n\n${localSummary || 'Summary completed.'}`);
      } catch {
        setSummaryContent('Unable to generate summary. You can open Local AI from the top header to summarize or chat.');
      }
    } finally {
      setIsSummarizing(false);
    }
  };

  // Copy code helper
  const handleCopyCode = (code: string, id: string) => {
    navigator.clipboard.writeText(code);
    setCopiedSnippetId(id);
    setTimeout(() => setCopiedSnippetId(null), 2000);
  };

  // Emit typing updates to Firestore
  const handleTyping = () => {
    if (!activeChatId || !user) return;

    const chatRef = doc(db, 'chats', activeChatId);
    updateDoc(chatRef, {
      [`typing.${user.uid}`]: true
    }).catch(() => {});

    if (typingTimerRef.current) {
      clearTimeout(typingTimerRef.current);
    }

    typingTimerRef.current = setTimeout(() => {
      updateDoc(chatRef, {
        [`typing.${user.uid}`]: false
      }).catch(() => {});
    }, 2000);
  };

  // Send message
  const handleSendMessage = async () => {
    if (!inputText.trim() || !activeChatId || !user) return;

    const textToSend = inputText.trim();
    setInputText('');
    setShowEmojiPicker(false);
    setShowQuickResponses(false);

    try {
      const msgsRef = collection(db, 'chats', activeChatId, 'messages');
      const newMsgDocRef = doc(msgsRef);
      const msgId = newMsgDocRef.id;

      const payload: any = {
        id: msgId,
        senderId: user.uid,
        receiverId: activeChatPartner.uid,
        text: textToSend,
        timestamp: serverTimestamp(),
        seen: false,
        edited: false
      };

      if (replyingMessage) {
        const replySender = usersMap.get(replyingMessage.senderId)?.displayName || 'Member';
        payload.replyTo = {
          id: replyingMessage.id,
          text: replyingMessage.text,
          senderName: replySender
        };
        setReplyingMessage(null);
      }

      if (disappearingSeconds > 0) {
        payload.disappearingDuration = disappearingSeconds;
        payload.disappearingAt = Date.now() + disappearingSeconds * 1000;
      }

      await setDoc(newMsgDocRef, payload);

      // Update thread last message
      const chatRef = doc(db, 'chats', activeChatId);
      await updateDoc(chatRef, {
        lastMessage: {
          id: msgId,
          senderId: user.uid,
          text: textToSend,
          timestamp: new Date()
        },
        [`typing.${user.uid}`]: false
      });

      if (currentUserProfile?.enableSounds !== false) {
        playNotificationSound('sent');
      }
    } catch (e: any) {
      console.error('Failed to send message:', e);
      handleFirestoreError(e, OperationType.CREATE, `chats/${activeChatId}/messages`);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSendMessage();
    } else {
      handleTyping();
    }
  };

  // Handle Poll creation and dispatch
  const handleSendPoll = async (question: string, options: string[]) => {
    if (!activeChatId || !user || !question.trim()) return;
    const cleanOpts = options.map(o => o.trim()).filter(Boolean);
    if (cleanOpts.length < 2) return;

    try {
      const msgsRef = collection(db, 'chats', activeChatId, 'messages');
      const newMsgDocRef = doc(msgsRef);
      const msgId = newMsgDocRef.id;

      const pollObj = {
        question: question.trim(),
        options: cleanOpts,
        votes: {}
      };

      await setDoc(newMsgDocRef, {
        id: msgId,
        senderId: user.uid,
        receiverId: activeChatPartner.uid,
        text: `📊 Poll: ${question.trim()}`,
        pollData: pollObj,
        timestamp: serverTimestamp(),
        seen: false,
        edited: false
      });

      const chatRef = doc(db, 'chats', activeChatId);
      await updateDoc(chatRef, {
        lastMessage: {
          id: msgId,
          senderId: user.uid,
          text: `📊 Poll: ${question.trim()}`,
          timestamp: new Date()
        }
      });

      setShowPollCreator(false);
      setPollQuestion('');
      setPollOptions(['', '']);

      if (currentUserProfile?.enableSounds !== false) {
        playNotificationSound('sent');
      }
    } catch (e: any) {
      console.error('Failed to publish poll:', e);
      handleFirestoreError(e, OperationType.CREATE, `chats/${activeChatId}/messages`);
    }
  };

  // Handle voting in poll
  const handleVoteInPoll = async (msg: ChatMessage, optionIdx: number) => {
    if (!activeChatId || !user || !msg.pollData) return;

    const currentVotes = { ...(msg.pollData.votes || {}) };
    const optionKey = String(optionIdx);

    // Remove user's previous votes from all options
    Object.keys(currentVotes).forEach(key => {
      currentVotes[key] = (currentVotes[key] || []).filter((uid: string) => uid !== user.uid);
    });

    // Toggle vote for current option
    if (!currentVotes[optionKey]) {
      currentVotes[optionKey] = [];
    }
    currentVotes[optionKey].push(user.uid);

    try {
      const msgRef = doc(db, 'chats', activeChatId, 'messages', msg.id);
      await updateDoc(msgRef, {
        'pollData.votes': currentVotes
      });
      if (currentUserProfile?.enableSounds !== false) {
        playNotificationSound('click');
      }
    } catch (e: any) {
      console.error('Failed to submit poll vote:', e);
      handleFirestoreError(e, OperationType.UPDATE, `chats/${activeChatId}/messages/${msg.id}`);
    }
  };

  // Reaction handler
  const handleReactToMessage = async (msgId: string, emoji: string) => {
    if (!activeChatId || !user) return;

    const targetMsg = messages.find(m => m.id === msgId);
    if (!targetMsg) return;

    const currentReactions = { ...(targetMsg.reactions || {}) };
    const userList = currentReactions[emoji] || [];

    if (userList.includes(user.uid)) {
      currentReactions[emoji] = userList.filter((uid: string) => uid !== user.uid);
      if (currentReactions[emoji].length === 0) {
        delete currentReactions[emoji];
      }
    } else {
      currentReactions[emoji] = [...userList, user.uid];
    }

    try {
      const msgRef = doc(db, 'chats', activeChatId, 'messages', msgId);
      await updateDoc(msgRef, { reactions: currentReactions });
      if (currentUserProfile?.enableSounds !== false) {
        playNotificationSound('pop');
      }
    } catch (e: any) {
      console.error('Failed to react:', e);
      handleFirestoreError(e, OperationType.UPDATE, `chats/${activeChatId}/messages/${msgId}`);
    }
  };

  // Toggle star status
  const handleToggleStar = async (msg: ChatMessage) => {
    if (!activeChatId || !user) return;

    const currentStarred = msg.starredBy || [];
    const isStarred = currentStarred.includes(user.uid);
    const updatedStarred = isStarred
      ? currentStarred.filter(uid => uid !== user.uid)
      : [...currentStarred, user.uid];

    try {
      const msgRef = doc(db, 'chats', activeChatId, 'messages', msg.id);
      await updateDoc(msgRef, { starredBy: updatedStarred });
      if (currentUserProfile?.enableSounds !== false) {
        playNotificationSound('star');
      }
    } catch (e: any) {
      console.error('Failed to star message:', e);
      handleFirestoreError(e, OperationType.UPDATE, `chats/${activeChatId}/messages/${msg.id}`);
    }
  };

  // Toggle message pin status
  const handleTogglePin = async (msgId: string) => {
    if (!activeChatId) return;

    const currentPinned = activeChatThread?.pinnedMessageIds || [];
    const isPinned = currentPinned.includes(msgId);
    const updatedPinned = isPinned
      ? currentPinned.filter(id => id !== msgId)
      : [...currentPinned, msgId];

    try {
      const chatRef = doc(db, 'chats', activeChatId);
      await updateDoc(chatRef, { pinnedMessageIds: updatedPinned });
      if (currentUserProfile?.enableSounds !== false) {
        playNotificationSound('click');
      }
    } catch (e: any) {
      console.error('Failed to pin message:', e);
      handleFirestoreError(e, OperationType.UPDATE, `chats/${activeChatId}`);
    }
  };

  // Edit Message
  const startEditingMessage = (msg: ChatMessage) => {
    setEditingMessageId(msg.id);
    setEditText(msg.text);
  };

  const handleSaveEdit = async () => {
    if (!editingMessageId || !activeChatId || !editText.trim()) return;

    try {
      const msgRef = doc(db, 'chats', activeChatId, 'messages', editingMessageId);
      await updateDoc(msgRef, {
        text: editText.trim(),
        edited: true
      });

      setEditingMessageId(null);
      setEditText('');
    } catch (e: any) {
      console.error('Failed to edit message:', e);
      handleFirestoreError(e, OperationType.UPDATE, `chats/${activeChatId}/messages/${editingMessageId}`);
    }
  };

  // Delete message
  const handleDeleteMessage = async (msgId: string) => {
    if (!activeChatId) return;

    try {
      const msgRef = doc(db, 'chats', activeChatId, 'messages', msgId);
      await deleteDoc(msgRef);
    } catch (e: any) {
      console.error('Failed to delete message:', e);
      handleFirestoreError(e, OperationType.DELETE, `chats/${activeChatId}/messages/${msgId}`);
    }
  };

  const handleEmojiClick = (emoji: string) => {
    setInputText(prev => prev + emoji);
  };

  const handleQuickResponseSelect = (text: string) => {
    setInputText(text);
    setShowQuickResponses(false);
  };

  const formatTime = (ts: any) => {
    if (!ts) return '';
    const date = typeof ts.toMillis === 'function' ? new Date(ts.toMillis()) : new Date(ts);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const scrollToMessage = (msgId: string) => {
    const el = document.getElementById(`msg-${msgId}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.classList.add('ring-2', 'ring-indigo-500', 'transition-all');
      setTimeout(() => {
        el.classList.remove('ring-2', 'ring-indigo-500');
      }, 2000);
    }
  };

  return (
    <div className={`flex-1 flex flex-col h-full bg-transparent relative min-w-0 ${activeChatId ? 'flex' : 'hidden md:flex'}`}>
      
      {activeChatId && activeChatPartner ? (
        <>
          {/* Header */}
          <header 
            style={{ 
              backgroundColor: 'var(--header-bg)', 
              borderColor: 'var(--border-color)'
            }}
            className="h-16 px-6 border-b flex items-center justify-between shrink-0 z-20 shadow-xs transition-colors duration-200"
          >
            <div className="flex items-center gap-3.5 min-w-0">
              <button
                onClick={() => setActiveChat('', null as any)}
                className="md:hidden p-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] rounded-xl hover:bg-slate-500/15 transition-colors cursor-pointer"
                title="Back to conversation list"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>

              <div className="relative shrink-0">
                <img 
                  referrerPolicy="no-referrer"
                  src={activeChatPartner.photoURL} 
                  alt={activeChatPartner.displayName} 
                  className="w-10 h-10 rounded-xl object-cover bg-slate-200 dark:bg-slate-800 border border-slate-300 dark:border-white/20 shadow-2xs"
                />
                {!activeChatThread?.isGroup && activeChatPartner.online && (
                  <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border-2 border-white rounded-full" />
                )}
              </div>

              <div className="text-left min-w-0">
                <h3 className="text-sm font-bold text-[var(--text-primary)] truncate font-heading">
                  {activeChatPartner.displayName}
                </h3>
                <p className="text-[10px] text-[var(--text-secondary)] font-medium truncate mt-0.5">
                  {activeChatThread?.isGroup ? (
                    `${activeChatThread.participants.length} members`
                  ) : activeChatPartner.online ? (
                    <span className="font-bold" style={{ color: 'var(--accent-color)' }}>Online</span>
                  ) : (
                    'Offline'
                  )}
                </p>
              </div>
            </div>

            {/* Header actions */}
            <div className="flex items-center space-x-1.5 shrink-0">
              {showInChatSearch ? (
                <div 
                  style={{
                    backgroundColor: 'var(--input-bg)',
                    borderColor: 'var(--border-color)'
                  }}
                  className="flex items-center gap-1 border px-2.5 py-1.5 rounded-xl text-xs w-36 sm:w-48 transition-all shadow-2xs"
                >
                  <Search className="w-3.5 h-3.5" style={{ color: 'var(--accent-color)' }} />
                  <input
                    type="text"
                    placeholder="Search thread..."
                    value={inChatSearchQuery}
                    onChange={(e) => setInChatSearchQuery(e.target.value)}
                    className="bg-transparent border-none focus:ring-0 p-0 text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] text-xs outline-none flex-1 w-full"
                    autoFocus
                  />
                  <button 
                    onClick={() => {
                      setInChatSearchQuery('');
                      setShowInChatSearch(false);
                    }}
                    className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] shrink-0 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <>
                  <button
                    onClick={() => setShowInChatSearch(true)}
                    className="p-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-slate-500/15 rounded-xl transition-all cursor-pointer"
                    title="Search"
                  >
                    <Search className="w-5 h-5" />
                  </button>

                  {/* Pulse Local AI (Transformers.js) */}
                  <button
                    onClick={() => setLocalAiOpen(true)}
                    className="p-2 text-indigo-400 hover:text-indigo-300 hover:bg-indigo-500/15 rounded-xl transition-all cursor-pointer relative"
                    title="AI (runs on CPU)"
                  >
                    <Cpu className="w-5 h-5" />
                    <span className="absolute 1.5 top-1.5 right-1.5 flex h-2 w-2">
                      <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-indigo-500"></span>
                    </span>
                  </button>

                  {/* AI Conversation Summarize */}
                  <button
                    onClick={handleSummarizeConversation}
                    className="p-2 text-[var(--text-secondary)] hover:text-amber-400 hover:bg-slate-500/15 rounded-xl transition-all cursor-pointer"
                    title="Summarize Chat with AI"
                  >
                    <Sparkles className="w-5 h-5 text-amber-400" />
                  </button>

                  <button
                    onClick={() => {
                      setRightPanelView(rightPanelView === 'theme' ? 'none' : 'theme');
                    }}
                    className={`p-2 rounded-xl transition-all cursor-pointer ${
                      rightPanelView === 'theme' 
                        ? 'text-white' 
                        : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-slate-500/15'
                    }`}
                    style={{
                      backgroundColor: rightPanelView === 'theme' ? 'var(--accent-color)' : undefined
                    }}
                    title="Wallpaper & Background Lighting"
                  >
                    <Palette className="w-5 h-5" />
                  </button>
                  {activeChatThread?.isGroup && (
                    <button
                      onClick={() => setShowGroupSettings(!showGroupSettings)}
                      className="p-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-slate-500/15 rounded-xl transition-all cursor-pointer"
                      title="Group Info"
                    >
                      <Settings className="w-5 h-5" />
                    </button>
                  )}
                </>
              )}

              {/* Calls start buttons */}
              {!activeChatThread?.isGroup && isDirectPartnerFriend && (
                <>
                  <button
                    id="voice-call-trigger"
                    onClick={() => onStartCall('voice')}
                    className="p-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-slate-500/15 rounded-xl transition-all cursor-pointer"
                    title="Voice call"
                  >
                    <Phone className="w-5 h-5" />
                  </button>
                  <button
                    id="video-call-trigger"
                    onClick={() => onStartCall('video')}
                    className="p-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-slate-500/15 rounded-xl transition-all cursor-pointer"
                    title="Video call"
                  >
                    <Video className="w-5 h-5" />
                  </button>
                </>
              )}
            </div>
          </header>

          {/* Sticky Pinned Messages Navigation Banner */}
          {pinnedMessages && pinnedMessages.length > 0 && (
            <div 
              className="border-b px-6 py-2 flex items-center justify-between z-20 shrink-0 select-none shadow-2xs"
              style={{
                backgroundColor: 'var(--input-bg)',
                borderColor: 'var(--border-color)',
                color: 'var(--text-primary)'
              }}
            >
              <div 
                className="flex items-center gap-2.5 min-w-0 cursor-pointer flex-1 group"
                onClick={() => {
                  const activePin = pinnedMessages[activePinIndex % pinnedMessages.length];
                  if (activePin) {
                    scrollToMessage(activePin.id);
                  }
                }}
              >
                <span className="inline-flex shrink-0 transform rotate-45 origin-center text-slate-900 animate-bounce mr-1">
                  <Pin className="w-4 h-4" />
                </span>
                <div className="text-left min-w-0">
                  <span className="text-[10px] text-slate-900 font-bold uppercase tracking-wider block font-heading leading-none mb-1">
                    PINNED MESSAGE {pinnedMessages.length > 1 ? `(${ (activePinIndex % pinnedMessages.length) + 1 }/${pinnedMessages.length})` : ''}
                  </span>
                  <p className="text-xs text-slate-700 truncate font-sans group-hover:text-slate-900 transition-colors">
                    <span className="font-semibold text-slate-500">
                      {allUsers.find(u => u.uid === pinnedMessages[activePinIndex % pinnedMessages.length]?.senderId)?.displayName || 'Member'}:
                    </span>{' '}
                    {pinnedMessages[activePinIndex % pinnedMessages.length]?.text}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                {pinnedMessages.length > 1 && (
                  <button
                    onClick={() => setActivePinIndex(prev => prev + 1)}
                    className="px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-[10px] text-slate-800 font-bold transition-all border border-slate-200 cursor-pointer"
                    title="Cycle to next pinned message"
                  >
                    Next
                  </button>
                )}
                <button
                  onClick={() => handleTogglePin(pinnedMessages[activePinIndex % pinnedMessages.length].id)}
                  className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer"
                  title="Unpin message"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* Group Settings Drawer */}
          {showGroupSettings && activeChatThread?.isGroup && (
            <div className="bg-white border-b border-slate-200 p-4 space-y-3 z-20 shrink-0 text-left font-sans">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <h4 className="text-xs font-bold font-heading text-slate-900 uppercase tracking-wider">
                  Group Info & Members ({activeChatThread.participants.length})
                </h4>
                <button 
                  onClick={() => setShowGroupSettings(false)}
                  className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-800 transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-2 max-h-48 overflow-y-auto">
                {activeChatThread.participants.map(pUid => {
                  const pUser = usersMap.get(pUid);
                  return (
                    <div key={pUid} className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-100">
                      <div className="flex items-center gap-2">
                        <img src={pUser?.photoURL} alt={pUser?.displayName} className="w-7 h-7 rounded-full object-cover" />
                        <span className="text-xs font-bold text-slate-900">{pUser?.displayName || 'Member'}</span>
                      </div>
                      {activeChatThread.groupAdmin === pUid && (
                        <span className="text-[9px] font-bold uppercase bg-slate-900 text-white px-2 py-0.5 rounded-full">Admin</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Messages Stream Field */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 bg-transparent mb-20 relative scrollbar-thin">
            {loading ? (
              <div className="flex flex-col items-center justify-center h-full space-y-3">
                <div 
                  className="w-7 h-7 border-2 border-t-transparent rounded-full animate-spin"
                  style={{ borderColor: 'var(--accent-color)', borderTopColor: 'transparent' }}
                />
                <span className="text-[var(--text-secondary)] text-xs font-mono">Synchronizing messages...</span>
              </div>
            ) : filteredMessages.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-12 text-[var(--text-secondary)] h-full space-y-3">
                <div 
                  className="w-12 h-12 rounded-2xl border flex items-center justify-center shadow-xs"
                  style={{ backgroundColor: 'var(--panel-bg)', borderColor: 'var(--border-color)' }}
                >
                  <MessageCircle className="w-6 h-6 text-[var(--accent-color)]" />
                </div>
                <div className="text-center">
                  <p className="text-xs text-[var(--text-primary)] font-bold font-heading">
                    {inChatSearchQuery ? 'No search results found' : 'Secure End-to-End Chat Active'}
                  </p>
                  <p className="text-[11px] text-[var(--text-secondary)] mt-1">
                    {inChatSearchQuery ? 'Try adjusting your search query keyword.' : 'Type a message below to start communicating.'}
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex flex-col space-y-3.5">
                {/* Date separator */}
                <div className="flex justify-center select-none mb-2">
                  <span 
                    className="px-3.5 py-1 text-[10px] font-bold border rounded-full tracking-wider shadow-2xs backdrop-blur-xs"
                    style={{
                      backgroundColor: 'var(--input-bg)',
                      borderColor: 'var(--border-color)',
                      color: 'var(--text-secondary)'
                    }}
                  >
                    {inChatSearchQuery ? `Filtered search (${filteredMessages.length})` : 'ENCRYPTED CHAT'}
                  </span>
                </div>

                {/* Backdrop for closing reaction popovers */}
                {reactingMessageId && (
                  <div 
                    className="fixed inset-0 z-30 cursor-default bg-black/10 transition-all" 
                    onClick={() => setReactingMessageId(null)}
                  />
                )}

                {filteredMessages.map((msg) => {
                  const isMe = msg.senderId === user?.uid;
                  const isSystem = msg.senderId === 'system';
                  const isStarred = msg.starredBy?.includes(user?.uid || '');

                  if (isSystem) {
                    return (
                      <div key={msg.id} className="w-full flex justify-center py-1.5 px-6">
                        <div 
                          className="max-w-[85%] border rounded-xl px-4 py-1.5 text-center text-[11px] font-sans shadow-2xs select-none"
                          style={{
                            backgroundColor: 'var(--input-bg)',
                            borderColor: 'var(--border-color)',
                            color: 'var(--text-secondary)'
                          }}
                        >
                          {msg.text}
                        </div>
                      </div>
                    );
                  }
                  
                  return (
                    <div 
                      id={`msg-${msg.id}`}
                      key={msg.id} 
                      className={`flex w-full group ${isMe ? 'justify-end' : 'justify-start'} ${
                        reactingMessageId === msg.id ? 'z-40 relative' : 'relative z-10'
                      }`}
                    >
                      <div className={`flex items-end gap-2.5 max-w-[85%] md:max-w-[75%] relative ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                        
                        {!isMe && (
                          <img 
                            referrerPolicy="no-referrer"
                            src={allUsers.find(u => u.uid === msg.senderId)?.photoURL || activeChatPartner.photoURL} 
                            alt="avatar" 
                            className="w-7 h-7 rounded-lg object-cover border mb-0.5 shrink-0 shadow-2xs"
                            style={{
                              backgroundColor: 'var(--input-bg)',
                              borderColor: 'var(--border-color)'
                            }}
                          />
                        )}

                        <div className="flex flex-col relative">
                          
                          {/* Reaction Popover */}
                          <AnimatePresence>
                            {reactingMessageId === msg.id && (
                              <motion.div
                                initial={{ opacity: 0, scale: 0.85, y: 10 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.85, y: 10 }}
                                className={`absolute -top-12 z-50 flex items-center gap-1 border shadow-xl rounded-full px-2.5 py-1.5 backdrop-blur-md ${
                                  isMe ? 'right-0' : 'left-0'
                                }`}
                                style={{
                                  backgroundColor: 'var(--popover-bg)',
                                  borderColor: 'var(--border-color)'
                                }}
                                onClick={(e) => e.stopPropagation()}
                              >
                                {QUICK_REACTION_EMOJIS.map((emoji) => (
                                  <button
                                    key={emoji}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleReactToMessage(msg.id, emoji);
                                      setReactingMessageId(null);
                                    }}
                                    className="text-lg hover:scale-125 transition-transform px-1 cursor-pointer"
                                  >
                                    {emoji}
                                  </button>
                                ))}
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setReactingMessageId(null);
                                  }}
                                  className="p-1 hover:bg-white/10 rounded-full text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </motion.div>
                            )}
                          </AnimatePresence>

                          {/* Message Bubble */}
                          <div 
                            style={isMe ? {
                              background: 'var(--msg-outgoing-bg)',
                              color: 'var(--msg-outgoing-text)',
                              borderColor: 'transparent'
                            } : {
                              background: 'var(--msg-incoming-bg)',
                              color: 'var(--msg-incoming-text)',
                              borderColor: 'var(--border-color)'
                            }}
                            className={`rounded-2xl px-3.5 py-2.5 shadow-xs relative group select-none cursor-pointer border ${
                              isMe 
                                ? 'rounded-br-xs shadow-md' 
                                : 'rounded-bl-xs shadow-xs'
                            } ${reactingMessageId === msg.id ? 'ring-2 ring-[var(--accent-color)]' : ''}`}
                            onDoubleClick={() => setReactingMessageId(msg.id)}
                          >
                            {/* Group Sender Name */}
                            {activeChatThread?.isGroup && !isMe && (
                              <span className="text-[10px] font-bold block mb-1 font-heading text-left select-none" style={{ color: 'var(--accent-color)' }}>
                                {allUsers.find(u => u.uid === msg.senderId)?.displayName || 'Member'}
                              </span>
                            )}

                            {/* Forwarded Tag */}
                            {msg.forwarded && (
                              <div className="flex items-center gap-1 text-[9px] opacity-75 font-bold uppercase mb-1 text-left">
                                <CornerUpRight className="w-3 h-3 shrink-0" />
                                <span>Forwarded</span>
                              </div>
                            )}

                            {/* Edit state */}
                            {editingMessageId === msg.id ? (
                              <div className="flex items-center space-x-2 py-1">
                                <input 
                                  type="text" 
                                  value={editText}
                                  onChange={(e) => setEditText(e.target.value)}
                                  className="px-3 py-1.5 text-xs rounded-xl focus:outline-none border min-w-[150px]"
                                  style={{
                                    backgroundColor: 'var(--input-bg)',
                                    borderColor: 'var(--border-color)',
                                    color: 'var(--text-primary)'
                                  }}
                                  autoFocus
                                />
                                <button 
                                  onClick={handleSaveEdit} 
                                  className="p-1 hover:bg-emerald-500/20 rounded-md text-emerald-400 cursor-pointer"
                                  title="Save edit"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                </button>
                                <button 
                                  onClick={() => setEditingMessageId(null)} 
                                  className="p-1 hover:bg-rose-500/20 rounded-md text-rose-400 cursor-pointer"
                                  title="Cancel edit"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ) : (
                              <div className="flex flex-col gap-1 text-left">
                                {msg.replyTo && (
                                  <div
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      scrollToMessage(msg.replyTo!.id);
                                    }}
                                    className={`mb-1.5 cursor-pointer rounded-lg border-l-2 py-1 px-2.5 max-w-sm font-sans select-none transition-all flex flex-col items-start gap-0.5 ${
                                      isMe ? 'bg-black/20 text-white/90 border-white/60' : 'bg-black/10 text-[var(--text-primary)] border-[var(--accent-color)]'
                                    }`}
                                  >
                                    <span className="block text-[9px] uppercase font-bold tracking-wider opacity-75">
                                      Reply to {msg.replyTo.senderName}
                                    </span>
                                    <span className="block text-[11px] truncate mt-0.5 leading-normal max-w-[200px] md:max-w-[320px]">
                                      {msg.replyTo.text}
                                    </span>
                                  </div>
                                )}

                                {msg.voiceNote ? (
                                  /* Studio Voice Note Message */
                                  <div className="flex items-center gap-3 py-1.5 px-0.5 min-w-[210px] sm:min-w-[260px] text-left select-none">
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleTogglePlayVoice(msg.id);
                                      }}
                                      className={`w-9 h-9 rounded-full flex items-center justify-center cursor-pointer transition-transform active:scale-95 shrink-0 shadow-xs ${
                                        isMe 
                                          ? 'bg-white/20 hover:bg-white/30 text-white' 
                                          : 'bg-purple-100 hover:bg-purple-200 text-[#6D42C7]'
                                      }`}
                                      title={playingVoiceId === msg.id ? "Pause" : "Play Voice Note"}
                                    >
                                      {playingVoiceId === msg.id ? (
                                        <Pause className="w-4 h-4" />
                                      ) : (
                                        <Play className="w-4 h-4 ml-0.5" />
                                      )}
                                    </button>

                                    <div className="flex-1 space-y-1">
                                      {/* Interactive Waveform Audio Visualizer */}
                                      <div className="flex items-center gap-0.5 h-6">
                                        {(msg.voiceNote.waveform || [35, 50, 75, 45, 80, 95, 60, 40, 70, 85, 55, 35, 65, 80, 50]).map((h: number, wIdx: number) => {
                                          const progress = voicePlaybackProgress[msg.id] || 0;
                                          const isPlayed = progress >= (wIdx / 15) * 100;
                                          return (
                                            <span
                                              key={wIdx}
                                              className={`flex-1 rounded-full transition-all ${
                                                isMe
                                                  ? isPlayed ? 'bg-white' : 'bg-white/40'
                                                  : isPlayed ? 'bg-[#6D42C7]' : 'bg-purple-200'
                                              }`}
                                              style={{ height: `${Math.max(25, h)}%` }}
                                            />
                                          );
                                        })}
                                      </div>

                                      <div className="flex justify-between items-center text-[10px] font-mono opacity-85">
                                        <span>
                                          {playingVoiceId === msg.id 
                                            ? `0:${Math.floor(((voicePlaybackProgress[msg.id] || 0) / 100) * (msg.voiceNote.duration || 5)).toString().padStart(2, '0')}`
                                            : '0:00'}
                                        </span>
                                        <span className="flex items-center gap-1">
                                          <Volume2 className="w-2.5 h-2.5 opacity-70" />
                                          {Math.floor((msg.voiceNote.duration || 0) / 60)}:
                                          {((msg.voiceNote.duration || 0) % 60).toString().padStart(2, '0')}
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                ) : msg.pollData ? (
                                  /* Poll Card */
                                  <div className="py-1 px-0.5 text-left select-none max-w-sm">
                                    <div className={`flex items-center gap-1.5 mb-2.5 font-bold font-heading text-xs ${isMe ? 'text-white' : 'text-slate-900'}`}>
                                      <BarChart2 className="w-4 h-4 shrink-0" />
                                      <span>{msg.pollData.question}</span>
                                    </div>
                                    <div className="space-y-2">
                                      {msg.pollData.options.map((option, idx) => {
                                        const votesMap = msg.pollData?.votes || {};
                                        const optionKey = String(idx);
                                        const voterUids = (votesMap[optionKey] || []) as string[];
                                        const voteCount = voterUids.length;

                                        const totalVotes = Object.values(votesMap).reduce((sum: number, uids: any) => sum + (uids?.length || 0), 0) as number;
                                        const percent = totalVotes > 0 ? Math.round((voteCount / totalVotes) * 100) : 0;
                                        const hasVoted = voterUids.includes(user?.uid || '');

                                        return (
                                          <div 
                                            key={idx}
                                            className={`relative block rounded-xl border p-2.5 transition-all text-xs font-sans cursor-pointer ${
                                              isMe ? 'border-slate-700 bg-slate-800 text-white' : 'border-slate-200 bg-slate-50 text-slate-900'
                                            }`}
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleVoteInPoll(msg, idx);
                                            }}
                                          >
                                            <div 
                                              className="absolute top-0 bottom-0 left-0 bg-indigo-500/20 rounded-l-xl transition-all"
                                              style={{ width: `${percent}%` }}
                                            />

                                            <div className="relative flex justify-between items-center z-10">
                                              <div className="flex items-center gap-2 min-w-0">
                                                <div className={`w-3.5 h-3.5 rounded-full flex items-center justify-center border shrink-0 ${
                                                  hasVoted ? 'bg-slate-900 border-slate-900 text-white' : 'border-slate-400'
                                                }`}>
                                                  {hasVoted && <span className="text-[8px]">✓</span>}
                                                </div>
                                                <span className="font-semibold truncate">{option}</span>
                                              </div>
                                              <span className="text-[9px] font-mono font-bold shrink-0 opacity-80">
                                                {voteCount} voted ({percent}%)
                                              </span>
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>
                                ) : msg.mediaAttachment ? (
                                  /* Media / File Attachment */
                                  <div className="space-y-2 max-w-sm text-left select-none">
                                    {msg.mediaAttachment.type === 'image' ? (
                                      <div 
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setLightboxImgUrl(msg.mediaAttachment?.url || null);
                                        }}
                                        className="rounded-xl overflow-hidden cursor-pointer group/img relative border border-black/10 shadow-xs"
                                      >
                                        <img 
                                          src={msg.mediaAttachment.url} 
                                          alt={msg.mediaAttachment.name || 'Attachment'}
                                          className="w-full max-h-64 object-cover group-hover/img:scale-105 transition-transform duration-300"
                                          loading="lazy"
                                        />
                                        <div className="absolute inset-0 bg-black/30 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center text-white gap-1.5 text-xs font-semibold">
                                          <Maximize2 className="w-4 h-4" />
                                          <span>Preview</span>
                                        </div>
                                      </div>
                                    ) : (
                                      <a 
                                        href={msg.mediaAttachment.url} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        onClick={(e) => e.stopPropagation()}
                                        className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                                          isMe ? 'bg-white/10 border-white/20 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                                        }`}
                                      >
                                        <div className="w-10 h-10 rounded-lg bg-indigo-500/20 flex items-center justify-center text-indigo-400 shrink-0">
                                          <FileText className="w-5 h-5" />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                          <p className="text-xs font-bold truncate">{msg.mediaAttachment.name || 'Document'}</p>
                                          <span className="text-[10px] opacity-75">Click to view/download</span>
                                        </div>
                                        <Download className="w-4 h-4 opacity-75 shrink-0" />
                                      </a>
                                    )}
                                    {msg.text && (
                                      <p className="text-xs leading-relaxed break-words">{msg.text}</p>
                                    )}
                                  </div>
                                ) : msg.codeSnippet ? (
                                  /* Code Snippet Box */
                                  <div className="space-y-1.5 max-w-md text-left font-mono select-text">
                                    <div className="flex items-center justify-between px-3 py-1.5 rounded-t-xl bg-slate-900 text-slate-300 text-[11px] border-b border-slate-800">
                                      <div className="flex items-center gap-2">
                                        <Terminal className="w-3.5 h-3.5 text-cyan-400" />
                                        <span className="font-bold font-sans text-white text-xs">
                                          {msg.codeSnippet.title || `${msg.codeSnippet.language} code`}
                                        </span>
                                        <span className="text-[9px] uppercase px-1.5 py-0.5 rounded bg-slate-800 font-mono text-cyan-300">
                                          {msg.codeSnippet.language}
                                        </span>
                                      </div>
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleCopyCode(msg.codeSnippet?.code || '', msg.id);
                                        }}
                                        className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors cursor-pointer"
                                        title="Copy Code"
                                      >
                                        {copiedSnippetId === msg.id ? (
                                          <>
                                            <Check className="w-3 h-3 text-emerald-400" />
                                            <span className="text-emerald-400">Copied</span>
                                          </>
                                        ) : (
                                          <>
                                            <Copy className="w-3 h-3" />
                                            <span>Copy</span>
                                          </>
                                        )}
                                      </button>
                                    </div>
                                    <div className="p-3 bg-slate-950 text-slate-100 rounded-b-xl overflow-x-auto text-xs font-mono max-h-72 border border-slate-900">
                                      <pre className="leading-relaxed">
                                        <code>{msg.codeSnippet.code}</code>
                                      </pre>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="text-sm leading-relaxed break-anywhere whitespace-pre-wrap text-left">
                                    {msg.text}
                                  </div>
                                )}

                                {/* Translated Text Display */}
                                {translatedMessages[msg.id] && (
                                  <div 
                                    className="mt-2 pt-2 border-t text-xs italic text-left space-y-1 select-text"
                                    style={{ borderColor: 'rgba(255,255,255,0.15)' }}
                                  >
                                    <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase not-italic opacity-80" style={{ color: 'var(--accent-color)' }}>
                                      <Languages className="w-3 h-3" />
                                      <span>AI Translation</span>
                                    </div>
                                    <p className="leading-relaxed">{translatedMessages[msg.id]}</p>
                                  </div>
                                )}
                              </div>
                            )}

                            {/* Action overlay */}
                            {editingMessageId !== msg.id && (
                              <div className={`absolute top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 flex items-center space-x-1 transition-all z-20 ${
                                isMe ? '-left-56' : '-right-56 flex-row-reverse space-x-reverse'
                              }`}>
                                {isMe && !msg.pollData && !msg.codeSnippet && (
                                  <>
                                    <button
                                      onClick={() => startEditingMessage(msg)}
                                      className="p-1.5 rounded-lg border shadow-2xs cursor-pointer transition-all hover:scale-105"
                                      style={{
                                        backgroundColor: 'var(--popover-bg)',
                                        borderColor: 'var(--border-color)',
                                        color: 'var(--text-secondary)'
                                      }}
                                      title="Edit Message text"
                                    >
                                      <Edit3 className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      onClick={() => handleDeleteMessage(msg.id)}
                                      className="p-1.5 rounded-lg border shadow-2xs cursor-pointer transition-all hover:scale-105 text-rose-500 hover:bg-rose-500/15"
                                      style={{
                                        backgroundColor: 'var(--popover-bg)',
                                        borderColor: 'var(--border-color)'
                                      }}
                                      title="Remove Message"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </>
                                )}
                                <button
                                  onClick={() => setReplyingMessage(msg)}
                                  className="p-1.5 rounded-lg border shadow-2xs cursor-pointer transition-all hover:scale-105"
                                  style={{
                                    backgroundColor: 'var(--popover-bg)',
                                    borderColor: 'var(--border-color)',
                                    color: 'var(--text-secondary)'
                                  }}
                                  title="Reply"
                                >
                                  <CornerUpLeft className="w-3.5 h-3.5" />
                                </button>
                                
                                {/* Translate Message */}
                                <div className="relative">
                                  <button
                                    onClick={() => setActiveTranslateMenuMsgId(activeTranslateMenuMsgId === msg.id ? null : msg.id)}
                                    className="p-1.5 rounded-lg border shadow-2xs cursor-pointer transition-all hover:scale-105"
                                    style={{
                                      backgroundColor: 'var(--popover-bg)',
                                      borderColor: 'var(--border-color)',
                                      color: 'var(--text-secondary)'
                                    }}
                                    title="Translate Message with AI"
                                  >
                                    <Languages className={`w-3.5 h-3.5 ${translatingMsgId === msg.id ? 'animate-spin text-cyan-400' : ''}`} />
                                  </button>

                                  {activeTranslateMenuMsgId === msg.id && (
                                    <div 
                                      className="absolute bottom-full mb-1 left-0 border shadow-2xl rounded-xl p-1.5 z-50 w-36 text-left font-sans backdrop-blur-md"
                                      style={{
                                        backgroundColor: 'var(--popover-bg)',
                                        borderColor: 'var(--border-color)'
                                      }}
                                    >
                                      <div className="text-[10px] font-bold uppercase text-[var(--text-secondary)] px-2 py-1 border-b" style={{ borderColor: 'var(--border-color)' }}>
                                        Translate to
                                      </div>
                                      {['English', 'Hindi / Urdu', 'Spanish', 'French', 'German', 'Arabic', 'Japanese'].map(lang => (
                                        <button
                                          key={lang}
                                          onClick={() => handleTranslateMessage(msg.id, lang)}
                                          className="w-full text-left px-2 py-1.5 rounded-lg text-xs hover:bg-white/10 text-[var(--text-primary)] transition-colors cursor-pointer"
                                        >
                                          {lang}
                                        </button>
                                      ))}
                                    </div>
                                  )}
                                </div>

                                <button
                                  onClick={() => setReactingMessageId(msg.id)}
                                  className="p-1.5 rounded-lg border shadow-2xs cursor-pointer transition-all hover:scale-105"
                                  style={{
                                    backgroundColor: 'var(--popover-bg)',
                                    borderColor: 'var(--border-color)',
                                    color: 'var(--text-secondary)'
                                  }}
                                  title="React"
                                >
                                  <Smile className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => setForwardingMessage(msg)}
                                  className="p-1.5 rounded-lg border shadow-2xs cursor-pointer transition-all hover:scale-105"
                                  style={{
                                    backgroundColor: 'var(--popover-bg)',
                                    borderColor: 'var(--border-color)',
                                    color: 'var(--text-secondary)'
                                  }}
                                  title="Forward"
                                >
                                  <Forward className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => handleToggleStar(msg)}
                                  className={`p-1.5 rounded-lg border shadow-2xs cursor-pointer transition-all hover:scale-105 ${
                                    isStarred ? 'text-amber-500' : ''
                                  }`}
                                  style={{
                                    backgroundColor: 'var(--popover-bg)',
                                    borderColor: 'var(--border-color)',
                                    color: isStarred ? '#f59e0b' : 'var(--text-secondary)'
                                  }}
                                  title={isStarred ? "Unstar" : "Star"}
                                >
                                  <Star className={`w-3.5 h-3.5 ${isStarred ? 'fill-amber-500' : ''}`} />
                                </button>
                                <button
                                  onClick={() => handleTogglePin(msg.id)}
                                  className="p-1.5 rounded-lg border shadow-2xs cursor-pointer transition-all hover:scale-105"
                                  style={{
                                    backgroundColor: 'var(--popover-bg)',
                                    borderColor: 'var(--border-color)',
                                    color: activeChatThread?.pinnedMessageIds?.includes(msg.id) ? 'var(--accent-color)' : 'var(--text-secondary)'
                                  }}
                                  title={activeChatThread?.pinnedMessageIds?.includes(msg.id) ? "Unpin" : "Pin"}
                                >
                                  <Pin className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            )}

                          </div>

                          {/* Message Reactions display */}
                          {msg.reactions && Object.keys(msg.reactions).length > 0 && (
                            <div className={`flex flex-wrap gap-1 mt-1.5 ${isMe ? 'justify-end' : 'justify-start'}`}>
                              <div 
                                className="flex items-center gap-1 border px-2 py-0.5 rounded-full text-xs shadow-2xs select-none backdrop-blur-xs"
                                style={{
                                  backgroundColor: 'var(--popover-bg)',
                                  borderColor: 'var(--border-color)'
                                }}
                              >
                                {Object.entries(msg.reactions).map(([emoji, uids]) => {
                                  const uidsArray = (uids || []) as string[];
                                  if (uidsArray.length === 0) return null;
                                  return (
                                    <button
                                      key={emoji}
                                      onClick={() => handleReactToMessage(msg.id, emoji)}
                                      className="flex items-center gap-1 hover:scale-110 transition-transform cursor-pointer px-1 rounded-md text-[var(--text-primary)]"
                                    >
                                      <span>{emoji}</span>
                                      {uidsArray.length > 1 && (
                                        <span className="text-[9px] font-mono font-bold text-[var(--text-secondary)]">
                                          {uidsArray.length}
                                        </span>
                                      )}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          )}

                          {/* Bottom timestamp line */}
                          <div className={`flex items-center gap-1.5 mt-1 text-[10px] text-[var(--text-secondary)] select-none opacity-80 ${isMe ? 'justify-end' : 'justify-start'}`}>
                            {isStarred && (
                              <Star className="w-3 h-3 text-amber-500 fill-amber-500 shrink-0" />
                            )}
                            {activeChatThread?.pinnedMessageIds?.includes(msg.id) && (
                              <Pin className="w-3 h-3 shrink-0" style={{ color: 'var(--accent-color)' }} />
                            )}
                            <span>{formatTime(msg.timestamp)}</span>
                            {msg.edited && (
                              <span className="font-mono text-[9px] opacity-75">edited</span>
                            )}
                            {isMe && (
                              <span title={msg.seen ? "Read" : "Delivered"}>
                                {msg.seen ? (
                                  <CheckCheck className="w-3.5 h-3.5 shrink-0 text-[#34B7F1]" />
                                ) : (
                                  <CheckCheck className="w-3.5 h-3.5 shrink-0 text-[var(--text-secondary)] opacity-60" />
                                )}
                              </span>
                            )}
                          </div>

                        </div>

                      </div>
                    </div>
                  );
                })}

                {/* Typing indicator */}
                {typingUserProfiles.length > 0 && (
                  <div className="flex justify-start items-end gap-2 px-1 max-w-[85%] mt-1 ml-1 sm:ml-10">
                    <div 
                      className="border rounded-2xl rounded-bl-none px-3.5 py-1.5 flex items-center gap-1.5 shadow-2xs backdrop-blur-xs"
                      style={{
                        backgroundColor: 'var(--panel-bg)',
                        borderColor: 'var(--border-color)'
                      }}
                    >
                      <div className="flex gap-1 py-1 shrink-0">
                        <span className="animate-bounce w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: 'var(--accent-color)', animationDelay: '0ms' }}></span>
                        <span className="animate-bounce w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: 'var(--accent-color)', animationDelay: '150ms' }}></span>
                        <span className="animate-bounce w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: 'var(--accent-color)', animationDelay: '300ms' }}></span>
                      </div>
                      <span className="text-[10px] text-[var(--text-secondary)] font-medium select-none font-sans">
                        {typingUserProfiles.length === 1 
                          ? `${typingUserProfiles[0].displayName} is typing...` 
                          : `${typingUserProfiles.map(u => u.displayName).join(', ')} are typing...`}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Message Input Container */}
          <div 
            style={{
              backgroundColor: 'var(--header-bg)',
              backdropFilter: 'blur(var(--glass-blur))',
              WebkitBackdropFilter: 'blur(var(--glass-blur))',
              borderColor: 'var(--border-color)'
            }}
            className="absolute bottom-0 left-0 right-0 p-3 sm:p-4 border-t z-10 shrink-0 shadow-lg transition-colors duration-200"
          >
            
            {/* Quick Response Presets Popover */}
            {showQuickResponses && (
              <div 
                className="absolute bottom-20 left-4 border rounded-2xl p-3 shadow-2xl z-55 w-72 text-left font-sans backdrop-blur-md"
                style={{
                  backgroundColor: 'var(--popover-bg)',
                  borderColor: 'var(--border-color)'
                }}
              >
                <div className="flex justify-between items-center mb-2 pb-1.5 border-b" style={{ borderColor: 'var(--border-color)' }}>
                  <span className="text-[10px] text-[var(--text-secondary)] font-bold uppercase tracking-wider font-heading">Quick Replies</span>
                  <button onClick={() => setShowQuickResponses(false)} className="p-1 hover:bg-white/10 rounded text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
                  {QUICK_RESPONSES.map((resp, i) => (
                    <button
                      key={i}
                      onClick={() => handleQuickResponseSelect(resp)}
                      className="w-full text-left px-3 py-2 rounded-xl text-xs hover:bg-white/10 text-[var(--text-primary)] transition-colors font-medium cursor-pointer"
                    >
                      {resp}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Emoji Picker Popover */}
            {showEmojiPicker && (
              <div 
                className="absolute bottom-20 left-4 border rounded-2xl p-3 shadow-2xl z-55 w-64 md:w-72 text-left font-sans backdrop-blur-md"
                style={{
                  backgroundColor: 'var(--popover-bg)',
                  borderColor: 'var(--border-color)'
                }}
              >
                <div className="flex justify-between items-center mb-1.5 border-b pb-1.5" style={{ borderColor: 'var(--border-color)' }}>
                  <span className="text-[9px] text-[var(--text-secondary)] font-bold uppercase tracking-wider font-heading">Select Emoji</span>
                  <button onClick={() => setShowEmojiPicker(false)} className="p-1 hover:bg-white/10 rounded text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="grid grid-cols-7 sm:grid-cols-8 gap-1 max-h-40 overflow-y-auto pr-1">
                  {POPULAR_EMOJIS.map((emoji) => (
                    <button
                      key={emoji}
                      onClick={() => handleEmojiClick(emoji)}
                      className="text-lg p-1 hover:bg-white/10 rounded-md transition-colors text-center active:scale-90 cursor-pointer flex items-center justify-center h-8 w-8"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Disappearing Self-Destruct Menu */}
            {showDisappearingMenu && (
              <div 
                className="absolute bottom-20 left-4 border shadow-2xl rounded-2xl p-4 z-55 w-64 text-left font-sans select-none backdrop-blur-md"
                style={{
                  backgroundColor: 'var(--popover-bg)',
                  borderColor: 'var(--border-color)'
                }}
              >
                <div className="flex justify-between items-center mb-2 pb-1.5 border-b text-xs font-bold uppercase tracking-wider font-heading" style={{ borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}>
                  <span>Self-Destruct Delay</span>
                  <button onClick={() => setShowDisappearingMenu(false)} className="p-0.5 hover:bg-white/10 rounded text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="space-y-1">
                  {[
                    { label: 'Off / Persistent', value: 0 },
                    { label: '5 seconds', value: 5 },
                    { label: '10 seconds', value: 10 },
                    { label: '30 seconds', value: 30 },
                    { label: '1 minute', value: 60 },
                    { label: '5 minutes', value: 300 }
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => {
                        setDisappearingSeconds(opt.value);
                        setShowDisappearingMenu(false);
                      }}
                      className={`w-full text-left px-3 py-2 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                        disappearingSeconds === opt.value
                          ? 'text-white font-bold'
                          : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-white/10'
                      }`}
                      style={{
                        backgroundColor: disappearingSeconds === opt.value ? 'var(--accent-color)' : undefined
                      }}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Poll Creator */}
            {showPollCreator && (
              <div 
                className="absolute bottom-20 left-4 border shadow-2xl rounded-2xl p-4 z-55 w-72 md:w-80 text-left font-sans backdrop-blur-md"
                style={{
                  backgroundColor: 'var(--popover-bg)',
                  borderColor: 'var(--border-color)'
                }}
              >
                <div className="flex justify-between items-center mb-3 pb-2 border-b text-xs font-bold uppercase tracking-wider font-heading" style={{ borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}>
                  <div className="flex items-center gap-1.5" style={{ color: 'var(--accent-color)' }}>
                    <BarChart2 className="w-4 h-4 shrink-0" />
                    <span>Create Poll</span>
                  </div>
                  <button onClick={() => setShowPollCreator(false)} className="p-0.5 hover:bg-white/10 rounded text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="space-y-3">
                  <div className="space-y-1">
                    <label className="text-[10px] text-[var(--text-secondary)] font-bold uppercase tracking-wider block">
                      Poll Question
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Which design is preferred?..."
                      value={pollQuestion}
                      onChange={(e) => setPollQuestion(e.target.value)}
                      className="w-full border text-xs rounded-xl py-2 px-3 focus:outline-none text-[var(--text-primary)] placeholder:text-[var(--text-secondary)]"
                      style={{
                        backgroundColor: 'var(--input-bg)',
                        borderColor: 'var(--border-color)'
                      }}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] text-[var(--text-secondary)] font-bold uppercase tracking-wider block">
                      Options ({pollOptions.length}/6)
                    </label>
                    <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                      {pollOptions.map((choice, oIdx) => (
                        <div key={oIdx} className="flex items-center gap-1.5">
                          <input
                            type="text"
                            placeholder={`Choice ${oIdx + 1}...`}
                            value={choice}
                            onChange={(e) => {
                              const newOpts = [...pollOptions];
                              newOpts[oIdx] = e.target.value;
                              setPollOptions(newOpts);
                            }}
                            className="flex-1 border text-xs rounded-xl py-1.5 px-2.5 focus:outline-none text-[var(--text-primary)] placeholder:text-[var(--text-secondary)]"
                            style={{
                              backgroundColor: 'var(--input-bg)',
                              borderColor: 'var(--border-color)'
                            }}
                          />
                          {pollOptions.length > 2 && (
                            <button
                              onClick={() => setPollOptions(pollOptions.filter((_, i) => i !== oIdx))}
                              className="p-1 text-rose-500 hover:bg-rose-500/15 rounded text-xs cursor-pointer"
                            >
                              ✕
                            </button>
                          )}
                        </div>
                      ))}
                    </div>

                    {pollOptions.length < 6 && (
                      <button
                        onClick={() => setPollOptions([...pollOptions, ''])}
                        className="flex items-center gap-1 text-[10px] hover:underline font-bold uppercase mt-1 cursor-pointer"
                        style={{ color: 'var(--accent-color)' }}
                      >
                        <Plus className="w-3 h-3" />
                        <span>Add Option</span>
                      </button>
                    )}
                  </div>

                  <button
                    disabled={!pollQuestion.trim() || pollOptions.filter(o => o.trim()).length < 2}
                    onClick={() => handleSendPoll(pollQuestion, pollOptions)}
                    className="w-full py-2.5 text-white disabled:opacity-40 rounded-xl text-xs font-bold shadow-xs transition-all active:scale-95 cursor-pointer"
                    style={{ backgroundColor: 'var(--accent-color)' }}
                  >
                    Publish Poll
                  </button>
                </div>
              </div>
            )}

            {/* Replying Banner */}
            {replyingMessage && (
              <div 
                className="flex items-center justify-between border rounded-xl px-3 py-1.5 mb-2 text-xs backdrop-blur-xs"
                style={{
                  backgroundColor: 'var(--panel-bg)',
                  borderColor: 'var(--border-color)',
                  color: 'var(--text-primary)'
                }}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <CornerUpLeft className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--accent-color)' }} />
                  <span className="truncate font-medium">Replying: "{replyingMessage.text}"</span>
                </div>
                <button onClick={() => setReplyingMessage(null)} className="p-1 hover:bg-white/10 rounded text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {!isDirectPartnerFriend ? (
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex flex-col md:flex-row items-center justify-between gap-4 text-left">
                <div className="flex items-start gap-3 min-w-0">
                  <Clock className="w-5 h-5 text-amber-600 shrink-0 mt-0.5 animate-pulse" />
                  <div className="min-w-0">
                    <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider font-heading">Friendship Connection Required</h4>
                    <p className="text-[11px] text-slate-600 mt-0.5 leading-relaxed">
                      {friendshipStatus === 'pending_sent' ? (
                        "Your friend request is pending. Communication will unlock once accepted."
                      ) : friendshipStatus === 'pending_received' ? (
                        `${activeChatPartner.displayName} invited you to connect. Accept to begin chatting.`
                      ) : (
                        "Send a friend request to start communicating."
                      )}
                    </p>
                  </div>
                </div>

                <div className="shrink-0 flex items-center gap-2">
                  {friendshipStatus === 'pending_received' && (
                    <button
                      onClick={handleAcceptFriendRequestDirect}
                      className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-[10px] font-bold uppercase rounded-xl transition-all cursor-pointer shadow-xs flex items-center gap-1.5"
                    >
                      <Check className="w-3.5 h-3.5 text-white" />
                      <span>Accept Request</span>
                    </button>
                  )}

                  {friendshipStatus === 'none' && (
                    <button
                      onClick={handleSendFriendRequestDirect}
                      className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-[10px] font-bold uppercase rounded-xl transition-all cursor-pointer shadow-xs"
                    >
                      Send Friend Request
                    </button>
                  )}

                  {friendshipStatus === 'pending_sent' && (
                    <span className="px-3 py-1.5 bg-slate-200 text-slate-700 text-[10px] font-bold uppercase tracking-wider rounded-xl select-none">
                      Pending
                    </span>
                  )}
                </div>
              </div>
            ) : !canPostMessage ? (
              <div className="bg-slate-100 border border-slate-200 rounded-2xl p-4 flex items-center gap-3.5 text-left select-none">
                <Lock className="w-5 h-5 text-slate-700 shrink-0" />
                <div className="min-w-0">
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider font-heading">Admins Only</h4>
                  <p className="text-[10px] text-slate-500 mt-1">
                    Only group administrators can post messages in this thread.
                  </p>
                </div>
              </div>
            ) : isRecordingVoice ? (
              /* Voice Note Recording Studio Bar */
              <div className="bg-purple-50 border border-purple-200 rounded-2xl p-2 px-3 flex items-center justify-between gap-3 animate-pulse shadow-xs">
                <div className="flex items-center gap-2 text-xs font-bold text-[#6D42C7] shrink-0">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500"></span>
                  </span>
                  <span>Recording: 0:{recordingSeconds.toString().padStart(2, '0')}</span>
                </div>

                <div className="flex items-center gap-1 h-6 flex-1 max-w-[200px] justify-center">
                  {recordingWaveform.map((h, i) => (
                    <span 
                      key={i} 
                      className="flex-1 bg-[#6D42C7] rounded-full transition-all duration-150" 
                      style={{ height: `${Math.max(20, h)}%` }} 
                    />
                  ))}
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={handleCancelVoiceRecording}
                    className="p-2 rounded-xl hover:bg-rose-100 text-rose-600 transition-colors cursor-pointer"
                    title="Cancel Recording"
                  >
                    <X className="w-4 h-4" />
                  </button>
                  <button
                    onClick={handleSendVoiceNote}
                    className="px-3.5 py-2 text-white rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-md"
                    style={{ backgroundColor: 'var(--accent-color)' }}
                    title="Send Voice Note"
                  >
                    <Send className="w-3.5 h-3.5 text-white" />
                    <span>Send</span>
                  </button>
                </div>
              </div>
            ) : (
              <div 
                style={{
                  backgroundColor: 'var(--input-bg)',
                  borderColor: 'var(--border-color)'
                }}
                className="border rounded-2xl p-1.5 flex items-center gap-1.5 transition-colors shadow-xs"
              >
                {/* Emoji toggle button */}
                <button
                  type="button"
                  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                  className="p-2 rounded-xl text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-white/10 transition-colors cursor-pointer shrink-0"
                  title="Insert emoji"
                >
                  <Smile className="w-5 h-5" />
                </button>

                {/* Attachments / Extra Tools Menu Toggle */}
                <div className="relative shrink-0 flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAttachmentModal(true);
                      setAttachmentTab('presets');
                    }}
                    className="p-2 rounded-xl text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-white/10 transition-colors cursor-pointer"
                    title="Send Photo / Preset Image / Link"
                  >
                    <Paperclip className="w-4.5 h-4.5" />
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowCodeModal(true)}
                    className="p-2 rounded-xl text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-white/10 transition-colors cursor-pointer"
                    title="Share Code Snippet"
                  >
                    <Code className="w-4.5 h-4.5" />
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowQuickResponses(!showQuickResponses)}
                    className="p-2 rounded-xl text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-white/10 transition-colors cursor-pointer"
                    title="Quick Replies"
                  >
                    <Sparkles className="w-4.5 h-4.5" />
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowPollCreator(!showPollCreator)}
                    className="p-2 rounded-xl text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-white/10 transition-colors cursor-pointer"
                    title="Create Poll"
                  >
                    <BarChart2 className="w-4.5 h-4.5" />
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowDisappearingMenu(!showDisappearingMenu)}
                    className={`p-2 rounded-xl transition-colors cursor-pointer ${
                      disappearingSeconds > 0 ? 'text-amber-500' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-white/10'
                    }`}
                    title={disappearingSeconds > 0 ? `Self-destruct: ${disappearingSeconds}s` : "Timer"}
                  >
                    <Clock className="w-4.5 h-4.5" />
                  </button>
                </div>

                {disappearingSeconds > 0 && (
                  <span 
                    className="text-[9px] font-bold px-2 py-0.5 rounded-full border shrink-0 font-mono"
                    style={{
                      backgroundColor: 'rgba(var(--card-bg-base), 0.9)',
                      borderColor: 'var(--accent-color)',
                      color: 'var(--accent-color)'
                    }}
                  >
                    {disappearingSeconds}s
                  </span>
                )}

                <input
                  type="text"
                  placeholder="Type a message..."
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="flex-1 bg-transparent border-none text-sm focus:ring-0 placeholder:text-[var(--text-secondary)] outline-none px-2 py-2 text-[var(--text-primary)] font-sans"
                />

                {inputText.trim() ? (
                  <button
                    onClick={handleSendMessage}
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-md transition-all active:scale-95 cursor-pointer shrink-0"
                    style={{
                      backgroundColor: 'var(--accent-color)'
                    }}
                    title="Send message"
                  >
                    <Send className="w-4.5 h-4.5 text-white" />
                  </button>
                ) : (
                  <button
                    onClick={handleStartVoiceRecording}
                    className="w-10 h-10 rounded-xl flex items-center justify-center transition-all active:scale-95 cursor-pointer shrink-0 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-white/10"
                    title="Record voice note"
                  >
                    <Mic className="w-5 h-5" />
                  </button>
                )}
              </div>
            )}
          </div>
        </>
      ) : (
        /* Empty Idle Screen */
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-transparent">
          <motion.div 
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
            style={{
              backgroundColor: 'var(--panel-bg)',
              borderColor: 'var(--border-color)'
            }}
            className="flex flex-col items-center max-w-md justify-center space-y-6 p-10 rounded-3xl border shadow-2xl backdrop-blur-md"
          >
            <div 
              className="w-16 h-16 rounded-2xl flex items-center justify-center shadow-xl text-white relative"
              style={{
                backgroundColor: 'var(--accent-color)',
                boxShadow: '0 12px 30px var(--accent-glow)'
              }}
            >
              <MessageCircle className="w-8 h-8 text-white" />
              <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 border-2 border-white" />
            </div>

            <div className="space-y-2">
              <h2 className="text-[var(--text-primary)] text-xl font-bold font-heading">
                Pulse Messenger Web
              </h2>
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed max-w-xs mx-auto">
                Send and receive messages with real-time sync, HD voice notes, instant polls, and crystal audio/video calls.
              </p>
            </div>

            <div 
              className="flex items-center space-x-2 text-[11px] font-sans border px-4 py-2 rounded-full shadow-2xs"
              style={{
                backgroundColor: 'var(--input-bg)',
                borderColor: 'var(--border-color)',
                color: 'var(--text-secondary)'
              }}
            >
              <Lock className="w-3.5 h-3.5" style={{ color: 'var(--accent-color)' }} />
              <span>End-to-end encrypted chat channel</span>
            </div>
          </motion.div>
        </div>
      )}

      {/* Message Forwarding Dialog */}
      <AnimatePresence>
        {forwardingMessage && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 font-sans">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              style={{
                backgroundColor: 'var(--popover-bg)',
                borderColor: 'var(--border-color)',
                color: 'var(--text-primary)'
              }}
              className="border rounded-2xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col max-h-[80vh] z-50"
            >
              <div className="p-4 border-b flex items-center justify-between" style={{ borderColor: 'var(--border-color)' }}>
                <div className="flex items-center gap-2">
                  <Forward className="w-5 h-5" style={{ color: 'var(--accent-color)' }} />
                  <span className="text-sm font-bold font-heading uppercase tracking-wider text-[var(--text-primary)]">Forward Message</span>
                </div>
                <button
                  onClick={() => {
                    setForwardingMessage(null);
                    setForwardSearchQuery('');
                    setForwardedThreadIds({});
                  }}
                  className="p-1 rounded-lg hover:bg-white/10 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Message preview snippet */}
              <div className="p-4 border-b" style={{ backgroundColor: 'var(--input-bg)', borderColor: 'var(--border-color)' }}>
                <span className="text-[10px] text-[var(--text-secondary)] font-bold uppercase tracking-wider block mb-1 text-left">
                  Message Content Preview
                </span>
                <div 
                  className="border rounded-xl p-3 text-xs italic max-h-24 overflow-y-auto break-anywhere text-left"
                  style={{
                    backgroundColor: 'var(--panel-bg)',
                    borderColor: 'var(--border-color)',
                    color: 'var(--text-primary)'
                  }}
                >
                  {forwardingMessage.pollData ? (
                    <div className="flex items-center gap-1.5 font-semibold">
                      <BarChart2 className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--accent-color)' }} />
                      <span>{forwardingMessage.pollData.question}</span>
                    </div>
                  ) : (
                    forwardingMessage.text
                  )}
                </div>
              </div>

              {/* Search chats box */}
              <div className="p-3 border-b" style={{ borderColor: 'var(--border-color)' }}>
                <div className="relative">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-secondary)]" />
                  <input
                    type="text"
                    placeholder="Search active chats..."
                    value={forwardSearchQuery}
                    onChange={(e) => setForwardSearchQuery(e.target.value)}
                    className="w-full border rounded-xl py-2 pl-10 pr-4 text-xs outline-none text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] font-sans"
                    style={{
                      backgroundColor: 'var(--input-bg)',
                      borderColor: 'var(--border-color)'
                    }}
                  />
                </div>
              </div>

              {/* Chat threads list */}
              <div className="flex-1 overflow-y-auto p-2 space-y-1 max-h-[40vh]">
                {filteredForwardThreads.length === 0 ? (
                  <div className="p-8 text-center text-[var(--text-secondary)] text-xs font-medium">
                    No active chat threads found
                  </div>
                ) : (
                  filteredForwardThreads.map(({ thread, partner }) => {
                    const hasForwarded = forwardedThreadIds[thread.id];
                    return (
                      <div
                        key={thread.id}
                        className="flex items-center justify-between p-3 rounded-xl transition-all border border-transparent hover:bg-white/5"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <img
                            src={partner.photoURL}
                            alt={partner.displayName}
                            className="w-9 h-9 rounded-xl object-cover border"
                            style={{
                              backgroundColor: 'var(--input-bg)',
                              borderColor: 'var(--border-color)'
                            }}
                            referrerPolicy="no-referrer"
                          />
                          <div className="text-left min-w-0">
                            <h4 className="text-xs font-bold truncate font-heading pr-2 text-[var(--text-primary)]">
                              {partner.displayName}
                            </h4>
                            <span className="text-[10px] text-[var(--text-secondary)] font-medium">
                              {thread.isGroup ? 'Group Chat' : 'Direct Chat'}
                            </span>
                          </div>
                        </div>

                        <button
                          onClick={() => handleForwardMessageToThread(thread, partner)}
                          disabled={hasForwarded}
                          className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all flex items-center gap-1 cursor-pointer select-none ${
                            hasForwarded
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              : 'text-white shadow-xs'
                          }`}
                          style={{
                            backgroundColor: hasForwarded ? undefined : 'var(--accent-color)'
                          }}
                        >
                          {hasForwarded ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                              <span>Sent</span>
                            </>
                          ) : (
                            <>
                              <Forward className="w-3.5 h-3.5 text-white" />
                              <span>Send</span>
                            </>
                          )}
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Attachment & Media Presets Dialog (Zero Firebase Storage Required) */}
      <AnimatePresence>
        {showAttachmentModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-55 font-sans">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              style={{
                backgroundColor: 'var(--popover-bg)',
                borderColor: 'var(--border-color)',
                color: 'var(--text-primary)'
              }}
              className="border rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[85vh] z-55"
            >
              {/* Header */}
              <div className="p-4 border-b flex items-center justify-between" style={{ borderColor: 'var(--border-color)' }}>
                <div className="flex items-center gap-2">
                  <ImageIcon className="w-5 h-5" style={{ color: 'var(--accent-color)' }} />
                  <span className="text-sm font-bold font-heading uppercase tracking-wider text-[var(--text-primary)]">
                    Share Photo or Media
                  </span>
                </div>
                <button
                  onClick={() => {
                    setShowAttachmentModal(false);
                    setAttachmentUrl('');
                    setAttachmentName('');
                  }}
                  className="p-1 rounded-lg hover:bg-white/10 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Navigation Tabs */}
              <div className="flex border-b text-xs font-semibold px-4 pt-2 gap-2" style={{ borderColor: 'var(--border-color)' }}>
                <button
                  onClick={() => setAttachmentTab('presets')}
                  className={`pb-2.5 px-3 border-b-2 font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    attachmentTab === 'presets'
                      ? 'border-[var(--accent-color)] text-[var(--accent-color)]'
                      : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Curated Presets</span>
                </button>
                <button
                  onClick={() => setAttachmentTab('customLink')}
                  className={`pb-2.5 px-3 border-b-2 font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    attachmentTab === 'customLink'
                      ? 'border-[var(--accent-color)] text-[var(--accent-color)]'
                      : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  <Globe className="w-3.5 h-3.5" />
                  <span>Direct Link</span>
                </button>
                <button
                  onClick={() => setAttachmentTab('deviceUpload')}
                  className={`pb-2.5 px-3 border-b-2 font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    attachmentTab === 'deviceUpload'
                      ? 'border-[var(--accent-color)] text-[var(--accent-color)]'
                      : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>From Device</span>
                </button>
              </div>

              {/* Tab Content Body */}
              <div className="p-4 flex-1 overflow-y-auto space-y-4 max-h-[50vh]">
                {/* 1. Curated Presets Tab */}
                {attachmentTab === 'presets' && (
                  <div className="space-y-4">
                    <p className="text-xs text-[var(--text-secondary)]">
                      Select a high-resolution photo preset to attach instantly:
                    </p>
                    <div className="space-y-3">
                      {PRESET_CHAT_MEDIA.map((group) => (
                        <div key={group.category} className="space-y-1.5">
                          <span className="text-[10px] text-[var(--text-secondary)] font-bold uppercase tracking-wider block text-left">
                            {group.category}
                          </span>
                          <div className="grid grid-cols-4 gap-2">
                            {group.items.map((item) => {
                              const isSelected = attachmentUrl === item.url;
                              return (
                                <button
                                  key={item.id}
                                  type="button"
                                  onClick={() => {
                                    setAttachmentUrl(item.url);
                                    setAttachmentName(item.title);
                                    setAttachmentType('image');
                                  }}
                                  className={`relative rounded-xl overflow-hidden border aspect-video transition-all cursor-pointer group ${
                                    isSelected ? 'ring-2 ring-[var(--accent-color)] scale-105 shadow-md' : 'hover:opacity-90'
                                  }`}
                                  style={{
                                    borderColor: isSelected ? 'var(--accent-color)' : 'var(--border-color)'
                                  }}
                                  title={item.title}
                                >
                                  <img
                                    src={item.url}
                                    alt={item.title}
                                    className="w-full h-full object-cover"
                                    loading="lazy"
                                  />
                                  <span className="absolute bottom-0 inset-x-0 bg-black/60 text-[9px] text-white truncate px-1 py-0.5 text-center font-bold">
                                    {item.title}
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 2. Direct Link Tab */}
                {attachmentTab === 'customLink' && (
                  <div className="space-y-3">
                    <div className="space-y-1.5 text-left">
                      <label className="text-[10px] text-[var(--text-secondary)] font-bold uppercase tracking-wider block">
                        Media or File URL
                      </label>
                      <input
                        type="url"
                        placeholder="https://images.unsplash.com/... or any image/document link"
                        value={attachmentUrl}
                        onChange={(e) => {
                          setAttachmentUrl(e.target.value);
                          if (e.target.value.match(/\.(jpg|jpeg|png|gif|webp|svg)/i)) {
                            setAttachmentType('image');
                          }
                        }}
                        className="w-full border rounded-xl px-3 py-2 text-xs focus:outline-none text-[var(--text-primary)] font-sans"
                        style={{
                          backgroundColor: 'var(--input-bg)',
                          borderColor: 'var(--border-color)'
                        }}
                      />
                    </div>

                    {/* Attachment Type Selector */}
                    <div className="flex gap-2 text-left">
                      <button
                        type="button"
                        onClick={() => setAttachmentType('image')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border cursor-pointer ${
                          attachmentType === 'image' ? 'text-white' : 'text-[var(--text-secondary)]'
                        }`}
                        style={{
                          backgroundColor: attachmentType === 'image' ? 'var(--accent-color)' : 'var(--input-bg)',
                          borderColor: attachmentType === 'image' ? 'var(--accent-color)' : 'var(--border-color)'
                        }}
                      >
                        📷 Image / Photo
                      </button>
                      <button
                        type="button"
                        onClick={() => setAttachmentType('file')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border cursor-pointer ${
                          attachmentType === 'file' ? 'text-white' : 'text-[var(--text-secondary)]'
                        }`}
                        style={{
                          backgroundColor: attachmentType === 'file' ? 'var(--accent-color)' : 'var(--input-bg)',
                          borderColor: attachmentType === 'file' ? 'var(--accent-color)' : 'var(--border-color)'
                        }}
                      >
                        📎 Document / File
                      </button>
                    </div>
                  </div>
                )}

                {/* 3. Device Upload Tab */}
                {attachmentTab === 'deviceUpload' && (
                  <div className="space-y-3">
                    <input
                      ref={attachmentFileInputRef}
                      type="file"
                      accept="image/*,application/pdf,.doc,.docx,.txt"
                      onChange={handleDeviceAttachmentSelect}
                      className="hidden"
                    />

                    <div
                      onClick={() => attachmentFileInputRef.current?.click()}
                      className="border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer hover:border-[var(--accent-color)] transition-all space-y-2"
                      style={{
                        backgroundColor: 'var(--input-bg)',
                        borderColor: 'var(--border-color)'
                      }}
                    >
                      <div className="w-12 h-12 mx-auto rounded-2xl bg-white/10 flex items-center justify-center text-[var(--accent-color)]">
                        <Upload className="w-6 h-6" />
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs font-bold text-[var(--text-primary)]">
                          {isCompressingAttachment ? 'Compressing Image...' : 'Click to Browse File / Photo'}
                        </p>
                        <p className="text-[10px] text-[var(--text-secondary)]">
                          Device photos are compressed into lightweight data URLs locally with zero cloud storage required.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Selected Preview Box */}
                {attachmentUrl && (
                  <div 
                    className="border rounded-xl p-3 space-y-2 text-left"
                    style={{
                      backgroundColor: 'var(--input-bg)',
                      borderColor: 'var(--border-color)'
                    }}
                  >
                    <span className="text-[10px] text-[var(--text-secondary)] font-bold uppercase tracking-wider block">
                      Attachment Preview
                    </span>
                    {attachmentType === 'image' ? (
                      <div className="max-h-40 rounded-lg overflow-hidden border border-black/10">
                        <img
                          src={attachmentUrl}
                          alt="Preview"
                          className="w-full h-36 object-cover"
                        />
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 p-2 rounded-lg bg-black/10 text-xs font-mono truncate">
                        <FileText className="w-4 h-4 text-indigo-400 shrink-0" />
                        <span className="truncate">{attachmentName || 'Selected Document'}</span>
                      </div>
                    )}

                    {/* Optional Caption */}
                    <div className="space-y-1 pt-1">
                      <label className="text-[10px] text-[var(--text-secondary)] font-bold uppercase tracking-wider block">
                        Caption / Note (Optional)
                      </label>
                      <input
                        type="text"
                        placeholder="Add a message or description..."
                        value={attachmentName}
                        onChange={(e) => setAttachmentName(e.target.value)}
                        className="w-full border rounded-xl px-3 py-1.5 text-xs focus:outline-none text-[var(--text-primary)] font-sans"
                        style={{
                          backgroundColor: 'var(--panel-bg)',
                          borderColor: 'var(--border-color)'
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Footer Actions */}
              <div className="p-4 border-t flex items-center justify-end gap-2" style={{ borderColor: 'var(--border-color)' }}>
                <button
                  type="button"
                  onClick={() => {
                    setShowAttachmentModal(false);
                    setAttachmentUrl('');
                    setAttachmentName('');
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={!attachmentUrl.trim()}
                  onClick={handleSendAttachment}
                  className="px-5 py-2 rounded-xl text-xs font-bold text-white transition-all active:scale-95 disabled:opacity-40 flex items-center gap-1.5 shadow-md cursor-pointer"
                  style={{ backgroundColor: 'var(--accent-color)' }}
                >
                  <Send className="w-3.5 h-3.5 text-white" />
                  <span>Send Attachment</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Code Snippet Share Dialog */}
      <AnimatePresence>
        {showCodeModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-55 font-sans">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              style={{
                backgroundColor: 'var(--popover-bg)',
                borderColor: 'var(--border-color)',
                color: 'var(--text-primary)'
              }}
              className="border rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[85vh] z-55"
            >
              <div className="p-4 border-b flex items-center justify-between" style={{ borderColor: 'var(--border-color)' }}>
                <div className="flex items-center gap-2">
                  <Terminal className="w-5 h-5 text-cyan-400" />
                  <span className="text-sm font-bold font-heading uppercase tracking-wider text-[var(--text-primary)]">
                    Share Code Snippet
                  </span>
                </div>
                <button
                  onClick={() => setShowCodeModal(false)}
                  className="p-1 rounded-lg hover:bg-white/10 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-4 space-y-3 flex-1 overflow-y-auto">
                <div className="grid grid-cols-2 gap-2 text-left">
                  <div className="space-y-1">
                    <label className="text-[10px] text-[var(--text-secondary)] font-bold uppercase tracking-wider block">
                      Language
                    </label>
                    <select
                      value={codeSnippetLang}
                      onChange={(e) => setCodeSnippetLang(e.target.value)}
                      className="w-full border rounded-xl px-3 py-2 text-xs focus:outline-none text-[var(--text-primary)] font-mono"
                      style={{
                        backgroundColor: 'var(--input-bg)',
                        borderColor: 'var(--border-color)'
                      }}
                    >
                      {['typescript', 'javascript', 'python', 'html', 'css', 'json', 'sql', 'rust', 'go', 'bash'].map((lang) => (
                        <option key={lang} value={lang}>{lang}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] text-[var(--text-secondary)] font-bold uppercase tracking-wider block">
                      Snippet Title (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. auth-helper.ts"
                      value={codeSnippetTitle}
                      onChange={(e) => setCodeSnippetTitle(e.target.value)}
                      className="w-full border rounded-xl px-3 py-2 text-xs focus:outline-none text-[var(--text-primary)] font-sans"
                      style={{
                        backgroundColor: 'var(--input-bg)',
                        borderColor: 'var(--border-color)'
                      }}
                    />
                  </div>
                </div>

                <div className="space-y-1 text-left">
                  <label className="text-[10px] text-[var(--text-secondary)] font-bold uppercase tracking-wider block">
                    Source Code
                  </label>
                  <textarea
                    rows={8}
                    placeholder="// Paste your code snippet here..."
                    value={codeSnippetCode}
                    onChange={(e) => setCodeSnippetCode(e.target.value)}
                    className="w-full border rounded-xl p-3 text-xs font-mono focus:outline-none text-[var(--text-primary)] resize-none"
                    style={{
                      backgroundColor: 'var(--input-bg)',
                      borderColor: 'var(--border-color)'
                    }}
                  />
                </div>
              </div>

              <div className="p-4 border-t flex items-center justify-end gap-2" style={{ borderColor: 'var(--border-color)' }}>
                <button
                  type="button"
                  onClick={() => setShowCodeModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={!codeSnippetCode.trim()}
                  onClick={handleSendCodeSnippet}
                  className="px-5 py-2 rounded-xl text-xs font-bold text-white transition-all active:scale-95 disabled:opacity-40 flex items-center gap-1.5 shadow-md cursor-pointer"
                  style={{ backgroundColor: 'var(--accent-color)' }}
                >
                  <Send className="w-3.5 h-3.5 text-white" />
                  <span>Send Code</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* AI Conversation Summary Dialog */}
      <AnimatePresence>
        {showSummaryModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-55 font-sans">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              style={{
                backgroundColor: 'var(--popover-bg)',
                borderColor: 'var(--border-color)',
                color: 'var(--text-primary)'
              }}
              className="border rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[85vh] z-55"
            >
              <div className="p-4 border-b flex items-center justify-between" style={{ borderColor: 'var(--border-color)' }}>
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5" style={{ color: 'var(--accent-color)' }} />
                  <span className="text-sm font-bold font-heading uppercase tracking-wider text-[var(--text-primary)]">
                    Conversation AI Summary
                  </span>
                </div>
                <button
                  onClick={() => setShowSummaryModal(false)}
                  className="p-1 rounded-lg hover:bg-white/10 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-5 space-y-3 flex-1 overflow-y-auto text-left text-xs leading-relaxed">
                {isSummarizing ? (
                  <div className="py-12 flex flex-col items-center justify-center space-y-3">
                    <Sparkles className="w-8 h-8 animate-spin text-[var(--accent-color)]" />
                    <p className="text-xs text-[var(--text-secondary)] font-medium">
                      Gemini is generating an executive summary of this chat...
                    </p>
                  </div>
                ) : (
                  <div 
                    className="p-4 rounded-xl border leading-relaxed whitespace-pre-wrap font-sans"
                    style={{
                      backgroundColor: 'var(--input-bg)',
                      borderColor: 'var(--border-color)',
                      color: 'var(--text-primary)'
                    }}
                  >
                    {summaryContent || 'No summary available.'}
                  </div>
                )}
              </div>

              <div className="p-4 border-t flex items-center justify-end gap-2" style={{ borderColor: 'var(--border-color)' }}>
                {summaryContent && (
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(summaryContent);
                    }}
                    className="px-4 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer flex items-center gap-1.5 text-[var(--text-primary)] hover:bg-white/10"
                    style={{ borderColor: 'var(--border-color)' }}
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Summary</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setShowSummaryModal(false)}
                  className="px-5 py-2 rounded-xl text-xs font-bold text-white transition-all active:scale-95 shadow-md cursor-pointer"
                  style={{ backgroundColor: 'var(--accent-color)' }}
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Lightbox Image Viewer */}
      <AnimatePresence>
        {lightboxImgUrl && (
          <div 
            onClick={() => setLightboxImgUrl(null)}
            className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 z-60 font-sans cursor-zoom-out"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="relative max-w-4xl max-h-[90vh] flex flex-col items-center"
            >
              <div className="absolute top-3 right-3 flex items-center gap-2 z-10">
                <a
                  href={lightboxImgUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 rounded-xl bg-black/60 hover:bg-black/80 text-white text-xs font-bold flex items-center gap-1.5 transition-all"
                  title="Open full image in new tab"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
                <button
                  onClick={() => setLightboxImgUrl(null)}
                  className="p-2 rounded-xl bg-black/60 hover:bg-black/80 text-white transition-all cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <img
                src={lightboxImgUrl}
                alt="Full size preview"
                className="max-w-full max-h-[85vh] object-contain rounded-2xl shadow-2xl border border-white/10"
              />
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
