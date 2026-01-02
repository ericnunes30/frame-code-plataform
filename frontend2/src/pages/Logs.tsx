import React, { useMemo, useState } from 'react';
import Sidebar from '../components/layout/Sidebar';
import { useLogs, useTasks, useWorkspaces } from '../hooks';

const Logs = () => {
  const { tasks, loading, error } = useTasks();
  const { workspaces } = useWorkspaces();
  const [query, setQuery] = useState('');
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const { logs, isStreaming, connected, containerRef } = useLogs(activeTaskId, 200);

  const workspaceNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const w of workspaces) map.set(w.id, w.name);
    return map;
  }, [workspaces]);

  const filteredTasks = useMemo(() => {
    const q = query.trim().toLowerCase();
    const sorted = [...tasks].sort((a, b) => b.lastActivityAt.localeCompare(a.lastActivityAt));
    if (!q) return sorted;
    return sorted.filter((t) => {
      const wsName = (workspaceNameById.get(t.workspaceId) || '').toLowerCase();
      return (
        t.title.toLowerCase().includes(q) ||
        t.taskId.toLowerCase().includes(q) ||
        wsName.includes(q) ||
        t.workspaceId.toLowerCase().includes(q)
      );
    });
  }, [query, tasks, workspaceNameById]);

  return (
    <div className="bg-background-dark text-white font-display antialiased h-screen flex">
      <Sidebar />
      <main className="flex-1 flex flex-col h-full overflow-hidden">
        <header className="h-16 border-b border-border-dark flex items-center justify-between px-6 shrink-0 bg-[#111418]">
          <h1 className="text-white font-bold tracking-tight">Logs</h1>
        </header>
        <div className="flex-1 overflow-hidden flex">
          <aside className="w-96 border-r border-border-dark bg-surface-dark flex flex-col shrink-0">
            <div className="p-4 border-b border-border-dark">
              <div className="text-xs text-slate-400 uppercase tracking-wider">Task Logs</div>
              <div className="mt-3">
                <input
                  className="w-full rounded-lg bg-surface-darker border border-border-dark px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-primary"
                  placeholder="Search by task/workspace..."
                  type="text"
                  id="logs-search"
                  name="logsSearch"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto">
              {error ? (
                <div className="p-4 text-sm text-red-200 bg-red-500/10">{String(error.message || error)}</div>
              ) : loading ? (
                <div className="p-4 text-sm text-slate-400">Loading…</div>
              ) : filteredTasks.length === 0 ? (
                <div className="p-4 text-sm text-slate-400">No tasks found.</div>
              ) : (
                filteredTasks.map((t) => {
                  const isActive = t.taskId === activeTaskId;
                  const wsName = workspaceNameById.get(t.workspaceId) || t.workspaceId;
                  return (
                    <button
                      key={t.taskId}
                      type="button"
                      onClick={() => setActiveTaskId(t.taskId)}
                      className={`w-full text-left px-4 py-3 border-b border-border-dark hover:bg-white/[0.03] ${
                        isActive ? 'bg-white/[0.04] border-l-2 border-l-primary' : 'border-l-2 border-l-transparent'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="text-sm font-semibold text-white truncate">{t.title}</div>
                        <span className="text-[10px] uppercase text-slate-400">{t.status}</span>
                      </div>
                      <div className="mt-1 text-xs text-slate-400 truncate">{wsName}</div>
                      <div className="mt-1 text-[11px] font-mono text-slate-500 truncate">{t.taskId}</div>
                    </button>
                  );
                })
              )}
            </div>
          </aside>

          <section className="flex-1 flex flex-col bg-surface-darker">
            <div className="h-12 border-b border-border-dark flex items-center justify-between px-5">
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <span className={`h-2 w-2 rounded-full ${connected ? 'bg-emerald-500' : 'bg-slate-500'}`}></span>
                <span>{connected ? 'Connected' : 'Disconnected'}</span>
                <span className="text-slate-600">•</span>
                <span>{isStreaming ? 'Live' : 'Idle'}</span>
              </div>
              <div className="text-xs font-mono text-slate-500 truncate max-w-[60%]">
                {activeTaskId ? `taskId=${activeTaskId}` : 'Select a task'}
              </div>
            </div>

            <div ref={containerRef} className="flex-1 overflow-y-auto p-5 font-mono text-xs leading-5 whitespace-pre-wrap break-words">
              {activeTaskId ? (logs || <span className="text-slate-500">Waiting for logs…</span>) : <span className="text-slate-500">Select a task to view logs.</span>}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
};

export default Logs;
