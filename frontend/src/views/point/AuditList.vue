<template>
  <div class="page-container">
    <div class="page-header"><h2>积分审核</h2></div>
    <div class="card-box">
      <div class="filter-bar">
        <a-select v-model:value="filterAuditStatus" placeholder="审核状态" style="width: 130px" allow-clear @change="onFilterChange">
          <a-select-option :value="0">待审核</a-select-option>
          <a-select-option :value="1">已通过</a-select-option>
          <a-select-option :value="2">已驳回</a-select-option>
        </a-select>
        <a-date-picker v-model:value="filterMonth" picker="month" value-format="YYYY-MM" placeholder="归属月份" allow-clear @change="onFilterChange" />
        <a-select v-model:value="filterPointStatus" placeholder="积分状态" style="width: 120px" allow-clear @change="onFilterChange">
          <a-select-option :value="1">过程分</a-select-option>
          <a-select-option :value="2">结果分</a-select-option>
        </a-select>
        <a-input-search v-model:value="keyword" placeholder="搜索员工" style="width: 200px" @search="onFilterChange" allow-clear />
      </div>
      <div class="table-actions">
        <a-space>
          <a-button type="primary" :disabled="!selectedRowKeys.length" @click="handleBatchAudit(1)">
            批量通过 ({{ selectedRowKeys.length }})
          </a-button>
          <a-button danger :disabled="!selectedRowKeys.length" @click="handleBatchAudit(2)">
            批量驳回 ({{ selectedRowKeys.length }})
          </a-button>
        </a-space>
        <span style="color: #8c8c8c">共 {{ pagination.total }} 条</span>
      </div>
      <a-table
        :columns="columns" :data-source="list" :loading="loading" row-key="id" size="middle"
        :pagination="pagination" @change="handleTableChange"
        :scroll="{ x: scrollX }" @resizeColumn="handleResizeColumn"
        :row-selection="{ selectedRowKeys, onChange: onSelectChange as any, getCheckboxProps: (r: any) => ({ disabled: r.auditStatus !== 0 }) }"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'score'">
            <a-tag :color="record.score > 0 ? 'green' : 'red'">{{ record.score > 0 ? '+' : '' }}{{ record.score }}</a-tag>
          </template>
          <template v-if="column.key === 'auditStatus'">
            <a-tag :color="auditColorMap[record.auditStatus]">{{ auditStatusMap[record.auditStatus] }}</a-tag>
          </template>
          <template v-if="column.key === 'action'">
            <a-space v-if="record.auditStatus === 0" size="small">
              <a-popconfirm title="确认通过？" @confirm="handleAudit(record.id, 1)"><a style="color: #52c41a">通过</a></a-popconfirm>
              <a @click="showRejectModal(record)">驳回</a>
            </a-space>
            <span v-else style="color: #8c8c8c">{{ record.auditor?.name || '-' }} {{ record.auditedAt?.slice(0,10) }}</span>
          </template>
        </template>
      </a-table>
    </div>

    <a-modal v-model:open="rejectVisible" title="驳回理由" @ok="handleReject" :confirm-loading="rejecting">
      <a-textarea v-model:value="rejectRemark" :rows="3" placeholder="请输入驳回理由..." style="margin-top: 16px" />
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue';
import { message } from 'ant-design-vue';
import { getPoints, auditPoint, batchAuditPoints } from '@/api/point.api';

const filterAuditStatus = ref<number | undefined>(0);
const filterMonth = ref('');
const filterPointStatus = ref<number | undefined>();
const keyword = ref('');
const list = ref<any[]>([]);
const loading = ref(false);
const selectedRowKeys = ref<number[]>([]);
const pagination = reactive({ current: 1, pageSize: 20, total: 0 });

const rejectVisible = ref(false);
const rejecting = ref(false);
const rejectRemark = ref('');
const rejectingId = ref<number>(0);

const auditStatusMap: Record<number, string> = { 0: '待审核', 1: '已通过', 2: '已驳回' };
const auditColorMap: Record<number, string> = { 0: 'orange', 1: 'green', 2: 'red' };

const columns = ref([
  { title: '员工', width: 80, resizable: true, customRender: ({ record: r }: any) => r.user?.name || '-' },
  { title: '工号', width: 90, resizable: true, customRender: ({ record: r }: any) => r.user?.employeeNo || '-' },
  { title: '指标', width: 160, resizable: true, ellipsis: true, customRender: ({ record: r }: any) => r.indicator?.name || '-' },
  { title: '分类', width: 100, resizable: true, ellipsis: true, customRender: ({ record: r }: any) => r.indicator?.category?.name || '-' },
  { title: '分值', key: 'score', width: 70, resizable: true },
  { title: '积分状态', width: 85, resizable: true, customRender: ({ record: r }: any) => r.pointStatus === 1 ? '过程分' : '结果分' },
  { title: '月份', dataIndex: 'belongMonth', width: 85, resizable: true },
  { title: '理由', dataIndex: 'description', ellipsis: true, resizable: true },
  { title: '录入人', width: 80, resizable: true, customRender: ({ record: r }: any) => r.registrant?.name || '-' },
  { title: '审核状态', key: 'auditStatus', width: 90, resizable: true },
  { title: '操作', key: 'action', width: 150, fixed: 'right' as const },
]);

const scrollX = computed(() => columns.value.reduce((sum: number, col: any) => sum + (col.width || 120), 0));

function handleResizeColumn(w: number, col: any) {
  col.width = w;
}

function onSelectChange(keys: number[]) {
  selectedRowKeys.value = keys;
}

async function loadData() {
  loading.value = true;
  selectedRowKeys.value = [];
  try {
    const res: any = await getPoints({
      page: pagination.current,
      pageSize: pagination.pageSize,
      auditStatus: filterAuditStatus.value,
      belongMonth: filterMonth.value || undefined,
      pointStatus: filterPointStatus.value,
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

function onFilterChange() {
  pagination.current = 1;
  loadData();
}

async function handleAudit(id: number, auditStatus: number, auditRemark?: string) {
  try {
    await auditPoint(id, { auditStatus, auditRemark });
    message.success(auditStatus === 1 ? '已通过' : '已驳回');
    loadData();
  } catch (err: any) {
    message.error(err?.response?.data?.message || '审核操作失败');
  }
}

function showRejectModal(record: any) {
  rejectingId.value = record.id;
  rejectRemark.value = '';
  rejectVisible.value = true;
}

async function handleReject() {
  rejecting.value = true;
  try {
    await handleAudit(rejectingId.value, 2, rejectRemark.value);
    rejectVisible.value = false;
  } finally {
    rejecting.value = false;
  }
}

async function handleBatchAudit(auditStatus: number) {
  if (!selectedRowKeys.value.length) return;
  try {
    const res: any = await batchAuditPoints({ ids: selectedRowKeys.value, auditStatus });
    message.success(`批量操作完成：成功 ${res.success} 条`);
    loadData();
  } catch (err: any) {
    message.error(err?.response?.data?.message || '批量审核失败');
  }
}

onMounted(() => loadData());
</script>
