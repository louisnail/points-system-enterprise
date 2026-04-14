<template>
  <div class="page-container">
    <div class="page-header">
      <h2>黑榜</h2>
      <div style="display: flex; gap: 12px; align-items: center">
        <a-date-picker v-model:value="selectedMonth" picker="month" placeholder="归属月份"
          style="width: 140px" value-format="YYYY-MM" @change="loadAllRankings" />
        <a-button @click="configDrawerVisible = true"><SettingOutlined /> 排名配置</a-button>
      </div>
    </div>

    <a-alert type="warning" :closable="false" show-icon style="margin-bottom: 20px">
      <template #message>以下为积分排名靠后的员工，仅管理员可见，请关注并予以帮助和引导。</template>
    </a-alert>

    <div class="card-box">
      <a-spin :spinning="loading">
        <a-empty v-if="!loading && visibleCards.length === 0" description="暂无活跃榜单" />
        <div v-else class="black-cards-grid">
          <div
            v-for="(card, idx) in visibleCards"
            :key="card.id"
            class="black-card"
            draggable="true"
            @dragstart="onCardDragStart($event, idx)"
            @dragover.prevent="onCardDragOver($event, idx)"
            @drop="onCardDrop($event, idx)"
            @dragend="dragIdx = -1"
            :class="{ 'drag-over': dragOverIdx === idx }"
          >
            <div class="black-card-header">
              <div class="black-card-title">{{ card.name }}</div>
              <a-tag color="rgba(255,255,255,0.15)" style="color: rgba(255,255,255,0.85); border-color: rgba(255,255,255,0.25)">
                倒数{{ getBottomN(card.id) }}名
              </a-tag>
            </div>
            <div class="black-card-body">
              <div v-if="!rankingData[card.id] || rankingData[card.id].length === 0"
                style="text-align: center; color: #bfbfbf; padding: 24px 0">
                暂无排名数据
              </div>
              <div v-for="(item, rank) in (rankingData[card.id] || []).slice(0, getBottomN(card.id))"
                :key="item.userId" class="black-rank-item">
                <span v-if="rank < 3" class="rank-badge" :class="['rank-' + (rank + 1)]">{{ rank + 1 }}</span>
                <span v-else class="rank-num">{{ rank + 1 }}</span>
                <div class="rank-info">
                  <span class="rank-name">{{ item.name }}</span>
                  <span class="rank-dept">{{ item.departmentName || '-' }}</span>
                </div>
                <span class="rank-score">{{ item.totalScore }}</span>
              </div>
            </div>
          </div>
        </div>
      </a-spin>
    </div>

    <!-- 排名配置抽屉 -->
    <a-drawer v-model:open="configDrawerVisible" title="黑榜配置" :width="420" placement="right">
      <a-form layout="vertical" style="margin-bottom: 16px">
        <a-form-item label="配置方式">
          <a-radio-group v-model:value="configMode">
            <a-radio value="count">按人数</a-radio>
            <a-radio value="percent">按比例</a-radio>
          </a-radio-group>
        </a-form-item>
        <a-form-item v-if="configMode === 'count'" label="展示倒数前 N 名">
          <a-input-number v-model:value="configCount" :min="1" :max="100" style="width: 100%" addon-after="人" />
          <div class="config-hint">范围 1~100，当前设置展示倒数前 {{ configCount }} 名</div>
        </a-form-item>
        <a-form-item v-if="configMode === 'percent'" label="展示倒数排名比例">
          <a-input-number v-model:value="configPercent" :min="1" :max="50" style="width: 100%" addon-after="%" />
          <div class="config-hint">范围 1%~50%</div>
        </a-form-item>
        <a-form-item>
          <a-button type="primary" :loading="configSaving" @click="handleSaveConfig" block>保存配置</a-button>
        </a-form-item>
      </a-form>
      <a-divider>榜单显隐</a-divider>
      <div style="display: flex; flex-direction: column; gap: 12px">
        <div v-for="rl in rankingLists" :key="rl.id"
          style="display: flex; align-items: center; padding: 12px 16px; background: #fafafa; border-radius: 8px; border: 1px solid #f0f0f0">
          <a-switch :checked="getConfigVisible(rl.id)" size="small" @change="(v: any) => setConfigVisible(rl.id, !!v)" />
          <span style="flex: 1; margin-left: 12px; font-weight: 500">{{ rl.name }}</span>
          <a-tag v-if="rl.isSecondary" color="purple" style="font-size: 11px; margin-right: 8px">副榜</a-tag>
        </div>
      </div>
      <template #footer>
        <a-button type="primary" block @click="saveVisibleConfig">保存显隐配置</a-button>
      </template>
    </a-drawer>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, reactive, onMounted } from 'vue';
