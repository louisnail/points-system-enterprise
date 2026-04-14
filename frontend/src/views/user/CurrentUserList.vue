<template>
  <div class="page-container">
    <div class="page-header"><h2>员工管理</h2></div>

    <!-- 状态统计卡片 -->
    <div class="status-cards">
      <div class="status-card" style="border-left: 3px solid #52c41a" @click="filterByStatus(1)">
        <div class="status-count" style="color: #52c41a">{{ statusCounts[1] || 0 }}</div>
        <div class="status-label">在职</div>
      </div>
      <div class="status-card" style="border-left: 3px solid #fa8c16" @click="filterByStatus(2)">
        <div class="status-count" style="color: #fa8c16">{{ statusCounts[2] || 0 }}</div>
        <div class="status-label">禁用</div>
      </div>
      <div class="status-card" style="border-left: 3px solid #ff4d4f" @click="filterByStatus(3)">
        <div class="status-count" style="color: #ff4d4f">{{ statusCounts[3] || 0 }}</div>
        <div class="status-label">离职</div>
      </div>
      <div class="status-card" style="border-left: 3px solid #1890ff" @click="filterByStatus(4)">
        <div class="status-count" style="color: #1890ff">{{ statusCounts[4] || 0 }}</div>
        <div class="status-label">待岗</div>
      </div>
      <div class="status-card" style="border-left: 3px solid #8c8c8c" @click="filterByStatus(5)">
        <div class="status-count" style="color: #8c8c8c">{{ statusCounts[5] || 0 }}</div>
        <div class="status-label">停薪留职</div>
      </div>
    </div>

    <div class="card-box">
      <div class="filter-bar">
        <a-input-search v-model:value="keyword" placeholder="搜索工号/姓名" style="width: 220px" @search="onFilterChange" allow-clear />
        <a-select v-model:value="filterStatus" placeholder="状态" style="width: 120px" allow-clear @change="onFilterChange">
          <a-select-option :value="1">在职</a-select-option>
          <a-select-option :value="2">禁用</a-select-option>
          <a-select-option :value="4">待岗</a-select-option>
          <a-select-option :value="5">停薪留职</a-select-option>
        </a-select>
        <a-select v-model:value="filterCompany" placeholder="归属组织" style="width: 120px" allow-clear @change="onFilterChange">
          <a-select-option v-for="cb in companyBelongList" :key="cb" :value="cb">{{ cb }}</a-select-option>
        </a-select>
        <a-select v-model:value="filterRankingList" placeholder="所属榜单" style="width: 140px" allow-clear @change="onFilterChange">
          <a-select-option v-for="rl in rankingLists" :key="rl.id" :value="Number(rl.id)">{{ rl.name }}</a-select-option>
        </a-select>
      </div>
      <div class="table-actions">
        <div>
          <a-button type="primary" @click="showForm()">新增员工</a-button>
          <a-button style="margin-left: 8px" @click="handleExport">导出</a-button>
          <a-button style="margin-left: 8px" @click="handleDownloadTemplate">模板下载</a-button>
          <a-upload :show-upload-list="false" :before-upload="handleImport" accept=".xlsx,.xls" style="display: inline-block; margin-left: 8px">
            <a-button>批量导入</a-button>
          </a-upload>
          <a-button style="margin-left: 8px" :disabled="!selectedRowKeys.length" @click="batchDeptVisible = true">
            批量调整部门{{ selectedRowKeys.length ? ` (${selectedRowKeys.length})` : '' }}
          </a-button>
          <a-button danger style="margin-left: 8px" :disabled="!selectedRowKeys.length" :loading="batchDeleting" @click="handleBatchDelete">
            批量删除{{ selectedRowKeys.length ? ` (${selectedRowKeys.length})` : '' }}
          </a-button>
          <a-button style="margin-left: 8px" @click="fieldDrawerVisible = true">
            <template #icon><SettingOutlined /></template>
            字段管理
          </a-button>
        </div>
        <span style="color: #8c8c8c">共 {{ total }} 人</span>
      </div>
      <a-table
        :columns="displayColumns"
        :data-source="list"
        :loading="loading"
        :pagination="pagination"
        :scroll="{ x: scrollX }"
        @change="handleTableChange"
        @resizeColumn="handleResizeColumn"
        row-key="id"
        size="middle"
        :row-selection="{ selectedRowKeys, onChange: onSelectChange }"
      >
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
          <template v-if="column.key === 'companyBelong'">
            <a-tag :color="companyColorMap[record.companyBelong] || 'default'">{{ record.companyBelong }}</a-tag>
          </template>
          <template v-if="column.key === 'status'">
            <a-tag :color="statusColorMap[record.status]">{{ statusMap[record.status] }}</a-tag>
          </template>
          <template v-if="column.key === 'dept1'">
            {{ getDeptLevel(record.departmentId, 0) }}
          </template>
          <template v-if="column.key === 'dept2'">
            {{ getDeptLevel(record.departmentId, 1) }}
          </template>
          <template v-if="column.key === 'dept3'">
            {{ getDeptLevel(record.departmentId, 2) }}
          </template>
          <template v-if="column.key === 'rankingList'">
            {{ record.rankingList?.name || '-' }}
          </template>
          <template v-if="column.key === 'secondaryRankingList'">
            {{ record.secondaryRankingList?.name || '-' }}
          </template>
          <template v-if="column.key === 'totalPoints'">
            <router-link :to="{ name: 'PointDetail', query: { userId: record.id } }" style="color: #1890ff">
              {{ record.totalPoints ?? 0 }}
            </router-link>
          </template>
          <template v-if="column.key === 'name'">
            <a @click="openDrawer(record.id)">{{ record.name }}</a>
          </template>
          <template v-if="String(column.key).startsWith('cf_')">
            {{ record.customFields?.[String(column.key).slice(3)] ?? '-' }}
          </template>
          <template v-if="column.key === 'action'">
            <a-space>
              <a @click="openDrawer(record.id)">查看</a>
              <a @click="showForm(record)">编辑</a>
              <a-popconfirm v-if="record.status === 1" title="禁用后该员工暂不参与积分排名，确认禁用？" @confirm="handleChangeStatus(record.id, 2)">
                <a style="color: #fa8c16">禁用</a>
              </a-popconfirm>
              <a-popconfirm v-if="record.status === 1" title="确认将该员工标记为离职？" @confirm="handleChangeStatus(record.id, 3)">
                <a style="color: #ff4d4f">离职</a>
              </a-popconfirm>
              <a v-if="record.status === 2" @click="handleChangeStatus(record.id, 1)" style="color: #52c41a">启用</a>
              <a v-if="record.status === 4 || record.status === 5" @click="handleChangeStatus(record.id, 1)" style="color: #52c41a">启用</a>
              <a-popconfirm v-if="record.status === 4 || record.status === 5" title="确认将该员工标记为离职？" @confirm="handleChangeStatus(record.id, 3)">
                <a style="color: #ff4d4f">离职</a>
              </a-popconfirm>
            </a-space>
          </template>
        </template>
      </a-table>
    </div>

    <!-- 新增/编辑弹窗 -->
    <a-modal v-model:open="formVisible" :title="formData.id ? '编辑员工' : '新增员工'" width="720px" @ok="handleSubmit" :confirm-loading="submitting">
      <a-form :model="formData" layout="vertical">
        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item label="工号" required><a-input v-model:value="formData.employeeNo" /></a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="姓名" required><a-input v-model:value="formData.name" /></a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="归属组织" required>
              <a-select v-model:value="formData.companyBelong">
                <a-select-option v-for="cb in companyBelongList" :key="cb" :value="cb">{{ cb }}</a-select-option>
              </a-select>
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="部门" required>
              <a-tree-select v-model:value="formData.departmentId" :tree-data="deptTree" :field-names="{ label: 'name', value: 'id', children: 'children' }" placeholder="选择部门" tree-default-expand-all />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="性别">
              <a-radio-group v-model:value="formData.gender">
                <a-radio :value="1">男</a-radio>
                <a-radio :value="2">女</a-radio>
              </a-radio-group>
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="入职日期"><a-date-picker v-model:value="formData.hireDate" style="width: 100%" value-format="YYYY-MM-DD" /></a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="邮箱"><a-input v-model:value="formData.email" /></a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="学历">
              <a-select v-model:value="formData.education" allow-clear>
                <a-select-option v-for="e in ['博士','硕士','本科','大专']" :key="e" :value="e">{{ e }}</a-select-option>
              </a-select>
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="岗位"><a-input v-model:value="formData.position" /></a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="职级">
              <a-select v-model:value="formData.rankLevel" allow-clear>
                <a-select-option v-for="r in rankLevels" :key="r" :value="r">{{ r }}</a-select-option>
              </a-select>
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="base地"><a-input v-model:value="formData.baseLocation" /></a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="所属榜单">
              <a-select v-model:value="formData.rankingListId" placeholder="选择榜单" allow-clear>
                <a-select-option v-for="rl in rankingLists.filter(r => !r.isSecondary)" :key="rl.id" :value="rl.id">{{ rl.name }}</a-select-option>
              </a-select>
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="副榜">
              <a-select v-model:value="formData.secondaryRankingListId" placeholder="无" allow-clear>
                <a-select-option v-for="rl in rankingLists.filter(r => r.isSecondary)" :key="rl.id" :value="Number(rl.id)">{{ rl.name }}</a-select-option>
              </a-select>
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="项目角色"><a-input v-model:value="formData.projectRole" /></a-form-item>
          </a-col>
          <a-col :span="12" v-if="formData.id">
            <a-form-item label="员工状态">
              <a-select v-model:value="formData.status">
                <a-select-option :value="1">在职</a-select-option>
                <a-select-option :value="2">禁用</a-select-option>
                <a-select-option :value="4">待岗</a-select-option>
                <a-select-option :value="5">停薪留职</a-select-option>
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
        <p style="color: #8c8c8c; font-size: 12px; margin-bottom: 8px">拖拽调整顺序，必填字段不可移除</p>
        <div class="field-list">
          <div
            v-for="(field, idx) in fieldConfig.filter(f => f.visible)"
            :key="field.key"
            class="field-item"
            :class="{ 'field-item--dragging': dragFieldIdx === idx }"
            draggable="true"
            @dragstart="onFieldDragStart(fieldConfig.indexOf(field))"
            @dragover.prevent="onFieldDragOver(fieldConfig.indexOf(field))"
            @drop="onFieldDrop(fieldConfig.indexOf(field))"
            @dragend="dragFieldIdx = -1"
          >
            <HolderOutlined style="cursor: grab; color: #bbb; margin-right: 8px" />
            <span style="flex: 1">{{ field.title }}</span>
            <a-tag v-if="field.isCustom" color="blue" style="margin-right: 4px; font-size: 11px">自定义</a-tag>
            <a-tag v-if="field.required" color="red" style="margin-right: 4px">必填</a-tag>
            <a-tooltip title="编辑">
              <a v-if="field.isCustom" style="color: #1890ff; font-size: 12px; margin-right: 6px" @click="showEditCustomField(field)">编辑</a>
              <a v-else style="color: #1890ff; font-size: 12px; margin-right: 6px" @click="showRenameField(field)">编辑</a>
            </a-tooltip>
            <a-tooltip title="隐藏" v-if="!field.required">
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
            <span style="flex: 1">{{ field.title }}</span>
            <a-tag v-if="field.isCustom" color="blue" style="margin-right: 4px; font-size: 11px">自定义</a-tag>
            <a style="color: #1890ff; font-size: 12px" @click="addField(field.key); applyFieldConfig()">显示</a>
          </div>
        </div>
      </div>
      <template #footer>
        <a-button type="primary" block @click="applyFieldConfig">应用</a-button>
      </template>
    </a-drawer>

    <!-- 新增自定义字段弹窗 -->
    <a-modal v-model:open="addCustomVisible" title="新增自定义字段" @ok="handleAddCustomField" :width="420">
      <a-form layout="vertical">
        <a-form-item label="字段名称" required>
          <a-input v-model:value="newFieldForm.displayName" placeholder="如：项目经验" />
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

    <!-- 员工画像抽屉 -->
    <EmployeeDrawer v-model:open="drawerOpen" :user-id="drawerUserId" />

    <!-- 重命名默认字段弹窗 -->
    <a-modal v-model:open="renameFieldVisible" title="编辑字段名称" @ok="handleRenameField" :width="360">
      <a-form layout="vertical">
        <a-form-item label="显示名称">
          <a-input v-model:value="renameFieldTitle" />
        </a-form-item>
      </a-form>
    </a-modal>

    <!-- 批量调整部门弹窗 -->
    <a-modal v-model:open="batchDeptVisible" title="批量调整部门" @ok="handleBatchDept" :confirm-loading="batchDeptLoading" :width="420">
      <p style="margin-bottom: 12px; color: #8c8c8c">已选择 <strong>{{ selectedRowKeys.length }}</strong> 名员工，请选择目标部门：</p>
      <a-tree-select
        v-model:value="batchDeptId"
        :tree-data="deptTree"
        :field-names="{ label: 'name', value: 'id', children: 'children' }"
        placeholder="选择目标部门"
        tree-default-expand-all
        style="width: 100%"
      />
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, h } from 'vue';
import { message, Modal } from 'ant-design-vue';
import { SettingOutlined, HolderOutlined, PlusOutlined, EyeInvisibleOutlined } from '@ant-design/icons-vue';
import { getUsers, createUser, updateUser, changeUserStatus, exportUsers, getUserTemplate, importUsers, getUserStats, batchUpdateDepartment, checkUserAssociations, batchDeleteUsers, getCompanyBelongs } from '@/api/user.api';
import { getDepartmentTree } from '@/api/department.api';
import { getRankingLists } from '@/api/ranking-list.api';
import { getAnnualRanking } from '@/api/ranking.api';
import dayjs from 'dayjs';
import EmployeeDrawer from '@/components/EmployeeDrawer.vue';
import { useFieldPool } from '@/composables/useFieldPool';
import { useCustomFields } from '@/composables/useCustomFields';

