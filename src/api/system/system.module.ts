import { Module } from '@nestjs/common';
import { SystemController } from './system.controller';
import { SystemService } from './system.service';
import { WorkspaceManagerProvider } from '../common/workspace-manager.provider';

@Module({
  controllers: [SystemController],
  providers: [SystemService, WorkspaceManagerProvider],
  exports: [SystemService],
})
export class SystemModule {}
