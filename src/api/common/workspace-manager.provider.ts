/**
 * Provider for WorkspaceManager
 * Makes WorkspaceManager available for dependency injection in NestJS
 */

import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { WorkspaceManager } from '../../platform/WorkspaceManager';
import { PlatformConfig } from '../../platform/types';

@Injectable()
export class WorkspaceManagerProvider implements OnModuleInit, OnModuleDestroy {
  private workspaceManager: WorkspaceManager;

  constructor() {
    // Create default platform config
    const config: PlatformConfig = {
      defaultImage: process.env.DEFAULT_DOCKER_IMAGE || 'node:20-alpine',
      workspaceBaseDir: process.env.WORKSPACE_BASE_DIR || '.workspaces',
      autoCleanup: process.env.AUTO_CLEANUP === 'true',
      sessionTimeout: parseInt(process.env.SESSION_TIMEOUT || '86400000', 10),
      maxConcurrentWorkspaces: parseInt(process.env.MAX_CONCURRENT_WORKSPACES || '5', 10),
      docker: {
        image: process.env.DEFAULT_DOCKER_IMAGE || 'node:20-alpine',
        dockerfilePath: process.env.DOCKERFILE_PATH || '',
        networkMode: process.env.DOCKER_NETWORK_MODE || 'bridge',
        portBindings: {},
        volumeBindings: {},
        environment: {
          NODE_ENV: process.env.NODE_ENV || 'development',
        },
      },
      persist: {
        enabled: true,
        path: process.env.WORKSPACE_BASE_DIR || '.workspaces',
        compression: true,
      },
    };

    this.workspaceManager = new WorkspaceManager(config);
  }

  async onModuleInit() {
    await this.workspaceManager.initialize();
    console.log('WorkspaceManager initialized');
  }

  async onModuleDestroy() {
    // Cleanup if needed
  }

  /**
   * Get the WorkspaceManager instance
   */
  getManager(): WorkspaceManager {
    return this.workspaceManager;
  }
}
