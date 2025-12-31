import { SessionMessage } from '../../services/types';
import { MessageList } from './MessageList';
import { MessageInput } from './MessageInput';
import { TypingIndicator } from './TypingIndicator';

interface ChatInterfaceProps {
  workspaceId: string;
  messages: SessionMessage[];
  isTyping: boolean;
  onSend: (content: string) => Promise<void>;
  disabled?: boolean;
}

export function ChatInterface({
  workspaceId,
  messages,
  isTyping,
  onSend,
  disabled = false,
}: ChatInterfaceProps) {
  return (
    <div className="flex flex-col h-full bg-gray-900 rounded-lg border border-gray-800">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-800">
        <h3 className="text-lg font-semibold text-white">Chat</h3>
        <p className="text-sm text-gray-400">Workspace: {workspaceId}</p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-hidden">
        <MessageList messages={messages} className="h-full px-6 py-4" />
      </div>

      {/* Typing Indicator */}
      {isTyping && (
        <div className="px-6 py-2">
          <TypingIndicator />
        </div>
      )}

      {/* Input */}
      <div className="px-6 py-4 border-t border-gray-800">
        <MessageInput onSend={onSend} disabled={disabled} />
      </div>
    </div>
  );
}
