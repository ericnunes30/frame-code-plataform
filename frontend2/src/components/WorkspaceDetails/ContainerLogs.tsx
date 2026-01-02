import React from 'react';
import type { TaskStatus } from '../../services';

type Props = {
  logs: string;
  isStreaming?: boolean;
  connected?: boolean;
  containerRef?: React.RefObject<HTMLDivElement>;
  taskId?: string | null;
  status?: TaskStatus;
};

const ContainerLogs = ({ logs, isStreaming, connected, containerRef, taskId, status }: Props) => {
  const hasTask = Boolean(taskId);
  const emptyLabel = !hasTask
    ? 'Select a task to view logs.'
    : status === 'stopped' || status === 'paused'
      ? `Task is ${status}. Start it to view live logs.`
      : connected
        ? 'Waiting for logs…'
        : 'Connecting…';

  return (
    <aside className="w-96 border-l border-border-dark flex flex-col bg-surface-darker shrink-0">
      <div className="h-10 border-b border-border-dark flex items-center justify-between px-4 shrink-0 bg-[#11161d]">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-[#9dabb9] text-sm">terminal</span>
          <span className="text-xs font-bold text-[#d1d5db] uppercase tracking-wider">Container Logs</span>
        </div>
        <div className="flex items-center gap-2 text-[10px] text-[#9dabb9]">
          <span className={`h-2 w-2 rounded-full ${connected ? 'bg-emerald-500' : 'bg-slate-500'}`}></span>
          <span>{isStreaming ? 'Live' : 'Idle'}</span>
        </div>
      </div>
      {taskId ? (
        <div className="px-4 py-2 border-b border-border-dark text-[11px] font-mono text-slate-500 truncate">
          taskId={taskId} {status ? `• ${status}` : ''}
        </div>
      ) : null}
      <div
        ref={containerRef}
        className="flex-1 overflow-y-auto p-4 font-mono text-xs leading-5 scroll-smooth whitespace-pre-wrap break-words"
      >
        {logs ? logs : <span className="text-[#5a6b7c]">{emptyLabel}</span>}
      </div>
    </aside>
  );
};

export default ContainerLogs;

