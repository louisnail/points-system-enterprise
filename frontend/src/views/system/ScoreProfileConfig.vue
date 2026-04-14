<template>
  <div class="page-container">
    <div class="page-header">
      <h2>积分画像配置</h2>
      <a-button type="primary" @click="showCreateDrawer">新增模板</a-button>
    </div>

    <div class="card-box">
      <a-table
        :columns="columns"
        :data-source="templates"
        :loading="loading"
        row-key="id"
        :pagination="false"
        size="middle"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'matchType'">
            <a-tag :color="matchTypeColorMap[record.matchType]">{{ matchTypeLabelMap[record.matchType] }}</a-tag>
          </template>
          <template v-if="column.key === 'matchValue'">
            {{ formatMatchValue(record) }}
          </template>
          <template v-if="column.key === 'isActive'">
            <a-tag :color="record.isActive ? 'green' : 'default'">{{ record.isActive ? '启用' : '停用' }}</a-tag>
          </template>
          <template v-if="column.key === 'dimensions'">
            <a-tooltip :title="record.dimensions?.map((d: any) => d.name).join('、')">
              <span>{{ record.dimensions?.length || 0 }} 个维度</span>
            </a-tooltip>
          </template>
          <template v-if="column.key === 'action'">
            <a-space>
              <a @click="showEditDrawer(record)">编辑</a>
              <a-popconfirm title="确认删除该模板？" @confirm="handleDelete(record.id)">
                <a style="color: #ff4d4f">删除</a>
              </a-popconfirm>
            </a-space>
          </template>
        </template>
      </a-table>
    </div>

    <!-- 编辑抽屉 -->
    <a-drawer
      :open="drawerOpen"
      :title="editingId ? '编辑模板' : '新增模板'"
      placement="right"
      :width="720"
      @close="drawerOpen = false"
      :destroy-on-close="true"
    >
      <a-form layout="vertical">
        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item label="模板名称" required>
              <a-input v-model:value="form.name" placeholder="请输入模板名称" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="优先级">
              <a-input-number v-model:value="form.priority" :min="0" style="width: 100%" />
            </a-form-item>
          </a-col>
        </a-row>

        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item label="匹配类型" required>
              <a-select v-model:value="form.matchType" @change="handleMatchTypeChange">
                <a-select-option value="default">默认（所有人兜底）</a-select-option>
                <a-select-option value="ranking_list">按榜单匹配</a-select-option>
                <a-select-option value="position">按岗位匹配</a-select-option>
              </a-select>
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="匹配值" v-if="form.matchType !== 'default'">
              <a-select v-if="form.matchType === 'ranking_list'" v-model:value="form.matchValue" placeholder="选择榜单">
                <a-select-option v-for="rl in rankingLists" :key="rl.id" :value="String(rl.id)">{{ rl.name }}</a-select-option>
              </a-select>
              <a-input v-else v-model:value="form.matchValue" placeholder="输入岗位名称" />
            </a-form-item>
          </a-col>
        </a-row>

        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item label="状态">
              <a-switch :checked="form.isActive === 1" @change="(v: boolean | string | number) => form.isActive = v ? 1 : 0" />
              <span style="margin-left: 8px">{{ form.isActive ? '启用' : '停用' }}</span>
            </a-form-item>
          </a-col>
        </a-row>

        <a-form-item label="说明">
          <a-textarea v-model:value="form.description" :rows="2" placeholder="模板说明（可选）" />
        </a-form-item>

        <!-- 维度配置 -->
        <a-divider orientation="left">维度配置</a-divider>
        <div style="margin-bottom: 12px">
          <a-space>
            <a-button size="small" @click="openTreeModal">添加维度</a-button>
            <a-button size="small" @click="addCustomDim">添加自定义维度</a-button>
          </a-space>
        </div>

        <div v-if="form.dimensions.length === 0" style="text-align: center; padding: 24px; color: #999">
          暂无维度，请添加
        </div>

        <div v-for="(dim, idx) in form.dimensions" :key="idx" class="dim-row">
          <div class="dim-drag">
            <span style="cursor: grab; color: #999" draggable="true"
              @dragstart="onDragStart(idx)" @dragover.prevent @drop="onDrop(idx)">☰</span>
          </div>
          <div class="dim-content">
            <a-row :gutter="8" align="middle">
              <a-col :span="5">
                <a-input v-model:value="dim.name" size="small" placeholder="维度名称" />
              </a-col>
              <a-col :span="7">
                <div class="source-display">
                  <a-tag :color="getSourceDisplay(dim).typeColor" size="small" :bordered="false">{{ getSourceDisplay(dim).typeLabel }}</a-tag>
                  <span class="source-name" :title="getSourceDisplay(dim).sourceName">{{ getSourceDisplay(dim).sourceName }}</span>
                </div>
              </a-col>
              <a-col :span="4">
                <a-select v-model:value="dim.refType" size="small" style="width: 100%">
                  <a-select-option value="average">平均值</a-select-option>
                  <a-select-option value="max">最大值</a-select-option>
                  <a-select-option value="fixed">固定值</a-select-option>
                </a-select>
              </a-col>
              <a-col :span="5" v-if="dim.refType === 'fixed'">
                <a-input-number v-model:value="dim.refValue" size="small" :min="0" style="width: 100%" placeholder="参考值" />
              </a-col>
              <a-col :span="5" v-else>
                <a-select v-model:value="dim.refScope" size="small" style="width: 100%">
                  <a-select-option value="all">全员范围</a-select-option>
                  <a-select-option value="ranking_list">榜单范围</a-select-option>
                </a-select>
              </a-col>
              <a-col :span="3" style="text-align: right">
                <a-button type="text" danger size="small" @click="removeDim(idx)">删除</a-button>
              </a-col>
            </a-row>
          </div>
        </div>
      </a-form>

      <div style="height: 64px"></div>
      <div class="drawer-footer">
        <a-space>
          <a-button @click="drawerOpen = false">取消</a-button>
          <a-button type="primary" :loading="saving" @click="handleSave">保存</a-button>
        </a-space>
      </div>
    </a-drawer>

    <!-- 添加维度弹窗（层级树形选择） -->
    <a-modal v-model:open="treeModalOpen" title="添加维度" @ok="confirmAddFromTree" :width="520">
      <div style="margin-bottom: 12px; color: #666; font-size: 13px">
        勾选「整个分类」添加管控项级维度，勾选具体名称添加评价维度级维度
      </div>
      <a-tree
        v-if="dimTreeData.length > 0"
        :tree-data="dimTreeData"
        checkable
        :check-strictly="true"
        default-expand-all
        :selectable="false"
        :checked-keys="checkedTreeKeys"
        @check="onTreeCheck"
      />
      <div v-else style="text-align: center; padding: 24px; color: #999">暂无管控项数据</div>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { message } from 'ant-design-vue';
