import { Link } from 'wouter';
import { WorkspaceConfig } from '../../services/types';
import { WorkspaceStatusBadge } from './WorkspaceStatusBadge';
import { WorkspaceActions } from './WorkspaceActions';

interface WorkspaceCardProps {
  workspace: WorkspaceConfig;
  onStart: () => void;
  onStop: () => void;
  onPause: () => void;
  onResume: () => void;
  onDestroy: () => void;
  actionDisabled?: boolean;
}

export function WorkspaceCard({
  workspace,
  onStart,
  onStop,
  onPause,
  onResume,
  onDestroy,
  actionDisabled = false,
}: WorkspaceCardProps) {
  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg p-6 hover:border-gray-600 transition-colors">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h3 className="text-lg font-semibold text-white">{workspace.name}</h3>
            <WorkspaceStatusBadge status={workspace.status} />
          </div>
          <p className="text-sm text-gray-400 font-mono">{workspace.id}</p>
        </div>
      </div>

      <div className="space-y-2 mb-4">
        <div className="flex justify-between text-sm">
          <span className="text-gray-400">Task ID:</span>
          <span className="text-gray-200 font-mono">{workspace.taskId}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-400">Container:</span>
          <span className="text-gray-200 font-mono">{workspace.containerName || 'N/A'}</span>
        </div>
        {workspace.createdAt && (
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Created:</span>
            <span className="text-gray-200">
              {new Date(workspace.createdAt).toLocaleString()}
            </span>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between">
        <Link
          href={`/workspaces/${workspace.id}`}
          className="text-sm text-blue-400 hover:text-blue-300 transition-colors"
        >
          View Details →
        </Link>
        <WorkspaceActions
          status={workspace.status}
          onStart={onStart}
          onStop={onStop}
          onPause={onPause}
          onResume={onResume}
          onDestroy={onDestroy}
          disabled={actionDisabled}
        />
      </div>
    </div>
  );
}
