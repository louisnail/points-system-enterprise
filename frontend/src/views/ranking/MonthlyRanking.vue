<template>
  <div class="page-container">
    <div class="page-header">
      <h2>积分与排名</h2>
      <div style="display: flex; gap: 12px; align-items: center">
        <a-date-picker v-model:value="selectedYear" picker="year" placeholder="年份" style="width: 100px"
          value-format="YYYY" @change="loadData" />
        <a-input-search v-model:value="keyword" placeholder="搜索姓名/工号" style="width: 180px" allow-clear
          @search="loadData" />
        <a-select v-model:value="selectedListId" placeholder="全部榜单" allow-clear style="width: 180px"
          @change="loadData">
          <a-select-option v-for="rl in rankingLists" :key="rl.id" :value="rl.id">{{ rl.name }}{{ rl.isSecondary ? '（副榜）' : '' }}</a-select-option>
        </a-select>
        <a-tree-select v-model:value="selectedDeptId" :tree-data="deptTree"
          :field-names="{ label: 'name', value: 'id', children: 'children' }"
          placeholder="全部部门" allow-clear tree-default-expand-all style="width: 180px"
          @change="loadData" />
        <a-select v-model:value="selectedCompany" placeholder="全部归属" allow-clear style="width: 120px">
          <a-select-option v-for="c in companyOptions" :key="c" :value="c">{{ c }}</a-select-option>
        </a-select>
        <a-button :loading="exporting" @click="handleExport"><DownloadOutlined /> 导出</a-button>
        <a-button @click="fieldDrawerVisible = true"><SettingOutlined /> 字段管理</a-button>
      </div>
    </div>

    <!-- 统计卡片 -->
    <div style="display: flex; gap: 16px; margin-bottom: 16px">
      <div class="stat-card-gradient" style="background: linear-gradient(135deg, #667eea, #764ba2)">
        <div class="stat-label-g">参与人数</div>
        <div class="stat-value-g">{{ dataList.length }}</div>
      </div>
      <div class="stat-card-gradient" style="background: linear-gradient(135deg, #f093fb, #f5576c)">
        <div class="stat-label-g">年度最高分</div>
        <div class="stat-value-g">{{ yearMaxScore }}</div>
      </div>
      <div class="stat-card-gradient" style="background: linear-gradient(135deg, #4facfe, #00f2fe)">
        <div class="stat-label-g">年度平均分</div>
        <div class="stat-value-g">{{ yearAvgScore }}</div>
      </div>
      <div class="stat-card-gradient" style="background: linear-gradient(135deg, #43e97b, #38f9d7)">
        <div class="stat-label-g">榜单数</div>
        <div class="stat-value-g">{{ rankingLists.length }}</div>
      </div>
    </div>

    <div class="card-box">
      <a-table :columns="tableColumns" :data-source="dataList" :loading="loading" row-key="userId" size="small"
        :scroll="{ x: scrollX, y: 520 }" :pagination="{ pageSize: 50, showTotal: (t: number) => `共 ${t} 人` }">
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'name'">
            <a @click="openDrawer(record.userId)">{{ record.name }}</a>
          </template>
          <template v-if="column.key === 'currentPoints'">
            <span style="font-weight: 700; color: #1890ff">{{ record.currentPoints }}</span>
          </template>
          <!-- 月度/季度积分 -->
          <template v-if="column.dataIndex && isScoreCol(column.key)">
            <span :style="{ fontWeight: 600 }">{{ getCellValue(record, column.key) }}</span>
          </template>
          <!-- 积分环比 -->
          <template v-if="column.dataIndex && isScoreMoMCol(column.key)">
            <span :style="{ color: getMoMColor(getCellValue(record, column.key)), fontSize: '12px' }">
              {{ formatScoreMoM(getCellValue(record, column.key)) }}
            </span>
          </template>
          <!-- 排名 -->
          <template v-if="column.dataIndex && isRankingCol(column.key)">
            <span>{{ getCellValue(record, column.key) || '-' }}</span>
          </template>
          <!-- 排名环比 -->
          <template v-if="column.dataIndex && isRankingMoMCol(column.key)">
            <span :style="{ color: getRankMoMColor(getCellValue(record, column.key)), fontSize: '12px' }">
              {{ formatRankingMoM(getCellValue(record, column.key)) }}
            </span>
          </template>
          <!-- 积分荣誉 -->
          <template v-if="column.key === 'honors'">
            <div style="max-width: 260px">
              <a-tag v-for="(h, hi) in (record.honors || []).slice(0, 3)" :key="hi" color="gold" style="margin: 2px">{{ h }}</a-tag>
              <a-tooltip v-if="record.honors?.length > 3" :title="record.honors.join('、')">
                <a-tag color="gold" style="margin: 2px">+{{ record.honors.length - 3 }}</a-tag>
              </a-tooltip>
            </div>
          </template>
        </template>
      </a-table>
    </div>

    <!-- 字段管理抽屉 -->
    <a-drawer v-model:open="fieldDrawerVisible" title="字段管理" :width="400" placement="right">
      <div style="margin-bottom: 12px; color: #8c8c8c; font-size: 13px">按组开关控制月度/季度列显隐</div>

      <h4 style="margin-bottom: 8px">基础字段</h4>
      <div class="field-group">
        <div v-for="f in baseFieldConfigs" :key="f.key" class="field-item">
          <span>{{ f.title }}</span>
          <a-switch :checked="f.visible" size="small" :disabled="f.key === 'name'" @change="(v: any) => { f.visible = !!v; }" />
        </div>
      </div>

      <h4 style="margin: 16px 0 8px">月度</h4>
      <div class="field-group">
        <div v-for="mi in 12" :key="'m' + mi" class="field-item">
          <span>{{ mi }}月</span>
          <a-switch :checked="monthVisible[mi - 1]" size="small" @change="(v: any) => { monthVisible[mi - 1] = !!v; }" />
        </div>
      </div>

      <h4 style="margin: 16px 0 8px">季度</h4>
      <div class="field-group">
        <div v-for="q in ['Q1','Q2','Q3','Q4']" :key="q" class="field-item">
          <span>{{ q }}</span>
          <a-switch :checked="quarterVisible[q]" size="small" @change="(v: any) => { quarterVisible[q] = !!v; }" />
        </div>
      </div>

      <h4 style="margin: 16px 0 8px">其他</h4>
      <div class="field-group">
        <div class="field-item">
          <span>积分荣誉</span>
          <a-switch v-model:checked="honorsVisible" size="small" />
        </div>
      </div>

      <template #footer>
        <a-button type="primary" block @click="applyFields">应用</a-button>
      </template>
    </a-drawer>

    <EmployeeDrawer v-model:open="drawerOpen" :userId="drawerUserId" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, reactive, onMounted } from 'vue';
