import { useEffect, useState } from 'react';
import type { EntityDetails } from '@/lib/types';

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

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(new Error('请求超时，请重试')), 20000);
    setDetails(null);
    setLoading(true);
    setError(null);

    fetch(`/data/entity-details/${encodeURIComponent(nodeId)}.json`, { signal: controller.signal })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data: EntityDetails) => {
        if (data.node?.id !== nodeId || !Array.isArray(data.links)) throw new Error('实体详情无效，请重试');
        if (!controller.signal.aborted) {
          setDetails(data);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (err.name !== 'AbortError') {
          setError(err instanceof Error ? err.message : '加载实体详情失败');
          setLoading(false);
        }
      })
      .finally(() => clearTimeout(timeout));

    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
  }, [nodeId, retryCount]);

  const retry = () => setRetryCount((count) => count + 1);

  return { details, loading, error, retry };
}
