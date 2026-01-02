import { Controller, Get, Post, Delete, Param, Body, Query, DefaultValuePipe, ParseIntPipe } from '@nestjs/common';
import { TasksService } from './tasks.service';
import { CreateTaskDto } from './dto';

@Controller()
export class TasksController {
  constructor(private readonly tasks: TasksService) {}

  @Get('tasks')
  listAll() {
    return this.tasks.listAll();
  }

  @Get('workspaces/:workspaceId/tasks')
  list(@Param('workspaceId') workspaceId: string) {
    return this.tasks.listByWorkspace(workspaceId);
  }


  @Post('workspaces/:workspaceId/tasks')
  create(@Param('workspaceId') workspaceId: string, @Body() dto: CreateTaskDto) {
    return this.tasks.create(workspaceId, dto);
  }

  @Get('tasks/:taskId')
  get(@Param('taskId') taskId: string) {
    return this.tasks.get(taskId);
  }

  @Post('tasks/:taskId/start')
  start(@Param('taskId') taskId: string) {
    return this.tasks.start(taskId);
  }

  @Post('tasks/:taskId/stop')
  stop(@Param('taskId') taskId: string) {
    return this.tasks.stop(taskId);
  }

  @Delete('tasks/:taskId')
  destroy(@Param('taskId') taskId: string) {
    return this.tasks.destroy(taskId);
  }

  @Get('tasks/:taskId/logs')
  async logs(
    @Param('taskId') taskId: string,
    @Query('tail', new DefaultValuePipe(100), ParseIntPipe) tail?: number
  ) {
    const logs = await this.tasks.logs(taskId, tail);
    return { logs };
  }
}
