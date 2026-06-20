const fundRepository = require('../repositories/fundRepository');

async function getFunds(ctx) {
  try {
    const funds = await fundRepository.getAllFunds();
    ctx.body = {
      success: true,
      data: funds
    };
  } catch (error) {
    console.error('获取基金列表失败:', error);
    ctx.status = 500;
    ctx.body = {
      success: false,
      message: '获取基金列表失败',
      error: error.message
    };
  }
}

async function getFundNav(ctx) {
  try {
    const { code } = ctx.params;
    const months = parseInt(ctx.query.months) || 12;

    const fund = await fundRepository.getFundByCode(code);
    if (!fund) {
      ctx.status = 404;
      ctx.body = {
        success: false,
        message: '基金不存在'
      };
      return;
    }

    const navHistory = await fundRepository.getFundNavHistory(fund.id, months);
    ctx.body = {
      success: true,
      data: {
        fund,
        navHistory
      }
    };
  } catch (error) {
    console.error('获取基金净值失败:', error);
    ctx.status = 500;
    ctx.body = {
      success: false,
      message: '获取基金净值失败',
      error: error.message
    };
  }
}

module.exports = {
  getFunds,
  getFundNav
};
