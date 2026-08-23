---
name: data-integrity-guard
description: Enforces strict data integrity, zero fake numbers, and SSOT principles across ETL pipelines, SQL queries, API reports, and Frontend dashboard components. Prohibits UI mockup placeholders, hardcoded business constants, arbitrary numeric fallbacks, and synthesized proxy data.
---

# Data Integrity & Zero-Fake-Numbers Guard (SSOT)

## 🚨 [CRITICAL CODING CONSTRAINT: ZERO-MOCK DATA POLICY]

### 1. 임의 값/더미 데이터 생성 절대 금지 (STRICTLY FORBIDDEN)
- **금지:** 코드 내에 임의의 숫자, 하드코딩된 상수, Mock 데이터, 난수(`Math.random()`), 예시용 기본값(default value)을 절대로 직접 삽입하지 마시오.
- **원칙:** 실제 데이터셋이나 입력 파라미터가 명시되지 않은 경우, 숫자를 임의로 채우지 말고 반드시 동적 입력(변수, 파라미터, DB 조회, 파일 로드 등) 구조로만 코드를 작성하시오.

### 2. 데이터 연산 및 로직 무결성
- **원칙:** 모든 수치 계산은 원본 데이터의 필드나 변수 간의 수식(Expression/Formula)으로만 정의되어야 합니다.
- **원칙:** 계산 결과 검증을 위한 예시 숫자가 필요한 경우에도 코드에 상수를 박지 말고, 입출력 인터페이스만 구성하십시오.

### 3. 누락된 값에 대한 처리 규칙
- **원칙:** 특정 변수나 기준값이 확정되지 않았다면 임의의 숫자를 대입하지 말고, `None`, `null`, `NaN` 처리 또는 명시적인 예외(Exception) 처리 코드로 작성하시오.
- **원칙:** 코드 상단이나 설정부에 예시용 상수를 정의하는 행위(예: `TAX_RATE = 0.1` 같은 임의 지정)를 전면 금지합니다.

---

## 🚫 6 Strict Prohibitions (Zero Tolerance)

### 1. No UI Mockup Placeholders in Production Code
* **Violation:** Inserting hardcoded mock values (e.g. `<span>64.0%</span>`, `진행중 누적 집계`, `₩150,000,000`) for visual design or card sizing and leaving them in codebase.
* **Rule:** If real data is not yet available, explicitly display `'미도래'`, `'집계 예정'`, or `'-'` rather than fake percentages.

### 2. No Hardcoding Document Illustrative Examples as Code Constants
* **Violation:** Converting narrative examples or scenario assumptions from planning docs into code constants (e.g. `const golfYtdEst = 5489000000;`, `* 30`).
* **Rule:** Calculate all business metrics dynamically from transactional datasets (e.g. summing 1~8 month actuals from the database and multiplying by dynamic `periodDays` [28, 29, 30, 31, 365]).

### 3. No Arbitrary Numeric Fallbacks (Defensive Coding Misuse)
* **Violation:** Using arbitrary numeric defaults like `divisionShares?.GOLF || 0.35`, `r.선수금 || 160000`, `capacity || 10`, or `days || 30` to prevent runtime crashes.
* **Rule:** Always resolve exact dimensions from DB metadata. If data is genuinely absent, evaluate explicitly to `0`, `NULL`, `'-'`, or an explicit unmapped error state.

### 4. No Synthesizing Non-Existent Historical Data (Proxy Fabrication)
* **Violation:** Inventing missing historical baseline years with synthetic formulas (e.g. `rev2023 = rev2024 * 0.96` to satisfy a 3-year WMA formula when 2023 does not exist in DB).
* **Rule:** If historical data covers only 2024 and 2025, transparently calculate a 2-Year Weighted Moving Average `(R_2025 * 0.60 + R_2024 * 0.40)` and accurately label it on the UI. Never fabricate non-existent years.

### 5. No Synthetic Multiplier Estimations & Fake Contacts
* **Violation:** Multiplying customer counts by imaginary ticket/room prices (e.g. `paxCount * 45000`, `golfTeams * 680000`, `crossStayTeams * 175000`), or generating fake phone/email fallbacks (`'010-3456-7890'`, `${name}@company.co.kr`).
* **Rule:** Only report revenues that are backed by actual ledger vouchers/folio deposits in raw tables (`raw_객실_예약_v6.선수금`, `raw_포스_메뉴_v6`, `raw_골프_정산_v6`). If unlinked, output `0` or `'-'`.

### 6. Largest Remainder Rounding for Target Allocations (Zero-Variance)
* **Violation:** Rounding facility targets independently with `Math.round()`, creating 1~10 KRW discrepancy between Grand Target and the sum of facilities.
* **Rule:** Always use the Largest Remainder Method (하레-니마이어 방식). Calculate integer floors, sum them, and allocate the exact 1-won remainder delta to items with the largest decimal fractions so $\sum 	ext{facilities} \equiv 	ext{grandTarget}$ 100% exactly down to 1 KRW.

---

## 🔍 Pre-Commit Code Review Checklist

Before committing or pushing any frontend or backend code:
- [ ] Are all displayed currencies, percentages, and metrics wired directly to DB SSOT data structures?
- [ ] Are there any hardcoded numbers (e.g. `64.0%`, `5489000000`, `* 30`, `* 45000`, `* 175000`) masquerading as live metrics?
- [ ] Are period day counts (`periodDays`) dynamically bound to the selected month/year rather than hardcoded 30?
- [ ] Are missing data points explicitly marked as `'미도래'` / `'집계 예정'` / `'-'` instead of filled with dummy averages or fake phone numbers?
- [ ] Are all `||` or `??` operators strictly returning neutral values (`0`, `null`, `undefined`) instead of arbitrary operational assumptions?
- [ ] Does every target allocation engine enforce Zero-Variance via the Largest Remainder Method?
