import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../user/user.entity';
import { PointRecord } from '../point/point-record.entity';
import { RankingList } from '../ranking-list/ranking-list.entity';
import { Department } from '../department/department.entity';
import * as ExcelJS from 'exceljs';
import { Response } from 'express';

export interface RankingItem {
  userId: number;
  employeeNo: string;
  name: string;
  companyBelong: string;
  departmentName: string;
  position: string;
  rankLevel: string;
  rankingListId: number;
  rankingListName: string;
  resultScore: number;
  processScore: number;
  totalScore: number;
  ranking: number;
}

@Injectable()
export class RankingService {
  private readonly logger = new Logger(RankingService.name);

  constructor(
    @InjectRepository(User) private userRepo: Repository<User>,
    @InjectRepository(PointRecord) private pointRepo: Repository<PointRecord>,
    @InjectRepository(RankingList) private rankingListRepo: Repository<RankingList>,
    @InjectRepository(Department) private deptRepo: Repository<Department>,
  ) {}

  /**
   * Get rankings for a specific month, optionally filtered by ranking list
   */
  async getMonthlyRanking(belongMonth: string, rankingListId?: number): Promise<RankingItem[]> {
    // Get all active users not disabled from ranking
    let userQuery = this.userRepo
      .createQueryBuilder('u')
      .leftJoinAndSelect('u.department', 'd')
      .leftJoinAndSelect('u.rankingList', 'rl')
      .where('u.status = 1')
      .andWhere('u.isRankingDisabled = 0');

    if (rankingListId) {
      userQuery = userQuery.andWhere('u.rankingListId = :rankingListId', { rankingListId });
    }

    const users = await userQuery.getMany();

    // Calculate scores for each user
    // 月度积分公式：当月过程分 + 截止该月的累计结果分
    const rankings: RankingItem[] = [];
    const yearMonth = belongMonth.split('-');
    const queryYear = yearMonth[0];
    const queryMM = yearMonth[1] || '12';

    for (const user of users) {
      // 累计结果分：截止该月的所有已审核结果分（排除副榜指标积分）
      const resultScoreResult = await this.pointRepo
        .createQueryBuilder('pr')
        .innerJoin('pr.indicator', 'ind')
        .leftJoin('ind.rankingList', 'ind_rl')
        .select('COALESCE(SUM(pr.score), 0)', 'total')
        .where('pr.userId = :userId', { userId: user.id })
        .andWhere('pr.auditStatus = 1')
        .andWhere('pr.pointStatus = 2')
        .andWhere('pr.belongMonth >= :startMonth', { startMonth: `${queryYear}-01` })
        .andWhere('pr.belongMonth <= :endMonth', { endMonth: belongMonth })
        .andWhere('(ind_rl.isSecondary IS NULL OR ind_rl.isSecondary = 0)')
        .getRawOne();

      // 当月过程分（排除副榜指标积分）
      const processScoreResult = await this.pointRepo
        .createQueryBuilder('pr2')
        .innerJoin('pr2.indicator', 'ind2')
        .leftJoin('ind2.rankingList', 'ind_rl2')
        .select('COALESCE(SUM(pr2.score), 0)', 'total')
        .where('pr2.userId = :userId', { userId: user.id })
        .andWhere('pr2.auditStatus = 1')
        .andWhere('pr2.pointStatus = 1')
        .andWhere('pr2.belongMonth = :belongMonth', { belongMonth })
        .andWhere('(ind_rl2.isSecondary IS NULL OR ind_rl2.isSecondary = 0)')
        .getRawOne();

      const resultScore = Number(resultScoreResult?.total || 0);
      const processScore = Number(processScoreResult?.total || 0);
      const totalScore = resultScore + processScore;

      rankings.push({
        userId: user.id,
        employeeNo: user.employeeNo,
        name: user.name,
        companyBelong: user.companyBelong,
        departmentName: user.department?.name || '',
        position: user.position || '',
        rankLevel: user.rankLevel || '',
        rankingListId: user.rankingListId,
        rankingListName: user.rankingList?.name || '',
        resultScore,
        processScore,
        totalScore,
        ranking: 0,
      });
    }

    // Sort by total score descending
    rankings.sort((a, b) => b.totalScore - a.totalScore);

    // Assign rankings (same score = same rank)
    let currentRank = 1;
    for (let i = 0; i < rankings.length; i++) {
      if (i > 0 && rankings[i].totalScore < rankings[i - 1].totalScore) {
        currentRank = i + 1;
      }
      rankings[i].ranking = currentRank;
    }

    return rankings;
  }

