<template>
  <div class="page-container">
    <div class="page-header"><h2>角色管理</h2></div>
    <div class="card-box">
      <a-table :columns="columns" :data-source="roles" row-key="key" size="middle">
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'permissions'">
            <a-tag v-for="p in record.permissions" :key="p" color="blue" style="margin: 2px">{{ p }}</a-tag>
          </template>
        </template>
      </a-table>
      <a-alert type="info" show-icon style="margin-top: 16px">
        <template #message>自定义角色功能将在后续版本中开放</template>
      </a-alert>
    </div>
  </div>
</template>

<script setup lang="ts">
const columns = [
  { title: '角色名称', dataIndex: 'name', width: 150 },
  { title: '标识', dataIndex: 'key', width: 120 },
  { title: '人数上限', dataIndex: 'maxCount', width: 100 },
  { title: '权限', key: 'permissions' },
];

const roles = [
  { key: 'super_admin', name: '超级管理员', maxCount: 5, permissions: ['全部权限', '系统设置', '用户管理', '全部数据'] },
  { key: 'dept_admin', name: '部门管理员', maxCount: '-', permissions: ['审核积分', '查看部门数据', '录入积分'] },
  { key: 'employee', name: '普通员工', maxCount: '-', permissions: ['录入积分', '审核指定积分', '查看个人积分', '查看公开排名'] },
];
</script>
