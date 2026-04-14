<template>
  <div class="page-container">
    <div class="page-header"><h2>积分录入</h2></div>
    <div class="card-box">
      <a-tabs v-model:activeKey="activeTab">
        <a-tab-pane key="quick" tab="快速录入">
          <a-row :gutter="24">
            <!-- ========== 左侧：录入表单 ========== -->
            <a-col :span="15">
              <div class="entry-left-panel">
                <!-- Step 1: 录入信息 -->
                <div class="step-section">
                  <div class="step-title"><span class="step-num">1</span> 录入信息</div>
                  <a-row :gutter="12">
                    <a-col :span="10">
                      <a-form-item label="被评价人" required style="margin-bottom: 0">
                        <a-select
                          v-model:value="selectedUserIds"
                          mode="multiple"
                          show-search
                          :filter-option="filterUser"
                          placeholder="搜索姓名、工号..."
                          :options="userOptions"
                          :max-tag-count="3"
                          allow-clear
                        />
                      </a-form-item>
                    </a-col>
                    <a-col :span="8">
                      <a-form-item label="所属榜单" style="margin-bottom: 0">
                        <a-input :value="rankingListDisplay" disabled />
                      </a-form-item>
                    </a-col>
                    <a-col :span="6">
                      <a-form-item label="归属月份" required style="margin-bottom: 0">
                        <a-date-picker v-model:value="belongMonth" picker="month" value-format="YYYY-MM"
                          placeholder="选择月份" style="width: 100%" />
                      </a-form-item>
                    </a-col>
                  </a-row>
                </div>

                <!-- Step 2 + 3: 描述事由 + 匹配指标（并排等高） -->
                <a-row :gutter="16" class="step-row-equal">
                  <!-- Step 2: 描述事由 -->
                  <a-col :span="12">
                    <div class="step-section step-fill">
                      <div class="step-title"><span class="step-num">2</span> 描述事由</div>
                      <a-form-item label="项目名称" style="margin-bottom: 4px">
                        <a-input v-model:value="eventForm.projectName" placeholder="选填" allow-clear />
                      </a-form-item>
                      <a-form-item label="事件日期" style="margin-bottom: 4px">
                        <a-date-picker v-model:value="eventForm.eventDate" value-format="YYYY-MM-DD"
                          placeholder="年/月/日" style="width: 100%" />
                      </a-form-item>
                      <a-form-item label="事件描述" style="margin-bottom: 0">
                        <a-textarea v-model:value="eventForm.eventDescription" :rows="4"
                          placeholder="描述具体事件和影响，输入后自动匹配积分指标..." />
                      </a-form-item>
                    </div>
                  </a-col>
                  <!-- Step 3: 选择匹配指标 -->
                  <a-col :span="12">
                    <div class="step-section step-fill">
                      <div class="step-title"><span class="step-num">3</span> 选择匹配指标</div>
                      <div class="indicator-list-area">
                        <div v-if="searchResults.length === 0 && !searchLoading" class="indicator-empty">
                          <InboxOutlined style="font-size: 28px; color: #d9d9d9" />
                          <div style="margin-top: 8px; color: #bfbfbf; font-size: 13px">
                            输入事件描述后<br>系统自动推荐匹配指标
                          </div>
                        </div>
                        <div v-else-if="searchLoading" style="text-align: center; padding: 24px 0">
                          <a-spin tip="搜索匹配中..." />
                        </div>
                        <div v-else>
                          <div
                            v-for="ind in searchResults"
                            :key="ind.id"
                            class="indicator-card"
                            :class="{ selected: selectedIndicator?.id === ind.id }"
                            @click="onIndicatorSelect(ind)"
                          >
                            <div class="indicator-card-main">
                              <div class="indicator-card-left">
                                <span class="indicator-category">{{ ind.categoryName }}</span>
                                <span class="indicator-name">{{ ind.name }}</span>
                              </div>
                              <div class="indicator-card-right">
                                <div class="indicator-tags">
                                  <a-tag :color="ind.direction === 1 ? 'green' : 'red'" size="small">
                                    {{ ind.direction === 1 ? '加分' : '扣分' }}
                                  </a-tag>
                                  <a-tag :color="ind.pointStatus === 1 ? 'orange' : 'blue'" size="small">
                                    {{ ind.pointStatus === 1 ? '过程分' : '结果分' }}
                                  </a-tag>
                                </div>
                                <div class="indicator-score-range">
                                  {{ ind.scoreType === 1 ? `固定 ${Number(ind.fixedScore)} 分` : `${Number(ind.minScore)} ~ ${Number(ind.maxScore)} 分` }}
                                </div>
                              </div>
                            </div>
                            <div class="indicator-card-match">
                              <span style="font-size: 12px; color: #8c8c8c; margin-right: 8px">匹配度</span>
                              <a-progress :percent="ind.matchScore" :stroke-color="ind.matchScore > 60 ? '#52c41a' : ind.matchScore > 30 ? '#faad14' : '#d9d9d9'"
                                size="small" :show-info="true" style="flex: 1" />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </a-col>
                </a-row>

                <!-- Step 4: 确认积分信息 -->
                <div class="step-section" v-if="selectedIndicator">
                  <div class="step-title"><span class="step-num">4</span> 确认积分信息</div>
                  <div class="confirm-row">
                    <div class="confirm-indicator-info">
                      <span style="color: #8c8c8c">{{ selectedIndicator.categoryName }}</span>
                      <span style="margin: 0 4px; color: #d9d9d9">&gt;</span>
                      <span style="font-weight: 600">{{ selectedIndicator.name }}</span>
                      <a-tag :color="selectedIndicator.direction === 1 ? 'green' : 'red'" style="margin-left: 8px">
                        {{ selectedIndicator.direction === 1 ? '加分' : '扣分' }}
                      </a-tag>
                      <a-tag :color="selectedIndicator.pointStatus === 1 ? 'orange' : 'blue'">
                        {{ selectedIndicator.pointStatus === 1 ? '过程分' : '结果分' }}
                      </a-tag>
                      <span style="margin-left: 12px; color: #8c8c8c">
                        标准分值:
                        <strong>{{ selectedIndicator.scoreType === 1 ? `固定 ${Number(selectedIndicator.fixedScore)} 分` : `${Number(selectedIndicator.minScore)} ~ ${Number(selectedIndicator.maxScore)} 分` }}</strong>
                      </span>
                    </div>
                    <div class="confirm-score-area">
                      <span style="margin-right: 8px; font-weight: 600">确认分值</span>
                      <div class="score-adjuster">
                        <a-button size="small" :disabled="isFixedType" @click="handleAdjustScore(-0.1)">-</a-button>
                        <a-input-number
                          v-model:value="confirmedScore"
                          :disabled="isFixedType"
                          :min="isRangeType ? effectiveMin : undefined"
                          :max="isRangeType ? effectiveMax : undefined"
                          :step="0.1"
                          :controls="false"
                          :precision="1"
                          style="width: 80px; margin: 0 4px"
                          size="small"
                        />
                        <a-button size="small" :disabled="isFixedType" @click="handleAdjustScore(0.1)">+</a-button>
                      </div>
                      <a-button type="primary" style="margin-left: 16px" @click="handleAddToPreview">
                        提交预览
                      </a-button>
                    </div>
                  </div>
                </div>
              </div>
            </a-col>

            <!-- ========== 右侧：积分录入预览 ========== -->
            <a-col :span="9">
              <div class="entry-right-panel">
                <div class="preview-header">
                  <strong style="font-size: 15px">积分录入预览</strong>
                  <span style="color: #8c8c8c; font-size: 13px">
                    已添加 {{ previewCards.length }} 条，涉及 {{ previewUserCount }} 人
                  </span>
                </div>

                <!-- 修改模式提示 -->
                <a-alert v-if="editingCardId" type="warning" show-icon style="margin-bottom: 12px"
                  :message="`正在修改 ${editingCardName} 的积分记录，修改完请点击「提交预览」`" closable @close="editingCardId = null" />

                <!-- 预览卡片列表 -->
                <div class="preview-card-list">
                  <div v-if="previewCards.length === 0" class="preview-empty">
                    <InboxOutlined style="font-size: 32px; color: #d9d9d9" />
                    <div style="margin-top: 8px; color: #bfbfbf; font-size: 13px">
                      请在左侧完成表单后<br>点击「提交预览」
                    </div>
                  </div>
                  <div v-for="card in previewCards" :key="card._id" class="preview-card">
                    <div class="preview-card-header">
                      <div>
                        <span style="font-weight: 600">{{ card.employeeName }}</span>
                        <span style="color: #8c8c8c; margin-left: 6px; font-size: 12px">{{ card.employeeNo }}</span>
                      </div>
                      <a-tag :color="card.score > 0 ? 'green' : 'red'" style="font-size: 14px; font-weight: 700">
                        {{ card.score > 0 ? '+' : '' }}{{ card.score }}
                      </a-tag>
                    </div>
                    <div class="preview-card-body">
                      <div style="font-size: 12px; color: #8c8c8c">
                        {{ card.categoryName }} &gt; {{ card.indicatorName }}
                      </div>
                      <div style="margin-top: 4px">
                        <a-tag :color="card.pointStatus === 1 ? 'orange' : 'blue'" size="small">
                          {{ card.pointStatus === 1 ? '过程分' : '结果分' }}
                        </a-tag>
                        <span style="color: #8c8c8c; font-size: 12px; margin-left: 4px">{{ card.belongMonth }}</span>
                      </div>
                      <div v-if="card.description" class="preview-card-desc" :title="card.description">
                        {{ card.description }}
                      </div>
                    </div>
                    <div class="preview-card-actions">
                      <a-button type="link" size="small" @click="handleEditCard(card._id)">修改</a-button>
                      <a-popconfirm title="确定删除该条记录？" @confirm="handleDeleteCard(card._id)">
                        <a-button type="link" size="small" danger>删除</a-button>
                      </a-popconfirm>
                    </div>
                  </div>
                </div>

                <!-- 底部提交按钮 -->
                <div class="preview-footer">
                  <a-button type="primary" size="large" block :loading="submitting"
                    :disabled="previewCards.length === 0" @click="handleBatchSubmit">
                    提交积分（{{ previewCards.length }} 条）
                  </a-button>
                </div>
              </div>
            </a-col>
          </a-row>
        </a-tab-pane>

        <!-- ========== 批量导入 Tab ========== -->
        <a-tab-pane key="batch" tab="批量导入">
          <a-alert message="通过Excel批量导入积分记录。上传后先预览确认，再提交入库。模板含指标列表参考Sheet。" type="info" show-icon style="margin-bottom: 16px" />
          <a-space direction="vertical" :size="16" style="width: 100%">
            <a-row :gutter="16">
              <a-col :span="8">
                <a-form-item label="默认归属月份">
                  <a-date-picker v-model:value="importMonth" picker="month" style="width: 100%" value-format="YYYY-MM" placeholder="Excel中未填时使用此值" />
                </a-form-item>
              </a-col>
            </a-row>
            <a-space>
              <a-button @click="handleDownloadTemplate">模板下载</a-button>
              <a-upload :show-upload-list="false" :before-upload="handleImport" accept=".xlsx,.xls">
                <a-button type="primary" :loading="importing">上传预览</a-button>
              </a-upload>
            </a-space>
            <div v-if="importResult">
              <a-result :status="importResult.failed === 0 && importResult.duplicates === 0 ? 'success' : 'warning'"
                :title="`导入完成：成功 ${importResult.success} 条${importResult.failed ? `，失败 ${importResult.failed} 条` : ''}${importResult.duplicates ? `，跳过重复 ${importResult.duplicates} 条` : ''}`">
                <template #extra>
                  <div v-if="importResult.warnings?.length" style="text-align: left; max-height: 150px; overflow: auto; margin-bottom: 8px">
                    <a-alert v-for="(w, i) in importResult.warnings" :key="'w'+i" :message="w" type="warning" style="margin-bottom: 4px" />
                  </div>
                  <div v-if="importResult.errors?.length" style="text-align: left; max-height: 200px; overflow: auto">
                    <a-alert v-for="(err, i) in importResult.errors" :key="'e'+i" :message="err" type="error" style="margin-bottom: 4px" />
                  </div>
                </template>
              </a-result>
            </div>
          </a-space>
        </a-tab-pane>
      </a-tabs>
    </div>

    <!-- ========== 批量导入预览弹窗 ========== -->
    <a-modal v-model:open="previewVisible" title="导入预览 — 确认后提交" :width="1300" :footer="null" :mask-closable="false">
      <div style="margin-bottom: 12px">
        <a-space>
          <a-tag color="green">正常 {{ previewStats.ok }}</a-tag>
          <a-tag v-if="previewStats.warning" color="gold">警告 {{ previewStats.warning }}</a-tag>
          <a-tag color="red">错误 {{ previewStats.error }}</a-tag>
          <a-tag color="orange">重复 {{ previewStats.duplicate }}</a-tag>
          <span style="color: #8c8c8c; font-size: 12px">可编辑姓名/评价维度/分值/事由/归属月份，部门和榜单由系统自动匹配。错误行可手动删除。</span>
        </a-space>
      </div>
      <a-table :columns="previewColumns" :data-source="previewRows" row-key="rowIndex" size="small"
        :scroll="{ x: 1400, y: 420 }" :pagination="false">
        <template #bodyCell="{ column, record, index }">
          <template v-if="column.key === 'status'">
            <a-tag :color="record.status === 'ok' ? 'green' : record.status === 'warning' ? 'orange' : record.status === 'duplicate' ? 'orange' : 'red'">
              {{ record.status === 'ok' ? '正常' : record.status === 'warning' ? '警告' : record.status === 'duplicate' ? '重复' : '错误' }}
            </a-tag>
          </template>
          <template v-if="column.key === 'name'">
            <a-input v-model:value="previewRows[index].name" size="small" style="width: 80px" />
          </template>
          <template v-if="column.key === 'indicatorName'">
            <a-input v-model:value="previewRows[index].indicatorName" size="small" style="width: 140px" />
          </template>
          <template v-if="column.key === 'score'">
            <a-input-number v-model:value="previewRows[index].score" size="small" :step="0.1" style="width: 70px" />
          </template>
          <template v-if="column.key === 'description'">
            <a-input v-model:value="previewRows[index].description" size="small" style="width: 180px" />
          </template>
          <template v-if="column.key === 'belongMonth'">
            <a-input v-model:value="previewRows[index].belongMonth" size="small" style="width: 90px" placeholder="YYYY-MM" />
          </template>
          <template v-if="column.key === 'message'">
            <span :style="{ color: record.status === 'warning' ? '#faad14' : '#ff4d4f', fontSize: '12px' }">{{ record.message }}</span>
          </template>
          <template v-if="column.key === 'action'">
            <a-button type="link" size="small" danger @click="handleDeletePreviewRow(index)">删除</a-button>
          </template>
        </template>
      </a-table>
      <div style="margin-top: 16px; text-align: right">
        <a-space>
          <a-button @click="previewVisible = false">取消</a-button>
          <a-button type="primary" :loading="confirmingImport" :disabled="previewStats.ok === 0" @click="handleConfirmImport">
            确认提交 {{ previewStats.ok }} 条
          </a-button>
        </a-space>
      </div>
    </a-modal>

    <!-- ========== 底部：最近录入记录（保持不变）========== -->
    <div class="card-box" style="margin-top: 10px">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px">
        <strong>最近录入记录</strong>
        <a-space>
          <a-select v-model:value="listAuditStatus" placeholder="审核状态" style="width: 120px" allow-clear @change="loadRecords">
            <a-select-option :value="0">待审核</a-select-option>
            <a-select-option :value="1">已通过</a-select-option>
            <a-select-option :value="2">已驳回</a-select-option>
          </a-select>
          <a-button size="small" @click="recordFieldDrawerVisible = true">
            <template #icon><SettingOutlined /></template>
            字段管理
          </a-button>
        </a-space>
      </div>
      <a-table :columns="displayRecordColumns" :data-source="records" :loading="loading" row-key="id" size="small"
        :pagination="pagination" :scroll="{ x: recordScrollX }" @change="handleTableChange"
        @resizeColumn="handleRecordResizeColumn">
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'score'">
            <a-tag :color="record.score > 0 ? 'green' : 'red'">{{ record.score > 0 ? '+' : '' }}{{ record.score }}</a-tag>
          </template>
          <template v-if="column.key === 'auditStatus'">
            <a-tag :color="auditColorMap[record.auditStatus]">{{ auditStatusMap[record.auditStatus] }}</a-tag>
          </template>
        </template>
      </a-table>
    </div>

    <!-- 字段管理抽屉 -->
    <a-drawer v-model:open="recordFieldDrawerVisible" title="记录字段管理" :width="360" placement="right">
      <p style="color: #8c8c8c; margin-bottom: 12px">拖拽调整字段顺序，切换显隐</p>
      <div style="display: flex; flex-direction: column; gap: 4px">
        <div
          v-for="(field, idx) in recordFieldConfig"
          :key="field.key"
          style="display: flex; align-items: center; padding: 8px 12px; border-radius: 6px; border: 1px solid #f0f0f0; background: #fafafa; cursor: grab"
          :style="{ opacity: recordDragIdx === idx ? 0.4 : 1 }"
          draggable="true"
          @dragstart="onRecordFieldDragStart(idx)"
          @dragover.prevent="onRecordFieldDragOver(idx)"
          @drop="onRecordFieldDrop(idx)"
          @dragend="recordDragIdx = -1"
        >
          <HolderOutlined style="cursor: grab; color: #bbb; margin-right: 8px" />
          <span style="flex: 1">{{ field.title }}</span>
          <a-switch size="small" :checked="field.visible" @change="(v: any) => field.visible = !!v" />
        </div>
      </div>
      <template #footer>
        <a-button type="primary" block @click="applyRecordFieldConfig">应用</a-button>
      </template>
    </a-drawer>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, onBeforeUnmount, watch, h } from 'vue';
