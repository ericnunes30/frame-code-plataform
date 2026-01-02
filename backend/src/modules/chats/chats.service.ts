import { Injectable, NotFoundException } from '@nestjs/common';
import { WorkspaceManagerProvider } from '../common/workspace-manager.provider';
import { AgentRunnerService } from '../agents/agent-runner.service';
import { CreateChatDto, UpdateChatTitleDto, AddMessageDto } from './dto';
import { SessionError, SessionMessage } from '../../platform/types';

function isChatNotFoundError(err: unknown): boolean {
  if (err instanceof SessionError && err.code === 'CHAT_NOT_FOUND') return true;
  if (!err || typeof err !== 'object') return false;
  return (err as { code?: unknown }).code === 'CHAT_NOT_FOUND';
}

@Injectable()
export class ChatsService {
  constructor(
    private readonly platform: WorkspaceManagerProvider,
    private readonly agentRunner: AgentRunnerService
  ) {}

  private get workspaces() {
    return this.platform.getWorkspaces();
  }

  private get chatManager() {
    return this.platform.getChats();
  }

  private get taskManager() {
    return this.platform.getTasks();
  }

  async listChats(workspaceId: string) {
    return await this.chatManager.listChats(workspaceId);
  }

  async getChat(chatId: string) {
    const chat = await this.chatManager.getChat(chatId);
    if (!chat) {
      throw new NotFoundException('Chat not found');
    }
    return chat;
  }

  async createChat(workspaceId: string, createChatDto: CreateChatDto) {
    const workspace = await this.workspaces.getWorkspace(workspaceId);
    if (!workspace) {
      throw new NotFoundException('Workspace not found');
    }

    // In this platform version, chat == task. Creating a chat provisions a task container + repo copy.
    const task = await this.taskManager.createTask(workspaceId, { title: createChatDto.title ?? 'New Task' });
    const chat = await this.chatManager.getChat(task.taskId);
    if (!chat) {
      throw new NotFoundException('Chat not found after task creation');
    }
    return chat;
  }

  async updateChatTitle(chatId: string, updateChatTitleDto: UpdateChatTitleDto) {
    try {
      await this.chatManager.updateChatTitle(chatId, updateChatTitleDto.title);
      return { success: true };
    } catch (err) {
      if (isChatNotFoundError(err)) {
        throw new NotFoundException('Chat not found');
      }
      throw err;
    }
  }

  async deleteChat(chatId: string) {
    await this.taskManager.destroyTask(chatId);
    try {
      await this.chatManager.deleteChat(chatId);
    } catch (err) {
      if (isChatNotFoundError(err)) {
        throw new NotFoundException('Chat not found');
      }
      throw err;
    }
  }

  async getMessages(chatId: string) {
    try {
      return await this.chatManager.getMessages(chatId);
    } catch (err) {
      if (isChatNotFoundError(err)) {
        throw new NotFoundException('Chat not found');
      }
      throw err;
    }
  }

  async addMessage(chatId: string, addMessageDto: AddMessageDto) {
    const message: SessionMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: addMessageDto.content,
      timestamp: new Date(),
    };

    try {
      await this.chatManager.addMessage(chatId, message);
      return message;
    } catch (err) {
      if (isChatNotFoundError(err)) {
        throw new NotFoundException('Chat not found');
      }
      throw err;
    }
  }

  async addMessageAndRunAgent(chatId: string, addMessageDto: AddMessageDto) {
    const userMessage = await this.addMessage(chatId, addMessageDto);

    const chat = await this.chatManager.getChat(chatId);
    if (!chat) throw new NotFoundException('Chat not found');

    const assistant = await this.agentRunner.sendAndWaitForAssistantMessage({
      workspaceId: chat.workspaceId,
      chatId,
      content: addMessageDto.content,
    });

    const agentMessage: SessionMessage = {
      id: assistant.id || crypto.randomUUID(),
      role: 'agent',
      content: assistant.content,
      timestamp: new Date(),
    };

    try {
      await this.chatManager.addMessage(chatId, agentMessage);
    } catch (err) {
      if (isChatNotFoundError(err)) {
        throw new NotFoundException('Chat not found');
      }
      throw err;
    }

    return { userMessage, agentMessage };
  }
}

