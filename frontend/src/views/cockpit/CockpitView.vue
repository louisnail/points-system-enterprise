<template>
  <div ref="cockpitRef" class="cockpit-page" :class="{ 'cockpit-fullscreen': isFullscreen }">
    <!-- ====== 全局筛选栏 ====== -->
    <div class="cockpit-toolbar">
      <h2 class="cockpit-title">管理驾驶舱</h2>
      <div class="toolbar-filters">
        <a-radio-group v-model:value="timeDimension" button-style="solid" size="small">
          <a-radio-button value="month">月度</a-radio-button>
          <a-radio-button value="quarter">季度</a-radio-button>
          <a-radio-button value="year">年度</a-radio-button>
        </a-radio-group>
        <a-date-picker
          v-if="timeDimension === 'month'"
          v-model:value="selectedMonth"
          picker="month"
          placeholder="选择月份"
          style="width: 140px"
          allowClear
        />
        <a-date-picker
          v-if="timeDimension === 'quarter'"
          v-model:value="selectedQuarter"
          picker="quarter"
          placeholder="选择季度"
          style="width: 140px"
          allowClear
        />
        <a-date-picker
          v-if="timeDimension === 'year'"
          v-model:value="selectedYear"
          picker="year"
          placeholder="选择年份"
          style="width: 140px"
          allowClear
        />
        <a-select v-model:value="filterDept" :options="departmentOptions" placeholder="部门" style="width: 150px" allowClear />
        <a-select v-model:value="filterOrg" :options="orgOptions" placeholder="归属组织" style="width: 140px" allowClear />
        <a-button @click="handleRefresh"><ReloadOutlined /> 刷新</a-button>
        <a-dropdown>
          <a-button><DownloadOutlined /> 导出</a-button>
          <template #overlay>
            <a-menu @click="handleExport">
              <a-menu-item key="image">导出为图片 (PNG)</a-menu-item>
              <a-menu-item key="pdf">导出当前报表 (PDF)</a-menu-item>
              <a-menu-item key="excel">导出数据明细 (Excel)</a-menu-item>
            </a-menu>
          </template>
        </a-dropdown>
        <a-button @click="panelDrawerVisible = true"><SettingOutlined /> 组件配置</a-button>
        <a-button @click="toggleFullscreen">
          <FullscreenOutlined v-if="!isFullscreen" />
          <FullscreenExitOutlined v-if="isFullscreen" />
          {{ isFullscreen ? '退出大屏' : '大屏模式' }}
        </a-button>
      </div>
    </div>

    <!-- ====== 第一行：8 KPI 卡片（4×2 grid） ====== -->
    <div class="kpi-grid" v-if="panelVisible.kpi">
      <div
        v-for="item in kpiData"
        :key="item.key"
        class="kpi-card"
        :style="{ background: item.bg }"
      >
        <div class="kpi-value" :style="{ color: item.color }">
          {{ typeof item.value === 'number' ? item.value.toLocaleString() : item.value }}
          <span v-if="item.suffix" class="kpi-suffix">{{ item.suffix }}</span>
        </div>
        <div class="kpi-label">{{ item.label }}</div>
        <div class="kpi-sub">
          {{ item.sub }}
          <span v-if="item.change !== 0" class="kpi-change" :class="item.change > 0 ? 'up' : 'down'">
            <CaretUpOutlined v-if="item.change > 0" />
            <CaretDownOutlined v-if="item.change < 0" />
          </span>
        </div>
      </div>
    </div>

    <!-- ====== 第二行：核心分析区（图表1+图表2） ====== -->
    <a-row :gutter="16" class="chart-row" v-if="panelVisible.trend || panelVisible.deptCompare">
      <a-col :span="panelVisible.trend && panelVisible.deptCompare ? 12 : 24" v-if="panelVisible.trend">
        <div class="card-box">
          <div class="card-header">
            <span class="card-title">积分趋势</span>
            <a-button type="link" size="small" @click="openAiDrawer('trend')">
              <ThunderboltOutlined /> AI 分析
            </a-button>
          </div>
          <div class="chart-area" style="height: 360px">
            <svg :viewBox="`0 0 ${svgW} ${svgH}`" class="svg-chart">
              <!-- Y 轴刻度 -->
              <g class="axis-y">
                <template v-for="(tick, i) in trendYTicks" :key="'ty'+i">
                  <line :x1="pad.l" :y1="trendY(tick)" :x2="svgW - pad.r" :y2="trendY(tick)" class="grid-line" />
                  <text :x="pad.l - 8" :y="trendY(tick) + 4" class="axis-text" text-anchor="end">{{ tick }}</text>
                </template>
              </g>
              <!-- X 轴标签 -->
              <g class="axis-x">
                <template v-for="(item, i) in trendData" :key="'tx'+i">
                  <text :x="trendX(i)" :y="svgH - pad.b + 16" class="axis-text" text-anchor="middle">{{ item.period.slice(5) }}</text>
                </template>
              </g>
              <!-- 折线：加分 -->
              <polyline :points="trendLine('totalPositive')" fill="none" stroke="#52c41a" stroke-width="2" />
              <!-- 折线：扣分(取绝对值) -->
              <polyline :points="trendLineAbs('totalNegative')" fill="none" stroke="#ff4d4f" stroke-width="2" stroke-dasharray="6,3" />
              <!-- 折线：净值 -->
              <polyline :points="trendLine('totalNet')" fill="none" stroke="#1890ff" stroke-width="2.5" />
              <!-- 面积：净值 -->
              <polygon :points="trendArea('totalNet')" fill="rgba(24,144,255,0.08)" />
              <!-- 折线：人均 -->
              <polyline :points="trendLineAvg" fill="none" stroke="#722ed1" stroke-width="1.5" stroke-dasharray="4,4" />
              <!-- 数据点 -->
              <template v-for="(item, i) in trendData" :key="'dot'+i">
                <circle :cx="trendX(i)" :cy="trendY(item.totalNet)" r="3.5" fill="#1890ff" class="data-dot">
                  <title>{{ item.period }} 净值: {{ item.totalNet }}</title>
                </circle>
              </template>
              <!-- 图例 -->
              <g :transform="`translate(${pad.l}, ${svgH - 4})`" class="legend">
                <circle cx="0" cy="-4" r="4" fill="#1890ff" /><text x="8" y="0" class="legend-text">净值</text>
                <circle cx="60" cy="-4" r="4" fill="#52c41a" /><text x="68" y="0" class="legend-text">加分</text>
                <circle cx="120" cy="-4" r="4" fill="#ff4d4f" /><text x="128" y="0" class="legend-text">扣分</text>
                <circle cx="180" cy="-4" r="4" fill="#722ed1" /><text x="188" y="0" class="legend-text">人均</text>
              </g>
            </svg>
          </div>
        </div>
      </a-col>
      <a-col :span="panelVisible.trend && panelVisible.deptCompare ? 12 : 24" v-if="panelVisible.deptCompare">
        <div class="card-box">
          <div class="card-header">
            <span class="card-title">各部门积分对比</span>
            <a-button type="link" size="small" @click="openAiDrawer('deptCompare')">
              <ThunderboltOutlined /> AI 分析
            </a-button>
          </div>
          <div class="chart-area" style="height: 360px">
            <svg :viewBox="`0 0 ${svgW} ${svgH}`" class="svg-chart">
              <!-- Y 轴 -->
              <g class="axis-y">
                <template v-for="(tick, i) in deptYTicks" :key="'dy'+i">
                  <line :x1="pad.l" :y1="deptY(tick)" :x2="svgW - pad.r" :y2="deptY(tick)" class="grid-line" />
                  <text :x="pad.l - 8" :y="deptY(tick) + 4" class="axis-text" text-anchor="end">{{ tick }}</text>
                </template>
              </g>
              <!-- 分组柱 -->
              <g v-for="(dept, i) in deptCompareData" :key="'dg'+i">
                <rect :x="deptBarX(i, 0)" :y="deptY(dept.netScore)" :width="deptBarW" :height="deptBarH(dept.netScore)" fill="#1890ff" rx="2">
                  <title>{{ dept.department }} 净值: {{ dept.netScore }}</title>
                </rect>
                <rect :x="deptBarX(i, 1)" :y="deptY(dept.totalPositive)" :width="deptBarW" :height="deptBarH(dept.totalPositive)" fill="#52c41a" rx="2">
                  <title>{{ dept.department }} 加分: {{ dept.totalPositive }}</title>
                </rect>
                <rect :x="deptBarX(i, 2)" :y="deptY(Math.abs(dept.totalNegative))" :width="deptBarW" :height="deptBarH(Math.abs(dept.totalNegative))" fill="#ff4d4f" rx="2">
                  <title>{{ dept.department }} 扣分: {{ dept.totalNegative }}</title>
                </rect>
                <text :x="deptGroupCenter(i)" :y="svgH - pad.b + 16" class="axis-text" text-anchor="middle" font-size="10">{{ dept.department.slice(0, 4) }}</text>
              </g>
              <!-- 图例 -->
              <g :transform="`translate(${pad.l}, ${svgH - 4})`" class="legend">
                <rect x="0" y="-8" width="10" height="10" fill="#1890ff" rx="2" /><text x="14" y="0" class="legend-text">净值</text>
                <rect x="60" y="-8" width="10" height="10" fill="#52c41a" rx="2" /><text x="74" y="0" class="legend-text">加分</text>
                <rect x="120" y="-8" width="10" height="10" fill="#ff4d4f" rx="2" /><text x="134" y="0" class="legend-text">扣分</text>
              </g>
            </svg>
          </div>
        </div>
      </a-col>
    </a-row>

    <!-- ====== 第三行：维度分析区（图表3+图表4） ====== -->
    <a-row :gutter="16" class="chart-row" v-if="panelVisible.distribution || panelVisible.categoryRanking">
      <a-col :span="12" v-if="panelVisible.distribution">
        <div class="card-box">
          <div class="card-header">
            <span class="card-title">加分 / 扣分占比</span>
            <a-button type="link" size="small" @click="openAiDrawer('distribution')">
              <ThunderboltOutlined /> AI 分析
            </a-button>
          </div>
          <div class="chart-area" style="height: 360px">
            <svg :viewBox="`0 0 ${svgW} ${svgH}`" class="svg-chart">
              <!-- 外环: 加分 vs 扣分 -->
              <g :transform="`translate(${svgW / 2}, ${(svgH - 30) / 2})`">
                <!-- 加分弧 -->
                <path :d="outerArcPositive" fill="#52c41a" opacity="0.85" class="pie-arc">
                  <title>加分: {{ scoreDistributionData[0].value }} ({{ positivePercent }}%)</title>
                </path>
                <!-- 扣分弧 -->
                <path :d="outerArcNegative" fill="#ff4d4f" opacity="0.85" class="pie-arc">
                  <title>扣分: {{ scoreDistributionData[1].value }} ({{ negativePercent }}%)</title>
                </path>
                <!-- 内环: 细分 -->
                <template v-for="(seg, i) in innerArcs" :key="'inner'+i">
                  <path :d="seg.d" :fill="seg.color" opacity="0.7" class="pie-arc">
                    <title>{{ seg.label }}: {{ seg.value }}</title>
                  </path>
                </template>
                <!-- 中心文字 -->
                <text y="-6" text-anchor="middle" class="donut-center-value">{{ (scoreDistributionData[0].value + scoreDistributionData[1].value).toLocaleString() }}</text>
                <text y="14" text-anchor="middle" class="donut-center-label">总积分事件</text>
              </g>
              <!-- 图例 -->
              <g :transform="`translate(${pad.l}, ${svgH - 4})`" class="legend">
                <circle cx="0" cy="-4" r="4" fill="#52c41a" /><text x="8" y="0" class="legend-text">加分 {{ positivePercent }}%</text>
                <circle cx="90" cy="-4" r="4" fill="#ff4d4f" /><text x="98" y="0" class="legend-text">扣分 {{ negativePercent }}%</text>
              </g>
            </svg>
          </div>
        </div>
      </a-col>
      <a-col :span="12" v-if="panelVisible.categoryRanking">
        <div class="card-box">
          <div class="card-header">
            <span class="card-title">管控项总分排行</span>
            <a-button type="link" size="small" @click="openAiDrawer('categoryRanking')">
              <ThunderboltOutlined /> AI 分析
            </a-button>
          </div>
          <div class="chart-area" style="height: 360px">
            <svg :viewBox="`0 0 ${svgW} ${svgH}`" class="svg-chart">
              <g v-for="(item, i) in categoryRankingData" :key="'cr'+i">
                <!-- 标签 -->
                <text :x="pad.l - 4" :y="hbarY(i, categoryRankingData.length) + 5" class="axis-text" text-anchor="end" font-size="10">{{ item.name.slice(0, 6) }}</text>
                <!-- 加分条 -->
                <rect
                  :x="hbarZero"
                  :y="hbarY(i, categoryRankingData.length) - 6"
                  :width="hbarScale(item.positive)"
                  height="12"
                  fill="#1890ff"
                  rx="2"
                >
                  <title>{{ item.name }} 加分: +{{ item.positive }}</title>
                </rect>
                <!-- 扣分条 -->
                <rect
                  v-if="item.negative < 0"
                  :x="hbarZero - hbarScale(Math.abs(item.negative))"
                  :y="hbarY(i, categoryRankingData.length) - 6"
                  :width="hbarScale(Math.abs(item.negative))"
                  height="12"
                  fill="#ff4d4f"
                  rx="2"
                >
                  <title>{{ item.name }} 扣分: {{ item.negative }}</title>
                </rect>
                <!-- 净值标记 -->
                <text :x="hbarZero + hbarScale(Math.max(item.positive, 0)) + 6" :y="hbarY(i, categoryRankingData.length) + 4" class="bar-value" font-size="9">{{ item.net > 0 ? '+' : '' }}{{ item.net }}</text>
              </g>
              <!-- 零线 -->
              <line :x1="hbarZero" :y1="pad.t" :x2="hbarZero" :y2="svgH - pad.b" stroke="#d9d9d9" stroke-width="1" />
            </svg>
          </div>
        </div>
      </a-col>
    </a-row>

    <!-- ====== 第四行：深度分析区（图表5+图表6） ====== -->
    <a-row :gutter="16" class="chart-row" v-if="panelVisible.dimensionRanking || panelVisible.orgCompare">
      <a-col :span="12" v-if="panelVisible.dimensionRanking">
        <div class="card-box">
          <div class="card-header">
            <span class="card-title">评价维度总分排行</span>
            <a-button type="link" size="small" @click="openAiDrawer('dimensionRanking')">
              <ThunderboltOutlined /> AI 分析
            </a-button>
          </div>
          <div class="chart-area" style="height: 360px">
            <svg :viewBox="`0 0 ${svgW} ${svgH}`" class="svg-chart">
              <g v-for="(item, i) in dimensionRankingData" :key="'dr'+i">
                <text :x="pad.l - 4" :y="hbarY(i, dimensionRankingData.length) + 5" class="axis-text" text-anchor="end" font-size="10">{{ item.name.slice(0, 6) }}</text>
                <rect
                  :x="hbarZero"
                  :y="hbarY(i, dimensionRankingData.length) - 6"
                  :width="hbarScale(item.positive)"
                  height="12"
                  fill="#1890ff"
                  rx="2"
                >
                  <title>{{ item.name }} 加分: +{{ item.positive }}</title>
                </rect>
                <rect
                  v-if="item.negative < 0"
                  :x="hbarZero - hbarScale(Math.abs(item.negative))"
                  :y="hbarY(i, dimensionRankingData.length) - 6"
                  :width="hbarScale(Math.abs(item.negative))"
                  height="12"
                  fill="#ff4d4f"
                  rx="2"
                >
                  <title>{{ item.name }} 扣分: {{ item.negative }}</title>
                </rect>
                <text :x="hbarZero + hbarScale(Math.max(item.positive, 0)) + 6" :y="hbarY(i, dimensionRankingData.length) + 4" class="bar-value" font-size="9">{{ item.net > 0 ? '+' : '' }}{{ item.net }}</text>
              </g>
              <line :x1="hbarZero" :y1="pad.t" :x2="hbarZero" :y2="svgH - pad.b" stroke="#d9d9d9" stroke-width="1" />
            </svg>
          </div>
        </div>
      </a-col>
      <a-col :span="12" v-if="panelVisible.orgCompare">
        <div class="card-box">
          <div class="card-header">
            <span class="card-title">归属组织积分对比</span>
            <a-button type="link" size="small" @click="openAiDrawer('orgCompare')">
              <ThunderboltOutlined /> AI 分析
            </a-button>
          </div>
          <div class="chart-area" style="height: 360px">
            <svg :viewBox="`0 0 ${svgW} ${svgH}`" class="svg-chart">
              <!-- 雷达图 -->
              <g :transform="`translate(${svgW / 2}, ${(svgH - 30) / 2})`">
                <!-- 背景同心圆 -->
                <template v-for="lv in [0.2, 0.4, 0.6, 0.8, 1.0]" :key="'rlv'+lv">
                  <polygon :points="radarPolygon(lv)" fill="none" stroke="#e8e8e8" stroke-width="0.8" />
                </template>
                <!-- 轴线 -->
                <template v-for="(_, ai) in radarAxes" :key="'rax'+ai">
                  <line x1="0" y1="0" :x2="radarAxisEnd(ai).x" :y2="radarAxisEnd(ai).y" stroke="#d9d9d9" stroke-width="0.5" />
                  <text :x="radarLabelPos(ai).x" :y="radarLabelPos(ai).y" class="axis-text" text-anchor="middle" font-size="10">{{ radarAxes[ai] }}</text>
                </template>
                <!-- 各组织数据多边形 -->
                <template v-for="(org, oi) in orgCompareData" :key="'rorg'+oi">
                  <polygon :points="radarOrgPolygon(org)" :fill="radarColors[oi] + '22'" :stroke="radarColors[oi]" stroke-width="1.5" />
                </template>
              </g>
              <!-- 图例 -->
              <g :transform="`translate(${pad.l}, ${svgH - 4})`" class="legend">
                <template v-for="(org, oi) in orgCompareData" :key="'rl'+oi">
                  <circle :cx="oi * 65" cy="-4" r="4" :fill="radarColors[oi]" />
                  <text :x="oi * 65 + 8" y="0" class="legend-text">{{ org.org }}</text>
                </template>
              </g>
            </svg>
          </div>
        </div>
      </a-col>
    </a-row>

    <!-- ====== 第五行：智能洞察区（3 卡片） ====== -->
    <a-row :gutter="16" class="chart-row" v-if="panelVisible.insights">
      <!-- 卡片 A：团队健康度 -->
      <a-col :span="8">
        <div class="card-box insight-card">
          <div class="card-header">
            <span class="card-title">团队健康度评分</span>
            <a-button type="link" size="small" @click="openAiDrawer('teamHealth')">
              <ThunderboltOutlined /> AI 分析
            </a-button>
          </div>
          <div class="health-gauge">
            <svg viewBox="0 0 120 70" class="gauge-svg">
              <path d="M10,60 A50,50 0 0,1 110,60" fill="none" stroke="#f0f0f0" stroke-width="10" stroke-linecap="round" />
              <path :d="healthArc" fill="none" :stroke="healthColor" stroke-width="10" stroke-linecap="round" />
              <text x="60" y="55" text-anchor="middle" class="gauge-value">{{ teamHealthData.overallScore }}</text>
              <text x="60" y="68" text-anchor="middle" class="gauge-label">综合评分</text>
            </svg>
          </div>
          <div class="health-dims">
            <div v-for="dim in teamHealthData.dimensions" :key="dim.label" class="dim-row">
              <span class="dim-label">{{ dim.label }}</span>
              <a-progress :percent="dim.score" :stroke-color="dim.score >= 70 ? '#52c41a' : dim.score >= 40 ? '#faad14' : '#ff4d4f'" :show-info="false" size="small" />
              <span class="dim-score">{{ dim.score }}</span>
            </div>
          </div>
          <div class="health-tags">
            <div><span class="tag-label">Top 加分维度:</span> <a-tag v-for="t in teamHealthData.topPositive" :key="t" color="green">{{ t }}</a-tag></div>
            <div style="margin-top: 6px"><span class="tag-label">Top 扣分维度:</span> <a-tag v-for="t in teamHealthData.topNegative" :key="t" color="red">{{ t }}</a-tag></div>
          </div>
        </div>
      </a-col>

      <!-- 卡片 B：异常数据提醒 -->
      <a-col :span="8">
        <div class="card-box insight-card">
          <div class="card-header">
            <span class="card-title">异常数据提醒</span>
            <a-badge :count="anomalyData.length" :offset="[-2, 0]">
              <span />
            </a-badge>
          </div>
          <div class="anomaly-list">
            <div v-for="item in anomalyData" :key="item.id" class="anomaly-item">
              <a-tag :color="anomalyColor(item.level)" size="small">{{ anomalyLevelText(item.level) }}</a-tag>
              <div class="anomaly-content">
                <div class="anomaly-type">{{ item.type }}</div>
                <div class="anomaly-detail">{{ item.target }} — {{ item.summary }}</div>
              </div>
            </div>
          </div>
        </div>
      </a-col>

      <!-- 卡片 C：末位预警 -->
      <a-col :span="8">
        <div class="card-box insight-card">
          <div class="card-header">
            <span class="card-title">末位预警</span>
            <a-button type="link" size="small" @click="openAiDrawer('bottomWarning')">
              <ThunderboltOutlined /> AI 分析
            </a-button>
          </div>
          <a-table
            :columns="warningColumns"
            :data-source="bottomWarningData"
            :pagination="false"
            size="small"
            :scroll="{ y: 240 }"
            row-key="name"
          >
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'riskLevel'">
                <a-tag :color="riskColor(record.riskLevel)">{{ riskText(record.riskLevel) }}</a-tag>
              </template>
              <template v-if="column.key === 'currentPoints'">
                <span style="color: #ff4d4f; font-weight: 600">{{ record.currentPoints }}</span>
              </template>
            </template>
          </a-table>
          <div class="warning-tip">末位人员可能影响绩效评定与奖金分配，建议关注并干预</div>
        </div>
      </a-col>
    </a-row>

    <!-- ====== 第六行：明细排行区（Tabs） ====== -->
    <div class="card-box" style="margin-top: 16px" v-if="panelVisible.detailTabs">
      <a-tabs v-model:activeKey="detailTab">
        <a-tab-pane key="top10" tab="排名 Top10">
          <a-table :columns="topColumns" :data-source="topRankData" :pagination="false" size="small" row-key="rank">
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'rank'">
                <a-tag :color="record.rank <= 3 ? 'gold' : 'default'">{{ record.rank }}</a-tag>
              </template>
              <template v-if="column.key === 'change'">
                <span :style="{ color: record.change > 0 ? '#52c41a' : record.change < 0 ? '#ff4d4f' : '#8c8c8c' }">
                  <CaretUpOutlined v-if="record.change > 0" />
                  <CaretDownOutlined v-if="record.change < 0" />
                  {{ record.change === 0 ? '-' : Math.abs(record.change) }}
                </span>
              </template>
              <template v-if="column.key === 'negativeSum'">
                <span style="color: #ff4d4f">{{ record.negativeSum }}</span>
              </template>
            </template>
          </a-table>
        </a-tab-pane>

        <a-tab-pane key="bottom10" tab="黑榜 Top10">
          <a-table :columns="bottomColumns" :data-source="bottomRankData" :pagination="false" size="small" row-key="rank">
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'rank'">
                <a-tag color="red">{{ record.rank }}</a-tag>
              </template>
              <template v-if="column.key === 'totalScore'">
                <span style="color: #ff4d4f; font-weight: 600">{{ record.totalScore }}</span>
              </template>
              <template v-if="column.key === 'change'">
                <span :style="{ color: record.change > 0 ? '#52c41a' : record.change < 0 ? '#ff4d4f' : '#8c8c8c' }">
                  <CaretUpOutlined v-if="record.change > 0" />
                  <CaretDownOutlined v-if="record.change < 0" />
                  {{ record.change === 0 ? '-' : Math.abs(record.change) }}
                </span>
              </template>
            </template>
          </a-table>
        </a-tab-pane>

        <a-tab-pane key="deptOverview" tab="部门积分概览">
          <a-table :columns="deptOverviewColumns" :data-source="deptOverviewData" :pagination="false" size="small" row-key="department">
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'totalNegative'">
                <span style="color: #ff4d4f">{{ record.totalNegative }}</span>
              </template>
            </template>
          </a-table>
        </a-tab-pane>

        <a-tab-pane key="categoryDetail" tab="管控项明细">
          <a-table :columns="categoryColumns" :data-source="categoryDetailData" :pagination="false" size="small" row-key="categoryName">
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'totalNegative'">
                <span style="color: #ff4d4f">{{ record.totalNegative }}</span>
              </template>
              <template v-if="column.key === 'netScore'">
                <span :style="{ color: record.netScore >= 0 ? '#52c41a' : '#ff4d4f', fontWeight: 600 }">
                  {{ record.netScore > 0 ? '+' : '' }}{{ record.netScore }}
                </span>
              </template>
            </template>
          </a-table>
        </a-tab-pane>
      </a-tabs>
    </div>

    <!-- ====== AI 分析抽屉（Phase 4 占位） ====== -->
    <a-drawer
      v-model:open="aiDrawerVisible"
      title="AI 智能分析"
      :width="480"
      placement="right"
    >
      <a-result status="info" title="AI 分析功能即将上线">
        <template #subTitle>
          <p>当前图表: <a-tag color="blue">{{ aiDrawerChart }}</a-tag></p>
          <p style="margin-top: 12px">此功能将在 Phase 5 中集成 LLM 能力，届时可自动生成：</p>
          <ul style="text-align: left; margin-top: 8px">
            <li>数据趋势总结</li>
            <li>异常点发现</li>
            <li>改善建议</li>
            <li>与上期对比结论</li>
          </ul>
        </template>
      </a-result>
      <a-divider>数据摘要</a-divider>
      <div class="ai-summary">
        <p>{{ aiSummaryText }}</p>
      </div>
    </a-drawer>

    <!-- ====== 组件配置抽屉 ====== -->
    <a-drawer v-model:open="panelDrawerVisible" title="组件配置" :width="360" placement="right">
      <p style="color: #8c8c8c; margin-bottom: 12px">开关控制各模块的显示/隐藏</p>
      <div class="panel-config-list">
        <div v-for="item in panelList" :key="item.key" class="panel-config-item">
          <span>{{ item.label }}</span>
          <a-switch size="small" :checked="panelVisible[item.key]" @change="(v: any) => panelVisible[item.key] = !!v" />
        </div>
      </div>
    </a-drawer>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onBeforeUnmount } from 'vue';
