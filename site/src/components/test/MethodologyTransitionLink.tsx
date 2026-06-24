'use client';

import { type MouseEvent, type ReactNode, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

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
    }, 980);
  }

  return (
    <>
      <a href={href} onClick={handleClick} className={className}>
        {children}
      </a>
      {animating ? (
        <div className="methodology-moon-transition" aria-hidden="true">
          <div className="methodology-moon-transition__wash" />
          <div className="methodology-moon-transition__moon">
            <span className="methodology-moon-transition__pixel methodology-moon-transition__pixel--a" />
            <span className="methodology-moon-transition__pixel methodology-moon-transition__pixel--b" />
            <span className="methodology-moon-transition__pixel methodology-moon-transition__pixel--c" />
            <span className="methodology-moon-transition__pixel methodology-moon-transition__pixel--d" />
          </div>
          <div className="methodology-moon-transition__horizon" />
        </div>
      ) : null}
      <style>{`
        .methodology-moon-transition {
          position: fixed;
          inset: 0;
          z-index: 100;
          overflow: hidden;
          pointer-events: none;
          background:
            radial-gradient(circle at 50% 82%, rgba(250, 204, 21, 0.25), transparent 30%),
            linear-gradient(180deg, #17131d 0%, #2a1b3d 52%, #f5f1e8 100%);
          animation: methodology-sky-brighten 980ms cubic-bezier(0.22, 1, 0.36, 1) forwards;
        }

        .methodology-moon-transition__wash {
          position: absolute;
          inset: 0;
          background: #f5f1e8;
          opacity: 0;
          animation: methodology-wash-in 980ms cubic-bezier(0.22, 1, 0.36, 1) forwards;
        }

        .methodology-moon-transition__moon {
          position: absolute;
          left: 50%;
          bottom: -132px;
          width: 112px;
          height: 112px;
          transform: translateX(-50%);
          border: 4px solid #17131d;
          background: #fff2b8;
          box-shadow:
            0 0 0 4px #facc15,
            0 0 56px rgba(250, 204, 21, 0.62),
            0 0 112px rgba(245, 241, 232, 0.55);
          image-rendering: pixelated;
          animation: methodology-moon-rise 980ms cubic-bezier(0.22, 1, 0.36, 1) forwards;
        }

        .methodology-moon-transition__pixel {
          position: absolute;
          width: 12px;
          height: 12px;
          background: #e5c873;
        }

        .methodology-moon-transition__pixel--a {
          top: 20px;
          left: 24px;
          box-shadow: 12px 0 #e5c873, 0 12px #e5c873;
        }

        .methodology-moon-transition__pixel--b {
          top: 34px;
          right: 22px;
          width: 18px;
          height: 18px;
        }

        .methodology-moon-transition__pixel--c {
          right: 34px;
          bottom: 26px;
          box-shadow: 12px 12px #e5c873;
        }

        .methodology-moon-transition__pixel--d {
          left: 36px;
          bottom: 20px;
          width: 10px;
          height: 10px;
        }

        .methodology-moon-transition__horizon {
          position: absolute;
          right: 0;
          bottom: 0;
          left: 0;
          height: 34%;
          background:
            linear-gradient(180deg, transparent 0%, rgba(245, 241, 232, 0.86) 22%, #f5f1e8 100%),
            repeating-linear-gradient(0deg, rgba(47, 41, 56, 0.12) 0 2px, transparent 2px 9px);
          transform: translateY(32%);
          animation: methodology-horizon-rise 980ms cubic-bezier(0.22, 1, 0.36, 1) forwards;
        }

        @keyframes methodology-moon-rise {
          0% {
            bottom: -132px;
            opacity: 0.72;
          }
          68% {
            bottom: 50%;
            opacity: 1;
          }
          100% {
            bottom: 58%;
            opacity: 0.18;
          }
        }

        @keyframes methodology-sky-brighten {
          0% {
            opacity: 1;
          }
          78% {
            opacity: 1;
          }
          100% {
            opacity: 0.98;
          }
        }

        @keyframes methodology-wash-in {
          0%,
          55% {
            opacity: 0;
          }
          100% {
            opacity: 0.96;
          }
        }

        @keyframes methodology-horizon-rise {
          0% {
            transform: translateY(32%);
          }
          100% {
            transform: translateY(0);
          }
        }

        @media (max-width: 640px) {
          .methodology-moon-transition__moon {
            width: 88px;
            height: 88px;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .methodology-moon-transition {
            display: none;
          }
        }
      `}</style>
    </>
  );
}
