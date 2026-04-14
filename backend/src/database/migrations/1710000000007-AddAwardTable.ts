import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAwardTable1710000000007 implements MigrationInterface {
  name = 'AddAwardTable1710000000007';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`award\` (
        \`id\` bigint NOT NULL AUTO_INCREMENT,
        \`user_id\` bigint NOT NULL COMMENT '获奖员工',
        \`department_id\` bigint NULL COMMENT '冗余部门ID(创建时快照)',
        \`company_belong\` varchar(20) NULL COMMENT '冗余归属组织',
        \`ranking_list_id\` bigint NULL COMMENT '冗余榜单ID',
        \`honors\` text NULL COMMENT '积分荣誉',
        \`amount\` decimal(10,2) NOT NULL DEFAULT 0 COMMENT '奖金金额',
        \`reason\` text NULL COMMENT '评奖理由',
        \`selected_month\` varchar(7) NOT NULL COMMENT '入选月份YYYY-MM',
        \`status\` tinyint NOT NULL DEFAULT 0 COMMENT '0待发放1已发放',
        \`remark\` text NULL COMMENT '备注',
        \`created_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updated_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        PRIMARY KEY (\`id\`),
        KEY \`idx_selected_month\` (\`selected_month\`),
        KEY \`idx_status\` (\`status\`),
        KEY \`idx_user\` (\`user_id\`),
        CONSTRAINT \`fk_award_user\` FOREIGN KEY (\`user_id\`) REFERENCES \`user\` (\`id\`),
        CONSTRAINT \`fk_award_dept\` FOREIGN KEY (\`department_id\`) REFERENCES \`department\` (\`id\`) ON DELETE SET NULL,
        CONSTRAINT \`fk_award_ranking_list\` FOREIGN KEY (\`ranking_list_id\`) REFERENCES \`ranking_list\` (\`id\`) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='评奖记录表'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS `award`');
  }
}
