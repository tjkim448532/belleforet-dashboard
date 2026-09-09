# [긴급 백엔드 최적화 요청서] V6 대시보드 API 쿼리 성능 개선 및 레거시 뷰 폐기

- **문서 번호**: `BF-BE-REQ-20260909-03`
- **수신**: 백엔드 엔지니어링 파이프라인 팀
- **발신**: 프론트엔드 대시보드 팀
- **일자**: 2026-09-09
- **긴급도**: **CRITICAL (RDS CPU 100% 완화 및 조회 속도 10배 개선)**

---

## 1. 현황 및 장애 원인 분석 (Root Cause)

프론트엔드 전사종합매출(홈) 대시보드에서 `[벨포레 현황판을 불러오는 중입니다...]` 무한 로딩이 발생한 원인을 RDS 프로덕션 MariaDB `SHOW FULL PROCESSLIST`를 통해 추적한 결과, 아래 2가지 원인으로 인해 **쿼리가 300초 이상 지속 실행되며 RDS CPU를 100% 점유하고 커넥션 풀을 고갈**시키는 것으로 확인되었습니다:

1. **레거시 뷰 `vw_v6_dashboard_overview` 조회로 인한 RDS 병목 (`overview/route.ts`)**
   - `SELECT * FROM vw_v6_dashboard_overview WHERE target_date = ?` 실행 시 300초 이상 소요(`Creating sort index`).
   - 현재 프론트엔드는 본 엔드포인트의 데이터를 전혀 사용하지 않으며, 전 지표가 `revenue-summary`로 완전 이관되었습니다.
   - **조치 요청**: `/api/v6/dashboard/overview`의 `vw_v6_dashboard_overview` 호출 제거 또는 엔드포인트 폐기.

2. **무조건부 윈도우 함수 전체 스캔 서브쿼리 (`revenue-summary/route.ts` & `golf-channel-teetime-analysis/route.ts`)**
   - `raw_객실_예약_v6` (15만 행) 및 `raw_골프_내장객_v6` (29만 행) 테이블에 대해 서브쿼리 내부 날짜/예약번호 필터(`WHERE`) 없이 `ROW_NUMBER() OVER (PARTITION BY ...)`를 수행하고 있습니다.
   - 이로 인해 MariaDB가 매 요청마다 15만~29만 행의 대용량 임시 디스크 테이블을 생성하며 정렬을 수행하여 단일 쿼리당 20초~45초씩 소요되었습니다.

---

## 2. 쿼리 개선안 및 실측 벤치마크 결과 (10배 속도 향상 검증 완료)

프론트엔드에서 실제 프로덕션 DB(`readonly_v6_api`)를 대상으로 **서브쿼리 내부 예약번호 필터링 조건**을 추가하여 벤치마크를 수행한 결과, **1원 단위 오차(Zero-Variance) 없이 동일한 결과를 산출하면서 속도가 10배 이상 향상**됨을 검증 완료하였습니다.

| 대상 쿼리 | 기존 소요 시간 | 서브쿼리 필터 추가 후 실측 시간 | 속도 개선율 |
| :--- | :---: | :---: | :---: |
| **연박 객실/투숙객 수용량 (`multi_rooms`)** | **20초+** | **1,568 ms (1.5초)** | **약 13배 향상 🚀** |
| **골프 회원/비회원 그린피 실적 (`golfMemberStats`)** | **45초+** | **4,047 ms (4.0초)** | **약 11배 향상 🚀** |

---

## 3. 상세 백엔드 소스코드 수정 요청 내역

### 3.1. [수정 1] `src/app/api/v6/dashboard/revenue-summary/route.ts`

#### A. 연박 지표 서브쿼리 필터 추가 (Line 429~444 부근)
`res` 인라인 서브쿼리 내부에 당일/기간에 정산된 예약번호만 대상으로 파티셔닝하도록 `WHERE` 절을 추가해 주십시오:

