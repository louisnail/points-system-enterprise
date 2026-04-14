<template>
  <div ref="screenRef" class="display-screen" :class="{ 'is-fullscreen': isFullscreen }">
    <div class="screen-header">
      <h1>员工积分管理系统 — 展示大屏</h1>
      <div class="header-info">
        <span>{{ currentTime }}</span>
        <a-button type="link" size="small" style="color: #8899aa" @click="toggleFullscreen">
          {{ isFullscreen ? '退出全屏' : '全屏' }}
        </a-button>
        <a-button type="link" size="small" style="color: #8899aa" @click="configVisible = true">配置</a-button>
        <a-button type="link" size="small" style="color: #8899aa" @click="$router.push('/dashboard')">返回系统</a-button>
      </div>
    </div>

    <grid-layout
      v-model:layout="layout"
      :col-num="12"
      :row-height="rowHeight"
      :margin="[12, 12]"
      :is-draggable="configVisible"
      :is-resizable="configVisible"
      style="flex: 1; min-height: 0"
    >
      <grid-item
        v-for="item in layout"
        :key="item.i"
        :x="item.x"
        :y="item.y"
        :w="item.w"
        :h="item.h"
        :i="item.i"
        class="screen-card"
      >
        <div class="card-header">
          <span>{{ widgetMap[item.i]?.title || item.i }}</span>
          <a v-if="configVisible" style="color: #ff6b6b; font-size: 12px" @click.stop="removeWidget(item.i)">移除</a>
        </div>
        <div class="card-body">
          <!-- 龙虎榜 -->
          <template v-if="widgetMap[item.i]?.type === 'rankList'">
            <div class="rank-list">
              <div v-for="(r, idx) in top10" :key="r.userId" class="rank-item">
                <span class="rank-no" :class="{ gold: idx === 0, silver: idx === 1, bronze: idx === 2 }">{{ idx + 1 }}</span>
                <span class="rank-name">{{ r.name }}</span>
                <span class="rank-dept">{{ r.department }}</span>
                <span class="rank-score">{{ r.totalPoints }}</span>
              </div>
            </div>
          </template>
          <!-- 柱状图 (SVG) -->
          <template v-else-if="widgetMap[item.i]?.type === 'barChart'">
            <SvgBarChart :data="deptBarData" />
          </template>
          <!-- 折线图 (SVG) -->
          <template v-else-if="widgetMap[item.i]?.type === 'lineChart'">
            <SvgLineChart :data="trendLineData" />
          </template>
          <!-- 数据概览 -->
          <template v-else-if="widgetMap[item.i]?.type === 'overview'">
            <div class="data-grid">
              <div class="data-item" v-for="d in overviewData" :key="d.label">
                <div class="data-value" :style="{ color: d.color }">{{ d.value }}</div>
                <div class="data-label">{{ d.label }}</div>
              </div>
            </div>
          </template>
        </div>
      </grid-item>
    </grid-layout>

    <!-- 配置抽屉 -->
    <a-drawer v-model:open="configVisible" title="大屏配置" :width="340" placement="right"
      :body-style="{ background: '#1b2838', color: '#e0e6ed' }"
      :header-style="{ background: '#1b2838', color: '#e0e6ed', borderBottom: '1px solid #1e3a5f' }"
    >
      <p style="color: #8899aa; margin-bottom: 12px">点击下方组件添加到大屏，拖拽调整位置和大小</p>
      <div style="display: flex; flex-direction: column; gap: 8px">
        <div
          v-for="wt in availableWidgets"
          :key="wt.id"
          style="display: flex; justify-content: space-between; align-items: center; padding: 10px 14px; border-radius: 6px; border: 1px solid #1e3a5f; background: rgba(255,255,255,0.03)"
        >
          <span>{{ wt.title }}</span>
          <a-button
            size="small"
            :type="layoutIds.has(wt.id) ? 'default' : 'primary'"
            :disabled="layoutIds.has(wt.id)"
            @click="addWidget(wt)"
          >{{ layoutIds.has(wt.id) ? '已添加' : '添加' }}</a-button>
        </div>
      </div>
      <template #footer>
        <a-space style="width: 100%; justify-content: space-between">
          <a-button @click="resetLayout" style="color: #8899aa; border-color: #1e3a5f">恢复默认</a-button>
          <a-button type="primary" @click="saveLayout">保存布局</a-button>
        </a-space>
      </template>
    </a-drawer>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, onUnmounted, h, defineComponent } from 'vue';
