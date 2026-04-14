<template>
  <div class="page-container">
    <div class="page-header"><h2>榜单配置</h2></div>
    <div class="card-box">
      <div class="table-actions">
        <a-button type="primary" @click="showForm()">新增榜单</a-button>
      </div>
      <a-table :columns="columns" :data-source="list" :loading="loading" row-key="id" size="middle">
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'isSecondary'">
            <a-switch :checked="record.isSecondary === 1" @change="(v: string | number | boolean) => handleToggleSecondary(record, !!v)" />
          </template>
          <template v-if="column.key === 'isActive'">
            <a-switch :checked="record.isActive === 1" @change="(v: string | number | boolean) => handleToggle(record, !!v)" />
          </template>
          <template v-if="column.key === 'action'">
            <a-space>
              <a @click="showForm(record)">编辑</a>
              <a-popconfirm title="确认删除？" @confirm="handleDelete(record.id)">
                <a style="color: #ff4d4f">删除</a>
              </a-popconfirm>
            </a-space>
          </template>
        </template>
      </a-table>
    </div>

    <a-modal v-model:open="formVisible" :title="formData.id ? '编辑榜单' : '新增榜单'" @ok="handleSubmit" :confirm-loading="submitting">
      <a-form :model="formData" layout="vertical">
        <a-form-item label="榜单名称" required><a-input v-model:value="formData.name" /></a-form-item>
        <a-form-item label="说明"><a-textarea v-model:value="formData.description" :rows="2" /></a-form-item>
        <a-form-item label="副榜"><a-switch :checked="!!formData.isSecondary" @change="(v: any) => formData.isSecondary = v ? 1 : 0" /></a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import { message } from 'ant-design-vue';
import { getRankingLists, createRankingList, updateRankingList, deleteRankingList } from '@/api/ranking-list.api';

const columns = [
  { title: '榜单名称', dataIndex: 'name', width: 150 },
  { title: '说明', dataIndex: 'description', ellipsis: true },
  { title: '副榜', key: 'isSecondary', width: 80 },
  { title: '启用', key: 'isActive', width: 80 },
  { title: '操作', key: 'action', width: 120 },
];

const list = ref<any[]>([]);
const loading = ref(false);
const formVisible = ref(false);
const submitting = ref(false);
const formData = reactive<any>({});

onMounted(loadData);

async function loadData() {
  loading.value = true;
  try {
    list.value = await getRankingLists() as any;
  } finally {
    loading.value = false;
  }
}

function showForm(record?: any) {
  Object.keys(formData).forEach((k) => delete formData[k]);
  if (record) {
    Object.assign(formData, { ...record });
  } else {
    // defaults for new ranking list
  }
  formVisible.value = true;
}

async function handleSubmit() {
  submitting.value = true;
  try {
    if (formData.id) {
      await updateRankingList(formData.id, formData);
      message.success('更新成功');
    } else {
      await createRankingList(formData);
      message.success('创建成功');
    }
    formVisible.value = false;
    loadData();
  } finally {
    submitting.value = false;
  }
}

async function handleToggle(record: any, checked: boolean) {
  try {
    await updateRankingList(record.id, { isActive: checked ? 1 : 0 });
    loadData();
  } catch (err: any) {
    message.error(err?.response?.data?.message || '操作失败');
  }
}

async function handleToggleSecondary(record: any, checked: boolean) {
  try {
    await updateRankingList(record.id, { isSecondary: checked ? 1 : 0 });
    loadData();
  } catch (err: any) {
    message.error(err?.response?.data?.message || '操作失败');
  }
}

async function handleDelete(id: number) {
  try {
    await deleteRankingList(id);
    message.success('删除成功');
    loadData();
  } catch (err: any) {
    message.error(err?.response?.data?.message || '删除失败');
  }
}
</script>
