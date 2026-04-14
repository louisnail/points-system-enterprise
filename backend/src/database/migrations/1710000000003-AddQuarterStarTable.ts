import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddQuarterStarTable1710000000003 implements MigrationInterface {
  name = 'AddQuarterStarTable1710000000003';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`quarter_star\` (
        \`id\` bigint NOT NULL AUTO_INCREMENT,
        \`quarter\` varchar(7) NOT NULL COMMENT '季度:2026-Q1',
        \`user_id\` bigint NOT NULL,
        \`ranking_list_id\` bigint NOT NULL COMMENT '所属榜单',
        \`display_order\` int NOT NULL COMMENT '展示顺序',
        \`comment\` text COMMENT '点评',
        \`is_published\` tinyint NOT NULL DEFAULT 0 COMMENT '是否发布',
        \`published_at\` timestamp NULL COMMENT '发布时间',
        \`published_by\` bigint NULL COMMENT '发布人',
        \`created_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        PRIMARY KEY (\`id\`),
        UNIQUE KEY \`uk_quarter_user_list\` (\`quarter\`, \`user_id\`, \`ranking_list_id\`),
        KEY \`idx_quarter\` (\`quarter\`),
        CONSTRAINT \`fk_qs_user\` FOREIGN KEY (\`user_id\`) REFERENCES \`user\` (\`id\`),
        CONSTRAINT \`fk_qs_ranking_list\` FOREIGN KEY (\`ranking_list_id\`) REFERENCES \`ranking_list\` (\`id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='季度之星表'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS `quarter_star`');
  }
}
