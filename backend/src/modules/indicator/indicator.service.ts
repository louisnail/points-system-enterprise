import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Indicator } from './indicator.entity';
import { IndicatorCategory } from './indicator-category.entity';
import { RankingList } from '../ranking-list/ranking-list.entity';
import { PointRecord } from '../point/point-record.entity';
import { ScoreProfileDimension } from '../score-profile/score-profile-dimension.entity';
import * as ExcelJS from 'exceljs';
import { Response } from 'express';

@Injectable()
export class IndicatorService {
  constructor(
    @InjectRepository(Indicator)
    private readonly repo: Repository<Indicator>,
    @InjectRepository(IndicatorCategory)
    private readonly categoryRepo: Repository<IndicatorCategory>,
    @InjectRepository(RankingList)
    private readonly rankingListRepo: Repository<RankingList>,
    @InjectRepository(PointRecord)
    private readonly pointRecordRepo: Repository<PointRecord>,
    @InjectRepository(ScoreProfileDimension)
    private readonly dimensionRepo: Repository<ScoreProfileDimension>,
  ) {}

  async findAll(query: {
    categoryId?: number;
    direction?: number;
    pointStatus?: number;
    rankingListId?: number;
    includeInactive?: boolean;
  }) {
    const qb = this.repo.createQueryBuilder('i')
      .leftJoinAndSelect('i.category', 'cat')
      .leftJoinAndSelect('i.rankingList', 'rl');

    if (!query.includeInactive) {
      qb.where('i.is_active = 1');
    }
    if (query.categoryId) {
      qb.andWhere('i.category_id = :categoryId', { categoryId: query.categoryId });
    }
    if (query.direction) {
      qb.andWhere('i.direction = :direction', { direction: query.direction });
    }
    if (query.pointStatus) {
      qb.andWhere('i.point_status = :pointStatus', { pointStatus: query.pointStatus });
    }
    if (query.rankingListId) {
      // Show indicators for this ranking list OR universal indicators (null)
      qb.andWhere('(i.ranking_list_id = :rlId OR i.ranking_list_id IS NULL)', { rlId: query.rankingListId });
    }

    return qb.orderBy('i.id', 'ASC').getMany();
  }

  async searchByKeyword(params: {
    keyword: string;
    rankingListIds?: number[];
    limit?: number;
  }) {
    const { keyword, rankingListIds, limit = 20 } = params;
    if (!keyword?.trim()) return [];

    const qb = this.repo.createQueryBuilder('i')
      .leftJoinAndSelect('i.category', 'cat')
      .leftJoinAndSelect('i.rankingList', 'rl')
      .where('i.is_active = 1');

    if (rankingListIds && rankingListIds.length > 0) {
      // 匹配指定榜单 + 通用指标(NULL) + 通用积分归类
      qb.andWhere('(i.ranking_list_id IN (:...rlIds) OR i.ranking_list_id IS NULL OR i.ranking_list_type = :universalType)', { rlIds: rankingListIds, universalType: '通用积分' });
    }

    const allIndicators = await qb.orderBy('i.id', 'ASC').getMany();

    const keywords = keyword.trim().split(/[\s,，、]+/).filter(Boolean);
    const scored = allIndicators.map(ind => {
      let score = 0;
      const nameLC = ind.name.toLowerCase();
      const catNameLC = ind.category?.name?.toLowerCase() || '';
      const rlTypeLC = ind.rankingListType?.toLowerCase() || '';
      for (const kw of keywords) {
        const kwLC = kw.toLowerCase();
        // 管控项、评价维度、积分归类同时参与匹配（叠加计分）
        const nameMatch = nameLC.includes(kwLC);
        const catMatch = catNameLC.includes(kwLC);
        const rlTypeMatch = rlTypeLC.includes(kwLC);
        if (nameMatch) score += 50;
        if (catMatch) score += 40;
        if (rlTypeMatch) score += 20;
        // 都没有完整匹配时，按字符级别匹配
        if (!nameMatch && !catMatch && !rlTypeMatch) {
          for (const ch of kwLC) {
            if (nameLC.includes(ch)) score += 5;
            if (catNameLC.includes(ch)) score += 3;
          }
        }
      }
      return {
        id: ind.id,
        name: ind.name,
        direction: ind.direction,
        scoreType: ind.scoreType,
        fixedScore: ind.fixedScore,
        minScore: ind.minScore,
        maxScore: ind.maxScore,
        pointStatus: ind.pointStatus,
        categoryId: ind.categoryId,
        categoryName: ind.category?.name || '',
        rankingListId: ind.rankingListId,
        rankingListType: ind.rankingListType || null,
        rankingListName: ind.rankingList?.name || null,
        matchScore: score,
      };
    });

    const maxScore = Math.max(...scored.map(r => r.matchScore), 1);
    return scored
      .filter(r => r.matchScore > 0)
      .map(r => ({ ...r, matchScore: Math.min(Math.round((r.matchScore / maxScore) * 100), 99) }))
      .sort((a, b) => b.matchScore - a.matchScore)
      .slice(0, limit);
  }

