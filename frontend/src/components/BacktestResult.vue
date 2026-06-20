<template>
  <div v-if="data" class="card-section">
    <div class="section-title">回测结果分析</div>

    <div v-if="portfolio" style="margin-bottom: 24px">
      <el-tag type="info" size="large">
        投资组合：{{ portfolio.name || '未命名' }}
      </el-tag>
      <span style="margin-left: 12px; color: #909399; font-size: 14px">
        回测区间：{{ data.period.startDate }} ~ {{ data.period.endDate }}（共 {{ data.period.days }} 天）
      </span>
    </div>

    <el-alert
      v-if="data.crisis && data.crisis.applied"
      :title="`压力回测：${data.crisis.scenarioLabel}（受灾区间波动率已施加安全惩罚因子 α=${data.crisis.alpha}）`"
      type="error"
      show-icon
      :closable="false"
      style="margin-bottom: 20px"
    >
      <template #default>
        <div style="line-height: 1.8">
          <span v-for="(z, i) in data.crisis.zones" :key="i" style="margin-right: 16px">
            <el-tag type="warning" size="small" effect="dark">{{ z.label }}</el-tag>
            {{ z.startDate }} ~ {{ z.endDate }}
          </span>
        </div>
      </template>
    </el-alert>

    <el-row :gutter="20" style="margin-bottom: 24px">
      <el-col :span="6">
        <div class="metric-card" :class="data.cumulativeReturn >= 0 ? 'positive' : 'negative'">
          <div class="metric-value">
            {{ formatPercent(data.cumulativeReturn) }}
          </div>
          <div class="metric-label">累计收益率</div>
        </div>
      </el-col>
      <el-col :span="6">
        <div class="metric-card" :class="data.annualizedReturn >= 0 ? 'positive' : 'negative'">
          <div class="metric-value">
            {{ formatPercent(data.annualizedReturn) }}
          </div>
          <div class="metric-label">年化收益率</div>
        </div>
      </el-col>
      <el-col :span="6">
        <div class="metric-card" :class="data.sharpeRatio >= 1 ? 'positive' : ''">
          <div class="metric-value">
            {{ data.sharpeRatio.toFixed(3) }}
          </div>
          <div class="metric-label">夏普比率</div>
        </div>
      </el-col>
      <el-col :span="6">
        <div class="metric-card negative">
          <div class="metric-value">
            {{ formatPercent(-data.maxDrawdown) }}
          </div>
          <div class="metric-label">最大回撤</div>
        </div>
      </el-col>
    </el-row>

    <el-row :gutter="20" style="margin-bottom: 24px">
      <el-col :span="12">
        <el-descriptions title="详细指标" border :column="1" size="default">
          <el-descriptions-item label="夏普比率">
            <el-tag :type="data.sharpeRatio >= 1.5 ? 'success' : data.sharpeRatio >= 1 ? 'warning' : 'danger'">
              {{ data.sharpeRatio.toFixed(4) }}
            </el-tag>
            <span style="margin-left: 8px; color: #909399; font-size: 12px">
              {{ getSharpeInterpretation(data.sharpeRatio) }}
            </span>
          </el-descriptions-item>
          <el-descriptions-item label="最大回撤区间">
            {{ data.maxDrawdownInfo.peakDate }} ~ {{ data.maxDrawdownInfo.troughDate }}
          </el-descriptions-item>
          <el-descriptions-item label="最大回撤幅度">
            <span style="color: #f56c6c; font-weight: 600">
              {{ formatPercent(-data.maxDrawdown) }}
            </span>
          </el-descriptions-item>
        </el-descriptions>
      </el-col>
      <el-col :span="12">
        <el-descriptions title="指标说明" border :column="1" size="default">
          <el-descriptions-item label="累计收益率">
            投资组合在回测期间的总收益率
          </el-descriptions-item>
          <el-descriptions-item label="年化收益率">
            将期间收益率折算为年度收益率
          </el-descriptions-item>
          <el-descriptions-item label="夏普比率">
            衡量每承担一单位风险所获得的超额收益，越大越好
          </el-descriptions-item>
          <el-descriptions-item label="最大回撤">
            投资组合从峰值到谷值的最大跌幅，反映最坏情况下的损失
          </el-descriptions-item>
        </el-descriptions>
      </el-col>
    </el-row>

    <div class="card-section" style="padding: 0; margin-bottom: 0">
      <div class="section-title" style="padding: 20px 24px 0; border: none; margin-bottom: 0">
        收益曲线（{{ data.period.startDate }} ~ {{ data.period.endDate }}
        <template v-if="data.crisis && data.crisis.applied">· 受灾区间已高亮</template>）
      </div>
      <div class="chart-container">
        <v-chart :option="chartOption" autoresize />
      </div>
    </div>

    <div v-if="portfolio && portfolio.items" style="margin-top: 24px">
      <div class="section-title">持仓明细</div>
      <el-table :data="portfolio.items" border>
        <el-table-column label="基金代码" prop="fundCode" width="120" align="center" />
        <el-table-column label="基金名称" prop="fundName" min-width="200" />
        <el-table-column label="类型" prop="fundType" width="100" align="center">
          <template #default="{ row }">
            <el-tag size="small">{{ row.fundType || '-' }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="仓位比例" width="150" align="center">
          <template #default="{ row }">
            <el-tag :type="row.weight >= 0.3 ? 'danger' : row.weight >= 0.15 ? 'warning' : 'success'">
              {{ (row.weight * 100).toFixed(2) }}%
            </el-tag>
          </template>
        </el-table-column>
      </el-table>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  data: {
    type: Object,
    default: null
  },
  portfolio: {
    type: Object,
    default: null
  }
})

