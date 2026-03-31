import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  Query,
  Sse,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { ChatService } from './chat.service';
import { CreateSessionDto } from './dto/create-session.dto';
import { SendMessageDto } from './dto/send-message.dto';
import { SseJwtAuthGuard } from '../auth/guards/sse-jwt-auth.guard';

@Controller('chat')
export class ChatController {
  constructor(private readonly service: ChatService) {}

  @Post('sessions')
  createSession(@Body() dto: CreateSessionDto) {
    return this.service.createSession(dto);
  }

  @Get('sessions/feature/:featureId')
  findSessions(@Param('featureId') featureId: string) {
    return this.service.findSessionsByFeature(featureId);
  }

  @Get('sessions/:sessionId/messages')
  findMessages(@Param('sessionId') sessionId: string) {
    return this.service.findMessages(sessionId);
  }

  @Delete('sessions/:sessionId')
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteSession(@Param('sessionId') sessionId: string) {
    return this.service.deleteSession(sessionId);
  }

  /**
   * SSE endpoint — connect with EventSource on the frontend.
   * Usage: GET /api/chat/sessions/:sessionId/stream?message=<text>&provider=gemini&token=<jwt>
   * Token must be passed as query param because EventSource does not support custom headers.
   */
  @UseGuards(SseJwtAuthGuard)
  @Sse('sessions/:sessionId/stream')
  stream(
    @Param('sessionId') sessionId: string,
    @Query('message') message: string,
    @Query('provider') provider?: string,
  ): Observable<MessageEvent> {
    return this.service.streamChat(sessionId, message, provider);
  }
}
