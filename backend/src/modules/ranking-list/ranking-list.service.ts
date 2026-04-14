import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RankingList } from './ranking-list.entity';

@Injectable()
export class RankingListService {
  constructor(
    @InjectRepository(RankingList)
    private readonly repo: Repository<RankingList>,
  ) {}

  async findAll() {
    return this.repo.find({ order: { id: 'ASC' } });
  }

  async findOne(id: number) {
    const item = await this.repo.findOne({ where: { id } });
    if (!item) throw new NotFoundException('榜单不存在');
    return item;
  }

  async create(dto: Partial<RankingList>) {
    return this.repo.save(this.repo.create(dto));
  }

  async update(id: number, dto: Partial<RankingList>) {
    const item = await this.findOne(id);
    Object.assign(item, dto);
    return this.repo.save(item);
  }

  async remove(id: number) {
    await this.findOne(id);
    await this.repo.delete(id);
    return { message: '删除成功' };
  }
}
