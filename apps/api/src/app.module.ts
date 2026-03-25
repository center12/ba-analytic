import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ProjectModule } from './modules/project/project.module';
import { StorageModule } from './modules/storage/storage.module';
import { AIModule } from './modules/ai/ai.module';
import { ChatModule } from './modules/chat/chat.module';
import { TestCaseModule } from './modules/test-case/test-case.module';

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