import { message, Modal } from 'ant-design-vue';
import { SettingOutlined, HolderOutlined, InboxOutlined } from '@ant-design/icons-vue';
import { batchCreatePoints, getPoints, importPoints, getPointTemplate, checkPointDuplicates, previewImportPoints, confirmImportPoints } from '@/api/point.api';
import { getUsers } from '@/api/user.api';
import { getIndicators, getIndicatorCategories, searchIndicators } from '@/api/indicator.api';
import { getRankingLists } from '@/api/ranking-list.api';
import { useFieldPool } from '@/composables/useFieldPool';

// ==================== 基础状态 ====================
const activeTab = ref('quick');
const submitting = ref(false);
const importing = ref(false);
const loading = ref(false);
const importResult = ref<any>(null);
const importMonth = ref('');

const users = ref<any[]>([]);
const categories = ref<any[]>([]);
const indicators = ref<any[]>([]);
const rankingLists = ref<any[]>([]);

// ==================== Step 1: 录入信息 ====================
const selectedUserIds = ref<number[]>([]);
const belongMonth = ref('');

const userOptions = computed(() => users.value.map(u => ({
  value: u.id,
  label: `${u.name} | ${u.department?.name || ''} | ${u.companyBelong || ''}`,
})));

function filterUser(input: string, option: any) {
  return option.label.toLowerCase().includes(input.toLowerCase());
}

