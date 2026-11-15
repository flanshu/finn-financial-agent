import type { Announcement } from "./types";

// Deterministic headline triage avoids a model call for every routine filing.
// It classifies the disclosure, not its financial impact; original text is retained.
export function classifyFiling(text: string): { category: string; priority: Announcement["priority"] } {
  const rules: [string, Announcement["priority"], RegExp][] = [
    ["management_change", "critical", /resign|appoint.*(?:cfo|ceo|director|chief|managing)|(?:cfo|ceo|chief|director).*appoint|cessation|demise/i],
    ["litigation", "high", /litigation|penalt|fine\b|regulatory order|insolvency|court|tribunal/i],
    ["m_and_a", "critical", /acquisit|merger|demerger|joint venture|sale of.*stake/i],
    ["results", "critical", /financial results|quarterly results|audited results|unaudited results|earnings release/i],
    ["earnings_call", "high", /earnings call|conference call|concall|transcript|earnings.*audio/i],
    ["fund_raise", "critical", /fund rais|rights issue|preferential|qualified institutional|qip\b|buyback|commercial paper/i],
    ["credit_rating", "high", /credit rating|rating.*(?:upgrade|downgrade|reaffirm)/i],
    ["pledging", "high", /pledge|encumbrance/i],
    ["insider_trading", "high", /insider|promoter.*(?:buy|sell|disposal|acquisit)|trading.*disclosure/i],
    ["capex", "medium", /capacity|expansion|capital expenditure|new plant|capex/i],
    ["dividend", "medium", /dividend/i],
    ["bonus_split", "medium", /bonus issue|stock split|sub.division/i],
    ["investor_meetings", "low", /analyst.*meet|investor.*meet|roadshow|institutional.*meet/i],
    ["postal_ballot", "low", /postal ballot/i],
    ["agm_egm", "low", /annual general meeting|extraordinary general meeting|agm\b|egm\b/i],
    ["press_release", "medium", /press release|order win|contract|product launch|partnership/i],
  ];
  const match = rules.find(([, , pattern]) => pattern.test(text));
  return match ? { category: match[0], priority: /newspaper|advertis|publication|intimation.*board meeting|notice.*board meeting/i.test(text) ? "low" : match[1] } : { category: "unclassified", priority: "low" };
}

export function exchangeTimestamp(value: string): string | null {
  const normal = /(?:Z|[+-]\d{2}:?\d{2})$/i.test(value) ? value : `${value}+05:30`;
  const date = new Date(normal);
  return Number.isFinite(date.getTime()) ? date.toISOString() : null;
}
