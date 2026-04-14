<template>
  <div class="page-container">
    <div class="page-header"><h2>系统配置</h2></div>
    <div class="card-box">
      <a-form layout="vertical" v-if="configs.length">
        <a-divider orientation="left">排名设置</a-divider>
        <a-row :gutter="16">
          <a-col :span="8" v-for="c in rankingConfigs" :key="c.configKey">
            <a-form-item :label="c.description">
              <a-input v-model:value="c.configValue" />
            </a-form-item>
          </a-col>
        </a-row>
        <a-divider orientation="left">积分设置</a-divider>
        <a-row :gutter="16">
          <a-col :span="8" v-for="c in pointConfigs" :key="c.configKey">
            <a-form-item :label="c.description">
              <a-input v-model:value="c.configValue" />
            </a-form-item>
          </a-col>
        </a-row>
        <a-divider orientation="left">系统信息</a-divider>
        <a-row :gutter="16">
          <a-col :span="8" v-for="c in systemConfigs" :key="c.configKey">
            <a-form-item :label="c.description">
              <a-input v-model:value="c.configValue" />
            </a-form-item>
          </a-col>
        </a-row>
        <a-form-item>
          <a-button type="primary" :loading="saving" @click="handleSave">保存配置</a-button>
        </a-form-item>
      </a-form>
      <a-spin v-else />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { message } from 'ant-design-vue';
import { getSystemConfigs, updateSystemConfigs } from '@/api/system.api';

// --- 系统配置 ---
const configs = ref<any[]>([]);
const saving = ref(false);

const rankingConfigs = computed(() => configs.value.filter((c) => c.configKey.startsWith('ranking.')));
const pointConfigs = computed(() => configs.value.filter((c) => c.configKey.startsWith('point.') || c.configKey.startsWith('process_point.')));
const systemConfigs = computed(() => configs.value.filter((c) => c.configKey.startsWith('system.')));

async function handleSave() {
  saving.value = true;
  try {
    await updateSystemConfigs(configs.value.map((c: any) => ({ configKey: c.configKey, configValue: c.configValue })));
    message.success('配置已保存');
  } finally {
    saving.value = false;
  }
}

onMounted(async () => {
  configs.value = await getSystemConfigs() as any;
});
</script>
