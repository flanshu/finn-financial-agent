export interface Stock {
  ticker: string;   // NSE ticker (e.g., "RELIANCE")
  yf: string;       // Yahoo Finance symbol (e.g., "RELIANCE.NS")
  name: string;
  sector: string;
  bseCode?: string;
}

export const PORTFOLIO: Stock[] = [
  // IT
  { ticker: "TCS", yf: "TCS.NS", name: "Tata Consultancy Services", sector: "IT", bseCode: "532540" },
  { ticker: "INFY", yf: "INFY.NS", name: "Infosys", sector: "IT", bseCode: "500209" },
  { ticker: "HCLTECH", yf: "HCLTECH.NS", name: "HCL Technologies", sector: "IT", bseCode: "532281" },
  // Banking
  { ticker: "HDFCBANK", yf: "HDFCBANK.NS", name: "HDFC Bank", sector: "Banking", bseCode: "500180" },
  { ticker: "ICICIBANK", yf: "ICICIBANK.NS", name: "ICICI Bank", sector: "Banking", bseCode: "532174" },
  { ticker: "KOTAKBANK", yf: "KOTAKBANK.NS", name: "Kotak Mahindra Bank", sector: "Banking", bseCode: "500247" },
  // FMCG
  { ticker: "HINDUNILVR", yf: "HINDUNILVR.NS", name: "Hindustan Unilever", sector: "FMCG", bseCode: "500696" },
  { ticker: "ITC", yf: "ITC.NS", name: "ITC", sector: "FMCG", bseCode: "500875" },
  { ticker: "NESTLEIND", yf: "NESTLEIND.NS", name: "Nestlé India", sector: "FMCG", bseCode: "500790" },
  // Auto
  { ticker: "MARUTI", yf: "MARUTI.NS", name: "Maruti Suzuki", sector: "Auto", bseCode: "532500" },
  { ticker: "TATAMOTORS", yf: "TATAMOTORS.NS", name: "Tata Motors", sector: "Auto", bseCode: "500570" },
  // Pharma
  { ticker: "SUNPHARMA", yf: "SUNPHARMA.NS", name: "Sun Pharma", sector: "Pharma", bseCode: "524715" },
  { ticker: "DRREDDY", yf: "DRREDDY.NS", name: "Dr. Reddy's Labs", sector: "Pharma", bseCode: "500124" },
  // Energy
  { ticker: "RELIANCE", yf: "RELIANCE.NS", name: "Reliance Industries", sector: "Energy", bseCode: "500325" },
  { ticker: "NTPC", yf: "NTPC.NS", name: "NTPC", sector: "Energy", bseCode: "532555" },
  // Others
  { ticker: "TATASTEEL", yf: "TATASTEEL.NS", name: "Tata Steel", sector: "Metals", bseCode: "500470" },
  { ticker: "BAJFINANCE", yf: "BAJFINANCE.NS", name: "Bajaj Finance", sector: "Finance", bseCode: "500034" },
  { ticker: "ASIANPAINT", yf: "ASIANPAINT.NS", name: "Asian Paints", sector: "Consumer", bseCode: "500820" },
];

// Ad-hoc research companies
export const RESEARCH_COMPANIES: Stock[] = [
  { ticker: "ZOMATO", yf: "ZOMATO.NS", name: "Zomato", sector: "Internet", bseCode: "543320" },
  { ticker: "DMART", yf: "DMART.NS", name: "Avenue Supermarts (DMart)", sector: "Retail", bseCode: "540376" },
  { ticker: "TITAN", yf: "TITAN.NS", name: "Titan Company", sector: "Consumer", bseCode: "500114" },
];

export const ALL_COMPANIES = [...PORTFOLIO, ...RESEARCH_COMPANIES];

export function findStock(ticker: string): Stock | undefined {
  return ALL_COMPANIES.find(
    s => s.ticker.toLowerCase() === ticker.toLowerCase() ||
         s.yf.toLowerCase() === ticker.toLowerCase()
  );
}
