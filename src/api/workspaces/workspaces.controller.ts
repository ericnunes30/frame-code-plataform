import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  Query,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import { WorkspacesService } from './workspaces.service';
import { CreateWorkspaceDto, ExecuteCommandDto } from './dto';

@Controller('workspaces')
export class WorkspacesController {
  constructor(private readonly workspacesService: WorkspacesService) {}

  @Get()
  findAll(
    @Query('status') status?: string,
    @Query('taskId') taskId?: string
  ) {
    return this.workspacesService.findAll(
      status || taskId ? { status: status as any, taskId } : undefined
    );
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.workspacesService.findOne(id);
  }

  @Post()
  create(@Body() createWorkspaceDto: CreateWorkspaceDto) {
    return this.workspacesService.create(createWorkspaceDto);
  }

  @Post(':id/start')
  async start(@Param('id') id: string) {
    return this.workspacesService.start(id);
  }

  @Post(':id/stop')
  async stop(@Param('id') id: string) {
    return this.workspacesService.stop(id);
  }

  @Post(':id/pause')
  async pause(@Param('id') id: string) {
    return this.workspacesService.pause(id);
  }

  @Post(':id/resume')
  async resume(@Param('id') id: string) {
    return this.workspacesService.resume(id);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.workspacesService.remove(id);
  }

  @Get(':id/logs')
  async getLogs(
    @Param('id') id: string,
    @Query('tail', new DefaultValuePipe(100), ParseIntPipe) tail?: number
  ) {
    const logs = await this.workspacesService.getLogs(id, tail);
    return { logs };
  }

  @Post(':id/execute')
  async execute(@Param('id') id: string, @Body() executeCommandDto: ExecuteCommandDto) {
    return this.workspacesService.execute(id, executeCommandDto);
  }
}
