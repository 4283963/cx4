const portfolioRepository = require('../repositories/portfolioRepository');
const fundRepository = require('../repositories/fundRepository');
const backtestService = require('../services/backtestService');

function validatePortfolio(items) {
  if (!items || items.length === 0) {
    return { valid: false, message: '投资组合不能为空' };
  }

  const totalWeight = items.reduce((sum, item) => sum + (parseFloat(item.weight) || 0), 0);
  if (Math.abs(totalWeight - 1) > 0.001) {
    return { valid: false, message: `仓位比例之和必须等于100%，当前为 ${(totalWeight * 100).toFixed(2)}%` };
  }

  for (const item of items) {
    if (!item.fundCode) {
      return { valid: false, message: '请为每个持仓选择基金' };
    }
    if (!item.weight || item.weight <= 0) {
      return { valid: false, message: '仓位比例必须大于0' };
    }
  }

  return { valid: true };
}

async function createPortfolioAndBacktest(ctx) {
  try {
    const { name, items } = ctx.request.body;

    const validation = validatePortfolio(items);
    if (!validation.valid) {
      ctx.status = 400;
      ctx.body = {
        success: false,
        message: validation.message
      };
      return;
    }

    const normalizedItems = [];
    for (const item of items) {
      const fund = await fundRepository.getFundByCode(item.fundCode);
      if (!fund) {
        ctx.status = 400;
        ctx.body = {
          success: false,
          message: `基金代码 ${item.fundCode} 不存在`
        };
        return;
      }
      normalizedItems.push({
        fundId: fund.id,
        fundCode: item.fundCode,
        fundName: fund.name,
        weight: parseFloat(item.weight)
      });
    }

    const portfolioId = await portfolioRepository.createPortfolio(name, normalizedItems);

    const fundIds = normalizedItems.map(item => item.fundId);
    const navDataMap = await fundRepository.getFundsNavHistory(fundIds, 12);

    const backtestResult = await backtestService.runBacktest(normalizedItems, navDataMap);

    ctx.body = {
      success: true,
      data: {
        portfolioId,
        portfolio: {
          name,
          items: normalizedItems
        },
        backtest: backtestResult
      }
    };
  } catch (error) {
    console.error('创建投资组合并回测失败:', error);
    ctx.status = 500;
    ctx.body = {
      success: false,
      message: '创建投资组合并回测失败',
      error: error.message
    };
  }
}

async function getPortfolio(ctx) {
  try {
    const { id } = ctx.params;
    const portfolio = await portfolioRepository.getPortfolioById(id);

    if (!portfolio) {
      ctx.status = 404;
      ctx.body = {
        success: false,
        message: '投资组合不存在'
      };
      return;
    }

    const itemsWithFundId = portfolio.items
      .filter(item => item.fundId !== null)
      .map(item => ({
        fundId: item.fundId,
        fundCode: item.fundCode,
        fundName: item.fundName,
        weight: item.weight
      }));

    const fundIds = itemsWithFundId.map(item => item.fundId);
    const navDataMap = await fundRepository.getFundsNavHistory(fundIds, 12);

    const backtestResult = await backtestService.runBacktest(itemsWithFundId, navDataMap);

    ctx.body = {
      success: true,
      data: {
        portfolio,
        backtest: backtestResult
      }
    };
  } catch (error) {
    console.error('获取投资组合详情失败:', error);
    ctx.status = 500;
    ctx.body = {
      success: false,
      message: '获取投资组合详情失败',
      error: error.message
    };
  }
}

async function backtestPortfolio(ctx) {
  try {
    const { items } = ctx.request.body;

    const validation = validatePortfolio(items);
    if (!validation.valid) {
      ctx.status = 400;
      ctx.body = {
        success: false,
        message: validation.message
      };
      return;
    }

    const normalizedItems = [];
    for (const item of items) {
      const fund = await fundRepository.getFundByCode(item.fundCode);
      if (!fund) {
        ctx.status = 400;
        ctx.body = {
          success: false,
          message: `基金代码 ${item.fundCode} 不存在`
        };
        return;
      }
      normalizedItems.push({
        fundId: fund.id,
        fundCode: item.fundCode,
        fundName: fund.name,
        weight: parseFloat(item.weight)
      });
    }

    const fundIds = normalizedItems.map(item => item.fundId);
    const navDataMap = await fundRepository.getFundsNavHistory(fundIds, 12);

    const backtestResult = await backtestService.runBacktest(normalizedItems, navDataMap);

    ctx.body = {
      success: true,
      data: {
        portfolio: {
          items: normalizedItems
        },
        backtest: backtestResult
      }
    };
  } catch (error) {
    console.error('回测投资组合失败:', error);
    ctx.status = 500;
    ctx.body = {
      success: false,
      message: '回测投资组合失败',
      error: error.message
    };
  }
}

module.exports = {
  createPortfolioAndBacktest,
  getPortfolio,
  backtestPortfolio
};
