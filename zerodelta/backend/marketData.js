// marketData.js - All market instruments with live price simulation

const INDICES = [
  { id: 'nifty50',    name: 'NIFTY 50',       val: 24850.50, chg: 0.68 },
  { id: 'sensex',     name: 'SENSEX',          val: 81720.30, chg: 0.72 },
  { id: 'banknifty',  name: 'BANK NIFTY',      val: 52340.80, chg: 0.45 },
  { id: 'niftyit',    name: 'NIFTY IT',        val: 38450.20, chg: -0.32 },
  { id: 'niftymid',   name: 'NIFTY MIDCAP',   val: 52890.60, chg: 1.14 },
  { id: 'niftyauto',  name: 'NIFTY AUTO',      val: 23450.70, chg: 0.58 },
  { id: 'niftyphrm',  name: 'NIFTY PHARMA',   val: 21890.40, chg: -0.21 },
  { id: 'niftyfmcg',  name: 'NIFTY FMCG',     val: 56700.10, chg: 0.33 },
  { id: 'gold',       name: 'GOLD MCX',        val: 72480.00, chg: 0.54 },
  { id: 'silver',     name: 'SILVER MCX',      val: 89420.00, chg: 1.12 },
];

const STOCKS = [
  { sym:'RELIANCE',   name:'Reliance Industries',      price:2948.50, chg:1.2,  vol:'12.4M', cap:'19.9T', sector:'Energy'    },
  { sym:'TCS',        name:'Tata Consultancy Svcs',    price:4125.80, chg:0.8,  vol:'5.1M',  cap:'14.9T', sector:'IT'        },
  { sym:'HDFCBANK',   name:'HDFC Bank',                price:1685.60, chg:-0.3, vol:'8.9M',  cap:'12.8T', sector:'Banking'   },
  { sym:'INFY',       name:'Infosys',                  price:1842.30, chg:1.5,  vol:'7.2M',  cap:'7.6T',  sector:'IT'        },
  { sym:'ICICIBANK',  name:'ICICI Bank',               price:1298.40, chg:0.7,  vol:'11.3M', cap:'9.1T',  sector:'Banking'   },
  { sym:'HINDUNILVR', name:'Hindustan Unilever',       price:2478.90, chg:-0.4, vol:'3.4M',  cap:'5.8T',  sector:'FMCG'      },
  { sym:'ITC',        name:'ITC Limited',              price:458.75,  chg:0.6,  vol:'18.7M', cap:'5.7T',  sector:'FMCG'      },
  { sym:'SBIN',       name:'State Bank of India',      price:812.30,  chg:1.8,  vol:'22.1M', cap:'7.2T',  sector:'Banking'   },
  { sym:'BAJFINANCE', name:'Bajaj Finance',            price:7248.60, chg:-1.1, vol:'2.8M',  cap:'4.4T',  sector:'Finance'   },
  { sym:'BHARTIARTL', name:'Bharti Airtel',            price:1682.40, chg:2.1,  vol:'6.5M',  cap:'10.1T', sector:'Telecom'   },
  { sym:'KOTAKBANK',  name:'Kotak Mahindra Bank',      price:1842.70, chg:-0.5, vol:'4.1M',  cap:'3.7T',  sector:'Banking'   },
  { sym:'LT',         name:'Larsen & Toubro',          price:3678.20, chg:0.9,  vol:'3.2M',  cap:'5.1T',  sector:'Infra'     },
  { sym:'WIPRO',      name:'Wipro',                    price:578.40,  chg:1.3,  vol:'9.8M',  cap:'3.0T',  sector:'IT'        },
  { sym:'HCLTECH',    name:'HCL Technologies',         price:1924.60, chg:0.4,  vol:'4.7M',  cap:'5.2T',  sector:'IT'        },
  { sym:'ASIANPAINT', name:'Asian Paints',             price:2648.90, chg:-0.8, vol:'2.1M',  cap:'2.5T',  sector:'Paints'    },
  { sym:'AXISBANK',   name:'Axis Bank',                price:1182.30, chg:1.2,  vol:'10.4M', cap:'3.7T',  sector:'Banking'   },
  { sym:'MARUTI',     name:'Maruti Suzuki India',      price:12450.80,chg:0.6,  vol:'0.9M',  cap:'3.8T',  sector:'Auto'      },
  { sym:'SUNPHARMA',  name:'Sun Pharma Industries',    price:1842.40, chg:-0.2, vol:'4.2M',  cap:'4.4T',  sector:'Pharma'    },
  { sym:'TITAN',      name:'Titan Company',            price:3748.60, chg:1.7,  vol:'2.4M',  cap:'3.3T',  sector:'Consumer'  },
  { sym:'ULTRACEMCO', name:'UltraTech Cement',         price:11240.30,chg:0.3,  vol:'0.7M',  cap:'3.2T',  sector:'Cement'    },
  { sym:'ONGC',       name:'Oil & Natural Gas Corp',   price:274.80,  chg:2.4,  vol:'31.2M', cap:'3.5T',  sector:'Energy'    },
  { sym:'POWERGRID',  name:'Power Grid Corp',          price:342.60,  chg:-0.6, vol:'16.8M', cap:'3.2T',  sector:'Utilities' },
  { sym:'NTPC',       name:'NTPC Limited',             price:398.40,  chg:1.1,  vol:'24.3M', cap:'3.9T',  sector:'Utilities' },
  { sym:'MM',         name:'Mahindra & Mahindra',      price:2978.30, chg:1.9,  vol:'3.8M',  cap:'3.7T',  sector:'Auto'      },
  { sym:'ADANIENT',   name:'Adani Enterprises',        price:2648.70, chg:2.8,  vol:'5.4M',  cap:'3.0T',  sector:'Conglom.'  },
  { sym:'JSWSTEEL',   name:'JSW Steel',                price:978.40,  chg:-0.7, vol:'7.8M',  cap:'2.6T',  sector:'Metal'     },
  { sym:'TATAMOTORS', name:'Tata Motors',              price:978.60,  chg:2.3,  vol:'14.2M', cap:'3.6T',  sector:'Auto'      },
  { sym:'TATASTEEL',  name:'Tata Steel',               price:168.40,  chg:-1.2, vol:'45.6M', cap:'2.1T',  sector:'Metal'     },
  { sym:'GRASIM',     name:'Grasim Industries',        price:2478.30, chg:0.5,  vol:'1.8M',  cap:'1.6T',  sector:'Diversif.' },
  { sym:'DRREDDY',    name:"Dr. Reddy's Laboratories", price:6748.90, chg:-0.4, vol:'1.2M',  cap:'1.1T',  sector:'Pharma'    },
  { sym:'CIPLA',      name:'Cipla',                    price:1684.20, chg:0.8,  vol:'3.4M',  cap:'1.4T',  sector:'Pharma'    },
  { sym:'BPCL',       name:'Bharat Petroleum Corp',    price:298.40,  chg:1.4,  vol:'18.9M', cap:'1.3T',  sector:'Energy'    },
  { sym:'COALINDIA',  name:'Coal India',               price:458.70,  chg:0.9,  vol:'12.4M', cap:'2.8T',  sector:'Mining'    },
  { sym:'EICHERMOT',  name:'Eicher Motors',            price:4978.30, chg:1.2,  vol:'1.1M',  cap:'1.4T',  sector:'Auto'      },
  { sym:'BAJAJFINSV', name:'Bajaj Finserv',            price:1742.60, chg:-0.3, vol:'3.2M',  cap:'2.8T',  sector:'Finance'   },
  { sym:'HDFCLIFE',   name:'HDFC Life Insurance',      price:742.80,  chg:0.6,  vol:'5.6M',  cap:'1.6T',  sector:'Insurance' },
  { sym:'DIVISLAB',   name:"Divi's Laboratories",      price:4782.40, chg:-0.9, vol:'0.9M',  cap:'1.3T',  sector:'Pharma'    },
  { sym:'NESTLEIND',  name:'Nestle India',             price:2348.60, chg:0.2,  vol:'0.6M',  cap:'2.3T',  sector:'FMCG'      },
  { sym:'TECHM',      name:'Tech Mahindra',            price:1642.30, chg:1.8,  vol:'4.8M',  cap:'1.6T',  sector:'IT'        },
  { sym:'INDUSINDBK', name:'IndusInd Bank',            price:1098.40, chg:-1.4, vol:'6.7M',  cap:'0.9T',  sector:'Banking'   },
  { sym:'APOLLOHOSP', name:'Apollo Hospitals',         price:6248.70, chg:0.7,  vol:'0.8M',  cap:'0.9T',  sector:'Health'    },
  { sym:'ADANIPORTS', name:'Adani Ports & SEZ',        price:1278.30, chg:2.1,  vol:'6.2M',  cap:'2.8T',  sector:'Logistics' },
  { sym:'SBILIFE',    name:'SBI Life Insurance',       price:1548.40, chg:0.4,  vol:'3.1M',  cap:'1.5T',  sector:'Insurance' },
  { sym:'TATACONSUM', name:'Tata Consumer Products',   price:1148.70, chg:-0.6, vol:'4.2M',  cap:'1.1T',  sector:'FMCG'      },
  { sym:'GODREJCP',   name:'Godrej Consumer Products', price:1242.80, chg:0.3,  vol:'2.8M',  cap:'1.3T',  sector:'FMCG'      },
  { sym:'PIDILITIND', name:'Pidilite Industries',      price:2948.30, chg:0.5,  vol:'1.2M',  cap:'1.5T',  sector:'Chemicals' },
  { sym:'HEROMOTOCO', name:'Hero MotoCorp',            price:4678.40, chg:0.8,  vol:'1.8M',  cap:'0.9T',  sector:'Auto'      },
  { sym:'SHREECEM',   name:'Shree Cement',             price:27480.60,chg:-0.4, vol:'0.2M',  cap:'1.0T',  sector:'Cement'    },
  { sym:'BERGEPAINT', name:'Berger Paints India',      price:548.70,  chg:0.2,  vol:'3.4M',  cap:'0.5T',  sector:'Paints'    },
  { sym:'BRITANNIA',  name:'Britannia Industries',     price:5478.30, chg:0.6,  vol:'0.5M',  cap:'1.3T',  sector:'FMCG'      },
];

