import React, { useMemo, useState } from 'react';
import type { Chat, TaskStatus } from '../../services';

type Props = {
  chats: Chat[];
  loading?: boolean;
  activeChatId?: string;
  statusByChatId?: Record<string, TaskStatus | undefined>;
  onSelectChat: (chatId: string) => void;
  onNewChat: () => void;
  creating?: boolean;
  onStartTask: (taskId: string) => void;
  onStopTask: (taskId: string) => void;
  onDeleteTask: (taskId: string) => void;
  onRenameTask: (taskId: string, title: string) => void;
  busyTaskId?: string | null;
};

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

function statusBadge(status?: TaskStatus) {
  if (status === 'running')
    return {
      text: 'RUNNING',
      color: 'text-green-400',
      bg: 'bg-green-900/20',
      border: 'border-green-900/50',
      indicator: 'bg-green-500',
    };
  if (status === 'creating')
    return {
      text: 'STARTING',
      color: 'text-blue-400',
      bg: 'bg-blue-900/20',
      border: 'border-blue-900/50',
      indicator: 'bg-blue-500',
    };
  if (status === 'stopped')
    return {
      text: 'STOPPED',
      color: 'text-slate-400',
      bg: 'bg-slate-800/40',
      border: 'border-slate-700/50',
      indicator: 'bg-slate-500',
    };
  if (status === 'paused')
    return {
      text: 'PAUSED',
      color: 'text-amber-300',
      bg: 'bg-amber-900/10',
      border: 'border-amber-900/40',
      indicator: 'bg-amber-400',
    };
  if (status === 'error')
    return {
      text: 'ERROR',
      color: 'text-red-400',
      bg: 'bg-red-900/20',
      border: 'border-red-900/50',
      indicator: 'bg-red-500',
    };
  return {
    text: '—',
    color: 'text-slate-400',
    bg: 'bg-slate-800/40',
    border: 'border-slate-700/50',
    indicator: 'bg-slate-500',
  };
}

