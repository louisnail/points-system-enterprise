/**
 * 驾驶舱 mock 数据
 * 对应技术方案 4.4.17 — 8 KPI + 6 图表 + 3 洞察 + 4 Tabs
 */

// ===== KPI 概览卡片（8 张） =====
export interface KpiItem {
  key: string;
  label: string;
  value: number | string;
  suffix?: string;
  sub: string;          // 副指标描述
  change: number;       // 较上期变化百分比
  color: string;        // 主题色
  bg: string;           // 背景渐变起始色
}

export const kpiData: KpiItem[] = [
  { key: 'totalPoints',   label: '全公司积分总量', value: 12850,   sub: '较上月 ↑12.5%',     change: 12.5,  color: '#1890ff', bg: '#e6f7ff' },
  { key: 'totalPositive', label: '总加分',         value: 15620,   sub: '较上月 ↑8.3%',      change: 8.3,   color: '#52c41a', bg: '#f6ffed' },
  { key: 'totalNegative', label: '总扣分',         value: -2770,   sub: '较上月 ↑3.1%',      change: 3.1,   color: '#ff4d4f', bg: '#fff2f0' },
  { key: 'avgPoints',     label: '人均积分',       value: 48.3,    sub: '较上月 ↑5.7%',      change: 5.7,   color: '#722ed1', bg: '#f9f0ff' },
  { key: 'participants',  label: '参与排名人数',   value: 266,     sub: '占在职总人数 93%',   change: 2.1,   color: '#13c2c2', bg: '#e6fffb' },
  { key: 'entryCount',    label: '本期录入条数',   value: 1843,    sub: '较上月 ↑15.2%',     change: 15.2,  color: '#faad14', bg: '#fffbe6' },
  { key: 'pendingAudit',  label: '待审核条数',     value: 37,      sub: '超3天未审: 8条',     change: -12.5, color: '#fa8c16', bg: '#fff7e6' },
  { key: 'activeRanking', label: '活跃榜单数',     value: 6,       sub: '榜单总数: 8',        change: 0,     color: '#2f54eb', bg: '#f0f5ff' },
];

// ===== 图表 1：积分趋势（折线图） =====
export interface TrendItem {
  period: string;
  totalNet: number;
  totalPositive: number;
  totalNegative: number;
  avgPoints: number;
}

export const trendData: TrendItem[] = [
  { period: '2025-10', totalNet: 1850,  totalPositive: 2400, totalNegative: -550,  avgPoints: 38.2 },
  { period: '2025-11', totalNet: 2100,  totalPositive: 2750, totalNegative: -650,  avgPoints: 41.5 },
  { period: '2025-12', totalNet: 1920,  totalPositive: 2580, totalNegative: -660,  avgPoints: 39.8 },
  { period: '2026-01', totalNet: 2350,  totalPositive: 3000, totalNegative: -650,  avgPoints: 44.1 },
  { period: '2026-02', totalNet: 2560,  totalPositive: 3200, totalNegative: -640,  avgPoints: 46.2 },
  { period: '2026-03', totalNet: 2850,  totalPositive: 3620, totalNegative: -770,  avgPoints: 48.3 },
];

// ===== 图表 2：各部门积分对比（分组柱状图） =====
export interface DeptCompareItem {
  department: string;
  netScore: number;
  avgScore: number;
  totalPositive: number;
  totalNegative: number;
}

export const deptCompareData: DeptCompareItem[] = [
  { department: '技术研发部', netScore: 4200, avgScore: 58.3, totalPositive: 4900, totalNegative: -700 },
  { department: '交付管理部', netScore: 3500, avgScore: 53.8, totalPositive: 4100, totalNegative: -600 },
  { department: '产品设计部', netScore: 2800, avgScore: 46.7, totalPositive: 3300, totalNegative: -500 },
  { department: '市场运营部', netScore: 2100, avgScore: 42.0, totalPositive: 2600, totalNegative: -500 },
  { department: '质量保障部', netScore: 1600, avgScore: 40.0, totalPositive: 1950, totalNegative: -350 },
  { department: '人力资源部', netScore: 1050, avgScore: 35.0, totalPositive: 1200, totalNegative: -150 },
];

// ===== 图表 3：加分/扣分占比（双环形图） =====
export interface ScoreDistribution {
  type: 'positive' | 'negative';
  label: string;
  value: number;
}

export const scoreDistributionData: ScoreDistribution[] = [
  { type: 'positive', label: '加分合计', value: 15620 },
  { type: 'negative', label: '扣分合计', value: 2770 },
];

export interface CategoryBreakdown {
  parentType: 'positive' | 'negative';
  label: string;
  value: number;
}

