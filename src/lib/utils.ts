import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatNumber(n: number): string {
  if (Math.abs(n) >= 1e7) return (n / 1e7).toFixed(2) + " Cr";
  if (Math.abs(n) >= 1e5) return (n / 1e5).toFixed(2) + " L";
  return n.toLocaleString("en-IN");
}

export function formatPercent(n: number): string {
  const sign = n > 0 ? "+" : "";
  return sign + n.toFixed(1) + "%";
}

export function timeAgo(date: string | Date): string {
  const d = new Date(date);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return mins + "m ago";
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return hrs + "h ago";
  const days = Math.floor(hrs / 24);
  if (days < 7) return days + "d ago";
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

export function getPriorityColor(priority: string): string {
  switch (priority) {
    case "critical": return "priority-critical";
    case "high": return "priority-high";
    case "medium": return "priority-medium";
    default: return "priority-low";
  }
}

export function getCategoryColor(cat: string): string {
  return `cat-${cat.replace("&", "_")}`;
}

export const CATEGORY_LABELS: Record<string, string> = {
  results: "Results",
  "M&A": "M&A",
  fund_raise: "Fund Raise",
  management_change: "Mgmt Change",
  litigation: "Litigation",
  insider_trading: "Insider Trading",
  earnings_call: "Earnings Call",
  investor_meetings: "Investor Meet",
  credit_rating: "Credit Rating",
  dividend: "Dividend",
  bonus_split: "Bonus/Split",
  capex: "Capex",
  press_release: "Press Release",
  postal_ballot: "Postal Ballot",
  agm_egm: "AGM/EGM",
  pledging: "Pledging",
  unclassified: "Other",
};