  /**
   * 副榜月度排名：仅统计 indicator.ranking_list_id 匹配的积分
   */
  async getSecondaryRanking(belongMonth: string, rankingListId: number): Promise<RankingItem[]> {
    // 查找 secondaryRankingListId 匹配的用户
    const users = await this.userRepo
      .createQueryBuilder('u')
      .leftJoinAndSelect('u.department', 'd')
      .leftJoinAndSelect('u.secondaryRankingList', 'srl')
      .where('u.status = 1')
      .andWhere('u.isRankingDisabled = 0')
      .andWhere('u.secondaryRankingListId = :rankingListId', { rankingListId })
      .getMany();

    const rankings: RankingItem[] = [];
    const yearMonth = belongMonth.split('-');
    const queryYear = yearMonth[0];

    for (const user of users) {
      // 累计结果分：截止该月的所有已审核结果分（仅匹配该副榜指标）
      const resultScoreResult = await this.pointRepo
        .createQueryBuilder('pr')
        .innerJoin('pr.indicator', 'ind')
        .select('COALESCE(SUM(pr.score), 0)', 'total')
        .where('pr.userId = :userId', { userId: user.id })
        .andWhere('pr.auditStatus = 1')
        .andWhere('pr.pointStatus = 2')
        .andWhere('pr.belongMonth >= :startMonth', { startMonth: `${queryYear}-01` })
        .andWhere('pr.belongMonth <= :endMonth', { endMonth: belongMonth })
        .andWhere('ind.rankingListId = :rankingListId', { rankingListId })
        .getRawOne();

      // 当月过程分（仅匹配该副榜指标）
      const processScoreResult = await this.pointRepo
        .createQueryBuilder('pr2')
        .innerJoin('pr2.indicator', 'ind2')
        .select('COALESCE(SUM(pr2.score), 0)', 'total')
        .where('pr2.userId = :userId', { userId: user.id })
        .andWhere('pr2.auditStatus = 1')
        .andWhere('pr2.pointStatus = 1')
        .andWhere('pr2.belongMonth = :belongMonth', { belongMonth })
        .andWhere('ind2.rankingListId = :rankingListId', { rankingListId })
        .getRawOne();

      const resultScore = Number(resultScoreResult?.total || 0);
      const processScore = Number(processScoreResult?.total || 0);
      const totalScore = resultScore + processScore;

      rankings.push({
        userId: user.id,
        employeeNo: user.employeeNo,
        name: user.name,
        companyBelong: user.companyBelong,
        departmentName: user.department?.name || '',
        position: user.position || '',
        rankLevel: user.rankLevel || '',
        rankingListId: rankingListId,
        rankingListName: user.secondaryRankingList?.name || '',
        resultScore,
        processScore,
        totalScore,
        ranking: 0,
      });
    }

    // 按总分降序排列
    rankings.sort((a, b) => b.totalScore - a.totalScore);

    // 分配排名（同分同名次）
    let currentRank = 1;
    for (let i = 0; i < rankings.length; i++) {
      if (i > 0 && rankings[i].totalScore < rankings[i - 1].totalScore) {
        currentRank = i + 1;
      }
      rankings[i].ranking = currentRank;
    }

    return rankings;
  }

  /**
   * Recalculate and update user totalPoints and ranking in the database
   */
  async recalculateRankings(belongMonth: string): Promise<{ updated: number }> {
    const rankings = await this.getMonthlyRanking(belongMonth);
    let updated = 0;

    for (const item of rankings) {
      await this.userRepo.update(item.userId, {
        totalPoints: item.totalScore,
        ranking: item.ranking,
      });
      updated++;
    }

    this.logger.log(`Recalculated rankings for ${belongMonth}: ${updated} users updated`);
    return { updated };
  }

