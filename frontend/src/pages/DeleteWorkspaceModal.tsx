import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
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

  const close = () => {
    navigate(-1);
  };

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

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
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Delete workspace"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <div className="flex flex-col w-full max-w-[560px] bg-surface-dark border border-border-dark rounded-xl shadow-2xl overflow-hidden ring-1 ring-white/10 relative">
        <div className="flex items-center justify-between px-6 py-5 border-b border-border-dark">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-danger/10 text-danger shrink-0">
              <span className="material-symbols-outlined text-[24px]">warning</span>
            </div>
            <h2 className="text-xl font-bold text-white tracking-tight">Confirm Delete Workspace</h2>
          </div>
          <button
            aria-label="Close"
            className="text-[#9dabb9] hover:text-white transition-colors rounded-lg p-1 hover:bg-white/5 focus:outline-none focus:ring-2 focus:ring-primary/50"
            type="button"
            onClick={close}
            disabled={loading}
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="flex flex-col p-6 gap-6">
          {error ? (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-red-200 text-sm">{error}</div>
          ) : null}

          <div className="bg-[#1c1616] border border-red-900/30 rounded-lg p-4">
            <p className="text-[#ffb4ab] text-sm">
              <span className="font-bold block mb-1">Irreversible action</span>
              This cannot be undone. It will permanently remove the container and associated files.
            </p>
          </div>

          <p className="text-gray-300 text-sm">
            Are you sure you want to delete workspace{' '}
            <span className="text-white font-mono font-bold bg-[#262c36] px-1.5 py-0.5 rounded border border-[#3b4754]">
              {workspaceName}
            </span>
            ?
          </p>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-[#9dabb9]" htmlFor="confirm-input">
              To confirm, type <span className="select-all text-white font-mono lowercase">{workspaceName}</span>
            </label>
            <input
              autoComplete="off"
              className="w-full bg-input-bg border border-border-dark rounded-lg px-4 h-12 text-white placeholder:text-slate-600 focus:outline-none focus:border-danger focus:ring-1 focus:ring-danger transition-all font-mono text-sm"
              id="confirm-input"
              placeholder={workspaceName}
              type="text"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              disabled={loading}
              onKeyDown={(e) => {
                if (e.key === 'Enter') submit();
              }}
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4 bg-[#161b22] border-t border-border-dark">
          <button
            className="px-5 h-10 rounded-lg text-sm font-bold text-white hover:bg-white/5 border border-transparent hover:border-border-dark transition-all inline-flex items-center disabled:opacity-50"
            type="button"
            onClick={close}
            disabled={loading}
          >
            Cancel
          </button>
          <button
            className="px-6 h-10 rounded-lg bg-danger hover:bg-red-600 text-white text-sm font-bold shadow-lg shadow-red-500/20 flex items-center gap-2 transition-all disabled:opacity-50"
            type="button"
            disabled={!canDelete || loading}
            onClick={submit}
          >
            <span>Delete Workspace</span>
            <span className="material-symbols-outlined text-[18px]">delete</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeleteWorkspaceModal;