import { message } from 'ant-design-vue';
import { SettingOutlined, DownloadOutlined } from '@ant-design/icons-vue';
import { getAnnualRanking, exportAnnualRanking } from '@/api/ranking.api';
import { getRankingLists } from '@/api/ranking-list.api';
import { getDepartmentTree } from '@/api/department.api';
import EmployeeDrawer from '@/components/EmployeeDrawer.vue';

const now = new Date();
const selectedYear = ref(String(now.getFullYear()));
const selectedListId = ref<number | undefined>();
const selectedDeptId = ref<number | undefined>();
const selectedCompany = ref<string | undefined>();
const keyword = ref('');
const loading = ref(false);
const exporting = ref(false);
const rankingLists = ref<any[]>([]);
const deptTree = ref<any[]>([]);
const allDataList = ref<any[]>([]);
const dataList = computed(() => {
  if (!selectedCompany.value) return allDataList.value;
  return allDataList.value.filter((d: any) => d.companyBelong === selectedCompany.value);
});
const companyOptions = computed(() => {
  const set = new Set<string>();
  for (const d of allDataList.value) {
    if (d.companyBelong) set.add(d.companyBelong);
  }
  return Array.from(set).sort();
});
const fieldDrawerVisible = ref(false);

// Employee drawer
const drawerOpen = ref(false);
const drawerUserId = ref(0);
function openDrawer(uid: number) { drawerUserId.value = uid; drawerOpen.value = true; }

