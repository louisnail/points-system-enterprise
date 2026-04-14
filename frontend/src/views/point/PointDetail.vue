<template>
  <div class="page-container">
    <div class="page-header"><h2>积分明细</h2></div>
    <div class="card-box">
      <!-- 筛选栏 -->
      <div class="filter-bar">
        <a-input-search v-model:value="filters.keyword" placeholder="搜索姓名/工号" style="width: 180px" @search="onFilterChange" allow-clear />
        <a-select v-model:value="filters.rankingListId" placeholder="榜单" style="width: 130px" allow-clear @change="onFilterChange">
          <a-select-option v-for="rl in rankingLists" :key="rl.id" :value="rl.id">{{ rl.name }}{{ rl.isSecondary ? '（副榜）' : '' }}</a-select-option>
        </a-select>
        <a-date-picker v-model:value="filters.belongMonth" picker="month" value-format="YYYY-MM" placeholder="归属月份" allow-clear @change="onFilterChange" />
        <a-tree-select v-model:value="filters.departmentId" :tree-data="deptTree" :field-names="{ label: 'name', value: 'id', children: 'children' }" placeholder="部门" style="width: 160px" allow-clear tree-default-expand-all @change="onFilterChange" />
        <a-select v-model:value="filters.categoryId" placeholder="管控项" style="width: 120px" allow-clear @change="onFilterChange">
          <a-select-option v-for="c in categories" :key="c.id" :value="c.id">{{ c.name }}</a-select-option>
        </a-select>
        <a-select v-model:value="filters.auditStatus" placeholder="审核状态" style="width: 110px" allow-clear @change="onFilterChange">
          <a-select-option :value="0">待审核</a-select-option>
          <a-select-option :value="1">已通过</a-select-option>
          <a-select-option :value="2">已驳回</a-select-option>
          <a-select-option :value="3">已作废</a-select-option>
        </a-select>
        <a-select v-model:value="filters.pointStatus" placeholder="积分状态" style="width: 110px" allow-clear @change="onFilterChange">
          <a-select-option :value="1">过程分</a-select-option>
          <a-select-option :value="2">结果分</a-select-option>
        </a-select>
      </div>
      <div class="table-actions">
        <div>
          <span style="color: #8c8c8c">共 {{ total }} 条记录</span>
          <template v-if="selectedRowKeys.length > 0">
            <a-button danger style="margin-left: 12px" @click="handleBatchVoid">
              批量作废 ({{ selectedRowKeys.length }})
            </a-button>
          </template>
        </div>
        <a-space>
          <a-button size="small" :loading="exporting" @click="handleExportDetail">导出</a-button>
          <a-button size="small" @click="fieldDrawerVisible = true">
            <template #icon><SettingOutlined /></template>
            字段管理
          </a-button>
        </a-space>
      </div>
      <a-table
        :columns="displayColumns"
        :data-source="list"
        :loading="loading"
        :pagination="pagination"
        :scroll="{ x: scrollX }"
        @change="handleTableChange"
        @resizeColumn="handleResizeColumn"
        row-key="id"
        size="small"
        :row-selection="{ selectedRowKeys, onChange: onSelectChange }"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'dept1'">
            {{ getDeptLevel(record.user?.departmentId, 0) }}
          </template>
          <template v-if="column.key === 'dept2'">
            {{ getDeptLevel(record.user?.departmentId, 1) }}
          </template>
          <template v-if="column.key === 'dept3'">
            {{ getDeptLevel(record.user?.departmentId, 2) }}
          </template>
          <template v-if="column.key === 'score'">
            <a-tag :color="record.score > 0 ? 'green' : 'red'">{{ record.score > 0 ? '+' : '' }}{{ record.score }}</a-tag>
          </template>
          <template v-if="column.key === 'auditStatus'">
            <a-tag :color="auditColorMap[record.auditStatus]">{{ auditStatusMap[record.auditStatus] }}</a-tag>
          </template>
          <template v-if="column.key === 'action'">
            <a-space>
              <a v-if="record.auditStatus !== 3" @click="openEdit(record)">修改</a>
              <a-popconfirm v-if="record.auditStatus !== 3" title="作废后将撤回已通过积分，确认作废？" @confirm="handleVoid(record.id)">
                <a style="color: #ff4d4f">作废</a>
              </a-popconfirm>
              <span v-if="record.auditStatus === 3" style="color: #d9d9d9">已作废</span>
            </a-space>
          </template>
        </template>
      </a-table>
    </div>

    <!-- 编辑弹窗 -->
    <a-modal v-model:open="editVisible" title="修改积分记录" @ok="handleEditSubmit" :confirm-loading="editLoading" :width="500">
      <a-descriptions :column="2" bordered size="small" style="margin-bottom: 16px">
        <a-descriptions-item label="员工">{{ editRecord?.user?.name }}</a-descriptions-item>
        <a-descriptions-item label="工号">{{ editRecord?.user?.employeeNo }}</a-descriptions-item>
        <a-descriptions-item label="评价维度">{{ editRecord?.indicator?.name }}</a-descriptions-item>
        <a-descriptions-item label="审核状态">
          <a-tag :color="auditColorMap[editRecord?.auditStatus]">{{ auditStatusMap[editRecord?.auditStatus] }}</a-tag>
        </a-descriptions-item>
      </a-descriptions>
      <a-form layout="vertical">
        <a-form-item label="分值">
          <a-input-number v-model:value="editForm.score" style="width: 100%" />
        </a-form-item>
        <a-form-item label="归属月份">
          <a-date-picker v-model:value="editForm.belongMonth" picker="month" value-format="YYYY-MM" style="width: 100%" />
        </a-form-item>
        <a-form-item label="事由说明">
          <a-textarea v-model:value="editForm.description" :rows="3" />
        </a-form-item>
      </a-form>
      <a-alert v-if="editRecord?.auditStatus === 1" message="修改已通过的记录将自动同步员工总积分" type="warning" show-icon style="margin-top: 8px" />
    </a-modal>

    <!-- 字段管理抽屉 -->
    <a-drawer v-model:open="fieldDrawerVisible" title="字段管理" :width="360" placement="right">
      <div style="margin-bottom: 16px">
        <div style="font-weight: 600; margin-bottom: 8px; color: #333">已选字段</div>
        <p style="color: #8c8c8c; font-size: 12px; margin-bottom: 8px">拖拽调整顺序</p>
        <div style="display: flex; flex-direction: column; gap: 4px">
          <div
            v-for="(field, idx) in fieldConfig.filter(f => f.visible)"
            :key="field.key"
            style="display: flex; align-items: center; padding: 8px 12px; border-radius: 6px; border: 1px solid #f0f0f0; background: #fafafa; cursor: grab"
            :style="{ opacity: dragFieldIdx === fieldConfig.indexOf(field) ? 0.4 : 1 }"
            draggable="true"
            @dragstart="onFieldDragStart(fieldConfig.indexOf(field))"
            @dragover.prevent="onFieldDragOver(fieldConfig.indexOf(field))"
            @drop="onFieldDrop(fieldConfig.indexOf(field))"
            @dragend="dragFieldIdx = -1"
          >
            <HolderOutlined style="cursor: grab; color: #bbb; margin-right: 8px" />
            <span style="flex: 1">{{ field.title }}</span>
            <a style="color: #ff4d4f; font-size: 12px" @click="removeField(field.key); applyFieldConfig()">删除</a>
          </div>
        </div>
      </div>
      <div v-if="hiddenFields.length > 0">
        <div style="font-weight: 600; margin-bottom: 8px; color: #333">可添加字段</div>
        <div style="display: flex; flex-direction: column; gap: 4px">
          <div v-for="field in hiddenFields" :key="field.key" style="display: flex; align-items: center; padding: 8px 12px; border-radius: 6px; border: 1px solid #f0f0f0; background: #fff">
            <span style="flex: 1">{{ field.title }}</span>
            <a style="color: #1890ff; font-size: 12px" @click="addField(field.key); applyFieldConfig()">添加</a>
          </div>
        </div>
      </div>
      <template #footer>
        <a-button type="primary" block @click="applyFieldConfig">应用</a-button>
      </template>
    </a-drawer>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { message, Modal } from 'ant-design-vue';
