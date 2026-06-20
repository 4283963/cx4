const fs = require('fs');
const path = require('path');
const { pool } = require('./pool');

function generateNavData(startDate, months, baseNav, volatility) {
  const data = [];
  const start = new Date(startDate);
  let nav = baseNav;

  for (let m = 0; m < months; m++) {
    const daysInMonth = new Date(start.getFullYear(), start.getMonth() + m + 1, 0).getDate();
    const firstDay = new Date(start.getFullYear(), start.getMonth() + m, 1);
    
    for (let d = 0; d < daysInMonth; d++) {
      const date = new Date(firstDay);
      date.setDate(firstDay.getDate() + d);
      const change = (Math.random() - 0.48) * volatility;
      nav = nav * (1 + change);
      nav = Math.max(0.5, Math.min(nav, baseNav * 2));
      data.push({
        date: date.toISOString().split('T')[0],
        nav: parseFloat(nav.toFixed(6))
      });
    }
  }
  return data;
}

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

async function initDatabase() {
  try {
    console.log('开始初始化数据库...');
    
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');
    
    await pool.query(schemaSql);
    console.log('数据库表创建完成');

    const existingFunds = await pool.query('SELECT COUNT(*) as count FROM funds');
    if (parseInt(existingFunds.rows[0].count) > 0) {
      console.log('数据库已有数据，跳过模拟数据插入');
      process.exit(0);
    }

    console.log('插入模拟基金数据...');
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - 12);
    startDate.setDate(1);

    for (const fund of mockFunds) {
      const baseNav = 1 + Math.random() * 2;
      const volatility = 0.01 + Math.random() * 0.02;
      
      const fundResult = await pool.query(
        'INSERT INTO funds (code, name, type) VALUES ($1, $2, $3) RETURNING id',
        [fund.code, fund.name, fund.type]
      );
      const fundId = fundResult.rows[0].id;

      const navData = generateNavData(startDate, 12, baseNav, volatility);

      for (const nav of navData) {
        await pool.query(
          'INSERT INTO fund_nav (fund_id, nav_date, nav_value, accumulated_nav) VALUES ($1, $2, $3, $3)',
          [fundId, nav.date, nav.nav]
        );
      }
      console.log(`已插入基金 ${fund.name} 的 ${navData.length} 条净值数据`);
    }

    console.log('数据库初始化完成！');
    process.exit(0);
  } catch (error) {
    console.error('数据库初始化失败:', error);
    process.exit(1);
  }
}

initDatabase();
