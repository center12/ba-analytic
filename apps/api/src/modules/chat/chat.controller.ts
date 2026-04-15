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
import {
  ApiBody,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiProduces,
  ApiQuery,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Observable } from 'rxjs';
import { ChatService } from './chat.service';
import { CreateSessionDto } from './dto/create-session.dto';
import { SendMessageDto } from './dto/send-message.dto';
import { SseJwtAuthGuard } from '../auth/guards/sse-jwt-auth.guard';

@ApiTags('Chat')
@Controller('chat')
export class ChatController {
  constructor(private readonly service: ChatService) {}

  @ApiOperation({ summary: 'Create a chat session for a feature' })
  @ApiBody({ type: CreateSessionDto })
  @ApiOkResponse({ description: 'Chat session created.' })
  @Post('sessions')
  createSession(@Body() dto: CreateSessionDto) {
    return this.service.createSession(dto);
  }

  @ApiOperation({ summary: 'List chat sessions for a feature' })
  @ApiParam({ name: 'featureId', description: 'Feature identifier.' })
  @ApiOkResponse({ description: 'Chat sessions returned.' })
  @Get('sessions/feature/:featureId')
  findSessions(@Param('featureId') featureId: string) {
    return this.service.findSessionsByFeature(featureId);
  }

  @ApiOperation({ summary: 'List chat messages for a session' })
  @ApiParam({ name: 'sessionId', description: 'Chat session identifier.' })
  @ApiOkResponse({ description: 'Chat messages returned.' })
  @Get('sessions/:sessionId/messages')
  findMessages(@Param('sessionId') sessionId: string) {
    return this.service.findMessages(sessionId);
  }

  @ApiOperation({ summary: 'Delete a chat session' })
  @ApiParam({ name: 'sessionId', description: 'Chat session identifier.' })
  @ApiNoContentResponse({ description: 'Chat session deleted.' })
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
  @ApiOperation({
    summary: 'Stream chat completions over Server-Sent Events',
    description: 'The JWT must be supplied as the `token` query parameter for EventSource clients.',
  })
  @ApiParam({ name: 'sessionId', description: 'Chat session identifier.' })
  @ApiQuery({ name: 'message', description: 'Prompt text to send to the chat assistant.' })
  @ApiQuery({ name: 'provider', required: false, description: 'Optional AI provider override.' })
  @ApiQuery({ name: 'token', description: 'JWT access token used to authorize the SSE connection.' })
  @ApiProduces('text/event-stream')
  @ApiOkResponse({
    description: 'Streaming response in Server-Sent Events format.',
    content: {
      'text/event-stream': {
        schema: { type: 'string', example: 'event: message\ndata: {"content":"partial reply"}\n\n' },
      },
    },
  })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token query parameter.' })
  @Sse('sessions/:sessionId/stream')
  stream(
    @Param('sessionId') sessionId: string,
    @Query('message') message: string,
    @Query('provider') provider?: string,
  ): Observable<MessageEvent> {
    return this.service.streamChat(sessionId, message, provider);
  }
}
