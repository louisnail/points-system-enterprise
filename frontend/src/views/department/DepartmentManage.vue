<template>
  <div class="page-container">
    <div class="page-header"><h2>部门管理</h2></div>
    <a-row :gutter="16">
      <!-- 左侧 — 组织架构树 (7/24) -->
      <a-col :span="7">
        <div class="card-box dept-tree-panel">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px">
            <strong>组织架构</strong>
            <a-button type="primary" size="small" @click="showForm()">
              <template #icon><SettingOutlined /></template>
              新增部门
            </a-button>
          </div>
          <a-tree
            :tree-data="treeData"
            :field-names="{ title: 'name', key: 'id', children: 'children' }"
            default-expand-all
            show-line
            block-node
            draggable
            @select="handleSelect"
            @drop="handleDrop"
            :selected-keys="selectedKeys"
          >
            <template #title="nodeData">
              <div
                class="dept-tree-node"
                :class="{ 'dept-tree-node--selected': selectedKeys.includes(nodeData.id) }"
              >
                <span class="dept-tree-node__name">{{ nodeData.name }}</span>
                <a-badge
                  :count="nodeData.totalMemberCount ?? nodeData.memberCount ?? 0"
                  :number-style="{ backgroundColor: '#1890ff', fontSize: '11px' }"
                  :overflow-count="999"
                  class="dept-tree-node__badge"
                />
              </div>
            </template>
          </a-tree>
        </div>
      </a-col>

      <!-- 右侧 — 部门详情 & 员工列表 (17/24) -->
      <a-col :span="17">
        <div class="card-box" v-if="selectedDept">
          <a-descriptions title="部门信息" :column="2" bordered size="small">
            <a-descriptions-item label="部门名称">{{ selectedDept.name }}</a-descriptions-item>
            <a-descriptions-item label="上级部门">{{ parentDeptName }}</a-descriptions-item>
            <a-descriptions-item label="成员数">
              <a-badge :count="selectedDept.totalMemberCount ?? selectedDept.memberCount ?? 0" :number-style="{ backgroundColor: '#1890ff' }" show-zero />
            </a-descriptions-item>
            <a-descriptions-item label="部门主管">
              <template v-if="selectedDept.managerName">
                <UserOutlined style="margin-right: 4px" />{{ selectedDept.managerName }}
              </template>
              <span v-else style="color: #bbb">未设置</span>
            </a-descriptions-item>
            <a-descriptions-item label="创建时间">{{ selectedDept.createdAt }}</a-descriptions-item>
          </a-descriptions>

          <!-- 子部门列表 -->
          <div v-if="childDepts.length" style="margin-top: 16px">
            <strong style="display: block; margin-bottom: 8px">子部门 ({{ childDepts.length }})</strong>
            <a-tag v-for="child in childDepts" :key="child.id" color="blue" style="margin-bottom: 4px; cursor: pointer" @click="selectDept(child)">
              {{ child.name }} ({{ child.totalMemberCount ?? child.memberCount ?? 0 }}人)
            </a-tag>
          </div>

          <a-space style="margin-top: 12px">
            <a-button type="primary" size="small" @click="showForm(selectedDept)">编辑</a-button>
            <a-popconfirm title="确认删除该部门？有子部门或员工时不可删除。" @confirm="handleDelete(selectedDept.id)">
              <a-button danger size="small">删除</a-button>
            </a-popconfirm>
            <a-button size="small" @click="showForm(undefined, selectedDept.id)">添加子部门</a-button>
            <a-button size="small" @click="showManagerModal">设置主管</a-button>
          </a-space>
        </div>

        <!-- 部门员工列表 -->
        <div class="card-box" v-if="selectedDept" style="margin-top: 16px">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px">
            <div>
              <strong>部门员工 ({{ deptEmployees.length }})</strong>
              <a-button v-if="selectedEmpKeys.length > 0" size="small" style="margin-left: 12px" @click="transferDeptVisible = true">
                调整部门 ({{ selectedEmpKeys.length }})
              </a-button>
            </div>
            <a-space>
              <a-input-search v-model:value="empKeyword" placeholder="搜索工号/姓名" style="width: 180px" @search="loadDeptEmployees" allow-clear />
              <a-select v-model:value="empCompanyFilter" placeholder="归属组织" style="width: 110px" allow-clear @change="loadDeptEmployees">
                <a-select-option v-for="cb in companyBelongList" :key="cb" :value="cb">{{ cb }}</a-select-option>
              </a-select>
            </a-space>
          </div>
          <a-table
            :columns="empColumns"
            :data-source="deptEmployees"
            :loading="empLoading"
            row-key="id"
            size="small"
            :pagination="{ pageSize: 10, size: 'small' }"
            :row-selection="{ selectedRowKeys: selectedEmpKeys, onChange: onEmpSelectChange }"
          >
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'name'">
                {{ record.name }}
                <a-tag v-if="selectedDept && String(record.id) === String(selectedDept.managerId)" color="orange" style="margin-left: 4px; font-size: 10px; line-height: 16px; padding: 0 4px"><CrownOutlined /> 主管</a-tag>
              </template>
              <template v-if="column.key === 'deptName'">
                {{ record.department?.name || '-' }}
              </template>
              <template v-if="column.key === 'companyBelong'">
                <a-tag :color="orgColorMap[record.companyBelong] || 'default'">{{ record.companyBelong }}</a-tag>
              </template>
              <template v-if="column.key === 'status'">
                <a-tag :color="statusColorMap[record.status]">{{ statusMap[record.status] }}</a-tag>
              </template>
              <template v-if="column.key === 'rankingList'">
                {{ record.rankingList?.name || '-' }}
              </template>
            </template>
          </a-table>
        </div>

        <div class="card-box" v-if="!selectedDept">
          <a-empty description="请在左侧选择部门查看详情" />
        </div>
      </a-col>
    </a-row>

    <!-- 新增/编辑部门弹窗 -->
    <a-modal v-model:open="formVisible" :title="formTitle" @ok="handleSubmit" :confirm-loading="submitting" :width="500">
      <a-form :model="formData" layout="vertical">
        <a-form-item label="部门名称" required><a-input v-model:value="formData.name" placeholder="请输入部门名称" /></a-form-item>
        <a-form-item label="上级部门">
          <a-tree-select
            v-model:value="formData.parentId"
            :tree-data="parentTreeOptions"
            :field-names="{ label: 'name', value: 'id', children: 'children' }"
            placeholder="无则为顶级"
            allow-clear
            tree-default-expand-all
          />
        </a-form-item>
        <a-form-item label="部门主管">
          <a-select
            v-model:value="formData.managerId"
            placeholder="从该部门员工中选择"
            allow-clear
            show-search
            option-filter-prop="label"
          >
            <a-select-option v-for="emp in deptEmployees" :key="emp.id" :value="emp.id" :label="emp.name">
              {{ emp.employeeNo }} - {{ emp.name }}
              <a-tag v-if="emp.companyBelong" :color="orgColorMap[emp.companyBelong]" style="margin-left: 4px">{{ emp.companyBelong }}</a-tag>
            </a-select-option>
          </a-select>
        </a-form-item>
      </a-form>
    </a-modal>

    <!-- 设置主管弹窗 -->
    <a-modal v-model:open="managerModalVisible" title="设置部门主管" @ok="handleSetManager" :confirm-loading="settingManager">
      <a-select
        v-model:value="selectedManagerId"
        placeholder="从该部门员工中选择主管"
        allow-clear
        show-search
        option-filter-prop="label"
        style="width: 100%"
      >
        <a-select-option v-for="emp in deptEmployees" :key="emp.id" :value="emp.id" :label="emp.name">
          {{ emp.employeeNo }} - {{ emp.name }}
          <a-tag v-if="emp.companyBelong" :color="orgColorMap[emp.companyBelong]" style="margin-left: 4px">{{ emp.companyBelong }}</a-tag>
        </a-select-option>
      </a-select>
    </a-modal>

    <!-- 调整部门弹窗 -->
    <a-modal v-model:open="transferDeptVisible" title="调整部门" @ok="handleTransferDept" :confirm-loading="transferDeptLoading" :width="420">
      <p style="margin-bottom: 12px; color: #8c8c8c">已选择 <strong>{{ selectedEmpKeys.length }}</strong> 名员工，请选择目标部门：</p>
      <a-tree-select
        v-model:value="transferDeptId"
        :tree-data="treeData"
        :field-names="{ label: 'name', value: 'id', children: 'children' }"
        placeholder="选择目标部门"
        tree-default-expand-all
        style="width: 100%"
      />
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, watch } from 'vue';
import { message } from 'ant-design-vue';
import { SettingOutlined, UserOutlined, CrownOutlined } from '@ant-design/icons-vue';
import { getDepartmentTree, createDepartment, updateDepartment, deleteDepartment, sortDepartments, getDepartmentEmployees } from '@/api/department.api';
import { batchUpdateDepartment, getCompanyBelongs } from '@/api/user.api';

