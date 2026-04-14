<template>
  <a-drawer v-model:open="visible" title="字段管理" :width="480" :closable="true">
    <div style="margin-bottom: 16px">
      <a-button type="primary" @click="startAdd"><PlusOutlined /> 新增字段</a-button>
    </div>

    <!-- 字段列表 -->
    <div class="dim-list">
      <div v-for="dim in sortedDimensions" :key="dim.id" class="dim-item" :class="{ 'dim-editing': editingId === dim.id }">
        <div class="dim-row">
          <div class="dim-sort-btns">
            <a-button type="text" size="small" :disabled="dim.sortOrder <= 1" @click="moveDimension(dim.id, 'up')">
              <ArrowUpOutlined />
            </a-button>
            <a-button type="text" size="small" :disabled="dim.sortOrder >= dimensions.length" @click="moveDimension(dim.id, 'down')">
              <ArrowDownOutlined />
            </a-button>
          </div>
          <span class="dim-name">{{ dim.name }}</span>
          <a-tag size="small" color="default" style="margin-left: 4px">{{ fieldTypeLabel(dim.fieldType) }}</a-tag>
          <a-tag v-if="dim.isSystem" size="small" color="blue" style="margin-left: 4px">系统</a-tag>
          <a-tag v-else size="small" color="orange" style="margin-left: 4px">自定义</a-tag>
          <div style="flex: 1" />
          <a-switch v-model:checked="dim.visible" size="small" checked-children="显" un-checked-children="隐" />
          <a-button v-if="!dim.isSystem" type="link" size="small" style="margin-left: 8px" @click="startEdit(dim)">
            <EditOutlined />
          </a-button>
          <a-popconfirm v-if="!dim.isSystem" title="确定删除该字段？" @confirm="removeDimension(dim.id)">
            <a-button type="link" danger size="small">
              <DeleteOutlined />
            </a-button>
          </a-popconfirm>
        </div>

        <!-- 编辑表单 -->
        <div v-if="editingId === dim.id" class="dim-edit-form">
          <a-form :model="editForm" layout="horizontal" :label-col="{ span: 6 }" size="small">
            <a-form-item label="字段名称">
              <a-input v-model:value="editForm.name" />
            </a-form-item>
            <a-form-item label="字段类型">
              <a-select v-model:value="editForm.fieldType" style="width: 100%">
                <a-select-option value="text">文本</a-select-option>
                <a-select-option value="number">数字</a-select-option>
                <a-select-option value="select">下拉选择</a-select-option>
                <a-select-option value="date">日期</a-select-option>
              </a-select>
            </a-form-item>
            <a-form-item label="是否必填">
              <a-switch v-model:checked="editForm.required" />
            </a-form-item>
            <a-form-item label="是否可见">
              <a-switch v-model:checked="editForm.visible" />
            </a-form-item>

            <!-- 下拉选项 -->
            <div v-if="editForm.fieldType === 'select'" class="options-section">
              <div class="options-title">下拉选项</div>
              <div v-for="opt in editForm.options" :key="opt.id" class="option-row">
                <a-input v-model:value="opt.label" size="small" style="flex: 1" />
                <a-input v-model:value="opt.value" size="small" style="width: 100px; margin-left: 4px" placeholder="值" />
                <a-select v-model:value="opt.color" size="small" style="width: 90px; margin-left: 4px" placeholder="颜色" allow-clear>
                  <a-select-option value="">默认</a-select-option>
                  <a-select-option value="success">绿色</a-select-option>
                  <a-select-option value="warning">橙色</a-select-option>
                  <a-select-option value="error">红色</a-select-option>
                  <a-select-option value="processing">蓝色</a-select-option>
                  <a-select-option value="default">灰色</a-select-option>
                </a-select>
                <a-button type="link" danger size="small" @click="removeOption(opt.id)" style="margin-left: 4px">
                  <DeleteOutlined />
                </a-button>
              </div>
              <a-button type="link" size="small" @click="addOption" style="margin-top: 4px">
                <PlusOutlined /> 添加选项
              </a-button>
            </div>

            <div style="text-align: right; margin-top: 12px">
              <a-button size="small" @click="editingId = null">取消</a-button>
              <a-button type="primary" size="small" style="margin-left: 8px" @click="saveEdit">保存</a-button>
            </div>
          </a-form>
        </div>
      </div>
    </div>

    <!-- 新增字段弹窗 -->
    <a-modal v-model:open="addDialogVisible" title="新增字段" :width="400">
      <a-form :model="addForm" layout="horizontal" :label-col="{ span: 6 }">
        <a-form-item label="字段名称">
          <a-input v-model:value="addForm.name" placeholder="如：适用岗位" />
        </a-form-item>
        <a-form-item label="唯一标识">
          <a-input v-model:value="addForm.key" placeholder="如：targetPosition" />
        </a-form-item>
        <a-form-item label="字段类型">
          <a-select v-model:value="addForm.fieldType" style="width: 100%">
            <a-select-option value="text">文本</a-select-option>
            <a-select-option value="number">数字</a-select-option>
            <a-select-option value="select">下拉选择</a-select-option>
            <a-select-option value="date">日期</a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item label="是否必填">
          <a-switch v-model:checked="addForm.required" />
        </a-form-item>
      </a-form>
      <template #footer>
        <a-button @click="addDialogVisible = false">取消</a-button>
        <a-button type="primary" @click="confirmAdd">确定</a-button>
      </template>
    </a-modal>
  </a-drawer>
