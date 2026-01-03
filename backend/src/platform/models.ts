export type TaskStatus = 'creating' | 'running' | 'paused' | 'stopped' | 'error';

export type Workspace = {
  id: string;
  name: string;
  repoUrl?: string;
  defaultBranch?: string;
  createdAt: string;
  updatedAt: string;
};

export type Task = {
  taskId: string;
  workspaceId: string;
  title: string;
  status: TaskStatus;
  containerId?: string;
  image: string;
  repoPath: string;
  branch?: string;
  agentRunnerPid?: string;
  agentRunnerStartedAt?: string;
  createdAt: string;
  updatedAt: string;
  lastActivityAt: string;
};
