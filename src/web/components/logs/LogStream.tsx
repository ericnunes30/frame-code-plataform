import { useEffect, useRef } from 'react';

interface LogStreamProps {
  logs: string;
  className?: string;
  autoScroll?: boolean;
}

export function LogStream({ logs, className = '', autoScroll = true }: LogStreamProps) {
  const scrollRef = useRef<HTMLPreElement>(null);

  useEffect(() => {
    if (scrollRef.current && autoScroll) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs, autoScroll]);

  return (
    <pre
      ref={scrollRef}
      className={`bg-gray-950 text-gray-300 font-mono text-xs p-4 overflow-y-auto ${className}`}
    >
      {logs || 'Waiting for logs...'}
    </pre>
  );
}
