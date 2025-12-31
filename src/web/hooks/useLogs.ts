import { useState, useEffect, useCallback, useRef } from 'react';
import { ws } from '../services';

export function useLogs(workspaceId: string, tail: number = 100) {
  const [logs, setLogs] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [connected, setConnected] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const connect = useCallback(() => {
    ws.connect();
    setConnected(ws.isConnected());

    // Subscribe to logs channel
    ws.emit('logs.follow', { workspaceId, tail });

    // Listen for log data
    const handleLogs = (data: any) => {
      if (data.type === 'logs.data' && data.workspaceId === workspaceId) {
        setLogs((prev) => prev + data.logs);
        setIsStreaming(true);
        // Auto-scroll to bottom
        if (containerRef.current) {
          containerRef.current.scrollTop = containerRef.current.scrollHeight;
        }
      }
    };

    ws.on('logs.data', handleLogs);

    return () => {
      ws.off('logs.data', handleLogs);
      ws.emit('logs.unfollow', { workspaceId });
    };
  }, [workspaceId, tail]);

  useEffect(() => {
    const cleanup = connect();

    const handleConnection = () => setConnected(true);
    const handleDisconnection = () => setConnected(false);

    ws.on('connect', handleConnection);
    ws.on('disconnect', handleDisconnection);

    return () => {
      cleanup();
      ws.off('connect', handleConnection);
      ws.off('disconnect', handleDisconnection);
    };
  }, [connect]);

  const clear = useCallback(() => {
    setLogs('');
  }, []);

  return { logs, isStreaming, connected, clear, containerRef };
}