import {
  ReloadOutlined,
  DownloadOutlined,
  ThunderboltOutlined,
  CaretUpOutlined,
  CaretDownOutlined,
  SettingOutlined,
  FullscreenOutlined,
  FullscreenExitOutlined,
} from '@ant-design/icons-vue';
import { message } from 'ant-design-vue';
import * as htmlToImage from 'html-to-image';
import {
  kpiData,
  trendData,
  deptCompareData,
  scoreDistributionData,
  categoryBreakdownData,
  categoryRankingData,
  dimensionRankingData,
  orgCompareData,
  teamHealthData,
  anomalyData,
  bottomWarningData,
  topRankData,
  bottomRankData,
  deptOverviewData,
  categoryDetailData,
  departmentOptions,
  orgOptions,
} from './cockpit-data';
import type { AnomalyItem, BottomWarningItem, OrgCompareItem } from './cockpit-data';

// ===== 筛选栏状态 =====
const cockpitRef = ref<HTMLElement | null>(null);
const timeDimension = ref<'month' | 'quarter' | 'year'>('month');
const selectedMonth = ref<any>(undefined);
const selectedQuarter = ref<any>(undefined);
const selectedYear = ref<any>(undefined);
const filterDept = ref<string>('');
const filterOrg = ref<string>('');
const detailTab = ref('top10');

