import { PartialType } from '@nestjs/mapped-types';
import type { CategoryInput } from '@pecan/shared';
import { IsInt, IsNotEmpty, IsString, MaxLength, Min } from 'class-validator';

export class CreateCategoryDto implements CategoryInput {
  @IsString()
  @IsNotEmpty()
  @MaxLength(60)
  name: string;

  @IsInt()
  @Min(0)
  sortOrder: number;
}

export class UpdateCategoryDto extends PartialType(CreateCategoryDto) {}
