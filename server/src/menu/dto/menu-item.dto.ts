import { PartialType } from '@nestjs/mapped-types';
import type { MenuItemInput } from '@pecan/shared';
import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';

export const MAX_PRICE_CENTS = 1_000_000;

export class CreateMenuItemDto implements MenuItemInput {
  @IsString()
  @IsNotEmpty()
  categoryId: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  name: string;

  @IsString()
  @MaxLength(300)
  description: string;

  @ValidateIf((dto: CreateMenuItemDto) => dto.price !== null)
  @IsInt()
  @Min(0)
  @Max(MAX_PRICE_CENTS)
  price: number | null;

  @IsBoolean()
  openPrice: boolean;

  @IsBoolean()
  available: boolean;
}

export class UpdateMenuItemDto extends PartialType(CreateMenuItemDto) {}
