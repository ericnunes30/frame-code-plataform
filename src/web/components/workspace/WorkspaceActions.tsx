import { WorkspaceStatus } from '../../services/types';

interface WorkspaceActionsProps {
  status: WorkspaceStatus;
  onStart: () => void;
  onStop: () => void;
  onPause: () => void;
  onResume: () => void;
  onDestroy: () => void;
  disabled?: boolean;
}

const ACTION_BUTTONS = {
  base: 'px-3 py-1.5 rounded-md text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed',
  primary: 'bg-blue-600 text-white hover:bg-blue-700',
  danger: 'bg-red-600 text-white hover:bg-red-700',
  warning: 'bg-yellow-600 text-white hover:bg-yellow-700',
  success: 'bg-green-600 text-white hover:bg-green-700',
  secondary: 'bg-gray-600 text-white hover:bg-gray-700',
};

export function WorkspaceActions({
  status,
  onStart,
  onStop,
  onPause,
  onResume,
  onDestroy,
  disabled = false,
}: WorkspaceActionsProps) {
  return (
    <div className="flex items-center gap-2">
      {status === 'stopped' && (
        <button
          onClick={onStart}
          disabled={disabled}
          className={`${ACTION_BUTTONS.base} ${ACTION_BUTTONS.success}`}
        >
          Start
        </button>
      )}

      {(status === 'running' || status === 'starting') && (
        <>
          <button
            onClick={onPause}
            disabled={disabled || status === 'starting'}
            className={`${ACTION_BUTTONS.base} ${ACTION_BUTTONS.warning}`}
          >
            Pause
          </button>
          <button
            onClick={onStop}
            disabled={disabled || status === 'starting'}
            className={`${ACTION_BUTTONS.base} ${ACTION_BUTTONS.danger}`}
          >
            Stop
          </button>
        </>
      )}

      {status === 'paused' && (
        <>
          <button
            onClick={onResume}
            disabled={disabled}
            className={`${ACTION_BUTTONS.base} ${ACTION_BUTTONS.success}`}
          >
            Resume
          </button>
          <button
            onClick={onStop}
            disabled={disabled}
            className={`${ACTION_BUTTONS.base} ${ACTION_BUTTONS.danger}`}
          >
            Stop
          </button>
        </>
      )}

      {status === 'stopping' && (
        <span className="text-sm text-gray-400">Stopping...</span>
      )}

      <button
        onClick={onDestroy}
        disabled={disabled || status === 'starting' || status === 'stopping'}
        className={`${ACTION_BUTTONS.base} ${ACTION_BUTTONS.secondary}`}
      >
        Destroy
      </button>
    </div>
  );
}
