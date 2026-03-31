import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './jwt.strategy';
import { JwtAuthGuard } from './jwt-auth.guard';
import { SseJwtAuthGuard } from './guards/sse-jwt-auth.guard';
import { AdminSeeder } from './admin.seeder';
import { PrismaService } from '../../prisma.service';
import { JWT_SECRET_KEY, JWT_EXPIRES_IN } from './constants/auth.constants';

@Module({
  imports: [
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>(JWT_SECRET_KEY),
        signOptions: { expiresIn: JWT_EXPIRES_IN },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, JwtAuthGuard, SseJwtAuthGuard, AdminSeeder, PrismaService],
  exports: [AuthService, JwtModule, SseJwtAuthGuard],
})
export class AuthModule {}
