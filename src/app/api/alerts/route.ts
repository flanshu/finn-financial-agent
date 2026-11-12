import { NextResponse } from "next/server";
import { MOCK_ALERTS } from "@/lib/mock-data";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const priceThreshold = parseFloat(searchParams.get("priceThreshold") || "3");
  const volumeMultiple = parseFloat(searchParams.get("volumeMultiple") || "2");

  // Filter alerts based on user-configurable thresholds
  const filtered = MOCK_ALERTS.filter((alert) => {
    if (alert.type === "price_spike" || alert.type === "price_drop") {
      return Math.abs(alert.value) >= priceThreshold;
    }
    if (alert.type === "volume_surge") {
      return alert.value >= volumeMultiple;
    }
    return true;
  });

  return NextResponse.json({
    alerts: filtered,
    total: filtered.length,
    config: { priceThreshold, volumeMultiple },
    lastUpdated: new Date().toISOString(),
  });
}
