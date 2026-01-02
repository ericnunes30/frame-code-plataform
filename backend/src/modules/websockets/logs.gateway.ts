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
    origin:
      process.env.NODE_ENV === 'production'
        ? process.env.FRONTEND_URL || 'http://localhost:5173'
        : true,
    credentials: true,
  },
  path: '/ws',
})
export class LogsGateway implements OnGatewayInit {
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(LogsGateway.name);
  private readonly activeLogStreams = new Map<string, Set<string>>();
  private readonly logStreams = new Map<string, NodeJS.ReadableStream & { destroy?: () => void }>();

  constructor(private readonly platform: WorkspaceManagerProvider) {}

  afterInit() {
    this.logger.log('Logs Gateway initialized');
  }

  @SubscribeMessage('logs.follow')
  async handleLogsFollow(
    @MessageBody() data: { taskId: string; tail?: number },
    @ConnectedSocket() client: Socket
  ) {
    const task = await this.platform.getTasks().getTask(data.taskId);
    if (!task?.containerId) {
      client.emit('logs.error', { taskId: data.taskId, error: 'Task container not found' });
      return;
    }

    const room = `logs:${data.taskId}`;
    client.join(room);

    if (!this.activeLogStreams.has(data.taskId)) {
      this.activeLogStreams.set(data.taskId, new Set());
    }
    this.activeLogStreams.get(data.taskId)!.add(client.id);

    client.emit('subscribed', { channel: 'logs', taskId: data.taskId });

    await this.sendInitialLogs(data.taskId, task.containerId, data.tail || 100, room);
    await this.startRealLogStream(data.taskId, task.containerId, room);

    this.logger.log(`Client ${client.id} following logs for task ${data.taskId}`);
  }

  @SubscribeMessage('logs.unfollow')
  handleLogsUnfollow(
    @MessageBody() data: { taskId: string },
    @ConnectedSocket() client: Socket
  ) {
    const room = `logs:${data.taskId}`;
    client.leave(room);

    const clients = this.activeLogStreams.get(data.taskId);
    if (clients) {
      clients.delete(client.id);

      if (clients.size === 0) {
        const stream = this.logStreams.get(data.taskId);
        if (stream) {
          stream.destroy?.();
          this.logStreams.delete(data.taskId);
          this.logger.log(`Destroyed log stream for task ${data.taskId}`);
        }
        this.activeLogStreams.delete(data.taskId);
      }
    }

    this.logger.log(`Client ${client.id} stopped following logs for task ${data.taskId}`);
  }

  private async sendInitialLogs(taskId: string, containerId: string, tail: number, room: string) {
    try {
      const logs = await this.platform.getDocker().getLogs(containerId, tail);
      this.server.to(room).emit('logs.data', {
        taskId,
        logs,
        timestamp: new Date(),
      });
    } catch (error) {
      this.logger.error(`Failed to get logs for task ${taskId}:`, error);
    }
  }

  private async startRealLogStream(taskId: string, containerId: string, room: string) {
    if (this.logStreams.has(taskId)) {
      this.logger.log(`Log stream already exists for task ${taskId}`);
      return;
    }

    try {
      const stream = await this.platform.getDocker().streamLogs(containerId, {
        follow: true,
        tail: 0,
      });

      this.logStreams.set(taskId, stream as any);

      let buffer = '';
      (stream as any).on('data', (chunk: Buffer) => {
        buffer += chunk.toString('utf-8');
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.trim()) {
            this.server.to(room).emit('logs.data', {
              taskId,
              log: line,
              timestamp: new Date(),
            });
          }
        }
      });

      (stream as any).on('error', (err: Error) => {
        this.logger.error(`Log stream error for task ${taskId}:`, err);
        this.server.to(room).emit('logs.error', {
          taskId,
          error: err.message,
        });
      });

      (stream as any).on('end', () => {
        this.logger.log(`Log stream ended for task ${taskId}`);
        this.logStreams.delete(taskId);
      });

      this.logger.log(`Started real log stream for task ${taskId}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to start log stream for task ${taskId}: ${message}`);
      this.server.to(room).emit('logs.error', {
        taskId,
        error: message,
      });
    }
  }
}
