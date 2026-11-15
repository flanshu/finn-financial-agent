import { NextRequest, NextResponse } from "next/server";
import { PORTFOLIO, type Stock } from "@/lib/portfolio";
import { MOCK_ANNOUNCEMENTS } from "@/lib/mock-data";
import { classifyFiling, exchangeTimestamp, indexedFilings } from "@/lib/filings";
import { readBounded } from "@/lib/research";
import type { Announcement, TimeWindow } from "@/lib/types";

export const maxDuration = 120;
interface BSEItem {
  SCRIP_CD?: number | string; NEWSID?: string; HEADLINE?: string; NEWSSUB?: string;
  NEWS_DT?: string; DT_TM?: string; ATTACHMENTNAME?: string; OLD?: number; SUBCATNAME?: string;
}
interface Feed { announcements: Announcement[]; failed: string[]; incomplete: string[]; checked: number; indexed: string[] }
let cached: { expires: number; feed: Feed } | undefined;
let pending: Promise<Feed> | undefined;

async function companyFilings(stock: Stock): Promise<{ announcements: Announcement[]; complete: boolean }> {
  const now = new Date();
  const day = (d: Date) => new Date(d.getTime() + 330 * 60000).toISOString().slice(0, 10).replaceAll("-", "");
  const from = day(new Date(now.getTime() - 7 * 86400000));
  const rows = new Map<string, Announcement>();
  let seen = 0, previousPage = "";
  for (let page = 1; page <= 5; page++) {
    const params = new URLSearchParams({ pageno: String(page), strCat: "-1", strPrevDate: from, strScrip: stock.bseCode!, strSearch: "P", strToDate: day(now), strType: "C" });
    const response = await fetch(`https://api.bseindia.com/BseIndiaAPI/api/AnnSubCategoryGetData/w?${params}`, {
      signal: AbortSignal.timeout(8000), headers: { "User-Agent": "Mozilla/5.0", Accept: "application/json", Referer: "https://www.bseindia.com/" },
    });
    if (!response.ok) throw new Error("Exchange unavailable");
    const data = await response.json();
    if (!Array.isArray(data.Table)) throw new Error("Unexpected exchange response");
    const items = data.Table as BSEItem[];
    if (!items.length) return { announcements: [...rows.values()], complete: true };
    const signature = JSON.stringify(items.map(item => [item.NEWSID, item.ATTACHMENTNAME, item.NEWS_DT, item.HEADLINE]));
    if (signature === previousPage) return { announcements: [...rows.values()], complete: false };
    previousPage = signature;
    seen += items.length;
    for (const item of items) {
      if (String(item.SCRIP_CD) !== stock.bseCode) continue;
      const date = exchangeTimestamp(item.NEWS_DT || item.DT_TM || "");
      if (!date) continue;
      const headline = (item.NEWSSUB || item.HEADLINE || "Exchange disclosure").replace(/^Announcement under Regulation 30 \(LODR\)-/i, "").trim();
      const classification = classifyFiling(`${item.NEWSSUB || ""} ${headline} ${item.SUBCATNAME || ""}`);
      const id = `bse-${stock.bseCode}-${item.NEWSID || item.ATTACHMENTNAME || `${date}-${headline}`}`;
      const attachment = item.ATTACHMENTNAME && /^[a-zA-Z0-9_.-]+\.pdf$/i.test(item.ATTACHMENTNAME) ? item.ATTACHMENTNAME : null;
      rows.set(id, { id, ticker: stock.ticker, companyName: stock.name, ...classification,
        headline, summary: item.HEADLINE || item.NEWSSUB || headline, date, source: "BSE",
        sourceUrl: attachment ? `https://www.bseindia.com/xml-data/corpfiling/${item.OLD ? "AttachHis" : "AttachLive"}/${attachment}` : undefined,
      });
    }
    const total = Number(data.Table1?.[0]?.ROWCNT);
    if (Number.isFinite(total) && seen >= total) return { announcements: [...rows.values()], complete: true };
    // Without a row count, fetch until an empty page or the explicit page cap.
  }
  return { announcements: [...rows.values()], complete: false };
}