const selectedUsers = computed(() =>
  users.value.filter(u => selectedUserIds.value.includes(u.id))
);

const rankingListDisplay = computed(() => {
  const lists = [...new Set(selectedUsers.value.map(u => u.rankingList?.name).filter(Boolean))];
  if (lists.length === 0) return '';
  if (lists.length === 1) return lists[0];
  return `多榜单(${lists.length})`;
});

// ==================== Step 2: 描述事由 ====================
const eventForm = reactive({ projectName: '', eventDate: '', eventDescription: '' });

// ==================== Step 3: 匹配指标（输入事由后自动触发）====================
const searchResults = ref<any[]>([]);
const searchLoading = ref(false);
const selectedIndicator = ref<any>(null);
let searchTimer: ReturnType<typeof setTimeout> | null = null;

async function doSearchIndicators() {
  const keyword = (eventForm.eventDescription || '').trim();
  if (!keyword) {
    searchResults.value = [];
    return;
  }

  searchLoading.value = true;
  selectedIndicator.value = null;
  try {
    // 收集相关榜单 ID：用户所属榜单 + 技术联盟 + 通用积分榜单
    const rlIdSet = new Set<number>();
    for (const u of selectedUsers.value) {
      if (u.rankingList?.id) rlIdSet.add(u.rankingList.id);
    }
    // 副榜始终参与匹配
    for (const rl of rankingLists.value) {
      if (rl.isSecondary) {
        rlIdSet.add(rl.id);
      }
    }

    const rankingListIds = rlIdSet.size > 0 ? [...rlIdSet].join(',') : undefined;
    const res: any = await searchIndicators({ keyword, rankingListIds, limit: 30 });
    searchResults.value = Array.isArray(res) ? res : [];
  } catch {
    searchResults.value = [];
  } finally {
    searchLoading.value = false;
  }
}

