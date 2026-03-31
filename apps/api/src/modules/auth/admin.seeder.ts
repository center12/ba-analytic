import { Injectable, OnApplicationBootstrap, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma.service';
import { AuthService } from './auth.service';

@Injectable()
export class AdminSeeder implements OnApplicationBootstrap {
  private readonly logger = new Logger(AdminSeeder.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly authService: AuthService,
    private readonly config: ConfigService,
  ) {}

  async onApplicationBootstrap() {
    const username = this.config.get<string>('ADMIN_USERNAME');
    const password = this.config.get<string>('ADMIN_PASSWORD');

    if (!username || !password) {
      this.logger.warn(
        'ADMIN_USERNAME or ADMIN_PASSWORD not set — skipping admin seed',
      );
      return;
    }

    const existing = await this.prisma.user.findUnique({ where: { username } });
    if (existing) return;

    const passwordHash = await this.authService.hashPassword(password);
    await this.prisma.user.create({ data: { username, passwordHash } });
    this.logger.log(`Admin user "${username}" created`);
  }
}
