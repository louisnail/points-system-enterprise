<template>
  <div class="page-container">
    <div class="page-header"><h2>指标列表</h2></div>
    <div class="card-box">
      <div class="filter-bar">
        <a-select v-model:value="filterCategory" placeholder="管控项" style="width: 160px" allow-clear @change="loadData">
          <a-select-option v-for="c in categories" :key="c.id" :value="c.id">{{ c.name }}</a-select-option>
        </a-select>
        <a-select v-model:value="filterDirection" placeholder="方向" style="width: 100px" allow-clear @change="loadData">
          <a-select-option :value="1">加分</a-select-option>
          <a-select-option :value="-1">扣分</a-select-option>
        </a-select>
        <a-select v-model:value="filterPointStatus" placeholder="积分状态" style="width: 120px" allow-clear @change="loadData">
          <a-select-option :value="1">过程分</a-select-option>
          <a-select-option :value="2">结果分</a-select-option>
        </a-select>
        <a-select v-model:value="filterClassification" placeholder="积分归类" style="width: 150px" allow-clear @change="loadData">
          <a-select-option v-for="t in classificationOptions" :key="t" :value="t">{{ t }}</a-select-option>
        </a-select>
        <a-select v-model:value="filterRankingListId" placeholder="关联榜单" style="width: 160px" allow-clear show-search :filter-option="filterRLOption" @change="loadData">
          <a-select-option v-for="rl in rankingLists" :key="rl.id" :value="rl.id">{{ rl.name }}</a-select-option>
        </a-select>
      </div>
      <div class="table-actions">
        <div>
          <a-button type="primary" @click="showForm()">新增指标</a-button>
          <a-button style="margin-left: 8px" @click="handleExport">导出</a-button>
          <a-button style="margin-left: 8px" @click="handleDownloadTemplate">模板下载</a-button>
          <a-upload :show-upload-list="false" :before-upload="handleImport" accept=".xlsx,.xls" style="display: inline-block; margin-left: 8px">
            <a-button>批量导入</a-button>
          </a-upload>
          <a-button style="margin-left: 8px" @click="fieldDrawerVisible = true"><SettingOutlined /> 字段管理</a-button>
          <a-select v-model:value="batchRankingListId" placeholder="设置关联榜单" style="width: 180px; margin-left: 12px" allow-clear>
            <a-select-option v-for="rl in rankingLists" :key="rl.id" :value="rl.id">{{ rl.name }}</a-select-option>
          </a-select>
          <a-button type="primary" style="margin-left: 4px" :loading="batchSettingRL" :disabled="!selectedRowKeys.length" @click="handleBatchSetRankingList">
            应用{{ selectedRowKeys.length ? ` (${selectedRowKeys.length})` : '' }}
          </a-button>
          <a-button danger style="margin-left: 8px" :disabled="!selectedRowKeys.length" :loading="batchDeleting" @click="handleBatchDelete">
            批量删除{{ selectedRowKeys.length ? ` (${selectedRowKeys.length})` : '' }}
          </a-button>
        </div>
      </div>
      <a-table :columns="displayColumns" :data-source="filteredByClassification" :loading="loading" row-key="id" size="middle"
        :scroll="{ x: scrollX }" @resizeColumn="handleResizeColumn"
        :row-selection="{ selectedRowKeys, onChange: onSelectChange as any }">
        <template #headerCell="{ column }">
          <span
            draggable="true"
            style="cursor: grab; user-select: none"
            @dragstart="onColDragStart($event, String(column.key ?? ''))"
            @dragover.prevent="onColDragOver($event, String(column.key ?? ''))"
            @dragleave="onColDragLeave"
            @drop="onColDrop($event, String(column.key ?? ''))"
          >{{ column.title }}</span>
        </template>
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'name'">
            <a-tooltip :title="record.name" placement="topLeft">
              <span>{{ record.name }}</span>
            </a-tooltip>
          </template>
          <template v-if="column.key === 'category'">{{ record.category?.name || '-' }}</template>
          <template v-if="column.key === 'direction'">
            <a-tag :color="record.direction === 1 ? 'green' : 'red'">{{ record.direction === 1 ? '加分' : '扣分' }}</a-tag>
          </template>
          <template v-if="column.key === 'score'">
            <span v-if="record.scoreType === 1">{{ Number(record.fixedScore) }} 分</span>
            <span v-else>{{ Number(record.minScore) }} ~ {{ Number(record.maxScore) }} 分</span>
          </template>
          <template v-if="column.key === 'pointStatus'">
            <a-tag :color="record.pointStatus === 1 ? 'orange' : 'blue'">{{ record.pointStatus === 1 ? '过程分' : '结果分' }}</a-tag>
          </template>
          <template v-if="column.key === 'rankingListName'">
            {{ record.rankingList?.name || '通用' }}
          </template>
          <template v-if="String(column.key).startsWith('cf_')">
            {{ record.customFields?.[String(column.key).slice(3)] ?? '-' }}
          </template>
          <template v-if="column.key === 'action'">
            <a-space>
              <a @click="showForm(record)">编辑</a>
              <a-popconfirm title="确认停用？" @confirm="handleRemove(record.id)">
                <a style="color: #ff4d4f">停用</a>
              </a-popconfirm>
            </a-space>
          </template>
        </template>
      </a-table>
    </div>

    <a-modal v-model:open="formVisible" :title="formData.id ? '编辑指标' : '新增指标'" width="640px" @ok="handleSubmit" :confirm-loading="submitting">
      <a-form :model="formData" layout="vertical">
        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item label="管控项" required>
              <a-select v-model:value="formData.categoryId">
                <a-select-option v-for="c in categories" :key="c.id" :value="c.id">{{ c.name }}</a-select-option>
              </a-select>
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="评价维度" required><a-input v-model:value="formData.name" /></a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="方向" required>
              <a-radio-group v-model:value="formData.direction">
                <a-radio :value="1">加分</a-radio>
                <a-radio :value="-1">扣分</a-radio>
              </a-radio-group>
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="分值类型" required>
              <a-radio-group v-model:value="formData.scoreType">
                <a-radio :value="1">固定</a-radio>
                <a-radio :value="2">范围</a-radio>
              </a-radio-group>
            </a-form-item>
          </a-col>
          <a-col :span="12" v-if="formData.scoreType === 1">
            <a-form-item label="固定分值">
              <a-input-number v-model:value="formData.fixedScore" :step="0.1" style="width: 100%"
                :min="formData.direction === -1 ? undefined : 0"
                :max="formData.direction === -1 ? 0 : undefined"
              />
            </a-form-item>
          </a-col>
          <template v-if="formData.scoreType === 2">
            <a-col :span="12">
              <a-form-item label="最小分值">
                <a-input-number v-model:value="formData.minScore" :step="0.1" style="width: 100%"
                  :min="formData.direction === -1 ? undefined : 0"
                  :max="formData.direction === -1 ? 0 : undefined"
                />
              </a-form-item>
            </a-col>
            <a-col :span="12">
              <a-form-item label="最大分值">
                <a-input-number v-model:value="formData.maxScore" :step="0.1" style="width: 100%"
                  :min="formData.direction === -1 ? undefined : 0"
                  :max="formData.direction === -1 ? 0 : undefined"
                />
              </a-form-item>
            </a-col>
          </template>
          <a-col :span="12">
            <a-form-item label="积分状态" required>
              <a-radio-group v-model:value="formData.pointStatus">
                <a-radio :value="1">过程分</a-radio>
                <a-radio :value="2">结果分</a-radio>
              </a-radio-group>
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="积分归类">
              <a-select v-model:value="formData.rankingListType" allow-clear>
                <a-select-option v-for="t in classificationOptions" :key="t" :value="t">{{ t }}</a-select-option>
              </a-select>
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="关联榜单">
              <a-select v-model:value="formData.rankingListId" placeholder="通用（不限榜单）" allow-clear>
                <a-select-option v-for="rl in rankingLists" :key="rl.id" :value="rl.id">{{ rl.name }}</a-select-option>
              </a-select>
            </a-form-item>
          </a-col>
          <!-- 自定义字段 -->
          <a-col :span="12" v-for="cf in customDefs" :key="cf.fieldKey">
            <a-form-item :label="cf.displayName" :required="!!cf.isRequired">
              <a-input v-if="cf.fieldType === 'text'" v-model:value="formData.customFields[cf.fieldKey]" />
              <a-input-number v-else-if="cf.fieldType === 'number'" v-model:value="formData.customFields[cf.fieldKey]" style="width: 100%" />
              <a-date-picker v-else-if="cf.fieldType === 'date'" v-model:value="formData.customFields[cf.fieldKey]" style="width: 100%" value-format="YYYY-MM-DD" />
              <a-select v-else-if="cf.fieldType === 'select'" v-model:value="formData.customFields[cf.fieldKey]" allow-clear>
                <a-select-option v-for="opt in (cf.options || [])" :key="opt" :value="opt">{{ opt }}</a-select-option>
              </a-select>
              <a-input v-else v-model:value="formData.customFields[cf.fieldKey]" />
            </a-form-item>
          </a-col>
        </a-row>
      </a-form>
    </a-modal>

    <!-- 字段管理抽屉 -->
    <a-drawer v-model:open="fieldDrawerVisible" title="字段管理" :width="380" placement="right">
      <div style="margin-bottom: 16px">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px">
          <div style="font-weight: 600; color: #333">已选字段</div>
          <a-button size="small" type="dashed" @click="addCustomVisible = true">
            <template #icon><PlusOutlined /></template>
            新增自定义字段
          </a-button>
        </div>
        <p style="color: #8c8c8c; font-size: 12px; margin-bottom: 8px">拖拽调整顺序，操作列始终固定在最右</p>
        <div class="field-list">
          <div
            v-for="(field, idx) in fieldConfig.filter(f => f.visible)"
            :key="field.key"
            class="field-item"
            :class="{ 'field-item--dragging': dragFieldIdx === idx }"
            :draggable="field.key !== 'action'"
            @dragstart="onFieldDragStart(fieldConfig.indexOf(field))"
            @dragover.prevent="onFieldDragOver(fieldConfig.indexOf(field))"
            @drop="onFieldDrop(fieldConfig.indexOf(field))"
            @dragend="dragFieldIdx = -1"
          >
            <HolderOutlined v-if="field.key !== 'action'" style="cursor: grab; color: #bbb; margin-right: 8px" />
            <span v-else style="width: 22px" />
            <span style="flex: 1; font-weight: 500">{{ field.title }}</span>
            <a-tag v-if="field.isCustom" color="blue" style="margin-right: 4px; font-size: 11px">自定义</a-tag>
            <a-tooltip title="编辑" v-if="field.isCustom">
              <a style="color: #1890ff; font-size: 12px; margin-right: 6px" @click="showEditCustomField(field)">编辑</a>
            </a-tooltip>
            <a-tooltip title="隐藏" v-if="field.key !== 'action' && !field.required">
              <a style="color: #8c8c8c; font-size: 14px; margin-right: 6px" @click="removeField(field.key); applyFieldConfig()">
                <EyeInvisibleOutlined />
              </a>
            </a-tooltip>
            <a-popconfirm v-if="field.isCustom" title="确认删除该自定义字段？数据将不可恢复。" @confirm="handleDeleteCustomField(field.key)">
              <a style="color: #ff4d4f; font-size: 12px">删除</a>
            </a-popconfirm>
          </div>
        </div>
      </div>
      <div v-if="hiddenFields.length > 0">
        <div style="font-weight: 600; margin-bottom: 8px; color: #333">已隐藏字段</div>
        <div class="field-list">
          <div v-for="field in hiddenFields" :key="field.key" class="field-item" style="background: #fff">
            <span style="flex: 1; font-weight: 500">{{ field.title }}</span>
            <a-tag v-if="field.isCustom" color="blue" style="margin-right: 4px; font-size: 11px">自定义</a-tag>
            <a style="color: #1890ff; font-size: 12px" @click="addField(field.key); applyFieldConfig()">显示</a>
          </div>
        </div>
      </div>
      <template #footer>
        <a-button type="primary" @click="applyFieldConfig" block>应用配置</a-button>
      </template>
    </a-drawer>

    <!-- 新增自定义字段弹窗 -->
    <a-modal v-model:open="addCustomVisible" title="新增自定义字段" @ok="handleAddCustomField" :width="420">
      <a-form layout="vertical">
        <a-form-item label="字段名称" required>
          <a-input v-model:value="newFieldForm.displayName" placeholder="如：适用范围" />
        </a-form-item>
        <a-form-item label="字段类型">
          <a-select v-model:value="newFieldForm.fieldType">
            <a-select-option value="text">文本</a-select-option>
            <a-select-option value="number">数字</a-select-option>
            <a-select-option value="date">日期</a-select-option>
            <a-select-option value="select">下拉选项</a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item v-if="newFieldForm.fieldType === 'select'" label="选项（逗号分隔）">
          <a-input v-model:value="newFieldForm.options" placeholder="选项1,选项2,选项3" />
        </a-form-item>
      </a-form>
    </a-modal>

    <!-- 编辑自定义字段弹窗 -->
    <a-modal v-model:open="editCustomVisible" title="编辑自定义字段" @ok="handleEditCustomField" :width="420">
      <a-form layout="vertical">
        <a-form-item label="字段名称" required>
          <a-input v-model:value="editFieldForm.displayName" />
        </a-form-item>
        <a-form-item label="字段类型">
          <a-select v-model:value="editFieldForm.fieldType">
            <a-select-option value="text">文本</a-select-option>
            <a-select-option value="number">数字</a-select-option>
            <a-select-option value="date">日期</a-select-option>
            <a-select-option value="select">下拉选项</a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item v-if="editFieldForm.fieldType === 'select'" label="选项（逗号分隔）">
          <a-input v-model:value="editFieldForm.options" placeholder="选项1,选项2,选项3" />
        </a-form-item>
        <a-form-item label="是否必填">
          <a-switch :checked="!!editFieldForm.isRequired" @change="(v: any) => editFieldForm.isRequired = v ? 1 : 0" />
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, watch, h } from 'vue';
import { message, Modal } from 'ant-design-vue';
import { SettingOutlined, HolderOutlined, PlusOutlined, EyeInvisibleOutlined } from '@ant-design/icons-vue';
import { getIndicators, getIndicatorCategories, createIndicator, updateIndicator, deleteIndicator, exportIndicators, getIndicatorTemplate, importIndicators, batchSetIndicatorRankingList, checkIndicatorAssociations, batchDeleteIndicators } from '@/api/indicator.api';
import { getRankingLists } from '@/api/ranking-list.api';
import { useFieldPool } from '@/composables/useFieldPool';
import { useCustomFields } from '@/composables/useCustomFields';

