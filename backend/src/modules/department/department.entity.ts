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

@Entity('department')
export class Department {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @Column({ length: 100, comment: '部门名称' })
  name: string;

  @Column({ name: 'parent_id', type: 'bigint', default: 0, comment: '父部门ID,0为根' })
  @Index('idx_parent')
  parentId: number;

  @Column({ type: 'tinyint', nullable: true, default: null, comment: '层级(已废弃,保留兼容)' })
  level: number;

  @Column({ name: 'sort_order', type: 'int', default: 0, comment: '排序' })
  sortOrder: number;

  @Column({ name: 'manager_id', type: 'bigint', nullable: true, comment: '部门主管ID' })
  managerId: number;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'manager_id' })
  manager: User;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