const rankLevels = ['P3','P4','P5','P6','P7','P8','P9','P10','P11','P12','M1','M2','M3','M4','M5','M6'];
const statusMap: Record<number, string> = { 1: '在职', 2: '禁用', 3: '离职', 4: '待岗', 5: '停薪留职' };
const statusColorMap: Record<number, string> = { 1: 'green', 2: 'orange', 3: 'red', 4: 'blue', 5: 'default' };
const companyColorMap: Record<string, string> = { TD: 'blue', XD: 'green', TY: 'purple', WB: 'orange' };

// 全量列定义
const allColumns = [
  { title: '工号', dataIndex: 'employeeNo', key: 'employeeNo', width: 100, resizable: true },
  { title: '姓名', dataIndex: 'name', key: 'name', width: 80, resizable: true },
  { title: '归属', dataIndex: 'companyBelong', key: 'companyBelong', width: 70, resizable: true },
  { title: '一级部门', key: 'dept1', width: 110, resizable: true, ellipsis: true },
  { title: '二级部门', key: 'dept2', width: 110, resizable: true, ellipsis: true },
  { title: '三级部门', key: 'dept3', width: 110, resizable: true, ellipsis: true },
  { title: '岗位', dataIndex: 'position', key: 'position', width: 150, ellipsis: true, resizable: true },
  { title: '职级', dataIndex: 'rankLevel', key: 'rankLevel', width: 70, resizable: true },
  { title: '榜单', key: 'rankingList', width: 110, resizable: true, ellipsis: true },
  { title: '副榜', key: 'secondaryRankingList', width: 110, resizable: true, ellipsis: true },
  { title: '积分', dataIndex: 'totalPoints', key: 'totalPoints', width: 70, resizable: true, sorter: true },
  { title: '排名', dataIndex: 'ranking', key: 'ranking', width: 60, resizable: true, sorter: true },
  { title: '状态', key: 'status', width: 80, resizable: true },
];

