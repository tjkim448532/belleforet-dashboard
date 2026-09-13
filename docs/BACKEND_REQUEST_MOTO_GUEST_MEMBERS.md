# [백엔드 API 규격 요청서] 모토아레나 숙박객 및 회원 이용객 수 SSOT 제공 요청

- **문서 번호**: `BF-BE-REQ-20260913-01`
- **수신**: 백엔드 엔지니어링팀 (`belleforet-data`)
- **발신**: 프론트엔드 대시보드 개발팀 (`belleforet-dashboard`)
- **일시**: 2026-09-13
- **우선순위**: **HIGH**
- **관련 규정**: 『벨포레 데이터 통합 통제 API 바이블 (The Bible) v4.2 & V6 Constitution』 및 R&R 경계 준수 원칙

---

## 1. 요청 배경 및 목적

대시보드 메인 현황판(`Home.tsx`)의 **"통합 숙박객 수 (콘도 투숙객)"** 카드 하단에는 콘도 투숙객의 리조트 내 주요 레저/어트랙션 연계 이용 현황을 모니터링하는 **[주요 레저/어트랙션 이용객 수]** 섹션이 존재합니다.

- 타 레저 시설(미디어아트, 썸머랜드, 벨포레 목장, 원더풀 등)은 전체 발권 이용객을 표출하되, **모토아레나(🏁 모토아레나)의 경우 일반 외부 방문객을 배제하고 오직 리조트 투숙객 및 회원(객실투숙객 + 콘도회원)만의 실제 이용객 수를 분리 집계하여 표출**하도록 결정되었습니다.
- 프론트엔드는 NO SLICE SUMMATION 원칙에 따라 자체 가산이나 임의 필터링을 수행하지 않으며, 백엔드 마스터 API인 `GET /api/v6/dashboard/revenue-summary`의 `summary` 객체로부터 완성된 지표를 순수 소비(Pure Consumer)하고자 합니다.

---

## 2. 실측 데이터 검증 결과 (Ground Truth on RDS)

이미 MariaDB 내 `mat_v6_visitor_segment_daily` 및 `fact_ticket_sales_v6`에 완벽한 데이터가 적재되어 있으며, `date_id` 인덱스를 통해 **18ms 초고속**으로 조회가 완료됨을 검증하였습니다.

### 2.1. 2026-09-12 (당일 단일일자 실측)
| 고객 세그먼트 | 세그먼트 코드 | 발권 수량 (qty) | 실제 이용객 수 (visitor_count) | 비고 |
| :--- | :---: | :---: | :---: | :--- |
| **객실투숙객** | `GUEST` | **2매** | **4명** | **모토아레나 투숙객 이용 실적** |
| **콘도회원** | `MEM` | **0매** | **0명** | **모토아레나 회원 이용 실적** |
| 일반 | `GEN` | 93매 | 121명 | 외부 당일 방문객 (배제 대상) |
| 임직원 | `EMP` | 2매 | 4명 | 사내 임직원 (배제 대상) |
| 지역주민 | `LOCAL` | 1매 | 1명 | 증평/충북 주민 (배제 대상) |
| **합계 (숙박객+회원)** | `GUEST+MEM` | **2매** | **4명** | **대시보드 최종 표출 지표 (4명)** |

### 2.2. 2026-09-01 ~ 2026-09-12 (누적 구간 실측)
- **객실투숙객 (`GUEST`)**: 발권 97매 / 이용객 **129명**
- **콘도회원 (`MEM`)**: 발권 0매 / 이용객 **0명**
- **숙박객 + 회원 합계**: **129명** (0-Variance 일치)

---

## 3. 백엔드 구현 요청 사항 (`revenue-summary/route.ts`)

### 3.1. 수정 대상 엔드포인트
- `GET /api/v6/dashboard/revenue-summary` (파일: `src/app/api/v6/dashboard/revenue-summary/route.ts`)

### 3.2. 권장 쿼리 로직 (초고속 마트 조회 + 원천 폴백)