export const categoryBreakdownData: CategoryBreakdown[] = [
  { parentType: 'positive', label: '项目交付',   value: 4800 },
  { parentType: 'positive', label: '技术创新',   value: 3200 },
  { parentType: 'positive', label: '团队协作',   value: 2800 },
  { parentType: 'positive', label: '客户满意',   value: 2600 },
  { parentType: 'positive', label: '学习成长',   value: 2220 },
  { parentType: 'negative', label: '迟到早退',   value: 980 },
  { parentType: 'negative', label: '工作失误',   value: 750 },
  { parentType: 'negative', label: '违规操作',   value: 540 },
  { parentType: 'negative', label: '其他扣分',   value: 500 },
];

// ===== 图表 4：管控项总分排行（水平条形图） =====
export interface CategoryRankItem {
  name: string;
  positive: number;
  negative: number;
  net: number;
  count: number;
}

export const categoryRankingData: CategoryRankItem[] = [
  { name: '完成项目交付',     positive: 3600, negative: -200, net: 3400, count: 245 },
  { name: '获得客户表扬',     positive: 2800, negative: 0,    net: 2800, count: 180 },
  { name: '技术分享/培训',   positive: 2200, negative: 0,    net: 2200, count: 156 },
  { name: '提出创新方案',     positive: 1900, negative: 0,    net: 1900, count: 98 },
  { name: '主动帮助同事',     positive: 1500, negative: 0,    net: 1500, count: 210 },
  { name: '迟到早退',         positive: 0,    negative: -980, net: -980, count: 145 },
  { name: '工作失误造成损失', positive: 0,    negative: -750, net: -750, count: 42 },
  { name: '违反安全规范',     positive: 0,    negative: -540, net: -540, count: 28 },
];

// ===== 图表 5：评价维度总分排行（水平条形图） =====
export interface DimensionRankItem {
  name: string;
  positive: number;
  negative: number;
  net: number;
}

export const dimensionRankingData: DimensionRankItem[] = [
  { name: '项目交付质量', positive: 4800, negative: -200, net: 4600 },
  { name: '技术创新能力', positive: 3200, negative: -100, net: 3100 },
  { name: '团队协作精神', positive: 2800, negative: -150, net: 2650 },
  { name: '客户服务满意', positive: 2600, negative: -80,  net: 2520 },
  { name: '学习成长表现', positive: 2220, negative: -60,  net: 2160 },
  { name: '工作纪律',     positive: 500,  negative: -980, net: -480 },
  { name: '安全合规',     positive: 300,  negative: -540, net: -240 },
  { name: '资源节约',     positive: 200,  negative: -150, net: 50 },
];

// ===== 图表 6：归属组织积分对比（雷达图） =====
export interface OrgCompareItem {
  org: string;
  netScore: number;
  avgScore: number;
  positiveRate: number;
  negativeRate: number;
  headcount: number;
}

export const orgCompareData: OrgCompareItem[] = [
  { org: 'TD', netScore: 6200, avgScore: 51.7, positiveRate: 86, negativeRate: 14, headcount: 120 },
  { org: 'XD', netScore: 3100, avgScore: 47.7, positiveRate: 83, negativeRate: 17, headcount: 65 },
  { org: 'TY', netScore: 2400, avgScore: 44.4, positiveRate: 80, negativeRate: 20, headcount: 54 },
  { org: 'WB', netScore: 1150, avgScore: 38.3, positiveRate: 78, negativeRate: 22, headcount: 30 },
];

// ===== 洞察卡片 A：团队健康度 =====
export interface TeamHealthData {
  overallScore: number;
  dimensions: { label: string; score: number }[];
  topPositive: string[];
  topNegative: string[];
}

export const teamHealthData: TeamHealthData = {
  overallScore: 76,
  dimensions: [
    { label: '平均分水平',   score: 82 },
    { label: '加分活跃度',   score: 78 },
    { label: '扣分控制度',   score: 85 },
    { label: '参与覆盖率',   score: 68 },
    { label: '趋势稳定性',   score: 72 },
  ],
  topPositive: ['项目交付质量', '技术创新能力', '团队协作精神'],
  topNegative: ['工作纪律', '安全合规', '资源节约'],
};

// ===== 洞察卡片 B：异常数据提醒 =====
export interface AnomalyItem {
  id: number;
  level: 'red' | 'orange' | 'yellow';
  type: string;
  target: string;
  summary: string;
}

