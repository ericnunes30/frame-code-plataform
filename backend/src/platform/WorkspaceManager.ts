/**
 * Gerenciador principal de workspaces isolados
 * Orquestra a criaÃ§Ã£o, execuÃ§Ã£o e destruiÃ§Ã£o de workspaces
 */

import { promises as fs } from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { EventEmitter } from 'events';
import { DockerWorkspace } from './DockerWorkspace';
import { ChatManager } from './ChatManager';
import {
  WorkspaceConfig,
  WorkspaceStatus,
  ExecutionResult,
  CreateWorkspaceRequest,
  ExecuteCommandRequest,
  PlatformConfig,
  DockerConfig,
  WorkspaceError,
} from './types';

export class WorkspaceManager extends EventEmitter {
  private workspaces: Map<string, WorkspaceConfig> = new Map();
  private docker: DockerWorkspace;
  private chatManager: ChatManager;
  private config: PlatformConfig;

  constructor(config: PlatformConfig) {
    super();
    this.config = config;
    this.docker = new DockerWorkspace();
    this.chatManager = new ChatManager(config);
  }

  /**
   * Inicializa o gerenciador
   */
  async initialize(): Promise<void> {
    // Cria diretÃ³rio base de workspaces
    await fs.mkdir(this.config.workspaceBaseDir, { recursive: true });

    // Carrega workspaces existentes do disco
    await this.loadExistingWorkspaces();

    // Limpa workspaces expirados
    await this.cleanupExpiredWorkspaces();
  }

  /**
   * Carrega workspaces existentes do disco
   */
  private async loadExistingWorkspaces(): Promise<void> {
    try {
      const dirs = await fs.readdir(this.config.workspaceBaseDir);

      for (const dir of dirs) {
        const statePath = path.join(this.config.workspaceBaseDir, dir, 'docker-state.json');
        try {
          const data = await fs.readFile(statePath, 'utf-8');
          const workspace: WorkspaceConfig = JSON.parse(data);

          // Converte datas
          workspace.createdAt = new Date(workspace.createdAt);
          workspace.lastActivityAt = new Date(workspace.lastActivityAt);

          this.workspaces.set(workspace.id, workspace);

          // Check if migration is needed (old chat-history.json exists)
          const oldHistoryPath = path.join(this.config.workspaceBaseDir, dir, 'chat-history.json');
          try {
            await fs.access(oldHistoryPath);
            // Migrate old single-chat to multi-chat structure
            await this.chatManager.migrateWorkspace(workspace.id);
          } catch {
            // No old chat, load existing chats
            await this.chatManager.listChats(workspace.id);
          }

          // Carrega sessÃ£o associada (for backward compatibility)
        } catch {
          // Arquivo corrompido ou nÃ£o existe, ignora
        }
      }
    } catch {
      // DiretÃ³rio nÃ£o existe ainda
    }
  }

  /**
   * Salva o estado de um workspace no disco
   */
  private async persistWorkspaceState(workspaceId: string): Promise<void> {
    const workspace = this.workspaces.get(workspaceId);
    if (!workspace) {
      return;
    }

    const workspaceDir = path.join(this.config.workspaceBaseDir, workspaceId);
    await fs.mkdir(workspaceDir, { recursive: true });

    const statePath = path.join(workspaceDir, 'docker-state.json');
    await fs.writeFile(statePath, JSON.stringify(workspace, null, 2), 'utf-8');
  }

  /**
   * Define o status de um workspace e emite evento de mudanÃ§a
   */
  private async setStatus(workspaceId: string, status: WorkspaceStatus): Promise<void> {
    const workspace = this.workspaces.get(workspaceId);
    if (!workspace) {
      return;
    }

    const oldStatus = workspace.status;
    workspace.status = status;
    await this.persistWorkspaceState(workspaceId);

    // Emitir evento apenas se o status mudou
    if (oldStatus !== status) {
      this.emit('status-change', workspaceId, status, oldStatus);
    }
  }

  /**
   * Cria um novo workspace isolado para uma task
   */
  async createWorkspace(request: CreateWorkspaceRequest): Promise<WorkspaceConfig> {
    // Verifica limite de workspaces concorrentes
    const activeCount = Array.from(this.workspaces.values()).filter(
      (w) => w.status === 'running' || w.status === 'creating'
    ).length;

    if (activeCount >= this.config.maxConcurrentWorkspaces) {
      throw new WorkspaceError(
        `Maximum concurrent workspaces limit reached (${this.config.maxConcurrentWorkspaces})`,
        'MAX_WORKSPACES_REACHED'
      );
    }

    const workspaceId = uuidv4();
    const mountPath = path.join(this.config.workspaceBaseDir, workspaceId, 'workspace');

    // Prepara configuraÃ§Ã£o Docker
    const dockerConfig: DockerConfig = {
      image: request.dockerConfig?.image || this.config.defaultImage,
      dockerfilePath: request.dockerConfig?.dockerfilePath || path.join(__dirname, '../../docker/workspace/Dockerfile.workspace'),
      portBindings: request.dockerConfig?.portBindings || this.config.docker.portBindings,
      volumeBindings: request.dockerConfig?.volumeBindings || {
        [mountPath]: '/workspace',
      },
      environment: request.dockerConfig?.environment || this.config.docker.environment,
      networkMode: request.dockerConfig?.networkMode || this.config.docker.networkMode,
    };

    // Cria configuraÃ§Ã£o do workspace
    const workspace: WorkspaceConfig = {
      id: workspaceId,
      taskId: request.taskId,
      mountPath,
      status: 'creating',
      createdAt: new Date(),
      lastActivityAt: new Date(),
      dockerConfig,
    };

    this.workspaces.set(workspaceId, workspace);
    await this.persistWorkspaceState(workspaceId);

    // Cria diretÃ³rio de montagem
    await fs.mkdir(mountPath, { recursive: true });

    // Cria sessÃ£o

    return workspace;
  }

