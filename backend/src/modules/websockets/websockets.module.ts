import { Module } from '@nestjs/common';
import { AgentsModule } from '../agents/agents.module';
import { ChatGateway } from './chat.gateway';
import { LogsGateway } from './logs.gateway';

@Module({
  imports: [AgentsModule],
  providers: [ChatGateway, LogsGateway],
  exports: [ChatGateway, LogsGateway],
})
export class WebsocketsModule {}

