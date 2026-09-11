# [백엔드 긴급 보정 요청서] 객실 연박비중(los-correlation-trend) 0% 하드코딩 결함 수정 요청

- **문서 번호**: BF-BE-REQ-20260911-01
- **발신**: 프론트엔드 대시보드 팀
- **수신**: 백엔드 데이터 파이프라인 및 API 개발팀
- **우선순위**: 🚨 긴급 (CRITICAL)
- **대상 엔드포인트**: `GET /api/v6/dashboard/los-correlation-trend`
- **대상 소스 파일**: `belleforet-data/src/app/api/v6/dashboard/los-correlation-trend/route.ts`

---

## 1. 현상 요약 (Problem Statement)
대시보드 [영업 및 리조트 실적]의 **"체류 기간(LOS)과 부대시설 교차소비 상관관계"** 차트 및 요약 카드에서:
- **전체 조회 기간의 '연박 비중' 라인 차트가 일괄 `0.0%` 평행선으로 표출**됨.
- **상단 요약 카드의 '연박 객실수'가 `0실`, '평균 연박 비중'이 `0.0%`로 고정**됨.
- 프론트엔드 컴포넌트(`ResortBusiness.tsx`)는 백엔드 API가 제공하는 `multiNightRatio` 및 `multiNightRooms`를 SSOT 원칙에 따라 순수 수용(Pure Consumer)하고 있으나, 백엔드 API 응답값 자체가 모든 일자에서 `0`으로 반환되고 있습니다.

---

## 2. 근본 원인 분석 (Root Cause Analysis)

백엔드 엔드포인트 소스 코드(`src/app/api/v6/dashboard/los-correlation-trend/route.ts`) 확인 결과:

### 2.1. 트렌드 일별 쿼리 내 하드코딩 (23~24행)
```typescript
// route.ts Line 21-25
SELECT 
  DATE_FORMAT(STR_TO_DATE(date_id, '%Y%m%d'), '%Y-%m-%d') AS date,
  CAST(IFNULL(SUM(CASE WHEN category_code = 'ROOM' THEN quantity ELSE 0 END), 0) AS SIGNED) AS roomsSold,
  0 AS multiNightRooms,      // 🚨 원인: 0 하드코딩 Stub 방치
  0 AS multiNightRatio,      // 🚨 원인: 0 하드코딩 Stub 방치
  ...
```

### 2.2. 전체 구간 요약 쿼리 내 하드코딩 (47~48행)
```typescript
// route.ts Line 46-49
SELECT 
  CAST(IFNULL(SUM(CASE WHEN category_code = 'ROOM' THEN quantity ELSE 0 END), 0) AS SIGNED) AS grandTotalRooms,
  0 AS grandTotalMultiNightRooms, // 🚨 원인: 0 하드코딩 Stub 방치
  0 AS avgMultiNightRatio,        // 🚨 원인: 0 하드코딩 Stub 방치
  ...
```
- API 개발 초기 스텁(Stub) 처리된 `0` 상수가 실제 계산 로직으로 교체되지 않은 채 프로덕션에 배포되어 발생한 결함입니다.

---

## 3. 프로덕션 DB 실측 검증 데이터 (Verification Facts)

`raw_객실_정산_v6` 및 `raw_객실_예약_v6` 테이블에서 실제 투숙 박수(`res.박수 >= 2`)를 연계하여 산출한 **2026-09-01 ~ 2026-09-10 (10일간) 진성 실측 데이터**:

