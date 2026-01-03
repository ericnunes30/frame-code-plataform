import { useCallback, useEffect, useRef, useState } from 'react';
import { ws } from '../services';

export function useLogs(taskId: string | null, tail = 100) {
  const [logs, setLogs] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [connected, setConnected] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setLogs('');
    setIsStreaming(false);
  }, [taskId]);

  const connect = useCallback(() => {
    ws.connect();
    setConnected(ws.isConnected());

    if (!taskId) {
      setLogs('');
      setIsStreaming(false);
      return () => {};
    }

    ws.emit('logs.follow', { taskId, tail });

    const handleLogs = (data: any) => {
      if (data?.taskId !== taskId) return;

      if (typeof data.logs === 'string') {
        setLogs((prev) => prev + data.logs);
        setIsStreaming(true);
      }

      if (typeof data.log === 'string') {
        setLogs((prev) => prev + data.log + '\n');
        setIsStreaming(true);
      }
    };

    const handleError = (data: any) => {
      if (data?.taskId !== taskId) return;
      const message = typeof data?.error === 'string' ? data.error : JSON.stringify(data?.error ?? data);
      setLogs((prev) => prev + `\n[logs.error] ${message}\n`);
      setIsStreaming(false);
    };

    ws.on('logs.data', handleLogs);
    ws.on('logs.error', handleError);

    return () => {
      ws.off('logs.data', handleLogs);
      ws.off('logs.error', handleError);
      ws.emit('logs.unfollow', { taskId });
    };
  }, [taskId, tail]);

  useEffect(() => {
    const cleanup = connect();

    const handleConnection = () => setConnected(true);
    const handleDisconnection = () => setConnected(false);

    ws.on('connect', handleConnection);
    ws.on('disconnect', handleDisconnection);

    return () => {
      ws.off('connect', handleConnection);
      ws.off('disconnect', handleDisconnection);
      cleanup();
    };
  }, [connect]);

  useEffect(() => {
    if (!containerRef.current) return;
    containerRef.current.scrollTop = containerRef.current.scrollHeight;
  }, [logs]);

  return { logs, isStreaming, connected, containerRef };
}
