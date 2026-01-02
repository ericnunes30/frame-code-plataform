import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import Sidebar from '../components/layout/Sidebar';
import Header from '../components/WorkspaceDetails/Header';
import TaskList from '../components/WorkspaceDetails/TaskList';
import ChatInterface from '../components/WorkspaceDetails/ChatInterface';
import ContainerLogs from '../components/WorkspaceDetails/ContainerLogs';
import NewTaskModal from '../components/WorkspaceDetails/NewTaskModal';
import { useChat, useChats, useLogs, useTasks, useWorkspace } from '../hooks';
import { api } from '../services';

const WorkspaceDetails = () => {
  const params = useParams<{ id: string }>();
  const workspaceId = params.id || '';
  const [searchParams, setSearchParams] = useSearchParams();
  const activeChatId = searchParams.get('chat') || undefined;
  const activeTab = searchParams.get('tab') || 'tasks';
  const [creatingTask, setCreatingTask] = useState(false);
  const [newTaskModalOpen, setNewTaskModalOpen] = useState(false);

  const { workspace, loading: workspaceLoading, error: workspaceError } = useWorkspace(workspaceId);
  const { chats, loading: chatsLoading, createChat, refetch: refetchChats, updateChatTitle, touchChat } = useChats(workspaceId);
  const { tasks, refetch: refetchTasks } = useTasks();

  const statusByChatId = useMemo(() => {
    const map: Record<string, (typeof tasks)[number]['status']> = {};
    for (const t of tasks) {
      if (t.workspaceId !== workspaceId) continue;
      map[t.taskId] = t.status;
    }
    return map;
  }, [tasks, workspaceId]);

  const workspaceTaskStats = useMemo(() => {
    const wsTasks = tasks.filter((t) => t.workspaceId === workspaceId);
    return {
      running: wsTasks.filter((t) => t.status === 'running').length,
      stopped: wsTasks.filter((t) => t.status === 'stopped' || t.status === 'paused').length,
    };
  }, [tasks, workspaceId]);

  const resolvedChatId = useMemo(() => {
    if (chatsLoading) return undefined;
    if (!activeChatId) return chats[0]?.chatId;
    return chats.some((c) => c.chatId === activeChatId) ? activeChatId : chats[0]?.chatId;
  }, [activeChatId, chats, chatsLoading]);

  useEffect(() => {
    if (chatsLoading) return;

    const hasActive = activeChatId ? chats.some((c) => c.chatId === activeChatId) : false;
    if (activeChatId && !hasActive) {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        if (chats.length > 0) next.set('chat', chats[0].chatId);
        else next.delete('chat');
        return next;
      });
      return;
    }

    if (!activeChatId && chats.length > 0) {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        next.set('chat', chats[0].chatId);
        return next;
      });
    }
  }, [activeChatId, chats, chatsLoading, setSearchParams]);

  const chatOptions = useMemo(
    () => ({
      onOutboundMessage: (msg: { timestamp?: string }) => {
        if (!resolvedChatId) return;
        touchChat(resolvedChatId, { deltaMessageCount: 1, at: msg.timestamp });
      },
      onInboundMessage: (msg: { timestamp?: string }) => {
        if (!resolvedChatId) return;
        touchChat(resolvedChatId, { deltaMessageCount: 1, at: msg.timestamp || new Date().toISOString() });
      },
    }),
    [resolvedChatId, touchChat]
  );

  const { messages, isTyping, connected, sendMessage } = useChat(workspaceId, resolvedChatId, chatOptions);
  const logsTaskId = activeTab === 'tasks' ? resolvedChatId || null : null;
  const { logs, isStreaming, connected: logsConnected, containerRef } = useLogs(logsTaskId, 200);

  const handleNewTask = () => {
    setNewTaskModalOpen(true);
  };

  const handleCreateNamedTask = async (title: string) => {
    if (creatingTask) return;
    setCreatingTask(true);
    try {
      const created = await createChat(title);
      await Promise.all([refetchTasks(), refetchChats()]);
      setNewTaskModalOpen(false);
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        next.set('chat', created.chatId);
        next.set('tab', 'tasks');
        return next;
      });
    } finally {
      setCreatingTask(false);
    }
  };

  const handleSelectTask = (chatId: string) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('chat', chatId);
      return next;
    });
  };

  const [taskActionId, setTaskActionId] = useState<string | null>(null);

  const handleStartTask = async (taskId: string) => {
    setTaskActionId(taskId);
    try {
      await api.post(`/tasks/${taskId}/start`);
      await refetchTasks();
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        next.set('chat', taskId);
        next.set('tab', 'tasks');
        return next;
      });
    } finally {
      setTaskActionId(null);
    }
  };

  const handleStopTask = async (taskId: string) => {
    setTaskActionId(taskId);
    try {
      await api.post(`/tasks/${taskId}/stop`);
      await refetchTasks();
    } finally {
      setTaskActionId(null);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    setTaskActionId(taskId);
    try {
      await api.delete(`/tasks/${taskId}`);
      await Promise.all([refetchTasks(), refetchChats()]);
      if (activeChatId === taskId) {
        const nextChat = chats.find((c) => c.chatId !== taskId)?.chatId;
        setSearchParams((prev) => {
          const next = new URLSearchParams(prev);
          if (nextChat) next.set('chat', nextChat);
          else next.delete('chat');
          return next;
        });
      }
    } finally {
      setTaskActionId(null);
    }
  };

  const handleRenameTask = async (taskId: string, title: string) => {
    setTaskActionId(taskId);
    try {
      await updateChatTitle(taskId, title);
      await refetchChats();
    } finally {
      setTaskActionId(null);
    }
  };

  if (!workspaceId) {
    return (
      <div className="p-6 text-text-muted">
        <p>Invalid workspace ID</p>
      </div>
    );
  }

  if (workspaceLoading) {
    return (
      <div className="p-6 text-text-muted">
        <p>Loading workspace…</p>
      </div>
    );
  }

  if (workspaceError || !workspace) {
    return (
      <div className="p-6">
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 text-red-200 text-sm">
          {String(workspaceError?.message || 'Workspace not found')}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-background-dark font-display text-white h-screen flex overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header
          runningCount={workspaceTaskStats.running}
          stoppedCount={workspaceTaskStats.stopped}
        />
        <div className="flex flex-1 overflow-hidden">
          <TaskList
            chats={chats}
            loading={chatsLoading}
            activeChatId={resolvedChatId}
            statusByChatId={statusByChatId}
            onSelectChat={handleSelectTask}
            onNewChat={handleNewTask}
            creating={creatingTask}
            onStartTask={handleStartTask}
            onStopTask={handleStopTask}
            onDeleteTask={handleDeleteTask}
            onRenameTask={handleRenameTask}
            busyTaskId={taskActionId}
          />
          {activeTab === 'overview' ? (
            <section className="flex-1 overflow-y-auto p-8">
              <div className="max-w-3xl">
                <h1 className="text-2xl font-bold text-white">Overview</h1>
                <p className="text-sm text-text-muted mt-2">
                  Workspace <span className="font-mono text-slate-300">{workspace.id}</span>
                </p>
                <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-surface-dark border border-border-dark rounded-lg p-4">
                    <div className="text-xs text-slate-400 uppercase tracking-wider">Name</div>
                    <div className="mt-2 text-lg font-bold">{workspace.name}</div>
                  </div>
                  <div className="bg-surface-dark border border-border-dark rounded-lg p-4">
                    <div className="text-xs text-slate-400 uppercase tracking-wider">Repository</div>
                    <div className="mt-2 text-sm font-mono text-slate-300 break-all">{workspace.repoUrl || '—'}</div>
                  </div>
                  <div className="bg-surface-dark border border-border-dark rounded-lg p-4">
                    <div className="text-xs text-slate-400 uppercase tracking-wider">Tasks</div>
                    <div className="mt-2 text-lg font-bold">{chats.length}</div>
                    <div className="mt-1 text-xs text-slate-400">Chats are provisioned as tasks/containers.</div>
                  </div>
                  <div className="bg-surface-dark border border-border-dark rounded-lg p-4">
                    <div className="text-xs text-slate-400 uppercase tracking-wider">Last Updated</div>
                    <div className="mt-2 text-sm font-mono text-slate-300">{workspace.updatedAt}</div>
                  </div>
                </div>
              </div>
            </section>
          ) : activeTab === 'settings' ? (
            <section className="flex-1 overflow-y-auto p-8">
              <div className="max-w-3xl">
                <h1 className="text-2xl font-bold text-white">Workspace Settings</h1>
                <p className="text-sm text-text-muted mt-2">Workspace-scoped settings are not implemented yet.</p>
              </div>
            </section>
          ) : (
            <>
              <ChatInterface
                messages={messages}
                isTyping={isTyping}
                connected={connected}
                onSend={sendMessage}
                disabled={!resolvedChatId}
              />
              <ContainerLogs
                logs={logs}
                isStreaming={isStreaming}
                connected={logsConnected}
                containerRef={containerRef}
                taskId={resolvedChatId || null}
                status={resolvedChatId ? statusByChatId[resolvedChatId] : undefined}
              />
            </>
          )}
        </div>
      </div>

      <NewTaskModal
        open={newTaskModalOpen}
        onClose={() => setNewTaskModalOpen(false)}
        onCreate={handleCreateNamedTask}
        loading={creatingTask}
      />
    </div>
  );
};

export default WorkspaceDetails;
