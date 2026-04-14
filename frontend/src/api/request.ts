import axios from 'axios';
import { message } from 'ant-design-vue';
import router from '@/router';

const request = axios.create({
  baseURL: '/api',
  timeout: 30000,
});

request.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Token 刷新锁，防止多个并发 401 触发重复刷新
let isRefreshing = false;
let pendingRequests: Array<(token: string) => void> = [];

function onRefreshed(newToken: string) {
  pendingRequests.forEach((cb) => cb(newToken));
  pendingRequests = [];
}

request.interceptors.response.use(
  (response) => {
    const res = response.data;
    if (res.code !== undefined && res.code !== 0) {
      message.error(res.message || '请求失败');
      return Promise.reject(new Error(res.message));
    }
    return res.data !== undefined ? res.data : res;
  },
  async (error) => {
    if (error.response?.status === 401) {
      const refreshToken = localStorage.getItem('refresh_token');
      if (refreshToken && !error.config._retry) {
        error.config._retry = true;

        if (isRefreshing) {
          // 已有刷新请求在进行中，排队等待
          return new Promise((resolve) => {
            pendingRequests.push((newToken: string) => {
              error.config.headers.Authorization = `Bearer ${newToken}`;
              resolve(request(error.config));
            });
          });
        }

        isRefreshing = true;
        try {
          const res = await axios.post('/api/auth/refresh', { refreshToken });
          const newToken = res.data?.data?.accessToken || res.data?.accessToken;
          if (newToken) {
            localStorage.setItem('access_token', newToken);
            error.config.headers.Authorization = `Bearer ${newToken}`;
            onRefreshed(newToken);
            return request(error.config);
          }
        } catch {
          // refresh failed
        } finally {
          isRefreshing = false;
        }
      }
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('user_info');
      pendingRequests = [];
      router.push('/login');
      message.error('登录已过期，请重新登录');
    } else {
      const msg = error.response?.data?.message || error.message || '网络错误';
      message.error(msg);
    }
    return Promise.reject(error);
  },
);

export default request;