### 3.1. 일별 실측 트렌드 (Trend Rows)
| 영업일자 (date) | 판매객실 (roomsSold) | 연박객실 (multiNightRooms) | 연박비중 (multiNightRatio) | 객실당 F&B (fnbRevPAS) | 객실당 레저 (leisureRevPAS) |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **2026-09-01** | 8실 | **5실** | **62.5%** | ₩205,941 | ₩46,250 |
| **2026-09-02** | 122실 | **2실** | **1.6%** | ₩243,010 | ₩110,637 |
| **2026-09-03** | 99실 | **5실** | **5.1%** | ₩268,642 | ₩111,273 |
| **2026-09-04** | 126실 | **12실** | **9.5%** | ₩243,842 | ₩91,957 |
| **2026-09-05** | 61실 | **12실** | **19.7%** | ₩283,230 | ₩124,311 |
| **2026-09-06** | 87실 | **9실** | **10.3%** | ₩254,196 | ₩109,241 |
| **2026-09-07** | 94실 | **45실** | **47.9%** | ₩256,589 | ₩107,372 |
| **2026-09-08** | 53실 | **27실** | **50.9%** | ₩205,820 | ₩112,057 |
| **2026-09-09** | 112실 | **48실** | **42.9%** | ₩198,390 | ₩126,980 |
| **2026-09-10** | 127실 | **47실** | **37.0%** | ₩194,545 | ₩139,472 |

### 3.2. 기간 종합 요약 (Summary Row)
- **총 판매객실 (grandTotalRooms)**: `889실`
- **총 연박객실 (grandTotalMultiNightRooms)**: **`212실`** (기존 0실 ➔ 정상 복구)
- **평균 연박비중 (avgMultiNightRatio)**: **`23.8%`** (기존 0.0% ➔ 정상 복구, $212 / 889 \times 100$)
- **평균 F&B RevPAS**: `₩230,639`
- **평균 Leisure RevPAS**: `₩112,043`
- **총 시너지 매출**: `₩304,644,192`
- **쿼리 성능**: 인덱스 기반 서브쿼리 및 CTE 적용 시 **`297ms` 내외**로 초고속 반환 확인됨.

---

## 4. 백엔드 코드 수정 권고안 (Drop-in Replacement Code)

대상 파일: `belleforet-data/src/app/api/v6/dashboard/los-correlation-trend/route.ts`

기존 19~77행을 아래의 완제품 코드로 1:1 교체해 주시기 바랍니다.

