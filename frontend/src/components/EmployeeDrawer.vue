<template>
  <a-drawer
    :open="open"
    title="员工画像"
    placement="right"
    :width="560"
    @close="handleClose"
    :destroy-on-close="true"
  >
    <a-spin :spinning="loading">
      <template v-if="userDetail">
        <!-- 个人信息 -->
        <a-descriptions title="基本信息" :column="2" size="small" bordered>
          <a-descriptions-item label="姓名">{{ userDetail.displayName || userDetail.name }}</a-descriptions-item>
          <a-descriptions-item label="工号">{{ userDetail.employeeNo }}</a-descriptions-item>
          <a-descriptions-item label="归属组织">
            <a-tag :color="companyColorMap[userDetail.companyBelong] || 'default'">{{ userDetail.companyBelong }}</a-tag>
          </a-descriptions-item>
          <a-descriptions-item label="部门">{{ userDetail.department?.name || '-' }}</a-descriptions-item>
          <a-descriptions-item label="岗位">{{ userDetail.position || '-' }}</a-descriptions-item>
          <a-descriptions-item label="职级">{{ userDetail.rankLevel || '-' }}</a-descriptions-item>
          <a-descriptions-item label="邮箱">{{ userDetail.email || '-' }}</a-descriptions-item>
          <a-descriptions-item label="入职日期">{{ userDetail.hireDate || '-' }}</a-descriptions-item>
        </a-descriptions>

        <!-- 积分概览 -->
        <div style="margin-top: 24px">
          <h4 style="margin-bottom: 12px">积分概览</h4>
          <a-row :gutter="12">
            <a-col :span="8">
              <div class="stat-card">
                <div class="stat-value">{{ computedTotalPoints ?? '-' }}</div>
                <div class="stat-label">总积分</div>
              </div>
            </a-col>
            <a-col :span="8">
              <div class="stat-card">
                <div class="stat-value">{{ rankingInfo?.ranking ?? '-' }}</div>
                <div class="stat-label">当前排名</div>
              </div>
            </a-col>
            <a-col :span="8">
              <div class="stat-card">
                <div class="stat-value" style="font-size: 14px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; line-height: 32px" :title="userDetail.rankingList?.name || '-'">{{ userDetail.rankingList?.name || '-' }}</div>
                <div class="stat-label">所属榜单</div>
              </div>
            </a-col>
          </a-row>
          <div v-if="trendHonors.length" style="margin-top: 12px">
            <span style="font-size: 12px; color: #8c8c8c; margin-right: 8px">积分荣誉</span>
            <a-tag v-for="(h, i) in trendHonors" :key="i" color="gold" style="margin: 2px">{{ h }}</a-tag>
          </div>
        </div>

        <!-- 积分走势 -->
        <div v-if="trendData.length > 0" style="margin-top: 24px">
          <h4 style="margin-bottom: 12px">积分走势</h4>
          <SvgTrendChart :data="trendData" :width="500" :height="180" />
        </div>

        <!-- 积分画像 -->
        <div v-if="radarDimensions.length >= 3" style="margin-top: 24px">
          <h4 style="margin-bottom: 12px">
            积分画像
            <span v-if="profileTemplateName" style="font-size: 12px; color: #999; font-weight: normal; margin-left: 8px">
              ({{ profileTemplateName }})
            </span>
          </h4>
          <div style="padding: 8px 0">
            <RadarChart
              :dimensions="radarDimensions"
              :reference-values="radarRefValues"
              :show-reference="radarRefValues.length > 0"
              :size="420"
            />
          </div>
        </div>

        <!-- 积分明细 -->
        <div style="margin-top: 24px">
          <h4 style="margin-bottom: 12px">近期积分记录</h4>
          <a-table
            :columns="pointColumns"
            :data-source="pointRecords"
            :pagination="false"
            size="small"
            row-key="id"
          >
            <template #bodyCell="{ column, record: rec }">
              <template v-if="column.key === 'score'">
                <span :style="{ color: rec.score > 0 ? '#52c41a' : '#ff4d4f' }">
                  {{ rec.score > 0 ? '+' : '' }}{{ rec.score }}
                </span>
              </template>
              <template v-if="column.key === 'auditStatus'">
                <a-tag :color="auditColorMap[rec.auditStatus]">{{ auditMap[rec.auditStatus] }}</a-tag>
              </template>
            </template>
          </a-table>
        </div>
      </template>
    </a-spin>
  </a-drawer>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { getUserById } from '@/api/user.api';
