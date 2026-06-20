const Router = require('koa-router');
const fundController = require('../controllers/fundController');
const portfolioController = require('../controllers/portfolioController');
const crisisController = require('../controllers/crisisController');

const router = new Router({
  prefix: '/api'
});

router.get('/funds', fundController.getFunds);
router.get('/funds/:code/nav', fundController.getFundNav);

router.get('/crisis-scenarios', crisisController.getCrisisScenarios);

router.post('/portfolios', portfolioController.createPortfolioAndBacktest);
router.get('/portfolios/:id', portfolioController.getPortfolio);
router.post('/portfolios/backtest', portfolioController.backtestPortfolio);

module.exports = router;
