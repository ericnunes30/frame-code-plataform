import React from 'react';
import { Link, useLocation } from 'react-router-dom';

type Props = {
  status: 'running' | 'stopped';
  name: string;
  repo: string | null;
  created: string;
  id: string;
  disabled?: boolean;
  onOpen: () => void;
};

const WorkspaceCard = ({ status, name, repo, created, id, disabled, onOpen }: Props) => {
  const isRunning = status === 'running';
  const location = useLocation();

  return (
    <div
      className={`bg-card-dark border border-border-dark rounded-lg overflow-hidden group hover:border-primary/40 transition-all ${
        !isRunning && 'opacity-80 hover:opacity-100'
      }`}
    >
      <div className="p-4 flex flex-col gap-3">
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-2">
            <div
              className={`h-2.5 w-2.5 rounded-full ${
                isRunning ? 'bg-emerald-500 animate-pulse' : 'bg-slate-600 border border-slate-500'
              }`}
            ></div>
            <h4 className="text-white font-bold text-base truncate">{name}</h4>
          </div>
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Link
              className="p-1 hover:bg-[#2a3642] rounded text-text-muted hover:text-white"
              title="View Details"
              to={`/workspaces/${encodeURIComponent(id)}`}
            >
              <span className="material-symbols-outlined text-[18px]">visibility</span>
            </Link>
            <Link
              className="p-1 hover:bg-[#2a3642] rounded text-text-muted hover:text-red-400"
              title="Delete"
              to={`/delete-workspace?workspaceId=${encodeURIComponent(id)}`}
              state={{ backgroundLocation: location }}
            >
              <span className="material-symbols-outlined text-[18px]">delete</span>
            </Link>
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2 text-sm text-text-muted font-mono bg-[#111418] p-1.5 rounded border border-[#2a3642]">
            <span className="material-symbols-outlined text-[16px]">code</span>
            <span className="truncate">{repo || '—'}</span>
          </div>
          <div className="flex items-center justify-between text-xs text-text-muted">
            <span>Created {created}</span>
            <span className="font-mono text-[#2b8cee]">ID: {id}</span>
          </div>
        </div>
      </div>
      <div className="bg-[#1c2630] p-3 flex gap-2 border-t border-border-dark">
        <button
          className={`flex-1 bg-primary hover:bg-blue-600 text-white py-1.5 px-3 rounded text-xs font-bold transition-colors flex items-center justify-center gap-2 disabled:opacity-50 ${
            !isRunning ? 'opacity-90' : ''
          }`}
          type="button"
          onClick={onOpen}
          disabled={disabled}
          title={isRunning ? 'Open an existing task' : 'Open a task (or create one if none exist)'}
        >
          <span className="material-symbols-outlined text-[16px]">terminal</span>
          Open IDE
        </button>
        <Link
          className="bg-[#2a3642] hover:bg-[#344250] text-white py-1.5 px-3 rounded text-xs font-bold transition-colors border border-border-dark flex items-center"
          to={`/workspaces/${encodeURIComponent(id)}?tab=tasks`}
          aria-disabled={disabled ? 'true' : undefined}
          onClick={(e) => {
            if (disabled) e.preventDefault();
          }}
        >
          Tasks
        </Link>
      </div>
    </div>
  );
};

export default WorkspaceCard;