import { SettingOutlined, HolderOutlined } from '@ant-design/icons-vue';
import { getPoints, updatePoint, voidPoint, batchVoidPoints, exportPoints } from '@/api/point.api';
import { getDepartmentTree } from '@/api/department.api';
import { getRankingLists } from '@/api/ranking-list.api';
import { getIndicatorCategories } from '@/api/indicator.api';
import { useFieldPool } from '@/composables/useFieldPool';

const route = useRoute();

const auditStatusMap: Record<number, string> = { 0: '待审核', 1: '已通过', 2: '已驳回', 3: '已作废' };
const auditColorMap: Record<number, string> = { 0: 'orange', 1: 'green', 2: 'red', 3: 'default' };

// 三级部门
const deptLevelMap = ref<Map<number, string[]>>(new Map());

function buildDeptLevelMap(tree: any[], ancestors: string[] = []): Map<number, string[]> {
  const map = new Map<number, string[]>();
  for (const node of tree) {
    const levels = [...ancestors, node.name];
    map.set(Number(node.id), [levels[0] || '-', levels[1] || '-', levels[2] || '-']);
    if (node.children?.length) {
      const childMap = buildDeptLevelMap(node.children, levels);
      for (const [k, v] of childMap) map.set(k, v);
    }
  }
  return map;
}

