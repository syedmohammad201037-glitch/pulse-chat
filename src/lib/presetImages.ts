export interface PresetImage {
  id: string;
  title: string;
  url: string;
  category: string;
  thumbnailUrl?: string;
}

export const PRESET_AVATARS: { category: string; items: PresetImage[] }[] = [
  {
    category: '3D & Stylized Characters',
    items: [
      { id: 'av-3d-1', title: 'Cyberpunk Boy', url: 'https://images.unsplash.com/photo-1566492031773-4f4e44671857?auto=format&fit=crop&w=400&q=80', category: '3D' },
      { id: 'av-3d-2', title: 'Creative Designer', url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80', category: '3D' },
      { id: 'av-3d-3', title: 'Neon Hacker', url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80', category: '3D' },
      { id: 'av-3d-4', title: 'Tech Lead', url: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=400&q=80', category: '3D' },
      { id: 'av-3d-5', title: 'Gamer Girl', url: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=400&q=80', category: '3D' },
      { id: 'av-3d-6', title: 'Urban Nomad', url: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=400&q=80', category: '3D' },
    ]
  },
  {
    category: 'Artistic & Anime Style',
    items: [
      { id: 'av-art-1', title: 'Cosmic Wanderer', url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=400&q=80', category: 'Art' },
      { id: 'av-art-2', title: 'Abstract Aura', url: 'https://images.unsplash.com/photo-1634017839464-5c339ebe3cb4?auto=format&fit=crop&w=400&q=80', category: 'Art' },
      { id: 'av-art-3', title: 'Synthwave Glow', url: 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?auto=format&fit=crop&w=400&q=80', category: 'Art' },
      { id: 'av-art-4', title: 'Pixel Dreams', url: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=400&q=80', category: 'Art' },
      { id: 'av-art-5', title: 'Future Samurai', url: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?auto=format&fit=crop&w=400&q=80', category: 'Art' },
    ]
  },
  {
    category: 'Minimal & Icons',
    items: [
      { id: 'av-min-1', title: 'Adventurer', url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Felix', category: 'Minimal' },
      { id: 'av-min-2', title: 'Bot Neon', url: 'https://api.dicebear.com/7.x/bottts/svg?seed=PulseBot', category: 'Minimal' },
      { id: 'av-min-3', title: 'Pixel Art', url: 'https://api.dicebear.com/7.x/pixel-art/svg?seed=GamerX', category: 'Minimal' },
      { id: 'av-min-4', title: 'Lorelei', url: 'https://api.dicebear.com/7.x/lorelei/svg?seed=Aria', category: 'Minimal' },
      { id: 'av-min-5', title: 'Shapes & Geo', url: 'https://api.dicebear.com/7.x/shapes/svg?seed=Matrix', category: 'Minimal' },
      { id: 'av-min-6', title: 'Micah Stylized', url: 'https://api.dicebear.com/7.x/micah/svg?seed=Spark', category: 'Minimal' }
    ]
  }
];

export const PRESET_WALLPAPERS: { category: string; items: PresetImage[] }[] = [
  {
    category: 'Dark & Cyberpunk',
    items: [
      { id: 'wp-cyber-1', title: 'Neon Rain City', url: 'https://images.unsplash.com/photo-1519501025264-65ba15a82390?auto=format&fit=crop&w=1920&q=80', category: 'Cyberpunk' },
      { id: 'wp-cyber-2', title: 'Tokyo Night Lights', url: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=1920&q=80', category: 'Cyberpunk' },
      { id: 'wp-cyber-3', title: 'Cyber Highway', url: 'https://images.unsplash.com/photo-1508739773434-c26b3d09e071?auto=format&fit=crop&w=1920&q=80', category: 'Cyberpunk' },
      { id: 'wp-cyber-4', title: 'Midnight Metropolis', url: 'https://images.unsplash.com/photo-1514565131-fce0801e5785?auto=format&fit=crop&w=1920&q=80', category: 'Cyberpunk' }
    ]
  },
  {
    category: 'Cosmic & Space',
    items: [
      { id: 'wp-space-1', title: 'Orion Nebula Glow', url: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=1920&q=80', category: 'Space' },
      { id: 'wp-space-2', title: 'Milky Way Galaxy', url: 'https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?auto=format&fit=crop&w=1920&q=80', category: 'Space' },
      { id: 'wp-space-3', title: 'Deep Space Stars', url: 'https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?auto=format&fit=crop&w=1920&q=80', category: 'Space' },
      { id: 'wp-space-4', title: 'Aurora Borealis', url: 'https://images.unsplash.com/photo-1531366936337-7c912a4589a7?auto=format&fit=crop&w=1920&q=80', category: 'Space' }
    ]
  },
  {
    category: 'Nature & Atmosphere',
    items: [
      { id: 'wp-nat-1', title: 'Foggy Mountains', url: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1920&q=80', category: 'Nature' },
      { id: 'wp-nat-2', title: 'Sunset Ocean Wave', url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1920&q=80', category: 'Nature' },
      { id: 'wp-nat-3', title: 'Misty Pine Forest', url: 'https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&w=1920&q=80', category: 'Nature' },
      { id: 'wp-nat-4', title: 'Desert Dunes Sunset', url: 'https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?auto=format&fit=crop&w=1920&q=80', category: 'Nature' }
    ]
  },
  {
    category: 'Abstract & Modern',
    items: [
      { id: 'wp-abs-1', title: 'Fluid Purple Gradient', url: 'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?auto=format&fit=crop&w=1920&q=80', category: 'Abstract' },
      { id: 'wp-abs-2', title: 'Minimalist Architecture', url: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=1920&q=80', category: 'Abstract' },
      { id: 'wp-abs-3', title: 'Prism Glass Shards', url: 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?auto=format&fit=crop&w=1920&q=80', category: 'Abstract' }
    ]
  }
];

export const PRESET_STORY_PHOTOS: { category: string; items: PresetImage[] }[] = [
  {
    category: 'Travel & Scenery',
    items: [
      { id: 'st-tr-1', title: 'Northern Lights', url: 'https://images.unsplash.com/photo-1531366936337-7c912a4589a7?auto=format&fit=crop&w=800&q=80', category: 'Travel' },
      { id: 'st-tr-2', title: 'Tropical Island', url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80', category: 'Travel' },
      { id: 'st-tr-3', title: 'Alpine Peak', url: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=800&q=80', category: 'Travel' },
      { id: 'st-tr-4', title: 'Santorini Sunset', url: 'https://images.unsplash.com/photo-1570077188670-e3a8d69ac5ff?auto=format&fit=crop&w=800&q=80', category: 'Travel' }
    ]
  },
  {
    category: 'Lifestyle & Cafe',
    items: [
      { id: 'st-lf-1', title: 'Cozy Coffee', url: 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&w=800&q=80', category: 'Lifestyle' },
      { id: 'st-lf-2', title: 'Urban Rooftop', url: 'https://images.unsplash.com/photo-1519501025264-65ba15a82390?auto=format&fit=crop&w=800&q=80', category: 'Lifestyle' },
      { id: 'st-lf-3', title: 'Night Drive', url: 'https://images.unsplash.com/photo-1508739773434-c26b3d09e071?auto=format&fit=crop&w=800&q=80', category: 'Lifestyle' },
      { id: 'st-lf-4', title: 'Music & Headphones', url: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=800&q=80', category: 'Lifestyle' }
    ]
  },
  {
    category: 'Tech & Code',
    items: [
      { id: 'st-tc-1', title: 'Coding Workspace', url: 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=800&q=80', category: 'Tech' },
      { id: 'st-tc-2', title: 'Dual Screen Setup', url: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=800&q=80', category: 'Tech' },
      { id: 'st-tc-3', title: 'Mechanical Keyboard', url: 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?auto=format&fit=crop&w=800&q=80', category: 'Tech' }
    ]
  }
];

export const PRESET_CHAT_MEDIA: { category: string; items: PresetImage[] }[] = [
  {
    category: 'Reactions & Fun',
    items: [
      { id: 'cm-rx-1', title: 'Celebration Fireworks', url: 'https://images.unsplash.com/photo-1498931299472-f7a63a5a1cfa?auto=format&fit=crop&w=800&q=80', category: 'Reactions' },
      { id: 'cm-rx-2', title: 'Coffee Time', url: 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&w=800&q=80', category: 'Reactions' },
      { id: 'cm-rx-3', title: 'Thumbs Up Vibes', url: 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?auto=format&fit=crop&w=800&q=80', category: 'Reactions' },
      { id: 'cm-rx-4', title: 'Party Confetti', url: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=800&q=80', category: 'Reactions' }
    ]
  },
  {
    category: 'High-Res Nature & Places',
    items: [
      { id: 'cm-nt-1', title: 'Mountain Vista', url: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=800&q=80', category: 'Nature' },
      { id: 'cm-nt-2', title: 'Emerald Lake', url: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=800&q=80', category: 'Nature' },
      { id: 'cm-nt-3', title: 'Ocean Waves', url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80', category: 'Nature' },
      { id: 'cm-nt-4', title: 'Starry Night', url: 'https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?auto=format&fit=crop&w=800&q=80', category: 'Nature' }
    ]
  },
  {
    category: 'Tech & Modern Art',
    items: [
      { id: 'cm-tc-1', title: 'Code Screen', url: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=800&q=80', category: 'Tech' },
      { id: 'cm-tc-2', title: 'Circuit Board', url: 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=800&q=80', category: 'Tech' },
      { id: 'cm-tc-3', title: 'Neon Lights', url: 'https://images.unsplash.com/photo-1519501025264-65ba15a82390?auto=format&fit=crop&w=800&q=80', category: 'Tech' }
    ]
  }
];
