import { useCallback, useEffect, useState } from 'react';
import { api, Workspace } from '../services';

export function useWorkspace(workspaceId: string) {
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchWorkspace = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.get<Workspace>(`/workspaces/${workspaceId}`);
      setWorkspace(data);
    } catch (e) {
      setError(e as Error);
    } finally {
      setLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    if (!workspaceId) return;
    fetchWorkspace();
  }, [fetchWorkspace, workspaceId]);

  const destroy = useCallback(async () => {
    await api.delete(`/workspaces/${workspaceId}`);
  }, [workspaceId]);

  return { workspace, loading, error, refetch: fetchWorkspace, refresh: fetchWorkspace, destroy };
}

