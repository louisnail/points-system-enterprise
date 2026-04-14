import { DataSource } from 'typeorm';
import { AppDataSource } from '../data-source';
import { hashPassword } from '../../shared/utils/password.util';

async function runSeed() {
  const ds: DataSource = await AppDataSource.initialize();
  console.log('Database connected, running seeds...');

  // 1. Seed departments
  await ds.query(`
    INSERT IGNORE INTO department (id, name, parent_id, level, sort_order) VALUES
    (1, '集团', 0, 1, 0),
    (2, '数字金融事业部', 1, 2, 1),
    (3, '北区交付组-同彦', 2, 3, 1),
    (4, '北区交付组-同盾', 2, 3, 2),
    (5, '南区交付组', 2, 3, 3),
    (6, 'TY-数字金融事业部', 1, 2, 2),
    (7, '北区交付组', 6, 3, 1),
    (8, '南区交付组', 6, 3, 2),
    (9, '行政部', 1, 2, 3)
  `);
  console.log('Departments seeded');

  // 2. Seed ranking lists
  await ds.query(`
    INSERT IGNORE INTO ranking_list (id, name, description, top_n) VALUES
    (1, '交付实施', '交付实施人员榜单', 10),
    (2, '远程开发', '远程开发人员榜单', 10),
    (3, '质量保障', '质量保障人员榜单', 10),
    (4, '售后服务', '售后服务人员榜单', 10),
    (5, '专业服务', '专业服务人员榜单', 10),
    (6, '项目经理', '项目经理榜单', 10),
    (7, 'ITO(实施)', 'ITO实施人员榜单', 10),
    (8, 'ITO(项目经理)', 'ITO项目经理榜单', 10),
    (9, '交付主管', '交付主管榜单', 5)
  `);
  console.log('Ranking lists seeded');

  // 3. Seed admin user
  const passwordHash = await hashPassword('admin123');
  await ds.query(`
    INSERT IGNORE INTO user (employee_no, name, display_name, company_belong, department_id, status, password_hash, role, total_points)
    VALUES ('000001', '系统管理员', '系统管理员', 'TD', 1, 1, ?, 'super_admin', 0)
  `, [passwordHash]);
  console.log('Admin user seeded');

  // 4. Seed system configs
  await ds.query(`
    INSERT IGNORE INTO system_config (config_key, config_value, description) VALUES
    ('system.name', '积分管理系统-企业版', '系统名称'),
    ('system.logo', '/logo.svg', '系统Logo'),
    ('ranking.update_time', '02:00', '排名每日更新时间'),
    ('ranking.default_top_n', '10', '默认榜单排名人数'),
    ('point.decimal_places', '1', '积分小数位数'),
    ('point.initial_score', '0', '新员工初始积分'),
    ('process_point.auto_archive', 'true', '过程分是否自动存档')
  `);
  console.log('System configs seeded');

  // 5. Seed indicator categories
  await ds.query(`
    INSERT IGNORE INTO indicator_category (id, name, description, sort_order) VALUES
    (1, '项目损益经营', '项目损益相关指标', 1),
    (2, '任务令兑现情况', '任务令目标完成情况', 2),
    (3, '任务进度', '任务完成进度相关指标', 3),
    (4, '日常行为', '日常行为规范相关指标', 4)
  `);
  console.log('Indicator categories seeded');

  // 6. Seed indicators
  await ds.query(`
    INSERT IGNORE INTO indicator (id, category_id, name, direction, score_type, fixed_score, min_score, max_score, point_status, ranking_list_type) VALUES
    (1, 1, '正偏离(0,10%)', 1, 1, 10.0, NULL, NULL, 1, '项目经理积分'),
    (2, 1, '正偏离[10,20%)', 1, 1, 20.0, NULL, NULL, 1, '项目经理积分'),
    (3, 1, '正偏离[10,20%)排名得分', 1, 1, NULL, NULL, NULL, 1, '交付主管积分'),
    (4, 2, '任务令目标毛利率达成且未完全兑现', -1, 2, NULL, -10.0, -1.0, 2, '项目经理积分'),
    (5, 3, '延期完成', -1, 2, NULL, -10.0, -1.0, 1, '交付开发积分'),
    (6, 4, '工时填报异常', -1, 1, -2.0, NULL, NULL, 2, '通用积分'),
    (7, 4, '违反公司红线制度', -1, 1, NULL, NULL, NULL, 2, '通用积分')
  `);
  console.log('Indicators seeded');

  await ds.destroy();
  console.log('All seeds completed!');
}

runSeed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
