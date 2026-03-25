import { IsString, IsOptional, IsEnum, IsArray } from 'class-validator';
import { TestCasePriority, TestCaseStatus } from '@prisma/client';

export class UpdateTestCaseDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  preconditions?: string;

  @IsOptional()
  @IsEnum(TestCasePriority)
  priority?: TestCasePriority;

  @IsOptional()
  @IsEnum(TestCaseStatus)
  status?: TestCaseStatus;

  @IsOptional()
  @IsArray()
  steps?: { action: string; expectedResult: string }[];
}