// ===== 大屏模式 =====
const isFullscreen = ref(false);

function toggleFullscreen() {
  if (!isFullscreen.value) {
    const el = cockpitRef.value;
    if (el?.requestFullscreen) {
      el.requestFullscreen();
    }
    isFullscreen.value = true;
  } else {
    if (document.exitFullscreen) {
      document.exitFullscreen();
    }
    isFullscreen.value = false;
  }
}

function onFullscreenChange() {
  if (!document.fullscreenElement) {
    isFullscreen.value = false;
  }
}

if (typeof document !== 'undefined') {
  document.addEventListener('fullscreenchange', onFullscreenChange);
}

onBeforeUnmount(() => {
  document.removeEventListener('fullscreenchange', onFullscreenChange);
});

// ===== 组件配置 =====
const panelDrawerVisible = ref(false);

interface PanelKey { key: string; label: string }
const panelList: PanelKey[] = [
  { key: 'kpi', label: 'KPI 统计卡片' },
  { key: 'trend', label: '积分趋势图' },
  { key: 'deptCompare', label: '部门积分对比' },
  { key: 'distribution', label: '加分/扣分占比' },
  { key: 'categoryRanking', label: '管控项总分排行' },
  { key: 'dimensionRanking', label: '评价维度排行' },
  { key: 'orgCompare', label: '归属组织雷达图' },
  { key: 'insights', label: '智能洞察区' },
  { key: 'detailTabs', label: '明细排行表格' },
];

