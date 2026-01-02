/**
 * Tipos base para o sistema de workspace isolado por task
 */

// ============================================================================
// CONFIGURAÇÕES
// ============================================================================

/**
 * Configuração do Docker para workspace
 */
export interface DockerConfig {
  /** Imagem base (ex: node:20-alpine) */
  image: string;
  /** Path para Dockerfile customizado */
  dockerfilePath: string;
  /** Opcional: docker-compose para serviços */
  composeFile?: string;
  /** Mapeamento de portas */
  portBindings?: Record<string, string>;
  /** Mapeamento de volumes */
  volumeBindings?: Record<string, string>;
  /** Variáveis de ambiente */
  environment?: Record<string, string>;
  /** Modo de rede */
  networkMode?: string;
}

/**
 * Configuração de persistência
 */
export interface PersistConfig {
  /** Persistência habilitada */
  enabled: boolean;
  /** Path para armazenamento */
  path: string;
  /** Compressão de dados */
  compression?: boolean;
}

/**
 * Configuração completa da plataforma
 */
export interface PlatformConfig {
  /** Imagem Docker padrão */
  defaultImage: string;
  /** Diretório base dos workspaces */
  workspaceBaseDir: string;
  /** Limpeza automática */
  autoCleanup: boolean;
  /** Timeout de sessão em ms */
  sessionTimeout: number;
  /** Máximo de workspaces concorrentes */
  maxConcurrentWorkspaces: number;
  /** Configurações do Docker */
  docker: DockerConfig;
  /** Configurações de persistência */
  persist: PersistConfig;
}

// ============================================================================
// WORKSPACE
// ============================================================================

/**
 * Status do workspace
 */
export type WorkspaceStatus =
  | 'creating'
  | 'running'
  | 'paused'
  | 'stopped'
  | 'error';

/**
 * Configuração do workspace
 */
export interface WorkspaceConfig {
  /** ID único do workspace */
  id: string;
  /** ID da task associada */
  taskId: string;
  /** Path de montagem do workspace */
  mountPath: string;
  /** ID do container Docker */
  containerId?: string;
  /** Status atual */
  status: WorkspaceStatus;
  /** Data de criação */
  createdAt: Date;
  /** Data da última atividade */
  lastActivityAt: Date;
  /** Configuração Docker utilizada */
  dockerConfig?: DockerConfig;
}

/**
 * Resultado de execução de comando
 */
export interface ExecutionResult {
  /** stdout do comando */
  stdout: string;
  /** stderr do comando */
  stderr: string;
  /** Código de saída */
  exitCode: number;
  /** Timestamp da execução */
  timestamp: Date;
}

// ============================================================================
// SESSÃO
// ============================================================================

/**
 * Status da sessão
 */
export type SessionStatus = 'active' | 'completed' | 'paused' | 'error';

/**
 * Chamada de tool registrada na mensagem
 */
export interface ToolCall {
  /** Nome da tool */
  name: string;
  /** Argumentos passados */
  arguments: Record<string, unknown>;
  /** Resultado da execução */
  result?: unknown;
  /** Timestamp da execução */
  timestamp?: Date;
}

/**
 * Mensagem da sessão (chat history)
 */
export interface SessionMessage {
  /** ID único da mensagem */
  id: string;
  /** Papel do remetente */
  role: 'user' | 'agent' | 'system';
  /** Conteúdo da mensagem */
  content: string;
  /** Timestamp da mensagem */
  timestamp: Date;
  /** Chamadas de tool associadas */
  toolCalls?: ToolCall[];
  /** Metadados adicionais */
  metadata?: Record<string, unknown>;
}

// ============================================================================
// CHAT (Múltiplos chats por workspace)
// ============================================================================

/**
 * Chat metadata
 * Representa um único chat dentro de um workspace
 */
export interface Chat {
  /** Identificador único deste chat */
  chatId: string;
  /** ID do workspace a que este chat pertence */
  workspaceId: string;
  /** Título legível (gerado automaticamente ou fornecido pelo usuário) */
  title: string;
  /** Timestamp de criação */
  createdAt: Date;
  /** Timestamp da última atualização */
  updatedAt: Date;
  /** Timestamp da última atividade */
  lastActivityAt: Date;
  /** Número de mensagens neste chat */
  messageCount: number;
  /** Opcional: ID da task que criou este chat */
  taskId?: string;
}

/**
 * Entrada do índice de chats
 * Metadados leves armazenados no índice do workspace
 */
export interface ChatIndexEntry {
  chatId: string;
  title: string;
  createdAt: string; // ISO string para armazenamento
  updatedAt: string;
  lastActivityAt: string;
  messageCount: number;
}

/**
 * Índice de chats do workspace
 * Contém metadados de todos os chats de um workspace
 */
export interface WorkspaceChatIndex {
  workspaceId: string;
  chats: ChatIndexEntry[];
  lastUpdatedAt: string;
}

/**
 * Sessão do workspace
 * @deprecated Use Chat interface instead for multi-chat support
 */
export interface WorkspaceSession {
  /** ID do workspace */
  workspaceId: string;
  /** ID da task associada */
  taskId: string;
  /** Histórico de mensagens */
  messages: SessionMessage[];
  /** Status da sessão */
  status: SessionStatus;
  /** Data de criação */
  createdAt: Date;
  /** Data da última atualização */
  updatedAt: Date;
  /** Data da última atividade */
  lastActivityAt: Date;
}

// ============================================================================
// TOOL ASK_USER
// ============================================================================

/**
 * Parâmetros para a tool ask_user
 */
export interface AskUserParams {
  /** Pergunta a fazer ao usuário */
  question: string;
  /** Opcional: fornecer opções para o usuário escolher */
  options?: string[];
  /** Opcional: valor padrão */
  default?: string;
}

/**
 * Resultado da tool ask_user
 */
export interface AskUserResult {
  /** Resposta do usuário */
  answer: string;
  /** Timestamp da resposta */
  timestamp: Date;
}

// ============================================================================
// REQUEST/RESPONSE
// ============================================================================

/**
 * Request para criar um workspace
 */
export interface CreateWorkspaceRequest {
  /** ID da task */
  taskId: string;
  /** Path opcional para montagem */
  mountPath?: string;
  /** Configuração Docker opcional */
  dockerConfig?: Partial<DockerConfig>;
}

/**
 * Request para executar comando no workspace
 */
export interface ExecuteCommandRequest {
  /** ID do workspace */
  workspaceId: string;
  /** Comando a executar */
  command: string;
  /** Timeout opcional em ms */
  timeout?: number;
}

// ============================================================================
// ERROS
// ============================================================================

/**
 * Erro de workspace
 */
export class WorkspaceError extends Error {
  constructor(
    message: string,
    public code: string,
    public workspaceId?: string
  ) {
    super(message);
    this.name = 'WorkspaceError';
  }
}

/**
 * Erro de Docker
 */
export class DockerError extends Error {
  constructor(
    message: string,
    public code: string,
    public containerId?: string
  ) {
    super(message);
    this.name = 'DockerError';
  }
}

/**
 * Erro de sessão
 */
export class SessionError extends Error {
  constructor(
    message: string,
    public code: string,
    public workspaceId?: string
  ) {
    super(message);
    this.name = 'SessionError';
  }
}
