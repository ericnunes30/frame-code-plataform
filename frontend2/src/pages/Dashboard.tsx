import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/layout/Sidebar';
import Header from '../components/Dashboard/Header';
import StatCard from '../components/Dashboard/StatCard';
import WorkspaceCard from '../components/Dashboard/WorkspaceCard';
import { api } from '../services';
import { useSystemStats, useTasks, useWorkspaces } from '../hooks';

function relativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  if (!Number.isFinite(diffMs)) return '';
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `${diffH}h ago`;
  const diffD = Math.floor(diffH / 24);
  return `${diffD}d ago`;
}

const Dashboard = () => {
  const navigate = useNavigate();
  const { stats } = useSystemStats();
  const { workspaces, loading: wsLoading, error: wsError } = useWorkspaces();
  const { tasks, loading: tasksLoading, error: tasksError, refetch: refetchTasks } = useTasks();
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'running' | 'stopped'>('all');
  const [query, setQuery] = useState('');
  const [visibleCount, setVisibleCount] = useState(6);

  const byWorkspace = useMemo(() => {
    const map = new Map<string, typeof tasks>();
    for (const task of tasks) {
      const arr = map.get(task.workspaceId) || [];
      arr.push(task);
      map.set(task.workspaceId, arr);
    }
    for (const [wsId, arr] of map.entries()) {
      arr.sort((a, b) => b.lastActivityAt.localeCompare(a.lastActivityAt));
      map.set(wsId, arr);
    }
    return map;
  }, [tasks]);

  const workspaceStatus = useMemo(() => {
    const running = new Set<string>();
    for (const task of tasks) if (task.status === 'running') running.add(task.workspaceId);
    return {
      runningCount: running.size,
      stoppedCount: Math.max(0, workspaces.length - running.size),
      isRunning: (workspaceId: string) => running.has(workspaceId),
    };
  }, [tasks, workspaces.length]);

  const filteredWorkspaces = useMemo(() => {
    const q = query.trim().toLowerCase();
    return workspaces.filter((w) => {
      const isRunning = workspaceStatus.isRunning(w.id);
      if (activeTab === 'running' && !isRunning) return false;
      if (activeTab === 'stopped' && isRunning) return false;
      if (!q) return true;
      return w.name.toLowerCase().includes(q) || (w.repoUrl || '').toLowerCase().includes(q);
    });
  }, [activeTab, query, workspaces, workspaceStatus]);

  const visibleWorkspaces = useMemo(() => filteredWorkspaces.slice(0, visibleCount), [filteredWorkspaces, visibleCount]);

  const openWorkspaceDetails = (workspaceId: string, chatId?: string) => {
    const query = chatId ? `?chat=${encodeURIComponent(chatId)}` : '';
    navigate(`/workspaces/${encodeURIComponent(workspaceId)}${query}`);
  };

  const ensureChatThenOpen = async (workspaceId: string) => {
    const workspaceTasks = byWorkspace.get(workspaceId) || [];
    if (workspaceTasks.length > 0) {
      openWorkspaceDetails(workspaceId, workspaceTasks[0].taskId);
      return;
    }

    setActionLoadingId(workspaceId);
    try {
      const created = await api.post<{ chatId: string }>(`/chats/workspace/${workspaceId}`, { title: 'New Task' });
      await refetchTasks();
      openWorkspaceDetails(workspaceId, created.chatId);
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <div className="bg-background-dark text-white font-display antialiased h-screen flex">
      <Sidebar />
      <main className="flex-1 flex flex-col h-full overflow-hidden">
        <Header />
        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-[1600px] mx-auto flex flex-col gap-6">
            <div className="flex flex-col gap-1">
              <h2 className="text-3xl font-bold text-white tracking-tight">System Status</h2>
              <p className="text-text-muted">Overview of your development environment resources.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard
                title="Docker Daemon"
                status={stats?.docker.available ? 'online' : 'offline'}
                value={stats?.docker.available ? 'Available' : 'Unavailable'}
                details={stats?.docker.version ? `${stats.docker.version} running` : '—'}
              />
              <StatCard
                title="Total Workspaces"
                icon="layers"
                value={String(workspaces.length)}
                details={`${workspaceStatus.runningCount} running, ${workspaceStatus.stoppedCount} stopped`}
              />
              <StatCard
                title="CPU Usage"
                icon="memory"
                progress={{
                  value: `${stats?.cpu.usage ?? 0}%`,
                  details: `${((stats?.cpu.usage ?? 0) / 100) * (stats?.cpu.cores ?? 0)} / ${stats?.cpu.cores ?? 0} Cores`,
                  width: `${stats?.cpu.usage ?? 0}%`,
                  color: 'bg-primary',
                }}
              />
              <StatCard
                title="Memory Usage"
                icon="hard_drive"
                progress={{
                  value: `${stats?.memory.usage ?? 0} GB`,
                  details: `of ${stats?.memory.total ?? 0} GB`,
                  width: `${Math.min(100, Math.round(((stats?.memory.usage ?? 0) / Math.max(1, stats?.memory.total ?? 1)) * 100))}%`,
                  color: 'bg-purple-500',
                }}
              />
            </div>
            <div className="flex flex-col gap-4 mt-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <h3 className="text-xl font-bold text-white">Active Workspaces</h3>
                <div className="relative w-full sm:w-96">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="material-symbols-outlined text-text-muted text-[20px]">search</span>
                  </div>
                  <input
                    className="block w-full pl-10 pr-3 py-2 border border-border-dark rounded-lg leading-5 bg-[#16202a] text-white placeholder-text-muted focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary sm:text-sm transition duration-150 ease-in-out font-mono"
                    placeholder="Search by name or repo..."
                    type="text"
                    id="dashboard-search"
                    name="dashboardSearch"
                    value={query}
                    onChange={(e) => {
                      setQuery(e.target.value);
                      setVisibleCount(6);
                    }}
                  />
                  <div className="absolute inset-y-0 right-0 pr-2 flex items-center">
                    <span className="text-xs text-text-muted border border-border-dark rounded px-1.5 py-0.5 font-mono">/</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1 border-b border-border-dark">
                <button
                  className={`px-4 py-2 text-sm font-medium border-b-2 ${
                    activeTab === 'all'
                      ? 'text-primary border-primary'
                      : 'text-text-muted hover:text-white border-transparent hover:border-border-dark transition-colors'
                  }`}
                  type="button"
                  onClick={() => {
                    setActiveTab('all');
                    setVisibleCount(6);
                  }}
                >
                  All ({workspaces.length})
                </button>
                <button
                  className={`px-4 py-2 text-sm font-medium border-b-2 ${
                    activeTab === 'running'
                      ? 'text-primary border-primary'
                      : 'text-text-muted hover:text-white border-transparent hover:border-border-dark transition-colors'
                  }`}
                  type="button"
                  onClick={() => {
                    setActiveTab('running');
                    setVisibleCount(6);
                  }}
                >
                  Running ({workspaceStatus.runningCount})
                </button>
                <button
                  className={`px-4 py-2 text-sm font-medium border-b-2 ${
                    activeTab === 'stopped'
                      ? 'text-primary border-primary'
                      : 'text-text-muted hover:text-white border-transparent hover:border-border-dark transition-colors'
                  }`}
                  type="button"
                  onClick={() => {
                    setActiveTab('stopped');
                    setVisibleCount(6);
                  }}
                >
                  Stopped ({workspaceStatus.stoppedCount})
                </button>
              </div>
              {wsError || tasksError ? (
                <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 text-red-200 text-sm">
                  {String(wsError?.message || tasksError?.message || 'Failed to load data')}
                </div>
              ) : wsLoading || tasksLoading ? (
                <div className="text-text-muted">Loading…</div>
              ) : filteredWorkspaces.length === 0 ? (
                <div className="text-text-muted">No workspaces yet.</div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                  {visibleWorkspaces.map((w) => {
                    const wsTasks = byWorkspace.get(w.id) || [];
                    const isRunning = workspaceStatus.isRunning(w.id);
                    const disabled = actionLoadingId === w.id;
                    return (
                      <div key={w.id} className={disabled ? 'opacity-80 pointer-events-none' : ''}>
                        <WorkspaceCard
                          status={isRunning ? 'running' : 'stopped'}
                          name={w.name}
                          repo={w.repoUrl ?? null}
                          created={relativeTime(w.createdAt)}
                          id={w.id}
                          disabled={disabled}
                          onOpen={() => ensureChatThenOpen(w.id)}
                        />
                      </div>
                    );
                  })}
                </div>
              )}
              {filteredWorkspaces.length > visibleCount ? (
                <div className="mt-4 flex justify-center">
                  <button
                    className="text-text-muted hover:text-white text-sm font-medium flex items-center gap-1 transition-colors"
                    type="button"
                    onClick={() => setVisibleCount((c) => c + 6)}
                  >
                    Show more workspaces
                    <span className="material-symbols-outlined text-[16px]">expand_more</span>
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </div>
        <div className="h-12 bg-[#111418] border-t border-border-dark flex items-center justify-between px-6 shrink-0 z-10 cursor-pointer hover:bg-[#16202a] transition-colors group">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-text-muted text-[18px]">terminal</span>
            <span className="text-sm text-text-muted font-mono group-hover:text-white transition-colors">Output</span>
            <span className="text-xs text-text-muted border border-border-dark rounded px-1.5 py-0.5 bg-[#16202a]">Ctrl + `</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="h-1.5 w-1.5 rounded-full bg-emerald-500"></div>
              <span className="text-xs text-text-muted">System Normal</span>
            </div>
            <span className="material-symbols-outlined text-text-muted text-[18px]">expand_less</span>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
