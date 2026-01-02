import { useCallback, useEffect, useState } from 'react';
import { api, Chat } from '../services';

export function useChats(workspaceId: string) {
  const [chats, setChats] = useState<Chat[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchChats = useCallback(async () => {
    if (!workspaceId) return;
    try {
      setLoading(true);
      setError(null);
      const data = await api.get<Chat[]>(`/chats/workspace/${workspaceId}`);
      setChats(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load chats');
    } finally {
      setLoading(false);
    }
  }, [workspaceId]);

  const createChat = useCallback(
    async (title?: string) => {
      try {
        const newChat = await api.post<Chat>(`/chats/workspace/${workspaceId}`, { title });
        setChats((prev) => [newChat, ...prev]);
        return newChat;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to create chat');
        throw err;
      }
    },
    [workspaceId]
  );

  const deleteChat = useCallback(async (chatId: string) => {
    try {
      await api.delete(`/chats/${chatId}`);
      setChats((prev) => prev.filter((c) => c.chatId !== chatId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete chat');
      throw err;
    }
  }, []);

  const updateChatTitle = useCallback(async (chatId: string, title: string) => {
    try {
      await api.put(`/chats/${chatId}/title`, { title });
      setChats((prev) =>
        prev.map((c) => (c.chatId === chatId ? { ...c, title, updatedAt: new Date().toISOString() } : c))
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update chat title');
      throw err;
    }
  }, []);

  const touchChat = useCallback((chatId: string, opts?: { deltaMessageCount?: number; at?: string }) => {
    const at = opts?.at || new Date().toISOString();
    const delta = opts?.deltaMessageCount ?? 0;
    setChats((prev) => {
      const next = prev.map((c) => {
        if (c.chatId !== chatId) return c;
        return {
          ...c,
          messageCount: Math.max(0, (c.messageCount || 0) + delta),
          lastActivityAt: at,
          updatedAt: at,
        };
      });
      next.sort((a, b) => b.lastActivityAt.localeCompare(a.lastActivityAt));
      return next;
    });
  }, []);

  useEffect(() => {
    fetchChats();
  }, [fetchChats]);

  return { chats, loading, error, refetch: fetchChats, createChat, deleteChat, updateChatTitle, touchChat };
}
