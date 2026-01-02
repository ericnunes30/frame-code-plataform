/**
 * Gerenciador de múltiplos chats por workspace
 */

import { promises as fs } from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import {
  Chat,
  ChatIndexEntry,
  WorkspaceChatIndex,
  SessionMessage,
  SessionError,
  PlatformConfig,
} from './types';

export class ChatManager {
  private chatCache: Map<string, Chat> = new Map(); // key: chatId
  private indexCache: Map<string, WorkspaceChatIndex> = new Map(); // key: workspaceId
  private config: PlatformConfig;

  constructor(config: PlatformConfig) {
    this.config = config;
  }

  // ============================================================================
  // PATH HELPERS
  // ============================================================================

  private getChatsDir(workspaceId: string): string {
    return path.join(this.config.workspaceBaseDir, workspaceId, 'chats');
  }

  private getChatIndexPath(workspaceId: string): string {
    return path.join(this.getChatsDir(workspaceId), 'index.json');
  }

  private getChatDir(workspaceId: string, chatId: string): string {
    return path.join(this.getChatsDir(workspaceId), chatId);
  }

  private getChatHistoryPath(workspaceId: string, chatId: string): string {
    return path.join(this.getChatDir(workspaceId, chatId), 'history.json');
  }

  private getChatMetadataPath(workspaceId: string, chatId: string): string {
    return path.join(this.getChatDir(workspaceId, chatId), 'metadata.json');
  }

  // ============================================================================
  // CHAT CRUD OPERATIONS
  // ============================================================================

  /**
   * Create a new chat in a workspace
   */
  async createChat(workspaceId: string, initialTitle?: string): Promise<Chat> {
    const chatId = uuidv4();
    const now = new Date();

    const chat: Chat = {
      chatId,
      workspaceId,
      title: initialTitle || 'New Chat',
      createdAt: now,
      updatedAt: now,
      lastActivityAt: now,
      messageCount: 0,
    };

    // Cache the chat
    this.chatCache.set(chatId, chat);

    // Create chat directory and files
    await this.ensureChatDir(workspaceId, chatId);
    await this.persistChatHistory(workspaceId, chatId, []);
    await this.persistChatMetadata(workspaceId, chatId, chat);

    // Update index
    await this.addToIndex(workspaceId, chat);

    return chat;
  }

  /**
   * Get a chat by ID
   */
  async getChat(chatId: string): Promise<Chat | null> {
    // Check cache first
    if (this.chatCache.has(chatId)) {
      return this.chatCache.get(chatId)!;
    }

    // Load from disk
    const chat = await this.loadChatFromDisk(chatId);
    if (chat) {
      this.chatCache.set(chatId, chat);
    }
    return chat;
  }

  /**
   * List all chats in a workspace
   */
  async listChats(workspaceId: string): Promise<Chat[]> {
    const index = await this.loadIndex(workspaceId);
    if (!index) {
      return [];
    }

    const chats: Chat[] = [];
    for (const entry of index.chats) {
      const chat = await this.getChat(entry.chatId);
      if (chat) {
        chats.push(chat);
      }
    }

    // Sort by lastActivityAt desc
    return chats.sort((a, b) => b.lastActivityAt.getTime() - a.lastActivityAt.getTime());
  }

  /**
   * Delete a chat
   */
  async deleteChat(chatId: string): Promise<void> {
    const chat = await this.getChat(chatId);
    if (!chat) {
      throw new SessionError(`Chat ${chatId} not found`, 'CHAT_NOT_FOUND');
    }

    const workspaceId = chat.workspaceId;

    // Remove from cache
    this.chatCache.delete(chatId);

    // Remove from index
    await this.removeFromIndex(workspaceId, chatId);

    // Delete files
    const chatDir = this.getChatDir(workspaceId, chatId);
    await fs.rm(chatDir, { recursive: true, force: true });
  }

  /**
   * Update chat title
   */
  async updateChatTitle(chatId: string, newTitle: string): Promise<void> {
    const chat = await this.getChat(chatId);
    if (!chat) {
      throw new SessionError(`Chat ${chatId} not found`, 'CHAT_NOT_FOUND');
    }

    chat.title = newTitle;
    chat.updatedAt = new Date();

    await this.persistChatMetadata(chat.workspaceId, chatId, chat);
    await this.updateIndexEntry(chat.workspaceId, chat);
  }

  // ============================================================================
  // MESSAGE OPERATIONS
  // ============================================================================

