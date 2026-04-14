<template>
  <svg :viewBox="`0 0 ${size} ${size}`" preserveAspectRatio="xMidYMid meet" style="width: 100%; height: auto; display: block; overflow: visible">
    <g :transform="`translate(${center}, ${center})`">
      <!-- 背景网格: 4层同心多边形 -->
      <polygon
        v-for="layer in 4"
        :key="'grid-' + layer"
        :points="gridPolygon(layer / 4)"
        fill="none"
        :stroke="layer === 4 ? '#d9d9d9' : '#f0f0f0'"
        stroke-width="1"
      />
      <!-- 网格刻度值（沿第一条轴线右侧标注每一圈的数值） -->
      <text
        v-for="layer in 4"
        :key="'scale-' + layer"
        :x="4"
        :y="-radius * (layer / 4) - 3"
        text-anchor="start"
        font-size="10"
        fill="#bfbfbf"
      >{{ scaleLabel(layer) }}</text>
      <!-- 轴线 -->
      <line
        v-for="(_, i) in dimensions"
        :key="'axis-' + i"
        x1="0" y1="0"
        :x2="axisPoint(i).x" :y2="axisPoint(i).y"
        stroke="#e8e8e8" stroke-width="1"
      />
      <!-- 参考线多边形 -->
      <polygon
        v-if="showReference && referenceValues.length === dimensions.length"
        :points="dataPolygon(normalizedRefValues)"
        fill="rgba(250, 173, 20, 0.1)"
        stroke="#faad14"
        stroke-width="1.5"
        stroke-dasharray="4 3"
      />
      <!-- 参考值数据点标注 -->
      <template v-if="showReference && referenceValues.length === dimensions.length">
        <text
          v-for="(pt, i) in refDataPoints"
          :key="'refval-' + i"
          :x="refValueTextPos(i).x"
          :y="refValueTextPos(i).y"
          :text-anchor="valueTextAnchor(i)"
          font-size="9"
          fill="#faad14"
        >{{ formatNum(referenceValues[i]) }}</text>
      </template>
      <!-- 数据多边形 -->
      <polygon
        :points="dataPolygon(normalizedValues)"
        fill="rgba(24, 144, 255, 0.2)"
        stroke="#1890ff"
        stroke-width="2"
      />
      <!-- 数据点 -->
      <circle
        v-for="(pt, i) in dataPoints"
        :key="'dot-' + i"
        :cx="pt.x" :cy="pt.y"
        r="3.5"
        fill="#1890ff"
        stroke="#fff"
        stroke-width="1.5"
      />
      <!-- 数据点分值标注 -->
      <text
        v-for="(pt, i) in dataPoints"
        :key="'val-' + i"
        :x="valueTextPos(i).x"
        :y="valueTextPos(i).y"
        :text-anchor="valueTextAnchor(i)"
        font-size="11"
        font-weight="500"
        fill="#1890ff"
      >{{ dimensions[i].value }}</text>
      <!-- 维度标签（支持自动换行） -->
      <text
        v-for="(dim, i) in dimensions"
        :key="'label-' + i"
        :x="labelPoint(i).x"
        :y="labelBaseY(i)"
        :text-anchor="labelAnchor(i)"
        dominant-baseline="central"
        font-size="12"
        fill="#595959"
      >
        <tspan
          v-for="(line, li) in getLabelLines(i)"
          :key="li"
          :x="labelPoint(i).x"
          :dy="li === 0 ? '0' : '1.2em'"
        >{{ line }}</tspan>
      </text>
    </g>
  </svg>
</template>

<script setup lang="ts">
import { computed } from 'vue';

export interface RadarDimension {
  name: string;
  value: number;
}

const props = withDefaults(defineProps<{
  dimensions: RadarDimension[];
  referenceValues?: number[];
  showReference?: boolean;
  size?: number;
}>(), {
  referenceValues: () => [],
  showReference: false,
  size: 380,
});

const center = computed(() => props.size / 2);
const radius = computed(() => props.size / 2 - 80);
const count = computed(() => props.dimensions.length);

const maxValue = computed(() => {
  const allVals = props.dimensions.map((d) => d.value);
  if (props.showReference && props.referenceValues.length) {
    allVals.push(...props.referenceValues);
  }
  return Math.max(...allVals, 1);
});

/** 将 maxValue 向上取整到"好看"的刻度值 */
const niceMax = computed(() => {
  const raw = maxValue.value;
  if (raw <= 0) return 1;
  const magnitude = Math.pow(10, Math.floor(Math.log10(raw)));
  const ratio = raw / magnitude;
  let nice: number;
  if (ratio <= 1) nice = 1;
  else if (ratio <= 2) nice = 2;
  else if (ratio <= 5) nice = 5;
  else nice = 10;
  return nice * magnitude;
});

