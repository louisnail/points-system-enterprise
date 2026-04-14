import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, In } from 'typeorm';
import { User } from './user.entity';
import { Department } from '../department/department.entity';
import { RankingList } from '../ranking-list/ranking-list.entity';
import { PointRecord } from '../point/point-record.entity';
import { ProcessPointHistory } from '../process-point/process-point-history.entity';
import { QuarterStar } from '../quarter-star/quarter-star.entity';
import { SystemConfigService } from '../system/system-config.service';
import { hashPassword } from '../../shared/utils/password.util';
import * as ExcelJS from 'exceljs';
import { Response } from 'express';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Department)
    private readonly deptRepo: Repository<Department>,
    @InjectRepository(RankingList)
    private readonly rankingListRepo: Repository<RankingList>,
    @InjectRepository(PointRecord)
    private readonly pointRecordRepo: Repository<PointRecord>,
    @InjectRepository(ProcessPointHistory)
    private readonly processPointHistoryRepo: Repository<ProcessPointHistory>,
    @InjectRepository(QuarterStar)
    private readonly quarterStarRepo: Repository<QuarterStar>,
    private readonly systemConfigService: SystemConfigService,
  ) {}

  async getCompanyBelongs(): Promise<string[]> {
    const rows: { cb: string }[] = await this.userRepo
      .createQueryBuilder('u')
      .select('DISTINCT u.company_belong', 'cb')
      .where('u.company_belong IS NOT NULL')
      .andWhere("u.company_belong != ''")
      .orderBy('u.company_belong', 'ASC')
      .getRawMany();
    return rows.map((r) => r.cb);
  }

  async getStatusStats() {
    const rows: { status: number; cnt: string }[] = await this.userRepo
      .createQueryBuilder('u')
      .select('u.status', 'status')
      .addSelect('COUNT(*)', 'cnt')
      .groupBy('u.status')
      .getRawMany();
    const counts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    for (const r of rows) counts[Number(r.status)] = Number(r.cnt);
    return counts;
  }

  async findAll(query: {
    page?: number;
    pageSize?: number;
    departmentId?: number;
    status?: number;
    companyBelong?: string;
    keyword?: string;
    isHistory?: boolean;
    rankingListId?: number;
  }) {
    const page = Number(query.page) || 1;
    const pageSize = Number(query.pageSize) || 20;
    const { departmentId, status, companyBelong, keyword, isHistory, rankingListId } = query;
    const qb = this.userRepo.createQueryBuilder('u')
      .leftJoinAndSelect('u.department', 'dept')
      .leftJoinAndSelect('u.rankingList', 'rl')
      .leftJoinAndSelect('u.secondaryRankingList', 'srl')
      .leftJoinAndSelect('u.manager', 'mgr')
      .leftJoinAndSelect('u.projectManager', 'pm');

    if (isHistory) {
      qb.where('u.status = :status', { status: 3 });
    } else if (status) {
      qb.where('u.status = :status', { status });
    } else {
      qb.where('u.status != :resigned', { resigned: 3 });
    }

    if (departmentId) {
      qb.andWhere('u.department_id = :departmentId', { departmentId });
    }
    if (companyBelong) {
      qb.andWhere('u.company_belong = :companyBelong', { companyBelong });
    }
    if (rankingListId) {
      qb.andWhere('u.ranking_list_id = :rankingListId', { rankingListId });
    }
    if (keyword) {
      qb.andWhere('(u.name LIKE :kw OR u.employee_no LIKE :kw)', { kw: `%${keyword}%` });
    }

    qb.orderBy('u.createdAt', 'DESC');
    const total = await qb.getCount();
    const list = await qb
      .skip((page - 1) * pageSize)
      .take(pageSize)
      .getMany();

    return { list, total, page, pageSize };
  }

  async findOne(id: number) {
    const user = await this.userRepo.findOne({
      where: { id },
      relations: ['department', 'rankingList', 'secondaryRankingList', 'manager'],
    });
    if (!user) throw new NotFoundException('员工不存在');
    return user;
  }

  async create(dto: Partial<User>) {
    const exists = await this.userRepo.findOne({ where: { employeeNo: dto.employeeNo } });
    if (exists) throw new BadRequestException(`工号 ${dto.employeeNo} 已存在`);

    dto.displayName = dto.displayName || dto.name;
    dto.passwordHash = await hashPassword(dto.employeeNo!);
    dto.role = dto.role || 'employee';

    // 读取初始积分配置
    if (dto.totalPoints === undefined || dto.totalPoints === null) {
      const initialScore = await this.getInitialScore();
      dto.totalPoints = initialScore;
    }

    const user = this.userRepo.create(dto);
    return this.userRepo.save(user);
  }

  async update(id: number, dto: Partial<User>) {
    const user = await this.findOne(id);
    if (dto.employeeNo && dto.employeeNo !== user.employeeNo) {
      const exists = await this.userRepo.findOne({ where: { employeeNo: dto.employeeNo } });
      if (exists) throw new BadRequestException(`工号 ${dto.employeeNo} 已存在`);
    }
    if (dto.employeeNo !== undefined) user.employeeNo = dto.employeeNo;
    if (dto.name !== undefined) user.name = dto.name;
    if (dto.displayName !== undefined) user.displayName = dto.displayName;
    if (dto.gender !== undefined) user.gender = dto.gender;
    if (dto.hireDate !== undefined) user.hireDate = dto.hireDate;
    if (dto.email !== undefined) user.email = dto.email;
    if (dto.education !== undefined) user.education = dto.education;
    if (dto.companyBelong !== undefined) user.companyBelong = dto.companyBelong;
    if (dto.baseLocation !== undefined) user.baseLocation = dto.baseLocation;
    if (dto.departmentId !== undefined) { user.departmentId = dto.departmentId; delete (user as any).department; }
    if (dto.position !== undefined) user.position = dto.position;
    if (dto.rankLevel !== undefined) user.rankLevel = dto.rankLevel;
    if (dto.managerId !== undefined) { user.managerId = dto.managerId; delete (user as any).manager; }
    if (dto.projectManagerId !== undefined) user.projectManagerId = dto.projectManagerId;
    if (dto.projectName !== undefined) user.projectName = dto.projectName;
    if (dto.projectRole !== undefined) user.projectRole = dto.projectRole;
    if (dto.rankingListId !== undefined) { user.rankingListId = dto.rankingListId; delete (user as any).rankingList; }
    if (dto.secondaryRankingListId !== undefined) { user.secondaryRankingListId = dto.secondaryRankingListId; delete (user as any).secondaryRankingList; }
    if (dto.status !== undefined) user.status = dto.status;
    if (dto.role !== undefined) user.role = dto.role;
    if (dto.customFields !== undefined) user.customFields = dto.customFields;
    return this.userRepo.save(user);
  }

  async batchUpdateDepartment(userIds: number[], departmentId: number) {
    if (!userIds?.length) throw new BadRequestException('请选择员工');
    const dept = await this.deptRepo.findOne({ where: { id: departmentId } });
    if (!dept) throw new BadRequestException('目标部门不存在');
    await this.userRepo.update({ id: In(userIds) }, { departmentId });
    return { success: userIds.length, message: `已将 ${userIds.length} 名员工调整至 ${dept.name}` };
  }

  async changeStatus(id: number, status: number) {
    const user = await this.findOne(id);
    user.status = status;
    if (status === 3) {
      user.isRankingDisabled = 1;
      user.ranking = null;
    }
    if (status === 5) {
      user.isRankingDisabled = 1;
    }
    return this.userRepo.save(user);
  }

  async toggleRankingDisabled(id: number, disabled: boolean) {
    const user = await this.findOne(id);
    user.isRankingDisabled = disabled ? 1 : 0;
    if (!disabled) {
      user.ranking = null;
    }
    return this.userRepo.save(user);
  }

  async exportExcel(res: Response, query: any) {
    const { list } = await this.findAll({ ...query, page: 1, pageSize: 10000 });
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('员工列表');

    // 构建部门层级映射
    const deptLevelMap = await this.buildDeptLevelMap();

    sheet.columns = [
      { header: '姓名', key: 'name', width: 12 },
      { header: '工号', key: 'employeeNo', width: 15 },
      { header: '性别', key: 'gender', width: 6 },
      { header: '归属组织', key: 'companyBelong', width: 10 },
      { header: '一级部门', key: 'dept1', width: 15 },
      { header: '二级部门', key: 'dept2', width: 15 },
      { header: '三级部门', key: 'dept3', width: 15 },
      { header: '岗位', key: 'position', width: 20 },
      { header: '职级', key: 'rankLevel', width: 8 },
      { header: '所属榜单', key: 'rankingListName', width: 15 },
      { header: '入职日期', key: 'hireDate', width: 12 },
      { header: '公司邮箱', key: 'email', width: 25 },
      { header: '最高学历', key: 'education', width: 10 },
      { header: 'base地', key: 'baseLocation', width: 10 },
      { header: '所在项目', key: 'projectName', width: 20 },
      { header: '项目角色', key: 'projectRole', width: 15 },
      { header: '主管', key: 'managerName', width: 12 },
      { header: '项目经理', key: 'pmName', width: 14 },
      { header: '当前积分', key: 'totalPoints', width: 10 },
      { header: '当前排名', key: 'ranking', width: 10 },
      { header: '状态', key: 'statusLabel', width: 10 },
    ];

    const statusMap: Record<number, string> = { 1: '在职', 2: '禁用', 3: '离职', 4: '待岗', 5: '停薪留职' };
    const genderMap: Record<number, string> = { 1: '男', 2: '女' };
    for (const u of list) {
      const levels = deptLevelMap.get(Number(u.departmentId)) || ['', '', ''];
      sheet.addRow({
        name: u.name,
        employeeNo: u.employeeNo,
        gender: genderMap[u.gender] || '',
        companyBelong: u.companyBelong,
        dept1: levels[0],
        dept2: levels[1],
        dept3: levels[2],
        position: u.position || '',
        rankLevel: u.rankLevel || '',
        rankingListName: u.rankingList?.name || '',
        hireDate: u.hireDate || '',
        email: u.email || '',
        education: u.education || '',
        baseLocation: u.baseLocation || '',
        projectName: u.projectName || '',
        projectRole: u.projectRole || '',
        managerName: (u as any).manager?.name || '',
        pmName: (u as any).projectManager?.name || '',
        totalPoints: u.totalPoints,
        ranking: u.ranking ?? '',
        statusLabel: statusMap[u.status] || '',
      });
    }

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=employees.xlsx');
    await workbook.xlsx.write(res);
    res.end();
  }

  async getTemplate(res: Response) {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('员工导入模板');

    sheet.columns = [
      { header: '姓名*', key: 'name', width: 12 },
      { header: '工号*', key: 'employeeNo', width: 15 },
      { header: '性别(男/女)', key: 'gender', width: 12 },
      { header: '归属组织*(TD/XD/TY/WB)', key: 'companyBelong', width: 22 },
      { header: '一级部门*', key: 'dept1', width: 15 },
      { header: '二级部门', key: 'dept2', width: 15 },
      { header: '三级部门', key: 'dept3', width: 15 },
      { header: '岗位', key: 'position', width: 20 },
      { header: '职级(P3-P12/M1-M6)', key: 'rankLevel', width: 18 },
      { header: '所属榜单名称', key: 'rankingListName', width: 15 },
      { header: '入职日期(YYYY-MM-DD)', key: 'hireDate', width: 20 },
      { header: '公司邮箱', key: 'email', width: 25 },
      { header: '最高学历', key: 'education', width: 12 },
      { header: 'base地', key: 'baseLocation', width: 12 },
      { header: '所在项目', key: 'projectName', width: 20 },
      { header: '项目角色', key: 'projectRole', width: 15 },
      { header: '主管姓名', key: 'managerName', width: 12 },
      { header: '项目经理姓名', key: 'pmName', width: 14 },
    ];

    sheet.addRow({
      name: '张三',
      employeeNo: '004001',
      gender: '男',
      companyBelong: 'TD',
      dept1: '技术交付中心',
      dept2: '技术交付一组',
      dept3: '',
      position: '高级开发工程师',
      rankLevel: 'P6',
      rankingListName: '',
      hireDate: '2025-03-10',
      email: 'san.zhang@example.com',
      education: '本科',
      baseLocation: '杭州',
      projectName: '',
      projectRole: 'JAVA开发',
      managerName: '',
      pmName: '',
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=employee_template.xlsx');
    await workbook.xlsx.write(res);
    res.end();
  }

  async importFromExcel(buffer: Buffer) {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer as any);
    const sheet = workbook.worksheets[0];
    if (!sheet) throw new BadRequestException('Excel文件为空');

    // 检测旧模板：旧模板第1列表头含"工号"，新模板第1列为"姓名"
    const header1 = sheet.getRow(1).getCell(1).text?.trim() || '';
    if (header1.includes('工号')) {
      throw new BadRequestException('检测到旧版模板，请重新下载最新模板后再导入');
    }

    // 预加载所有部门，构建 id→dept 和 parentId 索引
    const allDepts = await this.deptRepo.find();
    const deptById = new Map<number, Department>();
    for (const d of allDepts) deptById.set(Number(d.id), d);

    // 构建部门层级路径 deptId → [level1, level2, level3]
    const getDeptPath = (deptId: number): string[] => {
      const chain: string[] = [];
      let cur = deptById.get(deptId);
      while (cur) {
        chain.unshift(cur.name);
        cur = cur.parentId ? deptById.get(Number(cur.parentId)) : undefined;
      }
      return [chain[0] || '', chain[1] || '', chain[2] || ''];
    };

    const results = { success: 0, failed: 0, errors: [] as string[] };
    const genderMap: Record<string, number> = { '男': 1, '女': 2 };
    const initialScore = await this.getInitialScore();

    // 列顺序: 1姓名 2工号 3性别 4归属组织 5一级部门 6二级部门 7三级部门 8岗位 9职级 10榜单 11入职日期 12邮箱 13学历 14base地 15项目 16项目角色 17主管姓名 18PM姓名
    for (let i = 2; i <= sheet.rowCount; i++) {
      const row = sheet.getRow(i);
      const name = row.getCell(1).text?.trim();
      const employeeNo = row.getCell(2).text?.trim();

      if (!name || !employeeNo) {
        results.errors.push(`第${i}行: 姓名和工号为必填`);
        results.failed++;
        continue;
      }

      try {
        const exists = await this.userRepo.findOne({ where: { employeeNo } });
        if (exists) {
          results.errors.push(`第${i}行: 工号 ${employeeNo} 已存在`);
          results.failed++;
          continue;
        }

        const companyBelong = row.getCell(4).text?.trim();
        const dept1 = row.getCell(5).text?.trim();
        const dept2 = row.getCell(6).text?.trim();
        const dept3 = row.getCell(7).text?.trim();

        if (!companyBelong || !dept1) {
          results.errors.push(`第${i}行: 归属组织和一级部门为必填`);
          results.failed++;
          continue;
        }

        // 按最深层级部门名称匹配，验证层级路径
        const targetDeptName = dept3 || dept2 || dept1;
        const candidates = allDepts.filter(d => d.name === targetDeptName);
        let matchedDept: Department | undefined;
        if (candidates.length === 1) {
          matchedDept = candidates[0];
        } else if (candidates.length > 1) {
          // 多个同名部门，按层级路径精确匹配
          matchedDept = candidates.find(d => {
            const path = getDeptPath(Number(d.id));
            return path[0] === dept1 && (!dept2 || path[1] === dept2) && (!dept3 || path[2] === dept3);
          });
        }
        if (!matchedDept) {
          const deptLabel = [dept1, dept2, dept3].filter(Boolean).join(' > ');
          results.errors.push(`第${i}行: 部门「${deptLabel}」不存在`);
          results.failed++;
          continue;
        }
        const departmentId = Number(matchedDept.id);

        // 解析所属榜单名称 → rankingListId
        const rankingListName = row.getCell(10).text?.trim();
        let rankingListId: number | undefined;
        if (rankingListName) {
          const rl = await this.rankingListRepo.findOne({ where: { name: rankingListName } });
          if (!rl) {
            results.errors.push(`第${i}行: 榜单「${rankingListName}」不存在，已跳过该字段`);
          } else {
            rankingListId = Number(rl.id);
          }
        }

        // 解析主管姓名 → managerId
        const managerName = row.getCell(17).text?.trim();
        let managerId: number | undefined;
        if (managerName) {
          const mgrs = await this.userRepo.find({ where: { name: managerName } });
          if (mgrs.length === 0) {
            results.errors.push(`第${i}行: 主管「${managerName}」未找到对应员工，已跳过该字段`);
          } else if (mgrs.length > 1) {
            results.errors.push(`第${i}行: 主管「${managerName}」存在多人同名，已跳过该字段，请手动指定`);
          } else {
            managerId = Number(mgrs[0].id);
          }
        }

        // 解析项目经理姓名 → projectManagerId
        const pmName = row.getCell(18).text?.trim();
        let projectManagerId: number | undefined;
        if (pmName) {
          const pms = await this.userRepo.find({ where: { name: pmName } });
          if (pms.length === 0) {
            results.errors.push(`第${i}行: 项目经理「${pmName}」未找到对应员工，已跳过该字段`);
          } else if (pms.length > 1) {
            results.errors.push(`第${i}行: 项目经理「${pmName}」存在多人同名，已跳过该字段，请手动指定`);
          } else {
            projectManagerId = Number(pms[0].id);
          }
        }

        const passwordHash = await hashPassword(employeeNo);
        const userData: Partial<User> = {
          name,
          employeeNo,
          displayName: name,
          gender: genderMap[row.getCell(3).text?.trim()] || undefined,
          companyBelong,
          departmentId,
          position: row.getCell(8).text?.trim() || undefined,
          rankLevel: row.getCell(9).text?.trim() || undefined,
          rankingListId,
          hireDate: row.getCell(11).text?.trim() || undefined,
          email: row.getCell(12).text?.trim() || undefined,
          education: row.getCell(13).text?.trim() || undefined,
          baseLocation: row.getCell(14).text?.trim() || undefined,
          projectName: row.getCell(15).text?.trim() || undefined,
          projectRole: row.getCell(16).text?.trim() || undefined,
          managerId,
          projectManagerId,
          passwordHash,
          status: 1,
          totalPoints: initialScore,
        };
        await this.userRepo.save(this.userRepo.create(userData));
        results.success++;
      } catch (err: any) {
        results.errors.push(`第${i}行: ${err.message}`);
        results.failed++;
      }
    }

    return results;
  }

  /** 检查员工关联数据 */
  async checkUserAssociations(ids: number[]) {
    if (!ids?.length) return { blockedIds: [], details: [] };

    // 关键：确保所有ID都是数字类型，bigint从数据库/前端可能传入字符串
    const numIds = ids.map(id => Number(id)).filter(id => !isNaN(id) && id > 0);
    if (!numIds.length) return { blockedIds: [], details: [] };

    // 查积分记录 - 用原生SQL确保3个外键都检查到
    const placeholders = numIds.map(() => '?').join(',');
    const pointAllRows: { uid: string; cnt: string }[] = await this.pointRecordRepo.query(
      `SELECT uid, COUNT(*) as cnt FROM (
        SELECT user_id AS uid FROM point_record WHERE user_id IN (${placeholders})
        UNION ALL
        SELECT registrant_id AS uid FROM point_record WHERE registrant_id IN (${placeholders})
        UNION ALL
        SELECT auditor_id AS uid FROM point_record WHERE auditor_id IN (${placeholders})
      ) t GROUP BY uid`,
      [...numIds, ...numIds, ...numIds],
    );

    // 查流程积分历史
    const historyRows: { userId: string; cnt: string }[] = await this.processPointHistoryRepo
      .createQueryBuilder('ph')
      .select('ph.userId', 'userId')
      .addSelect('COUNT(*)', 'cnt')
      .where('ph.userId IN (:...ids)', { ids: numIds })
      .groupBy('ph.userId')
      .getRawMany();

    // 查季度之星
    const starRows: { userId: string; cnt: string }[] = await this.quarterStarRepo
      .createQueryBuilder('qs')
      .select('qs.userId', 'userId')
      .addSelect('COUNT(*)', 'cnt')
      .where('qs.userId IN (:...ids)', { ids: numIds })
      .groupBy('qs.userId')
      .getRawMany();

    // 查被其他员工引用为主管
    const mgrRows: { managerId: string; cnt: string }[] = await this.userRepo
      .createQueryBuilder('u')
      .select('u.managerId', 'managerId')
      .addSelect('COUNT(*)', 'cnt')
      .where('u.managerId IN (:...ids)', { ids: numIds })
      .groupBy('u.managerId')
      .getRawMany();

    // 查被其他员工引用为项目经理
    const pmRows: { projectManagerId: string; cnt: string }[] = await this.userRepo
      .createQueryBuilder('u')
      .select('u.projectManagerId', 'projectManagerId')
      .addSelect('COUNT(*)', 'cnt')
      .where('u.projectManagerId IN (:...ids)', { ids: numIds })
      .groupBy('u.projectManagerId')
      .getRawMany();

    // 查被部门引用为部门主管
    const deptMgrRows: { managerId: string; cnt: string }[] = await this.deptRepo
      .createQueryBuilder('d')
      .select('d.managerId', 'managerId')
      .addSelect('COUNT(*)', 'cnt')
      .where('d.managerId IN (:...ids)', { ids: numIds })
      .groupBy('d.managerId')
      .getRawMany();

    // 合并结果
    const users = await this.userRepo.find({ where: { id: In(numIds) }, select: ['id', 'name', 'employeeNo'] });
    const userMap = new Map(users.map(u => [Number(u.id), u]));

    // 合并积分记录查询
    const pointMap = new Map<number, number>();
    for (const r of pointAllRows) pointMap.set(Number(r.uid), Number(r.cnt));

    const historyMap = new Map(historyRows.map(r => [Number(r.userId), Number(r.cnt)]));
    const starMap = new Map(starRows.map(r => [Number(r.userId), Number(r.cnt)]));
    const mgrMap = new Map(mgrRows.map(r => [Number(r.managerId), Number(r.cnt)]));
    const pmMap = new Map(pmRows.map(r => [Number(r.projectManagerId), Number(r.cnt)]));
    const deptMgrMap = new Map(deptMgrRows.map(r => [Number(r.managerId), Number(r.cnt)]));

    const blockedIds: number[] = [];
    const details: any[] = [];

    for (const id of numIds) {
      const pc = pointMap.get(id) || 0;
      const hc = historyMap.get(id) || 0;
      const sc = starMap.get(id) || 0;
      const mc = mgrMap.get(id) || 0;
      const pmc = pmMap.get(id) || 0;
      const dc = deptMgrMap.get(id) || 0;
      const total = pc + hc + sc + mc + pmc + dc;
      if (total > 0) {
        blockedIds.push(id);
        const user = userMap.get(id);
        const parts: string[] = [];
        if (pc) parts.push(`${pc}条积分记录`);
        if (hc) parts.push(`${hc}条流程积分`);
        if (sc) parts.push(`${sc}条季度之星`);
        if (mc) parts.push(`被${mc}名员工设为主管`);
        if (pmc) parts.push(`被${pmc}名员工设为项目经理`);
        if (dc) parts.push(`被${dc}个部门设为部门主管`);
        details.push({
          userId: id,
          userName: user?.name || '',
          employeeNo: user?.employeeNo || '',
          summary: parts.join('、'),
        });
      }
    }

    return { blockedIds, details };
  }

  /** 批量永久删除员工（支持级联删除） */
  async batchPermanentDelete(ids: number[], force = false) {
    if (!ids?.length) throw new BadRequestException('请选择要删除的员工');

    // 确保所有ID都是数字类型
    const numIds = ids.map(id => Number(id)).filter(id => !isNaN(id) && id > 0);
    if (!numIds.length) throw new BadRequestException('请选择要删除的员工');

    // 保护超级管理员不被删除
    const admins = await this.userRepo.find({ where: { id: In(numIds), role: 'super_admin' }, select: ['id', 'name'] });
    if (admins.length > 0) {
      throw new BadRequestException(`超级管理员「${admins.map(a => a.name).join('、')}」不可删除`);
    }

    const { blockedIds, details } = await this.checkUserAssociations(numIds);

    // 非强制模式：有关联数据则阻止
    if (!force && blockedIds.length > 0) {
      const detailMsg = details
        .map(d => `「${d.userName}(${d.employeeNo})」关联 ${d.summary}`)
        .join('；');
      throw new BadRequestException(`以下员工存在关联数据，无法删除：${detailMsg}`);
    }

    // 级联删除：按顺序清除关联数据
    if (force && blockedIds.length > 0) {
      const placeholders = numIds.map(() => '?').join(',');

      // 1. 删除积分记录（user_id / registrant_id / auditor_id 引用）
      await this.pointRecordRepo.query(
        `DELETE FROM point_record WHERE user_id IN (${placeholders}) OR registrant_id IN (${placeholders}) OR auditor_id IN (${placeholders})`,
        [...numIds, ...numIds, ...numIds],
      );

      // 2. 删除流程积分历史
      await this.processPointHistoryRepo.query(
        `DELETE FROM process_point_history WHERE user_id IN (${placeholders})`,
        numIds,
      );

      // 3. 删除季度之星
      await this.quarterStarRepo.query(
        `DELETE FROM quarter_star WHERE user_id IN (${placeholders})`,
        numIds,
      );

      // 4. 清除其他员工对这些员工的主管/项目经理引用（置空）
      await this.userRepo.query(
        `UPDATE user SET manager_id = NULL WHERE manager_id IN (${placeholders})`,
        numIds,
      );
      await this.userRepo.query(
        `UPDATE user SET project_manager_id = NULL WHERE project_manager_id IN (${placeholders})`,
        numIds,
      );

      // 5. 清除部门主管引用（置空）
      await this.deptRepo.query(
        `UPDATE department SET manager_id = NULL WHERE manager_id IN (${placeholders})`,
        numIds,
      );
    }

    try {
      const result = await this.userRepo.delete(numIds);
      return { success: result.affected || numIds.length, message: `已永久删除 ${result.affected || numIds.length} 个员工` };
    } catch (err: any) {
      if (err?.code === 'ER_ROW_IS_REFERENCED_2' || err?.errno === 1451) {
        const constraintMatch = err.message?.match(/CONSTRAINT `([^`]+)`/);
        const constraint = constraintMatch ? constraintMatch[1] : '未知';
        throw new BadRequestException(
          `删除失败：数据库存在外键约束 (${constraint})，请先清除关联数据后再试`,
        );
      }
      throw err;
    }
  }

  /** 获取系统配置的新员工初始积分 */
  private async getInitialScore(): Promise<number> {
    const config = await this.systemConfigService.getByKey('point.initial_score');
    return config ? Number(config.configValue) || 0 : 0;
  }

  /** 构建部门ID → [一级, 二级, 三级] 层级映射 */
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
}
