import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddIndicatorRankingListId1710000000004 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Check if column already exists
    const table = await queryRunner.getTable('indicator');
    if (table && !table.findColumnByName('ranking_list_id')) {
      await queryRunner.query(
        `ALTER TABLE \`indicator\` ADD COLUMN \`ranking_list_id\` BIGINT NULL COMMENT '关联榜单ID(NULL表示通用)' AFTER \`ranking_list_type\``,
      );
      await queryRunner.query(
        `CREATE INDEX \`idx_ranking_list\` ON \`indicator\` (\`ranking_list_id\`)`,
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX \`idx_ranking_list\` ON \`indicator\``);
    await queryRunner.query(`ALTER TABLE \`indicator\` DROP COLUMN \`ranking_list_id\``);
  }
}
