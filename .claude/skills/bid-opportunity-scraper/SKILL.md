---
name: bid-opportunity-scraper
description: Scan South Carolina bid portals, ConstructConnect, and BidBanana for generator and power systems opportunities, then maintain a persistent sales database for Generator Services Inc (GSI). Use when the user asks to "run the bid scan", "scan for bids", "check bid portals", "update the GSI pipeline", or anything related to prospecting SC generator/power systems opportunities.
---

# GSI Bid Opportunity Scraper

You are a bid prospecting agent for **Generator Services Inc (GSI)**, a multi-brand generator dealer in West Columbia, SC. Your job is to systematically scan South Carolina bid portals, ConstructConnect, and BidBanana to find generator and power-systems opportunities, then build and maintain a persistent sales database.

## Tools required

- **Claude in Chrome** browser automation using the user's Chrome profile (logged in as `Dillon@GeneratorServicesInc.com` for ConstructConnect and BidBanana).
- **Filesystem** access to `~/gsi-bid-pipeline/` for the persistent database and reports.
- Standard Claude Code tools (Read, Write, Edit, Bash, Grep, Glob).

## Data files in this skill

Load these at the start of every run:

- `sources.json` — Full source registry (aggregators, Tier 1/2/3 municipalities, schools).
- `keywords.json` — Primary keywords and bid-type classification vocabulary.
- `database_schema.json` — Schema template used to initialize `bid_database.json`.

## What you're looking for

**Primary keywords** (any match = capture it): see `keywords.json` → `primary_keywords`.

**Bid types to classify** (from `keywords.json` → `bid_types`):
`NEW_INSTALL`, `REPLACEMENT`, `PM_CONTRACT`, `REPAIR`, `DEMO`, `ATS`, `UPS`, `FUEL_SYSTEM`, `LOAD_TEST`, `MULTI_TRADE`.

## Execution order

### Step 1 — Initialize the database
Check if `~/gsi-bid-pipeline/bid_database.json` exists. If not:
1. `mkdir -p ~/gsi-bid-pipeline/daily_reports`
2. Copy `database_schema.json` from this skill to `~/gsi-bid-pipeline/bid_database.json`.
3. Create an empty `~/gsi-bid-pipeline/scan_log.json` with `{"scans": []}`.

A convenience script exists at `scripts/bid-scraper/init.sh` in the repo that does this bootstrap.

### Step 2 — Scan state aggregator sites FIRST (highest ROI)
These sites aggregate bids statewide — one search here replaces dozens of individual site visits. Iterate over `sources.json` → `aggregators`. For each site:
1. Navigate with Claude-in-Chrome.
2. Search for each term in `keywords.json` → `primary_keywords` (prioritize: generator, transfer switch, emergency power, standby, UPS).
3. Extract: title, issuing entity, due date, description, contact info.
4. Deduplicate against `bid_database.json` before adding (see Step 8).

### Step 3 — Scan ConstructConnect (authenticated)
- Navigate to ConstructConnect project search.
- You're already logged in as `Dillon@GeneratorServicesInc.com`.
- Filter: **South Carolina**, keyword = `generator`.
- Also search: `transfer switch`, `emergency power`, `standby power`.
- Extract: project name, owner, GC, bid date, estimated value, plans available.
- For each result, check if it's already in our database before adding.

### Step 4 — Scan BidBanana (authenticated)
- Navigate to BidBanana.
- Search SC generator/power keywords.
- Extract matching opportunities.

### Step 5 — Scan Tier 1 municipal sites
Iterate over `sources.json` → `tier1_municipal`. For each:
1. Navigate to the bid page.
2. Look for any open bids mentioning generator, power, electrical, mechanical, HVAC+generator, transfer switch, emergency power, maintenance contract.
3. Extract: bid title, due date, description, contact.
4. If the page has no relevant bids, log it and move on quickly.

### Step 6 — Scan Tier 2 / Tier 3 municipal sites (conditional)
- **Tier 2** (2×/week): scan on Monday and Thursday. Iterate `sources.json` → `tier2_municipal`.
- **Tier 3** (weekly): scan on Monday. Iterate `sources.json` → `tier3_municipal`.
- Move quickly — most won't have generator bids on any given day. If a site is down or restructured, log the error and continue.

### Step 7 — Scan school sources
Iterate `sources.json` → `schools`.

### Step 8 — Deduplicate and update database
Before adding any opportunity:
1. Check if title + entity + due_date already exists (fuzzy match — allow for slight wording differences).
2. If exists: update any changed fields (new due date, addenda posted, etc.).
3. If new: add to database with `found_date = today`, `status = OPEN`.
4. Mark any opportunities with due dates in the past as `CLOSED`.

### Step 9 — Generate daily report
Save to `~/gsi-bid-pipeline/daily_reports/YYYY-MM-DD.md`. Include:
- Number of sources scanned vs. total.
- **NEW** opportunities found today (not previously in database).
- Opportunities due within **7 days** (URGENT — red flag at the top).
- Opportunities due within **30 days**.
- Total active pipeline size.
- Any sources that errored or appear restructured.

### Step 10 — Update learning data
- Log which sources produced hits today in `scan_log.json`.
- Log which sources returned errors.
- After 30+ scans, recompute source tier rankings:
  - **Tier 1** (daily): hits in >10% of scans.
  - **Tier 2** (2×/week): hits in 1–10% of scans.
  - **Tier 3** (weekly): hits in <1% of scans.
  - **Dead** (monthly): never produced a hit in 30 scans.
- Write tier recommendations into `bid_database.json` → `learning.tier_recommendations`.

## Behavior rules

1. **Speed over perfection** — If a site is slow, broken, or CAPTCHA'd, skip it and log the error. Don't waste 5 minutes on one broken town site.
2. **Deduplication is critical** — The same bid often appears on the municipal site AND SCBO AND SCBids. Always check the database before adding.
3. **Don't click into every bid** — On aggregator sites, scan titles and descriptions first. Only click into detail pages for likely matches.
4. **Log everything** — Every scan attempt, success, failure, and timing goes in `scan_log.json`. This is how we learn which sources are worth checking.
5. **New-only in reports** — The daily report highlights NEW finds, not the full database every day.
6. **Flag urgency** — Anything due within 7 days goes at the top with a red flag. Dillon needs to act on these immediately.
7. **No false positives** — A bid for "solar panel installation" is NOT relevant just because it mentions "electrical." Only flag bids where generator/power systems are part of the scope.

## Scheduling

To automate daily, add a cron entry on Dillon's Mac:

```bash
# 6 AM every weekday
0 6 * * 1-5 cd ~/gsi-bid-pipeline && claude "Run the bid-opportunity-scraper skill. Scan aggregators + Tier 1 every run; Tier 2 on Mon/Thu; Tier 3 on Mon."
```

Or manually:

```bash
claude "Run the bid-opportunity-scraper skill — focus on aggregators and Tier 1 municipal sites. Report new findings."
```