// 防抖自动搜索：事件描述变化后 600ms 自动触发
watch(
  () => eventForm.eventDescription,
  () => {
    if (searchTimer) clearTimeout(searchTimer);
    const keyword = (eventForm.eventDescription || '').trim();
    if (!keyword) {
      searchResults.value = [];
      selectedIndicator.value = null;
      return;
    }
    searchTimer = setTimeout(() => doSearchIndicators(), 600);
  },
);

function onIndicatorSelect(ind: any) {
  selectedIndicator.value = ind;
  if (ind.scoreType === 1) {
    // 固定分值：直接使用实际值（带符号）
    confirmedScore.value = Number(ind.fixedScore) || 0;
  } else {
    // 范围分值：默认取绝对值较小的端点（靠近0）
    const a = Number(ind.minScore) || 0;
    const b = Number(ind.maxScore) || 0;
    confirmedScore.value = Math.abs(a) <= Math.abs(b) ? a : b;
  }
}

// ==================== Step 4: 确认积分 ====================
const confirmedScore = ref<number | undefined>();

const isFixedType = computed(() => selectedIndicator.value?.scoreType === 1);
const isRangeType = computed(() => selectedIndicator.value?.scoreType === 2);

// 使用实际带符号值，确保 effectiveMin <= effectiveMax
const effectiveMin = computed(() => {
  if (!selectedIndicator.value || !isRangeType.value) return undefined;
  const a = Number(selectedIndicator.value.minScore) || 0;
  const b = Number(selectedIndicator.value.maxScore) || 0;
  return Math.min(a, b);
});
const effectiveMax = computed(() => {
  if (!selectedIndicator.value || !isRangeType.value) return undefined;
  const a = Number(selectedIndicator.value.minScore) || 0;
  const b = Number(selectedIndicator.value.maxScore) || 0;
  return Math.max(a, b);
});

