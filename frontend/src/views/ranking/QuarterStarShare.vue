<template>
  <div class="share-page">
    <div class="share-header">
      <h1 class="share-title">季度之星</h1>
      <div class="share-header-right">
        <a-select v-model:value="selectedQuarter" style="width: 140px" @change="loadStars">
          <a-select-option v-for="q in quarterOptions" :key="q" :value="q">{{ q }}</a-select-option>
        </a-select>
        <a-button @click="handleDownloadImage" :loading="downloading">
          <DownloadOutlined /> 下载图片
        </a-button>
      </div>
    </div>

    <div ref="captureRef" class="share-content">
      <a-spin :spinning="loading">
        <div v-if="!loading && visibleCards.length === 0" style="text-align: center; padding: 80px 0; color: #8c8c8c">
          <a-empty :description="stars.length === 0 ? '该季度暂无已发布的季度之星' : '暂无数据'" />
        </div>
        <div v-else class="star-cards-grid">
          <div
            v-for="card in visibleCards"
            :key="card.listId"
            class="star-card-wrapper"
          >
            <div class="star-card-header" :style="{ background: card.color }">
              <div class="star-card-title">{{ card.name }}</div>
              <span class="star-card-count">{{ card.stars.length }} 人</span>
            </div>
            <div class="star-card-body">
              <div v-if="card.stars.length === 0" style="text-align: center; color: #bfbfbf; padding: 24px 0">
                暂无季度之星
              </div>
              <div v-for="star in card.stars" :key="star.id" class="star-rank-item">
                <!-- 排名：1-3 金银铜奖章 SVG -->
                <template v-if="star.displayOrder <= 3">
                  <svg class="star-medal" :class="['gold','silver','bronze'][star.displayOrder - 1]"
                       viewBox="0 0 40 48" width="32" height="36">
                    <defs>
                      <linearGradient :id="'medal-s-' + star.id" x1="0" y1="0" x2="1" y2="1">
                        <stop offset="0%" :stop-color="medalColors(star.displayOrder).from" />
                        <stop offset="100%" :stop-color="medalColors(star.displayOrder).to" />
                      </linearGradient>
                    </defs>
                    <path d="M12 30 Q8 38 10 46 L16 42 Q14 36 16 30 Z" :fill="medalColors(star.displayOrder).ribbon" opacity="0.85" />
                    <path d="M28 30 Q32 38 30 46 L24 42 Q26 36 24 30 Z" :fill="medalColors(star.displayOrder).ribbon" opacity="0.85" />
                    <circle cx="20" cy="18" r="16" :fill="'url(#medal-s-' + star.id + ')'" />
                    <circle cx="20" cy="18" r="14" fill="none" stroke="rgba(255,255,255,0.4)" stroke-width="1.5" />
                    <text x="20" y="23" text-anchor="middle" fill="#fff" font-weight="bold" font-size="15"
                          font-family="Arial, sans-serif">{{ star.displayOrder }}</text>
                  </svg>
                </template>
                <span v-else class="star-order-plain">{{ star.displayOrder }}</span>

                <!-- 头像 -->
                <template v-if="hasAvatars">
                  <img v-if="getAvatarUrl(star.user)" :src="getAvatarUrl(star.user)!"
                    class="star-avatar-img" />
                  <div v-else class="star-avatar-placeholder">
                    <UserOutlined />
                  </div>
                </template>

                <div class="star-info">
                  <span class="star-name">{{ star.user?.name || '-' }}</span>
                  <span class="star-dept">{{ star.user?.department?.name || '-' }}</span>
                </div>
                <div v-if="star.comment" class="star-comment" :title="star.comment">"{{ star.comment }}"</div>
              </div>
            </div>
          </div>
        </div>
      </a-spin>
    </div>

    <div class="share-footer">
      员工积分管理系统 — 季度之星 {{ selectedQuarter }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { DownloadOutlined, UserOutlined } from '@ant-design/icons-vue';
import { message } from 'ant-design-vue';
import { toPng } from 'html-to-image';
import {
  getPublishedQuarterStars,
  getQuarterList,
  getQuarterStarAvatars,
} from '@/api/ranking.api';

const route = useRoute();

const selectedQuarter = ref('');
const stars = ref<any[]>([]);
const quarterOptions = ref<string[]>([]);
const avatarMap = ref<Record<string, string>>({});
const loading = ref(false);
const downloading = ref(false);
const captureRef = ref<HTMLElement>();

const DEFAULT_COLORS = [
  'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
  'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
  'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
  'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
  'linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)',
];

const hasAvatars = computed(() => Object.keys(avatarMap.value).length > 0);

const visibleCards = computed(() => {
  const listMap = new Map<number, { listId: number; name: string; color: string; stars: any[] }>();
  for (const star of stars.value) {
    const listId = star.rankingListId || star.rankingList?.id;
    const listName = star.rankingList?.name || '未分类';
    if (!listMap.has(listId)) {
      const idx = listMap.size;
      listMap.set(listId, {
        listId,
        name: listName,
        color: DEFAULT_COLORS[idx % DEFAULT_COLORS.length],
        stars: [],
      });
    }
    listMap.get(listId)!.stars.push(star);
  }
  // Sort stars within each card by displayOrder
  for (const card of listMap.values()) {
    card.stars.sort((a: any, b: any) => a.displayOrder - b.displayOrder);
  }
  return [...listMap.values()];
});

function medalColors(rank: number) {
  const map: Record<number, { from: string; to: string; ribbon: string }> = {
    1: { from: '#FFD700', to: '#FFA500', ribbon: '#FF6B35' },
    2: { from: '#D4D4D8', to: '#A1A1AA', ribbon: '#71717A' },
    3: { from: '#D97706', to: '#92400E', ribbon: '#78350F' },
  };
  return map[rank] || map[3];
}

function getAvatarUrl(user: any): string | null {
  if (!user?.employeeNo) return null;
  return avatarMap.value[user.employeeNo] || null;
}

async function loadStars() {
  if (!selectedQuarter.value) return;
  loading.value = true;
  try {
    const res: any = await getPublishedQuarterStars({ quarter: selectedQuarter.value });
    stars.value = Array.isArray(res) ? res : res.list || [];
  } catch {
    stars.value = [];
  } finally {
    loading.value = false;
  }
}

async function handleDownloadImage() {
  if (!captureRef.value) return;
  downloading.value = true;
  try {
    const dataUrl = await toPng(captureRef.value, {
      backgroundColor: '#f5f6fa',
      pixelRatio: 2,
    });
    const link = document.createElement('a');
    link.download = `季度之星-${selectedQuarter.value}.png`;
    link.href = dataUrl;
    link.click();
    message.success('图片已下载');
  } catch {
    message.error('图片生成失败');
  } finally {
    downloading.value = false;
  }
}

onMounted(async () => {
  // Load available quarters
  try {
    const res: any = await getQuarterList();
    quarterOptions.value = Array.isArray(res) ? res : [];
  } catch {
    quarterOptions.value = [];
  }

  // Determine initial quarter from URL or fallback
  const urlQuarter = route.query.quarter as string;
  if (urlQuarter && quarterOptions.value.includes(urlQuarter)) {
    selectedQuarter.value = urlQuarter;
  } else if (quarterOptions.value.length > 0) {
    selectedQuarter.value = quarterOptions.value[0];
  } else {
    const now = new Date();
    const q = Math.ceil((now.getMonth() + 1) / 3);
    selectedQuarter.value = `${now.getFullYear()}-Q${q}`;
    quarterOptions.value = [selectedQuarter.value];
  }

  // Load avatars and stars
  try {
    const map: any = await getQuarterStarAvatars();
    avatarMap.value = map || {};
  } catch { /* ignore */ }

  loadStars();
});
</script>

<style scoped lang="less">
.share-page {
  min-height: 100vh;
  background: #f5f6fa;
  display: flex;
  flex-direction: column;
}

.share-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 32px;
  background: #fff;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06);
}

