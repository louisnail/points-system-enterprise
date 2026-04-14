<template>
  <div class="page-container">
    <div class="page-header">
      <h2>季度之星</h2>
      <div style="display: flex; gap: 12px; align-items: center">
        <a-select v-model:value="selectedQuarter" style="width: 140px" placeholder="选择季度" @change="loadStars">
          <a-select-option v-for="q in quarterOptions" :key="q" :value="q">{{ q }}</a-select-option>
        </a-select>
        <a-space>
          <a-button @click="showImportModal = true">从排名导入</a-button>
          <a-button type="primary" @click="showAddModal = true">选定人员</a-button>
          <a-button v-if="stars.length > 0 && !isPublished" type="primary" danger @click="handlePublish">发布</a-button>
          <a-button v-if="isPublished" @click="handleUnpublish">撤回发布</a-button>
          <a-button v-if="isPublished" @click="handleCopyShareLink"><LinkOutlined /> 分享链接</a-button>
          <a-button @click="handleDownloadImage" :loading="downloading"><DownloadOutlined /> 下载图片</a-button>
          <a-button @click="configDrawerVisible = true"><SettingOutlined /> 展示配置</a-button>
        </a-space>
      </div>
    </div>

    <a-alert v-if="isPublished" type="success" show-icon style="margin-bottom: 16px"
      :message="`${selectedQuarter} 季度之星已发布`" />

    <div ref="captureRef" class="card-box">
      <a-spin :spinning="loadingStar">
        <a-empty v-if="!loadingStar && visibleCards.length === 0" description="暂未选定季度之星人员" />
        <div v-else class="star-cards-grid">
          <div
            v-for="(card, idx) in visibleCards"
            :key="card.id"
            class="star-card-wrapper"
            draggable="true"
            @dragstart="onCardDragStart($event, idx)"
            @dragover.prevent="onCardDragOver($event, idx)"
            @drop="onCardDrop($event, idx)"
            @dragend="dragIdx = -1"
            :class="{ 'drag-over': dragOverIdx === idx }"
          >
            <div class="star-card-header" :style="{ background: getCardColor(card.id) }">
              <div class="star-card-title">{{ card.name }}<a-tag v-if="card.isSecondary" color="rgba(255,255,255,0.3)" style="color: #fff; border: none; margin-left: 6px; font-size: 11px">副榜</a-tag></div>
              <a-tag color="rgba(255,255,255,0.3)" style="color: #fff; border: none">
                {{ getCardStars(card.id).length }} 人
              </a-tag>
            </div>
            <div class="star-card-body">
              <div v-if="getCardStars(card.id).length === 0" style="text-align: center; color: #bfbfbf; padding: 24px 0">
                暂无季度之星
              </div>
              <div v-for="star in getCardStars(card.id)" :key="star.id" class="star-rank-item">
                <!-- 排名：1-3 金银铜奖章 SVG，4+ 纯数字 -->
                <template v-if="star.displayOrder <= 3">
                  <svg class="star-medal" :class="['gold','silver','bronze'][star.displayOrder - 1]"
                       viewBox="0 0 40 48" width="32" height="36">
                    <defs>
                      <linearGradient :id="'medal-g-' + star.id" x1="0" y1="0" x2="1" y2="1">
                        <stop offset="0%" :stop-color="medalColors(star.displayOrder).from" />
                        <stop offset="100%" :stop-color="medalColors(star.displayOrder).to" />
                      </linearGradient>
                    </defs>
                    <path d="M12 30 Q8 38 10 46 L16 42 Q14 36 16 30 Z" :fill="medalColors(star.displayOrder).ribbon" opacity="0.85" />
                    <path d="M28 30 Q32 38 30 46 L24 42 Q26 36 24 30 Z" :fill="medalColors(star.displayOrder).ribbon" opacity="0.85" />
                    <circle cx="20" cy="18" r="16" :fill="'url(#medal-g-' + star.id + ')'" />
                    <circle cx="20" cy="18" r="14" fill="none" stroke="rgba(255,255,255,0.4)" stroke-width="1.5" />
                    <text x="20" y="23" text-anchor="middle" fill="#fff" font-weight="bold" font-size="15"
                          font-family="Arial, sans-serif">{{ star.displayOrder }}</text>
                  </svg>
                </template>
                <span v-else class="star-order-plain">{{ star.displayOrder }}</span>

                <!-- 头像区域：根据 avatarMode 条件渲染 -->
                <template v-if="avatarMode === 'avatar'">
                  <a-image v-if="getAvatarUrl(star.user)" :src="getAvatarUrl(star.user)!"
                    :width="36" :height="36" class="star-avatar"
                    :preview="{ src: getAvatarUrl(star.user)! }"
                    @click.stop />
                  <div v-else class="star-avatar-placeholder">
                    <UserOutlined />
                  </div>
                </template>
                <!-- avatarMode === 'none' 时不渲染任何头像 -->

                <div class="star-info">
                  <span class="star-name">{{ star.user?.name || '-' }}</span>
                  <span class="star-dept">{{ star.user?.department?.name || '-' }}</span>
                </div>
                <div class="star-extra">
                  <div v-if="star.comment" class="star-comment-inline" :title="star.comment">"{{ star.comment }}"</div>
                  <div class="star-item-actions">
                    <a style="font-size: 12px" @click="handleEditStar(star)">编辑</a>
                    <a-popconfirm title="确认移除?" @confirm="handleRemoveStar(star.id)">
                      <a style="color: #ff4d4f; font-size: 12px">移除</a>
                    </a-popconfirm>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </a-spin>
    </div>

    <!-- 展示配置抽屉 -->
    <a-drawer v-model:open="configDrawerVisible" title="季度之星展示配置" :width="420" placement="right">
      <div style="margin-bottom: 12px; color: #8c8c8c; font-size: 13px">设置头像显示、各榜单卡片颜色和可见性，拖拽卡片可调整顺序</div>

      <!-- 头像显示配置 -->
      <a-divider orientation="left" style="margin: 8px 0 16px; font-size: 13px">头像显示</a-divider>
      <div style="margin-bottom: 16px">
        <a-radio-group v-model:value="avatarMode" button-style="solid" size="small">
          <a-radio-button value="none">无</a-radio-button>
          <a-radio-button value="avatar">头像</a-radio-button>
        </a-radio-group>

        <div v-if="avatarMode === 'avatar'" style="margin-top: 12px">
          <div style="color: #8c8c8c; font-size: 12px; margin-bottom: 8px">
            选择以工号命名的图片(如 000001.jpg)批量上传
          </div>
          <a-upload
            :file-list="uploadFileList"
            :before-upload="() => false"
            multiple
            accept=".jpg,.jpeg,.png,.webp"
            @change="handleAvatarFileChange"
          >
            <a-button size="small"><UploadOutlined /> 选择文件</a-button>
          </a-upload>
          <a-button v-if="uploadFileList.length > 0" type="primary" size="small"
            :loading="avatarUploading" style="margin-top: 8px"
            @click="handleUploadAvatars">
            上传 {{ uploadFileList.length }} 张头像
          </a-button>
          <div style="margin-top: 8px; color: #8c8c8c; font-size: 12px">
            已有头像: {{ Object.keys(avatarMap).length }} 张
          </div>
        </div>
      </div>

      <!-- 榜单卡片设置 -->
      <a-divider orientation="left" style="margin: 8px 0 16px; font-size: 13px">榜单卡片设置</a-divider>
      <div style="display: flex; flex-direction: column; gap: 12px">
        <div v-for="rl in rankingLists" :key="rl.id"
          style="display: flex; align-items: center; padding: 12px 16px; background: #fafafa; border-radius: 8px; border: 1px solid #f0f0f0">
          <a-switch :checked="getConfigVisible(rl.id)" size="small" @change="(v: any) => setConfigVisible(rl.id, !!v)" />
          <span style="flex: 1; margin-left: 12px; font-weight: 500">{{ rl.name }}</span>
          <a-tag v-if="rl.isSecondary" color="purple" style="font-size: 11px; margin-right: 8px">副榜</a-tag>
          <span style="color: #8c8c8c; font-size: 12px; margin-right: 8px">颜色</span>
          <a-color-picker :value="getCardColor(rl.id)" size="small" @change="(v: any) => setCardColor(rl.id, typeof v === 'string' ? v : v.toHexString())" />
        </div>
      </div>
      <template #footer>
        <a-button type="primary" block @click="saveConfig">保存配置</a-button>
      </template>
    </a-drawer>

    <!-- Add Star Modal -->
    <a-modal v-model:open="showAddModal" title="选定季度之星" :width="600" @ok="handleAddStar">
      <a-form layout="vertical">
        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item label="季度">
              <a-select v-model:value="addForm.quarter" style="width: 100%">
                <a-select-option v-for="q in quarterOptions" :key="q" :value="q">{{ q }}</a-select-option>
              </a-select>
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="所属榜单">
              <a-select v-model:value="addForm.rankingListId" placeholder="选择榜单" style="width: 100%">
                <a-select-option v-for="rl in rankingLists" :key="rl.id" :value="rl.id">{{ rl.name }}{{ rl.isSecondary ? '（副榜）' : '' }}</a-select-option>
              </a-select>
            </a-form-item>
          </a-col>
          <a-col :span="24">
            <a-form-item label="选择员工">
              <a-select v-model:value="addForm.userId" show-search :filter-option="filterUser"
                placeholder="搜索工号/姓名" :options="userOptions" style="width: 100%" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="展示顺序">
              <a-input-number v-model:value="addForm.displayOrder" :min="1" style="width: 100%" />
            </a-form-item>
          </a-col>
          <a-col :span="24">
            <a-form-item label="点评">
              <a-textarea v-model:value="addForm.comment" :rows="3" placeholder="对该员工的季度点评" />
            </a-form-item>
          </a-col>
        </a-row>
      </a-form>
    </a-modal>

    <!-- Edit Star Modal -->
    <a-modal v-model:open="showEditModal" title="编辑季度之星" :width="500" @ok="handleUpdateStar">
      <a-form layout="vertical">
        <a-form-item label="展示顺序">
          <a-input-number v-model:value="editForm.displayOrder" :min="1" style="width: 100%" />
        </a-form-item>
        <a-form-item label="点评">
          <a-textarea v-model:value="editForm.comment" :rows="3" />
        </a-form-item>
      </a-form>
    </a-modal>

    <!-- Import from Ranking Modal -->
    <a-modal v-model:open="showImportModal" title="从排名导入" :width="500" @ok="handleImport" :confirm-loading="importing">
      <a-form layout="vertical">
        <a-form-item label="季度">
          <a-select v-model:value="importForm.quarter" style="width: 100%">
            <a-select-option v-for="q in quarterOptions" :key="q" :value="q">{{ q }}</a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item label="所属榜单" required>
          <a-select v-model:value="importForm.rankingListId" placeholder="选择榜单" style="width: 100%">
            <a-select-option v-for="rl in rankingLists" :key="rl.id" :value="rl.id">{{ rl.name }}{{ rl.isSecondary ? '（副榜）' : '' }}</a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item label="导入前 N 名">
          <a-input-number v-model:value="importForm.topN" :min="1" :max="50" style="width: 100%" />
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue';
import { message, Modal } from 'ant-design-vue';
import { SettingOutlined, UploadOutlined, UserOutlined, LinkOutlined, DownloadOutlined } from '@ant-design/icons-vue';
import { toPng } from 'html-to-image';
import {
  getQuarterStars,
  createQuarterStar,
  updateQuarterStar,
  deleteQuarterStar,
  publishQuarterStars,
  unpublishQuarterStars,
  importQuarterStarsFromRanking,
  uploadQuarterStarAvatars,
  getQuarterStarAvatars,
} from '@/api/ranking.api';
import { getRankingLists } from '@/api/ranking-list.api';
import { getUsers } from '@/api/user.api';