const orgColorMap: Record<string, string> = { TD: 'blue', XD: 'green', TY: 'purple', WB: 'orange' };
const companyBelongList = ref<string[]>([]);
const statusMap: Record<number, string> = { 1: '在职', 2: '禁用', 4: '待岗', 5: '停薪留职' };
const statusColorMap: Record<number, string> = { 1: 'green', 2: 'orange', 4: 'blue', 5: 'default' };

const treeData = ref<any[]>([]);
const selectedKeys = ref<number[]>([]);
const selectedDept = ref<any>(null);
const formVisible = ref(false);
const submitting = ref(false);
const formData = reactive<any>({});

// 主管设置
const managerModalVisible = ref(false);
const settingManager = ref(false);
const selectedManagerId = ref<number | undefined>(undefined);

// 部门员工
const deptEmployees = ref<any[]>([]);
const empLoading = ref(false);
const empKeyword = ref('');
const empCompanyFilter = ref<string | undefined>();

const empColumns = [
  { title: '姓名', dataIndex: 'name', key: 'name', width: 100 },
  { title: '所属部门', key: 'deptName', width: 130, ellipsis: true },
  { title: '归属', key: 'companyBelong', width: 70 },
  { title: '岗位', dataIndex: 'position', key: 'position', width: 140, ellipsis: true },
  { title: '职级', dataIndex: 'rankLevel', key: 'rankLevel', width: 60 },
  { title: '榜单', key: 'rankingList', width: 100 },
  { title: '积分', dataIndex: 'totalPoints', key: 'totalPoints', width: 70 },
  { title: '状态', key: 'status', width: 70 },
];

