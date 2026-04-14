<template>
  <a-layout class="main-layout">
    <a-layout-sider
      v-model:collapsed="appStore.sidebarCollapsed"
      :trigger="null"
      collapsible
      :width="220"
      theme="dark"
      class="sidebar"
    >
      <AppSidebar />
    </a-layout-sider>
    <a-layout>
      <a-layout-header class="app-header">
        <AppHeader />
      </a-layout-header>
      <a-layout-content class="app-content">
        <router-view />
      </a-layout-content>
    </a-layout>
  </a-layout>
</template>

<script setup lang="ts">
import { useAppStore } from '@/stores/app.store';
import AppSidebar from './AppSidebar.vue';
import AppHeader from './AppHeader.vue';

const appStore = useAppStore();
</script>

<style scoped lang="less">
.main-layout {
  height: 100vh;
}
.sidebar {
  background: #001529;
  overflow-y: auto;
}
.app-header {
  background: #fff;
  padding: 0 24px;
  height: 64px;
  line-height: 64px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06);
  display: flex;
  align-items: center;
  justify-content: space-between;
  z-index: 1;
}
.app-content {
  background: #f0f2f5;
  overflow-y: auto;
  padding: 0;
}
</style>
