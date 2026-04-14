<template>
  <div class="sidebar-inner">
    <div class="sidebar-logo" :class="{ collapsed: appStore.sidebarCollapsed }">
      <img src="/logo.svg" alt="logo" class="logo-icon" />
      <span v-if="!appStore.sidebarCollapsed" class="logo-text">积分系统</span>
    </div>
    <a-menu
      v-model:selectedKeys="selectedKeys"
      v-model:openKeys="openKeys"
      theme="dark"
      mode="inline"
      @click="handleMenuClick"
    >
      <template v-for="item in menuItems" :key="item.key">
        <a-menu-item v-if="!item.children" :key="item.key">
          <component :is="item.icon" />
          <span>{{ item.label }}</span>
        </a-menu-item>
        <a-sub-menu v-else :key="item.key">
          <template #title>
            <component :is="item.icon" />
            <span>{{ item.label }}</span>
          </template>
          <a-menu-item v-for="child in item.children" :key="child.key">
            <component :is="child.icon" />
            <span>{{ child.label }}</span>
          </a-menu-item>
        </a-sub-menu>
      </template>
    </a-menu>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, h } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useAppStore } from '@/stores/app.store';
import { useAuthStore } from '@/stores/auth.store';
import {
  DashboardOutlined,
  TeamOutlined,
  SolutionOutlined,
  ApartmentOutlined,
  OrderedListOutlined,
  AppstoreOutlined,
  UnorderedListOutlined,
  SafetyOutlined,
  SettingOutlined,
  FormOutlined,
  SyncOutlined,
  AuditOutlined,
  BarChartOutlined,
  TrophyOutlined,
  FundOutlined,
  WarningOutlined,
  DesktopOutlined,
  ProfileOutlined,
  FireOutlined,
  RadarChartOutlined,
  GiftOutlined,
} from '@ant-design/icons-vue';

const router = useRouter();
const route = useRoute();
const appStore = useAppStore();
const authStore = useAuthStore();

interface MenuItem {
  key: string;
  label: string;
  icon: any;
  path?: string;
  roles?: string[];
  children?: MenuItem[];
}

const allMenuItems: MenuItem[] = [
  { key: 'dashboard', label: '工作台', icon: h(DashboardOutlined), path: '/dashboard' },
  {
    key: 'personnel', label: '人员管理', icon: h(TeamOutlined),
    children: [
      { key: 'user-current', label: '员工管理', icon: h(TeamOutlined), path: '/user/current' },
      { key: 'user-history', label: '历史员工', icon: h(SolutionOutlined), path: '/user/history' },
      { key: 'department', label: '部门管理', icon: h(ApartmentOutlined), path: '/department' },
      { key: 'ranking-list', label: '榜单配置', icon: h(OrderedListOutlined), path: '/ranking-list', roles: ['super_admin'] },
    ],
  },
  {
    key: 'indicator', label: '指标库管理', icon: h(AppstoreOutlined),
    children: [
      { key: 'indicator-category', label: '分类管理', icon: h(AppstoreOutlined), path: '/indicator/category' },
      { key: 'indicator-list', label: '指标列表', icon: h(UnorderedListOutlined), path: '/indicator/list' },
    ],
  },
  {
    key: 'point', label: '积分管理', icon: h(FundOutlined),
    children: [
      { key: 'point-entry', label: '积分录入', icon: h(FormOutlined), path: '/point/entry' },
      { key: 'point-process', label: '过程分维护', icon: h(SyncOutlined), path: '/point/process' },
      { key: 'point-audit', label: '积分审核', icon: h(AuditOutlined), path: '/point/audit' },
      { key: 'point-detail', label: '积分明细', icon: h(ProfileOutlined), path: '/point/detail' },
    ],
  },
  {
    key: 'ranking', label: '排名展示', icon: h(BarChartOutlined),
    children: [
      { key: 'ranking-monthly', label: '积分与排名', icon: h(BarChartOutlined), path: '/ranking/monthly' },
      { key: 'ranking-red', label: '红榜', icon: h(FireOutlined), path: '/ranking/red' },
      { key: 'ranking-black', label: '黑榜', icon: h(WarningOutlined), path: '/ranking/black', roles: ['super_admin', 'dept_admin'] },
      { key: 'ranking-quarter-star', label: '季度之星', icon: h(TrophyOutlined), path: '/ranking/quarter-star' },
      { key: 'ranking-award', label: '评奖', icon: h(GiftOutlined), path: '/ranking/award' },
    ],
  },
  { key: 'cockpit', label: '管理驾驶舱', icon: h(DesktopOutlined), path: '/cockpit', roles: ['super_admin', 'dept_admin'] },
  {
    key: 'system', label: '系统管理', icon: h(SettingOutlined), roles: ['super_admin'],
    children: [
      { key: 'system-role', label: '角色管理', icon: h(SafetyOutlined), path: '/system/role' },
      { key: 'system-config', label: '系统配置', icon: h(SettingOutlined), path: '/system/config' },
      { key: 'system-score-profile', label: '积分画像配置', icon: h(RadarChartOutlined), path: '/system/score-profile' },
    ],
  },
];

const menuItems = computed(() => {
  return allMenuItems.filter((item) => {
    if (item.roles && !authStore.hasRole(...item.roles)) return false;
    return true;
  });
});

const selectedKeys = ref<string[]>([]);
const openKeys = ref<string[]>([]);

const pathToKeyMap: Record<string, { key: string; parent?: string }> = {};
for (const item of allMenuItems) {
  if (item.path) pathToKeyMap[item.path] = { key: item.key };
  if (item.children) {
    for (const child of item.children) {
      if (child.path) pathToKeyMap[child.path] = { key: child.key, parent: item.key };
    }
  }
}

function syncMenu() {
  const matched = pathToKeyMap[route.path];
  if (matched) {
    selectedKeys.value = [matched.key];
    if (matched.parent) openKeys.value = [matched.parent];
  }
}

watch(() => route.path, syncMenu, { immediate: true });

function handleMenuClick(menuInfo: { key: string | number }) {
  const menuKey = String(menuInfo.key);
  for (const [path, info] of Object.entries(pathToKeyMap)) {
    if (info.key === menuKey) {
      router.push(path);
      return;
    }
  }
}
</script>

<style scoped lang="less">
.sidebar-inner {
  height: 100%;
  display: flex;
  flex-direction: column;
}
.sidebar-logo {
  height: 64px;
  display: flex;
  align-items: center;
  padding: 0 20px;
  gap: 10px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  &.collapsed {
    justify-content: center;
    padding: 0;
  }
  .logo-icon {
    width: 32px;
    height: 32px;
    flex-shrink: 0;
  }
  .logo-text {
    font-size: 18px;
    font-weight: 700;
    color: #fff;
    white-space: nowrap;
  }
}
</style>
