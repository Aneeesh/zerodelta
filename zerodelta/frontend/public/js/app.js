/* ============================================================
   ZeroDelta app.js — Complete frontend application logic
   ============================================================ */

// ── STATE ──────────────────────────────────────────────────────────
const S = {
  token: null, user: null,
  portfolio: { cash: 1000000, totalValue: 1000000, invested: 0, pnl: 0, holdingsCount: 0 },
  holdings: [], orders: [], watchlist: [],
  indices: [], stocks: [], etfs: [], news: [],
  currentSym: null, tradeMode: 'buy',
  section: 'dashboard', priceTimer: null, pollTimer: null,
};

// ── UTILS ───────────────────────────────────────────────────────────
const $ = (id) => document.getElementById(id);
const fmt = (n) => {
  n = +n;
  if (Math.abs(n) >= 10000000) return (n / 10000000).toFixed(2) + 'Cr';
  if (Math.abs(n) >= 100000)   return (n / 100000).toFixed(2) + 'L';
  if (Math.abs(n) >= 1000)     return (n / 1000).toFixed(2) + 'K';
  return n.toFixed(2);
};
const fmtN  = (n) => (+n).toLocaleString('en-IN', { maximumFractionDigits: 0 });
const sign  = (n) => n >= 0 ? '+' : '';
const cls   = (n) => n >= 0 ? 'up' : 'down';
const rupee = (n) => 'Rs.' + fmt(+n);
const allInstr = () => [...S.stocks, ...S.etfs];

function toast(msg, type) {
  const t = $('toast');
  t.textContent = msg;
  t.className = 'toast show' + (type === 'success' ? ' success' : type === 'error' ? ' error' : '');
  clearTimeout(t._tid);
  t._tid = setTimeout(() => t.classList.remove('show'), 3500);
}

function showAuthError(msg) {
  const el = $('auth-error');
  el.textContent = msg;
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), 4500);
}

function setBtnLoading(id, loading, text) {
  const b = $(id);
  if (!b) return;
  b.disabled = loading;
  b.textContent = loading ? 'Please wait...' : text;
}

// ── PASSWORD TOGGLE ─────────────────────────────────────────────────
function togglePw(inputId, btn) {
  const inp = $(inputId);
  const showing = inp.type === 'text';
  inp.type = showing ? 'password' : 'text';
  const svg = btn.querySelector('svg');
  svg.innerHTML = showing
    ? '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>'
    : '<path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/>';
}

// ── AUTH TABS ───────────────────────────────────────────────────────
function switchAuthTab(tab) {
  const isLogin = tab === 'login';
  $('tab-login').className    = 'tab-btn' + (isLogin ? ' active' : '');
  $('tab-register').className = 'tab-btn' + (!isLogin ? ' active' : '');
  $('form-login').classList.toggle('hide', !isLogin);
  $('form-register').classList.toggle('hide', isLogin);
  $('auth-error').classList.remove('show');
}

// ── LOGIN ───────────────────────────────────────────────────────────
async function doLogin() {
  const email = $('login-email').value.trim();
  const pass  = $('login-pass').value;
  if (!email || !pass) { showAuthError('Email and password are required.'); return; }
  setBtnLoading('login-btn', true, '');
  try {
    const data = await API.login(email, pass);
    setToken(data.token); setUser(data.user);
    S.token = data.token; S.user = data.user;
    await bootApp();
  } catch (e) { showAuthError(e.message); }
  finally { setBtnLoading('login-btn', false, 'Sign In to Trade'); }
}

// ── REGISTER ────────────────────────────────────────────────────────
async function doRegister() {
  const body = {
    firstName: $('reg-fname').value.trim(), lastName: $('reg-lname').value.trim(),
    email: $('reg-email').value.trim(), password: $('reg-pass').value,
    mobile: $('reg-mobile').value.trim(),
  };
  if (!body.firstName || !body.email || !body.password) { showAuthError('Name, email and password required.'); return; }
  if (body.password.length < 6) { showAuthError('Password must be at least 6 characters.'); return; }
  setBtnLoading('reg-btn', true, '');
  try {
    const data = await API.register(body);
    setToken(data.token); setUser(data.user);
    S.token = data.token; S.user = data.user;
    await bootApp();
  } catch (e) { showAuthError(e.message); }
  finally { setBtnLoading('reg-btn', false, 'Create Free Account'); }
}

// ── LOGOUT ──────────────────────────────────────────────────────────
function doLogout() {
  clearToken();
  clearInterval(S.pollTimer); clearInterval(S.priceTimer);
  S.token = null; S.user = null;
  $('login-page').classList.add('active');
  $('app-page').classList.remove('active');
  toast('Logged out successfully.');
}

// ── BOOT APP ────────────────────────────────────────────────────────
async function bootApp() {
  $('login-page').classList.remove('active');
  $('app-page').classList.add('active');
  const av = $('user-avatar');
  if (av && S.user) av.textContent = ((S.user.firstName || 'A')[0] + (S.user.lastName || ' ')[0]).toUpperCase();
  await Promise.all([loadMarketData(), loadPortfolio(), loadNews()]);
  buildTicker(); buildSidebar(); buildNewsPanel();
  showSection('dashboard', document.querySelector('.nav-tab'));
  S.pollTimer  = setInterval(loadPortfolio, 7000);
  S.priceTimer = setInterval(tickPrices, 4000);
}

// ── DATA LOADING ────────────────────────────────────────────────────
async function loadMarketData() {
  try {
    const [idx, st, etf] = await Promise.all([API.indices(), API.stocks(), API.etfs()]);
    S.indices = idx; S.stocks = st; S.etfs = etf;
  } catch (e) { console.error('Market data error:', e); }
}

async function loadPortfolio() {
  try {
    const [port, hold, ord, wl] = await Promise.all([API.portfolio(), API.holdings(), API.orders(), API.watchlist()]);
    S.portfolio = port; S.holdings = hold; S.orders = ord; S.watchlist = wl;
    updatePortfolioBadge(); buildWatchlistSidebar(); buildRecentOrdersPanel();
  } catch (e) { console.error('Portfolio error:', e); }
}

async function loadNews() {
  try { S.news = await API.news(); } catch (e) { S.news = []; }
}

// ── CLIENT-SIDE PRICE TICK ──────────────────────────────────────────
function tickPrices() {
  allInstr().forEach(s => {
    const d = (Math.random() - 0.495) * 0.15;
    s.price = Math.max(0.5, s.price * (1 + d / 100));
    s.chg   = +(s.chg + d * 0.07).toFixed(2);
  });
  S.indices.forEach(i => {
    const d = (Math.random() - 0.495) * 0.09;
    i.val = Math.max(1, i.val * (1 + d / 100));
    i.chg = +(i.chg + d * 0.05).toFixed(2);
  });
  buildSidebar();
  if (S.currentSym) updateTradePanel();
  if (S.section === 'dashboard') updateDashboardMetrics();
}

// ── TICKER ──────────────────────────────────────────────────────────
function buildTicker() {
  const items = [...S.indices, ...S.stocks.slice(0, 20)];
  let html = '';
  for (let r = 0; r < 2; r++) {
    items.forEach(it => {
      const val = it.val !== undefined ? it.val : it.price;
      const sym = it.sym || it.id;
      html += `<div class="ti"><span class="tn">${sym}</span><span>${fmtN(val)}</span><span class="${cls(it.chg)}">${sign(it.chg)}${Math.abs(it.chg).toFixed(2)}%</span></div>`;
    });
  }
  $('ticker-track').innerHTML = html;
}

