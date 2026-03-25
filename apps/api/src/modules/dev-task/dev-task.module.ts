import { Module } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { DevTaskController } from './dev-task.controller';
import { DevTaskService } from './dev-task.service';

@Module({
  controllers: [DevTaskController],
  providers: [DevTaskService, PrismaService],
})
export class DevTaskModule {}