const ETFS = [
  { sym:'GOLDBEES',   name:'Nippon India Gold ETF',   price:64.80,  chg:0.54, vol:'3.2M', cap:'8400Cr', sector:'Gold ETF',   type:'etf', color:'#f5c842' },
  { sym:'SILVERBEES', name:'Nippon India Silver ETF',  price:89.42,  chg:1.12, vol:'1.8M', cap:'2100Cr', sector:'Silver ETF', type:'etf', color:'#c0c0c0' },
  { sym:'GOLDETF',    name:'SBI Gold ETF',             price:63.90,  chg:0.48, vol:'2.1M', cap:'6200Cr', sector:'Gold ETF',   type:'etf', color:'#f5c842' },
  { sym:'SILVERETF',  name:'HDFC Silver ETF',          price:88.70,  chg:1.05, vol:'1.2M', cap:'1800Cr', sector:'Silver ETF', type:'etf', color:'#c0c0c0' },
  { sym:'AXISGOLD',   name:'Axis Gold ETF',            price:64.20,  chg:0.51, vol:'0.9M', cap:'4100Cr', sector:'Gold ETF',   type:'etf', color:'#f5c842' },
  { sym:'ICICIGOLD',  name:'ICICI Pru Gold ETF',       price:63.75,  chg:0.46, vol:'1.4M', cap:'5300Cr', sector:'Gold ETF',   type:'etf', color:'#f5c842' },
];