```typescript
import { NextResponse } from 'next/server';
import { DbRepository } from '@/v3-engine/infrastructure/database/DbRepository';
import { withApiHandler, parseDateParams } from '@/lib/utils/apiHandler';

export const runtime = 'nodejs';
export const maxDuration = 60;
export const dynamic = 'force-dynamic';

export const OPTIONS = withApiHandler(async () => NextResponse.json({}));

export const GET = withApiHandler(async (req: Request) => {
  const { startDate, endDate } = parseDateParams(req);

  const startId = startDate.replace(/-/g, '');
  const endId = endDate.replace(/-/g, '');

  const conn = await DbRepository.getConnection();

  // 1. 일별 트렌드 데이터 (연박 객실 CTE 결합)
  const [trendRows]: any = await conn.query(`
    WITH MultiNightDaily AS (
      SELECT 
        r.영업일자 AS stay_date,
        SUM(CASE WHEN CAST(res.박수 AS SIGNED) >= 2 THEN CAST(NULLIF(REPLACE(r.수량, ',', ''), '') AS SIGNED) ELSE 0 END) AS multi_rooms
      FROM raw_객실_정산_v6 r
      INNER JOIN dim_revenue_account_master m ON r.계정코드명 = m.account_name AND COALESCE(r.구분명, 'ALL') = m.sub_identifier AND m.is_revenue = 1
      LEFT JOIN (
        SELECT 예약번호_K, 요금타입명, 객실타입명, 박수, ROW_NUMBER() OVER(PARTITION BY 예약번호_K ORDER BY 수정일자 DESC, raw_id DESC) AS rn
        FROM raw_객실_예약_v6
        WHERE 예약번호_K IN (
          SELECT DISTINCT 예약번호 FROM raw_객실_정산_v6 
          WHERE 영업일자 BETWEEN ? AND ?
            AND 영업장명 IN ('ROOM', '객실')
        )
      ) res ON res.예약번호_K = r.예약번호 AND res.rn = 1
      WHERE r.영업일자 BETWEEN ? AND ?
        AND r.영업장명 IN ('ROOM', '객실') 
        AND m.account_name IN ('Room Charge', 'Cancel Charge', 'No-Show Charge')
      GROUP BY r.영업일자
    )
    SELECT 
      DATE_FORMAT(STR_TO_DATE(m.date_id, '%Y%m%d'), '%Y-%m-%d') AS date,
      CAST(IFNULL(SUM(CASE WHEN m.category_code = 'ROOM' THEN m.quantity ELSE 0 END), 0) AS SIGNED) AS roomsSold,
      CAST(IFNULL(MAX(mn.multi_rooms), 0) AS SIGNED) AS multiNightRooms,
      ROUND(
        IFNULL(MAX(mn.multi_rooms), 0) / 
        NULLIF(SUM(CASE WHEN m.category_code = 'ROOM' THEN m.quantity ELSE 0 END), 0) * 100, 1
      ) AS multiNightRatio,
      CAST(IFNULL(
        ROUND(
          SUM(CASE WHEN m.category_code = 'FNB' THEN m.revenue ELSE 0 END) / 
          NULLIF(SUM(CASE WHEN m.category_code = 'ROOM' THEN m.quantity ELSE 0 END), 0)
        )
      , 0) AS SIGNED) AS fnbRevPAS,
      CAST(IFNULL(
        ROUND(
          SUM(CASE WHEN m.category_code IN ('TICKET', 'LEISURE') THEN m.revenue ELSE 0 END) / 
          NULLIF(SUM(CASE WHEN m.category_code = 'ROOM' THEN m.quantity ELSE 0 END), 0)
        )
      , 0) AS SIGNED) AS leisureRevPAS,
      CAST(IFNULL(SUM(CASE WHEN m.category_code IN ('FNB', 'TICKET', 'LEISURE') THEN m.revenue ELSE 0 END), 0) AS SIGNED) AS totalSynergySales
    FROM mat_v6_data_mart_revenue m
    LEFT JOIN MultiNightDaily mn ON mn.stay_date = DATE_FORMAT(STR_TO_DATE(m.date_id, '%Y%m%d'), '%Y-%m-%d')
    WHERE m.date_id BETWEEN ? AND ?
    GROUP BY m.date_id
    ORDER BY m.date_id ASC
  `, [startDate, endDate, startDate, endDate, startId, endId]);

  // 2. 전체 기간 종합 요약 (Summary)
  const [summaryRows]: any = await conn.query(`
    WITH MultiNightTotal AS (
      SELECT 
        SUM(CASE WHEN CAST(res.박수 AS SIGNED) >= 2 THEN CAST(NULLIF(REPLACE(r.수량, ',', ''), '') AS SIGNED) ELSE 0 END) AS multi_rooms
      FROM raw_객실_정산_v6 r
      INNER JOIN dim_revenue_account_master m ON r.계정코드명 = m.account_name AND COALESCE(r.구분명, 'ALL') = m.sub_identifier AND m.is_revenue = 1
      LEFT JOIN (
        SELECT 예약번호_K, 요금타입명, 객실타입명, 박수, ROW_NUMBER() OVER(PARTITION BY 예약번호_K ORDER BY 수정일자 DESC, raw_id DESC) AS rn
        FROM raw_객실_예약_v6
        WHERE 예약번호_K IN (
          SELECT DISTINCT 예약번호 FROM raw_객실_정산_v6 
          WHERE 영업일자 BETWEEN ? AND ?
            AND 영업장명 IN ('ROOM', '객실')
        )
      ) res ON res.예약번호_K = r.예약번호 AND res.rn = 1
      WHERE r.영업일자 BETWEEN ? AND ?
        AND r.영업장명 IN ('ROOM', '객실') 
        AND m.account_name IN ('Room Charge', 'Cancel Charge', 'No-Show Charge')
    )
    SELECT 
      CAST(IFNULL(SUM(CASE WHEN category_code = 'ROOM' THEN quantity ELSE 0 END), 0) AS SIGNED) AS grandTotalRooms,
      CAST(IFNULL((SELECT multi_rooms FROM MultiNightTotal), 0) AS SIGNED) AS grandTotalMultiNightRooms,
      ROUND(
        IFNULL((SELECT multi_rooms FROM MultiNightTotal), 0) / 
        NULLIF(SUM(CASE WHEN category_code = 'ROOM' THEN quantity ELSE 0 END), 0) * 100, 1
      ) AS avgMultiNightRatio,
      CAST(IFNULL(
        ROUND(
          SUM(CASE WHEN category_code = 'FNB' THEN revenue ELSE 0 END) / 
          NULLIF(SUM(CASE WHEN category_code = 'ROOM' THEN quantity ELSE 0 END), 0)
        )
      , 0) AS SIGNED) AS avgFnbRevPAS,
      CAST(IFNULL(
        ROUND(
          SUM(CASE WHEN category_code IN ('TICKET', 'LEISURE') THEN revenue ELSE 0 END) / 
          NULLIF(SUM(CASE WHEN category_code = 'ROOM' THEN quantity ELSE 0 END), 0)
        )
      , 0) AS SIGNED) AS avgLeisureRevPAS,
      CAST(IFNULL(SUM(CASE WHEN category_code IN ('FNB', 'TICKET', 'LEISURE') THEN revenue ELSE 0 END), 0) AS SIGNED) AS grandTotalSynergySales
    FROM mat_v6_data_mart_revenue
    WHERE date_id BETWEEN ? AND ?
  `, [startDate, endDate, startDate, endDate, startId, endId]);

  conn.release();

  const trendData = trendRows.length > 0 ? trendRows : null;
  const summary = trendRows.length > 0 ? summaryRows[0] : null;

  return NextResponse.json({
    success: true,
    startDate,
    endDate,
    summary,
    trendData
  });
});
```