// ── SIDEBAR ─────────────────────────────────────────────────────────
function buildSidebar() { buildIndexSidebar(); buildWatchlistSidebar(); buildEtfSidebar(); }

function buildIndexSidebar() {
  const el = $('sidebar-indices');
  if (!el) return;
  el.innerHTML = S.indices.slice(0, 6).map(i => `
    <div class="si">
      <div class="si-icon" style="font-size:9px;">${i.id.slice(0,3).toUpperCase()}</div>
      <div class="si-info"><div class="si-name">${i.name}</div></div>
      <div class="si-right"><div class="si-price">${fmtN(i.val)}</div><div class="si-chg ${cls(i.chg)}">${sign(i.chg)}${Math.abs(i.chg).toFixed(2)}%</div></div>
    </div>`).join('');
}

function buildWatchlistSidebar() {
  const el = $('sidebar-watchlist');
  if (!el) return;
  const wlSyms = S.watchlist.map(w => w.sym || w);
  const list = wlSyms.length ? wlSyms.map(sym => allInstr().find(s => s.sym === sym)).filter(Boolean) : S.stocks.slice(0, 10);
  el.innerHTML = list.slice(0, 12).map(s => `
    <div class="si ${S.currentSym === s.sym ? 'active' : ''}" id="sb-${s.sym}" onclick="selectStock('${s.sym}')">
      <div class="si-icon">${s.sym.slice(0,2)}</div>
      <div class="si-info"><div class="si-name">${s.sym}</div><div class="si-sub">${s.name}</div></div>
      <div class="si-right"><div class="si-price">Rs.${fmt(s.price)}</div><div class="si-chg ${cls(s.chg)}">${sign(s.chg)}${Math.abs(s.chg).toFixed(2)}%</div></div>
    </div>`).join('');
}

function buildEtfSidebar() {
  const el = $('sidebar-etfs');
  if (!el) return;
  el.innerHTML = S.etfs.map(e => `
    <div class="si ${S.currentSym === e.sym ? 'active' : ''}" onclick="selectStock('${e.sym}')">
      <div class="si-icon" style="background:${e.color}22;color:${e.color};">${e.sector.includes('Gold') ? 'AU' : 'AG'}</div>
      <div class="si-info"><div class="si-name">${e.sym}</div><div class="si-sub">${e.sector}</div></div>
      <div class="si-right"><div class="si-price">Rs.${fmt(e.price)}</div><div class="si-chg ${cls(e.chg)}">${sign(e.chg)}${Math.abs(e.chg).toFixed(2)}%</div></div>
    </div>`).join('');
}

// ── NEWS PANEL ──────────────────────────────────────────────────────
function buildNewsPanel() {
  const el = $('news-panel');
  if (!el) return;
  el.innerHTML = S.news.map(n => `
    <div class="news-item"><div class="news-tag">${n.tag}</div><div class="news-title">${n.title}</div><div class="news-meta">${n.time}</div></div>`).join('');
}

// ── PORTFOLIO BADGE ─────────────────────────────────────────────────
function updatePortfolioBadge() {
  const pv = $('portfolio-val');
  if (pv) pv.textContent = 'Rs.' + fmtN(S.portfolio.totalValue || 1000000);
  const tf = $('tr-funds');
  if (tf) tf.textContent = 'Rs.' + fmtN(S.portfolio.cash || 1000000);
}

// ── NAVIGATION ──────────────────────────────────────────────────────
function showSection(sec, btn) {
  S.section = sec;
  document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
  if (btn) btn.classList.add('active');
  else {
    const tabs = ['dashboard','markets','portfolio','predictor','orders'];
    const i = tabs.indexOf(sec);
    const t = document.querySelectorAll('.nav-tab')[i];
    if (t) t.classList.add('active');
  }
  const mc = $('main-content');
  mc.innerHTML = '';
  mc.classList.add('fade-up');
  setTimeout(() => mc.classList.remove('fade-up'), 400);
  ({ dashboard: renderDashboard, markets: renderMarkets, portfolio: renderPortfolio, predictor: renderPredictor, orders: renderOrders })[sec]?.();
}

// ── CHART HELPERS ───────────────────────────────────────────────────
function genOHLC(n, start, end) {
  const data = []; let c = start;
  const step = (end - start) / n;
  for (let i = 0; i < n; i++) {
    const o = c;
    const move = (Math.random() - 0.46) * start * 0.009 + step;
    c = Math.max(start * 0.85, o + move);
    const h = Math.max(o, c) * (1 + Math.random() * 0.004);
    const l = Math.min(o, c) * (1 - Math.random() * 0.004);
    data.push({ o: +o.toFixed(2), h: +h.toFixed(2), l: +l.toFixed(2), c: +c.toFixed(2) });
  }
  return data;
}

function genLine(n, start, end) {
  const pts = []; let v = start;
  for (let i = 0; i < n; i++) {
    v += (end - start) / n + (Math.random() - 0.47) * Math.abs(end - start) / 6;
    pts.push(Math.max(start * 0.92, v));
  }
  pts[pts.length - 1] = end; return pts;
}

function drawCandleChart(id, data, accent) {
  const canvas = $(id); if (!canvas) return;
  const par = canvas.parentElement;
  canvas.width  = par.offsetWidth  || 500;
  canvas.height = par.offsetHeight || 210;
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  const pL = 6, pR = 6, pT = 10, pB = 10;
  const cw = (W - pL - pR) / data.length;
  const bw = Math.max(1.5, cw * 0.56);
  const allV = data.flatMap(d => [d.h, d.l]);
  const minV = Math.min(...allV), maxV = Math.max(...allV), rng = maxV - minV || 1;
  const toY = v => pT + (H - pT - pB) * (1 - (v - minV) / rng);
  ctx.clearRect(0, 0, W, H);
  for (let i = 0; i < 5; i++) {
    const y = pT + (H - pT - pB) * i / 4;
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y);
    ctx.strokeStyle = 'rgba(30,48,72,0.5)'; ctx.lineWidth = 1; ctx.stroke();
  }
  data.forEach((d, i) => {
    const bull = d.c >= d.o, x = pL + i * cw + cw / 2;
    const oY = toY(d.o), cY = toY(d.c);
    ctx.beginPath(); ctx.moveTo(x, toY(d.h)); ctx.lineTo(x, toY(d.l));
    ctx.strokeStyle = bull ? '#00e5a0' : '#ff4d6d'; ctx.lineWidth = 1; ctx.stroke();
    const top = Math.min(oY, cY), bh = Math.max(1.5, Math.abs(cY - oY));
    ctx.fillStyle = bull ? '#00e5a0' : '#ff4d6d';
    ctx.fillRect(x - bw / 2, top, bw, bh);
  });
  const lastY = toY(data[data.length - 1].c);
  ctx.setLineDash([3, 4]);
  ctx.beginPath(); ctx.moveTo(0, lastY); ctx.lineTo(W, lastY);
  ctx.strokeStyle = (accent || '#4d9fff') + '77'; ctx.lineWidth = 1; ctx.stroke();
  ctx.setLineDash([]);
}

