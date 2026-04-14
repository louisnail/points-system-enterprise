import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { User } from '../user/user.entity';
import { Indicator } from '../indicator/indicator.entity';

@Entity('process_point_history')
@Unique('uk_user_indicator_month', ['userId', 'indicatorId', 'belongMonth'])
export class ProcessPointHistory {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @Column({ name: 'user_id', type: 'bigint' })
  userId: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'indicator_id', type: 'bigint' })
  indicatorId: number;

  @ManyToOne(() => Indicator)
  @JoinColumn({ name: 'indicator_id' })
  indicator: Indicator;

  @Column({ type: 'decimal', precision: 10, scale: 1 })
  score: number;

  @Column({ name: 'belong_month', length: 7 })
  @Index('idx_month')
  belongMonth: string;

  @Column({ name: 'record_id', type: 'bigint', comment: '关联积分记录ID' })
  recordId: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
