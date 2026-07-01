'use client';

import { type MouseEvent, type ReactNode, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  CelestialThemeTransition,
  CELESTIAL_TRANSITION_DURATION_MS,
} from '@/components/theme/CelestialThemeTransition';

interface MethodologyTransitionLinkProps {
  href: string;
  className?: string;
  children: ReactNode;
}

export function MethodologyTransitionLink({
  href,
  className,
  children,
}: MethodologyTransitionLinkProps) {
  const router = useRouter();
  const [animating, setAnimating] = useState(false);
  const timeoutRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current !== null) {
        window.clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.altKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.currentTarget.target
    ) {
      return;
    }

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return;
    }

    event.preventDefault();

    if (animating) {
      return;
    }

    setAnimating(true);
    timeoutRef.current = window.setTimeout(() => {
      router.push(href);
    }, CELESTIAL_TRANSITION_DURATION_MS);
  }

  return (
    <>
      <a href={href} onClick={handleClick} className={className}>
        {children}
      </a>
      {animating ? <CelestialThemeTransition direction="to-day" /> : null}
    </>
  );
}