const selectedQuarter = ref('');
const stars = ref<any[]>([]);
const rankingLists = ref<any[]>([]);
const users = ref<any[]>([]);
const loadingStar = ref(false);
const showAddModal = ref(false);
const showEditModal = ref(false);
const showImportModal = ref(false);
const importing = ref(false);
const configDrawerVisible = ref(false);
const downloading = ref(false);
const captureRef = ref<HTMLElement>();

// 头像相关
const AVATAR_MODE_KEY = 'quarter-star-avatar-mode';
const avatarMode = ref<'none' | 'avatar'>('none');
const avatarMap = ref<Record<string, string>>({});
const avatarUploading = ref(false);
const uploadFileList = ref<any[]>([]);

// Default color palette for cards
const DEFAULT_COLORS = [
  'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
  'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
  'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
  'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
  'linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)',
  'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)',
  'linear-gradient(135deg, #ff9a9e 0%, #fad0c4 100%)',
];

// Config: { [listId]: { visible: boolean, color: string } }
const CONFIG_KEY = 'quarter-star-config';
const ORDER_KEY = 'quarter-star-card-order';
const starConfig = reactive<Record<number, { visible: boolean; color: string }>>({});
const cardOrder = ref<number[]>([]);

// Drag state
const dragIdx = ref(-1);
const dragOverIdx = ref(-1);

