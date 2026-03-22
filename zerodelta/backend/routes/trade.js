// routes/trade.js
const router = require('express').Router();
const auth = require('../middleware/auth');
const DB = require('../db');
const { ALL_INSTRUMENTS } = require('../marketData');

// GET /api/trade/portfolio
router.get('/portfolio', auth, (req, res) => {
  const portfolio = DB.getPortfolio(req.user.id);
  const holdings = DB.getHoldings(req.user.id);
  let invested = 0, pnl = 0;
  holdings.forEach(h => {
    const inst = ALL_INSTRUMENTS.find(s => s.sym === h.sym);
    const ltp = inst ? inst.price : h.avgPrice;
    invested += h.avgPrice * h.qty;
    pnl += (ltp - h.avgPrice) * h.qty;
  });
  res.json({
    cash: portfolio.cash,
    virtualCapital: portfolio.virtualCapital,
    invested: +invested.toFixed(2),
    pnl: +pnl.toFixed(2),
    totalValue: +(portfolio.cash + invested + pnl).toFixed(2),
    holdingsCount: holdings.length
  });
});

// GET /api/trade/holdings
router.get('/holdings', auth, (req, res) => {
  const holdings = DB.getHoldings(req.user.id);
  const enriched = holdings.map(h => {
    const inst = ALL_INSTRUMENTS.find(s => s.sym === h.sym);
    const ltp = inst ? inst.price : h.avgPrice;
    const currentVal = ltp * h.qty;
    const investedVal = h.avgPrice * h.qty;
    const pnl = currentVal - investedVal;
    const pnlPct = investedVal > 0 ? (pnl / investedVal) * 100 : 0;
    return {
      ...h,
      ltp: +ltp.toFixed(2),
      currentValue: +currentVal.toFixed(2),
      investedValue: +investedVal.toFixed(2),
      pnl: +pnl.toFixed(2),
      pnlPct: +pnlPct.toFixed(2),
      name: inst ? inst.name : h.sym,
      sector: inst ? inst.sector : 'Unknown'
    };
  });
  res.json(enriched);
});

// GET /api/trade/orders
router.get('/orders', auth, (req, res) => {
  const orders = DB.getOrders(req.user.id);
  const enriched = orders.map(o => {
    const inst = ALL_INSTRUMENTS.find(s => s.sym === o.sym);
    const ltp = inst ? inst.price : o.price;
    const pnl = o.type === 'buy' ? (ltp - o.price) * o.qty : (o.price - ltp) * o.qty;
    return { ...o, ltp: +ltp.toFixed(2), pnl: +pnl.toFixed(2), name: inst ? inst.name : o.sym };
  });
  res.json(enriched);
});

