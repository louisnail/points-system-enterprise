<template>
  <svg :width="width" :height="height" :viewBox="`0 0 ${width} ${height}`" xmlns="http://www.w3.org/2000/svg">
    <!-- Y axis labels -->
    <text v-for="(tick, i) in yTicks" :key="'yt' + i"
      :x="padL - 6" :y="chartY(tick)" text-anchor="end" dominant-baseline="middle"
      fill="#8c8c8c" font-size="11">{{ tick }}</text>
    <!-- Grid lines -->
    <line v-for="(tick, i) in yTicks" :key="'yg' + i"
      :x1="padL" :x2="width - padR" :y1="chartY(tick)" :y2="chartY(tick)"
      stroke="#f0f0f0" stroke-width="1" />
    <!-- X axis labels (all 12 months) -->
    <text v-for="(label, i) in allMonthLabels" :key="'xt' + i"
      :x="chartX(i)" :y="height - 4" text-anchor="middle"
      fill="#8c8c8c" font-size="11">{{ label }}</text>
    <!-- Future months dashed line at 0 -->
    <polyline v-if="futurePoints.length > 0"
      :points="futurePolyline" fill="none" stroke="#d9d9d9" stroke-width="1.5"
      stroke-dasharray="4 3" stroke-linejoin="round" />
    <!-- Future month hollow dots -->
    <circle v-for="(pt, i) in futurePoints" :key="'fd' + i"
      :cx="pt.x" :cy="pt.y" r="3" fill="#fff" stroke="#d9d9d9" stroke-width="1.5" />
    <!-- Actual data polyline -->
    <polyline v-if="actualPoints.length > 1"
      :points="actualPolyline" fill="none" stroke="#1890ff" stroke-width="2" stroke-linejoin="round" />
    <!-- Bridge dashed line from last actual to first future -->
    <line v-if="bridgeLine"
      :x1="bridgeLine.x1" :y1="bridgeLine.y1" :x2="bridgeLine.x2" :y2="bridgeLine.y2"
      stroke="#d9d9d9" stroke-width="1.5" stroke-dasharray="4 3" />
    <!-- Actual data points -->
    <template v-for="(pt, i) in actualPoints" :key="'dp' + i">
      <circle :cx="pt.x" :cy="pt.y" r="4" fill="#1890ff" stroke="#fff" stroke-width="2" />
      <text :x="pt.x" :y="pt.y - 10" text-anchor="middle" fill="#1890ff" font-size="11" font-weight="600">
        {{ pt.score }}
      </text>
    </template>
    <!-- No data hint -->
    <text v-if="actualPoints.length === 0"
      :x="width / 2" :y="height / 2" text-anchor="middle" fill="#bfbfbf" font-size="13">暂无积分数据</text>
  </svg>
</template>

<script setup lang="ts">
import { computed } from 'vue';

interface TrendPoint { month: string; score: number }

const props = withDefaults(defineProps<{
  data: TrendPoint[];
  width?: number;
  height?: number;
}>(), { width: 480, height: 180 });

const padL = 40;
const padR = 16;
const padT = 28;
const padB = 24;

const allMonthLabels = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];

// 后端只返回截止当前月的数据，data.length <= 12
const dataMap = computed(() => {
  const map = new Map<number, number>(); // monthIndex(0-based) -> score
  for (const d of props.data) {
    const mi = parseInt(d.month, 10) - 1; // "01"->0, "03"->2
    map.set(mi, d.score);
  }
  return map;
});

const dataMonthCount = computed(() => props.data.length);

const scores = computed(() => props.data.map((d) => d.score));
const maxScore = computed(() => {
  const mx = Math.max(...scores.value, 0);
  return mx === 0 ? 10 : Math.ceil(mx * 1.2);
});
const minScore = computed(() => {
  const mn = Math.min(...scores.value, 0);
  return mn >= 0 ? 0 : Math.floor(mn * 1.2);
});

const yTicks = computed(() => {
  const range = maxScore.value - minScore.value || 10;
  const step = Math.ceil(range / 4);
  const ticks: number[] = [];
  for (let v = minScore.value; v <= maxScore.value; v += step) {
    ticks.push(v);
  }
  if (ticks[ticks.length - 1] < maxScore.value) ticks.push(maxScore.value);
  return ticks;
});

function chartX(i: number) {
  const cw = props.width - padL - padR;
  return padL + (cw / 11) * i; // always 12 months
}

function chartY(val: number) {
  const ch = props.height - padT - padB;
  const range = maxScore.value - minScore.value || 10;
  return padT + ch * (1 - (val - minScore.value) / range);
}

// 有数据的月份（实线蓝色）
const actualPoints = computed(() => {
  const pts: Array<{ x: number; y: number; score: number }> = [];
  for (let mi = 0; mi < dataMonthCount.value; mi++) {
    const score = dataMap.value.get(mi) ?? 0;
    pts.push({ x: chartX(mi), y: chartY(score), score });
  }
  return pts;
});

// 未来月份（虚线灰色，score=0）
const futurePoints = computed(() => {
  const pts: Array<{ x: number; y: number }> = [];
  for (let mi = dataMonthCount.value; mi < 12; mi++) {
    pts.push({ x: chartX(mi), y: chartY(0) });
  }
  return pts;
});

const actualPolyline = computed(() => actualPoints.value.map((p) => `${p.x},${p.y}`).join(' '));
const futurePolyline = computed(() => futurePoints.value.map((p) => `${p.x},${p.y}`).join(' '));

// 连接实线末点和虚线起点的桥接虚线
const bridgeLine = computed(() => {
  if (actualPoints.value.length === 0 || futurePoints.value.length === 0) return null;
  const last = actualPoints.value[actualPoints.value.length - 1];
  const first = futurePoints.value[0];
  return { x1: last.x, y1: last.y, x2: first.x, y2: first.y };
});
</script>
