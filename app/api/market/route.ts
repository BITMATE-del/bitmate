import { NextResponse } from 'next/server';

const binanceSymbols = ['BTCUSDT','ETHUSDT','XRPUSDT','SOLUSDT','DOGEUSDT'];
const coinGeckoIds: Record<string,string> = {
  BTC: 'bitcoin',
  ETH: 'ethereum',
  XRP: 'ripple',
  SOL: 'solana',
  DOGE: 'dogecoin',
};

export const revalidate = 0;

async function fromBinance() {
  const q = encodeURIComponent(JSON.stringify(binanceSymbols));
  const r = await fetch(`https://api.binance.com/api/v3/ticker/24hr?symbols=${q}`, {
    cache: 'no-store',
    signal: AbortSignal.timeout(4500),
  });
  if (!r.ok) throw new Error(`binance ${r.status}`);
  const data = await r.json();
  return data.map((x: any) => ({
    symbol: x.symbol.replace('USDT',''),
    price: Number(x.lastPrice),
    changePct: Number(x.priceChangePercent),
    volume: Number(x.quoteVolume),
  }));
}

async function fromCoinGecko() {
  const ids = Object.values(coinGeckoIds).join(',');
  const r = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_change=true&include_24hr_vol=true`, {
    cache: 'no-store',
    headers: { 'accept': 'application/json' },
    signal: AbortSignal.timeout(6000),
  });
  if (!r.ok) throw new Error(`coingecko ${r.status}`);
  const data = await r.json();
  return Object.entries(coinGeckoIds).map(([symbol, id]) => ({
    symbol,
    price: Number(data[id]?.usd ?? 0),
    changePct: Number(data[id]?.usd_24h_change ?? 0),
    volume: Number(data[id]?.usd_24h_vol ?? 0),
  }));
}

export async function GET() {
  try {
    const rows = await fromBinance();
    return NextResponse.json({ provider: 'binance', rows, ts: new Date().toISOString() });
  } catch (binanceError) {
    try {
      const rows = await fromCoinGecko();
      return NextResponse.json({ provider: 'coingecko', fallback: true, rows, ts: new Date().toISOString() });
    } catch (coinGeckoError) {
      console.error('market providers unavailable', { binanceError, coinGeckoError });
      return NextResponse.json({ error: 'MARKET_UNAVAILABLE', rows: [] }, { status: 503 });
    }
  }
}
