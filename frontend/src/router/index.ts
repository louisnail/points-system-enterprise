import { createRouter, createWebHistory } from 'vue-router';
import type { RouteRecordRaw } from 'vue-router';

const routes: RouteRecordRaw[] = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/login/LoginView.vue'),
    meta: { title: '登录', public: true },
  },
  {
    path: '/display',
    name: 'DisplayScreen',
    component: () => import('@/views/ranking/DisplayScreen.vue'),
    meta: { title: '展示大屏', public: true },
  },
  {
    path: '/quarter-star-share',
    name: 'QuarterStarShare',
    component: () => import('@/views/ranking/QuarterStarShare.vue'),
    meta: { title: '季度之星', public: true },
  },
  {
    path: '/',
    component: () => import('@/views/layout/MainLayout.vue'),
    redirect: '/dashboard',
    children: [
      {
        path: 'dashboard',
        name: 'Dashboard',
        component: () => import('@/views/dashboard/DashboardView.vue'),
        meta: { title: '工作台', icon: 'DashboardOutlined', group: '' },
      },
      // 人员管理
      {
        path: 'user/current',
        name: 'CurrentUserList',
        component: () => import('@/views/user/CurrentUserList.vue'),
        meta: { title: '员工管理', icon: 'TeamOutlined', group: '人员管理' },
      },
      {
        path: 'user/history',
        name: 'HistoryUserList',
        component: () => import('@/views/user/HistoryUserList.vue'),
        meta: { title: '历史员工', icon: 'SolutionOutlined', group: '人员管理' },
      },
      {
        path: 'department',
        name: 'Department',
        component: () => import('@/views/department/DepartmentManage.vue'),
        meta: { title: '部门管理', icon: 'ApartmentOutlined', group: '人员管理' },
      },
      // 榜单管理 (under 人员管理 group)
      {
        path: 'ranking-list',
        name: 'RankingList',
        component: () => import('@/views/ranking-list/RankingListManage.vue'),
        meta: { title: '榜单配置', icon: 'OrderedListOutlined', group: '人员管理', roles: ['super_admin'] },
      },
      // 指标库管理
      {
        path: 'indicator/category',
        name: 'IndicatorCategory',
        component: () => import('@/views/indicator/CategoryManage.vue'),
        meta: { title: '分类管理', icon: 'AppstoreOutlined', group: '指标库管理' },
      },
      {
        path: 'indicator/list',
        name: 'IndicatorList',
        component: () => import('@/views/indicator/IndicatorList.vue'),
        meta: { title: '指标列表', icon: 'UnorderedListOutlined', group: '指标库管理' },
      },
      // 积分管理
      {
        path: 'point/entry',
        name: 'PointEntry',
        component: () => import('@/views/point/QuickEntry.vue'),
        meta: { title: '积分录入', icon: 'FormOutlined', group: '积分管理' },
      },
      {
        path: 'point/process',
        name: 'ProcessMaintain',
        component: () => import('@/views/point/ProcessMaintain.vue'),
        meta: { title: '过程分维护', icon: 'SyncOutlined', group: '积分管理' },
      },
      {
        path: 'point/audit',
        name: 'PointAudit',
        component: () => import('@/views/point/AuditList.vue'),
        meta: { title: '积分审核', icon: 'AuditOutlined', group: '积分管理' },
      },
      {
        path: 'point/detail',
        name: 'PointDetail',
        component: () => import('@/views/point/PointDetail.vue'),
        meta: { title: '积分明细', icon: 'ProfileOutlined', group: '积分管理' },
      },
      // 排名展示
      {
        path: 'ranking/monthly',
        name: 'MonthlyRanking',
        component: () => import('@/views/ranking/MonthlyRanking.vue'),
        meta: { title: '积分与排名', icon: 'BarChartOutlined', group: '排名展示' },
      },
      {
        path: 'ranking/black',
        name: 'BlackRanking',
        component: () => import('@/views/ranking/BlackRanking.vue'),
        meta: { title: '黑榜', icon: 'WarningOutlined', group: '排名展示', roles: ['super_admin', 'dept_admin'] },
      },
      {
        path: 'ranking/quarter-star',
        name: 'QuarterStar',
        component: () => import('@/views/ranking/QuarterStar.vue'),
        meta: { title: '季度之星', icon: 'TrophyOutlined', group: '排名展示' },
      },
      {
        path: 'ranking/red',
        name: 'RedRanking',
        component: () => import('@/views/ranking/RedRanking.vue'),
        meta: { title: '红榜', icon: 'FireOutlined', group: '排名展示' },
      },
      {
        path: 'ranking/award',
        name: 'AwardManage',
        component: () => import('@/views/ranking/AwardManage.vue'),
        meta: { title: '评奖', icon: 'GiftOutlined', group: '排名展示' },
      },
      // 管理驾驶舱
      {
        path: 'cockpit',
        name: 'Cockpit',
        component: () => import('@/views/cockpit/CockpitView.vue'),
        meta: { title: '管理驾驶舱', icon: 'DashboardOutlined', group: '管理驾驶舱', roles: ['super_admin', 'dept_admin'] },
      },
      // 系统管理
      {
        path: 'system/role',
        name: 'RoleManage',
        component: () => import('@/views/system/RoleManage.vue'),
        meta: { title: '角色管理', icon: 'SafetyOutlined', group: '系统管理', roles: ['super_admin'] },
      },
      {
        path: 'system/config',
        name: 'ConfigManage',
        component: () => import('@/views/system/ConfigManage.vue'),
        meta: { title: '系统配置', icon: 'SettingOutlined', group: '系统管理', roles: ['super_admin'] },
      },
      {
        path: 'system/score-profile',
        name: 'ScoreProfileConfig',
        component: () => import('@/views/system/ScoreProfileConfig.vue'),
        meta: { title: '积分画像配置', icon: 'RadarChartOutlined', group: '系统管理', roles: ['super_admin'] },
      },
    ],
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

router.beforeEach((to, _from, next) => {
  const token = localStorage.getItem('access_token');
  if (!to.meta.public && !token) {
    next('/login');
  } else if (to.path === '/login' && token) {
    next('/dashboard');
  } else {
    // 角色校验：路由声明了 roles 时，检查当前用户角色是否匹配
    const requiredRoles = to.meta.roles as string[] | undefined;
    if (requiredRoles && requiredRoles.length > 0) {
      try {
        const userInfoStr = localStorage.getItem('user_info');
        const userInfo = userInfoStr ? JSON.parse(userInfoStr) : null;
        const userRole = userInfo?.role || '';
        if (!requiredRoles.includes(userRole)) {
          next('/dashboard');
          return;
        }
      } catch {
        next('/dashboard');
        return;
      }
    }
    document.title = `${to.meta.title || '积分系统'} - 积分管理系统-企业版`;
    next();
  }
});

export default router;
