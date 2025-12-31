import { Module } from '@nestjs/common';
import { ChatGateway } from './chat.gateway';
import { LogsGateway } from './logs.gateway';
import { WorkspaceManagerProvider } from '../common/workspace-manager.provider';

@Module({
  providers: [ChatGateway, LogsGateway, WorkspaceManagerProvider],
  exports: [ChatGateway, LogsGateway],
})
export class WebsocketsModule {}