```typescript
// AS-IS: 15만 행 전체 파티셔닝 (20초 소요)
INNER JOIN (
    SELECT 예약번호_K, 요금타입명, 객실타입명, 박수, ROW_NUMBER() OVER(PARTITION BY 예약번호_K ORDER BY 수정일자 DESC, raw_id DESC) as rn
    FROM raw_객실_예약_v6
) res ON res.예약번호_K = r.예약번호 AND res.rn = 1

// TO-BE: 해당 기간 정산 예약번호만 필터링하여 파티셔닝 (1.5초 소요)
INNER JOIN (
    SELECT 예약번호_K, 요금타입명, 객실타입명, 박수, ROW_NUMBER() OVER(PARTITION BY 예약번호_K ORDER BY 수정일자 DESC, raw_id DESC) as rn
    FROM raw_객실_예약_v6
    WHERE 예약번호_K IN (
      SELECT DISTINCT 예약번호 FROM raw_객실_정산_v6 
      WHERE REPLACE(영업일자, '-', '') BETWEEN ? AND ?
        AND 영업장명 IN ('ROOM', '객실')
    )
) res ON res.예약번호_K = r.예약번호 AND res.rn = 1
```
*(파라미터 바인딩 배열에 `todayStartId`, `targetDateId` 추가 필요)*

---

#### B. 골프 회원/비회원 그린피 서브쿼리 필터 추가 (Line 580~598 부근)
`v` 인라인 서브쿼리 내부에 당일/기간에 정산된 예약번호만 대상으로 파티셔닝하도록 `WHERE` 절을 추가해 주십시오:

```typescript
// AS-IS: 29만 행 전체 파티셔닝 (45초 소요)
LEFT JOIN (
  SELECT 예약번호_K, 동반객순번_K, 회원분류명, 회원번호,
         ROW_NUMBER() OVER (PARTITION BY 예약번호_K, 동반객순번_K ORDER BY 등록일시 DESC, raw_id DESC) as rn
  FROM raw_골프_내장객_v6
) v ON (v.예약번호_K = s.예약번호 AND v.동반객순번_K = s.동반객순번 AND v.rn = 1)

// TO-BE: 해당 기간 골프 정산 예약번호만 필터링하여 파티셔닝 (4.0초 소요)
LEFT JOIN (
  SELECT 예약번호_K, 동반객순번_K, 회원분류명, 회원번호,
         ROW_NUMBER() OVER (PARTITION BY 예약번호_K, 동반객순번_K ORDER BY 등록일시 DESC, raw_id DESC) as rn
  FROM raw_골프_내장객_v6
  WHERE 예약번호_K IN (
    SELECT DISTINCT 예약번호 FROM raw_골프_정산_v6 
    WHERE 영업일자 BETWEEN ? AND ?
  )
) v ON (v.예약번호_K = s.예약번호 AND v.동반객순번_K = s.동반객순번 AND v.rn = 1)
```
*(파라미터 바인딩 배열에 `startDate`, `endDate` 추가 필요)*

---

### 3.2. [수정 2] `src/app/api/v6/report/golf-channel-teetime-analysis/route.ts`

- Line 478~497 부근의 `raw_골프_내장객_v6` 조인 서브쿼리에도 위와 동일하게 `WHERE 예약번호_K IN (SELECT DISTINCT 예약번호 FROM raw_골프_정산_v6 WHERE 영업일자 BETWEEN ? AND ?)` 조건을 적용해 주십시오.

---

### 3.3. [수정 3] `src/app/api/v6/dashboard/overview/route.ts`

- 프론트엔드에서는 300초 병목을 유발하던 `overview` 엔드포인트 호출을 전면 제거하였습니다.
- 백엔드에서도 `vw_v6_dashboard_overview` 뷰 쿼리를 실행하지 않도록 주석 처리하거나 안전한 빈 객체를 반환하도록 경량화해 주시기 바랍니다.

---

## 4. 프론트엔드 조치 완료 사항

1. `src/contexts/CoreDataContext.tsx`:
   - 300초 지연을 유발하던 `overview` 엔드포인트 호출 완전 제거.
   - `revenue-summary` 단일 SSOT 즉시 렌더링 적용 (응답 수신 즉시 로딩 해제).
   - 골프 티타임 채널 분석(`golf-channel-teetime-analysis`)은 비동기 백그라운드 갱신으로 분리하여 화면 차단 원천 차단.
2. 배포: `main` 브랜치에 커밋 및 푸시 완료 (`4b63628`).
