---
name: data-integrity-guard
description: Enforces strict data integrity, zero fake numbers, and SSOT principles across ETL pipelines, SQL queries, API reports, and Frontend dashboard components. Prohibits UI mockup placeholders, hardcoded business constants, arbitrary numeric fallbacks, and synthesized proxy data.
---

# Data Integrity & Zero-Fake-Numbers Guard (SSOT)

## Core Philosophy
Every single number, metric, date range, and calculation displayed on the UI or processed in backend pipelines MUST originate strictly from the verified database (Single Source of Truth) or explicit API responses. Artificial estimates, hardcoded constants, and dummy placeholders are strictly prohibited.

---

## 🚫 4 Strict Prohibitions (Zero Tolerance)

### 1. No UI Mockup Placeholders in Production Code
* **Violation:** Inserting hardcoded mock values (e.g. `<span>64.0%</span>`, `진행중 누적 집계`, `₩150,000,000`) for visual design or card sizing and leaving them in codebase.
* **Rule:** If real data is not yet available, explicitly display `'미도래'`, `'집계 예정'`, or `'-'` rather than fake percentages.

### 2. No Hardcoding Document Illustrative Examples as Code Constants
* **Violation:** Converting narrative examples or scenario assumptions from planning docs into code constants (e.g. `const golfYtdEst = 5489000000;`, `* 30`).
* **Rule:** Calculate all business metrics dynamically from transactional datasets (e.g. summing 1~8 month actuals from the database and multiplying by dynamic `periodDays` [28, 29, 30, 31, 365]).

### 3. No Arbitrary Numeric Fallbacks (Defensive Coding Misuse)
* **Violation:** Using arbitrary numeric defaults like `divisionShares?.GOLF || 0.35` or `days || 30` to prevent runtime crashes.
* **Rule:** Always resolve exact dimensions from DB metadata. If data is genuinely absent, evaluate explicitly to `0`, `NULL`, or an explicit unmapped error state.

### 4. No Synthesizing Non-Existent Historical Data (Proxy Fabrication)
* **Violation:** Inventing missing historical baseline years with synthetic formulas (e.g. `rev2023 = rev2024 * 0.96` to satisfy a 3-year WMA formula when 2023 does not exist in DB).
* **Rule:** If historical data covers only 2024 and 2025, transparently calculate a 2-Year Weighted Moving Average `(R_2025 * 0.60 + R_2024 * 0.40)` and accurately label it on the UI. Never fabricate non-existent years.

---

## 🔍 Pre-Commit Code Review Checklist

Before committing or pushing any frontend or backend code:
- [ ] Are all displayed currencies, percentages, and metrics wired directly to DB SSOT data structures?
- [ ] Are there any hardcoded numbers (e.g. `64.0%`, `5489000000`, `* 30`) masquerading as live metrics?
- [ ] Are period day counts (`periodDays`) dynamically bound to the selected month/year rather than hardcoded 30?
- [ ] Are missing data points explicitly marked as `'미도래'` / `'집계 예정'` instead of filled with dummy averages?
- [ ] Are all `||` or `??` operators strictly returning neutral values (`0`, `null`, `undefined`) instead of arbitrary operational assumptions?