const classificationOptions = computed(() => {
  const options = ['通用积分'];
  for (const rl of rankingLists.value) {
    options.push(rl.name + '积分');
  }
  return options;
});

// ===== 使用 useFieldPool 管理列 =====
const allIndicatorColumns = [
  { key: 'category', title: '管控项', width: 140, resizable: true },
  { key: 'name', title: '评价维度', dataIndex: 'name', width: 200, ellipsis: true, resizable: true },
  { key: 'direction', title: '方向', width: 70, resizable: true },
  { key: 'score', title: '标准分值', width: 140, resizable: true },
  { key: 'pointStatus', title: '积分状态', width: 90, resizable: true },
  { key: 'rankingListType', title: '积分归类', dataIndex: 'rankingListType', width: 120, resizable: true },
  { key: 'rankingListName', title: '关联榜单', width: 130, resizable: true },
];

const {
  fieldConfig,
  dragFieldIdx,
  onDragStart: onFieldDragStart,
  onDragOver: onFieldDragOver,
  onDragDrop: onFieldDrop,
  visibleColumns,
  hiddenFields,
  addField,
  removeField,
  applyAndSave,
  updateAllFields,
} = useFieldPool('indicator-list-fields', allIndicatorColumns);

// 自定义字段
const {
  definitions: customDefs,
  loadDefinitions: loadCustomDefs,
  toFieldPoolEntries,
  addDefinition: addCustomDef,
  removeDefinition: removeCustomDef,
  updateDefinition: updateCustomDef,
} = useCustomFields('indicator');

