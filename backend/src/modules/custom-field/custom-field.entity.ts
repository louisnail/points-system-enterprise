import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('custom_field_definition')
@Index('idx_module_key', ['targetModule', 'fieldKey'], { unique: true })
export class CustomFieldDefinition {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @Column({ name: 'target_module', length: 30, comment: '目标模块: user | indicator' })
  targetModule: string;

  @Column({ name: 'field_key', length: 50, comment: '字段标识(英文)' })
  fieldKey: string;

  @Column({ name: 'display_name', length: 100, comment: '字段显示名称' })
  displayName: string;

  @Column({ name: 'field_type', length: 20, comment: '字段类型: text | number | date | select' })
  fieldType: string;

  @Column({ type: 'json', nullable: true, comment: '下拉选项(field_type=select时使用)' })
  options: string[];

  @Column({ name: 'is_required', type: 'tinyint', default: 0, comment: '是否必填' })
  isRequired: number;

  @Column({ name: 'is_visible', type: 'tinyint', default: 1, comment: '是否可见' })
  isVisible: number;

  @Column({ name: 'sort_order', type: 'int', default: 0, comment: '排序序号' })
  sortOrder: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
