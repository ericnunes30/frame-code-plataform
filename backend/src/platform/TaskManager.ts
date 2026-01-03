import { promises as fs } from 'fs';
import path from 'path';
import { PlatformConfig, DockerError } from './types';
import type { Task, TaskStatus } from './models';
import { DockerWorkspace } from './DockerWorkspace';
import { ChatManager } from './ChatManager';
import { WorkspaceStore } from './WorkspaceStore';

export class TaskManager {
  constructor(
    private readonly config: PlatformConfig,
    private readonly docker: DockerWorkspace,
    private readonly workspaces: WorkspaceStore,
    private readonly chats: ChatManager
  ) {}

  private getTasksDir(workspaceId: string): string {
    return path.join(this.config.workspaceBaseDir, workspaceId, 'tasks');
  }

  private getTaskDir(workspaceId: string, taskId: string): string {
    return path.join(this.getTasksDir(workspaceId), taskId);
  }

  private getTaskPath(workspaceId: string, taskId: string): string {
    return path.join(this.getTaskDir(workspaceId, taskId), 'task.json');
  }

  private getTaskRepoPath(workspaceId: string, taskId: string): string {
    return path.join(this.getTaskDir(workspaceId, taskId), 'repo');
  }

  async listTasks(workspaceId: string): Promise<Task[]> {
    const tasksDir = this.getTasksDir(workspaceId);

    try {
      const entries = await fs.readdir(tasksDir, { withFileTypes: true });
      const dirs = entries.filter(e => e.isDirectory()).map(e => e.name);

      const tasks: Task[] = [];
      for (const taskId of dirs) {
        const t = await this.getTask(taskId);
        if (t && t.workspaceId === workspaceId) tasks.push(t);
      }

      return tasks.sort((a, b) => b.lastActivityAt.localeCompare(a.lastActivityAt));
    } catch {
      return [];
    }
  }

  async getTask(taskId: string): Promise<Task | null> {
    // Scan all workspaces (ok for now; early project)
    const base = this.config.workspaceBaseDir;
    const workspaces = await this.workspaces.listWorkspaces();

    for (const ws of workspaces) {
      try {
        const data = await fs.readFile(this.getTaskPath(ws.id, taskId), 'utf-8');
        return JSON.parse(data) as Task;
      } catch {
        // continue
      }
    }

    return null;
  }

  private async saveTask(task: Task): Promise<void> {
    const taskDir = this.getTaskDir(task.workspaceId, task.taskId);
    await fs.mkdir(taskDir, { recursive: true });
    await fs.writeFile(this.getTaskPath(task.workspaceId, task.taskId), JSON.stringify(task, null, 2), 'utf-8');
  }

  async createTask(workspaceId: string, params: { title: string; branch?: string }): Promise<Task> {
    const workspace = await this.workspaces.getWorkspace(workspaceId);
    if (!workspace) {
      throw new Error(`Workspace ${workspaceId} not found`);
    }

    // Use chatId as taskId to unify concepts.
    const chat = await this.chats.createChat(workspaceId, params.title);
    const taskId = chat.chatId;

    const repoPath = this.getTaskRepoPath(workspaceId, taskId);
    await fs.mkdir(repoPath, { recursive: true });

    const now = new Date().toISOString();
    const image = this.config.docker.image || this.config.defaultImage;

    const task: Task = {
      taskId,
      workspaceId,
      title: params.title,
      status: 'creating',
      image,
      repoPath,
      branch: params.branch,
      createdAt: now,
      updatedAt: now,
      lastActivityAt: now,
    };

    await this.saveTask(task);

    // Create and start container
    const containerId = await this.docker.createTaskContainer({
      taskId,
      image,
      repoPath,
      networkMode: this.config.docker.networkMode,
      env: {
        ...this.config.docker.environment,
        WORKSPACE_ID: workspaceId,
        TASK_ID: taskId,
        PLATFORM_WS_URL: process.env.PLATFORM_WS_URL || 'http://host.docker.internal:3000/ws',
        PLATFORM_API_URL: process.env.PLATFORM_API_URL || 'http://host.docker.internal:3000/api/v1',
        ...(process.env.ANTHROPIC_API_KEY ? { ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY } : {}),
        ...(process.env.ANTHROPIC_AUTH_TOKEN ? { ANTHROPIC_AUTH_TOKEN: process.env.ANTHROPIC_AUTH_TOKEN } : {}),
        ...(process.env.ANTHROPIC_AUTH_TOKEN && !process.env.ANTHROPIC_API_KEY
          ? { ANTHROPIC_API_KEY: process.env.ANTHROPIC_AUTH_TOKEN }
          : {}),
        ...(process.env.ANTHROPIC_BASE_URL ? { ANTHROPIC_BASE_URL: process.env.ANTHROPIC_BASE_URL } : {}),
      },
    });

    task.containerId = containerId;
    task.status = 'running';
    task.updatedAt = new Date().toISOString();
    await this.saveTask(task);

    // Prepare repo inside container (git clone into /repo or init).
    await this.prepareRepoInContainer(task, workspace.repoUrl, params.branch || workspace.defaultBranch);

    // Configure Claude Code hooks + start the agent-runner inside the task container.
    await this.setupAgentInContainer(task);

    return task;
  }

