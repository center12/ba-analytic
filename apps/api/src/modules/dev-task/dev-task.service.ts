import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';

@Injectable()
export class DevTaskService {
  constructor(private readonly prisma: PrismaService) {}

  findByFeature(featureId: string) {
    return this.prisma.developerTask.findMany({
      where: { featureId },
      orderBy: { createdAt: 'asc' },
    });
  }

  remove(id: string) {
    return this.prisma.developerTask.delete({ where: { id } });
  }
}
