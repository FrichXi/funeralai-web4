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
    let cancelled = false;
    setLoading(true);
    setError(null);

    fetch('/data/graph-view.json')
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data: GraphData) => {
        if (!cancelled) {
          setGraphData(data);
          setLoading(false);
        }
      })
      .catch((err) => {
        console.error('Failed to load graph data:', err);
        if (!cancelled) {
          setError(err instanceof Error ? err.message : '加载图谱数据失败');
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [retryCount]);

  const retry = () => setRetryCount((c) => c + 1);

  return { graphData, loading, error, retry };
}
