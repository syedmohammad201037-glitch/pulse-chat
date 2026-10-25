import { Timestamp } from 'firebase/firestore';

export interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  photoURL: string;
  online: boolean;
  lastSeen: Timestamp;
  bio?: string;
  statusEmoji?: string;
  statusText?: string;
  accentColor?: 'indigo' | 'rose' | 'emerald' | 'amber' | 'violet';
  customWallpaper?: 'cosmic' | 'grid' | 'slate' | 'nebula';
  enableSounds?: boolean;
}

export interface FriendRequest {
  id: string; // sorted(uid1, uid2)
  senderId: string;
  receiverId: string;
  status: 'pending' | 'accepted' | 'declined';
  participants: string[];
  timestamp: Timestamp;
}

export interface LastMessage {
  text: string;
  senderId: string;
  timestamp: Timestamp;
}

export interface ChatThread {
  id: string; // sorted(uid1, uid2) or unique group ID
  participants: string[];
  typing: Record<string, boolean>;
  unreadCount: Record<string, number>;
  lastMessage?: LastMessage;
  isGroup?: boolean;
  groupName?: string;
  groupAvatar?: string;
  createdBy?: string;
  admins?: string[];
  pinnedMessageIds?: string[];
}

export interface UserStory {
  id: string;
  userId: string;
  userName: string;
  userPhoto: string;
  text?: string;
  mediaUrl?: string;
  color?: string;
  timestamp: Timestamp;
  expiresAt: Timestamp;
  viewers: string[];
}

export interface ChatMessage {
  id: string;
  senderId: string;
  receiverId: string;
  text: string;
  timestamp: Timestamp;
  edited: boolean;
  seen: boolean;
  delivered?: boolean;
  starredBy?: string[];
  voiceNote?: {
    duration: number; // in seconds
    waveform?: number[];
    audioUrl?: string; // base64 data url or synthesized audio
  };
  reactions?: Record<string, string[]>; // e.g. { "❤️": ["uid1", "uid2"] }
  disappearingDuration?: number; // duration in seconds
  disappearingAt?: any; // Timestamp or number when it will die
  forwarded?: boolean;
  replyTo?: {
    id: string;
    senderId: string;
    senderName: string;
    text: string;
  };
  pollData?: {
    question: string;
    options: string[];
    votes: Record<string, string[]>; // optionIndex e.g. "0" -> [uid1, uid2]
  };
  codeSnippet?: {
    language: string;
    code: string;
  };
  mediaAttachment?: {
    url: string;
    type: 'image' | 'file';
    fileName?: string;
    fileSize?: string;
  };
  translatedText?: Record<string, string>;
  audioTranscript?: string;
  isAiResponse?: boolean;
  scheduledFor?: any;
}

export type CallType = 'voice' | 'video';
export type CallStatus = 'ringing' | 'accepted' | 'rejected' | 'ended';

export interface WebRTCSessionDescription {
  type: RTCSdpType;
  sdp: string;
}

export interface CallHandshake {
  id: string;
  callerId: string;
  callerName: string;
  callerPhoto: string;
  receiverId: string;
  type: CallType;
  status: CallStatus;
  timestamp: Timestamp;
  offer?: WebRTCSessionDescription;
  answer?: WebRTCSessionDescription;
}

export interface IceCandidateData {
  candidate: string;
  sdpMid: string | null;
  sdpMLineIndex: number | null;
  usernameFragment?: string | null;
}
