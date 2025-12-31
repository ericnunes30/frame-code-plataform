/**
 * NestJS Root Module
 */

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { WorkspacesModule } from './workspaces/workspaces.module';
import { SessionsModule } from './sessions/sessions.module';
import { SystemModule } from './system/system.module';
import { WebsocketsModule } from './websockets/websockets.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    WorkspacesModule,
    SessionsModule,
    SystemModule,
    WebsocketsModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
