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
import {
  ApiBody,
  ApiConsumes,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiProduces,
  ApiTags,
} from '@nestjs/swagger';
import { FeedbackService } from './feedback.service';
import { CreateAppFeedbackDto } from './dto/create-app-feedback.dto';

@ApiTags('Feedback')
@Controller('feedback')
export class FeedbackController {
  constructor(private readonly service: FeedbackService) {}

  @ApiOperation({ summary: 'List application feedback submissions' })
  @ApiOkResponse({ description: 'Feedback submissions returned.' })
  @Get()
  findAll() {
    return this.service.listAppFeedback();
  }

  @ApiOperation({ summary: 'Create a feedback submission with an optional attachment' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['content', 'routePath'],
      properties: {
        content: { type: 'string' },
        routePath: { type: 'string' },
        pageTitle: { type: 'string' },
        contextLabel: { type: 'string' },
        file: { type: 'string', format: 'binary' },
      },
    },
  })
  @ApiOkResponse({ description: 'Feedback submission created.' })
  @Post()
  @UseInterceptors(FileInterceptor('file'))
  create(
    @Body() dto: CreateAppFeedbackDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.service.createAppFeedback(dto, file);
  }

  @ApiOperation({ summary: 'Download the attachment for a feedback submission' })
  @ApiParam({ name: 'feedbackId', description: 'Feedback identifier.' })
  @ApiProduces('application/octet-stream')
  @ApiOkResponse({
    description: 'Binary attachment for the feedback submission.',
    content: {
      'application/octet-stream': {
        schema: { type: 'string', format: 'binary' },
      },
    },
  })
  @ApiNotFoundResponse({ description: 'Feedback has no attachment.' })
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
