import { Injectable, NotFoundException } from '@nestjs/common';
import { WorkspaceManagerProvider } from '../common/workspace-manager.provider';
import { AddMessageDto } from './dto';
import { SessionMessage } from '../../platform/types';

@Injectable()
export class SessionsService {
  constructor(private readonly workspaceManagerProvider: WorkspaceManagerProvider) {}

  private get manager() {
    return this.workspaceManagerProvider.getManager();
  }

  private get sessionManager() {
    return this.manager.getSessionManager();
  }

  async getMessages(workspaceId: string) {
    return await this.sessionManager.getMessages(workspaceId);
  }

  async addMessage(workspaceId: string, addMessageDto: AddMessageDto) {
    const message: SessionMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: addMessageDto.content,
      timestamp: new Date(),
    };

    await this.sessionManager.addMessage(workspaceId, message);
    return message;
  }

  async exportSession(workspaceId: string) {
    const data = await this.sessionManager.exportSession(workspaceId);
    return { data };
  }
}