  /**
   * Add a message to a chat
   */
  async addMessage(chatId: string, message: SessionMessage): Promise<void> {
    const chat = await this.getChat(chatId);
    if (!chat) {
      throw new SessionError(`Chat ${chatId} not found`, 'CHAT_NOT_FOUND');
    }

    // Ensure message has ID and timestamp
    if (!message.id) {
      message.id = uuidv4();
    }
    if (!message.timestamp) {
      message.timestamp = new Date();
    }

    // Load messages, add new one, persist
    const messages = await this.getMessages(chatId);
    messages.push(message);

    await this.persistChatHistory(chat.workspaceId, chatId, messages);

    // Update chat metadata
    chat.messageCount = messages.length;
    chat.updatedAt = new Date();
    chat.lastActivityAt = new Date();

    await this.persistChatMetadata(chat.workspaceId, chatId, chat);
    await this.updateIndexEntry(chat.workspaceId, chat);
  }

  /**
   * Get all messages for a chat
   */
  async getMessages(chatId: string): Promise<SessionMessage[]> {
    const chat = await this.getChat(chatId);
    if (!chat) {
      throw new SessionError(`Chat ${chatId} not found`, 'CHAT_NOT_FOUND');
    }

    return await this.loadChatHistory(chat.workspaceId, chatId);
  }

  /**
   * Get recent messages (for pagination)
   */
  async getRecentMessages(chatId: string, limit: number = 50, offset: number = 0): Promise<SessionMessage[]> {
    const messages = await this.getMessages(chatId);
    return messages.slice(offset, offset + limit);
  }

  // ============================================================================
  // STORAGE HELPERS
  // ============================================================================

  private async ensureChatsDir(workspaceId: string): Promise<void> {
    const dir = this.getChatsDir(workspaceId);
    await fs.mkdir(dir, { recursive: true });
  }

  private async ensureChatDir(workspaceId: string, chatId: string): Promise<void> {
    await this.ensureChatsDir(workspaceId);
    const dir = this.getChatDir(workspaceId, chatId);
    await fs.mkdir(dir, { recursive: true });
  }

  private async persistChatHistory(workspaceId: string, chatId: string, messages: SessionMessage[]): Promise<void> {
    const filePath = this.getChatHistoryPath(workspaceId, chatId);
    await fs.writeFile(filePath, JSON.stringify(messages, null, 2), 'utf-8');
  }

  private async persistChatMetadata(workspaceId: string, chatId: string, chat: Chat): Promise<void> {
    const filePath = this.getChatMetadataPath(workspaceId, chatId);
    await fs.writeFile(filePath, JSON.stringify(chat, null, 2), 'utf-8');
  }