import {
  getScoreProfileTemplates,
  createScoreProfileTemplate,
  updateScoreProfileTemplate,
  deleteScoreProfileTemplate,
} from '@/api/score-profile.api';
import { getRankingLists } from '@/api/ranking-list.api';
import { getIndicatorCategories, getIndicators } from '@/api/indicator.api';

const columns = [
  { title: '模板名称', dataIndex: 'name', key: 'name', width: 160 },
  { title: '匹配类型', key: 'matchType', width: 120 },
  { title: '匹配值', key: 'matchValue', width: 140 },
  { title: '优先级', dataIndex: 'priority', key: 'priority', width: 80 },
  { title: '状态', key: 'isActive', width: 80 },
  { title: '维度', key: 'dimensions', width: 100 },
  { title: '操作', key: 'action', width: 120, fixed: 'right' as const },
];

const matchTypeLabelMap: Record<string, string> = {
  default: '默认',
  ranking_list: '按榜单',
  position: '按岗位',
};
const matchTypeColorMap: Record<string, string> = {
  default: 'blue',
  ranking_list: 'green',
  position: 'purple',
};

interface DimForm {
  name: string;
  sourceType: string;
  sourceId: number | undefined;
  sortOrder: number;
  refType: string;
  refValue: number | undefined;
  refScope: string;
}

const loading = ref(false);
const saving = ref(false);
const templates = ref<any[]>([]);
const rankingLists = ref<any[]>([]);
const categories = ref<any[]>([]);
const indicators = ref<any[]>([]);

const drawerOpen = ref(false);
const editingId = ref<number | null>(null);
const form = ref({
  name: '',
  matchType: 'default',
  matchValue: '',
  priority: 0,
  isActive: 1,
  description: '',
  dimensions: [] as DimForm[],
});

// drag
const dragIdx = ref<number>(-1);

function onDragStart(idx: number) { dragIdx.value = idx; }
function onDrop(idx: number) {
  if (dragIdx.value < 0 || dragIdx.value === idx) return;
  const arr = form.value.dimensions;
  const [item] = arr.splice(dragIdx.value, 1);
  arr.splice(idx, 0, item);
  dragIdx.value = -1;
}

