import { Module } from '@nestjs/common';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { PrismaService } from '../../prisma.service';
import { AIModule } from '../ai/ai.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AIModule, AuthModule],
  controllers: [ChatController],
  providers: [ChatService, PrismaService],
})
export class ChatModule {}