function getDeptLevel(deptId: number | string | undefined, level: number): string {
  if (!deptId) return '-';
  const levels = deptLevelMap.value.get(Number(deptId));
  return levels ? levels[level] : '-';
}

function formatDateTime(val: string) {
  if (!val) return '-';
  const d = new Date(val);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}年${pad(d.getMonth() + 1)}月${pad(d.getDate())}日 ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const allDetailColumns = [
  { title: '工号', key: 'employeeNo', width: 90, resizable: true, customRender: ({ record: r }: any) => r.user?.employeeNo || '-' },
  { title: '姓名', key: 'userName', width: 80, resizable: true, customRender: ({ record: r }: any) => r.user?.name || '-' },
  { title: '一级部门', key: 'dept1', width: 100, resizable: true, ellipsis: true },
  { title: '二级部门', key: 'dept2', width: 100, resizable: true, ellipsis: true },
  { title: '三级部门', key: 'dept3', width: 100, resizable: true, ellipsis: true },
  { title: '归属', key: 'companyBelong', width: 60, resizable: true, customRender: ({ record: r }: any) => r.user?.companyBelong || '-' },
  { title: '榜单', key: 'rankingList', width: 100, resizable: true, ellipsis: true, customRender: ({ record: r }: any) => r.user?.rankingList?.name || '-' },
  { title: '积分归类', key: 'rankingListType', width: 100, resizable: true, ellipsis: true, customRender: ({ record: r }: any) => r.indicator?.rankingListType || '通用积分' },
  { title: '管控项', key: 'category', width: 90, resizable: true, ellipsis: true, customRender: ({ record: r }: any) => r.indicator?.category?.name || '-' },
  { title: '评价维度', key: 'indicator', width: 140, resizable: true, ellipsis: true, customRender: ({ record: r }: any) => r.indicator?.name || '-' },
  { title: '分值', key: 'score', width: 70, resizable: true },
  { title: '积分状态', key: 'pointType', width: 80, resizable: true, customRender: ({ record: r }: any) => r.pointStatus === 1 ? '过程分' : '结果分' },
  { title: '反馈人', key: 'registrant', width: 80, resizable: true, customRender: ({ record: r }: any) => r.registrant?.name || '-' },
  { title: '归属月份', key: 'belongMonth', dataIndex: 'belongMonth', width: 90, resizable: true },
  { title: '审核状态', key: 'auditStatus', width: 85, resizable: true },
  { title: '事由', key: 'description', dataIndex: 'description', width: 180, resizable: true, ellipsis: true },
  { title: '录入时间', key: 'registeredAt', dataIndex: 'registeredAt', width: 160, resizable: true, customRender: ({ text }: any) => formatDateTime(text) },
];

const {
  fieldConfig,
  dragFieldIdx,
  onDragStart: onFieldDragStart,
  onDragOver: onFieldDragOver,
  onDragDrop: onFieldDrop,
  visibleColumns,
  hiddenFields,
  addField,
  removeField,
  applyAndSave,
} = useFieldPool('point-detail-fields', allDetailColumns);

const fieldDrawerVisible = ref(false);
const columnWidths = ref<Record<string, number>>({});
const displayColumns = computed(() => [
  ...visibleColumns.value.map(c => ({
    ...c,
    width: columnWidths.value[c.key] || c.width,
  })),
  { title: '操作', key: 'action', width: 120, fixed: 'right' as const },
]);
const scrollX = computed(() => displayColumns.value.reduce((sum: number, col: any) => sum + (col.width || 120), 0));

function handleResizeColumn(w: number, col: any) {
  const key = col.key || col.dataIndex;
  if (key) columnWidths.value[key] = w;
}

function applyFieldConfig() {
  applyAndSave();
  fieldDrawerVisible.value = false;
  message.success('字段配置已应用');
}

// --- 行选择（批量操作） ---
const selectedRowKeys = ref<number[]>([]);

function onSelectChange(keys: (string | number)[]) {
  selectedRowKeys.value = keys as number[];
}

// --- 筛选 ---
const filters = reactive<any>({
  keyword: '',
  rankingListId: undefined,
  belongMonth: undefined,
  departmentId: undefined,
  categoryId: undefined,
  auditStatus: undefined,
  pointStatus: undefined,
});

