import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { login as loginApi, logout as logoutApi } from '@/api/auth.api';
import router from '@/router';

export interface UserInfo {
  id: number;
  employeeNo: string;
  name: string;
  displayName: string;
  role: string;
  departmentId: number;
  departmentName: string;
  companyBelong: string;
}

export const useAuthStore = defineStore('auth', () => {
  const token = ref(localStorage.getItem('access_token') || '');

  let parsedUserInfo: UserInfo | null = null;
  try {
    const raw = localStorage.getItem('user_info');
    parsedUserInfo = raw ? JSON.parse(raw) : null;
  } catch {
    parsedUserInfo = null;
    localStorage.removeItem('user_info');
  }
  const userInfo = ref<UserInfo | null>(parsedUserInfo);

  const isLoggedIn = computed(() => !!token.value);
  const role = computed(() => userInfo.value?.role || '');
  const isAdmin = computed(() => ['super_admin', 'dept_admin'].includes(role.value));
  const isSuperAdmin = computed(() => role.value === 'super_admin');

  async function login(employeeNo: string, password: string) {
    const res: any = await loginApi({ employeeNo, password });
    token.value = res.accessToken;
    userInfo.value = res.user;
    localStorage.setItem('access_token', res.accessToken);
    localStorage.setItem('refresh_token', res.refreshToken);
    localStorage.setItem('user_info', JSON.stringify(res.user));
  }

  async function logout() {
    try {
      await logoutApi();
    } catch { /* ignore */ }
    token.value = '';
    userInfo.value = null;
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user_info');
    router.push('/login');
  }

  function hasRole(...roles: string[]) {
    return roles.includes(role.value);
  }

  return { token, userInfo, isLoggedIn, role, isAdmin, isSuperAdmin, login, logout, hasRole };
});
