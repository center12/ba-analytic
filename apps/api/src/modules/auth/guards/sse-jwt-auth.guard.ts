import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { JWT_SECRET_KEY } from '../constants/auth.constants';

@Injectable()
export class SseJwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<{ query: { token?: string } }>();
    const token = req.query.token;

    if (!token) throw new UnauthorizedException();

    try {
      this.jwtService.verify(token, {
        secret: this.config.get<string>(JWT_SECRET_KEY),
      });
      return true;
    } catch {
      throw new UnauthorizedException();
    }
  }
}
