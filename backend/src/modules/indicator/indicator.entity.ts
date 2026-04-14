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
import { IndicatorCategory } from './indicator-category.entity';
import { RankingList } from '../ranking-list/ranking-list.entity';

@Entity('indicator')
export class Indicator {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @Column({ name: 'category_id', type: 'bigint', comment: '分类ID' })
  @Index('idx_category')
  categoryId: number;

  @ManyToOne(() => IndicatorCategory)
  @JoinColumn({ name: 'category_id' })
  category: IndicatorCategory;

  @Column({ length: 200, comment: '评价维度' })
  name: string;

  @Column({ type: 'tinyint', comment: '方向:1加分-1扣分' })
  direction: number;

  @Column({ name: 'score_type', type: 'tinyint', comment: '分值类型:1固定2范围' })
  scoreType: number;

  @Column({ name: 'fixed_score', type: 'decimal', precision: 10, scale: 1, nullable: true, comment: '固定分值' })
  fixedScore: number;

  @Column({ name: 'min_score', type: 'decimal', precision: 10, scale: 1, nullable: true, comment: '最小分值' })
  minScore: number;

  @Column({ name: 'max_score', type: 'decimal', precision: 10, scale: 1, nullable: true, comment: '最大分值' })
  maxScore: number;

  @Column({ name: 'point_status', type: 'tinyint', comment: '积分状态:1过程分2结果分' })
  pointStatus: number;

  @Column({ name: 'ranking_list_type', length: 50, nullable: true, comment: '适用榜单类型' })
  rankingListType: string;

  @Column({ name: 'ranking_list_id', type: 'bigint', nullable: true, comment: '关联榜单ID(NULL表示通用)' })
  @Index('idx_ranking_list')
  rankingListId: number;

  @ManyToOne(() => RankingList)
  @JoinColumn({ name: 'ranking_list_id' })
  rankingList: RankingList;

  @Column({ name: 'is_active', type: 'tinyint', default: 1 })
  isActive: number;

  @Column({ name: 'custom_fields', type: 'json', nullable: true, comment: '自定义字段数据' })
  customFields: Record<string, any>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