const addCustomVisible = ref(false);
const newFieldForm = reactive<any>({ displayName: '', fieldType: 'text', options: '' });

async function handleAddCustomField() {
  if (!newFieldForm.displayName) {
    message.warning('请填写字段名称');
    return;
  }
  try {
    await addCustomDef({
      displayName: newFieldForm.displayName,
      fieldType: newFieldForm.fieldType,
      options: newFieldForm.fieldType === 'select' && newFieldForm.options
        ? newFieldForm.options.split(',').map((s: string) => s.trim()).filter(Boolean)
        : undefined,
    });
    message.success('自定义字段已添加');
    addCustomVisible.value = false;
    Object.assign(newFieldForm, { displayName: '', fieldType: 'text', options: '' });
    await refreshFieldPool();
  } catch (err: any) {
    message.error(err?.response?.data?.message || '添加失败');
  }
}

async function handleDeleteCustomField(fieldKey: string) {
  const def = customDefs.value.find((d) => `cf_${d.fieldKey}` === fieldKey);
  if (!def) return;
  try {
    await removeCustomDef(def.id);
    message.success('自定义字段已删除');
    await refreshFieldPool();
  } catch {
    message.error('删除失败');
  }
}

async function refreshFieldPool() {
  await loadCustomDefs();
  const merged = [...allIndicatorColumns, ...toFieldPoolEntries()];
  updateAllFields(merged);
}