function drawLineChart(id, pts, color) {
  const canvas = $(id); if (!canvas) return;
  const par = canvas.parentElement;
  canvas.width  = par.offsetWidth  || 500;
  canvas.height = par.offsetHeight || 210;
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height, pad = 10;
  const min = Math.min(...pts) * 0.998, max = Math.max(...pts) * 1.001, rng = max - min || 1;
  const sx = (W - 2 * pad) / (pts.length - 1);
  const sy = (H - 2 * pad) / rng;
  ctx.clearRect(0, 0, W, H);
  for (let i = 0; i < 5; i++) {
    const y = pad + (H - 2 * pad) * i / 4;
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y);
    ctx.strokeStyle = 'rgba(30,48,72,0.5)'; ctx.lineWidth = 1; ctx.stroke();
  }
  const grad = ctx.createLinearGradient(0, pad, 0, H - pad);
  grad.addColorStop(0, color + '40'); grad.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.beginPath();
  pts.forEach((p, i) => { const x = pad + i * sx, y = H - pad - (p - min) * sy; i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); });
  ctx.lineTo(pad + (pts.length - 1) * sx, H - pad); ctx.lineTo(pad, H - pad); ctx.closePath();
  ctx.fillStyle = grad; ctx.fill();
  ctx.beginPath();
  pts.forEach((p, i) => { const x = pad + i * sx, y = H - pad - (p - min) * sy; i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); });
  ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.lineJoin = 'round'; ctx.stroke();
}

function drawMiniCandle(canvas, data) {
  if (!canvas) return;
  canvas.width = 70; canvas.height = 24;
  const ctx = canvas.getContext('2d');
  const W = 70, H = 24, cw = W / data.length, bw = Math.max(1.2, cw * 0.55);
  const vals = data.flatMap(d => [d.h, d.l]);
  const mn = Math.min(...vals), mx = Math.max(...vals), rng = mx - mn || 1;
  const toY = v => 2 + (H - 4) * (1 - (v - mn) / rng);
  data.forEach((d, i) => {
    const bull = d.c >= d.o, x = i * cw + cw / 2;
    ctx.beginPath(); ctx.moveTo(x, toY(d.h)); ctx.lineTo(x, toY(d.l));
    ctx.strokeStyle = bull ? '#00e5a0' : '#ff4d6d'; ctx.lineWidth = 0.8; ctx.stroke();
    const top = Math.min(toY(d.o), toY(d.c)), bh = Math.max(1, Math.abs(toY(d.o) - toY(d.c)));
    ctx.fillStyle = bull ? '#00e5a0' : '#ff4d6d'; ctx.fillRect(x - bw / 2, top, bw, bh);
  });
}

function redrawCandle(cid, period, btn) {
  document.querySelectorAll('.chart-tab').forEach(t => t.classList.remove('active'));
  if (btn) btn.classList.add('active');
  const n = period === '1D' ? 50 : period === '1W' ? 35 : 80;
  const base = S.indices[0] ? S.indices[0].val * 0.95 : 23600;
  const cur  = S.indices[0] ? S.indices[0].val : 24850;
  drawCandleChart(cid, genOHLC(n, base, cur), '#4d9fff');
}

// ══════════════════════════════════════════════════════════════════
//  DASHBOARD
// ══════════════════════════════════════════════════════════════════
function renderDashboard() {
  const p = S.portfolio;
  $('main-content').innerHTML = `
  <div class="section-title">Market Overview</div>
  <div class="ibar" id="ibar"></div>
  <div class="g4">
    <div class="card mcard" style="--mc-glow:rgba(0,229,160,.1)"><div class="card-label">Total Portfolio Value</div><div class="card-value lg up" id="d-total">Rs.${fmtN(p.totalValue)}</div><div class="card-sub">Started: Rs.10,00,000</div></div>
    <div class="card mcard" style="--mc-glow:rgba(77,159,255,.08)"><div class="card-label">Available Cash</div><div class="card-value" id="d-cash">Rs.${fmtN(p.cash)}</div><div class="card-sub">Deployable funds</div></div>
    <div class="card mcard"><div class="card-label">Invested Value</div><div class="card-value" id="d-inv">Rs.${fmtN(p.invested)}</div><div class="card-sub">${p.holdingsCount || 0} positions open</div></div>
    <div class="card mcard" style="--mc-glow:${p.pnl >= 0 ? 'rgba(0,229,160,.1)' : 'rgba(255,77,109,.1)'}"><div class="card-label">Unrealised P&amp;L</div><div class="card-value ${cls(p.pnl)}" id="d-pnl">${sign(p.pnl)}Rs.${fmtN(Math.abs(p.pnl))}</div><div class="card-sub">${p.invested > 0 ? ((p.pnl / p.invested) * 100).toFixed(2) + '% return' : 'No positions yet'}</div></div>
  </div>
  <div class="g2">
    <div class="chart-area">
      <div class="chart-header">
        <div><div style="font-family:'Syne',sans-serif;font-size:14px;font-weight:700;">NIFTY 50 — Candlestick</div><div style="font-size:11px;color:var(--text2);">NSE · Simulated OHLC</div></div>
        <div class="chart-tabs">
          <button class="chart-tab active" onclick="redrawCandle('c-nifty','1D',this)">1D</button>
          <button class="chart-tab" onclick="redrawCandle('c-nifty','1W',this)">1W</button>
          <button class="chart-tab" onclick="redrawCandle('c-nifty','1M',this)">1M</button>
        </div>
      </div>
      <div class="chart-box" style="height:210px;"><canvas id="c-nifty"></canvas></div>
    </div>
    <div class="chart-area">
      <div class="chart-header">
        <div><div style="font-family:'Syne',sans-serif;font-size:14px;font-weight:700;">Portfolio Performance</div><div style="font-size:11px;color:var(--text2);">Simulated trend</div></div>
        <div style="font-family:'DM Mono',monospace;font-size:16px;font-weight:600;" class="up">Rs.${fmtN(p.totalValue)}</div>
      </div>
      <div class="chart-box" style="height:210px;"><canvas id="c-port"></canvas></div>
    </div>
  </div>
  <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;">
    <div style="font-family:'Syne',sans-serif;font-size:15px;font-weight:700;">Gold &amp; Silver ETFs</div>
    <span style="font-size:11px;color:var(--text2);">NSE Listed · Paper Trade</span>
  </div>
  <div class="etf-grid" id="etf-grid"></div>
  <div class="g2">
    <div class="card"><div style="display:flex;justify-content:space-between;margin-bottom:12px;"><div style="font-family:'Syne',sans-serif;font-size:14px;font-weight:700;">Top Gainers</div><span style="font-size:11px;color:var(--text2);">Today</span></div><div id="gainers"></div></div>
    <div class="card"><div style="display:flex;justify-content:space-between;margin-bottom:12px;"><div style="font-family:'Syne',sans-serif;font-size:14px;font-weight:700;">Top Losers</div><span style="font-size:11px;color:var(--text2);">Today</span></div><div id="losers"></div></div>
  </div>
  <div class="card"><div style="font-family:'Syne',sans-serif;font-size:14px;font-weight:700;margin-bottom:12px;">Sector Performance</div><div class="sector-grid" id="sectors"></div></div>`;

  renderIndexBar(); renderEtfGrid(); renderGainersLosers(); renderSectors();
  setTimeout(() => {
    const nBase = S.indices[0] ? S.indices[0].val * 0.95 : 23600;
    const nCur  = S.indices[0] ? S.indices[0].val : 24850;
    drawCandleChart('c-nifty', genOHLC(50, nBase, nCur), '#4d9fff');
    drawLineChart('c-port', genLine(40, 1000000, p.totalValue || 1000000), '#00e5a0');
  }, 80);
}

function updateDashboardMetrics() {
  const p = S.portfolio;
  const s = (id, v) => { const el = $(id); if (el) el.textContent = v; };
  s('d-total', 'Rs.' + fmtN(p.totalValue)); s('d-cash', 'Rs.' + fmtN(p.cash));
  s('d-inv',   'Rs.' + fmtN(p.invested));   s('d-pnl', sign(p.pnl) + 'Rs.' + fmtN(Math.abs(p.pnl)));
  renderIndexBar();
}