const ALL_INSTRUMENTS = [...STOCKS, ...ETFS];

const NEWS = [
  { tag:'RBI Policy',    title:'RBI holds repo rate at 6.5%; stance remains withdrawal of accommodation', time:'2h ago' },
  { tag:'FII Activity',  title:'Foreign investors pump ₹4,200 crore into Indian equities in single session', time:'3h ago' },
  { tag:'Results',       title:'TCS Q4 revenue rises 5.3% YoY; management guides double-digit growth for FY26', time:'4h ago' },
  { tag:'Gold Rally',    title:'Gold ETFs see record inflows as MCX gold hits ₹72,500; silver follows suit', time:'5h ago' },
  { tag:'IPO Watch',     title:'Bajaj Housing Finance IPO oversubscribed 64x; GMP surges in grey market', time:'6h ago' },
  { tag:'Markets',       title:'Sensex, Nifty close at record highs; IT, Banking, Auto sectors lead gains today', time:'7h ago' },
];

// Simulate live price drift (call every few seconds)
function tickPrices() {
  ALL_INSTRUMENTS.forEach(s => {
    const drift = (Math.random() - 0.495) * 0.15;
    s.price = Math.max(0.5, s.price * (1 + drift / 100));
    s.chg = parseFloat((s.chg + drift * 0.08).toFixed(2));
  });
  INDICES.forEach(i => {
    const drift = (Math.random() - 0.495) * 0.10;
    i.val = Math.max(1, i.val * (1 + drift / 100));
    i.chg = parseFloat((i.chg + drift * 0.06).toFixed(2));
  });
}

// Generate OHLC candle data for charts
function generateOHLC(sym, candles = 50) {
  const inst = ALL_INSTRUMENTS.find(s => s.sym === sym);
  const basePrice = inst ? inst.price : 1000;
  const data = [];
  let close = basePrice * 0.92;
  for (let i = 0; i < candles; i++) {
    const open = close;
    const move = (Math.random() - 0.46) * basePrice * 0.008;
    close = Math.max(basePrice * 0.80, open + move);
    const high = Math.max(open, close) * (1 + Math.random() * 0.004);
    const low  = Math.min(open, close) * (1 - Math.random() * 0.004);
    const vol  = Math.floor(Math.random() * 5000000 + 500000);
    data.push({ t: Date.now() - (candles - i) * 60000 * 5, o: +open.toFixed(2), h: +high.toFixed(2), l: +low.toFixed(2), c: +close.toFixed(2), v: vol });
  }
  return data;
}

module.exports = { INDICES, STOCKS, ETFS, ALL_INSTRUMENTS, NEWS, tickPrices, generateOHLC };
