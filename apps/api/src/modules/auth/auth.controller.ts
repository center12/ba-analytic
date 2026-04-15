import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiBody, ApiOkResponse, ApiOperation, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { LoginResponseDto } from './dto/login-response.dto';
import { Public } from './decorators/public.decorator';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @ApiOperation({
    summary: 'Authenticate a user',
    description: 'Returns a JWT access token for subsequent authenticated API requests.',
    security: [],
  })
  @ApiBody({ type: LoginDto })
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ description: 'JWT access token issued.', type: LoginResponseDto })
  @ApiUnauthorizedResponse({ description: 'Invalid username or password.' })
  login(@Body() dto: LoginDto): Promise<LoginResponseDto> {
    return this.authService.login(dto);
  }
}
