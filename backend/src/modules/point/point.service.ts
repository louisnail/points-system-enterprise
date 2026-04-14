import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere, DataSource } from 'typeorm';
import { PointRecord } from './point-record.entity';
import { User } from '../user/user.entity';
import { Indicator } from '../indicator/indicator.entity';
import * as ExcelJS from 'exceljs';
import { Response } from 'express';

@Injectable()
export class PointService {
  constructor(
    @InjectRepository(PointRecord)
    private readonly repo: Repository<PointRecord>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Indicator)
    private readonly indicatorRepo: Repository<Indicator>,
    private readonly dataSource: DataSource,
  ) {}

  async findAll(query: {
    page?: number;
    pageSize?: number;
    userId?: number;
    indicatorId?: number;
    auditStatus?: number;
    pointStatus?: number;
    belongMonth?: string;
    registrantId?: number;
    categoryId?: number;
    departmentId?: number;
    rankingListId?: number;
    keyword?: string;
  }) {
    const page = Number(query.page) || 1;
    const pageSize = Number(query.pageSize) || 20;

    const qb = this.repo.createQueryBuilder('p')
      .leftJoinAndSelect('p.user', 'user')
      .leftJoinAndSelect('user.department', 'dept')
      .leftJoinAndSelect('user.rankingList', 'rl')
      .leftJoinAndSelect('p.indicator', 'ind')
      .leftJoinAndSelect('ind.category', 'cat')
      .leftJoinAndSelect('p.registrant', 'reg')
      .leftJoinAndSelect('p.auditor', 'aud');

    if (query.userId && !isNaN(Number(query.userId))) qb.andWhere('p.userId = :userId', { userId: Number(query.userId) });
    if (query.indicatorId && !isNaN(Number(query.indicatorId))) qb.andWhere('p.indicatorId = :indicatorId', { indicatorId: Number(query.indicatorId) });
    if (query.auditStatus !== undefined && query.auditStatus !== null && !isNaN(Number(query.auditStatus))) qb.andWhere('p.auditStatus = :auditStatus', { auditStatus: Number(query.auditStatus) });
    if (query.pointStatus && !isNaN(Number(query.pointStatus))) qb.andWhere('p.pointStatus = :pointStatus', { pointStatus: Number(query.pointStatus) });
    if (query.belongMonth) qb.andWhere('p.belongMonth = :belongMonth', { belongMonth: query.belongMonth });
    if (query.registrantId && !isNaN(Number(query.registrantId))) qb.andWhere('p.registrantId = :registrantId', { registrantId: Number(query.registrantId) });
    if (query.categoryId && !isNaN(Number(query.categoryId))) qb.andWhere('ind.categoryId = :categoryId', { categoryId: Number(query.categoryId) });
    if (query.departmentId && !isNaN(Number(query.departmentId))) qb.andWhere('user.departmentId = :departmentId', { departmentId: Number(query.departmentId) });
    if (query.rankingListId && !isNaN(Number(query.rankingListId))) qb.andWhere('(user.rankingListId = :rankingListId OR ind.rankingListId = :rankingListId)', { rankingListId: Number(query.rankingListId) });
    if (query.keyword) {
      qb.andWhere('(user.name LIKE :kw OR user.employeeNo LIKE :kw)', { kw: `%${query.keyword}%` });
    }

    qb.orderBy('p.createdAt', 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize);

    const [list, total] = await qb.getManyAndCount();
    return { list, total, page, pageSize };
  }

  async findOne(id: number) {
    const record = await this.repo.findOne({
      where: { id },
      relations: ['user', 'indicator', 'indicator.category', 'indicator.rankingList', 'registrant', 'auditor'],
    });
    if (!record) throw new NotFoundException('积分记录不存在');
    return record;
  }

  async create(dto: {
    userId: number;
    indicatorId: number;
    score: number;
    description?: string;
    belongMonth: string;
    registrantId: number;
  }) {
    const user = await this.userRepo.findOne({ where: { id: dto.userId } });
    if (!user) throw new BadRequestException('员工不存在');

    if (!dto.belongMonth || !/^\d{4}-\d{2}$/.test(dto.belongMonth)) {
      throw new BadRequestException('归属月份格式不正确，需为 YYYY-MM');
    }

    const indicator = await this.indicatorRepo.findOne({ where: { id: dto.indicatorId } });
    if (!indicator) throw new BadRequestException('指标不存在');

    // 积分归类与榜单匹配校验（通用积分归类跳过校验）
    if (indicator.rankingListId && indicator.rankingListType !== '通用积分') {
      const indRlId = Number(indicator.rankingListId);
      const userRlId = user.rankingListId ? Number(user.rankingListId) : 0;
      const userSecRlId = user.secondaryRankingListId ? Number(user.secondaryRankingListId) : 0;
      if (indRlId !== userRlId && indRlId !== userSecRlId) {
        throw new BadRequestException(`该指标归类与员工"${user.name}"所属榜单不匹配`);
      }
    }

    // Validate score range
    if (indicator.scoreType === 1) {
      // Fixed score - use indicator's fixed value directly (with sign)
      dto.score = Number(indicator.fixedScore) || 0;
    } else {
      // Range score - validate within actual signed bounds
      const bound1 = Number(indicator.minScore) || 0;
      const bound2 = Number(indicator.maxScore) || 0;
      const rangeMin = Math.min(bound1, bound2);
      const rangeMax = Math.max(bound1, bound2);
      if (dto.score < rangeMin || dto.score > rangeMax) {
        throw new BadRequestException(`分值需在 ${rangeMin} ~ ${rangeMax} 范围内`);
      }
    }

    const record = this.repo.create({
      userId: dto.userId,
      indicatorId: dto.indicatorId,
      score: dto.score, // Score already carries the correct sign
      description: dto.description,
      recordType: 1,
      pointStatus: indicator.pointStatus,
      belongMonth: dto.belongMonth,
      registrantId: dto.registrantId,
      registeredAt: new Date(),
      auditStatus: 0,
    });

    return this.repo.save(record);
  }

  async checkDuplicates(records: Array<{
    userId: number;
    indicatorId: number;
    score: number;
    belongMonth: string;
  }>) {
    const duplicates: Array<{
      index: number;
      userId: number;
      userName: string;
      indicatorName: string;
      score: number;
      belongMonth: string;
    }> = [];

    for (let i = 0; i < records.length; i++) {
      const r = records[i];
      const existing = await this.repo.findOne({
        where: {
          userId: r.userId,
          indicatorId: r.indicatorId,
          score: r.score,
          belongMonth: r.belongMonth,
          auditStatus: 0,
        },
        relations: ['user', 'indicator'],
      });
      if (existing) {
        duplicates.push({
          index: i,
          userId: r.userId,
          userName: existing.user?.name || '',
          indicatorName: existing.indicator?.name || '',
          score: r.score,
          belongMonth: r.belongMonth,
        });
      }
    }
    return { hasDuplicates: duplicates.length > 0, duplicates };
  }

  async batchCreate(records: Array<{
    userId: number;
    indicatorId: number;
    score: number;
    description?: string;
    belongMonth: string;
  }>, registrantId: number) {
    const results = { success: 0, failed: 0, errors: [] as string[] };

    for (let i = 0; i < records.length; i++) {
      try {
        await this.create({ ...records[i], registrantId });
        results.success++;
      } catch (err: any) {
        results.errors.push(`第${i + 1}条: ${err.message}`);
        results.failed++;
      }
    }
    return results;
  }

  async importFromExcel(buffer: Buffer, registrantId: number, belongMonth: string) {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer as any);
    const sheet = workbook.worksheets[0];
    if (!sheet) throw new BadRequestException('Excel文件为空');

    const allUsers = await this.userRepo.find({ relations: ['department', 'rankingList'] });
    const userNameMap = new Map<string, User[]>();
    for (const u of allUsers) {
      const nameKey = u.name?.trim();
      if (nameKey) {
        if (!userNameMap.has(nameKey)) userNameMap.set(nameKey, []);
        userNameMap.get(nameKey)!.push(u);
      }
    }

    const allIndicators = await this.indicatorRepo.find({ where: { isActive: 1 }, relations: ['category', 'rankingList'] });
    const indicatorNameMap = new Map<string, Indicator>();
    for (const ind of allIndicators) {
      indicatorNameMap.set(ind.name.trim(), ind);
    }

    const results = { success: 0, failed: 0, errors: [] as string[], warnings: [] as string[], duplicates: 0 };

    // 自适应找表头行
    let headerRowIdx = 0;
    for (let r = 1; r <= Math.min(10, sheet.rowCount); r++) {
      const row = sheet.getRow(r);
      for (let c = 1; c <= 5; c++) {
        const val = row.getCell(c).text?.trim();
        if (val && val.includes('姓名') && !val.includes('【')) {
          headerRowIdx = r;
          break;
        }
      }
      if (headerRowIdx > 0) break;
    }
    if (headerRowIdx === 0) {
      throw new BadRequestException('未找到表头行（应包含"姓名"列），请检查模板格式');
    }

    // 精简5列: A=姓名, B=评价维度, C=分值, D=事由, E=归属月份
    for (let i = headerRowIdx + 1; i <= sheet.rowCount; i++) {
      const row = sheet.getRow(i);
      const nameRaw = row.getCell(1).text?.trim();
      if (!nameRaw) continue;
      if (nameRaw.startsWith('【')) continue;

      const indicatorNameRaw = row.getCell(2).text?.trim();
      const scoreRaw = row.getCell(3).text?.trim();
      const description = row.getCell(4).text?.trim();
      // 归属月份：兼容日期对象
      const belongMonthCell = row.getCell(5);
      let belongMonthRaw = '';
      if (belongMonthCell.value instanceof Date) {
        const d = belongMonthCell.value;
        belongMonthRaw = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      } else {
        belongMonthRaw = belongMonthCell.text?.trim() || '';
      }
      const rowBelongMonth = belongMonthRaw && /^\d{4}-\d{2}$/.test(belongMonthRaw) ? belongMonthRaw : belongMonth;

      // 1. 匹配用户（仅按姓名）
      const candidates = userNameMap.get(nameRaw) || [];
      if (candidates.length === 0) {
        results.errors.push(`第${i}行: 姓名「${nameRaw}」在系统中不存在`);
        results.failed++;
        continue;
      }
      if (candidates.length > 1) {
        results.errors.push(`第${i}行: 姓名「${nameRaw}」存在 ${candidates.length} 个同名员工，请在姓名后加工号如"${nameRaw}(${candidates[0].employeeNo})"`);
        results.failed++;
        continue;
      }
      const user = candidates[0];

      // 2. 匹配评价维度
      if (!indicatorNameRaw) {
        results.errors.push(`第${i}行: 评价维度为必填`);
        results.failed++;
        continue;
      }
      const indicator = indicatorNameMap.get(indicatorNameRaw);
      if (!indicator) {
        results.errors.push(`第${i}行: 评价维度「${indicatorNameRaw}」在指标列表中不存在，请按指标列表精准填入`);
        results.failed++;
        continue;
      }

      // 3. 校验人员榜单与指标归类一致性（ID 级别匹配，通用积分跳过）
      if (indicator.rankingListId && indicator.rankingListType !== '通用积分') {
        const indRlId = Number(indicator.rankingListId);
        const userRlId = user.rankingListId ? Number(user.rankingListId) : 0;
        const userSecRlId = user.secondaryRankingListId ? Number(user.secondaryRankingListId) : 0;
        if (indRlId !== userRlId && indRlId !== userSecRlId) {
          const indLabel = indicator.rankingList?.name || indicator.rankingListType || '该指标归类';
          const userLabel = user.rankingList?.name || '无';
          results.errors.push(`第${i}行「${nameRaw}」: 所属榜单「${userLabel}」与指标归类「${indLabel}」不匹配`);
          results.failed++;
          continue;
        }
      }

      // 4. 解析分值
      let score: number;
      if (indicator.scoreType === 1) {
        score = Number(indicator.fixedScore) || 0;
      } else {
        score = parseFloat(scoreRaw);
        if (isNaN(score)) {
          results.errors.push(`第${i}行: 分值「${scoreRaw}」无效（该指标为范围值，须手动填写）`);
          results.failed++;
          continue;
        }
      }

      // 5. 查重
      const existing = await this.repo.findOne({
        where: { userId: user.id, indicatorId: indicator.id, score, belongMonth: rowBelongMonth, auditStatus: 0 },
      });
      if (existing) {
        results.duplicates++;
        results.warnings.push(`第${i}行「${nameRaw}」: 已存在相同的待审核记录（${indicator.name}, 分值${score}），已跳过`);
        continue;
      }

      try {
        await this.create({ userId: user.id, indicatorId: indicator.id, score, description, belongMonth: rowBelongMonth, registrantId });
        results.success++;
      } catch (err: any) {
        results.errors.push(`第${i}行: ${err.message}`);
        results.failed++;
      }
    }
    return results;
  }

  async previewImport(buffer: Buffer, belongMonth: string) {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer as any);
    const sheet = workbook.worksheets[0];
    if (!sheet) throw new BadRequestException('Excel文件为空');

    const allUsers = await this.userRepo.find({ relations: ['department', 'rankingList'] });
    const userNameMap = new Map<string, User[]>();
    for (const u of allUsers) {
      const nameKey = u.name?.trim();
      if (nameKey) {
        if (!userNameMap.has(nameKey)) userNameMap.set(nameKey, []);
        userNameMap.get(nameKey)!.push(u);
      }
    }

    const allIndicators = await this.indicatorRepo.find({ where: { isActive: 1 }, relations: ['category', 'rankingList'] });
    const indicatorNameMap = new Map<string, Indicator>();
    for (const ind of allIndicators) {
      indicatorNameMap.set(ind.name.trim(), ind);
    }

    // 自适应找表头行（精简5列模板）
    let headerRowIdx = 0;
    for (let r = 1; r <= Math.min(10, sheet.rowCount); r++) {
      const row = sheet.getRow(r);
      for (let c = 1; c <= 5; c++) {
        const val = row.getCell(c).text?.trim();
        if (val && val.includes('姓名') && !val.includes('【')) {
          headerRowIdx = r;
          break;
        }
      }
      if (headerRowIdx > 0) break;
    }
    if (headerRowIdx === 0) {
      throw new BadRequestException('未找到表头行（应包含"姓名"列），请检查模板格式');
    }

    const rows: Array<{
      rowIndex: number;
      name: string;
      department: string;
      rankingList: string;
      category: string;
      indicatorName: string;
      score: number | string;
      pointStatus: string;
      description: string;
      belongMonth: string;
      status: 'ok' | 'error' | 'warning' | 'duplicate';
      message: string;
      userId?: number;
      indicatorId?: number;
      resolvedScore?: number;
    }> = [];

    // 精简5列: A=姓名, B=评价维度, C=分值, D=事由, E=归属月份
    for (let i = headerRowIdx + 1; i <= sheet.rowCount; i++) {
      const row = sheet.getRow(i);
      const nameRaw = row.getCell(1).text?.trim();
      if (!nameRaw) continue;
      if (nameRaw.startsWith('【')) continue;

      const indicatorNameRaw = row.getCell(2).text?.trim() || '';
      const scoreRaw = row.getCell(3).text?.trim() || '';
      const description = row.getCell(4).text?.trim() || '';
      // 归属月份：兼容日期对象和文本
      const belongMonthCell = row.getCell(5);
      let belongMonthRaw = '';
      if (belongMonthCell.value instanceof Date) {
        const d = belongMonthCell.value;
        belongMonthRaw = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      } else {
        belongMonthRaw = belongMonthCell.text?.trim() || '';
      }
      const rowBelongMonth = belongMonthRaw && /^\d{4}-\d{2}$/.test(belongMonthRaw) ? belongMonthRaw : belongMonth;

      const previewRow: typeof rows[0] = {
        rowIndex: i,
        name: nameRaw,
        department: '',
        rankingList: '',
        category: '',
        indicatorName: indicatorNameRaw,
        score: scoreRaw,
        pointStatus: '',
        description,
        belongMonth: rowBelongMonth,
        status: 'ok',
        message: '',
      };

      // 1. 匹配用户（仅按姓名）
      let user: User | undefined;
      const candidates = userNameMap.get(nameRaw) || [];
      if (candidates.length === 0) {
        previewRow.status = 'error';
        previewRow.message = `姓名「${nameRaw}」在系统中不存在`;
      } else if (candidates.length > 1) {
        previewRow.status = 'error';
        previewRow.message = `姓名「${nameRaw}」存在 ${candidates.length} 个同名员工，请在姓名后加工号如"${nameRaw}(${candidates[0].employeeNo})"`;
      } else {
        user = candidates[0];
      }

      if (user) {
        previewRow.userId = user.id;
        previewRow.department = user.department?.name || '';
        previewRow.rankingList = user.rankingList?.name || '';
      }

      // 2. 匹配评价维度
      const indicator = indicatorNameRaw ? indicatorNameMap.get(indicatorNameRaw) : undefined;
      if (indicatorNameRaw && !indicator) {
        previewRow.status = 'error';
        previewRow.message = (previewRow.message ? previewRow.message + '；' : '') + `评价维度「${indicatorNameRaw}」在指标列表中不存在`;
      } else if (!indicatorNameRaw) {
        previewRow.status = 'error';
        previewRow.message = (previewRow.message ? previewRow.message + '；' : '') + '评价维度为必填';
      }

      if (indicator) {
        previewRow.indicatorId = indicator.id;
        previewRow.category = indicator.category?.name || '';
        previewRow.pointStatus = indicator.pointStatus === 1 ? '过程分' : '结果分';

        // 3. 校验人员榜单与指标归类一致性
        if (user) {
          const userRLName = user.rankingList?.name || '';
          const isUniversalIndicator = !indicator.rankingListId || indicator.rankingList?.isSecondary === 1;
          const indRLType = indicator.rankingListType || '';
          if (indRLType && !isUniversalIndicator) {
            const typeKeyword = indRLType.replace(/积分$/, '');
            if (!userRLName.includes(typeKeyword) && !typeKeyword.includes(userRLName)) {
              if (previewRow.status === 'ok') previewRow.status = 'warning';
              previewRow.message = (previewRow.message ? previewRow.message + '；' : '') + `所属榜单「${userRLName || '无'}」与评价维度归类「${indRLType}」不匹配`;
            }
          }
        }

        // 4. 解析分值
        let resolvedScore: number;
        if (indicator.scoreType === 1) {
          resolvedScore = Number(indicator.fixedScore) || 0;
        } else {
          resolvedScore = parseFloat(scoreRaw);
          if (isNaN(resolvedScore)) {
            previewRow.status = 'error';
            previewRow.message = (previewRow.message ? previewRow.message + '；' : '') + `分值「${scoreRaw}」无效（该指标为范围值，须手动填写）`;
            resolvedScore = 0;
          }
        }
        previewRow.resolvedScore = resolvedScore;
        previewRow.score = resolvedScore;

        // 5. 查重
        if (user && previewRow.status !== 'error') {
          const existing = await this.repo.findOne({
            where: { userId: user.id, indicatorId: indicator.id, score: resolvedScore, belongMonth: rowBelongMonth, auditStatus: 0 },
          });
          if (existing) {
            previewRow.status = 'duplicate';
            previewRow.message = '已存在相同的待审核记录';
          }
        }
      }

      rows.push(previewRow);
    }

    return { rows };
  }

  async confirmImport(records: Array<{ userId: number; indicatorId: number; score: number; description?: string; belongMonth: string }>, registrantId: number) {
    const results = { success: 0, failed: 0, errors: [] as string[] };
    for (let idx = 0; idx < records.length; idx++) {
      const r = records[idx];
      try {
        await this.create({
          userId: r.userId,
          indicatorId: r.indicatorId,
          score: r.score,
          description: r.description,
          belongMonth: r.belongMonth,
          registrantId,
        });
        results.success++;
      } catch (err: any) {
        results.errors.push(`第${idx + 1}条: ${err.message}`);
        results.failed++;
      }
    }
    return results;
  }

  async audit(id: number, dto: { auditStatus: number; auditRemark?: string; auditorId: number }) {
    const record = await this.findOne(id);
    if (record.auditStatus !== 0) {
      throw new BadRequestException('该记录已审核，不可重复操作');
    }

    record.auditStatus = dto.auditStatus;
    record.auditRemark = dto.auditRemark || '';
    record.auditorId = dto.auditorId;
    record.auditedAt = new Date();

    const saved = await this.repo.save(record);

    // If approved, update user total points (仅非副榜指标计入主榜积分)
    if (dto.auditStatus === 1) {
      const isSecondaryIndicator = record.indicator?.rankingList?.isSecondary === 1;
      if (!isSecondaryIndicator) {
        await this.userRepo
          .createQueryBuilder()
          .update(User)
          .set({ totalPoints: () => 'total_points + :scoreVal' })
          .setParameter('scoreVal', Number(record.score))
          .where('id = :id', { id: record.userId })
          .execute();
      }
    }

    return saved;
  }

  async batchAudit(ids: number[], dto: { auditStatus: number; auditRemark?: string; auditorId: number }) {
    const results = { success: 0, failed: 0, errors: [] as string[] };
    for (const id of ids) {
      try {
        await this.audit(id, dto);
        results.success++;
      } catch (err: any) {
        results.errors.push(`ID ${id}: ${err.message}`);
        results.failed++;
      }
    }
    return results;
  }

  async getTemplate(res: Response) {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('积分导入模板');

    const allUsers = await this.userRepo.find({ relations: ['department', 'rankingList'] });
    const allIndicators = await this.indicatorRepo.find({ where: { isActive: 1 }, relations: ['category', 'rankingList'] });

    const hintFont: Partial<ExcelJS.Font> = { color: { argb: 'FF999999' }, italic: true, size: 10 };
    const centerAlign: Partial<ExcelJS.Alignment> = { horizontal: 'center', vertical: 'middle', wrapText: true };

    // 精简5列：姓名、评价维度、分值、事由、归属月份
    const colWidths = [14, 30, 12, 40, 14];
    for (let c = 0; c < colWidths.length; c++) {
      sheet.getColumn(c + 1).width = colWidths[c];
      sheet.getColumn(c + 1).alignment = centerAlign;
    }
    // 事由列左对齐
    sheet.getColumn(4).alignment = { ...centerAlign, horizontal: 'left' };
    // 归属月份列设为纯文本格式，防止Excel把 2026-03 自动转成日期
    sheet.getColumn(5).numFmt = '@';

    // 行1: 填写说明（合并 A1:E1）
    sheet.addRow(['【填写说明】以下提示行可删除，不影响导入。姓名*以钉钉姓名为准，重名系统自动提示需补充工号。评价维度*必须按照第二个Sheet"指标列表"的指标项精准填入，部门/榜单等信息由系统自动匹配。']);
    sheet.mergeCells('A1:E1');
    const r1 = sheet.getRow(1);
    r1.font = hintFont;
    r1.alignment = { vertical: 'middle', wrapText: true };
    r1.height = 30;

    // 行2: 格式规范（合并 A2:E2）
    sheet.addRow(['【格式规范】事由建议格式：【项目名称】【事件日期】描述理由。归属月份*手动填写如 2026-03（YYYY-MM）。分值：固定分值可留空（系统自动），范围值必填且扣分填负值如 -5。']);
    sheet.mergeCells('A2:E2');
    const r2 = sheet.getRow(2);
    r2.font = hintFont;
    r2.alignment = { vertical: 'middle', wrapText: true };
    r2.height = 30;

    // 行3: 注意（合并 A3:E3）
    sheet.addRow(['【注意】积分归类属于特定榜单的（如"项目经理积分"）不能匹配给非项目经理榜单中的人员，最好提前确定人员归属哪个榜单，否则给予警告。通用积分（无关联榜单）及副榜积分可匹配所有榜单人员。']);
    sheet.mergeCells('A3:E3');
    const r3 = sheet.getRow(3);
    r3.font = hintFont;
    r3.alignment = { vertical: 'middle', wrapText: true };
    r3.height = 30;

    // 行4: 空行分隔
    sheet.addRow([]);

    // 行5: 表头
    const headerRow = sheet.addRow(['姓名*', '评价维度*', '分值', '事由', '归属月份*']);
    headerRow.font = { bold: true };
    headerRow.eachCell((cell) => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF2F2F2' } };
      cell.border = { bottom: { style: 'thin', color: { argb: 'FFD9D9D9' } } };
      cell.alignment = centerAlign;
    });

    // 行6: 示例数据
    const exUser = allUsers[0];
    const exInd = allIndicators[0];
    sheet.addRow([
      exUser?.name || '张三',
      exInd?.name || '正偏离(0,10%)',
      exInd ? Number(exInd.fixedScore) || '' : 10,
      '【XX项目】【2026-03-01】项目偏离率优秀',
      '2026-03',
    ]);

    // ========== 第二个Sheet: 指标列表（参考用）==========
    const refSheet = workbook.addWorksheet('指标列表');
    const refColDefs = [
      { header: '管控项', key: 'category', width: 20 },
      { header: '评价维度', key: 'name', width: 30 },
      { header: '方向', key: 'direction', width: 8 },
      { header: '标准分值', key: 'score', width: 15 },
      { header: '积分状态', key: 'pointStatus', width: 10 },
      { header: '积分归类', key: 'rankingListType', width: 18 },
      { header: '关联榜单', key: 'rankingList', width: 20 },
    ];
    refSheet.columns = refColDefs;
    for (let c = 1; c <= refColDefs.length; c++) {
      refSheet.getColumn(c).alignment = centerAlign;
    }
    const refHeaderRow = refSheet.getRow(1);
    refHeaderRow.font = { bold: true };
    refHeaderRow.eachCell((cell) => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF2F2F2' } };
      cell.alignment = centerAlign;
    });

    const dirLabel: Record<number, string> = { 1: '加分', [-1]: '扣分' };
    const statusLabel: Record<number, string> = { 1: '过程分', 2: '结果分' };
    for (const ind of allIndicators) {
      const score = ind.scoreType === 1
        ? String(Number(ind.fixedScore))
        : `${Number(ind.minScore)}～${Number(ind.maxScore)}`;
      refSheet.addRow({
        category: ind.category?.name || '',
        name: ind.name,
        direction: dirLabel[ind.direction] || '',
        score,
        pointStatus: statusLabel[ind.pointStatus] || '',
        rankingListType: ind.rankingListType || '',
        rankingList: ind.rankingList?.name || '通用',
      });
    }

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=point_import_template.xlsx');
    await workbook.xlsx.write(res);
    res.end();
  }

  async exportExcel(res: Response, query: any) {
    const { list } = await this.findAll({ ...query, page: 1, pageSize: 50000 });
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('积分明细');

    const statusMap: Record<number, string> = { 0: '待审核', 1: '已通过', 2: '已驳回', 3: '已作废' };
    const typeMap: Record<number, string> = { 1: '过程分', 2: '结果分' };

    sheet.columns = [
      { header: '工号', key: 'employeeNo', width: 15 },
      { header: '姓名', key: 'name', width: 12 },
      { header: '部门', key: 'departmentName', width: 20 },
      { header: '归属组织', key: 'companyBelong', width: 10 },
      { header: '所属榜单', key: 'rankingListName', width: 15 },
      { header: '管控项', key: 'categoryName', width: 15 },
      { header: '评价维度', key: 'indicatorName', width: 20 },
      { header: '分值', key: 'score', width: 10 },
      { header: '类型', key: 'pointType', width: 10 },
      { header: '反馈人', key: 'registrantName', width: 12 },
      { header: '归属月份', key: 'belongMonth', width: 12 },
      { header: '审核状态', key: 'auditStatusLabel', width: 10 },
      { header: '审核人', key: 'auditorName', width: 12 },
      { header: '事由', key: 'description', width: 30 },
      { header: '录入时间', key: 'registeredAt', width: 20 },
    ];

    for (const p of list) {
      sheet.addRow({
        employeeNo: p.user?.employeeNo || '',
        name: p.user?.name || '',
        departmentName: p.user?.department?.name || '',
        companyBelong: p.user?.companyBelong || '',
        rankingListName: p.user?.rankingList?.name || '',
        categoryName: p.indicator?.category?.name || '',
        indicatorName: p.indicator?.name || '',
        score: p.score,
        pointType: typeMap[p.pointStatus] || '',
        registrantName: p.registrant?.name || '',
        belongMonth: p.belongMonth,
        auditStatusLabel: statusMap[p.auditStatus] || '',
        auditorName: p.auditor?.name || '',
        description: p.description || '',
        registeredAt: p.registeredAt ? new Date(p.registeredAt).toLocaleString('zh-CN') : '',
      });
    }

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=point_detail.xlsx');
    await workbook.xlsx.write(res);
    res.end();
  }

  async getMyPoints(userId: number, query: { belongMonth?: string; page?: number; pageSize?: number }) {
    return this.findAll({ ...query, userId, auditStatus: 1 });
  }

  /**
   * Update a point record. If the record was already approved (auditStatus=1),
   * compute delta and atomically adjust user.totalPoints in a transaction.
   */
  async updateRecord(id: number, dto: { score?: number; description?: string; belongMonth?: string }) {
    const record = await this.findOne(id);
    if (record.auditStatus === 3) {
      throw new BadRequestException('已作废的记录不可修改');
    }
    const oldScore = record.score;
    const wasApproved = record.auditStatus === 1;

    if (dto.score !== undefined) record.score = dto.score;
    if (dto.description !== undefined) record.description = dto.description;
    if (dto.belongMonth !== undefined) {
      if (!/^\d{4}-\d{2}$/.test(dto.belongMonth)) {
        throw new BadRequestException('归属月份格式不正确，需为 YYYY-MM');
      }
      record.belongMonth = dto.belongMonth;
    }

    const newScore = record.score;
    const delta = newScore - oldScore;

    // Use transaction when we need to sync totalPoints (仅非副榜指标)
    const isSecondaryIndicator = record.indicator?.rankingList?.isSecondary === 1;
    if (wasApproved && delta !== 0 && !isSecondaryIndicator) {
      const qr = this.dataSource.createQueryRunner();
      await qr.connect();
      await qr.startTransaction();
      try {
        await qr.manager.save(PointRecord, record);
        await qr.manager
          .createQueryBuilder()
          .update(User)
          .set({ totalPoints: () => 'total_points + :deltaVal' })
          .setParameter('deltaVal', Number(delta))
          .where('id = :id', { id: record.userId })
          .execute();
        await qr.commitTransaction();
      } catch (err) {
        await qr.rollbackTransaction();
        throw err;
      } finally {
        await qr.release();
      }
    } else {
      await this.repo.save(record);
    }

    return this.findOne(id);
  }

  /**
   * Void (作废) a point record. If the record was approved (auditStatus=1),
   * reverse the score from user.totalPoints in a transaction.
   * Sets auditStatus to 3 (已作废).
   */
  async voidRecord(id: number) {
    const record = await this.findOne(id);
    if (record.auditStatus === 3) {
      throw new BadRequestException('该记录已作废');
    }

    const wasApproved = record.auditStatus === 1;
    record.auditStatus = 3;

    // 仅非副榜指标需要回退 totalPoints
    const isSecondaryInd = record.indicator?.rankingList?.isSecondary === 1;
    if (wasApproved && record.score !== 0 && !isSecondaryInd) {
      const qr = this.dataSource.createQueryRunner();
      await qr.connect();
      await qr.startTransaction();
      try {
        await qr.manager.save(PointRecord, record);
        await qr.manager
          .createQueryBuilder()
          .update(User)
          .set({ totalPoints: () => 'total_points - :reverseVal' })
          .setParameter('reverseVal', Number(record.score))
          .where('id = :id', { id: record.userId })
          .execute();
        await qr.commitTransaction();
      } catch (err) {
        await qr.rollbackTransaction();
        throw err;
      } finally {
        await qr.release();
      }
    } else {
      await this.repo.save(record);
    }

    return this.findOne(id);
  }

  /**
   * Batch void multiple records.
   */
  async batchVoid(ids: number[]) {
    const results = { success: 0, failed: 0, errors: [] as string[] };
    for (const id of ids) {
      try {
        await this.voidRecord(id);
        results.success++;
      } catch (err: any) {
        results.errors.push(`ID ${id}: ${err.message}`);
        results.failed++;
      }
    }
    return results;
  }
}