import { GridLayout, GridItem } from 'grid-layout-plus';
import dayjs from 'dayjs';
import { message } from 'ant-design-vue';

// ======================== Pure SVG Charts ========================

const SvgBarChart = defineComponent({
  props: { data: { type: Array as () => { name: string; value: number }[], default: () => [] } },
  setup(props) {
    return () => {
      const items = props.data;
      if (!items.length) return h('div', { style: 'color:#8899aa;text-align:center;padding:20px' }, '暂无数据');
      const max = Math.max(...items.map(d => d.value));
      const barH = 22;
      const gap = 6;
      const leftPad = 90;
      const svgH = items.length * (barH + gap);
      return h('svg', { width: '100%', height: '100%', viewBox: `0 0 500 ${svgH}`, preserveAspectRatio: 'xMidYMid meet', style: 'display:block' },
        items.map((d, i) => {
          const y = i * (barH + gap);
          const w = max ? (d.value / max) * (500 - leftPad - 10) : 0;
          return h('g', { key: i }, [
            h('text', { x: leftPad - 8, y: y + barH / 2 + 4, fill: '#8899aa', 'font-size': '12', 'text-anchor': 'end' }, d.name),
            h('rect', { x: leftPad, y, width: w, height: barH, rx: 3, fill: 'url(#barGrad)' }),
            h('text', { x: leftPad + w + 6, y: y + barH / 2 + 4, fill: '#00d4ff', 'font-size': '11' }, String(d.value)),
          ]);
        }).concat([
          h('defs', [h('linearGradient', { id: 'barGrad', x1: '0%', y1: '0%', x2: '100%', y2: '0%' }, [
            h('stop', { offset: '0%', 'stop-color': '#0088ff' }),
            h('stop', { offset: '100%', 'stop-color': '#00d4ff' }),
          ])]),
        ])
      );
    };
  },
});

const SvgLineChart = defineComponent({
  props: { data: { type: Array as () => { label: string; positive: number; negative: number }[], default: () => [] } },
  setup(props) {
    return () => {
      const items = props.data;
      if (!items.length) return h('div', { style: 'color:#8899aa;text-align:center;padding:20px' }, '暂无数据');
      const allVals = items.flatMap(d => [d.positive, Math.abs(d.negative)]);
      const maxVal = Math.max(...allVals, 1);
      const W = 500, H = 260, pad = { l: 45, r: 15, t: 25, b: 30 };
      const chartW = W - pad.l - pad.r;
      const chartH = H - pad.t - pad.b;

      const xStep = items.length > 1 ? chartW / (items.length - 1) : 0;
      const toY = (v: number) => pad.t + chartH - (v / maxVal) * chartH;
      const posPoints = items.map((d, i) => `${pad.l + i * xStep},${toY(d.positive)}`).join(' ');
      const negPoints = items.map((d, i) => `${pad.l + i * xStep},${toY(Math.abs(d.negative))}`).join(' ');

      // Area fill paths
      const posArea = `M${pad.l},${toY(0)} ` + items.map((d, i) => `L${pad.l + i * xStep},${toY(d.positive)}`).join(' ') + ` L${pad.l + (items.length - 1) * xStep},${toY(0)} Z`;
      const negArea = `M${pad.l},${toY(0)} ` + items.map((d, i) => `L${pad.l + i * xStep},${toY(Math.abs(d.negative))}`).join(' ') + ` L${pad.l + (items.length - 1) * xStep},${toY(0)} Z`;

      return h('svg', { width: '100%', height: '100%', viewBox: `0 0 ${W} ${H}`, preserveAspectRatio: 'xMidYMid meet', style: 'display:block' }, [
        // Grid lines
        ...[0, 0.25, 0.5, 0.75, 1].map(f => h('line', {
          x1: pad.l, y1: pad.t + chartH * (1 - f), x2: W - pad.r, y2: pad.t + chartH * (1 - f),
          stroke: '#1e3a5f', 'stroke-width': 0.5,
        })),
        // Y axis labels
        ...[0, 0.5, 1].map(f => h('text', {
          x: pad.l - 6, y: pad.t + chartH * (1 - f) + 4,
          fill: '#8899aa', 'font-size': '10', 'text-anchor': 'end',
        }, String(Math.round(maxVal * f)))),
        // X axis labels
        ...items.map((d, i) => h('text', {
          x: pad.l + i * xStep, y: H - 8,
          fill: '#8899aa', 'font-size': '10', 'text-anchor': 'middle',
        }, d.label)),
        // Areas
        h('path', { d: posArea, fill: 'rgba(0,212,255,0.1)' }),
        h('path', { d: negArea, fill: 'rgba(255,107,107,0.1)' }),
        // Lines
        h('polyline', { points: posPoints, fill: 'none', stroke: '#00d4ff', 'stroke-width': 2 }),
        h('polyline', { points: negPoints, fill: 'none', stroke: '#ff6b6b', 'stroke-width': 2 }),
        // Dots
        ...items.map((d, i) => h('circle', { cx: pad.l + i * xStep, cy: toY(d.positive), r: 3, fill: '#00d4ff' })),
        ...items.map((d, i) => h('circle', { cx: pad.l + i * xStep, cy: toY(Math.abs(d.negative)), r: 3, fill: '#ff6b6b' })),
        // Legend
        h('circle', { cx: W - 120, cy: 10, r: 4, fill: '#00d4ff' }),
        h('text', { x: W - 112, y: 14, fill: '#8899aa', 'font-size': '11' }, '加分'),
        h('circle', { cx: W - 70, cy: 10, r: 4, fill: '#ff6b6b' }),
        h('text', { x: W - 62, y: 14, fill: '#8899aa', 'font-size': '11' }, '扣分'),
      ]);
    };
  },
});

