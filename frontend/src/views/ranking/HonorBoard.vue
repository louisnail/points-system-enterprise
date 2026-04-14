<template>
  <div class="page-container">
    <div class="page-header">
      <h2>龙虎榜</h2>
      <div style="display: flex; gap: 12px; align-items: center">
        <a-select v-model:value="period" style="width: 120px">
          <a-select-option value="month">本月</a-select-option>
          <a-select-option value="quarter">本季度</a-select-option>
          <a-select-option value="year">本年度</a-select-option>
        </a-select>
        <a-select v-model:value="department" placeholder="全部部门" allow-clear style="width: 160px">
          <a-select-option v-for="d in departments" :key="d" :value="d">{{ d }}</a-select-option>
        </a-select>
      </div>
    </div>

    <!-- Top 3 -->
    <div class="top3-section">
      <div
        v-for="(item, idx) in top3"
        :key="item.userId"
        class="top-card"
        :class="`rank-${idx + 1}`"
        :style="{ order: idx === 0 ? 1 : idx === 1 ? 0 : 2 }"
      >
        <div class="rank-badge" :class="`badge-${idx + 1}`">{{ idx + 1 }}</div>
        <div class="avatar-circle" :style="{ background: avatarColors[idx] }">
          {{ item.name.substring(0, 1) }}
        </div>
        <div class="top-name">{{ item.name }}</div>
        <div class="top-dept">{{ item.department }}</div>
        <div class="top-points">{{ item.totalPoints }}</div>
        <div class="top-label">积分</div>
      </div>
    </div>

    <!-- 4-10 名 -->
    <div class="card-box" style="margin-top: 24px">
      <a-table :columns="columns" :data-source="restList" :pagination="false" size="small" row-key="userId">
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'rank'">
            <span class="rank-num">{{ record.rank }}</span>
          </template>
          <template v-if="column.key === 'totalPoints'">
            <span style="color: #1890ff; font-weight: 700">{{ record.totalPoints }}</span>
          </template>
          <template v-if="column.key === 'companyBelong'">
            <a-tag :color="companyColorMap[record.companyBelong] || 'default'">{{ record.companyBelong }}</a-tag>
          </template>
          <template v-if="column.key === 'trend'">
            <CaretUpOutlined v-if="record.trend === 'up'" style="color: #52c41a" />
            <CaretDownOutlined v-else-if="record.trend === 'down'" style="color: #ff4d4f" />
            <MinusOutlined v-else style="color: #8c8c8c" />
          </template>
        </template>
      </a-table>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { CaretUpOutlined, CaretDownOutlined, MinusOutlined } from '@ant-design/icons-vue';

const period = ref('month');
const department = ref('');
const companyColorMap: Record<string, string> = { TD: 'blue', XD: 'green', TY: 'purple', WB: 'orange' };

const departments = ['技术研发部', '产品设计部', '交付管理部', '市场运营部', '质量保障部'];

// Mock 排名数据
const mockRanking = [
  { userId: 1, name: '王磊', department: '技术研发部', companyBelong: 'TD', position: '高级开发', totalPoints: 86, trend: 'up', rank: 1 },
  { userId: 2, name: '何雪', department: '产品设计部', companyBelong: 'XD', position: '产品经理', totalPoints: 78, trend: 'up', rank: 2 },
  { userId: 3, name: '冯军', department: '交付管理部', companyBelong: 'TD', position: '项目经理', totalPoints: 75, trend: 'flat', rank: 3 },
  { userId: 4, name: '韩飞', department: '技术研发部', companyBelong: 'TY', position: '架构师', totalPoints: 72, trend: 'up', rank: 4 },
  { userId: 5, name: '罗宇', department: '质量保障部', companyBelong: 'TD', position: 'QA主管', totalPoints: 68, trend: 'down', rank: 5 },
  { userId: 6, name: '唐馨', department: '交付管理部', companyBelong: 'WB', position: '开发工程师', totalPoints: 65, trend: 'flat', rank: 6 },
  { userId: 7, name: '刘洋', department: '技术研发部', companyBelong: 'XD', position: '后端开发', totalPoints: 62, trend: 'up', rank: 7 },
  { userId: 8, name: '林峰', department: '市场运营部', companyBelong: 'TY', position: '运营主管', totalPoints: 60, trend: 'down', rank: 8 },
  { userId: 9, name: '赵明', department: '技术研发部', companyBelong: 'TD', position: '前端开发', totalPoints: 58, trend: 'flat', rank: 9 },
  { userId: 10, name: '徐燕', department: '市场运营部', companyBelong: 'WB', position: '市场专员', totalPoints: 55, trend: 'up', rank: 10 },
];

const filteredRanking = computed(() => {
  if (!department.value) return mockRanking;
  return mockRanking.filter(r => r.department === department.value);
});

const top3 = computed(() => filteredRanking.value.slice(0, 3));
const restList = computed(() => filteredRanking.value.slice(3, 10));

const avatarColors = ['#faad14', '#8c8c8c', '#cd7f32'];

const columns = [
  { title: '排名', key: 'rank', width: 70 },
  { title: '姓名', dataIndex: 'name', width: 100 },
  { title: '归属', key: 'companyBelong', width: 70 },
  { title: '部门', dataIndex: 'department', width: 140 },
  { title: '岗位', dataIndex: 'position', width: 120 },
  { title: '总积分', key: 'totalPoints', width: 100 },
  { title: '趋势', key: 'trend', width: 80 },
];
</script>

<style scoped lang="less">
.top3-section {
  display: flex;
  justify-content: center;
  align-items: flex-end;
  gap: 24px;
  padding: 20px 0;
}
.top-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 24px 32px;
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.06);
  position: relative;
  transition: transform 0.3s;
  &:hover { transform: translateY(-4px); }
  &.rank-1 {
    padding: 32px 40px;
    box-shadow: 0 8px 24px rgba(250, 173, 20, 0.15);
    border: 2px solid #faad14;
  }
  &.rank-2 { border: 2px solid #bfbfbf; }
  &.rank-3 { border: 2px solid #cd7f32; }
}
.rank-badge {
  position: absolute;
  top: -12px;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  color: #fff;
  font-weight: 700;
  font-size: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  &.badge-1 { background: #faad14; }
  &.badge-2 { background: #8c8c8c; }
  &.badge-3 { background: #cd7f32; }
}
.avatar-circle {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 22px;
  font-weight: 700;
  margin-bottom: 8px;
  .rank-1 & { width: 68px; height: 68px; font-size: 26px; }
}
.top-name { font-size: 16px; font-weight: 700; color: #262626; }
.top-dept { font-size: 12px; color: #8c8c8c; margin: 4px 0 12px; }
.top-points {
  font-size: 28px; font-weight: 800; color: #faad14;
  .rank-1 & { font-size: 34px; }
}
.top-label { font-size: 12px; color: #8c8c8c; }
.rank-num {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: #f0f2f5;
  font-size: 12px;
  font-weight: 700;
  color: #595959;
}
</style>
