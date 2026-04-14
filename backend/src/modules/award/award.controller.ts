import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Query,
  Param,
  Body,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { AwardService } from './award.service';

@Controller('awards')
@UseGuards(JwtAuthGuard)
export class AwardController {
  constructor(private readonly awardService: AwardService) {}

  @Get('stats')
  async getStats(
    @Query('year') year?: string,
    @Query('quarter') quarter?: string,
    @Query('departmentId') departmentId?: string,
    @Query('status') status?: string,
    @Query('keyword') keyword?: string,
  ) {
    return this.awardService.getStats({
      year,
      quarter,
      departmentId: departmentId ? Number(departmentId) : undefined,
      status: status !== undefined && status !== '' ? Number(status) : undefined,
      keyword,
    });
  }

  @Get('export')
  async exportExcel(
    @Query('year') year?: string,
    @Query('quarter') quarter?: string,
    @Query('departmentId') departmentId?: string,
    @Query('status') status?: string,
    @Query('keyword') keyword?: string,
    @Res() res?: Response,
  ) {
    return this.awardService.exportExcel(res!, {
      year,
      quarter,
      departmentId: departmentId ? Number(departmentId) : undefined,
      status: status !== undefined && status !== '' ? Number(status) : undefined,
      keyword,
    });
  }

  @Get()
  async findAll(
    @Query('year') year?: string,
    @Query('quarter') quarter?: string,
    @Query('departmentId') departmentId?: string,
    @Query('status') status?: string,
    @Query('keyword') keyword?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.awardService.findAll({
      year,
      quarter,
      departmentId: departmentId ? Number(departmentId) : undefined,
      status: status !== undefined && status !== '' ? Number(status) : undefined,
      keyword,
      page: page ? Number(page) : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined,
    });
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles('super_admin', 'admin')
  async create(@Body() dto: any) {
    return this.awardService.create(dto);
  }

  @Put(':id')
  @UseGuards(RolesGuard)
  @Roles('super_admin', 'admin')
  async update(@Param('id') id: string, @Body() dto: any) {
    return this.awardService.update(Number(id), dto);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles('super_admin', 'admin')
  async remove(@Param('id') id: string) {
    return this.awardService.remove(Number(id));
  }
}
