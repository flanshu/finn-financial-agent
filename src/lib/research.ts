import type { ResearchReport, ResearchSource } from "./types";

export function normalizeTicker(value: string): string | null {
  const ticker = value.trim().toUpperCase().replace(/\.NS$/, "");
  return /^[A-Z0-9][A-Z0-9&-]{0,29}$/.test(ticker) ? ticker : null;
}

// Only exchange-hosted documents are downloaded. BSE viewer URLs are
// normalised to a direct exchange PDF; arbitrary redirects remain rejected.
export function primaryDocumentUrl(value: string): string | null {
  try {
    const url = new URL(value.replace(/&amp;/g, "&"));
    const hosts = ["www.bseindia.com", "bseindia.com", "nsearchives.nseindia.com", "archives.nseindia.com"];
    if (url.protocol !== "https:" || url.username || url.password ||
      (url.port && url.port !== "443") || !hosts.includes(url.hostname)) return null;
    if (["www.bseindia.com", "bseindia.com"].includes(url.hostname) &&
      url.pathname.toLowerCase() === "/stockinfo/annpdfopen.aspx") {
      const filename = url.searchParams.get("Pname");
      if (!filename || !/^[a-zA-Z0-9_-]+\.pdf$/i.test(filename)) return null;
      return `https://www.bseindia.com/xml-data/corpfiling/AttachHis/${filename}`;
    }
    url.hash = "";
    return /\.pdf$/i.test(url.pathname) ? url.href : null;
  } catch { return null; }
}

// Screener's current markup uses classed divs. Support its older section IDs
// as well, and balance nested containers so only the selected documents count.
function documentRegion(html: string, section: string): string {
  const tags = /<(\/?)(div|section)\b([^>]*)>/gi;
  for (let tag = tags.exec(html); tag; tag = tags.exec(html)) {
    if (tag[1]) continue;
    const id = tag[3].match(/\bid=["']([^"']*)["']/i)?.[1];
    const classes = tag[3].match(/\bclass=["']([^"']*)["']/i)?.[1].split(/\s+/) || [];
    if (id !== section && !classes.includes(section)) continue;
    const start = tags.lastIndex;
    const element = tag[2].toLowerCase();
    let depth = 1;
    for (let next = tags.exec(html); next; next = tags.exec(html)) {
      if (next[2].toLowerCase() !== element) continue;
      depth += next[1] ? -1 : 1;
      if (depth === 0) return html.slice(start, next.index);
    }
    return "";
  }
  return "";
}

export function discoverSources(html: string): ResearchSource[] {
  const sources: ResearchSource[] = [];
  for (const [section, kind] of [["annual-reports", "annual_report"], ["concalls", "transcript"]] as const) {
    const body = documentRegion(html, section);
    for (const match of body.matchAll(/<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)) {
      const title = match[2].replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
      if (kind === "transcript" && !/transcript/i.test(title)) continue;
      const url = primaryDocumentUrl(match[1]);
      if (url && !sources.some(s => s.url === url)) {
        sources.push({ id: `S${sources.length + 1}`, title: `${kind === "annual_report" ? "Annual report" : "Concall transcript"}: ${title}`, url, kind });
      }
      if (sources.filter(s => s.kind === kind).length >= (kind === "annual_report" ? 1 : 4)) break;
    }
  }
  return sources;
}

export async function readBounded(response: Response, limit: number): Promise<Buffer> {
  if (!response.ok || !response.body) throw new Error("Source unavailable");
  if (Number(response.headers.get("content-length")) > limit) {
    await response.body.cancel();
    throw new Error("Source too large");
  }
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > limit) throw new Error("Source too large");
      chunks.push(value);
    }
  } catch (error) { await reader.cancel(); throw error; }
  finally { reader.releaseLock(); }
  return Buffer.concat(chunks);
}

// Validate at the trust boundary, before the client renders model output.
export function validateResearch(value: unknown, sources: ResearchSource[]): Omit<ResearchReport, "ticker" | "companyName" | "generatedAt"> {
  const object = (v: unknown): Record<string, unknown> => {
    if (!v || typeof v !== "object" || Array.isArray(v)) throw new Error("Invalid report object");
    return v as Record<string, unknown>;
  };
  const text = (v: unknown): string => {
    if (typeof v !== "string" || !v.trim() || v.length > 4000) throw new Error("Invalid report text");
    const ids = [...v.matchAll(/\[([^\]]+)\]/g)].flatMap(match => match[1].match(/\bS\d+\b/g) || []);
    if (ids.some(id => !sources.some(s => s.id === id))) throw new Error("Unknown citation");
    // Withhold uncited claims rather than discarding every supported field.
    if (ids.length === 0) return "Not disclosed in retrieved sources";
    return v;
  };
  const list = (v: unknown): string[] => {
    if (!Array.isArray(v) || v.length > 12) throw new Error("Invalid report list");
    return v.map(text).filter(value => value !== "Not disclosed in retrieved sources");
  };
  const root = object(value), b = object(root.businessSnapshot), f = object(root.financialSnapshot), n = object(root.narrativeVsNumbers);
  if (!Array.isArray(n.comparisons) || n.comparisons.length > 4) throw new Error("Invalid comparisons");
  const comparisons = n.comparisons.map(value => {
    const c = object(value);
    if (!["aligned", "missed", "exceeded"].includes(c.verdict as string)) throw new Error("Invalid verdict");
    const metric = text(c.metric), management_said = text(c.management_said), actual = text(c.actual);
    if ([metric, management_said, actual].includes("Not disclosed in retrieved sources")) return null;
    return { metric, management_said, actual, verdict: c.verdict as "aligned" | "missed" | "exceeded" };
  }).filter(comparison => comparison !== null);
  const headlineEvidence = [b.description, f.revenue, f.ebitda, f.pat, n.summary].map(text);
  if (headlineEvidence.every(value => value === "Not disclosed in retrieved sources")) throw new Error("No cited headline evidence");
  return {
    businessSnapshot: { description: text(b.description), segments: list(b.segments), revenueMix: text(b.revenueMix), keyProducts: text(b.keyProducts) },
    financialSnapshot: { revenue: text(f.revenue), ebitda: text(f.ebitda), pat: text(f.pat), ebitdaMargin: typeof f.ebitdaMargin === "string" && /operating|\bebit\b/i.test(f.ebitdaMargin) && !/ebitda/i.test(f.ebitdaMargin) ? "Not disclosed in retrieved sources" : text(f.ebitdaMargin), patMargin: text(f.patMargin), debtToEquity: text(f.debtToEquity), roce: text(f.roce), highlights: list(f.highlights) },
    narrativeVsNumbers: { summary: text(n.summary), comparisons }, sources,
  };
}
