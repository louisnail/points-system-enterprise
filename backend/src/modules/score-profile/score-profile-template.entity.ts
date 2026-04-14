import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { ScoreProfileDimension } from './score-profile-dimension.entity';

@Entity('score_profile_template')
export class ScoreProfileTemplate {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @Column({ length: 100, comment: '模板名称' })
  name: string;

  @Column({ name: 'match_type', length: 20, comment: '匹配类型:default/ranking_list/position' })
  @Index('idx_match_active')
  matchType: string;

  @Column({ name: 'match_value', type: 'varchar', length: 100, nullable: true, comment: '匹配值(榜单ID或岗位名)' })
  matchValue: string | null;

  @Column({ type: 'int', default: 0, comment: '优先级(越大越优先)' })
  priority: number;

  @Column({ name: 'is_active', type: 'tinyint', default: 1, comment: '是否启用' })
  isActive: number;

  @Column({ type: 'text', nullable: true, comment: '说明' })
  description: string | null;

  @OneToMany(() => ScoreProfileDimension, (d) => d.template, { cascade: true, eager: true })
  dimensions: ScoreProfileDimension[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
