import { Controller, Get, Post, Query, Res, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RankingService } from './ranking.service';

@Controller('rankings')
@UseGuards(JwtAuthGuard)
export class RankingController {
  constructor(private readonly rankingService: RankingService) {}

  @Get('export')
  async exportRanking(
    @Query('belongMonth') belongMonth: string,
    @Query('rankingListId') rankingListId?: string,
    @Res() res?: Response,
  ) {
    const listId = rankingListId ? Number(rankingListId) : undefined;
    return this.rankingService.exportExcel(res!, belongMonth, listId);
  }

  @Get('secondary')
  async getSecondaryRanking(
    @Query('belongMonth') belongMonth: string,
    @Query('rankingListId') rankingListId: string,
  ) {
    return this.rankingService.getSecondaryRanking(belongMonth, Number(rankingListId));
  }

  @Get('annual')
  async getAnnualRanking(
    @Query('year') year: string,
    @Query('rankingListId') rankingListId?: string,
    @Query('keyword') keyword?: string,
    @Query('departmentId') departmentId?: string,
    @Query('companyBelong') companyBelong?: string,
  ) {
    const listId = rankingListId ? Number(rankingListId) : undefined;
    const deptId = departmentId ? Number(departmentId) : undefined;
    return this.rankingService.getAnnualRanking(year, listId, keyword, deptId, companyBelong || undefined);
  }

  @Get('annual/export')
  async exportAnnualRanking(
    @Query('year') year: string,
    @Query('rankingListId') rankingListId?: string,
    @Query('departmentId') departmentId?: string,
    @Query('companyBelong') companyBelong?: string,
    @Res() res?: Response,
  ) {
    const listId = rankingListId ? Number(rankingListId) : undefined;
    const deptId = departmentId ? Number(departmentId) : undefined;
    return this.rankingService.exportAnnualExcel(res!, year, listId, deptId, companyBelong || undefined);
  }

  @Get('user-trend')
  async getUserMonthlyTrend(
    @Query('userId') userId: string,
    @Query('year') year: string,
  ) {
    return this.rankingService.getUserMonthlyTrend(Number(userId), year);
  }

  @Get()
  async getMonthlyRanking(
    @Query('belongMonth') belongMonth: string,
    @Query('rankingListId') rankingListId?: string,
  ) {
    const listId = rankingListId ? Number(rankingListId) : undefined;
    return this.rankingService.getMonthlyRanking(belongMonth, listId);
  }

  @Get('user')
  async getUserRanking(
    @Query('userId') userId: string,
    @Query('belongMonth') belongMonth: string,
  ) {
    return this.rankingService.getUserRanking(Number(userId), belongMonth);
  }

  @Post('recalculate')
  @UseGuards(RolesGuard)
  @Roles('super_admin', 'admin')
  async recalculate(@Query('belongMonth') belongMonth: string) {
    return this.rankingService.recalculateRankings(belongMonth);
  }
}
