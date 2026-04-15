import { ApiProperty } from '@nestjs/swagger';

export class AIModelInfoDto {
  @ApiProperty({ example: 'gpt-5' })
  id: string;

  @ApiProperty({ example: 'GPT-5' })
  label: string;
}

export class AIProviderInfoDto {
  @ApiProperty({ example: 'openai' })
  provider: string;

  @ApiProperty({ example: 'OpenAI' })
  label: string;

  @ApiProperty({ type: AIModelInfoDto, isArray: true })
  models: AIModelInfoDto[];
}
