import { useState, useEffect, useCallback } from 'react';
import { api, WorkspaceStatus, WorkspaceConfig } from '../services';

export function useWorkspaces(filters?: { status?: WorkspaceStatus }) {
  const [workspaces, setWorkspaces] = useState<WorkspaceConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.get<WorkspaceConfig[]>('/workspaces', filters);
      setWorkspaces(data);
    } catch (e) {
      setError(e as Error);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { workspaces, loading, error, refresh: fetch };
}