// ======================== Layout & Widgets ========================

interface WidgetDef {
  id: string;
  title: string;
  type: 'rankList' | 'barChart' | 'lineChart' | 'overview';
  defaultW: number;
  defaultH: number;
}

const availableWidgets: WidgetDef[] = [
  { id: 'rank', title: '龙虎榜 TOP 10', type: 'rankList', defaultW: 6, defaultH: 8 },
  { id: 'deptBar', title: '部门积分排名', type: 'barChart', defaultW: 6, defaultH: 8 },
  { id: 'trend', title: '积分趋势', type: 'lineChart', defaultW: 6, defaultH: 8 },
  { id: 'overview', title: '数据概览', type: 'overview', defaultW: 6, defaultH: 8 },
];

const widgetMap = computed(() => {
  const map: Record<string, WidgetDef> = {};
  for (const w of availableWidgets) map[w.id] = w;
  return map;
});

const defaultLayout = [
  { x: 0, y: 0, w: 6, h: 8, i: 'rank' },
  { x: 6, y: 0, w: 6, h: 8, i: 'deptBar' },
  { x: 0, y: 8, w: 6, h: 8, i: 'trend' },
  { x: 6, y: 8, w: 6, h: 8, i: 'overview' },
];

interface LayoutItem { x: number; y: number; w: number; h: number; i: string }

const STORAGE_KEY = 'display-screen-layout';
const layout = ref<LayoutItem[]>(loadLayout());
const layoutIds = computed(() => new Set(layout.value.map((l: LayoutItem) => l.i)));

function loadLayout(): LayoutItem[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return JSON.parse(saved);
  } catch { /* ignore */ }
  return defaultLayout.map((l: LayoutItem) => ({ ...l }));
}

function saveLayout() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(layout.value));
  message.success('布局已保存');
}

function resetLayout() {
  layout.value = defaultLayout.map((l: LayoutItem) => ({ ...l }));
  localStorage.removeItem(STORAGE_KEY);
  message.success('已恢复默认布局');
}

function addWidget(wt: WidgetDef) {
  if (layoutIds.value.has(wt.id)) return;
  const maxY = layout.value.reduce((m: number, l: LayoutItem) => Math.max(m, l.y + l.h), 0);
  layout.value.push({ x: 0, y: maxY, w: wt.defaultW, h: wt.defaultH, i: wt.id });
}

function removeWidget(id: string) {
  layout.value = layout.value.filter((l: LayoutItem) => l.i !== id);
}

// ======================== Fullscreen ========================
const screenRef = ref<HTMLElement | null>(null);
const isFullscreen = ref(false);

function toggleFullscreen() {
  if (!document.fullscreenElement) {
    screenRef.value?.requestFullscreen();
  } else {
    document.exitFullscreen();
  }
}

function onFsChange() {
  isFullscreen.value = !!document.fullscreenElement;
}

// ======================== Config drawer ========================
const configVisible = ref(false);

// ======================== Row height ========================
const rowHeight = ref(30);

// ======================== Clock ========================
const currentTime = ref(dayjs().format('YYYY-MM-DD HH:mm:ss'));
let timer: ReturnType<typeof setInterval>;
onMounted(() => {
  timer = setInterval(() => { currentTime.value = dayjs().format('YYYY-MM-DD HH:mm:ss'); }, 1000);
  document.addEventListener('fullscreenchange', onFsChange);
});
onUnmounted(() => {
  clearInterval(timer);
  document.removeEventListener('fullscreenchange', onFsChange);
});