// 使用可复用字段池 composable
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
} = useFieldPool('user-list-fields', allColumns);

// 自定义字段
const {
  definitions: customDefs,
  loadDefinitions: loadCustomDefs,
  toFieldPoolEntries,
  addDefinition: addCustomDef,
  removeDefinition: removeCustomDef,
  updateDefinition: updateCustomDef,
} = useCustomFields('user');

// 新增自定义字段弹窗
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
  const merged = [...allColumns, ...toFieldPoolEntries()];
  updateAllFields(merged);
  rebuildColumns();
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

function rebuildColumns() {
  columns.value = [...visibleColumns.value.map(c => ({ ...c })), { title: '操作', key: 'action', width: 160, fixed: 'right' as const }];
}

const fieldDrawerVisible = ref(false);

function handleResizeColumn(w: number, col: any) {
  col.width = w;
}

function applyFieldConfig() {
  applyAndSave();
  rebuildColumns();
  fieldDrawerVisible.value = false;
  message.success('字段配置已应用');
}

// 列定义
const columns = ref<any[]>([
  ...allColumns,
  { title: '操作', key: 'action', width: 160, fixed: 'right' as const },
]);

const displayColumns = computed(() => columns.value);
const scrollX = computed(() => displayColumns.value.reduce((sum: number, col: any) => sum + (col.width || 120), 0));

