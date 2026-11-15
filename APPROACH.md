# FINN: implementation and trade-offs

FINN is a mobile-first prototype for reviewing an 18-company Indian equity portfolio and researching companies from primary documents. It focuses on a daily filing digest and evidence-based on-demand research.

## Investor workflow

Quick Brief prioritises material filings and shows five before routine paperwork. Deep Review opens filing details and research. Long-Term Research adds a browser-local thesis notebook. Investment horizon, sector focus, filing-category focus and alert thresholds are saved locally; these are workflow preferences, not a suitability assessment or an investment recommendation. Switching sessions retains the current report.

## Push data

The feed queries BSE for each holding, follows up to five pages per company and caches the combined result for one minute. It shows failed and incomplete company checks, counts across 24-hour, three-day and seven-day windows, and the latest retrieved filing time. Stable IDs and original PDF links make disclosures inspectable. Missing timezone offsets are interpreted as IST.

Headline rules perform inexpensive triage rather than calling a model on every notice. Routine newspaper publications and meeting notices receive lower priority. Categories and priority are heuristics; they do not establish financial materiality. The user must review the original document. A live seven-day check returned 40 filings with 18/18 companies checked, while subsequent checks also demonstrated intermittent provider failures; coverage is shown rather than silently replaced with samples.

Daily price bars from Yahoo are paired by timestamp before null values are filtered. An unfinished current-day bar is excluded before 15:35 IST. Price alerts compare the latest completed close with the previous completed close; volume uses up to 20 preceding observations from a three-month request. The observation date and unavailable tickers are visible. The displayed average stock move is unweighted, not a portfolio return.

## Pull data

Any valid NSE symbol can be researched, subject to available documents. Screener is used only to discover annual-report and call-transcript links. Discovery handles nested document containers and normalises BSE PDF-viewer URLs. Exchange-hosted PDFs are downloaded with host, timeout and size restrictions. They are supplied to Gemini as evidence; outside company knowledge and estimated-number fallbacks are prohibited.

Reports validate the expected structure and known source IDs, including page-qualified citations. Uncited claims are withheld, unsupported comparisons are omitted, and a report without cited headline evidence is rejected. Operating margin is not accepted as EBITDA margin. Citation validation does not prove semantic accuracy: model extraction and arithmetic still require source review.

One annual report and up to four transcripts can be discovered. Files larger than 8 MB are skipped, with a 12 MB total input cap. For the verified TCS request, four official transcripts were readable and its annual report exceeded the cap. Successful research is cached for one hour per process. Concurrency and reasoning are bounded; PDF synthesis has a 75-second timeout within a 120-second route allowance. Host limits may differ.

## Honest demo behavior

Live and Demo are explicit modes. A failed live provider response stays unavailable; sample data is never silently mixed into live results. Demo research says Sample data and Sample research report. Ask AI is instructed to use supplied portfolio observations for company-specific claims and refer fundamental questions to cited Research; this instruction is not a factuality guarantee.

## Validation and limits

Seventeen fixture-based tests cover research discovery, PDF URLs, bounded reads, citations, missing evidence, caching, explicit demo behavior, daily-bar alignment, exchange timestamps, per-company filing pagination, and empty live results. TypeScript and ESLint checks pass. Browser inspection verified live filings, a visible chat composer, report retention across sessions, and preference persistence.

Production build verification in the restricted Windows environment still fails when Turbopack starts its CSS worker. A passing production build is not claimed. Deployed phone behavior must be checked independently.

The prototype refreshes while open; it does not deliver background notifications. Live quarterly-result PDF extraction, management biography enrichment, guaranteed exhaustive exchange coverage, durable cross-device storage and suitability-based personalisation remain future work. The submitted AI build history must be an actual conversation export or share link; this document is not a substitute.

## Production deployment follow-up

The public production domain was verified to load without a Vercel login. Production checks then exposed failed direct BSE requests and a missing GEMINI_API_KEY. The key must be configured in Vercel Production and applied by a new deployment; it is never committed.

When a direct BSE company query fails, FINN now tries Screener's recent-announcement index for that company. Only original disclosure titles, timestamps and exchange PDF links are retained; index-generated summaries are excluded. Fallback companies are explicitly labelled indexed and incomplete, and unavailable companies remain visible. This is limited discovery, not guaranteed full exchange coverage. In a local forced-BSE-failure check, the fallback returned 30 seven-day filing links across 17 companies, with one unavailable. Its behavior from Vercel must be verified after deploying this change.
