import { Controller, Get, Delete } from '@nestjs/common';
import { SystemService } from './system.service';

@Controller('system')
export class SystemController {
  constructor(private readonly systemService: SystemService) {}

  @Get('status')
  getStatus() {
    return this.systemService.getStatus();
  }

  @Get('stats')
  getStats() {
    return this.systemService.getStats();
  }

  @Delete('purge')
  async purgeAll() {
    return await this.systemService.purgeAll();
  }
}
