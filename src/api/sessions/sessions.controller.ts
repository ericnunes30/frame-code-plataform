import { Controller, Get, Post, Param, Body } from '@nestjs/common';
import { SessionsService } from './sessions.service';
import { AddMessageDto } from './dto';

@Controller('sessions')
export class SessionsController {
  constructor(private readonly sessionsService: SessionsService) {}

  @Get(':workspaceId')
  getMessages(@Param('workspaceId') workspaceId: string) {
    return this.sessionsService.getMessages(workspaceId);
  }

  @Post(':workspaceId/messages')
  addMessage(
    @Param('workspaceId') workspaceId: string,
    @Body() addMessageDto: AddMessageDto
  ) {
    return this.sessionsService.addMessage(workspaceId, addMessageDto);
  }

  @Get(':workspaceId/export')
  exportSession(@Param('workspaceId') workspaceId: string) {
    return this.sessionsService.exportSession(workspaceId);
  }
}
