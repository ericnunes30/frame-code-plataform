import { Global, Module } from '@nestjs/common';
import { WorkspaceManagerProvider } from './workspace-manager.provider';

@Global()
@Module({
  providers: [WorkspaceManagerProvider],
  exports: [WorkspaceManagerProvider],
})
export class CommonModule {}
