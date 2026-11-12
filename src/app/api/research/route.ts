import { NextResponse } from "next/server";
import { MOCK_RESEARCH } from "@/lib/mock-data";
import { ALL_COMPANIES } from "@/lib/portfolio";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const ticker = searchParams.get("ticker")?.toUpperCase();

  if (!ticker) {
    return NextResponse.json(
      { error: "ticker parameter is required" },
      { status: 400 }
    );
  }

  const company = ALL_COMPANIES.find(
    (c) => c.ticker === ticker || c.yf === ticker
  );
  if (!company) {
    return NextResponse.json(
      { error: `Unknown ticker: ${ticker}` },
      { status: 404 }
    );
  }

  // In production, this would call Gemini Pro with screener.in data
  // For now, return mock research for Zomato, or a placeholder for others
  if (MOCK_RESEARCH[ticker]) {
    return NextResponse.json({
      report: MOCK_RESEARCH[ticker],
      source: "mock",
    });
  }

  // Generate a placeholder report structure for companies without full mock data
  return NextResponse.json({
    report: {
      ticker: company.ticker,
      companyName: company.name,
      generatedAt: new Date().toISOString(),
      businessSnapshot: {
        description: `${company.name} operates in the ${company.sector} sector. Full analysis requires connecting to screener.in for annual reports and concall transcripts.`,
        segments: [company.sector],
        revenueMix: "Connect Gemini API for detailed analysis",
        keyProducts: "Connect Gemini API for detailed analysis",
      },
      financialSnapshot: {
        revenue: "Connect data source for live financials",
        ebitda: "–",
        pat: "–",
        ebitdaMargin: "–",
        patMargin: "–",
        debtToEquity: "–",
        roce: "–",
        highlights: [
          "Connect Gemini API + screener.in for full financial analysis",
        ],
      },
      narrativeVsNumbers: {
        summary:
          "Narrative vs. Numbers analysis requires concall transcripts from screener.in and financial data. Connect the Gemini Pro API to enable this module.",
        comparisons: [],
      },
    },
    source: "placeholder",
  });
}
