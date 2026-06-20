const { streamFundsNavHistory } = require('../repositories/fundRepository');

const MAX_CURVE_POINTS = 300;
const TRADING_DAYS_PER_YEAR = 252;
const DEFAULT_RISK_FREE_RATE = 0.02;

function emptyCrisis() {
  return {
    applied: false,
    alpha: 0,
    scenarioKey: 'none',
    scenarioLabel: '不复现危机',
    zones: []
  };
}

function emptyResult(message) {
  return {
    cumulativeReturn: 0,
    annualizedReturn: 0,
    sharpeRatio: 0,
    maxDrawdown: 0,
    maxDrawdownInfo: { peakDate: null, troughDate: null },
    performanceCurve: [],
    period: { startDate: null, endDate: null, days: 0 },
    rowCount: 0,
    crisis: emptyCrisis(),
    note: message || ''
  };
}

function welfordStats() {
  let count = 0;
  let mean = 0;
  let m2 = 0;

  function push(value) {
    count++;
    const delta = value - mean;
    mean += delta / count;
    m2 += delta * (value - mean);
  }

  function variance() {
    if (count < 2) return 0;
    return m2 / (count - 1);
  }

  return {
    push,
    get mean() { return mean; },
    get count() { return count; },
    std() { return Math.sqrt(variance()); }
  };
}

function countInvalid(v) {
  return Number.isNaN(v) || !Number.isFinite(v);
}

function calculateSharpeRatio(meanDailyReturn, stdDailyReturn, riskFreeRate) {
  if (stdDailyReturn === 0 || countInvalid(stdDailyReturn)) return 0;
  const dailyRiskFree = (riskFreeRate || DEFAULT_RISK_FREE_RATE) / TRADING_DAYS_PER_YEAR;
  return (meanDailyReturn - dailyRiskFree) / stdDailyReturn * Math.sqrt(TRADING_DAYS_PER_YEAR);
}

function calculateAnnualizedReturn(cumulativeReturn, days) {
  if (days <= 0) return 0;
  return Math.pow(1 + cumulativeReturn, 365 / days) - 1;
}

function downsampleCurve(curve, maxPoints) {
  if (curve.length <= maxPoints) return curve;

  const step = Math.ceil(curve.length / maxPoints);
  const sampled = [];
  for (let i = 0; i < curve.length; i += step) {
    sampled.push(curve[i]);
  }

  const last = curve[curve.length - 1];
  const tail = sampled[sampled.length - 1];
  if (tail !== last) {
    if (sampled.length >= maxPoints) {
      sampled[sampled.length - 1] = last;
    } else {
      sampled.push(last);
    }
  }
  return sampled;
}

function isDateInZones(date, zones) {
  for (const z of zones) {
    if (date >= z.startDate && date <= z.endDate) return true;
  }
  return false;
}

function applyCrisisStress(portfolioNav, scenario) {
  if (!scenario || scenario.key === 'none' || !scenario.zones || scenario.zones.length === 0) {
    return { stressedNav: portfolioNav, crisisZones: [], applied: false, alpha: 0 };
  }

  const alpha = scenario.alpha || 1.0;
  const zones = scenario.zones;
  const inCrisis = portfolioNav.map(p => isDateInZones(p.date, zones));

  let sum = 0;
  let count = 0;
  for (let i = 1; i < portfolioNav.length; i++) {
    if (inCrisis[i]) {
      const prev = portfolioNav[i - 1].nav;
      if (prev > 0) {
        sum += (portfolioNav[i].nav - prev) / prev;
        count++;
      }
    }
  }
  const windowMean = count > 0 ? sum / count : 0;

  const stressedNav = [{ date: portfolioNav[0].date, nav: portfolioNav[0].nav }];
  for (let i = 1; i < portfolioNav.length; i++) {
    const prevStressed = stressedNav[i - 1].nav;
    const prevOrig = portfolioNav[i - 1].nav;
    const currOrig = portfolioNav[i].nav;
    let r = prevOrig > 0 ? (currOrig - prevOrig) / prevOrig : 0;
    if (inCrisis[i]) {
      r = windowMean + alpha * (r - windowMean);
    }
    stressedNav.push({ date: portfolioNav[i].date, nav: prevStressed * (1 + r) });
  }

  return { stressedNav, crisisZones: zones, applied: true, alpha };
}

async function buildNavIndex(portfolioItems, fundIds, months) {
  const navIndex = new Map();
  const firstNavByFund = new Map();
  const dateSet = new Set();

  let rowCount = 0;
  await streamFundsNavHistory(fundIds, months, (row) => {
    const { fundId, date, nav } = row;

    let fundMap = navIndex.get(fundId);
    if (!fundMap) {
      fundMap = new Map();
      navIndex.set(fundId, fundMap);
    }
    fundMap.set(date, nav);

    if (!firstNavByFund.has(fundId)) {
      firstNavByFund.set(fundId, nav);
    }

    dateSet.add(date);
    rowCount++;
  });

  const sortedDates = Array.from(dateSet).sort();
  return { navIndex, firstNavByFund, sortedDates, rowCount };
}

