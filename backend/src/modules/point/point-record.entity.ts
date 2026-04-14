import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../user/user.entity';
import { Indicator } from '../indicator/indicator.entity';

@Entity('point_record')
export class PointRecord {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @Column({ name: 'user_id', type: 'bigint', comment: '被评价人ID' })
  @Index('idx_user_month', ['userId', 'belongMonth'])
  userId: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'indicator_id', type: 'bigint', comment: '指标ID' })
  @Index('idx_indicator')
  indicatorId: number;

  @ManyToOne(() => Indicator)
  @JoinColumn({ name: 'indicator_id' })
  indicator: Indicator;

  @Column({ type: 'decimal', precision: 10, scale: 1, comment: '确认分值' })
  score: number;

  @Column({ type: 'text', nullable: true, comment: '理由描述' })
  description: string;

  @Column({ type: 'json', nullable: true, comment: '附件列表' })
  attachments: string[];

  @Column({ name: 'record_type', type: 'tinyint', comment: '记录类型:1手动录入2批量导入3系统推送' })
  recordType: number;

  @Column({ name: 'point_status', type: 'tinyint', comment: '积分状态:1过程分2结果分' })
  @Index('idx_point_status')
  pointStatus: number;

  @Column({ name: 'belong_month', length: 7, comment: '归属月份:2026-03' })
  belongMonth: string;

  @Column({ name: 'registrant_id', type: 'bigint', comment: '登记人ID' })
  registrantId: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'registrant_id' })
  registrant: User;

  @Column({ name: 'registered_at', type: 'timestamp', comment: '登记时间' })
  registeredAt: Date;

  @Column({ name: 'audit_status', type: 'tinyint', default: 0, comment: '审核状态:0待审核1已通过2已驳回' })
  @Index('idx_audit_status')
  auditStatus: number;

  @Column({ name: 'audit_remark', type: 'text', nullable: true, comment: '审核备注' })
  auditRemark: string;

  @Column({ name: 'auditor_id', type: 'bigint', nullable: true, comment: '审核人ID' })
  auditorId: number;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'auditor_id' })
  auditor: User;

  @Column({ name: 'audited_at', type: 'timestamp', nullable: true, comment: '审核时间' })
  auditedAt: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