// 层级树形添加
const treeModalOpen = ref(false);
const checkedTreeKeys = ref<string[]>([]);

const dimTreeData = computed(() => {
  return categories.value.map((cat: any) => {
    const catInds = indicators.value.filter((ind: any) => String(ind.categoryId) === String(cat.id));
    return {
      title: cat.name,
      key: `cat_${cat.id}`,
      disableCheckbox: true,
      children: [
        { title: '整个分类', key: `cat_${cat.id}_whole` },
        ...catInds.map((ind: any) => ({ title: ind.name, key: `ind_${ind.id}` })),
      ],
    };
  });
});

function onTreeCheck(checkedInfo: any) {
  // checkStrictly 模式下 checkedInfo 是 { checked: Key[], halfChecked: Key[] }
  if (Array.isArray(checkedInfo)) {
    checkedTreeKeys.value = checkedInfo as string[];
  } else {
    checkedTreeKeys.value = (checkedInfo?.checked || []) as string[];
  }
}

function getSourceDisplay(dim: DimForm) {
  if (dim.sourceType === 'category') {
    const cat = categories.value.find((c: any) => String(c.id) === String(dim.sourceId));
    return { typeLabel: '管控项', typeColor: 'blue', sourceName: cat?.name || `ID:${dim.sourceId}` };
  }
  if (dim.sourceType === 'indicator') {
    const ind = indicators.value.find((i: any) => String(i.id) === String(dim.sourceId));
    return { typeLabel: '评价维度', typeColor: 'green', sourceName: ind?.name || `ID:${dim.sourceId}` };
  }
  return { typeLabel: '自定义', typeColor: 'default', sourceName: '' };
}

function openTreeModal() {
  checkedTreeKeys.value = [];
  treeModalOpen.value = true;
}

function confirmAddFromTree() {
  const keys = checkedTreeKeys.value;
  let addedCount = 0;
  for (const key of keys) {
    if (key.startsWith('cat_') && key.endsWith('_whole')) {
      const catIdStr = key.replace(/^cat_/, '').replace(/_whole$/, '');
      const catId = Number(catIdStr);
      if (form.value.dimensions.some((d) => d.sourceType === 'category' && String(d.sourceId) === catIdStr)) continue;
      const cat = categories.value.find((c: any) => String(c.id) === catIdStr);
      form.value.dimensions.push({
        name: cat?.name || '',
        sourceType: 'category',
        sourceId: catId,
        sortOrder: form.value.dimensions.length,
        refType: 'average',
        refValue: undefined,
        refScope: 'all',
      });
      addedCount++;
    } else if (key.startsWith('ind_')) {
      const indIdStr = key.replace(/^ind_/, '');
      const indId = Number(indIdStr);
      if (form.value.dimensions.some((d) => d.sourceType === 'indicator' && String(d.sourceId) === indIdStr)) continue;
      const ind = indicators.value.find((i: any) => String(i.id) === indIdStr);
      form.value.dimensions.push({
        name: ind?.name || '',
        sourceType: 'indicator',
        sourceId: indId,
        sortOrder: form.value.dimensions.length,
        refType: 'average',
        refValue: undefined,
        refScope: 'all',
      });
      addedCount++;
    }
  }
  if (addedCount === 0 && keys.length > 0) {
    message.info('所选维度已存在，未重复添加');
  }
  treeModalOpen.value = false;
}

function addCustomDim() {
  form.value.dimensions.push({
    name: '',
    sourceType: 'custom',
    sourceId: undefined,
    sortOrder: form.value.dimensions.length,
    refType: 'fixed',
    refValue: 0,
    refScope: 'all',
  });
}

function removeDim(idx: number) {
  form.value.dimensions.splice(idx, 1);
}

function handleMatchTypeChange() {
  form.value.matchValue = '';
}

function formatMatchValue(record: any) {
  if (record.matchType === 'default') return '-';
  if (record.matchType === 'ranking_list') {
    const rl = rankingLists.value.find((r: any) => String(r.id) === String(record.matchValue));
    return rl ? rl.name : record.matchValue;
  }
  return record.matchValue || '-';
}

function resetForm() {
  form.value = {
    name: '',
    matchType: 'default',
    matchValue: '',
    priority: 0,
    isActive: 1,
    description: '',
    dimensions: [],
  };
  editingId.value = null;
}

function showCreateDrawer() {
  resetForm();
  drawerOpen.value = true;
}

