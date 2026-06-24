'use client';

import { useTheme } from '@/components/theme/ThemeProvider';

const SUN_PIXELS = [
  [2, 0], [6, 0],
  [4, 1],
  [1, 2], [4, 2], [7, 2],
  [2, 3], [3, 3], [4, 3], [5, 3], [6, 3],
  [0, 4], [2, 4], [3, 4], [4, 4], [5, 4], [6, 4], [8, 4],
  [2, 5], [3, 5], [4, 5], [5, 5], [6, 5],
  [1, 6], [4, 6], [7, 6],
  [4, 7],
  [2, 8], [6, 8],
] as const;

const MOON_PIXELS = [
  [4, 0], [5, 0],
  [3, 1], [4, 1],
  [2, 2], [3, 2],
  [1, 3], [2, 3],
  [1, 4], [2, 4], [5, 4],
  [1, 5], [2, 5], [6, 5],
  [2, 6], [3, 6], [6, 6],
  [3, 7], [4, 7], [5, 7],
  [4, 8],
] as const;

function PixelCelestialIcon({ activeTheme }: { activeTheme: 'night' | 'day' }) {
  const pixelSize = 2;
  const pixels = activeTheme === 'day' ? MOON_PIXELS : SUN_PIXELS;
  const color = activeTheme === 'day' ? 'hsl(var(--foreground))' : '#facc15';
  const glow = activeTheme === 'day' ? '0 0 6px hsl(var(--foreground) / 0.35)' : '0 0 8px rgba(250, 204, 21, 0.75)';

  return (
    <span
      className="inline-flex items-center justify-center"
      aria-hidden="true"
      style={{ width: 18, height: 18 }}
    >
      <span
        className="relative"
        style={{
          width: pixelSize,
          height: pixelSize,
          backgroundColor: 'transparent',
          boxShadow: pixels
            .map(([x, y]) => `${x * pixelSize}px ${y * pixelSize}px 0 ${color}`)
            .join(', '),
          filter: `drop-shadow(${glow})`,
          transform: 'translate(-8px, -8px)',
        }}
      />
    </span>
  );
}

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const isDay = theme === 'day';

  return (
    <button
      type="button"
      aria-label={isDay ? '切换夜晚模式' : '切换白天模式'}
      aria-pressed={isDay}
      title={isDay ? '切换夜晚模式' : '切换白天模式'}
      onClick={toggleTheme}
      className="inline-flex h-8 w-8 shrink-0 items-center justify-center border border-border bg-background text-primary transition-colors hover:border-primary hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    >
      <PixelCelestialIcon activeTheme={theme} />
    </button>
  );
}

