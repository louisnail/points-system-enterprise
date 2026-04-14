import {
  Controller, Get, Post, Body, Query, Res, Param, ParseIntPipe, UseInterceptors, UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { ProcessPointService } from './process-point.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('process-points')
export class ProcessPointController {
  constructor(private readonly service: ProcessPointService) {}

  @Get()
  findByMonth(
    @Query('belongMonth') belongMonth: string,
    @Query('userId') userId?: number,
  ) {
    return this.service.findByMonth(belongMonth, userId);
  }

  @Get('history/:userId/:indicatorId')
  getHistory(
    @Param('userId', ParseIntPipe) userId: number,
    @Param('indicatorId', ParseIntPipe) indicatorId: number,
  ) {
    return this.service.getHistory(userId, indicatorId);
  }

  @Post()
  upsert(@Body() dto: any, @CurrentUser() user: any) {
    return this.service.upsert({ ...dto, registrantId: user.id });
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

  @Get('template')
  getTemplate(@Res() res: Response) {
    return this.service.getTemplate(res);
  }
}
