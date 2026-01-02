export type TaskStatus = 'creating' | 'running' | 'paused' | 'stopped' | 'error';

export type Task = {
  taskId: string;
  workspaceId: string;
  title: string;
  status: TaskStatus;
  containerId?: string;
  image: string;
  repoPath: string;
  branch?: string;
  createdAt: string;
  updatedAt: string;
  lastActivityAt: string;
};

export type Workspace = {
  id: string;
  name: string;
  repoUrl?: string;
  defaultBranch?: string;
  createdAt: string;
  updatedAt: string;
};

export type SystemStats = {
  workspaceBaseDir?: string;
  docker: {
    available: boolean;
    version: string | null;
  };
  tasks: {
    total: number;
    running: number;
    stopped: number;
    creating: number;
    error: number;
  };
  cpu: {
    usage: number;
    cores: number;
  };
  memory: {
    usage: number;
    total: number;
  };
};

export interface Chat {
  chatId: string;
  workspaceId: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  lastActivityAt: string;
  messageCount: number;
  taskId?: string;
}

export interface ToolCall {
  tool: string;
  name?: string;
  arguments: Record<string, unknown>;
  result?: unknown;
  timestamp?: string;
}

export interface SessionMessage {
  id: string;
  role: 'user' | 'agent' | 'system' | 'tool';
  content: string;
  timestamp?: string;
  toolCalls?: ToolCall[];
  toolName?: string;
  metadata?: Record<string, unknown>;
}
