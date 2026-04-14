import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { ScoreProfileTemplate } from './score-profile-template.entity';
import { ScoreProfileDimension } from './score-profile-dimension.entity';
import { User } from '../user/user.entity';
import { PointRecord } from '../point/point-record.entity';

@Injectable()
export class ScoreProfileService {
  constructor(
    @InjectRepository(ScoreProfileTemplate)
    private readonly templateRepo: Repository<ScoreProfileTemplate>,
    @InjectRepository(ScoreProfileDimension)
    private readonly dimensionRepo: Repository<ScoreProfileDimension>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(PointRecord)
    private readonly pointRepo: Repository<PointRecord>,
    private readonly dataSource: DataSource,
  ) {}

  // ---- CRUD ----

  async findAllTemplates() {
    return this.templateRepo.find({
      order: { priority: 'DESC', id: 'ASC' },
      relations: ['dimensions'],
    });
  }

  async findTemplateById(id: number) {
    const tpl = await this.templateRepo.findOne({
      where: { id },
      relations: ['dimensions'],
    });
    if (!tpl) throw new NotFoundException('模板不存在');
    return tpl;
  }

  async createTemplate(dto: {
    name: string;
    matchType: string;
    matchValue?: string;
    priority?: number;
    isActive?: number;
    description?: string;
    dimensions?: Partial<ScoreProfileDimension>[];
  }) {
    const tpl = this.templateRepo.create({
      name: dto.name,
      matchType: dto.matchType,
      matchValue: dto.matchValue || null,
      priority: dto.priority ?? 0,
      isActive: dto.isActive ?? 1,
      description: dto.description || null,
    } as Partial<ScoreProfileTemplate>);

    const saved = await this.templateRepo.save(tpl);

    if (dto.dimensions?.length) {
      const dims = dto.dimensions.map((d, i) =>
        this.dimensionRepo.create({
          templateId: saved.id,
          name: d.name,
          sourceType: d.sourceType || 'custom',
          sourceId: d.sourceId || null,
          sortOrder: d.sortOrder ?? i,
          refType: d.refType || 'average',
          refValue: d.refValue ?? null,
          refScope: d.refScope || 'all',
        } as Partial<ScoreProfileDimension>),
      );
      await this.dimensionRepo.save(dims);
    }

    return this.findTemplateById(saved.id);
  }

  async updateTemplate(
    id: number,
    dto: {
      name?: string;
      matchType?: string;
      matchValue?: string;
      priority?: number;
      isActive?: number;
      description?: string;
      dimensions?: Partial<ScoreProfileDimension>[];
    },
  ) {
    const tpl = await this.findTemplateById(id);

    if (dto.name !== undefined) tpl.name = dto.name;
    if (dto.matchType !== undefined) tpl.matchType = dto.matchType;
    if (dto.matchValue !== undefined) tpl.matchValue = dto.matchValue || null;
    if (dto.priority !== undefined) tpl.priority = dto.priority;
    if (dto.isActive !== undefined) tpl.isActive = dto.isActive;
    if (dto.description !== undefined) tpl.description = dto.description || null;

    await this.templateRepo.save(tpl);

    // 如果传了 dimensions 数组，则全量替换
    if (dto.dimensions) {
      await this.dimensionRepo.delete({ templateId: id });
      if (dto.dimensions.length) {
        const dims = dto.dimensions.map((d, i) =>
          this.dimensionRepo.create({
            templateId: id,
            name: d.name,
            sourceType: d.sourceType || 'custom',
            sourceId: d.sourceId || null,
            sortOrder: d.sortOrder ?? i,
            refType: d.refType || 'average',
            refValue: d.refValue ?? null,
            refScope: d.refScope || 'all',
          } as Partial<ScoreProfileDimension>),
        );
        await this.dimensionRepo.save(dims);
      }
    }

    return this.findTemplateById(id);
  }

  async removeTemplate(id: number) {
    await this.findTemplateById(id);
    await this.templateRepo.delete(id);
    return { message: '删除成功' };
  }

  // ---- 模板匹配 ----

  /**
   * 按优先级匹配模板: ranking_list > position > default
   */
  async getMatchedTemplate(userId: number): Promise<{ template: ScoreProfileTemplate | null; user: User | null }> {
    const user = await this.userRepo.findOne({
      where: { id: userId },
      relations: ['rankingList'],
    });
    if (!user) return { template: null, user: null };

    const activeTemplates = await this.templateRepo.find({
      where: { isActive: 1 },
      order: { priority: 'DESC', id: 'ASC' },
      relations: ['dimensions'],
    });

    // 1. 榜单匹配（最高优先）
    if (user.rankingListId) {
      const rlMatch = activeTemplates.find(
        (t) => t.matchType === 'ranking_list' && String(t.matchValue) === String(user.rankingListId),
      );
      if (rlMatch) return { template: rlMatch, user };
    }

    // 2. 岗位匹配
    if (user.position) {
      const posMatch = activeTemplates.find(
        (t) => t.matchType === 'position' && t.matchValue === user.position,
      );
      if (posMatch) return { template: posMatch, user };
    }

    // 3. 默认模板
    const defaultTpl = activeTemplates.find((t) => t.matchType === 'default');
    return { template: defaultTpl || null, user };
  }

