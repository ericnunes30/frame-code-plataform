import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { WorkspaceManagerProvider } from '../common/workspace-manager.provider';

function isChatNotFoundError(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  return (err as { code?: unknown }).code === 'CHAT_NOT_FOUND';
}

@WebSocketGateway({
  cors: {
    origin:
      process.env.NODE_ENV === 'production'
        ? process.env.FRONTEND_URL || 'http://localhost:5173'
        : true,
    credentials: true,
  },
  path: '/ws',
})
export class ChatGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(ChatGateway.name);
  private readonly workspaceRooms = new Map<string, Set<string>>();

  constructor(private readonly platform: WorkspaceManagerProvider) {}

  afterInit() {
    this.logger.log('WebSocket Gateway initialized');
  }

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);

    for (const [workspaceId, clients] of this.workspaceRooms.entries()) {
      clients.delete(client.id);
      if (clients.size === 0) {
        this.workspaceRooms.delete(workspaceId);
      }
    }
  }

  @SubscribeMessage('subscribe')
  handleSubscribe(
    @MessageBody() data: { channel: string; workspaceId: string; chatId?: string },
    @ConnectedSocket() client: Socket
  ) {
    if (data.channel !== 'chat') return;

    const chatId = data.chatId || 'default';
    const room = `chat:${data.workspaceId}:${chatId}`;

    client.join(room);

    if (!this.workspaceRooms.has(data.workspaceId)) {
      this.workspaceRooms.set(data.workspaceId, new Set());
    }
    this.workspaceRooms.get(data.workspaceId)!.add(client.id);

    client.emit('subscribed', {
      channel: data.channel,
      workspaceId: data.workspaceId,
      chatId,
    });

    this.logger.log(`Client ${client.id} subscribed to ${room}`);
  }

  @SubscribeMessage('unsubscribe')
  handleUnsubscribe(
    @MessageBody() data: { channel: string; workspaceId: string; chatId?: string },
    @ConnectedSocket() client: Socket
  ) {
    if (data.channel !== 'chat') return;

    const chatId = data.chatId || 'default';
    const room = `chat:${data.workspaceId}:${chatId}`;

    client.leave(room);

    const clients = this.workspaceRooms.get(data.workspaceId);
    if (clients) {
      clients.delete(client.id);
      if (clients.size === 0) {
        this.workspaceRooms.delete(data.workspaceId);
      }
    }

    this.logger.log(`Client ${client.id} unsubscribed from ${room}`);
  }

  @SubscribeMessage('chat.send')
  async handleChatMessage(
    @MessageBody() data: { workspaceId: string; chatId: string; content: string },
    @ConnectedSocket() client: Socket
  ) {
    const room = `chat:${data.workspaceId}:${data.chatId}`;
    const chatManager = this.platform.getChats();

    const userMessage = {
      id: crypto.randomUUID(),
      role: 'user' as const,
      content: data.content,
      timestamp: new Date(),
    };

    try {
      await chatManager.addMessage(data.chatId, userMessage);
    } catch (err) {
      if (isChatNotFoundError(err)) {
        client.emit('chat.error', { code: 'CHAT_NOT_FOUND', message: 'Chat not found', chatId: data.chatId });
        return;
      }
      throw err;
    }

    this.server.to(room).emit('chat.message', {
      type: 'chat.message',
      workspaceId: data.workspaceId,
      chatId: data.chatId,
      message: userMessage,
    });

    this.logger.log(`Chat message from ${client.id} in workspace ${data.workspaceId}, chat ${data.chatId}`);

    // Simulação temporária até integração real do agente.
    setTimeout(async () => {
      const agentMessage = {
        id: crypto.randomUUID(),
        role: 'agent' as const,
        content: `Agent not integrated yet. Echo: ${data.content}`,
        timestamp: new Date(),
      };

      try {
        await chatManager.addMessage(data.chatId, agentMessage);
      } catch (err) {
        if (isChatNotFoundError(err)) {
          return;
        }
        throw err;
      }

      this.server.to(room).emit('chat.message', {
        type: 'chat.message',
        workspaceId: data.workspaceId,
        chatId: data.chatId,
        message: agentMessage,
      });
    }, 300);
  }
}
