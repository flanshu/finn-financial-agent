"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  BarChart3,
  Bell,
  Search,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
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
  ChevronDown,
  Eye,
  Shield,
  Activity,
  Flame,
  Star,
  X,
  CheckCircle2,
  Info,
  ExternalLink,
  MessageCircle,
  Send,
  Sparkles,
  Bot,
} from "lucide-react";
import { cn, formatNumber, formatPercent, timeAgo, getPriorityColor, getCategoryColor, CATEGORY_LABELS } from "@/lib/utils";
import { ALL_COMPANIES, PORTFOLIO } from "@/lib/portfolio";
import type { PriceData, Announcement, PriceAlert, ResearchReport, AlertConfig, TimeWindow } from "@/lib/types";

type InvestorMode = "quick" | "deep" | "future";

type Tab = "portfolio" | "feed" | "alerts" | "research" | "chat";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

function ResearchNotebook({ ticker, horizon }: { ticker: string; horizon: string }) {
  const [note, setNote] = useState("");
  const [saved, setSaved] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => {
      try { setNote(localStorage.getItem(`finn-thesis-${ticker}`) || ""); } catch { /* Storage may be disabled. */ }
    }, 0);
    return () => clearTimeout(timer);
  }, [ticker]);
  return <details className="rounded-2xl border border-accent/30 bg-accent/5 p-4">
    <summary className="cursor-pointer text-sm font-semibold">My investment thesis: {ticker}</summary>
    <p className="text-xs text-muted-foreground mt-2">Your horizon: {horizon}. Record the evidence that would change your mind and the next filing to review. Saved on this browser only.</p>
    <textarea aria-label="Investment thesis notes" className="w-full min-h-32 bg-background border border-border rounded-xl p-3 text-sm mt-3" placeholder="Thesis: ?
Horizon: ?
Risks / invalidation: ?
Next review catalyst: ?" value={note} onChange={e => { setNote(e.target.value); setSaved(false); }} />
    <button className="rounded-lg bg-accent text-white px-3 py-2 text-xs" onClick={() => { try { localStorage.setItem(`finn-thesis-${ticker}`, note); setSaved(true); } catch { setSaved(false); } }}>Save thesis</button>
    {saved && <span role="status" className="text-xs ml-2 text-muted-foreground">Saved on this browser</span>}
  </details>;
}

// ─── Animated Number ───
function Skeleton({ className = "" }: { className?: string }) {
  return <div className={cn("animate-pulse bg-muted rounded-lg", className)} />;
}

function CardSkeleton() {
  return (
    <div className="bg-card border border-border rounded-2xl p-4 space-y-3">
      <div className="flex items-center gap-3">
        <Skeleton className="w-10 h-10 rounded-xl" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-3 w-40" />
        </div>
        <Skeleton className="h-6 w-16 rounded-full" />
      </div>
      <Skeleton className="h-3 w-full" />
      <Skeleton className="h-3 w-3/4" />
    </div>
  );
}

// ─── Market Status Badge ───
function MarketStatus() {
  const [isOpen, setIsOpen] = useState(false);
  useEffect(() => {
    const check = () => {
      const now = new Date();
      const india = new Date(now.getTime() + 330 * 60000);
      const hrs = india.getUTCHours() + india.getUTCMinutes() / 60;
      const weekday = india.getUTCDay() > 0 && india.getUTCDay() < 6;
      setIsOpen(weekday && hrs >= 9.25 && hrs < 15.5);
    };
    check();
    const id = setInterval(check, 60000);
    return () => clearInterval(id);
  }, []);
  return (
    <div title="Indicative weekday trading hours in IST; exchange holidays are not checked." className={cn("flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold tracking-wide uppercase",
      isOpen ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "bg-zinc-500/10 text-zinc-500"
    )}>
      <div className={cn("w-1.5 h-1.5 rounded-full", isOpen ? "bg-emerald-500 animate-pulse" : "bg-zinc-400")} />
      {isOpen ? "Trading hours*" : "Outside hours*"}
    </div>
  );
}