const panelVisible = reactive<Record<string, boolean>>(
  Object.fromEntries(panelList.map(p => [p.key, true]))
);

// ===== AI 抽屉 =====
const aiDrawerVisible = ref(false);
const aiDrawerChart = ref('');

const chartNameMap: Record<string, string> = {
  trend: '积分趋势',
  deptCompare: '各部门积分对比',
  distribution: '加分/扣分占比',
  categoryRanking: '管控项总分排行',
  dimensionRanking: '评价维度总分排行',
  orgCompare: '归属组织积分对比',
  teamHealth: '团队健康度评分',
  bottomWarning: '末位预警',
};

function openAiDrawer(chartType: string) {
  aiDrawerChart.value = chartNameMap[chartType] || chartType;
  aiDrawerVisible.value = true;
}

const aiSummaryText = computed(() => {
  const c = aiDrawerChart.value;
  if (c === '积分趋势') return `近 ${trendData.length} 期数据显示净积分整体呈上升趋势，最新一期净值 ${trendData[trendData.length - 1]?.totalNet}，较首期增长 ${(((trendData[trendData.length - 1]?.totalNet - trendData[0]?.totalNet) / trendData[0]?.totalNet) * 100).toFixed(1)}%。`;
  if (c === '各部门积分对比') return `${deptCompareData[0]?.department} 以净值 ${deptCompareData[0]?.netScore} 位居第一，${deptCompareData[deptCompareData.length - 1]?.department} 净值最低为 ${deptCompareData[deptCompareData.length - 1]?.netScore}。部门间差距较大，建议关注末位部门。`;
  if (c === '团队健康度评分') return `团队综合健康评分 ${teamHealthData.overallScore} 分（${teamHealthData.overallScore >= 70 ? '良好' : '一般'}），参与覆盖率（${teamHealthData.dimensions.find(d => d.label === '参与覆盖率')?.score}）为最薄弱环节。`;
  if (c === '末位预警') return `当前有 ${bottomWarningData.length} 人进入末位预警名单，其中高危 ${bottomWarningData.filter(w => w.riskLevel === 'danger').length} 人，预警 ${bottomWarningData.filter(w => w.riskLevel === 'warning').length} 人。`;
  return '暂无数据摘要。AI 分析功能将在 Phase 5 上线后提供深度分析。';
});