function renderIndexBar() {
  const el = $('ibar'); if (!el) return;
  el.innerHTML = S.indices.slice(0, 5).map(i => `
    <div class="icard"><div class="iname">${i.name}</div><div class="ival">${fmtN(i.val)}</div><div class="ichg ${cls(i.chg)}">${i.chg >= 0 ? '▲' : '▼'} ${sign(i.chg)}${Math.abs(i.chg).toFixed(2)}%</div></div>`).join('');
}

function renderEtfGrid() {
  const el = $('etf-grid'); if (!el) return;
  el.innerHTML = S.etfs.map(e => `
    <div class="etf-card" onclick="selectStock('${e.sym}')" style="border-color:${e.color}22;">
      <div style="position:absolute;top:0;right:0;width:70px;height:70px;border-radius:50%;background:radial-gradient(circle,${e.color}18,transparent 70%);pointer-events:none;"></div>
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:9px;">
        <div style="width:28px;height:28px;border-radius:7px;background:${e.color}22;border:1px solid ${e.color}44;display:flex;align-items:center;justify-content:center;font-size:14px;">${e.sector.includes('Gold') ? '🥇' : '🥈'}</div>
        <div><div style="font-size:13px;font-weight:700;">${e.sym}</div><div style="font-size:10px;color:var(--text3);">${e.sector}</div></div>
      </div>
      <div style="font-family:'DM Mono',monospace;font-size:19px;font-weight:600;">Rs.${(+e.price).toFixed(2)}</div>
      <div class="${cls(e.chg)}" style="font-family:'DM Mono',monospace;font-size:12px;margin-top:3px;">${sign(e.chg)}${Math.abs(e.chg).toFixed(2)}%</div>
      <div style="font-size:10px;color:var(--text3);margin:5px 0 8px;">${e.name}</div>
      <button onclick="event.stopPropagation();selectStock('${e.sym}')" style="width:100%;padding:7px;background:${e.color}18;border:1px solid ${e.color}44;border-radius:8px;color:${e.color};font-size:12px;font-weight:700;cursor:pointer;font-family:'DM Sans',sans-serif;">Trade ETF</button>
    </div>`).join('');
}

function renderGainersLosers() {
  const all = allInstr();
  const sorted = [...all].sort((a, b) => b.chg - a.chg);
  const row = s => `<div class="si" onclick="selectStock('${s.sym}')"><div class="si-icon">${s.sym.slice(0,2)}</div><div class="si-info"><div class="si-name">${s.sym}</div><div class="si-sub">${s.sector}</div></div><div class="si-right"><div class="si-price">Rs.${fmt(s.price)}</div><div class="si-chg ${cls(s.chg)}">${sign(s.chg)}${Math.abs(s.chg).toFixed(2)}%</div></div></div>`;
  const g = $('gainers'); if (g) g.innerHTML = sorted.slice(0, 5).map(row).join('');
  const l = $('losers');  if (l) l.innerHTML = sorted.slice(-5).reverse().map(row).join('');
}

const SECTORS = [{n:'Banking',c:1.2,p:78},{n:'IT',c:0.8,p:62},{n:'Energy',c:2.1,p:85},{n:'FMCG',c:-0.3,p:40},{n:'Auto',c:1.5,p:72},{n:'Pharma',c:-0.5,p:38},{n:'Metals',c:-1.1,p:28},{n:'Telecom',c:2.3,p:88}];
function renderSectors() {
  const el = $('sectors'); if (!el) return;
  el.innerHTML = SECTORS.map(s => `<div class="sector-item"><div class="sector-name">${s.n}</div><div class="sector-bar-wrap"><div class="sector-bar" style="width:${s.p}%;background:${s.c >= 0 ? 'var(--accent)' : 'var(--red)'};"></div></div><div class="sector-chg ${cls(s.c)}">${sign(s.c)}${Math.abs(s.c).toFixed(2)}%</div></div>`).join('');
}

// ══════════════════════════════════════════════════════════════════
//  MARKETS
// ══════════════════════════════════════════════════════════════════
function renderMarkets() {
  const mc = $('main-content');
  mc.innerHTML = `
  <div class="section-title">All Markets</div>
  <div style="font-family:'Syne',sans-serif;font-size:13px;font-weight:600;color:var(--text2);margin-bottom:9px;">Indices</div>
  <div style="display:grid;grid-template-columns:repeat(5,1fr);gap:9px;margin-bottom:20px;">
    ${S.indices.map(i => `<div class="card card-sm"><div class="iname">${i.name}</div><div class="ival" style="font-size:16px;">${fmtN(i.val)}</div><div class="ichg ${cls(i.chg)}">${i.chg >= 0 ? '▲' : '▼'} ${sign(i.chg)}${Math.abs(i.chg).toFixed(2)}%</div></div>`).join('')}
  </div>
  <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px;">
    <div style="font-family:'Syne',sans-serif;font-size:13px;font-weight:600;color:var(--text2);">Gold &amp; Silver ETFs</div>
    <span style="font-size:10px;padding:2px 8px;border-radius:100px;background:rgba(245,200,66,.12);color:#f5c842;border:1px solid rgba(245,200,66,.2);font-weight:600;">NSE</span>
  </div>
  <div class="etf-grid" style="margin-bottom:20px;" id="m-etf"></div>
  <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;">
    <div style="font-family:'Syne',sans-serif;font-size:13px;font-weight:600;color:var(--text2);">Nifty 50 Stocks</div>
    <input style="background:var(--bg2);border:1px solid var(--border);border-radius:8px;padding:7px 13px;color:var(--text);font-size:12px;font-family:'DM Sans',sans-serif;outline:none;width:190px;" placeholder="Filter..." oninput="filterMktTable(this.value)">
  </div>
  <div class="card" style="padding:0;">
    <div class="table-wrap"><table>
      <thead><tr><th>Symbol</th><th>Company</th><th>Sector</th><th>Price</th><th>Change</th><th>Volume</th><th>Mkt Cap</th><th>Chart</th><th>Trade</th></tr></thead>
      <tbody id="mkt-tbody"></tbody>
    </table></div>
  </div>`;

  const etfEl = $('m-etf');
  if (etfEl) etfEl.innerHTML = S.etfs.map(e => `
    <div class="etf-card" onclick="selectStock('${e.sym}')" style="border-color:${e.color}22;">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px;">
        <div><div style="font-size:13px;font-weight:700;">${e.sym}</div><div style="font-size:10px;color:var(--text3);">${e.name}</div></div>
        <span style="font-size:10px;padding:2px 7px;border-radius:100px;background:${e.color}18;color:${e.color};font-weight:600;border:1px solid ${e.color}33;">${e.sector.includes('Gold') ? 'GOLD' : 'SILVER'}</span>
      </div>
      <div style="font-family:'DM Mono',monospace;font-size:19px;font-weight:600;">Rs.${(+e.price).toFixed(2)}</div>
      <div style="display:flex;justify-content:space-between;align-items:center;margin-top:5px;">
        <span class="${cls(e.chg)}" style="font-family:'DM Mono',monospace;font-size:12px;">${sign(e.chg)}${Math.abs(e.chg).toFixed(2)}%</span>
        <button onclick="event.stopPropagation();selectStock('${e.sym}')" style="padding:5px 12px;background:${e.color}18;border:1px solid ${e.color}33;border-radius:6px;color:${e.color};font-size:11px;font-weight:700;cursor:pointer;font-family:'DM Sans',sans-serif;">Trade</button>
      </div>
    </div>`).join('');

  renderMktTable(S.stocks);
}

