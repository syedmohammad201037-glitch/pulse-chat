import React, { useState, useRef } from 'react';
import { 
  Sparkles, 
  Bot, 
  Gamepad2, 
  Smile, 
  User, 
  Image, 
  Shuffle, 
  Check, 
  Layers, 
  Type, 
  Palette,
  Heart,
  UserCheck,
  Feather,
  Wand2,
  Shapes,
  SmilePlus,
  Upload,
  Camera,
  Globe,
  Star
} from 'lucide-react';
import { compressImageFile } from '../lib/imageUtils';
import { PRESET_AVATARS } from '../lib/presetImages';

export interface AvatarStyleOption {
  id: string;
  name: string;
  category: string;
  icon: React.ElementType;
  styleKey: string;
  seeds: string[];
}

export const AVATAR_STYLES: AvatarStyleOption[] = [
  {
    id: 'personas',
    name: '3D Personas',
    category: '3D Modern',
    icon: User,
    styleKey: 'personas',
    seeds: ['Alex', 'Jordan', 'Taylor', 'Sam', 'Chris', 'Morgan', 'Casey', 'Robin', 'Aria', 'Ethan', 'Maya', 'Lucas']
  },
  {
    id: 'adventurer',
    name: '3D Adventurer',
    category: '3D Modern',
    icon: Sparkles,
    styleKey: 'adventurer',
    seeds: ['Felix', 'Luna', 'Zoe', 'Leo', 'Maya', 'Milo', 'Nova', 'Jasper', 'Zephyr', 'Stella', 'Orion', 'Kira']
  },
  {
    id: 'notionists',
    name: 'Notion Style',
    category: 'Minimal Line',
    icon: Feather,
    styleKey: 'notionists',
    seeds: ['Architect', 'Designer', 'Coder', 'Founder', 'Writer', 'Thinker', 'Artist', 'Scholar', 'Visionary', 'Leader']
  },
  {
    id: 'lorelei',
    name: 'Anime & Manga',
    category: 'Artistic',
    icon: Heart,
    styleKey: 'lorelei',
    seeds: ['Sakura', 'Kenji', 'Yuki', 'Ren', 'Aoi', 'Haruto', 'Hana', 'Kaito', 'Shina', 'Ryu', 'Megumi', 'Daiki']
  },
  {
    id: 'big-smile',
    name: 'Big Smile',
    category: 'Playful',
    icon: SmilePlus,
    styleKey: 'big-smile',
    seeds: ['Sunny', 'Joy', 'Chuckle', 'Giggle', 'Grin', 'Radiant', 'Cheerful', 'Bliss', 'Spark', 'Beam']
  },
  {
    id: 'bottts',
    name: 'Cute Robots',
    category: 'Sci-Fi',
    icon: Bot,
    styleKey: 'bottts',
    seeds: ['CyberBot', 'Sparky', 'Giga', 'Nano', 'Mecha', 'Vector', 'Pixel', 'Bolt', 'Aero', 'Matrix', 'Nexus', 'Cosmo']
  },
  {
    id: 'pixel-art',
    name: 'Pixel 8-Bit',
    category: 'Retro Gaming',
    icon: Gamepad2,
    styleKey: 'pixel-art',
    seeds: ['Hero1', 'Knight', 'Wizard', 'Ninja', 'Rogue', 'Arcade', 'Retro', 'Quest', 'Valkyrie', 'Paladin', 'Mage', 'Brawler']
  },
  {
    id: 'open-peeps',
    name: 'Open Peeps',
    category: 'Hand Drawn',
    icon: Wand2,
    styleKey: 'open-peeps',
    seeds: ['Harper', 'Rowan', 'Quinn', 'Skyler', 'Cameron', 'Dakota', 'Peyton', 'Sawyer', 'Emerson', 'Finley']
  },
  {
    id: 'croodles',
    name: 'Croodles Doodles',
    category: 'Doodles',
    icon: Palette,
    styleKey: 'croodles',
    seeds: ['Doodle1', 'Sketch2', 'Ink3', 'Vibe4', 'Splash5', 'Wave6', 'Zen7', 'Craft8', 'Brush9', 'Line10']
  },
  {
    id: 'fun-emoji',
    name: 'Fun Memoji',
    category: 'Expressive',
    icon: Smile,
    styleKey: 'fun-emoji',
    seeds: ['Happy', 'Wink', 'Cool', 'Vibe', 'Party', 'Star', 'Zen', 'Joy', 'Magic', 'Chill', 'Wild', 'Epic']
  },
  {
    id: 'micah',
    name: 'Micah Artistic',
    category: 'Artistic',
    icon: UserCheck,
    styleKey: 'micah',
    seeds: ['Oliver', 'Emma', 'Liam', 'Ava', 'Noah', 'Sophia', 'Lucas', 'Mia', 'Benjamin', 'Isabella', 'William', 'Charlotte']
  },
  {
    id: 'avataaars',
    name: 'Avataaars',
    category: '3D Modern',
    icon: User,
    styleKey: 'avataaars',
    seeds: ['Max', 'Bella', 'Charlie', 'Ruby', 'Oscar', 'Chloe', 'Archie', 'Lily', 'Jack', 'Grace', 'Henry', 'Ella']
  },
  {
    id: 'identicon',
    name: 'Crypto Hex',
    category: 'Abstract',
    icon: Layers,
    styleKey: 'identicon',
    seeds: ['Pulse_01', 'Matrix_9', 'Zero_X', 'Node_44', 'Hash_88', 'Bit_99', 'Flow_7', 'Core_3', 'Apex_1', 'Vortex_4']
  },
  {
    id: 'shapes',
    name: 'Modern Shapes',
    category: 'Abstract',
    icon: Shapes,
    styleKey: 'shapes',
    seeds: ['Aura', 'Prism', 'Orbit', 'Echo', 'Drift', 'Flare', 'Mirage', 'Sphere', 'Glow', 'Horizon']
  },
  {
    id: 'initials',
    name: 'Initials Monogram',
    category: 'Monograms',
    icon: Type,
    styleKey: 'initials',
    seeds: ['PC', 'VIP', 'PRO', 'DEV', 'AI', 'CEO', 'TOP', 'GO', 'NO1', 'MAX', 'SKY', 'HQ']
  }
];

