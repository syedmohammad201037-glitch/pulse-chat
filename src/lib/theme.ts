export type ThemeMode = 'dark' | 'titanium' | 'purple' | 'light';
export type WallpaperPattern = 'cyber_skyline' | 'cosmic_nebula' | 'minimal_flow' | 'none' | 'custom';

export interface ThemeConfig {
  id: ThemeMode;
  name: string;
  isDark: boolean;
  bgMain: string;
  cardBgBase: string; // "r, g, b"
  headerBgBase: string;
  inputBgBase: string;
  popoverBgBase: string;
  msgOutgoingBg: string;
  msgOutgoingText: string;
  msgIncomingBg: string;
  msgIncomingText: string;
  accentColor: string;
  accentHover: string;
  accentGlow: string;
  borderColor: string;
  primaryText: string;
  secondaryText: string;
}

export const THEME_PRESETS: Record<ThemeMode, ThemeConfig> = {
  'dark': {
    id: 'dark',
    name: 'Obsidian Onyx (Neon Cyan)',
    isDark: true,
    bgMain: '#07090e',
    cardBgBase: '13, 18, 27',
    headerBgBase: '18, 24, 38',
    inputBgBase: '24, 32, 48',
    popoverBgBase: '18, 24, 38',
    msgOutgoingBg: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
    msgOutgoingText: '#ffffff',
    msgIncomingBg: '#131b2b',
    msgIncomingText: '#f0f6fc',
    accentColor: '#0ea5e9',
    accentHover: '#38bdf8',
    accentGlow: 'rgba(14, 165, 233, 0.4)',
    borderColor: 'rgba(56, 189, 248, 0.15)',
    primaryText: '#f0f6fc',
    secondaryText: '#94a3b8',
  },
  'titanium': {
    id: 'titanium',
    name: 'Titanium Stealth (Cobalt)',
    isDark: true,
    bgMain: '#0b0d13',
    cardBgBase: '17, 21, 30',
    headerBgBase: '24, 30, 44',
    inputBgBase: '30, 38, 56',
    popoverBgBase: '24, 30, 44',
    msgOutgoingBg: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
    msgOutgoingText: '#ffffff',
    msgIncomingBg: '#182032',
    msgIncomingText: '#f8fafc',
    accentColor: '#3b82f6',
    accentHover: '#60a5fa',
    accentGlow: 'rgba(59, 130, 246, 0.35)',
    borderColor: 'rgba(255, 255, 255, 0.1)',
    primaryText: '#f8fafc',
    secondaryText: '#94a3b8',
  },
  'purple': {
    id: 'purple',
    name: 'Cyber Amethyst (Violet)',
    isDark: true,
    bgMain: '#080614',
    cardBgBase: '18, 14, 36',
    headerBgBase: '26, 19, 54',
    inputBgBase: '36, 26, 74',
    popoverBgBase: '26, 19, 54',
    msgOutgoingBg: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
    msgOutgoingText: '#ffffff',
    msgIncomingBg: 'rgba(32, 23, 64, 0.95)',
    msgIncomingText: '#faf5ff',
    accentColor: '#a855f7',
    accentHover: '#c084fc',
    accentGlow: 'rgba(168, 85, 247, 0.35)',
    borderColor: 'rgba(168, 85, 247, 0.2)',
    primaryText: '#faf5ff',
    secondaryText: '#c084fc',
  },
  'light': {
    id: 'light',
    name: 'Pristine Minimal (Sapphire)',
    isDark: false,
    bgMain: '#f1f5f9',
    cardBgBase: '255, 255, 255',
    headerBgBase: '248, 250, 252',
    inputBgBase: '241, 245, 249',
    popoverBgBase: '255, 255, 255',
    msgOutgoingBg: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
    msgOutgoingText: '#ffffff',
    msgIncomingBg: '#ffffff',
    msgIncomingText: '#0f172a',
    accentColor: '#2563eb',
    accentHover: '#1d4ed8',
    accentGlow: 'rgba(37, 99, 235, 0.2)',
    borderColor: '#e2e8f0',
    primaryText: '#0f172a',
    secondaryText: '#64748b',
  }
};

export const WALLPAPER_PRESETS: { 
  id: WallpaperPattern; 
  name: string; 
  url: string; 
  previewThumb: string;
}[] = [
  {
    id: 'cyber_skyline',
    name: 'Cyber Skyline (Default)',
    url: 'https://images3.alphacoders.com/137/1379078.png',
    previewThumb: 'https://images3.alphacoders.com/137/1379078.png',
  },
  {
    id: 'cosmic_nebula',
    name: 'Deep Nebula',
    url: 'https://images3.alphacoders.com/110/1106011.jpg',
    previewThumb: 'https://images3.alphacoders.com/110/1106011.jpg',
  },
  {
    id: 'minimal_flow',
    name: 'Abstract Dark Flow',
    url: 'https://images.wallpapersden.com/image/download/abstract-minimalism_am5nbmqUmZqaraWkpJRobWllrWdma2U.jpg',
    previewThumb: 'https://images.wallpapersden.com/image/download/abstract-minimalism_am5nbmqUmZqaraWkpJRobWllrWdma2U.jpg',
  },
  {
    id: 'none',
    name: 'Clean Solid (No Wallpaper)',
    url: '',
    previewThumb: '',
  }
];

export function getSafeTheme(mode?: string): ThemeConfig {
  if (mode === 'dark' || mode === 'titanium' || mode === 'purple' || mode === 'light') {
    return THEME_PRESETS[mode];
  }
  // Migration fallback
  if (mode === 'emerald' || mode === 'whatsapp' || mode === 'whatsapp-dark') return THEME_PRESETS['dark'];
  if (mode === 'pulse-dark') return THEME_PRESETS['titanium'];
  if (mode === 'whatsapp-light' || mode === 'pulse-light') return THEME_PRESETS['light'];
  if (mode === 'pulse-purple') return THEME_PRESETS['purple'];
  return THEME_PRESETS['dark'];
}

export function getSafeWallpaperUrl(pattern: WallpaperPattern, customUrl?: string): string {
  if (pattern === 'none') return '';
  if (pattern === 'custom' && customUrl) return customUrl;
  const match = WALLPAPER_PRESETS.find(p => p.id === pattern);
  if (match) return match.url;
  return WALLPAPER_PRESETS[0].url;
}

