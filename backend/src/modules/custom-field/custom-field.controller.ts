import { Controller, Get, Post, Put, Delete, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CustomFieldService } from './custom-field.service';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('自定义字段')
@ApiBearerAuth()
@Controller('custom-fields')
export class CustomFieldController {
  constructor(private readonly service: CustomFieldService) {}

  @Get()
  @ApiOperation({ summary: '获取模块的自定义字段列表' })
  async findByModule(@Query('module') module: string) {
    return this.service.findByModule(module || 'user');
  }

  @Post()
  @Roles('super_admin')
  @ApiOperation({ summary: '创建自定义字段' })
  async create(@Body() dto: any) {
    return this.service.create(dto);
  }

  @Put('sort')
  @Roles('super_admin')
  @ApiOperation({ summary: '批量更新排序' })
  async batchSort(@Body() items: { id: number; sortOrder: number }[]) {
    return this.service.batchUpdateSort(items);
  }

  @Put(':id')
  @Roles('super_admin')
  @ApiOperation({ summary: '更新自定义字段' })
  async update(@Param('id') id: string, @Body() dto: any) {
    return this.service.update(Number(id), dto);
  }

  @Delete(':id')
  @Roles('super_admin')
  @ApiOperation({ summary: '删除自定义字段' })
  async remove(@Param('id') id: string) {
    return this.service.remove(Number(id));
  }
}