function renderMktTable(list) {
  const tb = $('mkt-tbody'); if (!tb) return;
  tb.innerHTML = list.map(s => `
    <tr>
      <td><strong class="mono">${s.sym}</strong></td>
      <td style="color:var(--text2);font-size:12px;max-width:140px;overflow:hidden;text-overflow:ellipsis;">${s.name}</td>
      <td><span style="font-size:10px;padding:2px 8px;border-radius:100px;background:var(--card2);color:var(--text2);">${s.sector}</span></td>
      <td class="mono">Rs.${(+s.price).toLocaleString('en-IN',{minimumFractionDigits:2,maximumFractionDigits:2})}</td>
      <td class="mono ${cls(s.chg)}">${sign(s.chg)}${Math.abs(s.chg).toFixed(2)}%</td>
      <td class="mono" style="color:var(--text2);">${s.vol}</td>
      <td class="mono" style="color:var(--text2);">${s.cap}</td>
      <td><canvas id="spk-${s.sym}" width="70" height="24"></canvas></td>
      <td><button onclick="selectStock('${s.sym}')" style="padding:5px 12px;background:var(--glow);border:1px solid var(--accent);border-radius:6px;color:var(--accent);font-size:11px;font-weight:700;cursor:pointer;font-family:'DM Sans',sans-serif;">Trade</button></td>
    </tr>`).join('');
  requestAnimationFrame(() => { list.forEach(s => { const c = $('spk-' + s.sym); if (c) drawMiniCandle(c, genOHLC(14, s.price * 0.985, s.price)); }); });
}

function filterMktTable(q) {
  const r = q.toLowerCase();
  renderMktTable(S.stocks.filter(s => s.sym.toLowerCase().includes(r) || s.name.toLowerCase().includes(r) || s.sector.toLowerCase().includes(r)));
}

// ══════════════════════════════════════════════════════════════════
//  PORTFOLIO
// ══════════════════════════════════════════════════════════════════
function renderPortfolio() {
  const p = S.portfolio;
  const ret = p.invested > 0 ? ((p.pnl / p.invested) * 100).toFixed(2) : '0.00';
  $('main-content').innerHTML = `
  <div class="section-title">My Portfolio</div>
  <div class="g3">
    <div class="card mcard" style="--mc-glow:rgba(0,229,160,.1)"><div class="card-label">Total Value</div><div class="card-value lg up">Rs.${fmtN(p.totalValue)}</div><div class="card-sub">Started: Rs.10,00,000</div></div>
    <div class="card mcard"><div class="card-label">Available Cash</div><div class="card-value">Rs.${fmtN(p.cash)}</div><div class="card-sub">Free to deploy</div></div>
    <div class="card mcard" style="--mc-glow:${p.pnl >= 0 ? 'rgba(0,229,160,.1)' : 'rgba(255,77,109,.1)'}"><div class="card-label">Unrealised P&amp;L</div><div class="card-value ${cls(p.pnl)}">${sign(p.pnl)}Rs.${fmtN(Math.abs(p.pnl))}</div><div class="card-sub">${sign(+ret)}${ret}% overall return</div></div>
  </div>
  ${S.holdings.length === 0 ? `
    <div class="card" style="text-align:center;padding:60px;">
      <div style="font-size:44px;margin-bottom:12px;">📈</div>
      <div style="font-family:'Syne',sans-serif;font-size:19px;font-weight:700;margin-bottom:7px;">No Holdings Yet</div>
      <div style="color:var(--text2);margin-bottom:16px;">Start trading to build your portfolio</div>
      <button onclick="showSection('markets')" style="padding:11px 24px;background:var(--accent);border:none;border-radius:10px;color:#000;font-weight:700;font-size:14px;cursor:pointer;font-family:'DM Sans',sans-serif;">Explore Markets</button>
    </div>` : `
    <div style="font-family:'Syne',sans-serif;font-size:14px;font-weight:700;margin-bottom:10px;">Open Positions</div>
    <div class="positions-grid">${S.holdings.map(h => `
      <div class="pos-card" style="border:1px solid ${h.pnl >= 0 ? 'rgba(0,229,160,.2)' : 'rgba(255,77,109,.2)'};">
        <div class="pos-name">${h.sym}</div>
        <div class="pos-sub">${h.qty} units @ Rs.${(+h.avgPrice).toFixed(2)}</div>
        <div class="pos-pnl ${cls(h.pnl)}">${sign(h.pnl)}Rs.${fmtN(Math.abs(h.pnl))}</div>
        <div class="pos-pct ${cls(h.pnlPct)}">${sign(h.pnlPct)}${Math.abs(h.pnlPct).toFixed(2)}%</div>
        <button class="pos-exit-btn" onclick="openExitForSym('${h.sym}')">Exit Position</button>
      </div>`).join('')}
    </div>
    <div class="card" style="padding:0;"><div class="table-wrap"><table>
      <thead><tr><th>Symbol</th><th>Qty</th><th>Avg Price</th><th>LTP</th><th>Invested</th><th>Current</th><th>P&amp;L</th><th>Return</th></tr></thead>
      <tbody>${S.holdings.map(h => `<tr>
        <td><strong class="mono">${h.sym}</strong></td><td class="mono">${h.qty}</td>
        <td class="mono">Rs.${(+h.avgPrice).toFixed(2)}</td><td class="mono">Rs.${(+h.ltp).toFixed(2)}</td>
        <td class="mono">Rs.${fmtN(h.investedValue)}</td><td class="mono">Rs.${fmtN(h.currentValue)}</td>
        <td><span class="badge ${h.pnl >= 0 ? 'badge-profit' : 'badge-loss'}">${sign(h.pnl)}Rs.${fmtN(Math.abs(h.pnl))}</span></td>
        <td class="mono ${cls(h.pnlPct)}">${sign(h.pnlPct)}${Math.abs(h.pnlPct).toFixed(2)}%</td>
      </tr>`).join('')}</tbody>
    </table></div></div>`}`;
}

// ══════════════════════════════════════════════════════════════════
//  AI PREDICTOR
// ══════════════════════════════════════════════════════════════════
function renderPredictor() {
  $('main-content').innerHTML = `
  <div class="section-title">AI Stock Predictor</div>
  <div class="pred-card">
    <div style="display:flex;align-items:center;gap:11px;margin-bottom:18px;">
      <div class="pred-icon"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#00e5a0" stroke-width="2" stroke-linecap="round"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg></div>
      <div><div style="font-family:'Syne',sans-serif;font-size:16px;font-weight:700;">AI-Powered Market Prediction</div><div style="font-size:12px;color:var(--text2);">Technical analysis + sentiment model for Indian markets</div></div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:11px;margin-bottom:16px;">
      <div><label style="font-size:11px;color:var(--text2);display:block;margin-bottom:6px;font-weight:500;">Select Stock / ETF</label>
        <select id="pred-sym" style="width:100%;background:var(--bg2);border:1px solid var(--border);border-radius:9px;padding:10px 13px;color:var(--text);font-size:13px;font-family:'DM Sans',sans-serif;outline:none;cursor:pointer;">
          <optgroup label="Nifty 50 Stocks">${S.stocks.map(s => `<option value="${s.sym}">${s.sym}</option>`).join('')}</optgroup>
          <optgroup label="Gold &amp; Silver ETFs">${S.etfs.map(e => `<option value="${e.sym}">${e.sym} (${e.sector})</option>`).join('')}</optgroup>
        </select></div>
      <div><label style="font-size:11px;color:var(--text2);display:block;margin-bottom:6px;font-weight:500;">Horizon</label>
        <select id="pred-hz" style="width:100%;background:var(--bg2);border:1px solid var(--border);border-radius:9px;padding:10px 13px;color:var(--text);font-size:13px;font-family:'DM Sans',sans-serif;outline:none;cursor:pointer;">
          <option value="1D">1 Day</option><option value="1W" selected>1 Week</option><option value="1M">1 Month</option>
        </select></div>
      <div style="display:flex;align-items:flex-end;"><button onclick="runPredictor()" id="pred-btn" style="width:100%;padding:11px;background:linear-gradient(135deg,var(--accent),var(--blue));border:none;border-radius:9px;color:#000;font-size:14px;font-weight:700;font-family:'DM Sans',sans-serif;cursor:pointer;">Run AI Prediction</button></div>
    </div>
    <div id="pred-result" class="hide"></div>
  </div>
  <div style="font-family:'Syne',sans-serif;font-size:14px;font-weight:700;margin-bottom:12px;">Quick Signals</div>
  <div class="g3" id="q-signals"></div>`;
  renderQuickSignals();
}

