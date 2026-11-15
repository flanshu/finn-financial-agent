import { completedBars } from "@/lib/eod";
import { NextResponse } from "next/server";
import { PORTFOLIO, RESEARCH_COMPANIES } from "@/lib/portfolio";
import { MOCK_PRICES } from "@/lib/mock-data";
import type { PriceData } from "@/lib/types";

async function fetchYahooPrice(symbol: string): Promise<PriceData | null> {
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=3mo`;
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0" },
          signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const result = data.chart?.result?.[0];
    if (!result) return null;

    const meta = result.meta;
    const bars = completedBars(result);
    if (bars.length < 2) return null;
    const latest = bars[bars.length - 1];
    const close = latest.close;
    const prevClose = bars[bars.length - 2].close;
    const change = close - prevClose;
    const changePct = change / prevClose * 100;
    const currentVolume = latest.volume;
    const recentVolumes = bars.slice(-21, -1).map(bar => bar.volume);
    const avgVolume20 = recentVolumes.reduce((sum, volume) => sum + volume, 0) / recentVolumes.length;
    const ticker = symbol.replace(".NS", "").replace(".BO", "");
    const stock = [...PORTFOLIO, ...RESEARCH_COMPANIES].find((s) => s.yf === symbol);

    return {
      ticker,
      name: stock?.name || ticker,
      sector: stock?.sector || "Unknown",
      close: Math.round(close * 100) / 100,
      prevClose: Math.round(prevClose * 100) / 100,
      change: Math.round(change * 100) / 100,
      changePct: Math.round(changePct * 100) / 100,
      volume: currentVolume,
      avgVolume20: Math.round(avgVolume20),
      volumeRatio: avgVolume20 > 0 ? Math.round((currentVolume / avgVolume20) * 100) / 100 : 1,
      high52w: meta.fiftyTwoWeekHigh || close,
      low52w: meta.fiftyTwoWeekLow || close,
      marketCap: Math.round((meta.marketCap || 0) / 10000000),
      date: latest.date,
    };
  } catch (e) {
    console.error(`Yahoo fetch failed for ${symbol}:`, e);
    return null;
  }
}

export async function GET(request: Request) {
  if (new URL(request.url).searchParams.get("demo") === "1") return NextResponse.json({ prices: MOCK_PRICES.filter(p => PORTFOLIO.some(s => s.ticker === p.ticker)), source: "mock", liveCount: 0, totalCount: PORTFOLIO.length });
  const allStocks = PORTFOLIO;

  // Fetch all prices in parallel from Yahoo Finance
  const results = await Promise.allSettled(
    allStocks.map((stock) => fetchYahooPrice(stock.yf))
  );

  const prices: PriceData[] = [];
  let liveCount = 0;

  results.forEach((result) => {
    if (result.status === "fulfilled" && result.value) {
      prices.push(result.value);
      liveCount++;
    }
  });

  return NextResponse.json({
    prices,
    lastUpdated: new Date().toISOString(),
    source: liveCount > 0 ? "yahoo_finance" : "unavailable",
    liveCount,
    totalCount: allStocks.length,
    missingTickers: allStocks.filter(stock => !prices.some(price => price.ticker === stock.ticker)).map(stock => stock.ticker),
  });
}
