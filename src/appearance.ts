import type { Profile } from '../shared/types';

export const APPEARANCES = [
  { id: 'neon', name: 'Neon Arcade', description: 'Electric color. Front-row action.' },
  { id: 'velvet', name: 'Velvet Club', description: 'Green felt. A little golden-hour luck.' },
  { id: 'pop', name: 'Lucky Pop', description: 'Big color. Bigger personality.' },
  { id: 'glow', name: 'Violet Glow', description: 'Shimmering violet. Electric pink.' },
] as const;

export function readCachedAppearance(): Profile['appearance'] {
  try {
    const saved = localStorage.getItem('jom-appearance');
    if (saved === 'neon' || saved === 'velvet' || saved === 'pop' || saved === 'glow') return saved;
  } catch {
    // The server profile remains authoritative when browser storage is unavailable.
  }
  return 'neon';
}
