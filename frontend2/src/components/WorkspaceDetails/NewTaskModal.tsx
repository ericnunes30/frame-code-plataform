import React, { useEffect, useMemo, useRef, useState } from 'react';

type Props = {
  open: boolean;
  onClose: () => void;
  onCreate: (title: string) => Promise<void> | void;
  loading?: boolean;
};

export default function NewTaskModal({ open, onClose, onCreate, loading }: Props) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [title, setTitle] = useState('');
  const [error, setError] = useState<string | null>(null);

  const canSubmit = useMemo(() => title.trim().length > 0 && !loading, [title, loading]);

  useEffect(() => {
    if (!open) return;
    setTitle('');
    setError(null);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => inputRef.current?.focus(), 0);
    return () => clearTimeout(t);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  const submit = async () => {
    const trimmed = title.trim();
    if (!trimmed) {
      setError('Name is required');
      return;
    }
    setError(null);
    await onCreate(trimmed);
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Create new task"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="flex flex-col w-full max-w-[560px] bg-surface-dark border border-border-dark rounded-xl shadow-2xl overflow-hidden ring-1 ring-white/10 relative">
        <div className="flex items-center justify-between px-6 py-5 border-b border-border-dark">
          <h2 className="text-xl font-bold text-white tracking-tight">New Task</h2>
          <button
            aria-label="Close"
            className="text-[#9dabb9] hover:text-white transition-colors rounded-lg p-1 hover:bg-white/5 focus:outline-none focus:ring-2 focus:ring-primary/50"
            type="button"
            onClick={onClose}
            disabled={Boolean(loading)}
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="flex flex-col p-6 gap-6">
          {error ? (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-red-200 text-sm">{error}</div>
          ) : null}

          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-[#9dabb9]" htmlFor="task-title">
              Task Name <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                ref={inputRef}
                className="w-full bg-input-bg border border-border-dark rounded-lg px-4 h-12 text-white placeholder:text-slate-600 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all font-normal text-base"
                id="task-title"
                placeholder="e.g. fix-login-flow"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                disabled={Boolean(loading)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') submit();
                }}
              />
              <div className="absolute right-3 top-3 text-slate-600 pointer-events-none">
                <span className="material-symbols-outlined text-[20px]">terminal</span>
              </div>
            </div>

            <div className="flex items-start gap-2 mt-1 px-1">
              <span className="material-symbols-outlined text-primary text-[18px] mt-0.5 shrink-0">info</span>
              <p className="text-xs text-[#9dabb9] leading-relaxed">
                Each task provisions an isolated Docker container and a copy of the repository.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4 bg-[#161b22] border-t border-border-dark">
          <button
            className="px-5 h-10 rounded-lg text-sm font-bold text-white hover:bg-white/5 border border-transparent hover:border-border-dark transition-all inline-flex items-center disabled:opacity-50"
            type="button"
            onClick={onClose}
            disabled={Boolean(loading)}
          >
            Cancel
          </button>
          <button
            className="px-6 h-10 rounded-lg bg-primary hover:bg-blue-600 text-white text-sm font-bold shadow-lg shadow-blue-500/20 flex items-center gap-2 transition-all disabled:opacity-50"
            type="button"
            onClick={submit}
            disabled={!canSubmit}
          >
            <span>{loading ? 'Creating…' : 'Create Task'}</span>
            <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
          </button>
        </div>
      </div>
    </div>
  );
}