// ===== 工具栏操作 =====
function handleRefresh() {
  message.success('数据已刷新');
}

function handleExport(info: any) {
  const key = String(info.key);
  if (key === 'image') {
    handleExportImage();
    return;
  }
  message.info(`正在生成 ${key === 'pdf' ? 'PDF' : 'Excel'} 报表...`);
}

async function handleExportImage() {
  if (!cockpitRef.value) return;
  message.loading({ content: '正在生成图片...', key: 'export-img' });
  try {
    const dataUrl = await htmlToImage.toPng(cockpitRef.value, {
      backgroundColor: '#f0f2f5',
      pixelRatio: 2,
    });
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `cockpit_${new Date().toISOString().slice(0, 10)}.png`;
    a.click();
    message.success({ content: '图片已导出', key: 'export-img' });
  } catch {
    message.error({ content: '导出图片失败', key: 'export-img' });
  }
}

// ===== SVG 图表公共参数 =====
const svgW = 520;
const svgH = 340;
const pad = { t: 20, r: 20, b: 30, l: 60 };

// ===== 图表 1: 趋势折线 =====
const trendMax = computed(() => {
  let max = 0;
  trendData.forEach(d => {
    max = Math.max(max, d.totalPositive, d.totalNet, Math.abs(d.totalNegative));
  });
  return Math.ceil(max / 500) * 500;
});

