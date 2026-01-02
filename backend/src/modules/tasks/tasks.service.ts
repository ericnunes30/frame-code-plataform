import { Injectable, NotFoundException } from '@nestjs/common';
import { WorkspaceManagerProvider } from '../common/workspace-manager.provider';
import { CreateTaskDto } from './dto';

@Injectable()
export class TasksService {
  constructor(private readonly platform: WorkspaceManagerProvider) {}

  private get tasks() {
    return this.platform.getTasks();
  }

  private get chats() {
    return this.platform.getChats();
  }

  private get workspaces() {
    return this.platform.getWorkspaces();
  }

  async listByWorkspace(workspaceId: string) {
    const ws = await this.workspaces.getWorkspace(workspaceId);
    if (!ws) throw new NotFoundException('Workspace not found');

    return this.tasks.listTasks(workspaceId);
  }

  async listAll() {
    return this.tasks.listAllTasks();
  }

  async create(workspaceId: string, dto: CreateTaskDto) {
    const ws = await this.workspaces.getWorkspace(workspaceId);
    if (!ws) throw new NotFoundException('Workspace not found');

    return await this.tasks.createTask(workspaceId, { title: dto.title, branch: dto.branch });
  }

  async start(taskId: string) {
    return await this.tasks.startTask(taskId);
  }


  async get(taskId: string) {
    const task = await this.tasks.getTask(taskId);
    if (!task) throw new NotFoundException('Task not found');
    return task;
  }

  async stop(taskId: string) {
    return await this.tasks.stopTask(taskId);
  }

  async destroy(taskId: string) {
    const task = await this.tasks.getTask(taskId);
    if (!task) throw new NotFoundException('Task not found');

    await this.tasks.destroyTask(taskId);

    // Delete chat as well (since chatId == taskId)
    await this.chats.deleteChat(taskId);

    return { success: true };
  }

  async logs(taskId: string, tail = 100) {
    const task = await this.tasks.getTask(taskId);
    if (!task?.containerId) throw new NotFoundException('Task container not found');

    const docker = this.platform.getDocker();
    return docker.getLogs(task.containerId, tail);
  }
}
