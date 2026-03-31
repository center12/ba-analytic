import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ProjectModule } from './modules/project/project.module';
import { StorageModule } from './modules/storage/storage.module';
import { AIModule } from './modules/ai/ai.module';
import { ChatModule } from './modules/chat/chat.module';
import { TestCaseModule } from './modules/test-case/test-case.module';
import { DevTaskModule } from './modules/dev-task/dev-task.module';
import { AuthModule } from './modules/auth/auth.module';
import { UserModule } from './modules/user/user.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    AuthModule,
    UserModule,
    ProjectModule,
    StorageModule,
    AIModule,
    ChatModule,
    TestCaseModule,
    DevTaskModule,
  ],
})
export class AppModule {}
