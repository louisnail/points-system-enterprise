import {
  Controller, Get, Post, Put, Delete, Body, Param, ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ScoreProfileService } from './score-profile.service';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('积分画像')
@ApiBearerAuth()
@Controller('score-profiles')
export class ScoreProfileController {
  constructor(private readonly service: ScoreProfileService) {}

  @Get('templates')
  @ApiOperation({ summary: '获取所有画像模板' })
  async findAll() {
    return this.service.findAllTemplates();
  }

  @Get('templates/:id')
  @ApiOperation({ summary: '获取模板详情' })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findTemplateById(id);
  }

  @Post('templates')
  @Roles('super_admin')
  @ApiOperation({ summary: '新增画像模板' })
  async create(@Body() dto: any) {
    return this.service.createTemplate(dto);
  }

  @Put('templates/:id')
  @Roles('super_admin')
  @ApiOperation({ summary: '编辑画像模板' })
  async update(@Param('id', ParseIntPipe) id: number, @Body() dto: any) {
    return this.service.updateTemplate(id, dto);
  }

  @Delete('templates/:id')
  @Roles('super_admin')
  @ApiOperation({ summary: '删除画像模板' })
  async remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.removeTemplate(id);
  }

  @Get('user/:userId')
  @ApiOperation({ summary: '获取用户积分画像数据' })
  async getUserProfile(@Param('userId', ParseIntPipe) userId: number) {
    return this.service.getUserProfileData(userId);
  }
}
