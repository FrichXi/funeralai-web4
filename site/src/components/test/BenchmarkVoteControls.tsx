'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

type VoteDirection = 'raise' | 'lower';
type CurrentVote = VoteDirection | null;

interface BenchmarkVoteControlsProps {
  leaderboardId: string;
  benchmarkVersion: string;
  modelSlug: string;
  modelName: string;
  modelVersion: string;
  className?: string;
}

const VOTER_ID_KEY = 'funeralai:test:voter-id';
const STORAGE_PREFIX = 'funeralai:test:vote';

function randomId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

function getVoterId() {
  const existing = window.localStorage.getItem(VOTER_ID_KEY);

  if (existing) {
    return existing;
  }

  const next = randomId();
  window.localStorage.setItem(VOTER_ID_KEY, next);
  return next;
}

function voteStorageKey(leaderboardId: string, benchmarkVersion: string, modelSlug: string) {
  return `${STORAGE_PREFIX}:${leaderboardId}:${benchmarkVersion}:${modelSlug}`;
}

function normalizeVote(value: unknown): CurrentVote {
  return value === 'raise' || value === 'lower' ? value : null;
}

export function BenchmarkVoteControls({
  leaderboardId,
  benchmarkVersion,
  modelSlug,
  modelName,
  modelVersion,
  className,
}: BenchmarkVoteControlsProps) {
  const [currentVote, setCurrentVote] = useState<CurrentVote>(null);
  const [voterId, setVoterId] = useState<string | null>(null);
  const [pendingVote, setPendingVote] = useState<CurrentVote>(null);
  const [hasError, setHasError] = useState(false);
  const storageKey = useMemo(
    () => voteStorageKey(leaderboardId, benchmarkVersion, modelSlug),
    [benchmarkVersion, leaderboardId, modelSlug],
  );

  useEffect(() => {
    const nextVoterId = getVoterId();
    const storedVote = normalizeVote(window.localStorage.getItem(storageKey));
    setVoterId(nextVoterId);
    setCurrentVote(storedVote);

    const params = new URLSearchParams({
      voterId: nextVoterId,
      leaderboardId,
      benchmarkVersion,
      modelSlug,
    });

    let cancelled = false;

    fetch(`/api/test/votes?${params.toString()}`, {
      cache: 'no-store',
    })
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (cancelled || !data) {
          return;
        }

        const serverVote = normalizeVote(data.currentVote);
        setCurrentVote(serverVote);

        if (serverVote) {
          window.localStorage.setItem(storageKey, serverVote);
        } else {
          window.localStorage.removeItem(storageKey);
        }
      })
      .catch(() => {
        // The local selection is enough for UI continuity when the API is unavailable.
      });

    return () => {
      cancelled = true;
    };
  }, [benchmarkVersion, leaderboardId, modelSlug, storageKey]);

  const submitVote = useCallback(
    async (direction: VoteDirection) => {
      if (!voterId || pendingVote) {
        return;
      }

      const nextVote: CurrentVote = currentVote === direction ? null : direction;
      const previousVote = currentVote;
      setCurrentVote(nextVote);
      setPendingVote(direction);
      setHasError(false);

      if (nextVote) {
        window.localStorage.setItem(storageKey, nextVote);
      } else {
        window.localStorage.removeItem(storageKey);
      }

      try {
        const response = await fetch('/api/test/votes', {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
          },
          body: JSON.stringify({
            voterId,
            leaderboardId,
            benchmarkVersion,
            modelSlug,
            modelName,
            modelVersion,
            direction: nextVote,
          }),
        });

        if (!response.ok) {
          throw new Error(`vote failed: ${response.status}`);
        }

        const data = await response.json();
        const serverVote = normalizeVote(data.currentVote);
        setCurrentVote(serverVote);

        if (serverVote) {
          window.localStorage.setItem(storageKey, serverVote);
        } else {
          window.localStorage.removeItem(storageKey);
        }
      } catch {
        setCurrentVote(previousVote);
        setHasError(true);

        if (previousVote) {
          window.localStorage.setItem(storageKey, previousVote);
        } else {
          window.localStorage.removeItem(storageKey);
        }
      } finally {
        setPendingVote(null);
      }
    },
    [
      benchmarkVersion,
      currentVote,
      leaderboardId,
      modelName,
      modelSlug,
      modelVersion,
      pendingVote,
      storageKey,
      voterId,
    ],
  );

  const buttons: Array<{
    direction: VoteDirection;
    label: string;
    activeLabel: string;
    icon: typeof ArrowUp;
    activeClassName: string;
  }> = [
    {
      direction: 'raise',
      label: '觉得偏低，投上调票',
      activeLabel: '已投上调票，再点取消',
      icon: ArrowUp,
      activeClassName: 'border-[#7351cf] bg-[#7351cf] text-[#fffaf0] shadow-[2px_2px_0_#2f2938]',
    },
    {
      direction: 'lower',
      label: '觉得偏高，投下调票',
      activeLabel: '已投下调票，再点取消',
      icon: ArrowDown,
      activeClassName: 'border-[#ef806f] bg-[#ef806f] text-[#211a2c] shadow-[2px_2px_0_#2f2938]',
    },
  ];

  return (
    <div
      className={cn('flex shrink-0 items-center gap-1', className)}
      data-export-ignore
      aria-label={`${modelVersion} 排名反馈`}
    >
      {buttons.map(({ direction, label, activeLabel, icon: Icon, activeClassName }) => {
        const isActive = currentVote === direction;
        const isPending = pendingVote === direction;

        return (
          <button
            key={direction}
            type="button"
            onClick={() => submitVote(direction)}
            aria-pressed={isActive}
            title={isActive ? activeLabel : label}
            disabled={!voterId || Boolean(pendingVote)}
            className={cn(
              'inline-flex h-7 w-7 items-center justify-center border border-[#2f2938] bg-[#fffaf0] text-[#43384f]',
              'transition-[background-color,color,transform,box-shadow] hover:-translate-y-px hover:bg-[#ebe4d6]',
              'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7351cf]',
              'disabled:cursor-wait disabled:opacity-70',
              isActive && activeClassName,
            )}
          >
            {isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
            ) : (
              <Icon className="h-3.5 w-3.5 stroke-[2.5]" aria-hidden="true" />
            )}
            <span className="sr-only">{isActive ? activeLabel : label}</span>
          </button>
        );
      })}
      {hasError ? <span className="sr-only" role="status">投票失败，请稍后再试</span> : null}
    </div>
  );
}