const importForm = reactive<{ quarter: string; rankingListId: number | undefined; topN: number }>({
  quarter: '',
  rankingListId: undefined,
  topN: 10,
});

const addForm = reactive<any>({
  quarter: '',
  userId: undefined,
  rankingListId: undefined,
  displayOrder: 1,
  comment: '',
});

const editForm = reactive<any>({ id: 0, displayOrder: 1, comment: '' });

const isPublished = computed(() => stars.value.some((s) => s.isPublished === 1));

const quarterOptions = computed(() => {
  const now = new Date();
  const year = now.getFullYear();
  const options: string[] = [];
  for (let y = year; y >= year - 1; y--) {
    for (let q = 4; q >= 1; q--) {
      options.push(`${y}-Q${q}`);
    }
  }
  return options;
});

const userOptions = computed(() =>
  users.value.map((u) => ({
    value: u.id,
    label: `${u.employeeNo} - ${u.name} (${u.companyBelong})`,
  })),
);

function filterUser(input: string, option: any) {
  return option.label.toLowerCase().includes(input.toLowerCase());
}

// 金银铜奖章配色
function medalColors(rank: number) {
  const map: Record<number, { from: string; to: string; ribbon: string }> = {
    1: { from: '#FFD700', to: '#FFA500', ribbon: '#FF6B35' },
    2: { from: '#D4D4D8', to: '#A1A1AA', ribbon: '#71717A' },
    3: { from: '#D97706', to: '#92400E', ribbon: '#78350F' },
  };
  return map[rank] || map[3];
}

