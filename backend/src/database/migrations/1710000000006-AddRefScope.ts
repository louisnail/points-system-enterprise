import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddRefScope1710000000006 implements MigrationInterface {
  name = 'AddRefScope1710000000006';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE \`score_profile_dimension\`
        ADD COLUMN \`ref_scope\` varchar(20) NOT NULL DEFAULT 'all'
        COMMENT '参考值计算范围:all/ranking_list'
        AFTER \`ref_value\`
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE \`score_profile_dimension\` DROP COLUMN \`ref_scope\`
    `);
  }
}