// --- 列拖拽排序（表头拖拽） ---
const dragColKey = ref<string | null>(null);
const dragOverColKey = ref<string | null>(null);

function onColDragStart(e: DragEvent, key: string) {
  if (key === 'action') { e.preventDefault(); return; }
  dragColKey.value = key;
  if (e.dataTransfer) e.dataTransfer.effectAllowed = 'move';
}

function onColDragOver(e: DragEvent, key: string) {
  if (key === 'action' || !dragColKey.value) return;
  dragOverColKey.value = key;
}

function onColDragLeave() { dragOverColKey.value = null; }

function onColDrop(_e: DragEvent, key: string) {
  if (!dragColKey.value || key === 'action' || dragColKey.value === key) {
    dragColKey.value = null;
    dragOverColKey.value = null;
    return;
  }
  const cols = [...columns.value];
  const fromIdx = cols.findIndex((c) => c.key === dragColKey.value);
  const toIdx = cols.findIndex((c) => c.key === key);
  if (fromIdx >= 0 && toIdx >= 0) {
    const [moved] = cols.splice(fromIdx, 1);
    cols.splice(toIdx, 0, moved);
    columns.value = cols;
  }
  dragColKey.value = null;
  dragOverColKey.value = null;
}

// --- 部门层级路径 ---
const deptPathMap = ref<Map<number, string>>(new Map());
const deptLevelMap = ref<Map<number, string[]>>(new Map());

