import { Module } from '@nestjs/common';
import { WorkspacesController } from './workspaces.controller';
import { WorkspacesService } from './workspaces.service';
import { WorkspaceManagerProvider } from '../common/workspace-manager.provider';

@Module({
  controllers: [WorkspacesController],
  providers: [WorkspacesService, WorkspaceManagerProvider],
  exports: [WorkspacesService, WorkspaceManagerProvider],
})
export class WorkspacesModule {}
