import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { EventEmitter } from 'node:events';
import { Server, Socket } from 'socket.io';

type AgentSessionInfo = {
  workspaceId: string;
  taskId: string;
  socketId: string;
};

type AgentRegisterPayload = {
  workspaceId: string;
  taskId: string;
  clientType?: 'runner' | 'hook';
};

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
export class AgentsGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(AgentsGateway.name);
  private readonly sessionsByTaskId = new Map<string, AgentSessionInfo>();
  private readonly sessionsBySocketId = new Map<string, AgentSessionInfo>();
  private readonly emitter = new EventEmitter();

  afterInit() {
    this.logger.log('Agents Gateway initialized');
  }

  handleConnection(client: Socket) {
    this.logger.log(`Agent client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    const session = this.sessionsBySocketId.get(client.id);
    if (session) {
      this.sessionsBySocketId.delete(client.id);
      const existing = this.sessionsByTaskId.get(session.taskId);
      if (existing?.socketId === client.id) this.sessionsByTaskId.delete(session.taskId);
      this.emitter.emit('agent.disconnected', session);
    }
    this.logger.log(`Agent client disconnected: ${client.id}`);
  }

  private room(workspaceId: string, taskId: string) {
    return `agent:${workspaceId}:${taskId}`;
  }

  hasSession(taskId: string): boolean {
    return this.sessionsByTaskId.has(taskId);
  }

  async waitForSession(taskId: string, timeoutMs: number): Promise<AgentSessionInfo> {
    const existing = this.sessionsByTaskId.get(taskId);
    if (existing) return existing;

    return await new Promise<AgentSessionInfo>((resolve, reject) => {
      const onRegistered = (session: AgentSessionInfo) => {
        if (session.taskId !== taskId) return;
        cleanup();
        resolve(session);
      };

      const timer = setTimeout(() => {
        cleanup();
        reject(new Error('timeout waiting for agent session'));
      }, timeoutMs);

      const cleanup = () => {
        clearTimeout(timer);
        this.emitter.off('agent.registered', onRegistered);
      };

      this.emitter.on('agent.registered', onRegistered);
    });
  }

  async sendCommand(workspaceId: string, taskId: string, cmd: unknown): Promise<void> {
    this.server.to(this.room(workspaceId, taskId)).emit('agent.command', cmd);
  }

  onAgentEvent(handler: (info: AgentSessionInfo, evt: any) => void): () => void {
    const wrapped = (info: AgentSessionInfo, evt: any) => handler(info, evt);
    this.emitter.on('agent.event', wrapped);
    return () => this.emitter.off('agent.event', wrapped);
  }

  @SubscribeMessage('agent.register')
  handleRegister(
    @MessageBody() data: AgentRegisterPayload,
    @ConnectedSocket() client: Socket
  ) {
    if (!data?.workspaceId || !data?.taskId) return;

    const clientType: 'runner' | 'hook' =
      data?.clientType === 'hook' ? 'hook' : 'runner';

    const session: AgentSessionInfo = {
      workspaceId: data.workspaceId,
      taskId: data.taskId,
      socketId: client.id,
    };

    this.sessionsBySocketId.set(session.socketId, session);

    if (clientType === 'runner') {
      this.sessionsByTaskId.set(session.taskId, session);
      client.join(this.room(session.workspaceId, session.taskId));
    }

    this.logger.log(
      `Agent registered: ${session.workspaceId}/${session.taskId} type=${clientType} (socket=${client.id})`
    );
    this.emitter.emit('agent.registered', session);
  }

  @SubscribeMessage('agent.event')
  handleAgentEvent(@MessageBody() evt: any, @ConnectedSocket() client: Socket) {
    const session = this.sessionsBySocketId.get(client.id);
    if (!session) return;

    const type = typeof evt?.type === 'string' ? evt.type : '(unknown)';
    const correlationId =
      typeof evt?.correlationId === 'string' ? evt.correlationId : undefined;

    if (type === 'agent.hook') {
      const hookEventName = (evt?.payload as any)?.hookEventName ?? null;
      this.logger.log(
        `Agent hook: ${session.workspaceId}/${session.taskId} event=${hookEventName ?? 'unknown'}`
      );
    } else {
      this.logger.debug(
        `Agent event: ${session.workspaceId}/${session.taskId} type=${type}${
          correlationId ? ` correlationId=${correlationId}` : ''
        }`
      );
    }
    this.emitter.emit('agent.event', session, evt);
  }
}
