<template>
  <div class="page-container">
    <div class="page-header"><h2>历史员工</h2></div>
    <div class="card-box">
      <div class="filter-bar">
        <a-input-search v-model:value="keyword" placeholder="搜索工号/姓名" style="width: 220px" @search="loadData" allow-clear />
        <a-select v-model:value="filterCompany" placeholder="归属组织" style="width: 120px" allow-clear @change="loadData">
          <a-select-option v-for="cb in companyBelongList" :key="cb" :value="cb">{{ cb }}</a-select-option>
        </a-select>
        <a-button @click="handleExport">导出</a-button>
        <a-button @click="fieldDrawerVisible = true">
          <template #icon><SettingOutlined /></template>
          字段管理
        </a-button>
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
        size="middle"
      >
        <template #headerCell="{ column }">
          <span
            draggable="true"
            style="cursor: grab; user-select: none"
            @dragstart="onColDragStart($event, String(column.key ?? ''))"
            @dragover.prevent="onColDragOver($event, String(column.key ?? ''))"
            @dragleave="onColDragLeave"
            @drop="onColDrop($event, String(column.key ?? ''))"
          >{{ column.title }}</span>
        </template>
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'dept1'">
            {{ getDeptLevel(record.departmentId, 0) }}
          </template>
          <template v-if="column.key === 'dept2'">
            {{ getDeptLevel(record.departmentId, 1) }}
          </template>
          <template v-if="column.key === 'dept3'">
            {{ getDeptLevel(record.departmentId, 2) }}
          </template>
          <template v-if="column.key === 'companyBelong'">
            <a-tag :color="orgColorMap[record.companyBelong] || 'default'">{{ record.companyBelong }}</a-tag>
          </template>
          <template v-if="column.key === 'rankingList'">{{ record.rankingList?.name || '-' }}</template>
          <template v-if="column.key === 'status'"><a-tag color="red">离职</a-tag></template>
          <template v-if="column.key === 'processedAt'">{{ formatDate(record.updatedAt) }}</template>
        </template>
      </a-table>
    </div>

    <!-- 字段管理抽屉 -->
    <a-drawer v-model:open="fieldDrawerVisible" title="字段管理" :width="360" placement="right">
      <p style="color: #8c8c8c; margin-bottom: 12px">拖拽调整字段顺序</p>
      <div class="field-list">
        <div
          v-for="(field, idx) in fieldConfig"
          :key="field.key"
          class="field-item"
          :class="{ 'field-item--dragging': dragFieldIdx === idx }"
          draggable="true"
          @dragstart="dragFieldIdx = idx"
          @dragover.prevent="onFieldDragOver(idx)"
          @drop="dragFieldIdx = -1"
          @dragend="dragFieldIdx = -1"
        >
          <HolderOutlined style="cursor: grab; color: #bbb; margin-right: 8px" />
          <span style="flex: 1">{{ field.title }}</span>
          <a-switch size="small" :checked="field.visible" @change="(v: any) => field.visible = !!v" />
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
import { message } from 'ant-design-vue';
import { SettingOutlined, HolderOutlined } from '@ant-design/icons-vue';
import { getUsers, exportUsers, getCompanyBelongs } from '@/api/user.api';
import { getDepartmentTree } from '@/api/department.api';

const orgColorMap: Record<string, string> = { TD: 'blue', XD: 'green', TY: 'purple', WB: 'orange' };
const companyBelongList = ref<string[]>([]);

const allColumns = [
  { title: '工号', dataIndex: 'employeeNo', key: 'employeeNo', width: 100, resizable: true },
  { title: '姓名', dataIndex: 'name', key: 'name', width: 80, resizable: true },
  { title: '归属', dataIndex: 'companyBelong', key: 'companyBelong', width: 70, resizable: true },
  { title: '一级部门', key: 'dept1', width: 110, resizable: true, ellipsis: true },
  { title: '二级部门', key: 'dept2', width: 110, resizable: true, ellipsis: true },
  { title: '三级部门', key: 'dept3', width: 110, resizable: true, ellipsis: true },
  { title: '岗位', dataIndex: 'position', key: 'position', width: 150, ellipsis: true, resizable: true },
  { title: '职级', dataIndex: 'rankLevel', key: 'rankLevel', width: 70, resizable: true },
  { title: '所属榜单', key: 'rankingList', width: 110, resizable: true, ellipsis: true },
  { title: '最终积分', dataIndex: 'totalPoints', key: 'totalPoints', width: 90, resizable: true },
  { title: '处理时间', key: 'processedAt', width: 120, resizable: true },
  { title: '状态', key: 'status', width: 70, resizable: true },
];

// 字段配置
interface FieldConf { key: string; title: string; visible: boolean }
const fieldConfig = ref<FieldConf[]>(
  allColumns.map((c) => ({ key: c.key, title: c.title, visible: true }))
);

const fieldDrawerVisible = ref(false);
const dragFieldIdx = ref(-1);

