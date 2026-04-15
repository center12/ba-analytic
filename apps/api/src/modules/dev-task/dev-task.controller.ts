import { Controller, Get, Delete, Param, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiNoContentResponse, ApiOkResponse, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { DevTaskService } from './dev-task.service';

@ApiTags('Dev Tasks')
@Controller('dev-tasks')
export class DevTaskController {
  constructor(private readonly service: DevTaskService) {}

  @ApiOperation({ summary: 'List developer tasks for a feature' })
  @ApiParam({ name: 'featureId', description: 'Feature identifier.' })
  @ApiOkResponse({ description: 'Developer tasks returned.' })
  @Get('feature/:featureId')
  findByFeature(@Param('featureId') featureId: string) {
    return this.service.findByFeature(featureId);
  }

  @ApiOperation({ summary: 'Delete a developer task' })
  @ApiParam({ name: 'id', description: 'Developer task identifier.' })
  @ApiNoContentResponse({ description: 'Developer task deleted.' })
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
