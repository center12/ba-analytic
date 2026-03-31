import { Injectable, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { AuthService } from '../auth/auth.service';
import { CreateUserDto } from './dto/create-user.dto';

const SELECT_SAFE = {
  id: true,
  username: true,
  createdAt: true,
  updatedAt: true,
};

@Injectable()
export class UserService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authService: AuthService,
  ) {}

  async create(dto: CreateUserDto) {
    const existing = await this.prisma.user.findUnique({
      where: { username: dto.username },
    });
    if (existing) {
      throw new ConflictException(`Username "${dto.username}" is already taken`);
    }

    const passwordHash = await this.authService.hashPassword(dto.password);
    return this.prisma.user.create({
      data: { username: dto.username, passwordHash },
      select: SELECT_SAFE,
    });
  }

  async findAll() {
    return this.prisma.user.findMany({ select: SELECT_SAFE });
  }
}
