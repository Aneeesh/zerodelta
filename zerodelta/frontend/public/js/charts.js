// charts.js – Canvas chart rendering engine

const Charts = {
  // Draw candlestick OHLC chart from API candle data
  drawCandles(canvasId, candles, accentColor = '#4d9fff') {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.parentElement.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = (canvas.dataset.h ? parseInt(canvas.dataset.h) : 200) * dpr;
    canvas.style.width = rect.width + 'px';
    canvas.style.height = (canvas.dataset.h ? parseInt(canvas.dataset.h) : 200) + 'px';
    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);
    const W = rect.width, H = parseInt(canvas.dataset.h) || 200;
    const padL = 6, padR = 6, padT = 10, padB = 20;
    const dw = W - padL - padR, dh = H - padT - padB;
    const n = candles.length;
    if (!n) return;
    const allH = candles.map(c => c.h), allL = candles.map(c => c.l);
    const maxV = Math.max(...allH), minV = Math.min(...allL);
    const rng = maxV - minV || 1;
    const toX = i => padL + (i + 0.5) * (dw / n);
    const toY = v => padT + dh * (1 - (v - minV) / rng);
    ctx.clearRect(0, 0, W, H);
    // Grid lines
    for (let i = 0; i <= 4; i++) {
      const y = padT + dh * i / 4;
      const val = maxV - (rng * i / 4);
      ctx.beginPath(); ctx.moveTo(padL, y); ctx.lineTo(W - padR, y);
      ctx.strokeStyle = 'rgba(30,48,72,0.5)'; ctx.lineWidth = 1; ctx.stroke();
      ctx.fillStyle = '#4d6a88'; ctx.font = '9px DM Mono, monospace';
      ctx.fillText(val >= 1000 ? (val / 1000).toFixed(1) + 'K' : val.toFixed(0), W - padR + 2, y + 3);
    }
    const cw = dw / n;
    const bodyW = Math.max(1.5, cw * 0.55);
    // Candles
    candles.forEach((c, i) => {
      const bull = c.c >= c.o;
      const color = bull ? '#00e5a0' : '#ff4d6d';
      const x = toX(i);
      const oY = toY(c.o), cY = toY(c.c), hY = toY(c.h), lY = toY(c.l);
      // Wick
      ctx.beginPath(); ctx.moveTo(x, hY); ctx.lineTo(x, lY);
      ctx.strokeStyle = color; ctx.lineWidth = 1; ctx.stroke();
      // Body
      const bodyTop = Math.min(oY, cY);
      const bodyH = Math.max(1.5, Math.abs(cY - oY));
      ctx.fillStyle = bull ? '#00e5a0' : '#ff4d6d';
      ctx.fillRect(x - bodyW / 2, bodyTop, bodyW, bodyH);
      // Hollow for bearish
      if (!bull && bodyH > 3) {
        ctx.strokeStyle = '#cc2d4a'; ctx.lineWidth = 0.5;
        ctx.strokeRect(x - bodyW / 2, bodyTop, bodyW, bodyH);
      }
    });
    // Last price dashed line
    const lastY = toY(candles[candles.length - 1].c);
    ctx.setLineDash([4, 4]);
    ctx.beginPath(); ctx.moveTo(padL, lastY); ctx.lineTo(W - padR - 20, lastY);
    ctx.strokeStyle = accentColor + 'aa'; ctx.lineWidth = 1; ctx.stroke();
    ctx.setLineDash([]);
  },

  // Draw smooth line / area chart from price array
  drawLine(canvasId, points, color = '#00e5a0', fill = true) {
    const canvas = document.getElementById(canvasId);
    if (!canvas || !points.length) return;
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.parentElement.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    const h = parseInt(canvas.dataset.h) || 200;
    canvas.height = h * dpr;
    canvas.style.width = rect.width + 'px';
    canvas.style.height = h + 'px';
    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);
    const W = rect.width, H = h;
    const pad = 10;
    const minV = Math.min(...points) * 0.998, maxV = Math.max(...points) * 1.001;
    const rng = maxV - minV || 1;
    const sx = (W - 2 * pad) / (points.length - 1);
    const toY = v => pad + (H - 2 * pad) * (1 - (v - minV) / rng);
    ctx.clearRect(0, 0, W, H);
    // Grid
    for (let i = 0; i <= 4; i++) {
      const y = pad + (H - 2 * pad) * i / 4;
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y);
      ctx.strokeStyle = 'rgba(30,48,72,0.4)'; ctx.lineWidth = 1; ctx.stroke();
    }
    // Area fill
    if (fill) {
      const grad = ctx.createLinearGradient(0, pad, 0, H - pad);
      grad.addColorStop(0, color + '40'); grad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.beginPath();
      points.forEach((p, i) => {
        const x = pad + i * sx, y = toY(p);
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      });
      ctx.lineTo(pad + (points.length - 1) * sx, H - pad);
      ctx.lineTo(pad, H - pad); ctx.closePath();
      ctx.fillStyle = grad; ctx.fill();
    }
    // Line
    ctx.beginPath();
    points.forEach((p, i) => {
      const x = pad + i * sx, y = toY(p);
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    });
    ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.lineJoin = 'round'; ctx.stroke();
  },

  // Mini sparkline candles for table rows
  drawSparkCandles(canvasId, candles) {
    const canvas = document.getElementById(canvasId);
    if (!canvas || !candles.length) return;
    canvas.width = 72; canvas.height = 28;
    const ctx = canvas.getContext('2d');
    const W = 72, H = 28, n = candles.length;
    const allH = candles.map(c => c.h), allL = candles.map(c => c.l);
    const maxV = Math.max(...allH), minV = Math.min(...allL), rng = maxV - minV || 1;
    const cw = W / n;
    const bw = Math.max(1.5, cw * 0.5);
    const toY = v => 2 + (H - 4) * (1 - (v - minV) / rng);
    candles.forEach((c, i) => {
      const bull = c.c >= c.o;
      const x = i * cw + cw / 2;
      ctx.beginPath(); ctx.moveTo(x, toY(c.h)); ctx.lineTo(x, toY(c.l));
      ctx.strokeStyle = bull ? '#00e5a0' : '#ff4d6d'; ctx.lineWidth = 0.8; ctx.stroke();
      const bt = Math.min(toY(c.o), toY(c.c));
      const bh = Math.max(1, Math.abs(toY(c.o) - toY(c.c)));
      ctx.fillStyle = bull ? '#00e5a0' : '#ff4d6d';
      ctx.fillRect(x - bw / 2, bt, bw, bh);
    });
  },

  // Generate simulated line data
  genLine(n, start, end) {
    const pts = []; let v = start;
    for (let i = 0; i < n; i++) {
      v += ((end - start) / n) + (Math.random() - 0.48) * ((end - start) / 4);
      pts.push(Math.max(start * 0.92, v));
    }
    pts[pts.length - 1] = end;
    return pts;
  }
};

window.Charts = Charts;
