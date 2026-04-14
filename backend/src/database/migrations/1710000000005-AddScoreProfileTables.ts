import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddScoreProfileTables1710000000005 implements MigrationInterface {
  name = 'AddScoreProfileTables1710000000005';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. score_profile_template 积分画像模板表
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`score_profile_template\` (
        \`id\` bigint NOT NULL AUTO_INCREMENT,
        \`name\` varchar(100) NOT NULL COMMENT '模板名称',
        \`match_type\` varchar(20) NOT NULL COMMENT '匹配类型:default/ranking_list/position',
        \`match_value\` varchar(100) NULL COMMENT '匹配值(榜单ID或岗位名)',
        \`priority\` int NOT NULL DEFAULT 0 COMMENT '优先级(越大越优先)',
        \`is_active\` tinyint NOT NULL DEFAULT 1 COMMENT '是否启用',
        \`description\` text NULL COMMENT '说明',
        \`created_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updated_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        PRIMARY KEY (\`id\`),
        KEY \`idx_match_active\` (\`match_type\`, \`is_active\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='积分画像模板表'
    `);

    // 2. score_profile_dimension 模板维度表
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`score_profile_dimension\` (
        \`id\` bigint NOT NULL AUTO_INCREMENT,
        \`template_id\` bigint NOT NULL COMMENT '所属模板ID',
        \`name\` varchar(100) NOT NULL COMMENT '维度名称',
        \`source_type\` varchar(20) NOT NULL COMMENT '数据来源:category/indicator/custom',
        \`source_id\` bigint NULL COMMENT '来源ID(分类ID或指标ID)',
        \`sort_order\` int NOT NULL DEFAULT 0 COMMENT '排序',
        \`ref_type\` varchar(20) NOT NULL DEFAULT 'average' COMMENT '参考值类型:fixed/average/max',
        \`ref_value\` decimal(10,1) NULL COMMENT '固定参考值',
        \`created_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        PRIMARY KEY (\`id\`),
        KEY \`idx_template_sort\` (\`template_id\`, \`sort_order\`),
        CONSTRAINT \`fk_spd_template\` FOREIGN KEY (\`template_id\`) REFERENCES \`score_profile_template\` (\`id\`) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='积分画像维度表'
    `);

    // 3. 创建默认模板并自动填充活跃分类作为维度
    await queryRunner.query(`
      INSERT INTO \`score_profile_template\` (\`name\`, \`match_type\`, \`match_value\`, \`priority\`, \`is_active\`, \`description\`)
      VALUES ('默认画像模板', 'default', NULL, 0, 1, '系统默认模板，自动从管控项生成维度')
    `);

    // 获取默认模板ID
    const [{ id: templateId }] = await queryRunner.query(
      `SELECT id FROM \`score_profile_template\` WHERE \`match_type\` = 'default' ORDER BY id DESC LIMIT 1`,
    );

    // 获取所有活跃的管控项
    const categories = await queryRunner.query(
      `SELECT id, name, sort_order FROM \`indicator_category\` WHERE \`is_active\` = 1 ORDER BY \`sort_order\` ASC`,
    );

    // 插入维度
    for (const cat of categories) {
      await queryRunner.query(
        `INSERT INTO \`score_profile_dimension\` (\`template_id\`, \`name\`, \`source_type\`, \`source_id\`, \`sort_order\`, \`ref_type\`)
         VALUES (?, ?, 'category', ?, ?, 'average')`,
        [templateId, cat.name, cat.id, cat.sort_order],
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS `score_profile_dimension`');
    await queryRunner.query('DROP TABLE IF EXISTS `score_profile_template`');
  }
}