  async findOne(id: number) {
    const item = await this.repo.findOne({ where: { id }, relations: ['category'] });
    if (!item) throw new NotFoundException('指标不存在');
    return item;
  }

  async create(dto: Partial<Indicator>) {
    return this.repo.save(this.repo.create(dto));
  }

  async update(id: number, dto: Partial<Indicator>) {
    const item = await this.findOne(id);
    Object.assign(item, dto);
    return this.repo.save(item);
  }

  async remove(id: number) {
    const item = await this.findOne(id);
    item.isActive = 0;
    return this.repo.save(item);
  }

  async batchSetRankingList(ids: number[], rankingListId: number | null) {
    if (!ids || !ids.length) throw new BadRequestException('请选择指标');
    await this.repo.createQueryBuilder()
      .update(Indicator)
      .set({ rankingListId: rankingListId as any })
      .whereInIds(ids)
      .execute();
    return { success: ids.length };
  }

  async exportExcel(res: Response) {
    const list = await this.findAll({ includeInactive: true });
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('指标列表');

    const dirMap: Record<number, string> = { 1: '加分', [-1]: '扣分' };
    const statusMap: Record<number, string> = { 1: '过程分', 2: '结果分' };
    const centerAlign: Partial<ExcelJS.Alignment> = { horizontal: 'center', vertical: 'middle' };

    sheet.columns = [
      { header: '管控项', key: 'category', width: 20 },
      { header: '评价维度', key: 'name', width: 30 },
      { header: '方向', key: 'direction', width: 8 },
      { header: '标准分值', key: 'score', width: 15 },
      { header: '积分状态', key: 'pointStatus', width: 10 },
      { header: '积分归类', key: 'rankingListType', width: 15 },
      { header: '关联榜单', key: 'rankingList', width: 20 },
      { header: '状态', key: 'isActive', width: 8 },
    ];
    for (let c = 1; c <= 8; c++) {
      sheet.getColumn(c).alignment = centerAlign;
    }

    for (const item of list) {
      const score = item.scoreType === 1
        ? String(Number(item.fixedScore))
        : `${Number(item.minScore)}～${Number(item.maxScore)}`;
      sheet.addRow({
        category: item.category?.name || '',
        name: item.name,
        direction: dirMap[item.direction] || '',
        score,
        pointStatus: statusMap[item.pointStatus] || '',
        rankingListType: item.rankingListType,
        rankingList: item.rankingList?.name || '通用',
        isActive: item.isActive === 1 ? '启用' : '停用',
      });
    }

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=indicators.xlsx');
    await workbook.xlsx.write(res);
    res.end();
  }