function buildDeptPathMap(tree: any[], parentPath = '') {
  const map = new Map<number, string>();
  for (const node of tree) {
    const path = parentPath ? `${parentPath} / ${node.name}` : node.name;
    map.set(Number(node.id), path);
    if (node.children?.length) {
      const childMap = buildDeptPathMap(node.children, path);
      for (const [k, v] of childMap) map.set(k, v);
    }
  }
  return map;
}

function buildDeptLevelMap(tree: any[], ancestors: string[] = []): Map<number, string[]> {
  const map = new Map<number, string[]>();
  for (const node of tree) {
    const levels = [...ancestors, node.name];
    map.set(Number(node.id), [levels[0] || '-', levels[1] || '-', levels[2] || '-']);
    if (node.children?.length) {
      const childMap = buildDeptLevelMap(node.children, levels);
      for (const [k, v] of childMap) map.set(k, v);
    }
  }
  return map;
}

function getDeptPath(deptId: number | string | undefined): string {
  if (!deptId) return '-';
  return deptPathMap.value.get(Number(deptId)) || '-';
}

function getDeptLevel(deptId: number | string | undefined, level: number): string {
  if (!deptId) return '-';
  const levels = deptLevelMap.value.get(Number(deptId));
  return levels ? levels[level] : '-';
}

