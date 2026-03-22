// server.js - ZeroDelta Backend
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { tickPrices } = require('./marketData');

const app = express();

// Middleware
app.use(cors({ origin: '*', methods: ['GET','POST','PUT','DELETE','OPTIONS'] }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve frontend static files
app.use(express.static(path.join(__dirname, '../frontend/public')));

// API Routes
app.use('/api/auth',   require('./routes/auth'));
app.use('/api/market', require('./routes/market'));
app.use('/api/trade',  require('./routes/trade'));

// Health check
app.get('/api/health', (req, res) => res.json({ status: 'ok', time: new Date().toISOString(), platform: 'ZeroDelta v1.0' }));

// Catch-all: serve frontend for any non-API route (SPA support)
app.get('*', (req, res) => {
  if (!req.path.startsWith('/api')) {
    res.sendFile(path.join(__dirname, '../frontend/public/index.html'));
  } else {
    res.status(404).json({ error: 'Route not found' });
  }
});

// Simulate live price updates every 4 seconds
setInterval(tickPrices, 4000);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`\n🚀 ZeroDelta server running on http://localhost:${PORT}`);
  console.log(`📊 API: http://localhost:${PORT}/api/health`);
  console.log(`🌐 Frontend: http://localhost:${PORT}\n`);
});

module.exports = app;
