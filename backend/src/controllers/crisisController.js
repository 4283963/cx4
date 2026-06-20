const { listScenarios } = require('../config/crisisScenarios');

async function getCrisisScenarios(ctx) {
  try {
    ctx.body = {
      success: true,
      data: listScenarios()
    };
  } catch (error) {
    console.error('获取危机情景列表失败:', error);
    ctx.status = 500;
    ctx.body = {
      success: false,
      message: '获取危机情景列表失败',
      error: error.message
    };
  }
}

module.exports = {
  getCrisisScenarios
};