// 编辑自定义字段
const editCustomVisible = ref(false);
const editFieldForm = reactive<any>({ id: 0, displayName: '', fieldType: 'text', options: '', isRequired: 0 });

function showEditCustomField(field: any) {
  const def = customDefs.value.find((d) => `cf_${d.fieldKey}` === field.key);
  if (!def) return;
  editFieldForm.id = def.id;
  editFieldForm.displayName = def.displayName;
  editFieldForm.fieldType = def.fieldType;
  editFieldForm.options = (def.options || []).join(',');
  editFieldForm.isRequired = def.isRequired;
  editCustomVisible.value = true;
}

async function handleEditCustomField() {
  if (!editFieldForm.displayName) { message.warning('请填写字段名称'); return; }
  try {
    await updateCustomDef(editFieldForm.id, {
      displayName: editFieldForm.displayName,
      fieldType: editFieldForm.fieldType,
      isRequired: editFieldForm.isRequired,
      options: editFieldForm.fieldType === 'select' && editFieldForm.options
        ? editFieldForm.options.split(',').map((s: string) => s.trim()).filter(Boolean)
        : undefined,
    });
    message.success('自定义字段已更新');
    editCustomVisible.value = false;
    await refreshFieldPool();
  } catch (err: any) {
    message.error(err?.response?.data?.message || '更新失败');
  }
}

