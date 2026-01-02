import React, { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Sidebar from '../components/layout/Sidebar';
import { useTasks, useWorkspaces } from '../hooks';

type WorkspaceRow = {
  status: string;
  name: string;
  updated: string | null;
  id: string;
  repo: string;
  cpu: string | null;
  statusColor: 'emerald' | 'amber' | 'slate' | 'red';
  pulse?: boolean;
  icon?: string;
  spin?: boolean;
};

const WorkspacesList = () => {
  const navigate = useNavigate();
  const { workspaces, loading, error } = useWorkspaces();
  const { tasks } = useTasks();
  const [query, setQuery] = useState('');

  const byWorkspace = useMemo(() => {
    const map = new Map<string, typeof tasks>();
    for (const t of tasks) {
      const arr = map.get(t.workspaceId) || [];
      arr.push(t);
      map.set(t.workspaceId, arr);
    }
    for (const [id, arr] of map.entries()) {
      arr.sort((a, b) => b.lastActivityAt.localeCompare(a.lastActivityAt));
      map.set(id, arr);
    }
    return map;
  }, [tasks]);

  const rows: WorkspaceRow[] = useMemo(() => {
    return workspaces.map((w) => {
      const wsTasks = byWorkspace.get(w.id) || [];
      const anyRunning = wsTasks.some((t) => t.status === 'running');
      const anyCreating = wsTasks.some((t) => t.status === 'creating');
      const anyError = wsTasks.some((t) => t.status === 'error');

      let status: WorkspaceRow['status'] = 'Stopped';
      let statusColor: WorkspaceRow['statusColor'] = 'slate';
      let icon: string | undefined;
      let spin = false;
      let pulse = false;

      if (anyCreating) {
        status = 'Building';
        statusColor = 'amber';
        icon = 'sync';
        spin = true;
      } else if (anyRunning) {
        status = 'Running';
        statusColor = 'emerald';
        pulse = true;
      } else if (anyError) {
        status = 'Failed';
        statusColor = 'red';
        icon = 'error';
      }

      return {
        status,
        name: w.name,
        updated: null,
        id: w.id,
        repo: w.repoUrl || '—',
        cpu: '-',
        statusColor,
        pulse,
        icon,
        spin,
      };
    });
  }, [byWorkspace, workspaces]);

  const filteredRows = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => {
      return (
        r.name.toLowerCase().includes(q) ||
        r.id.toLowerCase().includes(q) ||
        (r.repo || '').toLowerCase().includes(q)
      );
    });
  }, [query, rows]);

  const StatusPill = ({
    color,
    text,
    pulse,
    icon,
    spin,
  }: {
    color: WorkspaceRow['statusColor'];
    text: string;
    pulse?: boolean;
    icon?: string;
    spin?: boolean;
  }) => {
    const colorMap: Record<WorkspaceRow['statusColor'], string> = {
      emerald: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400',
      amber: 'bg-amber-500/10 border-amber-500/20 text-amber-400',
      slate: 'bg-slate-700/30 border-slate-600/30 text-slate-400',
      red: 'bg-red-500/10 border-red-500/20 text-red-400',
    };
    const dotMap: Record<WorkspaceRow['statusColor'], string> = {
      emerald: 'bg-emerald-500',
      amber: 'bg-amber-500',
      slate: 'bg-slate-500',
      red: 'bg-red-500',
    };
    return (
      <div className={`inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-xs font-medium ${colorMap[color]}`}>
        {pulse && (
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
        )}
        {icon && <span className={`material-symbols-outlined text-[14px] ${spin ? 'animate-spin' : ''}`}>{icon}</span>}
        {!pulse && !icon && <span className={`h-2 w-2 rounded-full ${dotMap[color]}`}></span>}
        {text}
      </div>
    );
  };

  return (
    <div className="dark bg-background-dark text-slate-200 font-display h-screen flex overflow-hidden">
      <Sidebar />

      <main className="flex-1 flex flex-col h-full overflow-hidden">
        <header className="px-6 py-5 flex items-end justify-between border-b border-border-dark bg-[#101922]/95 backdrop-blur z-10">
          <div className="flex flex-col gap-1">
            <h1 className="text-2xl font-bold text-white tracking-tight">Workspaces</h1>
          </div>
          <Link className="flex items-center gap-2 bg-primary hover:bg-primary-hover text-white px-4 py-2 rounded-lg text-sm font-medium" to="/create-workspace">
            <span className="material-symbols-outlined text-[20px]">add</span>
            New Workspace
          </Link>
        </header>

        <div className="px-6 py-4 flex items-center justify-between bg-[#101922]">
          <input
            className="block w-96 pl-10 pr-3 py-2.5 border border-border-dark rounded-lg bg-surface-dark placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-primary sm:text-sm"
            placeholder="Search..."
            type="text"
            id="workspaces-search"
            name="workspacesSearch"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>

        <div className="flex-1 overflow-auto px-6 pb-6">
          <div className="bg-surface-dark border border-border-dark rounded-lg overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#1c2127] border-b border-border-dark text-slate-400 text-xs uppercase">
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">ID</th>
                  <th className="px-4 py-3">Repository</th>
                  <th className="px-4 py-3">CPU</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-dark text-sm">
                {error ? (
                  <tr>
                    <td className="px-4 py-6 text-red-200 bg-red-500/10" colSpan={6}>
                      {String(error.message || error)}
                    </td>
                  </tr>
                ) : loading ? (
                  <tr>
                    <td className="px-4 py-6 text-slate-400" colSpan={6}>
                      Loading…
                    </td>
                  </tr>
                ) : filteredRows.length === 0 ? (
                  <tr>
                    <td className="px-4 py-10 text-slate-400" colSpan={6}>
                      No workspaces yet.
                    </td>
                  </tr>
                ) : (
                  filteredRows.map((ws) => (
                    <tr key={ws.id} className="group hover:bg-white/[0.02]">
                      <td className="px-4 py-3.5">
                        <StatusPill color={ws.statusColor} text={ws.status} pulse={ws.pulse} icon={ws.icon} spin={ws.spin} />
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="font-medium text-white group-hover:text-primary">{ws.name}</div>
                        {ws.updated && <div className="text-xs text-slate-500 mt-0.5">{ws.updated}</div>}
                      </td>
                      <td className="px-4 py-3.5">
                        <code className="font-mono text-xs text-slate-400">{ws.id}</code>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="font-mono text-xs">{ws.repo}</span>
                      </td>
                      <td className="px-4 py-3.5">{ws.cpu}</td>
                      <td className="px-4 py-3.5 text-right">
                        <div className="opacity-0 group-hover:opacity-100">
                          <button
                            className="text-xs bg-primary/10 text-primary hover:bg-primary/20 px-3 py-1.5 rounded inline-flex"
                            type="button"
                            onClick={() => navigate(`/workspaces/${encodeURIComponent(ws.id)}`)}
                          >
                            Open
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
};

export default WorkspacesList;
