import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { User } from '../user/user.entity';
import { RankingList } from '../ranking-list/ranking-list.entity';

@Entity('quarter_star')
@Unique('uk_quarter_user_list', ['quarter', 'userId', 'rankingListId'])
export class QuarterStar {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @Column({ length: 7, comment: '季度:2026-Q1' })
  quarter: string;

  @Column({ name: 'user_id', type: 'bigint' })
  userId: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'ranking_list_id', type: 'bigint', comment: '所属榜单' })
  rankingListId: number;

  @ManyToOne(() => RankingList)
  @JoinColumn({ name: 'ranking_list_id' })
  rankingList: RankingList;

  @Column({ name: 'display_order', type: 'int', comment: '展示顺序' })
  displayOrder: number;

  @Column({ type: 'text', nullable: true, comment: '点评' })
  comment: string;

  @Column({ name: 'is_published', type: 'tinyint', default: 0, comment: '是否发布' })
  isPublished: number;

  @Column({ name: 'published_at', type: 'timestamp', nullable: true, comment: '发布时间' })
  publishedAt: Date;

  @Column({ name: 'published_by', type: 'bigint', nullable: true, comment: '发布人' })
  publishedBy: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
