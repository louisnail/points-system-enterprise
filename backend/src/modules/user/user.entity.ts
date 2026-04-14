import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Department } from '../department/department.entity';
import { RankingList } from '../ranking-list/ranking-list.entity';

@Entity('user')
export class User {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @Column({ name: 'employee_no', length: 20, unique: true, comment: '工号' })
  employeeNo: string;

  @Column({ length: 50, comment: '姓名' })
  name: string;

  @Column({ name: 'display_name', length: 100, comment: '显示名称' })
  displayName: string;

  @Column({ type: 'tinyint', nullable: true, comment: '性别:1男2女' })
  gender: number;

  @Column({ name: 'hire_date', type: 'date', nullable: true, comment: '入职日期' })
  hireDate: string;

  @Column({ length: 100, nullable: true, comment: '公司邮箱' })
  email: string;

  @Column({ length: 20, nullable: true, comment: '最高学历' })
  education: string;

  @Column({ name: 'company_belong', length: 20, comment: '归属组织' })
  companyBelong: string;

  @Column({ name: 'base_location', length: 50, nullable: true, comment: 'base地' })
  baseLocation: string;

  @Column({ name: 'department_id', type: 'bigint', comment: '部门ID' })
  @Index('idx_department')
  departmentId: number;

  @ManyToOne(() => Department, { nullable: false })
  @JoinColumn({ name: 'department_id' })
  department: Department;

  @Column({ length: 100, nullable: true, comment: '岗位' })
  position: string;

  @Column({ name: 'rank_level', length: 10, nullable: true, comment: '职级' })
  rankLevel: string;

  @Column({ name: 'manager_id', type: 'bigint', nullable: true, comment: '主管ID' })
  managerId: number;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'manager_id' })
  manager: User;

  @Column({ name: 'project_manager_id', type: 'bigint', nullable: true, comment: '项目经理ID' })
  projectManagerId: number;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'project_manager_id' })
  projectManager: User;

  @Column({ name: 'project_name', length: 200, nullable: true, comment: '所在项目' })
  projectName: string;

  @Column({ name: 'project_role', length: 50, nullable: true, comment: '项目角色' })
  projectRole: string;

  @Column({ name: 'ranking_list_id', type: 'bigint', nullable: true, comment: '所属榜单ID' })
  @Index('idx_ranking_list')
  rankingListId: number;

  @ManyToOne(() => RankingList, { nullable: true })
  @JoinColumn({ name: 'ranking_list_id' })
  rankingList: RankingList;

  @Column({ name: 'secondary_ranking_list_id', type: 'bigint', nullable: true, comment: '副榜ID' })
  @Index('idx_secondary_ranking_list')
  secondaryRankingListId: number;

  @ManyToOne(() => RankingList, { nullable: true })
  @JoinColumn({ name: 'secondary_ranking_list_id' })
  secondaryRankingList: RankingList;

  @Column({ name: 'total_points', type: 'decimal', precision: 10, scale: 1, default: 0, comment: '当前总积分' })
  totalPoints: number;

  @Column({ type: 'int', nullable: true, comment: '当前排名' })
  ranking: number | null;

  @Column({ type: 'json', nullable: true, comment: '历史荣誉记录' })
  honors: string[];

  @Column({ type: 'tinyint', default: 1, comment: '状态:1在职2冻结3离职4待岗5停薪留职' })
  @Index('idx_status')
  status: number;

  @Column({ name: 'is_ranking_disabled', type: 'tinyint', default: 0, comment: '是否禁用排名' })
  isRankingDisabled: number;

  @Column({ name: 'password_hash', length: 255, comment: '密码哈希', select: false })
  passwordHash: string;

  @Column({ length: 20, default: 'employee', comment: '角色' })
  role: string;

  @Column({ name: 'custom_fields', type: 'json', nullable: true, comment: '自定义字段数据' })
  customFields: Record<string, any>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