const normalizedValues = computed(() =>
  props.dimensions.map((d) => Math.min(d.value / niceMax.value, 1)),
);

const normalizedRefValues = computed(() =>
  props.referenceValues.map((v) => Math.min(v / niceMax.value, 1)),
);

function scaleLabel(layer: number): string {
  const val = niceMax.value * (layer / 4);
  return Number.isInteger(val) ? String(val) : val.toFixed(1);
}

function angleFor(i: number) {
  return (Math.PI * 2 * i) / count.value - Math.PI / 2;
}

function pointAt(i: number, ratio: number) {
  const a = angleFor(i);
  return {
    x: Math.cos(a) * radius.value * ratio,
    y: Math.sin(a) * radius.value * ratio,
  };
}

function axisPoint(i: number) {
  return pointAt(i, 1);
}

function gridPolygon(ratio: number) {
  return Array.from({ length: count.value }, (_, i) => {
    const p = pointAt(i, ratio);
    return `${p.x},${p.y}`;
  }).join(' ');
}

function dataPolygon(values: number[]) {
  return values
    .map((v, i) => {
      const p = pointAt(i, v);
      return `${p.x},${p.y}`;
    })
    .join(' ');
}

const dataPoints = computed(() =>
  normalizedValues.value.map((v, i) => pointAt(i, v)),
);

const refDataPoints = computed(() =>
  normalizedRefValues.value.map((v, i) => pointAt(i, v)),
);

function formatNum(v: number): string {
  if (Number.isInteger(v)) return String(v);
  return v.toFixed(1);
}

/** 数据标注文本位置：沿数据点向外偏移 */
function valueTextPos(i: number) {
  const a = angleFor(i);
  const pt = dataPoints.value[i];
  const offset = 14;
  return {
    x: pt.x + Math.cos(a) * offset,
    y: pt.y + Math.sin(a) * offset,
  };
}

/** 参考值标注文本位置：沿参考点略微偏移（与实际值标注错开） */
function refValueTextPos(i: number) {
  const a = angleFor(i);
  const pt = refDataPoints.value[i];
  // 沿垂直于径向的方向偏移，避免与实际值重叠
  const perpA = a + Math.PI / 2;
  const offset = 10;
  return {
    x: pt.x + Math.cos(perpA) * offset,
    y: pt.y + Math.sin(perpA) * offset + 3,
  };
}

function valueTextAnchor(i: number) {
  const a = angleFor(i);
  const x = Math.cos(a);
  if (x > 0.3) return 'start';
  if (x < -0.3) return 'end';
  return 'middle';
}

function labelPoint(i: number) {
  const a = angleFor(i);
  const offset = radius.value + 20;
  return {
    x: Math.cos(a) * offset,
    y: Math.sin(a) * offset,
  };
}

function labelAnchor(i: number) {
  const a = angleFor(i);
  const x = Math.cos(a);
  if (x > 0.01) return 'start';
  if (x < -0.01) return 'end';
  return 'middle';
}

/** 根据标签位置计算每行最多显示的字符数 */
function labelMaxChars(i: number): number {
  const pt = labelPoint(i);
  const anchor = labelAnchor(i);
  const charWidth = 13; // 12px font ≈ 13px per CJK char
  const margin = 4;
  const half = center.value;

  let availableWidth: number;

  if (anchor === 'start') {
    availableWidth = half - pt.x - margin;
  } else if (anchor === 'end') {
    availableWidth = pt.x + half - margin;
  } else {
    const sideAvail = half - Math.abs(pt.x) - margin;
    availableWidth = 2 * sideAvail;
  }

  return Math.max(2, Math.floor(availableWidth / charWidth));
}

/** 将标签文字按每行最大字符数拆分为多行 */
function getLabelLines(i: number): string[] {
  const name = props.dimensions[i].name;
  const maxChars = labelMaxChars(i);
  if (name.length <= maxChars) return [name];

  const lines: string[] = [];
  for (let j = 0; j < name.length; j += maxChars) {
    lines.push(name.slice(j, j + maxChars));
  }
  return lines;
}

/** 计算多行标签的起始Y坐标，使文字块整体垂直居中于标签锚点 */
function labelBaseY(i: number): number {
  const lines = getLabelLines(i);
  const lineHeight = 15.6; // font-size 12 * 1.3
  const pt = labelPoint(i);
  return pt.y - ((lines.length - 1) * lineHeight) / 2;
}
</script>
