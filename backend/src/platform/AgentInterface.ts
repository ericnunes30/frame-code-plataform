/**
 * Interfaces para integração com Agentes externos (pacotes npm)
 *
 * O agente externo deve implementar a interface AgentProcessor
 * e ser registrado no AgentService durante a inicialização da aplicação.
 */

import { SessionMessage, ToolCall, WorkspaceStatus } from './types';

/**
 * Interface que o agente externo deve implementar
 */
export interface AgentProcessor {
  /**
   * Processa uma mensagem do usuário e retorna uma resposta
   */
  processMessage(request: AgentRequest): Promise<AgentResponse>;

  /**
   * Registra uma tool disponível para o agente usar
   */
  registerTool(tool: AgentTool): void;

  /**
   * Notifica quando o agente está processando (para typing indicator)
   */
  onProcessingStateChange(callback: (isProcessing: boolean) => void): void;
}

/**
 * Request enviada ao agente para processamento
 */
export interface AgentRequest {
  /** ID do workspace */
  workspaceId: string;
  /** Mensagem do usuário */
  userMessage: SessionMessage;
  /** Histórico de conversas */
  conversationHistory: SessionMessage[];
  /** Tools disponíveis para o agente usar */
  availableTools: AgentTool[];
  /** Contexto do workspace */
  workspaceContext: {
    /** Path de montagem do workspace */
    mountPath: string;
    /** ID do container Docker */
    containerId?: string;
    /** Status atual do workspace */
    status: WorkspaceStatus;
  };
}

/**
 * Resposta do agente ao processar uma mensagem
 */
export interface AgentResponse {
  /** Mensagem de resposta */
  message: SessionMessage;
  /** Tools chamadas durante o processamento */
  toolCalls?: ToolCall[];
  /** Indica se o agente ainda está processando (para typing indicator) */
  isProcessing?: boolean;
}

/**
 * Interface de uma tool que o agente pode usar
 */
export interface AgentTool {
  /** Nome único da tool */
  name: string;
  /** Descrição da tool (para o LLM) */
  description: string;
  /** Schema JSON da tool (para validação) */
  schema: Record<string, unknown>;
  /** Função de execução da tool */
  execute(params: unknown): Promise<unknown>;
}

/**
 * Evento de mudança de estado de processamento
 */
export interface ProcessingStateEvent {
  workspaceId: string;
  isProcessing: boolean;
  timestamp: Date;
}

/**
 * Erro lançado pelo agente durante processamento
 */
export class AgentError extends Error {
  constructor(
    message: string,
    public code: string,
    public workspaceId?: string
  ) {
    super(message);
    this.name = 'AgentError';
  }
}
