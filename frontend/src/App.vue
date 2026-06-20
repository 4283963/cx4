<template>
  <div class="container">
    <div class="page-header">
      <h1 class="page-title">个人财富管理平台</h1>
      <p class="page-subtitle">
        构建您的投资组合，通过历史数据回测分析收益表现与风险特征
      </p>
    </div>

    <el-alert
      v-if="loadError"
      :title="loadError"
      type="error"
      :closable="false"
      style="margin-bottom: 20px"
    />

    <el-skeleton v-if="loadingFunds" :rows="5" animated />

    <PortfolioForm
      v-if="!loadingFunds"
      :funds="funds"
      :scenarios="scenarios"
      :loading="backtestLoading"
      @submit="handleBacktest"
    />

    <BacktestResult
      v-if="backtestResult"
      :data="backtestResult.backtest"
      :portfolio="backtestResult.portfolio"
    />

    <div v-if="!backtestResult && !loadingFunds && funds.length > 0" class="card-section">
      <div class="section-title">平台使用说明</div>
      <el-steps :active="0" finish-status="success" align-center>
        <el-step title="构建组合" description="选择基金并配置仓位比例" />
        <el-step title="执行回测" description="系统基于近12个月历史净值计算" />
        <el-step title="查看结果" description="分析收益曲线与风险指标" />
      </el-steps>
      <div style="margin-top: 24px; padding: 0 40px">
        <el-alert
          title="可选基金列表"
          type="info"
          :closable="false"
          style="margin-bottom: 16px"
        />
        <el-table :data="funds" border size="small">
          <el-table-column label="基金代码" prop="code" width="120" align="center" />
          <el-table-column label="基金名称" prop="name" min-width="200" />
          <el-table-column label="类型" prop="type" width="100" align="center">
            <template #default="{ row }">
              <el-tag size="small">{{ row.type }}</el-tag>
            </template>
          </el-table-column>
        </el-table>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import PortfolioForm from './components/PortfolioForm.vue'
import BacktestResult from './components/BacktestResult.vue'
import { getFunds, getCrisisScenarios, createPortfolio } from './api/index.js'

const funds = ref([])
const scenarios = ref([])
const loadingFunds = ref(true)
const loadError = ref('')
const backtestLoading = ref(false)
const backtestResult = ref(null)

async function loadFunds() {
  loadingFunds.value = true
  loadError.value = ''
  try {
    funds.value = await getFunds()
    scenarios.value = await getCrisisScenarios()
  } catch (error) {
    console.error('加载数据失败:', error)
    loadError.value = `加载数据失败：${error.message}。请确保后端服务已启动并已初始化数据库。`
  } finally {
    loadingFunds.value = false
  }
}

async function handleBacktest(formData) {
  backtestLoading.value = true
  try {
    const result = await createPortfolio(formData)
    backtestResult.value = result
    const applied = result.backtest && result.backtest.crisis && result.backtest.crisis.applied
    ElMessage.success(applied ? '压力回测完成！受灾区间已用亮黄色高亮' : '回测完成！')
  } catch (error) {
    console.error('回测失败:', error)
    ElMessage.error(`回测失败：${error.message}`)
  } finally {
    backtestLoading.value = false
  }
}

onMounted(() => {
  loadFunds()
})
</script>