const TaskList = ({
  chats,
  loading,
  activeChatId,
  statusByChatId,
  onSelectChat,
  onNewChat,
  creating,
  onStartTask,
  onStopTask,
  onDeleteTask,
  onRenameTask,
  busyTaskId,
}: Props) => {
  const [filter, setFilter] = useState('');
  const [menuChatId, setMenuChatId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return chats;
    return chats.filter((c) => {
      const title = c.title?.toLowerCase() || '';
      const id = c.chatId.toLowerCase();
      return title.includes(q) || id.includes(q);
    });
  }, [chats, filter]);

  return (
    <aside className="w-80 border-r border-border-dark flex flex-col bg-surface-dark shrink-0">
      <div className="p-3 border-b border-border-dark">
        <button
          className="flex w-full cursor-pointer items-center justify-center overflow-hidden rounded-lg h-9 px-4 bg-primary hover:bg-blue-600 transition-colors text-white text-sm font-bold gap-2"
          type="button"
          onClick={onNewChat}
          disabled={Boolean(creating)}
        >
          <span className="material-symbols-outlined text-lg">add</span>
          <span>{creating ? 'Creating…' : 'New Task'}</span>
        </button>
      </div>
      <div className="px-3 py-2 border-b border-border-dark flex items-center gap-2">
        <span className="material-symbols-outlined text-[#9dabb9] text-lg">search</span>
        <input
          className="bg-transparent border-none text-xs text-white placeholder-[#5a6b7c] focus:ring-0 w-full p-0"
          placeholder="Filter tasks..."
          type="text"
          id="task-filter"
          name="taskFilter"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
      </div>
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="p-3 text-xs text-[#9dabb9]">Loading tasks…</div>
        ) : filtered.length === 0 ? (
          <div className="p-3 text-xs text-[#9dabb9]">No tasks yet.</div>
        ) : (
          filtered.map((chat) => {
            const isActive = chat.chatId === activeChatId;
            const badge = statusBadge(statusByChatId?.[chat.chatId]);
            const isMenuOpen = menuChatId === chat.chatId;
            const status = statusByChatId?.[chat.chatId];
            const busy = busyTaskId === chat.chatId;
            return (
              <div
                key={chat.chatId}
                className={`w-full text-left p-3 border-b border-border-dark cursor-pointer group transition-colors ${
                  isActive
                    ? 'bg-[#1e2732] border-l-[3px] border-l-primary'
                    : 'hover:bg-[#1e2732]/50 border-l-[3px] border-l-transparent'
                }`}
                role="button"
                tabIndex={0}
                aria-selected={isActive}
                onClick={() => onSelectChat(chat.chatId)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onSelectChat(chat.chatId);
                  }
                }}
              >
                <div className="flex justify-between items-start mb-1">
                  <div className="flex items-center gap-2 min-w-0">
                    <h3
                      className={`font-medium text-sm truncate pr-2 ${
                        isActive ? 'text-white font-bold' : 'text-[#d1d5db]'
                      }`}
                    >
                      {chat.title}
                    </h3>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <span className={`size-2 rounded-full ${badge.indicator}`}></span>
                  </div>
                </div>
                <p className="text-[#9dabb9] text-xs truncate mb-2">
                  {chat.chatId} • {relativeTime(chat.lastActivityAt)}
                </p>
                <div className="flex justify-between items-center text-xs text-[#5a6b7c]">
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1 bg-surface-darker px-1.5 py-0.5 rounded border border-border-dark">
                      <span className="material-symbols-outlined text-[12px]">chat</span>
                      <span className="font-mono">{chat.messageCount}</span>
                    </span>
                    <span
                      className={`font-medium tracking-wide text-[10px] uppercase border px-1.5 py-0.5 rounded flex items-center gap-1 ${badge.color} ${badge.bg} ${badge.border}`}
                    >
                      {badge.text}
                    </span>
                  </div>
                  <div className="relative">
                    <button
                      className="opacity-0 group-hover:opacity-100 text-[#9dabb9] hover:text-white transition-opacity"
                      type="button"
                      aria-label="Task actions"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setMenuChatId((prev) => (prev === chat.chatId ? null : chat.chatId));
                      }}
                    >
                      <span className="material-symbols-outlined text-base">more_horiz</span>
                    </button>
                    {isMenuOpen ? (
                      <div
                        className="absolute right-0 mt-2 w-48 rounded-lg border border-border-dark bg-[#111418] shadow-xl z-30 overflow-hidden"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                        }}
                      >
                        <button
                          className="w-full text-left px-3 py-2 text-xs text-slate-200 hover:bg-white/[0.04] flex items-center gap-2"
                          type="button"
                          onClick={() => {
                            onSelectChat(chat.chatId);
                            setMenuChatId(null);
                          }}
                        >
                          <span className="material-symbols-outlined text-[16px]">open_in_new</span>
                          Open
                        </button>
                        {status === 'running' ? (
                          <button
                            className="w-full text-left px-3 py-2 text-xs text-slate-200 hover:bg-white/[0.04] flex items-center gap-2"
                            type="button"
                            onClick={() => {
                              onStopTask(chat.chatId);
                              setMenuChatId(null);
                            }}
                            disabled={busy}
                          >
                            <span className="material-symbols-outlined text-[16px]">stop_circle</span>
                            Pause
                          </button>
                        ) : (
                          <button
                            className="w-full text-left px-3 py-2 text-xs text-slate-200 hover:bg-white/[0.04] flex items-center gap-2"
                            type="button"
                            onClick={() => {
                              onStartTask(chat.chatId);
                              setMenuChatId(null);
                            }}
                            disabled={busy}
                          >
                            <span className="material-symbols-outlined text-[16px]">play_circle</span>
                            {status === 'paused' ? 'Resume' : 'Start'}
                          </button>
                        )}
                        <button
                          className="w-full text-left px-3 py-2 text-xs text-slate-200 hover:bg-white/[0.04] flex items-center gap-2"
                          type="button"
                          onClick={async () => {
                            const nextTitle = window.prompt('Rename task', chat.title);
                            if (!nextTitle) return;
                            onRenameTask(chat.chatId, nextTitle);
                            setMenuChatId(null);
                          }}
                          disabled={busy}
                        >
                          <span className="material-symbols-outlined text-[16px]">edit</span>
                          Rename
                        </button>
                        <button
                          className="w-full text-left px-3 py-2 text-xs text-slate-200 hover:bg-white/[0.04] flex items-center gap-2"
                          type="button"
                          onClick={async () => {
                            try {
                              await navigator.clipboard.writeText(chat.chatId);
                            } catch {
                              // ignore
                            }
                            setMenuChatId(null);
                          }}
                        >
                          <span className="material-symbols-outlined text-[16px]">content_copy</span>
                          Copy taskId
                        </button>
                        <button
                          className="w-full text-left px-3 py-2 text-xs text-red-300 hover:bg-red-500/10 flex items-center gap-2"
                          type="button"
                          onClick={async () => {
                            const ok = window.confirm(`Delete task ${chat.chatId}? This cannot be undone.`);
                            if (!ok) return;
                            onDeleteTask(chat.chatId);
                            setMenuChatId(null);
                          }}
                          disabled={busy}
                        >
                          <span className="material-symbols-outlined text-[16px]">delete</span>
                          Delete
                        </button>
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </aside>
  );
};

export default TaskList;
