import { Module } from '@nestjs/common';
import { CommonModule } from '../common/common.module';
import { AgentRunnerService } from './agent-runner.service';
import { AgentsGateway } from '../websockets/agents.gateway';

@Module({
  imports: [CommonModule],
  providers: [AgentRunnerService, AgentsGateway],
  exports: [AgentRunnerService, AgentsGateway],
})
export class AgentsModule {}
