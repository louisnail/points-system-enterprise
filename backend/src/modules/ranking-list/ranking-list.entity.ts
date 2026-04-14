import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('ranking_list')
export class RankingList {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @Column({ length: 100, comment: '榜单名称' })
  name: string;

  @Column({ type: 'text', nullable: true, comment: '榜单说明' })
  description: string;

  @Column({ name: 'top_n', type: 'int', default: 10, comment: '榜单取前几名' })
  topN: number;

  @Column({ name: 'is_active', type: 'tinyint', default: 1, comment: '是否启用' })
  isActive: number;

  @Column({ name: 'is_secondary', type: 'tinyint', default: 0, comment: '是否副榜:0主榜1副榜' })
  isSecondary: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