function formatPercent(value) {
  const sign = value >= 0 ? '+' : ''
  return `${sign}${(value * 100).toFixed(2)}%`
}

function getSharpeInterpretation(sharpe) {
  if (sharpe >= 2) return '表现优秀'
  if (sharpe >= 1.5) return '表现良好'
  if (sharpe >= 1) return '表现一般'
  if (sharpe >= 0) return '风险收益比较差'
  return '收益为负'
}

const chartOption = computed(() => {
  if (!props.data || !props.data.performanceCurve) {
    return {}
  }

  const curve = props.data.performanceCurve
  const dates = curve.map(item => item.date)
  const values = curve.map(item => item.value.toFixed(2))

  const crisis = props.data.crisis
  const hasCrisis = crisis && crisis.applied && crisis.zones && crisis.zones.length > 0

  function isDateInZones(date, zones) {
    for (const z of zones) {
      if (date >= z.startDate && date <= z.endDate) return true
    }
    return false
  }

  function clampBoundary(zone, type) {
    if (type === 'start') {
      const found = dates.find(d => d >= zone.startDate)
      return found || zone.startDate
    }
    let result = zone.endDate
    for (const d of dates) {
      if (d <= zone.endDate) result = d
    }
    return result
  }

  const crisisValues = hasCrisis
    ? curve.map(item => (isDateInZones(item.date, crisis.zones) ? item.value.toFixed(2) : null))
    : []

  const markAreaData = hasCrisis
    ? crisis.zones.map(z => [
        { xAxis: clampBoundary(z, 'start'), itemStyle: { color: 'rgba(255, 235, 59, 0.28)' } },
        { xAxis: clampBoundary(z, 'end') }
      ])
    : []

  const series = [
    {
      name: '累计收益率',
      type: 'line',
      smooth: true,
      symbol: 'none',
      sampling: 'lttb',
      itemStyle: { color: '#409eff' },
      areaStyle: {
        color: {
          type: 'linear',
          x: 0, y: 0, x2: 0, y2: 1,
          colorStops: [
            { offset: 0, color: 'rgba(64, 158, 255, 0.4)' },
            { offset: 1, color: 'rgba(64, 158, 255, 0.05)' }
          ]
        }
      },
      data: values,
      markLine: {
        silent: true,
        data: [
          { yAxis: 0, lineStyle: { color: '#909399', type: 'dashed' } }
        ]
      },
      markArea: {
        silent: true,
        data: markAreaData
      }
    }
  ]

  if (hasCrisis) {
    series.push({
      name: '受灾区间',
      type: 'line',
      smooth: true,
      symbol: 'none',
      connectNulls: false,
      lineStyle: { color: '#FFD600', width: 3, shadowBlur: 10, shadowColor: 'rgba(255,214,0,0.7)' },
      itemStyle: { color: '#FFD600' },
      z: 10,
      data: crisisValues
    })
  }

  return {
    tooltip: {
      trigger: 'axis',
      formatter: function (params) {
        const lines = params
          .filter(p => p.value !== null && p.value !== undefined)
          .map(p => {
            const value = parseFloat(p.value)
            const sign = value >= 0 ? '+' : ''
            const color = p.seriesName === '受灾区间' ? '#FFD600' : '#409eff'
            return `<span style="display:inline-block;width:10px;height:10px;background:${color};border-radius:50%;margin-right:6px;"></span>${p.seriesName}: <strong>${sign}${value.toFixed(2)}%</strong>`
          })
        return `${params[0].name}<br/>${lines.join('<br/>')}`
      }
    },
    legend: hasCrisis ? { data: ['累计收益率', '受灾区间'], top: 0 } : { show: false },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      top: hasCrisis ? '12%' : '10%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: dates,
      axisLabel: {
        formatter: function (value) {
          return value.substring(5)
        }
      }
    },
    yAxis: {
      type: 'value',
      axisLabel: { formatter: '{value}%' }
    },
    series
  }
})
</script>
