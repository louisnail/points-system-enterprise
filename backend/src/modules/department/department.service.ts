import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Department } from './department.entity';
import { User } from '../user/user.entity';
import { listToTree } from '../../shared/utils/tree.util';

@Injectable()
export class DepartmentService {
  constructor(
    @InjectRepository(Department)
    private readonly deptRepo: Repository<Department>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly dataSource: DataSource,
  ) {}

  async findAll() {
    return this.deptRepo.find({ order: { sortOrder: 'ASC', id: 'ASC' } });
  }

  async getTree() {
    const list = await this.deptRepo.find({
      relations: ['manager'],
      order: { sortOrder: 'ASC', id: 'ASC' },
    });

    // 统计每个部门的直属成员数
    const countRows: { departmentId: number; cnt: string }[] = await this.userRepo
      .createQueryBuilder('u')
      .select('u.department_id', 'departmentId')
      .addSelect('COUNT(*)', 'cnt')
      .where('u.status IN (:...statuses)', { statuses: [1, 2, 4, 5] })
      .groupBy('u.department_id')
      .getRawMany();
    const countMap = new Map<number, number>();
    for (const row of countRows) {
      countMap.set(Number(row.departmentId), Number(row.cnt));
    }

    const mapped = list.map((d) => ({
      id: Number(d.id),
      name: d.name,
      parentId: Number(d.parentId),
      level: d.level,
      sortOrder: d.sortOrder,
      managerId: d.managerId ? Number(d.managerId) : null,
      managerName: d.manager?.name || null,
      createdAt: d.createdAt,
      memberCount: countMap.get(Number(d.id)) || 0,
    }));
    return listToTree(mapped);
  }

  async getEmployees(deptId: number, query?: { keyword?: string; companyBelong?: string }) {
    // Collect current department + all descendant department IDs
    const deptIds = await this.getDescendantIds(deptId);

    const qb = this.userRepo.createQueryBuilder('u')
      .leftJoinAndSelect('u.rankingList', 'rl')
      .where('u.department_id IN (:...deptIds)', { deptIds })
      .andWhere('u.status IN (:...statuses)', { statuses: [1, 2, 4, 5] });

    if (query?.keyword) {
      qb.andWhere('(u.name LIKE :kw OR u.employee_no LIKE :kw)', { kw: `%${query.keyword}%` });
    }
    if (query?.companyBelong) {
      qb.andWhere('u.company_belong = :cb', { cb: query.companyBelong });
    }

    qb.leftJoinAndSelect('u.department', 'dept');
    qb.orderBy('u.name', 'ASC');
    return qb.getMany();
  }

  /** Recursively collect department ID and all descendant department IDs */
  private async getDescendantIds(deptId: number): Promise<number[]> {
    const allDepts = await this.deptRepo.find({ select: ['id', 'parentId'] });
    const childrenMap = new Map<number, number[]>();
    for (const d of allDepts) {
      const pid = Number(d.parentId);
      if (!childrenMap.has(pid)) childrenMap.set(pid, []);
      childrenMap.get(pid)!.push(Number(d.id));
    }
    const result: number[] = [deptId];
    const stack = [deptId];
    while (stack.length > 0) {
      const current = stack.pop()!;
      const children = childrenMap.get(current) || [];
      for (const childId of children) {
        result.push(childId);
        stack.push(childId);
      }
    }
    return result;
  }

  async batchSort(items: { id: number; sortOrder: number; parentId?: number }[]) {
    const qr = this.dataSource.createQueryRunner();
    await qr.connect();
    await qr.startTransaction();
    try {
      for (const item of items) {
        const updates: Partial<Department> = { sortOrder: item.sortOrder };
        if (item.parentId !== undefined) {
          updates.parentId = item.parentId;
        }
        await qr.manager.update(Department, item.id, updates);
      }
      await qr.commitTransaction();
    } catch (err) {
      await qr.rollbackTransaction();
      throw err;
    } finally {
      await qr.release();
    }
    return { message: '排序已更新' };
  }

  async findOne(id: number) {
    const dept = await this.deptRepo.findOne({ where: { id } });
    if (!dept) throw new NotFoundException('部门不存在');
    return dept;
  }

  async create(dto: Partial<Department>) {
    // 自动计算层级
    if (dto.parentId && !dto.level) {
      const parent = await this.deptRepo.findOne({ where: { id: dto.parentId } });
      dto.level = parent ? (parent.level || 0) + 1 : 1;
    } else if (!dto.level) {
      dto.level = 1;
    }
    const dept = this.deptRepo.create(dto);
    return this.deptRepo.save(dept);
  }

  async update(id: number, dto: Partial<Department>) {
    const dept = await this.findOne(id);
    if (dto.name !== undefined) dept.name = dto.name;
    if (dto.parentId !== undefined) dept.parentId = dto.parentId;
    if (dto.level !== undefined) dept.level = dto.level;
    if (dto.sortOrder !== undefined) dept.sortOrder = dto.sortOrder;
    if (dto.managerId !== undefined) dept.managerId = dto.managerId;
    return this.deptRepo.save(dept);
  }

  async remove(id: number) {
    const children = await this.deptRepo.find({ where: { parentId: id } });
    if (children.length > 0) {
      throw new BadRequestException('该部门下存在子部门，无法删除');
    }
    const members = await this.userRepo.count({ where: { departmentId: id } });
    if (members > 0) {
      throw new BadRequestException('该部门下存在员工，无法删除');
    }
    await this.deptRepo.delete(id);
    return { message: '删除成功' };
  }
}