import { getPoints } from '@/api/point.api';
import { getUserRanking, getUserMonthlyTrend } from '@/api/ranking.api';
import { getUserScoreProfile } from '@/api/score-profile.api';
import RadarChart from '@/components/RadarChart.vue';
import SvgTrendChart from '@/components/SvgTrendChart.vue';
import type { RadarDimension } from '@/components/RadarChart.vue';
import dayjs from 'dayjs';

const props = defineProps<{
  open: boolean;
  userId: number;
}>();

const emit = defineEmits<{
  (e: 'update:open', val: boolean): void;
}>();

const companyColorMap: Record<string, string> = { TD: 'blue', XD: 'green', TY: 'purple', WB: 'orange' };
const auditMap: Record<number, string> = { 0: '待审核', 1: '已通过', 2: '已驳回' };
const auditColorMap: Record<number, string> = { 0: 'default', 1: 'green', 2: 'red' };

const pointColumns = [
  { title: '指标', dataIndex: ['indicator', 'name'], key: 'indicator', ellipsis: true },
  { title: '分值', dataIndex: 'score', key: 'score', width: 70 },
  { title: '月份', dataIndex: 'belongMonth', key: 'belongMonth', width: 80 },
  { title: '状态', key: 'auditStatus', width: 80 },
];

const loading = ref(false);
const userDetail = ref<any>(null);
const rankingInfo = ref<any>(null);
const pointRecords = ref<any[]>([]);
const radarDimensions = ref<RadarDimension[]>([]);
const radarRefValues = ref<number[]>([]);
const profileTemplateName = ref('');
const trendData = ref<Array<{ month: string; score: number }>>([]);
const trendHonors = ref<string[]>([]);
// 总积分：取走势数据中当前月的积分（实时计算值，而非DB的totalPoints）
const computedTotalPoints = ref<number | null>(null);

function handleClose() {
  emit('update:open', false);
}

watch(() => [props.open, props.userId], async ([isOpen, uid]) => {
  if (!isOpen || !uid) {
    userDetail.value = null;
    return;
  }
  await loadUserProfile(uid as number);
}, { immediate: true });

async function loadUserProfile(userId: number) {
  loading.value = true;
  try {
    const currentMonth = dayjs().format('YYYY-MM');
    const currentYear = currentMonth.slice(0, 4);
    const [user, points, ranking, profile, trend] = await Promise.allSettled([
      getUserById(userId),
      getPoints({ userId, pageSize: 10, page: 1 }),
      getUserRanking({ userId, belongMonth: currentMonth }),
      getUserScoreProfile(userId),
      getUserMonthlyTrend({ userId, year: currentYear }),
    ]);

    userDetail.value = user.status === 'fulfilled' ? user.value : null;

    if (points.status === 'fulfilled') {
      const res = points.value as any;
      pointRecords.value = res.list || (Array.isArray(res) ? res : []);
    }

    rankingInfo.value = ranking.status === 'fulfilled' ? ranking.value : null;

    // 积分走势 + 总积分（取当前月积分）
    if (trend.status === 'fulfilled' && trend.value) {
      const trendRes = trend.value as any;
      const monthsArr = trendRes.months || [];
      trendData.value = monthsArr;
      trendHonors.value = trendRes.honors || [];
      // 总积分 = 当前月的月度积分（过程分+累计结果分）
      const curMM = String(dayjs().month() + 1).padStart(2, '0');
      const curEntry = monthsArr.find((m: any) => m.month === curMM);
      computedTotalPoints.value = curEntry ? curEntry.score : 0;
    } else {
      trendData.value = [];
      trendHonors.value = [];
      computedTotalPoints.value = userDetail.value?.totalPoints ?? null;
    }

    // 积分画像：从后端模板匹配结果构建雷达图
    if (profile.status === 'fulfilled' && profile.value) {
      const data = profile.value as any;
      profileTemplateName.value = data.template?.name || '';
      if (data.dimensions?.length) {
        radarDimensions.value = data.dimensions.map((d: any) => ({
          name: d.name,
          value: d.value ?? 0,
        }));
        radarRefValues.value = data.dimensions
          .map((d: any) => d.refValue)
          .filter((v: any) => v !== null && v !== undefined);
        // 只有全部维度都有参考值时才显示参考线
        if (radarRefValues.value.length !== data.dimensions.length) {
          radarRefValues.value = [];
        }
      } else {
        radarDimensions.value = [];
        radarRefValues.value = [];
      }
    } else {
      radarDimensions.value = [];
      radarRefValues.value = [];
      profileTemplateName.value = '';
    }
  } finally {
    loading.value = false;
  }
}
</script>
