import {
  Controller, Get, Post, Put, Delete, Body, Param, Query, Res,
  UseInterceptors, UploadedFile, ParseIntPipe,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Response } from 'express';
import { IndicatorService } from './indicator.service';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('指标管理')
@ApiBearerAuth()
@Controller('indicators')
export class IndicatorController {
  constructor(private readonly service: IndicatorService) {}

  @Get()
  @ApiOperation({ summary: '指标列表' })
  async findAll(
    @Query('categoryId') categoryId?: number,
    @Query('direction') direction?: number,
    @Query('pointStatus') pointStatus?: number,
    @Query('rankingListId') rankingListId?: number,
    @Query('includeInactive') includeInactive?: boolean,
  ) {
    return this.service.findAll({ categoryId, direction, pointStatus, rankingListId, includeInactive });
  }

  @Get('search')
  @ApiOperation({ summary: '指标文本搜索匹配' })
  async search(
    @Query('keyword') keyword: string,
    @Query('rankingListIds') rankingListIds?: string,
    @Query('limit') limit?: number,
  ) {
    const rlIds = rankingListIds
      ? rankingListIds.split(',').map(Number).filter(id => !isNaN(id) && id > 0)
      : undefined;
    return this.service.searchByKeyword({
      keyword,
      rankingListIds: rlIds?.length ? rlIds : undefined,
      limit: limit ? Number(limit) : undefined,
    });
  }

  @Get('template')
  @ApiOperation({ summary: '下载导入模板' })
  async getTemplate(@Res() res: Response) {
    return this.service.getTemplate(res);
  }

  @Get('export')
  @ApiOperation({ summary: '导出指标' })
  async exportExcel(@Res() res: Response) {
    return this.service.exportExcel(res);
  }

  @Post('check-associations')
  @ApiOperation({ summary: '检查指标关联数据' })
  async checkAssociations(@Body() body: { ids: number[] }) {
    return this.service.checkIndicatorAssociations(body.ids);
  }

  @Post('batch-delete')
  @Roles('super_admin')
  @ApiOperation({ summary: '批量永久删除指标' })
  async batchDelete(@Body() body: { ids: number[] }) {
    return this.service.batchPermanentDelete(body.ids);
  }

  @Get(':id')
  @ApiOperation({ summary: '指标详情' })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }

  @Post()
  @Roles('super_admin')
  @ApiOperation({ summary: '新增指标' })
  async create(@Body() dto: any) {
    return this.service.create(dto);
  }

  @Put('batch-ranking-list')
  @Roles('super_admin')
  @ApiOperation({ summary: '批量设置榜单' })
  async batchSetRankingList(@Body() dto: { ids: number[]; rankingListId: number | null }) {
    return this.service.batchSetRankingList(dto.ids, dto.rankingListId);
  }

  @Put(':id')
  @Roles('super_admin')
  @ApiOperation({ summary: '编辑指标' })
  async update(@Param('id', ParseIntPipe) id: number, @Body() dto: any) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @Roles('super_admin')
  @ApiOperation({ summary: '停用指标' })
  async remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.remove(id);
  }

  @Post('import')
  @Roles('super_admin')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: '批量导入' })
  async importExcel(@UploadedFile() file: Express.Multer.File) {
    return this.service.importFromExcel(file.buffer);
  }
}