// --- 员工画像抽屉 ---
const drawerOpen = ref(false);
const drawerUserId = ref<number>(0);

function openDrawer(userId: number) {
  drawerUserId.value = userId;
  drawerOpen.value = true;
}

// --- 重命名默认字段 ---
const renameFieldVisible = ref(false);
const renameFieldTitle = ref('');
const renameFieldKey = ref('');

function showRenameField(field: any) {
  renameFieldKey.value = field.key;
  renameFieldTitle.value = field.title;
  renameFieldVisible.value = true;
}

function handleRenameField() {
  if (!renameFieldTitle.value.trim()) { message.warning('名称不能为空'); return; }
  const fc = fieldConfig.value.find(f => f.key === renameFieldKey.value);
  if (fc) {
    fc.title = renameFieldTitle.value.trim();
    applyAndSave();
    rebuildColumns();
  }
  renameFieldVisible.value = false;
  message.success('字段名称已更新');
}

// --- 基础数据 ---
const list = ref<any[]>([]);
const total = ref(0);
const loading = ref(false);
const keyword = ref('');
const filterStatus = ref<number | undefined>();
const filterCompany = ref<string | undefined>();
const filterRankingList = ref<number | undefined>();
const pagination = reactive({ current: 1, pageSize: 20, total: 0 });
const deptTree = ref<any[]>([]);
const rankingLists = ref<any[]>([]);
const companyBelongList = ref<string[]>([]);
const sortField = ref<string>('');
const sortOrder = ref<string>('');

// --- 状态统计卡片（接入真实API） ---
const statusCounts = ref<Record<number, number>>({ 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 });

async function loadStatusStats() {
  try {
    const data: any = await getUserStats();
    statusCounts.value = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, ...data };
  } catch { /* ignore */ }
}

function onFilterChange() {
  pagination.current = 1;
  loadData();
}

function filterByStatus(status: number) {
  filterStatus.value = filterStatus.value === status ? undefined : status;
  onFilterChange();
}

const formVisible = ref(false);
const submitting = ref(false);
const formData = reactive<any>({});

onMounted(async () => {
  loadData();
  loadStatusStats();
  loadDeptTree();
  loadRankingLists();
  loadCompanyBelongs();
  await refreshFieldPool();
});

async function loadData() {
  loading.value = true;
  try {
    const isScoreSort = (sortField.value === 'totalPoints' || sortField.value === 'ranking') && sortOrder.value;

    if (isScoreSort) {
      // 按积分/排名排序：获取全部用户做全局排序+客户端分页
      const res: any = await getUsers({
        page: 1,
        pageSize: 9999,
        keyword: keyword.value || undefined,
        status: filterStatus.value,
        companyBelong: filterCompany.value,
        rankingListId: filterRankingList.value,
      });
      const allUsers: any[] = res.list || [];

      await overlayRankingScores(allUsers);

      const field = sortField.value;
      const asc = sortOrder.value === 'ascend';
      allUsers.sort((a: any, b: any) => {
        const va = a[field] || 0;
        const vb = b[field] || 0;
        return asc ? va - vb : vb - va;
      });

      total.value = allUsers.length;
      pagination.total = allUsers.length;
      const start = (pagination.current - 1) * pagination.pageSize;
      list.value = allUsers.slice(start, start + pagination.pageSize);
    } else {
      // 默认：服务端分页
      const res: any = await getUsers({
        page: pagination.current,
        pageSize: pagination.pageSize,
        keyword: keyword.value || undefined,
        status: filterStatus.value,
        companyBelong: filterCompany.value,
        rankingListId: filterRankingList.value,
      });
      list.value = res.list;
      total.value = res.total;
      pagination.total = res.total;

      await overlayRankingScores(list.value);
    }
  } finally {
    loading.value = false;
  }
}

