import * as path from 'path';
import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import * as mime from 'mime-types';
import { v4 as uuidv4 } from 'uuid';
import { PrismaService } from '../../prisma.service';
import { STORAGE_PROVIDER, IStorageProvider } from '../storage/storage.interface';
import { CreateAppFeedbackDto } from './dto/create-app-feedback.dto';

@Injectable()
export class FeedbackService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(STORAGE_PROVIDER) private readonly storage: IStorageProvider,
  ) {}

  async listAppFeedback() {
    return this.prisma.appFeedback.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  async createAppFeedback(dto: CreateAppFeedbackDto, file?: Express.Multer.File) {
    const content = dto.content.trim();
    const routePath = dto.routePath.trim();

    if (!content) throw new BadRequestException('Feedback content is required');
    if (!routePath) throw new BadRequestException('Feedback route path is required');

    let fileData: { originalName?: string; storageKey?: string; mimeType?: string } = {};

    if (file) {
      const ext = mime.extension(file.mimetype) || path.extname(file.originalname).replace('.', '') || 'bin';
      const key = `feedback/${uuidv4()}.${ext}`;
      await this.storage.upload(file.buffer, key, file.mimetype);
      fileData = {
        originalName: file.originalname,
        storageKey: key,
        mimeType: file.mimetype,
      };
    }

    return this.prisma.appFeedback.create({
      data: {
        content,
        routePath,
        pageTitle: dto.pageTitle?.trim() || null,
        contextLabel: dto.contextLabel?.trim() || null,
        ...fileData,
      },
    });
  }

  async getAppFeedbackMedia(feedbackId: string) {
    const feedback = await this.prisma.appFeedback.findUnique({
      where: { id: feedbackId },
    });
    if (!feedback) throw new NotFoundException(`Feedback ${feedbackId} not found`);
    if (!feedback.storageKey || !feedback.originalName) return null;

    return {
      absolutePath: await this.storage.getSignedUrl(feedback.storageKey),
      originalName: feedback.originalName,
      mimeType: feedback.mimeType,
    };
  }
}
