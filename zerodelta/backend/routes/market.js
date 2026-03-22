// routes/market.js
const router = require('express').Router();
const { INDICES, STOCKS, ETFS, ALL_INSTRUMENTS, NEWS, generateOHLC } = require('../marketData');

// GET /api/market/indices
router.get('/indices', (req, res) => res.json(INDICES));

// GET /api/market/stocks
router.get('/stocks', (req, res) => {
  const { q } = req.query;
  if (q) {
    const r = q.toLowerCase();
    return res.json(STOCKS.filter(s => s.sym.toLowerCase().includes(r) || s.name.toLowerCase().includes(r) || s.sector.toLowerCase().includes(r)));
  }
  res.json(STOCKS);
});

// GET /api/market/etfs
router.get('/etfs', (req, res) => res.json(ETFS));

// GET /api/market/all
router.get('/all', (req, res) => res.json(ALL_INSTRUMENTS));

// GET /api/market/news
router.get('/news', (req, res) => res.json(NEWS));

// GET /api/market/quote/:sym
router.get('/quote/:sym', (req, res) => {
  const inst = ALL_INSTRUMENTS.find(s => s.sym === req.params.sym.toUpperCase());
  if (!inst) return res.status(404).json({ error: 'Symbol not found' });
  res.json(inst);
});

// GET /api/market/candles/:sym?period=1D|1W|1M
router.get('/candles/:sym', (req, res) => {
  const sym = req.params.sym.toUpperCase();
  const period = req.query.period || '1D';
  const candles = period === '1D' ? 50 : period === '1W' ? 35 : 80;
  const data = generateOHLC(sym, candles);
  res.json({ sym, period, candles: data });
});

// GET /api/market/gainers
router.get('/gainers', (req, res) => {
  const sorted = [...ALL_INSTRUMENTS].sort((a, b) => b.chg - a.chg);
  res.json(sorted.slice(0, 10));
});

// GET /api/market/losers
router.get('/losers', (req, res) => {
  const sorted = [...ALL_INSTRUMENTS].sort((a, b) => a.chg - b.chg);
  res.json(sorted.slice(0, 10));
});

module.exports = router;