const trendYTicks = computed(() => {
  const step = trendMax.value / 4;
  return [0, step, step * 2, step * 3, trendMax.value];
});

function trendX(i: number) {
  const plotW = svgW - pad.l - pad.r;
  return pad.l + (plotW / (trendData.length - 1)) * i;
}

function trendY(val: number) {
  const plotH = svgH - pad.t - pad.b;
  return svgH - pad.b - (val / trendMax.value) * plotH;
}

function trendLine(field: 'totalNet' | 'totalPositive') {
  return trendData.map((d, i) => `${trendX(i)},${trendY(d[field])}`).join(' ');
}

function trendLineAbs(field: 'totalNegative') {
  return trendData.map((d, i) => `${trendX(i)},${trendY(Math.abs(d[field]))}`).join(' ');
}

const trendLineAvg = computed(() => {
  const avgMax = Math.max(...trendData.map(d => d.avgPoints));
  const scale = trendMax.value / (avgMax * 1.2);
  return trendData.map((d, i) => `${trendX(i)},${trendY(d.avgPoints * scale)}`).join(' ');
});

function trendArea(field: 'totalNet') {
  const line = trendData.map((d, i) => `${trendX(i)},${trendY(d[field])}`);
  const baseline = `${trendX(trendData.length - 1)},${trendY(0)} ${trendX(0)},${trendY(0)}`;
  return line.join(' ') + ' ' + baseline;
}

// ===== 图表 2: 部门对比柱状图 =====
const deptMax = computed(() => {
  let max = 0;
  deptCompareData.forEach(d => { max = Math.max(max, d.totalPositive, d.netScore); });
  return Math.ceil(max / 1000) * 1000;
});

const deptYTicks = computed(() => {
  const step = deptMax.value / 4;
  return [0, step, step * 2, step * 3, deptMax.value];
});

function deptY(val: number) {
  const plotH = svgH - pad.t - pad.b;
  return svgH - pad.b - (val / deptMax.value) * plotH;
}

function deptBarH(val: number) {
  return svgH - pad.b - deptY(val);
}

const deptBarW = computed(() => {
  const plotW = svgW - pad.l - pad.r;
  const groupW = plotW / deptCompareData.length;
  return Math.min(groupW * 0.2, 16);
});

function deptBarX(groupIdx: number, barIdx: number) {
  const plotW = svgW - pad.l - pad.r;
  const groupW = plotW / deptCompareData.length;
  const groupStart = pad.l + groupW * groupIdx;
  const barGap = 2;
  const totalBarsW = deptBarW.value * 3 + barGap * 2;
  const offset = (groupW - totalBarsW) / 2;
  return groupStart + offset + barIdx * (deptBarW.value + barGap);
}

function deptGroupCenter(i: number) {
  const plotW = svgW - pad.l - pad.r;
  const groupW = plotW / deptCompareData.length;
  return pad.l + groupW * i + groupW / 2;
}

// ===== 图表 3: 双环形图 =====
const positivePercent = computed(() => {
  const total = scoreDistributionData[0].value + scoreDistributionData[1].value;
  return Math.round((scoreDistributionData[0].value / total) * 100);
});
const negativePercent = computed(() => 100 - positivePercent.value);

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function describeArcSector(cx: number, cy: number, outerR: number, innerR: number, startAngle: number, endAngle: number) {
  const outerStart = polarToCartesian(cx, cy, outerR, endAngle);
  const outerEnd = polarToCartesian(cx, cy, outerR, startAngle);
  const innerStart = polarToCartesian(cx, cy, innerR, startAngle);
  const innerEnd = polarToCartesian(cx, cy, innerR, endAngle);
  const largeArc = endAngle - startAngle > 180 ? 1 : 0;
  return `M ${outerStart.x} ${outerStart.y} A ${outerR} ${outerR} 0 ${largeArc} 0 ${outerEnd.x} ${outerEnd.y} L ${innerStart.x} ${innerStart.y} A ${innerR} ${innerR} 0 ${largeArc} 1 ${innerEnd.x} ${innerEnd.y} Z`;
}

const outerR = 110;
const innerR = 70;
const coreR = 50;

