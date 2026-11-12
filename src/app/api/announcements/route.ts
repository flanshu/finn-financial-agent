import { NextResponse } from "next/server";
import { MOCK_ANNOUNCEMENTS } from "@/lib/mock-data";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const window = searchParams.get("window") || "7d";
  const category = searchParams.get("category");
  const priority = searchParams.get("priority");

  let filtered = [...MOCK_ANNOUNCEMENTS];

  // Filter by time window
  const now = new Date();
  const windowMs: Record<string, number> = {
    "24h": 24 * 60 * 60 * 1000,
    "3d": 3 * 24 * 60 * 60 * 1000,
    "7d": 7 * 24 * 60 * 60 * 1000,
  };
  const cutoff = new Date(now.getTime() - (windowMs[window] || windowMs["7d"]));
  filtered = filtered.filter((a) => new Date(a.date) >= cutoff);

  // Filter by category
  if (category && category !== "all") {
    filtered = filtered.filter((a) => a.category === category);
  }

  // Filter by priority
  if (priority && priority !== "all") {
    filtered = filtered.filter((a) => a.priority === priority);
  }

  // Sort by priority weight then date
  const priorityWeight: Record<string, number> = {
    critical: 0,
    high: 1,
    medium: 2,
    low: 3,
  };
  filtered.sort((a, b) => {
    const pw = (priorityWeight[a.priority] ?? 3) - (priorityWeight[b.priority] ?? 3);
    if (pw !== 0) return pw;
    return new Date(b.date).getTime() - new Date(a.date).getTime();
  });

  return NextResponse.json({
    announcements: filtered,
    total: filtered.length,
    window,
    lastUpdated: new Date().toISOString(),
  });
}
