import { useState, useEffect, useCallback, useRef } from 'react';
import { ws, SessionMessage } from '../services';

export function useChat(workspaceId: string) {
  const [messages, setMessages] = useState<SessionMessage[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [connected, setConnected] = useState(false);
  const reconnectTimeout = useRef<NodeJS.Timeout>();

  const connect = useCallback(() => {
    ws.connect();
    setConnected(ws.isConnected());

    // Subscribe to chat channel
    ws.emit('subscribe', { channel: 'chat', workspaceId });

    // Listen for messages
    const handleMessage = (data: any) => {
      if (data.type === 'chat.message' && data.workspaceId === workspaceId) {
        setMessages((prev) => [...prev, data.message]);
        setIsTyping(false);
      } else if (data.type === 'chat.typing' && data.workspaceId === workspaceId) {
        setIsTyping(data.isTyping);
      }
    };

    ws.on('chat.message', handleMessage);
    ws.on('chat.typing', handleMessage);

    return () => {
      ws.off('chat.message', handleMessage);
      ws.off('chat.typing', handleMessage);
      ws.emit('unsubscribe', { channel: 'chat', workspaceId });
    };
  }, [workspaceId]);

  useEffect(() => {
    // Load initial messages
    api.get(`/sessions/${workspaceId}`)
      .then((data) => setMessages(data))
      .catch(() => {});

    const cleanup = connect();

    // Handle connection
    const handleConnection = () => setConnected(true);
    const handleDisconnection = () => {
      setConnected(false);
      // Reconnect after 3s
      reconnectTimeout.current = setTimeout(() => {
        connect();
      }, 3000);
    };

    ws.on('connect', handleConnection);
    ws.on('disconnect', handleDisconnection);

    return () => {
      clearTimeout(reconnectTimeout.current);
      ws.off('connect', handleConnection);
      ws.off('disconnect', handleDisconnection);
      cleanup();
    };
  }, [workspaceId, connect]);

  const send = useCallback((content: string) => {
    ws.emit('chat.send', { workspaceId, content });
    setMessages((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        role: 'user',
        content,
        timestamp: new Date().toISOString(),
      },
    ]);
  }, [workspaceId]);

  return { messages, isTyping, connected, send };
}

// Import api for initial load
import { api } from '../services';
