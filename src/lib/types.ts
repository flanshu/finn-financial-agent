export interface PriceData {
  ticker: string;
  name: string;
  sector: string;
  close: number;
  prevClose: number;
  change: number;
  changePct: number;
  volume: number;
  avgVolume20: number;
  volumeRatio: number;
  high52w: number;
  low52w: number;
  marketCap: number;
  date: string;
}

export interface PriceAlert {
  ticker: string;
  name: string;
  type: "price_spike" | "price_drop" | "volume_surge";
  value: number;
  threshold: number;
  message: string;
  date: string;
}

export interface Announcement {
  id: string;
  ticker: string;
  companyName: string;
  category: string;
  priority: "critical" | "high" | "medium" | "low";
  headline: string;
  summary: string;
  date: string;
  source: string;
  sourceUrl?: string;
  // For results announcements
  financials?: {
    revenue?: { current: number; qoq: number; yoy: number };
    ebitda?: { current: number; qoq: number; yoy: number };
    pbt?: { current: number; qoq: number; yoy: number };
    pat?: { current: number; qoq: number; yoy: number };
  };
}

export interface ResearchReport {
  ticker: string;
  companyName: string;
  generatedAt: string;
  businessSnapshot: {
    description: string;
    segments: string[];
    revenueMix: string;
    keyProducts: string;
  };
  financialSnapshot: {
    revenue: string;
    ebitda: string;
    pat: string;
    ebitdaMargin: string;
    patMargin: string;
    debtToEquity: string;
    roce: string;
    highlights: string[];
  };
  narrativeVsNumbers: {
    summary: string;
    comparisons: Array<{
      metric: string;
      management_said: string;
      actual: string;
      verdict: "aligned" | "missed" | "exceeded";
    }>;
  };
}

export interface AlertConfig {
  priceThreshold: number; // e.g., 3 means ±3%
  volumeMultiple: number; // e.g., 2 means 2x avg volume
}

export type TimeWindow = "24h" | "3d" | "7d";
