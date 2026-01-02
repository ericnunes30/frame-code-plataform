import { useCallback, useEffect, useState } from 'react';
import { api, Workspace } from '../services';

export function useWorkspaces() {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchWorkspaces = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.get<Workspace[]>('/workspaces');
      setWorkspaces(data);
    } catch (e) {
      setError(e as Error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWorkspaces();
  }, [fetchWorkspaces]);

  return { workspaces, loading, error, refetch: fetchWorkspaces, refresh: fetchWorkspaces };
}