// ===== 字段管理 =====
const FIELD_KEY = 'annual-ranking-fields';

interface BaseFieldConf { key: string; title: string; visible: boolean; width: number }

const baseFieldConfigs = reactive<BaseFieldConf[]>([
  { key: 'name', title: '姓名', visible: true, width: 90 },
  { key: 'dept1', title: '一级部门', visible: true, width: 110 },
  { key: 'dept2', title: '二级部门', visible: true, width: 110 },
  { key: 'dept3', title: '三级部门', visible: true, width: 110 },
  { key: 'companyBelong', title: '归属', visible: true, width: 70 },
  { key: 'rankingListName', title: '所属榜单', visible: true, width: 100 },
  { key: 'currentPoints', title: '当前积分', visible: true, width: 90 },
]);

const curMonth = now.getMonth(); // 0-based
const monthVisible = reactive<boolean[]>(Array.from({ length: 12 }, (_, i) => i >= curMonth - 2 && i <= curMonth));
const quarterVisible = reactive<Record<string, boolean>>({
  Q1: curMonth < 3, Q2: curMonth >= 3 && curMonth < 6,
  Q3: curMonth >= 6 && curMonth < 9, Q4: curMonth >= 9,
});
const honorsVisible = ref(true);

function loadFieldConfig() {
  try {
    const saved = localStorage.getItem(FIELD_KEY);
    if (!saved) return;
    const cfg = JSON.parse(saved);
    if (cfg.base) {
      for (const f of baseFieldConfigs) {
        if (cfg.base[f.key] !== undefined) f.visible = cfg.base[f.key];
      }
    }
    if (cfg.months) cfg.months.forEach((v: boolean, i: number) => { monthVisible[i] = v; });
    if (cfg.quarters) Object.assign(quarterVisible, cfg.quarters);
    if (cfg.honors !== undefined) honorsVisible.value = cfg.honors;
  } catch { /* ignore */ }
}

function saveFieldConfig() {
  const cfg = {
    base: Object.fromEntries(baseFieldConfigs.map((f) => [f.key, f.visible])),
    months: [...monthVisible],
    quarters: { ...quarterVisible },
    honors: honorsVisible.value,
  };
  localStorage.setItem(FIELD_KEY, JSON.stringify(cfg));
}

function applyFields() {
  saveFieldConfig();
  fieldDrawerVisible.value = false;
  message.success('字段配置已应用');
}

// ===== 列构建 =====
const allMonths = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0'));
const monthNames = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];
const qKeys = ['Q1', 'Q2', 'Q3', 'Q4'];