async function overlayRankingScores(users: any[]) {
  try {
    const year = dayjs().format('YYYY');
    const rankingData: any = await getAnnualRanking({ year });
    const arr = Array.isArray(rankingData) ? rankingData : [];
    const rankMap = new Map<number, { currentPoints: number; ranking: number }>();
    const curMM = String(dayjs().month() + 1).padStart(2, '0');
    for (const item of arr) {
      const monthData = item.months?.[curMM];
      rankMap.set(item.userId, {
        currentPoints: item.currentPoints ?? 0,
        ranking: monthData?.ranking ?? 0,
      });
    }
    for (const user of users) {
      const rd = rankMap.get(Number(user.id));
      if (rd) {
        user.totalPoints = rd.currentPoints;
        user.ranking = rd.ranking;
      }
    }
  } catch { /* 排名获取失败不影响列表显示 */ }
}

async function loadDeptTree() {
  const tree = await getDepartmentTree() as any;
  deptTree.value = tree;
  deptPathMap.value = buildDeptPathMap(tree);
  deptLevelMap.value = buildDeptLevelMap(tree);
}

async function loadRankingLists() {
  try {
    const res: any = await getRankingLists();
    rankingLists.value = Array.isArray(res) ? res : res.list || [];
  } catch { /* ignore */ }
}

async function loadCompanyBelongs() {
  try {
    const res: any = await getCompanyBelongs();
    companyBelongList.value = Array.isArray(res) ? res : [];
  } catch { /* ignore */ }
}

function handleTableChange(pag: any, _filters: any, sorter: any) {
  const newSortField = sorter?.order ? String(sorter.columnKey || sorter.field || '') : '';
  const newSortOrder = sorter?.order || '';
  if (newSortField !== sortField.value || newSortOrder !== sortOrder.value) {
    pagination.current = 1;
  } else {
    pagination.current = pag.current;
  }
  pagination.pageSize = pag.pageSize;
  sortField.value = newSortField;
  sortOrder.value = newSortOrder;
  loadData();
}

function showForm(record?: any) {
  if (record) {
    Object.assign(formData, { ...record });
    // Ensure IDs are numbers for TreeSelect/Select matching
    if (formData.departmentId) formData.departmentId = Number(formData.departmentId);
    if (formData.rankingListId) formData.rankingListId = Number(formData.rankingListId);
    if (formData.secondaryRankingListId) formData.secondaryRankingListId = Number(formData.secondaryRankingListId);
    if (!formData.customFields) formData.customFields = {};
  } else {
    Object.keys(formData).forEach((k) => delete formData[k]);
    formData.customFields = {};
  }
  formVisible.value = true;
}

async function handleSubmit() {
  submitting.value = true;
  try {
    // Only send scalar fields, strip relation objects
    const scalarFields = [
      'employeeNo', 'name', 'displayName', 'gender', 'hireDate', 'email', 'education',
      'companyBelong', 'baseLocation', 'departmentId', 'position', 'rankLevel',
      'managerId', 'projectManagerId', 'projectName', 'projectRole',
      'rankingListId', 'secondaryRankingListId', 'status', 'role', 'customFields',
    ];
    const payload: Record<string, any> = {};
    for (const key of scalarFields) {
      if (formData[key] !== undefined) payload[key] = formData[key];
    }

    if (formData.id) {
      await updateUser(formData.id, payload);
      message.success('更新成功');
    } else {
      await createUser(payload);
      message.success('创建成功');
    }
    formVisible.value = false;
    loadData();
    loadStatusStats();
  } finally {
    submitting.value = false;
  }
}

async function handleChangeStatus(id: number, status: number) {
  try {
    await changeUserStatus(id, status);
    message.success('操作成功');
    loadData();
    loadStatusStats();
  } catch (err: any) {
    message.error(err?.response?.data?.message || '操作失败');
  }
}

async function handleExport() {
  const blob: any = await exportUsers({ keyword: keyword.value, status: filterStatus.value, companyBelong: filterCompany.value });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'employees.xlsx';
  a.click();
  URL.revokeObjectURL(url);
}

async function handleDownloadTemplate() {
  const blob: any = await getUserTemplate();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'employee_template.xlsx';
  a.click();
  URL.revokeObjectURL(url);
}

