import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import type { Category, MenuItem, MenuSnapshot } from '@pecan/shared';
import { CreateCategoryDto, UpdateCategoryDto } from './dto/category.dto.js';
import { CreateMenuItemDto, UpdateMenuItemDto } from './dto/menu-item.dto.js';
import { MenuService } from './menu.service.js';

@Controller()
export class MenuController {
  constructor(private readonly menu: MenuService) {}

  @Get('menu')
  snapshot(): MenuSnapshot {
    return this.menu.snapshot();
  }

  @Post('categories')
  createCategory(@Body() dto: CreateCategoryDto): Category {
    return this.menu.createCategory(dto);
  }

  @Patch('categories/:id')
  updateCategory(@Param('id') id: string, @Body() dto: UpdateCategoryDto): Category {
    return this.menu.updateCategory(id, dto);
  }

  @Delete('categories/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteCategory(@Param('id') id: string): void {
    this.menu.deleteCategory(id);
  }

  @Post('items')
  createItem(@Body() dto: CreateMenuItemDto): MenuItem {
    return this.menu.createItem(dto);
  }

  @Patch('items/:id')
  updateItem(@Param('id') id: string, @Body() dto: UpdateMenuItemDto): MenuItem {
    return this.menu.updateItem(id, dto);
  }

  @Delete('items/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteItem(@Param('id') id: string): void {
    this.menu.deleteItem(id);
  }
}