async function loadFeed(): Promise<Feed> {
  const stocks = PORTFOLIO.filter(stock => stock.bseCode);
  const feed: Feed = { announcements: [], failed: [], incomplete: [], indexed: [], checked: 0 };
  // Six workers keep requests bounded while avoiding a serial model call per filing.
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(6, stocks.length) }, async () => {
    while (next < stocks.length) {
      const stock = stocks[next++];
      try {
        const result = await companyFilings(stock);
        feed.announcements.push(...result.announcements); feed.checked++;
        if (!result.complete) feed.incomplete.push(stock.ticker);
      } catch {
        try {
          const response = await fetch(`https://www.screener.in/company/${encodeURIComponent(stock.ticker)}/consolidated/`, {
            signal: AbortSignal.timeout(8000), redirect: "error", headers: { "User-Agent": "Mozilla/5.0", Accept: "text/html" },
          });
          const html = (await readBounded(response, 2_000_000)).toString("utf8");
          const rows = indexedFilings(html, stock);
          if (rows === null) throw new Error("Index unavailable");
          feed.announcements.push(...rows); feed.checked++;
          feed.indexed.push(stock.ticker); feed.incomplete.push(stock.ticker);
        } catch { feed.failed.push(stock.ticker); }
      }
    }
  }));
  return feed;
}

export async function GET(request: NextRequest) {
  const params = new URL(request.url).searchParams;
  const timeWindow = (params.get("window") || "24h") as TimeWindow;
  if (!["24h", "3d", "7d"].includes(timeWindow)) return NextResponse.json({ error: "Window must be 24h, 3d, or 7d." }, { status: 400 });
  const demo = params.get("demo") === "1";
  let feed: Feed;
  if (demo) feed = { announcements: [...MOCK_ANNOUNCEMENTS], failed: [], incomplete: [], indexed: [], checked: PORTFOLIO.length };
  else if (cached && cached.expires > Date.now()) feed = cached.feed;
  else {
    if (!pending) pending = loadFeed().then(result => { cached = { feed: result, expires: Date.now() + 60000 }; return result; }).finally(() => { pending = undefined; });
    feed = await pending;
  }
  const now = Date.now();
  const hours = { "24h": 24, "3d": 72, "7d": 168 };
  const cutoff = now - hours[timeWindow] * 3600000;
  const windowCounts = Object.fromEntries(Object.entries(hours).map(([window, count]) => [window, feed.announcements.filter(a => Date.parse(a.date) >= now - count * 3600000 && Date.parse(a.date) <= now).length]));
  const latestAvailableAt = feed.announcements.map(a => a.date).filter(date => Date.parse(date) <= now).sort().at(-1) || null;
  const weights = { critical: 4, high: 3, medium: 2, low: 1 };
  const announcements = feed.announcements.filter(a => new Date(a.date).getTime() >= cutoff && new Date(a.date).getTime() <= Date.now() && (!params.get("category") || a.category === params.get("category")) && (!params.get("priority") || a.priority === params.get("priority"))).sort((a, b) => weights[b.priority] - weights[a.priority] || Date.parse(b.date) - Date.parse(a.date));
  const unavailable = !demo && PORTFOLIO.length > 0 && feed.checked === 0;
  return NextResponse.json({ announcements, total: announcements.length, timeWindow, source: demo ? "mock" : unavailable ? "unavailable" : "bse",
    windowCounts, latestAvailableAt,
    coverage: { checked: feed.checked, total: PORTFOLIO.length, failed: feed.failed, incomplete: feed.incomplete, indexed: feed.indexed },
    classification: "Headline-based triage; open the filing to verify materiality",
    error: unavailable ? "Exchange feed is unavailable. Please retry." : undefined, lastUpdated: new Date().toISOString(),
  }, { status: unavailable ? 503 : 200 });
}