function handleAdjustScore(delta: number) {
  if (!selectedIndicator.value || isFixedType.value) return;
  const current = confirmedScore.value ?? 0;
  const newVal = Math.round((current + delta) * 10) / 10;
  const min = effectiveMin.value;
  const max = effectiveMax.value;
  if (min !== undefined && max !== undefined) {
    confirmedScore.value = Math.max(min, Math.min(max, newVal));
  } else {
    confirmedScore.value = newVal;
  }
}

// ==================== 右侧：预览卡片 ====================
interface PreviewCard {
  _id: string;
  userId: number;
  employeeName: string;
  employeeNo: string;
  departmentName: string;
  rankingListName: string;
  indicatorId: number;
  indicatorName: string;
  categoryName: string;
  direction: number;
  pointStatus: number;
  confirmedScore: number;
  score: number;
  description: string;
  belongMonth: string;
  projectName?: string;
  eventDate?: string;
  eventDescription?: string;
}

const previewCards = ref<PreviewCard[]>([]);
const editingCardId = ref<string | null>(null);
let seqId = 0;

const previewUserCount = computed(() => new Set(previewCards.value.map(c => c.userId)).size);

const editingCardName = computed(() => {
  if (!editingCardId.value) return '';
  const card = previewCards.value.find(c => c._id === editingCardId.value);
  return card?.employeeName || '';
});

function buildDescription(): string {
  let desc = '';
  if (eventForm.projectName) desc += `[项目:${eventForm.projectName}] `;
  if (eventForm.eventDate) desc += `${eventForm.eventDate} `;
  desc += eventForm.eventDescription || '';
  return desc.trim();
}

function handleAddToPreview() {
  // 验证
  if (selectedUserIds.value.length === 0) { message.warning('请选择被评价人'); return; }
  if (!belongMonth.value) { message.warning('请选择归属月份'); return; }
  if (!selectedIndicator.value) { message.warning('请选择匹配指标'); return; }
  if (confirmedScore.value === undefined || confirmedScore.value === null) { message.warning('请确认分值'); return; }

  const ind = selectedIndicator.value;
  const desc = buildDescription();
  const score = confirmedScore.value; // 分值已带符号，无需乘 direction

  // 积分归类与榜单匹配校验：指标有 rankingListId 时，必须匹配用户的主榜或副榜
  function isIndicatorMatchUser(user: any): boolean {
    if (!ind.rankingListId) return true; // rankingListId 为空，通用指标
    if (ind.rankingListType === '通用积分') return true; // 通用积分归类，所有用户均可
    const indRlId = Number(ind.rankingListId);
    const userRlId = user.rankingList?.id ? Number(user.rankingList.id) : 0;
    const userSecRlId = user.secondaryRankingList?.id ? Number(user.secondaryRankingList.id) : 0;
    return indRlId === userRlId || indRlId === userSecRlId;
  }

  if (editingCardId.value) {
    // 修改模式：替换对应卡片
    const idx = previewCards.value.findIndex(c => c._id === editingCardId.value);
    if (idx >= 0) {
      const user = selectedUsers.value[0];
      if (!isIndicatorMatchUser(user)) {
        const indLabel = ind.rankingListName || ind.rankingListId;
        const userLabel = user.rankingList?.name || '无';
        message.warning(`${user.name} 所属榜单"${userLabel}"与指标归类"${indLabel}"不匹配，无法录入`);
        return;
      }
      previewCards.value[idx] = {
        ...previewCards.value[idx],
        userId: user.id,
        employeeName: user.name,
        employeeNo: user.employeeNo,
        departmentName: user.department?.name || '',
        rankingListName: user.rankingList?.name || '',
        indicatorId: ind.id,
        indicatorName: ind.name,
        categoryName: ind.categoryName || '',
        direction: ind.direction,
        pointStatus: ind.pointStatus,
        confirmedScore: confirmedScore.value,
        score,
        description: desc,
        belongMonth: belongMonth.value,
        projectName: eventForm.projectName,
        eventDate: eventForm.eventDate,
        eventDescription: eventForm.eventDescription,
      };
    }
    editingCardId.value = null;
    message.success('已更新预览卡片');
  } else {
    // 新增模式：为每个用户生成一张卡片，校验匹配后才加入
    const matched: any[] = [];
    const skipped: string[] = [];
    for (const user of selectedUsers.value) {
      if (!isIndicatorMatchUser(user)) {
        skipped.push(user.name);
        continue;
      }
      seqId++;
      previewCards.value.push({
        _id: `${user.id}_${seqId}`,
        userId: user.id,
        employeeName: user.name,
        employeeNo: user.employeeNo,
        departmentName: user.department?.name || '',
        rankingListName: user.rankingList?.name || '',
        indicatorId: ind.id,
        indicatorName: ind.name,
        categoryName: ind.categoryName || '',
        direction: ind.direction,
        pointStatus: ind.pointStatus,
        confirmedScore: confirmedScore.value,
        score,
        description: desc,
        belongMonth: belongMonth.value,
        projectName: eventForm.projectName,
        eventDate: eventForm.eventDate,
        eventDescription: eventForm.eventDescription,
      });
      matched.push(user);
    }
    if (skipped.length > 0) {
      const indLabel = ind.rankingListName || '该指标归类';
      message.warning(`${skipped.join('、')} 所属榜单与"${indLabel}"不匹配，已跳过`);
    }
    if (matched.length > 0) {
      message.success(`已添加 ${matched.length} 条预览`);
    } else if (skipped.length > 0) {
      // 全部跳过，不清空表单
      return;
    }
  }

  // 清空表单（保留月份）
  resetEntryForm();
}

