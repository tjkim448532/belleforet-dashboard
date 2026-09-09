# [백엔드 긴급 보정 요청서] 회원 실적(daily-member-visitors) 정산 매출 누락 결함 해결

- **문서 번호**: BF-BE-REQ-20260909-01
- **발신**: 프론트엔드 대시보드 팀
- **수신**: 백엔드 데이터 파이프라인 및 API 개발팀
- **우선순위**: 🚨 긴급 (CRITICAL)
- **대상 엔드포인트**: `GET /api/v6/report/daily-member-visitors`
- **대상 소스 파일**: `src/app/api/v6/report/daily-member-visitors/route.ts`

---

## 1. 현상 요약 (Problem Statement)
- 대시보드 [회원 이용 실적 및 연간 방문 추적] 화면에서 상반기(`2026-01-01 ~ 2026-06-30`) 구간 조회 시:
  - **당일(기간) 이용 회원수**: 12명 (정상 노출)
  - **당일(기간) 회원 총 이용액**: **`₩0 원`** (결함)
  - **회원 1인당 평균**: **`₩0 원`** (결함)
  - **올해 최다 방문 VIP (김*수, 2회)** 올해 누적 결제액: **`₩0 원`** (결함)
  - **올해 회원 누적 LTV**: **`₩0 원`** (결함)
  - 회원 목록 테이블의 모든 회원 `todaySpend`, `ytdTotalSpend`가 `0원`으로 출력됨.

---

## 2. 근본 원인 분석 (Root Cause Analysis)

### 2.1. 사전 예약일자와 정산 영업일자의 불일치로 인한 JOIN 실패
`route.ts` 87행 및 179행의 골프 정산 조인 조건:
```sql
LEFT JOIN raw_골프_정산_v6 j ON p.예약번호_K = j.예약번호 
  AND p.동반객순번_K = j.동반객순번 
  AND j.영업일자 = SUBSTRING(p.등록일시, 1, 10)  -- 🚨 치명적 결함 원인
```
- `raw_골프_내장객_v6.등록일시`는 회원이 티타임을 예약 등록한 시점(예: 2026-06-08)입니다.
- `raw_골프_정산_v6.영업일자`는 실제 라운딩 후 결제가 일어난 영업일자(예: 2026-07-06)입니다.
- 골프는 사전 예약이 일반적이므로 `등록일시`와 `영업일자`가 다릅니다. 이로 인해 `j.영업일자 = SUBSTRING(p.등록일시, 1, 10)` 조건이 `FALSE`가 되어 정산 데이터가 100% 누락(`NULL ➔ 0`)되었습니다.

### 2.2. 정산 라인 복수 항목 미합산 (단일 행 조인 문제)
- 골프 1인당 정산 내역에는 그린피(GRF), 카트피(CTF), VAT, 락커/식음(GL) 등 복수 행이 존재합니다.
- `j`를 `GROUP BY 예약번호, 동반객순번`의 `SUM(매출)` 서브쿼리로 조인하지 않으면 특정 1개 항목만 매칭되거나 누락됩니다.

### 2.3. 내장객 테이블 중복 적재 이슈
- `raw_골프_내장객_v6`에 배치 복구 과정에서 동일 내장객이 중복 적재되어 있어, `ROW_NUMBER() OVER(PARTITION BY 예약번호_K, 동반객순번_K ORDER BY 수정일시 DESC, raw_id DESC)`를 통한 디둡(Deduplication) 선행 처리가 필수적입니다.

---

## 3. 프로덕션 DB 실측 검증 데이터 (Verification Facts)

잘못된 날짜 일치 조건을 제거하고 `(예약번호, 동반객순번)` 복합 키 기준으로 디둡 및 정산 매출 집계 시 산출된 **진성 실측 데이터**:

| 회원번호 | 회원명 | 회원분류 | 방문일(등록일) | 실제 결제액 (todaySpend) | 비고 |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `11035100` | 권봉중 | 정회원 | 2026-06-08 | **150,000원** | 실매출 복구 |
| `BP1C100801` | 이미옥 | 정회원 | 2026-06-26 | **164,000원** | 실매출 복구 |
| `BP1V200601` | 김정연 | 정회원 | 2026-06-17 | **144,000원** | 실매출 복구 |
| `BP1V200600` | 송영숙 | 정회원 | 2026-06-17 | **144,000원** | 실매출 복구 |
| `BP1V100701` | 박재구 | 정회원 | 2026-06-29 | **144,000원** | 실매출 복구 |
| `BP3C200600` | 이인호 | 정회원 | 2026-06-26 | **94,000원** | 실매출 복구 |
| `BP3C200601` | 동태희 | 정회원 | 2026-06-26 | **64,000원** | 실매출 복구 |
| `12035001` | 양병국 | 지정회원 | 2026-06-08 | **60,000원** | 실매출 복구 |
| `32030203` | 김수영 | 지정회원 | 2026-06-30 | **52,500원** | 실매출 복구 |
| `11035300` | 권오신 | 정회원 | 2026-06-08 | **50,000원** | 실매출 복구 |
| `BP3M201100` | **김미수** | 정회원 | 2026-06-08 / 2026-06-28 | **52,000원** | 2회 방문 VIP 실매출 복구 |
| `BP1V100703` | 정인순 | 지정회원 | 2026-06-29 | **0원** | 위임 건 |
| **합계** | **12명 (13건)** | - | - | **`1,118,500원`** | **인당 평균: `93,208원`** |