const fieldDrawerVisible = ref(false);

const columnWidths = ref<Record<string, number>>({});
const displayColumns = computed(() => [
  ...visibleColumns.value.map(c => ({
    ...c,
    width: columnWidths.value[c.key] || c.width,
  })),
  { title: '操作', key: 'action', width: 110, fixed: 'right' as const },
]);
const scrollX = computed(() => displayColumns.value.reduce((sum: number, col: any) => sum + (col.width || 120), 0));

function handleResizeColumn(w: number, col: any) {
  const key = col.key || col.dataIndex;
  if (key) columnWidths.value[key] = w;
}

function applyFieldConfig() {
  applyAndSave();
  fieldDrawerVisible.value = false;
  message.success('字段配置已保存');
}

// ===== 列拖拽排序（表头） =====
const dragColKey = ref<string | null>(null);
const dragOverColKey = ref<string | null>(null);

function onColDragStart(e: DragEvent, key: string) {
  if (key === 'action') { e.preventDefault(); return; }
  dragColKey.value = key;
  if (e.dataTransfer) e.dataTransfer.effectAllowed = 'move';
}

function onColDragOver(_e: DragEvent, key: string) {
  if (key === 'action' || !dragColKey.value) return;
  dragOverColKey.value = key;
}

function onColDragLeave() {
  dragOverColKey.value = null;
}

