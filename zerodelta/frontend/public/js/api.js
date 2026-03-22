// api.js – All backend communication
const API_BASE = '/api';

function getToken() { return localStorage.getItem('zd_token'); }
function setToken(t) { localStorage.setItem('zd_token', t); }
function clearToken() { localStorage.removeItem('zd_token'); localStorage.removeItem('zd_user'); }
function getUser() { try { return JSON.parse(localStorage.getItem('zd_user')); } catch { return null; } }
function setUser(u) { localStorage.setItem('zd_user', JSON.stringify(u)); }

async function apiFetch(path, opts = {}) {
  const headers = { 'Content-Type': 'application/json' };
  const token = getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${API_BASE}${path}`, { ...opts, headers: { ...headers, ...(opts.headers || {}) } });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

const API = {
  // Auth
  login: (email, password) => apiFetch('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  register: (body) => apiFetch('/auth/register', { method: 'POST', body: JSON.stringify(body) }),
  me: () => apiFetch('/auth/me'),

  // Market
  indices: () => apiFetch('/market/indices'),
  stocks: (q) => apiFetch('/market/stocks' + (q ? `?q=${q}` : '')),
  etfs: () => apiFetch('/market/etfs'),
  all: () => apiFetch('/market/all'),
  news: () => apiFetch('/market/news'),
  quote: (sym) => apiFetch(`/market/quote/${sym}`),
  candles: (sym, period = '1D') => apiFetch(`/market/candles/${sym}?period=${period}`),
  gainers: () => apiFetch('/market/gainers'),
  losers: () => apiFetch('/market/losers'),

  // Trade
  portfolio: () => apiFetch('/trade/portfolio'),
  holdings: () => apiFetch('/trade/holdings'),
  orders: () => apiFetch('/trade/orders'),
  buy: (sym, qty) => apiFetch('/trade/buy', { method: 'POST', body: JSON.stringify({ sym, qty }) }),
  sell: (sym, qty) => apiFetch('/trade/sell', { method: 'POST', body: JSON.stringify({ sym, qty }) }),
  watchlist: () => apiFetch('/trade/watchlist'),
  addWatch: (sym) => apiFetch('/trade/watchlist', { method: 'POST', body: JSON.stringify({ sym }) }),
  removeWatch: (sym) => apiFetch(`/trade/watchlist/${sym}`, { method: 'DELETE' }),
  predict: (sym, horizon = '1W') => apiFetch(`/trade/predict/${sym}?horizon=${horizon}`),
};

window.API = API;
window.getToken = getToken; window.setToken = setToken; window.clearToken = clearToken;
window.getUser = getUser; window.setUser = setUser;