const tableColumns = computed(() => {
  const cols: any[] = [];

  // 基础列
  for (const f of baseFieldConfigs) {
    if (!f.visible) continue;
    const col: any = { title: f.title, dataIndex: f.key, key: f.key, width: f.width };
    if (f.key === 'name') col.fixed = 'left';
    if (f.key === 'currentPoints') {
      col.sorter = (a: any, b: any) => (a.currentPoints || 0) - (b.currentPoints || 0);
    }
    cols.push(col);
  }

  // 月度列
  let groupIdx = 0;
  for (let mi = 0; mi < 12; mi++) {
    if (!monthVisible[mi]) continue;
    const mm = allMonths[mi];
    const isEven = groupIdx % 2 === 0;
    const groupCls = isEven ? 'col-group-even' : 'col-group-odd';
    const scoreKey = `m${mm}_score`;
    const children: any[] = [
      { title: '积分', dataIndex: scoreKey, key: scoreKey, width: 70, className: `group-start-col ${groupCls}`, sorter: (a: any, b: any) => (a[scoreKey] || 0) - (b[scoreKey] || 0) },
    ];
    if (mi > 0) {
      children.push({ title: '环比', dataIndex: `m${mm}_scoreMoM`, key: `m${mm}_scoreMoM`, width: 70, className: groupCls });
    }
    children.push({ title: '排名', dataIndex: `m${mm}_ranking`, key: `m${mm}_ranking`, width: 60, className: groupCls });
    if (mi > 0) {
      children.push({ title: '环比', dataIndex: `m${mm}_rankingMoM`, key: `m${mm}_rankingMoM`, width: 60, className: groupCls });
    }
    const headerCls = isEven ? 'group-header-even' : 'group-header-odd';
    cols.push({
      title: monthNames[mi],
      className: headerCls,
      customHeaderCell: () => ({ class: `group-start-th ${headerCls}` }),
      children,
    });
    groupIdx++;
  }

  // 季度列
  for (const q of qKeys) {
    if (!quarterVisible[q]) continue;
    const ql = q.toLowerCase();
    const isEven = groupIdx % 2 === 0;
    const groupCls = isEven ? 'col-group-even' : 'col-group-odd';
    const qScoreKey = `${ql}_score`;
    const children: any[] = [
      { title: '积分', dataIndex: qScoreKey, key: qScoreKey, width: 70, className: `group-start-col ${groupCls}`, sorter: (a: any, b: any) => (a[qScoreKey] || 0) - (b[qScoreKey] || 0) },
      { title: '环比', dataIndex: `${ql}_scoreMoM`, key: `${ql}_scoreMoM`, width: 70, className: groupCls },
      { title: '排名', dataIndex: `${ql}_ranking`, key: `${ql}_ranking`, width: 60, className: groupCls },
      { title: '环比', dataIndex: `${ql}_rankingMoM`, key: `${ql}_rankingMoM`, width: 60, className: groupCls },
    ];
    const headerCls = isEven ? 'group-header-even' : 'group-header-odd';
    cols.push({
      title: q,
      className: headerCls,
      customHeaderCell: () => ({ class: `group-start-th ${headerCls}` }),
      children,
    });
    groupIdx++;
  }

  // 荣誉列
  if (honorsVisible.value) {
    cols.push({ title: '积分荣誉', key: 'honors', width: 260, fixed: 'right' as const });
  }

  return cols;
});

const scrollX = computed(() => {
  let total = 0;
  for (const col of tableColumns.value) {
    if (col.children) {
      for (const c of col.children) total += c.width || 70;
    } else {
      total += col.width || 100;
    }
  }
  return total;
});

// ===== 表格辅助函数 =====
function isScoreCol(key: any) { return typeof key === 'string' && /^(m\d{2}|q\d)_score$/.test(key); }
function isScoreMoMCol(key: any) { return typeof key === 'string' && /^(m\d{2}|q\d)_scoreMoM$/.test(key); }
function isRankingCol(key: any) { return typeof key === 'string' && /^(m\d{2}|q\d)_ranking$/.test(key); }
function isRankingMoMCol(key: any) { return typeof key === 'string' && /^(m\d{2}|q\d)_rankingMoM$/.test(key); }

function getCellValue(record: any, key: any) {
  return record[String(key)];
}

function formatScoreMoM(val: any) {
  if (val == null) return '-';
  return `${val > 0 ? '+' : ''}${val}%`;
}
function formatRankingMoM(val: any) {
  if (val == null) return '-';
  if (val > 0) return `↑${val}`;
  if (val < 0) return `↓${Math.abs(val)}`;
  return '→';
}
function getMoMColor(val: any) {
  if (val == null) return '#8c8c8c';
  return val > 0 ? '#52c41a' : val < 0 ? '#ff4d4f' : '#8c8c8c';
}
function getRankMoMColor(val: any) {
  if (val == null) return '#8c8c8c';
  return val > 0 ? '#52c41a' : val < 0 ? '#ff4d4f' : '#8c8c8c';
}