function resetEntryForm() {
  selectedUserIds.value = [];
  eventForm.projectName = '';
  eventForm.eventDate = '';
  eventForm.eventDescription = '';
  searchResults.value = [];
  selectedIndicator.value = null;
  confirmedScore.value = undefined;
}

function handleEditCard(cardId: string) {
  const card = previewCards.value.find(c => c._id === cardId);
  if (!card) return;

  // 回填表单
  selectedUserIds.value = [card.userId];
  belongMonth.value = card.belongMonth;

  // 解析事由
  if (card.projectName !== undefined) {
    eventForm.projectName = card.projectName || '';
    eventForm.eventDate = card.eventDate || '';
    eventForm.eventDescription = card.eventDescription || '';
  } else {
    const match = card.description.match(/^\[项目:(.+?)\]\s*(\d{4}-\d{2}-\d{2})?\s*(.*)$/s);
    if (match) {
      eventForm.projectName = match[1] || '';
      eventForm.eventDate = match[2] || '';
      eventForm.eventDescription = match[3] || '';
    } else {
      eventForm.projectName = '';
      eventForm.eventDate = '';
      eventForm.eventDescription = card.description;
    }
  }

  // 回填指标和分值
  selectedIndicator.value = {
    id: card.indicatorId,
    name: card.indicatorName,
    categoryName: card.categoryName,
    direction: card.direction,
    pointStatus: card.pointStatus,
    scoreType: 1, // fallback: 当作固定分值
    fixedScore: card.confirmedScore,
    minScore: card.direction === -1 ? -999 : 0,
    maxScore: card.direction === -1 ? 0 : 999,
  };
  // 尝试从全量指标中获取完整信息
  const fullInd = indicators.value.find(i => i.id === card.indicatorId);
  if (fullInd) {
    selectedIndicator.value = {
      id: fullInd.id,
      name: fullInd.name,
      categoryName: fullInd.category?.name || card.categoryName,
      direction: fullInd.direction,
      pointStatus: fullInd.pointStatus,
      scoreType: fullInd.scoreType,
      fixedScore: fullInd.fixedScore,
      minScore: fullInd.minScore,
      maxScore: fullInd.maxScore,
    };
  }
  confirmedScore.value = card.confirmedScore;

  editingCardId.value = cardId;
}

function handleDeleteCard(cardId: string) {
  previewCards.value = previewCards.value.filter(c => c._id !== cardId);
  if (editingCardId.value === cardId) {
    editingCardId.value = null;
    resetEntryForm();
  }
}

async function handleBatchSubmit() {
  if (previewCards.value.length === 0) return;
  const months = [...new Set(previewCards.value.map(c => c.belongMonth))];
  if (months.length > 1) {
    message.warning('预览中包含多个归属月份，请确认');
  }
  const bMonth = months[0] || belongMonth.value;
  const items = previewCards.value.map(c => ({
    userId: c.userId,
    indicatorId: c.indicatorId,
    score: c.confirmedScore,
    description: c.description,
  }));

  // Check for duplicates before submitting
  try {
    const dupRes: any = await checkPointDuplicates(
      items.map(r => ({ userId: r.userId, indicatorId: r.indicatorId, score: r.score, belongMonth: bMonth })),
    );
    if (dupRes.hasDuplicates) {
      const dupList = (dupRes.duplicates || []) as Array<{ userName: string; indicatorName: string; score: number }>;
      const confirmed = await new Promise<boolean>((resolve) => {
        Modal.confirm({
          title: '检测到重复积分记录',
          width: 520,
          content: h('div', { style: 'max-height:240px;overflow:auto' }, [
            h('p', { style: 'color:#faad14;margin-bottom:8px' }, `以下 ${dupList.length} 条记录已存在相同的待审核积分，是否仍然提交？`),
            ...dupList.map(d =>
              h('div', { style: 'margin:4px 0;padding:4px 8px;background:#fff7e6;border-radius:4px' },
                `${d.userName} - ${d.indicatorName} - 分值 ${d.score}`),
            ),
          ]),
          okText: '确认提交',
          cancelText: '取消',
          onOk: () => resolve(true),
          onCancel: () => resolve(false),
        });
      });
      if (!confirmed) return;
    }
  } catch {
    // If check fails, proceed anyway
  }

  submitting.value = true;
  try {
    const res: any = await batchCreatePoints({ records: items, belongMonth: bMonth });
    if (res.failed > 0) {
      message.warning(`提交完成：成功 ${res.success} 条，失败 ${res.failed} 条`);
      if (res.errors?.length) {
        Modal.warning({ title: '部分提交失败', content: res.errors.join('\n') });
      }
    } else {
      message.success(`提交成功，共 ${res.success || previewCards.value.length} 条积分记录已提交审核`);
    }
    previewCards.value = [];
    editingCardId.value = null;
    pagination.current = 1;
    await loadRecords();
  } finally {
    submitting.value = false;
  }
}