// 员工行选择 & 批量调整部门
const selectedEmpKeys = ref<number[]>([]);
const transferDeptVisible = ref(false);
const transferDeptLoading = ref(false);
const transferDeptId = ref<number | undefined>();

function onEmpSelectChange(keys: (string | number)[]) {
  selectedEmpKeys.value = keys as number[];
}

async function handleTransferDept() {
  if (!transferDeptId.value) { message.warning('请选择目标部门'); return; }
  transferDeptLoading.value = true;
  try {
    const res: any = await batchUpdateDepartment(selectedEmpKeys.value, transferDeptId.value);
    message.success(res.message || '调整部门成功');
    transferDeptVisible.value = false;
    selectedEmpKeys.value = [];
    transferDeptId.value = undefined;
    loadDeptEmployees();
    loadTree();
  } catch {
    message.error('调整部门失败');
  } finally {
    transferDeptLoading.value = false;
  }
}

// 所有节点的平铺映射
const nodeMap = ref<Map<number, any>>(new Map());

onMounted(() => {
  loadTree();
  getCompanyBelongs().then((res: any) => { companyBelongList.value = Array.isArray(res) ? res : []; }).catch(() => {});
});

// 当选中部门变化时加载员工
watch(selectedDept, (dept) => {
  if (dept) {
    empKeyword.value = '';
    empCompanyFilter.value = undefined;
    selectedEmpKeys.value = [];
    loadDeptEmployees();
  } else {
    deptEmployees.value = [];
    selectedEmpKeys.value = [];
  }
});

