import { Injectable, Logger } from '@nestjs/common';
import path from 'node:path';
import { WorkspaceManagerProvider } from '../common/workspace-manager.provider';
import type { AgentEventEnvelope } from './agent-runner.client';
import { AgentsGateway } from '../websockets/agents.gateway';

type AgentAdapter = 'codex' | 'claude' | 'echo';

@Injectable()
export class AgentRunnerService {
  private readonly logger = new Logger(AgentRunnerService.name);

  constructor(
    private readonly platform: WorkspaceManagerProvider,
    private readonly agentsGateway: AgentsGateway
  ) {}

  private getRunnerDir(): string {
    const configured = process.env.AGENT_RUNNER_DIR;
    if (configured) return configured;
    return path.resolve(process.cwd(), '..', 'agent-runner');
  }

  private getDefaultAdapter(): AgentAdapter {
    const v = (process.env.DEFAULT_AGENT_ADAPTER || 'claude').toLowerCase();
    if (v === 'codex' || v === 'claude' || v === 'echo') return v;
    return 'claude';
  }

  private getPlatformWsUrl(): string {
    return process.env.PLATFORM_WS_URL || 'http://host.docker.internal:3000/ws';
  }

  private async ensureRunnerInTaskContainer(params: {
    workspaceId: string;
    taskId: string;
    adapter?: AgentAdapter;
  }): Promise<void> {
    if (this.agentsGateway.hasSession(params.taskId)) return;

    const task = await this.platform.getTasks().getTask(params.taskId);
    if (!task) throw new Error(`Task/Chat ${params.taskId} not found`);
    if (task.workspaceId !== params.workspaceId) throw new Error(`Task ${params.taskId} does not belong to workspace ${params.workspaceId}`);
    if (!task.containerId) throw new Error(`Task ${params.taskId} has no containerId`);

    const wsUrl = this.getPlatformWsUrl();
    const adapter = params.adapter || this.getDefaultAdapter();

    // If the runner is already reconnecting (e.g. backend restart), give it a brief window.
    try {
      await this.agentsGateway.waitForSession(params.taskId, 2_000);
      return;
    } catch {
      // continue
    }

    // Start the runner as a background process inside the task container.
    // We use nohup + background to avoid holding the exec stream open.
    const cmd = [
      'bash',
      '-lc',
      [
        'set -euo pipefail',
        `export PLATFORM_WS_URL='${wsUrl}'`,
        `export WORKSPACE_ID='${params.workspaceId}'`,
        `export TASK_ID='${params.taskId}'`,
        'chown -R dev:dev /repo || true',
        `nohup su -s /bin/bash dev -c \"agent-runner --mode ws --adapter ${adapter} --ws-url '${wsUrl}' --workspace-id '${params.workspaceId}' --task-id '${params.taskId}'\" >>/proc/1/fd/1 2>>/proc/1/fd/2 &`,
        'echo "agent-runner started"',
      ].join('\n'),
    ];

    await this.platform.getDocker().execCommand(task.containerId, cmd, { workDir: '/repo', timeout: 15_000 });

    // Wait for the agent to register back to the platform.
    await this.agentsGateway.waitForSession(params.taskId, 20_000);
  }

  async sendAndWaitForAssistantMessage(params: {
    workspaceId: string;
    chatId: string;
    content: string;
    adapter?: AgentAdapter;
    timeoutMs?: number;
  }): Promise<{ id: string; content: string }> {
    const defaultTimeoutMs = Number(process.env.AGENT_RUNNER_TIMEOUT_MS || 120_000);
    const timeoutMs = params.timeoutMs ?? (Number.isFinite(defaultTimeoutMs) ? defaultTimeoutMs : 120_000);

    await this.ensureRunnerInTaskContainer({
      workspaceId: params.workspaceId,
      taskId: params.chatId,
      adapter: params.adapter,
    });

    // Ensure the runner session is started before sending chat to avoid out-of-order delivery.
    const startCorrelationId = crypto.randomUUID();
    await new Promise<void>((resolve, reject) => {
      const stop = this.agentsGateway.onAgentEvent((info, evt: AgentEventEnvelope) => {
        if (info.taskId !== params.chatId) return;
        if (evt?.correlationId !== startCorrelationId) return;
        if (evt.type === 'agent.error') {
          cleanup();
          const payload = evt.payload as any;
          reject(new Error(payload?.message || 'agent-runner error during session start'));
          return;
        }
        if (evt.type !== 'agent.status') return;
        const text = (evt.payload as any)?.text ?? '';
        if (typeof text !== 'string') return;
        if (!text.toLowerCase().includes('session started')) return;
        cleanup();
        resolve();
      });

      const timer = setTimeout(() => {
        cleanup();
        reject(new Error('agent-runner session start timeout'));
      }, 10_000);

      const cleanup = () => {
        clearTimeout(timer);
        stop();
      };

      void this.agentsGateway.sendCommand(params.workspaceId, params.chatId, {
        id: startCorrelationId,
        type: 'agent.session.start',
        payload: {
          taskId: params.chatId,
          workspaceId: params.workspaceId,
          repoPath: '/repo',
          adapter: (params.adapter || this.getDefaultAdapter()) as any,
          mcpAllowlist: [],
        },
      });
    });

    const correlationId = crypto.randomUUID();

    const result = await new Promise<{ id: string; content: string }>((resolve, reject) => {
      const stop = this.agentsGateway.onAgentEvent((info, evt: AgentEventEnvelope) => {
        if (info.taskId !== params.chatId) return;
        if (evt?.correlationId !== correlationId) return;

        if (evt.type === 'agent.error') {
          cleanup();
          const payload = evt.payload as any;
          reject(new Error(payload?.message || 'agent-runner error'));
          return;
        }
        if (evt.type !== 'chat.message') return;
        const payload = evt.payload as any;
        const message = payload?.message;
        if (!message || message.role !== 'assistant') return;
        cleanup();
        resolve({ id: message.id || crypto.randomUUID(), content: message.content || '' });
      });

      const timer = setTimeout(() => {
        cleanup();
        reject(new Error('agent-runner timeout'));
      }, timeoutMs);

      const cleanup = () => {
        clearTimeout(timer);
        stop();
      };

      void this.agentsGateway.sendCommand(params.workspaceId, params.chatId, {
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
      });
    });
    return result;
  }
}
