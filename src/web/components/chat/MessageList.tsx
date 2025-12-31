import { useEffect, useRef } from 'react';
import { SessionMessage } from '../../services/types';

interface MessageItemProps {
  message: SessionMessage;
}

function MessageItem({ message }: MessageItemProps) {
  const isUser = message.role === 'user';
  const isTool = message.role === 'tool';

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
      <div className={`max-w-[80%] ${isUser ? 'order-2' : 'order-1'}`}>
        <div
          className={`rounded-lg px-4 py-3 ${
            isUser
              ? 'bg-blue-600 text-white'
              : isTool
              ? 'bg-purple-900/50 text-purple-200 border border-purple-700'
              : 'bg-gray-800 text-gray-100 border border-gray-700'
          }`}
        >
          {!isUser && (
            <div className="text-xs font-semibold mb-1 opacity-70">
              {isTool ? `Tool: ${message.toolName || 'unknown'}` : 'Agent'}
            </div>
          )}
          <div className="text-sm whitespace-pre-wrap break-words">
            {message.content}
          </div>
          {message.toolCalls && message.toolCalls.length > 0 && (
            <div className="mt-2 space-y-1">
              {message.toolCalls.map((call, idx) => (
                <div
                  key={idx}
                  className="text-xs bg-gray-900/50 rounded px-2 py-1 font-mono"
                >
                  <span className="text-blue-400">{call.tool}</span>
                  <span className="text-gray-500"> → </span>
                  <span className="text-gray-300">
                    {JSON.stringify(call.arguments).substring(0, 50)}
                    ...
                  </span>
                </div>
              ))}
            </div>
          )}
          {message.timestamp && (
            <div className="text-xs opacity-50 mt-1">
              {new Date(message.timestamp).toLocaleTimeString()}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

interface MessageListProps {
  messages: SessionMessage[];
  className?: string;
}

export function MessageList({ messages, className = '' }: MessageListProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  if (messages.length === 0) {
    return (
      <div className={`flex items-center justify-center h-full ${className}`}>
        <div className="text-center text-gray-500">
          <p className="text-lg mb-2">No messages yet</p>
          <p className="text-sm">Start a conversation with the agent</p>
        </div>
      </div>
    );
  }

  return (
    <div ref={scrollRef} className={`overflow-y-auto ${className}`}>
      {messages.map((message, idx) => (
        <MessageItem key={idx} message={message} />
      ))}
    </div>
  );
}
