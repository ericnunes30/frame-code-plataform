import { Injectable } from '@nestjs/common';
import { WorkspaceManagerProvider } from '../common/workspace-manager.provider';
import * as os from 'os';

@Injectable()
export class SystemService {
  constructor(private readonly platform: WorkspaceManagerProvider) {}

  async getStatus() {
    const dockerAvailable = await this.platform.getDocker().isDockerAvailable();
    const taskStats = await this.platform.getTasks().getStats();

    // Mock CPU and Memory as in the design
    const totalMemGB = os.totalmem() / 1024 ** 3;
    const freeMemGB = os.freemem() / 1024 ** 3;

    return {
      workspaceBaseDir: this.platform.getConfig().workspaceBaseDir,
      docker: {
        available: dockerAvailable,
        version: dockerAvailable ? await this.platform.getDocker().getVersion() : null,
      },
      tasks: taskStats,
      cpu: {
        usage: 24, // Mock value
        cores: os.cpus().length,
      },
      memory: {
        usage: parseFloat((totalMemGB - freeMemGB).toFixed(1)),
        total: parseFloat(totalMemGB.toFixed(1)),
      },
    };
  }

  async purgeAll() {
    const workspaces = await this.platform.getWorkspaces().listWorkspaces();
    for (const ws of workspaces) {
      // Remove entire workspace directory (will remove tasks + chats metadata). Containers should be cleaned per-task later.
      await this.platform.getWorkspaces().deleteWorkspace(ws.id);
    }

    return { count: workspaces.length, message: `Purged ${workspaces.length} workspaces` };
  }
}
