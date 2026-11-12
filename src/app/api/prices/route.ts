import { NextResponse } from "next/server";
import { MOCK_PRICES } from "@/lib/mock-data";

export async function GET() {
  // In production, this would fetch from yfinance via a Python microservice
  // For now, return realistic mock data
  return NextResponse.json({
    prices: MOCK_PRICES,
    lastUpdated: new Date().toISOString(),
    source: "mock", // will be "yfinance" in production
  });
}