async function handleImport(file: File) {
  const res: any = await importUsers(file);
  if (res.failed > 0) {
    Modal.warning({
      title: `导入完成：成功 ${res.success} 条，失败 ${res.failed} 条`,
      content: h('div', { style: 'max-height:200px;overflow:auto' },
        (res.errors || []).map((err: string) => h('div', { style: 'color:#ff4d4f;margin:4px 0' }, err))
      ),
      width: 520,
    });
  } else {
    message.success(`导入成功：共 ${res.success} 条`);
  }
  loadData();
  loadStatusStats();
  return false;
}

// --- 批量调整部门 ---
const selectedRowKeys = ref<number[]>([]);
const batchDeptVisible = ref(false);
const batchDeptLoading = ref(false);
const batchDeptId = ref<number | undefined>();

function onSelectChange(keys: (string | number)[]) {
  selectedRowKeys.value = keys as number[];
}

async function handleBatchDept() {
  if (!batchDeptId.value) { message.warning('请选择目标部门'); return; }
  batchDeptLoading.value = true;
  try {
    const res: any = await batchUpdateDepartment(selectedRowKeys.value, batchDeptId.value);
    message.success(res.message || '批量调整成功');
    batchDeptVisible.value = false;
    selectedRowKeys.value = [];
    batchDeptId.value = undefined;
    loadData();
  } catch {
    message.error('批量调整失败');
  } finally {
    batchDeptLoading.value = false;
  }
}

// --- 批量删除 ---
const batchDeleting = ref(false);

async function handleBatchDelete() {
  if (!selectedRowKeys.value.length) return;
  batchDeleting.value = true;
  try {
    // Step 1: 检查关联数据
    const checkResult: any = await checkUserAssociations(selectedRowKeys.value);
    if (checkResult.blockedIds?.length > 0) {
      // 有关联数据 → 展示详情，让用户确认级联删除
      Modal.confirm({
        title: '以下员工存在关联数据',
        content: h('div', [
          h('div', { style: 'max-height:200px;overflow:auto;margin-bottom:12px' },
            checkResult.details.map((d: any) =>
              h('div', { style: 'color:#ff4d4f;margin:4px 0' }, `${d.userName}(${d.employeeNo})：${d.summary}`)
            )
          ),
          h('div', { style: 'color:#8c8c8c;font-size:13px' }, '确认删除将同时清除上述关联数据，此操作不可恢复！'),
        ]),
        okText: '确认删除',
        okType: 'danger',
        width: 520,
        onOk: async () => {
          const res: any = await batchDeleteUsers(selectedRowKeys.value, true);
          message.success(res.message || '删除成功');
          selectedRowKeys.value = [];
          loadData();
          loadStatusStats();
        },
      });
      return;
    }
    // Step 2: 无关联数据，直接确认删除
    Modal.confirm({
      title: '永久删除',
      content: `将永久删除 ${selectedRowKeys.value.length} 个员工，此操作不可恢复！`,
      okText: '确认删除',
      okType: 'danger',
      onOk: async () => {
        const res: any = await batchDeleteUsers(selectedRowKeys.value);
        message.success(res.message || '删除成功');
        selectedRowKeys.value = [];
        loadData();
        loadStatusStats();
      },
    });
  } catch (err: any) {
    message.error(err?.response?.data?.message || '操作失败');
  } finally {
    batchDeleting.value = false;
  }
}
</script>

<style scoped lang="less">
.status-cards {
  display: flex;
  gap: 16px;
  margin-bottom: 16px;
}

.status-card {
  flex: 1;
  background: #fff;
  border-radius: 8px;
  padding: 16px 20px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  }
}

.status-count {
  font-size: 28px;
  font-weight: 700;
  line-height: 1.3;
}

.status-label {
  font-size: 13px;
  color: #8c8c8c;
  margin-top: 2px;
}

.field-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.field-item {
  display: flex;
  align-items: center;
  padding: 8px 12px;
  border-radius: 6px;
  border: 1px solid #f0f0f0;
  background: #fafafa;
  cursor: grab;
  transition: all 0.15s;

  &:hover {
    border-color: #d9d9d9;
    background: #fff;
  }

  &--dragging {
    opacity: 0.4;
    border-color: #1890ff;
  }
}
</style>
