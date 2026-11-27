// The interactive part of each demo, loaded only when the demo scrolls into view (each import
// becomes its own small script). A demo without an entry here shows its static fallback.
import type { Mount } from './frame.ts';

export const loaders: Record<string, () => Promise<{ mount: Mount }>> = {
  'next-word': () => import('./next-word/ui.ts'),
  'watch-it-forget': () => import('./watch-it-forget/ui.ts'),
  'training-footprint': () => import('./training-footprint/ui.ts'),
  'step-through-python': () => import('./step-through-python/ui.ts'),
  'data-to-noise': () => import('./data-to-noise/ui.ts'),
  'leaderboard-depends-on-you': () => import('./leaderboard-depends-on-you/ui.ts'),
  'does-efficiency-save-energy': () => import('./does-efficiency-save-energy/ui.ts'),
  'dial-in': () => import('./dial-in/ui.ts'),
};
