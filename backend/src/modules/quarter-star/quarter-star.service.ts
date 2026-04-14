import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as fs from 'fs';
import * as path from 'path';
import { QuarterStar } from './quarter-star.entity';
import { User } from '../user/user.entity';
import { RankingList } from '../ranking-list/ranking-list.entity';
import { RankingService } from '../ranking/ranking.service';

const AVATAR_DIR = path.join(process.cwd(), 'uploads', 'quarter-star-avatars');

@Injectable()
export class QuarterStarService {
  constructor(
    @InjectRepository(QuarterStar) private repo: Repository<QuarterStar>,
    @InjectRepository(User) private userRepo: Repository<User>,
    @InjectRepository(RankingList) private rankingListRepo: Repository<RankingList>,
    private readonly rankingService: RankingService,
  ) {}

  async findByQuarter(quarter: string, rankingListId?: number) {
    const query = this.repo
      .createQueryBuilder('qs')
      .leftJoinAndSelect('qs.user', 'u')
      .leftJoinAndSelect('u.department', 'd')
      .leftJoinAndSelect('qs.rankingList', 'rl')
      .where('qs.quarter = :quarter', { quarter })
      .orderBy('qs.displayOrder', 'ASC');

    if (rankingListId) {
      query.andWhere('qs.rankingListId = :rankingListId', { rankingListId });
    }

    return query.getMany();
  }

  async getPublished(quarter: string, rankingListId?: number) {
    const query = this.repo
      .createQueryBuilder('qs')
      .leftJoinAndSelect('qs.user', 'u')
      .leftJoinAndSelect('u.department', 'd')
      .leftJoinAndSelect('qs.rankingList', 'rl')
      .where('qs.quarter = :quarter', { quarter })
      .andWhere('qs.isPublished = 1')
      .orderBy('qs.displayOrder', 'ASC');

    if (rankingListId) {
      query.andWhere('qs.rankingListId = :rankingListId', { rankingListId });
    }

    return query.getMany();
  }

  async create(data: Partial<QuarterStar>) {
    const entity = this.repo.create(data);
    return this.repo.save(entity);
  }

  async batchCreate(items: Partial<QuarterStar>[]) {
    const entities = items.map((item) => this.repo.create(item));
    return this.repo.save(entities);
  }

  async update(id: number, data: Partial<QuarterStar>) {
    await this.repo.update(id, data);
    return this.repo.findOne({ where: { id }, relations: ['user', 'rankingList'] });
  }

  async remove(id: number) {
    const entity = await this.repo.findOne({ where: { id } });
    if (!entity) throw new NotFoundException('季度之星记录不存在');
    await this.repo.remove(entity);
    return { success: true };
  }

  async publish(quarter: string, publisherId: number) {
    await this.repo.update(
      { quarter },
      { isPublished: 1, publishedAt: new Date(), publishedBy: publisherId },
    );
    return { success: true, message: `${quarter} 季度之星已发布` };
  }

  async unpublish(quarter: string) {
    await this.repo.update(
      { quarter },
      { isPublished: 0, publishedAt: null as any, publishedBy: null as any },
    );
    return { success: true, message: `${quarter} 季度之星已撤回` };
  }

  async getQuarters(): Promise<string[]> {
    const result = await this.repo
      .createQueryBuilder('qs')
      .select('DISTINCT qs.quarter', 'quarter')
      .orderBy('qs.quarter', 'DESC')
      .getRawMany();
    return result.map((r) => r.quarter);
  }

  async importFromRanking(quarter: string, rankingListId: number, topN: number) {
    // Parse quarter "2026-Q1" → ["2026-01","2026-02","2026-03"]
    const [year, q] = quarter.split('-Q');
    const qNum = parseInt(q, 10);
    const months = Array.from({ length: 3 }, (_, i) =>
      `${year}-${String((qNum - 1) * 3 + i + 1).padStart(2, '0')}`,
    );

    // 检测是否副榜，选择对应 API
    const rl = await this.rankingListRepo.findOne({ where: { id: rankingListId } });
    const isSecondary = rl?.isSecondary === 1;

    // Aggregate totalScore across 3 months per user
    const scoreMap = new Map<number, { userId: number; name: string; total: number }>();
    for (const month of months) {
      const rankings = isSecondary
        ? await this.rankingService.getSecondaryRanking(month, rankingListId)
        : await this.rankingService.getMonthlyRanking(month, rankingListId);
      for (const r of rankings) {
        const cur = scoreMap.get(r.userId) || { userId: r.userId, name: r.name, total: 0 };
        cur.total += r.totalScore;
        scoreMap.set(r.userId, cur);
      }
    }

    // Sort descending by total, take Top N
    const sorted = [...scoreMap.values()].sort((a, b) => b.total - a.total).slice(0, topN);

    // Skip existing records, batch create new ones
    let imported = 0;
    let skipped = 0;
    for (let i = 0; i < sorted.length; i++) {
      const exists = await this.repo.findOne({
        where: { quarter, userId: sorted[i].userId, rankingListId },
      });
      if (exists) {
        skipped++;
        continue;
      }
      await this.repo.save(
        this.repo.create({
          quarter,
          userId: sorted[i].userId,
          rankingListId,
          displayOrder: i + 1,
        }),
      );
      imported++;
    }

    return { imported, skipped };
  }

  async uploadAvatars(files: Express.Multer.File[]) {
    fs.mkdirSync(AVATAR_DIR, { recursive: true });
    let success = 0;
    let failed = 0;
    const errors: string[] = [];
    const ALLOWED_EXTS = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];

    for (const file of files) {
      const parsed = path.parse(file.originalname);
      const employeeNo = parsed.name;
      const ext = parsed.ext.toLowerCase();

      // 文件类型校验
      if (!ALLOWED_EXTS.includes(ext)) {
        failed++;
        errors.push(`文件 ${file.originalname} 类型不允许，仅支持 ${ALLOWED_EXTS.join('/')}`);
        continue;
      }

      // 文件名安全校验（防止路径遍历）
      if (employeeNo.includes('..') || employeeNo.includes('/') || employeeNo.includes('\\')) {
        failed++;
        errors.push(`文件 ${file.originalname} 名称不合法`);
        continue;
      }

      const user = await this.userRepo.findOne({ where: { employeeNo } });
      if (!user) {
        failed++;
        errors.push(`工号 ${employeeNo} 不存在`);
        continue;
      }

      // 删除同工号旧文件（可能不同扩展名）
      try {
        const existing = fs.readdirSync(AVATAR_DIR).filter((f) => {
          const n = path.parse(f).name;
          return n === employeeNo;
        });
        for (const old of existing) {
          fs.unlinkSync(path.join(AVATAR_DIR, old));
        }
      } catch {
        /* ignore */
      }

      fs.writeFileSync(path.join(AVATAR_DIR, employeeNo + ext), file.buffer);
      success++;
    }

    return { success, failed, errors };
  }

  getAvatarMap(): Record<string, string> {
    if (!fs.existsSync(AVATAR_DIR)) return {};
    const files = fs.readdirSync(AVATAR_DIR);
    const map: Record<string, string> = {};
    for (const file of files) {
      const parsed = path.parse(file);
      map[parsed.name] = `/uploads/quarter-star-avatars/${file}`;
    }
    return map;
  }
}
