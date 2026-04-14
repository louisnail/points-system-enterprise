<template>
  <div class="page-container">
    <div class="page-header">
      <h2>评奖</h2>
    </div>

    <!-- 统计卡片 -->
    <div class="stat-cards">
      <div class="stat-card" style="border-left: 4px solid #1890ff">
        <div class="stat-count" style="color: #1890ff">&yen;{{ formatAmount(stats.totalAmount) }}</div>
        <div class="stat-label">总奖金金额</div>
      </div>
      <div class="stat-card" style="border-left: 4px solid #52c41a">
        <div class="stat-count" style="color: #52c41a">&yen;{{ formatAmount(stats.paidAmount) }}</div>
        <div class="stat-label">已发放金额</div>
      </div>
      <div class="stat-card" style="border-left: 4px solid #fa8c16">
        <div class="stat-count" style="color: #fa8c16">&yen;{{ formatAmount(stats.pendingAmount) }}</div>
        <div class="stat-label">待发放金额</div>
      </div>
    </div>

    <div class="card-box">
      <!-- 筛选栏 -->
      <div class="filter-bar">
        <a-select
          v-model:value="filters.year"
          placeholder="年份"
          style="width: 100px"
          @change="handleFilterChange"
        >
          <a-select-option v-for="y in yearOptions" :key="y" :value="y">{{ y }}</a-select-option>
        </a-select>
        <a-select
          v-model:value="filters.quarter"
          placeholder="季度"
          allow-clear
          style="width: 100px"
          @change="handleFilterChange"
        >
          <a-select-option value="Q1">Q1</a-select-option>
          <a-select-option value="Q2">Q2</a-select-option>
          <a-select-option value="Q3">Q3</a-select-option>
          <a-select-option value="Q4">Q4</a-select-option>
        </a-select>
        <a-tree-select
          v-model:value="filters.departmentId"
          placeholder="部门"
          allow-clear
          show-search
          tree-node-filter-prop="title"
          :tree-data="deptTree"
          :field-names="{ label: 'name', value: 'id', children: 'children' }"
          style="width: 200px"
          @change="handleFilterChange"
        />
        <a-select
          v-model:value="filters.companyBelong"
          placeholder="归属组织"
          allow-clear
          style="width: 120px"
          @change="handleFilterChange"
        >
          <a-select-option v-for="cb in companyBelongList" :key="cb" :value="cb">{{ cb }}</a-select-option>
        </a-select>
        <a-select
          v-model:value="filters.status"
          placeholder="发放状态"
          allow-clear
          style="width: 120px"
          @change="handleFilterChange"
        >
          <a-select-option :value="0">待发放</a-select-option>
          <a-select-option :value="1">已发放</a-select-option>
        </a-select>
      </div>

      <!-- 操作栏 -->
      <div class="table-actions">
        <div style="display: flex; gap: 8px">
          <a-button type="primary" @click="openForm()">新增评奖</a-button>
          <a-button @click="handleExport" :loading="exporting">导出</a-button>
        </div>
        <span style="color: #8c8c8c">共 {{ total }} 条</span>
      </div>

      <!-- 表格 -->
      <a-table
        :columns="columns"
        :data-source="list"
        :loading="loading"
        :pagination="pagination"
        :scroll="{ x: scrollX }"
        @change="handleTableChange"
        row-key="id"
        size="small"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'userName'">
            {{ record.user?.name || '' }}
          </template>
          <template v-else-if="column.key === 'department'">
            {{ record.department?.name || '' }}
          </template>
          <template v-else-if="column.key === 'rankingList'">
            {{ record.rankingList?.name || '' }}
          </template>
          <template v-else-if="column.key === 'honors'">
            <div style="white-space: normal; word-break: break-all">{{ record.honors || '' }}</div>
          </template>
          <template v-else-if="column.key === 'amount'">
            &yen;{{ Number(record.amount || 0).toFixed(2) }}
          </template>
          <template v-else-if="column.key === 'reason'">
            <div style="white-space: normal; word-break: break-all">{{ record.reason || '' }}</div>
          </template>
          <template v-else-if="column.key === 'status'">
            <a-tag :color="record.status === 1 ? 'green' : 'orange'">
              {{ record.status === 1 ? '已发放' : '待发放' }}
            </a-tag>
          </template>
          <template v-else-if="column.key === 'remark'">
            <div style="white-space: normal; word-break: break-all">{{ record.remark || '' }}</div>
          </template>
          <template v-else-if="column.key === 'action'">
            <a-space>
              <a @click="openForm(record)">编辑</a>
              <a-popconfirm title="确认删除该评奖记录？" @confirm="handleDelete(record.id)">
                <a style="color: #ff4d4f">删除</a>
              </a-popconfirm>
            </a-space>
          </template>
        </template>
      </a-table>
    </div>

    <!-- 新增/编辑弹窗 -->
    <a-modal
      v-model:open="formVisible"
      :title="isEdit ? '编辑评奖' : '新增评奖'"
      @ok="handleFormSubmit"
      :confirm-loading="formLoading"
      :width="560"
    >
      <a-form layout="vertical" style="margin-top: 16px">
        <a-form-item label="获奖员工" required>
          <a-select
            v-model:value="formData.userId"
            placeholder="请选择员工"
            show-search
            :filter-option="filterUserOption"
            :disabled="isEdit"
            style="width: 100%"
          >
            <a-select-option v-for="u in userList" :key="u.id" :value="u.id">
              {{ u.name }} ({{ u.employeeNo }})
            </a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item label="积分荣誉">
          <a-input v-model:value="formData.honors" placeholder="请输入积分荣誉" />
        </a-form-item>
        <a-form-item label="奖金金额" required>
          <a-input-number
            v-model:value="formData.amount"
            :precision="2"
            :min="0"
            style="width: 100%"
            placeholder="请输入奖金金额"
          />
        </a-form-item>
        <a-form-item label="评奖理由">
          <a-textarea v-model:value="formData.reason" :rows="3" placeholder="请输入评奖理由" />
        </a-form-item>
        <a-form-item label="入选月份" required>
          <a-date-picker
            v-model:value="formData.selectedMonth"
            picker="month"
            value-format="YYYY-MM"
            style="width: 100%"
            placeholder="请选择入选月份"
          />
        </a-form-item>
        <a-form-item label="发放状态">
          <a-select v-model:value="formData.status" style="width: 100%">
            <a-select-option :value="0">待发放</a-select-option>
            <a-select-option :value="1">已发放</a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item label="备注">
          <a-textarea v-model:value="formData.remark" :rows="2" placeholder="请输入备注" />
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue';
import { message } from 'ant-design-vue';
import { getAwards, getAwardStats, createAward, updateAward, deleteAward, exportAwards } from '@/api/award.api';
import { getDepartmentTree } from '@/api/department.api';
import { getUsers, getCompanyBelongs } from '@/api/user.api';

