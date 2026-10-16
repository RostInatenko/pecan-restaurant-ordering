import type { OrderLineInput, PlaceOrderRequest } from '@pecan/shared';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayNotEmpty,
  IsInt,
  IsNotEmpty,
  IsString,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { MAX_PRICE_CENTS } from '../../menu/dto/menu-item.dto.js';

export class OrderLineDto implements OrderLineInput {
  @IsString()
  @IsNotEmpty()
  itemId: string;

  @IsInt()
  @Min(1)
  @Max(99)
  quantity: number;

  @IsInt()
  @Min(0)
  @Max(MAX_PRICE_CENTS)
  unitPrice: number;
}

export class PlaceOrderDto implements PlaceOrderRequest {
  @ArrayNotEmpty()
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => OrderLineDto)
  lines: OrderLineDto[];

  @IsInt()
  @Min(0)
  discount: number;
}
