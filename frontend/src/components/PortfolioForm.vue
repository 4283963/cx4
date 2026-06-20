<template>
  <div class="card-section">
    <div class="section-title">构建投资组合</div>
    
    <el-form :model="form" label-width="120px">
      <el-form-item label="组合名称">
        <el-input
          v-model="form.name"
          placeholder="请输入投资组合名称"
          style="max-width: 400px"
        />
      </el-form-item>
    </el-form>

    <div style="margin-bottom: 16px">
      <el-button type="primary" @click="addItem" :icon="Plus">
        添加持仓
      </el-button>
      <span style="margin-left: 16px; color: #909399; font-size: 14px">
        仓位合计：<strong :style="{ color: totalWeightValid ? '#67c23a' : '#f56c6c' }">
          {{ (totalWeight * 100).toFixed(2) }}%
        </strong>
      </span>
    </div>

    <el-table :data="form.items" border style="width: 100%">
      <el-table-column label="序号" type="index" width="60" align="center" />
      
      <el-table-column label="基金选择" min-width="280">
        <template #default="{ row, $index }">
          <el-select
            v-model="row.fundCode"
            placeholder="请选择基金"
            filterable
            style="width: 100%"
            @change="onFundChange($index)"
          >
            <el-option
              v-for="fund in availableFunds($index)"
              :key="fund.code"
              :label="`${fund.code} - ${fund.name}`"
              :value="fund.code"
            >
              <span style="float: left">{{ fund.code }} - {{ fund.name }}</span>
              <span style="float: right; color: #8492a6; font-size: 12px">
                {{ fund.type }}
              </span>
            </el-option>
          </el-select>
        </template>
      </el-table-column>

      <el-table-column label="仓位比例" width="180">
        <template #default="{ row }">
          <el-input-number
            v-model="row.weight"
            :min="0.01"
            :max="1"
            :step="0.05"
            :precision="4"
            style="width: 100%"
            controls-position="right"
          />
        </template>
      </el-table-column>

      <el-table-column label="百分比" width="120" align="center">
        <template #default="{ row }">
          <el-tag :type="row.weight > 0.3 ? 'danger' : row.weight > 0.15 ? 'warning' : 'success'">
            {{ (row.weight * 100).toFixed(2) }}%
          </el-tag>
        </template>
      </el-table-column>

      <el-table-column label="操作" width="100" align="center">
        <template #default="{ $index }">
          <el-button
            type="danger"
            :icon="Delete"
            circle
            size="small"
            @click="removeItem($index)"
            :disabled="form.items.length <= 1"
          />
        </template>
      </el-table-column>
    </el-table>

    <div style="margin-top: 24px; text-align: center">
      <el-button
        type="primary"
        size="large"
        :icon="TrendCharts"
        :loading="loading"
        :disabled="!canSubmit"
        @click="handleSubmit"
      >
        执行回测分析
      </el-button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { Plus, Delete, TrendCharts } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'

const props = defineProps({
  funds: {
    type: Array,
    default: () => []
  },
  loading: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['submit'])

const form = ref({
  name: '我的投资组合',
  items: [
    { fundCode: '', weight: 0.5 },
    { fundCode: '', weight: 0.3 },
    { fundCode: '', weight: 0.2 }
  ]
})

const totalWeight = computed(() => {
  return form.value.items.reduce((sum, item) => sum + (parseFloat(item.weight) || 0), 0)
})

const totalWeightValid = computed(() => {
  return Math.abs(totalWeight.value - 1) < 0.001
})

const canSubmit = computed(() => {
  if (!totalWeightValid.value) return false
  return form.value.items.every(item => item.fundCode && item.weight > 0)
})

function availableFunds(index) {
  const usedCodes = form.value.items
    .filter((_, i) => i !== index)
    .map(item => item.fundCode)
  return props.funds.filter(fund => !usedCodes.includes(fund.code))
}

function addItem() {
  const remainingWeight = Math.max(0, 1 - totalWeight.value)
  form.value.items.push({
    fundCode: '',
    weight: remainingWeight > 0 ? parseFloat(remainingWeight.toFixed(4)) : 0.1
  })
}

function removeItem(index) {
  if (form.value.items.length <= 1) {
    ElMessage.warning('至少需要保留一个持仓')
    return
  }
  form.value.items.splice(index, 1)
}

function onFundChange() {}

function handleSubmit() {
  if (!totalWeightValid.value) {
    ElMessage.error(`仓位比例之和必须等于100%，当前为 ${(totalWeight.value * 100).toFixed(2)}%`)
    return
  }

  for (const item of form.value.items) {
    if (!item.fundCode) {
      ElMessage.error('请为每个持仓选择基金')
      return
    }
  }

  emit('submit', {
    name: form.value.name,
    items: form.value.items
  })
}

watch(
  () => form.value.items,
  () => {
    const sum = totalWeight.value
    if (sum > 1) {
      ElMessage.warning('仓位比例已超过100%，请调整')
    }
  },
  { deep: true }
)
</script>