  /**
   * Inicia o container Docker do workspace
   */
  async startWorkspace(workspaceId: string): Promise<void> {
    const workspace = this.workspaces.get(workspaceId);
    if (!workspace) {
      throw new WorkspaceError(`Workspace ${workspaceId} not found`, 'WORKSPACE_NOT_FOUND', workspaceId);
    }

    if (workspace.status === 'running') {
      throw new WorkspaceError(`Workspace ${workspaceId} is already running`, 'WORKSPACE_ALREADY_RUNNING', workspaceId);
    }

    await this.setStatus(workspaceId, 'creating');

    try {
      // Cria container Docker
      const containerId = await this.docker.createContainer(workspace, workspace.dockerConfig!);
      workspace.containerId = containerId;
      workspace.lastActivityAt = new Date();

      await this.setStatus(workspaceId, 'running');
      await this.persistWorkspaceState(workspaceId);
    } catch (error) {
      await this.setStatus(workspaceId, 'error');
      throw error;
    }
  }

  /**
   * Para um workspace
   */
  async stopWorkspace(workspaceId: string): Promise<void> {
    const workspace = this.workspaces.get(workspaceId);
    if (!workspace) {
      throw new WorkspaceError(`Workspace ${workspaceId} not found`, 'WORKSPACE_NOT_FOUND', workspaceId);
    }

    if (!workspace.containerId) {
      throw new WorkspaceError(`Workspace ${workspaceId} has no container`, 'NO_CONTAINER', workspaceId);
    }

    await this.docker.stopContainer(workspace.containerId);
    workspace.lastActivityAt = new Date();

    await this.setStatus(workspaceId, 'stopped');
  }

  /**
   * Pausa um workspace
   */
  async pauseWorkspace(workspaceId: string): Promise<void> {
    const workspace = this.workspaces.get(workspaceId);
    if (!workspace) {
      throw new WorkspaceError(`Workspace ${workspaceId} not found`, 'WORKSPACE_NOT_FOUND', workspaceId);
    }

    if (!workspace.containerId) {
      throw new WorkspaceError(`Workspace ${workspaceId} has no container`, 'NO_CONTAINER', workspaceId);
    }

    await this.docker.pauseContainer(workspace.containerId);
    workspace.lastActivityAt = new Date();

    await this.setStatus(workspaceId, 'paused');
  }

  /**
   * Retoma um workspace existente
   */
  async resumeWorkspace(workspaceId: string): Promise<void> {
    const workspace = this.workspaces.get(workspaceId);
    if (!workspace) {
      throw new WorkspaceError(`Workspace ${workspaceId} not found`, 'WORKSPACE_NOT_FOUND', workspaceId);
    }

    if (!workspace.containerId) {
      throw new WorkspaceError(`Workspace ${workspaceId} has no container`, 'NO_CONTAINER', workspaceId);
    }

    if (workspace.status === 'paused') {
      await this.docker.unpauseContainer(workspace.containerId);
    } else if (workspace.status === 'stopped') {
      await this.docker.startContainer(workspace.containerId);
    }

    workspace.lastActivityAt = new Date();

    await this.setStatus(workspaceId, 'running');
  }

  /**
   * Remove um workspace e seus dados
   */
  async destroyWorkspace(workspaceId: string): Promise<void> {
    const workspace = this.workspaces.get(workspaceId);
    if (!workspace) {
      throw new WorkspaceError(`Workspace ${workspaceId} not found`, 'WORKSPACE_NOT_FOUND', workspaceId);
    }

    // Remove container se existir
    if (workspace.containerId) {
      try {
        await this.docker.removeContainer(workspace.containerId, true);
      } catch {
        // Ignora erros na remoÃ§Ã£o do container
      }
    }

    // Remove sessÃ£o

    // Clear chat cache
    this.chatManager.clearWorkspaceCache(workspaceId);

    // Remove diretÃ³rios
    const workspaceDir = path.join(this.config.workspaceBaseDir, workspaceId);
    try {
      await fs.rm(workspaceDir, { recursive: true, force: true });
    } catch {
      // Ignora erros na remoÃ§Ã£o dos arquivos
    }

    // Remove da memÃ³ria
    this.workspaces.delete(workspaceId);
  }