function showEditDrawer(record: any) {
  editingId.value = record.id;
  form.value = {
    name: record.name,
    matchType: record.matchType,
    matchValue: record.matchValue || '',
    priority: record.priority,
    isActive: record.isActive,
    description: record.description || '',
    dimensions: (record.dimensions || []).map((d: any, i: number) => ({
      name: d.name,
      sourceType: d.sourceType,
      sourceId: d.sourceId ?? undefined,
      sortOrder: d.sortOrder ?? i,
      refType: d.refType || 'average',
      refValue: d.refValue ?? undefined,
      refScope: d.refScope || 'all',
    })),
  };
  drawerOpen.value = true;
}

async function handleSave() {
  if (!form.value.name.trim()) {
    message.warning('请输入模板名称');
    return;
  }
  if (form.value.matchType !== 'default' && !form.value.matchValue) {
    message.warning('请填写匹配值');
    return;
  }

  const payload = {
    name: form.value.name,
    matchType: form.value.matchType,
    matchValue: form.value.matchType === 'default' ? null : form.value.matchValue,
    priority: form.value.priority,
    isActive: form.value.isActive,
    description: form.value.description || null,
    dimensions: form.value.dimensions.map((d, i) => ({
      name: d.name,
      sourceType: d.sourceType,
      sourceId: d.sourceId,
      sortOrder: i,
      refType: d.refType,
      refValue: d.refType === 'fixed' ? d.refValue : null,
      refScope: d.refScope || 'all',
    })),
  };

  saving.value = true;
  try {
    if (editingId.value) {
      await updateScoreProfileTemplate(editingId.value, payload);
      message.success('模板已更新');
    } else {
      await createScoreProfileTemplate(payload);
      message.success('模板已创建');
    }
    drawerOpen.value = false;
    await loadTemplates();
  } catch (err: any) {
    message.error(err?.response?.data?.message || '保存失败');
  } finally {
    saving.value = false;
  }
}

async function handleDelete(id: number) {
  try {
    await deleteScoreProfileTemplate(id);
    message.success('已删除');
    await loadTemplates();
  } catch (err: any) {
    message.error(err?.response?.data?.message || '删除失败');
  }
}

async function loadTemplates() {
  loading.value = true;
  try {
    templates.value = await getScoreProfileTemplates() as any;
  } finally {
    loading.value = false;
  }
}

onMounted(async () => {
  const [, rlRes, catRes, indRes] = await Promise.allSettled([
    loadTemplates(),
    getRankingLists(),
    getIndicatorCategories(),
    getIndicators({ pageSize: 1000 }),
  ]);
  if (rlRes.status === 'fulfilled') {
    const d = rlRes.value as any;
    rankingLists.value = Array.isArray(d?.data) ? d.data : Array.isArray(d) ? d : [];
  }
  if (catRes.status === 'fulfilled') {
    const d = catRes.value as any;
    const arr = d?.data ?? d;
    categories.value = Array.isArray(arr) ? arr : arr?.list || [];
  }
  if (indRes.status === 'fulfilled') {
    const d = indRes.value as any;
    const arr = d?.data ?? d;
    indicators.value = Array.isArray(arr) ? arr : arr?.list || [];
  }
});
</script>

<style scoped lang="less">
.page-container {
  padding: 16px 24px;
}
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  h2 { margin: 0; }
}
.card-box {
  background: #fff;
  padding: 16px;
  border-radius: 8px;
}
.dim-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 8px;
  margin-bottom: 4px;
  background: #fafafa;
  border-radius: 4px;
  border: 1px solid #f0f0f0;
  font-size: 12px;
  transition: background 0.2s;
  &:hover {
    background: #f0f0f0;
  }
  :deep(.ant-input) {
    font-size: 12px;
  }
  :deep(.ant-select-selection-item) {
    font-size: 12px;
  }
  :deep(.ant-input-number-input) {
    font-size: 12px;
  }
  :deep(.ant-tag) {
    margin-right: 4px;
    font-size: 11px;
    line-height: 18px;
    padding: 0 4px;
  }
}
.dim-drag {
  flex-shrink: 0;
  width: 20px;
  font-size: 14px;
}
.dim-content {
  flex: 1;
  min-width: 0;
}
.source-display {
  display: flex;
  align-items: center;
  min-width: 0;
  height: 24px;
  .source-name {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    color: #595959;
    font-size: 12px;
  }
}
.drawer-footer {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 12px 24px;
  border-top: 1px solid #f0f0f0;
  background: #fff;
  text-align: right;
}
</style>
