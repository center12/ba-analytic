import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
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
}
