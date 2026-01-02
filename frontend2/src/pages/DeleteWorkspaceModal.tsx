import React, { useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { api } from '../services';

const DeleteWorkspaceModal = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const workspaceId = searchParams.get('workspaceId');
  const workspaceName = workspaceId || 'backend-api-v2';
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canDelete = useMemo(() => confirm.trim().toLowerCase() === workspaceName.toLowerCase(), [confirm, workspaceName]);

  const submit = async () => {
    if (!workspaceId) {
      setError('Missing workspaceId');
      return;
    }
    if (!canDelete) {
      setError('Confirmation does not match');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await api.delete(`/workspaces/${workspaceId}`);
      navigate('/workspaces');
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-[2px] p-4">
      <div aria-hidden="true" className="absolute inset-0 z-0 opacity-50">
        <div className="flex h-full w-full flex-col bg-[#0d1218]">
          <div className="h-12 border-b border-surface-border bg-surface-dark w-full"></div>
          <div className="flex flex-1 overflow-hidden">
            <div className="w-16 border-r border-surface-border bg-surface-dark"></div>
            <div className="flex-1 bg-background-dark p-8"></div>
          </div>
        </div>
      </div>

      <div className="relative z-50 w-full max-w-[520px] mx-4 flex flex-col bg-[#161b22] border border-surface-border rounded-xl shadow-2xl">
        <div className="flex items-start justify-between px-6 pt-6 pb-2">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-danger/10 text-danger shrink-0">
              <span className="material-symbols-outlined text-[24px]">warning</span>
            </div>
            <h2 className="text-white tracking-tight text-xl font-bold">Confirm Delete Workspace</h2>
          </div>
          <Link className="text-text-secondary hover:text-white transition-colors" to="/">
            <span className="material-symbols-outlined text-[20px]">close</span>
          </Link>
        </div>

        <div className="px-6 py-2">
          {error ? (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-red-200 text-sm mb-4">{error}</div>
          ) : null}
          <div className="bg-[#1c1616] border border-red-900/30 rounded-lg p-4 mb-5">
            <p className="text-[#ffb4ab] text-sm">
              <span className="font-bold block mb-1">Irreversible action</span>
              This cannot be undone. It will permanently remove the container and associated files.
            </p>
          </div>
          <p className="text-gray-300 text-sm mb-6">
            Are you sure you want to delete workspace{' '}
            <span className="text-white font-mono font-bold bg-[#262c36] px-1.5 py-0.5 rounded border border-[#3b4754]">
              {workspaceName}
            </span>
            ?
          </p>
          <div className="flex flex-col gap-2">
            <label className="text-text-secondary text-xs font-medium uppercase tracking-wider" htmlFor="confirm-input">
              To confirm, type <span className="select-all text-white font-mono lowercase">{workspaceName}</span>
            </label>
            <input
              autoComplete="off"
              className="form-input w-full rounded-lg bg-[#0d1117] border border-[#30363d] focus:border-danger focus:ring-1 focus:ring-danger text-white placeholder:text-[#484f58] h-10 px-3 text-sm font-mono"
              id="confirm-input"
              placeholder={workspaceName}
              type="text"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              disabled={loading}
            />
          </div>
        </div>

        <div className="px-6 py-5 mt-2 flex justify-end gap-3 bg-[#161b22] rounded-b-xl border-t border-surface-border/50">
          <Link className="h-9 px-4 rounded-lg border border-[#3b4754] text-white text-sm font-medium hover:bg-[#3b4754]/50 transition-colors inline-flex items-center" to="/">
            Cancel
          </Link>
          <button
            className="flex items-center justify-center h-9 px-4 rounded-lg bg-danger hover:bg-red-600 text-white text-sm font-bold shadow-sm gap-2 disabled:opacity-50"
            type="button"
            disabled={!canDelete || loading}
            onClick={submit}
          >
            <span className="material-symbols-outlined text-[18px]">delete</span>
            Delete Workspace
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeleteWorkspaceModal;
