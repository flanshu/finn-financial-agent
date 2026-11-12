# FINN — Financial Investment Agent

> AI-powered financial investment agent with proactive alerts and deep company research.  
> Built for the **ENAM Holdings AI Engineer Build Challenge**.

## What is FINN?

FINN is a mobile-first financial investment agent that operates in two modes:

### Push Mode — Proactive Daily Intelligence
- **Corporate Announcement Digest**: Auto-classified and priority-ranked announcements from BSE filings across 18 portfolio companies
- **Smart Results Cards**: Revenue, EBITDA, PBT, PAT with QoQ and YoY comparisons at a glance
- **Price & Volume Alerts**: Configurable thresholds for price spikes/drops and unusual volume activity
- **17 Announcement Categories**: Results, M&A, fund raises, management changes, litigation, insider trading, earnings calls, and more

### Pull Mode — On-Demand Deep Research
- **Business Snapshot**: Company overview, segments, revenue mix, key products
- **Financial Snapshot**: Revenue, margins, D/E ratio, ROCE/ROE, key highlights
- **Narrative vs. Numbers**: The signature module — compares management's guidance from concall transcripts against actual delivered numbers, with verdict (exceeded / aligned / missed)

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14 (App Router) + Tailwind CSS |
| UI | Custom mobile-first components, dark mode, iOS-safe areas |
| API | Next.js API Routes (REST) |
| AI Pipeline | Multi-agent architecture (Classifier, Summarizer, Research Agent) |
| Data Sources | BSE API, yfinance, screener.in (annual reports + concalls) |
| Deployment | Vercel |

## Architecture

```
User (Mobile) --> Next.js Frontend --> API Routes
                                         |
                                  +--------------+
                                  | Classifier   | <-- BSE Filings
                                  | (Gemini Flash)|
                                  +------+-------+
                                         |
                                  +--------------+
                                  | Summarizer   | --> Push Feed
                                  | (Gemini Flash)|
                                  +--------------+
                                  
                                  +--------------+
                                  | Research Agent| <-- screener.in
                                  | (Gemini Pro)  |    Annual Reports
                                  +------+-------+    Concall Transcripts
                                         |
                                  Pull Research Report
```

## Portfolio Coverage

18 NSE-listed companies across 6 sectors:
- IT: TCS, Infosys, HCL Tech
- Banking: HDFC Bank, ICICI Bank, Kotak Mahindra Bank
- FMCG: HUL, ITC, Nestle India
- Auto: Maruti Suzuki, Tata Motors
- Pharma: Sun Pharma, Dr. Reddy's
- Others: Reliance, NTPC, Tata Steel, Bajaj Finance, Asian Paints

Plus 3 Research Companies: Zomato, DMart, Titan

## Running Locally

```bash
npm install
npm run dev
```

Open http://localhost:3000 on your phone or in mobile view.

## AI Build History

This project was built with AI assistance using Claude (Anthropic). The complete conversation history documenting every design decision, architecture choice, and code generation is available as part of the submission.

## Author

Aakriti Harit — IIT Delhi

---

Built for the ENAM Holdings AI Engineer Build Challenge — November 2026