// 头像辅助
function getAvatarUrl(user: any): string | null {
  if (!user?.employeeNo) return null;
  return avatarMap.value[user.employeeNo] || null;
}

// Config helpers
function loadConfig() {
  try {
    const saved = localStorage.getItem(CONFIG_KEY);
    if (saved) Object.assign(starConfig, JSON.parse(saved));
    const orderSaved = localStorage.getItem(ORDER_KEY);
    if (orderSaved) cardOrder.value = JSON.parse(orderSaved);
    const modeSaved = localStorage.getItem(AVATAR_MODE_KEY);
    if (modeSaved === 'avatar') avatarMode.value = 'avatar';
  } catch { /* ignore */ }
}

function getConfigVisible(listId: number): boolean {
  return starConfig[listId]?.visible !== false;
}

function setConfigVisible(listId: number, val: boolean) {
  if (!starConfig[listId]) starConfig[listId] = { visible: true, color: '' };
  starConfig[listId].visible = val;
}

function getCardColor(listId: number): string {
  if (starConfig[listId]?.color) return starConfig[listId].color;
  const idx = rankingLists.value.findIndex(rl => rl.id === listId);
  return DEFAULT_COLORS[idx % DEFAULT_COLORS.length];
}

function setCardColor(listId: number, color: string) {
  if (!starConfig[listId]) starConfig[listId] = { visible: true, color: '' };
  starConfig[listId].color = color;
}