  /**
   * Get ranking for a specific user
   */
  async getUserRanking(userId: number, belongMonth: string): Promise<RankingItem | null> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) return null;

    const rankings = await this.getMonthlyRanking(belongMonth, user.rankingListId || undefined);
    return rankings.find((r) => r.userId === userId) || null;
  }

  async exportExcel(res: Response, belongMonth: string, rankingListId?: number) {
    const rankings = await this.getMonthlyRanking(belongMonth, rankingListId);
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('月度排名');

    sheet.columns = [
      { header: '排名', key: 'ranking', width: 8 },
      { header: '工号', key: 'employeeNo', width: 15 },
      { header: '姓名', key: 'name', width: 12 },
      { header: '归属组织', key: 'companyBelong', width: 10 },
      { header: '部门', key: 'departmentName', width: 20 },
      { header: '岗位', key: 'position', width: 20 },
      { header: '职级', key: 'rankLevel', width: 8 },
      { header: '结果分', key: 'resultScore', width: 10 },
      { header: '过程分', key: 'processScore', width: 10 },
      { header: '总分', key: 'totalScore', width: 10 },
      { header: '所属榜单', key: 'rankingListName', width: 15 },
    ];

    for (const r of rankings) {
      sheet.addRow(r);
    }

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=ranking_${belongMonth}.xlsx`);
    await workbook.xlsx.write(res);
    res.end();
  }

  // ===================== 年度排名聚合 =====================

  /**
   * 构建部门ID → [一级, 二级, 三级] 层级映射
   */
  private async buildDeptLevelMap(): Promise<Map<number, string[]>> {
    const allDepts = await this.deptRepo.find();
    const deptById = new Map<number, Department>();
    for (const d of allDepts) deptById.set(Number(d.id), d);

    const map = new Map<number, string[]>();
    for (const d of allDepts) {
      const chain: string[] = [];
      let cur: Department | undefined = d;
      while (cur) {
        chain.unshift(cur.name);
        cur = cur.parentId ? deptById.get(Number(cur.parentId)) : undefined;
      }
      map.set(Number(d.id), [chain[0] || '', chain[1] || '', chain[2] || '']);
    }
    return map;
  }

  /**
   * 单次聚合查询某年所有月度积分，按 userId+month+pointStatus 分组
   */
  private async aggregateYearScores(year: string, filterRankingListId?: number): Promise<
    Array<{ userId: number; belongMonth: string; pointStatus: number; total: number }>
  > {
    let qb = this.pointRepo
      .createQueryBuilder('pr')
      .select('pr.userId', 'userId')
      .addSelect('pr.belongMonth', 'belongMonth')
      .addSelect('pr.pointStatus', 'pointStatus')
      .addSelect('SUM(pr.score)', 'total')
      .where('pr.auditStatus = 1')
      .andWhere('pr.belongMonth LIKE :pattern', { pattern: `${year}-%` });

    if (filterRankingListId) {
      qb = qb
        .innerJoin('pr.indicator', 'ind')
        .andWhere('ind.rankingListId = :filterRLId', { filterRLId: filterRankingListId });
    } else {
      // 主榜模式：排除副榜指标积分
      qb = qb
        .innerJoin('pr.indicator', 'ind')
        .leftJoin('ind.rankingList', 'ind_rl')
        .andWhere('(ind_rl.isSecondary IS NULL OR ind_rl.isSecondary = 0)');
    }

    const raw: any[] = await qb
      .groupBy('pr.userId')
      .addGroupBy('pr.belongMonth')
      .addGroupBy('pr.pointStatus')
      .getRawMany();

    return raw.map((r) => ({
      userId: Number(r.userId),
      belongMonth: r.belongMonth,
      pointStatus: Number(r.pointStatus),
      total: Number(r.total) || 0,
    }));
  }

  /**
   * 递归获取部门及所有子部门ID
   */
  private async getDescendantDeptIds(deptId: number): Promise<number[]> {
    const allDepts = await this.deptRepo.find();
    const childrenMap = new Map<number, number[]>();
    for (const d of allDepts) {
      const pid = (d as any).parentId;
      if (pid) {
        if (!childrenMap.has(pid)) childrenMap.set(pid, []);
        childrenMap.get(pid)!.push(d.id);
      }
    }
    const result: number[] = [deptId];
    const queue = [deptId];
    while (queue.length) {
      const cur = queue.shift()!;
      const children = childrenMap.get(cur) || [];
      for (const cid of children) {
        result.push(cid);
        queue.push(cid);
      }
    }
    return result;
  }

  /**
   * 对一组用户按 totalScore 降序分配排名（同分同名次）
   */
  private assignRankings(items: Array<{ userId: number; totalScore: number }>): Map<number, number> {
    const sorted = [...items].sort((a, b) => b.totalScore - a.totalScore);
    const rankMap = new Map<number, number>();
    let currentRank = 1;
    for (let i = 0; i < sorted.length; i++) {
      if (i > 0 && sorted[i].totalScore < sorted[i - 1].totalScore) {
        currentRank = i + 1;
      }
      rankMap.set(sorted[i].userId, currentRank);
    }
    return rankMap;
  }

  /**
   * 年度排名聚合：12个月 + 4个季度 + 环比 + 荣誉
   */
  async getAnnualRanking(year: string, rankingListId?: number, keyword?: string, departmentId?: number, companyBelong?: string) {
    // 判断所选榜单是否为副榜
    let isSecondaryList = false;
    if (rankingListId) {
      const rl = await this.rankingListRepo.findOne({ where: { id: rankingListId } });
      if (rl?.isSecondary === 1) isSecondaryList = true;
    }

    // 1. 加载所有参与排名的用户
    let userQuery = this.userRepo
      .createQueryBuilder('u')
      .leftJoinAndSelect('u.department', 'd')
      .leftJoinAndSelect('u.rankingList', 'rl')
      .where('u.status = 1')
      .andWhere('u.isRankingDisabled = 0');
    if (rankingListId) {
      if (isSecondaryList) {
        userQuery = userQuery.andWhere('u.secondaryRankingListId = :rankingListId', { rankingListId });
      } else {
        userQuery = userQuery.andWhere('u.rankingListId = :rankingListId', { rankingListId });
      }
    }
    if (keyword) {
      userQuery = userQuery.andWhere('(u.name LIKE :kw OR u.employeeNo LIKE :kw)', { kw: `%${keyword}%` });
    }
    if (companyBelong) {
      userQuery = userQuery.andWhere('u.companyBelong = :companyBelong', { companyBelong });
    }
    if (departmentId) {
      // 递归查询该部门及所有子部门
      const deptIds = await this.getDescendantDeptIds(departmentId);
      userQuery = userQuery.andWhere('u.departmentId IN (:...deptIds)', { deptIds });
    }
    const users = await userQuery.getMany();
    const userMap = new Map(users.map((u) => [Number(u.id), u]));
    const userIds = new Set(users.map((u) => Number(u.id)));

    // 2. 部门层级
    const deptLevelMap = await this.buildDeptLevelMap();

    // 3. 聚合全年积分（副榜时按 indicator.rankingListId 过滤）
    const rawScores = await this.aggregateYearScores(year, isSecondaryList ? rankingListId : undefined);

    // 构建 Map<userId, Map<month, {resultScore, processScore}>>
    const scoreMap = new Map<number, Map<string, { resultScore: number; processScore: number }>>();
    for (const r of rawScores) {
      if (!userIds.has(r.userId)) continue;
      if (!scoreMap.has(r.userId)) scoreMap.set(r.userId, new Map());
      const monthMap = scoreMap.get(r.userId)!;
      const mm = r.belongMonth.slice(5); // "01"~"12"
      if (!monthMap.has(mm)) monthMap.set(mm, { resultScore: 0, processScore: 0 });
      const entry = monthMap.get(mm)!;
      if (r.pointStatus === 2) entry.resultScore += r.total;
      else entry.processScore += r.total;
    }

    // 4. 计算月度排名（月度积分 = 当月过程分 + 截止该月的累计结果分）
    const months = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0'));
    const quarterDef: Record<string, string[]> = {
      Q1: ['01', '02', '03'], Q2: ['04', '05', '06'],
      Q3: ['07', '08', '09'], Q4: ['10', '11', '12'],
    };

    const monthlyData: Record<string, Map<number, { score: number; ranking: number }>> = {};
    // 先计算每个用户截止各月的累计结果分
    const cumulativeResult = new Map<number, number[]>(); // userId -> [12 months cumulative]
    for (const uid of userIds) {
      const monthMap = scoreMap.get(uid);
      let cumResult = 0;
      const arr: number[] = [];
      for (const mm of months) {
        const entry = monthMap?.get(mm);
        cumResult += entry?.resultScore || 0;
        arr.push(cumResult);
      }
      cumulativeResult.set(uid, arr);
    }

    for (let mi = 0; mi < months.length; mi++) {
      const mm = months[mi];
      const items: Array<{ userId: number; totalScore: number }> = [];
      for (const uid of userIds) {
        const monthMap = scoreMap.get(uid);
        const entry = monthMap?.get(mm);
        const processScore = entry?.processScore || 0;
        const cumResult = cumulativeResult.get(uid)?.[mi] || 0;
        const score = Math.round((processScore + cumResult) * 10) / 10;
        items.push({ userId: uid, totalScore: score });
      }
      const rankMap = this.assignRankings(items);
      const dataMap = new Map<number, { score: number; ranking: number }>();
      for (const item of items) {
        dataMap.set(item.userId, { score: item.totalScore, ranking: rankMap.get(item.userId) || 0 });
      }
      monthlyData[mm] = dataMap;
    }

    // 5. 计算季度数据（季度积分 = 季度内各月结果分之和 + 季度当前月过程分）
    // 过程分不累加，只取当前月；结果分是确定状态，可累加
    const now = new Date();
    const queryYear = Number(year);
    // 1-based当前月 (1=Jan, 12=Dec)，如果查询年份是过去年份则视为12月
    const curMonthNum = queryYear < now.getFullYear() ? 12 : (queryYear === now.getFullYear() ? now.getMonth() + 1 : 0);

    const quarterlyData: Record<string, Map<number, { score: number; ranking: number }>> = {};
    for (const [q, qMonths] of Object.entries(quarterDef)) {
      const items: Array<{ userId: number; totalScore: number }> = [];
      const qFirstMonth = parseInt(qMonths[0]); // 1,4,7,10
      const qLastMonth = parseInt(qMonths[qMonths.length - 1]); // 3,6,9,12

      // 确定季度内取过程分的月份：当前季度取当前月，过去季度取季末月，未来季度无数据
      let processMonthNum = 0;
      if (curMonthNum >= qFirstMonth) {
        processMonthNum = Math.min(curMonthNum, qLastMonth);
      }
      const processMonthMM = processMonthNum > 0 ? String(processMonthNum).padStart(2, '0') : '';

      for (const uid of userIds) {
        const monthMap = scoreMap.get(uid);
        // 季度内各月结果分之和
        let resultSum = 0;
        for (const mm of qMonths) {
          resultSum += monthMap?.get(mm)?.resultScore || 0;
        }
        // 季度当前月的过程分（不累加）
        const processScore = processMonthMM ? (monthMap?.get(processMonthMM)?.processScore || 0) : 0;
        const qScore = Math.round((resultSum + processScore) * 10) / 10;
        items.push({ userId: uid, totalScore: qScore });
      }
      const rankMap = this.assignRankings(items);
      const dataMap = new Map<number, { score: number; ranking: number }>();
      for (const item of items) {
        dataMap.set(item.userId, { score: item.totalScore, ranking: rankMap.get(item.userId) || 0 });
      }
      quarterlyData[q] = dataMap;
    }

    // 6. 荣誉匹配 — 从 ranking_list 表读 topN
    const allRankingLists = await this.rankingListRepo.find();
    const rlMap = new Map(allRankingLists.map((rl) => [Number(rl.id), rl]));
    const secondaryRL = isSecondaryList && rankingListId ? rlMap.get(rankingListId) : undefined;
    const monthNames = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];

    // 7. 组装结果
    const results: any[] = [];
    for (const uid of userIds) {
      const user = userMap.get(uid)!;
      const deptLevels = user.departmentId ? deptLevelMap.get(Number(user.departmentId)) || ['', '', ''] : ['', '', ''];
      // 副榜模式下使用副榜信息，否则使用主榜
      const rl = isSecondaryList ? secondaryRL : (user.rankingListId ? rlMap.get(Number(user.rankingListId)) : undefined);
      const topN = rl?.topN || 10;

      // 月度
      const monthsResult: Record<string, any> = {};
      for (let mi = 0; mi < months.length; mi++) {
        const mm = months[mi];
        const cur = monthlyData[mm]?.get(uid) || { score: 0, ranking: 0 };
        let scoreMoM: number | null = null;
        let rankingMoM: number | null = null;
        if (mi > 0) {
          const prev = monthlyData[months[mi - 1]]?.get(uid) || { score: 0, ranking: 0 };
          scoreMoM = prev.score !== 0 ? Math.round(((cur.score - prev.score) / Math.abs(prev.score)) * 1000) / 10 : null;
          rankingMoM = prev.ranking - cur.ranking;
        }
        monthsResult[mm] = { score: cur.score, scoreMoM, ranking: cur.ranking, rankingMoM };
      }

      // 季度
      const quartersResult: Record<string, any> = {};
      const qKeys = ['Q1', 'Q2', 'Q3', 'Q4'];
      for (let qi = 0; qi < qKeys.length; qi++) {
        const q = qKeys[qi];
        const cur = quarterlyData[q]?.get(uid) || { score: 0, ranking: 0 };
        let scoreMoM: number | null = null;
        let rankingMoM: number | null = null;
        if (qi > 0) {
          const prev = quarterlyData[qKeys[qi - 1]]?.get(uid) || { score: 0, ranking: 0 };
          scoreMoM = prev.score !== 0 ? Math.round(((cur.score - prev.score) / Math.abs(prev.score)) * 1000) / 10 : null;
          rankingMoM = prev.ranking - cur.ranking;
        }
        quartersResult[q] = { score: cur.score, scoreMoM, ranking: cur.ranking, rankingMoM };
      }

      // 荣誉（月度荣誉仅展示已过去的月份，季度荣誉需手动确认不自动生成）
      const honors: string[] = [];
      const rlName = rl?.name || '';
      if (rlName) {
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth(); // 0-based: 0=Jan, 1=Feb, ...
        for (let mi = 0; mi < months.length; mi++) {
          // 次月展示：仅当该月已完全过去时才展示荣誉
          if (queryYear === currentYear && mi >= currentMonth) continue;
          const d = monthlyData[months[mi]]?.get(uid);
          if (d && d.ranking > 0 && d.ranking <= topN && d.score > 0) {
            honors.push(`${rlName}${monthNames[mi]}排名第${d.ranking}`);
          }
        }
        // 季度荣誉不自动生成，需用户手动确认后展示
      }

      // 当前积分：取当前月的月度积分（= 当月过程分 + 截止当月的累计结果分）
      const curMonthIdx = queryYear < now.getFullYear() ? 11 : now.getMonth(); // 0-based
      const curMM = months[curMonthIdx];
      const currentPoints = Math.round((monthlyData[curMM]?.get(uid)?.score || 0) * 10) / 10;

      results.push({
        userId: uid,
        name: user.name,
        companyBelong: user.companyBelong || '',
        dept1: deptLevels[0],
        dept2: deptLevels[1],
        dept3: deptLevels[2],
        rankingListName: rl?.name || '',
        currentPoints,
        months: monthsResult,
        quarters: quartersResult,
        honors,
      });
    }

    return results;
  }

  /**
   * 用户月度走势（员工画像用）
   */
  async getUserMonthlyTrend(userId: number, year: string) {
    const user = await this.userRepo.findOne({ where: { id: userId }, relations: ['rankingList'] });
    if (!user) return { months: [], honors: [] };

    const rlId = user.rankingListId ? Number(user.rankingListId) : undefined;

    // 查该用户月度积分（按 pointStatus 分组）
    const rawScores = await this.pointRepo
      .createQueryBuilder('pr')
      .select('pr.belongMonth', 'belongMonth')
      .addSelect('pr.pointStatus', 'pointStatus')
      .addSelect('SUM(pr.score)', 'total')
      .innerJoin('pr.indicator', 'ind')
      .leftJoin('ind.rankingList', 'ind_rl')
      .where('pr.userId = :userId', { userId })
      .andWhere('pr.auditStatus = 1')
      .andWhere('pr.belongMonth LIKE :pattern', { pattern: `${year}-%` })
      .andWhere('(ind_rl.isSecondary IS NULL OR ind_rl.isSecondary = 0)')
      .groupBy('pr.belongMonth')
      .addGroupBy('pr.pointStatus')
      .getRawMany();

    // Map<mm, {resultScore, processScore}>
    const userMonthMap = new Map<string, { resultScore: number; processScore: number }>();
    for (const r of rawScores) {
      const mm = (r.belongMonth as string).slice(5);
      if (!userMonthMap.has(mm)) userMonthMap.set(mm, { resultScore: 0, processScore: 0 });
      const entry = userMonthMap.get(mm)!;
      if (Number(r.pointStatus) === 2) entry.resultScore += Number(r.total) || 0;
      else entry.processScore += Number(r.total) || 0;
    }

    // 查同榜单所有用户月度积分（用于排名，同样按 pointStatus 分组）
    let allScoresQuery = this.pointRepo
      .createQueryBuilder('pr')
      .select('pr.userId', 'uid')
      .addSelect('pr.belongMonth', 'belongMonth')
      .addSelect('pr.pointStatus', 'pointStatus')
      .addSelect('SUM(pr.score)', 'total')
      .innerJoin('pr.indicator', 'ind')
      .leftJoin('ind.rankingList', 'ind_rl')
      .innerJoin(User, 'u', 'u.id = pr.userId')
      .where('pr.auditStatus = 1')
      .andWhere('pr.belongMonth LIKE :pattern', { pattern: `${year}-%` })
      .andWhere('u.status = 1')
      .andWhere('u.isRankingDisabled = 0')
      .andWhere('(ind_rl.isSecondary IS NULL OR ind_rl.isSecondary = 0)');
    if (rlId) {
      allScoresQuery = allScoresQuery.andWhere('u.rankingListId = :rlId', { rlId });
    }
    const allRaw: any[] = await allScoresQuery
      .groupBy('pr.userId')
      .addGroupBy('pr.belongMonth')
      .addGroupBy('pr.pointStatus')
      .getRawMany();

    // Map<userId, Map<mm, {resultScore, processScore}>>
    const allUserScoreMap = new Map<number, Map<string, { resultScore: number; processScore: number }>>();
    for (const r of allRaw) {
      const uid = Number(r.uid);
      const mm = (r.belongMonth as string).slice(5);
      if (!allUserScoreMap.has(uid)) allUserScoreMap.set(uid, new Map());
      const monthMap = allUserScoreMap.get(uid)!;
      if (!monthMap.has(mm)) monthMap.set(mm, { resultScore: 0, processScore: 0 });
      const entry = monthMap.get(mm)!;
      if (Number(r.pointStatus) === 2) entry.resultScore += Number(r.total) || 0;
      else entry.processScore += Number(r.total) || 0;
    }

    const allMonths = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0'));
    const monthNames = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];
    const rl = user.rankingListId ? await this.rankingListRepo.findOne({ where: { id: user.rankingListId } }) : null;
    const topN = rl?.topN || 10;
    const rlName = rl?.name || '';

    // 计算所有用户每月累计结果分
    const allUserIds = new Set(allUserScoreMap.keys());
    allUserIds.add(userId);
    const allCumResult = new Map<number, number[]>();
    for (const uid of allUserIds) {
      const monthMap = allUserScoreMap.get(uid);
      let cum = 0;
      const arr: number[] = [];
      for (const mm of allMonths) {
        cum += monthMap?.get(mm)?.resultScore || 0;
        arr.push(cum);
      }
      allCumResult.set(uid, arr);
    }

    const resultMonths: Array<{ month: string; score: number; ranking: number }> = [];
    const honors: string[] = [];

    // 只返回截止当前月的数据，未来月份不输出
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth(); // 0-based: 0=Jan
    const queryYear = Number(year);
    const lastMonthIdx = queryYear < currentYear ? 11 : (queryYear === currentYear ? currentMonth : -1);

    for (let mi = 0; mi < allMonths.length; mi++) {
      if (mi > lastMonthIdx) break; // 未来月份不输出
      const mm = allMonths[mi];
      // 当前用户分数：当月过程分 + 截止该月累计结果分
      const userEntry = userMonthMap.get(mm);
      const processScore = userEntry?.processScore || 0;
      const cumResult = allCumResult.get(userId)?.[mi] || 0;
      const score = Math.round((processScore + cumResult) * 10) / 10;

      // 排名：所有用户用同样公式计算
      const rankItems: Array<{ userId: number; totalScore: number }> = [];
      for (const uid of allUserIds) {
        const uidMonthMap = allUserScoreMap.get(uid);
        const uidProcess = uidMonthMap?.get(mm)?.processScore || 0;
        const uidCumResult = allCumResult.get(uid)?.[mi] || 0;
        rankItems.push({ userId: uid, totalScore: Math.round((uidProcess + uidCumResult) * 10) / 10 });
      }
      const rankMap = this.assignRankings(rankItems);
      const ranking = rankMap.get(userId) || 0;

      resultMonths.push({ month: mm, score, ranking });

      // 次月展示：仅当该月已完全过去时才展示荣誉
      if (rlName && ranking > 0 && ranking <= topN && score > 0) {
        if (queryYear < currentYear || mi < currentMonth) {
          honors.push(`${rlName}${monthNames[mi]}排名第${ranking}`);
        }
      }
    }

    return { months: resultMonths, honors };
  }

  /**
   * 年度排名 Excel 导出
   */
  async exportAnnualExcel(res: Response, year: string, rankingListId?: number, departmentId?: number, companyBelong?: string) {
    const data = await this.getAnnualRanking(year, rankingListId, undefined, departmentId, companyBelong);
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('积分与排名');

    const allMonths = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0'));
    const monthNames = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];
    const qKeys = ['Q1', 'Q2', 'Q3', 'Q4'];
    const baseHeaders = ['姓名', '一级部门', '二级部门', '三级部门', '归属', '所属榜单', '当前积分'];

    const row2: string[] = [...baseHeaders];
    let colIdx = baseHeaders.length + 1;
    const mergeRanges: Array<{ s: number; e: number; label: string }> = [];

    // 1月: 2列
    mergeRanges.push({ s: colIdx, e: colIdx + 1, label: monthNames[0] });
    row2.push('积分', '排名');
    colIdx += 2;

    // 2~12月: 各4列
    for (let mi = 1; mi < 12; mi++) {
      mergeRanges.push({ s: colIdx, e: colIdx + 3, label: monthNames[mi] });
      row2.push('积分', '积分环比', '排名', '排名环比');
      colIdx += 4;
    }

    // Q1~Q4: 各4列
    for (const q of qKeys) {
      mergeRanges.push({ s: colIdx, e: colIdx + 3, label: q });
      row2.push('积分', '积分环比', '排名', '排名环比');
      colIdx += 4;
    }

    row2.push('积分荣誉');
    const lastCol = row2.length;

    // 行1: 分组标题
    const emptyRow1: string[] = new Array(lastCol).fill('');
    sheet.addRow(emptyRow1);
    for (let c = 1; c <= baseHeaders.length; c++) {
      sheet.getCell(1, c).value = baseHeaders[c - 1];
      sheet.getCell(1, c).alignment = { horizontal: 'center', vertical: 'middle' };
    }
    for (const mg of mergeRanges) {
      sheet.mergeCells(1, mg.s, 1, mg.e);
      sheet.getCell(1, mg.s).value = mg.label;
      sheet.getCell(1, mg.s).alignment = { horizontal: 'center', vertical: 'middle' };
    }
    sheet.getCell(1, lastCol).value = '积分荣誉';
    sheet.getCell(1, lastCol).alignment = { horizontal: 'center', vertical: 'middle' };

    // 行2: 子标题
    sheet.addRow(row2);
    const subRow = sheet.getRow(2);
    subRow.eachCell((cell) => { cell.alignment = { horizontal: 'center' }; });
    sheet.getRow(1).font = { bold: true };
    subRow.font = { bold: true };

    // 基础列+荣誉列 合并行1-2
    for (let c = 1; c <= baseHeaders.length; c++) { sheet.mergeCells(1, c, 2, c); }
    sheet.mergeCells(1, lastCol, 2, lastCol);

    // 数据行
    for (const item of data) {
      const rd: any[] = [item.name, item.dept1, item.dept2, item.dept3, item.companyBelong, item.rankingListName, item.currentPoints];
      const m01 = item.months['01'] || {};
      rd.push(m01.score || 0, m01.ranking || 0);
      for (let mi = 1; mi < 12; mi++) {
        const md = item.months[allMonths[mi]] || {};
        rd.push(md.score || 0, md.scoreMoM != null ? `${md.scoreMoM > 0 ? '+' : ''}${md.scoreMoM}%` : '-', md.ranking || 0, md.rankingMoM != null ? (md.rankingMoM > 0 ? `↑${md.rankingMoM}` : md.rankingMoM < 0 ? `↓${Math.abs(md.rankingMoM)}` : '→') : '-');
      }
      for (const q of qKeys) {
        const qd = item.quarters[q] || {};
        rd.push(qd.score || 0, qd.scoreMoM != null ? `${qd.scoreMoM > 0 ? '+' : ''}${qd.scoreMoM}%` : '-', qd.ranking || 0, qd.rankingMoM != null ? (qd.rankingMoM > 0 ? `↑${qd.rankingMoM}` : qd.rankingMoM < 0 ? `↓${Math.abs(qd.rankingMoM)}` : '→') : '-');
      }
      rd.push(item.honors?.join('、') || '');
      sheet.addRow(rd);
    }

    for (let c = 1; c <= lastCol; c++) { sheet.getColumn(c).width = c <= 7 ? 12 : 10; }
    sheet.getColumn(1).width = 10;
    sheet.getColumn(lastCol).width = 40;

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=annual_ranking_${year}.xlsx`);
    await workbook.xlsx.write(res);
    res.end();
  }
}
