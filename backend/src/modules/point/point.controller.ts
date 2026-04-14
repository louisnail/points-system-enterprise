import {
  Controller, Get, Post, Put, Body, Param, Query, Res, UseInterceptors, UploadedFile, ParseIntPipe,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { PointService } from './point.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('points')
export class PointController {
  constructor(private readonly service: PointService) {}

  @Get()
  findAll(
    @Query('page') page?: number,
    @Query('pageSize') pageSize?: number,
    @Query('userId') userId?: number,
    @Query('indicatorId') indicatorId?: number,
    @Query('auditStatus') auditStatus?: number,
    @Query('pointStatus') pointStatus?: number,
    @Query('belongMonth') belongMonth?: string,
    @Query('categoryId') categoryId?: number,
    @Query('departmentId') departmentId?: number,
    @Query('rankingListId') rankingListId?: number,
    @Query('keyword') keyword?: string,
  ) {
    return this.service.findAll({ page, pageSize, userId, indicatorId, auditStatus, pointStatus, belongMonth, categoryId, departmentId, rankingListId, keyword });
  }

  @Get('my')
  getMyPoints(
    @CurrentUser() user: any,
    @Query('belongMonth') belongMonth?: string,
    @Query('page') page?: number,
    @Query('pageSize') pageSize?: number,
  ) {
    return this.service.getMyPoints(user.id, { belongMonth, page, pageSize });
  }

  @Get('template')
  getTemplate(@Res() res: Response) {
    return this.service.getTemplate(res);
  }

  @Get('export')
  exportExcel(
    @Query('keyword') keyword?: string,
    @Query('rankingListId') rankingListId?: string,
    @Query('belongMonth') belongMonth?: string,
    @Query('departmentId') departmentId?: string,
    @Query('categoryId') categoryId?: string,
    @Query('auditStatus') auditStatus?: string,
    @Query('pointStatus') pointStatus?: string,
    @Query('userId') userId?: string,
    @Res() res?: Response,
  ) {
    const query: any = {};
    if (keyword) query.keyword = keyword;
    if (rankingListId && !isNaN(Number(rankingListId))) query.rankingListId = Number(rankingListId);
    if (belongMonth) query.belongMonth = belongMonth;
    if (departmentId && !isNaN(Number(departmentId))) query.departmentId = Number(departmentId);
    if (categoryId && !isNaN(Number(categoryId))) query.categoryId = Number(categoryId);
    if (auditStatus !== undefined && auditStatus !== '' && !isNaN(Number(auditStatus))) query.auditStatus = Number(auditStatus);
    if (pointStatus && !isNaN(Number(pointStatus))) query.pointStatus = Number(pointStatus);
    if (userId && !isNaN(Number(userId))) query.userId = Number(userId);
    return this.service.exportExcel(res!, query);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }

  @Post()
  create(@Body() dto: any, @CurrentUser() user: any) {
    return this.service.create({ ...dto, registrantId: user.id });
  }

  @Post('batch')
  batchCreate(@Body() body: { records: any[]; belongMonth?: string }, @CurrentUser() user: any) {
    const records = body.records.map(r => ({
      ...r,
      belongMonth: body.belongMonth || r.belongMonth,
    }));
    return this.service.batchCreate(records, user.id);
  }

  @Post('check-duplicates')
  checkDuplicates(@Body() body: { records: Array<{ userId: number; indicatorId: number; score: number; belongMonth: string }> }) {
    return this.service.checkDuplicates(body.records);
  }

  @Post('import')
  @UseInterceptors(FileInterceptor('file'))
  importExcel(
    @UploadedFile() file: Express.Multer.File,
    @Body('belongMonth') belongMonth: string,
    @CurrentUser() user: any,
  ) {
    return this.service.importFromExcel(file.buffer, user.id, belongMonth);
  }

  @Post('import-preview')
  @UseInterceptors(FileInterceptor('file'))
  previewImport(
    @UploadedFile() file: Express.Multer.File,
    @Body('belongMonth') belongMonth: string,
  ) {
    return this.service.previewImport(file.buffer, belongMonth || '');
  }

  @Post('import-confirm')
  confirmImport(
    @Body() body: { records: Array<{ userId: number; indicatorId: number; score: number; description?: string; belongMonth: string }> },
    @CurrentUser() user: any,
  ) {
    return this.service.confirmImport(body.records, user.id);
  }

  @Put(':id/audit')
  audit(@Param('id', ParseIntPipe) id: number, @Body() dto: any, @CurrentUser() user: any) {
    return this.service.audit(id, { ...dto, auditorId: user.id });
  }

  @Put(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: any) {
    return this.service.updateRecord(id, dto);
  }

  @Put(':id/void')
  voidRecord(@Param('id', ParseIntPipe) id: number) {
    return this.service.voidRecord(id);
  }

  @Post('batch-audit')
  batchAudit(@Body() body: { ids: number[]; auditStatus: number; auditRemark?: string }, @CurrentUser() user: any) {
    return this.service.batchAudit(body.ids, { ...body, auditorId: user.id });
  }

  @Post('batch-void')
  batchVoid(@Body() body: { ids: number[] }) {
    return this.service.batchVoid(body.ids);
  }
}
