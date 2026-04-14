import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCustomFields1710000000002 implements MigrationInterface {
  name = 'AddCustomFields1710000000002';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. 创建自定义字段定义表
    await queryRunner.query(`
      CREATE TABLE \`custom_field_definition\` (
        \`id\` bigint NOT NULL AUTO_INCREMENT,
        \`target_module\` varchar(30) NOT NULL COMMENT '目标模块: user | indicator',
        \`field_key\` varchar(50) NOT NULL COMMENT '字段标识(英文)',
        \`display_name\` varchar(100) NOT NULL COMMENT '字段显示名称',
        \`field_type\` varchar(20) NOT NULL COMMENT '字段类型: text | number | date | select',
        \`options\` json COMMENT '下拉选项(field_type=select时使用)',
        \`is_required\` tinyint NOT NULL DEFAULT 0 COMMENT '是否必填',
        \`is_visible\` tinyint NOT NULL DEFAULT 1 COMMENT '是否可见',
        \`sort_order\` int NOT NULL DEFAULT 0 COMMENT '排序序号',
        \`created_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updated_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        PRIMARY KEY (\`id\`),
        UNIQUE KEY \`idx_module_key\` (\`target_module\`, \`field_key\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='自定义字段定义表'
    `);

    // 2. 给 user 表添加 custom_fields JSON 列
    await queryRunner.query(`
      ALTER TABLE \`user\` ADD COLUMN \`custom_fields\` json NULL COMMENT '自定义字段数据'
    `);

    // 3. 给 indicator 表添加 custom_fields JSON 列
    await queryRunner.query(`
      ALTER TABLE \`indicator\` ADD COLUMN \`custom_fields\` json NULL COMMENT '自定义字段数据'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE `indicator` DROP COLUMN `custom_fields`');
    await queryRunner.query('ALTER TABLE `user` DROP COLUMN `custom_fields`');
    await queryRunner.query('DROP TABLE IF EXISTS `custom_field_definition`');
  }
}
