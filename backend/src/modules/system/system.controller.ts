import { Controller, Get, Delete } from '@nestjs/common';
import { SystemService } from './system.service';

@Controller('system')
export class SystemController {
  constructor(private readonly systemService: SystemService) {}

  @Get('status')
  getStatus() {
    return this.systemService.getStatus();
  }

  @Delete('purge')
  purgeAll() {
    return this.systemService.purgeAll();
  }
}