  /**
   * Executa um comando dentro do workspace
   */
  async executeInWorkspace(request: ExecuteCommandRequest): Promise<ExecutionResult> {
    const workspace = this.workspaces.get(request.workspaceId);
    if (!workspace) {
      throw new WorkspaceError(`Workspace ${request.workspaceId} not found`, 'WORKSPACE_NOT_FOUND', request.workspaceId);
    }

    if (!workspace.containerId) {
      throw new WorkspaceError(`Workspace ${request.workspaceId} has no container`, 'NO_CONTAINER', request.workspaceId);
    }

    if (workspace.status !== 'running') {
      throw new WorkspaceError(`Workspace ${request.workspaceId} is not running`, 'WORKSPACE_NOT_RUNNING', request.workspaceId);
    }

    const result = await this.docker.execCommand(
      workspace.containerId,
      ['sh', '-c', request.command],
      { timeout: request.timeout }
    );

    // Atualiza atividade
    workspace.lastActivityAt = new Date();
    await this.persistWorkspaceState(request.workspaceId);

    return result;
  }

  /**
   * Lista todos os workspaces
   */
  listWorkspaces(filters?: { status?: WorkspaceStatus; taskId?: string }): WorkspaceConfig[] {
    let workspaces = Array.from(this.workspaces.values());

    if (filters?.status) {
      workspaces = workspaces.filter((w) => w.status === filters.status);
    }

    if (filters?.taskId) {
      workspaces = workspaces.filter((w) => w.taskId === filters.taskId);
    }

    return workspaces.sort((a, b) => b.lastActivityAt.getTime() - a.lastActivityAt.getTime());
  }

  /**
   * ObtÃ©m o status de um workspace
   */
  getWorkspaceStatus(workspaceId: string): WorkspaceConfig | null {
    return this.workspaces.get(workspaceId) || null;
  }

  /**
   * ObtÃ©m logs do container do workspace
   */
  async getWorkspaceLogs(workspaceId: string, tail?: number): Promise<string> {
    const workspace = this.workspaces.get(workspaceId);
    if (!workspace) {
      throw new WorkspaceError(`Workspace ${workspaceId} not found`, 'WORKSPACE_NOT_FOUND', workspaceId);
    }

    if (!workspace.containerId) {
      throw new WorkspaceError(`Workspace ${workspaceId} has no container`, 'NO_CONTAINER', workspaceId);
    }

    return await this.docker.getLogs(workspace.containerId, tail);
  }

  /**
   * Limpa workspaces expirados
   */
  async cleanupExpiredWorkspaces(): Promise<number> {
    const now = Date.now();
    const toDelete: string[] = [];

    for (const [workspaceId, workspace] of this.workspaces.entries()) {
      const age = now - workspace.lastActivityAt.getTime();
      if (age > this.config.sessionTimeout) {
        toDelete.push(workspaceId);
      }
    }

    for (const workspaceId of toDelete) {
      try {
        await this.destroyWorkspace(workspaceId);
      } catch {
        // Ignora erros na limpeza
      }
    }

    return toDelete.length;
  }

  /**
   * Limpa todos os workspaces (cuidado!)
   */
  async purgeAllWorkspaces(): Promise<number> {
    const workspaceIds = Array.from(this.workspaces.keys());
    let count = 0;

    for (const workspaceId of workspaceIds) {
      try {
        await this.destroyWorkspace(workspaceId);
        count++;
      } catch {
        // Ignora erros
      }
    }

    return count;
  }

  /**
   * ObtÃ©m o gerenciador Docker
   */
  getDockerWorkspace(): DockerWorkspace {
    return this.docker;
  }

  /**
   * ObtÃ©m o gerenciador de chats
   */
  getChatManager(): ChatManager {
    return this.chatManager;
  }

  /**
   * Exporta o estado de um workspace
   */
  async exportWorkspace(workspaceId: string): Promise<string> {
    const workspace = this.workspaces.get(workspaceId);
    if (!workspace) {
      throw new WorkspaceError(`Workspace ${workspaceId} not found`, 'WORKSPACE_NOT_FOUND', workspaceId);
    }
    return JSON.stringify({ workspace }, null, 2);
  }

  /**
   * ObtÃ©m estatÃ­sticas dos workspaces
   */
  getStats(): {
    total: number;
    running: number;
    paused: number;
    stopped: number;
    error: number;
  } {
    const workspaces = Array.from(this.workspaces.values());

    return {
      total: workspaces.length,
      running: workspaces.filter((w) => w.status === 'running').length,
      paused: workspaces.filter((w) => w.status === 'paused').length,
      stopped: workspaces.filter((w) => w.status === 'stopped').length,
      error: workspaces.filter((w) => w.status === 'error').length,
    };
  }
}