</template>

<script setup lang="ts">
import { ref, reactive, computed } from 'vue';
import { message } from 'ant-design-vue';
import { PlusOutlined, EditOutlined, DeleteOutlined, ArrowUpOutlined, ArrowDownOutlined } from '@ant-design/icons-vue';

interface DimensionOption {
  id: number;
  label: string;
  value: string;
  color: string;
}

interface Dimension {
  id: number;
  key: string;
  name: string;
  fieldType: 'text' | 'number' | 'select' | 'date';
  required: boolean;
  visible: boolean;
  isSystem: boolean;
  sortOrder: number;
  options?: DimensionOption[];
}

const visible = defineModel<boolean>('open', { default: false });

// 默认字段列表
const dimensions = ref<Dimension[]>([
  { id: 1, key: 'employeeNo', name: '工号', fieldType: 'text', required: true, visible: true, isSystem: true, sortOrder: 1 },
  { id: 2, key: 'name', name: '姓名', fieldType: 'text', required: true, visible: true, isSystem: true, sortOrder: 2 },
  { id: 3, key: 'companyBelong', name: '归属组织', fieldType: 'select', required: true, visible: true, isSystem: true, sortOrder: 3 },
  { id: 4, key: 'department', name: '部门', fieldType: 'text', required: true, visible: true, isSystem: true, sortOrder: 4 },
  { id: 5, key: 'position', name: '岗位', fieldType: 'text', required: false, visible: true, isSystem: true, sortOrder: 5 },
  { id: 6, key: 'rankLevel', name: '职级', fieldType: 'select', required: false, visible: true, isSystem: true, sortOrder: 6 },
  { id: 7, key: 'rankingList', name: '榜单', fieldType: 'text', required: false, visible: true, isSystem: true, sortOrder: 7 },
  { id: 8, key: 'totalPoints', name: '积分', fieldType: 'number', required: false, visible: true, isSystem: true, sortOrder: 8 },
  { id: 9, key: 'ranking', name: '排名', fieldType: 'number', required: false, visible: true, isSystem: true, sortOrder: 9 },
  { id: 10, key: 'status', name: '状态', fieldType: 'select', required: false, visible: true, isSystem: true, sortOrder: 10 },
]);

const sortedDimensions = computed(() => [...dimensions.value].sort((a, b) => a.sortOrder - b.sortOrder));

function moveDimension(id: number, direction: 'up' | 'down') {
  const sorted = sortedDimensions.value;
  const idx = sorted.findIndex(d => d.id === id);
  if (idx < 0) return;
  const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
  if (swapIdx < 0 || swapIdx >= sorted.length) return;
  const tmpOrder = sorted[idx].sortOrder;
  sorted[idx].sortOrder = sorted[swapIdx].sortOrder;
  sorted[swapIdx].sortOrder = tmpOrder;
}

