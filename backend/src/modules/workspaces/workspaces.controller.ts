import { Controller, Get, Post, Delete, Param, Body } from '@nestjs/common';
import { WorkspacesService } from './workspaces.service';
import { CreateWorkspaceDto } from './dto';

@Controller('workspaces')
export class WorkspacesController {
  constructor(private readonly workspacesService: WorkspacesService) {}

  @Get()
  findAll() {
    return this.workspacesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.workspacesService.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateWorkspaceDto) {
    return this.workspacesService.create(dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.workspacesService.remove(id);
  }

  @Post(':id/stop')
  stopAllTasks(@Param('id') id: string) {
    return this.workspacesService.stopAllTasks(id);
  }

  @Post(':id/start')
  startWorkspace(@Param('id') id: string) {
    return this.workspacesService.startWorkspace(id);
  }
}