function renderQuickSignals() {
  const el = $('q-signals'); if (!el) return;
  const picks = [...S.stocks.slice(0, 4), ...S.etfs.slice(0, 2)];
  el.innerHTML = picks.map(s => {
    const bull = Math.min(93, Math.max(32, Math.round(50 + s.chg * 7 + (s.price % 13))));
    const isBull = bull > 55;
    return `<div class="pred-card" style="cursor:pointer;margin-bottom:0;" onclick="autoPredict('${s.sym}')">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px;">
        <div><div style="font-family:'Syne',sans-serif;font-weight:700;font-size:14px;">${s.sym}</div><div style="font-size:11px;color:var(--text2);">${s.name}</div></div>
        <div style="text-align:right;"><div style="font-family:'DM Mono',monospace;font-size:13px;">Rs.${fmt(s.price)}</div><div class="${cls(s.chg)}" style="font-size:11px;">${sign(s.chg)}${Math.abs(s.chg).toFixed(2)}%</div></div>
      </div>
      <div style="display:flex;justify-content:space-between;font-size:11px;color:var(--text2);margin-bottom:5px;">
        <span>Signal: <strong style="color:${isBull ? 'var(--accent)' : 'var(--red)'};">${isBull ? 'BULLISH' : 'BEARISH'}</strong></span>
        <span>${bull}% conf.</span>
      </div>
      <div class="pmeter"><div class="pfill ${isBull ? 'bull' : 'bear'}" style="width:${bull}%;"></div></div>
    </div>`;
  }).join('');
}

async function runPredictor() {
  const sym = $('pred-sym').value, hz = $('pred-hz').value;
  const btn = $('pred-btn'), res = $('pred-result');
  btn.disabled = true; btn.textContent = 'Analysing...';
  res.classList.remove('hide');
  res.innerHTML = '<div style="text-align:center;padding:20px;color:var(--text2);">Fetching AI signal...</div>';
  try {
    const d = await API.predict(sym, hz);
    const isBull = d.signal === 'BULLISH';
    res.innerHTML = `
      <div style="background:var(--bg2);border-radius:12px;padding:17px;">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:12px;">
          <div><div style="font-family:'Syne',sans-serif;font-size:16px;font-weight:700;">${d.sym} — ${hz === '1D' ? '1 Day' : hz === '1W' ? '1 Week' : '1 Month'} Outlook</div><div style="font-size:11px;color:var(--text2);margin-top:3px;">RSI · MACD · Bollinger · Volume · Sentiment</div></div>
          <div style="text-align:right;"><div style="font-size:21px;font-weight:800;font-family:'Syne',sans-serif;color:${isBull ? 'var(--accent)' : 'var(--red)'};">${isBull ? '▲ BULLISH' : '▼ BEARISH'}</div><div style="font-size:11px;color:var(--text2);">${d.confidence}% confidence</div></div>
        </div>
        <div class="pmeter"><div class="pfill ${isBull ? 'bull' : 'bear'}" style="width:${d.confidence}%;"></div></div>
        <div class="ptargets" style="margin-top:13px;">
          <div class="pt"><label>Target 1</label><span class="up">Rs.${d.target1}</span></div>
          <div class="pt"><label>Target 2</label><span class="up">Rs.${d.target2}</span></div>
          <div class="pt"><label>Stop Loss</label><span class="down">Rs.${d.stopLoss}</span></div>
        </div>
        <div style="margin-top:13px;background:var(--card2);border-radius:9px;padding:12px;">
          <div style="font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:.7px;color:var(--text3);margin-bottom:7px;">Technical Indicators</div>
          ${Object.entries(d.signals).map(([k, v]) => `<div style="display:flex;justify-content:space-between;padding:3px 0;font-size:11px;border-top:1px solid var(--border);"><span style="color:var(--text2);">${k.toUpperCase()}</span><span>${v}</span></div>`).join('')}
        </div>
        <div style="margin-top:11px;font-size:12px;color:var(--text2);line-height:1.6;">${d.analysis}</div>
        <div style="margin-top:8px;font-size:11px;color:var(--text3);padding:7px 10px;background:rgba(245,200,66,.08);border-radius:7px;border-left:2px solid var(--gold);">${d.disclaimer}</div>
      </div>`;
  } catch (e) {
    res.innerHTML = `<div style="color:var(--red);text-align:center;padding:14px;">${e.message}</div>`;
  } finally { btn.disabled = false; btn.textContent = 'Run AI Prediction'; }
}

function autoPredict(sym) {
  const sel = $('pred-sym'); if (sel) sel.value = sym;
  runPredictor();
  const r = $('pred-result'); if (r) r.scrollIntoView({ behavior: 'smooth' });
}

