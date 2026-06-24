'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { ThemeToggle } from './ThemeToggle';

export function Navbar() {
  const pathname = usePathname();

  return (
    <nav className="sticky top-0 z-50 h-[var(--navbar-height)] border-b border-border bg-background/60 backdrop-blur-sm">
      <div className="grid h-full grid-cols-[minmax(4rem,1fr)_auto_minmax(0,1fr)] items-center gap-2 px-3 sm:px-4">
        {/* Left: logo + site name */}
        <Link href="/" className="flex min-w-0 items-center gap-2 justify-self-start hover:opacity-80 transition-opacity">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo.png"
            alt="葬AI"
            className="h-6"
            style={{ imageRendering: 'pixelated' }}
          />
          <span className="hidden text-xs text-primary min-[360px]:inline">葬AI</span>
        </Link>

        <div className="justify-self-center">
          <ThemeToggle />
        </div>

        {/* Right: nav links */}
        <div className="flex min-w-0 items-center justify-end gap-0.5 sm:gap-1">
          <Link
            href="/graph"
            className={cn(
              'px-1.5 py-1 text-xs transition-colors min-[420px]:px-2 sm:px-3',
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
              'px-1.5 py-1 text-xs transition-colors min-[420px]:px-2 sm:px-3',
              pathname.startsWith('/articles')
                ? 'text-primary'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            文章
          </Link>
          <Link
            href="/test"
            className={cn(
              'px-1.5 py-1 text-xs transition-colors min-[420px]:px-2 sm:px-3',
              pathname.startsWith('/test')
                ? 'text-primary'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            测试
          </Link>
          <Link
            href="/leaderboard"
            className={cn(
              'px-1.5 py-1 text-xs transition-colors min-[420px]:px-2 sm:px-3',
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
