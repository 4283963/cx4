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
        收益曲线（近12个月）
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

  return {
    tooltip: {
      trigger: 'axis',
      formatter: function (params) {
        const data = params[0]
        const value = parseFloat(data.value)
        const sign = value >= 0 ? '+' : ''
        return `${data.name}<br/>累计收益率: <strong>${sign}${value.toFixed(2)}%</strong>`
      }
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      top: '10%',
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
      axisLabel: {
        formatter: '{value}%'
      }
    },
    series: [
      {
        name: '累计收益率',
        type: 'line',
        smooth: true,
        symbol: 'none',
        sampling: 'lttb',
        itemStyle: {
          color: '#409eff'
        },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
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
            {
              yAxis: 0,
              lineStyle: {
                color: '#909399',
                type: 'dashed'
              }
            }
          ]
        }
      }
    ]
  }
})
</script>
