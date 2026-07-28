import { useEffect, useState } from 'react';
import type { EntityDetails } from '@/lib/types';

const detailCache = new Map<string, EntityDetails>();

interface UseEntityDetailsReturn {
  details: EntityDetails | null;
  loading: boolean;
  error: string | null;
  retry: () => void;
}

export function useEntityDetails(nodeId: string | null | undefined): UseEntityDetailsReturn {
  const [details, setDetails] = useState<EntityDetails | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    if (!nodeId) {
      setDetails(null);
      setLoading(false);
      setError(null);
      return;
    }

    const cached = detailCache.get(nodeId);
    if (cached) {
      setDetails(cached);
      setLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;
    setDetails(null);
    setLoading(true);
    setError(null);

    fetch(`/data/entity-details/${encodeURIComponent(nodeId)}.json`)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data: EntityDetails) => {
        detailCache.set(nodeId, data);
        if (!cancelled) {
          setDetails(data);
          setLoading(false);
        }
      })
      .catch((err) => {
        console.error('Failed to load entity detail:', err);
        if (!cancelled) {
          setError(err instanceof Error ? err.message : '加载实体详情失败');
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [nodeId, retryCount]);

  const retry = () => setRetryCount((count) => count + 1);

  return { details, loading, error, retry };
}
