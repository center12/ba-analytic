import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { AIProviderFactory, ProviderName } from '../ai/ai-provider.factory';
import { CreateSessionDto } from './dto/create-session.dto';
import { Observable } from 'rxjs';

@Injectable()
export class ChatService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly aiFactory: AIProviderFactory,
  ) {}

  async createSession(dto: CreateSessionDto) {
    return this.prisma.chatSession.create({
      data: { featureId: dto.featureId, title: dto.title ?? 'New Chat' },
    });
  }

  async findSessionsByFeature(featureId: string) {
    return this.prisma.chatSession.findMany({
      where: { featureId },
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { messages: true } } },
    });
  }

  async findMessages(sessionId: string) {
    const session = await this.prisma.chatSession.findUnique({
      where: { id: sessionId },
    });
    if (!session) throw new NotFoundException(`Session ${sessionId} not found`);

    return this.prisma.chatMessage.findMany({
      where: { sessionId },
      orderBy: { createdAt: 'asc' },
    });
  }

  async deleteSession(sessionId: string) {
    const session = await this.prisma.chatSession.findUnique({
      where: { id: sessionId },
    });
    if (!session) throw new NotFoundException(`Session ${sessionId} not found`);
    return this.prisma.chatSession.delete({ where: { id: sessionId } });
  }

  /**
   * Persist the user message, then stream the AI response via SSE.
   * The assistant message is persisted once the stream completes.
   */
  streamChat(
    sessionId: string,
    userContent: string,
    providerName?: string,
  ): Observable<MessageEvent> {
    return new Observable((subscriber) => {
      (async () => {
        const session = await this.prisma.chatSession.findUnique({
          where: { id: sessionId },
        });
        if (!session) {
          subscriber.error(new NotFoundException(`Session ${sessionId} not found`));
          return;
        }

        // Persist user message
        await this.prisma.chatMessage.create({
          data: { sessionId, role: 'USER', content: userContent },
        });

        // Load history for context injection
        const history = await this.prisma.chatMessage.findMany({
          where: { sessionId },
          orderBy: { createdAt: 'asc' },
        });

        const provider = this.aiFactory.getProvider(providerName as ProviderName | undefined);
        let fullResponse = '';

        try {
          for await (const chunk of provider.chat(
            history.slice(0, -1), // exclude the just-added user message (already in history)
            userContent,
          )) {
            fullResponse += chunk;
            subscriber.next({ data: JSON.stringify({ chunk }) } as MessageEvent);
          }

          // Persist completed assistant message
          await this.prisma.chatMessage.create({
            data: { sessionId, role: 'ASSISTANT', content: fullResponse },
          });

          subscriber.next({ data: JSON.stringify({ done: true }) } as MessageEvent);
          subscriber.complete();
        } catch (err) {
          subscriber.error(err);
        }
      })();
    });
  }
}