  // ---- 维度数据计算 ----

  /**
   * 为指定用户计算画像数据（各维度的实际值和参考值）
   */
  async getUserProfileData(userId: number) {
    const { template, user } = await this.getMatchedTemplate(userId);
    if (!template || !template.dimensions?.length) {
      return { template: null, dimensions: [] };
    }

    const dims = [...template.dimensions].sort((a, b) => a.sortOrder - b.sortOrder);
    const rankingListId = user?.rankingListId;

    // 获取用户所有已通过的积分记录（含指标关联）
    const userPoints = await this.pointRepo.find({
      where: { userId, auditStatus: 1 },
      relations: ['indicator'],
    });

    const result = [];

    for (const dim of dims) {
      let value = 0;
      let refValue: number | null = null;

      if (dim.sourceType === 'category') {
        // 按管控项分类汇总该用户的积分
        value = userPoints
          .filter((p) => p.indicator?.categoryId === dim.sourceId)
          .reduce((sum, p) => sum + Math.abs(Number(p.score)), 0);

        refValue = await this.calcReferenceValue(dim, rankingListId);
      } else if (dim.sourceType === 'indicator') {
        // 按单个指标汇总该用户的积分
        value = userPoints
          .filter((p) => p.indicatorId === dim.sourceId)
          .reduce((sum, p) => sum + Math.abs(Number(p.score)), 0);

        refValue = await this.calcReferenceValue(dim, rankingListId);
      } else {
        // custom: 值为 0，参考值为固定值
        value = 0;
        refValue = dim.refValue ? Number(dim.refValue) : null;
      }

      result.push({
        name: dim.name,
        value: Math.round(value * 10) / 10,
        refValue: refValue !== null ? Math.round(refValue * 10) / 10 : null,
        sourceType: dim.sourceType,
        sourceId: dim.sourceId,
        refType: dim.refType,
      });
    }

    return {
      template: {
        id: template.id,
        name: template.name,
        matchType: template.matchType,
      },
      dimensions: result,
    };
  }

  private async calcReferenceValue(dim: ScoreProfileDimension, rankingListId?: number): Promise<number | null> {
    if (dim.refType === 'fixed') {
      return dim.refValue ? Number(dim.refValue) : null;
    }

    // 判断是否按榜单范围过滤（refScope='ranking_list' 且用户有榜单时生效，否则回退全员）
    const filterByRankingList = dim.refScope === 'ranking_list' && !!rankingListId;
    const extraJoin = filterByRankingList ? 'INNER JOIN user u ON pr.user_id = u.id' : '';
    const extraWhere = filterByRankingList ? 'AND u.ranking_list_id = ?' : '';
    const sourceCondition = dim.sourceType === 'category' ? 'AND ind.category_id = ?' : 'AND pr.indicator_id = ?';
    const params: any[] = [dim.sourceId];
    if (filterByRankingList) params.push(rankingListId);

    if (dim.refType === 'average') {
      const rows: { avg_score: string }[] = await this.dataSource.query(
        `SELECT AVG(user_total) AS avg_score FROM (
          SELECT pr.user_id, SUM(ABS(pr.score)) AS user_total
          FROM point_record pr
          INNER JOIN indicator ind ON pr.indicator_id = ind.id
          ${extraJoin}
          WHERE pr.audit_status = 1
          ${sourceCondition}
          ${extraWhere}
          GROUP BY pr.user_id
        ) sub`,
        params,
      );
      return rows[0]?.avg_score ? Number(rows[0].avg_score) : null;
    }

    if (dim.refType === 'max') {
      const rows: { max_score: string }[] = await this.dataSource.query(
        `SELECT MAX(user_total) AS max_score FROM (
          SELECT pr.user_id, SUM(ABS(pr.score)) AS user_total
          FROM point_record pr
          INNER JOIN indicator ind ON pr.indicator_id = ind.id
          ${extraJoin}
          WHERE pr.audit_status = 1
          ${sourceCondition}
          ${extraWhere}
          GROUP BY pr.user_id
        ) sub`,
        params,
      );
      return rows[0]?.max_score ? Number(rows[0].max_score) : null;
    }

    return null;
  }
}
