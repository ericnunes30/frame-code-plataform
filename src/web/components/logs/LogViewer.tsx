import { LogStream } from './LogStream';

interface LogViewerProps {
  workspaceId: string;
  logs: string;
  loading?: boolean;
  error?: string | null;
  className?: string;
}

export function LogViewer({
  workspaceId,
  logs,
  loading = false,
  error = null,
  className = '',
}: LogViewerProps) {
  return (
    <div className={`flex flex-col h-full bg-gray-900 rounded-lg border border-gray-800 ${className}`}>
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-800 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-white">Logs</h3>
          <p className="text-sm text-gray-400">Workspace: {workspaceId}</p>
        </div>
        {loading && (
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
            <span className="text-sm text-blue-400">Streaming</span>
          </div>
        )}
      </div>

      {/* Error State */}
      {error && (
        <div className="mx-6 mt-4 p-4 bg-red-900/20 border border-red-800 rounded-lg">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      {/* Logs */}
      <div className="flex-1 overflow-hidden">
        <LogStream logs={logs} className="h-full" />
      </div>
    </div>
  );
}
