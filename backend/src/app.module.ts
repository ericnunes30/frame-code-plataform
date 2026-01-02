/**
 * NestJS Root Module
 */

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { WorkspacesModule } from './modules/workspaces/workspaces.module';
import { TasksModule } from './modules/tasks/tasks.module';
import { ChatsModule } from './modules/chats/chats.module';
import { SystemModule } from './modules/system/system.module';
import { WebsocketsModule } from './modules/websockets/websockets.module';
import { CommonModule } from './modules/common/common.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    CommonModule,
    WorkspacesModule,
    TasksModule,
    ChatsModule,
    SystemModule,
    WebsocketsModule,
  ],
})
export class AppModule {}