  async getTemplate(res: Response) {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('指标导入模板');

    const categories = await this.categoryRepo.find();
    const categoryNames = categories.map(c => c.name).join('、');
    const rankingLists = await this.rankingListRepo.find();
    const rankingListNames = rankingLists.map(r => r.name).join('、');

    const hintFont: Partial<ExcelJS.Font> = { color: { argb: 'FF999999' }, italic: true, size: 10 };
    const centerAlign: Partial<ExcelJS.Alignment> = { horizontal: 'center', vertical: 'middle', wrapText: true };

    // 设置列宽 + 居中对齐
    const colWidths = [20, 30, 12, 18, 14, 22, 22];
    for (let c = 0; c < colWidths.length; c++) {
      sheet.getColumn(c + 1).width = colWidths[c];
      sheet.getColumn(c + 1).alignment = centerAlign;
    }

    // 行1: 填写说明（合并 A1:G1）
    sheet.addRow([`【填写说明】以下提示行可删除，不影响导入。带*为必填项。标准分值*：固定值填数字如 10；范围值填 1～10（用全角"～"连接，非半角"-"）。方向*：填"加分"或"扣分"。积分状态*：填"过程分"或"结果分"。`]);
    sheet.mergeCells('A1:G1');
    const r1 = sheet.getRow(1);
    r1.font = hintFont;
    r1.alignment = { vertical: 'middle', wrapText: true };
    r1.height = 30;

    // 行2: 规范说明（合并 A2:G2）
    const catHint = categoryNames ? `可选管控项: ${categoryNames}。` : '';
    const rlHint = rankingListNames ? `可选榜单: ${rankingListNames}。` : '';
    sheet.addRow([`【规范说明】${catHint}${rlHint}积分归类与榜单匹配规则：通用积分（无关联榜单）及副榜积分→可匹配所有榜单人员。关联榜单留空=通用（不限榜单）。`]);
    sheet.mergeCells('A2:G2');
    const r2 = sheet.getRow(2);
    r2.font = hintFont;
    r2.alignment = { vertical: 'middle', wrapText: true };
    r2.height = 30;

    // 行3: 注意（合并 A3:G3）
    sheet.addRow(['【注意】积分归类含特定榜单名的（如"项目经理积分"）只能匹配给对应"项目经理"榜单的人员，否则导入时给予警告。']);
    sheet.mergeCells('A3:G3');
    const r3 = sheet.getRow(3);
    r3.font = hintFont;
    r3.alignment = { vertical: 'middle', wrapText: true };
    r3.height = 25;

    // 行4: 空行分隔
    sheet.addRow([]);

    // 行5: 表头
    const headerRow = sheet.addRow([
      '管控项*', '评价维度*', '方向*', '标准分值*', '积分状态*', '积分归类', '关联榜单',
    ]);
    headerRow.font = { bold: true };
    headerRow.eachCell((cell) => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF2F2F2' } };
      cell.border = { bottom: { style: 'thin', color: { argb: 'FFD9D9D9' } } };
      cell.alignment = centerAlign;
    });

    // 行6: 固定分值示例
    const exampleCat = categories.length > 0 ? categories[0].name : '项目损益经营';
    const exampleRL = rankingLists.length > 0 ? rankingLists[0].name : '项目经理';
    sheet.addRow([exampleCat, '正偏离(0,10%)', '加分', '10', '过程分', '项目经理积分', exampleRL]);

