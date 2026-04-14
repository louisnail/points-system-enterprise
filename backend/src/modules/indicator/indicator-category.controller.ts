import {
  Controller, Get, Post, Put, Delete, Body, Param, Query, ParseIntPipe,
  Res, UseInterceptors, UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { IndicatorCategoryService } from './indicator-category.service';
import { Roles } from '../auth/decorators/roles.decorator';
import { Response } from 'express';

@ApiTags('指标分类')
@ApiBearerAuth()
@Controller('indicator-categories')
export class IndicatorCategoryController {
  constructor(private readonly service: IndicatorCategoryService) {}

  @Get()
  @ApiOperation({ summary: '分类列表' })
  async findAll(@Query('includeInactive') includeInactive?: boolean) {
    return this.service.findAll(includeInactive);
  }

  @Get('template')
  @ApiOperation({ summary: '下载导入模板' })
  async getTemplate(@Res() res: Response) {
    return this.service.getTemplate(res);
  }

  @Post('import')
  @Roles('super_admin')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: '批量导入分类' })
  async importExcel(@UploadedFile() file: any) {
    return this.service.importFromExcel(file.buffer);
  }

  @Put('batch-deactivate')
  @Roles('super_admin')
  @ApiOperation({ summary: '批量停用分类' })
  async batchDeactivate(@Body() body: { ids: number[] }) {
    return this.service.batchDeactivate(body.ids);
  }

  @Post('batch-delete')
  @Roles('super_admin')
  @ApiOperation({ summary: '批量永久删除分类' })
  async batchDelete(@Body() body: { ids: number[] }) {
    return this.service.batchPermanentDelete(body.ids);
  }

  @Post('check-associations')
  @ApiOperation({ summary: '检查分类关联数据' })
  async checkAssociations(@Body() body: { ids: number[] }) {
    return this.service.checkCategoryAssociations(body.ids);
  }

  @Get(':id')
  @ApiOperation({ summary: '分类详情' })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }

  @Post()
  @Roles('super_admin')
  @ApiOperation({ summary: '新增分类' })
  async create(@Body() dto: any) {
    return this.service.create(dto);
  }

  @Put(':id')
  @Roles('super_admin')
  @ApiOperation({ summary: '编辑分类' })
  async update(@Param('id', ParseIntPipe) id: number, @Body() dto: any) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @Roles('super_admin')
  @ApiOperation({ summary: '停用分类' })
  async remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.remove(id);
  }
}
