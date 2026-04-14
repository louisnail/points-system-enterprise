import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { Award } from './award.entity';
import { User } from '../user/user.entity';
import { Department } from '../department/department.entity';
import { Response } from 'express';
import * as ExcelJS from 'exceljs';

interface AwardQuery {
  year?: string;
  quarter?: string;
  departmentId?: number;
  companyBelong?: string;
  status?: number | string;
  keyword?: string;
  page?: number;
  pageSize?: number;
}

@Injectable()
export class AwardService {
  constructor(
    @InjectRepository(Award) private readonly awardRepo: Repository<Award>,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(Department) private readonly deptRepo: Repository<Department>,
  ) {}

  /**
   * 分页列表
   */
  async findAll(query: AwardQuery) {
    const page = Number(query.page) || 1;
    const pageSize = Number(query.pageSize) || 20;

    const qb = this.awardRepo
      .createQueryBuilder('a')
      .leftJoinAndSelect('a.user', 'u')
      .leftJoinAndSelect('a.department', 'd')
      .leftJoinAndSelect('a.rankingList', 'rl');

    await this.applyFilters(qb, query);

    qb.orderBy('a.createdAt', 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize);

    const [list, total] = await qb.getManyAndCount();
    return { list, total, page, pageSize };
  }

  /**
   * 统计金额（复用筛选条件）
   */
  async getStats(query: AwardQuery) {
    const qb = this.awardRepo
      .createQueryBuilder('a')
      .leftJoin('a.user', 'u');

    await this.applyFilters(qb, query);

    qb.select('COALESCE(SUM(a.amount), 0)', 'totalAmount')
      .addSelect('COALESCE(SUM(CASE WHEN a.status = 1 THEN a.amount ELSE 0 END), 0)', 'paidAmount')
      .addSelect('COALESCE(SUM(CASE WHEN a.status = 0 THEN a.amount ELSE 0 END), 0)', 'pendingAmount');

    const raw = await qb.getRawOne();
    return {
      totalAmount: Number(raw?.totalAmount || 0),
      paidAmount: Number(raw?.paidAmount || 0),
      pendingAmount: Number(raw?.pendingAmount || 0),
    };
  }

  /**
   * 创建评奖记录
   */
  async create(dto: {
    userId: number;
    honors?: string;
    amount: number;
    reason?: string;
    selectedMonth: string;
    status?: number;
    remark?: string;
  }) {
    if (!dto.userId) throw new BadRequestException('请选择获奖员工');
    if (!dto.selectedMonth || !/^\d{4}-\d{2}$/.test(dto.selectedMonth)) {
      throw new BadRequestException('入选月份格式不正确，应为 YYYY-MM');
    }

    const user = await this.userRepo.findOne({
      where: { id: dto.userId },
      relations: ['department', 'rankingList'],
    });
    if (!user) throw new BadRequestException('员工不存在');

    const award = new Award();
    award.userId = dto.userId;
    award.departmentId = user.departmentId;
    award.companyBelong = user.companyBelong;
    award.rankingListId = user.rankingListId;
    award.honors = dto.honors || '';
    award.amount = dto.amount || 0;
    award.reason = dto.reason || '';
    award.selectedMonth = dto.selectedMonth;
    award.status = dto.status ?? 0;
    award.remark = dto.remark || '';

    return this.awardRepo.save(award);
  }

  /**
   * 更新评奖记录（不更新冗余字段）
   */
  async update(id: number, dto: {
    honors?: string;
    amount?: number;
    reason?: string;
    selectedMonth?: string;
    status?: number;
    remark?: string;
  }) {
    const award = await this.awardRepo.findOne({ where: { id } });
    if (!award) throw new NotFoundException('评奖记录不存在');

    if (dto.selectedMonth !== undefined && !/^\d{4}-\d{2}$/.test(dto.selectedMonth)) {
      throw new BadRequestException('入选月份格式不正确，应为 YYYY-MM');
    }

    if (dto.honors !== undefined) award.honors = dto.honors;
    if (dto.amount !== undefined) award.amount = dto.amount;
    if (dto.reason !== undefined) award.reason = dto.reason;
    if (dto.selectedMonth !== undefined) award.selectedMonth = dto.selectedMonth;
    if (dto.status !== undefined) award.status = dto.status;
    if (dto.remark !== undefined) award.remark = dto.remark;

    return this.awardRepo.save(award);
  }

