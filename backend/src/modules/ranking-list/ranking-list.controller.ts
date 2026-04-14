import {
  Controller, Get, Post, Put, Delete, Body, Param, ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { RankingListService } from './ranking-list.service';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('榜单管理')
@ApiBearerAuth()
@Controller('ranking-lists')
export class RankingListController {
  constructor(private readonly service: RankingListService) {}

  @Get()
  @ApiOperation({ summary: '榜单列表' })
  async findAll() {
    return this.service.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: '榜单详情' })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }

  @Post()
  @Roles('super_admin')
  @ApiOperation({ summary: '新增榜单' })
  async create(@Body() dto: any) {
    return this.service.create(dto);
  }

  @Put(':id')
  @Roles('super_admin')
  @ApiOperation({ summary: '编辑榜单' })
  async update(@Param('id', ParseIntPipe) id: number, @Body() dto: any) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @Roles('super_admin')
  @ApiOperation({ summary: '删除榜单' })
  async remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.remove(id);
  }
}
