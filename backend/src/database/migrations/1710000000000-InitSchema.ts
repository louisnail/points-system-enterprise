import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitSchema1710000000000 implements MigrationInterface {
  name = 'InitSchema1710000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE \`department\` (
        \`id\` bigint NOT NULL AUTO_INCREMENT,
        \`name\` varchar(100) NOT NULL COMMENT '部门名称',
        \`parent_id\` bigint NOT NULL DEFAULT 0 COMMENT '父部门ID,0为根',
        \`level\` tinyint NOT NULL COMMENT '层级:1集团2事业部3交付组',
        \`sort_order\` int NOT NULL DEFAULT 0 COMMENT '排序',
        \`created_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        PRIMARY KEY (\`id\`),
        KEY \`idx_parent\` (\`parent_id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='部门表'
    `);

    await queryRunner.query(`
      CREATE TABLE \`ranking_list\` (
        \`id\` bigint NOT NULL AUTO_INCREMENT,
        \`name\` varchar(100) NOT NULL COMMENT '榜单名称',
        \`description\` text COMMENT '榜单说明',
        \`top_n\` int NOT NULL DEFAULT 10 COMMENT '榜单取前几名',
        \`is_active\` tinyint NOT NULL DEFAULT 1 COMMENT '是否启用',
        \`created_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updated_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        PRIMARY KEY (\`id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='榜单配置表'
    `);

    await queryRunner.query(`
      CREATE TABLE \`user\` (
        \`id\` bigint NOT NULL AUTO_INCREMENT,
        \`employee_no\` varchar(20) NOT NULL COMMENT '工号',
        \`name\` varchar(50) NOT NULL COMMENT '姓名',
        \`display_name\` varchar(100) NOT NULL COMMENT '显示名称',
        \`gender\` tinyint COMMENT '性别:1男2女',
        \`hire_date\` date COMMENT '入职日期',
        \`email\` varchar(100) COMMENT '公司邮箱',
        \`education\` varchar(20) COMMENT '最高学历',
        \`company_belong\` varchar(20) NOT NULL COMMENT '归属组织',
        \`base_location\` varchar(50) COMMENT 'base地',
        \`department_id\` bigint NOT NULL COMMENT '部门ID',
        \`position\` varchar(100) COMMENT '岗位',
        \`rank_level\` varchar(10) COMMENT '职级',
        \`manager_id\` bigint COMMENT '主管ID',
        \`project_manager_id\` bigint COMMENT '项目经理ID',
        \`project_name\` varchar(200) COMMENT '所在项目',
        \`project_role\` varchar(50) COMMENT '项目角色',
        \`ranking_list_id\` bigint COMMENT '所属榜单ID',
        \`total_points\` decimal(10,1) NOT NULL DEFAULT 0 COMMENT '当前总积分',
        \`ranking\` int COMMENT '当前排名',
        \`honors\` json COMMENT '历史荣誉记录',
        \`status\` tinyint NOT NULL DEFAULT 1 COMMENT '状态:1在职2冻结3离职4待岗5停薪留职',
        \`is_ranking_disabled\` tinyint NOT NULL DEFAULT 0 COMMENT '是否禁用排名',
        \`password_hash\` varchar(255) NOT NULL COMMENT '密码哈希',
        \`role\` varchar(20) NOT NULL DEFAULT 'employee' COMMENT '角色',
        \`created_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updated_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        PRIMARY KEY (\`id\`),
        UNIQUE KEY \`uk_employee_no\` (\`employee_no\`),
        KEY \`idx_department\` (\`department_id\`),
        KEY \`idx_status\` (\`status\`),
        KEY \`idx_ranking_list\` (\`ranking_list_id\`),
        CONSTRAINT \`fk_user_department\` FOREIGN KEY (\`department_id\`) REFERENCES \`department\` (\`id\`),
        CONSTRAINT \`fk_user_ranking_list\` FOREIGN KEY (\`ranking_list_id\`) REFERENCES \`ranking_list\` (\`id\`),
        CONSTRAINT \`fk_user_manager\` FOREIGN KEY (\`manager_id\`) REFERENCES \`user\` (\`id\`) ON DELETE SET NULL,
        CONSTRAINT \`fk_user_pm\` FOREIGN KEY (\`project_manager_id\`) REFERENCES \`user\` (\`id\`) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='员工表'
    `);

    await queryRunner.query(`
      CREATE TABLE \`indicator_category\` (
        \`id\` bigint NOT NULL AUTO_INCREMENT,
        \`name\` varchar(100) NOT NULL COMMENT '管控项名称',
        \`description\` text COMMENT '说明',
        \`sort_order\` int NOT NULL DEFAULT 0,
        \`is_active\` tinyint NOT NULL DEFAULT 1,
        \`created_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        PRIMARY KEY (\`id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='指标分类表'
    `);

    await queryRunner.query(`
      CREATE TABLE \`indicator\` (
        \`id\` bigint NOT NULL AUTO_INCREMENT,
        \`category_id\` bigint NOT NULL COMMENT '分类ID',
        \`name\` varchar(200) NOT NULL COMMENT '评价维度',
        \`direction\` tinyint NOT NULL COMMENT '方向:1加分-1扣分',
        \`score_type\` tinyint NOT NULL COMMENT '分值类型:1固定2范围',
        \`fixed_score\` decimal(10,1) COMMENT '固定分值',
        \`min_score\` decimal(10,1) COMMENT '最小分值',
        \`max_score\` decimal(10,1) COMMENT '最大分值',
        \`point_status\` tinyint NOT NULL COMMENT '积分状态:1过程分2结果分',
        \`ranking_list_type\` varchar(50) COMMENT '适用榜单类型',
        \`is_active\` tinyint NOT NULL DEFAULT 1,
        \`created_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updated_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        PRIMARY KEY (\`id\`),
        KEY \`idx_category\` (\`category_id\`),
        CONSTRAINT \`fk_indicator_category\` FOREIGN KEY (\`category_id\`) REFERENCES \`indicator_category\` (\`id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='指标表'
    `);

    await queryRunner.query(`
      CREATE TABLE \`system_config\` (
        \`id\` bigint NOT NULL AUTO_INCREMENT,
        \`config_key\` varchar(100) NOT NULL,
        \`config_value\` text,
        \`description\` varchar(500),
        PRIMARY KEY (\`id\`),
        UNIQUE KEY \`uk_key\` (\`config_key\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='系统配置表'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS `indicator`');
    await queryRunner.query('DROP TABLE IF EXISTS `indicator_category`');
    await queryRunner.query('DROP TABLE IF EXISTS `user`');
    await queryRunner.query('DROP TABLE IF EXISTS `ranking_list`');
    await queryRunner.query('DROP TABLE IF EXISTS `department`');
    await queryRunner.query('DROP TABLE IF EXISTS `system_config`');
  }
}
