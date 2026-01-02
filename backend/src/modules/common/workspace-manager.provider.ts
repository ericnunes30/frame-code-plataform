/**
 * Platform Provider
 * Exposes core managers for NestJS modules.
 */

import { Injectable, OnModuleInit } from '@nestjs/common';
import path from 'path';
import { PlatformConfig } from '../../platform/types';
import { DockerWorkspace } from '../../platform/DockerWorkspace';
import { ChatManager } from '../../platform/ChatManager';
import { WorkspaceStore } from '../../platform/WorkspaceStore';
import { TaskManager } from '../../platform/TaskManager';

@Injectable()
export class WorkspaceManagerProvider implements OnModuleInit {
  private readonly config: PlatformConfig;
  private readonly docker: DockerWorkspace;
  private readonly workspaces: WorkspaceStore;
  private readonly chats: ChatManager;
  private readonly tasks: TaskManager;

  constructor() {
    const workspaceBaseDir =
      process.env.WORKSPACE_BASE_DIR || path.resolve(process.cwd(), '..', '.workspace');

    this.config = {
      defaultImage: process.env.DEFAULT_DOCKER_IMAGE || 'frame-code/workspace-ubuntu:latest',
      workspaceBaseDir,
      autoCleanup: process.env.AUTO_CLEANUP === 'true',
      sessionTimeout: parseInt(process.env.SESSION_TIMEOUT || '86400000', 10),
      maxConcurrentWorkspaces: parseInt(process.env.MAX_CONCURRENT_WORKSPACES || '5', 10),
      docker: {
        image: process.env.DEFAULT_DOCKER_IMAGE || 'frame-code/workspace-ubuntu:latest',
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
        path: workspaceBaseDir,
        compression: true,
      },
    };

    this.docker = new DockerWorkspace();
    this.workspaces = new WorkspaceStore(this.config);
    this.chats = new ChatManager(this.config);
    this.tasks = new TaskManager(this.config, this.docker, this.workspaces, this.chats);
  }

  async onModuleInit() {
    await this.workspaces.initialize();
    // ChatManager and TaskManager are filesystem-based; no extra init required.
    // Docker availability will be checked lazily when creating tasks.
  }

  getConfig(): PlatformConfig {
    return this.config;
  }

  getDocker(): DockerWorkspace {
    return this.docker;
  }

  getWorkspaces(): WorkspaceStore {
    return this.workspaces;
  }

  getChats(): ChatManager {
    return this.chats;
  }

  getTasks(): TaskManager {
    return this.tasks;
  }
}

