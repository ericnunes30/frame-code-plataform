import { Injectable, NotFoundException } from '@nestjs/common';
import { WorkspaceManagerProvider } from '../common/workspace-manager.provider';
import { CreateWorkspaceDto, ExecuteCommandDto } from './dto';

@Injectable()
export class WorkspacesService {
  constructor(private readonly workspaceManagerProvider: WorkspaceManagerProvider) {}

  private get manager() {
    return this.workspaceManagerProvider.getManager();
  }

  async findAll(filters?: { status?: string; taskId?: string }) {
    return this.manager.listWorkspaces(
      filters
        ? {
            status: filters.status as any,
            taskId: filters.taskId,
          }
        : undefined
    );
  }

  async findOne(id: string) {
    const workspace = this.manager.getWorkspaceStatus(id);
    if (!workspace) {
      throw new NotFoundException(`Workspace ${id} not found`);
    }
    return workspace;
  }

  async create(createWorkspaceDto: CreateWorkspaceDto) {
    return await this.manager.createWorkspace({
      taskId: createWorkspaceDto.taskId,
      mountPath: createWorkspaceDto.mountPath,
      dockerConfig: createWorkspaceDto.dockerConfig as any,
    });
  }

  async start(id: string) {
    await this.manager.startWorkspace(id);
    return { success: true, message: 'Workspace started' };
  }

  async stop(id: string) {
    await this.manager.stopWorkspace(id);
    return { success: true, message: 'Workspace stopped' };
  }

  async pause(id: string) {
    await this.manager.pauseWorkspace(id);
    return { success: true, message: 'Workspace paused' };
  }

  async resume(id: string) {
    await this.manager.resumeWorkspace(id);
    return { success: true, message: 'Workspace resumed' };
  }

  async remove(id: string) {
    await this.manager.destroyWorkspace(id);
    return { success: true, message: 'Workspace destroyed' };
  }

  async getLogs(id: string, tail?: number) {
    return await this.manager.getWorkspaceLogs(id, tail);
  }

  async execute(id: string, executeCommandDto: ExecuteCommandDto) {
    return await this.manager.executeInWorkspace({
      workspaceId: id,
      command: executeCommandDto.command,
      timeout: executeCommandDto.timeout,
    });
  }

  getStats() {
    return this.manager.getStats();
  }
}