function onFieldDragOver(idx: number) {
  if (dragFieldIdx.value < 0 || dragFieldIdx.value === idx) return;
  const list = [...fieldConfig.value];
  const [moved] = list.splice(dragFieldIdx.value, 1);
  list.splice(idx, 0, moved);
  fieldConfig.value = list;
  dragFieldIdx.value = idx;
}

const columns = ref([...allColumns]);
const displayColumns = ref([...allColumns]);
const scrollX = computed(() => displayColumns.value.reduce((sum: number, col: any) => sum + (col.width || 120), 0));

function handleResizeColumn(w: number, col: any) {
  col.width = w;
}

function applyFieldConfig() {
  const newCols: any[] = [];
  for (const fc of fieldConfig.value) {
    if (!fc.visible) continue;
    const col = allColumns.find((c) => c.key === fc.key);
    if (col) newCols.push({ ...col });
  }
  columns.value = newCols;
  displayColumns.value = newCols;
  fieldDrawerVisible.value = false;
  message.success('字段配置已应用');
}

// 列拖拽排序
const dragColKey = ref<string | null>(null);
const dragOverColKey = ref<string | null>(null);

function onColDragStart(e: DragEvent, key: string) {
  dragColKey.value = key;
  if (e.dataTransfer) e.dataTransfer.effectAllowed = 'move';
}
function onColDragOver(_e: DragEvent, key: string) {
  if (!dragColKey.value) return;
  dragOverColKey.value = key;
}
function onColDragLeave() { dragOverColKey.value = null; }
function onColDrop(_e: DragEvent, key: string) {
  if (!dragColKey.value || dragColKey.value === key) {
    dragColKey.value = null;
    return;
  }
  const cols = [...displayColumns.value];
  const fromIdx = cols.findIndex((c) => c.key === dragColKey.value);
  const toIdx = cols.findIndex((c) => c.key === key);
  if (fromIdx >= 0 && toIdx >= 0) {
    const [moved] = cols.splice(fromIdx, 1);
    cols.splice(toIdx, 0, moved);
    displayColumns.value = cols;
  }
  dragColKey.value = null;
  dragOverColKey.value = null;
}

// 部门路径
const deptPathMap = ref<Map<number, string>>(new Map());
const deptLevelMap = ref<Map<number, string[]>>(new Map());

function buildDeptPathMap(tree: any[], parentPath = '') {
  const map = new Map<number, string>();
  for (const node of tree) {
    const path = parentPath ? `${parentPath} / ${node.name}` : node.name;
    map.set(node.id, path);
    if (node.children?.length) {
      const childMap = buildDeptPathMap(node.children, path);
      for (const [k, v] of childMap) map.set(k, v);
    }
  }
  return map;
}

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

function getDeptPath(deptId: number): string {
  return deptPathMap.value.get(deptId) || '-';
}

function getDeptLevel(deptId: number | string | undefined, level: number): string {
  if (!deptId) return '-';
  const levels = deptLevelMap.value.get(Number(deptId));
  return levels ? levels[level] : '-';
}

function formatDate(d: string | Date | undefined): string {
  if (!d) return '-';
  const date = new Date(d);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

const list = ref<any[]>([]);
const loading = ref(false);
const keyword = ref('');
const filterCompany = ref<string | undefined>();
const pagination = reactive({ current: 1, pageSize: 20, total: 0 });

onMounted(() => {
  loadData();
  loadDeptTree();
  getCompanyBelongs().then((res: any) => { companyBelongList.value = Array.isArray(res) ? res : []; }).catch(() => {});
});

async function loadDeptTree() {
  try {
    const tree = await getDepartmentTree() as any;
    deptPathMap.value = buildDeptPathMap(tree);
    deptLevelMap.value = buildDeptLevelMap(tree);
  } catch { /* ignore */ }
}

async function loadData() {
  loading.value = true;
  try {
    const res: any = await getUsers({
      page: pagination.current,
      pageSize: pagination.pageSize,
      isHistory: true,
      keyword: keyword.value || undefined,
      companyBelong: filterCompany.value,
    });
    list.value = res.list;
    pagination.total = res.total;
  } finally {
    loading.value = false;
  }
}

function handleTableChange(pag: any) {
  pagination.current = pag.current;
  loadData();
}

async function handleExport() {
  const blob: any = await exportUsers({ isHistory: true, companyBelong: filterCompany.value });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'history_employees.xlsx';
  a.click();
  URL.revokeObjectURL(url);
}
</script>

<style scoped lang="less">
.field-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.field-item {
  display: flex;
  align-items: center;
  padding: 8px 12px;
  border-radius: 6px;
  border: 1px solid #f0f0f0;
  background: #fafafa;
  cursor: grab;
  transition: all 0.15s;

  &:hover {
    border-color: #d9d9d9;
    background: #fff;
  }

  &--dragging {
    opacity: 0.4;
    border-color: #1890ff;
  }
}
</style>
