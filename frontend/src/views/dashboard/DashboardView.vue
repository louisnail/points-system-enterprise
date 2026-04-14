<template>
  <div class="page-container">
    <div class="page-header"><h2>工作台</h2></div>

    <!-- 欢迎栏 -->
    <div class="welcome-bar card-box" style="margin-bottom: 16px">
      <div class="welcome-bar__left">
        <a-avatar :size="48" style="background-color: #1890ff; margin-right: 12px">
          {{ userInfo?.name?.charAt(0) || '?' }}
        </a-avatar>
        <div>
          <div style="font-size: 16px; font-weight: 500">{{ greetingText }}，{{ userInfo?.name || '用户' }}</div>
          <div style="color: #8c8c8c; font-size: 13px; margin-top: 2px">
            {{ userInfo?.departmentName || '-' }}
            <a-tag v-if="userInfo?.companyBelong" :color="orgColorMap[userInfo.companyBelong]" style="margin-left: 6px">{{ userInfo.companyBelong }}</a-tag>
            <a-tag v-if="userInfo?.role" color="blue" style="margin-left: 2px">{{ roleLabel }}</a-tag>
          </div>
        </div>
      </div>
      <div class="welcome-bar__right" v-if="isSuperAdmin || isAdmin">
        <a-statistic title="待审核积分" :value="pendingAuditCount" :value-style="{ color: pendingAuditCount > 0 ? '#fa8c16' : '#52c41a', fontSize: '20px' }">
          <template #suffix v-if="pendingAuditCount > 0">
            <router-link to="/point/audit" style="font-size: 12px; margin-left: 6px">去处理</router-link>
          </template>
        </a-statistic>
      </div>
    </div>

    <!-- 统计卡片 -->
    <a-spin :spinning="loading">
      <a-row :gutter="16" style="margin-bottom: 24px">
        <a-col :span="6" v-for="stat in stats" :key="stat.label">
          <div class="stat-card" @click="stat.path && $router.push(stat.path)">
            <div class="stat-card__icon" :style="{ background: stat.bgColor }">
              <component :is="stat.icon" :style="{ color: stat.color, fontSize: '22px' }" />
            </div>
            <div class="stat-card__info">
              <div class="stat-value" :style="{ color: stat.color }">{{ stat.value }}</div>
              <div class="stat-label">{{ stat.label }}</div>
            </div>
          </div>
        </a-col>
      </a-row>
    </a-spin>

    <!-- 快捷入口 + 系统概况 -->
    <a-row :gutter="16">
      <a-col :span="14">
        <div class="card-box" style="min-height: 200px">
          <strong style="display: block; margin-bottom: 12px">快捷入口</strong>
          <div class="quick-links">
            <router-link v-for="link in quickLinks" :key="link.path" :to="link.path" class="quick-link-item">
              <component :is="link.icon" class="quick-link-item__icon" />
              <span>{{ link.label }}</span>
            </router-link>
          </div>
        </div>
      </a-col>
      <a-col :span="10">
        <div class="card-box" style="min-height: 200px">
          <strong style="display: block; margin-bottom: 12px">系统概况</strong>
          <a-descriptions :column="1" size="small">
            <a-descriptions-item label="系统版本">v2.1（Phase 4 开发中）</a-descriptions-item>
            <a-descriptions-item label="融合公司">TD / XD / TY / WB</a-descriptions-item>
            <a-descriptions-item label="已实现">
              员工管理、部门管理、指标库、积分录入、审核流程、排名计算、驾驶舱
            </a-descriptions-item>
            <a-descriptions-item label="当前月份">{{ currentMonth }}</a-descriptions-item>
          </a-descriptions>
        </div>
      </a-col>
    </a-row>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, h } from 'vue';
import {
  TeamOutlined,
  FileTextOutlined,
  UnorderedListOutlined,
  TrophyOutlined,
  FormOutlined,
  AuditOutlined,
  BarChartOutlined,
  DashboardOutlined,
  SyncOutlined,
  ApartmentOutlined,
} from '@ant-design/icons-vue';
import { useAuthStore } from '@/stores/auth.store';
import { getUsers } from '@/api/user.api';
import { getPoints } from '@/api/point.api';
import { getIndicators } from '@/api/indicator.api';
import { getRankingLists } from '@/api/ranking-list.api';

const authStore = useAuthStore();
const userInfo = computed(() => authStore.userInfo);
const isAdmin = computed(() => authStore.isAdmin);
const isSuperAdmin = computed(() => authStore.isSuperAdmin);

const orgColorMap: Record<string, string> = { TD: 'blue', XD: 'green', TY: 'purple', WB: 'orange' };
const roleMap: Record<string, string> = { super_admin: '超级管理员', dept_admin: '部门管理员', employee: '普通员工' };
const roleLabel = computed(() => roleMap[userInfo.value?.role || ''] || userInfo.value?.role || '');

