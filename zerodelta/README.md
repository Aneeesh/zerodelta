# ZeroDelta – India Paper Trading Platform

## Deploy to Render.com (recommended, free tier)
1. Push this repo to GitHub
2. Render → New Web Service → Connect repo
3. Build Command: `npm install`  |  Start Command: `npm start`
4. Add env var: JWT_SECRET=your_random_secret
5. Deploy!

## Local Run
```
npm install && npm start
# Open http://localhost:5000
```

## Demo Login
Email: demo@zerodelta.in  |  Password: demo1234

## Features
- Full JWT auth (register/login/session)
- 50 Nifty stocks + Gold & Silver ETFs
- Candlestick charts (1D/1W/1M)
- AI Predictor (RSI, MACD, Bollinger, targets)
- Buy/Sell with virtual Rs.10L capital
- Add Position + Exit Position modals
- Password visibility toggle
- Live price updates every 4s
- Portfolio P&L, holdings, order history
