CREATE TABLE IF NOT EXISTS funds (
  id SERIAL PRIMARY KEY,
  code VARCHAR(20) UNIQUE NOT NULL,
  name VARCHAR(200) NOT NULL,
  type VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS fund_nav (
  id SERIAL PRIMARY KEY,
  fund_id INTEGER REFERENCES funds(id) ON DELETE CASCADE,
  nav_date DATE NOT NULL,
  nav_value DECIMAL(15, 6) NOT NULL,
  accumulated_nav DECIMAL(15, 6),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(fund_id, nav_date)
);

CREATE INDEX IF NOT EXISTS idx_fund_nav_date ON fund_nav(nav_date);
CREATE INDEX IF NOT EXISTS idx_fund_nav_fund_date ON fund_nav(fund_id, nav_date);

CREATE TABLE IF NOT EXISTS portfolios (
  id SERIAL PRIMARY KEY,
  name VARCHAR(200),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS portfolio_items (
  id SERIAL PRIMARY KEY,
  portfolio_id INTEGER REFERENCES portfolios(id) ON DELETE CASCADE,
  fund_id INTEGER REFERENCES funds(id),
  fund_code VARCHAR(20) NOT NULL,
  weight DECIMAL(8, 6) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
