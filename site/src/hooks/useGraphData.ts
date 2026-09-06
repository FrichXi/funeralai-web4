import { useState, useEffect } from 'react';
import type { GraphData } from '@/lib/types';

interface UseGraphDataReturn {
  graphData: GraphData | null;
  loading: boolean;
  error: string | null;
  retry: () => void;
}

export function useGraphData(): UseGraphDataReturn {
  const [graphData, setGraphData] = useState<GraphData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(new Error('请求超时，请重试')), 20000);
    setLoading(true);
    setError(null);

    fetch('/data/graph-shell.json', { signal: controller.signal })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data: GraphData) => {
        if (!Array.isArray(data.nodes) || !Array.isArray(data.links) ||
            data.nodes.some((node) => !Number.isFinite(node.x) || !Number.isFinite(node.y))) {
          throw new Error('图谱数据无效，请重试');
        }
        if (!controller.signal.aborted) {
          setGraphData(data);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (err.name !== 'AbortError') {
          setError(err instanceof Error ? err.message : '加载图谱数据失败');
          setLoading(false);
        }
      })
      .finally(() => clearTimeout(timeout));

    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
  }, [retryCount]);

  const retry = () => setRetryCount((c) => c + 1);

  return { graphData, loading, error, retry };
}
