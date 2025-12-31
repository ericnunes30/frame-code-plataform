/**
 * Gerenciador principal de workspaces isolados
 * Orquestra a criação, execução e destruição de workspaces
 */

import { promises as fs } from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { DockerWorkspace } from './DockerWorkspace';
import { SessionManager } from './SessionManager';
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

export class WorkspaceManager {
  private workspaces: Map<string, WorkspaceConfig> = new Map();
  private docker: DockerWorkspace;
  private sessionManager: SessionManager;
  private config: PlatformConfig;

  constructor(config: PlatformConfig) {
    this.config = config;
    this.docker = new DockerWorkspace();
    this.sessionManager = new SessionManager(config);
  }

  /**
   * Inicializa o gerenciador
   */
  async initialize(): Promise<void> {
    // Cria diretório base de workspaces
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

          // Carrega sessão associada
          await this.sessionManager.loadSession(workspace.id);
        } catch {
          // Arquivo corrompido ou não existe, ignora
        }
      }
    } catch {
      // Diretório não existe ainda
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

    // Prepara configuração Docker
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

    // Cria configuração do workspace
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

    // Cria diretório de montagem
    await fs.mkdir(mountPath, { recursive: true });

    // Cria sessão
    await this.sessionManager.createSession(workspaceId, request.taskId);

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

    workspace.status = 'creating';
    await this.persistWorkspaceState(workspaceId);

    try {
      // Cria container Docker
      const containerId = await this.docker.createContainer(workspace, workspace.dockerConfig!);
      workspace.containerId = containerId;
      workspace.status = 'running';
      workspace.lastActivityAt = new Date();

      await this.persistWorkspaceState(workspaceId);
    } catch (error) {
      workspace.status = 'error';
      await this.persistWorkspaceState(workspaceId);
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
    workspace.status = 'stopped';
    workspace.lastActivityAt = new Date();

    await this.persistWorkspaceState(workspaceId);
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
    workspace.status = 'paused';
    workspace.lastActivityAt = new Date();

    await this.persistWorkspaceState(workspaceId);
    await this.sessionManager.updateStatus(workspaceId, 'paused');
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

    workspace.status = 'running';
    workspace.lastActivityAt = new Date();

    await this.persistWorkspaceState(workspaceId);
    await this.sessionManager.updateStatus(workspaceId, 'active');
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
        // Ignora erros na remoção do container
      }
    }

    // Remove sessão
    await this.sessionManager.deleteSession(workspaceId);

    // Remove diretórios
    const workspaceDir = path.join(this.config.workspaceBaseDir, workspaceId);
    try {
      await fs.rm(workspaceDir, { recursive: true, force: true });
    } catch {
      // Ignora erros na remoção dos arquivos
    }

    // Remove da memória
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
    await this.sessionManager.updateActivity(request.workspaceId);

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
   * Obtém o status de um workspace
   */
  getWorkspaceStatus(workspaceId: string): WorkspaceConfig | null {
    return this.workspaces.get(workspaceId) || null;
  }

  /**
   * Obtém logs do container do workspace
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
   * Obtém o gerenciador de sessões
   */
  getSessionManager(): SessionManager {
    return this.sessionManager;
  }

  /**
   * Obtém o gerenciador Docker
   */
  getDockerWorkspace(): DockerWorkspace {
    return this.docker;
  }

  /**
   * Exporta o estado de um workspace
   */
  async exportWorkspace(workspaceId: string): Promise<string> {
    const workspace = this.workspaces.get(workspaceId);
    if (!workspace) {
      throw new WorkspaceError(`Workspace ${workspaceId} not found`, 'WORKSPACE_NOT_FOUND', workspaceId);
    }

    const session = await this.sessionManager.exportSession(workspaceId);

    return JSON.stringify({
      workspace,
      session,
    }, null, 2);
  }

  /**
   * Obtém estatísticas dos workspaces
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
