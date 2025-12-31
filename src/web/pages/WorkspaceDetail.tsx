import { useParams } from 'wouter';
import { useWorkspace, useChat, useLogs } from '../hooks';
import { api } from '../services';
import { WorkspaceStatusBadge, WorkspaceActions } from '../components/workspace';
import { ChatInterface } from '../components/chat';
import { LogViewer } from '../components/logs';

export function WorkspaceDetail() {
  const params = useParams<{ id: string }>();
  const workspaceId = params.id || '';

  const { workspace, loading, error, refetch } = useWorkspace(workspaceId);
  const { messages, isTyping, sendMessage } = useChat(workspaceId);
  const { logs, loading: logsLoading, error: logsError } = useLogs(workspaceId);

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

  const handleStart = async () => {
    await api.post(`/workspaces/${workspaceId}/start`, {});
    refetch();
  };

  const handleStop = async () => {
    await api.post(`/workspaces/${workspaceId}/stop`, {});
    refetch();
  };

  const handlePause = async () => {
    await api.post(`/workspaces/${workspaceId}/pause`, {});
    refetch();
  };

  const handleResume = async () => {
    await api.post(`/workspaces/${workspaceId}/resume`, {});
    refetch();
  };

  const handleDestroy = async () => {
    if (!confirm('Are you sure you want to destroy this workspace?')) return;
    await api.delete(`/workspaces/${workspaceId}`);
    window.location.href = '/workspaces';
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-white">{workspace.name}</h1>
            <p className="text-gray-400 font-mono text-sm">{workspace.id}</p>
          </div>
          <WorkspaceStatusBadge status={workspace.status} />
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6 text-sm">
            <div>
              <span className="text-gray-400">Task ID:</span>
              <span className="ml-2 text-white font-mono">{workspace.taskId}</span>
            </div>
            <div>
              <span className="text-gray-400">Container:</span>
              <span className="ml-2 text-white font-mono">{workspace.containerName || 'N/A'}</span>
            </div>
            {workspace.createdAt && (
              <div>
                <span className="text-gray-400">Created:</span>
                <span className="ml-2 text-white">
                  {new Date(workspace.createdAt).toLocaleString()}
                </span>
              </div>
            )}
          </div>

          <WorkspaceActions
            status={workspace.status}
            onStart={handleStart}
            onStop={handleStop}
            onPause={handlePause}
            onResume={handleResume}
            onDestroy={handleDestroy}
          />
        </div>
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chat */}
        <div className="h-[600px]">
          <ChatInterface
            workspaceId={workspaceId}
            messages={messages}
            isTyping={isTyping}
            onSend={sendMessage}
            disabled={workspace.status === 'stopped'}
          />
        </div>

        {/* Logs */}
        <div className="h-[600px]">
          <LogViewer
            workspaceId={workspaceId}
            logs={logs}
            loading={logsLoading}
            error={logsError}
          />
        </div>
      </div>
    </div>
  );
}
