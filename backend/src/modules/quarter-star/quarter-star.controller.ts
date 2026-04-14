import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  UseInterceptors,
  UploadedFiles,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { QuarterStarService } from './quarter-star.service';

@Controller('quarter-stars')
@UseGuards(JwtAuthGuard)
export class QuarterStarController {
  constructor(private readonly service: QuarterStarService) {}

  @Get()
  async findByQuarter(
    @Query('quarter') quarter: string,
    @Query('rankingListId') rankingListId?: string,
  ) {
    if (!quarter) return [];
    const listId = rankingListId && !isNaN(Number(rankingListId)) ? Number(rankingListId) : undefined;
    return this.service.findByQuarter(quarter, listId);
  }

  @Public()
  @Get('published')
  async getPublished(
    @Query('quarter') quarter: string,
    @Query('rankingListId') rankingListId?: string,
  ) {
    if (!quarter) return [];
    const listId = rankingListId && !isNaN(Number(rankingListId)) ? Number(rankingListId) : undefined;
    return this.service.getPublished(quarter, listId);
  }

  @Public()
  @Get('quarters')
  async getQuarters() {
    return this.service.getQuarters();
  }

  @Public()
  @Get('avatars')
  async getAvatars() {
    return this.service.getAvatarMap();
  }

  @Post('upload-avatars')
  @UseGuards(RolesGuard)
  @Roles('super_admin', 'admin')
  @UseInterceptors(FilesInterceptor('files', 50, { limits: { fileSize: 5 * 1024 * 1024 } }))
  async uploadAvatars(@UploadedFiles() files: Express.Multer.File[]) {
    return this.service.uploadAvatars(files);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles('super_admin', 'admin')
  async create(@Body() body: any) {
    return this.service.create(body);
  }

  @Post('batch')
  @UseGuards(RolesGuard)
  @Roles('super_admin', 'admin')
  async batchCreate(@Body() body: { items: any[] }) {
    return this.service.batchCreate(body.items);
  }

  @Post('import')
  @UseGuards(RolesGuard)
  @Roles('super_admin', 'admin')
  async importFromRanking(@Body() body: { quarter: string; rankingListId: number; topN: number }) {
    return this.service.importFromRanking(body.quarter, body.rankingListId, body.topN);
  }

  @Put(':id')
  @UseGuards(RolesGuard)
  @Roles('super_admin', 'admin')
  async update(@Param('id') id: string, @Body() body: any) {
    return this.service.update(Number(id), body);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles('super_admin', 'admin')
  async remove(@Param('id') id: string) {
    return this.service.remove(Number(id));
  }

  @Post('publish')
  @UseGuards(RolesGuard)
  @Roles('super_admin')
  async publish(@Body() body: { quarter: string }, @Request() req: any) {
    return this.service.publish(body.quarter, req.user.id);
  }

  @Post('unpublish')
  @UseGuards(RolesGuard)
  @Roles('super_admin')
  async unpublish(@Body() body: { quarter: string }) {
    return this.service.unpublish(body.quarter);
  }
}
