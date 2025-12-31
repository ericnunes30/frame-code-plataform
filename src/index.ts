/**
 * Frame-Code-Platform
 * Sistema de workspace isolado por task com Docker
 *
 * Exporta todos os componentes principais
 */

// Platform
export { WorkspaceManager } from './platform/WorkspaceManager';
export { DockerWorkspace } from './platform/DockerWorkspace';
export { SessionManager } from './platform/SessionManager';

// Types
export {
  type WorkspaceConfig,
  type WorkspaceStatus,
  type ExecutionResult,
  type DockerConfig,
  type PlatformConfig,
  type PersistConfig,
  type CreateWorkspaceRequest,
  type ExecuteCommandRequest,
  type WorkspaceSession,
  type SessionStatus,
  type SessionMessage,
  type ToolCall,
  type AskUserParams,
  type AskUserResult,
  WorkspaceError,
  DockerError,
  SessionError,
} from './platform/types';

// Tools
export { AskUserTool, createAskUserTool } from './infrastructure/tools/AskUserTool';

// CLI commands
export { registerWorkspaceCommands } from './cli/commands/workspace';
