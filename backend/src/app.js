require('dotenv').config();
const Koa = require('koa');
const bodyParser = require('koa-bodyparser');
const cors = require('@koa/cors');
const config = require('./config');
const routes = require('./routes');

const app = new Koa();

app.use(cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization', 'Accept']
}));

app.use(bodyParser({
  enableTypes: ['json', 'form'],
  formLimit: '10mb',
  jsonLimit: '10mb'
}));

app.use(async (ctx, next) => {
  const start = Date.now();
  try {
    await next();
    const duration = Date.now() - start;
    console.log(`${ctx.method} ${ctx.url} - ${ctx.status} - ${duration}ms`);
  } catch (error) {
    ctx.status = error.status || 500;
    ctx.body = {
      success: false,
      message: error.message || '服务器内部错误'
    };
    console.error(`请求失败: ${ctx.method} ${ctx.url}`, error);
  }
});

app.use(routes.routes());
app.use(routes.allowedMethods());

app.use(async (ctx) => {
  ctx.status = 404;
  ctx.body = {
    success: false,
    message: '接口不存在'
  };
});

const PORT = config.port;
app.listen(PORT, () => {
  console.log(`财富管理平台后端服务已启动: http://localhost:${PORT}`);
  console.log(`可用接口:`);
  console.log(`  GET  /api/funds                 - 获取所有基金列表`);
  console.log(`  GET  /api/funds/:code/nav       - 获取指定基金净值历史`);
  console.log(`  GET  /api/crisis-scenarios      - 获取危机压力回测情景列表`);
  console.log(`  POST /api/portfolios            - 创建投资组合并回测(支持 scenario 压力情景)`);
  console.log(`  GET  /api/portfolios/:id        - 获取投资组合详情及回测`);
  console.log(`  POST /api/portfolios/backtest   - 对投资组合进行回测(支持 scenario 压力情景)`);
});