function onColDrop(_e: DragEvent, key: string) {
  if (!dragColKey.value || key === 'action' || dragColKey.value === key) {
    dragColKey.value = null;
    dragOverColKey.value = null;
    return;
  }
  // Swap in fieldConfig ordering
  const configs = fieldConfig.value;
  const fromIdx = configs.findIndex(c => c.key === dragColKey.value);
  const toIdx = configs.findIndex(c => c.key === key);
  if (fromIdx >= 0 && toIdx >= 0) {
    const [moved] = configs.splice(fromIdx, 1);
    configs.splice(toIdx, 0, moved);
  }
  dragColKey.value = null;
  dragOverColKey.value = null;
  applyAndSave();
}

// ===== 筛选 =====
const list = ref<any[]>([]);
const categories = ref<any[]>([]);
const rankingLists = ref<any[]>([]);
const loading = ref(false);
const filterCategory = ref<number>();
const filterDirection = ref<number>();
const filterPointStatus = ref<number>();
const filterClassification = ref<string>();
const filterRankingListId = ref<number>();
const formVisible = ref(false);
const submitting = ref(false);
const formData = reactive<any>({});

function filterRLOption(input: string, option: any) {
  return String(option.children || option.label || '').toLowerCase().includes(input.toLowerCase());
}

// 方向切换时重置分值，确保加分≥0，扣分≤0
watch(() => formData.direction, (newDir, oldDir) => {
  if (oldDir === undefined || newDir === oldDir) return;
  formData.fixedScore = undefined;
  formData.minScore = undefined;
  formData.maxScore = undefined;
});

// ===== 行选择 & 批量设置榜单 =====
const selectedRowKeys = ref<number[]>([]);
const batchRankingListId = ref<number | undefined>();
const batchSettingRL = ref(false);

function onSelectChange(keys: (string | number)[]) {
  selectedRowKeys.value = keys as number[];
}

async function handleBatchSetRankingList() {
  if (!selectedRowKeys.value.length) return;
  batchSettingRL.value = true;
  try {
    await batchSetIndicatorRankingList(selectedRowKeys.value, batchRankingListId.value ?? null);
    message.success(`已更新 ${selectedRowKeys.value.length} 条指标的关联榜单`);
    selectedRowKeys.value = [];
    batchRankingListId.value = undefined;
    loadData();
  } catch (err: any) {
    message.error(err?.response?.data?.message || '批量设置失败');
  } finally {
    batchSettingRL.value = false;
  }
}

// ===== 批量删除 =====
const batchDeleting = ref(false);

async function handleBatchDelete() {
  if (!selectedRowKeys.value.length) return;
  batchDeleting.value = true;
  try {
    const checkResult: any = await checkIndicatorAssociations(selectedRowKeys.value);
    if (checkResult.blockedIds?.length > 0) {
      Modal.warning({
        title: '以下指标存在关联数据，无法删除',
        content: h('div', { style: 'max-height:240px;overflow:auto' },
          (checkResult.details || []).map((d: any) =>
            h('div', { style: 'margin:6px 0;color:#ff4d4f' },
              `「${d.indicatorName}」关联 ${d.pointCount} 条积分记录、${d.dimensionCount} 个画像维度`
            )
          )
        ),
        width: 520,
      });
      return;
    }
    Modal.confirm({
      title: '永久删除',
      content: `将永久删除 ${selectedRowKeys.value.length} 个指标，此操作不可恢复！`,
      okText: '确认删除',
      okType: 'danger',
      onOk: async () => {
        try {
          const res: any = await batchDeleteIndicators(selectedRowKeys.value);
          message.success(res.message || `已永久删除 ${selectedRowKeys.value.length} 个指标`);
          selectedRowKeys.value = [];
          loadData();
        } catch (err: any) {
          message.error(err?.response?.data?.message || '批量删除失败');
        }
      },
    });
  } catch (err: any) {
    message.error(err?.response?.data?.message || '检查关联数据失败');
  } finally {
    batchDeleting.value = false;
  }
}

