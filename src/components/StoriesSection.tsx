import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useAppStore } from '../store/useAppStore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { compressImageFile } from '../lib/imageUtils';
import { PRESET_STORY_PHOTOS } from '../lib/presetImages';
import { 
  collection, 
  query, 
  onSnapshot, 
  setDoc, 
  doc, 
  deleteDoc, 
  updateDoc, 
  arrayUnion, 
  serverTimestamp, 
  Timestamp 
} from 'firebase/firestore';
import { UserStory, UserProfile } from '../types';
import { 
  Plus, 
  Sparkles, 
  X, 
  Send, 
  ChevronLeft, 
  ChevronRight, 
  Trash2, 
  Eye, 
  Clock, 
  Image as ImageIcon,
  Palette,
  MessageCircle,
  Upload,
  Camera
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const GRADIENT_PRESETS = [
  'from-purple-600 via-indigo-600 to-purple-800',
  'from-pink-500 via-rose-500 to-purple-600',
  'from-blue-600 via-teal-500 to-emerald-600',
  'from-amber-500 via-orange-600 to-rose-600',
  'from-slate-900 via-purple-950 to-slate-900',
  'from-violet-600 via-fuchsia-600 to-pink-600'
];

interface StoriesSectionProps {
  onOpenChatWithUser?: (userId: string) => void;
}

export default function StoriesSection({ onOpenChatWithUser }: StoriesSectionProps) {
  const { user, allUsers, setActiveChat } = useAppStore();
  const [stories, setStories] = useState<UserStory[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [storyText, setStoryText] = useState('');
  const [storyImageUrl, setStoryImageUrl] = useState('');
  const [selectedGradient, setSelectedGradient] = useState(GRADIENT_PRESETS[0]);
  const [activeViewingStoryIndex, setActiveViewingStoryIndex] = useState<number | null>(null);
  const [storyReplyText, setStoryReplyText] = useState('');
  const [isPosting, setIsPosting] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const PHOTO_PRESETS = [
    { name: 'Aurora', url: 'https://images.unsplash.com/photo-1531366936337-7c912a4589a7?auto=format&fit=crop&w=800&q=80' },
    { name: 'Sunset', url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80' },
    { name: 'Neon City', url: 'https://images.unsplash.com/photo-1519501025264-65ba15a82390?auto=format&fit=crop&w=800&q=80' },
    { name: 'Mountains', url: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=800&q=80' },
    { name: 'Coffee Vibe', url: 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&w=800&q=80' }
  ];

  const handleDevicePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingPhoto(true);
    try {
      // Compress device photo to compact Data URL (800x800 max)
      const dataUrl = await compressImageFile(file, 800, 800, 0.82);
      setStoryImageUrl(dataUrl);
    } catch (err) {
      console.error('Failed to compress story photo:', err);
    } finally {
      setIsUploadingPhoto(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Subscribe to real-time stories (within 24 hours)
  useEffect(() => {
    if (!user) {
      setStories([]);
      return;
    }

    const storiesRef = collection(db, 'stories');
    const q = query(storiesRef);

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const now = Date.now();
      const cutoff = now - 24 * 60 * 60 * 1000;

      const loadedStories: UserStory[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        const createdAt = data.timestamp?.toMillis ? data.timestamp.toMillis() : now;
        
        // Filter out expired stories (older than 24h)
        if (createdAt >= cutoff) {
          loadedStories.push({
            id: docSnap.id,
            userId: data.userId,
            userName: data.userName || 'User',
            userPhoto: data.userPhoto || `https://api.dicebear.com/7.x/adventurer/svg?seed=${data.userId}`,
            text: data.text || '',
            mediaUrl: data.mediaUrl || '',
            color: data.color || GRADIENT_PRESETS[0],
            timestamp: data.timestamp,
            expiresAt: data.expiresAt,
            viewers: data.viewers || []
          });
        }
      });

      // Sort newest first
      loadedStories.sort((a, b) => {
        const tA = a.timestamp?.toMillis ? a.timestamp.toMillis() : 0;
        const tB = b.timestamp?.toMillis ? b.timestamp.toMillis() : 0;
        return tB - tA;
      });

      setStories(loadedStories);
    }, (err) => {
      console.warn('Stories subscription notice:', err?.message || err);
    });

    return () => unsubscribe();
  }, [user]);

  // Map users for fast profile lookups
  const usersMap = useMemo(() => {
    const map = new Map<string, UserProfile>();
    allUsers.forEach((u) => map.set(u.uid, u));
    return map;
  }, [allUsers]);

  // Current user's stories vs others' stories
  const myStories = useMemo(() => {
    if (!user) return [];
    return stories.filter((s) => s.userId === user.uid);
  }, [stories, user]);

  const otherStories = useMemo(() => {
    if (!user) return stories;
    return stories.filter((s) => s.userId !== user.uid);
  }, [stories, user]);

  // Story Creation handler
  const handlePostStory = async () => {
    if (!user || (!storyText.trim() && !storyImageUrl.trim())) return;
    setIsPosting(true);

    try {
      const newStoryRef = doc(collection(db, 'stories'));
      const currentUserProfile = usersMap.get(user.uid) || user;

      const payload: UserStory = {
        id: newStoryRef.id,
        userId: user.uid,
        userName: currentUserProfile.displayName || 'Pulse User',
        userPhoto: currentUserProfile.photoURL || `https://api.dicebear.com/7.x/adventurer/svg?seed=${user.uid}`,
        text: storyText.trim(),
        mediaUrl: storyImageUrl.trim(),
        color: selectedGradient,
        timestamp: Timestamp.now(),
        expiresAt: Timestamp.fromMillis(Date.now() + 24 * 60 * 60 * 1000),
        viewers: []
      };

      // 1. Optimistically insert into local state
      setStories(prev => [payload, ...prev.filter(s => s.id !== payload.id)]);

      // 2. Persist to Firestore stories collection
      await setDoc(newStoryRef, {
        ...payload,
        timestamp: serverTimestamp()
      }, { merge: true });

      setStoryText('');
      setStoryImageUrl('');
      setShowCreateModal(false);
    } catch (e: any) {
      console.error('Failed to post story:', e);
      // Local optimistic update already visible so user status is preserved
      setShowCreateModal(false);
    } finally {
      setIsPosting(false);
    }
  };

  // Mark story as viewed by current user
  useEffect(() => {
    if (activeViewingStoryIndex === null || !user) return;
    const currentStory = stories[activeViewingStoryIndex];
    if (!currentStory) return;

    if (!currentStory.viewers.includes(user.uid) && currentStory.userId !== user.uid) {
      const storyRef = doc(db, 'stories', currentStory.id);
      updateDoc(storyRef, {
        viewers: arrayUnion(user.uid)
      }).catch((e) => console.error('Failed to mark story viewed:', e));
    }
  }, [activeViewingStoryIndex, stories, user]);

  // Story Auto-Advance Timer (5 seconds)
  useEffect(() => {
    if (activeViewingStoryIndex === null) return;

    const timer = setTimeout(() => {
      if (activeViewingStoryIndex < stories.length - 1) {
        setActiveViewingStoryIndex((prev) => (prev !== null ? prev + 1 : null));
      } else {
        setActiveViewingStoryIndex(null);
      }
    }, 5000);

    return () => clearTimeout(timer);
  }, [activeViewingStoryIndex, stories.length]);

  // Delete Story handler
  const handleDeleteStory = async (storyId: string) => {
    try {
      const storyRef = doc(db, 'stories', storyId);
      await deleteDoc(storyRef);
      setActiveViewingStoryIndex(null);
    } catch (e: any) {
      console.error('Failed to delete story:', e);
    }
  };

  // Reply to story directly via Chat
  const handleReplyToStory = async () => {
    if (!user || activeViewingStoryIndex === null || !storyReplyText.trim()) return;
    const currentStory = stories[activeViewingStoryIndex];
    if (!currentStory) return;

    const partnerProfile = usersMap.get(currentStory.userId);
    if (partnerProfile) {
      setActiveChat('', partnerProfile);
    }
    setActiveViewingStoryIndex(null);
    setStoryReplyText('');
  };

  const activeStory = activeViewingStoryIndex !== null ? stories[activeViewingStoryIndex] : null;

  return (
    <div className="flex flex-col h-full bg-transparent font-sans text-left">
      {/* Header with Add Story CTA */}
      <div 
        className="p-4 border-b flex items-center justify-between"
        style={{
          backgroundColor: 'var(--header-bg)',
          borderColor: 'var(--border-color)'
        }}
      >
        <div>
          <h3 className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider font-heading flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5" style={{ color: 'var(--accent-color)' }} />
            <span>Stories & Status</span>
          </h3>
          <p className="text-[10px] text-[var(--text-secondary)] mt-0.5">Updates disappear after 24 hours</p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="px-3 py-1.5 text-white text-xs font-bold rounded-xl flex items-center gap-1 shadow-sm transition-transform active:scale-95 cursor-pointer"
          style={{ backgroundColor: 'var(--accent-color)' }}
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add Story</span>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        {/* My Status Section */}
        <div>
          <span className="text-[10px] text-[var(--text-secondary)] font-bold uppercase tracking-wider block mb-2 font-heading">
            My Status
          </span>
          <div 
            onClick={() => {
              if (myStories.length > 0) {
                const idx = stories.findIndex((s) => s.id === myStories[0].id);
                setActiveViewingStoryIndex(idx !== -1 ? idx : 0);
              } else {
                setShowCreateModal(true);
              }
            }}
            className="flex items-center gap-3 p-2 rounded-2xl border hover:bg-slate-500/10 transition-all cursor-pointer group"
            style={{
              backgroundColor: 'var(--input-bg)',
              borderColor: 'var(--border-color)'
            }}
          >
            <div className="relative">
              <div 
                className={`w-12 h-12 rounded-2xl p-0.5 ${
                  myStories.length > 0 ? 'bg-gradient-to-tr from-purple-500 to-indigo-500' : 'border-2 border-dashed'
                }`}
                style={{ borderColor: myStories.length > 0 ? undefined : 'var(--accent-color)' }}
              >
                <img
                  src={user?.photoURL || `https://api.dicebear.com/7.x/adventurer/svg?seed=${user?.uid}`}
                  alt="My status"
                  className="w-full h-full rounded-xl object-cover bg-slate-800"
                />
              </div>
              {myStories.length === 0 && (
                <div 
                  className="absolute -bottom-1 -right-1 w-5 h-5 text-white rounded-full flex items-center justify-center border-2 shadow-xs"
                  style={{ backgroundColor: 'var(--accent-color)', borderColor: 'var(--panel-bg)' }}
                >
                  <Plus className="w-3 h-3" />
                </div>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <h4 className="text-xs font-bold text-[var(--text-primary)] truncate">
                {myStories.length > 0 ? 'My Active Status' : 'Add to my status'}
              </h4>
              <p className="text-[10px] text-[var(--text-secondary)] truncate mt-0.5">
                {myStories.length > 0 
                  ? `${myStories.length} update(s) • ${myStories[0].viewers.length} views`
                  : 'Share photos or thoughts for 24h'}
              </p>
            </div>
          </div>
        </div>

        {/* Recent Updates from Contacts */}
        <div>
          <span className="text-[10px] text-[var(--text-secondary)] font-bold uppercase tracking-wider block mb-2 font-heading">
            Recent Updates ({otherStories.length})
          </span>

          {otherStories.length === 0 ? (
            <div 
              className="py-8 text-center rounded-2xl border p-4"
              style={{
                backgroundColor: 'var(--input-bg)',
                borderColor: 'var(--border-color)'
              }}
            >
              <Clock className="w-6 h-6 text-[var(--text-secondary)] mx-auto mb-2 opacity-70" />
              <p className="text-xs font-bold text-[var(--text-primary)] font-heading">No recent stories</p>
              <p className="text-[10px] text-[var(--text-secondary)] mt-1">
                When your contacts share status updates, they will appear here.
              </p>
            </div>
          ) : (
            <div className="space-y-1.5">
              {otherStories.map((story) => {
                const storyIdx = stories.findIndex((s) => s.id === story.id);
                const isViewed = user ? story.viewers.includes(user.uid) : false;

                return (
                  <div
                    key={story.id}
                    onClick={() => setActiveViewingStoryIndex(storyIdx)}
                    className="flex items-center gap-3 p-2.5 rounded-2xl border hover:bg-white/10 transition-all cursor-pointer group"
                    style={{
                      backgroundColor: 'var(--input-bg)',
                      borderColor: 'var(--border-color)'
                    }}
                  >
                    <div className={`w-11 h-11 rounded-2xl p-0.5 ${
                      isViewed ? 'bg-white/20' : 'bg-gradient-to-tr from-purple-500 to-pink-500'
                    }`}>
                      <img
                        src={story.userPhoto}
                        alt={story.userName}
                        className="w-full h-full rounded-xl object-cover bg-slate-800"
                      />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-bold text-[var(--text-primary)] truncate font-heading">
                          {story.userName}
                        </h4>
                        <span className="text-[9px] text-[var(--text-secondary)] font-mono">
                          {story.timestamp?.toMillis 
                            ? new Date(story.timestamp.toMillis()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                            : 'Just now'}
                        </span>
                      </div>
                      <p className="text-[10px] text-[var(--text-secondary)] truncate mt-0.5">
                        {story.text || 'Shared a status photo'}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Create Story Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="border rounded-3xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
              style={{
                backgroundColor: 'var(--popover-bg)',
                borderColor: 'var(--border-color)',
                color: 'var(--text-primary)',
                backdropFilter: 'blur(var(--glass-blur))'
              }}
            >
              <div 
                className="p-4 border-b flex items-center justify-between"
                style={{ borderColor: 'var(--border-color)' }}
              >
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4" style={{ color: 'var(--accent-color)' }} />
                  <h3 className="text-sm font-bold font-heading text-[var(--text-primary)]">Create New Story</h3>
                </div>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="p-1 hover:bg-white/10 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-5 space-y-4 overflow-y-auto">
                {/* Live Story Preview Card */}
                <div className={`h-48 rounded-2xl bg-gradient-to-tr ${selectedGradient} p-5 flex flex-col justify-between text-white shadow-inner relative overflow-hidden`}>
                  {storyImageUrl && (
                    <img 
                      src={storyImageUrl} 
                      alt="Story preview" 
                      className="absolute inset-0 w-full h-full object-cover opacity-60"
                      onError={() => {}}
                    />
                  )}
                  <div className="relative z-10 flex items-center gap-2">
                    <img
                      src={user?.photoURL || `https://api.dicebear.com/7.x/adventurer/svg?seed=${user?.uid}`}
                      alt="Avatar"
                      className="w-8 h-8 rounded-full border border-white/40 object-cover"
                    />
                    <span className="text-xs font-bold drop-shadow-xs">{user?.displayName || 'You'}</span>
                  </div>

                  <div className="relative z-10 text-center my-auto">
                    <p className="text-sm font-bold drop-shadow-md break-words whitespace-pre-wrap">
                      {storyText || 'Type your message below...'}
                    </p>
                  </div>

                  <div className="relative z-10 text-[9px] opacity-75 font-mono">
                    24h Expiring Status
                  </div>
                </div>

                {/* Text input */}
                <div>
                  <label className="text-[10px] text-[var(--text-secondary)] font-bold uppercase tracking-wider block mb-1">
                    Story Text / Caption
                  </label>
                  <textarea
                    rows={3}
                    placeholder="What's on your mind?..."
                    value={storyText}
                    onChange={(e) => setStoryText(e.target.value)}
                    className="w-full border rounded-xl p-3 text-xs focus:outline-none text-[var(--text-primary)]"
                    style={{
                      backgroundColor: 'var(--input-bg)',
                      borderColor: 'var(--border-color)'
                    }}
                  />
                </div>

                {/* Image/Photo Attachment */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] text-[var(--text-secondary)] font-bold uppercase tracking-wider flex items-center gap-1">
                      <ImageIcon className="w-3 h-3" style={{ color: 'var(--accent-color)' }} />
                      <span>Story Photo / Background</span>
                    </label>
                    {storyImageUrl && (
                      <button
                        type="button"
                        onClick={() => setStoryImageUrl('')}
                        className="text-[10px] text-rose-400 font-bold hover:underline cursor-pointer"
                      >
                        Remove Photo
                      </button>
                    )}
                  </div>

                  {/* Device upload button */}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleDevicePhotoSelect}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploadingPhoto}
                    className="w-full py-2 px-3 rounded-xl border flex items-center justify-center gap-2 text-xs font-bold transition-all hover:scale-[1.01] cursor-pointer shadow-xs"
                    style={{
                      backgroundColor: 'var(--input-bg)',
                      borderColor: 'var(--border-color)',
                      color: 'var(--text-primary)'
                    }}
                  >
                    <Upload className="w-3.5 h-3.5 text-[var(--accent-color)]" />
                    <span>{isUploadingPhoto ? 'Processing Photo...' : 'Upload Photo from Device / Gallery'}</span>
                  </button>

                  {/* Curated High-Res Photo Gallery Presets */}
                  <div className="space-y-1.5">
                    <span className="text-[9px] text-[var(--text-secondary)] font-bold uppercase tracking-wider block">
                      Curated Photo Presets (1-Click Select)
                    </span>
                    <div className="space-y-2 max-h-36 overflow-y-auto pr-1 scrollbar-thin">
                      {PRESET_STORY_PHOTOS.map((group) => (
                        <div key={group.category} className="space-y-1">
                          <span className="text-[9px] text-[var(--text-secondary)] font-medium block">
                            {group.category}
                          </span>
                          <div className="grid grid-cols-4 gap-1.5">
                            {group.items.map((item) => {
                              const isSelected = storyImageUrl === item.url;
                              return (
                                <button
                                  key={item.id}
                                  type="button"
                                  onClick={() => setStoryImageUrl(item.url)}
                                  className={`relative rounded-lg overflow-hidden border aspect-video transition-all cursor-pointer group ${
                                    isSelected ? 'ring-2 ring-[var(--accent-color)] scale-105' : 'hover:opacity-90'
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
                                  <span className="absolute bottom-0 inset-x-0 bg-black/60 text-[8px] text-white truncate px-1 py-0.5 text-center font-bold">
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

                  {/* Custom URL Input */}
                  <input
                    type="url"
                    placeholder="Or paste any custom image link (https://...)"
                    value={storyImageUrl}
                    onChange={(e) => setStoryImageUrl(e.target.value)}
                    className="w-full border rounded-xl px-3 py-2 text-xs focus:outline-none text-[var(--text-primary)] font-sans"
                    style={{
                      backgroundColor: 'var(--input-bg)',
                      borderColor: 'var(--border-color)'
                    }}
                  />
                </div>

                {/* Color Preset Palette */}
                <div>
                  <label className="text-[10px] text-[var(--text-secondary)] font-bold uppercase tracking-wider block mb-2 flex items-center gap-1">
                    <Palette className="w-3 h-3" style={{ color: 'var(--accent-color)' }} />
                    <span>Gradient Theme</span>
                  </label>
                  <div className="flex gap-2 overflow-x-auto pb-1">
                    {GRADIENT_PRESETS.map((grad, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setSelectedGradient(grad)}
                        className={`w-8 h-8 rounded-xl bg-gradient-to-tr ${grad} shrink-0 transition-transform cursor-pointer ${
                          selectedGradient === grad ? 'scale-110 ring-2 ring-white ring-offset-2' : 'hover:scale-105'
                        }`}
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* Footer action */}
              <div 
                className="p-4 border-t flex items-center justify-end gap-2"
                style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--input-bg)' }}
              >
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-xs font-bold text-[var(--text-secondary)] hover:text-[var(--text-primary)] rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handlePostStory}
                  disabled={isPosting || (!storyText.trim() && !storyImageUrl.trim())}
                  className="px-5 py-2 text-white text-xs font-bold rounded-xl shadow-md transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                  style={{ backgroundColor: 'var(--accent-color)' }}
                >
                  {isPosting ? 'Publishing...' : 'Share Status'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Fullscreen Story Viewer Modal */}
      <AnimatePresence>
        {activeStory && activeViewingStoryIndex !== null && (
          <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 z-60">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative w-full max-w-sm h-[580px] rounded-3xl overflow-hidden shadow-2xl flex flex-col justify-between text-white"
            >
              {/* Background gradient or image */}
              <div className={`absolute inset-0 bg-gradient-to-tr ${activeStory.color || GRADIENT_PRESETS[0]}`} />
              {activeStory.mediaUrl && (
                <img
                  src={activeStory.mediaUrl}
                  alt="Story full"
                  className="absolute inset-0 w-full h-full object-cover opacity-80"
                />
              )}

              {/* Progress bar */}
              <div className="relative z-20 p-4 space-y-3">
                <div className="flex gap-1.5 h-1 w-full bg-white/30 rounded-full overflow-hidden">
                  <div className="h-full bg-white rounded-full animate-[progress_5s_linear]" style={{ width: '100%' }} />
                </div>

                {/* Author Info header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <img
                      src={activeStory.userPhoto}
                      alt={activeStory.userName}
                      className="w-9 h-9 rounded-full border border-white/60 object-cover"
                    />
                    <div>
                      <h4 className="text-xs font-bold drop-shadow-xs">{activeStory.userName}</h4>
                      <span className="text-[10px] opacity-75 drop-shadow-xs">
                        {activeStory.timestamp?.toMillis 
                          ? new Date(activeStory.timestamp.toMillis()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                          : 'Just now'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {user && activeStory.userId === user.uid && (
                      <button
                        onClick={() => handleDeleteStory(activeStory.id)}
                        className="p-1.5 rounded-full bg-black/40 hover:bg-rose-600 text-white transition-colors cursor-pointer"
                        title="Delete status"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      onClick={() => setActiveViewingStoryIndex(null)}
                      className="p-1.5 rounded-full bg-black/40 hover:bg-black/60 text-white transition-colors cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Main Content Area */}
              <div className="relative z-20 px-6 my-auto text-center">
                {activeStory.text && (
                  <p className="text-base sm:text-lg font-bold leading-relaxed drop-shadow-md break-words whitespace-pre-wrap bg-black/20 p-4 rounded-2xl backdrop-blur-xs">
                    {activeStory.text}
                  </p>
                )}
              </div>

              {/* Navigation click triggers */}
              <div className="absolute inset-y-0 left-0 w-1/3 z-10 cursor-pointer" onClick={() => {
                if (activeViewingStoryIndex > 0) setActiveViewingStoryIndex(activeViewingStoryIndex - 1);
              }} />
              <div className="absolute inset-y-0 right-0 w-1/3 z-10 cursor-pointer" onClick={() => {
                if (activeViewingStoryIndex < stories.length - 1) setActiveViewingStoryIndex(activeViewingStoryIndex + 1);
                else setActiveViewingStoryIndex(null);
              }} />

              {/* Bottom Viewer count or Reply Bar */}
              <div className="relative z-20 p-4 bg-gradient-to-t from-black/80 to-transparent">
                {user && activeStory.userId === user.uid ? (
                  <div className="flex items-center justify-center gap-1.5 text-xs font-semibold">
                    <Eye className="w-3.5 h-3.5" />
                    <span>{activeStory.viewers.length} views</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder={`Reply to ${activeStory.userName}...`}
                      value={storyReplyText}
                      onChange={(e) => setStoryReplyText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleReplyToStory();
                      }}
                      className="flex-1 bg-white/20 border border-white/30 rounded-full px-4 py-2 text-xs text-white placeholder:text-white/60 focus:bg-white/30 focus:outline-none"
                    />
                    <button
                      onClick={handleReplyToStory}
                      disabled={!storyReplyText.trim()}
                      className="p-2 rounded-full bg-white text-slate-900 hover:bg-white/80 transition-colors disabled:opacity-40 cursor-pointer shadow-md"
                    >
                      <Send className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