import { message } from 'ant-design-vue';
import { SettingOutlined } from '@ant-design/icons-vue';
import { getMonthlyRanking, getSecondaryRanking } from '@/api/ranking.api';
import { getRankingLists } from '@/api/ranking-list.api';
import { getSystemConfigs, updateSystemConfigs } from '@/api/system.api';

const now = new Date();
const selectedMonth = ref(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`);
const loading = ref(false);
const rankingLists = ref<any[]>([]);
const rankingData = ref<Record<number, any[]>>({});
const configDrawerVisible = ref(false);

// Drag state
const dragIdx = ref(-1);
const dragOverIdx = ref(-1);

// Card order & config persisted in localStorage
const ORDER_KEY = 'black-ranking-card-order';
const CONFIG_KEY = 'black-ranking-config';
const cardOrder = ref<number[]>([]);
const blackConfig = reactive<Record<number, { visible: boolean }>>({});

// Global black list config (saved to system_config)
const configMode = ref<'count' | 'percent'>('count');
const configCount = ref(10);
const configPercent = ref(10);
const configSaving = ref(false);

function loadCardOrder() {
  try {
    const saved = localStorage.getItem(ORDER_KEY);
    if (saved) cardOrder.value = JSON.parse(saved);
  } catch { /* ignore */ }
}

function saveCardOrder() {
  localStorage.setItem(ORDER_KEY, JSON.stringify(cardOrder.value));
}

function loadLocalConfig() {
  try {
    const saved = localStorage.getItem(CONFIG_KEY);
    if (saved) Object.assign(blackConfig, JSON.parse(saved));
  } catch { /* ignore */ }
}

function getConfigVisible(listId: number): boolean {
  return blackConfig[listId]?.visible !== false;
}

function setConfigVisible(listId: number, val: boolean) {
  if (!blackConfig[listId]) blackConfig[listId] = { visible: true };
  blackConfig[listId].visible = val;
}

function getBottomN(_listId: number): number {
  return configMode.value === 'count' ? configCount.value : configPercent.value;
}

function saveVisibleConfig() {
  localStorage.setItem(CONFIG_KEY, JSON.stringify(blackConfig));
  configDrawerVisible.value = false;
  message.success('显隐配置已保存');
  loadAllRankings();
}

const sortedCards = computed(() => {
  const lists = rankingLists.value;
  if (!cardOrder.value.length) return lists;
  const orderMap = new Map(cardOrder.value.map((id, i) => [id, i]));
  return [...lists].sort((a, b) => {
    const oa = orderMap.has(a.id) ? orderMap.get(a.id)! : 999;
    const ob = orderMap.has(b.id) ? orderMap.get(b.id)! : 999;
    return oa - ob;
  });
});

const visibleCards = computed(() => sortedCards.value.filter((c) => getConfigVisible(c.id)));

async function loadBlackConfig() {
  try {
    const res: any = await getSystemConfigs();
    const configs = Array.isArray(res) ? res : res.list || [];
    const modeConfig = configs.find((c: any) => c.configKey === 'ranking.black_list_mode');
    const valueConfig = configs.find((c: any) => c.configKey === 'ranking.black_list_value');
    if (modeConfig) configMode.value = modeConfig.configValue as 'count' | 'percent';
    if (valueConfig) {
      const val = Number(valueConfig.configValue) || 10;
      if (configMode.value === 'count') configCount.value = val;
      else configPercent.value = val;
    }
  } catch { /* use defaults */ }
}

async function loadAllRankings() {
  const lists = rankingLists.value.filter((rl) => getConfigVisible(rl.id));
  if (!selectedMonth.value || !lists.length) return;
  loading.value = true;
  try {
    const results = await Promise.all(
      lists.map(async (list) => {
        try {
          const apiFn = list.isSecondary ? getSecondaryRanking : getMonthlyRanking;
          const res: any = await apiFn({
            belongMonth: selectedMonth.value,
            rankingListId: list.id,
          });
          const allRankings: any[] = Array.isArray(res) ? res : res.list || [];
          // Sort ascending (lowest score first)
          allRankings.sort((a, b) => a.totalScore - b.totalScore);
          // Determine how many to take
          let takeCount = configCount.value;
          if (configMode.value === 'percent') {
            takeCount = Math.ceil(allRankings.length * configPercent.value / 100);
          }
          takeCount = Math.min(takeCount, allRankings.length);
          // Take bottom N and assign descending rank
          const bottom = allRankings.slice(0, takeCount).map((item, idx) => ({
            ...item,
            ranking: idx + 1,
          }));
          return { id: list.id, data: bottom };
        } catch {
          return { id: list.id, data: [] };
        }
      }),
    );
    const newData: Record<number, any[]> = {};
    for (const r of results) {
      newData[r.id] = r.data;
    }
    rankingData.value = newData;
  } finally {
    loading.value = false;
  }
}

async function handleSaveConfig() {
  configSaving.value = true;
  try {
    await updateSystemConfigs([
      { configKey: 'ranking.black_list_mode', configValue: configMode.value },
      { configKey: 'ranking.black_list_value', configValue: String(configMode.value === 'count' ? configCount.value : configPercent.value) },
    ]);
    message.success('黑榜配置已保存');
    await loadAllRankings();
  } catch {
    message.error('保存失败，请重试');
  } finally {
    configSaving.value = false;
  }
}

// Native HTML5 Drag & Drop
function onCardDragStart(e: DragEvent, idx: number) {
  dragIdx.value = idx;
  if (e.dataTransfer) {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(idx));
  }
}

function onCardDragOver(_e: DragEvent, idx: number) {
  dragOverIdx.value = idx;
}

function onCardDrop(_e: DragEvent, toIdx: number) {
  dragOverIdx.value = -1;
  const fromIdx = dragIdx.value;
  if (fromIdx < 0 || fromIdx === toIdx) return;
  const cards = visibleCards.value.map((c) => c.id);
  const [moved] = cards.splice(fromIdx, 1);
  cards.splice(toIdx, 0, moved);
  cardOrder.value = cards;
  saveCardOrder();
}

onMounted(async () => {
  loadCardOrder();
  loadLocalConfig();
  await loadBlackConfig();
  try {
    const res: any = await getRankingLists();
    rankingLists.value = (Array.isArray(res) ? res : res.list || []).filter((rl: any) => rl.isActive !== 0 || rl.isSecondary === 1);
    for (const rl of rankingLists.value) {
      if (!blackConfig[rl.id]) {
        blackConfig[rl.id] = { visible: true };
      }
    }
    if (!cardOrder.value.length) {
      cardOrder.value = rankingLists.value.map((rl: any) => rl.id);
    }
  } catch { /* ignore */ }
  loadAllRankings();
});
</script>

<style scoped lang="less">
.black-cards-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 20px;
}

.black-card {
  background: #fff;
  border: 1px solid #e8e8e8;
  border-radius: 12px;
  overflow: hidden;
  transition: box-shadow 0.3s, opacity 0.2s;
  cursor: grab;

  &:hover {
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
  }

  &.drag-over {
    border-color: #434343;
    box-shadow: 0 0 0 2px rgba(67, 67, 67, 0.25);
  }

  &:active {
    cursor: grabbing;
  }
}

.black-card-header {
  background: linear-gradient(135deg, #1a1a2e, #16213e);
  padding: 16px 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.black-card-title {
  font-size: 16px;
  font-weight: 700;
  color: #fff;
}

.black-card-body {
  padding: 12px 16px;
}

.black-rank-item {
  display: flex;
  align-items: center;
  padding: 10px 4px;
  border-bottom: 1px solid #f5f5f5;
  gap: 12px;

  &:last-child {
    border-bottom: none;
  }
}

// 灰度警告风格徽章（倒数排名，非荣誉色）
.rank-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  color: #fff;
  font-weight: 700;
  font-size: 13px;
  flex-shrink: 0;

  &.rank-1 { background: #434343; }
  &.rank-2 { background: #595959; }
  &.rank-3 { background: #8c8c8c; }
}

.rank-num {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  font-weight: 600;
  color: #8c8c8c;
  font-size: 14px;
  flex-shrink: 0;
}

.rank-info {
  flex: 1;
  min-width: 0;
}

.rank-name {
  font-weight: 600;
  font-size: 14px;
  color: #1e293b;
  margin-right: 8px;
}

.rank-dept {
  font-size: 12px;
  color: #8c8c8c;
}

.rank-score {
  font-weight: 700;
  font-size: 15px;
  color: #ff4d4f;
  flex-shrink: 0;
}

.config-hint {
  margin-top: 6px;
  font-size: 12px;
  color: #8c8c8c;
}
</style>