  private async loadChatHistory(workspaceId: string, chatId: string): Promise<SessionMessage[]> {
    try {
      const filePath = this.getChatHistoryPath(workspaceId, chatId);
      const data = await fs.readFile(filePath, 'utf-8');
      const messages: SessionMessage[] = JSON.parse(data);

      // Convert timestamps
      messages.forEach(msg => {
        msg.timestamp = new Date(msg.timestamp);
      });

      return messages;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return [];
      }
      throw error;
    }
  }

  private async loadChatFromDisk(chatId: string): Promise<Chat | null> {
    // Find workspace by scanning indices
    const workspacesDir = this.config.workspaceBaseDir;
    try {
      const workspaceDirs = await fs.readdir(workspacesDir);

      for (const workspaceId of workspaceDirs) {
        try {
          const metadataPath = this.getChatMetadataPath(workspaceId, chatId);
          const data = await fs.readFile(metadataPath, 'utf-8');
          const chat: Chat = JSON.parse(data);

          // Convert dates
          chat.createdAt = new Date(chat.createdAt);
          chat.updatedAt = new Date(chat.updatedAt);
          chat.lastActivityAt = new Date(chat.lastActivityAt);

          return chat;
        } catch {
          // Chat not in this workspace
          continue;
        }
      }
    } catch {
      // Base dir doesn't exist
    }

    return null;
  }

  // ============================================================================
  // INDEX MANAGEMENT
  // ============================================================================

  private async loadIndex(workspaceId: string): Promise<WorkspaceChatIndex | null> {
    // Check cache
    if (this.indexCache.has(workspaceId)) {
      return this.indexCache.get(workspaceId)!;
    }

    try {
      const indexPath = this.getChatIndexPath(workspaceId);
      const data = await fs.readFile(indexPath, 'utf-8');
      const index: WorkspaceChatIndex = JSON.parse(data);

      this.indexCache.set(workspaceId, index);
      return index;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        // Create new index
        const newIndex: WorkspaceChatIndex = {
          workspaceId,
          chats: [],
          lastUpdatedAt: new Date().toISOString(),
        };
        await this.saveIndex(workspaceId, newIndex);
        this.indexCache.set(workspaceId, newIndex);
        return newIndex;
      }
      throw error;
    }
  }

  private async saveIndex(workspaceId: string, index: WorkspaceChatIndex): Promise<void> {
    await this.ensureChatsDir(workspaceId);
    const indexPath = this.getChatIndexPath(workspaceId);
    await fs.writeFile(indexPath, JSON.stringify(index, null, 2), 'utf-8');
    this.indexCache.set(workspaceId, index);
  }

  private async addToIndex(workspaceId: string, chat: Chat): Promise<void> {
    const index = await this.loadIndex(workspaceId);
    if (!index) return;

    const entry: ChatIndexEntry = {
      chatId: chat.chatId,
      title: chat.title,
      createdAt: chat.createdAt.toISOString(),
      updatedAt: chat.updatedAt.toISOString(),
      lastActivityAt: chat.lastActivityAt.toISOString(),
      messageCount: chat.messageCount,
    };

    index.chats.push(entry);
    index.lastUpdatedAt = new Date().toISOString();

    await this.saveIndex(workspaceId, index);
  }

  private async updateIndexEntry(workspaceId: string, chat: Chat): Promise<void> {
    const index = await this.loadIndex(workspaceId);
    if (!index) return;

    const entryIndex = index.chats.findIndex(e => e.chatId === chat.chatId);
    if (entryIndex === -1) return;

    index.chats[entryIndex] = {
      chatId: chat.chatId,
      title: chat.title,
      createdAt: chat.createdAt.toISOString(),
      updatedAt: chat.updatedAt.toISOString(),
      lastActivityAt: chat.lastActivityAt.toISOString(),
      messageCount: chat.messageCount,
    };
    index.lastUpdatedAt = new Date().toISOString();

    await this.saveIndex(workspaceId, index);
  }

  private async removeFromIndex(workspaceId: string, chatId: string): Promise<void> {
    const index = await this.loadIndex(workspaceId);
    if (!index) return;

    index.chats = index.chats.filter(e => e.chatId !== chatId);
    index.lastUpdatedAt = new Date().toISOString();

    await this.saveIndex(workspaceId, index);
  }

  // ============================================================================
  // MIGRATION
  // ============================================================================

  /**
   * Migrate existing workspace from single-chat to multi-chat
   * Called during initialization for workspaces that still have old structure
   */
  async migrateWorkspace(workspaceId: string): Promise<Chat | null> {
    const oldHistoryPath = path.join(this.config.workspaceBaseDir, workspaceId, 'chat-history.json');

    try {
      await fs.access(oldHistoryPath);
    } catch {
      // No old chat to migrate
      return null;
    }

    // Load old messages
    const oldMessages = await this.loadOldChatHistory(workspaceId);

    if (oldMessages.length === 0) {
      return null;
    }

    // Create new chat with migrated data
    const title = this.generateTitleFromMessages(oldMessages);
    const chat = await this.createChat(workspaceId, title);

    // Migrate messages
    for (const message of oldMessages) {
      await this.addMessage(chat.chatId, message);
    }

    // Rename old files with .migrated suffix
    try {
      await fs.rename(oldHistoryPath, oldHistoryPath + '.migrated');
      const oldSessionPath = path.join(this.config.workspaceBaseDir, workspaceId, 'session.json');
      await fs.rename(oldSessionPath, oldSessionPath + '.migrated');
    } catch {
      // Ignore migration backup errors
    }

    return chat;
  }

  private async loadOldChatHistory(workspaceId: string): Promise<SessionMessage[]> {
    const oldHistoryPath = path.join(this.config.workspaceBaseDir, workspaceId, 'chat-history.json');
    try {
      const data = await fs.readFile(oldHistoryPath, 'utf-8');
      const messages: SessionMessage[] = JSON.parse(data);

      // Convert timestamps
      messages.forEach(msg => {
        msg.timestamp = new Date(msg.timestamp);
      });

      return messages;
    } catch {
      return [];
    }
  }

  private generateTitleFromMessages(messages: SessionMessage[]): string {
    if (messages.length === 0) {
      return 'Migrated Chat';
    }

    // Use first user message as title
    const firstUserMsg = messages.find(m => m.role === 'user');
    if (firstUserMsg) {
      const title = firstUserMsg.content.substring(0, 50);
      return title.length < firstUserMsg.content.length ? title + '...' : title;
    }

    return 'Migrated Chat';
  }

  // ============================================================================
  // UTILITY
  // ============================================================================

  /**
   * Clear cache for a workspace (useful after bulk operations)
   */
  clearWorkspaceCache(workspaceId: string): void {
    // Remove all chats for this workspace from cache
    for (const [chatId, chat] of this.chatCache.entries()) {
      if (chat.workspaceId === workspaceId) {
        this.chatCache.delete(chatId);
      }
    }
    this.indexCache.delete(workspaceId);
  }

  /**
   * Get cached chat without loading from disk
   */
  getCachedChat(chatId: string): Chat | undefined {
    return this.chatCache.get(chatId);
  }

  /**
   * Get cached index without loading from disk
   */
  getCachedIndex(workspaceId: string): WorkspaceChatIndex | undefined {
    return this.indexCache.get(workspaceId);
  }
}