interface AvatarPickerProps {
  currentPhotoURL?: string;
  onSelectAvatar: (url: string) => void;
  accentColor?: string;
}

export default function AvatarPicker({ currentPhotoURL, onSelectAvatar, accentColor = 'var(--accent-color)' }: AvatarPickerProps) {
  const [activeTab, setActiveTab] = useState<'presets' | 'dicebear' | 'customLink'>('presets');
  const [selectedStyleId, setSelectedStyleId] = useState<string>('personas');
  const [customSeedSeed, setCustomSeedSeed] = useState<number>(1);
  const [customUrlInput, setCustomUrlInput] = useState<string>('');
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const currentStyle = AVATAR_STYLES.find(s => s.id === selectedStyleId) || AVATAR_STYLES[0];
  const currentSeeds = currentStyle.seeds.map(s => `${s}_${customSeedSeed}`);

  const handleRandomize = () => {
    setCustomSeedSeed(prev => prev + 1);
  };

  const getDicebearUrl = (styleKey: string, seed: string) => {
    return `https://api.dicebear.com/7.x/${styleKey}/svg?seed=${encodeURIComponent(seed)}`;
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    try {
      const dataUrl = await compressImageFile(file, 320, 320, 0.85);
      onSelectAvatar(dataUrl);
    } catch (err) {
      console.error('Failed to compress avatar photo:', err);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-3.5 text-left font-sans">
      
      {/* Top Main Mode Selector */}
      <div 
        className="grid grid-cols-3 gap-1 p-1 rounded-xl border text-center"
        style={{
          backgroundColor: 'var(--input-bg)',
          borderColor: 'var(--border-color)'
        }}
      >
        <button
          type="button"
          onClick={() => setActiveTab('presets')}
          className={`py-1.5 px-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            activeTab === 'presets'
              ? 'text-white shadow-xs'
              : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
          }`}
          style={{
            backgroundColor: activeTab === 'presets' ? accentColor : 'transparent'
          }}
        >
          <Star className="w-3.5 h-3.5" />
          <span>HD Presets</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('dicebear')}
          className={`py-1.5 px-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            activeTab === 'dicebear'
              ? 'text-white shadow-xs'
              : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
          }`}
          style={{
            backgroundColor: activeTab === 'dicebear' ? accentColor : 'transparent'
          }}
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>3D & Styles</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('customLink')}
          className={`py-1.5 px-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            activeTab === 'customLink'
              ? 'text-white shadow-xs'
              : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
          }`}
          style={{
            backgroundColor: activeTab === 'customLink' ? accentColor : 'transparent'
          }}
        >
          <Globe className="w-3.5 h-3.5" />
          <span>Image Link</span>
        </button>
      </div>

      {/* Device Photo Upload CTA */}
      <div className="flex items-center gap-2">
        <input 
          ref={fileInputRef}
          type="file" 
          accept="image/*" 
          onChange={handleFileUpload} 
          className="hidden" 
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          className="flex-1 py-2 px-3 rounded-xl border flex items-center justify-center gap-2 text-xs font-bold transition-all hover:scale-[1.01] cursor-pointer shadow-xs"
          style={{
            backgroundColor: 'var(--panel-bg)',
            borderColor: 'var(--border-color)',
            color: 'var(--text-primary)'
          }}
        >
          <Upload className="w-3.5 h-3.5 text-[var(--accent-color)]" />
          <span>{isUploading ? 'Compressing Photo...' : 'Upload from Device (Direct Data URL)'}</span>
        </button>
      </div>

      {/* TAB 1: Curated HD Photo Avatars */}
      {activeTab === 'presets' && (
        <div className="space-y-3 max-h-60 overflow-y-auto pr-1 scrollbar-thin">
          {PRESET_AVATARS.map((group) => (
            <div key={group.category} className="space-y-1.5">
              <span className="text-[10px] text-[var(--text-secondary)] font-bold uppercase tracking-wider block">
                {group.category}
              </span>
              <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                {group.items.map((item) => {
                  const isCurrent = currentPhotoURL === item.url;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => onSelectAvatar(item.url)}
                      className={`relative p-1 rounded-xl border transition-all cursor-pointer group flex flex-col items-center justify-center aspect-square ${
                        isCurrent ? 'ring-2 scale-105' : 'hover:scale-105 hover:border-white/40'
                      }`}
                      style={{
                        backgroundColor: 'var(--input-bg)',
                        borderColor: isCurrent ? accentColor : 'var(--border-color)',
                        boxShadow: isCurrent ? `0 0 12px ${accentColor}40` : undefined
                      }}
                      title={item.title}
                    >
                      <img
                        src={item.url}
                        alt={item.title}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover rounded-lg"
                        loading="lazy"
                      />
                      {isCurrent && (
                        <div 
                          className="absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center text-white shadow-xs"
                          style={{ backgroundColor: accentColor }}
                        >
                          <Check className="w-2.5 h-2.5 stroke-[3]" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* TAB 2: DiceBear / 3D Procedural Styles */}
      {activeTab === 'dicebear' && (
        <div className="space-y-2.5">
          {/* Style tabs horizontal scroll */}
          <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            {AVATAR_STYLES.map(style => {
              const Icon = style.icon;
              const isSelected = selectedStyleId === style.id;
              return (
                <button
                  key={style.id}
                  type="button"
                  onClick={() => setSelectedStyleId(style.id)}
                  className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 border cursor-pointer ${
                    isSelected
                      ? 'text-white shadow-xs'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-white/30'
                  }`}
                  style={{
                    backgroundColor: isSelected ? accentColor : 'var(--input-bg)',
                    borderColor: isSelected ? accentColor : 'var(--border-color)'
                  }}
                >
                  <Icon className="w-3.5 h-3.5 shrink-0" />
                  <span className="whitespace-nowrap text-[11px]">{style.name}</span>
                </button>
              );
            })}
          </div>

          <div className="flex items-center justify-between">
            <span className="text-[10px] text-[var(--text-secondary)] font-bold uppercase tracking-wider">
              {currentStyle.name} Variations
            </span>
            <button
              type="button"
              onClick={handleRandomize}
              className="flex items-center gap-1 text-[10px] font-bold text-[var(--text-primary)] hover:opacity-80 transition-opacity px-2 py-1 rounded-lg border cursor-pointer"
              style={{ 
                backgroundColor: 'var(--input-bg)',
                borderColor: 'var(--border-color)'
              }}
              title="Generate new faces and avatars"
            >
              <Shuffle className="w-3 h-3 text-[var(--accent-color)]" />
              <span>🎲 Shuffle Faces</span>
            </button>
          </div>

          <div className="grid grid-cols-4 gap-2 max-h-52 overflow-y-auto p-1 scrollbar-thin">
            {currentSeeds.map((seed, idx) => {
              const url = getDicebearUrl(currentStyle.styleKey, seed);
              const isCurrent = currentPhotoURL === url;

              return (
                <button
                  key={`${seed}-${idx}`}
                  type="button"
                  onClick={() => onSelectAvatar(url)}
                  className={`relative p-1 rounded-xl border transition-all cursor-pointer group flex flex-col items-center justify-center aspect-square ${
                    isCurrent 
                      ? 'ring-2 shadow-sm scale-105' 
                      : 'hover:scale-105 hover:border-white/40'
                  }`}
                  style={{
                    backgroundColor: isCurrent ? 'rgba(var(--card-bg-base), 0.9)' : 'var(--input-bg)',
                    borderColor: isCurrent ? accentColor : 'var(--border-color)',
                    boxShadow: isCurrent ? `0 0 12px ${accentColor}40` : undefined
                  }}
                  title={`Select ${seed}`}
                >
                  <img
                    src={url}
                    alt={seed}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-contain rounded-lg transition-transform group-hover:scale-110"
                    loading="lazy"
                  />
                  {isCurrent && (
                    <div 
                      className="absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center text-white shadow-xs"
                      style={{ backgroundColor: accentColor }}
                    >
                      <Check className="w-2.5 h-2.5 stroke-[3]" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 3: Direct Custom Image Link */}
      {activeTab === 'customLink' && (
        <div 
          className="p-3 rounded-xl border space-y-2.5"
          style={{ 
            backgroundColor: 'var(--input-bg)',
            borderColor: 'var(--border-color)' 
          }}
        >
          <label className="text-[10px] text-[var(--text-secondary)] font-bold uppercase tracking-wider block">
            Direct Photo / Image URL Link (Any HTTPS URL)
          </label>
          <div className="flex gap-1.5">
            <input
              type="url"
              placeholder="https://images.unsplash.com/... or https://i.imgur.com/..."
              value={customUrlInput}
              onChange={(e) => setCustomUrlInput(e.target.value)}
              className="flex-1 border text-xs rounded-lg px-2.5 py-2 text-[var(--text-primary)] focus:outline-none placeholder:text-[var(--text-secondary)]"
              style={{
                backgroundColor: 'var(--panel-bg)',
                borderColor: 'var(--border-color)'
              }}
            />
            <button
              type="button"
              onClick={() => {
                if (customUrlInput.trim()) {
                  onSelectAvatar(customUrlInput.trim());
                }
              }}
              disabled={!customUrlInput.trim()}
              className="px-3.5 py-2 text-white font-bold text-xs rounded-lg transition-all disabled:opacity-40 cursor-pointer shrink-0 shadow-xs"
              style={{ backgroundColor: accentColor }}
            >
              Set Photo
            </button>
          </div>

          {customUrlInput.trim() && (
            <div className="flex items-center gap-3 pt-2 border-t" style={{ borderColor: 'var(--border-color)' }}>
              <img
                src={customUrlInput.trim()}
                alt="Preview"
                className="w-12 h-12 rounded-xl object-cover border"
                style={{ borderColor: 'var(--border-color)' }}
                onError={(e) => {
                  (e.target as HTMLImageElement).src = 'https://api.dicebear.com/7.x/identicon/svg?seed=Fallback';
                }}
              />
              <div className="text-xs">
                <span className="font-bold text-[var(--text-primary)] block">Live Image Link Preview</span>
                <span className="text-[10px] text-[var(--text-secondary)]">Click "Set Photo" to apply</span>
              </div>
            </div>
          )}
        </div>
      )}

    </div>
  );
}

