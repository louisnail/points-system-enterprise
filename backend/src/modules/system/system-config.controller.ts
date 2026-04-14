import { Controller, Get, Put, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { SystemConfigService } from './system-config.service';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('系统配置')
@ApiBearerAuth()
@Controller('system/configs')
export class SystemConfigController {
  constructor(private readonly service: SystemConfigService) {}

  @Get()
  @ApiOperation({ summary: '获取所有配置' })
  async findAll() {
    return this.service.findAll();
  }

  @Put()
  @Roles('super_admin')
  @ApiOperation({ summary: '更新配置' })
  async upsert(@Body() configs: { configKey: string; configValue: string }[]) {
    return this.service.upsert(configs);
  }
}
