const fs = require('fs');
const path = require('path');
const { pool } = require('./pool');

const DATA_START_DATE = '2020-01-01';

const CRISIS_REGIMES = [
  { startDate: '2020-02-24', endDate: '2020-03-31', volatility: 0.045, drift: -0.008 },
  { startDate: '2022-04-01', endDate: '2022-10-31', volatility: 0.024, drift: -0.0016 }
];

const mockFunds = [
  { code: '000001', name: '华夏成长混合', type: '混合型' },
  { code: '110022', name: '易方达消费行业股票', type: '股票型' },
  { code: '161725', name: '招商中证白酒指数', type: '指数型' },
  { code: '005827', name: '易方达蓝筹精选混合', type: '混合型' },
  { code: '519674', name: '银河创新成长混合', type: '混合型' },
  { code: '003834', name: '华夏能源革新股票', type: '股票型' },
  { code: '001156', name: '申万菱信新能源汽车', type: '股票型' },
  { code: '510300', name: '华泰柏瑞沪深300ETF', type: '指数型' },
];

function pad(n) {
  return String(n).padStart(2, '0');
}

function formatDate(d) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function isWeekend(d) {
  const day = d.getDay();
  return day === 0 || day === 6;
}

function getRegime(dateStr) {
  for (const r of CRISIS_REGIMES) {
    if (dateStr >= r.startDate && dateStr <= r.endDate) {
      return r;
    }
  }
  return null;
}

function generateNavData(startDateStr, endDateStr, baseNav, baseVolatility) {
  const data = [];
  const start = new Date(startDateStr + 'T00:00:00Z');
  const end = new Date(endDateStr + 'T00:00:00Z');
  let nav = baseNav;

  for (let d = new Date(start); d <= end; d.setUTCDate(d.getUTCDate() + 1)) {
    if (isWeekend(d)) continue;

    const dateStr = formatDate(d);
    const regime = getRegime(dateStr);

    const drift = regime ? regime.drift : 0.0004;
    const volatility = regime ? regime.volatility : baseVolatility;

    const change = drift + (Math.random() - 0.5) * 2 * volatility;
    nav = nav * (1 + change);
    nav = Math.max(0.3, Math.min(nav, baseNav * 3));

    data.push({ date: dateStr, nav: parseFloat(nav.toFixed(6)) });
  }
  return data;
}

async function batchInsertNav(fundId, navData) {
  const BATCH = 500;
  for (let i = 0; i < navData.length; i += BATCH) {
    const slice = navData.slice(i, i + BATCH);
    const values = [];
    const params = [];
    let paramIdx = 1;
    for (const nav of slice) {
      values.push(`($${paramIdx}, $${paramIdx + 1}, $${paramIdx + 2}, $${paramIdx + 2})`);
      params.push(fundId, nav.date, nav.nav);
      paramIdx += 3;
    }
    const sql = `INSERT INTO fund_nav (fund_id, nav_date, nav_value, accumulated_nav) VALUES ${values.join(',')}`;
    await pool.query(sql, params);
  }
}

async function initDatabase() {
  try {
    console.log('开始初始化数据库...');

    const schemaPath = path.join(__dirname, 'schema.sql');
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');
    await pool.query(schemaSql);
    console.log('数据库表创建完成');

    const todayStr = formatDate(new Date());
    console.log(`数据区间: ${DATA_START_DATE} ~ ${todayStr}`);

    console.log('清空并重建基金净值数据...');
    await pool.query('TRUNCATE fund_nav RESTART IDENTITY');
    await pool.query('TRUNCATE portfolios CASCADE');

    for (const fund of mockFunds) {
      const fundResult = await pool.query(
        `INSERT INTO funds (code, name, type) VALUES ($1, $2, $3)
         ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, type = EXCLUDED.type
         RETURNING id`,
        [fund.code, fund.name, fund.type]
      );
      const fundId = fundResult.rows[0].id;

      const baseNav = 1 + Math.random() * 2;
      const baseVolatility = 0.009 + Math.random() * 0.012;

      const navData = generateNavData(DATA_START_DATE, todayStr, baseNav, baseVolatility);
      await batchInsertNav(fundId, navData);

      console.log(`  基金 ${fund.name}(${fund.code}): ${navData.length} 条净值（已注入危机期波动）`);
    }

    console.log('数据库初始化完成！');
    console.log('提示: 已预置 2020 流动性危机与 2022 股债双杀的高波动数据，可在前端复现。');
    process.exit(0);
  } catch (error) {
    console.error('数据库初始化失败:', error);
    process.exit(1);
  }
}

initDatabase();
