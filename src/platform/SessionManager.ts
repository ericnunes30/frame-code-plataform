/**
 * Gerenciador de sessões com chat history para workspaces
 */

import { promises as fs } from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import {
  WorkspaceSession,
  SessionMessage,
  SessionStatus,
  SessionError,
  PlatformConfig,
} from './types';

export class SessionManager {
  private sessions: Map<string, WorkspaceSession> = new Map();
  private config: PlatformConfig;

  constructor(config: PlatformConfig) {
    this.config = config;
  }

  /**
   * Obtém o path do diretório de sessão
   */
  private getSessionDir(workspaceId: string): string {
    return path.join(this.config.workspaceBaseDir, workspaceId);
  }

  /**
   * Obtém o path do arquivo de sessão
   */
  private getSessionFilePath(workspaceId: string): string {
    return path.join(this.getSessionDir(workspaceId), 'session.json');
  }

  /**
   * Obtém o path do arquivo de chat history
   */
  private getChatHistoryPath(workspaceId: string): string {
    return path.join(this.getSessionDir(workspaceId), 'chat-history.json');
  }

  /**
   * Cria o diretório de workspace se não existir
   */
  private async ensureWorkspaceDir(workspaceId: string): Promise<void> {
    const dir = this.getSessionDir(workspaceId);
    await fs.mkdir(dir, { recursive: true });
  }

  /**
   * Cria uma nova sessão para um workspace
   */
  async createSession(workspaceId: string, taskId: string): Promise<WorkspaceSession> {
    const session: WorkspaceSession = {
      workspaceId,
      taskId,
      messages: [],
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date(),
      lastActivityAt: new Date(),
    };

    this.sessions.set(workspaceId, session);
    await this.persistSession(workspaceId);

    return session;
  }

  /**
   * Adiciona uma mensagem à sessão
   */
  async addMessage(workspaceId: string, message: SessionMessage): Promise<void> {
    const session = this.sessions.get(workspaceId);
    if (!session) {
      throw new SessionError(`Session not found for workspace ${workspaceId}`, 'SESSION_NOT_FOUND', workspaceId);
    }

    // Garante que a mensagem tem um ID
    if (!message.id) {
      message.id = uuidv4();
    }

    // Garante timestamp
    if (!message.timestamp) {
      message.timestamp = new Date();
    }

    session.messages.push(message);
    session.updatedAt = new Date();
    session.lastActivityAt = new Date();

    await this.persistSession(workspaceId);
  }

  /**
   * Obtém o histórico de mensagens de um workspace
   */
  async getMessages(workspaceId: string): Promise<SessionMessage[]> {
    const session = this.sessions.get(workspaceId);
    if (!session) {
      // Tenta carregar do disco
      const loaded = await this.loadSession(workspaceId);
      if (loaded) {
        return loaded.messages;
      }
      throw new SessionError(`Session not found for workspace ${workspaceId}`, 'SESSION_NOT_FOUND', workspaceId);
    }

    return session.messages;
  }

  /**
   * Obtém a última mensagem de um determinado role
   */
  async getLastMessage(workspaceId: string, role?: SessionMessage['role']): Promise<SessionMessage | null> {
    const messages = await this.getMessages(workspaceId);
    const filtered = role ? messages.filter((m) => m.role === role) : messages;
    return filtered.length > 0 ? filtered[filtered.length - 1] : null;
  }

  /**
   * Obtém mensagens desde um determinado timestamp
   */
  async getMessagesSince(workspaceId: string, since: Date): Promise<SessionMessage[]> {
    const messages = await this.getMessages(workspaceId);
    return messages.filter((m) => m.timestamp >= since);
  }

  /**
   * Atualiza o status da sessão
   */
  async updateStatus(workspaceId: string, status: SessionStatus): Promise<void> {
    const session = this.sessions.get(workspaceId);
    if (!session) {
      throw new SessionError(`Session not found for workspace ${workspaceId}`, 'SESSION_NOT_FOUND', workspaceId);
    }

    session.status = status;
    session.updatedAt = new Date();
    session.lastActivityAt = new Date();

    await this.persistSession(workspaceId);
  }

  /**
   * Atualiza a atividade da sessão
   */
  async updateActivity(workspaceId: string): Promise<void> {
    const session = this.sessions.get(workspaceId);
    if (!session) {
      throw new SessionError(`Session not found for workspace ${workspaceId}`, 'SESSION_NOT_FOUND', workspaceId);
    }

    session.lastActivityAt = new Date();
    await this.persistSession(workspaceId);
  }

  /**
   * Salva o estado da sessão em disco
   */
  async persistSession(workspaceId: string): Promise<void> {
    const session = this.sessions.get(workspaceId);
    if (!session) {
      throw new SessionError(`Session not found for workspace ${workspaceId}`, 'SESSION_NOT_FOUND', workspaceId);
    }

    await this.ensureWorkspaceDir(workspaceId);

    // Salva sessão principal
    const sessionPath = this.getSessionFilePath(workspaceId);
    await fs.writeFile(sessionPath, JSON.stringify(session, null, 2), 'utf-8');

    // Salva chat history separadamente (mais eficiente para leituras parciais)
    const chatPath = this.getChatHistoryPath(workspaceId);
    await fs.writeFile(chatPath, JSON.stringify(session.messages, null, 2), 'utf-8');
  }