const outerArcPositive = computed(() => {
  return describeArcSector(0, 0, outerR, innerR, 0, positivePercent.value * 3.6 - 1);
});

const outerArcNegative = computed(() => {
  return describeArcSector(0, 0, outerR, innerR, positivePercent.value * 3.6 + 1, 360);
});

const innerArcs = computed(() => {
  const positiveItems = categoryBreakdownData.filter(c => c.parentType === 'positive');
  const pTotal = positiveItems.reduce((s, c) => s + c.value, 0);
  const colors = ['#389e0d', '#52c41a', '#73d13d', '#95de64', '#b7eb8f'];
  let angle = 0;
  return positiveItems.map((item, i) => {
    const sweep = (item.value / pTotal) * 360 - 1;
    const start = angle;
    angle += (item.value / pTotal) * 360;
    return {
      d: describeArcSector(0, 0, innerR - 4, coreR, start, start + sweep),
      color: colors[i % colors.length],
      label: item.label,
      value: item.value,
    };
  });
});

// ===== 图表 4/5: 水平条形图公共 =====
function hbarY(i: number, total: number) {
  const plotH = svgH - pad.t - pad.b;
  const step = plotH / total;
  return pad.t + step * i + step / 2;
}

const hbarMaxVal = computed(() => {
  const allPositives = [...categoryRankingData, ...dimensionRankingData].map(d => d.positive);
  return Math.max(...allPositives);
});

const hbarZero = computed(() => pad.l + 30);

function hbarScale(val: number) {
  const available = svgW - hbarZero.value - pad.r - 40;
  return (val / hbarMaxVal.value) * available;
}

// ===== 图表 6: 雷达图 =====
const radarAxes = ['总净值', '人均分', '加分率', '扣分率', '人数'];
const radarRadius = 100;
const radarColors = ['#1890ff', '#52c41a', '#faad14', '#ff4d4f'];

const radarMaxValues = computed(() => {
  const maxNet = Math.max(...orgCompareData.map(o => o.netScore));
  const maxAvg = Math.max(...orgCompareData.map(o => o.avgScore));
  const maxHc = Math.max(...orgCompareData.map(o => o.headcount));
  return [maxNet, maxAvg, 100, 100, maxHc];
});

function radarAngle(i: number) {
  return (360 / radarAxes.length) * i - 90;
}

function radarAxisEnd(i: number) {
  const a = (radarAngle(i) * Math.PI) / 180;
  return { x: radarRadius * Math.cos(a), y: radarRadius * Math.sin(a) };
}

function radarLabelPos(i: number) {
  const a = (radarAngle(i) * Math.PI) / 180;
  const r = radarRadius + 16;
  return { x: r * Math.cos(a), y: r * Math.sin(a) + 4 };
}

function radarPolygon(level: number) {
  return radarAxes.map((_, i) => {
    const a = (radarAngle(i) * Math.PI) / 180;
    const r = radarRadius * level;
    return `${r * Math.cos(a)},${r * Math.sin(a)}`;
  }).join(' ');
}

function radarOrgPolygon(org: OrgCompareItem) {
  const vals = [org.netScore, org.avgScore, org.positiveRate, org.negativeRate, org.headcount];
  return vals.map((v, i) => {
    const norm = v / radarMaxValues.value[i];
    const a = (radarAngle(i) * Math.PI) / 180;
    const r = radarRadius * Math.min(norm, 1);
    return `${r * Math.cos(a)},${r * Math.sin(a)}`;
  }).join(' ');
}

// ===== 洞察卡片 A: 健康度仪表盘 =====
const healthColor = computed(() => {
  const s = teamHealthData.overallScore;
  if (s >= 70) return '#52c41a';
  if (s >= 40) return '#faad14';
  return '#ff4d4f';
});

