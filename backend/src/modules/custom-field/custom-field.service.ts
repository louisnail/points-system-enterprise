import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CustomFieldDefinition } from './custom-field.entity';

@Injectable()
export class CustomFieldService {
  constructor(
    @InjectRepository(CustomFieldDefinition)
    private readonly repo: Repository<CustomFieldDefinition>,
  ) {}

  async findByModule(targetModule: string) {
    return this.repo.find({
      where: { targetModule },
      order: { sortOrder: 'ASC', id: 'ASC' },
    });
  }

  async create(dto: Partial<CustomFieldDefinition>) {
    // Auto-generate fieldKey if not provided
    if (!dto.fieldKey) {
      dto.fieldKey = `cf_${Date.now()}`;
    }
    const existing = await this.repo.findOne({
      where: { targetModule: dto.targetModule, fieldKey: dto.fieldKey },
    });
    if (existing) {
      throw new BadRequestException(`字段标识 "${dto.fieldKey}" 已存在`);
    }
    const maxSort = await this.repo
      .createQueryBuilder('cf')
      .select('MAX(cf.sort_order)', 'max')
      .where('cf.target_module = :mod', { mod: dto.targetModule })
      .getRawOne();
    dto.sortOrder = (maxSort?.max ?? 0) + 1;
    return this.repo.save(this.repo.create(dto));
  }

  async update(id: number, dto: Partial<CustomFieldDefinition>) {
    const field = await this.repo.findOneBy({ id });
    if (!field) throw new BadRequestException('字段不存在');
    Object.assign(field, dto);
    return this.repo.save(field);
  }

  async remove(id: number) {
    const field = await this.repo.findOneBy({ id });
    if (!field) throw new BadRequestException('字段不存在');
    await this.repo.remove(field);
    return { message: '已删除' };
  }

  async batchUpdateSort(items: { id: number; sortOrder: number }[]) {
    for (const item of items) {
      await this.repo.update(item.id, { sortOrder: item.sortOrder });
    }
    return { message: '排序已更新' };
  }
}
