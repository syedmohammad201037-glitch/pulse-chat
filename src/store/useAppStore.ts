import { create } from 'zustand';
import { UserProfile, ChatThread, CallHandshake, FriendRequest } from '../types';
import { doc, setDoc, updateDoc, serverTimestamp, getDoc } from 'firebase/firestore';
import { db, auth, OperationType, handleFirestoreError } from '../lib/firebase';
import { signInWithPopup, signOut, signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile, signInAnonymously } from 'firebase/auth';
import { googleProvider } from '../lib/firebase';
import { ThemeMode, WallpaperPattern } from '../lib/theme';

interface AppState {
  user: UserProfile | null;
  loading: boolean;
  activeChatId: string | null;
  activeChatPartner: UserProfile | null;
  allUsers: UserProfile[];
  usersError: string | null;
  chats: ChatThread[];
  activeCall: CallHandshake | null;
  friendRequests: FriendRequest[];
  themeMode: ThemeMode;
  graphicsMode: GraphicsMode;
  wallpaperPattern: WallpaperPattern;
  customWallpaperUrl: string;
  chatTransparency: number;
  chatBlur: number;
  bgBrightness: number;
  bgDimming: number;
  rightPanelView: 'none' | 'profile' | 'theme' | 'contact_info' | 'audio' | 'local_ai';
  localAiOpen: boolean;
  savedMessagesFilter: boolean;
  activeStoryUser: UserProfile | null;
  
  // Actions
  setUser: (user: UserProfile | null) => void;
  setLoading: (loading: boolean) => void;
  setActiveChat: (chatId: string | null, partner: UserProfile | null) => void;
  setAllUsers: (users: UserProfile[]) => void;
  setUsersError: (error: string | null) => void;
  setChats: (chats: ChatThread[]) => void;
  setActiveCall: (call: CallHandshake | null) => void;
  setFriendRequests: (requests: FriendRequest[]) => void;
  setThemeMode: (theme: ThemeMode) => void;
  setGraphicsMode: (mode: GraphicsMode) => void;
  setWallpaperPattern: (wallpaper: WallpaperPattern) => void;
  setCustomWallpaperUrl: (url: string) => void;
  setChatTransparency: (transparency: number) => void;
  setChatBlur: (blur: number) => void;
  setBgBrightness: (brightness: number) => void;
  setBgDimming: (dimming: number) => void;
  setRightPanelView: (view: 'none' | 'profile' | 'theme' | 'contact_info' | 'audio' | 'local_ai') => void;
  setLocalAiOpen: (open: boolean) => void;
  setSavedMessagesFilter: (active: boolean) => void;
  setActiveStoryUser: (user: UserProfile | null) => void;
  
  // Async Operations
  loginWithGoogle: (customUsername?: string) => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string, displayName: string) => Promise<void>;
  loginAsGuest: (displayName?: string) => Promise<void>;
  logout: () => Promise<void>;
  updateOnlineStatus: (isOnline: boolean) => Promise<void>;
}

const getInitialTheme = (): ThemeMode => {
  const saved = localStorage.getItem('pulsechat_theme');
  if (saved === 'dark' || saved === 'titanium' || saved === 'purple' || saved === 'light') {
    return saved as ThemeMode;
  }
  return 'dark';
};

const getInitialWallpaper = (): WallpaperPattern => {
  const saved = localStorage.getItem('pulsechat_wallpaper');
  if (saved === 'matrix_mesh') {
    localStorage.setItem('pulsechat_wallpaper', 'cyber_skyline');
    return 'cyber_skyline';
  }
  if (saved === 'cyber_skyline' || saved === 'cosmic_nebula' || saved === 'minimal_flow' || saved === 'none' || saved === 'custom') {
    return saved as WallpaperPattern;
  }
  return 'cyber_skyline';
};


// ---- Graphics mode: potato (lightest) | balanced | ultra (full effects) ----
export type GraphicsMode = 'potato' | 'balanced' | 'ultra';

function detectGraphicsMode(): GraphicsMode {
  const hc = navigator.hardwareConcurrency || 4;
  const mem = (navigator as any).deviceMemory as number | undefined;
  if (hc <= 2 || (mem !== undefined && mem <= 2)) return 'potato';
  if (hc <= 4 || (mem !== undefined && mem <= 4)) return 'balanced';
  return 'ultra';
}

function getInitialGraphics(): GraphicsMode {
  const saved = localStorage.getItem('pulsechat_graphics');
  const mode: GraphicsMode =
    saved === 'potato' || saved === 'balanced' || saved === 'ultra' ? saved : detectGraphicsMode();
  document.documentElement.dataset.graphics = mode; // CSS hooks onto this
  return mode;
}

