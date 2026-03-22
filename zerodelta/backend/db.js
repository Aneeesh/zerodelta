// db.js - In-memory database (replace with MongoDB/PostgreSQL for production)
const { v4: uuidv4 } = require('uuid');

const db = {
  users: [],
  portfolios: {},
  orders: {},
  holdings: {},
  watchlists: {},
};

// Seed a demo user
const bcrypt = require('bcryptjs');
const demoHash = bcrypt.hashSync('demo1234', 10);
const demoId = 'demo-user-001';
db.users.push({
  id: demoId,
  firstName: 'Arjun',
  lastName: 'Sharma',
  email: 'demo@zerodelta.in',
  mobile: '+91 9876543210',
  password: demoHash,
  createdAt: new Date().toISOString(),
});
db.portfolios[demoId] = {
  userId: demoId,
  cash: 1000000,
  virtualCapital: 1000000,
  createdAt: new Date().toISOString(),
};
db.orders[demoId] = [];
db.holdings[demoId] = [];
db.watchlists[demoId] = ['RELIANCE', 'TCS', 'HDFCBANK', 'INFY', 'SBIN', 'GOLDBEES', 'SILVERBEES'];

// DB helpers
const DB = {
  // Users
  findUserByEmail: (email) => db.users.find(u => u.email === email.toLowerCase()),
  findUserById: (id) => db.users.find(u => u.id === id),
  createUser: (data) => {
    const user = { id: uuidv4(), ...data, email: data.email.toLowerCase(), createdAt: new Date().toISOString() };
    db.users.push(user);
    db.portfolios[user.id] = { userId: user.id, cash: 1000000, virtualCapital: 1000000, createdAt: new Date().toISOString() };
    db.orders[user.id] = [];
    db.holdings[user.id] = [];
    db.watchlists[user.id] = ['RELIANCE', 'TCS', 'HDFCBANK', 'INFY', 'SBIN'];
    return user;
  },

  // Portfolio
  getPortfolio: (userId) => db.portfolios[userId],
  updatePortfolio: (userId, data) => { db.portfolios[userId] = { ...db.portfolios[userId], ...data }; return db.portfolios[userId]; },

  // Orders
  getOrders: (userId) => db.orders[userId] || [],
  addOrder: (userId, order) => {
    const o = { id: uuidv4(), userId, ...order, time: new Date().toISOString() };
    db.orders[userId].unshift(o);
    return o;
  },

  // Holdings
  getHoldings: (userId) => db.holdings[userId] || [],
  updateHolding: (userId, sym, qty, avgPrice) => {
    const holdings = db.holdings[userId];
    const idx = holdings.findIndex(h => h.sym === sym);
    if (qty <= 0) {
      if (idx > -1) db.holdings[userId].splice(idx, 1);
    } else {
      if (idx > -1) { holdings[idx].qty = qty; holdings[idx].avgPrice = avgPrice; }
      else holdings.push({ sym, qty, avgPrice, addedAt: new Date().toISOString() });
    }
    return db.holdings[userId];
  },
  getHolding: (userId, sym) => (db.holdings[userId] || []).find(h => h.sym === sym),

  // Watchlist
  getWatchlist: (userId) => db.watchlists[userId] || [],
  addToWatchlist: (userId, sym) => {
    if (!db.watchlists[userId].includes(sym)) db.watchlists[userId].push(sym);
    return db.watchlists[userId];
  },
  removeFromWatchlist: (userId, sym) => {
    db.watchlists[userId] = db.watchlists[userId].filter(s => s !== sym);
    return db.watchlists[userId];
  },
};

module.exports = DB;