// ==================== 底部：最近录入记录（保持不变）====================
const auditStatusMap: Record<number, string> = { 0: '待审核', 1: '已通过', 2: '已驳回' };
const auditColorMap: Record<number, string> = { 0: 'orange', 1: 'green', 2: 'red' };
const listAuditStatus = ref<number | undefined>();
const records = ref<any[]>([]);
const pagination = reactive({ current: 1, pageSize: 10, total: 0 });

function formatDateTime(val: string) {
  if (!val) return '-';
  const d = new Date(val);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}年${pad(d.getMonth() + 1)}月${pad(d.getDate())}日 ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const recentColumns = [
  { title: '工号', key: 'employeeNo', width: 80, customRender: ({ record: r }: any) => r.user?.employeeNo || '-' },
  { title: '姓名', key: 'userName', width: 80, resizable: true, customRender: ({ record: r }: any) => r.user?.name || '-' },
  { title: '部门', key: 'department', width: 120, resizable: true, customRender: ({ record: r }: any) => r.user?.department?.name || '-' },
  { title: '归属', key: 'companyBelong', width: 60, resizable: true, customRender: ({ record: r }: any) => r.user?.companyBelong || '-' },
  { title: '榜单', key: 'rankingList', width: 100, resizable: true, customRender: ({ record: r }: any) => r.user?.rankingList?.name || '-' },
  { title: '积分归类', key: 'rankingListType', width: 100, resizable: true, customRender: ({ record: r }: any) => r.indicator?.rankingListType || '通用积分' },
  { title: '管控项', key: 'category', width: 100, resizable: true, customRender: ({ record: r }: any) => r.indicator?.category?.name || '-' },
  { title: '评价维度', key: 'indicator', width: 140, resizable: true, customRender: ({ record: r }: any) => r.indicator?.name || '-' },
  { title: '分值', key: 'score', width: 70, resizable: true },
  { title: '积分状态', key: 'pointType', width: 80, resizable: true, customRender: ({ record: r }: any) => r.pointStatus === 1 ? '过程分' : '结果分' },
  { title: '事由', key: 'description', dataIndex: 'description', width: 200, resizable: true },
  { title: '反馈人', key: 'registrant', width: 80, resizable: true, customRender: ({ record: r }: any) => r.registrant?.name || '-' },
  { title: '归属月份', key: 'belongMonth', dataIndex: 'belongMonth', width: 90, resizable: true },
  { title: '审核状态', key: 'auditStatus', width: 80, resizable: true },
  { title: '录入时间', key: 'registeredAt', dataIndex: 'registeredAt', width: 160, resizable: true, customRender: ({ text }: any) => formatDateTime(text) },
];

const {
  fieldConfig: recordFieldConfig,
  dragFieldIdx: recordDragIdx,
  onDragStart: onRecordFieldDragStart,
  onDragOver: onRecordFieldDragOver,
  onDragDrop: onRecordFieldDrop,
  visibleColumns: visibleRecordColumns,
  applyAndSave: saveRecordFieldConfig,
} = useFieldPool('point-record-fields', recentColumns);

const recordFieldDrawerVisible = ref(false);
const recordColumnWidths = ref<Record<string, number>>({});
const displayRecordColumns = computed(() => visibleRecordColumns.value.map(c => ({
  ...c,
  width: recordColumnWidths.value[c.key] || c.width,
})));
const recordScrollX = computed(() => displayRecordColumns.value.reduce((sum: number, col: any) => sum + (col.width || 120), 0));

function handleRecordResizeColumn(w: number, col: any) {
  const key = col.key || col.dataIndex;
  if (key) recordColumnWidths.value[key] = w;
}

function applyRecordFieldConfig() {
  saveRecordFieldConfig();
  recordFieldDrawerVisible.value = false;
  message.success('字段配置已应用');
}

async function loadRecords() {
  loading.value = true;
  try {
    const res: any = await getPoints({
      page: pagination.current,
      pageSize: pagination.pageSize,
      auditStatus: listAuditStatus.value,
    });
    records.value = res.list;
    pagination.total = res.total;
  } finally {
    loading.value = false;
  }
}

function handleTableChange(pag: any) {
  pagination.current = pag.current;
  loadRecords();
}

// ==================== 批量导入（预览→确认模式）====================
async function handleDownloadTemplate() {
  const blob: any = await getPointTemplate();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'point_import_template.xlsx';
  a.click();
  URL.revokeObjectURL(url);
}

// 预览相关状态
const previewVisible = ref(false);
const previewRows = ref<any[]>([]);
const confirmingImport = ref(false);
const previewColumns = [
  { title: '状态', key: 'status', width: 70, fixed: 'left' as const },
  { title: '姓名', key: 'name', dataIndex: 'name', width: 90 },
  { title: '部门', key: 'department', dataIndex: 'department', width: 100 },
  { title: '榜单', key: 'rankingList', dataIndex: 'rankingList', width: 100 },
  { title: '评价维度', key: 'indicatorName', dataIndex: 'indicatorName', width: 160 },
  { title: '分值', key: 'score', dataIndex: 'score', width: 80 },
  { title: '事由', key: 'description', dataIndex: 'description', width: 200 },
  { title: '归属月份', key: 'belongMonth', dataIndex: 'belongMonth', width: 100 },
  { title: '提示', key: 'message', dataIndex: 'message', width: 220 },
  { title: '操作', key: 'action', width: 60, fixed: 'right' as const },
];

