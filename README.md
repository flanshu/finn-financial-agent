# FINN ? Financial Investment Agent

A mobile-first investment workflow built for the ENAM engineering challenge with Next.js 16, React, TypeScript, Tailwind and Gemini.

## Investor sessions

- **Quick Brief:** a two-minute daily digest, with the five highest-priority material filings first and routine paperwork collapsed.
- **Deep Review:** a research-first session, priority filters, company financials, narrative-versus-numbers comparisons, and original source links.
- **Long-Term Research:** explore any valid NSE ticker and keep a personal investment thesis with horizon, risks, invalidation criteria and review catalysts.

Session preference and thesis notes are stored on this browser only. They do not sync across devices. These modes change the workflow; they do not generate personalised buy/sell recommendations.

## Run

```bash
npm install
npm test
npm run lint
npm run build
npm run dev
```

Set `GEMINI_API_KEY` in `.env.local` for live research and chat. Optionally set `GEMINI_MODEL` (default `gemini-2.5-flash`). Never commit your key.

## Live and Demo modes

The header switch separates real integrations from sample data. Live mode never silently replaces failed prices, filings, alerts or research with samples. Demo mode explicitly requests fixture data and labels it. Prices cover the 18 portfolio companies; three additional research examples are available. The research engine also accepts valid NSE symbols outside that set, including `.NS` suffixes and `M&M`.

Live prices and alerts use paired daily closing-price/volume observations. Today's bar is excluded before 15:35 IST; a three-month request supplies up to 20 preceding sessions for volume comparison. The date shown is the observation date, not the request date. Market-hours status is an indicative weekday clock and does not check exchange holidays. Prices may be stale or unavailable from the public provider.

Feed and alerts refresh every 60 seconds while the page is open. High-priority filings appear in Alerts as well as the digest. This is foreground monitoring, not background push notifications. The digest defaults to 24 hours and supports three- and seven-day windows.

## Research evidence

Screener is a discovery index only. The server retrieves up to one annual report and four concall transcripts hosted by BSE/NSE and supplies the PDF contents to Gemini. Downloads are bounded to 8 MB per file and 12 MB total. Company-hosted PDFs, redirects, unavailable documents and larger files are currently skipped, so some tickers have limited coverage.

Only retrieved documents may support company-specific research claims. There is no model-memory, estimated-number, or Screener-synthesis fallback. Missing evidence stays undisclosed, and a failed research request returns an error. Sample research is available only through explicit Demo mode.

Every factual research string must cite a retrieved source ID; the prompt requests page references and reporting periods. Runtime checks validate structure and source IDs. Uncited claims are withheld as undisclosed; unsupported comparisons are omitted, while cited portions can still be shown. A report without any cited headline evidence is rejected. They do not prove semantic accuracy or correct PDF interpretation: users must inspect source documents. Narrative comparisons are omitted unless guidance and a matching outcome are supported. Successful reports are cached for one hour per process, with bounded concurrency.

Ask AI is restricted by its system instruction to supplied portfolio observations for company-specific claims; it directs fundamental questions to document-based Research. It is not a substitute for cited research, and model instruction-following is not a factuality guarantee.

## Current scope and submission limits

The interface, APIs and seventeen fixture-based regression tests are implemented. Tests cover source restrictions, schema/citations, primary-only research errors and caching, explicit Demo mode, empty live feeds, zero-trigger alerts, and unfinished daily-bar exclusion. Live provider connectivity, model answer quality and deployed phone behavior still require testing.

The BSE integration queries each portfolio company separately, follows up to five pages per company, caches responses for one minute, and shows failed or capped companies. Dates without a timezone are interpreted as IST. Classification is deterministic headline triage; users should open the original filing to judge materiality. The live seven-day verification returned 40 filings across 18/18 successfully checked companies; this is one observed check, not a guarantee of future provider availability or exhaustive coverage. Live quarterly result-PDF extraction, management biography enrichment, durable cross-device storage and background notifications remain future work. Detailed financial announcement cards are demo fixtures.

Local production verification currently encounters a Turbopack CSS-worker startup failure in the restricted Windows environment. A successful production build is not claimed. Verify `npm run build` in your deployment environment before submission.

Submit the deployed prototype link, GitHub repository, actual AI build-history export/share link, and a short covering note describing these trade-offs. This repository does not contain an automatically generated build-history export.

Research retrieval fix: document discovery supports Screener's current nested `div` document lists and legacy section IDs. BSE `AnnPdfOpen.aspx?Pname=...pdf` links are normalised to direct exchange PDF URLs. Standalone discovery is tried if consolidated discovery fails. The PDF synthesis timeout is 75 seconds within a 120-second route allowance; Gemini 2.5 Flash reasoning is bounded so JSON output has room to complete. Provider and hosting limits can still apply. TCS's annual report exceeds the current 8 MB file cap, so its transcript evidence can be used even when that annual report is skipped.

## Investor preferences and remaining-fix update

The preferences panel saves investment horizon, sector focus, filing-category focus and price/volume thresholds on this browser. Sector and filing filters affect the digest and material-filing alerts; they do not change the 18-company portfolio. The chosen horizon is shown in the thesis notebook. Switching investor sessions preserves the open report. It is workflow customisation, not a suitability assessment or a personalised return forecast.

The chat composer stays within the available content height. Demo reports are labelled Sample data rather than Gemini-generated research. Price cards show their observation date, the banner names missing symbols, and the feed exposes company coverage with a seven-day empty-state action. Stale requests from a previous data mode/window are ignored. The portfolio's average move is an unweighted stock average, not a holdings-weighted investment return.

## Production deployment follow-up

The public production domain was verified to load without a Vercel login. Production checks then exposed failed direct BSE requests and a missing GEMINI_API_KEY. The key must be configured in Vercel Production and applied by a new deployment; it is never committed.

When a direct BSE company query fails, FINN now tries Screener's recent-announcement index for that company. Only original disclosure titles, timestamps and exchange PDF links are retained; index-generated summaries are excluded. Fallback companies are explicitly labelled indexed and incomplete, and unavailable companies remain visible. This is limited discovery, not guaranteed full exchange coverage. In a local forced-BSE-failure check, the fallback returned 30 seven-day filing links across 17 companies, with one unavailable. Its behavior from Vercel must be verified after deploying this change.
