import { useParams } from 'wouter';
import { useWorkspace, useChat } from '../hooks';
import { ChatInterface } from '../components/chat';

export function Chat() {
  const params = useParams<{ id: string }>();
  const workspaceId = params.id || '';

  const { workspace, loading, error } = useWorkspace(workspaceId);
  const { messages, isTyping, sendMessage } = useChat(workspaceId);

  if (!workspaceId) {
    return (
      <div className="p-6">
        <p className="text-gray-400">Invalid workspace ID</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="inline-block w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-gray-400">Loading workspace...</p>
        </div>
      </div>
    );
  }

  if (error || !workspace) {
    return (
      <div className="p-6">
        <div className="bg-red-900/20 border border-red-800 rounded-lg p-6">
          <p className="text-red-400">{error || 'Workspace not found'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 h-[calc(100vh-80px)]">
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-white">Chat: {workspace.name}</h1>
        <p className="text-gray-400">{workspace.taskId}</p>
      </div>

      <ChatInterface
        workspaceId={workspaceId}
        messages={messages}
        isTyping={isTyping}
        onSend={sendMessage}
        disabled={workspace.status === 'stopped'}
      />
    </div>
  );
}
