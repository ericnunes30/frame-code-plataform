import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayInit,
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
export class LogsGateway implements OnGatewayInit {
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(LogsGateway.name);
  private readonly activeLogStreams = new Map<string, Set<string>>();

  constructor(private readonly workspaceManagerProvider: WorkspaceManagerProvider) {}

  afterInit(server: Server) {
    this.logger.log('Logs Gateway initialized');
  }

  @SubscribeMessage('logs.follow')
  handleLogsFollow(
    @MessageBody() data: { workspaceId: string; tail?: number },
    @ConnectedSocket() client: Socket
  ) {
    const room = `logs:${data.workspaceId}`;

    // Add to room
    client.join(room);

    // Track client
    if (!this.activeLogStreams.has(data.workspaceId)) {
      this.activeLogStreams.set(data.workspaceId, new Set());
    }
    this.activeLogStreams.get(data.workspaceId)!.add(client.id);

    // Send acknowledgment
    client.emit('subscribed', { channel: 'logs', workspaceId: data.workspaceId });

    // Send initial logs
    this.sendInitialLogs(data.workspaceId, data.tail || 100, room);

    // Start streaming logs (mock for now)
    this.startLogStream(data.workspaceId, room);

    this.logger.log(`Client ${client.id} following logs for ${data.workspaceId}`);
  }

  @SubscribeMessage('logs.unfollow')
  handleLogsUnfollow(
    @MessageBody() data: { workspaceId: string },
    @ConnectedSocket() client: Socket
  ) {
    const room = `logs:${data.workspaceId}`;

    // Remove from room
    client.leave(room);

    // Stop tracking
    const clients = this.activeLogStreams.get(data.workspaceId);
    if (clients) {
      clients.delete(client.id);
      if (clients.size === 0) {
        this.activeLogStreams.delete(data.workspaceId);
      }
    }

    this.logger.log(`Client ${client.id} stopped following logs for ${data.workspaceId}`);
  }

  private async sendInitialLogs(workspaceId: string, tail: number, room: string) {
    try {
      const manager = this.workspaceManagerProvider.getManager();
      const logs = await manager.getWorkspaceLogs(workspaceId, tail);

      this.server.to(room).emit('logs.data', {
        workspaceId,
        logs,
        timestamp: new Date(),
      });
    } catch (error) {
      this.logger.error(`Failed to get logs for ${workspaceId}:`, error);
    }
  }

  private startLogStream(workspaceId: string, room: string) {
    // TODO: Implement actual log streaming from Docker container
    // For now, this is a placeholder

    // Example: poll logs every 2 seconds
    const interval = setInterval(async () => {
      const clients = this.activeLogStreams.get(workspaceId);
      if (!clients || clients.size === 0) {
        clearInterval(interval);
        return;
      }

      // In a real implementation, you would:
      // 1. Attach to the Docker container's log stream
      // 2. Emit new log lines as they arrive
      // 3. Handle disconnections

      // Mock: send a heartbeat
      this.server.to(room).emit('logs.heartbeat', {
        workspaceId,
        timestamp: new Date(),
      });
    }, 2000);
  }

  /**
   * Broadcast logs to all clients following a workspace
   */
  broadcastLogs(workspaceId: string, logs: string) {
    const room = `logs:${workspaceId}`;
    this.server.to(room).emit('logs.data', {
      workspaceId,
      logs,
      timestamp: new Date(),
    });
  }
}
