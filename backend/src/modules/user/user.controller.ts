import {
  Controller, Get, Post, Put, Delete, Body, Param, Query,
  UseInterceptors, UploadedFile, Res, ParseIntPipe,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Response } from 'express';
import { UserService } from './user.service';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('员工管理')
@ApiBearerAuth()
@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get('stats')
  @ApiOperation({ summary: '员工状态统计' })
  async getStats() {
    return this.userService.getStatusStats();
  }

  @Get('company-belongs')
  @ApiOperation({ summary: '归属组织列表（去重）' })
  async getCompanyBelongs() {
    return this.userService.getCompanyBelongs();
  }

  @Get()
  @ApiOperation({ summary: '员工列表' })
  async findAll(
    @Query('page') page?: number,
    @Query('pageSize') pageSize?: number,
    @Query('departmentId') departmentId?: number,
    @Query('status') status?: number,
    @Query('companyBelong') companyBelong?: string,
    @Query('keyword') keyword?: string,
    @Query('isHistory') isHistory?: boolean,
    @Query('rankingListId') rankingListId?: number,
  ) {
    return this.userService.findAll({ page, pageSize, departmentId, status, companyBelong, keyword, isHistory, rankingListId });
  }

  @Get('template')
  @ApiOperation({ summary: '下载导入模板' })
  async getTemplate(@Res() res: Response) {
    return this.userService.getTemplate(res);
  }

  @Get('export')
  @ApiOperation({ summary: '导出员工' })
  async exportExcel(@Res() res: Response, @Query() query: any) {
    return this.userService.exportExcel(res, query);
  }

  @Put('batch-department')
  @Roles('super_admin', 'dept_admin')
  @ApiOperation({ summary: '批量调整部门' })
  async batchUpdateDepartment(@Body() body: { userIds: number[]; departmentId: number }) {
    return this.userService.batchUpdateDepartment(body.userIds, body.departmentId);
  }

  @Post('check-associations')
  @ApiOperation({ summary: '检查员工关联数据' })
  async checkAssociations(@Body() body: { ids: number[] }) {
    return this.userService.checkUserAssociations(body.ids);
  }

  @Post('batch-delete')
  @Roles('super_admin')
  @ApiOperation({ summary: '批量永久删除员工' })
  async batchDelete(@Body() body: { ids: number[]; force?: boolean }) {
    return this.userService.batchPermanentDelete(body.ids, !!body.force);
  }

  @Get(':id')
  @ApiOperation({ summary: '员工详情' })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.userService.findOne(id);
  }

  @Post()
  @Roles('super_admin', 'dept_admin')
  @ApiOperation({ summary: '新增员工' })
  async create(@Body() dto: any) {
    return this.userService.create(dto);
  }

  @Put(':id')
  @Roles('super_admin', 'dept_admin')
  @ApiOperation({ summary: '编辑员工' })
  async update(@Param('id', ParseIntPipe) id: number, @Body() dto: any) {
    return this.userService.update(id, dto);
  }

  @Put(':id/status')
  @Roles('super_admin')
  @ApiOperation({ summary: '变更员工状态' })
  async changeStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body('status') status: number,
  ) {
    return this.userService.changeStatus(id, status);
  }

  @Put(':id/ranking-disabled')
  @Roles('super_admin')
  @ApiOperation({ summary: '切换排名禁用' })
  async toggleRankingDisabled(
    @Param('id', ParseIntPipe) id: number,
    @Body('disabled') disabled: boolean,
  ) {
    return this.userService.toggleRankingDisabled(id, disabled);
  }

  @Post('import')
  @Roles('super_admin')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: '批量导入' })
  async importExcel(@UploadedFile() file: Express.Multer.File) {
    return this.userService.importFromExcel(file.buffer);
  }

  @Delete(':id')
  @Roles('super_admin')
  @ApiOperation({ summary: '删除员工(标记离职)' })
  async remove(@Param('id', ParseIntPipe) id: number) {
    return this.userService.changeStatus(id, 3);
  }
}