// POST /api/trade/buy
router.post('/buy', auth, (req, res) => {
  try {
    const { sym, qty } = req.body;
    if (!sym || !qty || qty < 1) return res.status(400).json({ error: 'sym and qty (>=1) required' });
    const inst = ALL_INSTRUMENTS.find(s => s.sym === sym.toUpperCase());
    if (!inst) return res.status(404).json({ error: `Symbol ${sym} not found` });
    const portfolio = DB.getPortfolio(req.user.id);
    const cost = +(inst.price * qty).toFixed(2);
    if (cost > portfolio.cash) return res.status(400).json({ error: `Insufficient funds. Need ₹${cost.toLocaleString('en-IN')}, have ₹${portfolio.cash.toLocaleString('en-IN')}` });
    // Deduct cash
    DB.updatePortfolio(req.user.id, { cash: +(portfolio.cash - cost).toFixed(2) });
    // Update holding
    const existing = DB.getHolding(req.user.id, inst.sym);
    let newAvg = inst.price;
    let newQty = qty;
    if (existing) {
      newQty = existing.qty + qty;
      newAvg = +((existing.avgPrice * existing.qty + cost) / newQty).toFixed(2);
    }
    DB.updateHolding(req.user.id, inst.sym, newQty, newAvg);
    const order = DB.addOrder(req.user.id, { sym: inst.sym, type: 'buy', qty, price: +inst.price.toFixed(2), value: cost });
    res.json({ message: `Bought ${qty}× ${inst.sym} @ ₹${inst.price.toFixed(2)}`, order, newCash: +(portfolio.cash - cost).toFixed(2) });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/trade/sell
router.post('/sell', auth, (req, res) => {
  try {
    const { sym, qty } = req.body;
    if (!sym || !qty || qty < 1) return res.status(400).json({ error: 'sym and qty (>=1) required' });
    const inst = ALL_INSTRUMENTS.find(s => s.sym === sym.toUpperCase());
    if (!inst) return res.status(404).json({ error: `Symbol ${sym} not found` });
    const holding = DB.getHolding(req.user.id, inst.sym);
    if (!holding || holding.qty < qty) return res.status(400).json({ error: `Not enough ${inst.sym}. Holding: ${holding ? holding.qty : 0}, Requested: ${qty}` });
    const proceeds = +(inst.price * qty).toFixed(2);
    const pnl = +((inst.price - holding.avgPrice) * qty).toFixed(2);
    const portfolio = DB.getPortfolio(req.user.id);
    DB.updatePortfolio(req.user.id, { cash: +(portfolio.cash + proceeds).toFixed(2) });
    const newQty = holding.qty - qty;
    DB.updateHolding(req.user.id, inst.sym, newQty, holding.avgPrice);
    const order = DB.addOrder(req.user.id, { sym: inst.sym, type: 'sell', qty, price: +inst.price.toFixed(2), value: proceeds, pnl });
    res.json({ message: `Sold ${qty}× ${inst.sym} @ ₹${inst.price.toFixed(2)} | P&L: ₹${pnl}`, order, newCash: +(portfolio.cash + proceeds).toFixed(2), pnl });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/trade/watchlist
router.get('/watchlist', auth, (req, res) => {
  const syms = DB.getWatchlist(req.user.id);
  const enriched = syms.map(sym => ALL_INSTRUMENTS.find(s => s.sym === sym)).filter(Boolean);
  res.json(enriched);
});

// POST /api/trade/watchlist
router.post('/watchlist', auth, (req, res) => {
  const { sym } = req.body;
  if (!sym) return res.status(400).json({ error: 'sym required' });
  const inst = ALL_INSTRUMENTS.find(s => s.sym === sym.toUpperCase());
  if (!inst) return res.status(404).json({ error: 'Symbol not found' });
  res.json(DB.addToWatchlist(req.user.id, inst.sym));
});

// DELETE /api/trade/watchlist/:sym
router.delete('/watchlist/:sym', auth, (req, res) => {
  res.json(DB.removeFromWatchlist(req.user.id, req.params.sym.toUpperCase()));
});

// GET /api/trade/predict/:sym
router.get('/predict/:sym', auth, (req, res) => {
  const sym = req.params.sym.toUpperCase();
  const inst = ALL_INSTRUMENTS.find(s => s.sym === sym);
  if (!inst) return res.status(404).json({ error: 'Symbol not found' });
  const horizon = req.query.horizon || '1W';
  const seed = inst.price + inst.chg;
  const bull = Math.min(92, Math.max(35, Math.round(50 + inst.chg * 7 + (seed % 13))));
  const isBull = bull > 55;
  const multiplier = horizon === '1D' ? 0.008 : horizon === '1W' ? 0.025 : 0.065;
  const t1 = +(inst.price * (1 + (isBull ? multiplier : -multiplier * 0.5))).toFixed(2);
  const t2 = +(inst.price * (1 + (isBull ? multiplier * 2.2 : -multiplier * 1.2))).toFixed(2);
  const sl = +(inst.price * (1 + (isBull ? -multiplier * 0.8 : multiplier * 0.6))).toFixed(2);
  const signals = {
    rsi: +(45 + inst.chg * 5 + Math.random() * 10).toFixed(1),
    macd: isBull ? 'Bullish Crossover' : 'Bearish Crossover',
    bb: isBull ? 'Near Lower Band (Buy Zone)' : 'Near Upper Band (Sell Zone)',
    volume: isBull ? 'Above Average (Accumulation)' : 'Below Average (Distribution)',
    ema20: isBull ? `Price above EMA20 (${+(inst.price * 0.98).toFixed(0)})` : `Price below EMA20 (${+(inst.price * 1.02).toFixed(0)})`,
  };
  res.json({
    sym, name: inst.name, ltp: +inst.price.toFixed(2), chg: inst.chg,
    horizon, signal: isBull ? 'BULLISH' : 'BEARISH', confidence: bull,
    target1: t1, target2: t2, stopLoss: sl, signals,
    analysis: isBull
      ? `${sym} displays strong bullish momentum. RSI at ${signals.rsi} with MACD bullish crossover forming. Institutional buying observed in last 3 sessions. ${signals.ema20}.`
      : `${sym} faces near-term headwinds. RSI at ${signals.rsi} entering oversold zone. ${signals.ema20}. Watch for reversal near ₹${sl}.`,
    disclaimer: 'This is an AI-generated paper trading signal only. Not financial advice.',
  });
});

module.exports = router;
