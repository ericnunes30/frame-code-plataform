import { useState, useEffect, useCallback } from 'react';
import { api, WorkspaceConfig } from '../services';

export function useWorkspace(workspaceId: string) {
  const [workspace, setWorkspace] = useState<WorkspaceConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.get<WorkspaceConfig>(`/workspaces/${workspaceId}`);
      setWorkspace(data);
    } catch (e) {
      setError(e as Error);
    } finally {
      setLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  // Auto-refresh a cada 5s
  useEffect(() => {
    const interval = setInterval(fetch, 5000);
    return () => clearInterval(interval);
  }, [fetch]);

  const start = useCallback(async () => {
    await api.post(`/workspaces/${workspaceId}/start`);
    await fetch();
  }, [workspaceId, fetch]);

  const stop = useCallback(async () => {
    await api.post(`/workspaces/${workspaceId}/stop`);
    await fetch();
  }, [workspaceId, fetch]);

  const pause = useCallback(async () => {
    await api.post(`/workspaces/${workspaceId}/pause`);
    await fetch();
  }, [workspaceId, fetch]);

  const resume = useCallback(async () => {
    await api.post(`/workspaces/${workspaceId}/resume`);
    await fetch();
  }, [workspaceId, fetch]);

  const destroy = useCallback(async () => {
    await api.delete(`/workspaces/${workspaceId}`);
  }, [workspaceId]);

  return { workspace, loading, error, refresh: fetch, start, stop, pause, resume, destroy };
}
