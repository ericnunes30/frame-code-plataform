import { promises as fs } from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { PlatformConfig } from './types';
import type { Workspace } from './models';

export class WorkspaceStore {
  constructor(private readonly config: PlatformConfig) {}

  async initialize(): Promise<void> {
    await fs.mkdir(this.config.workspaceBaseDir, { recursive: true });
  }

  private getWorkspaceDir(workspaceId: string): string {
    return path.join(this.config.workspaceBaseDir, workspaceId);
  }

  private getWorkspacePath(workspaceId: string): string {
    return path.join(this.getWorkspaceDir(workspaceId), 'workspace.json');
  }

  async createWorkspace(params: { name: string; repoUrl?: string; defaultBranch?: string }): Promise<Workspace> {
    const workspaceId = uuidv4();
    const now = new Date().toISOString();

    const workspace: Workspace = {
      id: workspaceId,
      name: params.name,
      repoUrl: params.repoUrl,
      defaultBranch: params.defaultBranch,
      createdAt: now,
      updatedAt: now,
    };

    const workspaceDir = this.getWorkspaceDir(workspaceId);
    await fs.mkdir(workspaceDir, { recursive: true });
    await fs.writeFile(this.getWorkspacePath(workspaceId), JSON.stringify(workspace, null, 2), 'utf-8');

    return workspace;
  }

  async getWorkspace(workspaceId: string): Promise<Workspace | null> {
    try {
      const data = await fs.readFile(this.getWorkspacePath(workspaceId), 'utf-8');
      return JSON.parse(data) as Workspace;
    } catch {
      return null;
    }
  }

  async listWorkspaces(): Promise<Workspace[]> {
    try {
      const entries = await fs.readdir(this.config.workspaceBaseDir, { withFileTypes: true });
      const dirs = entries.filter(e => e.isDirectory()).map(e => e.name);

      const workspaces: Workspace[] = [];
      for (const dir of dirs) {
        const ws = await this.getWorkspace(dir);
        if (ws) workspaces.push(ws);
      }

      return workspaces;
    } catch {
      return [];
    }
  }

  async deleteWorkspace(workspaceId: string): Promise<void> {
    const workspaceDir = this.getWorkspaceDir(workspaceId);
    await fs.rm(workspaceDir, { recursive: true, force: true });
  }
}