// ===== 筛选器 =====
const currentYear = new Date().getFullYear();
const yearOptions = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);

const filters = reactive<any>({
  year: String(currentYear),
  quarter: undefined,
  departmentId: undefined,
  companyBelong: undefined,
  status: undefined,
});

// ===== 数据状态 =====
const list = ref<any[]>([]);
const total = ref(0);
const loading = ref(false);
const pagination = reactive({ current: 1, pageSize: 20, total: 0, showSizeChanger: true });

const stats = reactive({ totalAmount: 0, paidAmount: 0, pendingAmount: 0 });

const deptTree = ref<any[]>([]);
const userList = ref<any[]>([]);
const companyBelongList = ref<string[]>([]);

// ===== 表格列 =====
const columns = [
  { title: '姓名', key: 'userName', width: 80 },
  { title: '部门', key: 'department', width: 120 },
  { title: '归属', dataIndex: 'companyBelong', key: 'companyBelong', width: 70 },
  { title: '榜单', key: 'rankingList', width: 110 },
  { title: '积分荣誉', key: 'honors', width: 150 },
  { title: '奖金金额', key: 'amount', width: 100 },
  { title: '评奖理由', key: 'reason', width: 200 },
  { title: '入选月份', dataIndex: 'selectedMonth', key: 'selectedMonth', width: 100 },
  { title: '发放状态', key: 'status', width: 90 },
  { title: '备注', key: 'remark', width: 150 },
  { title: '操作', key: 'action', width: 100, fixed: 'right' as const },
];

const scrollX = computed(() => columns.reduce((sum, col) => sum + (col.width || 120), 0));

// ===== 编辑弹窗 =====
const formVisible = ref(false);
const formLoading = ref(false);
const isEdit = ref(false);
const editId = ref<number | null>(null);
const formData = reactive<any>({
  userId: undefined,
  honors: '',
  amount: 0,
  reason: '',
  selectedMonth: undefined,
  status: 0,
  remark: '',
});

// ===== 导出 =====
const exporting = ref(false);

// ===== 方法 =====

function getFilterParams() {
  const params: any = {};
  if (filters.year) params.year = filters.year;
  if (filters.quarter) params.quarter = filters.quarter;
  if (filters.departmentId) params.departmentId = filters.departmentId;
  if (filters.companyBelong) params.companyBelong = filters.companyBelong;
  if (filters.status !== undefined && filters.status !== null) params.status = filters.status;
  return params;
}

