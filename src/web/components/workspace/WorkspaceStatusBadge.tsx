import { WorkspaceStatus } from '../../services/types';

interface StatusConfig {
  color: string;
  label: string;
  bgColor: string;
}

const STATUS_CONFIG: Record<WorkspaceStatus, StatusConfig> = {
  running: { color: 'text-green-400', label: 'Running', bgColor: 'bg-green-400/10' },
  stopped: { color: 'text-gray-400', label: 'Stopped', bgColor: 'bg-gray-400/10' },
  paused: { color: 'text-yellow-400', label: 'Paused', bgColor: 'bg-yellow-400/10' },
  starting: { color: 'text-blue-400', label: 'Starting', bgColor: 'bg-blue-400/10' },
  stopping: { color: 'text-orange-400', label: 'Stopping', bgColor: 'bg-orange-400/10' },
};

interface WorkspaceStatusBadgeProps {
  status: WorkspaceStatus;
  className?: string;
}

export function WorkspaceStatusBadge({ status, className = '' }: WorkspaceStatusBadgeProps) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.stopped;

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color} ${config.bgColor} ${className}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${config.color} mr-1.5`} />
      {config.label}
    </span>
  );
}