// ══════════════════════════════════════════════════════════════════
//  ORDERS
// ══════════════════════════════════════════════════════════════════
function renderOrders() {
  $('main-content').innerHTML = `
  <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:18px;">
    <div class="section-title" style="margin-bottom:0;">Order Book</div>
    <div style="display:flex;gap:9px;">
      <button onclick="openAddModal()" style="display:flex;align-items:center;gap:6px;padding:9px 16px;background:linear-gradient(135deg,var(--accent),var(--accent2));border:none;border-radius:9px;color:#000;font-size:13px;font-weight:700;cursor:pointer;font-family:'DM Sans',sans-serif;">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>Add Position
      </button>
      <button onclick="openExitModal()" style="display:flex;align-items:center;gap:6px;padding:9px 16px;background:rgba(255,77,109,.12);border:1px solid var(--red);border-radius:9px;color:var(--red);font-size:13px;font-weight:700;cursor:pointer;font-family:'DM Sans',sans-serif;">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 10 4 15 9 20"/><path d="M20 4v7a4 4 0 01-4 4H4"/></svg>Exit Position
      </button>
    </div>
  </div>
  ${S.holdings.length > 0 ? `
    <div style="font-family:'Syne',sans-serif;font-size:14px;font-weight:700;margin-bottom:10px;">Open Positions</div>
    <div class="positions-grid" style="margin-bottom:18px;">
      ${S.holdings.map(h => `<div class="pos-card" style="border:1px solid ${h.pnl >= 0 ? 'rgba(0,229,160,.2)' : 'rgba(255,77,109,.2)'};">
        <div class="pos-name">${h.sym}</div><div class="pos-sub">${h.qty} units @ Rs.${(+h.avgPrice).toFixed(2)}</div>
        <div class="pos-pnl ${cls(h.pnl)}">${sign(h.pnl)}Rs.${fmtN(Math.abs(h.pnl))}</div>
        <div class="pos-pct ${cls(h.pnlPct)}">${sign(h.pnlPct)}${Math.abs(h.pnlPct).toFixed(2)}%</div>
        <button class="pos-exit-btn" onclick="openExitForSym('${h.sym}')">Exit Position</button>
      </div>`).join('')}
    </div>` : ''}
  <div class="card" style="padding:0;">
    <div style="padding:13px 18px;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;">
      <div style="font-family:'Syne',sans-serif;font-size:14px;font-weight:700;">All Orders (${S.orders.length})</div>
      <div style="display:flex;gap:5px;" id="ofrow">
        <button onclick="filterOrd('all',this)" style="padding:4px 10px;border-radius:6px;background:var(--glow);border:1px solid var(--accent);color:var(--accent);font-size:11px;font-weight:600;cursor:pointer;font-family:'DM Sans',sans-serif;">All</button>
        <button onclick="filterOrd('buy',this)" style="padding:4px 10px;border-radius:6px;background:transparent;border:1px solid var(--border2);color:var(--text2);font-size:11px;cursor:pointer;font-family:'DM Sans',sans-serif;">Buy</button>
        <button onclick="filterOrd('sell',this)" style="padding:4px 10px;border-radius:6px;background:transparent;border:1px solid var(--border2);color:var(--text2);font-size:11px;cursor:pointer;font-family:'DM Sans',sans-serif;">Sell</button>
      </div>
    </div>
    ${S.orders.length === 0 ? `<div style="text-align:center;padding:50px;color:var(--text3);"><div style="font-size:36px;margin-bottom:10px;">📋</div><div style="font-family:'Syne',sans-serif;font-size:16px;font-weight:700;margin-bottom:5px;">No Orders Yet</div><div style="font-size:13px;">Click "Add Position" to place your first trade</div></div>` :
    `<div class="table-wrap"><table><thead><tr><th>#</th><th>Time</th><th>Symbol</th><th>Type</th><th>Qty</th><th>Price</th><th>Value</th><th>LTP</th><th>P&amp;L</th><th>Status</th></tr></thead><tbody id="ord-tbody">${ordRowsHTML(S.orders)}</tbody></table></div>`}
  </div>`;
}

function ordRowsHTML(list) {
  return list.map((o, i) => `<tr>
    <td class="mono" style="color:var(--text3);">${i + 1}</td>
    <td style="color:var(--text2);font-size:11px;">${new Date(o.time).toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'})}</td>
    <td><strong class="mono">${o.sym}</strong></td>
    <td><span class="badge ${o.type === 'buy' ? 'badge-profit' : 'badge-loss'}">${o.type.toUpperCase()}</span></td>
    <td class="mono">${o.qty}</td><td class="mono">Rs.${(+o.price).toFixed(2)}</td>
    <td class="mono">Rs.${fmtN(o.qty * o.price)}</td><td class="mono">Rs.${(+o.ltp).toFixed(2)}</td>
    <td><span class="badge ${o.pnl >= 0 ? 'badge-profit' : 'badge-loss'}">${sign(o.pnl)}Rs.${fmtN(Math.abs(o.pnl))}</span></td>
    <td style="font-size:11px;color:var(--accent);">Executed</td>
  </tr>`).join('');
}

function filterOrd(type, btn) {
  document.querySelectorAll('#ofrow button').forEach(b => { b.style.background = 'transparent'; b.style.borderColor = 'var(--border2)'; b.style.color = 'var(--text2)'; });
  btn.style.background = 'var(--glow)'; btn.style.borderColor = 'var(--accent)'; btn.style.color = 'var(--accent)';
  const tb = $('ord-tbody');
  if (tb) tb.innerHTML = ordRowsHTML(type === 'all' ? S.orders : S.orders.filter(o => o.type === type));
}

// ══════════════════════════════════════════════════════════════════
//  ADD POSITION MODAL
// ══════════════════════════════════════════════════════════════════
function openAddModal() {
  const sel = $('ma-sym'); sel.innerHTML = '';
  const sg = document.createElement('optgroup'); sg.label = 'Nifty 50 Stocks';
  S.stocks.forEach(s => sg.appendChild(new Option(`${s.sym} — Rs.${(+s.price).toFixed(0)}`, s.sym)));
  const eg = document.createElement('optgroup'); eg.label = 'Gold & Silver ETFs';
  S.etfs.forEach(e => eg.appendChild(new Option(`${e.sym} — Rs.${(+e.price).toFixed(2)} (${e.sector})`, e.sym)));
  sel.appendChild(sg); sel.appendChild(eg);
  updateAddPreview();
  openModal('modal-add');
}

function updateAddPreview() {
  const sym  = $('ma-sym') && $('ma-sym').value;
  const qty  = parseInt(($('ma-qty') && $('ma-qty').value) || 1);
  const type = ($('ma-type') && $('ma-type').value) || 'buy';
  if (!sym) return;
  const inst = allInstr().find(s => s.sym === sym);
  if (!inst) return;
  const val = inst.price * qty, canAff = val <= S.portfolio.cash;
  const pv = $('add-preview'), cb = $('add-confirm-btn');
  if (pv) pv.innerHTML = `
    <div class="prev-row"><span>Instrument</span><strong>${sym}</strong></div>
    <div class="prev-row"><span>LTP</span><span class="mono up">Rs.${(+inst.price).toFixed(2)}</span></div>
    <div class="prev-row"><span>Quantity</span><span class="mono">${qty}</span></div>
    <div class="prev-row"><span>Order Value</span><span class="mono" style="color:var(--accent);">Rs.${fmtN(val)}</span></div>
    <div class="prev-row"><span>Available</span><span class="mono ${canAff ? 'up' : 'down'}">Rs.${fmtN(S.portfolio.cash)}</span></div>
    ${!canAff && type === 'buy' ? '<div style="color:var(--red);font-size:11px;margin-top:7px;">Insufficient funds for this order</div>' : ''}`;
  if (cb) { cb.className = type === 'buy' ? 'mbtn-buy' : 'mbtn-sell'; cb.textContent = `Confirm ${type === 'buy' ? 'Buy' : 'Sell'} Order`; }
}

async function confirmAdd() {
  const sym = $('ma-sym').value, qty = parseInt($('ma-qty').value) || 1, type = $('ma-type').value;
  const btn = $('add-confirm-btn');
  btn.disabled = true; btn.textContent = 'Placing...';
  try {
    const res = type === 'buy' ? await API.buy(sym, qty) : await API.sell(sym, qty);
    toast(`${type === 'buy' ? 'Bought' : 'Sold'} ${qty}x ${sym} @ Rs.${res.order.price}`, 'success');
    closeModal('modal-add');
    await loadPortfolio();
    if (S.section === 'orders') renderOrders();
    if (S.section === 'portfolio') renderPortfolio();
  } catch (e) { toast(e.message, 'error'); }
  finally { btn.disabled = false; btn.textContent = 'Confirm Order'; }
}

// ══════════════════════════════════════════════════════════════════
//  EXIT POSITION MODAL
// ══════════════════════════════════════════════════════════════════
function openExitModal() {
  const body = $('exit-modal-body');
  if (S.holdings.length === 0) {
    body.innerHTML = '<div style="text-align:center;padding:28px;color:var(--text3);">No open positions to exit.</div>';
  } else {
    body.innerHTML = `
      <div class="mfg"><label>Select Position</label>
        <select class="mfi" id="ex-sym" onchange="updateExitPreview()" style="cursor:pointer;">
          ${S.holdings.map(h => `<option value="${h.sym}">${h.sym} — ${h.qty} units @ Rs.${(+h.avgPrice).toFixed(2)}</option>`).join('')}
        </select></div>
      <div class="mfg"><label>Quantity to Exit</label><input class="mfi" type="number" id="ex-qty" value="1" min="1" oninput="updateExitPreview()"></div>
      <div class="prev-box" id="exit-prev"></div>
      <div class="modal-btns"><button class="mbtn-cancel" onclick="closeModal('modal-exit')">Cancel</button><button class="mbtn-sell" id="ex-btn" onclick="confirmExit()">Exit Position</button></div>`;
    setTimeout(updateExitPreview, 60);
  }
  openModal('modal-exit');
}

function openExitForSym(sym) {
  openExitModal();
  setTimeout(() => { const s = $('ex-sym'); if (s) { s.value = sym; updateExitPreview(); } }, 90);
}

function updateExitPreview() {
  const sym = $('ex-sym') && $('ex-sym').value, qty = parseInt(($('ex-qty') && $('ex-qty').value) || 1);
  if (!sym) return;
  const h = S.holdings.find(x => x.sym === sym), inst = allInstr().find(s => s.sym === sym);
  if (!h || !inst) return;
  const eQty = Math.min(qty, h.qty), proceeds = inst.price * eQty, pl = (inst.price - h.avgPrice) * eQty;
  const pv = $('exit-prev');
  if (pv) pv.innerHTML = `
    <div class="prev-row"><span>Position</span><strong>${sym}</strong></div>
    <div class="prev-row"><span>Held Qty</span><span class="mono">${h.qty} units</span></div>
    <div class="prev-row"><span>Avg Buy</span><span class="mono">Rs.${(+h.avgPrice).toFixed(2)}</span></div>
    <div class="prev-row"><span>Exit Price (LTP)</span><span class="mono">Rs.${(+inst.price).toFixed(2)}</span></div>
    <div class="prev-row"><span>Exit Qty</span><span class="mono">${eQty}</span></div>
    <div class="prev-row"><span>Proceeds</span><span class="mono up">Rs.${fmtN(proceeds)}</span></div>
    <div class="prev-row"><span style="font-weight:600;">Realised P&amp;L</span><span class="mono ${cls(pl)}" style="font-size:15px;font-weight:700;">${sign(pl)}Rs.${fmtN(Math.abs(pl))}</span></div>
    ${qty > h.qty ? `<div style="color:var(--red);font-size:11px;margin-top:6px;">Will exit all ${h.qty} units (max available)</div>` : ''}`;
}

async function confirmExit() {
  const sym = $('ex-sym').value, qty = parseInt($('ex-qty').value) || 1;
  const h = S.holdings.find(x => x.sym === sym);
  if (!h) { toast('Position not found', 'error'); return; }
  const exitQty = Math.min(qty, h.qty);
  const btn = $('ex-btn');
  btn.disabled = true; btn.textContent = 'Exiting...';
  try {
    const res = await API.sell(sym, exitQty);
    toast(`Exited ${exitQty}x ${sym} | P&L: ${sign(res.pnl)}Rs.${fmtN(Math.abs(res.pnl))}`, 'success');
    closeModal('modal-exit');
    await loadPortfolio();
    if (S.section === 'orders') renderOrders();
    if (S.section === 'portfolio') renderPortfolio();
  } catch (e) { toast(e.message, 'error'); }
  finally { btn.disabled = false; btn.textContent = 'Exit Position'; }
}

// ── MODAL HELPERS ───────────────────────────────────────────────────
function openModal(id)  { $(id).classList.add('active'); }
function closeModal(id) { $(id).classList.remove('active'); }

// ── QUICK TRADE PANEL ───────────────────────────────────────────────
function selectStock(sym) {
  S.currentSym = sym;
  const inst = allInstr().find(s => s.sym === sym);
  if (!inst) return;
  $('sel-stock-name').textContent = inst.name;
  updateTradePanel();
  document.querySelectorAll('.si').forEach(el => el.classList.remove('active'));
  const sb = $('sb-' + sym); if (sb) sb.classList.add('active');
}

function updateTradePanel() {
  const inst = allInstr().find(s => s.sym === S.currentSym);
  if (!inst) return;
  $('tr-sym').textContent = inst.sym;
  $('tr-ltp').textContent = 'Rs.' + (+inst.price).toFixed(2);
  $('tr-ltp').className   = 'mono ' + cls(inst.chg);
  $('tr-chg').textContent = sign(inst.chg) + Math.abs(inst.chg).toFixed(2) + '%';
  $('tr-chg').className   = 'mono ' + cls(inst.chg);
  $('tr-funds').textContent = 'Rs.' + fmtN(S.portfolio.cash);
  updateOrderValue();
}

function setTradeMode(mode, btn) {
  S.tradeMode = mode;
  document.querySelectorAll('.bst').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  const eb = $('exec-btn');
  eb.className = 'exec-btn ' + mode;
  eb.textContent = `Place ${mode === 'buy' ? 'Buy' : 'Sell'} Order`;
}

function changeQty(d) {
  const inp = $('qty-input');
  inp.value = Math.max(1, (parseInt(inp.value) || 1) + d);
  updateOrderValue();
}

function updateOrderValue() {
  if (!S.currentSym) return;
  const inst = allInstr().find(s => s.sym === S.currentSym);
  const qty  = parseInt($('qty-input').value) || 1;
  if (inst) $('order-val').textContent = 'Rs.' + fmtN(inst.price * qty);
}

async function executeTrade() {
  if (!S.currentSym) { toast('Select a stock first', 'error'); return; }
  const qty = parseInt($('qty-input').value) || 1;
  const btn = $('exec-btn');
  btn.disabled = true;
  try {
    const res = S.tradeMode === 'buy' ? await API.buy(S.currentSym, qty) : await API.sell(S.currentSym, qty);
    toast(`${S.tradeMode === 'buy' ? 'Bought' : 'Sold'} ${qty}x ${S.currentSym} @ Rs.${res.order.price}`, 'success');
    await loadPortfolio();
    if (S.section === 'portfolio') renderPortfolio();
    if (S.section === 'orders')    renderOrders();
  } catch (e) { toast(e.message, 'error'); }
  finally { btn.disabled = false; }
}

function buildRecentOrdersPanel() {
  const el = $('recent-orders-panel'); if (!el) return;
  if (!S.orders.length) { el.innerHTML = '<div style="color:var(--text3);font-size:12px;text-align:center;padding:14px;">No orders yet</div>'; return; }
  el.innerHTML = S.orders.slice(0, 6).map(o => `
    <div class="order-item">
      <div class="ot ${o.type}">${o.type === 'buy' ? 'B' : 'S'}</div>
      <div class="oi-info"><div class="oi-name">${o.sym}</div><div class="oi-det">${o.qty} @ Rs.${(+o.price).toFixed(0)} &middot; ${new Date(o.time).toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'})}</div></div>
      <div class="oi-pnl ${cls(o.pnl)}">${sign(o.pnl)}Rs.${fmtN(Math.abs(o.pnl))}</div>
    </div>`).join('');
}

// ── SEARCH ──────────────────────────────────────────────────────────
function handleSearch(q) {
  if (!q || q.length < 2) return;
  const r = q.toLowerCase();
  const found = allInstr().find(s => s.sym.toLowerCase().startsWith(r));
  if (found) selectStock(found.sym);
}

// ══════════════════════════════════════════════════════════════════
//  INIT — Check for existing session on page load
// ══════════════════════════════════════════════════════════════════
(async () => {
  const token = getToken(), user = getUser();
  if (token && user) {
    S.token = token; S.user = user;
    try { await API.me(); await bootApp(); } catch (e) { clearToken(); }
  }
})();
