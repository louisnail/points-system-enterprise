<template>
  <div class="page-container">
    <div class="page-header"><h2>过程分维护</h2></div>
    <div class="card-box">
      <a-alert message="过程分每月维护，同一员工+指标+月份的记录会自动覆盖更新，历史记录自动存档" type="info" show-icon style="margin-bottom: 16px" />
      <div class="filter-bar">
        <a-date-picker v-model:value="belongMonth" picker="month" value-format="YYYY-MM" placeholder="选择月份" @change="loadData" />
        <a-select v-model:value="filterUserId" placeholder="筛选员工" style="width: 240px" show-search :filter-option="filterUser" :options="userOptions" allow-clear @change="loadData" />
        <a-button @click="handleDownloadTemplate">模板下载</a-button>
        <a-upload :show-upload-list="false" :before-upload="handleImport" accept=".xlsx,.xls">
          <a-button type="primary" :loading="importing">批量导入</a-button>
        </a-upload>
      </div>

      <a-table :columns="columns" :data-source="list" :loading="loading" row-key="id" size="middle"
        :scroll="{ x: scrollX }" @resizeColumn="handleResizeColumn">
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'score'">
            <a-tag :color="record.score > 0 ? 'green' : 'red'">{{ record.score > 0 ? '+' : '' }}{{ record.score }}</a-tag>
          </template>
          <template v-if="column.key === 'action'">
            <a @click="showUpdateForm(record)">更新</a>
          </template>
        </template>
      </a-table>

      <div v-if="importResult" style="margin-top: 16px">
        <a-result :status="importResult.failed === 0 ? 'success' : 'warning'"
          :title="`导入完成：成功 ${importResult.success} 条，失败 ${importResult.failed} 条`" />
      </div>
    </div>

    <a-modal v-model:open="formVisible" title="更新过程分" @ok="handleUpdate" :confirm-loading="submitting">
      <a-form layout="vertical" style="margin-top: 16px">
        <a-form-item label="员工">
          <a-input :value="editingRecord?.user?.name" disabled />
        </a-form-item>
        <a-form-item label="指标">
          <a-input :value="editingRecord?.indicator?.name" disabled />
        </a-form-item>
        <a-form-item label="当前分值">
          <a-tag :color="editingRecord?.score > 0 ? 'green' : 'red'">{{ editingRecord?.score }}</a-tag>
        </a-form-item>
        <a-form-item label="新分值" required>
          <a-input-number v-model:value="updateScore" style="width: 200px" />
        </a-form-item>
        <a-form-item label="说明">
          <a-textarea v-model:value="updateDescription" :rows="2" />
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { message } from 'ant-design-vue';
import { getProcessPoints, upsertProcessPoint, importProcessPoints, getProcessPointTemplate } from '@/api/point.api';
import { getUsers } from '@/api/user.api';

const belongMonth = ref('');
const filterUserId = ref<number | undefined>();
const list = ref<any[]>([]);
const loading = ref(false);
const importing = ref(false);
const importResult = ref<any>(null);
const users = ref<any[]>([]);

const formVisible = ref(false);
const submitting = ref(false);
const editingRecord = ref<any>(null);
const updateScore = ref<number>(0);
const updateDescription = ref('');

const userOptions = computed(() => users.value.map(u => ({
  value: u.id,
  label: `${u.employeeNo} - ${u.name}`,
})));

const columns = ref([
  { title: '员工', width: 100, resizable: true, customRender: ({ record: r }: any) => r.user?.name || '-' },
  { title: '工号', width: 100, resizable: true, customRender: ({ record: r }: any) => r.user?.employeeNo || '-' },
  { title: '指标', width: 200, resizable: true, ellipsis: true, customRender: ({ record: r }: any) => r.indicator?.name || '-' },
  { title: '当前分值', key: 'score', width: 100, resizable: true },
  { title: '月份', dataIndex: 'belongMonth', width: 90, resizable: true },
  { title: '操作', key: 'action', width: 80 },
]);

const scrollX = computed(() => columns.value.reduce((sum: number, col: any) => sum + (col.width || 120), 0));

function handleResizeColumn(w: number, col: any) {
  col.width = w;
}

function filterUser(input: string, option: any) {
  return option.label.toLowerCase().includes(input.toLowerCase());
}

async function loadData() {
  if (!belongMonth.value) return;
  loading.value = true;
  try {
    list.value = await getProcessPoints({ belongMonth: belongMonth.value, userId: filterUserId.value }) as any;
  } finally {
    loading.value = false;
  }
}

function showUpdateForm(record: any) {
  editingRecord.value = record;
  updateScore.value = Math.abs(record.score);
  updateDescription.value = '';
  formVisible.value = true;
}

async function handleUpdate() {
  submitting.value = true;
  try {
    await upsertProcessPoint({
      userId: editingRecord.value.userId,
      indicatorId: editingRecord.value.indicatorId,
      score: updateScore.value,
      belongMonth: belongMonth.value,
      description: updateDescription.value,
    });
    message.success('更新成功');
    formVisible.value = false;
    loadData();
  } catch (err: any) {
    message.error(err?.response?.data?.message || '更新失败');
  } finally {
    submitting.value = false;
  }
}

async function handleDownloadTemplate() {
  const blob: any = await getProcessPointTemplate();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'process_point_template.xlsx';
  a.click();
  URL.revokeObjectURL(url);
}

async function handleImport(file: File) {
  if (!belongMonth.value) {
    message.warning('请先选择归属月份');
    return false;
  }
  importing.value = true;
  try {
    importResult.value = await importProcessPoints(file, belongMonth.value);
    loadData();
  } finally {
    importing.value = false;
  }
  return false;
}

onMounted(async () => {
  try {
    const res: any = await getUsers({ page: 1, pageSize: 1000 });
    users.value = res.list || [];
  } catch { /* ignore */ }
});
</script>