// ======================== Mock Data ========================
const top10 = [
  { userId: 1, name: '王磊', department: '技术研发部', totalPoints: 86 },
  { userId: 2, name: '何雪', department: '产品设计部', totalPoints: 78 },
  { userId: 3, name: '冯军', department: '交付管理部', totalPoints: 75 },
  { userId: 4, name: '韩飞', department: '技术研发部', totalPoints: 72 },
  { userId: 5, name: '罗宇', department: '质量保障部', totalPoints: 68 },
  { userId: 6, name: '唐馨', department: '交付管理部', totalPoints: 65 },
  { userId: 7, name: '刘洋', department: '技术研发部', totalPoints: 62 },
  { userId: 8, name: '林峰', department: '市场运营部', totalPoints: 60 },
  { userId: 9, name: '赵明', department: '技术研发部', totalPoints: 58 },
  { userId: 10, name: '徐燕', department: '市场运营部', totalPoints: 55 },
];

const deptBarData = [
  { name: '技术研发部', value: 3200 },
  { name: '交付管理部', value: 2800 },
  { name: '产品设计部', value: 2100 },
  { name: '市场运营部', value: 1800 },
  { name: '质量保障部', value: 1500 },
  { name: '人力资源部', value: 900 },
];

const trendLineData = [
  { label: '07', positive: 890, negative: -250 },
  { label: '08', positive: 1200, negative: -190 },
  { label: '09', positive: 1080, negative: -270 },
  { label: '10', positive: 950, negative: -210 },
  { label: '11', positive: 1300, negative: -340 },
  { label: '12', positive: 1150, negative: -280 },
  { label: '01', positive: 1400, negative: -310 },
  { label: '02', positive: 1250, negative: -260 },
  { label: '03', positive: 1380, negative: -290 },
];

const overviewData = [
  { label: '总员工数', value: '286', color: '#00d4ff' },
  { label: '总积分', value: '12,850', color: '#faad14' },
  { label: '本月发放', value: '2,340', color: '#52c41a' },
  { label: '活跃率', value: '78%', color: '#1890ff' },
];
</script>

<style scoped lang="less">
.display-screen {
  width: 100vw;
  height: 100vh;
  background: #0d1b2a;
  padding: 16px 20px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.screen-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-bottom: 12px;
  h1 {
    font-size: 22px;
    color: #e0e6ed;
    background: linear-gradient(90deg, #00d4ff, #1890ff);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
  }
  .header-info {
    color: #8899aa;
    font-size: 14px;
    display: flex;
    align-items: center;
    gap: 12px;
  }
}
.screen-card {
  background: #1b2838;
  border: 1px solid #1e3a5f;
  border-radius: 8px;
  padding: 14px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 14px;
  font-weight: 600;
  color: #e0e6ed;
  margin-bottom: 8px;
  flex-shrink: 0;
}
.card-body {
  flex: 1;
  min-height: 0;
  overflow: hidden;
}
.rank-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
  overflow-y: auto;
  height: 100%;
}
.rank-item {
  display: flex;
  align-items: center;
  padding: 5px 10px;
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.02);
  flex-shrink: 0;
  &:hover { background: rgba(255, 255, 255, 0.05); }
}
.rank-no {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: 700;
  color: #8899aa;
  background: rgba(255, 255, 255, 0.05);
  margin-right: 10px;
  &.gold { background: #faad14; color: #fff; }
  &.silver { background: #8c8c8c; color: #fff; }
  &.bronze { background: #cd7f32; color: #fff; }
}
.rank-name { color: #e0e6ed; font-weight: 600; width: 70px; font-size: 13px; }
.rank-dept { color: #8899aa; font-size: 12px; flex: 1; }
.rank-score { color: #00d4ff; font-weight: 700; font-size: 15px; }
.data-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
  height: 100%;
  align-content: center;
}
.data-item {
  text-align: center;
  padding: 16px;
  background: rgba(255, 255, 255, 0.03);
  border-radius: 8px;
  border: 1px solid #1e3a5f;
}
.data-value { font-size: 32px; font-weight: 800; }
.data-label { font-size: 12px; color: #8899aa; margin-top: 4px; }

// grid-layout-plus overrides for dark theme
:deep(.vue-grid-item.vue-grid-placeholder) {
  background: rgba(0, 212, 255, 0.2) !important;
  border: 1px dashed #00d4ff !important;
  border-radius: 8px;
}
</style>
