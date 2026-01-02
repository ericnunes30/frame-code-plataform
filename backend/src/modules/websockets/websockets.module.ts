import { Module } from '@nestjs/common';
import { ChatGateway } from './chat.gateway';
import { LogsGateway } from './logs.gateway';

@Module({
  providers: [ChatGateway, LogsGateway],
  exports: [ChatGateway, LogsGateway],
})
export class WebsocketsModule {}
