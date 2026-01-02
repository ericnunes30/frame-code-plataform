import { Controller, Get, Post, Delete, Put, Param, Body } from '@nestjs/common';
import { ChatsService } from './chats.service';
import { CreateChatDto, UpdateChatTitleDto, AddMessageDto } from './dto';

@Controller('chats')
export class ChatsController {
  constructor(private readonly chatsService: ChatsService) {}

  /**
   * List all chats for a workspace
   * GET /chats/workspace/:workspaceId
   */
  @Get('workspace/:workspaceId')
  async listChats(@Param('workspaceId') workspaceId: string) {
    return await this.chatsService.listChats(workspaceId);
  }

  /**
   * Get a specific chat
   * GET /chats/:chatId
   */
  @Get(':chatId')
  async getChat(@Param('chatId') chatId: string) {
    return await this.chatsService.getChat(chatId);
  }

  /**
   * Create a new chat in a workspace
   * POST /chats/workspace/:workspaceId
   */
  @Post('workspace/:workspaceId')
  async createChat(
    @Param('workspaceId') workspaceId: string,
    @Body() createChatDto: CreateChatDto
  ) {
    return await this.chatsService.createChat(workspaceId, createChatDto);
  }

  /**
   * Update chat title
   * PUT /chats/:chatId/title
   */
  @Put(':chatId/title')
  async updateTitle(
    @Param('chatId') chatId: string,
    @Body() updateTitleDto: UpdateChatTitleDto
  ) {
    return await this.chatsService.updateChatTitle(chatId, updateTitleDto);
  }

  /**
   * Delete a chat
   * DELETE /chats/:chatId
   */
  @Delete(':chatId')
  async deleteChat(@Param('chatId') chatId: string) {
    await this.chatsService.deleteChat(chatId);
    return { success: true };
  }

  /**
   * Get messages for a chat
   * GET /chats/:chatId/messages
   */
  @Get(':chatId/messages')
  async getMessages(@Param('chatId') chatId: string) {
    return await this.chatsService.getMessages(chatId);
  }

  /**
   * Add a message to a chat
   * POST /chats/:chatId/messages
   */
  @Post(':chatId/messages')
  async addMessage(
    @Param('chatId') chatId: string,
    @Body() addMessageDto: AddMessageDto
  ) {
    return await this.chatsService.addMessage(chatId, addMessageDto);
  }

  /**
   * Add a message and run the agent-runner
   * POST /chats/:chatId/messages/agent
   */
  @Post(':chatId/messages/agent')
  async addMessageAndRunAgent(
    @Param('chatId') chatId: string,
    @Body() addMessageDto: AddMessageDto
  ) {
    return await this.chatsService.addMessageAndRunAgent(chatId, addMessageDto);
  }
}
