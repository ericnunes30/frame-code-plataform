import { WorkspaceConfig } from '../../services/types';
import { WorkspaceCard } from './WorkspaceCard';

interface WorkspaceListProps {
  workspaces: WorkspaceConfig[];
  onStart: (id: string) => Promise<void>;
  onStop: (id: string) => Promise<void>;
  onPause: (id: string) => Promise<void>;
  onResume: (id: string) => Promise<void>;
  onDestroy: (id: string) => Promise<void>;
  actionDisabled?: boolean;
}

export function WorkspaceList({
  workspaces,
  onStart,
  onStop,
  onPause,
  onResume,
  onDestroy,
  actionDisabled = false,
}: WorkspaceListProps) {
  if (workspaces.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-400 text-lg mb-2">No workspaces found</div>
        <div className="text-gray-500 text-sm">
          Create a workspace to get started
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
      {workspaces.map((workspace) => (
        <WorkspaceCard
          key={workspace.id}
          workspace={workspace}
          onStart={() => onStart(workspace.id)}
          onStop={() => onStop(workspace.id)}
          onPause={() => onPause(workspace.id)}
          onResume={() => onResume(workspace.id)}
          onDestroy={() => onDestroy(workspace.id)}
          actionDisabled={actionDisabled}
        />
      ))}
    </div>
  );
}