function removeDimension(id: number) {
  dimensions.value = dimensions.value.filter(d => d.id !== id);
  message.success('字段已删除');
}

// 编辑
const editingId = ref<number | null>(null);
const editForm = reactive<{
  name: string;
  fieldType: 'text' | 'number' | 'select' | 'date';
  required: boolean;
  visible: boolean;
  options: DimensionOption[];
}>({
  name: '',
  fieldType: 'text',
  required: false,
  visible: true,
  options: [],
});

function fieldTypeLabel(t: string) {
  const map: Record<string, string> = { text: '文本', number: '数字', select: '下拉', date: '日期' };
  return map[t] || t;
}

function startEdit(dim: Dimension) {
  editingId.value = dim.id;
  editForm.name = dim.name;
  editForm.fieldType = dim.fieldType;
  editForm.required = dim.required;
  editForm.visible = dim.visible;
  editForm.options = dim.options ? dim.options.map(o => ({ ...o })) : [];
}

function saveEdit() {
  if (!editingId.value) return;
  const dim = dimensions.value.find(d => d.id === editingId.value);
  if (dim) {
    dim.name = editForm.name;
    dim.fieldType = editForm.fieldType;
    dim.required = editForm.required;
    dim.visible = editForm.visible;
    dim.options = editForm.fieldType === 'select' ? [...editForm.options] : undefined;
  }
  message.success('字段已保存');
  editingId.value = null;
}

function addOption() {
  const maxId = editForm.options.reduce((m, o) => Math.max(m, o.id), 0);
  editForm.options.push({ id: maxId + 1, label: '', value: '', color: '' });
}

function removeOption(id: number) {
  editForm.options = editForm.options.filter(o => o.id !== id);
}

// 新增
const addDialogVisible = ref(false);
const addForm = reactive({
  name: '',
  key: '',
  fieldType: 'text' as 'text' | 'number' | 'select' | 'date',
  required: false,
});

function startAdd() {
  addForm.name = '';
  addForm.key = '';
  addForm.fieldType = 'text';
  addForm.required = false;
  addDialogVisible.value = true;
}

function confirmAdd() {
  if (!addForm.name.trim()) { message.warning('请输入字段名称'); return; }
  if (!addForm.key.trim()) { message.warning('请输入唯一标识'); return; }
  if (dimensions.value.find(d => d.key === addForm.key)) { message.warning('唯一标识已存在'); return; }
  const maxId = dimensions.value.reduce((m, d) => Math.max(m, d.id), 0);
  const maxOrder = dimensions.value.reduce((m, d) => Math.max(m, d.sortOrder), 0);
  dimensions.value.push({
    id: maxId + 1,
    key: addForm.key,
    name: addForm.name,
    fieldType: addForm.fieldType,
    required: addForm.required,
    visible: true,
    isSystem: false,
    sortOrder: maxOrder + 1,
  });
  message.success('字段已新增');
  addDialogVisible.value = false;
}
</script>

<style scoped lang="less">
.dim-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.dim-item {
  border: 1px solid #f0f0f0;
  border-radius: 6px;
  padding: 8px 12px;
  transition: all 0.2s;
  &:hover { border-color: #d9d9d9; }
}
.dim-editing {
  border-color: #1890ff;
  background: #e6f7ff;
}
.dim-row {
  display: flex;
  align-items: center;
  gap: 4px;
}
.dim-sort-btns {
  display: flex;
  flex-direction: column;
  margin-right: 4px;
  .ant-btn { padding: 0; height: 16px; }
}
.dim-name {
  font-size: 14px;
  font-weight: 500;
}
.dim-edit-form {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px dashed #d9d9d9;
}
.options-section {
  background: #fafafa;
  border-radius: 4px;
  padding: 8px 12px;
  margin-top: 4px;
}
.options-title {
  font-size: 13px;
  font-weight: 500;
  margin-bottom: 8px;
  color: #595959;
}
.option-row {
  display: flex;
  align-items: center;
  margin-bottom: 4px;
}
</style>
