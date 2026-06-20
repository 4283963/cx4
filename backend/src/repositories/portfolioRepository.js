const { query, getClient } = require('../db/pool');

async function createPortfolio(name, items) {
  const client = await getClient();
  try {
    await client.query('BEGIN');

    const portfolioResult = await client.query(
      'INSERT INTO portfolios (name) VALUES ($1) RETURNING id',
      [name || '未命名投资组合']
    );
    const portfolioId = portfolioResult.rows[0].id;

    for (const item of items) {
      await client.query(
        `INSERT INTO portfolio_items (portfolio_id, fund_id, fund_code, weight) 
         VALUES ($1, $2, $3, $4)`,
        [portfolioId, item.fundId || null, item.fundCode, item.weight]
      );
    }

    await client.query('COMMIT');
    return portfolioId;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function getPortfolioById(id) {
  const portfolioResult = await query(
    'SELECT id, name, created_at FROM portfolios WHERE id = $1',
    [id]
  );
  if (portfolioResult.rows.length === 0) return null;

  const itemsResult = await query(
    `SELECT pi.id, pi.fund_id, pi.fund_code, pi.weight, f.name as fund_name, f.type
     FROM portfolio_items pi 
     LEFT JOIN funds f ON pi.fund_id = f.id
     WHERE pi.portfolio_id = $1
     ORDER BY pi.id ASC`,
    [id]
  );

  return {
    ...portfolioResult.rows[0],
    items: itemsResult.rows.map(row => ({
      id: row.id,
      fundId: row.fund_id,
      fundCode: row.fund_code,
      fundName: row.fund_name,
      fundType: row.type,
      weight: parseFloat(row.weight)
    }))
  };
}

module.exports = {
  createPortfolio,
  getPortfolioById,
};
