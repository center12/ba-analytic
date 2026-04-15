import { IsString, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SendMessageDto {
  @ApiProperty({ example: 'Summarize the generated test cases.' })
  @IsString()
  content: string;

  @ApiPropertyOptional({ example: 'gemini' })
  @IsOptional()
  @IsString()
  provider?: string;
}