function saveConfig() {
  localStorage.setItem(CONFIG_KEY, JSON.stringify(starConfig));
  localStorage.setItem(ORDER_KEY, JSON.stringify(cardOrder.value));
  localStorage.setItem(AVATAR_MODE_KEY, avatarMode.value);
  configDrawerVisible.value = false;
  message.success('展示配置已保存');
}

// Card ordering
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

function getCardStars(listId: number) {
  return stars.value
    .filter(s => s.rankingListId === listId || s.rankingList?.id === listId)
    .sort((a, b) => a.displayOrder - b.displayOrder);
}

// Card drag & drop
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
  localStorage.setItem(ORDER_KEY, JSON.stringify(cardOrder.value));
}

// 头像上传
function handleAvatarFileChange(info: any) {
  uploadFileList.value = info.fileList;
}

async function handleUploadAvatars() {
  const files = uploadFileList.value.map((f: any) => f.originFileObj).filter(Boolean);
  if (!files.length) return;
  avatarUploading.value = true;
  try {
    const res: any = await uploadQuarterStarAvatars(files);
    message.success(`上传完成：成功 ${res.success} 张，失败 ${res.failed} 张`);
    if (res.errors?.length) {
      Modal.warning({ title: '部分上传失败', content: res.errors.join('\n') });
    }
    uploadFileList.value = [];
    const map: any = await getQuarterStarAvatars();
    avatarMap.value = map || {};
  } catch (e: any) {
    message.error(e?.message || '上传失败');
  } finally {
    avatarUploading.value = false;
  }
}

// 分享链接
function handleCopyShareLink() {
  const url = `${window.location.origin}/quarter-star-share?quarter=${encodeURIComponent(selectedQuarter.value)}`;
  navigator.clipboard.writeText(url).then(() => {
    message.success('分享链接已复制到剪贴板');
  }).catch(() => {
    Modal.info({ title: '分享链接', content: url });
  });
}

// 下载图片
async function handleDownloadImage() {
  if (!captureRef.value) return;
  downloading.value = true;
  try {
    captureRef.value.classList.add('capturing');
    // 等一帧让 DOM 更新
    await new Promise((r) => requestAnimationFrame(r));
    const dataUrl = await toPng(captureRef.value, {
      backgroundColor: '#fff',
      pixelRatio: 2,
    });
    captureRef.value.classList.remove('capturing');
    const link = document.createElement('a');
    link.download = `季度之星-${selectedQuarter.value}.png`;
    link.href = dataUrl;
    link.click();
    message.success('图片已下载');
  } catch {
    captureRef.value?.classList.remove('capturing');
    message.error('图片生成失败');
  } finally {
    downloading.value = false;
  }
}

// Data loading
async function loadStars() {
  if (!selectedQuarter.value) return;
  loadingStar.value = true;
  try {
    const res: any = await getQuarterStars({ quarter: selectedQuarter.value });
    stars.value = Array.isArray(res) ? res : res.list || [];
  } catch { stars.value = []; }
  finally { loadingStar.value = false; }
}

async function handleAddStar() {
  if (!addForm.userId || !addForm.rankingListId) {
    message.warning('请选择员工和榜单');
    return;
  }
  await createQuarterStar({
    quarter: addForm.quarter || selectedQuarter.value,
    userId: addForm.userId,
    rankingListId: addForm.rankingListId,
    displayOrder: addForm.displayOrder,
    comment: addForm.comment,
  });
  message.success('已添加季度之星');
  showAddModal.value = false;
  addForm.userId = undefined;
  addForm.comment = '';
  addForm.displayOrder = stars.value.length + 1;
  loadStars();
}

function handleEditStar(star: any) {
  editForm.id = star.id;
  editForm.displayOrder = star.displayOrder;
  editForm.comment = star.comment || '';
  showEditModal.value = true;
}

async function handleUpdateStar() {
  await updateQuarterStar(editForm.id, {
    displayOrder: editForm.displayOrder,
    comment: editForm.comment,
  });
  message.success('更新成功');
  showEditModal.value = false;
  loadStars();
}

async function handleRemoveStar(id: number) {
  try {
    await deleteQuarterStar(id);
    message.success('已移除');
    loadStars();
  } catch (err: any) {
    message.error(err?.response?.data?.message || '移除失败');
  }
}