---

## 5. 검증 테스트 및 기대 응답 JSON

### 5.1. cURL 테스트 명령어
```bash
curl -X GET "https://api.belleforet.kr/api/v6/dashboard/los-correlation-trend?startDate=2026-09-01&endDate=2026-09-10"
```

### 5.2. 기대 응답 JSON (Expected JSON Output)
```json
{
  "success": true,
  "startDate": "2026-09-01",
  "endDate": "2026-09-10",
  "summary": {
    "grandTotalRooms": 889,
    "grandTotalMultiNightRooms": 212,
    "avgMultiNightRatio": 23.8,
    "avgFnbRevPAS": 230639,
    "avgLeisureRevPAS": 112043,
    "grandTotalSynergySales": 304644192
  },
  "trendData": [
    {
      "date": "2026-09-01",
      "roomsSold": 8,
      "multiNightRooms": 5,
      "multiNightRatio": 62.5,
      "fnbRevPAS": 205941,
      "leisureRevPAS": 46250,
      "totalSynergySales": 2017530
    },
    {
      "date": "2026-09-02",
      "roomsSold": 122,
      "multiNightRooms": 2,
      "multiNightRatio": 1.6,
      "fnbRevPAS": 243010,
      "leisureRevPAS": 110637,
      "totalSynergySales": 43144990
    }
  ]
}
```

---

## 6. 프론트엔드 호환성 확인
- 프론트엔드 컴포넌트(`ResortBusiness.tsx`)는 백엔드 완제품 응답 키(`multiNightRatio`, `multiNightRooms`, `avgMultiNightRatio`, `grandTotalMultiNightRooms`)를 이미 100% camelCase 규격으로 수용하도록 완성되어 있습니다.
- 백엔드 팀에서 상기 완제품 코드를 배포하는 즉시 프론트엔드 수정 없이 대시보드 화면이 완벽하게 정상 표출됩니다.
