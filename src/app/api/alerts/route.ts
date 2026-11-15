import { completedBars } from "@/lib/eod";
import { NextRequest, NextResponse } from "next/server";
import { PORTFOLIO } from "@/lib/portfolio";
import { MOCK_ALERTS } from "@/lib/mock-data";
import type { PriceAlert } from "@/lib/types";

async function fetchLivePriceAlerts(
  priceThreshold: number,
  volumeMultiple: number
): Promise<{ alerts: PriceAlert[]; liveCount: number }> {
  let liveCount = 0;
  const alerts: PriceAlert[] = [];

  // Fetch prices from our own prices API to generate alerts
  try {
    const symbols = PORTFOLIO.map((s) => s.yf);
    const results = await Promise.allSettled(
      symbols.map(async (symbol) => {
        const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=3mo`;
        const res = await fetch(url, {
          headers: { "User-Agent": "Mozilla/5.0" },
          signal: AbortSignal.timeout(10000),
        });
        if (!res.ok) return null;
        return res.json();
      })
    );

    for (let i = 0; i < results.length; i++) {
      const result = results[i];
      if (result.status !== "fulfilled" || !result.value) continue;

      const data = result.value;
      const chart = data.chart?.result?.[0];
      if (!chart) continue;

      const bars = completedBars(chart);
      if (bars.length < 2) continue;
      liveCount++;
      const latest = bars[bars.length - 1];
      const close = latest.close;
      const prevClose = bars[bars.length - 2].close;
      const change = close - prevClose;
      const changePct = change / prevClose * 100;
      const currentVolume = latest.volume;
      const recentVolumes = bars.slice(-21, -1).map(bar => bar.volume);
      const avgVolume20 = recentVolumes.reduce((sum, volume) => sum + volume, 0) / recentVolumes.length;
      const volRatio = avgVolume20 > 0 ? currentVolume / avgVolume20 : 0;
      const avgVolume = avgVolume20;
      const stock = PORTFOLIO[i];
      const today = latest.date;

      // Price spike alert
      if (changePct >= priceThreshold) {
        alerts.push({
          ticker: stock.ticker,
          name: stock.name,
          type: "price_spike",
          value: Math.round(changePct * 100) / 100,
          threshold: priceThreshold,
          message: `${stock.ticker} up ${changePct.toFixed(1)}% — ₹${close.toFixed(0)} (above ${priceThreshold}% threshold)`,
          date: today,
        });
      }

      // Price drop alert
      if (changePct <= -priceThreshold) {
        alerts.push({
          ticker: stock.ticker,
          name: stock.name,
          type: "price_drop",
          value: Math.round(Math.abs(changePct) * 100) / 100,
          threshold: priceThreshold,
          message: `${stock.ticker} down ${Math.abs(changePct).toFixed(1)}% — ₹${close.toFixed(0)} (below -${priceThreshold}% threshold)`,
          date: today,
        });
      }

      // Volume surge alert
      if (volRatio >= volumeMultiple) {
        alerts.push({
          ticker: stock.ticker,
          name: stock.name,
          type: "volume_surge",
          value: Math.round(volRatio * 100) / 100,
          threshold: volumeMultiple,
          message: `${stock.ticker} volume ${volRatio.toFixed(1)}x average — ${(currentVolume / 100000).toFixed(1)}L shares vs ${(avgVolume / 100000).toFixed(1)}L avg`,
          date: today,
        });
      }
    }
  } catch (e) {
    console.error("Alert generation failed:", e);
  }

  return { alerts, liveCount };
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const priceThreshold = parseFloat(searchParams.get("priceThreshold") || "3");
  const volumeMultiple = parseFloat(searchParams.get("volumeMultiple") || "2");

  if (!Number.isFinite(priceThreshold) || priceThreshold <= 0 || !Number.isFinite(volumeMultiple) || volumeMultiple <= 0) {
    return NextResponse.json({ error: "Thresholds must be positive finite numbers." }, { status: 400 });
  }
  if (searchParams.get("demo") === "1") return NextResponse.json({
    alerts: MOCK_ALERTS.filter(a => a.value >= (a.type === "volume_surge" ? volumeMultiple : priceThreshold)).map(a => ({ ...a, threshold: a.type === "volume_surge" ? volumeMultiple : priceThreshold })),
    source: "mock", liveCount: 0,
  });
  const live = await fetchLivePriceAlerts(priceThreshold, volumeMultiple);
  const alerts = live.alerts;
  const source = live.liveCount > 0 ? "yahoo_finance" : "unavailable";

  // Sort by value descending (most extreme first)
  alerts.sort((a, b) => b.value - a.value);

  return NextResponse.json({
    alerts,
    config: { priceThreshold, volumeMultiple },
    source,
    liveCount: live.liveCount,
    totalCount: PORTFOLIO.length,
    lastUpdated: new Date().toISOString(),
  });
}