async function loadTree() {
  const data = await getDepartmentTree() as any;
  // 递归计算含子部门的总人数
  function calcTotalCount(nodes: any[]): number {
    let total = 0;
    for (const n of nodes) {
      const childTotal = n.children?.length ? calcTotalCount(n.children) : 0;
      n.totalMemberCount = (n.memberCount ?? 0) + childTotal;
      total += n.totalMemberCount;
    }
    return total;
  }
  calcTotalCount(data);
  treeData.value = data;
  const map = new Map<number, any>();
  function walk(nodes: any[]) {
    for (const n of nodes) {
      map.set(n.id, n);
      if (n.children?.length) walk(n.children);
    }
  }
  walk(data);
  nodeMap.value = map;

  if (selectedDept.value) {
    const updated = map.get(selectedDept.value.id);
    if (updated) selectedDept.value = updated;
  }
}

async function loadDeptEmployees() {
  if (!selectedDept.value) return;
  empLoading.value = true;
  try {
    const data = await getDepartmentEmployees(selectedDept.value.id, {
      keyword: empKeyword.value || undefined,
      companyBelong: empCompanyFilter.value,
    }) as any;
    deptEmployees.value = Array.isArray(data) ? data : [];
  } catch {
    deptEmployees.value = [];
  } finally {
    empLoading.value = false;
  }
}

// 弹窗标题
const formTitle = computed(() => {
  if (formData.id) return '编辑部门';
  if (formData.parentId) return '添加子部门';
  return '新增部门';
});

// 编辑时排除自身及子节点（防循环）
const parentTreeOptions = computed(() => {
  if (!formData.id) return treeData.value;
  function filterSelf(nodes: any[]): any[] {
    return nodes
      .filter((n: any) => n.id !== formData.id)
      .map((n: any) => ({
        ...n,
        children: n.children?.length ? filterSelf(n.children) : undefined,
      }));
  }
  return filterSelf(treeData.value);
});

// 上级部门名称
const parentDeptName = computed(() => {
  if (!selectedDept.value) return '-';
  const pid = Number(selectedDept.value.parentId);
  if (!pid) return '(顶级)';
  const parent = nodeMap.value.get(pid);
  return parent?.name || '-';
});

// 子部门列表
const childDepts = computed(() => {
  if (!selectedDept.value?.children) return [];
  return selectedDept.value.children;
});

function handleSelect(keys: (string | number)[], info: any) {
  selectedKeys.value = keys as number[];
  selectedDept.value = info.node?.dataRef || nodeMap.value.get(keys[0] as number) || null;
}

function selectDept(dept: any) {
  selectedKeys.value = [dept.id];
  selectedDept.value = dept;
}

// 设置主管弹窗
function showManagerModal() {
  selectedManagerId.value = selectedDept.value?.managerId;
  managerModalVisible.value = true;
}

async function handleSetManager() {
  if (!selectedDept.value) return;
  settingManager.value = true;
  try {
    await updateDepartment(selectedDept.value.id, { managerId: selectedManagerId.value || null });
    message.success('主管设置成功');
    managerModalVisible.value = false;
    loadTree();
  } catch {
    message.error('设置失败');
  } finally {
    settingManager.value = false;
  }
}

// 拖拽排序处理
async function handleDrop(info: any) {
  const dropKey = info.node.key;
  const dragKey = info.dragNode.key;
  const dropPos = info.node.pos.split('-');
  const dropPosition = info.dropPosition - Number(dropPos[dropPos.length - 1]);

  const data = [...treeData.value];
  let dragObj: any;

  function removeNode(nodes: any[], key: number): boolean {
    for (let i = 0; i < nodes.length; i++) {
      if (nodes[i].id === key) {
        [dragObj] = nodes.splice(i, 1);
        return true;
      }
      if (nodes[i].children?.length && removeNode(nodes[i].children, key)) return true;
    }
    return false;
  }
  removeNode(data, dragKey);
  if (!dragObj) return;

  if (!info.dropToGap) {
    const dropNode = findInTree(data, dropKey);
    if (dropNode) {
      if (!dropNode.children) dropNode.children = [];
      dropNode.children.unshift(dragObj);
      dragObj.parentId = dropNode.id;
    }
  } else if (dropPosition === -1) {
    insertBeforeOrAfter(data, dropKey, dragObj, 'before');
  } else {
    insertBeforeOrAfter(data, dropKey, dragObj, 'after');
  }

  treeData.value = data;

  const sortItems = collectSortItems(data);
  try {
    await sortDepartments(sortItems);
    message.success('排序已更新');
    loadTree();
  } catch {
    message.error('排序失败');
    loadTree();
  }
}

