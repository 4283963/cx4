const { mean, std } = require('mathjs');

function calculateDailyReturns(navSeries) {
  const returns = [];
  for (let i = 1; i < navSeries.length; i++) {
    const prevNav = navSeries[i - 1].nav;
    const currNav = navSeries[i].nav;
    if (prevNav > 0) {
      returns.push({
        date: navSeries[i].date,
        dailyReturn: (currNav - prevNav) / prevNav
      });
    }
  }
  return returns;
}

function calculateCumulativeReturn(navSeries) {
  if (navSeries.length < 2) return 0;
  const startNav = navSeries[0].nav;
  const endNav = navSeries[navSeries.length - 1].nav;
  return (endNav - startNav) / startNav;
}

function calculateAnnualizedReturn(cumulativeReturn, days) {
  if (days <= 0) return 0;
  return Math.pow(1 + cumulativeReturn, 365 / days) - 1;
}

function calculateSharpeRatio(dailyReturns, riskFreeRate = 0.02) {
  if (dailyReturns.length < 2) return 0;

  const returnsArray = dailyReturns.map(r => r.dailyReturn);
  const meanDailyReturn = mean(returnsArray);
  const stdDailyReturn = std(returnsArray);

  if (stdDailyReturn === 0) return 0;

  const dailyRiskFree = riskFreeRate / 252;
  const sharpe = (meanDailyReturn - dailyRiskFree) / stdDailyReturn * Math.sqrt(252);

  return sharpe;
}

function calculateMaxDrawdown(navSeries) {
  if (navSeries.length < 2) return { maxDrawdown: 0, peakDate: null, troughDate: null };

  let maxDrawdown = 0;
  let peak = navSeries[0].nav;
  let peakDate = navSeries[0].date;
  let currentPeakDate = navSeries[0].date;
  let troughDate = navSeries[0].date;

  for (let i = 1; i < navSeries.length; i++) {
    const nav = navSeries[i].nav;
    const date = navSeries[i].date;

    if (nav > peak) {
      peak = nav;
      currentPeakDate = date;
    }

    const drawdown = (peak - nav) / peak;
    if (drawdown > maxDrawdown) {
      maxDrawdown = drawdown;
      peakDate = currentPeakDate;
      troughDate = date;
    }
  }

  return {
    maxDrawdown,
    peakDate,
    troughDate
  };
}

function alignDates(navDataMap) {
  const allDates = new Set();
  for (const fundId in navDataMap) {
    navDataMap[fundId].forEach(item => allDates.add(item.date));
  }

  const sortedDates = Array.from(allDates).sort();
  return sortedDates;
}

function calculatePortfolioNav(portfolioItems, navDataMap, sortedDates) {
  const portfolioNav = [];

  for (const date of sortedDates) {
    let portfolioValue = 0;
    let hasValidData = false;

    for (const item of portfolioItems) {
      const fundId = item.fundId;
      const weight = item.weight;

      if (!navDataMap[fundId]) continue;

      const navItem = navDataMap[fundId].find(n => n.date === date);
      if (navItem) {
        const firstNav = navDataMap[fundId][0].nav;
        if (firstNav > 0) {
          portfolioValue += weight * (navItem.nav / firstNav);
          hasValidData = true;
        }
      }
    }

    if (hasValidData) {
      portfolioNav.push({
        date,
        nav: portfolioValue
      });
    }
  }

  return portfolioNav;
}

function generatePerformanceCurve(portfolioNav) {
  if (portfolioNav.length === 0) return [];

  const baseValue = portfolioNav[0].nav;
  return portfolioNav.map(item => ({
    date: item.date,
    value: baseValue > 0 ? ((item.nav - baseValue) / baseValue * 100) : 0
  }));
}

async function runBacktest(portfolioItems, navDataMap) {
  const sortedDates = alignDates(navDataMap);

  if (sortedDates.length < 2) {
    return {
      cumulativeReturn: 0,
      annualizedReturn: 0,
      sharpeRatio: 0,
      maxDrawdown: 0,
      maxDrawdownInfo: { peakDate: null, troughDate: null },
      performanceCurve: [],
      period: { startDate: null, endDate: null, days: 0 }
    };
  }

  const portfolioNav = calculatePortfolioNav(portfolioItems, navDataMap, sortedDates);

  if (portfolioNav.length < 2) {
    return {
      cumulativeReturn: 0,
      annualizedReturn: 0,
      sharpeRatio: 0,
      maxDrawdown: 0,
      maxDrawdownInfo: { peakDate: null, troughDate: null },
      performanceCurve: [],
      period: { startDate: null, endDate: null, days: 0 }
    };
  }

  const dailyReturns = calculateDailyReturns(portfolioNav);
  const cumulativeReturn = calculateCumulativeReturn(portfolioNav);

  const startDate = portfolioNav[0].date;
  const endDate = portfolioNav[portfolioNav.length - 1].date;
  const days = Math.floor((new Date(endDate) - new Date(startDate)) / (1000 * 60 * 60 * 24));

  const annualizedReturn = calculateAnnualizedReturn(cumulativeReturn, days);
  const sharpeRatio = calculateSharpeRatio(dailyReturns);
  const drawdownInfo = calculateMaxDrawdown(portfolioNav);
  const performanceCurve = generatePerformanceCurve(portfolioNav);

  return {
    cumulativeReturn,
    annualizedReturn,
    sharpeRatio,
    maxDrawdown: drawdownInfo.maxDrawdown,
    maxDrawdownInfo: {
      peakDate: drawdownInfo.peakDate,
      troughDate: drawdownInfo.troughDate
    },
    performanceCurve,
    period: {
      startDate,
      endDate,
      days
    }
  };
}

module.exports = {
  calculateDailyReturns,
  calculateCumulativeReturn,
  calculateAnnualizedReturn,
  calculateSharpeRatio,
  calculateMaxDrawdown,
  runBacktest,
  calculatePortfolioNav,
  alignDates,
  generatePerformanceCurve
};