const filteredByClassification = computed(() => {
  if (!filterClassification.value) return list.value;
  return list.value.filter((item: any) => item.rankingListType === filterClassification.value);
});

onMounted(async () => { loadData(); loadCategories(); loadRankingLists(); await refreshFieldPool(); });

async function loadData() {
  loading.value = true;
  try {
    list.value = await getIndicators({ categoryId: filterCategory.value, direction: filterDirection.value, pointStatus: filterPointStatus.value, rankingListId: filterRankingListId.value }) as any;
  } finally {
    loading.value = false;
  }
}

async function loadCategories() {
  try {
    categories.value = await getIndicatorCategories() as any;
  } catch { /* ignore */ }
}

async function loadRankingLists() {
  try {
    const res: any = await getRankingLists();
    rankingLists.value = Array.isArray(res) ? res : res.list || [];
  } catch { /* ignore */ }
}

function showForm(record?: any) {
  Object.keys(formData).forEach((k) => delete formData[k]);
  if (record) {
    Object.assign(formData, { ...record });
    if (!formData.customFields) formData.customFields = {};
  } else {
    formData.direction = 1;
    formData.scoreType = 1;
    formData.pointStatus = 1;
    formData.customFields = {};
  }
  formVisible.value = true;
}

async function handleSubmit() {
  submitting.value = true;
  try {
    const scalarFields = [
      'categoryId', 'name', 'direction', 'scoreType', 'fixedScore',
      'minScore', 'maxScore', 'pointStatus', 'rankingListType',
      'rankingListId', 'customFields',
    ];
    const payload: Record<string, any> = {};
    for (const key of scalarFields) {
      if (formData[key] !== undefined) payload[key] = formData[key];
    }

    if (formData.id) {
      await updateIndicator(formData.id, payload);
      message.success('更新成功');
    } else {
      await createIndicator(payload);
      message.success('创建成功');
    }
    formVisible.value = false;
    loadData();
  } catch (err: any) {
    message.error(err?.response?.data?.message || '提交失败');
  } finally {
    submitting.value = false;
  }
}

async function handleRemove(id: number) {
  try {
    await deleteIndicator(id);
    message.success('已停用');
    loadData();
  } catch (err: any) {
    message.error(err?.response?.data?.message || '停用失败');
  }
}

async function handleExport() {
  const blob: any = await exportIndicators();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'indicators.xlsx';
  a.click();
  URL.revokeObjectURL(url);
}

async function handleDownloadTemplate() {
  const blob: any = await getIndicatorTemplate();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'indicator_template.xlsx';
  a.click();
  URL.revokeObjectURL(url);
}

async function handleImport(file: File) {
  const res: any = await importIndicators(file);
  const hasErrors = res.failed > 0;
  const hasWarnings = res.warnings?.length > 0;
  if (hasErrors || hasWarnings) {
    Modal.warning({
      title: `导入完成：成功 ${res.success} 条${res.failed > 0 ? `，失败 ${res.failed} 条` : ''}`,
      content: h('div', { style: 'max-height:300px;overflow:auto' }, [
        ...(res.errors || []).map((err: string) => h('div', { style: 'color:#ff4d4f;margin:4px 0' }, err)),
        ...(res.warnings || []).map((w: string) => h('div', { style: 'color:#faad14;margin:4px 0' }, w)),
      ]),
      width: 560,
    });
  } else {
    message.success(`导入成功：共 ${res.success} 条`);
  }
  loadData();
  return false;
}
</script>

<style scoped lang="less">
.field-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.field-item {
  display: flex;
  align-items: center;
  gap: 8px;
  border: 1px solid #f0f0f0;
  border-radius: 6px;
  padding: 8px 12px;
  background: #fafafa;
  cursor: grab;
  transition: border-color 0.2s;
  &:hover { border-color: #d9d9d9; }
  &--dragging { opacity: 0.4; border-color: #1890ff; }
}
</style>