function findInTree(nodes: any[], id: number): any {
  for (const n of nodes) {
    if (n.id === id) return n;
    if (n.children?.length) {
      const found = findInTree(n.children, id);
      if (found) return found;
    }
  }
  return null;
}

function insertBeforeOrAfter(nodes: any[], refKey: number, newNode: any, position: 'before' | 'after'): boolean {
  for (let i = 0; i < nodes.length; i++) {
    if (nodes[i].id === refKey) {
      const idx = position === 'before' ? i : i + 1;
      newNode.parentId = nodes[i].parentId;
      nodes.splice(idx, 0, newNode);
      return true;
    }
    if (nodes[i].children?.length && insertBeforeOrAfter(nodes[i].children, refKey, newNode, position)) return true;
  }
  return false;
}

function collectSortItems(nodes: any[], parentId = 0): { id: number; sortOrder: number; parentId: number }[] {
  const result: { id: number; sortOrder: number; parentId: number }[] = [];
  for (let i = 0; i < nodes.length; i++) {
    result.push({ id: nodes[i].id, sortOrder: i, parentId });
    if (nodes[i].children?.length) {
      result.push(...collectSortItems(nodes[i].children, nodes[i].id));
    }
  }
  return result;
}

function showForm(record?: any, parentId?: number) {
  Object.keys(formData).forEach((k) => delete formData[k]);
  if (record) {
    formData.id = record.id;
    formData.name = record.name;
    formData.parentId = record.parentId || undefined;
    formData.managerId = record.managerId || undefined;
  } else if (parentId) {
    formData.parentId = parentId;
  } else {
    formData.parentId = 0;
  }
  formVisible.value = true;
}

async function handleSubmit() {
  submitting.value = true;
  try {
    const payload: any = {
      name: formData.name,
      parentId: formData.parentId ?? 0,
      managerId: formData.managerId || null,
    };
    if (formData.id) {
      await updateDepartment(formData.id, payload);
      message.success('更新成功');
    } else {
      await createDepartment(payload);
      message.success('创建成功');
    }
    formVisible.value = false;
    loadTree();
  } finally {
    submitting.value = false;
  }
}

async function handleDelete(id: number) {
  try {
    await deleteDepartment(id);
    message.success('删除成功');
    selectedDept.value = null;
    selectedKeys.value = [];
    loadTree();
  } catch (err: any) {
    message.error(err?.response?.data?.message || '删除失败');
  }
}
</script>

<style scoped lang="less">
.dept-tree-panel {
  max-height: calc(100vh - 160px);
  overflow-y: auto;
}

// 卡片式树节点
.dept-tree-node {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border-radius: 4px;
  border: 1px solid #f0f0f0;
  background: #fafafa;
  transition: all 0.2s;
  min-width: 140px;

  &:hover {
    background: #e6f4ff;
    border-color: #91caff;
  }

  &--selected {
    background: #e6f4ff;
    border-color: #1890ff;
    border-left: 3px solid #1890ff;
    padding-left: 8px;
  }

  &__name {
    font-size: 13px;
    font-weight: 500;
    color: #262626;
    white-space: nowrap;
  }

  &__badge {
    margin-left: auto;
  }
}

// 覆盖 antd tree 默认选中样式（使用自定义卡片样式代替）
:deep(.ant-tree .ant-tree-node-selected) {
  background: transparent !important;
}

:deep(.ant-tree .ant-tree-treenode-selected .ant-tree-node-content-wrapper) {
  background: transparent !important;
}

// showLine 模式下的连线美化
:deep(.ant-tree-show-line .ant-tree-indent-unit::before) {
  border-color: #d9d9d9;
}

:deep(.ant-tree-show-line .ant-tree-switcher) {
  background: #fff;
}

// blockNode 下节点内容占满
:deep(.ant-tree.ant-tree-block-node .ant-tree-node-content-wrapper) {
  flex: 1;
}
</style>