export const anomalyData: AnomalyItem[] = [
  { id: 1, level: 'red',    type: '单人扣分超阈值', target: '赵明（技术研发部）', summary: '本月累计扣分 35 分，超过阈值 30 分' },
  { id: 2, level: 'orange', type: '积分变化异常',   target: '杨丽（市场运营部）', summary: '本月积分较上月变化 -62%' },
  { id: 3, level: 'orange', type: '部门偏离均值',   target: '人力资源部',         summary: '部门平均分 35.0，偏离全公司均值 2.3 个标准差' },
  { id: 4, level: 'yellow', type: '指标长期未使用', target: '「导师带教」指标',   summary: '已超过 3 个月无录入记录' },
  { id: 5, level: 'yellow', type: '审核超时',       target: '8 条待审核记录',     summary: '超过 3 天未处理' },
];

// ===== 洞察卡片 C：末位预警 =====
export interface BottomWarningItem {
  name: string;
  department: string;
  currentPoints: number;
  rank: number;
  consecutiveMonths: number;
  riskLevel: 'attention' | 'warning' | 'danger';
}

export const bottomWarningData: BottomWarningItem[] = [
  { name: '孙博',   department: '技术研发部', currentPoints: 12, rank: 266, consecutiveMonths: 3, riskLevel: 'danger' },
  { name: '杨丽',   department: '市场运营部', currentPoints: 15, rank: 264, consecutiveMonths: 2, riskLevel: 'warning' },
  { name: '周莉',   department: '产品设计部', currentPoints: 18, rank: 261, consecutiveMonths: 2, riskLevel: 'warning' },
  { name: '黄磊',   department: '交付管理部', currentPoints: 20, rank: 258, consecutiveMonths: 1, riskLevel: 'attention' },
  { name: '马超',   department: '市场运营部', currentPoints: 22, rank: 255, consecutiveMonths: 1, riskLevel: 'attention' },
];

// ===== Tab1：排名 Top10（白榜） =====
export interface TopRankItem {
  rank: number;
  name: string;
  department: string;
  org: string;
  totalScore: number;
  positiveSum: number;
  negativeSum: number;
  change: number; // 较上期变化
}

export const topRankData: TopRankItem[] = [
  { rank: 1,  name: '王磊', department: '技术研发部', org: 'TD', totalScore: 96, positiveSum: 102, negativeSum: -6,  change: 2 },
  { rank: 2,  name: '冯军', department: '交付管理部', org: 'TD', totalScore: 89, positiveSum: 95,  negativeSum: -6,  change: 0 },
  { rank: 3,  name: '何雪', department: '产品设计部', org: 'TY', totalScore: 85, positiveSum: 88,  negativeSum: -3,  change: 1 },
  { rank: 4,  name: '韩飞', department: '技术研发部', org: 'TD', totalScore: 82, positiveSum: 86,  negativeSum: -4,  change: -1 },
  { rank: 5,  name: '林峰', department: '市场运营部', org: 'XD', totalScore: 78, positiveSum: 82,  negativeSum: -4,  change: 3 },
  { rank: 6,  name: '郑凯', department: '交付管理部', org: 'TD', totalScore: 75, positiveSum: 80,  negativeSum: -5,  change: 0 },
  { rank: 7,  name: '唐馨', department: '交付管理部', org: 'TY', totalScore: 72, positiveSum: 76,  negativeSum: -4,  change: 2 },
  { rank: 8,  name: '罗宇', department: '技术研发部', org: 'XD', totalScore: 70, positiveSum: 74,  negativeSum: -4,  change: -2 },
  { rank: 9,  name: '李婷', department: '产品设计部', org: 'WB', totalScore: 68, positiveSum: 72,  negativeSum: -4,  change: 1 },
  { rank: 10, name: '徐燕', department: '市场运营部', org: 'XD', totalScore: 65, positiveSum: 70,  negativeSum: -5,  change: 0 },
];

// ===== Tab2：黑榜 Top10 =====
export interface BottomRankItem {
  rank: number;
  name: string;
  department: string;
  org: string;
  totalScore: number;
  mainDeductDimension: string;
  change: number;
}

