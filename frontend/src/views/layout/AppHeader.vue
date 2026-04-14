<template>
  <div class="header-left">
    <component
      :is="appStore.sidebarCollapsed ? MenuUnfoldOutlined : MenuFoldOutlined"
      class="trigger"
      @click="appStore.toggleSidebar"
    />
    <a-breadcrumb v-if="currentGroup" style="margin-left: 16px">
      <a-breadcrumb-item>{{ currentGroup }}</a-breadcrumb-item>
      <a-breadcrumb-item>{{ currentTitle }}</a-breadcrumb-item>
    </a-breadcrumb>
    <span v-else class="page-title">{{ currentTitle }}</span>
  </div>
  <div class="header-right">
    <span class="user-name">{{ authStore.userInfo?.name }}</span>
    <a-tag :color="roleColor">{{ roleLabel }}</a-tag>
    <a-divider type="vertical" />
    <a-button type="text" @click="authStore.logout">
      <template #icon><LogoutOutlined /></template>
      退出
    </a-button>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import { useAppStore } from '@/stores/app.store';
import { useAuthStore } from '@/stores/auth.store';
import { MenuFoldOutlined, MenuUnfoldOutlined, LogoutOutlined } from '@ant-design/icons-vue';

const route = useRoute();
const appStore = useAppStore();
const authStore = useAuthStore();

const currentTitle = computed(() => (route.meta.title as string) || '');
const currentGroup = computed(() => (route.meta.group as string) || '');

const roleMap: Record<string, { label: string; color: string }> = {
  super_admin: { label: '超级管理员', color: 'red' },
  dept_admin: { label: '部门管理员', color: 'blue' },
  employee: { label: '普通员工', color: 'green' },
};

const roleLabel = computed(() => roleMap[authStore.role]?.label || '');
const roleColor = computed(() => roleMap[authStore.role]?.color || 'default');
</script>

<style scoped lang="less">
.header-left {
  display: flex;
  align-items: center;
}
.trigger {
  font-size: 20px;
  cursor: pointer;
  transition: color 0.3s;
  &:hover {
    color: #1890ff;
  }
}
.page-title {
  margin-left: 16px;
  font-size: 16px;
  font-weight: 600;
}
.header-right {
  display: flex;
  align-items: center;
  gap: 8px;
  .user-name {
    font-weight: 500;
  }
}
</style>
