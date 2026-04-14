<template>
  <div class="page-container">
    <div class="page-header">
      <h2>红榜</h2>
      <div style="display: flex; gap: 12px; align-items: center">
        <a-date-picker v-model:value="selectedMonth" picker="month" placeholder="归属月份"
          style="width: 140px" value-format="YYYY-MM" @change="loadAllRankings" />
        <a-button @click="configDrawerVisible = true"><SettingOutlined /> 榜单配置</a-button>
      </div>
    </div>

    <div class="card-box">
      <a-spin :spinning="loading">
        <a-empty v-if="!loading && visibleCards.length === 0" description="暂无活跃榜单" />
        <div v-else class="red-cards-grid">
          <div
            v-for="(card, idx) in visibleCards"
            :key="card.id"
            class="red-card"
            draggable="true"
            @dragstart="onCardDragStart($event, idx)"
            @dragover.prevent="onCardDragOver($event, idx)"
            @drop="onCardDrop($event, idx)"
            @dragend="dragIdx = -1"
            :class="{ 'drag-over': dragOverIdx === idx }"
          >
            <div class="red-card-header">
              <div class="red-card-title">{{ card.name }}</div>
              <a-tag color="#fff1f0" style="color: #ff4d4f; border-color: #ffa39e">前{{ getTopN(card.id) }}名</a-tag>
            </div>
            <div class="red-card-body">
              <div v-if="!rankingData[card.id] || rankingData[card.id].length === 0" style="text-align: center; color: #bfbfbf; padding: 24px 0">
                暂无排名数据
              </div>
              <div v-for="(item, rank) in (rankingData[card.id] || []).slice(0, getTopN(card.id))" :key="item.userId" class="red-rank-item">
                <span v-if="rank < 3" class="rank-badge" :class="['rank-' + (rank + 1)]">{{ rank + 1 }}</span>
                <span v-else class="rank-num">{{ rank + 1 }}</span>
                <div class="rank-info">
                  <span class="rank-name">{{ item.name }}</span>
                  <span class="rank-dept">{{ item.departmentName || '-' }}</span>
                </div>
                <span class="rank-score" :style="{ color: item.totalScore >= 0 ? '#ff4d4f' : '#595959' }">
                  {{ item.totalScore }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </a-spin>
    </div>

    <!-- 榜单配置抽屉 -->
    <a-drawer v-model:open="configDrawerVisible" title="红榜配置" :width="420" placement="right">
      <div style="margin-bottom: 12px; color: #8c8c8c; font-size: 13px">设置各榜单是否在红榜展示，以及展示排名前几名</div>
      <div style="display: flex; flex-direction: column; gap: 12px">
        <div v-for="rl in rankingLists" :key="rl.id"
          style="display: flex; align-items: center; padding: 12px 16px; background: #fafafa; border-radius: 8px; border: 1px solid #f0f0f0">
          <a-switch :checked="getConfigVisible(rl.id)" size="small" @change="(v: any) => setConfigVisible(rl.id, !!v)" />
          <span style="flex: 1; margin-left: 12px; font-weight: 500">{{ rl.name }}</span>
          <a-tag v-if="rl.isSecondary" color="purple" style="font-size: 11px; margin-right: 8px">副榜</a-tag>
          <span style="color: #8c8c8c; font-size: 12px; margin-right: 8px">前</span>
          <a-input-number :value="getTopN(rl.id)" :min="1" :max="50" size="small" style="width: 70px"
            @change="(v: any) => setConfigTopN(rl.id, Number(v) || 5)" />
          <span style="color: #8c8c8c; font-size: 12px; margin-left: 4px">名</span>
        </div>
      </div>
      <template #footer>
        <a-button type="primary" block @click="saveConfig">保存配置</a-button>
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

const now = new Date();
const selectedMonth = ref(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`);
const loading = ref(false);
const rankingLists = ref<any[]>([]);
const rankingData = ref<Record<number, any[]>>({});
const configDrawerVisible = ref(false);

// Drag state
const dragIdx = ref(-1);
const dragOverIdx = ref(-1);

// Card order persisted in localStorage
const ORDER_KEY = 'red-ranking-card-order';
const CONFIG_KEY = 'red-ranking-config';
const cardOrder = ref<number[]>([]);

// Config: { [listId]: { visible: boolean, topN: number } }
const redConfig = reactive<Record<number, { visible: boolean; topN: number }>>({});

function loadCardOrder() {
  try {
    const saved = localStorage.getItem(ORDER_KEY);
    if (saved) cardOrder.value = JSON.parse(saved);
  } catch { /* ignore */ }
}

function saveCardOrder() {
  localStorage.setItem(ORDER_KEY, JSON.stringify(cardOrder.value));
}

function loadConfig() {
  try {
    const saved = localStorage.getItem(CONFIG_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      Object.assign(redConfig, parsed);
    }
  } catch { /* ignore */ }
}

function getConfigVisible(listId: number): boolean {
  return redConfig[listId]?.visible !== false;
}

function setConfigVisible(listId: number, val: boolean) {
  if (!redConfig[listId]) redConfig[listId] = { visible: true, topN: 10 };
  redConfig[listId].visible = val;
}

function getTopN(listId: number): number {
  if (redConfig[listId]?.topN) return redConfig[listId].topN;
  const rl = rankingLists.value.find((r) => r.id === listId);
  return rl?.topN || 10;
}

function setConfigTopN(listId: number, val: number) {
  if (!redConfig[listId]) redConfig[listId] = { visible: true, topN: 10 };
  redConfig[listId].topN = val || 10;
}

function saveConfig() {
  localStorage.setItem(CONFIG_KEY, JSON.stringify(redConfig));
  configDrawerVisible.value = false;
  message.success('红榜配置已保存');
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
          return { id: list.id, data: Array.isArray(res) ? res : res.list || [] };
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
  loadConfig();
  try {
    const res: any = await getRankingLists();
    rankingLists.value = (Array.isArray(res) ? res : res.list || []).filter((rl: any) => rl.isActive !== 0 || rl.isSecondary === 1);
    // Init config for new lists
    for (const rl of rankingLists.value) {
      if (!redConfig[rl.id]) {
        redConfig[rl.id] = { visible: true, topN: rl.topN || 10 };
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
.red-cards-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 20px;
}

.red-card {
  background: #fff;
  border: 1px solid #f0f0f0;
  border-radius: 12px;
  overflow: hidden;
  transition: box-shadow 0.3s, opacity 0.2s;
  cursor: grab;

  &:hover {
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
  }

  &.drag-over {
    border-color: #ff4d4f;
    box-shadow: 0 0 0 2px rgba(255, 77, 79, 0.2);
  }

  &:active {
    cursor: grabbing;
  }
}

.red-card-header {
  background: linear-gradient(135deg, #ff4d4f, #ff7875);
  padding: 16px 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.red-card-title {
  font-size: 16px;
  font-weight: 700;
  color: #fff;
}

.red-card-body {
  padding: 12px 16px;
}

.red-rank-item {
  display: flex;
  align-items: center;
  padding: 10px 4px;
  border-bottom: 1px solid #f5f5f5;
  gap: 12px;

  &:last-child {
    border-bottom: none;
  }
}

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

  &.rank-1 { background: #faad14; }
  &.rank-2 { background: #bfbfbf; }
  &.rank-3 { background: #d48806; }
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
  flex-shrink: 0;
}
</style>
