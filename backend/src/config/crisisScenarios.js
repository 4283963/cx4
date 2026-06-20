const CRISIS_SCENARIOS = {
  none: {
    key: 'none',
    label: '不复现危机（正常回测）',
    description: '基于历史净值的常规回测，不施加压力因子',
    alpha: 1.0,
    requiredMonths: 12,
    zones: []
  },
  crisis_2020: {
    key: 'crisis_2020',
    label: '复现2020年流动性危机',
    description: '2020年2-3月新冠疫情引发的全球流动性危机，市场急速杀跌。将对该区间资产波动率施加 α=3.0 的安全惩罚因子',
    alpha: 3.0,
    requiredMonths: 80,
    zones: [
      { startDate: '2020-02-24', endDate: '2020-03-31', label: '2020流动性危机' }
    ]
  },
  crisis_2022: {
    key: 'crisis_2022',
    label: '复现2022年股债双杀',
    description: '2022年股债同步下跌，权益与债券资产遭遇双杀。将对该区间资产波动率施加 α=3.0 的安全惩罚因子',
    alpha: 3.0,
    requiredMonths: 54,
    zones: [
      { startDate: '2022-04-01', endDate: '2022-10-31', label: '2022股债双杀' }
    ]
  }
};

function getScenario(key) {
  return CRISIS_SCENARIOS[key] || CRISIS_SCENARIOS.none;
}

function listScenarios() {
  return Object.values(CRISIS_SCENARIOS).map(s => ({
    key: s.key,
    label: s.label,
    description: s.description,
    alpha: s.alpha,
    requiredMonths: s.requiredMonths,
    zones: s.zones
  }));
}

module.exports = {
  CRISIS_SCENARIOS,
  getScenario,
  listScenarios
};