  private async prepareRepoInContainer(task: Task, repoUrl?: string, branch?: string): Promise<void> {
    if (!task.containerId) return;

    const workDir = '/repo';

    if (repoUrl) {
      const branchArg = branch ? `--branch ${branch}` : '';
      const cmd = `git clone ${branchArg} ${repoUrl} .`;
      const result = await this.docker.execCommand(task.containerId, ['bash', '-lc', cmd], { workDir });
      if (result.exitCode !== 0) {
        throw new DockerError(`Failed to clone repo: ${result.stderr || result.stdout}`, 'REPO_CLONE_FAILED', task.containerId);
      }
      return;
    }

    const init = await this.docker.execCommand(task.containerId, ['bash', '-lc', 'git init'], { workDir });
    if (init.exitCode !== 0) {
      throw new DockerError(`Failed to init repo: ${init.stderr || init.stdout}`, 'REPO_INIT_FAILED', task.containerId);
    }
  }

  async listAllTasks(): Promise<Task[]> {
    const allWorkspaces = await this.workspaces.listWorkspaces();
    let allTasks: Task[] = [];

    for (const ws of allWorkspaces) {
      const tasks = await this.listTasks(ws.id);
      allTasks = allTasks.concat(tasks);
    }

    return allTasks.sort((a, b) => b.lastActivityAt.localeCompare(a.lastActivityAt));
  }

  async stopTask(taskId: string): Promise<Task> {
    const task = await this.getTask(taskId);
    if (!task) throw new Error(`Task ${taskId} not found`);

    if (task.containerId) {
      await this.docker.pauseContainer(task.containerId);
    }

    task.status = task.containerId ? 'paused' : 'stopped';
    task.updatedAt = new Date().toISOString();
    task.lastActivityAt = task.updatedAt;
    await this.saveTask(task);

    return task;
  }