function calculatePortfolioNav(portfolioItems, navIndex, firstNavByFund, sortedDates) {
  const portfolioNav = [];

  for (const date of sortedDates) {
    let portfolioValue = 0;
    let hasValidData = false;

    for (const item of portfolioItems) {
      const fundMap = navIndex.get(item.fundId);
      if (!fundMap) continue;

      const nav = fundMap.get(date);
      if (nav !== undefined) {
        const firstNav = firstNavByFund.get(item.fundId);
        if (firstNav > 0) {
          portfolioValue += item.weight * (nav / firstNav);
          hasValidData = true;
        }
      }
    }

    if (hasValidData) {
      portfolioNav.push({ date, nav: portfolioValue });
    }
  }

  return portfolioNav;
}

function computeMetrics(portfolioNav) {
  if (portfolioNav.length < 2) {
    return {
      cumulativeReturn: 0,
      annualizedReturn: 0,
      sharpeRatio: 0,
      maxDrawdown: 0,
      maxDrawdownInfo: { peakDate: null, troughDate: null },
      period: { startDate: null, endDate: null, days: 0 }
    };
  }

  const stats = welfordStats();
  let peak = portfolioNav[0].nav;
  let currentPeakDate = portfolioNav[0].date;
  let maxDrawdown = 0;
  let peakDate = portfolioNav[0].date;
  let troughDate = portfolioNav[0].date;
  let prevNav = null;

  for (let i = 0; i < portfolioNav.length; i++) {
    const point = portfolioNav[i];

    if (prevNav !== null && prevNav > 0) {
      const dailyReturn = (point.nav - prevNav) / prevNav;
      stats.push(dailyReturn);
    }

    if (point.nav > peak) {
      peak = point.nav;
      currentPeakDate = point.date;
    }

    const drawdown = peak > 0 ? (peak - point.nav) / peak : 0;
    if (drawdown > maxDrawdown) {
      maxDrawdown = drawdown;
      peakDate = currentPeakDate;
      troughDate = point.date;
    }

    prevNav = point.nav;
  }

  const startNav = portfolioNav[0].nav;
  const endNav = portfolioNav[portfolioNav.length - 1].nav;
  const cumulativeReturn = startNav > 0 ? (endNav - startNav) / startNav : 0;

  const startDate = portfolioNav[0].date;
  const endDate = portfolioNav[portfolioNav.length - 1].date;
  const days = Math.floor((new Date(endDate) - new Date(startDate)) / (1000 * 60 * 60 * 24));

  const annualizedReturn = calculateAnnualizedReturn(cumulativeReturn, days);
  const sharpeRatio = calculateSharpeRatio(stats.mean, stats.std(), DEFAULT_RISK_FREE_RATE);

  return {
    cumulativeReturn,
    annualizedReturn,
    sharpeRatio,
    maxDrawdown,
    maxDrawdownInfo: { peakDate, troughDate },
    period: { startDate, endDate, days }
  };
}

function generatePerformanceCurve(portfolioNav) {
  if (portfolioNav.length === 0) return [];

  const baseValue = portfolioNav[0].nav;
  const fullCurve = [];
  for (const point of portfolioNav) {
    fullCurve.push({
      date: point.date,
      value: baseValue > 0 ? ((point.nav - baseValue) / baseValue * 100) : 0
    });
  }

  return downsampleCurve(fullCurve, MAX_CURVE_POINTS);
}

async function runBacktestStream(portfolioItems, fundIds, months, scenario) {
  const { navIndex, firstNavByFund, sortedDates, rowCount } = await buildNavIndex(
    portfolioItems,
    fundIds,
    months
  );

  if (sortedDates.length < 2) {
    return { ...emptyResult('历史净值数据不足，无法进行回测'), rowCount };
  }

  const portfolioNav = calculatePortfolioNav(portfolioItems, navIndex, firstNavByFund, sortedDates);

  if (portfolioNav.length < 2) {
    return { ...emptyResult('投资组合有效净值点不足，无法进行回测'), rowCount };
  }

  const safeScenario = scenario || { key: 'none', zones: [], label: '不复现危机' };
  const { stressedNav, crisisZones, applied, alpha } = applyCrisisStress(portfolioNav, safeScenario);

  const metrics = computeMetrics(stressedNav);
  const performanceCurve = generatePerformanceCurve(stressedNav);

  return {
    ...metrics,
    performanceCurve,
    rowCount,
    crisis: {
      applied,
      alpha: applied ? alpha : 0,
      scenarioKey: safeScenario.key,
      scenarioLabel: safeScenario.label,
      zones: crisisZones
    }
  };
}

module.exports = {
  runBacktestStream,
  applyCrisisStress,
  isDateInZones,
  welfordStats,
  calculateAnnualizedReturn,
  calculateSharpeRatio,
  downsampleCurve,
  buildNavIndex,
  calculatePortfolioNav,
  computeMetrics,
  generatePerformanceCurve
};