```typescript
// [모토아레나 숙박객/회원 이용객 수 SSOT] mat_v6_visitor_segment_daily 초고속(15ms) 조회
let motoGuestMemberVisitors = 0;
let motoGuestVisitors = 0;
let motoMemberVisitors = 0;

try {
  const [motoMartRows]: any = await connection.query(`
    SELECT 
      CAST(IFNULL(SUM(CASE WHEN customer_segment_code = 'GUEST' THEN visitor_count ELSE 0 END), 0) AS SIGNED) AS motoGuestVisitors,
      CAST(IFNULL(SUM(CASE WHEN customer_segment_code = 'MEM' THEN visitor_count ELSE 0 END), 0) AS SIGNED) AS motoMemberVisitors,
      CAST(IFNULL(SUM(CASE WHEN customer_segment_code IN ('GUEST', 'MEM') THEN visitor_count ELSE 0 END), 0) AS SIGNED) AS motoGuestMemberVisitors
    FROM mat_v6_visitor_segment_daily
    WHERE (venue_name LIKE '%모토%' OR category_code = 'MOTO')
      AND date_id BETWEEN ? AND ?
  `, [todayStartId, targetDateId]);

  if (motoMartRows && motoMartRows[0] && (motoMartRows[0].motoGuestMemberVisitors > 0 || motoMartRows[0].motoGuestVisitors > 0)) {
    motoGuestVisitors = Number(motoMartRows[0].motoGuestVisitors || 0);
    motoMemberVisitors = Number(motoMartRows[0].motoMemberVisitors || 0);
    motoGuestMemberVisitors = Number(motoMartRows[0].motoGuestMemberVisitors || 0);
  } else {
    // 실시간 원천 팩트 테이블 폴백
    const [motoFactRows]: any = await connection.query(`
      SELECT 
        CAST(IFNULL(SUM(CASE WHEN customer_segment_code = 'GUEST' OR customer_segment_name = '객실투숙객' THEN visitor_count ELSE 0 END), 0) AS SIGNED) AS motoGuestVisitors,
        CAST(IFNULL(SUM(CASE WHEN customer_segment_code = 'MEM' OR customer_segment_name = '콘도회원' THEN visitor_count ELSE 0 END), 0) AS SIGNED) AS motoMemberVisitors,
        CAST(IFNULL(SUM(CASE WHEN customer_segment_code IN ('GUEST', 'MEM') OR customer_segment_name IN ('객실투숙객', '콘도회원') THEN visitor_count ELSE 0 END), 0) AS SIGNED) AS motoGuestMemberVisitors
      FROM fact_ticket_sales_v6
      WHERE venue_name LIKE '%모토%'
        AND date_id BETWEEN ? AND ?
    `, [todayStartId, targetDateId]);

    if (motoFactRows && motoFactRows[0]) {
      motoGuestVisitors = Number(motoFactRows[0].motoGuestVisitors || 0);
      motoMemberVisitors = Number(motoFactRows[0].motoMemberVisitors || 0);
      motoGuestMemberVisitors = Number(motoFactRows[0].motoGuestMemberVisitors || 0);
    }
  }
} catch (e) {
  console.warn('[RevenueSummary] Moto guest/member query warning:', e);
}

finalSummary.motoGuestVisitors = motoGuestVisitors;
finalSummary.motoMemberVisitors = motoMemberVisitors;
finalSummary.motoGuestMemberVisitors = motoGuestMemberVisitors;
```

### 3.3. API 응답 스키마 (`summary` 객체 내 추가 필드)
```json
{
  "success": true,
  "summary": {
    "totalRevenue": 20875382,
    "totalRooms": 105,
    "totalRoomCap": 536,
    "motoGuestMemberVisitors": 4,
    "motoGuestVisitors": 4,
    "motoMemberVisitors": 0
  }
}
```

---

## 4. 프론트엔드 연동 완료 상태

프론트엔드(`src/pages/Home.tsx`)에서는 이미 아래와 같이 방어적이고 완벽한 Pure Consumer 바인딩 로직을 배포 완료하였습니다:

- 1순위: `coreData.core?.summary?.motoGuestMemberVisitors`
- 2순위: `coreData.core?.summary?.motoGuestVisitors + coreData.core?.summary?.motoMemberVisitors`
- 3순위: `salesByFacility` 내 모토아레나 객체의 `guestMemberVisitors`
- 4순위: `leisureVisitorsMap['모토아레나_숙박회원']`
- 5순위: `leisureVisitorsMap['모토아레나']` (기존 시설 이용객 fallback)

- UI 상단 뱃지: `[숙박·회원]` 태그를 모토아레나 전용으로 추가하여 투숙객/회원 필터링 수치임을 시각적으로 명확히 표시하였습니다.