  /**
   * Carrega uma sessão do disco
   */
  async loadSession(workspaceId: string): Promise<WorkspaceSession | null> {
    try {
      const sessionPath = this.getSessionFilePath(workspaceId);
      const data = await fs.readFile(sessionPath, 'utf-8');
      const session: WorkspaceSession = JSON.parse(data);

      // Converte strings de data de volta para objetos Date
      session.createdAt = new Date(session.createdAt);
      session.updatedAt = new Date(session.updatedAt);
      session.lastActivityAt = new Date(session.lastActivityAt);

      // Converte timestamps das mensagens
      session.messages.forEach((msg) => {
        msg.timestamp = new Date(msg.timestamp);
        if (msg.toolCalls) {
          msg.toolCalls.forEach((tc) => {
            if (tc.timestamp) {
              tc.timestamp = new Date(tc.timestamp as unknown as Date);
            }
          });
        }
      });

      this.sessions.set(workspaceId, session);
      return session;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return null;
      }
      throw error;
    }
  }

  /**
   * Carrega apenas o chat history (mais leve)
   */
  async loadChatHistory(workspaceId: string): Promise<SessionMessage[]> {
    try {
      const chatPath = this.getChatHistoryPath(workspaceId);
      const data = await fs.readFile(chatPath, 'utf-8');
      const messages: SessionMessage[] = JSON.parse(data);

      // Converte timestamps
      messages.forEach((msg) => {
        msg.timestamp = new Date(msg.timestamp);
        if (msg.toolCalls) {
          msg.toolCalls.forEach((tc) => {
            if (tc.timestamp) {
              tc.timestamp = new Date(tc.timestamp as unknown as Date);
            }
          });
        }
      });

      return messages;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return [];
      }
      throw error;
    }
  }

  /**
   * Remove uma sessão da memória e do disco
   */
  async deleteSession(workspaceId: string): Promise<void> {
    this.sessions.delete(workspaceId);

    const sessionDir = this.getSessionDir(workspaceId);
    try {
      await fs.rm(sessionDir, { recursive: true, force: true });
    } catch (error) {
      // Ignora erros de diretório não encontrado
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw error;
      }
    }
  }

  /**
   * Lista todas as sessões em memória
   */
  listSessions(): WorkspaceSession[] {
    return Array.from(this.sessions.values());
  }

  /**
   * Obtém uma sessão específica
   */
  getSession(workspaceId: string): WorkspaceSession | undefined {
    return this.sessions.get(workspaceId);
  }

  /**
   * Verifica se uma sessão está ativa
   */
  isSessionActive(workspaceId: string): boolean {
    const session = this.sessions.get(workspaceId);
    return session?.status === 'active';
  }

  /**
   * Verifica se uma sessão expirou
   */
  isSessionExpired(workspaceId: string): boolean {
    const session = this.sessions.get(workspaceId);
    if (!session) {
      return false;
    }

    const now = Date.now();
    const lastActivity = session.lastActivityAt.getTime();
    return now - lastActivity > this.config.sessionTimeout;
  }

  /**
   * Limpa sessões antigas baseado em TTL
   */
  async cleanupOldSessions(maxAge?: number): Promise<number> {
    const timeout = maxAge || this.config.sessionTimeout;
    const now = Date.now();
    const toDelete: string[] = [];

    // Verifica sessões na memória
    for (const [workspaceId, session] of this.sessions.entries()) {
      const age = now - session.lastActivityAt.getTime();
      if (age > timeout) {
        toDelete.push(workspaceId);
      }
    }

    // Verifica sessões no disco
    try {
      const dirs = await fs.readdir(this.config.workspaceBaseDir);
      for (const dir of dirs) {
        const workspaceId = dir;
        if (this.sessions.has(workspaceId)) {
          continue; // Já verificou na memória
        }

        const sessionPath = this.getSessionFilePath(workspaceId);
        try {
          const stats = await fs.stat(sessionPath);
          const age = now - stats.mtimeMs;
          if (age > timeout) {
            toDelete.push(workspaceId);
          }
        } catch {
          // Arquivo não existe ou não pode ser lido
        }
      }
    } catch {
      // Diretório base não existe ainda
    }

    // Remove sessões antigas
    for (const workspaceId of toDelete) {
      await this.deleteSession(workspaceId);
    }

    return toDelete.length;
  }

  /**
   * Exporta uma sessão para formato string
   */
  async exportSession(workspaceId: string): Promise<string> {
    const session = this.sessions.get(workspaceId);
    if (!session) {
      throw new SessionError(`Session not found for workspace ${workspaceId}`, 'SESSION_NOT_FOUND', workspaceId);
    }

    return JSON.stringify(session, null, 2);
  }

  /**
   * Importa uma sessão de formato string
   */
  async importSession(workspaceId: string, data: string): Promise<WorkspaceSession> {
    const session: WorkspaceSession = JSON.parse(data);

    // Valida que a sessão é para o workspace correto
    if (session.workspaceId !== workspaceId) {
      throw new SessionError(
        `Session workspace ID mismatch: expected ${workspaceId}, got ${session.workspaceId}`,
        'SESSION_MISMATCH',
        workspaceId
      );
    }

    // Converte strings de data
    session.createdAt = new Date(session.createdAt);
    session.updatedAt = new Date(session.updatedAt);
    session.lastActivityAt = new Date(session.lastActivityAt);
    session.messages.forEach((msg) => {
      msg.timestamp = new Date(msg.timestamp);
      if (msg.toolCalls) {
        msg.toolCalls.forEach((tc) => {
          if (tc.timestamp) {
            tc.timestamp = new Date(tc.timestamp as unknown as Date);
          }
        });
      }
    });

    this.sessions.set(workspaceId, session);
    await this.persistSession(workspaceId);

    return session;
  }
}
