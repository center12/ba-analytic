import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class RunFeatureAnalysisStepDto {
  @ApiPropertyOptional({
    description: 'Optional ad hoc override payload consumed by the selected pipeline step.',
    type: 'object',
    additionalProperties: true,
  })
  @IsOptional()
  override?: unknown;

  @ApiPropertyOptional({
    example: 'Focus on edge cases involving expired sessions.',
    description: 'Additional prompt text appended to the generated AI prompt.',
  })
  @IsOptional()
  @IsString()
  promptAppend?: string;
}

export class PromptAppendDto {
  @ApiPropertyOptional({
    example: 'Prefer implementation details that match the current frontend stack.',
  })
  @IsOptional()
  @IsString()
  promptAppend?: string;
}