// 当前月份
const now = new Date();
const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

// 问候语
const greetingText = computed(() => {
  const hour = new Date().getHours();
  if (hour < 9) return '早上好';
  if (hour < 12) return '上午好';
  if (hour < 14) return '中午好';
  if (hour < 18) return '下午好';
  return '晚上好';
});

// 统计数据
const loading = ref(false);
const activeUserCount = ref(0);
const monthEntryCount = ref(0);
const indicatorCount = ref(0);
const rankingListCount = ref(0);
const pendingAuditCount = ref(0);

const stats = computed(() => [
  {
    label: '在职员工',
    value: activeUserCount.value,
    color: '#1890ff',
    bgColor: '#e6f7ff',
    icon: TeamOutlined,
    path: '/user/current',
  },
  {
    label: '本月录入',
    value: monthEntryCount.value,
    color: '#52c41a',
    bgColor: '#f6ffed',
    icon: FileTextOutlined,
    path: '/point/entry',
  },
  {
    label: '指标总数',
    value: indicatorCount.value,
    color: '#faad14',
    bgColor: '#fffbe6',
    icon: UnorderedListOutlined,
    path: '/indicator/list',
  },
  {
    label: '榜单数量',
    value: rankingListCount.value,
    color: '#722ed1',
    bgColor: '#f9f0ff',
    icon: TrophyOutlined,
    path: '/ranking-list',
  },
]);

// 快捷入口
const quickLinks = computed(() => {
  const links = [
    { label: '积分录入', path: '/point/entry', icon: FormOutlined },
    { label: '积分审核', path: '/point/audit', icon: AuditOutlined },
    { label: '排名查看', path: '/ranking/monthly', icon: BarChartOutlined },
    { label: '过程分维护', path: '/point/process', icon: SyncOutlined },
    { label: '管理驾驶舱', path: '/cockpit', icon: DashboardOutlined },
    { label: '部门管理', path: '/department', icon: ApartmentOutlined },
  ];
  return links;
});

// 加载统计数据
async function loadStats() {
  loading.value = true;
  try {
    const [usersRes, pointsRes, indicatorsRes, rankingListsRes, pendingRes] = await Promise.allSettled([
      getUsers({ status: 1, page: 1, pageSize: 1 }),
      getPoints({ belongMonth: currentMonth, page: 1, pageSize: 1 }),
      getIndicators({ page: 1, pageSize: 1 }),
      getRankingLists(),
      getPoints({ auditStatus: 0, page: 1, pageSize: 1 }),
    ]);

    if (usersRes.status === 'fulfilled') {
      const data = usersRes.value as any;
      activeUserCount.value = data?.total ?? 0;
    }
    if (pointsRes.status === 'fulfilled') {
      const data = pointsRes.value as any;
      monthEntryCount.value = data?.total ?? 0;
    }
    if (indicatorsRes.status === 'fulfilled') {
      const data = indicatorsRes.value as any;
      indicatorCount.value = data?.total ?? (Array.isArray(data) ? data.length : 0);
    }
    if (rankingListsRes.status === 'fulfilled') {
      const data = rankingListsRes.value as any;
      rankingListCount.value = Array.isArray(data) ? data.length : (data?.total ?? 0);
    }
    if (pendingRes.status === 'fulfilled') {
      const data = pendingRes.value as any;
      pendingAuditCount.value = data?.total ?? 0;
    }
  } finally {
    loading.value = false;
  }
}

onMounted(loadStats);
</script>

<style scoped lang="less">
.welcome-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;

  &__left {
    display: flex;
    align-items: center;
  }

  &__right {
    text-align: right;
  }
}

.stat-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 20px;
  background: #fff;
  border-radius: 6px;
  border: 1px solid #f0f0f0;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
    border-color: #d9d9d9;
  }

  &__icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 48px;
    height: 48px;
    border-radius: 8px;
    flex-shrink: 0;
  }

  &__info {
    flex: 1;
    min-width: 0;
  }
}

.stat-value {
  font-size: 24px;
  font-weight: 600;
  line-height: 1.2;
}

.stat-label {
  font-size: 13px;
  color: #8c8c8c;
  margin-top: 2px;
}

.quick-links {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}

.quick-link-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 16px 8px;
  border-radius: 6px;
  background: #fafafa;
  border: 1px solid #f0f0f0;
  color: #595959;
  font-size: 13px;
  transition: all 0.2s;
  text-decoration: none;

  &:hover {
    background: #e6f4ff;
    border-color: #91caff;
    color: #1890ff;
  }

  &__icon {
    font-size: 22px;
    color: #1890ff;
  }
}
</style>
