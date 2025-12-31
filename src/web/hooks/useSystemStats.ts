import { useState, useEffect } from 'react';
import { api } from '../services';

export interface SystemStats {
  total: number;
  running: number;
  paused: number;
  stopped: number;
}

export function useSystemStats() {
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.get<SystemStats>('/system/stats');
      setStats(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch system stats');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    // Refresh stats every 5 seconds
    const interval = setInterval(fetchStats, 5000);
    return () => clearInterval(interval);
  }, []);

  return { stats, loading, error, refetch: fetchStats };
}