    // 行7: 范围分值示例
    sheet.addRow([exampleCat, '成本偏离率', '扣分', '1～10', '结果分', '通用积分', '']);

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=indicator_template.xlsx');
    await workbook.xlsx.write(res);
    res.end();
  }

  async importFromExcel(buffer: Buffer) {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer as any);
    const sheet = workbook.worksheets[0];
    if (!sheet) throw new BadRequestException('Excel文件为空');

    const dirMap: Record<string, number> = { '加分': 1, '扣分': -1 };
    const statusMap: Record<string, number> = { '过程分': 1, '结果分': 2 };

    // 预加载所有管控项和榜单
    const allCategories = await this.categoryRepo.find();
    const categoryNameMap = new Map(allCategories.map(c => [c.name.trim(), c.id]));
    const allRankingLists = await this.rankingListRepo.find();
    const rankingListNameMap = new Map(allRankingLists.map(r => [r.name.trim(), r]));

    const results = { success: 0, failed: 0, errors: [] as string[], warnings: [] as string[] };

    // 自适应找到表头行：扫描前10行，找到包含"评价维度"或"管控项"的行
    let headerRowIdx = 0;
    for (let r = 1; r <= Math.min(10, sheet.rowCount); r++) {
      const row = sheet.getRow(r);
      for (let c = 1; c <= 7; c++) {
        const val = row.getCell(c).text?.trim();
        if (val && val.includes('评价维度') && !val.includes('【')) {
          headerRowIdx = r;
          break;
        }
      }
      if (headerRowIdx > 0) break;
    }
    if (headerRowIdx === 0) {
      throw new BadRequestException('未找到表头行（应包含"评价维度"列），请检查模板格式');
    }

    for (let i = headerRowIdx + 1; i <= sheet.rowCount; i++) {
      const row = sheet.getRow(i);
      try {
        // 7列: 管控项(1) 评价维度(2) 方向(3) 标准分值(4) 积分状态(5) 积分归类(6) 关联榜单(7)
        const categoryNameRaw = row.getCell(1).text?.trim();
        // 跳过提示行（以 【 或 [ 开头）和空行
        if (!categoryNameRaw || categoryNameRaw.startsWith('【') || categoryNameRaw.startsWith('[')) continue;

        const categoryId = categoryNameMap.get(categoryNameRaw);
        const name = row.getCell(2).text?.trim();
        const direction = dirMap[row.getCell(3).text?.trim()];

        // 解析标准分值列：固定值 "10" 或范围值 "1～10"
        const scoreRaw = row.getCell(4).text?.trim();
        let scoreType: number | undefined;
        let fixedScore: number | undefined;
        let minScore: number | undefined;
        let maxScore: number | undefined;

        if (scoreRaw && (scoreRaw.includes('～') || scoreRaw.includes('~'))) {
          scoreType = 2;
          const parts = scoreRaw.split(/[～~]/);
          minScore = parseFloat(parts[0]?.trim());
          maxScore = parseFloat(parts[1]?.trim());
          if (isNaN(minScore) || isNaN(maxScore)) {
            results.errors.push(`第${i}行: 标准分值范围格式错误，应为"最小值～最大值"如"1～10"`);
            results.failed++;
            continue;
          }
        } else if (scoreRaw) {
          scoreType = 1;
          fixedScore = parseFloat(scoreRaw);
          if (isNaN(fixedScore)) {
            results.errors.push(`第${i}行: 标准分值格式错误，固定值应为数字如"10"`);
            results.failed++;
            continue;
          }
        } else {
          results.errors.push(`第${i}行: 标准分值不能为空`);
          results.failed++;
          continue;
        }

        const pointStatus = statusMap[row.getCell(5).text?.trim()];
        const rankingListType = row.getCell(6).text?.trim() || undefined;
        const rankingListNameRaw = row.getCell(7).text?.trim();

        if (!categoryId) {
          results.errors.push(`第${i}行: 管控项"${categoryNameRaw}"不存在`);
          results.failed++;
          continue;
        }
        if (!name || !direction || !pointStatus) {
          results.errors.push(`第${i}行: 必填字段缺失（管控项、评价维度、方向、标准分值、积分状态均为必填）`);
          results.failed++;
          continue;
        }

        // 关联榜单匹配
        let rankingListId: number | undefined = undefined;
        let rankingListName = '';
        if (rankingListNameRaw) {
          const rl = rankingListNameMap.get(rankingListNameRaw);
          if (!rl) {
            results.errors.push(`第${i}行: 榜单"${rankingListNameRaw}"不存在`);
            results.failed++;
            continue;
          }
          rankingListId = rl.id;
          rankingListName = rl.name;
        }

        // 积分归类与榜单匹配校验（动态判断：无关联榜单或副榜视为通用）
        const typeKeyword = rankingListType ? rankingListType.replace(/积分$/, '') : '';
        const matchingRL = typeKeyword ? allRankingLists.find(r => r.name.includes(typeKeyword) || typeKeyword.includes(r.name)) : undefined;
        const isUniversalType = !matchingRL || matchingRL.isSecondary === 1;
        if (rankingListType && !isUniversalType) {
          if (rankingListNameRaw) {
            if (!rankingListName.includes(typeKeyword) && !typeKeyword.includes(rankingListName)) {
              results.warnings.push(
                `第${i}行: 积分归类"${rankingListType}"与关联榜单"${rankingListName}"不匹配——` +
                `"${rankingListType}"类指标通常只能匹配给"${typeKeyword}"榜单的人员`,
              );
            }
          } else {
            results.warnings.push(
              `第${i}行: 积分归类"${rankingListType}"为非通用归类，建议关联对应的"${typeKeyword}"榜单`,
            );
          }
        }

        const indicatorData: Partial<Indicator> = {
          categoryId,
          name,
          direction,
          scoreType,
          fixedScore,
          minScore,
          maxScore,
          pointStatus,
          rankingListType,
          rankingListId: rankingListId as any,
        };
        await this.repo.save(this.repo.create(indicatorData));
        results.success++;
      } catch (err: any) {
        results.errors.push(`第${i}行: ${err.message}`);
        results.failed++;
      }
    }

    return results;
  }

  async checkIndicatorAssociations(ids: number[]) {
    if (!ids.length) return { blockedIds: [] as number[], details: [] as any[] };

    const pointCounts = await this.pointRecordRepo
      .createQueryBuilder('pr')
      .select('pr.indicatorId', 'indicatorId')
      .addSelect('COUNT(*)', 'count')
      .where('pr.indicatorId IN (:...ids)', { ids })
      .groupBy('pr.indicatorId')
      .getRawMany();

    const pointMap = new Map<number, number>();
    for (const row of pointCounts) {
      pointMap.set(Number(row.indicatorId), Number(row.count));
    }

    const dimensionCounts = await this.dimensionRepo
      .createQueryBuilder('dim')
      .select('dim.sourceId', 'sourceId')
      .addSelect('COUNT(*)', 'count')
      .where('dim.sourceType = :type', { type: 'indicator' })
      .andWhere('dim.sourceId IN (:...ids)', { ids })
      .groupBy('dim.sourceId')
      .getRawMany();

    const dimensionMap = new Map<number, number>();
    for (const row of dimensionCounts) {
      dimensionMap.set(Number(row.sourceId), Number(row.count));
    }

    const indicators = await this.repo.find({ where: { id: In(ids) } });
    const nameMap = new Map(indicators.map(i => [i.id, i.name]));

    const blockedIds: number[] = [];
    const details: { indicatorId: number; indicatorName: string; pointCount: number; dimensionCount: number }[] = [];

    for (const id of ids) {
      const pointCount = pointMap.get(id) || 0;
      const dimensionCount = dimensionMap.get(id) || 0;
      if (pointCount > 0 || dimensionCount > 0) {
        blockedIds.push(id);
        details.push({
          indicatorId: id,
          indicatorName: nameMap.get(id) || `ID:${id}`,
          pointCount,
          dimensionCount,
        });
      }
    }

    return { blockedIds, details };
  }

  async batchPermanentDelete(ids: number[]) {
    if (!ids.length) throw new BadRequestException('请选择要删除的指标');

    const { blockedIds, details } = await this.checkIndicatorAssociations(ids);
    if (blockedIds.length > 0) {
      const detailMsg = details.map(d =>
        `「${d.indicatorName}」关联 ${d.pointCount} 条积分记录、${d.dimensionCount} 个画像维度`
      ).join('；');
      throw new BadRequestException(`以下指标存在关联数据，无法删除：${detailMsg}`);
    }

    const result = await this.repo.delete({ id: In(ids) });
    return { success: result.affected || 0, message: `已永久删除 ${result.affected || 0} 个指标` };
  }
}
