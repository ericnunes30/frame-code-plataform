import { Injectable, NotFoundException } from '@nestjs/common';
import { WorkspaceManagerProvider } from '../common/workspace-manager.provider';
import { CreateWorkspaceDto } from './dto';

@Injectable()
export class WorkspacesService {
  constructor(private readonly platform: WorkspaceManagerProvider) {}

  private get workspaces() {
    return this.platform.getWorkspaces();
  }

  private get tasks() {
    return this.platform.getTasks();
  }

  async findAll() {
    return this.workspaces.listWorkspaces();
  }

  async findOne(id: string) {
    const workspace = await this.workspaces.getWorkspace(id);
    if (!workspace) {
      throw new NotFoundException(`Workspace ${id} not found`);
    }
    return workspace;
  }

  async create(dto: CreateWorkspaceDto) {
    return await this.workspaces.createWorkspace({
      name: dto.name,
      repoUrl: dto.repoUrl,
      defaultBranch: dto.defaultBranch,
    });
  }

  async remove(id: string) {
    const ws = await this.workspaces.getWorkspace(id);
    if (!ws) {
      throw new NotFoundException(`Workspace ${id} not found`);
    }
    await this.workspaces.deleteWorkspace(id);
    return { success: true };
  }

  async stopAllTasks(workspaceId: string) {
    const ws = await this.workspaces.getWorkspace(workspaceId);
    if (!ws) throw new NotFoundException(`Workspace ${workspaceId} not found`);

    const tasks = await this.tasks.listTasks(workspaceId);
    const stoppable = tasks.filter((t) => t.status === 'running' || t.status === 'creating');

    const errors: Array<{ taskId: string; error: string }> = [];
    let stopped = 0;

    for (const task of stoppable) {
      try {
        await this.tasks.stopTask(task.taskId);
        stopped++;
      } catch (e) {
        errors.push({ taskId: task.taskId, error: e instanceof Error ? e.message : String(e) });
      }
    }

    return { workspaceId, stopped, total: tasks.length, errors };
  }

  async startWorkspace(workspaceId: string) {
    const ws = await this.workspaces.getWorkspace(workspaceId);
    if (!ws) throw new NotFoundException(`Workspace ${workspaceId} not found`);

    const tasks = await this.tasks.listTasks(workspaceId);
    const candidates = tasks
      .filter((t) => t.status === 'paused' || t.status === 'stopped' || t.status === 'error')
      .sort((a, b) => b.lastActivityAt.localeCompare(a.lastActivityAt));

    if (candidates.length > 0) {
      const started = await this.tasks.startTask(candidates[0].taskId);
      return { workspaceId, action: 'started', taskId: started.taskId, task: started };
    }

    const created = await this.tasks.createTask(workspaceId, { title: 'New Task' });
    return { workspaceId, action: 'created', taskId: created.taskId, task: created };
  }
}