  private async setupAgentInContainer(task: Task): Promise<void> {
    if (!task.containerId) return;

    const wsUrl = process.env.PLATFORM_WS_URL || 'http://host.docker.internal:3000/ws';
    const adapter = (process.env.DEFAULT_AGENT_ADAPTER || 'claude').toLowerCase();

    // 1) Ensure project settings exist for Claude Code hooks.
    const settingsJson = JSON.stringify(
      {
        hooks: {
          SessionStart: [
            {
              matcher: '.*',
              hooks: [{ type: 'command', command: 'node /opt/agent-runner/dist/hookClient.js' }],
            },
          ],
          UserPromptSubmit: [
            {
              matcher: '.*',
              hooks: [{ type: 'command', command: 'node /opt/agent-runner/dist/hookClient.js' }],
            },
          ],
          PreToolUse: [
            {
              matcher: '.*',
              hooks: [{ type: 'command', command: 'node /opt/agent-runner/dist/hookClient.js' }],
            },
          ],
          PostToolUse: [
            {
              matcher: '.*',
              hooks: [{ type: 'command', command: 'node /opt/agent-runner/dist/hookClient.js' }],
            },
          ],
        },
      },
      null,
      2
    );

    const writeSettings = [
      'bash',
      '-lc',
      [
        'set -euo pipefail',
        // Ensure /repo is writable by the non-root user used to run Claude Code.
        'id dev >/dev/null 2>&1 || true',
        'chown -R dev:dev /repo || true',
        'mkdir -p /repo/.claude',
        `cat > /repo/.claude/settings.local.json <<'JSON'\n${settingsJson}\nJSON`,
        'chown -R dev:dev /repo/.claude || true',
      ].join('\n'),
    ];

    await this.docker.execCommand(task.containerId, writeSettings, { workDir: '/repo', timeout: 10_000 });

    // 2) Start runner in the background (idempotency is handled by the backend gateway/session logic).
    const startRunner = [
      'bash',
      '-lc',
      [
        'set -euo pipefail',
        `export PLATFORM_WS_URL='${wsUrl}'`,
        `export WORKSPACE_ID='${task.workspaceId}'`,
        `export TASK_ID='${task.taskId}'`,
        // Run the runner as non-root ("dev") so the claude CLI can use --dangerously-skip-permissions.
        // docker exec output is NOT part of docker logs, so force stdout/stderr to PID1 fds.
        `nohup su -s /bin/bash dev -c \"agent-runner --mode ws --adapter ${adapter} --ws-url '${wsUrl}' --workspace-id '${task.workspaceId}' --task-id '${task.taskId}'\" >>/proc/1/fd/1 2>>/proc/1/fd/2 & echo $!`,
      ].join('\n'),
    ];

    const res = await this.docker.execCommand(task.containerId, startRunner, { workDir: '/repo', timeout: 10_000 });
    const pid = (res.stdout || '').trim().split(/\s+/).pop();
    if (pid) task.agentRunnerPid = pid;
    task.agentRunnerStartedAt = new Date().toISOString();
    task.updatedAt = task.agentRunnerStartedAt;
    task.lastActivityAt = task.agentRunnerStartedAt;
    await this.saveTask(task);
  }

  async startTask(taskId: string): Promise<Task> {
    const task = await this.getTask(taskId);
    if (!task) throw new Error(`Task ${taskId} not found`);

    if (task.status === 'running') {
      return task; // Already running
    }

    if (task.containerId) {
      const status = await this.docker.getContainerStatus(task.containerId);
      if (status === 'paused') {
        await this.docker.unpauseContainer(task.containerId);
        task.status = 'running';
        task.updatedAt = new Date().toISOString();
        task.lastActivityAt = task.updatedAt;
        await this.saveTask(task);
        return task;
      }
      if (status === 'exited' || status === 'stopped') {
        await this.docker.startContainer(task.containerId);
        task.status = 'running';
        task.updatedAt = new Date().toISOString();
        task.lastActivityAt = task.updatedAt;
        await this.saveTask(task);
        return task;
      }
    }

    const workspace = await this.workspaces.getWorkspace(task.workspaceId);
    if (!workspace) {
      throw new Error(`Workspace ${task.workspaceId} not found for task ${taskId}`);
    }

    task.status = 'creating';
    await this.saveTask(task);

    // Re-create container from task spec
    const containerId = await this.docker.createTaskContainer({
      taskId: task.taskId,
      image: task.image,
      repoPath: task.repoPath, // This path still exists
      networkMode: this.config.docker.networkMode,
      env: this.config.docker.environment,
    });

    task.containerId = containerId;
    task.status = 'running';
    task.updatedAt = new Date().toISOString();
    await this.saveTask(task);
    
    // The repo was already cloned in the volume, so no need to prepare it again.
    
    return task;
  }


  async destroyTask(taskId: string): Promise<void> {
    const task = await this.getTask(taskId);
    if (!task) return;

    if (task.containerId) {
      try {
        await this.docker.stopContainer(task.containerId);
      } catch {
        // ignore
      }
      try {
        await this.docker.removeContainer(task.containerId, true);
      } catch {
        // ignore
      }
    }

    await fs.rm(this.getTaskDir(task.workspaceId, task.taskId), { recursive: true, force: true });
    // Chat deletion stays separate (caller decides).
  }

  async getStats() {
    const tasks = await this.listAllTasks();
    return {
      total: tasks.length,
      running: tasks.filter(t => t.status === 'running').length,
      stopped: tasks.filter(t => t.status === 'stopped' || t.status === 'paused').length,
      creating: tasks.filter(t => t.status === 'creating').length,
      error: tasks.filter(t => t.status === 'error').length,
    };
  }
}
