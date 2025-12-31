import { Module } from '@nestjs/common';
import { SessionsController } from './sessions.controller';
import { SessionsService } from './sessions.service';
import { WorkspaceManagerProvider } from '../common/workspace-manager.provider';

@Module({
  controllers: [SessionsController],
  providers: [SessionsService, WorkspaceManagerProvider],
  imports: [],
  exports: [SessionsService],
})
export class SessionsModule {}