const previewStats = computed(() => {
  const ok = previewRows.value.filter(r => r.status === 'ok').length;
  const warning = previewRows.value.filter(r => r.status === 'warning').length;
  const error = previewRows.value.filter(r => r.status === 'error').length;
  const duplicate = previewRows.value.filter(r => r.status === 'duplicate').length;
  return { ok, warning, error, duplicate, submittable: ok + warning };
});

function handleDeletePreviewRow(index: number) {
  previewRows.value.splice(index, 1);
}

async function handleImport(file: File) {
  importing.value = true;
  try {
    const res: any = await previewImportPoints(file, importMonth.value || '');
    previewRows.value = res.rows || [];
    previewVisible.value = true;
  } catch (err: any) {
    message.error(err?.response?.data?.message || '解析文件失败');
  } finally {
    importing.value = false;
  }
  return false;
}

async function handleConfirmImport() {
  const validRows = previewRows.value.filter(r => (r.status === 'ok' || r.status === 'warning') && r.userId && r.indicatorId);
  if (!validRows.length) { message.warning('没有可提交的有效数据'); return; }
  confirmingImport.value = true;
  try {
    const records = validRows.map(r => ({
      userId: r.userId,
      indicatorId: r.indicatorId,
      score: Number(r.score),
      description: r.description || '',
      belongMonth: r.belongMonth,
    }));
    const res: any = await confirmImportPoints(records);
    importResult.value = res;
    previewVisible.value = false;
    message.success(`成功提交 ${res.success} 条积分记录`);
    pagination.current = 1;
    await loadRecords();
  } catch (err: any) {
    message.error(err?.response?.data?.message || '提交失败');
  } finally {
    confirmingImport.value = false;
  }
}

// ==================== 初始化 ====================
onMounted(async () => {
  try {
    const res: any = await getUsers({ page: 1, pageSize: 1000 });
    users.value = res.list || [];
  } catch { /* ignore */ }
  try {
    categories.value = await getIndicatorCategories() as any || [];
  } catch { /* ignore */ }
  try {
    indicators.value = await getIndicators() as any || [];
  } catch { /* ignore */ }
  try {
    rankingLists.value = await getRankingLists() as any || [];
  } catch { /* ignore */ }
  loadRecords();
});

onBeforeUnmount(() => {
  if (searchTimer) {
    clearTimeout(searchTimer);
    searchTimer = null;
  }
});
</script>

<style scoped lang="less">
.entry-left-panel {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.step-section {
  border: 1px solid #f0f0f0;
  border-radius: 8px;
  padding: 10px 14px;
  background: #fafafa;
}

.step-fill {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.step-row-equal {
  display: flex;
  > .ant-col {
    display: flex;
    > .step-section {
      width: 100%;
    }
  }
}

.step-title {
  font-weight: 600;
  font-size: 14px;
  margin-bottom: 6px;
  color: #1e293b;
}

.step-num {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: #1890ff;
  color: #fff;
  font-size: 12px;
  font-weight: 700;
  margin-right: 6px;
}

// ==================== 指标列表 ====================
.indicator-list-area {
  flex: 1;
  overflow-y: auto;
  max-height: 240px;
  min-height: 140px;
}

.indicator-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 24px 0;
  text-align: center;
}

.indicator-card {
  border: 1px solid #f0f0f0;
  border-radius: 6px;
  padding: 8px 10px;
  margin-bottom: 6px;
  cursor: pointer;
  background: #fff;
  transition: all 0.2s;

  &:hover {
    border-color: #91caff;
    background: #f0f7ff;
  }

  &.selected {
    border-left: 3px solid #1890ff;
    background: #e6f7ff;
    border-color: #91caff;
  }
}

.indicator-card-main {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 8px;
}

.indicator-card-left {
  flex: 1;
  min-width: 0;
}

.indicator-category {
  font-size: 11px;
  color: #8c8c8c;
  display: block;
  margin-bottom: 2px;
}

.indicator-name {
  font-weight: 600;
  font-size: 13px;
  color: #1e293b;
}

.indicator-card-right {
  flex-shrink: 0;
  text-align: right;
}

.indicator-tags {
  margin-bottom: 2px;
}

.indicator-score-range {
  font-size: 12px;
  color: #595959;
  font-weight: 500;
}

.indicator-card-match {
  display: flex;
  align-items: center;
  margin-top: 6px;
}

// ==================== Step 4 确认 ====================
.confirm-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
}

.confirm-indicator-info {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 4px;
  font-size: 13px;
}

.confirm-score-area {
  display: flex;
  align-items: center;
}

.score-adjuster {
  display: inline-flex;
  align-items: center;
}

// ==================== 右侧预览 ====================
.entry-right-panel {
  border: 1px solid #f0f0f0;
  border-radius: 8px;
  background: #fafafa;
  padding: 10px 12px;
  display: flex;
  flex-direction: column;
  position: sticky;
  top: 8px;
  max-height: calc(100vh - 120px);
}

.preview-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.preview-card-list {
  flex: 1;
  overflow-y: auto;
  min-height: 160px;
}

.preview-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 32px 0;
  text-align: center;
}

.preview-card {
  background: #fff;
  border: 1px solid #f0f0f0;
  border-radius: 8px;
  padding: 8px 10px;
  margin-bottom: 6px;
  transition: box-shadow 0.2s;

  &:hover {
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  }
}

.preview-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
}

.preview-card-body {
  font-size: 13px;
}

.preview-card-desc {
  margin-top: 4px;
  font-size: 12px;
  color: #595959;
  font-style: italic;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.preview-card-actions {
  display: flex;
  justify-content: flex-end;
  gap: 4px;
  margin-top: 4px;
  border-top: 1px solid #f5f5f5;
  padding-top: 4px;
}

.preview-footer {
  margin-top: 8px;
  flex-shrink: 0;
}
</style>
