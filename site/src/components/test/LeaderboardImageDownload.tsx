'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Download, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LeaderboardImageDownloadProps {
  className?: string;
  imageUrl?: string;
  imageVersion?: string;
  fileNamePrefix?: string;
  shareTitle?: string;
  buttonLabel?: string;
}

const DEFAULT_LEADERBOARD_IMAGE_URL = '/test/model-leaderboard-mobile.png';
const DEFAULT_FILE_NAME_PREFIX = 'funeralai-model-leaderboard';
const DEFAULT_SHARE_TITLE = '葬AI 模型总榜';
const DEFAULT_BUTTON_LABEL = '下载榜单图';
const IMAGE_FETCH_TIMEOUT_MS = 15000;

function versionedImageUrl(imageUrl: string, imageVersion?: string, cacheBust = false) {
  const baseOrigin = typeof window === 'undefined' ? 'https://funeralai.local' : window.location.origin;
  const url = new URL(imageUrl, baseOrigin);

  if (imageVersion) {
    url.searchParams.set('v', imageVersion);
  }

  if (cacheBust) {
    url.searchParams.set('downloadAt', String(Date.now()));
  }

  return url.origin === baseOrigin ? `${url.pathname}${url.search}${url.hash}` : url.toString();
}

async function fetchLeaderboardImage(imageUrl: string, signal?: AbortSignal, cache: RequestCache = 'reload') {
  const response = await fetch(imageUrl, {
    cache,
    signal,
  });

  if (!response.ok) {
    throw new Error(`leaderboard image fetch failed: ${response.status}`);
  }

  const blob = await response.blob();
  return blob.type === 'image/png' ? blob : new Blob([blob], { type: 'image/png' });
}

function fetchLeaderboardImageWithTimeout(imageUrl: string, cache: RequestCache = 'reload') {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), IMAGE_FETCH_TIMEOUT_MS);

  return fetchLeaderboardImage(imageUrl, controller.signal, cache).finally(() => {
    window.clearTimeout(timeoutId);
  });
}

function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function LeaderboardImageDownload({
  className,
  imageUrl = DEFAULT_LEADERBOARD_IMAGE_URL,
  imageVersion,
  fileNamePrefix = DEFAULT_FILE_NAME_PREFIX,
  shareTitle = DEFAULT_SHARE_TITLE,
  buttonLabel = DEFAULT_BUTTON_LABEL,
}: LeaderboardImageDownloadProps) {
  const [isPreparing, setIsPreparing] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const preparedImageUrl = useMemo(
    () => versionedImageUrl(imageUrl, imageVersion),
    [imageUrl, imageVersion],
  );

  useEffect(() => {
    let cancelled = false;

    async function preloadImage() {
      try {
        await fetchLeaderboardImageWithTimeout(preparedImageUrl, 'reload');
        if (!cancelled) {
          setError(null);
        }
      } catch {
        if (!cancelled) {
          setError('图片准备失败，请稍后重试');
        }
      } finally {
        if (!cancelled) {
          setIsPreparing(false);
        }
      }
    }

    preloadImage();

    return () => {
      cancelled = true;
    };
  }, [preparedImageUrl]);

  const handleDownload = useCallback(async () => {
    setIsGenerating(true);
    setError(null);

    try {
      const downloadImageUrl = versionedImageUrl(imageUrl, imageVersion, true);
      const blob = await fetchLeaderboardImageWithTimeout(downloadImageUrl, 'no-store');

      const fileName = `${fileNamePrefix}-${new Date().toISOString().slice(0, 10)}.png`;
      const file = new File([blob], fileName, { type: 'image/png' });
      setIsGenerating(false);

      if (
        typeof navigator.share === 'function' &&
        typeof navigator.canShare === 'function' &&
        navigator.canShare({ files: [file] })
      ) {
        try {
          await navigator.share({
            files: [file],
            title: shareTitle,
          });
          return;
        } catch (shareError) {
          if (shareError instanceof DOMException && shareError.name === 'AbortError') {
            return;
          }
        }
      }

      downloadBlob(blob, fileName);
    } catch (downloadError) {
      if (downloadError instanceof DOMException && downloadError.name === 'AbortError') {
        setError('图片加载超时，请刷新后重试');
      } else {
        setError('保存失败，请刷新后重试');
      }
    } finally {
      setIsGenerating(false);
    }
  }, [fileNamePrefix, imageUrl, imageVersion, shareTitle]);

  const isBusy = isPreparing || isGenerating;

  return (
    <div className={cn('flex flex-col items-end gap-1', className)} data-export-ignore>
      <button
        type="button"
        onClick={handleDownload}
        disabled={isBusy}
        className="inline-flex h-9 items-center justify-center gap-1.5 border border-primary px-3 text-xs text-primary transition-colors hover:bg-primary/10 disabled:cursor-wait disabled:opacity-70"
      >
        {isBusy ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
        ) : (
          <Download className="h-3.5 w-3.5" aria-hidden="true" />
        )}
        <span>{isPreparing ? '准备中' : isGenerating ? '下载中' : buttonLabel}</span>
      </button>
      {error ? <p className="text-[10px] leading-none text-destructive">{error}</p> : null}
    </div>
  );
}
