import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SystemConfig } from './system-config.entity';

@Injectable()
export class SystemConfigService {
  constructor(
    @InjectRepository(SystemConfig)
    private readonly repo: Repository<SystemConfig>,
  ) {}

  async findAll() {
    return this.repo.find();
  }

  async getByKey(key: string) {
    return this.repo.findOne({ where: { configKey: key } });
  }

  async upsert(configs: { configKey: string; configValue: string }[]) {
    for (const c of configs) {
      const existing = await this.repo.findOne({ where: { configKey: c.configKey } });
      if (existing) {
        existing.configValue = c.configValue;
        await this.repo.save(existing);
      } else {
        await this.repo.save(this.repo.create(c));
      }
    }
    return { message: '配置已更新' };
  }
}
