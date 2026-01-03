import { useCallback, useEffect, useRef, useState } from 'react';
import { api, SessionMessage, ws } from '../services';

type UseChatOptions = {
  onOutboundMessage?: (message: SessionMessage) => void;
  onInboundMessage?: (message: SessionMessage) => void;
};

function createMessageId(): string {
  const cryptoAny = globalThis.crypto as unknown as { randomUUID?: () => string } | undefined;
  if (cryptoAny && typeof cryptoAny.randomUUID === 'function') return cryptoAny.randomUUID();
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function useChat(workspaceId: string, chatId?: string, options?: UseChatOptions) {
  const [messages, setMessages] = useState<SessionMessage[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [connected, setConnected] = useState(false);
  const reconnectTimeout = useRef<number | undefined>();
  const pendingOutbound = useRef<Array<{ content: string; sentAt: number; id: string }>>([]);
  const pendingCount = useRef(0);

  const connect = useCallback(() => {
    ws.connect();
    setConnected(ws.isConnected());

    ws.emit('subscribe', { channel: 'chat', workspaceId, chatId: chatId || 'default' });

    const handleMessage = (data: any) => {
      if (
        data?.type === 'chat.message' &&
        data.workspaceId === workspaceId &&
        (!chatId || data.chatId === chatId)
      ) {
        const message = data.message as SessionMessage;
        const now = Date.now();

        if (message.role === 'user' && typeof message.content === 'string') {
          const idx = pendingOutbound.current.findIndex(
            (p) => p.content === message.content && now - p.sentAt < 8000
          );
          if (idx >= 0) {
            pendingOutbound.current.splice(idx, 1);
            return;
          }
        }

        setMessages((prev) => {
          if (prev.some((m) => m.id === message.id)) return prev;
          return [...prev, message];
        });
        options?.onInboundMessage?.(message);
        if (message.role !== 'user') setIsTyping(false);
      }
    };

    const handleError = (data: any) => {
      if (data?.chatId && chatId && data.chatId !== chatId) return;
      if (data?.workspaceId && data.workspaceId !== workspaceId) return;

      setIsTyping(false);
      setMessages((prev) => [
        ...prev,
        {
          id: createMessageId(),
          role: 'system',
          content: data?.message ? `Error: ${String(data.message)}` : 'Error sending message',
          timestamp: new Date().toISOString(),
        },
      ]);
    };

    ws.on('chat.message', handleMessage);
    ws.on('chat.error', handleError);

    return () => {
      ws.off('chat.message', handleMessage);
      ws.off('chat.error', handleError);
      ws.emit('unsubscribe', { channel: 'chat', workspaceId, chatId: chatId || 'default' });
    };
  }, [workspaceId, chatId, options]);

  useEffect(() => {
    if (!workspaceId || !chatId) {
      setMessages([]);
      pendingOutbound.current = [];
      return;
    }

    api
      .get<SessionMessage[]>(`/chats/${chatId}/messages`)
      .then((data) => setMessages(data))
      .catch(() => {});

    const cleanup = connect();

    const handleConnection = () => setConnected(true);
    const handleDisconnection = () => {
      setConnected(false);
      setIsTyping(false);
      window.clearTimeout(reconnectTimeout.current);
      reconnectTimeout.current = window.setTimeout(() => connect(), 3000);
    };

    ws.on('connect', handleConnection);
    ws.on('disconnect', handleDisconnection);

    return () => {
      window.clearTimeout(reconnectTimeout.current);
      ws.off('connect', handleConnection);
      ws.off('disconnect', handleDisconnection);
      cleanup();
    };
  }, [workspaceId, chatId, connect]);

  const sendMessage = useCallback(
    (content: string) => {
      if (!chatId) return;
      const id = createMessageId();
      const sentAt = Date.now();
      pendingOutbound.current.push({ content, sentAt, id });
      pendingCount.current += 1;
      setIsTyping(true);

      ws.emit('chat.send', { workspaceId, chatId, content });
      const outgoing: SessionMessage = { id, role: 'user', content, timestamp: new Date(sentAt).toISOString() };
      setMessages((prev) => [
        ...prev,
        outgoing,
      ]);
      options?.onOutboundMessage?.(outgoing);
    },
    [workspaceId, chatId, options]
  );

  return { messages, isTyping, connected, sendMessage, send: sendMessage };
}
