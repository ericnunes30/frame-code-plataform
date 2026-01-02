import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../services';

const CreateWorkspaceModal = () => {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [repoUrl, setRepoUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    const trimmedName = name.trim();
    const trimmedRepo = repoUrl.trim();
    if (!trimmedName) {
      setError('Name is required');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await api.post('/workspaces', { name: trimmedName, repoUrl: trimmedRepo || undefined });
      navigate('/workspaces');
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div aria-hidden="true" className="absolute inset-0 z-0 flex h-full w-full opacity-40 pointer-events-none select-none">
        <div className="flex h-full flex-col bg-surface-dark border-r border-border-dark p-4 w-[280px]"></div>
        <div className="flex-1 flex flex-col bg-background-dark">
          <div className="h-14 border-b border-border-dark flex items-center px-6 gap-4"></div>
          <div className="flex-1 p-8 grid grid-cols-12 gap-6">
            <div className="col-span-8 bg-surface-dark rounded-lg border border-border-dark h-96"></div>
            <div className="col-span-4 bg-surface-dark rounded-lg border border-border-dark h-96"></div>
          </div>
        </div>
      </div>

      <div className="flex flex-col w-full max-w-[560px] bg-surface-dark border border-border-dark rounded-xl shadow-2xl overflow-hidden ring-1 ring-white/10 relative">
        <div className="flex items-center justify-between px-6 py-5 border-b border-border-dark">
          <h2 className="text-xl font-bold text-white tracking-tight">Create New Workspace</h2>
          <Link
            aria-label="Close"
            className="text-[#9dabb9] hover:text-white transition-colors rounded-lg p-1 hover:bg-white/5 focus:outline-none focus:ring-2 focus:ring-primary/50"
            to="/"
          >
            <span className="material-symbols-outlined">close</span>
          </Link>
        </div>

        <div className="flex flex-col p-6 gap-6">
          {error ? (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-red-200 text-sm">{error}</div>
          ) : null}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-[#9dabb9]" htmlFor="workspace-name">
              Workspace Name <span className="text-red-500">*</span>
            </label>
            <div className="relative group">
              <input
                autoFocus
                className="w-full bg-input-bg border border-border-dark rounded-lg px-4 h-12 text-white placeholder:text-slate-600 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all font-normal text-base"
                id="workspace-name"
                placeholder="e.g. frontend-feature-login"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={loading}
              />
              <div className="absolute right-3 top-3 text-slate-600 pointer-events-none">
                <span className="material-symbols-outlined text-[20px]">terminal</span>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-[#9dabb9]" htmlFor="repo-url">
              Repository URL <span className="text-slate-600 font-normal ml-1">(Optional)</span>
            </label>
            <div className="relative">
              <input
                className="w-full bg-input-bg border border-border-dark rounded-lg pl-11 pr-4 h-12 text-white placeholder:text-slate-600 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all font-mono text-sm"
                id="repo-url"
                placeholder="https://github.com/org/repo.git"
                type="text"
                value={repoUrl}
                onChange={(e) => setRepoUrl(e.target.value)}
                disabled={loading}
              />
              <div className="absolute left-3 top-3 text-[#9dabb9] pointer-events-none flex items-center justify-center">
                <span className="material-symbols-outlined text-[20px]">link</span>
              </div>
            </div>
            <div className="flex items-start gap-2 mt-1 px-1">
              <span className="material-symbols-outlined text-primary text-[18px] mt-0.5 shrink-0">info</span>
              <p className="text-xs text-[#9dabb9] leading-relaxed">
                Each task creates an isolated Docker container with a deep clone of this repository.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4 bg-[#161b22] border-t border-border-dark">
          <Link className="px-5 h-10 rounded-lg text-sm font-bold text-white hover:bg-white/5 border border-transparent hover:border-border-dark transition-all inline-flex items-center" to="/">
            Cancel
          </Link>
          <button
            className="px-6 h-10 rounded-lg bg-primary hover:bg-blue-600 text-white text-sm font-bold shadow-lg shadow-blue-500/20 flex items-center gap-2 transition-all disabled:opacity-50"
            type="button"
            onClick={submit}
            disabled={loading}
          >
            <span>Create Workspace</span>
            <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreateWorkspaceModal;
