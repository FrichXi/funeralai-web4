'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

export function Navbar() {
  const pathname = usePathname();

  return (
    <nav className="sticky top-0 z-50 h-[var(--navbar-height)] border-b border-border bg-background/60 backdrop-blur-sm">
      <div className="flex h-full items-center justify-between px-4">
        {/* Left: logo + site name */}
        <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo.png"
            alt="葬AI"
            className="h-6"
            style={{ imageRendering: 'pixelated' }}
          />
          <span className="text-xs text-primary">葬AI</span>
        </Link>

        {/* Right: nav links */}
        <div className="flex items-center gap-1">
          <Link
            href="/graph"
            className={cn(
              'px-3 py-1 text-xs transition-colors',
              pathname.startsWith('/graph')
                ? 'text-primary'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            图谱
          </Link>
          <Link
            href="/articles"
            className={cn(
              'px-3 py-1 text-xs transition-colors',
              pathname.startsWith('/articles')
                ? 'text-primary'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            文章
          </Link>
          <Link
            href="/leaderboard"
            className={cn(
              'px-3 py-1 text-xs transition-colors',
              pathname.startsWith('/leaderboard')
                ? 'text-primary'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            排行
          </Link>
        </div>
      </div>
    </nav>
  );
}
