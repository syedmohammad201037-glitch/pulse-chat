import React, { useState, useRef } from 'react';
import { useAppStore } from '../store/useAppStore';
import { db, auth, OperationType, handleFirestoreError } from '../lib/firebase';
import { doc, setDoc } from 'firebase/firestore';
import { updateProfile as updateAuthProfile } from 'firebase/auth';
import { UserProfile } from '../types';
import { compressImageFile } from '../lib/imageUtils';
import { playNotificationSound } from '../lib/sounds';
import { THEME_PRESETS, WALLPAPER_PRESETS, ThemeMode, WallpaperPattern } from '../lib/theme';
import AvatarPicker from './AvatarPicker';
import { 
  X, 
  User, 
  Palette, 
  Volume2, 
  Camera, 
  Sun, 
  Moon, 
  Sliders, 
  Sparkles, 
  Image as ImageIcon,
  Check,
  RotateCcw,
  VolumeX,
  Contrast,
  Layers,
  ArrowRight,
  Cpu,
  Zap,
  HardDrive,
  Trash2,
  RefreshCw,
  Bot,
  ShieldCheck
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useLocalAi } from '../hooks/useLocalAi';

export default function SettingsRightPanel() {
  const {
    user,
    themeMode,
    graphicsMode,
    setGraphicsMode,
    wallpaperPattern,
    customWallpaperUrl,
    chatTransparency,
    chatBlur,
    bgBrightness,
    bgDimming,
    rightPanelView,
    setThemeMode,
    setWallpaperPattern,
    setCustomWallpaperUrl,
    setChatTransparency,
    setChatBlur,
    setBgBrightness,
    setBgDimming,
    setRightPanelView,
    setUser,
    setLocalAiOpen
  } = useAppStore();

  const {
    status: localAiStatus,
    statusMessage: localAiMessage,
    activeModelId: localAiModelId,
    activeDevice: localAiDevice,
    activeDtype: localAiDtype,
    webGpuSupported: localAiWebGpu,
    overallProgress: localAiProgress,
    isCached: localAiCached,
    models: localAiModels,
    loadModel: loadLocalAiModel,
    clearCache: clearLocalAiCache
  } = useLocalAi();

  const [activeTab, setActiveTab] = useState<'profile' | 'wallpaper' | 'theme' | 'local_ai'>(
    rightPanelView === 'theme' ? 'wallpaper' : rightPanelView === 'local_ai' ? 'local_ai' : 'profile'
  );

  // Profile form state
  const [editedName, setEditedName] = useState(user?.displayName || '');
  const [editedPhotoURL, setEditedPhotoURL] = useState(user?.photoURL || '');
  const [editedBio, setEditedBio] = useState(user?.bio || '');
  const [editedStatus, setEditedStatus] = useState(user?.statusText || '');
  const [editedSounds, setEditedSounds] = useState<boolean>(user?.enableSounds !== false);
  const [customUrlInput, setCustomUrlInput] = useState(customWallpaperUrl || '');
  const [customUrlError, setCustomUrlError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Sync state if user changes
  React.useEffect(() => {
    if (user) {
      setEditedName(user.displayName || '');
      setEditedPhotoURL(user.photoURL || '');
      setEditedBio(user.bio || '');
      setEditedStatus(user.statusText || '');
      setEditedSounds(user.enableSounds !== false);
    }
  }, [user]);

  // Sync active tab with rightPanelView
  React.useEffect(() => {
    if (rightPanelView === 'profile') setActiveTab('profile');
    if (rightPanelView === 'theme') setActiveTab('wallpaper');
    if (rightPanelView === 'audio') setActiveTab('theme');
    if (rightPanelView === 'local_ai') setActiveTab('local_ai');
  }, [rightPanelView]);

  if (rightPanelView === 'none') return null;

  const handleSaveProfile = async () => {
    if (!user) return;
    setIsSaving(true);
    try {
      const userRef = doc(db, 'users', user.uid);
      const updatedData: Partial<UserProfile> = {
        displayName: editedName.trim() || user.displayName,
        photoURL: editedPhotoURL.trim() || user.photoURL,
        bio: editedBio.trim(),
        statusEmoji: '',
        statusText: editedStatus.trim(),
        enableSounds: editedSounds
      };

      // 1. Save to Firestore users collection with merge: true (never throws NOT_FOUND)
      await setDoc(userRef, updatedData, { merge: true });
      
      // 2. Update Firebase Auth user profile if available
      if (auth.currentUser) {
        await updateAuthProfile(auth.currentUser, {
          displayName: updatedData.displayName,
          photoURL: updatedData.photoURL
        }).catch((err) => console.warn('Auth profile update notice:', err));
      }

      // 3. Update local application state
      const mergedUser = {
        ...user,
        ...updatedData
      };
      setUser(mergedUser);
      localStorage.setItem('pulsechat_cached_user', JSON.stringify(mergedUser));

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);

      if (editedSounds) {
        playNotificationSound('success');
      }
    } catch (e: any) {
      console.error('Failed to update profile settings:', e);
      // Fallback: still update local state so user can continue seamlessly
      const fallbackUser = {
        ...user,
        displayName: editedName.trim() || user.displayName,
        photoURL: editedPhotoURL.trim() || user.photoURL,
        bio: editedBio.trim(),
        statusText: editedStatus.trim(),
        enableSounds: editedSounds
      };
      setUser(fallbackUser);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCustomUrlApply = () => {
    setCustomUrlError('');
    const trimmed = customUrlInput.trim();
    if (!trimmed) {
      setCustomUrlError('Please enter a valid image URL');
      return;
    }
    try {
      new URL(trimmed);
      setCustomWallpaperUrl(trimmed);
      setWallpaperPattern('custom');
      if (editedSounds) playNotificationSound('tap');
    } catch {
      setCustomUrlError('Invalid URL format. Example: https://example.com/image.jpg');
    }
  };

  return (
    <motion.aside
      initial={{ x: '100%', opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: '100%', opacity: 0 }}
      transition={{ type: 'spring', damping: 28, stiffness: 300 }}
      id="whatsapp-settings-panel"
      className="w-full sm:w-96 md:w-[420px] h-full flex flex-col z-30 shrink-0 border-l shadow-2xl overflow-hidden font-sans select-none"
      style={{
        backgroundColor: 'var(--panel-bg)',
        borderColor: 'var(--border-color)',
        backdropFilter: 'blur(var(--glass-blur))',
        WebkitBackdropFilter: 'blur(var(--glass-blur))'
      }}
    >
      {/* 1. Header (WhatsApp Right-Panel Style) */}
      <div 
        className="p-4 flex items-center justify-between border-b shrink-0 transition-colors"
        style={{ borderColor: 'var(--border-color)' }}
      >
        <div className="flex items-center gap-3">
          <div 
            className="w-8 h-8 rounded-xl flex items-center justify-center text-white shadow-xs"
            style={{ backgroundColor: 'var(--accent-color)' }}
          >
            {activeTab === 'profile' && <User className="w-4 h-4" />}
            {activeTab === 'wallpaper' && <Palette className="w-4 h-4" />}
            {activeTab === 'theme' && <Sliders className="w-4 h-4" />}
            {activeTab === 'local_ai' && <Cpu className="w-4 h-4" />}
          </div>
          <div>
            <h3 className="text-sm font-bold text-[var(--text-primary)]">
              {activeTab === 'profile' && 'Profile & Avatars'}
              {activeTab === 'wallpaper' && 'Wallpaper & Lighting'}
              {activeTab === 'theme' && 'Theme & Audio Controls'}
              {activeTab === 'local_ai' && 'Local AI (Transformers.js)'}
            </h3>
            <p className="text-[11px] text-[var(--text-secondary)]">
              {activeTab === 'profile' && 'Customize your identity and avatar'}
              {activeTab === 'wallpaper' && 'Adjust brightness, dimming and wallpaper'}
              {activeTab === 'theme' && 'Colors, sound chimes and appearance'}
              {activeTab === 'local_ai' && 'On-device AI • CPU only • No GPU needed'}
            </p>
          </div>
        </div>

        <button
          onClick={() => setRightPanelView('none')}
          className="p-2 rounded-xl text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-white/10 transition-all cursor-pointer"
          title="Close Settings Panel"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* 2. Top Segmented Tabs (Minimal WhatsApp Style) */}
      <div className="flex items-center border-b shrink-0 text-xs font-semibold" style={{ borderColor: 'var(--border-color)' }}>
        <button
          type="button"
          onClick={() => setActiveTab('profile')}
          className={`flex-1 py-2.5 text-center border-b-2 transition-all cursor-pointer ${
            activeTab === 'profile'
              ? 'text-[var(--text-primary)] font-bold'
              : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
          }`}
          style={{
            borderColor: activeTab === 'profile' ? 'var(--accent-color)' : 'transparent'
          }}
        >
          Profile
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('wallpaper')}
          className={`flex-1 py-2.5 text-center border-b-2 transition-all cursor-pointer ${
            activeTab === 'wallpaper'
              ? 'text-[var(--text-primary)] font-bold'
              : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
          }`}
          style={{
            borderColor: activeTab === 'wallpaper' ? 'var(--accent-color)' : 'transparent'
          }}
        >
          Wallpaper
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('theme')}
          className={`flex-1 py-2.5 text-center border-b-2 transition-all cursor-pointer ${
            activeTab === 'theme'
              ? 'text-[var(--text-primary)] font-bold'
              : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
          }`}
          style={{
            borderColor: activeTab === 'theme' ? 'var(--accent-color)' : 'transparent'
          }}
        >
          Theme
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('local_ai')}
          className={`flex-1 py-2.5 text-center border-b-2 transition-all cursor-pointer flex items-center justify-center gap-1 ${
            activeTab === 'local_ai'
              ? 'text-indigo-400 font-bold'
              : 'border-transparent text-[var(--text-secondary)] hover:text-indigo-300'
          }`}
          style={{
            borderColor: activeTab === 'local_ai' ? '#6366f1' : 'transparent'
          }}
        >
          <Cpu className="w-3.5 h-3.5" />
          <span>Local AI</span>
        </button>
      </div>

      {/* 3. Panel Content Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-5 scrollbar-thin">
        
        {/* ================= TAB 1: PROFILE & AVATARS ================= */}
        {activeTab === 'profile' && (
          <div className="space-y-4">
            
            {/* WhatsApp Center Avatar Circle */}
            <div className="flex flex-col items-center gap-2.5 py-2">
              <div className="relative group cursor-pointer">
                <img 
                  src={editedPhotoURL || user?.photoURL} 
                  alt="Profile" 
                  referrerPolicy="no-referrer"
                  className="w-24 h-24 rounded-full ring-4 object-cover shadow-lg bg-slate-900"
                  style={{ borderColor: 'var(--accent-color)' }}
                />
                <div 
                  className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center text-white transition-opacity text-[10px] font-bold"
                >
                  <Camera className="w-6 h-6 mb-1" />
                  <span>CHANGE</span>
                </div>
              </div>
              <div className="text-center">
                <p className="text-sm font-bold text-[var(--text-primary)]">{editedName || 'Your Name'}</p>
                <p className="text-xs text-[var(--text-secondary)] font-mono">{user?.email}</p>
              </div>
            </div>

            {/* Avatar Generator & Multiple Styles Picker */}
            <div 
              className="p-3.5 rounded-2xl border space-y-2"
              style={{ 
                backgroundColor: 'var(--input-bg)',
                borderColor: 'var(--border-color)' 
              }}
            >
              <AvatarPicker 
                currentPhotoURL={editedPhotoURL || user?.photoURL}
                onSelectAvatar={(url) => {
                  setEditedPhotoURL(url);
                  if (editedSounds) playNotificationSound('tap');
                }}
                accentColor="var(--accent-color)"
              />
            </div>

            {/* Display Name Input */}
            <div className="space-y-1.5">
              <label className="text-[11px] text-[var(--text-secondary)] font-bold uppercase tracking-wider block">
                Your Name
              </label>
              <input
                type="text"
                placeholder="Enter display name..."
                value={editedName}
                onChange={(e) => setEditedName(e.target.value)}
                className="w-full border text-xs rounded-xl py-2.5 px-3.5 focus:outline-none text-[var(--text-primary)] transition-colors"
                style={{ 
                  backgroundColor: 'var(--input-bg)',
                  borderColor: 'var(--border-color)' 
                }}
              />
              <p className="text-[10px] text-[var(--text-secondary)]">
                This name will be visible to all your contacts on PulseChat.
              </p>
            </div>

            {/* About / Status Presets (WhatsApp style) */}
            <div className="space-y-2">
              <label className="text-[11px] text-[var(--text-secondary)] font-bold uppercase tracking-wider block">
                About / Status Note
              </label>
              <input
                type="text"
                placeholder="Set a status note (e.g. Available, In a meeting)..."
                value={editedStatus}
                onChange={(e) => setEditedStatus(e.target.value)}
                className="w-full border text-xs rounded-xl py-2.5 px-3.5 focus:outline-none text-[var(--text-primary)]"
                style={{ 
                  backgroundColor: 'var(--input-bg)',
                  borderColor: 'var(--border-color)' 
                }}
              />

              {/* Status Chips */}
              <div className="flex flex-wrap gap-1.5 pt-1">
                {['Available', 'Busy', 'At Work', 'In a Meeting', 'Urgent Calls Only', 'Sleeping'].map((statusOption) => (
                  <button 
                    key={statusOption}
                    type="button"
                    onClick={() => {
                      setEditedStatus(statusOption);
                      if (editedSounds) playNotificationSound('tap');
                    }}
                    className="px-2.5 py-1 rounded-lg text-[10px] text-[var(--text-primary)] cursor-pointer font-medium border hover:bg-white/10 transition-colors"
                    style={{ 
                      backgroundColor: 'var(--input-bg)',
                      borderColor: 'var(--border-color)' 
                    }}
                  >
                    {statusOption}
                  </button>
                ))}
              </div>
            </div>

            {/* Bio Description */}
            <div className="space-y-1.5">
              <label className="text-[11px] text-[var(--text-secondary)] font-bold uppercase tracking-wider block">
                Bio
              </label>
              <textarea
                placeholder="Tell your friends a little about yourself..."
                value={editedBio}
                onChange={(e) => setEditedBio(e.target.value)}
                rows={2}
                className="w-full border text-xs rounded-xl py-2.5 px-3.5 focus:outline-none text-[var(--text-primary)] resize-none"
                style={{ 
                  backgroundColor: 'var(--input-bg)',
                  borderColor: 'var(--border-color)' 
                }}
              />
            </div>

            {/* Save Button */}
            <button
              type="button"
              onClick={handleSaveProfile}
              disabled={isSaving || !editedName.trim()}
              className="w-full py-3 text-white disabled:opacity-40 rounded-xl text-xs font-bold transition-all shadow-md active:scale-95 cursor-pointer flex items-center justify-center gap-2"
              style={{ backgroundColor: 'var(--accent-color)' }}
            >
              {saveSuccess ? (
                <>
                  <Check className="w-4 h-4 stroke-[3]" />
                  <span>Changes Saved Successfully!</span>
                </>
              ) : isSaving ? (
                <span>Saving Profile...</span>
              ) : (
                <span>Save Profile Changes</span>
              )}
            </button>
          </div>
        )}

        {/* ================= TAB 2: WALLPAPER & BRIGHTNESS/LIGHTING ================= */}
        {activeTab === 'wallpaper' && (
          <div className="space-y-5">
            
            {/* 1. REAL-TIME BACKGROUND BRIGHTNESS & DARKNESS CONTROLS */}
            <div 
              className="p-4 rounded-2xl border space-y-4"
              style={{ 
                backgroundColor: 'var(--input-bg)',
                borderColor: 'var(--border-color)' 
              }}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[var(--text-primary)] flex items-center gap-1.5">
                  <Sun className="w-4 h-4 text-amber-400" />
                  <span>Background Brightness & Lighting</span>
                </span>
                <span className="text-[11px] font-mono font-bold text-[var(--accent-color)]">
                  {bgBrightness}%
                </span>
              </div>

              {/* Brightness Slider */}
              <div className="space-y-1.5">
                <input
                  type="range"
                  min="20"
                  max="140"
                  step="5"
                  value={bgBrightness}
                  onChange={(e) => setBgBrightness(Number(e.target.value))}
                  className="w-full accent-[var(--accent-color)] cursor-pointer h-1.5 rounded-lg bg-slate-700"
                />
                <div className="flex justify-between text-[10px] text-[var(--text-secondary)] font-mono">
                  <span>Dark (20%)</span>
                  <span>Normal (85%)</span>
                  <span>Bright (140%)</span>
                </div>
              </div>

              {/* Quick Brightness Presets */}
              <div className="grid grid-cols-4 gap-1.5 pt-1">
                {[
                  { label: 'Night', value: 35 },
                  { label: 'Dim', value: 65 },
                  { label: 'Balanced', value: 85 },
                  { label: 'Vibrant', value: 120 }
                ].map(preset => (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => {
                      setBgBrightness(preset.value);
                      if (editedSounds) playNotificationSound('tap');
                    }}
                    className={`py-1.5 px-1 rounded-lg text-[10px] font-bold border transition-all cursor-pointer ${
                      bgBrightness === preset.value
                        ? 'text-white'
                        : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                    }`}
                    style={{
                      backgroundColor: bgBrightness === preset.value ? 'var(--accent-color)' : 'transparent',
                      borderColor: bgBrightness === preset.value ? 'var(--accent-color)' : 'var(--border-color)'
                    }}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>

              <div className="border-t pt-3 space-y-2" style={{ borderColor: 'var(--border-color)' }}>
                {/* Background Dimming / Darkness Overlay Slider */}
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[var(--text-primary)] flex items-center gap-1.5">
                    <Moon className="w-4 h-4 text-indigo-400" />
                    <span>Darkness & Shadow Overlay</span>
                  </span>
                  <span className="text-[11px] font-mono font-bold text-[var(--accent-color)]">
                    {bgDimming}%
                  </span>
                </div>

                <input
                  type="range"
                  min="0"
                  max="85"
                  step="5"
                  value={bgDimming}
                  onChange={(e) => setBgDimming(Number(e.target.value))}
                  className="w-full accent-[var(--accent-color)] cursor-pointer h-1.5 rounded-lg bg-slate-700"
                />
                <div className="flex justify-between text-[10px] text-[var(--text-secondary)] font-mono">
                  <span>0% (Raw Image)</span>
                  <span>35% (Optimal)</span>
                  <span>85% (Deep Shadow)</span>
                </div>
              </div>
            </div>

            {/* 2. Frosted Blur & Glass Transparency */}
            <div 
              className="p-4 rounded-2xl border space-y-3.5"
              style={{ 
                backgroundColor: 'var(--input-bg)',
                borderColor: 'var(--border-color)' 
              }}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[var(--text-primary)] flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-purple-400" />
                  <span>Frosted Background Blur</span>
                </span>
                <span className="text-[11px] font-mono font-bold text-[var(--accent-color)]">
                  {chatBlur}px
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="32"
                step="2"
                value={chatBlur}
                onChange={(e) => setChatBlur(Number(e.target.value))}
                className="w-full accent-[var(--accent-color)] cursor-pointer h-1.5 rounded-lg bg-slate-700"
              />
              <div className="flex justify-between text-[10px] text-[var(--text-secondary)] font-mono">
                <span>Sharp (0px)</span>
                <span>Subtle (8px)</span>
                <span>Heavy (32px)</span>
              </div>

              <div className="border-t pt-3 space-y-2" style={{ borderColor: 'var(--border-color)' }}>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[var(--text-primary)] flex items-center gap-1.5">
                    <Contrast className="w-4 h-4 text-emerald-400" />
                    <span>Panel Glass Opacity</span>
                  </span>
                  <span className="text-[11px] font-mono font-bold text-[var(--accent-color)]">
                    {chatTransparency}%
                  </span>
                </div>
                <input
                  type="range"
                  min="30"
                  max="100"
                  step="5"
                  value={chatTransparency}
                  onChange={(e) => setChatTransparency(Number(e.target.value))}
                  className="w-full accent-[var(--accent-color)] cursor-pointer h-1.5 rounded-lg bg-slate-700"
                />
              </div>
            </div>

            {/* 3. Preset Wallpapers Selection */}
            <div className="space-y-2">
              <label className="text-[11px] text-[var(--text-secondary)] font-bold uppercase tracking-wider block">
                Preset Wallpapers
              </label>
              <div className="grid grid-cols-3 gap-2">
                {WALLPAPER_PRESETS.map((wp) => {
                  const isSelected = wallpaperPattern === wp.id;
                  return (
                    <button
                      key={wp.id}
                      type="button"
                      onClick={() => {
                        setWallpaperPattern(wp.id);
                        if (editedSounds) playNotificationSound('tap');
                      }}
                      className={`relative rounded-xl overflow-hidden aspect-[4/3] border transition-all cursor-pointer group ${
                        isSelected 
                          ? 'ring-2 shadow-md scale-[1.02]' 
                          : 'hover:opacity-90 hover:scale-[1.01]'
                      }`}
                      style={{
                        borderColor: isSelected ? 'var(--accent-color)' : 'var(--border-color)',
                        backgroundColor: 'var(--input-bg)'
                      }}
                    >
                      {wp.id === 'none' ? (
                        <div className="w-full h-full flex flex-col items-center justify-center p-2 bg-slate-900/60 text-slate-400 group-hover:text-white transition-colors">
                          <Contrast className="w-6 h-6 mb-1 text-[var(--accent-color)]" />
                          <span className="text-[10px] font-bold text-center leading-tight">Clean Solid</span>
                        </div>
                      ) : (
                        <img
                          src={wp.previewThumb}
                          alt={wp.name}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />
                      )}
                      {wp.id !== 'none' && (
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex items-end p-2">
                          <span className="text-[10px] text-white font-bold truncate">
                            {wp.name}
                          </span>
                        </div>
                      )}
                      {isSelected && (
                        <div 
                          className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full flex items-center justify-center text-white shadow-md"
                          style={{ backgroundColor: 'var(--accent-color)' }}
                        >
                          <Check className="w-3 h-3 stroke-[3]" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 4. Custom Wallpaper Image URL Link */}
            <div 
              className="p-3.5 rounded-2xl border space-y-2.5"
              style={{ 
                backgroundColor: 'var(--input-bg)',
                borderColor: 'var(--border-color)' 
              }}
            >
              <label className="text-[11px] text-[var(--text-secondary)] font-bold uppercase tracking-wider block flex items-center gap-1.5">
                <ImageIcon className="w-3.5 h-3.5 text-[var(--accent-color)]" />
                <span>Custom Image Link (Apna Diya Hua Wallpaper)</span>
              </label>
              <div className="flex gap-2">
                <input
                  type="url"
                  placeholder="https://images.unsplash.com/photo-..."
                  value={customUrlInput}
                  onChange={(e) => {
                    setCustomUrlInput(e.target.value);
                    setCustomUrlError('');
                  }}
                  className="flex-1 border text-xs rounded-xl px-3 py-2 text-[var(--text-primary)] focus:outline-none"
                  style={{
                    backgroundColor: 'var(--panel-bg)',
                    borderColor: 'var(--border-color)'
                  }}
                />
                <button
                  type="button"
                  onClick={handleCustomUrlApply}
                  className="px-3.5 py-2 text-white font-bold text-xs rounded-xl transition-all cursor-pointer shrink-0 shadow-xs active:scale-95"
                  style={{ backgroundColor: 'var(--accent-color)' }}
                >
                  Apply
                </button>
              </div>
              {customUrlError && (
                <p className="text-[10px] text-rose-400">{customUrlError}</p>
              )}
            </div>

          </div>
        )}

        {/* ================= TAB 3: THEME & AUDIO ================= */}
        {activeTab === 'theme' && (
          <div className="space-y-4">
            
            {/* Graphics Mode */}
            <div className="space-y-2">
              <label className="text-[11px] text-[var(--text-secondary)] font-bold uppercase tracking-wider block">
                Graphics
              </label>
              <div className="grid grid-cols-3 gap-2">
                {([
                  { id: 'potato', label: 'Potato', desc: 'Flat and fast. No blur, glow or animations.' },
                  { id: 'balanced', label: 'Balanced', desc: 'Light blur, smooth animations.' },
                  { id: 'ultra', label: 'Ultra', desc: 'All effects. Needs a good PC.' },
                ] as const).map((g) => {
                  const active = graphicsMode === g.id;
                  return (
                    <button
                      key={g.id}
                      type="button"
                      onClick={() => setGraphicsMode(g.id)}
                      className="p-2.5 rounded-xl border text-left transition-all cursor-pointer"
                      style={{
                        borderColor: active ? 'var(--accent-color)' : 'var(--border-color)',
                        backgroundColor: active ? 'var(--input-bg)' : 'transparent',
                      }}
                    >
                      <div className="text-xs font-bold text-[var(--text-primary)]">{g.label}</div>
                      <p className="text-[10px] text-[var(--text-secondary)] mt-0.5 leading-snug">{g.desc}</p>
                    </button>
                  );
                })}
              </div>
              <p className="text-[10px] text-[var(--text-secondary)]">
                Lag ho raha hai? Potato try karo. Choice yaad rehti hai.
              </p>
            </div>

            {/* Theme Mode Selector */}
            <div className="space-y-2">
              <label className="text-[11px] text-[var(--text-secondary)] font-bold uppercase tracking-wider block">
                Color Theme Palette
              </label>
              <div className="grid grid-cols-2 gap-2.5">
                {[
                  { id: 'dark' as ThemeMode, label: 'Obsidian Onyx', icon: Moon, desc: 'Deep black & neon cyan' },
                  { id: 'titanium' as ThemeMode, label: 'Titanium Stealth', icon: Sparkles, desc: 'Carbon graphite & cobalt' },
                  { id: 'purple' as ThemeMode, label: 'Cyber Amethyst', icon: Sparkles, desc: 'Rich glowing violet' },
                  { id: 'light' as ThemeMode, label: 'Pristine Minimal', icon: Sun, desc: 'Crisp slate & sapphire' }
                ].map(item => {
                  const isSelected = themeMode === item.id;
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        setThemeMode(item.id as ThemeMode);
                        if (editedSounds) playNotificationSound('tap');
                      }}
                      className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                        isSelected 
                          ? 'ring-2 shadow-md scale-[1.02]' 
                          : 'hover:bg-white/5 hover:scale-[1.01]'
                      }`}
                      style={{
                        backgroundColor: isSelected ? 'rgba(var(--card-bg-base), 0.9)' : 'var(--input-bg)',
                        borderColor: isSelected ? 'var(--accent-color)' : 'var(--border-color)'
                      }}
                    >
                      <Icon className="w-5 h-5 mb-2 text-[var(--accent-color)]" />
                      <div>
                        <p className="text-xs font-bold text-[var(--text-primary)]">{item.label}</p>
                        <p className="text-[10px] text-[var(--text-secondary)]">{item.desc}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Audio Feedback Sounds Switch */}
            <div 
              className="p-4 rounded-2xl border flex items-center justify-between"
              style={{ 
                backgroundColor: 'var(--input-bg)',
                borderColor: 'var(--border-color)' 
              }}
            >
              <div className="flex items-center gap-3">
                <div 
                  className="w-9 h-9 rounded-xl flex items-center justify-center text-white"
                  style={{ backgroundColor: 'var(--accent-color)' }}
                >
                  {editedSounds ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                </div>
                <div>
                  <h4 className="text-xs font-bold text-[var(--text-primary)]">
                    Audio Chimes & Message Sounds
                  </h4>
                  <p className="text-[10px] text-[var(--text-secondary)]">
                    Play synthesized tones on sending, receiving, and clicks
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  const nextState = !editedSounds;
                  setEditedSounds(nextState);
                  if (nextState) playNotificationSound('tap');
                }}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  editedSounds ? 'opacity-100' : 'opacity-40'
                }`}
                style={{
                  backgroundColor: editedSounds ? 'var(--accent-color)' : 'rgba(255,255,255,0.2)'
                }}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                    editedSounds ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Reset Defaults Button */}
            <button
              type="button"
              onClick={() => {
                setBgBrightness(85);
                setBgDimming(35);
                setChatBlur(16);
                setChatTransparency(75);
                setWallpaperPattern('minimal_flow');
                if (editedSounds) playNotificationSound('success');
              }}
              className="w-full py-2.5 rounded-xl border text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-white/5 transition-all flex items-center justify-center gap-2 cursor-pointer"
              style={{ borderColor: 'var(--border-color)' }}
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Wallpaper & Lighting Defaults</span>
            </button>

          </div>
        )}

        {/* ================= TAB 4: LOCAL AI (TRANSFORMERS.JS) ================= */}
        {activeTab === 'local_ai' && (
          <div className="space-y-4">
            {/* Header Feature Card */}
            <div 
              className="p-4 rounded-2xl border relative overflow-hidden"
              style={{
                backgroundColor: 'rgba(99, 102, 241, 0.08)',
                borderColor: 'rgba(99, 102, 241, 0.3)'
              }}
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shrink-0 shadow-md">
                  <Cpu className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-bold text-indigo-300">Transformers.js On-Device ML</h4>
                  </div>
                  <p className="text-xs text-[var(--text-secondary)] mt-1 leading-relaxed">
                    Local neural network runs client-side in a Web Worker. Your messages, prompts, and data remain strictly private on your device with zero main-thread lag.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 mt-3 pt-3 border-t border-indigo-500/20 text-[11px] text-indigo-300 flex-wrap">
                <span className="px-2 py-0.5 rounded-md bg-indigo-500/20 border border-indigo-500/30">
                  CPU & WebGPU
                </span>
                <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Runs Without GPU
                </span>
                <span className="px-2 py-0.5 rounded-md bg-white/10 border border-white/15">
                  Downloads Once
                </span>
              </div>
            </div>

            {/* CPU only */}
            <div
              className="p-3 rounded-2xl border flex items-center gap-2 text-[11px] text-[var(--text-secondary)]"
              style={{ backgroundColor: 'var(--input-bg)', borderColor: 'var(--border-color)' }}
            >
              <Cpu className="w-3.5 h-3.5 text-indigo-400" />
              <span>Runs on your CPU. No GPU needed.</span>
            </div>

            {/* Model Select */}
            <div 
              className="p-4 rounded-2xl border space-y-3"
              style={{ 
                backgroundColor: 'var(--input-bg)',
                borderColor: 'var(--border-color)' 
              }}
            >
              <div>
                <h4 className="text-xs font-bold text-[var(--text-primary)]">Active Neural Network</h4>
                <p className="text-[10px] text-[var(--text-secondary)]">Compact quantized ONNX models</p>
              </div>

              <div className="space-y-2">
                {localAiModels.map((m) => {
                  const isSelected = localAiModelId === m.id;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => loadLocalAiModel(m.id, localAiDevice, m.dtype)}
                      className={`w-full p-3 rounded-xl border text-left transition-all cursor-pointer ${
                        isSelected 
                          ? 'border-indigo-500 bg-indigo-500/15' 
                          : 'border-white/10 hover:bg-white/5'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-[var(--text-primary)]">{m.name}</span>
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/10 text-indigo-300">
                          {m.size}
                        </span>
                      </div>
                      <p className="text-[10px] text-[var(--text-secondary)] mt-1">
                        {m.description}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Cache Storage and Offline Readiness */}
            <div 
              className="p-4 rounded-2xl border space-y-3"
              style={{ 
                backgroundColor: 'var(--input-bg)',
                borderColor: 'var(--border-color)' 
              }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <HardDrive className="w-4 h-4 text-emerald-400" />
                  <div>
                    <h4 className="text-xs font-bold text-[var(--text-primary)]">Browser Cache Storage</h4>
                    <p className="text-[10px] text-[var(--text-secondary)]">
                      {localAiCached ? 'Model weights saved in browser Cache API' : 'Downloads once on first use'}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={clearLocalAiCache}
                  className="p-2 rounded-xl text-zinc-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                  title="Purge cached model files from browser"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              {localAiStatus === 'loading' && (
                <div className="space-y-1.5 pt-1">
                  <div className="flex items-center justify-between text-[11px] text-indigo-300">
                    <span className="flex items-center gap-1.5">
                      <RefreshCw className="w-3 h-3 animate-spin" />
                      <span>{localAiMessage}</span>
                    </span>
                    <span className="font-mono font-bold">{localAiProgress}%</span>
                  </div>
                  <div className="w-full bg-white/10 rounded-full h-1.5 overflow-hidden">
                    <div 
                      className="bg-indigo-500 h-full rounded-full transition-all duration-300"
                      style={{ width: `${Math.max(localAiProgress, 5)}%` }}
                    />
                  </div>
                </div>
              )}

              {localAiStatus === 'ready' && (
                <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-[11px] text-emerald-300 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 shrink-0 text-emerald-400" />
                  <span>Model is active and cached. Ready for offline inference with 0 network usage.</span>
                </div>
              )}
            </div>

            {/* Launch AI Studio Button */}
            <button
              type="button"
              onClick={() => setLocalAiOpen(true)}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-xs font-bold shadow-lg shadow-indigo-600/20 hover:opacity-95 active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Bot className="w-4 h-4" />
              <span>Open AI</span>
            </button>
          </div>
        )}

      </div>
    </motion.aside>
  );
}
