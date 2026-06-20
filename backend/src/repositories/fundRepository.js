const { query } = require('../db/pool');

async function getAllFunds() {
  const result = await query(
    'SELECT id, code, name, type FROM funds ORDER BY code'
  );
  return result.rows;
}

async function getFundByCode(code) {
  const result = await query(
    'SELECT id, code, name, type FROM funds WHERE code = $1',
    [code]
  );
  return result.rows[0] || null;
}

async function getFundNavHistory(fundId, months = 12) {
  const result = await query(
    `SELECT nav_date, nav_value, accumulated_nav 
     FROM fund_nav 
     WHERE fund_id = $1 
     AND nav_date >= CURRENT_DATE - INTERVAL '${months} months'
     ORDER BY nav_date ASC`,
    [fundId]
  );
  return result.rows.map(row => ({
    date: row.nav_date.toISOString().split('T')[0],
    nav: parseFloat(row.nav_value),
    accumulatedNav: parseFloat(row.accumulated_nav)
  }));
}

async function getFundsNavHistory(fundIds, months = 12) {
  if (fundIds.length === 0) return {};

  const placeholders = fundIds.map((_, i) => `$${i + 1}`).join(',');
  const result = await query(
    `SELECT fund_id, nav_date, nav_value, accumulated_nav 
     FROM fund_nav 
     WHERE fund_id IN (${placeholders})
     AND nav_date >= CURRENT_DATE - INTERVAL '${months} months'
     ORDER BY fund_id, nav_date ASC`,
    fundIds
  );

  const navMap = {};
  for (const row of result.rows) {
    const fundId = row.fund_id;
    if (!navMap[fundId]) {
      navMap[fundId] = [];
    }
    navMap[fundId].push({
      date: row.nav_date.toISOString().split('T')[0],
      nav: parseFloat(row.nav_value),
      accumulatedNav: parseFloat(row.accumulated_nav)
    });
  }
  return navMap;
}

module.exports = {
  getAllFunds,
  getFundByCode,
  getFundNavHistory,
  getFundsNavHistory,
};
