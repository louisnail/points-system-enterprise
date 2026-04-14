<template>
  <div class="login-page">
    <div class="login-card">
      <div class="login-header">
        <img src="/logo.svg" alt="logo" class="login-logo" />
        <h1>积分管理系统-企业版</h1>
        <p>TD / TY / WB 统一积分评价平台</p>
      </div>
      <a-form :model="form" @finish="handleLogin" layout="vertical">
        <a-form-item label="工号" name="employeeNo" :rules="[{ required: true, message: '请输入工号' }]">
          <a-input v-model:value="form.employeeNo" size="large" placeholder="请输入工号" />
        </a-form-item>
        <a-form-item label="密码" name="password" :rules="[{ required: true, message: '请输入密码' }]">
          <a-input-password v-model:value="form.password" size="large" placeholder="请输入密码" />
        </a-form-item>
        <a-form-item>
          <a-button type="primary" html-type="submit" size="large" block :loading="loading">登 录</a-button>
        </a-form-item>
      </a-form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import { message } from 'ant-design-vue';
import { useAuthStore } from '@/stores/auth.store';

const router = useRouter();
const authStore = useAuthStore();
const loading = ref(false);
const form = reactive({ employeeNo: '', password: '' });

async function handleLogin() {
  loading.value = true;
  try {
    await authStore.login(form.employeeNo, form.password);
    message.success('登录成功');
    router.push('/dashboard');
  } catch (e: any) {
    // error handled in interceptor
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped lang="less">
.login-page {
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}
.login-card {
  width: 420px;
  background: #fff;
  border-radius: 12px;
  padding: 40px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
}
.login-header {
  text-align: center;
  margin-bottom: 32px;
  .login-logo {
    width: 56px;
    height: 56px;
    margin-bottom: 12px;
  }
  h1 {
    font-size: 24px;
    font-weight: 700;
    color: #262626;
    margin: 0 0 4px;
  }
  p {
    font-size: 14px;
    color: #8c8c8c;
    margin: 0;
  }
}
</style>
