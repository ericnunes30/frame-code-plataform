import { Module } from '@nestjs/common';
import { CommonModule } from '../common/common.module';
import { AgentRunnerService } from './agent-runner.service';

@Module({
  imports: [CommonModule],
  providers: [AgentRunnerService],
  exports: [AgentRunnerService],
})
export class AgentsModule {}

