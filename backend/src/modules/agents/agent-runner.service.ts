import { Injectable, Logger } from '@nestjs/common';
import path from 'node:path';
import { WorkspaceManagerProvider } from '../common/workspace-manager.provider';
import { AgentRunnerClient, type AgentEventEnvelope } from './agent-runner.client';

type AgentAdapter = 'codex' | 'claude' | 'echo';

type ActiveSession = {
  client: AgentRunnerClient;
  lastUsedAt: number;
};

@Injectable()
export class AgentRunnerService {
  private readonly logger = new Logger(AgentRunnerService.name);
  private readonly sessions = new Map<string, ActiveSession>(); // key: chatId(taskId)

  constructor(private readonly platform: WorkspaceManagerProvider) {}

  private getRunnerDir(): string {
    const configured = process.env.AGENT_RUNNER_DIR;
    if (configured) return configured;
    return path.resolve(process.cwd(), '..', 'agent-runner');
  }

  private getDefaultAdapter(): AgentAdapter {
    const v = (process.env.DEFAULT_AGENT_ADAPTER || 'echo').toLowerCase();
    if (v === 'codex' || v === 'claude' || v === 'echo') return v;
    return 'echo';
  }

  private async ensureSession(workspaceId: string, chatId: string, adapter?: AgentAdapter): Promise<AgentRunnerClient> {
    const existing = this.sessions.get(chatId);
    if (existing) {
      existing.lastUsedAt = Date.now();
      return existing.client;
    }

    const task = await this.platform.getTasks().getTask(chatId);
    if (!task) throw new Error(`Task/Chat ${chatId} not found`);
    if (task.workspaceId !== workspaceId) throw new Error(`Task ${chatId} does not belong to workspace ${workspaceId}`);

    const client = new AgentRunnerClient({
      runnerDir: this.getRunnerDir(),
      adapter: adapter || this.getDefaultAdapter(),
      repoPath: task.repoPath,
      workspaceId,
      taskId: chatId,
      mcpAllowlist: [],
    });

    client.on('event', (evt: AgentEventEnvelope) => {
      if (evt.type === 'agent.error') {
        this.logger.warn(`agent-runner error (chatId=${chatId}): ${JSON.stringify(evt.payload)}`);
      }
    });

    client.on('exit', ({ code, signal }) => {
      this.logger.warn(`agent-runner exited (chatId=${chatId}) code=${code} signal=${signal}`);
      this.sessions.delete(chatId);
    });

    await client.start();
    this.sessions.set(chatId, { client, lastUsedAt: Date.now() });

    return client;
  }

  async sendAndWaitForAssistantMessage(params: {
    workspaceId: string;
    chatId: string;
    content: string;
    adapter?: AgentAdapter;
    timeoutMs?: number;
  }): Promise<{ id: string; content: string }> {
    const timeoutMs = params.timeoutMs ?? 30_000;
    const client = await this.ensureSession(params.workspaceId, params.chatId, params.adapter);

    const correlationId = crypto.randomUUID();

    const result = await new Promise<{ id: string; content: string }>((resolve, reject) => {
      const onEvent = (evt: AgentEventEnvelope) => {
        if (evt.correlationId !== correlationId) return;
        if (evt.type !== 'chat.message') return;
        const payload = evt.payload as any;
        const message = payload?.message;
        if (!message || message.role !== 'assistant') return;
        cleanup();
        resolve({ id: message.id || crypto.randomUUID(), content: message.content || '' });
      };

      const onExit = () => {
        cleanup();
        reject(new Error('agent-runner exited'));
      };

      const timer = setTimeout(() => {
        cleanup();
        reject(new Error('agent-runner timeout'));
      }, timeoutMs);

      const cleanup = () => {
        clearTimeout(timer);
        client.off('event', onEvent);
        client.off('exit', onExit);
      };

      client.on('event', onEvent);
      client.on('exit', onExit);

      client
        .send({
          id: correlationId,
          type: 'agent.chat.send',
          payload: {
            chatId: params.chatId,
            message: {
              id: crypto.randomUUID(),
              role: 'user',
              content: params.content,
              timestamp: Date.now(),
            },
          },
        })
        .catch(err => {
          cleanup();
          reject(err);
        });
    });

    const s = this.sessions.get(params.chatId);
    if (s) s.lastUsedAt = Date.now();
    return result;
  }
}