.share-title {
  font-size: 22px;
  font-weight: 700;
  color: #1e293b;
  margin: 0;
}

.share-header-right {
  display: flex;
  gap: 12px;
  align-items: center;
}

.share-content {
  flex: 1;
  padding: 24px 32px;
  max-width: 1200px;
  margin: 0 auto;
  width: 100%;
}

.star-cards-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
  gap: 20px;
}

.star-card-wrapper {
  background: #fff;
  border: 1px solid #f0f0f0;
  border-radius: 12px;
  overflow: hidden;
  transition: box-shadow 0.3s;

  &:hover {
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
  }
}

.star-card-header {
  padding: 16px 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.star-card-title {
  font-size: 16px;
  font-weight: 700;
  color: #fff;
}

.star-card-count {
  color: rgba(255, 255, 255, 0.85);
  font-size: 13px;
  background: rgba(255, 255, 255, 0.2);
  padding: 2px 10px;
  border-radius: 10px;
}

.star-card-body {
  padding: 12px 16px;
}

.star-rank-item {
  display: flex;
  align-items: center;
  padding: 10px 4px;
  border-bottom: 1px solid #f5f5f5;
  gap: 10px;

  &:last-child {
    border-bottom: none;
  }
}

.star-medal {
  flex-shrink: 0;
  &.gold { filter: drop-shadow(0 2px 4px rgba(255, 215, 0, 0.4)); }
  &.silver { filter: drop-shadow(0 2px 4px rgba(192, 192, 192, 0.4)); }
  &.bronze { filter: drop-shadow(0 2px 4px rgba(205, 127, 50, 0.4)); }
}

.star-order-plain {
  font-size: 14px;
  font-weight: 700;
  color: #8c8c8c;
  width: 32px;
  text-align: center;
  flex-shrink: 0;
}

.star-avatar-img {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  object-fit: cover;
  flex-shrink: 0;
}

.star-avatar-placeholder {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: #f0f0f0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #bfbfbf;
  font-size: 18px;
  flex-shrink: 0;
}

.star-info {
  flex: 1;
  min-width: 0;
}

.star-name {
  font-weight: 600;
  font-size: 14px;
  color: #1e293b;
  margin-right: 6px;
}

.star-dept {
  font-size: 12px;
  color: #8c8c8c;
}

.star-comment {
  font-size: 11px;
  color: #8c8c8c;
  font-style: italic;
  max-width: 120px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex-shrink: 0;
}

.share-footer {
  text-align: center;
  padding: 16px;
  color: #8c8c8c;
  font-size: 13px;
  background: #fff;
  border-top: 1px solid #f0f0f0;
}
</style>
