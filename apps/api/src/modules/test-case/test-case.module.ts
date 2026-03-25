import { Module } from '@nestjs/common';
import { TestCaseController } from './test-case.controller';
import { TestCaseService } from './test-case.service';
import { PipelineService } from './pipeline.service';
import { PrismaService } from '../../prisma.service';
import { AIModule } from '../ai/ai.module';
import { StorageModule } from '../storage/storage.module';

@Module({
  imports: [AIModule, StorageModule],
  controllers: [TestCaseController],
  providers: [TestCaseService, PipelineService, PrismaService],
})
export class TestCaseModule {}
