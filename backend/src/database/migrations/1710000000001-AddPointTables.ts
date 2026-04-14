import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPointTables1710000000001 implements MigrationInterface {
  name = 'AddPointTables1710000000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE \`point_record\` (
        \`id\` bigint NOT NULL AUTO_INCREMENT,
        \`user_id\` bigint NOT NULL COMMENT '被评价人ID',
        \`indicator_id\` bigint NOT NULL COMMENT '指标ID',
        \`score\` decimal(10,1) NOT NULL COMMENT '确认分值',
        \`description\` text COMMENT '理由描述',
        \`attachments\` json COMMENT '附件列表',
        \`record_type\` tinyint NOT NULL COMMENT '记录类型:1手动录入2批量导入3系统推送',
        \`point_status\` tinyint NOT NULL COMMENT '积分状态:1过程分2结果分',
        \`belong_month\` varchar(7) NOT NULL COMMENT '归属月份:2026-03',
        \`registrant_id\` bigint NOT NULL COMMENT '登记人ID',
        \`registered_at\` timestamp NOT NULL COMMENT '登记时间',
        \`audit_status\` tinyint NOT NULL DEFAULT 0 COMMENT '审核状态:0待审核1已通过2已驳回',
        \`audit_remark\` text COMMENT '审核备注',
        \`auditor_id\` bigint COMMENT '审核人ID',
        \`audited_at\` timestamp COMMENT '审核时间',
        \`created_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        PRIMARY KEY (\`id\`),
        KEY \`idx_user_month\` (\`user_id\`, \`belong_month\`),
        KEY \`idx_indicator\` (\`indicator_id\`),
        KEY \`idx_audit_status\` (\`audit_status\`),
        KEY \`idx_point_status\` (\`point_status\`),
        CONSTRAINT \`fk_point_user\` FOREIGN KEY (\`user_id\`) REFERENCES \`user\` (\`id\`),
        CONSTRAINT \`fk_point_indicator\` FOREIGN KEY (\`indicator_id\`) REFERENCES \`indicator\` (\`id\`),
        CONSTRAINT \`fk_point_registrant\` FOREIGN KEY (\`registrant_id\`) REFERENCES \`user\` (\`id\`),
        CONSTRAINT \`fk_point_auditor\` FOREIGN KEY (\`auditor_id\`) REFERENCES \`user\` (\`id\`) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='积分记录表'
    `);

    await queryRunner.query(`
      CREATE TABLE \`process_point_history\` (
        \`id\` bigint NOT NULL AUTO_INCREMENT,
        \`user_id\` bigint NOT NULL,
        \`indicator_id\` bigint NOT NULL,
        \`score\` decimal(10,1) NOT NULL,
        \`belong_month\` varchar(7) NOT NULL,
        \`record_id\` bigint NOT NULL COMMENT '关联积分记录ID',
        \`created_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        PRIMARY KEY (\`id\`),
        UNIQUE KEY \`uk_user_indicator_month\` (\`user_id\`, \`indicator_id\`, \`belong_month\`),
        KEY \`idx_month\` (\`belong_month\`),
        CONSTRAINT \`fk_pph_user\` FOREIGN KEY (\`user_id\`) REFERENCES \`user\` (\`id\`),
        CONSTRAINT \`fk_pph_indicator\` FOREIGN KEY (\`indicator_id\`) REFERENCES \`indicator\` (\`id\`),
        CONSTRAINT \`fk_pph_record\` FOREIGN KEY (\`record_id\`) REFERENCES \`point_record\` (\`id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='过程分历史存档表'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS `process_point_history`');
    await queryRunner.query('DROP TABLE IF EXISTS `point_record`');
  }
}
