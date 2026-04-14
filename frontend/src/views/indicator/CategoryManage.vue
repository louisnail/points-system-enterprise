<template>
  <div class="page-container">
    <div class="page-header"><h2>分类管理（管控项）</h2></div>
    <div class="card-box">
      <div class="table-actions">
        <a-space>
          <a-button type="primary" @click="showForm()">新增分类</a-button>
          <a-button @click="handleDownloadTemplate">模板下载</a-button>
          <a-upload :show-upload-list="false" :before-upload="handleImport" accept=".xlsx,.xls">
            <a-button :loading="importing">批量导入</a-button>
          </a-upload>
          <a-button :disabled="!selectedRowKeys.length" :loading="batchDeactivating" @click="handleBatchDeactivate">
            批量停用{{ selectedRowKeys.length ? ` (${selectedRowKeys.length})` : '' }}
          </a-button>
          <a-button danger :disabled="!selectedRowKeys.length" :loading="batchDeleting" @click="handleBatchDelete">
            批量删除{{ selectedRowKeys.length ? ` (${selectedRowKeys.length})` : '' }}
          </a-button>
        </a-space>
      </div>
      <a-table
        :columns="columns" :data-source="list" :loading="loading" row-key="id" size="middle"
        :row-selection="{ selectedRowKeys, onChange: onSelectChange as any }"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'isActive'">
            <a-tag :color="record.isActive === 1 ? 'green' : 'default'">{{ record.isActive === 1 ? '启用' : '停用' }}</a-tag>
          </template>
          <template v-if="column.key === 'action'">
            <a-space>
              <a @click="showForm(record)">编辑</a>
              <a-popconfirm title="确认停用？停用后该分类下的指标将保留但不可选" @confirm="handleRemove(record.id)">
                <a v-if="record.isActive === 1" style="color: #ff4d4f">停用</a>
              </a-popconfirm>
            </a-space>
          </template>
        </template>
      </a-table>
    </div>

    <a-modal v-model:open="formVisible" :title="formData.id ? '编辑分类' : '新增分类'" @ok="handleSubmit" :confirm-loading="submitting">
      <a-form :model="formData" layout="vertical">
        <a-form-item label="名称" required><a-input v-model:value="formData.name" /></a-form-item>
        <a-form-item label="说明"><a-textarea v-model:value="formData.description" :rows="2" /></a-form-item>
        <a-form-item label="排序"><a-input-number v-model:value="formData.sortOrder" :min="0" /></a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, h } from 'vue';
import { message, Modal } from 'ant-design-vue';
import {
  getIndicatorCategories, createIndicatorCategory, updateIndicatorCategory, deleteIndicatorCategory,
  getCategoryTemplate, importCategories, batchDeactivateCategories, batchDeleteCategories, checkCategoryAssociations,
} from '@/api/indicator.api';

const columns = [
  { title: '名称', dataIndex: 'name', width: 200 },
  { title: '说明', dataIndex: 'description', ellipsis: true },
  { title: '排序', dataIndex: 'sortOrder', width: 60 },
  { title: '状态', key: 'isActive', width: 80 },
  { title: '操作', key: 'action', width: 120 },
];

const list = ref<any[]>([]);
const loading = ref(false);
const formVisible = ref(false);
const submitting = ref(false);
const importing = ref(false);
const formData = reactive<any>({});
const selectedRowKeys = ref<number[]>([]);
const batchDeactivating = ref(false);
const batchDeleting = ref(false);

onMounted(loadData);

function onSelectChange(keys: (string | number)[]) {
  selectedRowKeys.value = keys as number[];
}

async function handleDownloadTemplate() {
  const blob: any = await getCategoryTemplate();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = '分类模板.xlsx';
  a.click();
  URL.revokeObjectURL(url);
}

async function handleImport(file: File) {
  importing.value = true;
  try {
    const res: any = await importCategories(file);
    if (res.failed > 0) {
      Modal.warning({
        title: `导入完成：成功 ${res.success} 条，失败 ${res.failed} 条`,
        content: h('div', { style: 'max-height:200px;overflow:auto' },
          (res.errors || []).map((err: string) => h('div', { style: 'color:#ff4d4f;margin:4px 0' }, err))
        ),
        width: 520,
      });
    } else {
      message.success(`导入成功：共 ${res.success} 条`);
    }
    loadData();
  } catch {
    message.error('导入失败，请检查文件格式');
  } finally {
    importing.value = false;
  }
  return false;
}

function handleBatchDeactivate() {
  if (!selectedRowKeys.value.length) return;
  Modal.confirm({
    title: '确认批量停用',
    content: `确认停用已选的 ${selectedRowKeys.value.length} 个分类？停用后该分类下的指标将保留但不可选。`,
    okText: '确认停用',
    okType: 'danger',
    onOk: async () => {
      batchDeactivating.value = true;
      try {
        const res: any = await batchDeactivateCategories(selectedRowKeys.value);
        message.success(res.message || `已停用 ${selectedRowKeys.value.length} 个分类`);
        selectedRowKeys.value = [];
        loadData();
      } catch {
        message.error('批量停用失败');
      } finally {
        batchDeactivating.value = false;
      }
    },
  });
}

async function handleBatchDelete() {
  if (!selectedRowKeys.value.length) return;
  batchDeleting.value = true;
  try {
    const checkResult: any = await checkCategoryAssociations(selectedRowKeys.value);
    if (checkResult.blockedIds?.length > 0) {
      Modal.warning({
        title: '以下分类存在关联数据，无法删除',
        content: h('div', { style: 'max-height:240px;overflow:auto' },
          (checkResult.details || []).map((d: any) =>
            h('div', { style: 'margin:6px 0;color:#ff4d4f' },
              `「${d.categoryName}」关联 ${d.indicatorCount} 个指标、${d.dimensionCount} 个画像维度`
            )
          )
        ),
        width: 520,
      });
      return;
    }
    Modal.confirm({
      title: '永久删除',
      content: `将永久删除 ${selectedRowKeys.value.length} 个分类，此操作不可恢复！`,
      okText: '确认删除',
      okType: 'danger',
      onOk: async () => {
        try {
          const res: any = await batchDeleteCategories(selectedRowKeys.value);
          message.success(res.message || `已永久删除 ${selectedRowKeys.value.length} 个分类`);
          selectedRowKeys.value = [];
          loadData();
        } catch (err: any) {
          message.error(err?.response?.data?.message || '批量删除失败');
        }
      },
    });
  } catch (err: any) {
    message.error(err?.response?.data?.message || '检查关联数据失败');
  } finally {
    batchDeleting.value = false;
  }
}

async function loadData() {
  loading.value = true;
  try {
    list.value = await getIndicatorCategories({ includeInactive: true }) as any;
  } finally {
    loading.value = false;
  }
}

function showForm(record?: any) {
  Object.keys(formData).forEach((k) => delete formData[k]);
  if (record) Object.assign(formData, { ...record });
  else formData.sortOrder = 0;
  formVisible.value = true;
}

async function handleSubmit() {
  submitting.value = true;
  try {
    if (formData.id) {
      await updateIndicatorCategory(formData.id, formData);
      message.success('更新成功');
    } else {
      await createIndicatorCategory(formData);
      message.success('创建成功');
    }
    formVisible.value = false;
    loadData();
  } finally {
    submitting.value = false;
  }
}

async function handleRemove(id: number) {
  try {
    await deleteIndicatorCategory(id);
    message.success('已停用');
    loadData();
  } catch (err: any) {
    message.error(err?.response?.data?.message || '停用失败');
  }
}
</script>