// ===== 统计 =====
const yearMaxScore = computed(() => {
  if (!dataList.value.length) return 0;
  return Math.max(...dataList.value.map((d: any) => d.currentPoints || 0));
});
const yearAvgScore = computed(() => {
  if (!dataList.value.length) return 0;
  const sum = dataList.value.reduce((s: number, d: any) => s + (d.currentPoints || 0), 0);
  return Math.round((sum / dataList.value.length) * 10) / 10;
});

// ===== 数据加载 =====
async function loadData() {
  loading.value = true;
  try {
    const res: any = await getAnnualRanking({
      year: selectedYear.value,
      rankingListId: selectedListId.value,
      keyword: keyword.value || undefined,
      departmentId: selectedDeptId.value,
    });
    const list = Array.isArray(res) ? res : [];
    // 展平 months/quarters 到平铺字段
    allDataList.value = list.map((item: any) => {
      const flat: any = { ...item };
      // 月度
      for (const mm of allMonths) {
        const md = item.months?.[mm] || {};
        flat[`m${mm}_score`] = md.score || 0;
        flat[`m${mm}_scoreMoM`] = md.scoreMoM ?? null;
        flat[`m${mm}_ranking`] = md.ranking || 0;
        flat[`m${mm}_rankingMoM`] = md.rankingMoM ?? null;
      }
      // 季度
      for (const q of qKeys) {
        const qd = item.quarters?.[q] || {};
        const ql = q.toLowerCase();
        flat[`${ql}_score`] = qd.score || 0;
        flat[`${ql}_scoreMoM`] = qd.scoreMoM ?? null;
        flat[`${ql}_ranking`] = qd.ranking || 0;
        flat[`${ql}_rankingMoM`] = qd.rankingMoM ?? null;
      }
      return flat;
    });
  } catch {
    allDataList.value = [];
  } finally {
    loading.value = false;
  }
}

async function handleExport() {
  exporting.value = true;
  try {
    const blob: any = await exportAnnualRanking({
      year: selectedYear.value,
      rankingListId: selectedListId.value,
      departmentId: selectedDeptId.value,
      companyBelong: selectedCompany.value,
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `积分与排名_${selectedYear.value}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
  } catch {
    message.error('导出失败');
  } finally {
    exporting.value = false;
  }
}

onMounted(async () => {
  loadFieldConfig();
  try {
    const [rlRes, dtRes] = await Promise.allSettled([getRankingLists(), getDepartmentTree()]);
    if (rlRes.status === 'fulfilled') {
      const res = rlRes.value as any;
      rankingLists.value = (Array.isArray(res) ? res : res.list || []).filter((rl: any) => rl.isActive !== 0 || rl.isSecondary === 1);
    }
    if (dtRes.status === 'fulfilled') {
      deptTree.value = Array.isArray(dtRes.value) ? dtRes.value : [];
    }
  } catch { /* ignore */ }
  loadData();
});
</script>

<style scoped lang="less">
.stat-card-gradient {
  border-radius: 8px;
  padding: 16px 24px;
  color: #fff;
  flex: 1;
}
.stat-label-g { font-size: 13px; opacity: 0.85; }
.stat-value-g { font-size: 28px; font-weight: 700; line-height: 1.3; }

.field-group {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.field-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 6px 12px;
  background: #fafafa;
  border-radius: 6px;
  border: 1px solid #f0f0f0;
  min-width: 120px;
  font-size: 13px;
}

// 分组列视觉分隔 — 每组首列添加左边框
:deep(.group-start-col) {
  border-left: 2px solid #d9d9d9 !important;
}
:deep(.group-start-th) {
  border-left: 2px solid #d9d9d9 !important;
}

// 交替背景色增强月份/季度区分
:deep(.col-group-even) {
  background: #fafafa !important;
}
:deep(.col-group-odd) {
  background: #fff !important;
}
:deep(.group-header-even) {
  background: #f0f5ff !important;
}
:deep(.group-header-odd) {
  background: #f6ffed !important;
}
</style>