  /**
   * 删除评奖记录
   */
  async remove(id: number) {
    const award = await this.awardRepo.findOne({ where: { id } });
    if (!award) throw new NotFoundException('评奖记录不存在');
    await this.awardRepo.remove(award);
    return { success: true };
  }

  /**
   * Excel 导出
   */
  async exportExcel(res: Response, query: AwardQuery) {
    const qb = this.awardRepo
      .createQueryBuilder('a')
      .leftJoinAndSelect('a.user', 'u')
      .leftJoinAndSelect('a.department', 'd')
      .leftJoinAndSelect('a.rankingList', 'rl');

    await this.applyFilters(qb, query);
    qb.orderBy('a.createdAt', 'DESC');

    const list = await qb.getMany();

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('评奖记录');

    sheet.columns = [
      { header: '姓名', key: 'name', width: 12 },
      { header: '部门', key: 'department', width: 20 },
      { header: '归属', key: 'companyBelong', width: 10 },
      { header: '榜单', key: 'rankingList', width: 15 },
      { header: '积分荣誉', key: 'honors', width: 25 },
      { header: '奖金金额', key: 'amount', width: 12 },
      { header: '评奖理由', key: 'reason', width: 30 },
      { header: '入选月份', key: 'selectedMonth', width: 12 },
      { header: '发放状态', key: 'status', width: 10 },
      { header: '备注', key: 'remark', width: 25 },
      { header: '创建时间', key: 'createdAt', width: 20 },
    ];

    for (const item of list) {
      sheet.addRow({
        name: item.user?.name || '',
        department: item.department?.name || '',
        companyBelong: item.companyBelong || '',
        rankingList: item.rankingList?.name || '',
        honors: item.honors || '',
        amount: Number(item.amount) || 0,
        reason: item.reason || '',
        selectedMonth: item.selectedMonth || '',
        status: item.status === 1 ? '已发放' : '待发放',
        remark: item.remark || '',
        createdAt: item.createdAt
          ? new Date(item.createdAt).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })
          : '',
      });
    }

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader('Content-Disposition', 'attachment; filename=award_records.xlsx');
    await workbook.xlsx.write(res);
    res.end();
  }

  // ====== 私有方法 ======

  /**
   * 复用筛选逻辑
   */
  private async applyFilters(qb: SelectQueryBuilder<Award>, query: AwardQuery) {
    const { year, quarter, departmentId, companyBelong, status, keyword } = query;

    // 年份筛选
    if (year) {
      qb.andWhere('a.selectedMonth LIKE :yearPrefix', { yearPrefix: `${year}%` });
    }

    // 季度筛选（依赖年份）
    if (quarter && year) {
      const quarterMap: Record<string, string[]> = {
        Q1: ['01', '02', '03'],
        Q2: ['04', '05', '06'],
        Q3: ['07', '08', '09'],
        Q4: ['10', '11', '12'],
      };
      const monthSuffixes = quarterMap[quarter];
      if (monthSuffixes) {
        const months = monthSuffixes.map((m) => `${year}-${m}`);
        qb.andWhere('a.selectedMonth IN (:...months)', { months });
      }
    }

    // 部门筛选（递归子部门）
    if (departmentId) {
      const deptIds = await this.getDescendantDeptIds(Number(departmentId));
      qb.andWhere('a.departmentId IN (:...deptIds)', { deptIds });
    }

    // 归属组织筛选
    if (companyBelong) {
      qb.andWhere('a.companyBelong = :companyBelong', { companyBelong });
    }

    // 发放状态筛选（0 是合法值）
    if (status !== undefined && status !== null && status !== '') {
      qb.andWhere('a.status = :status', { status: Number(status) });
    }

    // 关键词搜索
    if (keyword) {
      qb.andWhere('(u.name LIKE :kw OR u.employeeNo LIKE :kw)', { kw: `%${keyword}%` });
    }
  }

  /**
   * 递归获取子部门ID（BFS）
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
}
