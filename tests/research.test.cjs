/* eslint-disable @typescript-eslint/no-require-imports -- CommonJS harness compiles TypeScript fixtures without adding a test runtime. */
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");
const Module = require("node:module");
function load(file, mocks = {}) {
  const filename = path.resolve(__dirname, "..", file);
  const compiled = ts.transpileModule(fs.readFileSync(filename, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const mod = new Module(filename, module);
  mod.paths = module.paths;
  const normal = mod.require.bind(mod);
  mod.require = name => Object.hasOwn(mocks, name) ? mocks[name] : normal(name);
  mod._compile(compiled, filename);
  return mod.exports;
}
const helper = load("src/lib/research.ts");
const eod = load("src/lib/eod.ts");
const filings = load("src/lib/filings.ts");
const source = { id: "S1", title: "Annual report", url: "https://www.bseindia.com/report.pdf", kind: "annual_report" };
const unknown = "Not disclosed in retrieved sources";
function valid() {
  return { businessSnapshot: { description: "Business [S1] p. 1", segments: [], revenueMix: unknown, keyProducts: unknown }, financialSnapshot: Object.fromEntries(["revenue", "ebitda", "pat", "ebitdaMargin", "patMargin", "debtToEquity", "roce"].map(k => [k, unknown]).concat([["highlights", []]])), narrativeVsNumbers: { summary: unknown, comparisons: [] } };
}
test("accepts non-demo NSE symbols and rejects URL/query injection", () => {
  assert.equal(helper.normalizeTicker(" m&m.NS "), "M&M");
  assert.equal(helper.normalizeTicker("newco"), "NEWCO");
  for (const value of ["", "../foo", "TCS?x=1", "https://localhost", "TCS.BO"]) assert.equal(helper.normalizeTicker(value), null);
});
test("discovers primary documents only in report and transcript sections", () => {
  const html = `<a href="https://www.bseindia.com/news.pdf">News</a><section id="annual-reports"><a href="https://www.bseindia.com/ar.pdf">FY26</a><a href="https://www.bseindia.com/old.pdf">FY25</a></section><section id="concalls"><a href="https://www.bseindia.com/deck.pdf">PPT</a><a href="https://nsearchives.nseindia.com/call.pdf">Transcript</a><a href="https://evil.test/call.pdf">Transcript</a></section>`;
  const found = helper.discoverSources(html);
  assert.equal(found.length, 2);
  assert.deepEqual(found.map(s => s.kind), ["annual_report", "transcript"]);
  assert.deepEqual(found.map(s => s.id), ["S1", "S2"]);
});
test("rejects private, spoofed and non-HTTPS document locations", () => {
  for (const url of ["http://www.bseindia.com/a.pdf", "https://127.0.0.1/a.pdf", "https://www.bseindia.com.evil.test/a.pdf", "https://user@www.bseindia.com/a.pdf", "https://www.bseindia.com:444/a.pdf", "https://www.bseindia.com/a.html"]) assert.equal(helper.primaryDocumentUrl(url), null);
});
test("requires complete schema and known citations; withholds uncited claims and unsupported verdicts", () => {
  assert.equal(helper.validateResearch(valid(), [source]).sources.length, 1);
  assert.throws(() => helper.validateResearch({}, [source]));
  const uncited = valid(); uncited.financialSnapshot.pat = "INR 500 crore";
  assert.equal(helper.validateResearch(uncited, [source]).financialSnapshot.pat, unknown);
  const fake = valid(); fake.businessSnapshot.description = "Business [S9]";
  assert.throws(() => helper.validateResearch(fake, [source]), /Unknown citation/);
  const verdict = valid(); verdict.narrativeVsNumbers.comparisons = [{ metric: "Growth [S1]", management_said: unknown, actual: "10% [S1]", verdict: "aligned" }];
  assert.deepEqual(helper.validateResearch(verdict, [source]).narrativeVsNumbers.comparisons, []);
});
test("bounds downloads even without a content-length header", async () => {
  assert.equal((await helper.readBounded(new Response("abc"), 3)).toString(), "abc");
  await assert.rejects(helper.readBounded(new Response("abcd"), 3), /too large/);
});
test("research endpoint handles missing keys, arbitrary tickers, retrieval, caching and bad model output", async () => {
  const oldFetch = global.fetch, oldKey = process.env.GEMINI_API_KEY;
  let generated = 0, output = valid(), mode = "ok";
  const google = { GoogleGenerativeAI: class { getGenerativeModel() { return { generateContent: async parts => {
    if (!Array.isArray(parts)) throw new Error("Fixture synthesis unavailable");
    generated++; assert(parts.some(p => p.inlineData?.mimeType === "application/pdf"));
    return { response: { text: () => JSON.stringify(output) } };
  } }; } } };
  const route = load("src/app/api/research/route.ts", { "@/lib/research": helper, "@/lib/portfolio": { findStock: () => undefined }, "@/lib/mock-data": { MOCK_RESEARCH_MAP: {} }, "@google/generative-ai": google });
  const get = ticker => route.GET(new Request("http://localhost/api/research?ticker=" + encodeURIComponent(ticker)));
  try {
    delete process.env.GEMINI_API_KEY;
    assert.equal((await get("NEWCO")).status, 503);
    assert.equal((await get("../bad")).status, 400);
    process.env.GEMINI_API_KEY = "test-only";
    global.fetch = async url => String(url).includes("screener.in") ? new Response(mode === "empty" ? "" : `<section id="annual-reports"><a href="https://www.bseindia.com/ar.pdf">FY26</a></section>`) : new Response("%PDF-1.4 fixture");
    const first = await get("NEWCO"); assert.equal(first.status, 200);
    assert.equal((await first.json()).report.ticker, "NEWCO");
    assert.equal((await (await get("NEWCO")).json()).cached, true);
    assert.equal(generated, 1);
    mode = "empty"; assert.equal((await get("EMPTY")).status, 422);
    mode = "ok"; output = {}; assert.equal((await get("BROKEN")).status, 502);
  } finally { global.fetch = oldFetch; if (oldKey === undefined) delete process.env.GEMINI_API_KEY; else process.env.GEMINI_API_KEY = oldKey; }
});
test("live zero-trigger alert results stay empty; invalid thresholds fail", async () => {
  const oldFetch = global.fetch;
  const route = load("src/app/api/alerts/route.ts", { "@/lib/eod": eod, "@/lib/portfolio": { PORTFOLIO: [{ ticker: "TEST", name: "Test", yf: "TEST.NS" }] }, "@/lib/mock-data": { MOCK_ALERTS: [{ ticker: "MOCK", value: 9, type: "price_spike" }] } });
  try {
    global.fetch = async () => Response.json({ chart: { result: [{ timestamp: [1, 86401], meta: { regularMarketPrice: 100, chartPreviousClose: 50 }, indicators: { quote: [{ close: [99, 100], volume: [100, 100] }] } }] } });
    const response = await route.GET(new Request("http://localhost/api/alerts"));
    const result = await response.json();
    assert.equal(result.source, "yahoo_finance"); assert.deepEqual(result.alerts, []);
    assert.equal((await route.GET(new Request("http://localhost/api/alerts?priceThreshold=NaN"))).status, 400);
  } finally { global.fetch = oldFetch; }
});

test("completed daily bars exclude an unfinished session and preserve date/volume pairing", () => {
  const timestamp = [Date.parse("2026-11-12T03:45:00Z") / 1000, Date.parse("2026-11-13T03:45:00Z") / 1000, Date.parse("2026-11-16T03:45:00Z") / 1000];
  const chart = { timestamp, indicators: { quote: [{ close: [99, null, 102], volume: [100, 200, 300] }] } };
  const morning = eod.completedBars(chart, Date.parse("2026-11-16T06:00:00Z"));
  assert.deepEqual(morning, [{ close: 99, volume: 100, date: "2026-11-12" }]);
  const evening = eod.completedBars(chart, Date.parse("2026-11-16T11:00:00Z"));
  assert.equal(evening.length, 2); assert.equal(evening[1].volume, 300);
});
test("live research never substitutes demo research when the API key is missing", async () => {
  const oldKey = process.env.GEMINI_API_KEY;
  const report = valid();
  const route = load("src/app/api/research/route.ts", { "@/lib/research": helper, "@/lib/portfolio": { findStock: () => undefined }, "@/lib/mock-data": { MOCK_RESEARCH_MAP: { TCS: report } } });
  try {
    delete process.env.GEMINI_API_KEY;
    assert.equal((await route.GET(new Request("http://localhost/api/research?ticker=TCS"))).status, 503);
    const demo = await route.GET(new Request("http://localhost/api/research?ticker=TCS&demo=1"));
    assert.equal((await demo.json()).source, "mock");
  } finally { if (oldKey === undefined) delete process.env.GEMINI_API_KEY; else process.env.GEMINI_API_KEY = oldKey; }
});
test("an empty live exchange feed does not become a mock feed", async () => {
  const oldFetch = global.fetch;
  const route = load("src/app/api/announcements/route.ts", { "@/lib/filings": filings, "@/lib/portfolio": { PORTFOLIO: [{ ticker: "TEST", bseCode: "123" }] }, "@/lib/mock-data": { MOCK_ANNOUNCEMENTS: [{ date: new Date().toISOString(), priority: "high" }] } });
  try {
    global.fetch = async () => Response.json({ Table: [] });
    const response = await route.GET(new Request("http://localhost/api/announcements"));
    const result = await response.json();
    assert.equal(result.source, "bse"); assert.deepEqual(result.announcements, []);
    global.fetch = async () => new Response("blocked", { status: 403 });
    const unavailableRoute = load("src/app/api/announcements/route.ts", { "@/lib/filings": filings, "@/lib/portfolio": { PORTFOLIO: [{ ticker: "TEST", bseCode: "123" }] }, "@/lib/mock-data": { MOCK_ANNOUNCEMENTS: [] } });
    assert.equal((await unavailableRoute.GET(new Request("http://localhost/api/announcements"))).status, 503);
  } finally { global.fetch = oldFetch; }
});

test("discovers Screener's nested class-based document containers and BSE viewer transcripts", () => {
  const html = `<section id="documents"><div class="documents annual-reports flex-column"><h3>Annual reports</h3><div><ul><li><a href="https://www.bseindia.com/ar.pdf">Annual Report 2026</a><div><span>from BSE</span></div></li></ul></div></div><div class="documents credit-ratings"><a href="https://www.bseindia.com/rating.pdf">Transcript</a></div><div class="documents concalls flex-column"><div><h3>Concalls</h3></div><div><ul><li><div>Oct 2026</div><a class="chip" href="https://www.bseindia.com/stockinfo/AnnPdfOpen.aspx?Pname=abcdef-123.pdf" title="Raw Transcript">Transcript</a><a href="https://www.bseindia.com/deck.pdf">PPT</a></li></ul></div></div></section>`;
  const sources = helper.discoverSources(html);
  assert.equal(sources.length, 2);
  assert.equal(sources[1].url, "https://www.bseindia.com/xml-data/corpfiling/AttachHis/abcdef-123.pdf");
  assert.deepEqual(sources.map(s => s.kind), ["annual_report", "transcript"]);
  assert(!sources.some(s => /rating|deck/.test(s.url)));
});
test("BSE viewer normalisation rejects path injection and unrelated viewers", () => {
  for (const url of ["https://www.bseindia.com/stockinfo/AnnPdfOpen.aspx?Pname=..%2Fprivate.pdf", "https://www.bseindia.com/stockinfo/AnnPdfOpen.aspx?Pname=https%3A%2F%2Fevil.test%2Fa.pdf", "https://evil.test/stockinfo/AnnPdfOpen.aspx?Pname=abc.pdf"]) assert.equal(helper.primaryDocumentUrl(url), null);
});

test("accepts page-qualified and grouped citations without hiding cited figures", () => {
  const report = valid();
  report.financialSnapshot.revenue = "INR 100 crore (FY26) [S1, p.3, p.4]";
  report.businessSnapshot.description = "Business [S1, p.3; S2, p.7]";
  const sources = [source, { ...source, id: "S2" }];
  assert.equal(helper.validateResearch(report, sources).financialSnapshot.revenue, report.financialSnapshot.revenue);
  assert.equal(helper.validateResearch(report, sources).businessSnapshot.description, report.businessSnapshot.description);
  assert.throws(() => helper.validateResearch(report, [source]), /Unknown citation/);
});
test("does not label operating margin as EBITDA margin", () => {
  const report = valid(); report.financialSnapshot.ebitdaMargin = "24% operating margin [S1]";
  assert.equal(helper.validateResearch(report, [source]).financialSnapshot.ebitdaMargin, unknown);
});

test("filing triage is deterministic and exchange timestamps are interpreted as IST", () => {
  assert.equal(filings.classifyFiling("Quarterly financial results").category, "results");
  assert.equal(filings.classifyFiling("Investor meeting schedule").priority, "low");
  assert.equal(filings.classifyFiling("Resignation of CFO").category, "management_change");
  assert.equal(filings.exchangeTimestamp("2026-11-13T16:00:00"), "2026-11-13T10:30:00.000Z");
  assert.equal(filings.exchangeTimestamp("bad-date"), null);
});
test("filings are queried per holding, paginated, and retain source URLs", async () => {
  const oldFetch = global.fetch; const calls = [];
  const route = load("src/app/api/announcements/route.ts", { "@/lib/filings": filings, "@/lib/portfolio": { PORTFOLIO: [{ ticker: "TEST", name: "Test company", bseCode: "123" }] }, "@/lib/mock-data": { MOCK_ANNOUNCEMENTS: [] } });
  try {
    global.fetch = async url => {
      const u = new URL(url); calls.push(u); const page = Number(u.searchParams.get("pageno"));
      return Response.json({ Table: [{ SCRIP_CD: 123, NEWSID: `id-${page}`, NEWS_DT: new Date(Date.now() - 1000).toISOString(), HEADLINE: "Quarterly financial results", ATTACHMENTNAME: `filing-${page}.pdf`, OLD: 1 }], Table1: [{ ROWCNT: 2 }] });
    };
    const response = await route.GET(new Request("http://localhost/api/announcements?window=7d"));
    const data = await response.json();
    assert.equal(calls.length, 2); assert(calls.every(u => u.searchParams.get("strScrip") === "123"));
    assert.equal(data.announcements.length, 2); assert.equal(data.coverage.checked, 1);
    assert(data.announcements[0].sourceUrl.includes("AttachHis"));
  } finally { global.fetch = oldFetch; }
});
