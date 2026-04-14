import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSecondaryRankingFields1710000000008 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. ranking_list 表增加 is_secondary 字段
    await queryRunner.query(`
      ALTER TABLE ranking_list
      ADD COLUMN is_secondary TINYINT NOT NULL DEFAULT 0 COMMENT '是否副榜:0主榜1副榜'
      AFTER is_active
    `);

    // 2. user 表增加 secondary_ranking_list_id 字段
    await queryRunner.query(`
      ALTER TABLE user
      ADD COLUMN secondary_ranking_list_id BIGINT NULL COMMENT '副榜ID'
      AFTER ranking_list_id
    `);

    await queryRunner.query(`
      ALTER TABLE user
      ADD INDEX idx_secondary_ranking_list (secondary_ranking_list_id)
    `);

    await queryRunner.query(`
      ALTER TABLE user
      ADD CONSTRAINT fk_user_secondary_ranking_list
      FOREIGN KEY (secondary_ranking_list_id) REFERENCES ranking_list(id) ON DELETE SET NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE user DROP FOREIGN KEY fk_user_secondary_ranking_list`);
    await queryRunner.query(`ALTER TABLE user DROP INDEX idx_secondary_ranking_list`);
    await queryRunner.query(`ALTER TABLE user DROP COLUMN secondary_ranking_list_id`);
    await queryRunner.query(`ALTER TABLE ranking_list DROP COLUMN is_secondary`);
  }
}