// ─── Portfolio Summary Card ───
function PortfolioSummary({ prices }: { prices: PriceData[] }) {
  const gainers = prices.filter(p => p.changePct > 0).length;
  const losers = prices.filter(p => p.changePct < 0).length;
  const avgChange = prices.length ? prices.reduce((s, p) => s + p.changePct, 0) / prices.length : 0;
  const topGainer = [...prices].sort((a, b) => b.changePct - a.changePct)[0];
  const topLoser = [...prices].sort((a, b) => a.changePct - b.changePct)[0];

  return (
    <div className="space-y-3">
      {/* Main stats row */}
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-card border border-border rounded-2xl p-3 text-center">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Stocks</p>
          <p className="text-xl font-bold">{prices.length}</p>
        </div>
        <div className="bg-card border border-border rounded-2xl p-3 text-center">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Gainers</p>
          <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400">{gainers}</p>
        </div>
        <div className="bg-card border border-border rounded-2xl p-3 text-center">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Losers</p>
          <p className="text-xl font-bold text-red-500">{losers}</p>
        </div>
      </div>

      {/* Portfolio sentiment bar */}
      <div className="bg-card border border-border rounded-2xl p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-muted-foreground">Average stock move</span>
          <span className={cn("text-sm font-bold", avgChange >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-500")}>
            {formatPercent(avgChange)} avg
          </span>
        </div>
        <div className="w-full h-2.5 bg-muted rounded-full overflow-hidden flex">
          <div
            className="h-full bg-gradient-to-r from-emerald-400 to-emerald-500 rounded-l-full transition-all duration-700"
            style={{ width: `${prices.length ? (gainers / prices.length) * 100 : 50}%` }}
          />
          <div
            className="h-full bg-gradient-to-r from-red-400 to-red-500 rounded-r-full transition-all duration-700"
            style={{ width: `${prices.length ? (losers / prices.length) * 100 : 50}%` }}
          />
        </div>
        <div className="flex justify-between mt-1.5">
          <span className="text-[10px] text-emerald-600 dark:text-emerald-400">{gainers} up</span>
          <span className="text-[10px] text-red-500">{losers} down</span>
        </div>
      </div>

      {/* Top mover cards */}
      {topGainer && topLoser && (
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-gradient-to-br from-emerald-500/5 to-emerald-500/10 border border-emerald-500/20 rounded-2xl p-3">
            <div className="flex items-center gap-1.5 mb-1">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">Top Gainer</span>
            </div>
            <p className="text-sm font-bold">{topGainer.ticker}</p>
            <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">{formatPercent(topGainer.changePct)}</p>
          </div>
          <div className="bg-gradient-to-br from-red-500/5 to-red-500/10 border border-red-500/20 rounded-2xl p-3">
            <div className="flex items-center gap-1.5 mb-1">
              <TrendingDown className="w-3.5 h-3.5 text-red-500" />
              <span className="text-[10px] text-red-500 font-medium">Top Loser</span>
            </div>
            <p className="text-sm font-bold">{topLoser.ticker}</p>
            <p className="text-lg font-bold text-red-500">{formatPercent(topLoser.changePct)}</p>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Stock Card (Interactive) ───
function StockCard({ price, rank }: { price: PriceData; rank: number }) {
  const [expanded, setExpanded] = useState(false);
  const isUp = price.changePct >= 0;
  const pctOf52w = price.high52w > price.low52w
    ? ((price.close - price.low52w) / (price.high52w - price.low52w)) * 100
    : 50;

  return (
    <div
      className={cn(
        "bg-card border rounded-2xl overflow-hidden transition-all duration-300 active:scale-[0.98]",
        expanded ? "border-accent/30 shadow-lg shadow-accent/5" : "border-border"
      )}
      onClick={() => setExpanded(!expanded)}
    >
      <div className="p-3.5 flex items-center gap-3">
        {/* Rank / Sector icon */}
        <div className={cn(
          "w-10 h-10 rounded-xl flex items-center justify-center text-xs font-bold shrink-0",
          isUp ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "bg-red-500/10 text-red-500"
        )}>
          {rank}
        </div>

        {/* Name & sector */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-bold truncate">{price.ticker}</span>
            <span className="text-[10px] px-1.5 py-0.5 bg-muted rounded-md text-muted-foreground">{price.sector}</span>
          </div>
          <p className="text-xs text-muted-foreground truncate">{price.name}</p>
          <p className="text-[10px] text-muted-foreground">Daily close: {price.date} (not a live quote)</p>
        </div>

        {/* Price & change */}
        <div className="text-right shrink-0">
          <p className="text-sm font-bold">₹{price.close.toLocaleString("en-IN")}</p>
          <div className={cn(
            "inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-xs font-semibold",
            isUp ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "bg-red-500/10 text-red-500"
          )}>
            {isUp ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
            {formatPercent(price.changePct)}
          </div>
        </div>
      </div>

      {/* Expanded details */}
      {expanded && (
        <div className="px-3.5 pb-3.5 space-y-3 border-t border-border/50 pt-3 animate-in slide-in-from-top-2 duration-200">
          {/* 52-week range bar */}
          <div>
            <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
              <span>52W Low: ₹{price.low52w?.toLocaleString("en-IN")}</span>
              <span>52W High: ₹{price.high52w?.toLocaleString("en-IN")}</span>
            </div>
            <div className="relative w-full h-2 bg-muted rounded-full">
              <div className="absolute h-full bg-gradient-to-r from-red-400 via-yellow-400 to-emerald-400 rounded-full" style={{ width: "100%" }} />
              <div
                className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-white dark:bg-zinc-900 border-2 border-accent rounded-full shadow-md transition-all"
                style={{ left: `calc(${Math.min(Math.max(pctOf52w, 2), 98)}% - 6px)` }}
              />
            </div>
          </div>

          {/* Stats grid */}
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-muted/50 rounded-xl p-2 text-center">
              <p className="text-[9px] text-muted-foreground uppercase">Volume</p>
              <p className="text-xs font-semibold">{formatNumber(price.volume)}</p>
            </div>
            <div className="bg-muted/50 rounded-xl p-2 text-center">
              <p className="text-[9px] text-muted-foreground uppercase">Vol Ratio</p>
              <p className={cn("text-xs font-semibold", price.volumeRatio > 1.5 ? "text-amber-500" : "")}>{price.volumeRatio.toFixed(1)}x</p>
            </div>
            <div className="bg-muted/50 rounded-xl p-2 text-center">
              <p className="text-[9px] text-muted-foreground uppercase">Mkt Cap</p>
              <p className="text-xs font-semibold">{formatNumber(price.marketCap)}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Announcement Card (Upgraded) ───
function AnnouncementCard({ ann, detailed = false }: { ann: Announcement; detailed?: boolean }) {
  const [expanded, setExpanded] = useState(detailed);
  const isCritical = ann.priority === "critical";

  return (
    <div
      className={cn(
        "bg-card border rounded-2xl overflow-hidden transition-all duration-300 active:scale-[0.98]",
        isCritical ? "border-red-500/30 shadow-md shadow-red-500/5" : "border-border",
      )}
      onClick={() => setExpanded(!expanded)}
    >
      {/* Priority accent bar */}
      <div className={cn("h-1", {
        "bg-gradient-to-r from-red-500 to-red-400": ann.priority === "critical",
        "bg-gradient-to-r from-amber-500 to-amber-400": ann.priority === "high",
        "bg-gradient-to-r from-blue-500 to-blue-400": ann.priority === "medium",
        "bg-transparent": ann.priority === "low",
      })} />

      <div className="p-3.5">
        <div className="flex items-start gap-3">
          {/* Priority icon */}
          <div className={cn(
            "w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5",
            ann.priority === "critical" ? "bg-red-500/10" : ann.priority === "high" ? "bg-amber-500/10" : "bg-blue-500/10"
          )}>
            {ann.priority === "critical" ? <Flame className="w-4 h-4 text-red-500" /> :
             ann.priority === "high" ? <AlertTriangle className="w-4 h-4 text-amber-500" /> :
             <Info className="w-4 h-4 text-blue-500" />}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap mb-1">
              <span className="text-xs font-bold text-accent">{ann.ticker}</span>
              <span className={cn("text-[10px] px-1.5 py-0.5 rounded-full font-medium", getPriorityColor(ann.priority))}>
                {ann.priority}
              </span>
              <span className={cn("text-[10px] px-1.5 py-0.5 rounded-full font-medium", getCategoryColor(ann.category))}>
                {CATEGORY_LABELS[ann.category] || ann.category}
              </span>
            </div>
            <p className="text-sm font-semibold leading-snug">{ann.headline}</p>
            <p className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1">
              <Clock className="w-3 h-3" />{timeAgo(ann.date)} · {ann.source}
            </p>
          </div>

          <ChevronDown className={cn("w-4 h-4 text-muted-foreground transition-transform shrink-0", expanded && "rotate-180")} />
        </div>

        {expanded && (
          <div className="mt-3 pt-3 border-t border-border/50 animate-in slide-in-from-top-2 duration-200">
            <p className="text-sm text-muted-foreground leading-relaxed">{ann.summary}</p>

            {ann.financials && (
              <div className="grid grid-cols-2 gap-2 mt-3">
                {ann.financials.revenue && (
                  <div className="bg-muted/50 rounded-xl p-2.5">
                    <p className="text-[9px] text-muted-foreground uppercase mb-0.5">Revenue</p>
                    <p className="text-xs font-bold">{formatNumber(ann.financials.revenue.current)}</p>
                    <p className={cn("text-[10px] font-medium", ann.financials.revenue.yoy >= 0 ? "text-emerald-500" : "text-red-500")}>
                      {formatPercent(ann.financials.revenue.yoy)} YoY
                    </p>
                  </div>
                )}
                {ann.financials.pat && (
                  <div className="bg-muted/50 rounded-xl p-2.5">
                    <p className="text-[9px] text-muted-foreground uppercase mb-0.5">PAT</p>
                    <p className="text-xs font-bold">{formatNumber(ann.financials.pat.current)}</p>
                    <p className={cn("text-[10px] font-medium", ann.financials.pat.yoy >= 0 ? "text-emerald-500" : "text-red-500")}>
                      {formatPercent(ann.financials.pat.yoy)} YoY
                    </p>
                  </div>
                )}
              </div>
            )}

            {ann.sourceUrl && (
              <a href={ann.sourceUrl} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1 mt-2 text-xs text-accent hover:underline"
                onClick={(e) => e.stopPropagation()}>
                View source <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Alert Card (Upgraded) ───
function AlertCard({ alert }: { alert: PriceAlert }) {
  const config = {
    price_spike: { icon: TrendingUp, gradient: "from-emerald-500/10 to-emerald-500/5", border: "border-emerald-500/20", iconColor: "text-emerald-500", label: "Price Spike" },
    price_drop: { icon: TrendingDown, gradient: "from-red-500/10 to-red-500/5", border: "border-red-500/20", iconColor: "text-red-500", label: "Price Drop" },
    volume_surge: { icon: Activity, gradient: "from-amber-500/10 to-amber-500/5", border: "border-amber-500/20", iconColor: "text-amber-500", label: "Volume Surge" },
  }[alert.type];

  const Icon = config.icon;

  return (
    <div className={cn("bg-gradient-to-r border rounded-2xl p-4", config.gradient, config.border)}>
      <div className="flex items-start gap-3">
        <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center bg-white/50 dark:bg-black/20 shrink-0")}>
          <Icon className={cn("w-5 h-5", config.iconColor)} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-sm font-bold">{alert.ticker}</span>
            <span className={cn("text-[10px] px-2 py-0.5 rounded-full font-semibold", config.border, config.iconColor, "bg-white/50 dark:bg-black/20")}>
              {config.label}
            </span>
          </div>
          <p className="text-xs text-muted-foreground">{alert.name}</p>
          <p className="text-sm font-medium mt-1">{alert.message}</p>
          <p className="text-[10px] text-muted-foreground mt-1">{timeAgo(alert.date)}</p>
        </div>
      </div>
    </div>
  );
}

// ─── Research View (Upgraded) ───
function ResearchView({ report, onBack, isDemo }: { report: ResearchReport; onBack: () => void; isDemo: boolean }) {
  const [activeSection, setActiveSection] = useState<"business" | "financial" | "narrative">("business");

  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center hover:bg-muted/80 transition active:scale-95">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex-1">
          <h2 className="text-lg font-bold">{report.ticker}</h2>
          <p className="text-xs text-muted-foreground">{report.companyName} · {isDemo ? "Sample research report" : "Primary-source research"}</p>
        </div>
        <div className="text-right">
          <div className="flex items-center gap-1 text-[10px] text-accent">
            <Zap className="w-3 h-3" />{isDemo ? "Sample data" : "Cited evidence"}
          </div>
          <p className="text-[10px] text-muted-foreground">{new Date(report.generatedAt).toLocaleDateString("en-IN")}</p>
        </div>
      </div>

      {report.sources && report.sources.length > 0 && <details className="bg-card border border-border rounded-xl p-3 text-xs">
        <summary className="cursor-pointer font-medium">Primary sources ({report.sources.length})</summary>
        <ul className="space-y-2 pt-2">{report.sources.map(source => <li key={source.id}>
          <a className="text-accent underline" href={source.url} target="_blank" rel="noopener noreferrer">[{source.id}] {source.title}</a>
        </li>)}</ul>
      </details>}
      {/* Section tabs */}
      <div className="flex bg-muted/50 rounded-xl p-1 gap-1">
        {([
          { key: "business" as const, label: "Business", icon: Building2 },
          { key: "financial" as const, label: "Financials", icon: BarChart3 },
          { key: "narrative" as const, label: "Analysis", icon: Eye },
        ]).map(({ key, label, icon: SIcon }) => (
          <button
            key={key}
            onClick={() => setActiveSection(key)}
            className={cn(
              "flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition-all",
              activeSection === key ? "bg-card shadow-sm text-foreground" : "text-muted-foreground"
            )}
          >
            <SIcon className="w-3.5 h-3.5" />{label}
          </button>
        ))}
      </div>

      {/* Business section */}
      {activeSection === "business" && (
        <div className="space-y-3 animate-in fade-in slide-in-from-right-4 duration-200">
          <div className="bg-card border border-border rounded-2xl p-4">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Company Overview</h3>
            <p className="text-sm leading-relaxed">{report.businessSnapshot.description}</p>
          </div>
          <div className="bg-card border border-border rounded-2xl p-4">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Revenue Mix</h3>
            <p className="text-sm leading-relaxed">{report.businessSnapshot.revenueMix}</p>
          </div>
          <div className="bg-card border border-border rounded-2xl p-4">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Key Products</h3>
            <p className="text-sm leading-relaxed">{report.businessSnapshot.keyProducts}</p>
          </div>
          {report.businessSnapshot.segments.length > 0 && (
            <div className="bg-card border border-border rounded-2xl p-4">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Business Segments</h3>
              <div className="flex flex-wrap gap-1.5">
                {report.businessSnapshot.segments.map((seg, i) => (
                  <span key={i} className="text-xs bg-accent/10 text-accent px-2.5 py-1 rounded-full">{seg}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Financial section */}
      {activeSection === "financial" && (
        <div className="space-y-3 animate-in fade-in slide-in-from-right-4 duration-200">
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: "Revenue", value: report.financialSnapshot.revenue },
              { label: "EBITDA", value: report.financialSnapshot.ebitda },
              { label: "PAT", value: report.financialSnapshot.pat },
              { label: "EBITDA Margin", value: report.financialSnapshot.ebitdaMargin },
              { label: "PAT Margin", value: report.financialSnapshot.patMargin },
              { label: "Debt/Equity", value: report.financialSnapshot.debtToEquity },
              { label: "ROCE", value: report.financialSnapshot.roce },
            ].map(({ label, value }) => (
              <div key={label} className="bg-card border border-border rounded-2xl p-3">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">{label}</p>
                <p className="text-sm font-bold">{value}</p>
              </div>
            ))}
          </div>
          {report.financialSnapshot.highlights.length > 0 && (
            <div className="bg-card border border-border rounded-2xl p-4">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Key Highlights</h3>
              <ul className="space-y-2">
                {report.financialSnapshot.highlights.map((h, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                    <span>{h}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Narrative vs Numbers */}
      {activeSection === "narrative" && (
        <div className="space-y-3 animate-in fade-in slide-in-from-right-4 duration-200">
          <div className="bg-card border border-border rounded-2xl p-4">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">AI Analysis</h3>
            <p className="text-sm leading-relaxed">{report.narrativeVsNumbers.summary}</p>
          </div>
          {report.narrativeVsNumbers.comparisons.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">Narrative vs Reality</h3>
              {report.narrativeVsNumbers.comparisons.map((c, i) => (
                <div key={i} className="bg-card border border-border rounded-2xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-bold">{c.metric}</span>
                    <span className={cn(
                      "text-[10px] px-2 py-0.5 rounded-full font-semibold",
                      c.verdict === "aligned" ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" :
                      c.verdict === "exceeded" ? "bg-blue-500/10 text-blue-600 dark:text-blue-400" :
                      "bg-red-500/10 text-red-500"
                    )}>
                      {c.verdict === "aligned" ? "✓ Aligned" : c.verdict === "exceeded" ? "↑ Exceeded" : "✗ Missed"}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-muted/50 rounded-xl p-2.5">
                      <p className="text-[9px] text-muted-foreground uppercase mb-0.5">Management Said</p>
                      <p className="text-xs">{c.management_said}</p>
                    </div>
                    <div className="bg-muted/50 rounded-xl p-2.5">
                      <p className="text-[9px] text-muted-foreground uppercase mb-0.5">Actual</p>
                      <p className="text-xs font-semibold">{c.actual}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Search Autocomplete ───
function SearchAutocomplete({
  value,
  onChange,
  onSelect,
  companies,
}: {
  value: string;
  onChange: (v: string) => void;
  onSelect: (ticker: string) => void;
  companies: { ticker: string; name: string; sector: string }[];
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
    if (!value.trim()) return [];
    const q = value.toLowerCase();
    return companies.filter(c =>
      c.ticker.toLowerCase().includes(q) || c.name.toLowerCase().includes(q)
    ).slice(0, 6);
  }, [value, companies]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={ref} className="relative">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
      <input
        type="text"
        placeholder="Search company (e.g. ZOMATO, TCS)..."
        value={value}
        onChange={(e) => { onChange(e.target.value.toUpperCase()); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && value.trim()) {
            onSelect(value.trim());
            setOpen(false);
          }
        }}
        className="w-full pl-10 pr-10 py-3.5 rounded-2xl bg-muted/50 border border-border text-sm focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent transition-all"
      />
      {value && (
        <button onClick={() => { onChange(""); setOpen(false); }} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
          <X className="w-4 h-4" />
        </button>
      )}
      {open && filtered.length > 0 && (
        <div className="absolute z-50 top-full mt-1 w-full bg-card border border-border rounded-2xl shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
          {filtered.map((c) => (
            <button
              key={c.ticker}
              onClick={() => { onSelect(c.ticker); onChange(c.ticker); setOpen(false); }}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors text-left"
            >
              <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center">
                <span className="text-xs font-bold text-accent">{c.ticker.slice(0, 2)}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate">{c.ticker}</p>
                <p className="text-xs text-muted-foreground truncate">{c.name}</p>
              </div>
              <span className="text-[10px] text-muted-foreground bg-muted px-2 py-0.5 rounded-md">{c.sector}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── AI Chat View ───
function ChatView({ prices, demoMode }: { prices: PriceData[]; demoMode: boolean }) {
  const [messages, setMessages] = useState<ChatMessage[]>(() => [{
      role: "assistant",
      content: "Hey! I'm FINN, your AI investment assistant. Ask me anything about your portfolio, market trends, or specific stocks. Try:\n\n• \"How is my portfolio doing today?\"\n• \"Analyze RELIANCE for me\"\n• \"Which sectors are performing well?\"\n• \"What should I watch out for this week?\"",
      timestamp: new Date(),
    }]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, isTyping]);

  const buildPortfolioContext = () => {
    if (!prices.length) return "No live data available.";
    const gainers = prices.filter(p => p.changePct > 0);
    const losers = prices.filter(p => p.changePct < 0);
    const topGainer = [...prices].sort((a, b) => b.changePct - a.changePct)[0];
    const topLoser = [...prices].sort((a, b) => a.changePct - b.changePct)[0];
    const avgChange = prices.reduce((s, p) => s + p.changePct, 0) / prices.length;

    let ctx = `${demoMode ? "DEMO DATA ? sample figures, not actual market observations." : "Completed daily price observations; not real-time quotes."} Portfolio of ${prices.length} stocks. ${gainers.length} gaining, ${losers.length} declining. Avg change: ${avgChange.toFixed(2)}%.\n`;
    ctx += `Top gainer: ${topGainer.ticker} (${topGainer.changePct.toFixed(2)}%). Top loser: ${topLoser.ticker} (${topLoser.changePct.toFixed(2)}%).\n`;
    ctx += `Stock details:\n`;
    prices.forEach(p => {
      ctx += `- ${p.ticker} (${p.sector}): ₹${p.close} (${p.changePct >= 0 ? "+" : ""}${p.changePct.toFixed(2)}%), Vol ratio: ${p.volumeRatio.toFixed(1)}x\n`;
    });
    return ctx;
  };

  const sendMessage = async () => {
    if (!input.trim() || isTyping) return;
    const userMsg: ChatMessage = { role: "user", content: input.trim(), timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setIsTyping(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMsg.content,
          history: messages.filter(m => m.role !== "assistant" || messages.indexOf(m) > 0).map(m => ({ role: m.role, content: m.content })),
          portfolioContext: buildPortfolioContext(),
        }),
      });
      const data = await res.json();
      setMessages(prev => [...prev, { role: "assistant", content: data.reply, timestamp: new Date() }]);
    } catch {
      setMessages(prev => [...prev, { role: "assistant", content: "Sorry, I couldn't connect. Please try again.", timestamp: new Date() }]);
    }
    setIsTyping(false);
    inputRef.current?.focus();
  };

  const quickPrompts = [
    "How is my portfolio today?",
    "Which sectors are strong?",
    "Any stocks with unusual volume?",
    "Summarize today's market",
  ];

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Chat messages */}
      <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto space-y-3 pb-4">
        {messages.map((msg, i) => (
          <div key={i} className={cn("flex gap-2", msg.role === "user" ? "justify-end" : "justify-start")}>
            {msg.role === "assistant" && (
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center shrink-0 mt-1">
                <Bot className="w-3.5 h-3.5 text-white" />
              </div>
            )}
            <div className={cn(
              "max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap",
              msg.role === "user"
                ? "bg-accent text-white rounded-br-md"
                : "bg-card border border-border rounded-bl-md"
            )}>
              {msg.content}
            </div>
          </div>
        ))}
        {isTyping && (
          <div className="flex gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center shrink-0 mt-1">
              <Bot className="w-3.5 h-3.5 text-white" />
            </div>
            <div className="bg-card border border-border rounded-2xl rounded-bl-md px-4 py-3">
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                <div className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                <div className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          </div>
        )}

        {/* Quick prompts (only show at start) */}
        {messages.length <= 1 && (
          <div className="space-y-1.5 mt-2">
            {quickPrompts.map((prompt, i) => (
              <button
                key={i}
                onClick={() => {
                  const userMsg: ChatMessage = { role: "user", content: prompt, timestamp: new Date() };
                  setMessages(prev => [...prev, userMsg]);
                  setIsTyping(true);
                  fetch("/api/chat", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ message: prompt, history: [], portfolioContext: buildPortfolioContext() }),
                  }).then(r => r.json()).then(data => {
                    setMessages(prev => [...prev, { role: "assistant", content: data.reply, timestamp: new Date() }]);
                    setIsTyping(false);
                  }).catch(() => {
                    setMessages(prev => [...prev, { role: "assistant", content: "Sorry, couldn't connect.", timestamp: new Date() }]);
                    setIsTyping(false);
                  });
                }}
                className="w-full text-left bg-card border border-border rounded-xl px-3.5 py-2.5 text-sm text-muted-foreground hover:bg-muted/50 hover:border-accent/30 transition-all active:scale-[0.98]"
              >
                <Sparkles className="w-3.5 h-3.5 inline mr-2 text-accent" />{prompt}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Input bar */}
      <div className="shrink-0 pt-2 border-t border-border/50">
        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") sendMessage(); }}
            placeholder="Ask FINN anything..."
            aria-label="Ask FINN" className="min-w-0 flex-1 bg-muted/50 border border-border rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent transition-all"
            disabled={isTyping}
          />
          <button
            onClick={sendMessage}
            disabled={!input.trim() || isTyping}
            className={cn(
              "w-11 h-11 rounded-2xl flex items-center justify-center transition-all active:scale-90",
              input.trim() ? "bg-accent text-white shadow-lg shadow-accent/30" : "bg-muted text-muted-foreground"
            )}
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ═══════════ MAIN APP ═══════════
export default function Home() {
  const [activeTab, setActiveTab] = useState<Tab>("feed");
  const [investorMode, setInvestorMode] = useState<InvestorMode>("quick");
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        const mode = localStorage.getItem("finn-investor-mode");
        if (mode === "quick" || mode === "deep" || mode === "future") {
          setInvestorMode(mode); setActiveTab(mode === "quick" ? "feed" : "research");
        }
      } catch { /* Keep the default if browser storage is disabled. */ }
    }, 0);
    return () => clearTimeout(timer);
  }, []);
  const chooseMode = (mode: InvestorMode) => {
    setInvestorMode(mode);
    setActiveTab(mode === "quick" ? "feed" : "research");
    try { localStorage.setItem("finn-investor-mode", mode); } catch { /* Optional persistence. */ }
  };
  const [demoMode, setDemoMode] = useState(false);
  const [prices, setPrices] = useState<PriceData[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [alerts, setAlerts] = useState<PriceAlert[]>([]);
  const [research, setResearch] = useState<ResearchReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [researchLoading, setResearchLoading] = useState(false);
  const [researchError, setResearchError] = useState("");
  const [researchSource, setResearchSource] = useState("");
  const [dataNotice, setDataNotice] = useState("");
  const [searchTicker, setSearchTicker] = useState("");
  const [timeWindow, setTimeWindow] = useState<TimeWindow>("24h");
  const [showSettings, setShowSettings] = useState(false);
  const [alertConfig, setAlertConfig] = useState<AlertConfig>({ priceThreshold: 3, volumeMultiple: 2 });
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [sectorFilter, setSectorFilter] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<"change" | "name" | "volume">("change");
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const allCompanies = ALL_COMPANIES;
  const [profile, setProfile] = useState({ horizon: "1-3 years", focusSector: "all", eventFocus: "all" });
  const [preferencesLoaded, setPreferencesLoaded] = useState(false);
  const [feedStatus, setFeedStatus] = useState("");
  const [feedWindowCounts, setFeedWindowCounts] = useState<Record<string, number>>({});
  const [latestFiling, setLatestFiling] = useState("");
  const [alertStatus, setAlertStatus] = useState("");
  const refreshSequence = useRef(0);
  const researchSequence = useRef(0);
  const invalidateRefresh = useCallback(() => { refreshSequence.current++; }, []);
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        const saved = JSON.parse(localStorage.getItem("finn-preferences") || "null");
        if (saved && typeof saved === "object") {
          setProfile({ horizon: ["Under 1 year", "1-3 years", "3-5 years", "5+ years"].includes(saved.horizon) ? saved.horizon : "1-3 years", focusSector: typeof saved.focusSector === "string" ? saved.focusSector : "all", eventFocus: typeof saved.eventFocus === "string" ? saved.eventFocus : "all" });
          if (Number.isFinite(saved.priceThreshold) && saved.priceThreshold > 0 && Number.isFinite(saved.volumeMultiple) && saved.volumeMultiple > 0) setAlertConfig({ priceThreshold: saved.priceThreshold, volumeMultiple: saved.volumeMultiple });
        }
      } catch { /* Default preferences remain usable if storage is unavailable. */ }
      setPreferencesLoaded(true);
    }, 0);
    return () => clearTimeout(timer);
  }, []);
  useEffect(() => {
    if (!preferencesLoaded) return;
    try { localStorage.setItem("finn-preferences", JSON.stringify({ ...profile, ...alertConfig })); } catch { /* Optional local persistence. */ }
  }, [profile, alertConfig, preferencesLoaded]);

  const fetchData = useCallback(async (foreground = true) => {
    const sequence = ++refreshSequence.current;
    if (foreground) setLoading(true);
    try {
      const [priceRes, annRes, alertRes] = await Promise.all([
        fetch(`/api/prices?demo=${demoMode ? 1 : 0}`),
        fetch(`/api/announcements?demo=${demoMode ? 1 : 0}&window=${timeWindow}`),
        fetch(`/api/alerts?demo=${demoMode ? 1 : 0}&priceThreshold=${alertConfig.priceThreshold}&volumeMultiple=${alertConfig.volumeMultiple}`),
      ]);
      const [priceData, annData, alertData] = await Promise.all([
        priceRes.json(), annRes.json(), alertRes.json(),
      ]);
      if (sequence !== refreshSequence.current) return;
      setFeedWindowCounts(annData.windowCounts || {});
      setLatestFiling(annData.latestAvailableAt ? new Date(annData.latestAvailableAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) + " IST" : "");
      setFeedStatus(annData.source === "unavailable" ? "Exchange feed unavailable; an empty screen is not confirmation of no filings." : annData.coverage && typeof annData.coverage === "object" ? `Checked ${annData.coverage.checked}/${annData.coverage.total} companies. ${annData.coverage.failed.length ? `Unavailable: ${annData.coverage.failed.join(", ")}.` : ""} ${annData.coverage.indexed?.length ? `Recent index fallback: ${annData.coverage.indexed.join(", ")} (limited coverage).` : ""} ${annData.coverage.incomplete.length ? `Coverage incomplete: ${annData.coverage.incomplete.join(", ")}.` : ""}` : "");
      setAlertStatus(alertData.source === "unavailable" ? "Price alert check unavailable." : !demoMode && alertData.liveCount < alertData.totalCount ? `Price checks cover ${alertData.liveCount}/${alertData.totalCount} holdings.` : "");
      setDataNotice([
        demoMode ? "DEMO MODE: all figures and filings are sample data." : "Live mode: completed daily prices; checks refresh every 60 seconds while this app is open.",
        !demoMode && priceData.liveCount < priceData.totalCount ? `Prices available for ${priceData.liveCount} of ${priceData.totalCount} holdings. Missing: ${(priceData.missingTickers || []).join(", ") || "not reported"}.` : "",
        annData.source === "unavailable" ? "Exchange feed unavailable." : "",
        alertData.source === "unavailable" ? "Price alerts unavailable." : "",
        annData.source === "mock" ? "Announcements are demo data." : "",
        alertData.source === "mock" ? "Alerts are demo data." : "",
      ].filter(Boolean).join(" "));
      setPrices(priceData.prices || []);
      setAnnouncements(annData.announcements || []);
      setAlerts(alertData.alerts || []);
      setLastUpdated(new Date());
    } catch (err) {
      console.error("Fetch error:", err);
      if (sequence === refreshSequence.current) setDataNotice("Data refresh failed. Previously displayed data may be stale.");
    }
    if (sequence === refreshSequence.current) setLoading(false);
  }, [timeWindow, alertConfig, demoMode]);

  useEffect(() => {
    // Debounce edits to thresholds instead of issuing requests per keystroke.
    const timer = setTimeout(() => { void fetchData(); }, 150);
    const interval = setInterval(() => { void fetchData(false); }, 60000);
    return () => { clearTimeout(timer); clearInterval(interval); invalidateRefresh(); };
  }, [fetchData, invalidateRefresh]);

  const fetchResearch = async (ticker: string) => {
    if (researchLoading) return;
    const sequence = ++researchSequence.current;
    setResearchLoading(true);
    setResearchError("");
    try {
      const res = await fetch(`/api/research?demo=${demoMode ? 1 : 0}&ticker=${encodeURIComponent(ticker)}`);
      const data = await res.json();
      if (sequence !== researchSequence.current) return;
      if (!res.ok || !data.report) throw new Error(data.error || "Research is unavailable.");
      setResearch(data.report);
      setResearchSource(data.source || "unknown");
    } catch (err) {
      if (sequence === researchSequence.current) setResearchError(err instanceof Error ? err.message : "Research is unavailable. Please retry.");
    }
    if (sequence === researchSequence.current) setResearchLoading(false);
  };

  // Derived data
  const sectors = useMemo(() => [...new Set(prices.map(p => p.sector))].sort(), [prices]);
  const filteredPrices = useMemo(() => {
    let list = sectorFilter ? prices.filter(p => p.sector === sectorFilter) : prices;
    if (sortBy === "change") list = [...list].sort((a, b) => Math.abs(b.changePct) - Math.abs(a.changePct));
    else if (sortBy === "name") list = [...list].sort((a, b) => a.ticker.localeCompare(b.ticker));
    else if (sortBy === "volume") list = [...list].sort((a, b) => b.volumeRatio - a.volumeRatio);
    return list;
  }, [prices, sectorFilter, sortBy]);

  const visibleAnnouncements = announcements.filter(ann => (profile.focusSector === "all" || ALL_COMPANIES.find(stock => stock.ticker === ann.ticker)?.sector === profile.focusSector) && (profile.eventFocus === "all" || ann.category === profile.eventFocus));
  const alertCount = alerts.length + visibleAnnouncements.filter(a => a.priority === "critical" || a.priority === "high").length;

  return (
    <main className="flex flex-col h-[100dvh] max-h-[100dvh] overflow-hidden bg-background">
      {/* ─── Header ─── */}
      <header className="shrink-0 border-b border-border bg-background/80 backdrop-blur-xl px-4 pt-3 pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 via-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
              <BarChart3 className="w-4.5 h-4.5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-extrabold tracking-tight">FINN</h1>
                <MarketStatus />
              </div>
              <p className="text-[10px] text-muted-foreground -mt-0.5">AI-Powered Investment Intelligence</p>
            </div>
          </div>
          <div className="flex items-center gap-0.5">
            <button className="text-xs rounded-lg border border-border px-2 py-1" onClick={() => { researchSequence.current++; setResearchLoading(false); setDemoMode(mode => !mode); setResearch(null); setResearchError(""); }} aria-label="Switch between live and demo data">{demoMode ? "Demo" : "Live"}</button>
            <button
              aria-label="Refresh data" onClick={() => fetchData()}
              className="p-2 rounded-xl hover:bg-muted transition-all active:scale-90"
              disabled={loading}
            >
              <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
            </button>
            <button
              aria-label="Investor preferences" aria-expanded={showSettings} onClick={() => setShowSettings(!showSettings)}
              className={cn("p-2 rounded-xl transition-all active:scale-90", showSettings ? "bg-accent/10 text-accent" : "hover:bg-muted")}
            >
              <Settings2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Settings panel */}
        {showSettings && (
          <div className="mt-3 pt-3 border-t border-border/50 space-y-3 animate-in slide-in-from-top-2 duration-200">
            <div className="grid grid-cols-2 gap-2 text-xs">
              <label>Investment horizon<select aria-label="Investment horizon" className="block w-full bg-muted border border-border rounded-lg p-2 mt-1" value={profile.horizon} onChange={e => setProfile(p => ({ ...p, horizon: e.target.value }))}>{["Under 1 year", "1-3 years", "3-5 years", "5+ years"].map(value => <option key={value}>{value}</option>)}</select></label>
              <label>Sector focus<select aria-label="Sector focus" className="block w-full bg-muted border border-border rounded-lg p-2 mt-1" value={profile.focusSector} onChange={e => setProfile(p => ({ ...p, focusSector: e.target.value }))}><option value="all">All sectors</option>{[...new Set(PORTFOLIO.map(s => s.sector))].sort().map(value => <option key={value}>{value}</option>)}</select></label>
              <label className="col-span-2">Filings I care about<select aria-label="Announcement focus" className="block w-full bg-muted border border-border rounded-lg p-2 mt-1" value={profile.eventFocus} onChange={e => setProfile(p => ({ ...p, eventFocus: e.target.value }))}><option value="all">All filing categories</option>{Object.entries(CATEGORY_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
            </div>
            <p className="text-[10px] text-muted-foreground">Saved on this browser. Sector and filing preferences filter the digest and material alerts; they do not change the portfolio.</p>
            <div className="flex items-center justify-between">
              <label className="text-xs text-muted-foreground">Price alert threshold (%)</label>
              <input type="number" value={alertConfig.priceThreshold} onChange={(e) => setAlertConfig((c) => ({ ...c, priceThreshold: parseFloat(e.target.value) || 3 }))}
                className="w-16 text-sm text-right bg-muted rounded-xl px-2 py-1.5 border border-border focus:ring-2 focus:ring-accent/50 focus:outline-none" step={0.5} min={0.5} />
            </div>
            <div className="flex items-center justify-between">
              <label className="text-xs text-muted-foreground">Volume alert multiple (x avg)</label>
              <input type="number" value={alertConfig.volumeMultiple} onChange={(e) => setAlertConfig((c) => ({ ...c, volumeMultiple: parseFloat(e.target.value) || 2 }))}
                className="w-16 text-sm text-right bg-muted rounded-xl px-2 py-1.5 border border-border focus:ring-2 focus:ring-accent/50 focus:outline-none" step={0.5} min={1} />
            </div>
            {lastUpdated && (
              <p className="text-[10px] text-muted-foreground text-center">
                Last updated: {lastUpdated.toLocaleTimeString("en-IN")}
              </p>
            )}
          </div>
        )}
      </header>

      {/* ─── Content ─── */}
      <section aria-label="Investor session" className="shrink-0 px-4 py-2 border-b border-border bg-card">
        <div className="flex items-center justify-between mb-2"><span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Your investing session</span><span className="text-[10px] text-muted-foreground">{investorMode === "quick" ? "2-minute daily check" : investorMode === "deep" ? "Evidence before decisions" : "Build a long-term thesis"}</span></div>
        <div className="grid grid-cols-3 gap-1.5">{([
          ["quick", "Quick Brief", "Busy investor"], ["deep", "Deep Review", "Hands-on analyst"], ["future", "Long-Term", "Future opportunities"],
        ] as const).map(([mode, title, subtitle]) => <button key={mode} onClick={() => chooseMode(mode)} aria-pressed={investorMode === mode} className={cn("rounded-xl p-2 text-left border transition-colors", investorMode === mode ? "border-accent bg-accent/10" : "border-border bg-background")}><span className="text-xs font-semibold block">{title}</span><span className="text-[9px] text-muted-foreground block mt-0.5">{subtitle}</span></button>)}</div>
      </section>
      {dataNotice && <p role="status" className="text-xs text-amber-500 px-4 py-2 border-b border-border">{dataNotice}</p>}
      <div className={cn("flex-1 min-h-0", activeTab === "chat" ? "overflow-hidden" : "overflow-y-auto")}>
        {loading ? (
          <div className="px-4 py-4 space-y-3">
            <CardSkeleton /><CardSkeleton /><CardSkeleton />
          </div>
        ) : (
          <div className={cn("px-4 py-4 space-y-4", activeTab === "chat" ? "h-full min-h-0" : "pb-24")}>

            {/* ═══ PORTFOLIO TAB ═══ */}
            {activeTab === "portfolio" && (
              <div className="space-y-4 animate-in fade-in duration-300">
                <PortfolioSummary prices={prices} />

                {/* Sector filter + sort */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h2 className="text-sm font-semibold flex items-center gap-1.5">
                      <TrendingUp className="w-3.5 h-3.5 text-accent" />Watchlist
                    </h2>
                    <div className="flex gap-1 bg-muted/50 rounded-lg p-0.5">
                      {([
                        { key: "change" as const, label: "Δ%" },
                        { key: "name" as const, label: "A-Z" },
                        { key: "volume" as const, label: "Vol" },
                      ]).map(({ key, label }) => (
                        <button key={key} onClick={() => setSortBy(key)}
                          className={cn("text-[10px] font-medium px-2 py-1 rounded-md transition-colors",
                            sortBy === key ? "bg-card shadow-sm" : "text-muted-foreground")}>{label}</button>
                      ))}
                    </div>
                  </div>

                  {/* Sector chips */}
                  <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1 no-scrollbar">
                    <button onClick={() => setSectorFilter(null)}
                      className={cn("shrink-0 text-[11px] font-medium px-3 py-1.5 rounded-full transition-all",
                        !sectorFilter ? "bg-accent text-white" : "bg-muted text-muted-foreground")}>All</button>
                    {sectors.map(s => (
                      <button key={s} onClick={() => setSectorFilter(sectorFilter === s ? null : s)}
                        className={cn("shrink-0 text-[11px] font-medium px-3 py-1.5 rounded-full transition-all",
                          sectorFilter === s ? "bg-accent text-white" : "bg-muted text-muted-foreground")}>{s}</button>
                    ))}
                  </div>
                </div>

                {/* Stock list */}
                <div className="space-y-2">
                  {filteredPrices.map((p, i) => (
                    <StockCard key={p.ticker} price={p} rank={i + 1} />
                  ))}
                </div>
              </div>
            )}

            {/* ═══ FEED TAB ═══ */}
            {activeTab === "feed" && (
              <div className="space-y-4 animate-in fade-in duration-300">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-semibold flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-accent" />Corporate Announcements
                  </h2>
                  <div className="flex gap-1 bg-muted/50 rounded-xl p-0.5">
                    {(["24h", "3d", "7d"] as const).map((w) => (
                      <button key={w} onClick={() => setTimeWindow(w)}
                        className={cn("text-[11px] font-medium px-3 py-1.5 rounded-lg transition-all",
                          timeWindow === w ? "bg-card shadow-sm" : "text-muted-foreground")}>{w}</button>
                    ))}
                  </div>
                </div>

                <p className="text-xs text-muted-foreground">{investorMode === "quick" ? "Your top five material filings first. Expand routine paperwork only when needed." : investorMode === "deep" ? "Review all filings by priority, open the original disclosure, then check the numbers." : "Look for changes in capital allocation, leadership, and the long-term business thesis."}</p>
                <p role="status" className="text-[11px] text-muted-foreground">{demoMode ? "Sample filings for interface exploration." : feedStatus}</p>
                {!demoMode && Object.keys(feedWindowCounts).length > 0 && <p className="text-[11px] text-muted-foreground">Portfolio filings: {feedWindowCounts["24h"] || 0} in 24h / {feedWindowCounts["3d"] || 0} in 3d / {feedWindowCounts["7d"] || 0} in 7d. {latestFiling && `Latest retrieved: ${latestFiling}.`}</p>}
                {(profile.focusSector !== "all" || profile.eventFocus !== "all") && <p className="text-xs text-accent">Your focus: {profile.focusSector} / {profile.eventFocus === "all" ? "all filings" : CATEGORY_LABELS[profile.eventFocus]}. <button className="underline" onClick={() => setProfile(p => ({ ...p, focusSector: "all", eventFocus: "all" }))}>Show all</button></p>}
                {/* Priority filter */}
                <div className="flex gap-1.5 overflow-x-auto pb-1">
                  {(["all", "critical", "high", "medium"] as const).map((p) => (
                    <button key={p} onClick={() => setPriorityFilter(p)} aria-pressed={priorityFilter === p}
                      className={cn("shrink-0 text-[11px] font-medium px-3 py-1.5 rounded-full transition-all capitalize",
                        priorityFilter === p ? "bg-accent text-white" : p === "all" ? "bg-muted text-muted-foreground" : getPriorityColor(p)
                      )}
                    >{p}</button>
                  ))}
                </div>

                <div className="space-y-2.5">
                  {visibleAnnouncements.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                      <FileText className="w-10 h-10 mb-3 opacity-30" />
                      <p className="text-sm font-medium">No matching filings in {timeWindow}</p>
                      <p className="text-xs text-center max-w-64">{feedWindowCounts[timeWindow] > 0 ? "Filings exist in this window. Clear your sector or category focus to see them." : "No portfolio filings were retrieved in this rolling time window. Check a wider period; partial company coverage is shown above."}</p>
                      <button className="mt-3 text-xs text-accent underline" onClick={() => { setProfile(p => ({ ...p, focusSector: "all", eventFocus: "all" })); setPriorityFilter("all"); setTimeWindow(feedWindowCounts["3d"] > 0 ? "3d" : "7d"); }}>Show recent portfolio filings</button>
                    </div>
                  ) : <>
                    {investorMode === "quick" && visibleAnnouncements.filter(a => a.priority !== "low").length > 5 && <button className="text-xs text-accent underline" onClick={() => { setInvestorMode("deep"); }}>Show the full digest</button>}
                    {visibleAnnouncements.filter(ann => ann.priority !== "low" && (priorityFilter === "all" || ann.priority === priorityFilter)).slice(0, investorMode === "quick" ? 5 : undefined).map(ann => <AnnouncementCard key={`${investorMode}-${ann.id}`} ann={ann} detailed={investorMode === "deep"} />)}
                    {priorityFilter === "all" && visibleAnnouncements.some(ann => ann.priority === "low") && <details className="text-sm text-muted-foreground">
                      <summary className="cursor-pointer py-2">Routine filings ({visibleAnnouncements.filter(ann => ann.priority === "low").length})</summary>
                      <div className="space-y-2.5">{visibleAnnouncements.filter(ann => ann.priority === "low").map(ann => <AnnouncementCard key={`${investorMode}-${ann.id}`} ann={ann} detailed={investorMode === "deep"} />)}</div>
                    </details>}
                    {priorityFilter !== "all" && !visibleAnnouncements.some(ann => ann.priority === priorityFilter) && <p className="text-sm text-muted-foreground">No filings at this priority.</p>}
                  </>}
                </div>
              </div>
            )}

            {/* ═══ ALERTS TAB ═══ */}
            {activeTab === "alerts" && (
              <div className="space-y-4 animate-in fade-in duration-300">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-semibold flex items-center gap-1.5">
                    <Bell className="w-3.5 h-3.5 text-accent" />Active Alerts
                  </h2>
                  <span className="text-[10px] text-muted-foreground bg-muted px-2.5 py-1 rounded-full">
                    Price ≥{alertConfig.priceThreshold}% · Vol ≥{alertConfig.volumeMultiple}x
                  </span>
                </div>

                <div className="space-y-2.5">
                  {visibleAnnouncements.filter(a => a.priority === "critical" || a.priority === "high").map(ann => <AnnouncementCard key={`${investorMode}-${ann.id}`} ann={ann} detailed={investorMode === "deep"} />)}
                  {alerts.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                      <Shield className="w-10 h-10 mb-3 opacity-30" />
                      <p className="text-sm font-medium">{alertStatus || "No price or volume triggers"}</p>
                      <p className="text-xs text-center">Threshold checks apply to available completed daily observations.</p>
                    </div>
                  ) : alerts.map((a, i) => <AlertCard key={i} alert={a} />)}
                </div>

                {prices.length > 0 && (
                  <div className="space-y-2.5 mt-2">
                    <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                      <Activity className="w-3.5 h-3.5" />Latest session movers
                    </h3>
                    <div className="space-y-1.5">
                      {[...prices].sort((a, b) => Math.abs(b.changePct) - Math.abs(a.changePct)).slice(0, 5).map((p, i) => (
                        <StockCard key={p.ticker} price={p} rank={i + 1} />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ═══ CHAT TAB ═══ */}
            {activeTab === "chat" && (
              <div className="h-full min-h-0 animate-in fade-in duration-300">
                <ChatView prices={prices} demoMode={demoMode} />
              </div>
            )}

            {/* ═══ RESEARCH TAB ═══ */}
            {activeTab === "research" && (
              <div className="space-y-4 animate-in fade-in duration-300">
                {research ? (
                  <>
                    {researchSource !== "primary_documents" && <p role="status" className="text-xs text-amber-500 border border-amber-500/30 rounded-lg p-3">
                      {researchSource === "mock" ? "Demo research: these figures are sample data." : "This report was generated without verified primary-document grounding."}
                    </p>}
                    <ResearchNotebook key={research.ticker} ticker={research.ticker} horizon={profile.horizon} />
                    <ResearchView report={research} isDemo={researchSource === "mock"} onBack={() => setResearch(null)} />
                  </>
                ) : (
                  <>
                    <div className="rounded-2xl bg-accent/5 border border-accent/20 p-4">
                      <h2 className="font-semibold text-sm">{investorMode === "future" ? "Research your next investment" : investorMode === "deep" ? "Start with the evidence" : "A closer look at one business"}</h2>
                      <p className="text-xs text-muted-foreground mt-1">{investorMode === "future" ? "Explore any NSE ticker. Read the business and financials, challenge management delivery, then save your thesis and review catalysts." : "Company reports and call transcripts only. Check periods, open citations, and leave unsupported claims undisclosed."}</p>
                    </div>
                    <SearchAutocomplete
                      value={searchTicker}
                      onChange={setSearchTicker}
                      onSelect={(t) => { setSearchTicker(t); fetchResearch(t); }}
                      companies={allCompanies}
                    />

                    {researchError && <p role="alert" className="text-sm text-red-500 border border-red-500/30 rounded-lg p-3">{researchError}</p>}
                    {researchLoading && (
                      <div className="flex flex-col items-center justify-center py-16">
                        <div className="w-12 h-12 rounded-2xl bg-accent/10 flex items-center justify-center mb-3">
                          <Loader2 className="w-6 h-6 animate-spin text-accent" />
                        </div>
                        <p className="text-sm font-medium">Generating AI Report</p>
                        <p className="text-xs text-muted-foreground mt-1">Scraping financials · Analyzing with Gemini 2.5</p>
                      </div>
                    )}

                    <div className="space-y-3">
                      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                        <Star className="w-3.5 h-3.5" />Quick Research
                      </h3>
                      <div className="grid grid-cols-3 gap-2">
                        {[
                          { t: "ZOMATO", icon: "🍕" },
                          { t: "DMART", icon: "🛒" },
                          { t: "TITAN", icon: "⌚" },
                        ].map(({ t, icon }) => (
                          <button key={t} onClick={() => { setSearchTicker(t); fetchResearch(t); }}
                            className="bg-card border border-border rounded-2xl p-4 text-center hover:bg-muted/50 hover:border-accent/30 transition-all active:scale-[0.96] group">
                            <span className="text-2xl block mb-1">{icon}</span>
                            <span className="text-sm font-bold group-hover:text-accent transition-colors">{t}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-3">
                      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5" />Portfolio Companies
                      </h3>
                      <div className="grid grid-cols-3 gap-1.5">
                        {PORTFOLIO.map(stock => stock.ticker).map((t) => (
                          <button key={t} onClick={() => { setSearchTicker(t); fetchResearch(t); }}
                            className="bg-card border border-border rounded-xl p-2.5 text-center hover:bg-muted/50 hover:border-accent/30 transition-all active:scale-[0.96]">
                            <span className="text-xs font-semibold">{t}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ─── Bottom Navigation ─── */}
      <nav className="shrink-0 border-t border-border bg-background/80 backdrop-blur-xl px-4 py-1.5 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
        <div className="flex justify-around">
          {([
            { key: "portfolio" as Tab, icon: BarChart3, label: "Portfolio" },
            { key: "feed" as Tab, icon: FileText, label: "Feed" },
            { key: "chat" as Tab, icon: MessageCircle, label: "Ask AI" },
            { key: "alerts" as Tab, icon: Bell, label: "Alerts" },
            { key: "research" as Tab, icon: Search, label: "Research" },
          ]).map(({ key, icon: Icon, label }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={cn(
                "flex flex-col items-center gap-0.5 py-1.5 px-3 rounded-xl transition-all relative",
                activeTab === key ? "text-accent" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <div className="relative">
                <Icon className={cn("w-5 h-5 transition-transform", activeTab === key && "scale-110")} />
                {key === "alerts" && alertCount > 0 && (
                  <span className="absolute -top-1.5 -right-2 bg-red-500 text-white text-[8px] font-bold w-4 h-4 rounded-full flex items-center justify-center animate-pulse">
                    {alertCount}
                  </span>
                )}
              </div>
              <span className="text-[10px] font-medium">{label}</span>
              {activeTab === key && (
                <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-accent rounded-full" />
              )}
            </button>
          ))}
        </div>
      </nav>
    </main>
  );
}
