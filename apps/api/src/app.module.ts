import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ProjectModule } from './project/project.module';
import { StorageModule } from './storage/storage.module';
import { AIModule } from './ai/ai.module';
import { ChatModule } from './chat/chat.module';
import { TestCaseModule } from './test-case/test-case.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ProjectModule,
    StorageModule,
    AIModule,
    ChatModule,
    TestCaseModule,
  ],
})
export class AppModule {}
