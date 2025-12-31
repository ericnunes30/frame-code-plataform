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

@WebSocketGateway({
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
  },
  path: '/ws',
})
export class ChatGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(ChatGateway.name);
  private readonly workspaceRooms = new Map<string, Set<string>>();

  constructor(private readonly workspaceManagerProvider: WorkspaceManagerProvider) {}

  afterInit(server: Server) {
    this.logger.log('WebSocket Gateway initialized');
  }

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);

    // Remove client from all rooms
    for (const [workspaceId, clients] of this.workspaceRooms.entries()) {
      clients.delete(client.id);
      if (clients.size === 0) {
        this.workspaceRooms.delete(workspaceId);
      }
    }
  }

  @SubscribeMessage('subscribe')
  handleSubscribe(
    @MessageBody() data: { channel: string; workspaceId: string },
    @ConnectedSocket() client: Socket
  ) {
    if (data.channel === 'chat') {
      const room = `chat:${data.workspaceId}`;

      // Add to room
      client.join(room);

      // Track client
      if (!this.workspaceRooms.has(data.workspaceId)) {
        this.workspaceRooms.set(data.workspaceId, new Set());
      }
      this.workspaceRooms.get(data.workspaceId)!.add(client.id);

      // Send acknowledgment
      client.emit('subscribed', { channel: data.channel, workspaceId: data.workspaceId });

      this.logger.log(`Client ${client.id} subscribed to ${room}`);
    }
  }

  @SubscribeMessage('unsubscribe')
  handleUnsubscribe(
    @MessageBody() data: { channel: string; workspaceId: string },
    @ConnectedSocket() client: Socket
  ) {
    if (data.channel === 'chat') {
      const room = `chat:${data.workspaceId}`;

      // Remove from room
      client.leave(room);

      // Stop tracking
      const clients = this.workspaceRooms.get(data.workspaceId);
      if (clients) {
        clients.delete(client.id);
        if (clients.size === 0) {
          this.workspaceRooms.delete(data.workspaceId);
        }
      }

      this.logger.log(`Client ${client.id} unsubscribed from ${room}`);
    }
  }

  @SubscribeMessage('chat.send')
  async handleChatMessage(
    @MessageBody() data: { workspaceId: string; content: string },
    @ConnectedSocket() client: Socket
  ) {
    const room = `chat:${data.workspaceId}`;

    // Add user message
    const userMessage = {
      type: 'chat.message',
      workspaceId: data.workspaceId,
      message: {
        id: crypto.randomUUID(),
        role: 'user' as const,
        content: data.content,
        timestamp: new Date(),
      },
    };

    // Save to session
    const sessionManager = this.workspaceManagerProvider.getManager().getSessionManager();
    await sessionManager.addMessage(data.workspaceId, userMessage.message);

    // Broadcast to room
    this.server.to(room).emit('chat.message', userMessage);

    this.logger.log(`Chat message from ${client.id} in ${data.workspaceId}`);

    // TODO: Forward to agent for processing
    // For now, send a mock agent response
    setTimeout(() => {
      const agentMessage = {
        type: 'chat.message',
        workspaceId: data.workspaceId,
        message: {
          id: crypto.randomUUID(),
          role: 'agent',
          content: `Echo: ${data.content}`,
          timestamp: new Date(),
        },
      };

      this.server.to(room).emit('chat.message', agentMessage);
    }, 500);
  }

  /**
   * Send a message to all clients in a workspace room
   */
  sendToWorkspace(workspaceId: string, event: string, data: unknown) {
    const room = `chat:${workspaceId}`;
    this.server.to(room).emit(event, data);
  }
}
