import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import Sidebar from '../components/layout/Sidebar';
import { useSystemStats } from '../hooks';
import { api } from '../services';

const Settings = () => {
  const { stats, loading, error, refetch } = useSystemStats();
  const [purgeLoading, setPurgeLoading] = useState(false);
  const [purgeResult, setPurgeResult] = useState<string | null>(null);
  const [purgeError, setPurgeError] = useState<string | null>(null);

  const apiBaseUrl = (import.meta as ImportMeta).env?.VITE_API_BASE_URL || '/api/v1';
  const wsPath = (import.meta as ImportMeta).env?.VITE_WS_PATH || '/ws';
  const backendUrl = 'via Vite proxy';

  const purgeAll = async () => {
    setPurgeLoading(true);
    setPurgeResult(null);
    setPurgeError(null);
    try {
      const res = await api.delete<{ count: number; message: string }>('/system/purge');
      setPurgeResult(res.message || `Purged ${res.count} workspaces`);
      await refetch();
    } catch (e) {
      setPurgeError(e instanceof Error ? e.message : String(e));
    } finally {
      setPurgeLoading(false);
    }
  };

  return (
    <div className="dark bg-background-dark text-white font-display overflow-hidden h-screen flex">
      <Sidebar />

      <main className="flex-1 flex flex-col h-full overflow-hidden">
        <header className="flex-none flex items-center justify-between whitespace-nowrap border-b border-solid border-border-dark px-6 py-3 bg-surface-dark z-20">
          <div className="flex items-center gap-4">
            <div className="size-8 flex items-center justify-center rounded bg-primary/10 text-primary">
              <span className="material-symbols-outlined text-[24px]">settings</span>
            </div>
            <h2 className="text-lg font-bold leading-tight tracking-tight">Settings</h2>
          </div>

          <div className="flex items-center gap-3 text-sm">
            <Link className="font-medium text-slate-400 hover:text-white transition-colors" to="/workspaces">
              Workspaces
            </Link>
            <div className="h-4 w-px bg-border-dark"></div>
            <Link className="font-medium text-primary" to="/settings">
              System
            </Link>
            <div className="h-4 w-px bg-border-dark"></div>
            <Link className="font-medium text-slate-400 hover:text-white transition-colors" to="/logs">
              Logs
            </Link>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto bg-background-dark p-6 lg:p-10">
          <div className="max-w-5xl mx-auto space-y-8">
            <div className="flex items-center justify-between">
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2 text-sm text-slate-400">
                  <span>Settings</span>
                  <span className="material-symbols-outlined text-[14px]">chevron_right</span>
                  <span className="text-white font-medium">System Configuration</span>
                </div>
                <h1 className="text-3xl font-bold tracking-tight text-white">System Configuration</h1>
              </div>

              <Link className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 text-slate-300 rounded text-sm font-medium transition-colors" to="/logs">
                <span className="material-symbols-outlined text-[18px]">history</span>
                View Logs
              </Link>
            </div>

            <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-surface-dark border border-border-dark rounded-lg p-5">
                <div className="text-xs text-slate-400 uppercase tracking-wider">Docker</div>
                <div className="mt-2 text-lg font-bold">
                  {loading ? 'Loading…' : stats?.docker.available ? 'Available' : 'Unavailable'}
                </div>
                <div className="mt-1 text-xs text-slate-400">{stats?.docker.version || '—'}</div>
              </div>
              <div className="bg-surface-dark border border-border-dark rounded-lg p-5">
                <div className="text-xs text-slate-400 uppercase tracking-wider">Workspaces</div>
                <div className="mt-2 text-lg font-bold">{stats?.tasks.total ?? '—'}</div>
                <div className="mt-1 text-xs text-slate-400">
                  {stats ? `${stats.tasks.running} running, ${stats.tasks.stopped} stopped` : '—'}
                </div>
              </div>
              <div className="bg-surface-dark border border-border-dark rounded-lg p-5">
                <div className="text-xs text-slate-400 uppercase tracking-wider">Runtime</div>
                <div className="mt-2 text-sm font-mono text-slate-300">API: {apiBaseUrl}</div>
                <div className="mt-1 text-sm font-mono text-slate-300">WS: {wsPath}</div>
                <div className="mt-1 text-xs text-slate-500">Dev proxy target: {backendUrl}</div>
                <div className="mt-1 text-xs text-slate-500 font-mono">
                  WORKSPACE_BASE_DIR: {stats?.workspaceBaseDir || '—'}
                </div>
              </div>
            </section>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <section className="bg-surface-dark border border-border-dark rounded-lg p-6">
                <h3 className="text-white font-bold">Health</h3>
                <p className="text-sm text-slate-400 mt-2">
                  Backend status comes from <code className="font-mono">{apiBaseUrl}/system/status</code>.
                </p>
                {error ? (
                  <div className="mt-4 bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-red-200 text-sm">
                    {error}
                  </div>
                ) : null}
              </section>
              <section className="border border-red-900/50 rounded-lg bg-red-950/10 p-6">
                <h3 className="text-white font-bold">Danger Zone</h3>
                <p className="text-sm text-slate-400 mt-2">Purge all workspaces (calls DELETE `/system/purge`).</p>
                {purgeError ? (
                  <div className="mt-4 bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-red-200 text-sm">
                    {purgeError}
                  </div>
                ) : null}
                {purgeResult ? (
                  <div className="mt-4 bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-3 text-emerald-200 text-sm">
                    {purgeResult}
                  </div>
                ) : null}
                <div className="mt-4 flex gap-3">
                  <button
                    className="h-9 px-4 rounded-lg bg-danger hover:bg-red-600 text-white text-sm font-bold disabled:opacity-50"
                    type="button"
                    onClick={purgeAll}
                    disabled={purgeLoading}
                  >
                    {purgeLoading ? 'Purging…' : 'Purge All Workspaces'}
                  </button>
                </div>
              </section>
            </div>

            <footer className="pt-6 border-t border-border-dark text-center pb-10">
              <p className="text-xs text-slate-600">
                DevEnvironment Manager v2.4.1 •{' '}
                <a className="hover:underline" href="https://example.com/docs" rel="noreferrer" target="_blank">
                  Documentation
                </a>{' '}
                •{' '}
                <a className="hover:underline" href="https://example.com/support" rel="noreferrer" target="_blank">
                  Support
                </a>
              </p>
            </footer>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Settings;
