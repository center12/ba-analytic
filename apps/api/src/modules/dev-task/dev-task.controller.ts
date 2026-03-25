import { Controller, Get, Delete, Param } from '@nestjs/common';
import { DevTaskService } from './dev-task.service';

@Controller('dev-tasks')
export class DevTaskController {
  constructor(private readonly service: DevTaskService) {}

  @Get('feature/:featureId')
  findByFeature(@Param('featureId') featureId: string) {
    return this.service.findByFeature(featureId);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