async function handlePublish() {
  try {
    await publishQuarterStars(selectedQuarter.value);
    message.success(`${selectedQuarter.value} 季度之星已发布`);
    loadStars();
  } catch (err: any) {
    message.error(err?.response?.data?.message || '发布失败');
  }
}

async function handleUnpublish() {
  try {
    await unpublishQuarterStars(selectedQuarter.value);
    message.info('已撤回发布');
    loadStars();
  } catch (err: any) {
    message.error(err?.response?.data?.message || '撤回失败');
  }
}

async function handleImport() {
  if (!importForm.rankingListId) {
    message.warning('请选择榜单');
    return;
  }
  importing.value = true;
  try {
    const res: any = await importQuarterStarsFromRanking({
      quarter: importForm.quarter || selectedQuarter.value,
      rankingListId: importForm.rankingListId,
      topN: importForm.topN,
    });
    message.success(`导入完成：新增 ${res.imported ?? 0} 人，跳过 ${res.skipped ?? 0} 人`);
    showImportModal.value = false;
    loadStars();
  } catch (e: any) {
    message.error(e?.message || '导入失败');
  } finally {
    importing.value = false;
  }
}

onMounted(async () => {
  loadConfig();
  const now = new Date();
  const q = Math.ceil((now.getMonth() + 1) / 3);
  selectedQuarter.value = `${now.getFullYear()}-Q${q}`;
  addForm.quarter = selectedQuarter.value;
  importForm.quarter = selectedQuarter.value;

  try {
    const res: any = await getRankingLists();
    rankingLists.value = (Array.isArray(res) ? res : res.list || []).filter((rl: any) => rl.isActive !== 0 || rl.isSecondary === 1);
    for (const rl of rankingLists.value) {
      if (!starConfig[rl.id]) {
        const idx = rankingLists.value.indexOf(rl);
        starConfig[rl.id] = { visible: true, color: DEFAULT_COLORS[idx % DEFAULT_COLORS.length] };
      }
    }
    if (!cardOrder.value.length) {
      cardOrder.value = rankingLists.value.map((rl: any) => rl.id);
    }
  } catch { /* ignore */ }

  try {
    const res: any = await getUsers({ page: 1, pageSize: 1000 });
    users.value = res.list || [];
  } catch { /* ignore */ }

  // 加载头像映射
  try {
    const map: any = await getQuarterStarAvatars();
    avatarMap.value = map || {};
  } catch { /* ignore */ }

  loadStars();
});
</script>

<style scoped lang="less">
.star-cards-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 20px;
}

.star-card-wrapper {
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
    border-color: #667eea;
    box-shadow: 0 0 0 2px rgba(102, 126, 234, 0.2);
  }

  &:active {
    cursor: grabbing;
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

// 金银铜奖章
.star-medal {
  flex-shrink: 0;
  &.gold { filter: drop-shadow(0 2px 4px rgba(255, 215, 0, 0.4)); }
  &.silver { filter: drop-shadow(0 2px 4px rgba(192, 192, 192, 0.4)); }
  &.bronze { filter: drop-shadow(0 2px 4px rgba(205, 127, 50, 0.4)); }
}

// 4+ 排名纯数字
.star-order-plain {
  font-size: 14px;
  font-weight: 700;
  color: #8c8c8c;
  width: 32px;
  text-align: center;
  flex-shrink: 0;
}

// 头像（a-image 圆形裁切）
.star-avatar {
  flex-shrink: 0;
  border-radius: 50%;
  overflow: hidden;
  cursor: pointer;
  :deep(img) {
    object-fit: cover;
    border-radius: 50%;
  }
}

// 头像占位符
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

.star-extra {
  flex-shrink: 0;
  text-align: right;
}

.star-comment-inline {
  font-size: 11px;
  color: #8c8c8c;
  font-style: italic;
  max-width: 120px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.star-item-actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
  margin-top: 2px;
}

// 截图模式：隐藏编辑/删除等操作按钮
.card-box.capturing {
  .star-item-actions {
    display: none !important;
  }
}
</style>