export const bottomRankData: BottomRankItem[] = [
  { rank: 1,  name: '孙博', department: '技术研发部', org: 'TD', totalScore: 12, mainDeductDimension: '工作纪律',   change: -3 },
  { rank: 2,  name: '杨丽', department: '市场运营部', org: 'XD', totalScore: 15, mainDeductDimension: '安全合规',   change: -5 },
  { rank: 3,  name: '周莉', department: '产品设计部', org: 'TY', totalScore: 18, mainDeductDimension: '工作纪律',   change: 0 },
  { rank: 4,  name: '黄磊', department: '交付管理部', org: 'TD', totalScore: 20, mainDeductDimension: '工作失误',   change: -2 },
  { rank: 5,  name: '马超', department: '市场运营部', org: 'WB', totalScore: 22, mainDeductDimension: '迟到早退',   change: 1 },
  { rank: 6,  name: '张伟', department: '产品设计部', org: 'TD', totalScore: 25, mainDeductDimension: '工作纪律',   change: 0 },
  { rank: 7,  name: '吴敏', department: '交付管理部', org: 'TY', totalScore: 28, mainDeductDimension: '安全合规',   change: -1 },
  { rank: 8,  name: '陈曦', department: '产品设计部', org: 'XD', totalScore: 30, mainDeductDimension: '工作失误',   change: 2 },
  { rank: 9,  name: '刘洋', department: '技术研发部', org: 'TD', totalScore: 32, mainDeductDimension: '资源节约',   change: 0 },
  { rank: 10, name: '赵明', department: '技术研发部', org: 'WB', totalScore: 35, mainDeductDimension: '工作纪律',   change: -4 },
];

// ===== Tab3：部门积分概览 =====
export interface DeptOverviewItem {
  department: string;
  headcount: number;
  netScore: number;
  avgScore: number;
  totalPositive: number;
  totalNegative: number;
  maxScore: number;
  minScore: number;
}

export const deptOverviewData: DeptOverviewItem[] = [
  { department: '技术研发部', headcount: 72, netScore: 4200, avgScore: 58.3, totalPositive: 4900, totalNegative: -700, maxScore: 96, minScore: 12 },
  { department: '交付管理部', headcount: 65, netScore: 3500, avgScore: 53.8, totalPositive: 4100, totalNegative: -600, maxScore: 89, minScore: 20 },
  { department: '产品设计部', headcount: 60, netScore: 2800, avgScore: 46.7, totalPositive: 3300, totalNegative: -500, maxScore: 85, minScore: 18 },
  { department: '市场运营部', headcount: 50, netScore: 2100, avgScore: 42.0, totalPositive: 2600, totalNegative: -500, maxScore: 78, minScore: 15 },
  { department: '质量保障部', headcount: 40, netScore: 1600, avgScore: 40.0, totalPositive: 1950, totalNegative: -350, maxScore: 68, minScore: 22 },
  { department: '人力资源部', headcount: 30, netScore: 1050, avgScore: 35.0, totalPositive: 1200, totalNegative: -150, maxScore: 62, minScore: 25 },
];

// ===== Tab4：管控项明细 =====
export interface CategoryDetailItem {
  categoryName: string;
  dimensionCount: number;
  totalEntries: number;
  totalPositive: number;
  totalNegative: number;
  netScore: number;
}

export const categoryDetailData: CategoryDetailItem[] = [
  { categoryName: '项目管理',   dimensionCount: 8,  totalEntries: 425, totalPositive: 4800,  totalNegative: -200, netScore: 4600 },
  { categoryName: '技术能力',   dimensionCount: 6,  totalEntries: 254, totalPositive: 3200,  totalNegative: -100, netScore: 3100 },
  { categoryName: '团队建设',   dimensionCount: 5,  totalEntries: 366, totalPositive: 2800,  totalNegative: -150, netScore: 2650 },
  { categoryName: '客户服务',   dimensionCount: 4,  totalEntries: 198, totalPositive: 2600,  totalNegative: -80,  netScore: 2520 },
  { categoryName: '个人成长',   dimensionCount: 5,  totalEntries: 178, totalPositive: 2220,  totalNegative: -60,  netScore: 2160 },
  { categoryName: '行为规范',   dimensionCount: 4,  totalEntries: 215, totalPositive: 500,   totalNegative: -980, netScore: -480 },
  { categoryName: '安全管理',   dimensionCount: 3,  totalEntries: 68,  totalPositive: 300,   totalNegative: -540, netScore: -240 },
  { categoryName: '资源管理',   dimensionCount: 2,  totalEntries: 42,  totalPositive: 200,   totalNegative: -150, netScore: 50 },
];

// ===== 部门列表（筛选用） =====
export const departmentOptions = [
  { label: '全部部门', value: '' },
  { label: '技术研发部', value: '技术研发部' },
  { label: '交付管理部', value: '交付管理部' },
  { label: '产品设计部', value: '产品设计部' },
  { label: '市场运营部', value: '市场运营部' },
  { label: '质量保障部', value: '质量保障部' },
  { label: '人力资源部', value: '人力资源部' },
];

// ===== 归属组织选项 =====
export const orgOptions = [
  { label: '全部', value: '' },
  { label: 'TD（同盾）', value: 'TD' },
  { label: 'XD（小盾）', value: 'XD' },
  { label: 'TY（同彦）', value: 'TY' },
  { label: 'WB', value: 'WB' },
];
