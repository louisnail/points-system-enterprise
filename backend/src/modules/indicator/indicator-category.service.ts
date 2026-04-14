import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { IndicatorCategory } from './indicator-category.entity';
import { Indicator } from './indicator.entity';
import { ScoreProfileDimension } from '../score-profile/score-profile-dimension.entity';
import * as ExcelJS from 'exceljs';
import { Response } from 'express';

@Injectable()
export class IndicatorCategoryService {
  constructor(
    @InjectRepository(IndicatorCategory)
    private readonly repo: Repository<IndicatorCategory>,
    @InjectRepository(Indicator)
    private readonly indicatorRepo: Repository<Indicator>,
    @InjectRepository(ScoreProfileDimension)
    private readonly dimensionRepo: Repository<ScoreProfileDimension>,
  ) {}

  async findAll(includeInactive = false) {
    const where = includeInactive ? {} : { isActive: 1 };
    return this.repo.find({ where, order: { sortOrder: 'ASC', id: 'ASC' } });
  }

  async findOne(id: number) {
    const item = await this.repo.findOne({ where: { id } });
    if (!item) throw new NotFoundException('指标分类不存在');
    return item;
  }

  async create(dto: Partial<IndicatorCategory>) {
    return this.repo.save(this.repo.create(dto));
  }

  async update(id: number, dto: Partial<IndicatorCategory>) {
    const item = await this.findOne(id);
    Object.assign(item, dto);
    return this.repo.save(item);
  }

  async remove(id: number) {
    const item = await this.findOne(id);
    item.isActive = 0;
    return this.repo.save(item);
  }

  async getTemplate(res: Response) {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('管控项导入模板');

    sheet.columns = [
      { header: '名称*', key: 'name', width: 20 },
      { header: '说明', key: 'description', width: 40 },
      { header: '排序', key: 'sortOrder', width: 10 },
    ];

    sheet.addRow({ name: '项目损益经营', description: '项目损益相关指标', sortOrder: 0 });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=category_template.xlsx');
    await workbook.xlsx.write(res);
    res.end();
  }

  async importFromExcel(buffer: Buffer) {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer as any);
    const sheet = workbook.worksheets[0];
    if (!sheet) throw new BadRequestException('Excel文件为空');

    // 预加载已有名称用于去重
    const existing = await this.repo.find();
    const existingNames = new Set(existing.map(c => c.name.trim()));

    const results = { success: 0, failed: 0, errors: [] as string[] };

    for (let i = 2; i <= sheet.rowCount; i++) {
      const row = sheet.getRow(i);
      try {
        const name = row.getCell(1).text?.trim();
        if (!name) continue;

        if (existingNames.has(name)) {
          results.errors.push(`第${i}行: 管控项"${name}"已存在`);
          results.failed++;
          continue;
        }

        const description = row.getCell(2).text?.trim() || undefined;
        const sortOrder = parseInt(row.getCell(3).text?.trim()) || 0;

        await this.repo.save(this.repo.create({ name, description, sortOrder }));
        existingNames.add(name);
        results.success++;
      } catch (err: any) {
        results.errors.push(`第${i}行: ${err.message}`);
        results.failed++;
      }
    }

    return results;
  }

  async batchDeactivate(ids: number[]) {
    if (!ids.length) throw new BadRequestException('请选择要停用的分类');
    const result = await this.repo.update({ id: In(ids) }, { isActive: 0 });
    return { success: result.affected || 0, message: `已停用 ${result.affected || 0} 个分类` };
  }

  async checkCategoryAssociations(ids: number[]) {
    if (!ids.length) return { blockedIds: [] as number[], details: [] as any[] };

    // 查询关联指标数
    const indicatorCounts = await this.indicatorRepo
      .createQueryBuilder('ind')
      .select('ind.categoryId', 'categoryId')
      .addSelect('COUNT(*)', 'count')
      .where('ind.categoryId IN (:...ids)', { ids })
      .groupBy('ind.categoryId')
      .getRawMany();

    const indicatorMap = new Map<number, number>();
    for (const row of indicatorCounts) {
      indicatorMap.set(Number(row.categoryId), Number(row.count));
    }

    // 查询关联画像维度数
    const dimensionCounts = await this.dimensionRepo
      .createQueryBuilder('dim')
      .select('dim.sourceId', 'sourceId')
      .addSelect('COUNT(*)', 'count')
      .where('dim.sourceType = :type', { type: 'category' })
      .andWhere('dim.sourceId IN (:...ids)', { ids })
      .groupBy('dim.sourceId')
      .getRawMany();

    const dimensionMap = new Map<number, number>();
    for (const row of dimensionCounts) {
      dimensionMap.set(Number(row.sourceId), Number(row.count));
    }

    // 查询分类名称
    const categories = await this.repo.find({ where: { id: In(ids) } });
    const nameMap = new Map(categories.map(c => [c.id, c.name]));

    const blockedIds: number[] = [];
    const details: { categoryId: number; categoryName: string; indicatorCount: number; dimensionCount: number }[] = [];

    for (const id of ids) {
      const indicatorCount = indicatorMap.get(id) || 0;
      const dimensionCount = dimensionMap.get(id) || 0;
      if (indicatorCount > 0 || dimensionCount > 0) {
        blockedIds.push(id);
        details.push({
          categoryId: id,
          categoryName: nameMap.get(id) || `ID:${id}`,
          indicatorCount,
          dimensionCount,
        });
      }
    }

    return { blockedIds, details };
  }

  async batchPermanentDelete(ids: number[]) {
    if (!ids.length) throw new BadRequestException('请选择要删除的分类');

    const { blockedIds, details } = await this.checkCategoryAssociations(ids);
    if (blockedIds.length > 0) {
      const detailMsg = details.map(d =>
        `「${d.categoryName}」关联 ${d.indicatorCount} 个指标、${d.dimensionCount} 个画像维度`
      ).join('；');
      throw new BadRequestException(`以下分类存在关联数据，无法删除：${detailMsg}`);
    }

    const result = await this.repo.delete({ id: In(ids) });
    return { success: result.affected || 0, message: `已永久删除 ${result.affected || 0} 个分类` };
  }
}
