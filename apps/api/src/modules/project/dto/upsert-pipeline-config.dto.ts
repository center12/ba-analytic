import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsInt, IsOptional, IsString, ValidateNested } from 'class-validator';

export class StepConfigDto {
  @ApiProperty({ example: 1, description: 'Pipeline step number.' })
  @IsInt()
  step: number;      // 1 | 2 | 3 | 4

  @ApiProperty({ example: 'gemini', description: 'AI provider for this step.' })
  @IsString()
  provider: string;  // 'gemini' | 'claude' | 'openai'

  @ApiPropertyOptional({ example: 'gemini-2.0-flash', description: 'Optional model override.' })
  @IsOptional()
  @IsString()
  model?: string;    // null/undefined = provider default
}

export class UpsertPipelineConfigDto {
  @ApiProperty({ type: StepConfigDto, isArray: true })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => StepConfigDto)
  configs: StepConfigDto[];
}
