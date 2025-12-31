/**
 * Types shared between frontend and backend
 */

export type WorkspaceStatus = 'creating' | 'starting' | 'running' | 'paused' | 'stopping' | 'stopped' | 'error';

export interface WorkspaceConfig {
  id: string;
  name: string;
  taskId: string;
  mountPath: string;
  containerId?: string;
  containerName?: string;
  status: WorkspaceStatus;
  createdAt?: string;
  lastActivityAt?: string;
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

export interface ToolCall {
  tool: string;
  name?: string;
  arguments: Record<string, unknown>;
  result?: unknown;
  timestamp?: string;
}

export interface ExecutionResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  timestamp: string;
}

export interface SystemStats {
  total: number;
  running: number;
  paused: number;
  stopped: number;
  error: number;
}
