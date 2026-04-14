import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { ScoreProfileTemplate } from './score-profile-template.entity';

@Entity('score_profile_dimension')
export class ScoreProfileDimension {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @Column({ name: 'template_id', type: 'bigint', comment: '所属模板ID' })
  @Index('idx_template_sort')
  templateId: number;

  @ManyToOne(() => ScoreProfileTemplate, (t) => t.dimensions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'template_id' })
  template: ScoreProfileTemplate;

  @Column({ length: 100, comment: '维度名称' })
  name: string;

  @Column({ name: 'source_type', length: 20, comment: '数据来源:category/indicator/custom' })
  sourceType: string;

  @Column({ name: 'source_id', type: 'bigint', nullable: true, comment: '来源ID(分类ID或指标ID)' })
  sourceId: number | null;

  @Column({ name: 'sort_order', type: 'int', default: 0, comment: '排序' })
  sortOrder: number;

  @Column({ name: 'ref_type', length: 20, default: 'average', comment: '参考值类型:fixed/average/max' })
  refType: string;

  @Column({ name: 'ref_value', type: 'decimal', precision: 10, scale: 1, nullable: true, comment: '固定参考值' })
  refValue: number | null;

  @Column({ name: 'ref_scope', length: 20, default: 'all', comment: '参考值计算范围:all/ranking_list' })
  refScope: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
