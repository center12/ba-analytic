import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { PipelineService } from './pipeline.service';
import { UpdateTestCaseDto } from './dto/update-test-case.dto';

@Injectable()
export class TestCaseService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly pipeline: PipelineService,
  ) {}

  async findByFeature(featureId: string) {
    return this.prisma.testCase.findMany({
      where: { featureId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const tc = await this.prisma.testCase.findUnique({ where: { id } });
    if (!tc) throw new NotFoundException(`TestCase ${id} not found`);
    return tc;
  }

  async update(id: string, dto: UpdateTestCaseDto) {
    await this.findOne(id);
    return this.prisma.testCase.update({ where: { id }, data: dto });
  }

  async delete(id: string) {
    await this.findOne(id);
    return this.prisma.testCase.delete({ where: { id } });
  }

  async generateForFeature(featureId: string, providerName?: string) {
    return this.pipeline.run(featureId, providerName);
  }

  async resumeForFeature(featureId: string, providerName?: string) {
    return this.pipeline.resume(featureId, providerName);
  }

  async runStepForFeature(featureId: string, step: number, providerName?: string, override?: unknown) {
    switch (step) {
      case 1: return this.pipeline.runStep1(featureId, providerName);
      case 2: return this.pipeline.runStep2(featureId, providerName, override as any);
      case 3: return this.pipeline.runStep3(featureId, providerName);
      case 4: return this.pipeline.runStep4(featureId, providerName);
      default: throw new Error(`Invalid pipeline step: ${step}`);
    }
  }

  async resumeStep1ForFeature(featureId: string, providerName?: string) {
    return this.pipeline.resumeStep1(featureId, providerName);
  }

  async saveStepResults(featureId: string, data: unknown) {
    return this.pipeline.saveStepResults(featureId, data as any);
  }
}