const list = ref<any[]>([]);
const total = ref(0);
const loading = ref(false);
const pagination = reactive({ current: 1, pageSize: 20, total: 0 });

const deptTree = ref<any[]>([]);
const rankingLists = ref<any[]>([]);
const categories = ref<any[]>([]);

// --- 编辑 ---
const editVisible = ref(false);
const editLoading = ref(false);
const editRecord = ref<any>(null);
const editForm = reactive<any>({ score: undefined, description: '', belongMonth: '' });

function openEdit(record: any) {
  editRecord.value = record;
  editForm.score = record.score;
  editForm.description = record.description || '';
  editForm.belongMonth = record.belongMonth;
  editVisible.value = true;
}

async function handleEditSubmit() {
  editLoading.value = true;
  try {
    await updatePoint(editRecord.value.id, {
      score: editForm.score,
      description: editForm.description,
      belongMonth: editForm.belongMonth,
    });
    message.success('更新成功');
    editVisible.value = false;
    loadData();
  } catch {
    message.error('更新失败');
  } finally {
    editLoading.value = false;
  }
}

// --- 作废 ---
async function handleVoid(id: number) {
  try {
    await voidPoint(id);
    message.success('已作废');
    loadData();
  } catch {
    message.error('作废失败');
  }
}

async function handleBatchVoid() {
  Modal.confirm({
    title: `确认批量作废 ${selectedRowKeys.value.length} 条记录？`,
    content: '已通过的记录作废后将撤回对应积分，此操作不可恢复。',
    okText: '确认作废',
    okType: 'danger',
    async onOk() {
      try {
        const res: any = await batchVoidPoints(selectedRowKeys.value);
        if (res.failed > 0) {
          message.warning(`作废完成：成功 ${res.success} 条，失败 ${res.failed} 条`);
        } else {
          message.success(`已作废 ${res.success} 条记录`);
        }
        selectedRowKeys.value = [];
        loadData();
      } catch {
        message.error('批量作废失败');
      }
    },
  });
}

async function loadData() {
  loading.value = true;
  try {
    const params: any = {
      page: pagination.current,
      pageSize: pagination.pageSize,
    };
    if (filters.keyword) params.keyword = filters.keyword;
    if (filters.rankingListId) params.rankingListId = filters.rankingListId;
    if (filters.belongMonth) params.belongMonth = filters.belongMonth;
    if (filters.departmentId) params.departmentId = filters.departmentId;
    if (filters.categoryId) params.categoryId = filters.categoryId;
    if (filters.auditStatus !== undefined && filters.auditStatus !== null) params.auditStatus = filters.auditStatus;
    if (filters.pointStatus) params.pointStatus = filters.pointStatus;
    // Support userId from query param (linked from employee management)
    if (route.query.userId) params.userId = Number(route.query.userId);

    const res: any = await getPoints(params);
    list.value = res.list;
    total.value = res.total;
    pagination.total = res.total;
  } finally {
    loading.value = false;
  }
}

function handleTableChange(pag: any) {
  pagination.current = pag.current;
  pagination.pageSize = pag.pageSize;
  loadData();
}

function onFilterChange() {
  pagination.current = 1;
  loadData();
}

const exporting = ref(false);
async function handleExportDetail() {
  exporting.value = true;
  try {
    const params: any = {};
    if (filters.keyword) params.keyword = filters.keyword;
    if (filters.rankingListId) params.rankingListId = filters.rankingListId;
    if (filters.belongMonth) params.belongMonth = filters.belongMonth;
    if (filters.departmentId) params.departmentId = filters.departmentId;
    if (filters.categoryId) params.categoryId = filters.categoryId;
    if (filters.auditStatus !== undefined && filters.auditStatus !== null) params.auditStatus = filters.auditStatus;
    if (filters.pointStatus) params.pointStatus = filters.pointStatus;
    if (route.query.userId) params.userId = Number(route.query.userId);
    const blob: any = await exportPoints(params);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = '积分明细.xlsx';
    a.click();
    URL.revokeObjectURL(url);
  } finally {
    exporting.value = false;
  }
}

onMounted(async () => {
  try {
    const tree = await getDepartmentTree() as any;
    deptTree.value = tree;
    deptLevelMap.value = buildDeptLevelMap(tree);
  } catch { /* ignore */ }
  try {
    const res: any = await getRankingLists();
    rankingLists.value = Array.isArray(res) ? res : res.list || [];
  } catch { /* ignore */ }
  try {
    categories.value = await getIndicatorCategories() as any || [];
  } catch { /* ignore */ }
  loadData();
});
</script>

<style scoped lang="less">
.filter-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 12px;
}

.table-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}
</style>
