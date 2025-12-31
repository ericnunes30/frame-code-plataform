import { Injectable } from '@nestjs/common';
import { WorkspaceManagerProvider } from '../common/workspace-manager.provider';

@Injectable()
export class SystemService {
  constructor(private readonly workspaceManagerProvider: WorkspaceManagerProvider) {}

  private get manager() {
    return this.workspaceManagerProvider.getManager();
  }

  private get docker() {
    return this.manager.getDockerWorkspace();
  }

  async getStatus() {
    const dockerAvailable = await this.docker.isDockerAvailable();
    const stats = this.manager.getStats();

    return {
      docker: dockerAvailable,
      stats,
    };
  }

  getStats() {
    return this.manager.getStats();
  }

  async purgeAll() {
    const count = await this.manager.purgeAllWorkspaces();
    return { count, message: `Purged ${count} workspaces` };
  }
}