export const useAppStore = create<AppState>((set, get) => ({
  user: null,
  loading: true,
  activeChatId: null,
  activeChatPartner: null,
  allUsers: [],
  usersError: null,
  chats: [],
  activeCall: null,
  friendRequests: [],
  themeMode: getInitialTheme(),
  graphicsMode: getInitialGraphics(),
  wallpaperPattern: getInitialWallpaper(),
  customWallpaperUrl: localStorage.getItem('pulsechat_custom_wallpaper') || '',
  chatTransparency: Number(localStorage.getItem('pulsechat_transparency') || '75'),
  chatBlur: Number(localStorage.getItem('pulsechat_blur') || '16'),
  bgBrightness: Number(localStorage.getItem('pulsechat_bg_brightness') || '85'),
  bgDimming: Number(localStorage.getItem('pulsechat_bg_dimming') || '35'),
  rightPanelView: 'none',
  localAiOpen: false,
  savedMessagesFilter: false,
  activeStoryUser: null,

  setUser: (user) => set({ user }),
  setLoading: (loading) => set({ loading }),
  // Opening a chat also leaves the AI page
  setActiveChat: (activeChatId, activeChatPartner) =>
    set(activeChatId ? { activeChatId, activeChatPartner, localAiOpen: false } : { activeChatId, activeChatPartner }),
  setAllUsers: (allUsers) => set({ allUsers, usersError: null }),
  setUsersError: (usersError) => set({ usersError }),
  setChats: (chats) => set({ chats }),
  setActiveCall: (activeCall) => set({ activeCall }),
  setFriendRequests: (friendRequests) => set({ friendRequests }),
  setGraphicsMode: (graphicsMode) => {
    localStorage.setItem('pulsechat_graphics', graphicsMode);
    document.documentElement.dataset.graphics = graphicsMode;
    set({ graphicsMode });
  },
  setThemeMode: (themeMode) => {
    localStorage.setItem('pulsechat_theme', themeMode);
    set({ themeMode });
  },
  setWallpaperPattern: (wallpaperPattern) => {
    localStorage.setItem('pulsechat_wallpaper', wallpaperPattern);
    set({ wallpaperPattern });
  },
  setCustomWallpaperUrl: (customWallpaperUrl) => {
    localStorage.setItem('pulsechat_custom_wallpaper', customWallpaperUrl);
    set({ customWallpaperUrl, wallpaperPattern: 'custom' });
    localStorage.setItem('pulsechat_wallpaper', 'custom');
  },
  setChatTransparency: (chatTransparency) => {
    localStorage.setItem('pulsechat_transparency', String(chatTransparency));
    set({ chatTransparency });
  },
  setChatBlur: (chatBlur) => {
    localStorage.setItem('pulsechat_blur', String(chatBlur));
    set({ chatBlur });
  },
  setBgBrightness: (bgBrightness) => {
    localStorage.setItem('pulsechat_bg_brightness', String(bgBrightness));
    set({ bgBrightness });
  },
  setBgDimming: (bgDimming) => {
    localStorage.setItem('pulsechat_bg_dimming', String(bgDimming));
    set({ bgDimming });
  },
  setRightPanelView: (rightPanelView) => {
    set({ rightPanelView });
  },
  setLocalAiOpen: (localAiOpen) => set({ localAiOpen }),
  setSavedMessagesFilter: (savedMessagesFilter) => set({ savedMessagesFilter }),
  setActiveStoryUser: (activeStoryUser) => set({ activeStoryUser }),

  loginWithGoogle: async (customUsername?: string) => {
    try {
      const response = await signInWithPopup(auth, googleProvider);
      const credentialUser = response.user;
      
      const userRef = doc(db, 'users', credentialUser.uid);
      const userDoc = await getDoc(userRef).catch(err => {
        handleFirestoreError(err, OperationType.GET, `users/${credentialUser.uid}`);
        return null;
      });

      const chosenName = customUsername || credentialUser.displayName || credentialUser.email?.split('@')[0] || 'User';

      const profileData = {
        uid: credentialUser.uid,
        displayName: chosenName,
        email: credentialUser.email || '',
        photoURL: credentialUser.photoURL || `https://api.dicebear.com/7.x/adventurer/svg?seed=${credentialUser.uid}`,
        online: true,
        lastSeen: serverTimestamp()
      };

      await setDoc(userRef, profileData, { merge: true }).catch(err => {
        console.warn('Google login firestore sync notice:', err);
      });
    } catch (e: any) {
      console.error('Login Failed', e);
      throw e;
    }
  },

  signInWithEmail: async (email, password) => {
    try {
      const response = await signInWithEmailAndPassword(auth, email, password);
      const credentialUser = response.user;
      
      const userRef = doc(db, 'users', credentialUser.uid);
      const profileData = {
        uid: credentialUser.uid,
        displayName: credentialUser.displayName || credentialUser.email?.split('@')[0] || 'User',
        email: credentialUser.email || email,
        photoURL: credentialUser.photoURL || `https://api.dicebear.com/7.x/adventurer/svg?seed=${credentialUser.uid}`,
        online: true,
        lastSeen: serverTimestamp()
      };
      await setDoc(userRef, profileData, { merge: true }).catch(err => {
        console.warn('Email sign-in firestore sync notice:', err);
      });
    } catch (e: any) {
      console.error('Email sign-in failed', e);
      throw e;
    }
  },

  signUpWithEmail: async (email, password, displayName) => {
    try {
      const response = await createUserWithEmailAndPassword(auth, email, password);
      const credentialUser = response.user;
      
      await updateProfile(credentialUser, {
        displayName: displayName,
        photoURL: `https://api.dicebear.com/7.x/adventurer/svg?seed=${credentialUser.uid}`
      }).catch(() => {});

      const userRef = doc(db, 'users', credentialUser.uid);
      const profileData = {
        uid: credentialUser.uid,
        displayName: displayName,
        email: credentialUser.email || email,
        photoURL: `https://api.dicebear.com/7.x/adventurer/svg?seed=${credentialUser.uid}`,
        online: true,
        lastSeen: serverTimestamp()
      };

      await setDoc(userRef, profileData, { merge: true }).catch(err => {
        console.warn('Email sign-up firestore sync notice:', err);
      });
    } catch (e: any) {
      console.error('Email sign-up failed', e);
      throw e;
    }
  },

  loginAsGuest: async (displayName?: string) => {
    try {
      let response;
      try {
        response = await signInAnonymously(auth);
      } catch (err) {
        console.warn('Anonymous sign-in failed, using client fallback profile', err);
      }

      const uid = response?.user?.uid || `guest_${Math.random().toString(36).substring(2, 9)}`;
      const chosenName = displayName?.trim() || `Guest_${uid.substring(0, 5)}`;
      const profileData: UserProfile = {
        uid,
        displayName: chosenName,
        email: `${chosenName.toLowerCase()}@pulsechat.demo`,
        photoURL: `https://api.dicebear.com/7.x/adventurer/svg?seed=${uid}`,
        online: true,
        lastSeen: serverTimestamp() as any
      };

      if (response?.user) {
        const userRef = doc(db, 'users', uid);
        await setDoc(userRef, profileData, { merge: true }).catch(err => {
          console.warn('Could not save guest to firestore:', err);
        });
      }

      set({ user: profileData, loading: false });
    } catch (e: any) {
      console.error('Guest login error:', e);
      // Fallback local user so user is never blocked
      const fallbackUid = `guest_${Date.now()}`;
      const chosenName = displayName?.trim() || 'Guest User';
      set({
        user: {
          uid: fallbackUid,
          displayName: chosenName,
          email: `${chosenName.toLowerCase()}@pulsechat.demo`,
          photoURL: `https://api.dicebear.com/7.x/adventurer/svg?seed=${fallbackUid}`,
          online: true,
          lastSeen: serverTimestamp() as any
        },
        loading: false
      });
    }
  },

  logout: async () => {
    try {
      const currentUser = get().user;
      if (currentUser && auth.currentUser) {
        const userRef = doc(db, 'users', currentUser.uid);
        await updateDoc(userRef, {
          online: false,
          lastSeen: serverTimestamp()
        }).catch((err) => {
          console.warn('Could not update online status during logout:', err);
        });
      }
    } catch (e) {
      console.warn('Logout status update error:', e);
    } finally {
      try {
        await signOut(auth);
      } catch (err) {
        console.warn('Firebase signOut error:', err);
      }
      set({ 
        user: null, 
        activeChatId: null, 
        activeChatPartner: null, 
        activeCall: null,
        chats: [],
        friendRequests: []
      });
    }
  },

  updateOnlineStatus: async (isOnline: boolean) => {
    try {
      const currentUser = get().user;
      if (currentUser && auth.currentUser) {
        const userRef = doc(db, 'users', currentUser.uid);
        await updateDoc(userRef, {
          online: isOnline,
          lastSeen: serverTimestamp()
        }).catch((err) => {
          console.warn('Could not update presence:', err);
        });
      }
    } catch (e) {
      console.warn('Presence update error:', e);
    }
  }
}));