---

## 4. 백엔드 코드 수정 권고안 (Drop-in SQL Replacement)

`src/app/api/v6/report/daily-member-visitors/route.ts` 파일의 해당 쿼리 부분을 아래와 같이 교체해 주십시오.

### [수정 1] 골프 방문자 조회 (73~91행 교체)
```typescript
    // 1. Golf Member Visits in Query Period (Deduplicated & Settle Joined)
    const [golfRows]: any = await connection.query(`
      WITH UniqueGolfVisitors AS (
        SELECT 
          p.예약번호_K,
          p.동반객순번_K,
          p.회원번호,
          p.이름,
          p.회원분류명,
          SUBSTRING(p.등록일시, 1, 10) as visitDate,
          ROW_NUMBER() OVER(PARTITION BY p.예약번호_K, p.동반객순번_K ORDER BY p.수정일시 DESC, p.raw_id DESC) as rn
        FROM raw_골프_내장객_v6 p
        WHERE p.회원번호 IS NOT NULL AND p.회원번호 != '' AND p.회원번호 != '0'
          AND SUBSTRING(p.등록일시, 1, 10) BETWEEN ? AND ?
      )
      SELECT 
        u.회원번호 as memberNo,
        u.이름 as rawMemberName,
        u.회원분류명 as memberType,
        COALESCE(NULLIF(r.전화번호, ''), '') as rawPhone,
        '골프정회원' as membershipName,
        '벨포레CC 18홀' as visitedFacility,
        'GOLF' as categoryCode,
        u.visitDate,
        COALESCE(j.totalSpend, 0) as todaySpend
      FROM UniqueGolfVisitors u
      LEFT JOIN raw_골프_예약_v6 r ON u.예약번호_K = r.예약번호_K
      LEFT JOIN (
        SELECT 
          예약번호, 
          동반객순번, 
          ROUND(SUM(CAST(REPLACE(매출, ',', '') AS DECIMAL(15,2)))) as totalSpend
        FROM raw_골프_정산_v6
        WHERE 구분명 = 'Golf' OR 계정코드 IN ('GRF', 'CTF', 'VAT', 'GL')
        GROUP BY 예약번호, 동반객순번
      ) j ON u.예약번호_K = j.예약번호 AND u.동반객순번_K = j.동반객순번
      WHERE u.rn = 1
    `, [startDateStr, endDateStr]);
```

### [수정 2] 골프 YTD 누적 실적 조회 (171~183행 교체)
```typescript
    // 3. Query YTD History for active members (True Settle Sum for LTV)
    const [ytdGolfStats]: any = await connection.query(`
      WITH UniqueGolfYtd AS (
        SELECT 
          p.예약번호_K,
          p.동반객순번_K,
          p.회원번호,
          SUBSTRING(p.등록일시, 1, 10) as visitDate,
          ROW_NUMBER() OVER(PARTITION BY p.예약번호_K, p.동반객순번_K ORDER BY p.수정일시 DESC, p.raw_id DESC) as rn
        FROM raw_골프_내장객_v6 p
        WHERE p.회원번호 IS NOT NULL AND p.회원번호 != '' AND p.회원번호 != '0'
          AND SUBSTRING(p.등록일시, 1, 10) BETWEEN ? AND ?
      )
      SELECT 
        u.회원번호 as memberNo,
        COUNT(DISTINCT u.visitDate) as ytdVisits,
        MIN(u.visitDate) as firstVisit,
        MAX(u.visitDate) as lastVisit,
        COALESCE(SUM(j.totalSpend), 0) as ytdSpend
      FROM UniqueGolfYtd u
      LEFT JOIN (
        SELECT 
          예약번호, 
          동반객순번, 
          ROUND(SUM(CAST(REPLACE(매출, ',', '') AS DECIMAL(15,2)))) as totalSpend
        FROM raw_골프_정산_v6
        WHERE 구분명 = 'Golf' OR 계정코드 IN ('GRF', 'CTF', 'VAT', 'GL')
        GROUP BY 예약번호, 동반객순번
      ) j ON u.예약번호_K = j.예약번호 AND u.동반객순번_K = j.동반객순번
      WHERE u.rn = 1
      GROUP BY u.회원번호
    `, [ytdStart, endDateStr]);
```

---

## 5. 기대 결과 (Expected Outcome)
위 패치 적용 시 `2026-01-01 ~ 2026-06-30` 상반기 조회 결과:
- `summary.totalSpend`: **`1,118,500원`**
- `summary.avgSpendPerMember`: **`93,208원`**
- `summary.totalYtdSpend`: **`1,118,500원`**
- `summary.topLoyalMember`: **`김*수 (2회, 52,000원)`**
- 대시보드 화면의 4대 KPI 카드 및 회원별 상세 실적이 정상적인 실매출로 복구됩니다.
