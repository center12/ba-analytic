import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Post,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { FeedbackService } from './feedback.service';
import { CreateAppFeedbackDto } from './dto/create-app-feedback.dto';

@Controller('feedback')
export class FeedbackController {
  constructor(private readonly service: FeedbackService) {}

  @Get()
  findAll() {
    return this.service.listAppFeedback();
  }

  @Post()
  @UseInterceptors(FileInterceptor('file'))
  create(
    @Body() dto: CreateAppFeedbackDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.service.createAppFeedback(dto, file);
  }

  @Get(':feedbackId/media')
  async downloadMedia(
    @Param('feedbackId') feedbackId: string,
    @Res() res: any,
  ) {
    const media = await this.service.getAppFeedbackMedia(feedbackId);
    if (!media) throw new NotFoundException(`Feedback ${feedbackId} has no media`);
    res.type(media.mimeType || 'application/octet-stream');
    return res.sendFile(media.absolutePath, {
      headers: {
        'Content-Disposition': `inline; filename="${encodeURIComponent(media.originalName)}"`,
      },
    });
  }
}
