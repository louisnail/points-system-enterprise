import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from '../user/user.entity';
import { Department } from '../department/department.entity';
import { RankingList } from '../ranking-list/ranking-list.entity';

@Entity('award')
export class Award {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @Column({ name: 'user_id', type: 'bigint' })
  @Index('idx_user')
  userId: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'department_id', type: 'bigint', nullable: true })
  departmentId: number;

  @ManyToOne(() => Department, { nullable: true })
  @JoinColumn({ name: 'department_id' })
  department: Department;

  @Column({ name: 'company_belong', length: 20, nullable: true, comment: '冗余归属组织' })
  companyBelong: string;

  @Column({ name: 'ranking_list_id', type: 'bigint', nullable: true })
  rankingListId: number;

  @ManyToOne(() => RankingList, { nullable: true })
  @JoinColumn({ name: 'ranking_list_id' })
  rankingList: RankingList;

  @Column({ type: 'text', nullable: true, comment: '积分荣誉' })
  honors: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0, comment: '奖金金额' })
  amount: number;

  @Column({ type: 'text', nullable: true, comment: '评奖理由' })
  reason: string;

  @Column({ name: 'selected_month', length: 7, comment: '入选月份YYYY-MM' })
  @Index('idx_selected_month')
  selectedMonth: string;

  @Column({ type: 'tinyint', default: 0, comment: '0待发放1已发放' })
  @Index('idx_status')
  status: number;

  @Column({ type: 'text', nullable: true, comment: '备注' })
  remark: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