async function loadData() {
  loading.value = true;
  try {
    const params: any = {
      ...getFilterParams(),
      page: pagination.current,
      pageSize: pagination.pageSize,
    };
    const res: any = await getAwards(params);
    list.value = res.list || [];
    total.value = res.total || 0;
    pagination.total = total.value;
  } finally {
    loading.value = false;
  }
}

async function loadStats() {
  try {
    const res: any = await getAwardStats(getFilterParams());
    stats.totalAmount = res.totalAmount || 0;
    stats.paidAmount = res.paidAmount || 0;
    stats.pendingAmount = res.pendingAmount || 0;
  } catch {
    // 静默
  }
}

function handleFilterChange() {
  pagination.current = 1;
  loadData();
  loadStats();
}

function handleTableChange(pag: any) {
  pagination.current = pag.current;
  pagination.pageSize = pag.pageSize;
  loadData();
}

function formatAmount(val: number) {
  return Number(val || 0).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function filterUserOption(input: string, option: any) {
  const user = userList.value.find((u) => u.id === option.value);
  if (!user) return false;
  const kw = input.toLowerCase();
  return (user.name || '').toLowerCase().includes(kw) || (user.employeeNo || '').toLowerCase().includes(kw);
}

function openForm(record?: any) {
  if (record) {
    isEdit.value = true;
    editId.value = record.id;
    formData.userId = record.userId;
    formData.honors = record.honors || '';
    formData.amount = Number(record.amount) || 0;
    formData.reason = record.reason || '';
    formData.selectedMonth = record.selectedMonth || undefined;
    formData.status = record.status ?? 0;
    formData.remark = record.remark || '';
  } else {
    isEdit.value = false;
    editId.value = null;
    formData.userId = undefined;
    formData.honors = '';
    formData.amount = 0;
    formData.reason = '';
    formData.selectedMonth = undefined;
    formData.status = 0;
    formData.remark = '';
  }
  formVisible.value = true;
}

async function handleFormSubmit() {
  if (!isEdit.value && !formData.userId) {
    message.warning('请选择获奖员工');
    return;
  }
  if (!formData.selectedMonth) {
    message.warning('请选择入选月份');
    return;
  }

  formLoading.value = true;
  try {
    const payload: any = {
      honors: formData.honors || undefined,
      amount: formData.amount || 0,
      reason: formData.reason || undefined,
      selectedMonth: formData.selectedMonth,
      status: formData.status,
      remark: formData.remark || undefined,
    };

    if (isEdit.value && editId.value) {
      await updateAward(editId.value, payload);
      message.success('更新成功');
    } else {
      payload.userId = formData.userId;
      await createAward(payload);
      message.success('创建成功');
    }
    formVisible.value = false;
    loadData();
    loadStats();
  } finally {
    formLoading.value = false;
  }
}

async function handleDelete(id: number) {
  try {
    await deleteAward(id);
    message.success('删除成功');
    loadData();
    loadStats();
  } catch {
    message.error('删除失败');
  }
}

async function handleExport() {
  exporting.value = true;
  try {
    const blob: any = await exportAwards(getFilterParams());
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = '评奖记录.xlsx';
    a.click();
    URL.revokeObjectURL(url);
    message.success('导出成功');
  } catch {
    message.error('导出失败');
  } finally {
    exporting.value = false;
  }
}

onMounted(async () => {
  // 并行加载
  const [deptRes, userRes, cbRes] = await Promise.all([
    getDepartmentTree().catch(() => []),
    getUsers({ pageSize: 5000, status: 1 }).catch(() => ({ list: [] })),
    getCompanyBelongs().catch(() => []),
  ]);
  deptTree.value = deptRes as any[] || [];
  userList.value = (userRes as any)?.list || [];
  companyBelongList.value = Array.isArray(cbRes) ? cbRes as string[] : [];

  loadData();
  loadStats();
});
</script>

<style scoped lang="less">
.page-container {
  padding: 20px;
}
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  h2 { margin: 0; }
}
.stat-cards {
  display: flex;
  gap: 16px;
  margin-bottom: 16px;
}
.stat-card {
  flex: 1;
  padding: 20px;
  background: #fafafa;
  border-radius: 4px;
}
.stat-count {
  font-size: 24px;
  font-weight: bold;
  margin-bottom: 8px;
}
.stat-label {
  color: #8c8c8c;
  font-size: 12px;
}
.card-box {
  background: #fff;
  padding: 16px;
  border-radius: 4px;
}
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
