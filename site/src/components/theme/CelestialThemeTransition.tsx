'use client';

import { createPortal } from 'react-dom';

export type CelestialTransitionDirection = 'to-day' | 'to-night';

export const CELESTIAL_TRANSITION_DURATION_MS = 980;
export const CELESTIAL_THEME_SWAP_MS = 520;

interface CelestialThemeTransitionProps {
  direction: CelestialTransitionDirection;
}

export function CelestialThemeTransition({ direction }: CelestialThemeTransitionProps) {
  if (typeof document === 'undefined') {
    return null;
  }

  return createPortal(
    <div
      className={`celestial-theme-transition celestial-theme-transition--${direction}`}
      aria-hidden="true"
      data-direction={direction}
    >
      <div className="celestial-theme-transition__wash" />
      <div className="celestial-theme-transition__body">
        <span className="celestial-theme-transition__pixel celestial-theme-transition__pixel--a" />
        <span className="celestial-theme-transition__pixel celestial-theme-transition__pixel--b" />
        <span className="celestial-theme-transition__pixel celestial-theme-transition__pixel--c" />
        <span className="celestial-theme-transition__pixel celestial-theme-transition__pixel--d" />
      </div>
      <div className="celestial-theme-transition__horizon" />
    </div>,
    document.body
  );
}
