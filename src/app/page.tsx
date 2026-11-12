"use client";

import { useState, useEffect, useCallback } from "react";
import {
  BarChart3,
  Bell,
  Search,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Volume2,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  Loader2,
  RefreshCw,
  Settings2,
  Zap,
  FileText,
  Building2,
  ArrowLeft,
} from "lucide-react";
import { cn, formatNumber, formatPercent, timeAgo, getPriorityColor, getCategoryColor, CATEGORY_LABELS } from "@/lib/utils";
import type { PriceData, Announcement, PriceAlert, ResearchReport, AlertConfig, TimeWindow } from "@/lib/types";

type Tab = "feed" | "alerts" | "research";

// ─── Announcement Card ───
function AnnouncementCard({ ann }: { ann: Announcement }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div
      className="bg-card border border-border rounded-xl p-4 space-y-2 active:scale-[0.99] transition-transform cursor-pointer"
      onClick={() => setExpanded(!expanded)}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-semibold text-sm">{ann.ticker}</span>
          <span className={cn("badge", getCategoryColor(ann.category))}>{CATEGORY_LABELS[ann.category] || ann.category}</span>
          <span className={cn("badge", getPriorityColor(ann.priority))}>{ann.priority}</span>
        </div>
        <span className="text-xs text-muted-foreground whitespace-nowrap">{timeAgo(ann.date)}</span>
      </div>
      <p className="text-sm font-medium leading-snug">{ann.headline}</p>
      {expanded && (
        <div className="space-y-3 pt-1">
          <p className="text-xs text-muted-foreground leading-relaxed">{ann.summary}</p>
          {ann.financials && (
            <div className="grid grid-cols-2 gap-2">
              {(["revenue", "ebitda", "pbt", "pat"] as const).map((key) => {
                const f = ann.financials![key];
                if (!f) return null;
                return (
                  <div key={key} className="bg-muted/50 rounded-lg p-2.5 space-y-1">
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">{key}</span>
                    <p className="text-sm font-semibold">₹{formatNumber(f.current)} Cr</p>
                    <div className="flex gap-2 text-[11px]">
                      <span className={cn("font-medium", f.qoq >= 0 ? "text-emerald-500" : "text-red-500")}>QoQ {formatPercent(f.qoq)}</span>
                      <span className={cn("font-medium", f.yoy >= 0 ? "text-emerald-500" : "text-red-500")}>YoY {formatPercent(f.yoy)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
            <FileText className="w-3 h-3" />
            <span>Source: {ann.source}</span>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Price Row ───
function PriceRow({ price }: { price: PriceData }) {
  const isUp = price.changePct >= 0;
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-border/50 last:border-0">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-sm">{price.ticker}</span>
          {price.volumeRatio >= 2 && <Volume2 className="w-3 h-3 text-amber-500" />}
        </div>
        <span className="text-xs text-muted-foreground truncate block">{price.name}</span>
      </div>
      <div className="text-right">
        <p className="text-sm font-semibold tabular-nums">₹{price.close.toLocaleString("en-IN")}</p>
        <p className={cn("text-xs font-medium tabular-nums flex items-center justify-end gap-0.5", isUp ? "text-emerald-500" : "text-red-500")}>
          {isUp ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
          {formatPercent(price.changePct)}
        </p>
      </div>
    </div>
  );
}

// ─── Alert Card ───
function AlertCard({ alert }: { alert: PriceAlert }) {
  const icon = alert.type === "volume_surge" ? <Volume2 className="w-4 h-4" /> : alert.type === "price_spike" ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />;
  const color = alert.type === "price_drop" ? "text-red-500 bg-red-500/10 border-red-500/20" : alert.type === "volume_surge" ? "text-amber-500 bg-amber-500/10 border-amber-500/20" : "text-emerald-500 bg-emerald-500/10 border-emerald-500/20";
  return (
    <div className={cn("rounded-xl border p-4 space-y-2", color)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {icon}
          <span className="font-semibold text-sm">{alert.ticker}</span>
          <span className="text-xs opacity-70">{alert.name}</span>
        </div>
        <span className="text-lg font-bold tabular-nums">{alert.type === "volume_surge" ? `${alert.value.toFixed(1)}x` : formatPercent(alert.value)}</span>
      </div>
      <p className="text-xs opacity-80">{alert.message}</p>
    </div>
  );
}

// ─── Research View ───
function ResearchView({ report, onBack }: { report: ResearchReport; onBack: () => void }) {
  const [section, setSection] = useState<"business" | "financial" | "narrative">("business");
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="p-1.5 rounded-lg hover:bg-muted transition-colors"><ArrowLeft className="w-5 h-5" /></button>
        <div>
          <h2 className="text-lg font-bold">{report.companyName}</h2>
          <p className="text-xs text-muted-foreground">{report.ticker} · Generated {timeAgo(report.generatedAt)}</p>
        </div>
      </div>
      <div className="flex gap-1 bg-muted/50 rounded-lg p-1">
        {([["business", "Business"], ["financial", "Financial"], ["narrative", "Narrative vs Numbers"]] as const).map(([key, label]) => (
          <button key={key} onClick={() => setSection(key)} className={cn("flex-1 text-xs font-medium py-2 px-2 rounded-md transition-colors", section === key ? "bg-background shadow-sm" : "text-muted-foreground")}>{label}</button>
        ))}
      </div>

      {section === "business" && (
        <div className="space-y-3">
          <div className="bg-card border border-border rounded-xl p-4 space-y-3">
            <h3 className="text-sm font-semibold flex items-center gap-2"><Building2 className="w-4 h-4 text-blue-500" />Overview</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">{report.businessSnapshot.description}</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-4 space-y-2">
            <h3 className="text-sm font-semibold">Segments</h3>
            <div className="flex flex-wrap gap-1.5">{report.businessSnapshot.segments.map((s) => <span key={s} className="badge bg-blue-500/10 text-blue-500 border-blue-500/20">{s}</span>)}</div>
          </div>
          <div className="bg-card border border-border rounded-xl p-4 space-y-2">
            <h3 className="text-sm font-semibold">Revenue Mix</h3>
            <p className="text-sm text-muted-foreground">{report.businessSnapshot.revenueMix}</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-4 space-y-2">
            <h3 className="text-sm font-semibold">Key Products</h3>
            <p className="text-sm text-muted-foreground">{report.businessSnapshot.keyProducts}</p>
          </div>
        </div>
      )}

      {section === "financial" && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            {([["Revenue", report.financialSnapshot.revenue], ["EBITDA", report.financialSnapshot.ebitda], ["PAT", report.financialSnapshot.pat], ["EBITDA Margin", report.financialSnapshot.ebitdaMargin], ["PAT Margin", report.financialSnapshot.patMargin], ["D/E Ratio", report.financialSnapshot.debtToEquity], ["ROCE", report.financialSnapshot.roce]] as const).map(([label, value]) => (
              <div key={label as string} className="bg-card border border-border rounded-lg p-3 space-y-1">
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">{label as string}</span>
                <p className="text-sm font-semibold">{value as string}</p>
              </div>
            ))}
          </div>
          {report.financialSnapshot.highlights.length > 0 && (
            <div className="bg-card border border-border rounded-xl p-4 space-y-2">
              <h3 className="text-sm font-semibold">Key Highlights</h3>
              <ul className="space-y-1.5">{report.financialSnapshot.highlights.map((h: string, i: number) => <li key={i} className="text-sm text-muted-foreground flex gap-2"><Zap className="w-3.5 h-3.5 text-amber-500 mt-0.5 shrink-0" />{h}</li>)}</ul>
            </div>
          )}
        </div>
      )}

      {section === "narrative" && (
        <div className="space-y-3">
          <div className="bg-card border border-border rounded-xl p-4 space-y-2">
            <h3 className="text-sm font-semibold flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-amber-500" />Summary</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">{report.narrativeVsNumbers.summary}</p>
          </div>
          {report.narrativeVsNumbers.comparisons.map((comp: any, i: number) => {
            const vc = comp.verdict === "exceeded" ? "text-emerald-500 bg-emerald-500/10 border-emerald-500/20" : comp.verdict === "missed" ? "text-red-500 bg-red-500/10 border-red-500/20" : "text-blue-500 bg-blue-500/10 border-blue-500/20";
            return (
              <div key={i} className="bg-card border border-border rounded-xl p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <h4 className="text-sm font-semibold">{comp.metric}</h4>
                  <span className={cn("badge text-[10px] uppercase font-bold", vc)}>{comp.verdict}</span>
                </div>
                <div className="space-y-2">
                  <div className="bg-muted/30 rounded-lg p-2.5">
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium block mb-1">Management Said</span>
                    <p className="text-xs leading-relaxed">{comp.management_said}</p>
                  </div>
                  <div className="bg-muted/30 rounded-lg p-2.5">
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium block mb-1">Actual Outcome</span>
                    <p className="text-xs leading-relaxed">{comp.actual}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════
// ─── MAIN APP ─────────────────────────
// ═══════════════════════════════════════
export default function Home() {
  const [activeTab, setActiveTab] = useState<Tab>("feed");
  const [prices, setPrices] = useState<PriceData[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [alerts, setAlerts] = useState<PriceAlert[]>([]);
  const [research, setResearch] = useState<ResearchReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTicker, setSearchTicker] = useState("");
  const [researchLoading, setResearchLoading] = useState(false);
  const [timeWindow, setTimeWindow] = useState<TimeWindow>("7d");
  const [alertConfig, setAlertConfig] = useState<AlertConfig>({ priceThreshold: 3, volumeMultiple: 2 });
  const [showSettings, setShowSettings] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [priceRes, annRes, alertRes] = await Promise.all([
        fetch("/api/prices"),
        fetch(`/api/announcements?window=${timeWindow}`),
        fetch(`/api/alerts?priceThreshold=${alertConfig.priceThreshold}&volumeMultiple=${alertConfig.volumeMultiple}`),
      ]);
      const [priceData, annData, alertData] = await Promise.all([priceRes.json(), annRes.json(), alertRes.json()]);
      setPrices(priceData.prices || []);
      setAnnouncements(annData.announcements || []);
      setAlerts(alertData.alerts || []);
    } catch (e) { console.error("Fetch error:", e); }
    setLoading(false);
  }, [timeWindow, alertConfig]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const fetchResearch = async (ticker: string) => {
    setResearchLoading(true);
    try {
      const res = await fetch(`/api/research?ticker=${ticker}`);
      const data = await res.json();
      if (data.report) setResearch(data.report);
    } catch (e) { console.error("Research error:", e); }
    setResearchLoading(false);
  };

  const alertCount = alerts.length;

  return (
    <main className="flex flex-col h-screen max-h-screen overflow-hidden">
      {/* Top bar */}
      <header className="shrink-0 border-b border-border bg-background/80 backdrop-blur-md px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center">
              <BarChart3 className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className="text-base font-bold tracking-tight">FINN</h1>
              <p className="text-[10px] text-muted-foreground -mt-0.5">Financial Investment Agent</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={() => fetchData()} className="p-2 rounded-lg hover:bg-muted transition-colors" disabled={loading}>
              <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
            </button>
            <button onClick={() => setShowSettings(!showSettings)} className="p-2 rounded-lg hover:bg-muted transition-colors">
              <Settings2 className="w-4 h-4" />
            </button>
          </div>
        </div>
        {showSettings && (
          <div className="mt-3 pt-3 border-t border-border space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs text-muted-foreground">Price alert threshold (%)</label>
              <input type="number" value={alertConfig.priceThreshold} onChange={(e) => setAlertConfig((c) => ({ ...c, priceThreshold: parseFloat(e.target.value) || 3 }))} className="w-16 text-sm text-right bg-muted rounded-md px-2 py-1 border border-border" step={0.5} min={0.5} />
            </div>
            <div className="flex items-center justify-between">
              <label className="text-xs text-muted-foreground">Volume alert multiple (x avg)</label>
              <input type="number" value={alertConfig.volumeMultiple} onChange={(e) => setAlertConfig((c) => ({ ...c, volumeMultiple: parseFloat(e.target.value) || 2 }))} className="w-16 text-sm text-right bg-muted rounded-md px-2 py-1 border border-border" step={0.5} min={1} />
            </div>
          </div>
        )}
      </header>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center h-full"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
        ) : (
          <div className="px-4 py-4 pb-24 space-y-4">
            {/* ═══ FEED ═══ */}
            {activeTab === "feed" && (
              <>
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-muted-foreground flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" />Corporate Announcements</h2>
                  <div className="flex gap-1 bg-muted/50 rounded-lg p-0.5">
                    {(["24h", "3d", "7d"] as const).map((w) => (
                      <button key={w} onClick={() => setTimeWindow(w)} className={cn("text-[11px] font-medium px-2.5 py-1 rounded-md transition-colors", timeWindow === w ? "bg-background shadow-sm" : "text-muted-foreground")}>{w}</button>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  {announcements.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground text-sm">No announcements in this window</div>
                  ) : announcements.map((ann) => <AnnouncementCard key={ann.id} ann={ann} />)}
                </div>
                <div className="space-y-2 mt-6">
                  <h2 className="text-sm font-semibold text-muted-foreground flex items-center gap-1.5"><TrendingUp className="w-3.5 h-3.5" />Portfolio Prices</h2>
                  <div className="bg-card border border-border rounded-xl px-4 divide-y divide-border/50">
                    {prices.sort((a, b) => Math.abs(b.changePct) - Math.abs(a.changePct)).map((p) => <PriceRow key={p.ticker} price={p} />)}
                  </div>
                </div>
              </>
            )}

            {/* ═══ ALERTS ═══ */}
            {activeTab === "alerts" && (
              <>
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-muted-foreground flex items-center gap-1.5"><Bell className="w-3.5 h-3.5" />Active Alerts</h2>
                  <span className="text-xs text-muted-foreground">Price ≥{alertConfig.priceThreshold}% · Volume ≥{alertConfig.volumeMultiple}x</span>
                </div>
                <div className="space-y-2">
                  {alerts.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground text-sm">No alerts triggered. Adjust thresholds in settings.</div>
                  ) : alerts.map((a, i) => <AlertCard key={i} alert={a} />)}
                </div>
                <div className="mt-4 space-y-2">
                  <h3 className="text-sm font-semibold text-muted-foreground">Today&apos;s Top Movers</h3>
                  <div className="bg-card border border-border rounded-xl px-4 divide-y divide-border/50">
                    {prices.sort((a, b) => Math.abs(b.changePct) - Math.abs(a.changePct)).slice(0, 5).map((p) => <PriceRow key={p.ticker} price={p} />)}
                  </div>
                </div>
              </>
            )}

            {/* ═══ RESEARCH ═══ */}
            {activeTab === "research" && (
              <>
                {research ? (
                  <ResearchView report={research as ResearchReport} onBack={() => setResearch(null)} />
                ) : (
                  <>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <input type="text" placeholder="Search company (e.g. ZOMATO, TCS)..." value={searchTicker} onChange={(e) => setSearchTicker(e.target.value.toUpperCase())} onKeyDown={(e) => { if (e.key === "Enter" && searchTicker.trim()) fetchResearch(searchTicker.trim()); }} className="w-full pl-10 pr-4 py-3 rounded-xl bg-muted/50 border border-border text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500" />
                    </div>
                    {researchLoading && (
                      <div className="flex items-center justify-center py-12">
                        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                        <span className="ml-2 text-sm text-muted-foreground">Generating research report...</span>
                      </div>
                    )}
                    <div className="space-y-2">
                      <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Quick Research</h3>
                      <div className="grid grid-cols-3 gap-2">
                        {["ZOMATO", "DMART", "TITAN"].map((t) => (
                          <button key={t} onClick={() => { setSearchTicker(t); fetchResearch(t); }} className="bg-card border border-border rounded-lg p-3 text-center hover:bg-muted/50 transition-colors active:scale-[0.98]">
                            <span className="text-sm font-semibold">{t}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-2 mt-4">
                      <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Portfolio Companies</h3>
                      <div className="grid grid-cols-3 gap-2">
                        {["RELIANCE", "TCS", "HDFCBANK", "INFY", "ICICIBANK", "ITC", "MARUTI", "TATAMOTORS", "SUNPHARMA", "BAJFINANCE", "TATASTEEL", "HCLTECH", "NTPC", "HINDUNILVR", "KOTAKBANK"].map((t) => (
                          <button key={t} onClick={() => { setSearchTicker(t); fetchResearch(t); }} className="bg-card border border-border rounded-lg p-2.5 text-center hover:bg-muted/50 transition-colors active:scale-[0.98]">
                            <span className="text-xs font-medium">{t}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* Bottom nav */}
      <nav className="shrink-0 border-t border-border bg-background/80 backdrop-blur-md px-6 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
        <div className="flex justify-around">
          {([{ key: "feed" as Tab, icon: BarChart3, label: "Feed" }, { key: "alerts" as Tab, icon: Bell, label: "Alerts" }, { key: "research" as Tab, icon: Search, label: "Research" }]).map(({ key, icon: Icon, label }) => (
            <button key={key} onClick={() => setActiveTab(key)} className={cn("flex flex-col items-center gap-0.5 py-1 px-4 rounded-lg transition-colors relative", activeTab === key ? "text-blue-500" : "text-muted-foreground hover:text-foreground")}>
              <div className="relative">
                <Icon className="w-5 h-5" />
                {key === "alerts" && alertCount > 0 && <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center">{alertCount}</span>}
              </div>
              <span className="text-[10px] font-medium">{label}</span>
              {activeTab === key && <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-blue-500 rounded-full" />}
            </button>
          ))}
        </div>
      </nav>
    </main>
  );
}