const healthArc = computed(() => {
  const ratio = teamHealthData.overallScore / 100;
  const endAngle = -180 + ratio * 180;
  const cx = 60, cy = 60, r = 50;
  const start = polarToCartesian(cx, cy, r, -180);
  const end = polarToCartesian(cx, cy, r, endAngle);
  const large = ratio > 0.5 ? 1 : 0;
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${large} 1 ${end.x} ${end.y}`;
});

// ===== 洞察卡片 B: 异常数据 =====
function anomalyColor(level: AnomalyItem['level']) {
  return level === 'red' ? 'red' : level === 'orange' ? 'orange' : 'gold';
}

function anomalyLevelText(level: AnomalyItem['level']) {
  return level === 'red' ? '严重' : level === 'orange' ? '警告' : '提醒';
}

// ===== 洞察卡片 C: 末位预警 =====
const warningColumns = [
  { title: '姓名', dataIndex: 'name', key: 'name', width: 60 },
  { title: '部门', dataIndex: 'department', key: 'department', width: 80, ellipsis: true },
  { title: '积分', dataIndex: 'currentPoints', key: 'currentPoints', width: 50 },
  { title: '连续月数', dataIndex: 'consecutiveMonths', key: 'consecutiveMonths', width: 70 },
  { title: '风险', key: 'riskLevel', width: 60 },
];

function riskColor(level: BottomWarningItem['riskLevel']) {
  return level === 'danger' ? 'red' : level === 'warning' ? 'orange' : 'blue';
}

function riskText(level: BottomWarningItem['riskLevel']) {
  return level === 'danger' ? '高危' : level === 'warning' ? '预警' : '关注';
}

// ===== Tab 表格列定义 =====
const topColumns = [
  { title: '排名', key: 'rank', dataIndex: 'rank', width: 60 },
  { title: '姓名', dataIndex: 'name', key: 'name', width: 70 },
  { title: '部门', dataIndex: 'department', key: 'department', width: 100 },
  { title: '归属', dataIndex: 'org', key: 'org', width: 60 },
  { title: '总分', dataIndex: 'totalScore', key: 'totalScore', width: 70 },
  { title: '加分', dataIndex: 'positiveSum', key: 'positiveSum', width: 70 },
  { title: '扣分', dataIndex: 'negativeSum', key: 'negativeSum', width: 70 },
  { title: '较上期', key: 'change', width: 70 },
];

const bottomColumns = [
  { title: '倒数', key: 'rank', dataIndex: 'rank', width: 60 },
  { title: '姓名', dataIndex: 'name', key: 'name', width: 70 },
  { title: '部门', dataIndex: 'department', key: 'department', width: 100 },
  { title: '归属', dataIndex: 'org', key: 'org', width: 60 },
  { title: '总分', dataIndex: 'totalScore', key: 'totalScore', width: 70 },
  { title: '主要扣分维度', dataIndex: 'mainDeductDimension', key: 'mainDeductDimension' },
  { title: '较上期', key: 'change', width: 70 },
];

const deptOverviewColumns = [
  { title: '部门', dataIndex: 'department', key: 'department', width: 100 },
  { title: '人数', dataIndex: 'headcount', key: 'headcount', width: 60 },
  { title: '总净值', dataIndex: 'netScore', key: 'netScore', width: 80 },
  { title: '平均分', dataIndex: 'avgScore', key: 'avgScore', width: 70 },
  { title: '总加分', dataIndex: 'totalPositive', key: 'totalPositive', width: 80 },
  { title: '总扣分', dataIndex: 'totalNegative', key: 'totalNegative', width: 80 },
  { title: '最高', dataIndex: 'maxScore', key: 'maxScore', width: 60 },
  { title: '最低', dataIndex: 'minScore', key: 'minScore', width: 60 },
];

const categoryColumns = [
  { title: '管控项', dataIndex: 'categoryName', key: 'categoryName', width: 100 },
  { title: '维度数', dataIndex: 'dimensionCount', key: 'dimensionCount', width: 60 },
  { title: '录入次数', dataIndex: 'totalEntries', key: 'totalEntries', width: 80 },
  { title: '总加分', dataIndex: 'totalPositive', key: 'totalPositive', width: 80 },
  { title: '总扣分', dataIndex: 'totalNegative', key: 'totalNegative', width: 80 },
  { title: '净值', dataIndex: 'netScore', key: 'netScore', width: 80 },
];
</script>

<style scoped lang="less">
.cockpit-page {
  padding: 16px 24px;
  min-height: 100vh;

  &.cockpit-fullscreen {
    background: #f0f2f5;
    overflow-y: auto;
    padding: 20px 32px;

    .cockpit-title {
      font-size: 24px;
    }

    .kpi-grid {
      grid-template-columns: repeat(4, 1fr);
    }

    .chart-area {
      height: 400px !important;
    }
  }
}

// ===== 工具栏 =====
.cockpit-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 20px;
}

.cockpit-title {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  white-space: nowrap;
}

.toolbar-filters {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

// ===== KPI 卡片 =====
.kpi-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  margin-bottom: 16px;
}

.kpi-card {
  border-radius: 10px;
  padding: 18px 20px;
  transition: transform 0.2s, box-shadow 0.2s;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  }
}

.kpi-value {
  font-size: 26px;
  font-weight: 700;
  line-height: 1.2;
}

.kpi-suffix {
  font-size: 14px;
  font-weight: 400;
}

.kpi-label {
  font-size: 13px;
  color: #595959;
  margin-top: 4px;
}

.kpi-sub {
  font-size: 12px;
  color: #8c8c8c;
  margin-top: 4px;
  display: flex;
  align-items: center;
  gap: 4px;
}

.kpi-change {
  &.up { color: #52c41a; }
  &.down { color: #ff4d4f; }
}

// ===== 通用卡片 =====
.card-box {
  background: #fff;
  border-radius: 10px;
  padding: 16px 20px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.card-title {
  font-size: 15px;
  font-weight: 600;
  color: #1e293b;
}

.chart-row {
  margin-bottom: 16px;
}

// ===== SVG 图表公共 =====
.chart-area {
  width: 100%;
  overflow: hidden;
}

.svg-chart {
  width: 100%;
  height: 100%;
}

.grid-line {
  stroke: #f0f0f0;
  stroke-width: 0.5;
}

.axis-text {
  font-size: 11px;
  fill: #8c8c8c;
}

.legend-text {
  font-size: 10px;
  fill: #595959;
}

.data-dot {
  cursor: pointer;

  &:hover {
    r: 5;
  }
}

.bar-value {
  fill: #595959;
}

.pie-arc {
  cursor: pointer;
  transition: opacity 0.2s;

  &:hover {
    opacity: 1 !important;
  }
}

.donut-center-value {
  font-size: 18px;
  font-weight: 700;
  fill: #1e293b;
}

.donut-center-label {
  font-size: 11px;
  fill: #8c8c8c;
}

// ===== 洞察卡片 =====
.insight-card {
  min-height: 380px;
}

.health-gauge {
  text-align: center;
  margin-bottom: 8px;
}

.gauge-svg {
  width: 140px;
  height: 80px;
}

.gauge-value {
  font-size: 22px;
  font-weight: 700;
  fill: #1e293b;
}

.gauge-label {
  font-size: 10px;
  fill: #8c8c8c;
}

.health-dims {
  margin-bottom: 12px;
}

.dim-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
}

.dim-label {
  width: 80px;
  font-size: 12px;
  color: #595959;
  flex-shrink: 0;
}

.dim-score {
  width: 28px;
  font-size: 12px;
  font-weight: 600;
  color: #1e293b;
  text-align: right;
  flex-shrink: 0;
}

.health-tags {
  font-size: 12px;
}

.tag-label {
  color: #8c8c8c;
  margin-right: 4px;
}

// ===== 异常提醒 =====
.anomaly-list {
  max-height: 320px;
  overflow-y: auto;
}

.anomaly-item {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 8px 0;
  border-bottom: 1px solid #f5f5f5;

  &:last-child {
    border-bottom: none;
  }
}

.anomaly-content {
  flex: 1;
  min-width: 0;
}

.anomaly-type {
  font-size: 13px;
  font-weight: 500;
  color: #1e293b;
}

.anomaly-detail {
  font-size: 12px;
  color: #8c8c8c;
  margin-top: 2px;
}

// ===== 末位预警 =====
.warning-tip {
  margin-top: 8px;
  font-size: 12px;
  color: #faad14;
  text-align: center;
}

// ===== AI 摘要 =====
.ai-summary {
  font-size: 14px;
  color: #595959;
  line-height: 1.8;
}

// ===== 组件配置抽屉 =====
.panel-config-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.panel-config-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px;
  border-radius: 6px;
  border: 1px solid #f0f0f0;
  background: #fafafa;

  &:hover {
    border-color: #d9d9d9;
    background: #fff;
  }
}
</style>
